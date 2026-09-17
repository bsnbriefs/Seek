import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function redact(text: string) {
  return String(text || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[phone]")
    .replace(/\b\d{10,}\b/g, "[number]")
    .slice(0, 2000);
}

function guessCategory(text: string) {
  const t = text.toLowerCase();
  if (t.includes("rent") || t.includes("house")) return "Housing";
  if (t.includes("school") || t.includes("fee")) return "Education";
  if (t.includes("hospital") || t.includes("medical")) return "Medical";
  if (t.includes("food")) return "Food";
  if (t.includes("job")) return "Employment & Business";
  return "Financial Assistance";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anon =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";

  const token = (req.headers.get("Authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token || !supabaseUrl || !anon) {
    return json({ error: "Sign in required." }, 401);
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ error: "Invalid or expired session." }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const purpose = String(body.purpose || "classify").trim();
  const title = redact(String(body.title || ""));
  const description = redact(String(body.description || body.need || ""));
  if (!title && !description) return json({ error: "Nothing to review." }, 400);

  if (!openaiKey) {
    return json({
      ok: true,
      source: "local",
      purpose,
      category: guessCategory(title + " " + description),
      summary: (title || description).slice(0, 200),
      flags: [],
    });
  }

  const prompt =
    purpose === "admin-triage"
      ? `Summarize this SEEK request for an admin. Do not approve or reject. Do not invent facts. Return JSON keys: summary, category, flags, missing.\nTitle: ${title}\nDescription: ${description}`
      : `Help phrase a SEEK need. Do not invent amounts. Return JSON keys: title, description, category.\n\( {title}\n \){description}`;

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You organize SEEK community assistance requests. Never invent money amounts. Never approve funding.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const aiJson = await aiRes.json();
  const content = aiJson?.choices?.[0]?.message?.content;
  let parsed: Record<string, unknown> = {};
  try {
    parsed = content ? JSON.parse(content) : {};
  } catch {
    parsed = { summary: String(content || "") };
  }
  return jsonOut({ ok: true, source: "openai", purpose, ...parsed });
});

function redact(text: string) {
  return String(text || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[phone]")
    .slice(0, 2000);
}

function guessCategory(text: string) {
  const t = text.toLowerCase();
  if (t.includes("rent") || t.includes("house")) return "Housing";
  if (t.includes("school")) return "Education";
  if (t.includes("hospital") || t.includes("medical")) return "Medical";
  if (t.includes("food")) return "Food";
  if (t.includes("job")) return "Employment & Business";
  return "Financial Assistance";
}

function jsonOut(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
           }
