export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  let title = "Seek impact story";
  let description = "A community story from Seek.";
  let image = "https://seekbsn.org/favicon.ico";
  try {
    if (id && base && key) {
      const response = await fetch(
        `\( {base}/rest/v1/community_impact?id=eq. \){encodeURIComponent(id)}&select=title,story,location,storage_path,media_kind&limit=1`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row && row.title) {
        title = row.title;
        description = String(row.story || description).slice(0, 160);
      }
      if (row && row.storage_path) {
        image = `\( {base}/storage/v1/object/public/seek-impact/ \){String(row.storage_path).split("/").map(encodeURIComponent).join("/")}`;
      }
    }
  } catch (e) {}
  const url = "https://seekbsn.org/impact/" + encodeURIComponent(id);
  res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"/><title>\( {title}</title><meta property="og:title" content=" \){
