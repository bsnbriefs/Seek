export default async function handler(_req, res) {
  const items = [];
  const headers = { Accept: "application/json" };
  try {
    const reports = await fetch(
      "https://api.reliefweb.int/v2/reports?appname=seekbsn&limit=8",
      { headers }
    );
    const json = await reports.json();
    for (const row of json.data || []) {
      const title = row?.fields?.title || row?.fields?.name;
      if (title) items.push(title);
    }
  } catch (_e) {}
  if (!items.length) {
    try {
      const disasters = await fetch(
        "https://api.reliefweb.int/v1/disasters?appname=seekbsn&limit=8",
        { headers }
      );
      const json = await disasters.json();
      for (const row of json.data || []) {
        const title = row?.fields?.name || row?.fields?.title;
        if (title) items.push(title);
      }
    } catch (_e) {}
  }
  res.setHeader("Cache-Control", "s-maxage=180");
  res.status(200).json({ items });
}
