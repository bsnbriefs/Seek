export default async function handler(_req, res) {
  try {
    const response = await fetch(
      "https://api.reliefweb.int/v1/disasters?appname=seekbsn&profile=list&limit=8&sort[]=date:desc"
    );
    const json = await response.json();
    const items = (Array.isArray(json?.data) ? json.data : [])
      .map((row) => row?.fields?.name || row?.fields?.title)
      .filter(Boolean);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ items });
  } catch (error) {
    res.status(200).json({ items: [] });
  }
}
