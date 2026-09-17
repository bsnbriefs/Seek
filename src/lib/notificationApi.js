import { getUserSession } from "./seekApi";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

async function notifyFetch(path, options = {}) {
  const session = getUserSession();
  if (!session?.access_token || !url || !key) return [];
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) return Array.isArray(data) ? data : [];
  return data;
}

export async function listMyNotifications(limit = 50) {
  const session = getUserSession();
  if (!session?.access_token || !session?.user?.id) return [];
  const cap = Math.min(Number(limit) || 50, 100);
  const rows = await notifyFetch(
    "notifications?user_id=eq." +
      encodeURIComponent(session.user.id) +
      "&select=id,type,title,body,link_page,link_id,read_at,created_at&order=created_at.desc&limit=" +
      cap
  );
  return Array.isArray(rows) ? rows : [];
}

export async function markNotificationRead(id) {
  if (!id) return;
  await notifyFetch("notifications?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify({ read_at: new Date().toISOString() }),
  });
}
