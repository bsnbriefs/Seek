import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function markPaid(supabase: ReturnType<typeof createClient>, reference: string, payload: Record<string, unknown>) {
  const { data: donation } = await supabase
    .from("donations")
    .select("id,request_id,amount,status")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (!donation) throw new Error("Donation not found.");
  if (donation.status === "successful") return donation;

  const { error } = await supabase
    .from("donations")
    .update({
      status: "successful",
      paid_at: new Date().toISOString(),
      paystack_payload: payload,
    })
    .eq("id", donation.id);
  if (error) {
    await supabase.from("donations").update({ status: "successful" }).eq("id", donation.id);
  }
  return donation;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const reference = String(body.reference || body.trxref || body.data?.reference || "").trim();
    if (!reference) throw new Error("Missing payment reference.");

    const paystack = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
    });
    const result = await paystack.json();
    if (!paystack.ok || result.data?.status !== "success") {
      throw new Error(result.message || "Payment is not successful yet.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!
    );
    const donation = await markPaid(supabase, reference, result.data || {});
    return new Response(JSON.stringify({ ok: true, donation }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
