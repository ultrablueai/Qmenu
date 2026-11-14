# Beger — G1/G2/G3 execution checkpoint (2026-11-03)

## Authority
Use `docs/BEGER-CANONICAL-PLAN.md` as product scope and phase order, this checkpoint for current evidence, and `docs/BEGER-G3-PILOT-RUNBOOK-20261102.md` for pilot steps. Source status is not deployment status.

## Latest verified / actual gates
- GitHub `ultrablueai/Qmenu`, branch `feat/g1-foundation`. Production and `main` must not be changed.
- Last verified READY Vercel deployment (before newer source fixes): `dpl_J3vfLEsRQPaX1doV5RAUMBJLbpcg` (189 automated tests at the time). Alias `qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app` is **stable**, not exempt from deploy limits. Newer GitHub fixes are **NOT deployed**.
- Nov 2 2026 Vercel Hobby reported 402 `api-deployments-free-per-day` with 86400s retry. Last observed denial at 22:10:53 UTC = Nov 3 01:10:53 Europe/Istanbul. One day later, **Nov 4 01:10:53 Istanbul is only an estimated retry time**, not confirmed availability. Do not poll/create deploys speculatively; batch and gate builds.
- Staging Supabase: `qandxrcuetwzenlqspez`. Demo Café has real distinct shop/table/product QR routes. Table pilot G3 branch enabled and existing staging test orders. Do not touch existing test orders without operator approval.
- Real Android user reported camera worked but table QR opened shop welcome and product QR opened menu instead of product. Source fixes now initialize table QR at menu stage, select scanned product category before showing product details. These repairs are **not yet phone-verified on the latest hosted build**.

## Work completed after last READY, awaiting one bundled release
- Per-order kitchen tickets display unique short order references; two independent orders on one table have separate DB transitions (verified in rolled-back SQL transaction).
- Table QR initial stage is menu, with verified table label; shop QR still opens welcome.
- Product QR validates published product in branch and initializes its category before modal mounts.
- Guest cart cap now 20 quantity per line, matching server RPC; old 99 limit could create rejected orders.
- Shop vs table product copy in AR/TR/EN correctly describes browsing vs server-verified conditional table orders. Older preview-only test text updated.
- 2026-11-03 regression expectations updated; latest full npm test / Next.js build **not independently run** since daily Vercel quota denial.

## Next exact release gates (in order)
1. Run **all** local tests, TypeScript build and check no legacy expectations remain; fix source defects without deploying.
2. Publish **one** Vercel Staging Preview build to the existing `feat/g1-foundation` alias once quota allows. Confirm READY and exact commit SHA before sending user test links.
3. Real phone acceptance: shop QR -> welcome; table QR -> menu with table label; product QR -> exact product detail popup (including product in second category); language AR/TR/EN does not lose view, session, table context, or cart.
4. Cross-device order acceptance: table 01 sends order -> named ticket in branch inbox -> owner/manager accepts only that order -> kitchen preparing -> ready -> fulfilled; another order from same table stays pending. Test rejection and invalid/disabled table. User must visually verify.
5. G1/G2 no commercial GO until distinct-account owner/manager/staff/other-tenant browser tests and visual layout comparison against user-approved reference screens, all with evidence and rollback.

## Deferred intentionally
Payments, loyalty/customer QR identity, realtime notifications and sector expansion remain outside this G2/G3 pilot. Do not claim commercial launch.
