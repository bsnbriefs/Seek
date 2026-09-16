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
  coverNote: string;
}) {
  const key = Deno.env.get("RESEND_API_KEY") || "";
  if (!key || !opts.to) return;
  const naira = "₦" + Math.round(Number(opts.amount) || 0).toLocaleString();
  const html = `
    <p>Thank you for giving through SEEK.</p>
    <p><strong>Amount:</strong> ${esc(naira)}<br/>
    <strong>Purpose:</strong> ${esc(opts.purpose)}<br/>
    <strong>Reference:</strong> ${esc(opts.reference)}</p>
    <p>${esc(opts.coverNote)}</p>
    <p>This is your SEEK receipt. Keep it for your records. SEEK is a project of BSN Foundation.</p>
  `;
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
      html,
    }),
  }).catch(() => {});
}

async function markPaid(supabase: ReturnType<typeof createClient>, reference: string, payload: Record<string, unknown>) {
  const { data: donation } = await supabase
    .from("donations")
    .select("id,request_id,amount,status,email,donor_email,donor_name")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (!donation) throw new Error("Donation not found.");
  if (donation.status === "successful") return { donation, justPaid: false };

  const { error } = await supabase
    .from("donations")
    .update({
      status: "successful",
      paid_at: new Date().toISOString(),
      paystack_payload: payload,
    })
    .eq("id", donation.id);
  if (error) {
    await supabase.from("donations").update({ status: "successful" }).eq("id", donation.id);
  }
  return { donation, justPaid: true };
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const meta = result.data?.metadata || {};
    if (String(meta.interval || "") === "monthly") {
      const authCode = result.data?.authorization?.authorization_code;
      const customer = result.data?.customer?.customer_code || result.data?.customer?.email;
      const kobo = Number(result.data?.amount || 0);
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
        const planCode = plan?.data?.plan_code;
        if (planCode) {
          await fetch("https://api.paystack.co/subscription", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer,
              plan: planCode,
              authorization: authCode,
            }),
          });
        }
      }
    }

    const { donation, justPaid } = await markPaid(supabase, reference, result.data || {});

    if (justPaid) {
      let purpose = String(donation.donor_name || "").split("·").slice(1).join("·").trim();
      if (!purpose && donation.request_id) {
        const { data: reqRow } = await supabase.from("requests").select("title").eq("id", donation.request_id).maybeSingle();
        purpose = reqRow?.title || "A published SEEK request";
      }
      if (!purpose) purpose = "SEEK / BSN Foundation";
      const to = donation.email || donation.donor_email || result.data?.customer?.email || "";
      const naira = Number(donation.amount || result.data?.amount / 100 || 0);
      await sendReceipt({
        to,
        amount: naira,
        purpose,
        reference,
        coverNote: "If you covered SEEK’s 5%, that is included in the amount Paystack charged.",
      });
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
