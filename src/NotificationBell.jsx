import { useEffect, useRef, useState } from "react";
import { Mailbox } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { enableSeekPush } from "./lib/seekApi";
import { listMyNotifications, markAllNotificationsRead, markNotificationRead, relativeNotificationTime } from "./lib/notificationApi";

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
      setItems(await listMyNotifications(30));
    } catch (err) {
      setError(err.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(n) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      try { await markNotificationRead(n.id); } catch (_e) { loadNotifications(); }
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
      setPage(n.link_page);
    } else {
      setPage("notifications");
    }
  }

  async function markAllRead() {
    if (!unreadCount) return;
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || stamp })));
    try { await markAllNotificationsRead(); } catch (_e) { loadNotifications(); }
  }

  useEffect(() => {
    if (!accessToken || !userId) {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setItems([]);
      setConnected(false);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try { await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }); } catch (_e) {}
      if (cancelled) return;
      await loadNotifications();
      if (cancelled) return;
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
          setItems((prev) => [payload.new, ...prev.filter((item) => item.id !== payload.new.id)]);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
          setItems((prev) => prev.map((item) => item.id === payload.new.id ? payload.new : item));
        })
        .subscribe((status) => setConnected(status === "SUBSCRIBED"));
      channelRef.current = channel;
    })();

    function handleVisibility() { if (document.visibilityState === "visible") loadNotifications(); }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [accessToken, userId]);

  if (!accessToken) return null;
  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="relative z-[80]">
      <button onClick={() => setOpen((o) => !o)} className="relative p-2 text-[#0D3B3B]/70 hover:text-[#0D3B3B]" aria-label="Notifications" aria-expanded={open}>
        <Mailbox size={22} />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#1598E5] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        {!connected && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-300" title="Reconnecting…" />}
      </button>

      {open && (
        <div className="absolute right-0 lg:left-1/2 lg:right-auto z-[90] mt-2 w-[min(21rem,calc(100vw-2rem))] -translate-x-0 lg:-translate-x-1/2 max-h-[28rem] overflow-y-auto rounded-2xl bg-white border border-[#0D3B3B]/10 shadow-2xl">
          <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-[#0D3B3B]/8">
            <p className="font-display font-bold text-sm text-[#0D3B3B]">Notifications</p>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-[#1BAA9C]">Mark all as read</button>}
              <button onClick={() => { setOpen(false); setPage("notifications"); }} className="text-xs font-semibold text-[#0D3B3B]/55">View all</button>
            </div>
          </div>
          {loading ? <p className="p-4 text-sm text-[#0D3B3B]/50">Loading…</p> : error ? <p className="p-4 text-sm text-red-600">{error}</p> : items.length === 0 ? <button onClick={() => { setOpen(false); setPage("notifications"); }} className="w-full p-6 text-left text-sm text-[#0D3B3B]/50">You're all caught up. New updates will appear here.</button> : (
            <ul>
              {items.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button onClick={() => markRead(n)} className={`w-full text-left px-4 py-3 border-b border-[#0D3B3B]/5 ${!n.read_at ? "bg-[#1BAA9C]/5" : ""}`}>
                    <div className="flex gap-2 items-start">
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1598E5]" />}
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#0D3B3B]">{n.title || "SEEK update"}</span>{n.body && <span className="block text-xs text-[#0D3B3B]/60 mt-0.5">{n.body}</span>}<span className="block text-[10px] text-[#0D3B3B]/40 mt-1">{relativeNotificationTime(n.created_at)}</span></span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
