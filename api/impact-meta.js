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
  if (id && base && key) {
    try {
      const response = await fetch(
        `\( {base}/rest/v1/community_impact?id=eq. \){encodeURIComponent(id)}&select=title,story,location,storage_path,mime_type,media_kind&limit=1`,
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row && row.title) {
        title = row.title + (row.location ? " · " + row.location : "");
        description = String(row.story || description).slice(0, 160);
      }
      if (row && row.storage_path && String(row.media_kind || row.mime_type || "").indexOf("video") === -1) {
        image =
          `${base}/storage/v1/object/public/seek-impact/` +
          String(row.storage_path).split("/").map(encodeURIComponent).join("/");
      }
    } catch (_e) {}
  }
  const url = "https://seekbsn.org/impact/" + encodeURIComponent(id);
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Seek" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p><a href="${url}">Open this Seek story</a></p>
</body>
</html>`);
}
