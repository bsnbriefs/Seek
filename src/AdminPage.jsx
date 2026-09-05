import { useEffect, useState } from "react";
import {
  adminLogin,
  getAdminSession,
  adminLogout,
  getAdminRequests,
getAdminOffers,
updateAdminRequestStatus,
updateAdminOfferStatus,
verifyAdminRequest,
getAdminEvidence,
} from "./lib/adminApi";

export default function AdminPage() {
  const [session, setSession] = useState(() => getAdminSession());
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [evidence, setEvidence] = useState({});
  const [loading, setLoading] = useState(false);

  async function loadRequests() {
  try {
    setLoading(true);
    setError("");

    const [requestData, offerData] = await Promise.all([
      getAdminRequests(),
      getAdminOffers(),
    ]);

    setRequests(requestData);
    setOffers(offerData);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
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

  useEffect(() => {
    if (session?.accessToken) {
      loadRequests();
    }
  }, [session]);

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
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1BAA9C]">
              Seek administration
            </p>

            <h1 className="mt-1 font-display text-3xl font-bold text-[#0D3B3B]">
              Manage requests
            </h1>
          </div>

          <button
            onClick={() => {
              adminLogout();
              setSession(null);
              setRequests([]);
            }}
            className="rounded-xl border px-4 py-2"
          >
            Sign out
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-[#0D3B3B]/60">
            Loading requests...
          </p>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-[#0D3B3B]/60">
              No requests found.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((req) => {
              const needed = Number(req.amount_needed || 0);
              const raised = Number(req.amount_raised || 0);

              const funded = Math.min(
                100,
                Math.round(
                  (raised / Math.max(needed, 1)) * 100
                )
              );

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

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      {funded}% funded
                    </span>
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
                            changeStatus(req.id, "rejected")
                          }
                          className="rounded-xl border px-4 py-2 text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {req.status === "fulfilled" && (
                      <span className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        Fulfilled
                      </span>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
                          }
}
