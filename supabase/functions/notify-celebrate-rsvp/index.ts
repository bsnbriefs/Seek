import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SECRET_KEYS") ||
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
  const requestId = payload.request_id || payload.record?.request_id;
  if (!requestId) return json({ error: "request_id required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: request } = await supabase
    .from("requests")
    .select("id,title,category,user_id")
    .eq("id", requestId)
    .maybeSingle();
  const { data: priv } = await supabase
    .from("request_private")
    .select("email,full_name")
    .eq("request_id", requestId)
    .maybeSingle();
  const to = priv?.email;
  if (!to) return json({ error: "Host email not found" }, 400);

  const name = payload.name || payload.record?.name || "Someone";
  const email = payload.email || payload.record?.email || "";
  const phone = payload.phone || payload.record?.phone || "";
  const age = payload.age || payload.record?.age || "";
  const message = payload.message || payload.record?.message || "";
  const cat = String(request?.category || "").toLowerCase();
  const isJob = /job|employ|mentor|counsel/.test(cat);
  const subject = isJob
    ? "Someone can help with your SEEK request"
    : "Someone can be there — SEEK Connect";
  const intro = isJob
    ? `Someone offered help on: <strong>${esc(request?.title || "your SEEK request")}</strong>`
    : `Someone said they can be there for: <strong>${esc(request?.title || "your SEEK invitation")}</strong>`;

  const html = `
    <p>Hello ${esc(priv.full_name || "")},</p>
    <p>${intro}</p>
    <p><strong>Name:</strong> ${esc(name)}<br/>
    <strong>Email:</strong> ${esc(email)}<br/>
    <strong>Phone:</strong> ${esc(phone)}
    ${age ? `<br/><strong>Age:</strong> ${esc(age)}` : ""}</p>
    <p>${esc(message).replace(/\n/g, "<br/>")}</p>
    <p>${isJob ? "Reply to them directly if you want to take this further." : "Reply to them directly if you want to meet. Meet in a public place. SEEK is not a dating app."}</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + RESEND_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: email || undefined,
      subject,
      html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: body?.message || "Resend failed" }, 500);

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const host = (users?.users || []).find((u) => String(u.email || "").toLowerCase() === String(to).toLowerCase());
  const hostId = host?.id || request?.user_id || null;
  if (hostId) {
    await supabase.from("notifications").insert({
      user_id: hostId,
      type: "celebrate_rsvp",
      title: isJob ? "Someone can help" : "Someone can be there",
      body: `${name} responded to ${request?.title || "your SEEK post"}`,
      link_page: "request",
      link_id: requestId,
    });
  }

  return json({ ok: true });
});
