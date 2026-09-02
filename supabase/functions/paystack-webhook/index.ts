import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response("Server configuration error", { status: 500 });
    if (!signature) return new Response("Missing signature", { status: 401 });

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, hexToBytes(signature), new TextEncoder().encode(raw));
    if (!valid) return new Response("Invalid signature", { status: 401 });

    const event = JSON.parse(raw);
    console.log("PAYSTACK EVENT:", event.event);
    if (event.event !== "charge.success") return new Response("ok", { status: 200 });

    const reference = event.data?.reference;
    const paidAmount = Number(event.data?.amount || 0) / 100;
    console.log("PAYSTACK REFERENCE:", reference);
    console.log("PAYSTACK AMOUNT:", paidAmount);
    if (!reference) return new Response("Missing reference", { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: donation, error: lookupError } = await supabase
      .from("donations")
      .select("id, request_id, amount, status, paystack_reference")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (lookupError) {
      console.error("DONATION LOOKUP ERROR:", lookupError);
      return new Response("Database lookup error", { status: 500 });
    }
    if (!donation) {
      console.error("DONATION NOT FOUND:", reference);
      return new Response("Donation not found", { status: 404 });
    }

    if (donation.status === "successful") return new Response("ok", { status: 200 });

    if (Math.abs(paidAmount - Number(donation.amount)) > 0.01) {
      console.error("AMOUNT MISMATCH", { expected: donation.amount, received: paidAmount, reference });
      return new Response("Amount mismatch", { status: 400 });
    }

    // Conditional update (still pending) closes the race between two
    // near-simultaneous webhook deliveries for the same reference — only
    // whichever request gets here first actually flips the status, and its
    // response tells us whether a row was actually updated.
    const { data: updatedRows, error: updateError } = await supabase
      .from("donations")
      .update({ status: "successful", paid_at: new Date().toISOString() })
      .eq("id", donation.id)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      console.error("DONATION UPDATE ERROR:", updateError);
      return new Response("Failed to update donation", { status: 500 });
    }
    if (!updatedRows || updatedRows.length === 0) {
      // Another delivery already processed this donation between our lookup
      // and this update — treat as already handled, not an error.
      console.log("DONATION ALREADY PROCESSED (race avoided):", donation.id);
      return new Response("ok", { status: 200 });
    }

    console.log("DONATION MARKED SUCCESSFUL:", donation.id);

    if (donation.request_id) {
      // Atomic increment via RPC (see migration_002_atomic_donations.sql)
      // instead of a select-then-update.
      const { error: incrementError } = await supabase.rpc("increment_request_amount", {
        p_request_id: donation.request_id,
        p_amount: paidAmount,
      });
      if (incrementError) console.error("REQUEST AMOUNT UPDATE ERROR:", incrementError);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return new Response(error instanceof Error ? error.message : "Webhook error", { status: 500 });
  }
});

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  return bytes;
}
