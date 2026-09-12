export default async function handler(req, res) {
  try {
    const raw = req.query && req.query.id;
    const id = String(Array.isArray(raw) ? raw[0] : raw || "").trim();
    const base = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const key = String(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ""
    );
    let title = "Seek impact story";
    let description = "A community story from Seek, a project of BSN Foundation.";
    let image = "https://seekbsn.org/favicon.ico";

    function publicImage(path) {
      if (!path) return "";
      return (
        base +
        "/storage/v1/object/public/seek-impact/" +
        String(path).split("/").map(encodeURIComponent).join("/")
      );
    }

    if (id && base && key && id.indexOf("thanks-") !== 0) {
      const response = await fetch(
        base +
          "/rest/v1/community_impact?id=eq." +
          encodeURIComponent(id) +
          "&select=title,story,location,storage_path,mime_type,media_kind&limit=1",
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row && row.title) {
        title = row.title + (row.location ? " · " + row.location : "");
        description = String(row.story || description).slice(0, 160);
      }
      const kind = String((row && (row.media_kind || row.mime_type)) || "");
      if (row && row.storage_path && kind.indexOf("video") === -1) {
        image = publicImage(row.storage_path);
      } else {
        try {
          const media = await fetch(
            base +
              "/rest/v1/community_impact_media?or=(impact_id.eq." +
              encodeURIComponent(id) +
              ",community_impact_id.eq." +
              encodeURIComponent(id) +
              ")&select=storage_path,mime_type,media_kind&limit=8",
            { headers: { apikey: key, Authorization: "Bearer " + key } }
          );
          const files = await media.json();
          const photo = (Array.isArray(files) ? files : []).find(function (f) {
            const k = String(f.media_kind || f.mime_type || "");
            return f.storage_path && k.indexOf("video") === -1;
          });
          if (photo) image = publicImage(photo.storage_path);
        } catch (_e) {}
      }
    }

    const page = "https://seekbsn.org/impact/" + encodeURIComponent(id);
    function safe(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(
      "<!doctype html><html lang='en'><head><meta charset='utf-8'/>" +
        "<title>" + safe(title) + "</title>" +
        "<meta property='og:title' content='" + safe(title) + "'/>" +
        "<meta property='og:description' content='" + safe(description) + "'/>" +
        "<meta property='og:image' content='" + safe(image) + "'/>" +
        "<meta http-equiv='refresh' content='0;url=" + page + "'/>" +
        "</head><body><p><a href='" + page + "'>Open this Seek story</a></p></body></html>"
    );
  } catch (e) {
    res.status(200).send("<!doctype html><html><body><p>Seek impact story</p></body></html>");
  }
}
