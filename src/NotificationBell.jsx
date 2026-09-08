import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export default function NotificationBell({ userSession }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const SUPABASE_KEY = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  async function loadNotifications() {
    if (!userSession?.access_token) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?select=*&order=created_at.desc&limit=30`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${userSession.access_token}`,
          },
        }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || "Could not load notifications.");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_notification_read`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${userSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_id: id }),
      });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (_e) {
      // silent — non-critical
    }
  }

  async function markAllRead() {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_all_notifications_read`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${userSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch (_e) {
      // silent — non-critical
    }
  }

  useEffect(() => {
    if (!userSession?.access_token) return;
    loadNotifications();

    let channel;
    try {
      const wsUrl = SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1/websocket?apikey=" + SUPABASE_KEY + "&vsn=1.0.0";
      channel = new WebSocket(wsUrl);
      channel.onopen = () => {
        channel.send(JSON.stringify({
          topic: "realtime:public:notifications",
          event: "phx_join",
          payload: {},
          ref: "1",
        }));
      };
      channel.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed.event === "INSERT" && parsed.payload?.record?.user_id === userSession.user?.id) {
            setItems((prev) => [parsed.payload.record, ...prev]);
          }
        } catch (_e) {
          // ignore malformed frames
        }
      };
      channel.onerror = () => {};
    } catch (_e) {
      // realtime unavailable — bell still works via manual refresh/poll fallback below
    }

    const poll = setInterval(loadNotifications, 30000);

    return () => {
      if (channel) channel.close();
      clearInterval(poll);
    };
  }, [userSession?.access_token]);

  if (!userSession?.access_token) return null;

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
                  onClick={() => !n.read_at && markRead(n.id)}
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
