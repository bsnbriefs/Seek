import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Seek <notify@seekbsn.org>";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function esc(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!SERVICE_KEY || !RESEND_KEY) return json({ error: "Mail is not configured" }, 500);

  const payload = await req.json().catch(() => ({}));
  const offerId = payload.offer_id || payload.record?.offer_id;
  const name = payload.name || payload.record?.name || "Someone";
  const email = payload.email || payload.record?.email || "";
  const phone = payload.phone || payload.record?.phone || "";
  const message = payload.message || payload.record?.message || "";
  if (!offerId) return json({ error: "offer_id required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: offer, error } = await supabase
    .from("offers")
    .select("id, description, contact_email, status")
    .eq("id", offerId)
    .maybeSingle();
  if (error || !offer?.contact_email) {
    return json({ error: error?.message || "Offer has no contact email" }, 400);
  }

  const subject = "Someone is interested in your Seek offer";
  const html = `
    <p>Hello,</p>
    <p>Someone indicated interest in your Seek offer:</p>
    <p><strong>${esc(offer.description)}</strong></p>
    <p><strong>Name:</strong> ${esc(name)}<br/>
    <strong>Email:</strong> ${esc(email)}<br/>
    ${phone ? `<strong>Phone:</strong> ${esc(phone)}<br/>` : ""}
    </p>
    <p><strong>Message</strong></p>
    <p>${esc(message).replace(/\n/g, "<br/>")}</p>
    <p>Reply to them directly if you want to continue. Seek does not expose your address on the public site.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + RESEND_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [offer.contact_email],
      reply_to: email || undefined,
      subject,
      html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: body?.message || "Resend failed" }, 500);
  return json({ ok: true, id: body?.id || null });
});
