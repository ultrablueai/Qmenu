# Beger Salon G41 — separated role demonstration and release boundaries

## Delivered
- Public demonstration landing `/demo/salon` linking distinct customer, barber, owner pages.
- Customer `/demo/salon/customer`: multi-service basket, barber selection, booking number, stage timeline and individual arrival URL.
- Owner `/demo/salon/owner`: confirm or cancel new appointment, mark arrival and record demo collection.
- Barber `/demo/salon/barber`: only chosen demo barber's assigned bookings, begin and complete service.
- Arrival `/demo/salon/checkin?token=...`: per-booking random token, confirmation only while pending booking has been approved, local demonstration.
- In-app state update notice and optional browser Notification permission in open browser sessions.
- Appointments use same-browser `localStorage` and storage events, **not a remote database**, authenticated roles, signed tokens, or genuine push notifications. All pages are intentionally accessible with no login and must never be marketed as permission-enforced.
- Existing hairdresser and men's/women's schedule demo remains accessible from `/demo/salon`; settings there are not synced to the separate role demo.
- Production and payment not modified.

## Remaining before real shops
1. Authenticated owner vs staff memberships and barber-level assignments enforced by server/DB RLS.
2. Tenant-scoped service/chair/schedule/appointment/order line schema and atomic collision prevention in Postgres.
3. Verified server-issued short-lived arrival QR bound to appointment/branch; check-in requires QR + scoped visit confirmation and rate limiting.
4. Supabase Realtime channels scoped to tenant and staff, authenticated customer booking tracking, out-of-app web push/FCM and consent-based email/SMS reminder jobs.
5. Staff breaks, variable service durations and separate parallel stations (e.g. hair + nails) backed by server schedule.
6. Complete end-to-end tests on separate accounts and devices. Until then it is a shareable, **local-only demo**.

## CI
GitHub branch feature CI runner issue remains separate; staging Vercel gates run npm tests and Next build. Previous run `dpl_FvwBhnJq3WtYFbX6ebHUd21E5MUZ` hit a stale G39 source-structure assertion after service catalog changes; revised G39 test tracks actual code. Stable alias must not be treated as updated until latest build READY.
