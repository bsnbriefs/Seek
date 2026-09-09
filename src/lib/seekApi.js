import { supabaseConfigured, supabaseFetch } from "./supabase";

export async function submitRequest(payload) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  // Evidence uploads require an authenticated account. Check this BEFORE
  // creating the request so we never save a request and only discover later
  // that its evidence cannot be uploaded.
  let evidenceSession = null;
  if (payload.evidenceFile) {
    evidenceSession = getUserSession();
    const accessToken = evidenceSession?.access_token;
    const sessionEmail = (evidenceSession?.user?.email || "").trim().toLowerCase();
    const formEmail = (payload.email || "").trim().toLowerCase();

    if (!accessToken) {
      throw new Error(
        "Please sign in before submitting a request with supporting evidence."
      );
    }

    if (sessionEmail && formEmail && sessionEmail !== formEmail) {
      throw new Error(
        "Please use the same email for this request as the email on your Seek account (" +
          sessionEmail +
          ")."
      );
    }
  }

  const amount =
    Number(String(payload.amount || "").replace(/[^0-9.]/g, "")) || null;

  const rows = await supabaseFetch("rpc/submit_seek_request", {
    method: "POST",
    body: JSON.stringify({
      p_title: payload.need,
      p_category: payload.category,
      p_location: payload.location,
      p_description: payload.description,
      p_amount_needed: amount,
      p_urgency: payload.urgency?.toLowerCase(),
      p_assistance_type: payload.type,
      p_full_name: payload.name,
      p_email: payload.email,
      p_phone: payload.phone,
    }),
  });

  const request = Array.isArray(rows) ? rows[0] : rows;

  if (!request?.id) {
    throw new Error("Request was submitted but no request ID was returned.");
  }

  // Secure server-side evidence upload (images, videos, PDF).
  // Validation of type/size happens in the Edge Function — not the browser.
  // Requires a real logged-in user access token (not the publishable key).
  if (payload.evidenceFile) {
    const accessToken = evidenceSession?.access_token;
    const file = payload.evidenceFile;
    const form = new FormData();

    form.append("file", file);
    form.append("purpose", "evidence");
    form.append("request_id", request.id);
    form.append("original_name", file.name || "evidence");

    const uploadResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-media-upload`,
      {
        method: "POST",
        headers: {
          apikey:
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    const uploadResult = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok || !uploadResult?.success) {
      const parts = [
        uploadResult?.error,
        uploadResult?.details,
        uploadResult?.hint,
        uploadResult?.keySource
          ? "keySource=" + uploadResult.keySource
          : "",
        uploadResult?.keyPrefix
          ? "keyPrefix=" + uploadResult.keyPrefix
          : "",
        !uploadResult?.error && !uploadResult?.details
          ? "HTTP " + uploadResponse.status
          : "",
      ].filter(Boolean);

      throw new Error(
        parts.length ? parts.join(" | ") : "Evidence upload failed."
      );
    }
  }

  return request;
}

export async function submitOffer(payload) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  const rows = await supabaseFetch("offers", {
    method: "POST",
    body: JSON.stringify({
      description: payload.description,
      category: payload.category,
      request_id: payload.requestId || null,
      contact_email: payload.contactEmail || null,
      contact_phone: payload.contactPhone || null,
    }),
  });

  return rows?.[0] || rows;
}

export async function submitVolunteer(payload) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  const rows = await supabaseFetch("volunteers", {
    method: "POST",
    body: JSON.stringify({
      full_name: payload.name,
      email: payload.email,
      phone: payload.phone,
      location: payload.location,
      interests: payload.interests,
    }),
  });

  return rows?.[0] || rows;
}

export async function listPublishedRequests() {
  if (!supabaseConfigured) {
    return [];
  }

  return supabaseFetch(
    "requests?select=*&is_public=eq.true&status=in.(published,partially_funded)&order=created_at.desc&limit=48"
  );
}

export async function listMatchedOfferRequestIds() {
  if (!supabaseConfigured) {
    return [];
  }

  const rows = await supabaseFetch(
    "offers?select=request_id&status=eq.matched&request_id=not.is.null"
  );

  return rows.map((row) => row.request_id);
}

export function mapRequestRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    location: row.location,
    description: row.description,
    amountNeeded: row.amount_needed,
    amountRaised: row.amount_raised,
    urgency: row.urgency,
    verification: row.verification_status,
    status: row.status,
    type:
      (row.assistance_type || "")
        .toLowerCase()
        .includes("item")
        ? "item"
        : "money",
  };
}

export async function initializeDonation({
  amount,
  email,
  requestId = null,
  anonymous = false,
  callbackUrl = window.location.origin,
}) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        amount,
        email,
        request_id: requestId,
        anonymous,
        callback_url: callbackUrl,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.authorization_url) {
    throw new Error(
      data?.error || "Payment could not be initialized."
    );
  }

  return data;
}

export async function verifyDonation(reference) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ reference }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || "Payment verification failed."
    );
  }

  return data;
}

/* ---------- Requester auth & My Requests ---------- */

const AUTH_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();

const AUTH_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

const USER_SESSION_KEY = "seek_user_session";

export function getUserSession() {
  try {
    return JSON.parse(
      localStorage.getItem(USER_SESSION_KEY) || "null"
    );
  } catch {
    return null;
  }
}

export function setUserSession(session) {
  if (!session) {
    localStorage.removeItem(USER_SESSION_KEY);
    return;
  }

  localStorage.setItem(
    USER_SESSION_KEY,
    JSON.stringify(session)
  );
}

export function userLogout() {
  setUserSession(null);
}

export async function userSignUp(email, password) {
  const response = await fetch(
    `${AUTH_URL}/auth/v1/signup`,
    {
      method: "POST",
      headers: {
        apikey: AUTH_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.msg ||
        data?.error_description ||
        data?.message ||
        "Sign up failed."
    );
  }

  // If email confirmation is disabled, we get a session immediately
  if (data?.access_token) {
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    };

    setUserSession(session);
    return session;
  }

  return {
    needsConfirmation: true,
    user: data?.user || null,
  };
}

export async function userSignIn(email, password) {
  const response = await fetch(
    `${AUTH_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: AUTH_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error_description ||
        data?.msg ||
        "Invalid email or password."
    );
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
  };

  setUserSession(session);

  return session;
}

export async function listMyRequests() {
  const session = getUserSession();

  if (!session?.access_token) {
    throw new Error(
      "Please sign in to view your requests."
    );
  }

  if (!supabaseConfigured) {
    return [];
  }

  const response = await fetch(
    `${AUTH_URL}/rest/v1/rpc/list_my_seek_requests`,
    {
      method: "POST",
      headers: {
        apikey: AUTH_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.hint ||
        "Could not load your requests. The tracking function may not be set up yet."
    );
  }

  return Array.isArray(data) ? data : [];
    }
/* =========================================================
   SEEK EVIDENCE VIEWING
   ========================================================= */

const EVIDENCE_BUCKET =
  import.meta.env.VITE_SEEK_EVIDENCE_BUCKET || "seek-evidence";

/**
 * Get evidence attached to a public request.
 *
 * The storage bucket should be public OR the returned storage
 * path must be accessible through the configured Supabase
 * storage endpoint.
 */
export async function getRequestEvidence(requestId) {
  if (!supabaseConfigured || !requestId) {
    return [];
  }

  const rows = await supabaseFetch(
    `request_evidence?request_id=eq.${encodeURIComponent(
      requestId
    )}&select=id,request_id,file_name,storage_path,mime_type,file_size,created_at&order=created_at.asc`
  );

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((file) => {
    const storagePath = file.storage_path || "";
    const publicUrl =
      `${AUTH_URL}/storage/v1/object/public/seek-evidence/` +
      storagePath
        .split("/")
        .map(encodeURIComponent)
        .join("/");
    return {
      ...file,
      public_url: publicUrl,
      signed_url: publicUrl,
    };
  });
}


export async function listPublishedImpact() {
  if (!supabaseConfigured) return [];
  const rows = await supabaseFetch(
    "community_impact?select=id,title,story,location,happened_on,storage_path,mime_type,media_kind,file_name,published_at,created_at&status=eq.published&order=published_at.desc.nullslast&order=created_at.desc"
  );
  const list = Array.isArray(rows) ? rows : [];
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return list.map((row) => ({
    ...row,
    public_url: row.storage_path
      ? `${base}/storage/v1/object/public/seek-impact/` +
        String(row.storage_path).split("/").map(encodeURIComponent).join("/")
      : null,
  }));
}


export async function getPublicRequestById(requestId) {
  if (!supabaseConfigured || !requestId) return null;
  const rows = await supabaseFetch(
    `requests?id=eq.${encodeURIComponent(requestId)}&is_public=eq.true&status=in.(published,partially_funded,fulfilled)&select=*&limit=1`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? mapRequestRow(row) : null;
}


export async function submitSafetyReport(payload) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }
  const reason = String(payload.reason || "").trim();
  if (reason.length < 3) {
    throw new Error("Please choose a reason for this report.");
  }
  const rows = await supabaseFetch("safety_reports", {
    method: "POST",
    body: JSON.stringify({
      target_type: payload.targetType || "request",
      target_id: payload.targetId || null,
      reason,
      details: payload.details || null,
      reporter_email: payload.email || null,
      status: "open",
    }),
  });
  return rows?.[0] || rows;
}


export async function startSupportConversation(email) {
  if (!supabaseConfigured) throw new Error("Seek backend is not configured yet.");
  const rows = await supabaseFetch("support_conversations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      email: email || null,
      visitor_key: "web",
      status: "open",
    }),
  });
  return rows?.[0] || rows;
}

export async function listSupportMessages(conversationId) {
  if (!supabaseConfigured || !conversationId) return [];
  const rows = await supabaseFetch(
    `support_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&order=created_at.asc`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function sendSupportMessage(conversationId, sender, body) {
  if (!supabaseConfigured) throw new Error("Seek backend is not configured yet.");
  const text = String(body || "").trim();
  if (!text) throw new Error("Type a message first.");
  const rows = await supabaseFetch("support_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      conversation_id: conversationId,
      sender,
      body: text.slice(0, 2000),
    }),
  });
  return rows?.[0] || rows;
}
