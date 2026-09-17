import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const raw = await req.text();
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
  const header = String(req.headers.get("x-paystack-signature") || "");
  if (secret && header) {
    const expected = await hmacHex(secret, raw);
    if (expected !== header) {
      return new Response(JSON.stringify({ error: "bad signature" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }

  let event: Record<string, unknown> = {};
  try { event = JSON.parse(raw); } catch {
    return new Response("bad json", { status: 400, headers: cors });
  }
  if (String(event.event || "") !== "charge.success") {
    return new Response(JSON.stringify({ ok: true, ignored: event.event }), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  const data = (event.data || {}) as Record<string, unknown>;
  const reference = String(data.reference || "");
  if (!reference) return new Response("no reference", { status: 400, headers: cors });

  const service =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEYS") ||
    "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", service);

  const found = await supabase
    .from("donations")
    .select("id,status,request_id,donor_name,amount")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!found.data) {
    return new Response(JSON.stringify({ error: "Donation not found", reference }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  }

  if (String(found.data.status) !== "successful") {
    const { error } = await supabase.from("donations").update({
      status: "successful",
      donor_name: found.data.donor_name,
    }).eq("id", found.data.id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (found.data.request_id) {
      await supabase.rpc("notify_request_gift", {
        p_request_id: found.data.request_id,
        p_amount: found.data.amount,
        p_name: found.data.donor_name || "A neighbour",
      }).catch(() => {});
    }
  }

  return new Response(JSON.stringify({ ok: true, reference, status: "successful" }), { headers: { ...cors, "Content-Type": "application/json" } });
});
