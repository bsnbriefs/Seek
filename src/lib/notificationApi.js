import { getUserSession } from "./seekApi";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

async function notifyFetch(path) {
  const session = getUserSession();
  if (!session?.access_token || !url || !key) return [];
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) return [];
  return Array.isArray(data) ? data : [];
}

export async function listMyNotifications(limit = 50) {
  const session = getUserSession();
  if (!session?.access_token || !session?.user?.id) return [];
  const cap = Math.min(Number(limit) || 50, 100);
  return notifyFetch(
    "notifications?user_id=eq." +
      encodeURIComponent(session.user.id) +
      "&select=id,type,title,body,link_page,link_id,read_at,created_at&order=created_at.desc&limit=" +
      cap
  );
}
