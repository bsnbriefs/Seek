# Seek production deployment

## 1. Supabase
Create a Supabase project and run `supabase/migration.sql` in SQL Editor.

Add these Vite variables in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 2. Paystack
Set these Supabase Edge Function secrets:
- `PAYSTACK_SECRET_KEY`

Deploy both functions:
- `paystack-initialize`
- `paystack-webhook`

Configure Paystack webhook URL as:
`https://YOUR_PROJECT.supabase.co/functions/v1/paystack-webhook`

Never put `PAYSTACK_SECRET_KEY` in Vite or the browser.

## 3. Vercel
Build command: `npm run build`
Output: `dist`
Framework: Vite

## 4. Before public launch
- Create a real admin role and admin RLS policies.
- Turn on email/phone authentication and configure redirect URLs.
- Add a private storage bucket for sensitive verification documents and policies restricting access.
- Test successful, failed and abandoned Paystack payments.
- Test webhook idempotency and amount verification.
- Replace all demo impact numbers with live queries.
- Add Terms, Privacy, safeguarding and refund/contact policies.
- Configure a custom domain and production environment variables.
