import { supabaseFetch } from "./supabase";
import { getUserSession } from "./seekApi";

export async function listMyNotifications(limit = 50) {
  const session = getUserSession();
  if (!session?.access_token || !session?.user?.id) return [];
  const cap = Math.min(Number(limit) || 50, 100);
  const rows = await supabaseFetch(
    "notifications?user_id=eq." +
      encodeURIComponent(session.user.id) +
      "&select=id,type,title,body,link_page,link_id,read_at,created_at&order=created_at.desc&limit=" +
      cap
  ).catch(() => []);
  return Array.isArray(rows) ? rows : [];
}
