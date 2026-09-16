import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendReceipt(opts: {
  to: string;
  amount: number;
  purpose: string;
  reference: string;
}) {
  const key = Deno.env.get("RESEND_API_KEY") || "";
  if (!key || !opts.to) return;
  const naira = "₦" + Math.round(Number(opts.amount) || 0).toLocaleString();
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Seek <notify@seekbsn.org>",
      to: [opts.to],
      subject: "SEEK receipt — " + naira,
      html: `<p>Thank you for giving through SEEK.</p><p><strong>Amount:</strong> ${esc(naira)}<br/><strong>Purpose:</strong> ${esc(opts.purpose)}<br/><strong>Reference:</strong> ${esc(opts.reference)}</p><p>This is your SEEK receipt. SEEK is a project of BSN Foundation.</p>`,
    }),
  }).catch(() => {});
}

function giftFromPaystack(reference: string, payload: Record<string, unknown>) {
  const meta = (payload?.metadata || {}) as Record<string, unknown>;
  const amount = Number(meta.gift_amount || Number(payload?.amount || 0) / 100) || 0;
  const email = String((payload as { customer?: { email?: string } })?.customer?.email || "");
  return {
    id: null,
    request_id: meta.request_id || null,
    amount,
    status: "successful",
    email,
    donor_email: email,
    donor_name: meta.donor_name || null,
    paystack_reference: reference,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const reference = String(body.reference || body.trxref || body.data?.reference || "").trim();
    if (!reference) throw new Error("Missing payment reference.");

    const paystack = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
    });
    const result = await paystack.json();
    if (!paystack.ok || result.data?.status !== "success") {
      throw new Error(result.message || "Payment is not successful yet.");
    }

    const service =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEYS") ||
      "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", service);

    const payload = result.data || {};
    const meta = payload.metadata || {};
    let donation: Record<string, unknown> | null = null;
    let justPaid = true;

    const found = await supabase
      .from("donations")
      .select("id,request_id,amount,status,email,donor_email,donor_name")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (found.data) donation = found.data;
    if (!donation && meta.request_id) {
      const pending = await supabase
        .from("donations")
        .select("id,request_id,amount,status,email,donor_email,donor_name")
        .eq("request_id", meta.request_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending.data) donation = pending.data;
    }

    if (!donation) {
      const row = {
        request_id: meta.request_id || null,
        donor_email: payload.customer?.email || "",
        amount: Number(meta.gift_amount || Number(payload.amount || 0) / 100) || 0,
        currency: "NGN",
        paystack_reference: reference,
        status: "successful",
      };
      const inserted = await supabase.from("donations").insert(row).select("id,request_id,amount,status,email,donor_email,donor_name").maybeSingle();
      if (inserted.data) donation = inserted.data;
    }

    if (donation?.id && donation.status !== "successful") {
      await supabase.from("donations").update({
        status: "successful",
        donor_name: donation.donor_name || meta.donor_name || payload.customer?.first_name || null,
      }).eq("id", donation.id);
    } else if (donation?.status === "successful" && donation.id) {
      justPaid = false;
    }

    if (!donation) donation = giftFromPaystack(reference, payload);

    if (justPaid) {
      let purpose = String(donation.donor_name || meta.donor_name || "").split("·").slice(1).join("·").trim();
      if (!purpose && donation.request_id) {
        const { data: reqRow } = await supabase.from("requests").select("title").eq("id", donation.request_id).maybeSingle();
        purpose = reqRow?.title || "A published SEEK request";
      }
      if (!purpose) purpose = "SEEK / BSN Foundation";
      const to = String(donation.email || donation.donor_email || payload.customer?.email || "");
      await sendReceipt({
        to,
        amount: Number(donation.amount || 0),
        purpose,
        reference,
      });
    }

    if (String(meta.interval || "") === "monthly") {
      const authCode = payload.authorization?.authorization_code;
      const customer = payload.customer?.customer_code || payload.customer?.email;
      const kobo = Number(payload.amount || 0);
      if (authCode && customer && kobo > 0) {
        const planRes = await fetch("https://api.paystack.co/plan", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Seek monthly " + Math.round(kobo / 100),
            interval: "monthly",
            amount: kobo,
            currency: "NGN",
          }),
        });
        const plan = await planRes.json();
        if (plan?.data?.plan_code) {
          await fetch("https://api.paystack.co/subscription", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer,
              plan: plan.data.plan_code,
              authorization: authCode,
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      verified: true,
      request_id: donation.request_id,
      requestId: donation.request_id,
      amount: donation.amount,
      donation,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
