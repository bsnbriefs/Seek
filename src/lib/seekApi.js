import { supabaseConfigured, supabaseFetch } from './supabase';

export async function submitRequest(payload) {
  if (!supabaseConfigured) {
    throw new Error('Seek backend is not configured yet.');
  }

  const amount = payload.amount
    ? Number(String(payload.amount).replace(/[^0-9.]/g, '')) || null
    : null;

  const rows = await supabaseFetch('rpc/submit_seek_request', {
    method: 'POST',
    body: JSON.stringify({
      p_title: payload.need,
      p_category: payload.category,
      p_location: payload.location,
      p_description: payload.description,
      p_amount_needed: amount,
      p_urgency: payload.urgency.toLowerCase(),
      p_assistance_type: payload.type,
      p_full_name: payload.name,
      p_email: payload.email,
      p_phone: payload.phone
    })
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

export async function submitOffer(payload) {
  if (!supabaseConfigured) throw new Error('Seek backend is not configured yet.');
  const rows = await supabaseFetch('offers', { method: 'POST', body: JSON.stringify({ description: payload.description, category: payload.category || null, location: payload.location || null, status: 'pending_review' }) });
  return rows[0];
}

export async function submitVolunteer(payload) {
  if (!supabaseConfigured) throw new Error('Seek backend is not configured yet.');
  const rows = await supabaseFetch('volunteers', { method: 'POST', body: JSON.stringify({ full_name: payload.name, email: payload.email, location: payload.location, interests: payload.interests, status: 'pending_review' }) });
  return rows[0];
}

export async function listPublishedRequests() {
  if (!supabaseConfigured) return [];
  return supabaseFetch('requests?select=*&is_public=eq.true&status=in.(published,partially_funded)&order=created_at.desc&limit=12');
}

// Adapts a raw requests row (snake_case DB columns) to the shape <RequestCard>
// already renders (camelCase) — no markup changes needed to consume real data.
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
    type: (row.assistance_type || '').toLowerCase().includes('item') ? 'item' : 'money',
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
    throw new Error('Seek backend is not configured yet.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-verify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      data?.error || 'Payment verification failed.'
    );
  }

  return data;
      }
