# Beger Demo Café — end-to-end pilot control handoff

Date: 2026-11-06 · Branch: `feat/g1-foundation` · Staging only

## Demo identity and tenant boundaries
The existing demo tenant is `Beger Demo Café — تجريبي` (`b0000000-2026-4000-8000-000000000001`), branch `Demo Branch · فرع العرض` (`b0000000-2026-4000-8000-000000000002`). Do not confuse it with **Qdim** or **Ultraspeed**; existing cashier/Pager employee assignments belong to Ultraspeed, not the demo tenant. The demo shop owner already has merchant-owner membership and platform-owner access; no privilege escalation or account creation is necessary for owner-only operation.

As observed in read-only Staging SQL: 3 categories, 4 active products, **4 published branch products**, 2 active dining tables, 4 modifier groups, 9 modifier options, 12 existing test orders, 1 Pager ticket. Dine-in and takeaway are enabled in the existing branch order settings. No demo employee station assignment to cashier/kitchen/pager was found, so actual **employee-role** testing needs independently invited staff; the merchant owner can open workstations via existing membership checks and is not a substitute for employee tests.

## New unified owner-only control
- `/demo-control` is a new **authenticated owner-only** entry page for this fixed demo tenant. The server validates actual membership role and branch existence via RLS-aware Supabase calls; invalid/nonowner identities get no demo operation links. Platform admin shortcut additionally requires independently verified platform privileges.
- The page provides shortcuts into **real existing modules**, not duplicated mock implementations: public branch menu, takeaway, table QR, order board, cashier station, kitchen station, independent Pager, financial reports, product catalogue/modifiers, appearance/translation, reviews, loyalty, employee invitations, business model, subscriptions and (for admins) platform HQ.
- Merchant dashboard sidebar exposes the hub only for the verified demo owner. Public landing copy was corrected to describe test ordering and stations accurately rather than claiming all orders are disabled.
- `tests/beger-demo-control-hub.test.mjs` protects tenant constants, owner boundary, workstation/merchant routes and absence of admin bypass.

## Pilot walkthrough
1. Sign in as the already-authorized **demo shop owner**. Open `/demo-control`. Use an incognito guest window or separate phone for the public branch menu.
2. Use the QR/tables section to scan a real table QR, validate the table number and submit an order. Alternatively open public takeaway from the control hub. **Orders change actual Staging test data**; there are no production transactions here.
3. Open the cashier in another browser tab under the owner account, accept the test order and inspect total/collection state. Open kitchen, prepare and mark ready. Back in cashier, mark fulfilled.
4. Independently open Pager, issue a ticket, scan customer card and advance waiting → preparing → ready → fulfilled. Test sound/vibration and app-switch alerts on a real phone.
5. Inspect reporting, discounts/modifier prices, product and table QR, ratings/loyalty and printing. Use only demo tenant; do not edit Qdim or Ultraspeed data.
6. For **employee-role acceptance**, use separately confirmed employee accounts and owner-generated G11 invitations scoped to the demo branch. Do not share owner's credentials.

## Not certified
This control hub does not automatically add employees, seed orders, create paid plans, bypass RBAC, install printers or send emails/SMS. No real multi-device session/permission/notification or physical printer acceptance is claimed from passing static source tests. Commercial readiness remains NO-GO until the broader release gate is signed, including real-device orders, security, backups, terms and merchant subscription billing.

## Staging deployment validation
The next commit requests guarded `[beger-deploy]` full test/Next build from the exact branch HEAD. Record final deployment SHA, test counts, READY state and stable alias mapping. Never change Production automatically.
