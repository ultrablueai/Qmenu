# Beger — Shared Pager Integration & CI Execution Recovery (2026-11-03)

## Locked product scope
Beger remains the owner's configurable multi-vertical Smart Business OS: sector templates + selectable capabilities + merchant-only SaaS subscription revenues. Do not process merchant customer payments, create marketplace commissions, or activate delivery/courier scope. Canonical plan remains controlling.

## Implemented in development branch
- Generic typed service workflows in `lib/beger-service-workflows.ts` for table orders, counter orders, pickup, walk-in queues, appointments and clinic check-in; each has its own legal transitions and projects into privacy-safe multilingual customer pager signals.
- Existing merchant G3 board uses this signal projection while retaining the server-authoritative `g3_transition_order` RPC.
- Existing guest G3 order status now also displays the same pager signals in Arabic, Turkish and English; status remains sourced from the protected `g3_public_order_status` RPC.
- `tests/beger-service-workflows.test.mjs` covers model/transition mapping and server RPC integration contracts.
- Fixed `.github/workflows/ci.yml`: static-security job now executes `npm ci` before Node tests because newer tests import the installed `typescript` package. Added GitHub Actions `concurrency.cancel-in-progress` for superseded pull-request runs to reduce waste.

## Critical test gate and release status
- Latest GitHub Actions job group fails rapidly with no job steps surfaced by GitHub connector, including TypeScript validation, production build and static security assertions. An additional CI/workflow execution issue remains unresolved. **Do not claim the changes passed CI.**
- GitHub Actions UI link (latest observed commit): https://github.com/ultrablueai/Qmenu/actions/runs/41587823278
- Necessary check: open this link and inspect GitHub's job failure preamble / account Actions billing and runner availability. If GitHub reports billing/usage, restore ability to run Actions; if not, obtain its first error/annotation and fix code. Do not repeatedly run no-start jobs as a debugging strategy.
- Reproduce with Node 22 and `npm ci --ignore-scripts --no-audit --no-fund && npm test && npm run lint && npm run build`. Then conduct real-device guest/merchant QR -> order -> status E2E.
- No new Vercel deployment and no Production changes; latest Vercel stable alias is older than this source HEAD.

## Remaining engineering
1. CI gate and exact error cause.
2. Generic persisted queue resources, ticket authorization, audit and safe guest status token; separate clinic sensitive workflows.
3. Counter-issued ticket and ready notification reliability, then appointment resource scheduling.
4. Published SaaS prices + verified subscription entitlements, with merchant financial transactions out of scope.
