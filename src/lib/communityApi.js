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
      "Community interaction failed."
    );
  }

  return data;
}

export async function listCommunityInteractions(targetType, targetId) {
  if (!targetType || !targetId) {
    return {
      comments: [],
      reactions: {},
    };
  }

  try {
    const [comments, reactions] = await Promise.all([
      request(
        `community_comments?target_type=eq.${encodeURIComponent(
          targetType
        )}&target_id=eq.${encodeURIComponent(
          targetId
        )}&status=eq.published&select=id,target_type,target_id,user_id,display_name,avatar_url,body,created_at&order=created_at.desc&limit=50`
      ).catch(() => []),

      request(
        `community_reactions?target_type=eq.${encodeURIComponent(
          targetType
        )}&target_id=eq.${encodeURIComponent(
          targetId
        )}&select=id,user_id,reaction_type,created_at&limit=500`
      ).catch(() => []),
    ]);

    const counts = {};

    (Array.isArray(reactions) ? reactions : []).forEach((row) => {
      counts[row.reaction_type] =
        (counts[row.reaction_type] || 0) + 1;
    });

    return {
      comments: Array.isArray(comments) ? comments : [],
      reactions: counts,
    };
  } catch (_e) {
    return {
      comments: [],
      reactions: {},
    };
  }
}

export async function addCommunityReaction({
  targetType,
  targetId,
  reactionType,
}) {
  const session = getUserSession();

  if (!session?.access_token) {
    throw new Error("Please sign in to react.");
  }

  const existing = await request(
    `community_reactions?target_type=eq.${encodeURIComponent(
      targetType
    )}&target_id=eq.${encodeURIComponent(
      targetId
    )}&reaction_type=eq.${encodeURIComponent(
      reactionType
    )}&user_id=eq.${encodeURIComponent(
      session.user.id
    )}&select=id&limit=1`
  );

  if (Array.isArray(existing) && existing[0]?.id) {
    await request(
      `community_reactions?id=eq.${encodeURIComponent(
        existing[0].id
      )}`,
      {
        method: "DELETE",
      }
    );

    return {
      active: false,
    };
  }

  await request("community_reactions", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      target_type: targetType,
      target_id: targetId,
      reaction_type: reactionType,
      user_id: session.user.id,
    }),
  });

  return {
    active: true,
  };
}

export async function addCommunityComment({
  targetType,
  targetId,
  body,
}) {
  const session = getUserSession();

  const text = String(body || "").trim();

  if (!session?.access_token) {
    throw new Error("Please sign in to comment.");
  }

  if (!text) {
    throw new Error("Write a short comment first.");
  }

  if (text.length > 500) {
    throw new Error("Comments can be up to 500 characters.");
  }

  const displayName =
    session.user?.user_metadata?.full_name ||
    session.user?.user_metadata?.name ||
    session.user?.email?.split("@")[0] ||
    "SEEK member";

  await request("community_comments", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      target_type: targetType,
      target_id: targetId,
      user_id: session.user.id,
      display_name: displayName,
      body: text,
      status: "published",
    }),
  });

  return true;
      }
