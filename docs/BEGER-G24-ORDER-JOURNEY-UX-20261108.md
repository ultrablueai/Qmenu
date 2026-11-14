# Beger G24 — One-screen merchant order flow and journey reduction
**2026-11-08 · Staging only · user screenshot diagnosis**

## Observed problem (not conjecture)
- User's screenshot showed order `0DEF4C23F3`, table 02, status **accepted** while merchant board had four columns and several prominent print/collection/rejection controls.
- The actual Staging `g3_orders` record `0def4c23-f39a-413d-8009-8afc12653cf1` was accepted, and owner-authenticated `g9_kitchen_queue` returned **exactly this order**. Therefore the database did not drop the request. The handoff/navigation UX was the blocker; the kitchen operator had not yet pressed **start preparing**.
- Existing backend accepts `pending → accepted` with owner/cashier, kitchen advances `accepted → preparing → ready`, cashier completes `ready → fulfilled`. No second dispatch action is needed; status acceptance creates G17 print jobs and G23 durable kitchen notification atomically.

## Implemented in the merchant experience
- `headquarters-catalog.tsx`: first-class, directly accessible **Orders → Kitchen → Cashier** workspaces in the same business/branch dashboard. Other functionality (Pager, reports, menu/catalog, QR, theme, reviews, loyalty, staff, legacy) remains accessible in a compact expandable *secondary services and settings* section. Switching workspaces preserves selected tenant/branch.
- `merchant-order-board.tsx`: clearly shows one primary contextual operation per order:
  - pending: **Accept and send to kitchen automatically**
  - accepted: **Already at kitchen; open kitchen station**
  - preparing: **Kitchen is preparing; open kitchen for status**
  - ready: **Open cashier for delivery**
- The station controls use the actual kitchen and cashier workspaces; they do NOT spoof transitions. Kitchen must still explicitly start work and mark ready, and cashier must confirm actual handoff.
- Payment recording, manual print documents and reject controls are inside `details` on each ticket instead of crowding the default view. Full print queue/settings/advanced notifications and detailed filter controls are behind explicit controls; no data or functionality was deleted.
- `merchant-order-board.css` adds high-visibility primary action styling and mobile-responsive step controls.
- Added `tests/beger-g24-guided-order-flow.test.mjs`, updated the G17 regression contract to expect the same operational outcome instead of the removed `next` constant.

## Operating map — what happens automatically?
1. Table QR: `/t/<token>` associates the table, items, product options; takeaway is separate `/b/<branch>` / `takeaway` service. Both generate `pending` orders (not paid merchant transactions).
2. Merchant/cashier accepts exactly once: server status `accepted` ⇒ visible in kitchen, notification for kitchen and three print tasks queued. No second merchant-side dispatch.
3. Kitchen starts `preparing` intentionally, then marks `ready`. Ready appears for cashier and on public order status; 24/7 push is **not** proven.
4. Cashier announces when appropriate and confirms `fulfilled` upon actual handoff. Payment is separately recorded only when physically received via merchant's own payment method; no automatic payment is falsely assumed.
5. Standalone Pager is its **own** queue and ticket service for other merchants/workflows, not a mandatory duplicate order number or extra step for QR food orders.
6. Printer jobs are automatic; physical browser printing remains manual, with prior G18 audit, G19 branch routing, G20 lease test lab and G21 health monitoring.

## Outstanding acceptance
- Signed-JWT and independent-device E2E on customer QR, kitchen employee login, cashier employee login, printer/receipt, audible alert, takeaway/dine-in and Pager.
- Need to validate real UX visually after deployment (simple cards and responsive mobile); CI passing is not proof of user-experience acceptance.
- No physical silent printer bridge; no production fiscal integration, paid subscription or commercial release GO.
- All work on `feat/g1-foundation` and Supabase Staging; no Supabase Production mutation.

## Release verification update
- First staging CI run of G24 reported 410/413 tests passing; failures were three source-contract assertions expecting previous implementation details (old pre-G24 KPI category, old workspace type union and a regex typo for optional function invocation). Source assertions were corrected to require the new real station navigation and combined kitchen load. The branch reception toggles were folded into a compact disclosure without removing controls.
- Next guarded deployment uses exact repository HEAD. No order records or Production data were modified by these UI changes.
