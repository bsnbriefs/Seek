import { supabaseConfigured } from "./supabase";
import { getUserSession } from "./seekApi";

const BASE = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

async function request(path, options = {}) {
  if (!supabaseConfigured || !BASE || !KEY) return null;

  const session = getUserSession();

  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${session?.access_token || KEY}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE}/rest/v1/${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.hint ||
        "Could not load view count."
    );
  }

  return data;
}

const validTarget = (targetType) =>
  targetType === "request" || targetType === "offer";

export async function getSeekViewCount(targetType, targetId) {
  if (!validTarget(targetType) || !targetId) return 0;

  try {
    const rows = await request(
      `seek_content_views?target_type=eq.${encodeURIComponent(
        targetType
      )}&target_id=eq.${encodeURIComponent(
        targetId
      )}&select=view_count&limit=1`
    );

    return Number(
      (Array.isArray(rows) && rows[0]?.view_count) || 0
    );
  } catch (_e) {
    return 0;
  }
}

export async function recordSeekView(targetType, targetId) {
  if (!validTarget(targetType) || !targetId) {
    return getSeekViewCount(targetType, targetId);
  }

  /*
   * Prevent repeated refreshes in the same browser session
   * from artificially increasing the view count.
   */
  const storageKey = `seek_view_${targetType}_${targetId}`;

  try {
    if (sessionStorage.getItem(storageKey) === "1") {
      return getSeekViewCount(targetType, targetId);
    }
  } catch (_e) {}

  try {
    const rows = await request(
      "rpc/increment_seek_content_view",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_target_type: targetType,
          p_target_id: String(targetId),
        }),
      }
    );

    const count = Number(
      Array.isArray(rows) ? rows[0] : rows || 0
    );

    try {
      sessionStorage.setItem(storageKey, "1");
    } catch (_e) {}

    return count;
  } catch (_e) {
    return getSeekViewCount(targetType, targetId);
  }
}
