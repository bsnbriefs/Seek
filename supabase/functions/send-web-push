import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: "Push is not configured" }, 500);
  }

  webpush.setVapidDetails(
    "mailto:Support@barristerstreet.org",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );

  const payload = await req.json().catch(() => ({}));
  const userId = payload.user_id || payload.record?.user_id;
  const title = payload.title || payload.record?.title || "Seek";
  const body = payload.body || payload.record?.body || "You have a new Seek update.";
  const linkPage = payload.link_page || payload.record?.link_page;
  const linkId = payload.link_id || payload.record?.link_id;
  let url = "https://seekbsn.org/";
  if (linkPage === "request" && linkId) url = "https://seekbsn.org/request/" + linkId;
  else if (linkPage === "impact" && linkId) url = "https://seekbsn.org/impact/" + linkId;
  else if (linkPage === "admin") url = "https://seekbsn.org/admin";

  if (!userId) return json({ error: "user_id required" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) return json({ error: error.message }, 500);
  const list = rows || [];
  const results = [];
  for (const row of list) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify({ title, body, url })
      );
      results.push({ endpoint: row.endpoint, ok: true });
    } catch (err) {
      results.push({
        endpoint: row.endpoint,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return json({ sent: results.filter((r) => r.ok).length, results });
});
