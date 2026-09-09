import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { enableSeekPush } from "./lib/seekApi";

export default function NotificationBell({ userSession, setPage }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const channelRef = useRef(null);

  const userId = userSession?.user?.id;
  const accessToken = userSession?.access_token;
  const refreshToken = userSession?.refresh_token;

  useEffect(() => {
    if (!userId) return;
    enableSeekPush().catch(() => {});
  }, [userId]);

  async function loadNotifications() {
    if (!userId) return;
    try {
      setLoading(true);
      setError("");
      const { data, error: qError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (qError) throw qError;
      setItems(data || []);
    } catch (err) {
      setError(err.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(n) {
    if (n.read_at) {
      navigateTo(n);
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    try {
      await supabase.rpc("mark_notification_read", { p_id: n.id });
    } catch (_e) {
      // non-critical
    }
    navigateTo(n);
  }

  function navigateTo(n) {
    setOpen(false);
    if (n.link_page === "request" && n.link_id) {
      window.history.pushState({}, "", `/request/${n.link_id}`);
      setPage(`request:${n.link_id}`);
    } else if (n.link_page === "impact" && n.link_id) {
      window.history.pushState({}, "", `/impact/${n.link_id}`);
      setPage(`impact:${n.link_id}`);
    } else if (n.link_page) {
      window.history.pushState({}, "", `/${n.link_page}`);
      setPage(n.link_page);
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    try {
      await supabase.rpc("mark_all_notifications_read");
    } catch (_e) {
      // non-critical
    }
  }

  useEffect(() => {
    if (!accessToken || !userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setItems([]);
      setConnected(false);
      return;
    }

    let cancelled = false;

    (async () => {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (cancelled) return;

      await loadNotifications();
      if (cancelled) return;

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
            setItems((prev) => [payload.new, ...prev]);
          }
        )
        .subscribe((status) => {
          setConnected(status === "SUBSCRIBED");
        });

      channelRef.current = channel;
    })();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [accessToken, userId]);

  if (!accessToken) return null;

  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-[#0D3B3B]/70 hover:text-[#0D3B3B]"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {!connected && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-300" title="Reconnecting…" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white border border-[#0D3B3B]/10 shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#0D3B3B]/8">
            <p className="font-display font-bold text-sm text-[#0D3B3B]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-[#1BAA9C]">
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <p className="p-4 text-sm text-[#0D3B3B]/50">Loading…</p>
          ) : error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-[#0D3B3B]/50">No notifications yet.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`px-4 py-3 border-b border-[#0D3B3B]/5 cursor-pointer ${!n.read_at ? "bg-[#1BAA9C]/5" : ""}`}
                >
                  <p className="text-sm font-semibold text-[#0D3B3B]">{n.title}</p>
                  {n.body && <p className="text-xs text-[#0D3B3B]/60 mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-[#0D3B3B]/40 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
