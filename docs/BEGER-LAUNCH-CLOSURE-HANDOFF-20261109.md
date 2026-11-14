# Beger / Qmenu — Launch Closure Handoff (2026-11-09)

## Scope and evidence
- Repository: `ultrablueai/Qmenu`; development branch `feat/g1-foundation`; **production branch `main` remains untouched**.
- Owner reports they personally tested the complete operational customer/order journey with **physical devices**, and it works. Record this as **owner-reported functional/device acceptance**. Device models, test logs, printer bridge/fiscal compliance evidence and exact deployment SHA were not supplied; do not infer independent certification.
- Vercel project `qmenu-staging` newest inspected deployment `dpl_FCprekXoYutZ9UUFpJtmAkT6WHw3`, SHA `973300d406dcad5b6c95aa95101f331fd089753e`, status **READY** (2026-11-08). A READY deployment is not a commercial release approval.
- Current G24 design intentionally auto-routes accepted orders to kitchen queue, records durable notifications and queues print jobs. Kitchen explicitly starts preparing; cashier explicitly confirms handoff. Independent Pager is not an extra step for food orders.

## Functional closeout policy
**Do not reopen owner-passed QR / menu / cart / merchant acceptance / kitchen / cashier / print / Pager device workflows without a concrete regression, new code change affecting them, or conflicting reproducible evidence.**
Preserve clear distinction between owner-reported acceptance and documented audited evidence.

## Shortest safe commercial closure path
1. **Release integrity:** verify exact development SHA against Staging deployment, CI test pass/build and fixed alias. Run a fresh gate when the source changes. No automated merge to `main`.
2. **Access and security:** examine current anonymous SECURITY DEFINER functions by purpose (public QR flows are intentional); verify independent signed-in account cross-tenant and branch isolation, invitation/revocation and least-privilege operator accounts. Document results without storing secrets.
3. **Resilience:** verify encrypted backup and actual restore drill in an isolated environment, incident/error monitoring and rollback procedure. Production data must not be overwritten for a drill.
4. **Commercial subscription MVP:** obtain owner approval of plan tiers, free trial, currency/region, price, tax treatment, renew/cancel policies and invoice workflow. Implement only merchant-to-Beger billing; no consumer order settlement or merchant payout custody. Existing G12/G13 administrative review is not paid activation.
5. **Legal and rollout:** qualified local review of privacy terms, data retention, subscription invoices/tax and merchant receipts; execute a limited pilot release checklist and obtain explicit owner commercial GO before production migration, payment activation or domain switch.

## Known open distinctions
- Owner's device testing does **not** in itself prove independent JWT-authenticated tenant adversarial security, restore drill, production telemetry, lawful fiscal invoices or paid subscription settlement.
- Historical board and gate documents contain dated snapshots; use most recent evidence, not old blockers that were already resolved.
- 2026-11-05 commercial release gate shows `plans=0` and `subscriptions=0` **on that date only**. Recheck live Staging before treating these counts as current.
- Existing historical notes warn of guest order frequency limits; validate with safe non-production load testing rather than deleting limits.

## Change-control decisions
- No new feature scope and no duplicate Pager engine.
- No changes to Production, production schema, tenant data, subscriptions, live payment settings, `main` or live aliases without explicit approval.
- Next implementation slice: **audit + release evidence**, then smallest evidenced fixes only.
- Commercial status: **NO-GO pending gates above**, despite owner-confirmed functional success.
