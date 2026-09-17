import { assertFileNotAlreadyUploaded } from "./seekApi";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
  
).trim();



async function writeAuditLog(action, tableName, recordId, details) {
  try {
    const session = getAdminSession();
    if (!session?.access_token) return;
    await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actor_id: session.user?.id || null,
        action,
        table_name: tableName,
        record_id: recordId || null,
        details: details || {},
      }),
    });
  } catch (_e) {
    // audit must never block the admin action
  }
}

export async function adminLogin(email, password) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || 'Invalid email or password.');
  }

  const profileResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=*`,
  {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${data.access_token}`,
    },
  }
);

if (!profileResponse.ok) {
  const details = await profileResponse.text();
  throw new Error(`Admin profile lookup failed ${profileResponse.status}: ${details}`);
}

const profiles = await profileResponse.json();
const profile = profiles[0];

if (!profile) {
  throw new Error('Admin profile was not found.');
}

if (profile.role !== 'admin') {
  throw new Error('This account does not have administrator access.');
}

  localStorage.setItem(
    'seek_admin_session',
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      profile: profiles[0],
    })
  );

  return {
  accessToken: data.access_token,
  user: data.user,
  profile: profiles[0],
};
}

export function getAdminSession() {
  try {
    return JSON.parse(localStorage.getItem('seek_admin_session') || 'null');
  } catch {
    return null;
  }
}

export async function refreshAdminSession() {
  const session = getAdminSession();
  if (!session?.refresh_token) return session;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) return session;
  const next = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    user: data.user || session.user,
  };
  try {
    localStorage.setItem("seek_admin_session", JSON.stringify(next));
  } catch (_e) {}
  return next;
}

export function adminLogout() {
  localStorage.removeItem('seek_admin_session');
}

export async function getAdminRequests() {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error('Admin session expired. Please sign in again.');
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/requests?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || 'Could not load requests.');
  }

  return data;
}
export async function getAdminOffers() {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/offers?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data.message || "Could not load offers.");
  }

  const list = Array.isArray(data) ? data : [];
  const ids = list.map((row) => row.id).filter(Boolean);
  if (!ids.length) return list;
  const mediaRes = await fetch(
    `${SUPABASE_URL}/rest/v1/offer_media?select=offer_id,storage_path,media_kind,mime_type&offer_id=in.(${ids.map((id) => `"${id}"`).join(",")})`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );
  const media = await mediaRes.json().catch(() => []);
  const base = String(SUPABASE_URL || "").replace(/\/$/, "");
  const byOffer = {};
  (Array.isArray(media) ? media : []).forEach((row) => {
    if (!row?.storage_path) return;
    const url =
      `${base}/storage/v1/object/public/seek-impact/` +
      String(row.storage_path).split("/").map(encodeURIComponent).join("/");
    byOffer[row.offer_id] = byOffer[row.offer_id] || [];
    byOffer[row.offer_id].push({
      public_url: url,
      media_kind: String(row.media_kind || row.mime_type || "").includes("video") ? "video" : "image",
    });
  });
  return list.map((row) => ({ ...row, media: byOffer[row.id] || [] }));
}
export async function getAdminVolunteers() {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/volunteers?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load volunteers.");
  }

  return data;
}
export async function getAdminRequestPrivate() {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/request_private?select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load contact details.");
  }

  return data;
}


export async function getAdminDonations() {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/donations?select=*&order=paid_at.desc.nullslast`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load donations.");
  }

  return data;
}

export async function settleAdminRequest(id, { note = "", amount = null } = {}) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const patch = {
    settle_note: note || null,
    settle_at: new Date().toISOString(),
  };
  if (amount != null && amount !== "") patch.settle_amount = Number(amount);
  await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  return updateAdminRequestStatus(id, "fulfilled");
}

export async function updateAdminRequestStatus(id, status) {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error('Admin session expired. Please sign in again.');
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/admin_update_request_status`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_request_id: id,
        p_status: status,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || 'Could not update request status.');
  }

  await writeAuditLog("update_status", "requests", id, { status });
  return data;
        }
export async function verifyAdminRequest(id, notes = "") {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/verify_seek_request`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_request_id: id,
        p_notes: notes,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Could not verify request.");
  }

  return data;
}
export async function getAdminEvidence(requestId) {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/request_evidence?request_id=eq.${requestId}&select=id,request_id,file_name,storage_path,mime_type,file_size,created_at&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || "Could not load request evidence.");
  }

  const files = Array.isArray(data) ? data : [];
  const signed = [];
  for (const file of files) {
    const path = String(file.storage_path || "").replace(/^\/+/, "");
    const signRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/seek-evidence/${path}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 600 }),
      }
    );
    const signData = await signRes.json().catch(() => ({}));
    const signedPath = signData?.signedURL || signData?.signedUrl || "";
    const signedUrl = signedPath
      ? (signedPath.startsWith("http") ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`)
      : "";
    signed.push({
      ...file,
      public_url: signedUrl,
      signed_url: signedUrl,
    });
  }
  return signed;
}

export async function updateAdminOfferStatus(id, status) {
  const session = getAdminSession();

  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/offers?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status,
      }),
    }
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || data?.[0]?.message || "Could not update offer status.");
  }

  await writeAuditLog("update_status", "offers", id, { status });

  // When an offer is accepted (matched), notify the requester via Edge Function
  if (status === "matched") {
    try {
      const notifyResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/notify-requester-match`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ offer_id: id }),
        }
      );

      const notifyResult = await notifyResponse.json().catch(() => ({}));

      // "already notified" is treated as success
      if (!notifyResponse.ok && !notifyResult?.skipped) {
        console.warn("Offer accepted but notification failed:", notifyResult);
        // Do not throw — status update already succeeded
      }
    } catch (notifyErr) {
      console.warn("Offer accepted but notification call failed:", notifyErr);
      // Do not throw — status update already succeeded
    }
  }

  return data;
}


function impactPublicUrl(storagePath) {
  if (!storagePath) return null;
  return (
    `${SUPABASE_URL}/storage/v1/object/public/seek-impact/` +
    String(storagePath)
      .split("/")
      .map(encodeURIComponent)
      .join("/")
  );
}

export async function getAdminImpactPosts() {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/community_impact?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data?.message || "Could not load Community Impact posts.");
  }
  return (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    public_url: impactPublicUrl(row.storage_path),
  }));
}

export async function uploadImpactMedia(file) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  const form = new FormData();
  await assertFileNotAlreadyUploaded(file);
  form.append("file", file);
  form.append("purpose", "impact");
  form.append("original_name", file.name || "impact");

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/secure-media-upload`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || result?.details || "Impact media upload failed.");
  }
  return result;
}

export async function saveAdminImpactPost(payload) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const body = {
    title: payload.title,
    story: payload.story || null,
    location: payload.location || null,
    happened_on: payload.happened_on || null,
    storage_path: payload.storage_path || null,
    mime_type: payload.mime_type || null,
    media_kind: payload.media_kind || null,
    file_name: payload.file_name || null,
    status: payload.status || "draft",
    created_by: session.user?.id || null,
    published_at: payload.status === "published" ? new Date().toISOString() : null,
  };

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/community_impact`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || "Could not save impact post.");
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function saveAdminImpactMedia(impactId, files) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const rows = [];
  for (const file of files || []) {
    const media = await uploadImpactMedia(file);
    rows.push({
      impact_id: impactId,
      storage_path: media.storage_path,
      mime_type: media.mime_type || null,
      media_kind: media.media_kind || null,
      file_name: media.file_name || null,
    });
  }
  if (!rows.length) return [];
  const response = await fetch(`${SUPABASE_URL}/rest/v1/community_impact_media`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || "Could not save extra impact photos.");
  }
  return data;
}

export async function updateAdminImpactPost(id, patch) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const body = { ...patch, updated_at: new Date().toISOString() };
  if (patch.status === "published" && !patch.published_at) {
    body.published_at = new Date().toISOString();
  }
  if (patch.status === "draft") {
    body.published_at = null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/community_impact?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Could not update impact post.");
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteAdminImpactPost(id) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/community_impact?id=eq.${id}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Could not delete impact post.");
  }
}


export async function confirmAdminOfferConnected(id) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/offers?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ connected_at: new Date().toISOString() }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Could not confirm connection.");
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function celebrateAdminRequest(req) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }

  const title = req.location
    ? `A need was met in ${req.location}`
    : "A need was met in the Seek community";
  const story = [
    req.category ? `Category: ${req.category}.` : "",
    "A community member received help through Seek.",
    "Private details are not shared here.",
  ].filter(Boolean).join(" ");

  await saveAdminImpactPost({
    title,
    story,
    location: req.location || null,
    happened_on: new Date().toISOString().slice(0, 10),
    status: "draft",
  });

  // Best-effort flag on the request. Do not fail celebration if this is blocked.
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/requests?id=eq.${req.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          celebrate_opt_in: true,
          celebrated_at: new Date().toISOString(),
        }),
      }
    );
  } catch (_e) {
    // ignore
  }
}


export async function getAdminSafetyReports() {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/safety_reports?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data?.message || "Could not load safety reports.");
  }
  return Array.isArray(data) ? data : [];
}

export async function updateAdminSafetyReport(id, status) {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/safety_reports?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Could not update report.");
  }
}


export async function getAdminAuditLogs() {
  const session = getAdminSession();
  if (!session?.access_token) {
    throw new Error("Admin session expired. Please sign in again.");
  }
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/audit_log?select=*&order=created_at.desc&limit=50`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(data?.message || "Could not load audit log.");
  }
  return Array.isArray(data) ? data : [];
}


export async function getAdminSupportConversations() {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/support_conversations?select=*&order=updated_at.desc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Could not load support chats.");
  return Array.isArray(data) ? data : [];
}

export async function getAdminSupportMessages(conversationId) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Could not load messages.");
  return Array.isArray(data) ? data : [];
}

export async function sendAdminSupportMessage(conversationId, body) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/support_messages`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      sender: "admin",
      body: String(body || "").trim().slice(0, 2000),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Could not send reply.");
  return data;
}


export async function getAdminOfferInterests() {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/offer_interest?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Could not load offer interest.");
  return Array.isArray(data) ? data : [];
}

export async function postAdminAppeal({ title, category, location, amount, description, email, files, name, phone }) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin sign in required.");
  const checkTitle = (title || "").trim();
  if (checkTitle) {
    const dup = await fetch(
      `${SUPABASE_URL}/rest/v1/requests?select=id,title&title=eq.${encodeURIComponent(checkTitle)}&status=in.(published,pending_review,partially_funded)&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } }
    );
    const rows = await dup.json().catch(() => []);
    if (Array.isArray(rows) && rows.length) throw new Error("This appeal is already posted.");
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_seek_request`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      p_title: title,
      p_category: category || "Financial Assistance",
      p_location: location || "Nigeria",
      p_description: description || title,
      p_amount_needed: amount ? Number(amount) : null,
      p_full_name: name || "BSN Foundation",
      p_email: email || session.user?.email,
      p_phone: phone || "00000000000",
      p_urgency: "normal",
      p_assistance_type: "Money",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.hint || "Could not post appeal.");
  const row = Array.isArray(data) ? data[0] : data;
  const id = row?.id || row?.request_id;
  if (id) {
    await updateAdminRequestStatus(id, "published");
    for (const file of files || []) {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "evidence");
      form.append("request_id", id);
      form.append("original_name", file.name || "appeal");
      const up = await fetch(`${SUPABASE_URL}/functions/v1/secure-media-upload`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: form,
      });
      const result = await up.json().catch(() => ({}));
      if (!up.ok || !result?.success) throw new Error(result?.error || "Appeal posted but media failed.");
    }
  }
  return { id, share: id ? `https://seekbsn.org/request/${id}` : "" };
}

export async function postAdminGiveaway({ description, category, city, contactEmail, files }) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin sign in required.");
  const check = (description || "").trim();
  if (check) {
    const dup = await fetch(
      `${SUPABASE_URL}/rest/v1/offers?select=id,description&description=eq.${encodeURIComponent(check)}&status=in.(open,pending_review,matched)&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } }
    );
    const rows = await dup.json().catch(() => []);
    if (Array.isArray(rows) && rows.length) throw new Error("This giveaway is already posted.");
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_seek_offer`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_description: description,
      p_category: category || null,
      p_city: city || null,
      p_contact_email: contactEmail || session.user?.email,
      p_contact_phone: null,
      p_request_id: null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const insert = await fetch(`${SUPABASE_URL}/rest/v1/offers`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        description,
        category: category || null,
        city: city || null,
        contact_email: contactEmail || session.user?.email,
        status: "pending_review",
        created_by: session.user?.id,
      }),
    });
    const row = await insert.json().catch(() => ({}));
    if (!insert.ok) throw new Error(row?.message || data?.message || "Could not post giveaway.");
    const fallbackId = Array.isArray(row) ? row[0]?.id : row?.id;
    if (fallbackId) await updateAdminOfferStatus(fallbackId, "open");
    data.id = fallbackId;
  }
  const id = Array.isArray(data) ? data[0]?.id : (data?.id || (typeof data === "string" ? data : null));
  if (id) await updateAdminOfferStatus(id, "open");
  const offerId = id;
  for (const file of files || []) {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "offer");
    form.append("offer_id", offerId);
    form.append("original_name", file.name || "offer");
    const up = await fetch(`${SUPABASE_URL}/functions/v1/secure-media-upload`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    });
    const result = await up.json().catch(() => ({}));
    if (!up.ok || !result?.success) throw new Error(result?.error || "Giveaway posted but a photo failed.");
  }
  return { id: offerId, share: "https://seekbsn.org/offers" };
}


export async function getAdminCelebrateRsvps() {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_all_celebrate_rsvps`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Could not load Celebrate RSVPs.");
  const rows = Array.isArray(data) ? data : [];
  const out = [];
  for (const row of rows) {
    let photo_url = "";
    const path = String(row.photo_path || "").replace(/^\/+/, "").replace(/^seek-evidence\//, "");
    if (row.photo_path && /^https?:\/\//i.test(row.photo_path)) photo_url = row.photo_path;
    else if (path) {
      const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/seek-evidence/${path}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + session.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 600 }),
      });
      const signData = await signRes.json().catch(() => ({}));
      const signedPath = signData?.signedURL || signData?.signedUrl || "";
      photo_url = signedPath
        ? (signedPath.startsWith("http") ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`)
        : "";
    }
    out.push({ ...row, photo_url });
  }
  return out;
}

export async function updateAdminCelebrateRsvp(id, status) {
  const session = getAdminSession();
  if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_celebrate_rsvp_status`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_id: id, p_status: status }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || "Could not update RSVP.");
  }
}
