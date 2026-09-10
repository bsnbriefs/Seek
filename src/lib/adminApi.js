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
    `${SUPABASE_URL}/rest/v1/offer_media?select=offer_id,storage_path,media_kind,mime_type&offer_id=in.(${ids.join(",")})`,
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
