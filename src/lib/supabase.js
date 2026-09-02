const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();

const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const supabaseConfigured = Boolean(url && key);

export async function supabaseFetch(path, options = {}) {
  if (!supabaseConfigured) {
    throw new Error('Seek backend is not configured yet.');
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error_description ||
      data?.hint ||
      'Supabase request failed.'
    );
  }

  return data;
}
