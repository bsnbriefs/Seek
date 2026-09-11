export default async function handler(_req, res) {
  const items = [];
  try {
    const rss = await fetch(
      "https://news.un.org/feed/subscribe/en/news/topic/humanitarian-aid/feed/rss.xml"
    );
    const xml = await rss.text();
    const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
      .map((m) => m[1])
      .filter((title) => title && !/UN News/i.test(title));
    items.push(...titles.slice(0, 8));
  } catch (_e) {}
  res.setHeader("Cache-Control", "s-maxage=180");
  res.status(200).json({ items });
}
