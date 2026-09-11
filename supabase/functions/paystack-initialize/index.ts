import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const gift = Number(body.amount);
    const request_id = body.request_id || null;
    const anonymous = Boolean(body.anonymous);
    const coverFee = body.cover_fee !== false && body.coverFee !== false;
    const donorName = anonymous ? null : String(body.donor_name || body.donorName || "").trim() || null;
    const callbackUrl = String(body.callback_url || body.callbackUrl || "https://seekbsn.org").trim();

    if (!email || !Number.isFinite(gift) || gift <= 0) {
      throw new Error("Valid email and donation amount are required.");
    }

    const fee = coverFee ? Math.round(gift * 0.05) : 0;
    const charge = gift + fee;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!
    );

    if (request_id) {
      const { data: request } = await supabase
        .from("requests")
        .select("id,status,is_public")
        .eq("id", request_id)
        .single();
      if (!request || !request.is_public || !["published", "partially_funded"].includes(request.status)) {
        throw new Error("This request is not currently accepting donations.");
      }
    }

    const reference = `SEEK-${crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
    const row: Record<string, unknown> = {
      request_id,
      donor_email: email,
      anonymous,
      amount: gift,
      currency: "NGN",
      paystack_reference: reference,
      status: "pending",
    };
    if (donorName) row.donor_name = donorName;
    row.platform_fee = fee;

    const { error: insertError } = await supabase.from("donations").insert(row);
    if (insertError) {
      delete row.platform_fee;
      delete row.donor_name;
      const retry = await supabase.from("donations").insert(row);
      if (retry.error) throw retry.error;
    }

    const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(charge * 100),
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: {
          request_id,
          anonymous,
          donor_name: donorName,
          gift_amount: gift,
          platform_fee: fee,
          platform: "seek",
        },
      }),
    });
    const result = await paystack.json();
    if (!paystack.ok || !result.status) {
      throw new Error(result.message || "Paystack initialization failed.");
    }
    return new Response(
      JSON.stringify({ authorization_url: result.data.authorization_url, reference }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
