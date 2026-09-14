import { supabase } from "./supabaseClient";

/**
 * SEEK Notifications API
 *
 * Uses the existing SEEK notifications architecture:
 * - notifications table
 * - read_at column
 * - mark_notification_read RPC
 * - mark_all_notifications_read RPC
 * - Supabase Realtime
 */

/**
 * Get the current user's notifications.
 */
export async function listNotifications(userId, limit = 100) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("SEEK notifications error:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get the number of unread notifications.
 *
 * SEEK uses read_at:
 * null = unread
 * timestamp = read
 */
export async function getUnreadNotificationCount(userId) {
  if (!userId) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error(
      "SEEK unread notification count error:",
      error
    );
    throw error;
  }

  return count || 0;
}

/**
 * Mark one notification as read.
 *
 * Uses the existing SEEK Supabase RPC.
 */
export async function markNotificationRead(notificationId) {
  if (!notificationId) {
    return;
  }

  const { data, error } = await supabase.rpc(
    "mark_notification_read",
    {
      p_notification_id: notificationId,
    }
  );

  if (error) {
    console.error(
      "SEEK mark notification read error:",
      error
    );
    throw error;
  }

  return data;
}

/**
 * Mark all notifications belonging to the current
 * authenticated user as read.
 *
 * Uses the existing SEEK RPC.
 */
export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc(
    "mark_all_notifications_read"
  );

  if (error) {
    console.error(
      "SEEK mark all notifications read error:",
      error
    );
    throw error;
  }

  return data;
}

/**
 * Subscribe to newly-created and updated notifications
 * for a specific SEEK user.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId,
  {
    onInsert,
    onUpdate,
  } = {}
) {
  if (!userId) {
    return () => {};
  }

  const channel = supabase
    .channel(`seek-notifications-${userId}`)
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

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Convert a SEEK notification's read_at value
 * into a simple boolean for UI components.
 */
export function isNotificationRead(notification) {
  return Boolean(notification?.read_at);
}

/**
 * Get a notification destination.
 *
 * SEEK notifications may use link_page/link_id.
 */
export function getNotificationLink(notification) {
  if (!notification) {
    return null;
  }

  if (notification.link_page) {
    return notification.link_page;
  }

  if (notification.metadata?.link) {
    return notification.metadata.link;
  }

  if (notification.metadata?.path) {
    return notification.metadata.path;
  }

  return null;
}
