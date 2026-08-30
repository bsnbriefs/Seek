import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')!;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['verify']);
    const expected = await crypto.subtle.verify('HMAC', key, hexToBytes(signature || ''), new TextEncoder().encode(raw));
    if (!expected) return new Response('Invalid signature', { status: 401 });

    const event = JSON.parse(raw);
    if (event.event !== 'charge.success') return new Response('ok');
    const reference = event.data?.reference;
    if (!reference) return new Response('Missing reference', { status: 400 });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: donation } = await supabase.from('donations').select('id,request_id,amount,status').eq('paystack_reference', reference).single();
    if (!donation) return new Response('Donation not found', { status: 404 });
    if (donation.status === 'successful') return new Response('ok');

    const paidAmount = Number(event.data.amount) / 100;
    if (Math.abs(paidAmount - Number(donation.amount)) > 0.01) return new Response('Amount mismatch', { status: 400 });

    await supabase.from('donations').update({ status: 'successful', paid_at: new Date().toISOString() }).eq('id', donation.id);
    if (donation.request_id) {
      const { data: reqRow } = await supabase.from('requests').select('amount_raised,amount_needed').eq('id', donation.request_id).single();
      if (reqRow) {
        const raised = Number(reqRow.amount_raised || 0) + paidAmount;
        const status = Number(reqRow.amount_needed || 0) > 0 && raised >= Number(reqRow.amount_needed) ? 'fulfilled' : 'partially_funded';
        await supabase.from('requests').update({ amount_raised: raised, status }).eq('id', donation.request_id);
      }
    }
    return new Response('ok');
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Webhook error', { status: 400 });
  }
});

function hexToBytes(hex: string) { const bytes = new Uint8Array(hex.length / 2); for (let i=0;i<bytes.length;i++) bytes[i]=parseInt(hex.substr(i*2,2),16); return bytes; }
