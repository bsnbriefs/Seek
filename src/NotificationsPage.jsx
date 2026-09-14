import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock3,
  Gift,
  HeartHandshake,
  MessageCircle,
  Megaphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  relativeNotificationTime,
} from "./lib/notificationApi";

function notificationIcon(type) {
  const value = String(type || "general").toLowerCase();
  if (value.includes("request") || value.includes("review")) return HeartHandshake;
  if (value.includes("offer") || value.includes("giveaway")) return Gift;
  if (value.includes("support") || value.includes("message")) return MessageCircle;
  if (value.includes("story") || value.includes("update")) return Sparkles;
  if (value.includes("announce")) return Megaphone;
  if (value.includes("verify") || value.includes("safety")) return ShieldCheck;
  if (value.includes("fulfilled") || value.includes("complete")) return BadgeCheck;
  return Bell;
}

function notificationDestination(notification, setPage) {
  const page = notification?.link_page;
  const id = notification?.link_id;
  if (page === "request" && id) {
    window.history.pushState({}, "", `/request/${id}`);
    setPage(`request:${id}`);
    return;
  }
  if (page === "impact" && id) {
    window.history.pushState({}, "", `/impact/${id}`);
    setPage(`impact:${id}`);
    return;
  }
  if (page) {
    setPage(page);
    return;
  }
}

export default function NotificationsPage({ setPage, userSession }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const userId = userSession?.user?.id;
  const accessToken = userSession?.access_token;
  const refreshToken = userSession?.refresh_token;

  async function load() {
    if (!userId) return;
    try {
      setError("");
      const rows = await listMyNotifications(50);
      setItems(rows);
    } catch (err) {
      setError(err?.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken || !userId) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let channel = null;

    (async () => {
      try {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      } catch (_e) {}
      if (cancelled) return;
      await load();
      if (cancelled) return;

      channel = supabase
        .channel(`notifications-page-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => setItems((prev) => [payload.new, ...prev.filter((item) => item.id !== payload.new.id)])
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => setItems((prev) => prev.map((item) => item.id === payload.new.id ? payload.new : item))
        )
        .subscribe();
    })();

    function handleVisibility() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [accessToken, userId]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);
  const visible = filter === "unread" ? items.filter((item) => !item.read_at) : items;

  async function read(item) {
    if (!item?.read_at) {
      const stamp = new Date().toISOString();
      setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, read_at: stamp } : row));
      try { await markNotificationRead(item.id); } catch (_e) { load(); }
    }
    notificationDestination(item, setPage);
  }

  async function markAllRead() {
    if (!unreadCount || busy) return;
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || stamp })));
    try {
      setBusy(true);
      await markAllNotificationsRead();
    } catch (err) {
      setError(err?.message || "Could not mark notifications as read.");
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!accessToken) {
    return (
      <div style={{ background: "#F4F7F5" }} className="min-h-[70vh]">
        <section className="mx-auto max-w-2xl px-5 sm:px-8 pt-16 pb-20 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#0D3B3B] text-white flex items-center justify-center"><Bell size={25} /></div>
          <h1 className="mt-5 font-display font-extrabold text-3xl text-[#0D3B3B]">Your notifications</h1>
          <p className="mt-2 text-sm leading-6 text-[#0D3B3B]/60">Sign in to see updates about your requests, help offers, stories and SEEK Support.</p>
          <button type="button" onClick={() => setPage("account")} className="mt-6 rounded-xl bg-[#0D3B3B] px-5 py-3 text-sm font-semibold text-white">Sign in to SEEK</button>
        </section>
      </div>
    );
  }

  return (
    <div style={{ background: "#F4F7F5" }} className="min-h-[70vh]">
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 sm:pt-12 pb-20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1BAA9C]">SEEK</p>
            <h1 className="mt-1 font-display font-extrabold text-3xl sm:text-4xl text-[#0D3B3B]">Notifications</h1>
            <p className="mt-1 text-sm text-[#0D3B3B]/55">Updates about your SEEK activity.</p>
          </div>
          {unreadCount > 0 && (
            <button type="button" disabled={busy} onClick={markAllRead} className="shrink-0 text-xs sm:text-sm font-semibold text-[#1BAA9C] disabled:opacity-50">
              {busy ? "Saving…" : "Mark all as read"}
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-2 rounded-2xl bg-white border border-[#0D3B3B]/8 p-1.5 w-fit">
          {[['all', `All${items.length ? ` · ${items.length}` : ""}`], ['unread', `Unread${unreadCount ? ` · ${unreadCount}` : ""}`]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-xl px-4 py-2 text-xs font-bold ${filter === id ? "bg-[#0D3B3B] text-white" : "text-[#0D3B3B]/55 hover:bg-[#F2F5F3]"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-[#0D3B3B]/8 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-[#0D3B3B]/50">Loading your notifications…</div>
          ) : error ? (
            <div className="p-8 text-center"><p className="text-sm text-red-600">{error}</p><button type="button" onClick={load} className="mt-3 text-sm font-semibold text-[#1BAA9C]">Try again</button></div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-[#F2F5F3] text-[#0D3B3B]/50 flex items-center justify-center"><Bell size={22} /></div>
              <h2 className="mt-4 font-display font-bold text-lg text-[#0D3B3B]">{filter === "unread" ? "You're all caught up." : "No notifications yet."}</h2>
              <p className="mt-1 text-sm text-[#0D3B3B]/50">When something important happens on SEEK, it will appear here.</p>
            </div>
          ) : (
            <ul>
              {visible.map((item) => {
                const Icon = notificationIcon(item.type);
                const unread = !item.read_at;
                return (
                  <li key={item.id}>
                    <button type="button" onClick={() => read(item)} className={`w-full text-left px-4 sm:px-5 py-4 flex gap-3.5 items-start border-b last:border-b-0 border-[#0D3B3B]/6 hover:bg-[#F7FAF8] transition ${unread ? "bg-[#1BAA9C]/[0.035]" : ""}`}>
                      <span className={`mt-0.5 h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${unread ? "bg-[#1BAA9C]/12 text-[#0D3B3B]" : "bg-[#F2F5F3] text-[#0D3B3B]/50"}`}><Icon size={19} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className={`text-sm leading-5 ${unread ? "font-bold text-[#0D3B3B]" : "font-semibold text-[#0D3B3B]/80"}`}>{item.title || "SEEK update"}</span>
                          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1598E5]" aria-label="Unread" />}
                        </span>
                        {item.body && <span className="mt-0.5 block text-sm leading-5 text-[#0D3B3B]/58">{item.body}</span>}
                        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#0D3B3B]/38"><Clock3 size={11} /> {relativeNotificationTime(item.created_at)}</span>
                      </span>
                      {(item.link_page || item.link_id) && <ChevronRight size={18} className="mt-2 shrink-0 text-[#0D3B3B]/25" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-[#0D3B3B]/8 bg-white p-4 flex gap-3 items-start">
          <Check size={17} className="mt-0.5 text-[#1BAA9C] shrink-0" />
          <p className="text-xs leading-5 text-[#0D3B3B]/55">SEEK notifications are for meaningful updates about your account and activity. You will never be asked for an OTP, PIN or password through a notification.</p>
        </div>
      </section>
    </div>
  );
}
