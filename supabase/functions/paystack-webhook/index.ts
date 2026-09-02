import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!secret) {
      return new Response("Server configuration error", { status: 500 });
    }

    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(raw)
    );

    if (!valid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(raw);

    console.log("PAYSTACK EVENT:", event.event);

    if (event.event !== "charge.success") {
      return new Response("ok", { status: 200 });
    }

    const reference = event.data?.reference;
    const paidAmount = Number(event.data?.amount || 0) / 100;

    console.log("PAYSTACK REFERENCE:", reference);
    console.log("PAYSTACK AMOUNT:", paidAmount);

    if (!reference) {
      return new Response("Missing reference", { status: 400 });
    }

    // Only process Seek transactions.
    // Other Paystack transactions, such as BSN Donate,
    // must be ignored because this webhook may receive them too.
    if (!String(reference).startsWith("SEEK-")) {
      console.log(
        "IGNORING NON-SEEK PAYSTACK REFERENCE:",
        reference
      );

      return new Response("ok", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: donation, error: lookupError } = await supabase
      .from("donations")
      .select(
        "id, request_id, amount, status, paystack_reference"
      )
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

    if (donation.status === "successful") {
      return new Response("ok", { status: 200 });
    }

    if (
      Math.abs(
        paidAmount - Number(donation.amount)
      ) > 0.01
    ) {
      console.error("AMOUNT MISMATCH", {
        expected: donation.amount,
        received: paidAmount,
        reference,
      });

      return new Response("Amount mismatch", { status: 400 });
