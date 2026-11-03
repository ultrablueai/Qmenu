# Beger — Restaurant operations, collection & printing roadmap (G4)

Status: implementation in `feat/g1-foundation`; pilot/staging only. Production requires separate release authorization and legal/integration review.

## Evidence consulted (4 November 2026)

- [Toast KDS overview](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html): separation of kitchen preparation/expediter, auditory/visual ticket changes, paid-vs-unpaid status.
- [Toast payment-status on kitchen tickets](https://support.toasttab.com/en/article/Is-there-a-way-to-show-order-payment-status-on-a-Kitchen-Ticket): kitchen tickets may show payment-required indicator; payment does not necessarily block food preparation; avoid implying print completion means payment.
- [QZ Tray printing](https://qz.io/docs/getting-started): local bridge for HTML/PDF/ESC/POS/USB/network printers; silent printing requires signed messages, not a normal browser capability.
- [Türkiye GİB YN ÖKC guidance](https://ynokc.gib.gov.tr/Home/SSS): restaurant-ordering and third-party software can require ÖKC integration under applicable GMP-3/YN ÖKC rules. This repo's kitchen ticket, pickup label and internal summary **are not** fiscal invoices or ÖKC fiş.

## Architecture

- **Separate order vs collection state**. `g3_orders.status` handles preparation; `payment_status` handles collection; changing order status never automatically settles it.
- **G4 pilot payment collection**: merchant owner/manager records full payment only *after external cash/card/transfer receipt*. The RPC verifies tenant membership, locks the order, records `paid_at`, `paid_by`, and a unique `g3_payment_events` event. No online charge, gateway interaction, or automatic financial reconciliation.
- **Order identity**: UUID internally, 10-hex-character reference in customer UI, merchant UI, ticket, and pickup label; retain the full internal UUID as primary key. Before scaling, evaluate branch/date-scoped sequential numbers and collision handling.
- **Print v1**: manually initiated 80-mm browser print window without third-party transmission. Three views: kitchen preparation ticket, pickup label, and non-fiscal internal account summary. Real thermal USB/network integration is *not yet active*.
- **Print v2**: printer profiles per branch (paper width, IP/USB via local bridge), station routing, retry queue, explicit success/failure acknowledgements, duplicate indicators, role-scoped reprints, and device certification.
- **Legally valid receipts**: a separate provider adapter for applicable national tax rules; never label browser output tax invoice. Requires merchant-country/device review and verified provider integration.

## Minimum realistic test checklist

1. Merchant logs into allowed branch; another tenant cannot fetch its orders or mark them paid.
2. Guest orders from table and takeaway; both show a readable tracking card.
3. Kitchen ticket displays all items, modifiers and omitted ingredients, with correct branch and reference.
4. Pickup label matches exactly the same reference and service mode; verify two orders from the same table aren't confused.
5. A merchant records cash/card-external/transfer-external only after receiving funds; payment remains independent from preparation and is visible on customer card.
6. A second click with the same method returns an idempotent acknowledgment; alternate method is rejected; unauthenticated payment is rejected.
7. Test printing at 58/80-mm and mobile browser popup restrictions. If popup blocked, display a precise error.
8. Kitchen ticket and internal summary visibly state that they are not tax receipts.
9. Handle rejected and fulfilled orders, refunds, partial payments, split bills, cancellations, pricing snapshots, taxes and formal fiscal invoice adapters in later gates.

## Prioritized next releases

- **G4.1 (now)**: manual collection, order number, customer pickup card, kitchen ticket/label/internal summary.
- **G4.2**: proper price/tax line snapshot and detailed settlement/invoice reporting; payment reversal and partial/split payments with immutable ledger.
- **G4.3**: print routing and signed printer bridge with retries, multi-station KDS, printer health dashboard.
- **G4.4**: modular merchant dashboard with order inbox, cash desk, daily close and roles.
- **G4.5**: verified fiscal integrations by country, business CRM/loyalty, analytics and scaled release gates.

No production modification without explicit approval; do not accept real payments via Beger.
