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
    evidenceSession = (await refreshUserSession()) || getUserSession();
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
      p_title: payload.title || payload.need,
      p_category: payload.category,
      p_location: payload.location,
      p_description: payload.description || payload.need,
      p_amount_needed: amount,
      p_urgency: payload.urgency ? String(payload.urgency).toLowerCase() : null,
      p_assistance_type: payload.type || null,
      p_full_name: payload.name,
      p_email: payload.email,
      p_phone: payload.phone,
    }),
  });

  const request = Array.isArray(rows) ? rows[0] : rows;

  if (!request?.id) {
    throw new Error("Request was submitted but no request ID was returned.");
  }

  if (payload.bankName || payload.accountName || payload.accountNumber) {
    try {
      const session = getUserSession();
      const token = session?.access_token || "";
      const base = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
      const anon = (
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        ""
      ).trim();
      await fetch(base + "/rest/v1/request_private?request_id=eq." + encodeURIComponent(request.id), {
        method: "PATCH",
        headers: {
          apikey: anon,
          Authorization: "Bearer " + (token || anon),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          bank_name: payload.bankName || null,
          account_name: payload.accountName || null,
          account_number: payload.accountNumber || null,
        }),
      });
    } catch (_e) {}
  }

  const owner = getUserSession();
  if (owner?.user?.id) {
    try {
      const profile = await getMyProfile().catch(() => null);
      await supabaseFetch("requests?id=eq." + request.id, {
        method: "PATCH",
        body: JSON.stringify({
          user_id: owner.user.id,
          avatar_path: profile?.avatar_path || null,
        }),
      });
    } catch (_e) {}
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

export async function uploadRequestEvidence(requestId, file) {
  const session = (await refreshUserSession()) || getUserSession();
  if (!session?.access_token) throw new Error("Please sign in to upload evidence.");
  if (!requestId) throw new Error("A request is required for this evidence.");
  if (!file) throw new Error("Choose a photo or video first.");
  await assertFileNotAlreadyUploaded(file);

  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "evidence");
  form.append("request_id", requestId);
  form.append("original_name", file.name || "evidence");

  const uploadResponse = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-media-upload`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    }
  );
  const result = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok || !result?.success) {
    throw new Error([result?.error, result?.details, result?.hint].filter(Boolean).join(" — ") || "Evidence upload failed.");
  }
  return result;
}

export async function listPublicOffers() {
  if (!supabaseConfigured) return [];
  let rows = await supabaseFetch(
    "offers?select=id,description,created_at,status,category,city,created_by,avatar_path&status=in.(open,matched)&order=created_at.desc&limit=48"
  ).catch(() => []);
  if (!Array.isArray(rows) || !rows.length) {
    rows = await supabaseFetch(
      "public_open_offers?select=id,description,created_at,status,category,city,created_by,avatar_path&order=created_at.desc&limit=48"
    ).catch(() => []);
  }
  const list = (Array.isArray(rows) ? rows : []).filter((row) => {
    if (!row.created_at) return true;
    return (Date.now() - new Date(row.created_at).getTime()) / 86400000 <= 21;
  });
  if (!list.length) return [];
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return list.map((row) => ({
    ...row,
    mediaCount: Number(row.media_count || row.mediaCount || 0),
    avatar_url: row.avatar_path
      ? `${baseUrl}/storage/v1/object/public/seek-impact/` + String(row.avatar_path).split("/").map(encodeURIComponent).join("/")
      : null,
  }));
}

export async function getOfferMedia(offerId) {
  if (!supabaseConfigured || !offerId) return [];
  const rows = await supabaseFetch(
    "offer_media?select=storage_path,media_kind,mime_type&offer_id=eq." + encodeURIComponent(offerId)
  );
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    public_url: row.storage_path
      ? `${base}/storage/v1/object/public/seek-impact/` +
        String(row.storage_path).split("/").map(encodeURIComponent).join("/")
      : null,
    media_kind: String(row.media_kind || row.mime_type || "").includes("video") ? "video" : "image",
  })).filter((row) => row.public_url);
}

export async function uploadOfferMedia(offerId, file, accessToken) {
  const session = getUserSession();
  const token = accessToken || session?.access_token;
  if (!token) throw new Error("Sign in to upload giveaway proof.");
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "offer");
  form.append("offer_id", offerId);
  form.append("original_name", file.name || "offer");
  const headers = {
    apikey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
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

  const created = await supabaseFetch("rpc/create_seek_offer", {
    method: "POST",
    body: JSON.stringify({
      p_description: payload.description,
      p_category: payload.category || null,
      p_request_id: payload.requestId || null,
      p_contact_email: payload.contactEmail || null,
      p_contact_phone: payload.contactPhone || null,
      p_city: payload.city || null,
      p_created_by: getUserSession()?.user?.id || null,
    }),
  });

  const saved = { id: typeof created === 'string' ? created : (created?.id || created) };
  const files = payload.files || [];
  if (saved?.id && files.length) {
    try {
      for (const file of files.slice(0, 6)) {
        await uploadOfferMedia(saved.id, file);
      }
    } catch (err) {
      throw new Error(
        "Offer was saved. Photo upload failed: " + (err.message || "network error")
      );
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

export async function listPublishedRequests(limit = 48) {
  if (!supabaseConfigured) {
    return [];
  }

  const rows = await supabaseFetch(
    "requests?select=*&is_public=eq.true&status=in.(published,partially_funded)&order=created_at.desc&limit=" + limit
  );
  return attachAvatars(Array.isArray(rows) ? rows : []);
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


function seekImageUrl(path, _width) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const clean = String(path).replace(/^\/+/, "");
  const encoded = clean.split("/").map(encodeURIComponent).join("/");
  const withBucket = clean.includes("/") ? encoded : "profiles/" + encoded;
  return base + "/storage/v1/object/public/seek-impact/" + withBucket;
}

async function attachAvatars(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const ids = [...new Set(list.map((row) => row.user_id || row.created_by).filter(Boolean))];
  if (!ids.length) return list;
  try {
    const photos = await supabaseFetch(
      "public_profile_photos?select=id,avatar_path&id=in.(" + ids.map((id) => `"${id}"`).join(",") + ")"
    );
    const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    const map = {};
    (Array.isArray(photos) ? photos : []).forEach((p) => {
      if (!p?.avatar_path) return;
      map[p.id] = seekImageUrl(p.avatar_path, 96);
    });
    const me = getUserSession()?.user?.id;
    const mine = getCachedAvatarUrl();
    return list.map((row) => {
      const owner = row.user_id || row.created_by;
      return {
        ...row,
        avatar_url: map[owner] || (owner && me && owner === me ? mine : null) || row.avatar_url || null,
      };
    });
  } catch (_e) {
    const me = getUserSession()?.user?.id;
    const mine = getCachedAvatarUrl();
    return list.map((row) => ({
      ...row,
      avatar_url: (row.user_id === me || row.created_by === me) ? mine : row.avatar_url || null,
    }));
  }
}

export function mapRequestRow(row) {
  return {
    id: row.id,
    userId: row.user_id || row.created_by || "",
    full_name: row.full_name || row.name || "",
    username: row.username || "",
    avatarUrl: row.avatar_url || (row.avatar_path ? seekImageUrl(row.avatar_path) : "") || "",
    title: row.title,
    category: row.category,
    location: row.location,
    description: row.description,
    amountNeeded: row.amount_needed,
    amountRaised: row.amount_raised,
    urgency: row.urgency,
    verification: row.verification_status,
    status: row.status,
    created_at: row.created_at || row.createdAt || row.published_at || "",
    createdAt: row.created_at || row.createdAt || row.published_at || "",
    type:
      (row.assistance_type || "")
        .toLowerCase()
        .includes("item")
        ? "item"
        : "money",
    publicUpdate: row.public_update || row.publicUpdate || "",
    publicUpdateAt: row.public_update_at || row.publicUpdateAt || "",
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
  donorName = "",
  coverFee = true,
  interval = "once",
  callbackUrl = window.location.origin,
  campaignId = null,
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
        donor_name: anonymous ? null : (donorName || null),
        cover_fee: coverFee !== false,
        interval: interval === "monthly" ? "monthly" : "once",
        callback_url: callbackUrl,
        campaign_id: campaignId || null,
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

const SEEK_AVATAR_KEY = "seek_avatar_url";

export function cacheAvatarUrl(url) {
  if (url) localStorage.setItem(SEEK_AVATAR_KEY, url);
}

export function getCachedAvatarUrl() {
  return localStorage.getItem(SEEK_AVATAR_KEY) || "";
}

export async function refreshUserSession() {
  const session = getUserSession();
  if (!session?.refresh_token) return session;
  try {
    const response = await fetch(
      `${AUTH_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: AUTH_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.access_token) {
      const next = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || session.refresh_token,
        user: data.user || session.user,
      };
      setUserSession(next);
      return next;
    }
  } catch (_e) {}
  return session;
}

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

export async function sendMagicLink(email) {
  const response = await fetch(`${AUTH_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: AUTH_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, create_user: true, options: { emailRedirectTo: (typeof window !== "undefined" ? window.location.origin : "https://seekbsn.org") + "/account" } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.msg || data?.error_description || data?.message || "Could not send the sign-in link.");
  }
  return true;
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
    user: data.user || { id: data.user?.id, email: email },
  };
  if (!session.user || !session.user.id) {
    session.user = { email: email, id: data.user?.id || "" };
  }

  setUserSession(session);

  return session;
}


export async function requestPasswordReset(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value) throw new Error("Enter the email on your SEEK account.");
  const response = await fetch(`${AUTH_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { apikey: AUTH_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: value }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.msg || data?.error_description || "Could not send reset email.");
  }
}

export function startGoogleSignIn() {
  const redirect = encodeURIComponent(window.location.origin + "/account");
  window.location.href = `${AUTH_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
}

export async function deleteRejectedRequest(requestId) {
  const session = getUserSession();
  if (!session?.access_token) throw new Error("Please sign in first.");
  if (!requestId) throw new Error("Missing request.");
  const base = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const anon = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  const response = await fetch(
    base + "/rest/v1/requests?id=eq." + encodeURIComponent(requestId) + "&status=eq.rejected",
    {
      method: "DELETE",
      headers: {
        apikey: anon,
        Authorization: "Bearer " + session.access_token,
        Prefer: "return=minimal",
      },
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || data?.hint || "Could not delete this request.");
  }
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

  const rows = Array.isArray(data) ? data : [];
  const mine = getCachedAvatarUrl();
  return rows.map((row) => ({ ...row, avatar_url: row.avatar_url || mine || null }));
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
    const storagePath = String(file.storage_path || "").replace(/^\/+/, "");
    const mime = String(file.mime_type || "").toLowerCase();
    const name = String(file.file_name || storagePath).toLowerCase();
    const isVideo = mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/.test(name) || /\.(mp4|webm|mov|m4v|ogg)$/.test(storagePath.toLowerCase());
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
      media_kind: isVideo ? "video" : "image",
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
    `requests?id=eq.${encodeURIComponent(requestId)}&select=*&limit=1`
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

export async function listRecentGifts(limit = 8) {
  let rows = await supabaseFetch(
    "public_gifts?select=amount,donor_name,anonymous,created_at,status,request_id&order=created_at.desc&limit=" + limit
  ).catch(() => []);
  if (!Array.isArray(rows) || !rows.length) {
    rows = await supabaseFetch(
      "donations?select=amount,donor_name,anonymous,created_at,status&status=eq.successful&order=created_at.desc&limit=" + limit
    ).catch(() => []);
  }
  return Array.isArray(rows) ? rows : [];
}

export async function getOutreachRaised(campaignTitle, campaignId) {
  const needles = [campaignTitle, campaignId].filter(Boolean).map((s) => String(s).toLowerCase());
  if (!needles.length) return 0;
  let byCampaign = [];
  if (campaignId) {
    byCampaign = await supabaseFetch(
      "donations?select=amount,status,campaign_id&campaign_id=eq." + encodeURIComponent(campaignId) + "&status=eq.successful&limit=500"
    ).catch(() => []);
  }
  if (Array.isArray(byCampaign) && byCampaign.length) {
    return byCampaign.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  }
  const rows = await supabaseFetch(
    "donations?select=donor_name,amount,anonymous,status,campaign_id&status=eq.successful&order=created_at.desc&limit=500"
  ).catch(() => []);
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => {
      if (campaignId && String(row.campaign_id || "") === String(campaignId)) return true;
      const name = String(row.donor_name || "").toLowerCase();
      return needles.some((n) => name.includes(n));
    })
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export async function getSeekLiveStats() {
  const [openRequests, fulfilled, donationRows] = await Promise.all([
    countRows("requests?select=id&is_public=eq.true&status=in.(published,partially_funded)"),
    countRows("requests?select=id&status=eq.fulfilled"),
    supabaseFetch("public_gifts?select=amount,status&limit=2000").catch(() =>
      supabaseFetch("donations?select=amount,status&limit=2000").catch(() => [])
    ),
  ]);

  const donations = (Array.isArray(donationRows) ? donationRows : []).filter((row) => {
    const s = String(row.status || "successful").toLowerCase();
    return s === "successful" || s === "success" || s === "confirmed" || !row.status;
  });
  const raised = donations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  return {
    openRequests: Number(openRequests) || 0,
    fulfilled: Number(fulfilled) || 0,
    raised: Number(raised) || 0,
    donationCount: donations.length || 0,
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



export async function assertFileNotAlreadyUploaded(file) {
  if (!file || !file.name) return;
  const name = file.name;
  const size = Number(file.size) || 0;
  const query =
    "file_name=eq." + encodeURIComponent(name) + "&select=id,file_name,file_size&limit=5";
  const tables = ["request_appreciation", "request_evidence", "community_impact"];
  for (const table of tables) {
    try {
      const rows = await supabaseFetch(table + "?" + query);
      const hit = (Array.isArray(rows) ? rows : []).find(
        (row) => !size || !row.file_size || Number(row.file_size) === size
      );
      if (hit) {
        throw new Error(
          "This picture or video was already uploaded (" + name + "). Choose a different file."
        );
      }
    } catch (err) {
      if (String(err.message || "").includes("already uploaded")) throw err;
    }
  }
}

export async function uploadAppreciationMedia(requestId, file, onProgress) {
  const session = getUserSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to upload appreciation media.");
  }
  if (!file) throw new Error("Choose a photo or video first.");
  await assertFileNotAlreadyUploaded(file);
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
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const mediaUrl = (path) =>
    path
      ? `${base}/storage/v1/object/public/seek-impact/` +
        String(path).split("/").map(encodeURIComponent).join("/")
      : "";

  let requests = [];
  try {
    requests = await supabaseFetch(
      "requests?status=eq.fulfilled&select=id,title,location,status,public_update,public_update_at&order=public_update_at.desc.nullslast"
    );
  } catch (_e) {
    requests = [];
  }
  requests = Array.isArray(requests) ? requests : [];

  let mediaRows = [];
  try {
    mediaRows = await supabaseFetch(
      "request_appreciation?select=id,request_id,storage_path,mime_type,media_kind,file_name,created_at,requests(title,location,status,public_update,public_update_at)&order=created_at.desc"
    );
  } catch (_e) {
    try {
      mediaRows = await supabaseFetch(
        "request_appreciation?select=id,request_id,storage_path,mime_type,media_kind,file_name,created_at&order=created_at.desc"
      );
    } catch (_err) {
      mediaRows = [];
    }
  }
  mediaRows = Array.isArray(mediaRows) ? mediaRows : [];

  const byRequest = new Map();

  for (const req of requests) {
    const text = String(req.public_update || "").trim();
    if (!text) continue;
    byRequest.set(req.id, {
      id: "thanks-" + req.id,
      title: req.title || "A thank you from someone Seek helped",
      story: text,
      location: req.location || "",
      media_kind: "",
      public_url: "",
      request_id: req.id,
      created_at: req.public_update_at || "",
      public_update_at: req.public_update_at || "",
    });
  }

  for (const row of mediaRows) {
    if (!row?.storage_path) continue;
    const req = row.requests || {};
    if (req.status && req.status !== "fulfilled") continue;
    const requestId = row.request_id;
    if (!requestId) continue;
    const path = String(row.storage_path);
    const kind = String(row.media_kind || row.mime_type || path).toLowerCase();
    const isVideo = kind.includes("video") || /\.(mp4|webm|mov)$/i.test(path);
    const text = String(req.public_update || "").trim();
    const existing = byRequest.get(requestId);
    const story = text || existing?.story || "A thank-you message from a fulfilled Seek request.";
    byRequest.set(requestId, {
      id: existing?.id || ("thanks-" + (row.id || requestId)),
      title: req.title || existing?.title || "A thank you from someone Seek helped",
      story,
      location: req.location || existing?.location || "",
      media_kind: isVideo ? "video" : "image",
      public_url: mediaUrl(path),
      request_id: requestId,
      created_at: row.created_at || existing?.created_at || "",
      public_update_at: req.public_update_at || existing?.public_update_at || "",
    });
  }

  return [...byRequest.values()].sort((a, b) =>
    String(b.created_at || b.public_update_at).localeCompare(String(a.created_at || a.public_update_at))
  );
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


export async function getOfferInterestCount(offerId) {
  if (!offerId) return 0;
  const counted = await supabaseFetch("rpc/offer_interest_count", {
    method: "POST",
    body: JSON.stringify({ p_offer_id: offerId }),
  }).catch(() => null);
  if (typeof counted === "number") return counted;
  if (counted && typeof counted.count === "number") return counted.count;
  const rows = await supabaseFetch(
    "offer_interest?select=id&offer_id=eq." + encodeURIComponent(offerId)
  ).catch(() => []);
  return Array.isArray(rows) ? rows.length : 0;
}

export async function listMyOfferInterests(offerId) {
  const session = getUserSession();
  if (!session?.access_token || !offerId) return [];
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const response = await fetch(
    url + "/rest/v1/offer_interest?offer_id=eq." + encodeURIComponent(offerId) + "&select=id,name,email,phone,message,status,created_at,contacted_at,completed_at&order=created_at.desc",
    { headers: { apikey: key, Authorization: "Bearer " + session.access_token } }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) return [];
  return Array.isArray(data) ? data : [];
}

export async function markOfferInterestStatus(interestId, status) {
  const session = getUserSession();
  if (!session?.access_token) throw new Error("Sign in first.");
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const patch = { status };
  if (status === "contacted") patch.contacted_at = new Date().toISOString();
  if (status === "completed") patch.completed_at = new Date().toISOString();
  const response = await fetch(
    url + "/rest/v1/offer_interest?id=eq." + encodeURIComponent(interestId),
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Could not update this interest.");
  }
}

export async function closeMyOffer(offerId) {
  const session = getUserSession();
  if (!session?.access_token || !offerId) throw new Error("Sign in first.");
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const headers = {
    apikey: key,
    Authorization: "Bearer " + session.access_token,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  const rpc = await fetch(url + "/rest/v1/rpc/close_seek_offer", {
    method: "POST",
    headers,
    body: JSON.stringify({ p_offer_id: offerId }),
  });
  if (rpc.ok) return;
  const response = await fetch(url + "/rest/v1/offers?id=eq." + encodeURIComponent(offerId), {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "closed" }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Could not end this giveaway.");
  }
}

export async function submitOfferInterest(payload) {
  if (!supabaseConfigured) throw new Error("Seek backend is not configured yet.");
  return supabaseFetch("rpc/create_offer_interest", {
    method: "POST",
    body: JSON.stringify({
      p_offer_id: payload.offerId,
      p_name: payload.name || null,
      p_email: payload.email,
      p_phone: payload.phone || null,
      p_message: payload.message || null,
      p_age: payload.age ? Number(payload.age) : null,
      p_photo: payload.photo || null,
    }),
  });
}


export async function uploadProfilePhoto(file) {
  const session = getUserSession();
  if (!session?.access_token) throw new Error("Sign in to add a photo.");
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "profile");
  form.append("original_name", file.name || "avatar");
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-media-upload`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "Could not save profile photo.");
  }
  return result;
}

const SEEK_PROFILE_CACHE = "seek_my_profile_v1";
const SEEK_BIO_CACHE = "seek_my_bio_v1";
function readBioCache() {
  try { return localStorage.getItem(SEEK_BIO_CACHE) || ""; } catch { return ""; }
}
function writeBioCache(bio) {
  try { if (bio != null) localStorage.setItem(SEEK_BIO_CACHE, String(bio)); } catch (_e) {}
}

function readProfileCache() {
  try { return JSON.parse(localStorage.getItem(SEEK_PROFILE_CACHE) || "null"); } catch { return null; }
}
function writeProfileCache(row) {
  try { if (row) localStorage.setItem(SEEK_PROFILE_CACHE, JSON.stringify(row)); } catch (_e) {}
}

export async function getMyProfile() {
  const session = (await refreshUserSession()) || getUserSession();
  if (!session?.access_token || !session?.user?.id) return readProfileCache();

  let mapped = null;
  try {
    const rpc = await callSeekProfileRpc("get_my_profile", {});
    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    if (row) {
      mapped = {
        ...row,
        avatar_url: row.avatar_path ? seekImageUrl(row.avatar_path, 96) : null,
      };
    }
  } catch (_e) {
    mapped = null;
  }
  const cached = readProfileCache();
  if (!mapped && cached) mapped = cached;
  else if (mapped && cached) {
    mapped.username = cached.username || mapped.username;
    mapped.full_name = cached.full_name || mapped.full_name;
    mapped.bio = readBioCache() || cached.bio || mapped.bio;
  }
  if (mapped?.avatar_url) cacheAvatarUrl(mapped.avatar_url);
  if (mapped) writeProfileCache(mapped);
  return mapped;
}


export async function listRequestDonors(requestId) {
  if (!supabaseConfigured || !requestId) return [];
  let rows = [];
  try {
    rows = await supabaseFetch(
      "public_gifts?select=amount,anonymous,created_at,donor_name,status&request_id=eq." +
        encodeURIComponent(requestId) +
        "&status=in.(successful,success,confirmed)&order=created_at.desc&limit=40"
    );
  } catch (_e) {
    rows = [];
  }
  if (!Array.isArray(rows) || !rows.length) {
    try {
      rows = await supabaseFetch("rpc/list_request_donors", {
        method: "POST",
        body: JSON.stringify({ p_request_id: requestId }),
      });
    } catch (_e) {
      rows = [];
    }
  }
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    amount: Number(row.amount) || 0,
    anonymous: Boolean(row.anonymous),
    name: row.donor_name || row.name || "",
    created_at: row.created_at,
  }));
}

export async function listPublicSponsors() {
  if (!supabaseConfigured) return [];
  try {
    const rows = await supabaseFetch(
      "donations?select=donor_name,amount,created_at,anonymous&status=eq.successful&order=amount.desc&limit=20"
    );
    return (rows || []).filter((r) => !r.anonymous && r.donor_name).slice(0, 8);
  } catch (_e) {
    return [];
  }
}


export async function getCelebrateRsvpCount(requestId) {
  if (!requestId) return 0;
  const n = await supabaseFetch("rpc/celebrate_rsvp_count", {
    method: "POST",
    body: JSON.stringify({ p_request_id: requestId }),
  }).catch(() => 0);
  return Number(n) || 0;
}

export async function submitCelebrateRsvp(payload) {
  const session = getUserSession();
  if (!session?.access_token) throw new Error("Sign in first to say you can be there.");
  const created = await supabaseFetch("rpc/create_celebrate_rsvp", {
    method: "POST",
    body: JSON.stringify({
      p_request_id: payload.requestId,
      p_name: payload.name || null,
      p_email: payload.email,
      p_phone: payload.phone || null,
      p_message: payload.message || null,
      p_age: payload.age ? Number(payload.age) : null,
      p_photo: payload.photo || null,
    }),
  });
  try {
    await supabaseFetch("rpc/notify_request_host", {
      method: "POST",
      body: JSON.stringify({
        p_request_id: payload.requestId,
        p_title: "Someone can help",
        p_body: (payload.name || "Someone") + " responded to your SEEK post",
      }),
    });
  } catch (_e) {}
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-celebrate-rsvp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: "Bearer " + session.access_token,
      },
      body: JSON.stringify({
        request_id: payload.requestId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        age: payload.age,
        message: payload.message,
      }),
    });
  } catch (_e) {}
  return created;
}


async function signSeekPhoto(path, accessToken) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const clean = String(path).replace(/^\/+/, "").replace(/^seek-evidence\//, "");
  const signRes = await fetch(base + "/storage/v1/object/sign/seek-evidence/" + clean, {
    method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
  });
  const signData = await signRes.json().catch(() => ({}));
  const signedPath = signData?.signedURL || signData?.signedUrl || "";
  if (signedPath) return signedPath.startsWith("http") ? signedPath : base + "/storage/v1" + signedPath;
  return seekImageUrl(path);
}

export async function listCelebrateRsvps(requestId) {
  const session = getUserSession();
  if (!session?.access_token || !requestId) return [];
  const rows = await supabaseFetch("rpc/list_celebrate_rsvps", {
    method: "POST",
    body: JSON.stringify({ p_request_id: requestId }),
  }).catch(() => []);
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    out.push({ ...row, photo_url: await signSeekPhoto(row.photo_path, session.access_token) });
  }
  return out;
}


export async function updateCelebrateRsvpStatus(rsvpId, status) {
  const session = getUserSession();
  if (!session?.access_token) throw new Error("Sign in first.");
  return supabaseFetch("rpc/update_celebrate_rsvp_status", {
    method: "POST",
    body: JSON.stringify({ p_id: rsvpId, p_status: status }),
  });
}


export async function closeCelebrateInvite(requestId) {
  const session = getUserSession();
  if (!session?.access_token) throw new Error("Sign in first.");
  return supabaseFetch("rpc/close_celebrate_invite", {
    method: "POST",
    body: JSON.stringify({ p_request_id: requestId }),
  });
}


export async function listMyOffers() {
  const session = getUserSession();
  if (!session?.access_token) return [];
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const uid = session.user?.id;
  if (!uid) return [];
  const response = await fetch(
    url + "/rest/v1/offers?created_by=eq." + encodeURIComponent(uid) + "&select=id,description,created_at,status,category,city,created_by&order=created_at.desc&limit=80",
    { headers: { apikey: key, Authorization: "Bearer " + session.access_token } }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) return [];
  return Array.isArray(data) ? data : [];
}

export async function listMyOfferInterestsSummary(offerIds) {
  const session = getUserSession();
  if (!session?.access_token) return [];
  const ids = (Array.isArray(offerIds) ? offerIds : []).filter(Boolean);
  if (!ids.length) return [];
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const list = ids.map((id) => '"' + id + '"').join(",");
  const response = await fetch(
    url + "/rest/v1/offer_interest?offer_id=in.(" + list + ")&select=id,offer_id,name,email,status,created_at",
    { headers: { apikey: key, Authorization: "Bearer " + session.access_token } }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) return [];
  return Array.isArray(data) ? data : [];
}


export async function listReceivedForMe() {
  const rows = await listMyRequests().catch(() => []);
  const ids = (Array.isArray(rows) ? rows : []).map((r) => r.id).filter(Boolean);
  if (!ids.length) return [];
  const chunk = ids.slice(0, 40).join(",");
  const gifts = await supabaseFetch(
    "public_gifts?select=amount,donor_name,anonymous,created_at,request_id,status&request_id=in.(" + chunk + ")&order=created_at.desc&limit=80"
  ).catch(() => []);
  return Array.isArray(gifts) ? gifts : [];
}

export async function listMyGifts() {
  const session = getUserSession();
  if (!session?.access_token) return [];
  const email = session.user?.email;
  if (!email) return [];
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const response = await fetch(
    url + "/rest/v1/donations?or=(email.eq." + encodeURIComponent(email) + ",donor_email.eq." + encodeURIComponent(email) + ")&select=id,amount,status,created_at,request_id,donor_name&order=created_at.desc&limit=40",
    { headers: { apikey: key, Authorization: "Bearer " + session.access_token } }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) return [];
  return (Array.isArray(data) ? data : []).filter((row) => String(row.status || "successful") === "successful");
}


export function normalizeSeekUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateSeekUsername(value) {
  const username = normalizeSeekUsername(value);
  if (!username) return { ok: false, error: "Choose a username." };
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, error: "Use 3–24 characters: a–z, 0–9 and underscore only." };
  }
  return { ok: true, username };
}

async function callSeekProfileRpc(functionName, body) {
  const session = (await refreshUserSession()) || getUserSession();

  if (!session?.access_token || !session?.user?.id) {
    throw new Error("Your SEEK session has expired. Please sign in again.");
  }

  const response = await fetch(
    `${AUTH_URL}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        apikey: AUTH_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.hint ||
      data?.details ||
      data?.error_description ||
      "SEEK could not update your profile."
    );
  }

  return data;
}

export async function checkUsernameAvailable(value, currentUserId) {
  const checked = validateSeekUsername(value);
  if (!checked.ok) return checked;

  try {
    const available = await callSeekProfileRpc(
      "check_seek_username",
      {
        p_username: checked.username,
      }
    );

    const result = Array.isArray(available)
      ? available[0]
      : available;

    if (
      result === false ||
      result === "false" ||
      result?.available === false
    ) {
      return {
        ok: false,
        username: checked.username,
        error: "That username is taken.",
      };
    }

    return {
      ok: true,
      username: checked.username,
    };
  } catch (error) {
    return {
      ok: false,
      username: checked.username,
      error: error?.message || "Could not check username availability.",
    };
  }
}

export async function updateMyUsername({
  username,
  full_name,
  bio,
}) {
  const session = (await refreshUserSession()) || getUserSession();

  if (!session?.access_token || !session?.user?.id) {
    throw new Error("Your SEEK session has expired. Please sign in again.");
  }

  const rawUser = String(username || "").trim();
  let checked = { ok: true, username: null };
  if (rawUser) {
    checked = validateSeekUsername(rawUser);
    if (!checked.ok) throw new Error(checked.error);
  }

  const cleanName = String(full_name || "").trim().slice(0, 80);
  const cleanBio = String(bio || "").trim().slice(0, 280);
  const payload = {
    username: checked.username,
    full_name: cleanName || null,
    bio: cleanBio || null,
  };

  // Keep the existing RPC as the primary save path. Some deployed versions
  // of save_my_profile update username/name but silently omit bio, so we also
  // persist the same values directly to the signed-in user's own profile row.
  let saved = null;
  let rpcError = null;
  try {
    saved = await callSeekProfileRpc("save_my_profile", {
      p_username: checked.username,
      p_full_name: cleanName || null,
      p_bio: cleanBio || null,
    });
  } catch (error) {
    rpcError = error;
  }

  const profileFromRpc = Array.isArray(saved) ? saved[0] : saved;
  writeBioCache(cleanBio);
  writeProfileCache({
    id: session.user.id,
    username: checked.username,
    full_name: cleanName,
    bio: cleanBio,
    avatar_url: profileFromRpc?.avatar_path ? seekImageUrl(profileFromRpc.avatar_path, 96) : null,
  });
  const refreshed = await getMyProfile();
  if (refreshed?.username || refreshed?.full_name || refreshed?.bio || refreshed?.id) {
    const next = {
      ...refreshed,
      username: checked.username || refreshed.username,
      full_name: cleanName || refreshed.full_name,
      bio: cleanBio || refreshed.bio,
    };
    writeProfileCache(next);
    return next;
  }
  if (profileFromRpc) {
    return {
      id: profileFromRpc.id || session.user.id,
      username: profileFromRpc.username || checked.username,
      full_name: profileFromRpc.full_name || cleanName,
      bio: profileFromRpc.bio ?? cleanBio,
      avatar_url: profileFromRpc.avatar_path
        ? seekImageUrl(profileFromRpc.avatar_path, 96)
        : null,
    };
  }
  throw rpcError || new Error("Your profile could not be saved.");
}

/**
 * Build the donor-first visual feed used by For You / Live Support.
 * Public requests are already restricted by listPublishedRequests to SEEK's
 * published/partially-funded states; their evidence endpoint is the public
 * media surface, so fulfilled/unpublished cases never enter this feed.
 */
export async function listLiveSupportCases(limit = 12) {
  if (!supabaseConfigured) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 30);
  const rows = await listPublishedRequests(safeLimit);
  const requests = (Array.isArray(rows) ? rows : [])
    .map(mapRequestRow)
    .filter((row) => row?.id && String(row.status || "").toLowerCase() !== "fulfilled")
    .slice(0, safeLimit);

  const cases = await Promise.all(
    requests.map(async (request) => {
      let media = [];
      try {
        media = await getRequestEvidence(request.id);
      } catch (_e) {
        media = [];
      }
      const member = request.userId ? await getPublicMember(request.userId).catch(() => null) : null;
      return {
        ...request,
        member: member || null,
        media: (Array.isArray(media) ? media : []).filter((item) => item?.public_url),
      };
    })
  );

  const extra = [];
  try {
    const impact = await listPublishedImpact();
    (Array.isArray(impact) ? impact : []).forEach((row) => {
      const media = (row.mediaItems || []).filter((m) => m?.public_url);
      if (!media.length && row.public_url) media.push({ public_url: row.public_url, media_kind: row.media_kind || "image" });
      if (!media.length) return;
      extra.push({
        id: row.id,
        feedKind: "impact",
        title: row.title || "SEEK impact",
        description: row.story || "",
        category: "Impact",
        location: row.location || "",
        created_at: row.published_at || row.created_at,
        amountNeeded: 0,
        media,
      });
    });
  } catch (_e) {}
  try {
    const thanks = await listAppreciationStories();
    (Array.isArray(thanks) ? thanks : []).forEach((row) => {
      if (!row.public_url) return;
      extra.push({
        id: row.id,
        feedKind: "appreciation",
        title: row.title || "Thank you",
        description: row.story || row.public_update || "",
        category: "Appreciation",
        location: row.location || "",
        created_at: row.created_at || row.public_update_at,
        amountNeeded: 0,
        media: [{ public_url: row.public_url, media_kind: row.media_kind || "video" }],
      });
    });
  } catch (_e) {}

  const stamp = (row) => Math.max(new Date(row.created_at || 0).getTime() || 0, new Date(row.createdAt || 0).getTime() || 0, new Date(row.published_at || 0).getTime() || 0);
  return [...extra, ...cases].sort((a, b) => stamp(b) - stamp(a));
}
      
export async function getPublicMember(userId) {
  if (!userId) return null;
  const rows = await supabaseFetch(
    "rpc/get_public_member",
    { method: "POST", body: JSON.stringify({ p_key: String(userId) }) }
  ).catch(() => []);
  const item = Array.isArray(rows) ? rows[0] : rows;
  if (!item) return { id: userId, name: "", username: "", bio: "", avatar_url: "" };
  return {
    id: item.id || userId,
    name: item.full_name || item.username || "",
    username: item.username || "",
    bio: item.bio || "",
    avatar_url: item.avatar_url || (item.avatar_path ? seekImageUrl(item.avatar_path, 160) : ""),
  };
}

export function suggestNeedStructure({ need = "", description = "", amount = "" } = {}) {
  const text = [need, description].join(" ").toLowerCase();
  let category = "Financial Assistance";
  if (/food|hungry|rice|meal/.test(text)) category = "Food";
  else if (/rent|house|shelter|homeless/.test(text)) category = "Housing";
  else if (/school|fee|exam|tuition|uniform/.test(text)) category = "Education";
  else if (/hospital|medicine|surgery|clinic|doctor/.test(text)) category = "Medical";
  else if (/job|work|cv|employ/.test(text)) category = "Employment & Business";
  else if (/cloth|wear|shoe/.test(text)) category = "Clothing";
  else if (/baby|pregnan|diaper/.test(text)) category = "Baby & Family";
  else if (/bus|transport|fare/.test(text)) category = "Transportation";
  else if (/urgent|emergency/.test(text)) category = "Emergency";
  const missing = [];
  if (!amount && !/₦|naira|\d{3,}/.test(text)) missing.push("how much you need");
  if (!/lagos|abuja|enugu|ibadan|ph|city|state/.test(text)) missing.push("where you are");
  return {
    category,
    summary: String(need || description || "").slice(0, 160),
    missing,
  };
}

export function explainSeekNeed(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  let title = text.length > 72 ? text.slice(0, 69).replace(/\s+\S*$/, "") : text;
  if (lower.includes("school")) title = "Help with school fees";
  else if (lower.includes("rent")) title = "Help with rent";
  else if (lower.includes("hospital") || lower.includes("medical")) title = "Help with medical costs";
  else if (lower.includes("food")) title = "Help with food";
  else if (lower.includes("job")) title = "Help finding work";
  const sentence = /[.!?]$/.test(text) ? text : text + ".";
  const description = "I am asking the SEEK community for help. " + sentence + " I will only use support for this need.";
  return { title, description };
}

export async function seekAiAssist({ purpose = "classify", title = "", description = "", need = "" } = {}) {
  const session = (await refreshUserSession()) || getUserSession();
  if (!session?.access_token) {
    return suggestNeedStructure({ need: need || title, description, amount: "" });
  }
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const response = await fetch(url + "/functions/v1/seek-ai-assist", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ purpose, title: title || need, description: description || need }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return suggestNeedStructure({ need: need || title, description, amount: "" });
  }
  return data;
}

export async function getMyWallet() {
  const session = (await refreshUserSession()) || getUserSession();
  if (!session?.access_token || !session?.user?.id) return { balance: 0 };
  const rows = await supabaseFetch(
    "profiles?id=eq." + encodeURIComponent(session.user.id) + "&select=wallet_balance&limit=1"
  ).catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : rows;
  return { balance: Number(row?.wallet_balance || 0) };
}

export async function spendFromWallet(requestId, amount) {
  const session = (await refreshUserSession()) || getUserSession();
  if (!session?.access_token) throw new Error("Sign in to give from your wallet.");
  const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  const response = await fetch(url + "/rest/v1/rpc/spend_seek_wallet", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_request_id: requestId, p_amount: Number(amount) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Could not give from wallet.");
  return data;
}

export async function loadSeekWallet(amount) {
  const session = (await refreshUserSession()) || getUserSession();
  if (!session?.access_token) throw new Error("Sign in to load your wallet.");
  return initializeDonation({
    amount: Number(amount),
    email: session.user?.email,
    requestId: null,
    campaignId: "wallet",
    donorName: "Wallet load",
    coverFee: true,
    callbackUrl: window.location.origin + "/give",
  });
}
