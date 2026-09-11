export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  let title = "Seek impact story";
  let description = "A community story from Seek, a project of BSN Foundation.";
  let image = "https://seekbsn.org/favicon.ico";
  if (id && base && key && !id.startsWith("thanks-")) {
    try {
      const response = await fetch(
        `\( {base}/rest/v1/community_impact?id=eq. \){encodeURIComponent(id)}&status=eq.published&select=title,story,location,storage_path,mime_type,media_kind&limit=1`,
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row?.title) {
        title = row.title + (row.location ? " · " + row.location : "");
        description = String(row.story || description).slice(0, 160);
      }
      const media = await fetch(
        `\( {base}/rest/v1/community_impact_media?impact_id=eq. \){encodeURIComponent(id)}&select=storage_path,mime_type,media_kind&limit=6`,
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      const files = await media.json().catch(() => []);
      const photo =
        (Array.isArray(files) ? files : []).find((f) => String(f.media_kind || f.mime_type || "").includes("image") && f.storage_path) ||
        (row?.storage_path && String(row.mime_type || row.media_kind || "").includes("image") ? row : null);
