# Beger — G2 navigation and G3 Table Orders Pilot (2026-11-02)

## Environment
GitHub ultrablueai/Qmenu, feat/g1-foundation. Tested Vercel deployment dpl_6iMghuqnUzRW6pTdwdxbvMfFyZqD, commit 97ca08e20444922d67a9980a4ce1d9a1bd5f5955: READY.
Staging Supabase project qandxrcuetwzenlqspez; migration 20261102195000_g3_pilot_table_orders.sql applied ONLY on staging. No production change.
Ordering default is OFF; only demo branch b0000000-2026-4000-8000-000000000002 was enabled for controlled QA. All other branches remain OFF.

## Implemented
- Category buttons filter products in place instead of scrolling to sections. Default opens first nonempty category; All is opt-in.
- Product quantity selection, validated groups and additions, cart scoped by branch/table and persisted across language changes.
- Merchant HQ overview has AR/TR/EN and RTL/LTR language controls. Deeper management forms still need localization.
- Valid table QR resolves actual branch + table. Guest submits product IDs, selections and quantity, not prices.
- Database checks branch publication, live price, valid modifiers, required selections, optional removals, quantity caps, rate limit and idempotency; commits pending order.
- Authenticated owner/manager can list own business branch tickets and update pending→accepted→preparing→ready→fulfilled, or reject from pending/accepted. Status changes audited.
- Guest tracks by random order token with 7-second polling; payments and loyalty remain off.

## Evidence
- Automated tests: 180 passed, zero failed; Next.js type checks and Vercel READY.
- All four order tables have RLS. Anon may not list merchant orders or transition order states.
- Two ANON-role SQL transaction tests generated correct order totals for table 01: two cheesecakes = 29,000 TRY minor units; two cappuccinos with required sugar and chocolate additions = 29,000 TRY minor units. Both transactions ROLLBACK: zero persisted test orders.
- Tested table 01 enabled true; unrelated/invalid token false. Exactly one staging demo branch enabled.

## Acceptance still required: NO COMMERCIAL GO
- Real user phone + owner/manager browser: send, accept, prepare, ready, delivered; track guest updates and verify reject.
- Distinct accounts/tenants/staff permissions and branch-scoped negative tests; iPhone scanning; 320/360/390px screenshot QA.
- Pilot throttling is per-table, not a complete IP/CAPTCHA abuse protection. Evaluate before any public deployment.
- Vercel Preview links expire and require sharing/access: do not print them as permanent public QR signs.
- Merchant state changes are polled; realtime background notifications, item edits after submission, payment, and customer push notification remain later milestones.

## Test script
1. Open table 01 preview with a valid Vercel share URL in Chrome.
2. Open menu. Select Desserts: see only desserts. Choose cheesecake quantity 2 and add to basket.
3. Confirm table 01 shown. Send order to restaurant without payment.
4. In another browser sign into merchant dashboard; in catalog section find Table Orders & Kitchen.
5. Accept order, mark Preparing, Ready, Fulfilled. Verify customer tracker changes.
6. Try a second order and reject it; manager can disable accepting new orders at any time.

Decision: G2 navigation repaired and G3 gated staging pilot implemented; acceptance pending owner browser/device verification.