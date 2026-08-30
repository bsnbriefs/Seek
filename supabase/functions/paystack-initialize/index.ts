import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { amount, email, request_id, anonymous } = await req.json();
    const numericAmount = Number(amount);
    if (!email || !Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Valid email and donation amount are required.');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (request_id) {
      const { data: request } = await supabase.from('requests').select('id,status,is_public').eq('id', request_id).single();
      if (!request || !request.is_public || !['published','partially_funded'].includes(request.status)) throw new Error('This request is not currently accepting donations.');
    }

    const reference = `SEEK-${crypto.randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`;
    const { error: insertError } = await supabase.from('donations').insert({ request_id: request_id || null, donor_email: email, anonymous: Boolean(anonymous), amount: numericAmount, currency: 'NGN', paystack_reference: reference, status: 'pending' });
    if (insertError) throw insertError;

    const paystack = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount: Math.round(numericAmount * 100), currency: 'NGN', reference, metadata: { request_id: request_id || null, anonymous: Boolean(anonymous), platform: 'seek' } }),
    });
    const result = await paystack.json();
    if (!paystack.ok || !result.status) throw new Error(result.message || 'Paystack initialization failed.');
    return new Response(JSON.stringify({ authorization_url: result.data.authorization_url, reference }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
