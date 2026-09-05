const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
  
).trim();


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
    66  access_token: data.access_token,
67  refresh_token: data.refresh_token,
68  user: data.user,
69  profile: profiles[0],
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
    `${SUPABASE_URL}/rest/v1/request_evidence?request_id=eq.${requestId}&select=id,file_name,storage_path,mime_type,file_size,created_at&order=created_at.desc`,
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

  const evidence = [];

  for (const file of data) {
    const signResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/seek-evidence/${file.storage_path}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiresIn: 600,
        }),
      }
    );

    const signed = await signResponse.json().catch(() => ({}));

    if (signResponse.ok && signed?.signedURL) {
      evidence.push({
        ...file,
        signed_url: `${SUPABASE_URL}/storage/v1${signed.signedURL}`,
      });
    }
  }

  return evidence;
}
export async function updateAdminOfferStatus(id, status) {
  const session = await getAdminSession();

  if (!session.access_token) {
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
    throw new Error(data.message || "Could not update offer status.");
  }

  return data;
}
