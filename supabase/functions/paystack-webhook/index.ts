import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

async function sendReceipt(to: string, amount: number, purpose: string, reference: string) {
  const key = Deno.env.get("RESEND_API_KEY") || "";
  if (!key || !to) return;
  const naira = "₦" + Math.round(amount).toLocaleString();
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Seek <notify@seekbsn.org>",
      to: [to],
      subject: "SEEK receipt — " + naira,
      html: `<p>Thank you for giving through SEEK.</p><p><strong>Amount:</strong> ${naira}<br/><strong>Purpose:</strong> ${purpose}<br/><strong>Reference:</strong> ${reference}</p>`,
    }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const raw = await req.text();
  let event: Record<string, unknown> = {};
  try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400, headers: cors }); }

  const eventName = String(event.event || "");
  const data = (event.data || {}) as Record<string, unknown>;
  if (eventName !== "charge.success" && String(data.status || "") !== "success") {
    return new Response(JSON.stringify({ ok: true, ignored: eventName }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  const reference = String(data.reference || "");
  if (!reference) return new Response("no reference", { status: 400, headers: cors });

  const service =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEYS") ||
    "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", service);
  const meta = (data.metadata || {}) as Record<string, unknown>;
  const email = String((data.customer as { email?: string } | undefined)?.email || "");
  const amount = Number(meta.gift_amount || Number(data.amount || 0) / 100) || 0;
  const donorName = meta.anonymous ? "Anonymous" : (meta.donor_name || null);

  const found = await supabase.from("donations").select("id,request_id,status,donor_email,donor_name,amount").eq("paystack_reference", reference).maybeSingle();
  let donation = found.data;
  if (!donation) {
    const pending = meta.request_id
      ? await supabase.from("donations").select("id,request_id,status,donor_email,donor_name,amount").eq("request_id", meta.request_id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle()
      : { data: null };
    donation = pending.data;
  }
  if (!donation) {
    const inserted = await supabase.from("donations").insert({
      request_id: meta.request_id || null,
      donor_email: email,
      amount,
      currency: "NGN",
      paystack_reference: reference,
      status: "successful",
      donor_name: donorName,
    }).select("id,request_id,status,donor_email,donor_name,amount").maybeSingle();
    donation = inserted.data;
  } else if (String(donation.status) !== "successful") {
    await supabase.from("donations").update({
      status: "successful",
      donor_name: donation.donor_name || donorName,
    }).eq("id", donation.id);
  }

  if (donation?.request_id) {
    await supabase.rpc("notify_request_gift", {
      p_request_id: donation.request_id,
      p_amount: donation.amount || amount,
      p_name: donation.donor_name || donorName || "A neighbour",
    }).catch(() => {});
  }

  await sendReceipt(email || donation?.donor_email || "", Number(donation?.amount || amount), String(donorName || "SEEK gift"), reference);

  return new Response(JSON.stringify({ ok: true, reference }), { headers: { ...cors, "Content-Type": "application/json" } });
});
