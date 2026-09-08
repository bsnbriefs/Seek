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

  return data;
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

  return data.map((file) => {
    const publicUrl =
      `${SUPABASE_URL}/storage/v1/object/public/seek-evidence/` +
      file.storage_path;

    return {
      ...file,
      public_url: publicUrl,
      signed_url: publicUrl,
    };
  });
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
