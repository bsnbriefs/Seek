import { supabaseConfigured, supabaseFetch } from "./supabase";

export async function submitRequest(payload) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  // Evidence uploads require an authenticated account. Check this BEFORE
  // creating the request so we never save a request and only discover later
  // that its evidence cannot be uploaded.
  const evidenceFiles = (payload.evidenceFiles && payload.evidenceFiles.length)
    ? Array.from(payload.evidenceFiles)
    : (payload.evidenceFile ? [payload.evidenceFile] : []);
  if (evidenceFiles.length > 5) {
    throw new Error("You can attach up to 5 supporting files.");
  }

  let evidenceSession = null;
  if (evidenceFiles.length) {
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
  if (evidenceFiles.length) {
    const accessToken = evidenceSession?.access_token;
    const total = evidenceFiles.length;
    let index = 0;
    for (const file of evidenceFiles) {
      index += 1;
      if (typeof payload.onProgress === "function") {
        payload.onProgress({
          index,
          total,
          name: file.name || "file",
        });
      }
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
          !uploadResult?.error && !uploadResult?.details
            ? "HTTP " + uploadResponse.status
            : "",
        ].filter(Boolean);
        throw new Error(
          (parts.length ? parts.join(" | ") : "Evidence upload failed.") +
          " (" + (file.name || "file") + ")"
        );
      }
    }
  }

  return request;
}

export async function listPublicOffers() {
  if (!supabaseConfigured) return [];
  const rows = await supabaseFetch(
    "public_open_offers?select=id,description,created_at,status&order=created_at.desc&limit=48"
  );
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];
  const ids = list.map((row) => row.id).filter(Boolean);
  let media = [];
  try {
    media = await supabaseFetch(
      "offer_media?select=offer_id,storage_path,media_kind,mime_type&offer_id=in.(" + ids.map((id) => `"${id}"`).join(",") + ")"
    );
  } catch (_e) {
    media = [];
  }
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const byOffer = {};
  (Array.isArray(media) ? media : []).forEach((row) => {
    const url = row.storage_path
      ? `${base}/storage/v1/object/public/seek-impact/` +
        String(row.storage_path).split("/").map(encodeURIComponent).join("/")
      : null;
    if (!url) return;
    byOffer[row.offer_id] = byOffer[row.offer_id] || [];
    byOffer[row.offer_id].push({
      public_url: url,
      media_kind: String(row.media_kind || row.mime_type || "").includes("video") ? "video" : "image",
    });
  });
  return list.map((row) => ({ ...row, media: byOffer[row.id] || [] }));
}

export async function uploadOfferMedia(offerId, file, accessToken) {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "offer");
  form.append("offer_id", offerId);
  form.append("original_name", file.name || "offer");
  const headers = {
    apikey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-media-upload`,
    { method: "POST", headers, body: form }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "Could not upload offer photo.");
  }
  return result;
}

export async function submitOffer(payload) {
  if (!supabaseConfigured) {
    throw new Error("Seek backend is not configured yet.");
  }

  const rows = await supabaseFetch("offers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      description: payload.description,
      category: payload.category,
      request_id: payload.requestId || null,
      contact_email: payload.contactEmail || null,
      contact_phone: payload.contactPhone || null,
    }),
  });

  const saved = Array.isArray(rows) ? rows[0] : rows;
  const files = payload.files || [];
  if (files.length && !saved?.id) {
    throw new Error("Offer saved, but Seek could not attach photos. Try again.");
  }
  if (saved?.id && files.length) {
    const session = getUserSession();
    for (const file of files.slice(0, 6)) {
      await uploadOfferMedia(saved.id, file, session?.access_token);
    }
  }
  return saved;
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
    publicUpdate: row.public_update || "",
    appreciationPath: row.appreciation_storage_path || "",
    appreciationMime: row.appreciation_mime_type || "",
    appreciationKind: row.appreciation_kind || "",
    appreciationUrl: row.appreciation_storage_path
      ? `${(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "")}/storage/v1/object/public/seek-impact/` +
        String(row.appreciation_storage_path).split("/").map(encodeURIComponent).join("/")
      : "",
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



function mapImpactMedia(row, extra = []) {
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  function urlFor(path) {
    if (!path) return null;
    return `${base}/storage/v1/object/public/seek-impact/` + String(path).split("/").map(encodeURIComponent).join("/");
  }
  const items = [];
  if (row.storage_path) {
    items.push({
      public_url: urlFor(row.storage_path),
      media_kind: row.media_kind,
    });
  }
  extra.forEach((m) => {
    if (!m?.storage_path) return;
    if (row.storage_path && m.storage_path === row.storage_path) return;
    items.push({
      public_url: urlFor(m.storage_path),
      media_kind: m.media_kind,
    });
  });
  return items;
}
export async function listPublishedImpact() {
  if (!supabaseConfigured) return [];
  const rows = await supabaseFetch(
    "community_impact?select=id,title,story,location,happened_on,storage_path,mime_type,media_kind,file_name,published_at,created_at,community_impact_media(storage_path,mime_type,media_kind)&status=eq.published&order=published_at.desc.nullslast&order=created_at.desc"
  );
  const list = Array.isArray(rows) ? rows : [];
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return list.map((row) => {
    const mediaItems = mapImpactMedia(row, row.community_impact_media || []);
    return {
      ...row,
      mediaItems,
      public_url: mediaItems[0]?.public_url || null,
      media_kind: mediaItems[0]?.media_kind || row.media_kind,
    };
  });
}


export async function getPublishedImpactById(id) {
  if (!supabaseConfigured || !id) return null;
  const rows = await supabaseFetch(
    `community_impact?id=eq.${encodeURIComponent(id)}&status=eq.published&select=id,title,story,location,happened_on,storage_path,mime_type,media_kind,file_name,published_at,created_at,community_impact_media(storage_path,mime_type,media_kind)&limit=1`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const mediaItems = mapImpactMedia(row, row.community_impact_media || []);
  return {
    ...row,
    mediaItems,
    public_url: mediaItems[0]?.public_url || null,
    media_kind: mediaItems[0]?.media_kind || row.media_kind,
  };
}

export async function getPublicRequestById(requestId) {
  if (!supabaseConfigured || !requestId) return null;
  const rows = await supabaseFetch(
    `requests?id=eq.${encodeURIComponent(requestId)}&status=in.(published,partially_funded,fulfilled)&select=*&limit=1`
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
  const id = await supabaseFetch("rpc/start_support_conversation", {
    method: "POST",
    body: JSON.stringify({ p_email: email || null }),
  });
  return { id };
}

export async function listSupportMessages(conversationId) {
  if (!supabaseConfigured || !conversationId) return [];
  const rows = await supabaseFetch("rpc/get_support_messages", {
    method: "POST",
    body: JSON.stringify({ p_conversation_id: conversationId }),
  });
  return Array.isArray(rows) ? rows : [];
}

export async function sendSupportMessage(conversationId, sender, body) {
  if (!supabaseConfigured) throw new Error("Seek backend is not configured yet.");
  const text = String(body || "").trim();
  if (!text) throw new Error("Type a message first.");
  await supabaseFetch("rpc/send_support_message", {
    method: "POST",
    body: JSON.stringify({
      p_conversation_id: conversationId,
      p_sender: sender,
      p_body: text.slice(0, 2000),
    }),
  });
}


async function countRows(path) {
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !key) return 0;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  const range = response.headers.get("content-range") || "";
  const total = range.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

export async function getSeekLiveStats() {
  const [openRequests, fulfilled, donationRows] = await Promise.all([
    countRows("requests?select=id&is_public=eq.true&status=in.(published,partially_funded)"),
    countRows("requests?select=id&status=eq.fulfilled"),
    supabaseFetch("donations?select=amount,status&status=eq.success&limit=1000").catch(() =>
      supabaseFetch("donations?select=amount&limit=1000").catch(() => [])
    ),
  ]);

  const donations = Array.isArray(donationRows) ? donationRows : [];
  const raised = donations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  return {
    openRequests,
    fulfilled,
    raised,
    donationCount: donations.length,
  };
}


export async function postRequestPublicUpdate(requestId, body) {
  const session = getUserSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to post an update.");
  }
  const response = await fetch(`${AUTH_URL}/rest/v1/rpc/add_seek_request_update`, {
    method: "POST",
    headers: {
      apikey: AUTH_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_request_id: requestId,
      p_body: String(body || "").trim(),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || "Could not save your update.");
  }
}


export async function uploadAppreciationMedia(requestId, file, onProgress) {
  const session = getUserSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to upload appreciation media.");
  }
  if (!file) throw new Error("Choose a photo or video first.");
  if (typeof onProgress === "function") onProgress("Uploading appreciation…");
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "appreciation");
  form.append("request_id", requestId);
  form.append("original_name", file.name || "appreciation");
  const uploadResponse = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-media-upload`,
    {
      method: "POST",
      headers: {
        apikey:
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    }
  );
  const uploadResult = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok || !uploadResult?.success) {
    throw new Error(
      [uploadResult?.error, uploadResult?.details].filter(Boolean).join(" — ") ||
        "Appreciation upload failed."
    );
  }
  return uploadResult;
}


export async function getRequestAppreciation(requestId) {
  if (!supabaseConfigured || !requestId) return [];
  const rows = await supabaseFetch(
    `request_appreciation?request_id=eq.${encodeURIComponent(requestId)}&select=*&order=created_at.asc`
  );
  const list = Array.isArray(rows) ? rows : [];
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return list.filter((row) => row?.storage_path).map((row) => {
    const path = String(row.storage_path);
    const kind = String(row.media_kind || row.mime_type || path).toLowerCase();
    const isVideo = kind.includes("video") || path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".mov");
    return {
      ...row,
      media_kind: isVideo ? "video" : "image",
      public_url:
        `${base}/storage/v1/object/public/seek-impact/` +
        path.split("/").map(encodeURIComponent).join("/"),
    };
  });
}


export async function listAppreciationStories() {
  if (!supabaseConfigured) return [];
  let rows = [];
  try {
    rows = await supabaseFetch(
      "request_appreciation?select=id,request_id,storage_path,mime_type,media_kind,file_name,created_at,requests(title,location,status)&order=created_at.desc"
    );
  } catch (_e) {
    rows = await supabaseFetch(
      "request_appreciation?select=id,request_id,storage_path,mime_type,media_kind,file_name,created_at&order=created_at.desc"
    );
  }
  const list = Array.isArray(rows) ? rows : [];
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return list
    .filter((row) => row?.storage_path && (row.requests?.status === "fulfilled" || !row.requests))
    .map((row) => {
      const path = String(row.storage_path);
      const kind = String(row.media_kind || row.mime_type || path).toLowerCase();
      const isVideo = kind.includes("video") || /\.(mp4|webm|mov)$/i.test(path);
      return {
        id: "thanks-" + row.id,
        title: (row.requests && row.requests.title) || "A thank you from someone Seek helped",
        story: "Appreciation from a fulfilled Seek request.",
        location: row.requests?.location || "",
        media_kind: isVideo ? "video" : "image",
        public_url:
          `${base}/storage/v1/object/public/seek-impact/` +
          path.split("/").map(encodeURIComponent).join("/"),
        request_id: row.request_id,
        created_at: row.created_at,
      };
    });
}


export async function savePushSubscription(subscription) {
  const session = getUserSession();
  if (!session?.access_token || !session?.user?.id) return;
  const json = subscription.toJSON ? subscription.toJSON() : subscription;
  const endpoint = json.endpoint;
  const p256dh = json.keys && json.keys.p256dh;
  const auth = json.keys && json.keys.auth;
  if (!endpoint || !p256dh || !auth) return;
  await fetch(`${AUTH_URL}/rest/v1/push_subscriptions`, {
    method: "POST",
    headers: {
      apikey: AUTH_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: session.user.id,
      endpoint,
      p256dh,
      auth,
    }),
  });
}

export async function enableSeekPush() {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await savePushSubscription(sub);
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
