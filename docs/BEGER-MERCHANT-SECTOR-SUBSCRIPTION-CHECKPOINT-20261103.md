# Beger Implementation Checkpoint — 2026-11-03 Morning
## User's locked operating requirements
- Beger is a multi-vertical SaaS; the **merchant chooses** predesigned business model then only needed features. Supported sector definitions: café, restaurant, bakery, barber, salon, clinic and retail; food-specific entities must not leak into clinic workflows.
- Beger earns merchant subscription revenue (by capabilities, branches and period), not merchant order commissions. Merchant/customer financial settlement, PSP disbursement, delivery/courier operations are not in current build scope.
- Initial café/table order is validation slice, not the commercial limits of the product.

## Work completed in GitHub branch feat/g1-foundation
- A merchant-facing model + capability picker connected to initial onboarding and headquarters dashboard.
- Staging table `beger_merchant_model_preferences`: business-scoped owner-only write, owner/manager read; RLS enabled and verified, three policies. Preferences are not entitlements.
- Fixed delayed server fetch overwriting edited local choice in `BegerSectorConfigurator`; onboarding shows recovery warning when saving preference fails after business creation.
- `lib/beger-subscription-pricing.ts`: pure quote math with no default prices. Requires an explicitly published country-specific price book, rejects missing feature price, overflow and planned features, supports branch count, monthly and annual discount calculation; no customer order totals or merchant settlements.
- `tests/beger-subscription-pricing.test.mjs` implements executable 4-group scenarios. **Not run against latest source in full CI**; no claims of successful build.
- Latest staging Vercel READY still an older SHA until a full automated gate builds. The Staging build quota was previously exhausted and must not be spammed.
- Production/main unchanged; no merchant subscription is automatically activated and no live charge is collected.

## Next executable engineering slice
1. Validate complete npm test and TypeScript build locally or in a single quota-approved staging release. Do not bypass failed tests.
2. Implement controlled merchant-facing **read-only** quote preview only when price book is published through authorized Platform Admin and fully reviewed, with secure role gates. Distinct subscription entitlements must remain server-controlled, not copied from `requested_capabilities`.
3. Design paid subscription lifecycle: draft -> awaiting_payment -> active -> grace -> suspended/cancelled, with auditable PSP verification only for Beger merchant invoices, not for merchant customer orders.
4. Test isolated merchant accounts, sector-specific dashboards, no cross-tenant feature enablement, price changes and renewal/expiration.
5. Resume initial café G2/G3 mobile QR/menu/ordering pilot as a separate release gate, then implement generic appointment/queue/pager resources for other sectors.
