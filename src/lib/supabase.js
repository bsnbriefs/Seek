const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured && typeof window !== 'undefined') {
  // Diagnostic only — never logs the key itself (it's a public/publishable
  // key by design, but there's no reason to print it). This exists because
  // "Seek backend is not configured yet." on its own doesn't say *why*: Vite
  // only bakes VITE_* vars in at build time, so this almost always means the
  // vars were missing (or added but not redeployed) at the last build that
  // produced whatever bundle is currently live. See DEPLOYMENT.md.
  console.warn(
    '[Seek] Supabase is not configured for this build. ' +
    `VITE_SUPABASE_URL present: ${Boolean(import.meta.env.VITE_SUPABASE_URL)}, ` +
    `VITE_SUPABASE_PUBLISHABLE_KEY present: ${Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)}, ` +
    `VITE_SUPABASE_ANON_KEY present: ${Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)}. ` +
    'If these look wrong here but are set in Vercel, the vars were likely added/changed after the last deployment — trigger a new deployment (env vars are baked in at build time, not read at runtime).'
  );
}

export async function supabaseFetch(path, options = {}) {
  if (!supabaseConfigured) throw new Error('Supabase is not configured.');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : '',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error_description || 'Supabase request failed.');
  return data;
}
