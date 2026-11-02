# Beger — Restricted Commercial Scope, Market/Pricing/Payments Checkpoint (2026-11-03)
Status: Owner scope decision confirmed. Planning only; no activation of payments or production changes.

## LOCKED CURRENT PRODUCT
1. Merchant digital menu QR and centralized catalog, Arabic/Turkish/English, theme selection.
2. QR table ordering: independent per-order acceptance, add-ons, KDS/ready/pager, cash/pay-at-counter first.
3. Shop pickup / "تعال استلم": order from anywhere, select verified branch pickup slot, server-controlled packaging prices/fulfillment, SMS verification only if needed to protect remote order. No table token.
4. Merchant subscription/billing and robust, auditable payment reconciliation are HIGH priority.
5. **DEFER** delivery, couriers, maps, routing, geolocation and third-party logistics and any additional verticals until user explicitly reopens scope. `lib/beger-fulfillment-planning.ts` delivery code remains inert research only.

## Evidence / market (retrieved Nov 2026)
- Turkish 2024 NACE 56.10 restaurant & mobile food-service count 199,016, NACE 56.30 drinks 78,942 in public TÜİK-derived dataset; not an addressable-sales count. https://www.verinays.org/dataset/tuik-df-ekonomik-faaliyete-gore-girisim-sayisi-2020-ve-sonrasi
- Market competition validates category, not Beger's market share: Ustamenu 249 TRY/mo starter; hadimenu 399, 649, 999 and 1490 TRY/mo tiers; GetQR 450, 850, 1200 TRY/mo tiers. https://ustamenu.com/ https://hadimenu.com.tr/ https://getqr.tr/
- Syria direct competitor restaurant.sy: Free 0 USD, Pro 10 USD/mo or 100 USD/yr, Business setup 800 USD first year then 200 USD/yr (as published on English pricing page; verify contractual details). https://restaurant.sy/en/pricing/
- Syrian payment framework expanding, not proof that suitable merchant card gateway or cross-border payouts are operational: https://sana.sy/en/economic/2337251/ (19 Aug 2026).
- Turkey CBRT lists separately payment institutions and electronic money institutions, licenses and scopes: https://www.tcmb.gov.tr/wps/wcm/connect/EN/TCMB%2BEN/Main%2BMenu/Core%2BFunctions/Payment%2BServices/Electronic%2BMoney%2BInstitutions
- Turkey Ministry of Trade 2026 menu rules: QR may supplement but cannot replace paper menu on customer request; extra service/cover/table fees prohibited in its guidance. https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/fiyat-etiketleri-hakkinda-bilgilendirme
- Remote orders may invoke distance-selling information obligations and platform responsibilities; obtain local legal review before live online checkout. https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme

## Positioning
Do not compete as a standalone QR menu: low-priced incumbents exist. Sell simplified mobile order operations (correct table context -> real per-order ticket -> accept -> prep -> ready) plus the scheduled pickup workflow, multi-language and merchant-controlled experience. Avoid competitive claims such as "world first" or market adoption percentages without independent evidence.

## Proposed experiment only — not approved list prices
Türkiye: Starter menu 299 TRY/mo, Operations + table orders 699 TRY/mo, Pickup + scheduling 999 TRY/mo, subject to local willingness-to-pay validation and variable cost/tax. Optional 14-day pilot; one-off assisted menu onboarding fee agreed individually. Syria: local annual/prepaid merchant packages, price only after pilot interviews and payment settlement feasibility; avoid importing TRY prices or assuming USD settlement. Monthly subscriptions should be represented as annualized recognized revenue where appropriate, exclude VAT/transaction fees/refunds.

## Payment architecture: distinguish two flows
**A. Customer pays merchant for food:** v1 pay at counter/cash/card terminal, marked 'paid' only by authorized staff with audit. For online prepaid pickup, only after merchant-owned account with authorized licensed PSP integration, 3D Secure/hosted checkout/PCI-appropriate flow, server-verified PSP callback/webhook plus idempotency and refunds. No client-side 'paid' or blind bank transfer proof. The provider fee is NOT Beger revenue.
**B. Merchant pays Beger subscription:** Beger-owned merchant billing, invoices, trial/plan lifecycle, server-verified PSP settlements (Türkiye) or locally lawful invoice/bank/cash collection with audited admin confirmation (Syria after country-specific legal/banking review). Never conflate restaurant food revenue and SaaS subscription revenue.
Avoid automatically collecting third-party restaurant order gross into Beger's own bank account until marketplace/payment facilitator contractual and legal obligations are independently verified.

## Decision economics (hypothetical, not actual)
At 100 paying merchants × 699 TRY/mo = 69,900 TRY **gross monthly recurring revenue before VAT, fees, support, hosting and acquisition**, not profit. At 50 or 200 merchants (same price): 34,950 or 139,800 TRY. Assumed 20% merchant-level variable costs would leave 55,920 TRY before fixed costs at 100 merchants; this is NOT a company net margin estimate. Track actual merchant acquisition, churn, willingness to pay, order utilization, support cost, cash receipts and net revenue retention.

## Pilot evidence / GO thresholds (targets, not facts)
Interview at least 20 merchants across cafes and bakeries, sell paid pilot to at least 5 with 2 completing each of table/pickup E2E. Measure 30-day retention, order processing errors, time saved, and merchant willingness to renew. Commercial GO only after verified auth/RLS real-device E2E, consumer/cashier statuses, payment compliance, VAT/invoicing, refund cancellation policy and owner sign-off.

## Development restrictions
DO NOT activate delivery. DO NOT promise that subscriptions/payments are live in Syria. Do not change Production, main, schema or live payment gateway without separate review and explicit owner authorization.
