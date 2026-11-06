# Beger G17 — kitchen dispatch and transactional print outbox
**2026-11-06 · Staging only** · `ultrablueai/Qmenu` / `feat/g1-foundation`

## State of the built workflow
- A public table or takeaway order starts `pending`. Cashier or merchant owner **accepts once**; PostgreSQL changes it to `accepted`; the existing kitchen queue already includes `accepted` without a second "send to kitchen" operation.
- Removed the redundant "إرسال للمطبخ" from owner order board. The kitchen employee independently starts preparation (`preparing`) and marks the order ready (`ready`); cashier confirms physical handoff (`fulfilled`).
- `g17_order_print_jobs` is a new private transactional outbox. An AFTER INSERT/UPDATE trigger on `g3_orders` creates exactly three jobs only upon acceptance: kitchen ticket, pickup/stub, and internal cashier summary. The unique `(order_id,kind)` constraint and `ON CONFLICT DO NOTHING` guard retries/repeated updates; the jobs and acceptance live in the same database transaction, thus commit or rollback together.
- `g17_branch_print_jobs(branch)` provides up to 120 recent job records with order/item snapshots, to owner/manager of that branch's business only. `g17_print_job_action(id, action)` maintains `queued -> previewed -> confirmed` (or explicit retry to queued). Preview is **not** proof the paper printed; confirmation is human-attested. Raw table grants revoked and RLS enabled; unrelated actors denied. These are **manual browser printing** records, not a spooler connected to a USB/LAN device.
- Merchant order board includes a dedicated print queue UI, separated by document kind. Existing customizable paper formats (80 mm kitchen, 58 mm pickup, A4 summary) are reused. It opens an actual print preview using `lib/beger-print-ticket.ts`, then requires explicit manual confirmation. The internal cashier summary remains **not a tax invoice**.
- Pager standalone `g6_pager_tickets` was not merged into food orders; it remains a separate product. The QR order already has its own status reference. This avoids creating two conflicting numbers.

## Verification performed
- Staging migration `20261106003000_g17_transactional_print_outbox.sql` applied successfully.
- Reversible live DB test: within BEGIN/ROLLBACK, changed one existing Staging order status to accepted, verified **exactly 3** outbox records; repeated the same status change verified **exactly 3**, not 6; rollback discarded all test changes.
- Verified G17 RPC anonymous EXECUTE disabled and trigger function not user-executable. In unrelated authenticated identity simulation, both branch queue and mutation were rejected with SQLSTATE 42501. No Production changes.
- Static regression tests in `tests/beger-g17-order-print-outbox.test.mjs`.
- Next protected exact-HEAD staging CI will verify full suite, TypeScript/Next build and stable Vercel alias. Do not claim a deployment READY until verified.

## Remaining for certified automatic physical printing
1. Choose/configure hardware-connected local print bridge (USB/Ethernet) per merchant location, paired securely to a specific tenant/branch and printer profile. Keep keys private, support printer offline and paper-out.
2. Server-issued exclusive leases and exponential retry with durable error states; implement idempotent acknowledgments and reprint audit. Acknowledging job dispatch is not a guarantee the physical printer fed paper.
3. Printer routing (kitchen vs cashier vs pickup) and branch opt-in; optional paperless workflows; preserve a configurable manual fallback.
4. Real devices: thermal 58/80 mm, paper test, multiple simultaneous orders, failed/restarted device, RTL/LTR labels and disconnected kitchen.
5. Customer financial receipt and any Turkish fiscal/ÖKC paperwork require merchant-approved fiscal integration. This outbox must never describe the internal summary as a legal/tax receipt.
6. Browser/push sound/vibration across closed tabs and mobile sleep cannot be certified from tests of a foreground hook alone.

**Commercial release remains NO-GO.** This is a meaningful technical foundation and pilot UI, not evidence of silent printer hardware support or full paid merchant subscription readiness.
