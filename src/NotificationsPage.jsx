import { useEffect, useState } from "react";
import { listMyNotifications } from "./lib/notificationApi";

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

  if (!userSession?.access_token) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-[#0D3B3B]">Sign in to see updates</h1>
        <button type="button" className="mt-4 rounded-full bg-[#0D3B3B] text-white px-4 py-2 text-sm" onClick={() => setPage && setPage("account")}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display font-extrabold text-3xl text-[#0D3B3B]">Updates</h1>
      {loading && <p className="mt-4 text-sm text-[#0D3B3B]/50">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !items.length && !error && (
        <p className="mt-4 text-sm text-[#0D3B3B]/55">No new updates yet.</p>
      )}
      <ul className="mt-6 space-y-3">
        {items.map((n) => (
          <li key={n.id || n.created_at}>
            <button
              type="button"
              className="w-full rounded-2xl border border-[#0D3B3B]/10 bg-white p-4 text-left"
              onClick={() => {
                if (n.link_page === "request" && n.link_id && setPage) setPage("request:" + n.link_id);
                else if (n.link_page && setPage) setPage(n.link_page);
              }}
            >
              <p className="font-semibold text-[#0D3B3B]">{n.title || "Update"}</p>
              {n.body && <p className="mt-1 text-sm text-[#0D3B3B]/65">{n.body}</p>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
