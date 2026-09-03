const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
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
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=id,full_name,role`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${data.access_token}`,
      },
    }
  );

  const profiles = await profileResponse.json().catch(() => []);
if (!profileResponse.ok) {
  const details = await profileResponse.text();
  throw new Error(`Profile lookup failed (${profileResponse.status}): ${details}`);
}

if (!profiles.length) {
  throw new Error('Admin profile was not found.');
}
  }

  if (profiles[0].role !== 'admin') {
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
