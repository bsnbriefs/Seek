import { useEffect, useState } from "react";
import {
  adminLogin,
  getAdminSession,
  adminLogout,
  getAdminRequests,
  getAdminOffers,
  getAdminVolunteers,
  getAdminRequestPrivate,
  getAdminDonations,
  updateAdminRequestStatus,
  updateAdminOfferStatus,
  verifyAdminRequest,
  getAdminEvidence,
  getAdminImpactPosts,
  uploadImpactMedia,
  saveAdminImpactPost,
  saveAdminImpactMedia,
  updateAdminImpactPost,
  deleteAdminImpactPost,
  confirmAdminOfferConnected,
  celebrateAdminRequest,
  getAdminSafetyReports,
  updateAdminSafetyReport,
  getAdminAuditLogs,
  getAdminSupportConversations,
  getAdminSupportMessages,
  sendAdminSupportMessage,
} from "./lib/adminApi";

export default function AdminPage() {
  const [session, setSession] = useState(() => getAdminSession());
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [requestPrivate, setRequestPrivate] = useState([]);
  const [donations, setDonations] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [evidence, setEvidence] = useState({});
  const [loading, setLoading] = useState(false);

  // Filters & search
  const [requestFilter, setRequestFilter] = useState("all");
  const [offerFilter, setOfferFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [adminTab, setAdminTab] = useState("requests");
  const [impactPosts, setImpactPosts] = useState([]);
  const [impactEditingId, setImpactEditingId] = useState(null);
  const [impactForm, setImpactForm] = useState({
    title: "",
    story: "",
    location: "",
    happened_on: "",
    file: null,
  });
  const [impactSaving, setImpactSaving] = useState(false);
  const [safetyReports, setSafetyReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportChats, setSupportChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReply, setChatReply] = useState("");

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const [requestData, offerData, volunteerData, privateData, donationData, impactData, reportData, auditData, chatData] = await Promise.all([
        getAdminRequests(),
        getAdminOffers(),
        getAdminVolunteers(),
        getAdminRequestPrivate(),
        getAdminDonations(),
        getAdminImpactPosts().catch(() => []),
        getAdminSafetyReports().catch(() => []),
        getAdminAuditLogs().catch(() => []),
        getAdminSupportConversations().catch(() => []),
      ]);

      setRequests(requestData);
      setOffers(offerData);
      setVolunteers(volunteerData);
      setRequestPrivate(privateData);
      setDonations(donationData);
      setImpactPosts(impactData);
      setSafetyReports(reportData);
      setAuditLogs(auditData);
      setSupportChats(chatData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const newSession = await adminLogin(email, password);
      setSession(newSession);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id, status) {
    try {
      setError("");
      await updateAdminRequestStatus(id, status);
      await loadRequests();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verifyRequest(id) {
    try {
      setError("");
      await verifyAdminRequest(id, "Verified by BSN admin");
      await loadRequests();
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadEvidence(requestId) {
    try {
      const files = await getAdminEvidence(requestId);
      setEvidence((prev) => ({
        ...prev,
        [requestId]: files,
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateOfferStatus(id, status) {
    try {
      setError("");
      await updateAdminOfferStatus(id, status);
      await loadRequests();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      loadRequests();
    }
  }, [session]);

  const searchLower = search.trim().toLowerCase();

  const filteredRequests = requests.filter((req) => {
    if (requestFilter !== "all" && req.status !== requestFilter) return false;
    if (!searchLower) return true;
    const haystack = [
      req.title,
      req.description,
      req.category,
      req.location,
      req.public_reference,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchLower);
  });

  const filteredOffers = offers.filter((offer) => {
    const status = offer.status || "pending_review";
    if (offerFilter !== "all" && status !== offerFilter) return false;
    if (!searchLower) return true;
    const linked = requests.find((r) => r.id === offer.request_id);
    const haystack = [
      offer.description,
      offer.contact_email,
      offer.contact_phone,
      linked?.title,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchLower);
  });

  const requestCounts = {
    all: requests.length,
    pending_review: requests.filter((r) => r.status === "pending_review").length,
    published: requests.filter((r) => r.status === "published").length,
    verification_required: requests.filter((r) => r.status === "verification_required").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    partially_funded: requests.filter((r) => r.status === "partially_funded").length,
    fulfilled: requests.filter((r) => r.status === "fulfilled").length,
  };

  const offerCounts = {
    all: offers.length,
    pending_review: offers.filter((o) => (o.status || "pending_review") === "pending_review").length,
    matched: offers.filter((o) => o.status === "matched").length,
    rejected: offers.filter((o) => o.status === "rejected").length,
  };

  if (!session?.accessToken) {
    return (
      <main className="min-h-screen bg-[#F2F5F3] px-5 py-16">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#0D3B3B]">
            Seek Admin
          </h1>

          <p className="mt-2 text-sm text-[#0D3B3B]/60">
            Sign in to manage assistance requests.
          </p>

          <form onSubmit={login} className="mt-6 space-y-4">
            <input
              required
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-xl bg-[#0D3B3B] px-5 py-3 font-semibold text-white"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F5F3] px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1BAA9C]">
              Seek administration
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#0D3B3B]">
              Admin dashboard
            </h1>
            <p className="mt-2 text-sm text-[#0D3B3B]/60">
              {(safetyReports || []).filter((r) => r.status === "open").length} open reports
              {" · "}
              {(supportChats || []).length} support chats
            </p>
            {(supportChats || []).length > 0 && (
              <p className="mt-1 text-sm font-semibold text-[#1BAA9C]">
                Open the Trust tab to answer visitor chat.
              </p>
            )}
          </div>

          <button
            onClick={() => {
              adminLogout();
              setSession(null);
              setRequests([]);
              setOffers([]);
            }}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            placeholder="Search requests or offers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-xl border border-[#0D3B3B]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1BAA9C]"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </p>
        )}


        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { id: "requests", label: "Requests" },
            { id: "offers", label: "Offers" },
            { id: "money", label: "Money" },
            { id: "trust", label: "Trust" },
            { id: "impact", label: "Impact" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAdminTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                adminTab === tab.id ? "bg-[#0D3B3B] text-white" : "bg-white border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {adminTab === "requests" && (
        <div>
        {/* REQUESTS */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#0D3B3B]">
            Requests{" "}
            <span className="text-sm font-normal text-[#0D3B3B]/50">
              ({filteredRequests.length})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "pending_review", label: "Pending" },
              { id: "published", label: "Published" },
              { id: "verification_required", label: "Needs verification" },
              { id: "rejected", label: "Rejected" },
              { id: "partially_funded", label: "Partly funded" },
              { id: "fulfilled", label: "Need met" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRequestFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  requestFilter === f.id
                    ? "bg-[#0D3B3B] text-white"
                    : "bg-white border text-[#0D3B3B]/70 hover:bg-slate-50"
                }`}
              >
                {f.label}
                {requestCounts[f.id] != null ? ` (${requestCounts[f.id]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-[#0D3B3B]/60">
            Loading requests...
          </p>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-[#0D3B3B]/60">
              No requests found.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((req) => {
              const needed = Number(req.amount_needed || 0);
              const raised = Number(req.amount_raised || 0);

              const funded = Math.min(
                100,
                Math.round(
                  (raised / Math.max(needed, 1)) * 100
                )
              );

              const contact = requestPrivate.find((p) => p.request_id === req.id);

              return (
                <div
                  key={req.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#1BAA9C]">
                        {req.category}
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-[#0D3B3B]">
                        {req.title}
                      </h2>

                      <p className="mt-1 text-sm text-[#0D3B3B]/60">
                        {req.location}
                      </p>
                    </div>

                    <div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {funded}% funded
                      </span>

                      <span className="mt-1 block text-xs text-[#0D3B3B]/50">
                        Posted {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-[#0D3B3B]/80">
                    {req.description}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-[#0D3B3B]/70 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold">Reference:</span>{" "}
                      {req.public_reference || "—"}
                    </p>

                    <p>
                      <span className="font-semibold">Needed:</span>{" "}
                      ₦{needed.toLocaleString()}
                    </p>

                    <p>
                      <span className="font-semibold">Raised:</span>{" "}
                      ₦{raised.toLocaleString()}
                    </p>
                  </div>

                  {contact && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-[#0D3B3B]/80">
                      <span className="font-semibold">Contact:</span>{" "}
                      {contact.full_name || "—"} • {contact.email || "—"}
                      {contact.phone ? ` • ${contact.phone}` : ""}
                    </div>
                  )}

                  <div className="mt-4">
                    <button
                      onClick={() => loadEvidence(req.id)}
                      className="rounded-xl border border-[#0D3B3B] px-4 py-2 text-sm font-semibold text-[#0D3B3B]"
                    >
                      View supporting evidence
                    </button>

                    {evidence[req.id]?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {evidence[req.id].map((file) => (
                          <div key={file.storage_path} className="space-y-2">
                            <p className="text-sm font-medium text-[#0D3B3B]">
                              {file.file_name}
                            </p>

                            {file.mime_type?.startsWith("image/") ? (
                              <img
                                src={file.signed_url}
                                alt={file.file_name}
                                className="w-full max-h-96 rounded-xl border object-contain"
                              />
                            ) : file.mime_type?.startsWith("video/") ? (
                              <video
                                src={file.signed_url}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-96 rounded-xl border bg-black"
                              >
                                Your browser does not support video playback.
                              </video>
                            ) : file.mime_type === "application/pdf" ? (
                              <iframe
                                src={file.signed_url}
                                title={file.file_name}
                                className="h-96 w-full rounded-xl border"
                              />
                            ) : (
                              <a
                                href={file.signed_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block text-sm font-medium text-[#1BAA9C] underline"
                              >
                                Open {file.file_name}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1BAA9C]"
                      style={{ width: `${funded}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#0D3B3B]/60">
                    {req.status}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {req.status === "pending_review" && (
                      <>
                        <button
                          onClick={() =>
                            changeStatus(req.id, "published")
                          }
                          className="rounded-xl bg-[#0D3B3B] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Publish
                        </button>

                        <button
                          onClick={() =>
                            changeStatus(
                              req.id,
                              "verification_required"
                            )
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Request verification
                        </button>

                        <button
                          onClick={() =>
                            changeStatus(req.id, "rejected")
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {req.status === "verification_required" && (
                      <>
                        <button
                          onClick={() => verifyRequest(req.id)}
                          className="rounded-xl bg-[#0D3B3B] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Approve verification
                        </button>

                        <button
                          onClick={() =>
                            changeStatus(req.id, "rejected")
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {(req.status === "published" ||
                      req.status === "partially_funded") && (
                      <>
                        <button
                          onClick={() =>
                            changeStatus(
                              req.id,
                              "verification_required"
                            )
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Request verification
                        </button>

                        <button
                          onClick={() =>
                            changeStatus(req.id, "fulfilled")
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Mark fulfilled
                        </button>

                        <button
                          onClick={() =>
                            changeStatus(req.id, "rejected")
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {req.status === "fulfilled" && (
                      <>
                        <span className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                          Fulfilled
                        </span>
                        {!req.celebrated_at && (
                          <button
                            onClick={async () => {
                              try {
                                setError("");
                                await celebrateAdminRequest(req);
                                await loadRequests();
                                window.alert("Celebration draft saved. Scroll to Community Impact and publish it.");
                              } catch (err) {
                                setError(err.message);
                                window.alert(err.message);
                              }
                            }}
                            className="rounded-xl border px-4 py-2 text-sm"
                          >
                            Celebrate this
                          </button>
                        )}
                      </>
                    )}

                    {req.status === "closed" && (
                      <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                        Closed
                      </span>
                    )}

                    {req.status === "rejected" && (
                      <span className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                        Rejected
                      </span>
                    )}

                    {req.status !== "fulfilled" &&
                      req.status !== "closed" &&
                      req.status !== "rejected" &&
                      req.status !== "published" &&
                      req.status !== "partially_funded" && (
                      <button
                        onClick={() => changeStatus(req.id, "fulfilled")}
                        className="rounded-xl bg-[#1BAA9C] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Mark fulfilled
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        </div>
        )}
        {adminTab === "offers" && (
        <div>
        {/* OFFERS */}
        <div className="mt-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#0D3B3B]">
              Offers{" "}
              <span className="text-sm font-normal text-[#0D3B3B]/50">
                ({filteredOffers.length})
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "pending_review", label: "Pending" },
                { id: "open", label: "Open" },
                { id: "matched", label: "Matched" },
                { id: "rejected", label: "Rejected" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOfferFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    offerFilter === f.id
                      ? "bg-[#0D3B3B] text-white"
                      : "bg-white border text-[#0D3B3B]/70 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                  {offerCounts[f.id] != null ? ` (${offerCounts[f.id]})` : ""}
                </button>
              ))}
            </div>
          </div>

          {filteredOffers.length === 0 ? (
            <p className="text-slate-500">No offers match this filter.</p>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map((offer) => {
                const linkedRequest = requests.find((r) => r.id === offer.request_id);
                const status = offer.status || "pending_review";
                const isPending = status === "pending_review";
                const isOpen = status === "open";
                const isMatched = status === "matched";
                const isRejected = status === "rejected";
                const isConnected = Boolean(offer.connected_at);
                const notified = !!offer.requester_notified_at;

                return (
                  <div
                    key={offer.id}
                    className="rounded-xl border p-5 bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-[#0D3B3B]">
                          {offer.description || "Offer to help"}
                        </h3>
                        <p className="mt-1 text-xs text-[#0D3B3B]/50">
                          Posted {new Date(offer.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isPending && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Pending review
                          </span>
                        )}
                        {isMatched && (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Matched
                          </span>
                        )}
                        {isRejected && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            Rejected
                          </span>
                        )}
                        {isMatched && (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            notified
                              ? "bg-[#1BAA9C]/10 text-[#1BAA9C]"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {notified ? "Requester notified" : "Notification pending"}
                          </span>
                        )}
                      </div>
                    </div>

                    {offer.request_id && (
                      <p className="mt-2 text-sm text-[#1BAA9C] font-semibold">
                        For request: {linkedRequest?.title || offer.request_id}
                      </p>
                    )}

                    {offer.media && offer.media.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {offer.media.map((m) => (
                          m.media_kind === "video" ? (
                            <video key={m.public_url} src={m.public_url} controls playsInline className="w-full max-h-[28rem] rounded-xl bg-black" />
                          ) : (
                            <a key={m.public_url} href={m.public_url} target="_blank" rel="noreferrer">
                              <img src={m.public_url} alt="" className="w-full max-h-[28rem] rounded-xl object-contain border bg-slate-50" />
                            </a>
                          )
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-slate-600">
                      {offer.contact_email || "—"}
                      {offer.contact_phone ? ` • ${offer.contact_phone}` : ""}
                    </p>

                    {(isPending || isOpen) && !isMatched && (
                      <div className="flex gap-3 mt-4">
                        {isPending && (
                        <button
                          onClick={() => updateOfferStatus(offer.id, "open")}
                          className="rounded-lg border px-3 py-2 text-sm"
                        >
                          Publish offer
                        </button>
                        )}
                        <button
                          type="button"
                          onClick={() => updateOfferStatus(offer.id, "matched")}
                          className="rounded-xl bg-[#0D3B3B] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Accept & Notify
                        </button>

                        <button
                          onClick={() => updateOfferStatus(offer.id, "rejected")}
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {isMatched && !isConnected && (
                      <button
                        type="button"
                        className="mt-4 rounded-xl border px-4 py-2 text-sm"
                        onClick={async () => {
                          try {
                            setError("");
                            await confirmAdminOfferConnected(offer.id);
                            await loadRequests();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Confirm connected
                      </button>
                    )}

                    {isMatched && isConnected && (
                      <p className="mt-3 text-sm font-semibold text-[#1BAA9C]">
                        Connection confirmed
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* VOLUNTEERS */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Volunteers</h2>

          {volunteers.length === 0 ? (
            <p className="text-slate-500">No volunteer applications yet.</p>
          ) : (
            <div className="space-y-4">
              {volunteers.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border p-5 bg-white"
                >
                  <h3 className="text-xl font-semibold">
                    {v.full_name || "Volunteer"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {v.email} {v.phone ? `• ${v.phone}` : ""}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {v.location}
                  </p>

                  {v.interests && (
                    <p className="mt-2 text-sm text-slate-700">
                      Interests: {v.interests}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
        )}
        {adminTab === "money" && (
        <div>
        {/* DONATIONS */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Donations</h2>
          <p className="mb-4 text-sm text-slate-600">
            Paystack confirms payment into the Seek/BSN settlement path. Seek does not pay requesters from this screen. Record fulfilment on the request after help has actually arrived.
          </p>

          {donations.length === 0 ? (
            <p className="text-slate-500">No donations yet.</p>
          ) : (
            <div className="space-y-4">
              {donations.map((donation) => (
                <div
                  key={donation.id}
                  className="rounded-xl border p-5 bg-white"
                >
                  <h3 className="text-xl font-semibold">
                    {donation.anonymous
                      ? "Anonymous donor"
                      : (donation.donor_name || donation.donor_email || "Donor")}
                  </h3>
                  {!donation.anonymous && donation.donor_email && donation.donor_name && (
                    <p className="text-sm text-slate-500">{donation.donor_email}</p>
                  )}

                  <p className="mt-1 text-slate-600">
                    Amount: ₦{Number(donation.amount || 0).toLocaleString()}
                  </p>

                  <p className="mt-1 text-slate-600">
                    Request:{" "}
                    {donation.request_id
                      ? requests.find((r) => r.id === donation.request_id)?.title ||
                        donation.request_id
                      : "General donation"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Paid:{" "}
                    {donation.paid_at
                      ? new Date(donation.paid_at).toLocaleString()
                      : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
        )}
        {adminTab === "trust" && (
        <div>
        {/* SUPPORT CHAT */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Support chat</h2>
          <p className="mb-4 text-sm text-slate-600">
            This inbox is the reliable place to see chats. The public-site bell only rings if you are also signed in on seekbsn.org as an admin profile.
          </p>
          {supportChats.length === 0 ? (
            <p className="text-slate-500">No visitor chats yet.</p>
          ) : (
            <div className="grid md:grid-cols-[220px_1fr] gap-4">
              <div className="space-y-2">
                {supportChats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full rounded-xl border p-3 text-left text-sm"
                    onClick={async () => {
                      setActiveChat(c);
                      try {
                        setChatMessages(await getAdminSupportMessages(c.id));
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    {c.email || "Anonymous visitor"}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border p-4 bg-white">
                {!activeChat ? (
                  <p className="text-slate-500 text-sm">Select a chat.</p>
                ) : (
                  <>
                    <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                      {chatMessages.map((m) => (
                        <p key={m.id} className="text-sm">
                          <span className="font-semibold">{m.sender}:</span> {m.body}
                        </p>
                      ))}
                    </div>
                    <form
                      className="flex gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await sendAdminSupportMessage(activeChat.id, chatReply);
                          setChatReply("");
                          setChatMessages(await getAdminSupportMessages(activeChat.id));
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      <input
                        value={chatReply}
                        onChange={(e) => setChatReply(e.target.value)}
                        className="flex-1 rounded-xl border px-3 py-2 text-sm"
                        placeholder="Reply"
                      />
                      <button className="rounded-xl bg-[#0D3B3B] text-white px-3 py-2 text-sm">Send</button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AUDIT LOG */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Audit log</h2>
          {auditLogs.length === 0 ? (
            <p className="text-slate-500">No audit events yet.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((row) => (
                <p key={row.id} className="text-sm text-slate-600">
                  {new Date(row.created_at).toLocaleString()} · {row.action} · {row.table_name}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* TRUST & SAFETY */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Trust & Safety reports</h2>
          {safetyReports.length === 0 ? (
            <p className="text-slate-500">No reports yet.</p>
          ) : (
            <div className="space-y-4">
              {safetyReports.map((report) => (
                <div key={report.id} className="rounded-xl border p-5 bg-white space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {report.status} · {report.target_type}
                  </p>
                  <p className="font-semibold">{report.reason}</p>
                  {report.details && <p className="text-sm text-slate-600">{report.details}</p>}
                  <p className="text-xs text-slate-500">
                    {report.reporter_email || "Anonymous"} · {report.target_id || "no target id"}
                  </p>
                  {report.status === "open" && (
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-sm"
                      onClick={async () => {
                        try {
                          await updateAdminSafetyReport(report.id, "reviewed");
                          await loadRequests();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Mark reviewed
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
        )}
        {adminTab === "impact" && (
        <div>
        {/* COMMUNITY IMPACT */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-2">Community Impact</h2>
          <p className="text-sm text-slate-500 mb-4">
            Do not publish full names, phone numbers, emails, addresses, or request IDs.
          </p>

          <form
            className="rounded-xl border p-5 bg-white space-y-3 mb-6"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setImpactSaving(true);
                setError("");
                const title = impactForm.title.trim();
                const story = impactForm.story.trim();
                if (!title) throw new Error("Title is required.");
                const sensitive = /(\+?\d[\d\s-]{7,}|@|request id|SEEK-)/i.test(title + " " + story);
                if (sensitive) {
                  throw new Error("This draft looks like it contains private details. Remove phone, email, or request IDs before saving.");
                }
                let media = {};
                const files = impactForm.files || (impactForm.file ? [impactForm.file] : []);
                if (files[0]) {
                  media = await uploadImpactMedia(files[0]);
                }
                if (impactEditingId) {
                  const patch = {
                    title,
                    story,
                    location: impactForm.location.trim() || null,
                    happened_on: impactForm.happened_on || null,
                  };
                  if (media.storage_path) {
                    patch.storage_path = media.storage_path;
                    patch.mime_type = media.mime_type || null;
                    patch.media_kind = media.media_kind || null;
                    patch.file_name = media.file_name || null;
                  }
                  await updateAdminImpactPost(impactEditingId, patch);
                  if (files.length > 1) {
                    await saveAdminImpactMedia(impactEditingId, files.slice(media.storage_path ? 1 : 0));
                  }
                  setImpactEditingId(null);
                } else {
                  const saved = await saveAdminImpactPost({
                    title,
                    story,
                    location: impactForm.location.trim() || null,
                    happened_on: impactForm.happened_on || null,
                    storage_path: media.storage_path || null,
                    mime_type: media.mime_type || null,
                    media_kind: media.media_kind || null,
                    file_name: media.file_name || null,
                    status: "draft",
                  });
                  if (files.length > 1 && saved?.id) {
                    await saveAdminImpactMedia(saved.id, files.slice(1));
                  }
                }
                setImpactForm({ title: "", story: "", location: "", happened_on: "", file: null, files: [] });
                await loadRequests();
              } catch (err) {
                setError(err.message);
              } finally {
                setImpactSaving(false);
              }
            }}
          >
            <input
              required
              value={impactForm.title}
              onChange={(e) => setImpactForm({ ...impactForm, title: e.target.value })}
              placeholder="Title"
              className="w-full rounded-xl border px-4 py-3"
            />
            <textarea
              value={impactForm.story}
              onChange={(e) => setImpactForm({ ...impactForm, story: e.target.value })}
              placeholder="Story / caption"
              rows={4}
              className="w-full rounded-xl border px-4 py-3"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={impactForm.location}
                onChange={(e) => setImpactForm({ ...impactForm, location: e.target.value })}
                placeholder="Location (optional)"
                className="rounded-xl border px-4 py-3"
              />
              <input
                type="date"
                value={impactForm.happened_on}
                onChange={(e) => setImpactForm({ ...impactForm, happened_on: e.target.value })}
                className="rounded-xl border px-4 py-3"
              />
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={(e) => {
                const list = Array.from(e.target.files || []).slice(0, 8);
                setImpactForm({ ...impactForm, file: list[0] || null, files: list });
              }}
            />
            <button
              type="submit"
              disabled={impactSaving}
              className="rounded-xl bg-[#0D3B3B] text-white px-4 py-3 text-sm font-semibold"
            >
              {impactSaving ? "Saving…" : (impactEditingId ? "Save changes" : "Save draft")}
            </button>
          </form>

          {impactPosts.length === 0 ? (
            <p className="text-slate-500">No Community Impact posts yet.</p>
          ) : (
            <div className="space-y-4">
              {impactPosts.map((post) => (
                <div key={post.id} className="rounded-xl border p-5 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{post.status}</p>
                      <h3 className="text-xl font-semibold">{post.title}</h3>
                      {post.location && <p className="text-sm text-slate-600">{post.location}</p>}
                    </div>
                  </div>
                  {post.story && <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.story}</p>}
                  {post.public_url && post.media_kind === "video" ? (
                    <video src={post.public_url} controls playsInline preload="metadata" className="w-full max-h-80 rounded-xl bg-black" />
                  ) : post.public_url ? (
                    <img src={post.public_url} alt="" className="w-full max-h-80 rounded-xl object-contain border" />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-sm"
                      onClick={() => {
                        setImpactEditingId(post.id);
                        setImpactForm({
                          title: post.title || "",
                          story: post.story || "",
                          location: post.location || "",
                          happened_on: post.happened_on || "",
                          file: null,
                          files: [],
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    {post.status !== "published" ? (
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-2 text-sm"
                        onClick={async () => {
                          try {
                            await updateAdminImpactPost(post.id, { status: "published" });
                            await loadRequests();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Publish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-2 text-sm"
                        onClick={async () => {
                          try {
                            await updateAdminImpactPost(post.id, { status: "draft" });
                            await loadRequests();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        Unpublish
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-sm text-red-700"
                      onClick={async () => {
                        if (!window.confirm("Delete this impact post?")) return;
                        try {
                          await deleteAdminImpactPost(post.id);
                          await loadRequests();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        )}
      </div>
    </main>
  );
}
