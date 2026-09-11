export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  let title = "Seek request";
  let description = "A verified request on Seek, a project of BSN Foundation.";
  let image = "https://seekbsn.org/favicon.ico";
  if (id && base && key) {
    try {
      const response = await fetch(
        `${base}/rest/v1/requests?id=eq.${encodeURIComponent(id)}&select=title,description,location,amount_needed,amount_raised,status&limit=1`,
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row?.title) {
        title = row.title + (row.location ? " · " + row.location : "");
        const raised = row.amount_raised != null ? "₦" + Number(row.amount_raised).toLocaleString() + " raised. " : "";
        description = raised + String(row.description || description).slice(0, 160);
      }
      const ev = await fetch(
        `${base}/rest/v1/request_evidence?request_id=eq.${encodeURIComponent(id)}&select=storage_path,mime_type&limit=8`,
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      const files = await ev.json();
      const photo = (Array.isArray(files) ? files : []).find(
        (f) => String(f.mime_type || "").startsWith("image/") && f.storage_path
      );
      if (photo?.storage_path) {
        image =
          `${base}/storage/v1/object/public/seek-evidence/` +
          String(photo.storage_path).split("/").map(encodeURIComponent).join("/");
      }
    } catch (_e) {}
  }
  const url = "https://seekbsn.org/request/" + encodeURIComponent(id);
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
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p><a href="${url}">Open this Seek request</a></p>
  <p><img src="${escapeHtml(image)}" alt="" width="400" /></p>
</body>
</html>`);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}
