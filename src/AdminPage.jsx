import { useEffect, useState } from "react";
import {
  adminLogin,
  getAdminSession,
  adminLogout,
  getAdminRequests,
  updateAdminRequestStatus,
  verifyAdminRequest
} from "./lib/adminApi";

export default function AdminPage() {
  const [session, setSession] = useState(() => getAdminSession());
  const [requests, setRequests] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");
      setRequests(await getAdminRequests());
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
      setSession(await adminLogin(email, password));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function changeStatus(id, status) {
    try {
      await updateAdminRequestStatus(id, status);
      await loadRequests();
    } catch (err) {
      setError(err.message);
    }
  }
      async function verifyRequest(id) {
    try {
      await verifyAdminRequest(id, "Verified by BSN admin");
      await loadRequests();
    } catch (err) {
      setError(err.message);
    }
      }
  }

  useEffect(() => {
    if (session?.accessToken) loadRequests();
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
              className="w-full rounded-xl border p-3"
            />

            <input
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border p-3"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              disabled={loading}
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1BAA9C]">
              Seek administration
            </p>
            <h1 className="font-display text-3xl font-bold text-[#0D3B3B]">
              Manage requests
            </h1>
          </div>

          <button
            onClick={() => {
              adminLogout();
              setSession(null);
            }}
            className="rounded-xl border px-4 py-2"
          >
            Sign out
          </button>
        </div>

        {error && <p className="mb-4 text-red-600">{error}</p>}

        {loading ? (
          <p>Loading requests...</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#1BAA9C]">
                      {req.category}
                    </p>
                    <h2 className="text-xl font-bold text-[#0D3B3B]">
                      {req.title}
                    </h2>
                    <p className="text-sm text-[#0D3B3B]/60">
                      {req.location}
                    </p>
                    <p className="mt-3 text-sm">{req.description}</p>
                    <div className="mt-4 grid gap-2 text-sm text-[#0D3B3B]/70 sm:grid-cols-3">
  <p>
    <span className="font-semibold">Reference:</span>{" "}
    {req.public_reference || req.id}
  </p>
  <p>
    <span className="font-semibold">Needed:</span>{" "}
    ₦{Number(req.amount_needed || 0).toLocaleString()}
  </p>
  <p>
    <span className="font-semibold">Raised:</span>{" "}
    ₦{Number(req.amount_raised || 0).toLocaleString()}
  </p>
</div>
                  </div>
<div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
  <div
    className="h-full rounded-full bg-[#1BAA9C]"
    style={{
      width: `${Math.min(
        100,
        Math.round(
          (Number(req.amount_raised || 0) /
            Math.max(Number(req.amount_needed || 0), 1)) *
            100
        )
      )}%`,
    }}
  />
</div> 
                  <p className="mt-2 text-xs font-semibold text-[#0D3B3B]/60">
  {Math.min(
  100,
  Math.round(
    (Number(req.amount_raised || 0) /
      Math.max(Number(req.amount_needed || 0), 1)) *
      1000
  ) / 10
)}% funded        
</p>
                  <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                    {req.status}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {req.status === "pending_review" && (
  <>
    <button
      onClick={() => changeStatus(req.id, "published")}
      className="rounded-xl bg-[#0D3B3B] px-4 py-2 text-sm font-semibold text-white"
    >
      Publish
    </button>

    <button
      onClick={() => changeStatus(req.id, "verification_required")}
      className="rounded-xl border px-4 py-2 text-sm"
    >
      Request verification
    </button>

    <button
      onClick={() => changeStatus(req.id, "rejected")}
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
      onClick={() => changeStatus(req.id, "rejected")}
      className="rounded-xl border px-4 py-2 text-sm"
    >
      Reject
    </button>
  </>
)}

{(req.status === "published" || req.status === "partially_funded") && (
  <>
    <button
      onClick={() => changeStatus(req.id, "verification_required")}
      className="rounded-xl border px-4 py-2 text-sm"
    >
      Request verification
    </button>

    <button
      onClick={() => changeStatus(req.id, "rejected")}
      className="rounded-xl border px-4 py-2 text-sm"
    >
      Reject
    </button>
  </>
)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
