# Beger — Plan vs. Reality Audit (2026-11-02)

## Why this review was opened
Owner rejected repeated cosmetic changes and asked to check the canonical phase plan and verify actual UX and release readiness. This audit does not authorize any new feature or production change.

## Approved phase order (unchanged)
G1 foundation and real-role isolation → G2 shop/table QR + central catalog + public mobile menu → G3 real order/KDS/pager → G4 optional consented loyalty/offers → G5 pilot/commercial GO.

## Verified observations
1. **Preview quality is NOT design acceptance**. Next.js tests and Vercel READY establish build health, but no independently captured screenshot comparison against the two user-supplied reference boards was completed. A dedicated visual review is still mandatory for guest (welcome/menu/product/cart/rewards) and merchant (landing/login/HQ/catalog/themes/branches).
2. **G1 commercial security gate remains open**, per canonical plan and G1 acceptance. SQL role simulations do not substitute for two distinct user sessions, per-branch authorization denial, password/reset tests and documented rollback.
3. **G2 QR code path exists**, Staging contains a real demo branch and two deliberately added demo tables; table RPC resolves their distinct labels. User confirmed camera preview works on Android after browser permission change. Neither iPhone nor independent second-device scan/revocation flows has signed-off acceptance.
4. **Vercel Preview remains access-protected**. Shareable links expire. Never tell a merchant to print Preview URLs for real customers. New scanner logic preserves supported language and the currently authorized Preview share token when navigating between shop/table/product QR routes; it never forwards arbitrary external URL destinations.
5. **Dashboard has honest gaps**: product/orders/ratings/analytics and rewards are placeholders or previews. A reference Olive/Cream design must not be represented as a verified stored merchant preference. No real orders/KDS/pager, loyalty/points, or commercial checkout is live.
6. **Tenant contract**: merchant HQ controls business-wide catalog/publishing, branches are operational only; RLS exists for dining tables and canonical catalog, but capability-level delegation and real separate-account negative browser tests remain pending.

## Ranked blockers to G2 engineering acceptance
**P0** — Verify table/shop QR on a clean second device without a Vercel session, using a controlled public demo host or explicit protected-test credentials; confirm table identity visible and wrong branch/token fails safely. Preview-share success is not anonymous-public proof.
**P0** — Two distinct authenticated test accounts, owner/manager create/rotate/deactivate, unauthorized foreign-tenant and staff attempts denied at API boundary. Use reversible test records, no production.
**P1** — Capture actual guest and merchant screenshots at 320/360/390/768/1280px, compare reference layout, RTL/LTR, 200% text zoom, product details, cart overlays, and login. Fix defects before owner design signoff.
**P1** — Explicit owner acceptance for which reference-board elements remain future-scope (real rewards, sales charts, kitchen/pager, order placement). Keep unavailable demo UI marked clearly.
**P1** — Reconfirm G1 rollback/restore, authentication and audit gates. No G3 commercial progression on test-count alone.

## Applied improvements in this audit
- Scanner preserves valid QR language and scoped Vercel Preview access across navigation instead of dropping all query parameters, without trusting arbitrary QR hostnames.
- Merchant HQ's theme metric now explicitly says **Theme Preview** rather than falsely saying the active merchant theme has been verified.
- Automated regression expectations updated to lock the navigation and honesty checks.

## Decision
G2 **NO-GO for commercial/fully public release**. Development implementation and protected Preview may continue. Only mark G2 GO after the blockers above have evidence and owner signs off on visuals and phone/role tests. Main and Production remain untouched.
