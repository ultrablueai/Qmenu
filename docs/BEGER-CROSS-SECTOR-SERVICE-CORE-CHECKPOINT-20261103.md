# BEGER Shared Service Workflow Core — 2026-11-03 Engineering Checkpoint

**Owner's established plan is unchanged:** Multi-vertical configurable Beger Smart Business OS. Café/restaurant G2/G3 is the first Staging validation slice, not the full product. Future barbers/salons, bakeries, retail and clinic appointments must reuse generic primitives. Beger sells merchant SaaS subscriptions and does not collect customers' store payments or manage their settlement. No delivery/courier build in this slice.

## Implemented in branch feat/g1-foundation
- `lib/beger-service-workflows.ts`: typed, **pure** event vocabularies for table order, counter order, pickup, walk-in queue, appointment and clinic check-in. Each has an independent state transition graph and privacy-safe generic public notification signals. Generic Arabic, Turkish and English strings included.
- `app/dashboard/merchant-order-board.tsx`: existing G3 restaurant board now **reads shared public pager signal** for each order alongside its G3 order UI. The existing trusted `g3_transition_order` RPC remains the only state-change path; no client-side transition authorization, no new remote booking, no public clinic data.
- `app/dashboard/merchant-order-board.css`: readable mobile-safe customer pager status indicator in merchant pilot board.
- `tests/beger-service-workflows.test.mjs`: tests for six distinct journey types, valid/invalid transitions, terminal states, multilingual privacy-safe public signals and G3 integration/source contract.

## Critical limits
This is an actual shared **domain and UI integration**, not yet a generic persisted queue/appointment scheduler nor a verified background push notification system. Counter orders, appointments, clinic check-in and scheduled pickup remain intended workflows, not live product offerings. No cross-sector database table, merchant entitlement or payment integration activated.

## Verification blocker
GitHub Actions `G1 validation` run for 2026-11-03 HEAD `283ad7272ebc640c8813548cc01228854be9e733` and prior commits shows all three jobs (TypeScript validation, Production build, Static security assertions) as `failure` after ~1–4 seconds; job steps empty and job logs unavailable via linked API, so **cause not established**. Do not assert CI green or an app release. Follow up with GitHub Actions job UI/runner billing/action quota and run `npm ci && npm test && npm run lint && npm run build` before attempting Vercel staging deploy. Previous stable Vercel alias points to an older deployment.

## Next smallest development slice once gate runs
- Review and prove G3 order event mapping vs server SQL with independent real browser sessions and real devices.
- Define `service_ticket` persistence with business+branch scoped authorization, specific queue/appointment resources and immutable event log, consent and retention; no clinic sensitive data in common tickets.
- Add cashier-issued order-specific pager ticket and public status link with replay prevention, without mandating customer identity.
- Verify new journeys behind merchant-enabled sector feature entitlements (selected preferences do not confer access).
- Maintain G1/G2 gate; no Production changes without owner authorization.
