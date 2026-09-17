import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const found = await supabase
      .from("donations")
      .select("id,request_id,amount,status,donor_name,donor_email")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (!found.data) throw new Error("Donation not found.");

    if (String(found.data.status) !== "successful") {
      const { error } = await supabase.from("donations").update({ status: "successful" }).eq("id", found.data.id);
      if (error) throw new Error(error.message);
    }

    const closed = await supabase
      .from("donations")
      .select("id,request_id,amount,status,donor_name")
      .eq("id", found.data.id)
      .single();

    if (String(closed.data?.status) !== "successful") {
      throw new Error("Gift could not be marked successful.");
    }

    return new Response(JSON.stringify({
      ok: true,
      verified: true,
      request_id: closed.data.request_id,
      requestId: closed.data.request_id,
      amount: closed.data.amount,
      donation: closed.data,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});        paystack_reference: reference,
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
