import { getUserSession, listLiveSupportCases, listPublicOffers, listAppreciationStories } from "./seekApi";

const SEEN_KEY = "seek_feed_seen";
const SKIP_KEY = "seek_feed_skip";
const TOPIC_KEY = "seek_feed_topics";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_e) {}
}

export function recordFeedSignal(kind, meta = {}) {
  if (kind === "view" && meta.id) {
    const seen = readJson(SEEN_KEY, {});
    seen[meta.id] = (Number(seen[meta.id]) || 0) + 1;
    writeJson(SEEN_KEY, seen);
  }
  if (kind === "skip" && meta.id) {
    const skip = readJson(SKIP_KEY, {});
    skip[meta.id] = Date.now();
    writeJson(SKIP_KEY, skip);
  }
  if (kind === "topic" && meta.topic) {
    const topics = readJson(TOPIC_KEY, {});
    const key = String(meta.topic).toLowerCase();
    topics[key] = (Number(topics[key]) || 0) + 1;
    writeJson(TOPIC_KEY, topics);
  }
}

function freshness(iso) {
  const ageH = (Date.now() - new Date(iso || 0).getTime()) / 36e5;
  if (!Number.isFinite(ageH) || ageH < 0) return 0;
  if (ageH < 24) return 8;
  if (ageH < 72) return 5;
  if (ageH < 168) return 2;
  return 0;
}

function topicBoost(text, topics) {
  const blob = String(text || "").toLowerCase();
  let score = 0;
  Object.entries(topics).forEach(([topic, n]) => {
    if (topic && blob.includes(topic)) score += Math.min(4, Number(n) || 0);
  });
  return score;
}

function locationBoost(text, city) {
  if (!city) return 0;
  return String(text || "").toLowerCase().includes(String(city).toLowerCase()) ? 5 : 0;
}

export async function getForYouFeed(limit = 16) {
  const session = getUserSession();
  const seen = readJson(SEEN_KEY, {});
  const skip = readJson(SKIP_KEY, {});
  const topics = readJson(TOPIC_KEY, {});
  const city = session?.user?.user_metadata?.city || session?.user?.user_metadata?.location || "";

  const [cases, offers, thanks] = await Promise.all([
    listLiveSupportCases(24).catch(() => []),
    listPublicOffers().catch(() => []),
    listAppreciationStories().catch(() => []),
  ]);

  const videoCases = (Array.isArray(cases) ? cases : []).filter((row) => row?.id && Array.isArray(row.media) && row.media.length);

  const ranked = videoCases.map((row) => {
    if (skip[row.id]) return { row, score: -99 };
    const blob = [row.title, row.category, row.location, row.description].join(" ");
    let score = 6;
    score += freshness(row.created_at || row.createdAt);
    score += topicBoost(blob, topics);
    score += locationBoost(blob, city);
    if (/food|school|educat|hospital|job|mentor|housing/i.test(blob)) score += 2;
    score -= Math.min(8, Number(seen[row.id]) || 0);
    return { row, score };
  }).filter((item) => item.score > -20).sort((a, b) => b.score - a.score);

  const mixed = [];
  const used = new Set();
  ranked.forEach((item) => {
    if (used.has(item.row.id)) return;
    used.add(item.row.id);
    mixed.push(item.row);
  });

  const extraThanks = (Array.isArray(thanks) ? thanks : []).slice(0, 3);
  extraThanks.forEach((story) => {
    if (story.request_id && used.has(story.request_id)) return;
  });

  void offers;
  return mixed.slice(0, limit);
}
