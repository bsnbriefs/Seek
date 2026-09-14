import { supabase } from "./supabaseClient";

/**
 * Load the current user's notifications.
 *
 * RLS on the notifications table determines which
 * notifications the signed-in user can access.
 */
export async function listMyNotifications(limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("SEEK notifications error:", error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Mark one notification as read.
 */
export async function markNotificationRead(id) {
  if (!id) return;

  const { error } = await supabase.rpc(
    "mark_notification_read",
    {
      p_id: id,
    }
  );

  if (error) {
    console.error(
      "SEEK mark notification read error:",
      error
    );
    throw error;
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc(
    "mark_all_notifications_read"
  );

  if (error) {
    console.error(
      "SEEK mark all notifications read error:",
      error
    );
    throw error;
  }
}

/**
 * Convert notification timestamp into a
 * human-friendly relative time.
 *
 * Examples:
 * now
 * 12m
 * 3h
 * 2d
 * 2w
 * Sep 14
 */
export function relativeNotificationTime(value) {
  if (!value) return "";

  const then = new Date(value).getTime();

  if (!Number.isFinite(then)) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - then) / 1000)
  );

  if (seconds < 60) {
    return "now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);

  if (weeks < 5) {
    return `${weeks}w`;
  }

  return new Date(value).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  );
}

/**
 * Subscribe to notifications for the current user.
 *
 * Returns the Supabase realtime channel so the
 * caller can remove it when the component unmounts.
 */
export function subscribeToMyNotifications(
  userId,
  onInsert,
  onUpdate
) {
  if (!userId) {
    return null;
  }

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (typeof onInsert === "function") {
          onInsert(payload.new);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (typeof onUpdate === "function") {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return channel;
}
