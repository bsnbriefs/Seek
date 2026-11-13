import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Clock3, Radio } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { listMyNotifications, markNotificationRead } from "./lib/notificationApi";

function relativeTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function NotificationsPage({ setPage, userSession }) {
  const [items, setItems] = useState([]);
  const [freshIds, setFreshIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const itemsRef = useRef([]);
  const channelRef = useRef(null);
  const userId = userSession?.user?.id;
  const accessToken = userSession?.access_token;
  const refreshToken = userSession?.refresh_token;

  const refresh = useCallback(async ({ initial = false } = {}) => {
    if (!accessToken || !userId) return;
    try {
      const rows = await listMyNotifications(50);
      const next = Array.isArray(rows) ? rows : [];
      const previousIds = new Set(itemsRef.current.map((item) => item.id));
      const added = next.filter((item) => item.id && !previousIds.has(item.id)).map((item) => item.id);
      if (!initial && added.length) {
        setFreshIds((old) => new Set([...old, ...added]));
        window.setTimeout(() => {
          setFreshIds((old) => {
            const copy = new Set(old);
            added.forEach((id) => copy.delete(id));
            return copy;
          });
        }, 4200);
      }
      itemsRef.current = next;
      setItems(next);
      setError("");
    } catch (err) {
      setError(err?.message || "Could not refresh your messages.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, userId]);

  useEffect(() => {
    if (!accessToken || !userId) {
      setItems([]);
      itemsRef.current = [];
      setLoading(false);
      setLive(false);
      return undefined;
    }

    let cancelled = false;
    let pollId;
    const start = async () => {
      try {
        if (supabase?.auth?.setSession) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || "" });
        }
      } catch (_err) {
        // The REST API refresh below remains available if Realtime auth cannot be refreshed.
      }
      if (cancelled) return;
      await refresh({ initial: true });
      if (cancelled) return;

      try {
        const channel = supabase
          .channel(`seek-messages-${userId}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            const incoming = payload?.new;
            if (!incoming?.id) return;
            setItems((previous) => {
              if (previous.some((row) => row.id === incoming.id)) return previous;
              const next = [incoming, ...previous].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
              itemsRef.current = next;
              return next;
            });
            setFreshIds((previous) => new Set([...previous, incoming.id]));
            window.setTimeout(() => setFreshIds((previous) => {
              const next = new Set(previous);
              next.delete(incoming.id);
              return next;
            }), 4200);
          })
          .subscribe((status) => setLive(status === "SUBSCRIBED"));
        channelRef.current = channel;
      } catch (_err) {
        setLive(false);
      }
    };

    start();
    // Polling is a safety net for devices/networks where Supabase Realtime is unavailable.
    pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    const clockId = window.setInterval(() => setClock(Date.now()), 30000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(clockId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      if (channelRef.current && supabase?.removeChannel) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [accessToken, refreshToken, userId, refresh]);

  async function openNotice(notice) {
    if (!notice.read_at) {
      const now = new Date().toISOString();
      setItems((previous) => {
        const next = previous.map((row) => row.id === notice.id ? { ...row, read_at: now } : row);
        itemsRef.current = next;
        return next;
      });
      markNotificationRead(notice.id).catch(() => {});
    }
    if (notice.link_page === "request" && notice.link_id) {
      window.history.pushState({}, "", `/request/${notice.link_id}`);
      setPage?.(`request:${notice.link_id}`);
    } else if (notice.link_page === "impact" && notice.link_id) {
      window.history.pushState({}, "", `/impact/${notice.link_id}`);
      setPage?.(`impact:${notice.link_id}`);
    } else if (notice.link_page && setPage) {
      window.history.pushState({}, "", `/${notice.link_page}`);
      setPage(notice.link_page);
    }
  }

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-[var(--seek-primary)]">Sign in to see messages</h1>
        <button type="button" className="mt-4 rounded-full bg-[var(--seek-primary)] text-white px-4 py-2 text-sm" onClick={() => setPage?.("account")}>Sign in</button>
      </div>
    );
  }

  const unread = items.filter((notice) => !notice.read_at);
  const read = items.filter((notice) => notice.read_at);

  const renderNotice = (notice, index) => {
    const isFresh = freshIds.has(notice.id);
    return (
      <li key={notice.id || notice.created_at} className={isFresh ? "seek-message-enter" : ""} style={{ "--message-index": index }}>
        <button
          type="button"
          className={`seek-message-card group w-full rounded-2xl border p-4 sm:p-5 text-left transition-all duration-200 ${!notice.read_at ? "is-unread" : "is-read"}`}
          onClick={() => openNotice(notice)}
          aria-label={`${notice.read_at ? "Read" : "Unread"}: ${notice.title || "SEEK update"}`}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="seek-message-title block font-semibold">{notice.title || "SEEK update"}</span>
              {notice.body && <span className="seek-message-body mt-1 block text-sm leading-relaxed">{notice.body}</span>}
            </span>
            {!notice.read_at && <span className="seek-message-unread-dot mt-2 shrink-0" aria-label="Unread" />}
          </span>
          <span className="seek-message-meta mt-3 flex items-center gap-1.5 text-[11px]">
            <Clock3 size={12} aria-hidden="true" />
            <time dateTime={notice.created_at || undefined}>{relativeTime(notice.created_at)}</time>
            {notice.read_at && <><span aria-hidden="true">·</span><Check size={12} aria-hidden="true" /><span>Read</span></>}
            {isFresh && <span className="seek-message-new-tag ml-auto">NEW</span>}
          </span>
        </button>
      </li>
    );
  };

  return (
    <main className="seek-messages-page mx-auto max-w-2xl px-5 py-12 pb-28" aria-live="polite">
      <header className="mb-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-[var(--seek-primary)]">Messages</h1>
            <p className="seek-messages-count mt-1 text-sm">
              {loading ? "Loading your updates…" : unread.length ? `${unread.length} unread` : items.length ? "All caught up." : "No messages yet."}
            </p>
          </div>
          <span className={`seek-messages-live ${live ? "is-connected" : "is-checking"}`} title={live ? "Live connection active" : "Checking for new messages"}>
            <Radio size={13} /> {live ? "LIVE" : "UPDATING"}
          </span>
        </div>
        <div className="seek-messages-live-track mt-4"><span /></div>
      </header>

      {error && <p className="mb-4 rounded-xl border border-red-300/40 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && !items.length && !error && (
        <div className="seek-message-empty rounded-3xl border p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full"><Bell size={21} /></span>
          <h2 className="mt-4 font-semibold">You're all caught up.</h2>
          <p className="mt-1 text-sm">When something happens on SEEK, your updates will appear here.</p>
        </div>
      )}

      {unread.length > 0 && (
        <section className="mt-6" aria-labelledby="seek-new-messages">
          <div className="mb-3 flex items-center gap-2">
            <span className="seek-pulse-dot" />
            <h2 id="seek-new-messages" className="seek-message-section-label text-[11px] font-bold uppercase tracking-[.18em]">New</h2>
            <span className="seek-message-count-pill">{unread.length}</span>
          </div>
          <ul className="space-y-3">{unread.map(renderNotice)}</ul>
        </section>
      )}

      {read.length > 0 && (
        <section className="mt-9" aria-labelledby="seek-read-messages">
          <h2 id="seek-read-messages" className="seek-message-section-label mb-3 text-[11px] font-bold uppercase tracking-[.18em]">Already read</h2>
          <ul className="space-y-3">{read.map(renderNotice)}</ul>
        </section>
      )}
      <span className="sr-only">Updated {new Date(clock).toLocaleTimeString()}</span>
    </main>
  );
}
