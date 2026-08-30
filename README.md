# Seek — production-ready foundation

Seek is a community assistance platform and a project of BSN Foundation. This version preserves the existing React/Tailwind UI and adds the production backend foundation for Supabase and Paystack.

## What is now real
- Seek Help submissions can be persisted to Supabase.
- Private requester contact information is separated from public request data.
- Give/offer submissions can be persisted to Supabase.
- Volunteer applications can be persisted to Supabase.
- Donation initialization is routed through a Supabase Edge Function and Paystack.
- Paystack webhook updates donation status and request progress.
- SQL schema, indexes and initial RLS policies are included.

## Still required before public launch
- Configure a real Supabase project and environment variables.
- Deploy Edge Functions and add Paystack secret/webhook settings.
- Build and secure the BSN Foundation admin dashboard.
- Add authenticated user accounts and complete admin RLS policies.
- Add private document storage policies.
- Test payments end-to-end in Paystack test mode before switching live.
- Replace demo content/impact figures with real data.

See `DEPLOYMENT.md`.

## PWA + Motion

Seek is configured as a Progressive Web App foundation. The app includes a web manifest, install icons, theme metadata, and a lightweight service worker for shell/offline caching. This makes the deployed website installable from supported mobile/desktop browsers and provides a path to later package the same web app for app stores if desired.

The UI also includes restrained scroll-reveal, staggered card, hover, connector, progress and reduced-motion-safe animations.

### PWA note
The service worker caches the application shell and same-origin GET assets. Supabase/API/payment requests are not treated as offline data and still require an internet connection.
