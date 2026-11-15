# Beger G22 — Station alerts and navigation recovery

**2026-11-08 · Staging only · Commercial NO-GO**

## Actual source inspection before changes
- Merchant owner order board polls `g3_branch_orders` every seven seconds, with pending-order sound but its previously-seen set was held only in component memory.
- Cashier polls `g10_cashier_queue` every eight seconds and alerted when orders became ready, but did not alert on **new pending** orders. The ready-order set also disappeared on remount.
- Kitchen polls `g9_kitchen_queue` every seven seconds and had **no** audible or visible new-accepted-order bell.

## G22 implemented
- `lib/beger-station-alerts.ts` defines a bounded, branch-and-station-scoped snapshot/reconciliation model. `sessionStorage` stores a limited set of observed order statuses and last 30 event messages to preserve alerts through navigation/reloads in the **same browser tab**. An initial snapshot is quiet (no fabricated "new" sounds for old orders); subsequent actionable transitions produce at most one alert per order/status key.
- `components/beger-station-alerts.tsx` provides a consistent compact bell, current actionable-order count, recent session alerts and clear-history control. Alerts are derived only from existing authorized server RPC results, not from cross-tenant input.
- Updated merchant owner, cashier and kitchen workspaces to use the same scoped notification engine. Cashier now detects new pending and ready events; kitchen detects freshly accepted orders and exposes the existing sound/vibration settings and test control. Staff screens refresh again on document visibility and window focus.
- Existing `useBegerFeedback` handles three alert pulses when user-enabled and permitted by the browser. No OS push permission, background service worker or claim of notifications when the browser is closed.
- Test `tests/beger-g22-station-alerts.test.mjs` checks scopes, dedupe, polling/visibility wiring, feedback and explicit hardware/browser limits.

## Scope and remaining work
- G22 provides **foreground or resumed-tab** alerts, not guaranteed background delivery. Offline transitions that happen and disappear before the next snapshot can remain unseen; durable server-side per-actor notification records and Push subscriptions are a later gate.
- No Production database or schema changes. Prior Staging tenant protections, order transitions, pager isolation and G17–G21 print state remain unchanged.
- Next run exact-HEAD `npm test && npm run build` through guarded Vercel Staging, then verify same fixed alias and version.
- Real device sleep/background audio/vibration, independent staff accounts and end-to-end order/print acceptance remain unverified, so commercial launch continues **NO-GO**.

## CI compatibility follow-up
- First guarded G22 CI attempt detected obsolete assertions for merchant/cashier in-memory dedupe and a Node `.mjs` test mistakenly containing a TypeScript-only annotation. The tests were updated to assert the newer branch-scoped stored snapshot semantics instead. No order/business permissions were relaxed. A fresh full test+Next build on the exact guarded HEAD must verify these repairs before marking G22 deployed.

## Final regression repairs
- After fixing the G22 Node `.mjs` syntax and replacing outdated merchant/cashier implementation assertions, the CI improved to 405/406 tests. The last failure came from G4 history test expecting removed `seen.current` internals. Replaced it with a guard ensuring archived-order reads cannot fire live-order station alerts. Existing historical order security and reprint assertions remain intact.
- Next guarded Staging deployment should run the full suite and Next build, and alias mapping must be checked before declaring READY.
