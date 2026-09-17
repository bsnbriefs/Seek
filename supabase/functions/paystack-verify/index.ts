import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const service =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEYS") ||
      "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", service);

    const found = await supabase
      .from("donations")
      .select("id,request_id,amount,status,donor_name,donor_email,campaign_id")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (!found.data) throw new Error("Donation not found.");

    if (String(found.data.status) !== "successful") {
      const { error } = await supabase.from("donations").update({ status: "successful" }).eq("id", found.data.id);
      if (error) throw new Error(error.message);
    }

    const closed = await supabase
      .from("donations")
      .select("id,request_id,amount,status,donor_name")
      .eq("id", found.data.id)
      .single();

    if (String(closed.data?.status) !== "successful") {
      throw new Error("Gift could not be marked successful.");
    }

    if (String(found.data.campaign_id || "") === "wallet" && found.data.donor_email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,wallet_balance")
        .eq("email", found.data.donor_email)
        .maybeSingle();
      if (profile?.id) {
        await supabase
          .from("profiles")
          .update({ wallet_balance: Number(profile.wallet_balance || 0) + Number(found.data.amount || 0) })
          .eq("id", profile.id);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      verified: true,
      request_id: closed.data.request_id,
      requestId: closed.data.request_id,
      amount: closed.data.amount,
      donation: closed.data,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
