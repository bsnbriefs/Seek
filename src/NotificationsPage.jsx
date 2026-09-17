import { useEffect, useState } from "react";
import { listMyNotifications, markNotificationRead } from "./lib/notificationApi";

export default function NotificationsPage({ setPage, userSession }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.access_token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    listMyNotifications(50)
      .then((rows) => {
        if (!cancelled) setItems(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Could not load updates.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userSession]);

  async function openNotice(n) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((row) => (row.id === n.id ? { ...row, read_at: now } : row)));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.link_page === "request" && n.link_id && setPage) setPage("request:" + n.link_id);
    else if (n.link_page === "impact" && n.link_id && setPage) setPage("impact:" + n.link_id);
    else if (n.link_page && setPage) setPage(n.link_page);
  }

  if (!userSession?.access_token) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-[#0D3B3B]">Sign in to see messages</h1>
        <button type="button" className="mt-4 rounded-full bg-[#0D3B3B] text-white px-4 py-2 text-sm" onClick={() => setPage && setPage("account")}>
          Sign in
        </button>
      </div>
    );
  }

  const unread = items.filter((n) => !n.read_at);
  const read = items.filter((n) => n.read_at);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 pb-28">
      <h1 className="font-display font-extrabold text-3xl text-[#0D3B3B]">Messages</h1>
      <p className="mt-1 text-sm text-[#0D3B3B]/55">
        {loading ? "Loading…" : unread.length ? `${unread.length} unread` : items.length ? "All caught up." : "No messages yet."}
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !items.length && !error && (
        <p className="mt-4 text-sm text-[#0D3B3B]/55">When SEEK has something for you, it will show here.</p>
      )}

      {unread.length > 0 && (
        <section className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1BAA9C]">New</p>
          <ul className="mt-2 space-y-3">
            {unread.map((n) => (
              <li key={n.id || n.created_at}>
                <button type="button" className="w-full rounded-2xl border border-[#1BAA9C]/40 bg-white p-4 text-left" onClick={() => openNotice(n)}>
                  <p className="font-semibold text-[#0D3B3B]">{n.title || "Update"}</p>
                  {n.body && <p className="mt-1 text-sm text-[#0D3B3B]/65">{n.body}</p>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {read.length > 0 && (
        <section className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#0D3B3B]/45">Already read</p>
          <ul className="mt-2 space-y-3">
            {read.map((n) => (
              <li key={n.id || n.created_at}>
                <button type="button" className="w-full rounded-2xl border border-[#0D3B3B]/10 bg-white p-4 text-left" onClick={() => openNotice(n)}>
                  <p className="font-semibold text-[#0D3B3B]">{n.title || "Update"}</p>
                  {n.body && <p className="mt-1 text-sm text-[#0D3B3B]/65">{n.body}</p>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
