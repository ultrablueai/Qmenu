# BEGER Smart Business OS — Global Benchmark, Best Product Vision & Execution Strategy
**Research and project reality review: 2026-11-03.** Research-led product strategy, not evidence that features are shipped or that market demand is proven.
**Owner-approved invariants:** one multi-tenant platform for multiple sectors; merchant selects prepared business model + needed paid capabilities; Beger earns SaaS subscriptions, never an automatic percentage of merchant orders. Merchant handles its own customer payments and settlements. Delivery/courier logistics deferred. First proof sector: café/restaurant/bakery; next: barbers/salons and retail; clinic only after specialized privacy readiness.
**Sources of truth:** docs/BEGER-CANONICAL-PLAN.md, docs/BEGER-EXECUTION-BOARD.md, docs/BEGER-PLAN-REALITY-AUDIT-20261102.md, 2026-11-03 merchant-sector / pricing checkpoint docs, current repo and staging facts. This report does NOT modify the canonical plan or grant production GO.

## 1. Executive conclusion
Best attainable Beger = **a configurable operations engine, not a mega-app or generic QR-only menu.** Shared account/tenant/branch, service catalog, role-based staff access, resources/calendars, queue tickets, realtime status/pager, notifications, subscriptions, analytics, opt-in merchant-scoped loyalty. Adaptable business templates define terminology, workflows, resources, forms and modules. Guests use a fast mobile link/QR; no mandatory app and no mandatory customer account for table and walk-in. No separate codebase per industry.

Priority is to solve a repeatable operational pain (lost orders, wrong-table routing, confusing pickup numbers, chaotic walk-in queues, missed appointments, no-show control and staff communication), not match all features of large competitors.

## 2. Source-verified global and local benchmark (official vendor claims, as of 2026-11-03)
| Product | Relevant verified behavior | Commercial model / pricing signal | Beger implication |
|---|---|---|---|
| Toast (US) | QR tied to exact table; kitchen routing; direct online pickup/order; optional restaurant notifications; distinct service modes | Online restaurant orders described as commission-free | Make table QR context and kitchen acceptance first-class, separate from fulfillment and customer payment |
| Qminder | Multisector check-in, queue lines, browser/tablet/TV, remote registration, multilingual SMS, staff analytics | Enterprise-oriented recurring licensing, not cheap QR | Queue/pager as reusable platform component, optional displays, accessible manual fallback |
| Fresha | Salon bookings, staff calendars, waitlists, CRM; payment processing optional | Independent USD 19.95/mo or USD 14.95 per bookable team member in Team; marketplace-discovered new-client commission is a DIFFERENT business model | Appointments/resources are as fundamental as food orders; we should not add a customer-discovery marketplace fee |
| SimplyBook.me | Booking link, providers, custom features, higher tiers for queue and multi-locations | 2026 Basic USD 13.9/mo monthly (100 bookings, 3 custom features); Standard USD 29.9 (500, 8) | Feature bundle + resource/branch limits and optional add-ons |
| Turkish hadimenü | QR/table order/KDS in tiers | 399–1490 TRY/mo advertised | QR/table menus have direct local competition; pure QR insufficient differentiation |
| Turkish GetQR | QR/table and pickup/KDS, independent merchant PSP | 450–1200 TRY/mo advertised | Pickup is not a unique invention; win on cross-sector simplicity and pager quality |
| Turkish GetRandevu | Barber/salon booking, staff capacity and branches | 599/999 TRY/mo advertised | Compete with a real integrated queue + booking workflow, not a generic appointment form |
| Syrian restaurant.sy | QR menu, variants, add-ons, paid upgrades, optional software licenses | Pro ~USD 10/mo displayed, plus cash/POS modules; prices vary by offer | Syria is NOT an empty QR market; build for intermittent connectivity, multilingual support and realistic collection |
| Syrian Kawafiry | Salon booking/walk-in queue + Arabic interface | Syria-focused app, Aug 2026 Play Store listing | Multi-sector position must translate into value; cannot claim absence of salon/queue competition |

Primary URLs:
- Toast table QR: https://support.toasttab.com/en/article/Setting-Up-Toast-Mobile-Order-and-Pay
- Toast direct pickup: https://support.toasttab.com/en/article/Getting-Started-Online-Ordering
- Toast notifications: https://guesthelp.toasttab.com/en/articles/11583469-how-do-order-notifications-work
- Qminder: https://www.qminder.com/pricing/
- Fresha: https://www.fresha.com/pricing
- SimplyBook.me: https://simplybook.me/en/pricing
- hadimenü: https://hadimenu.com.tr/paketler.html
- GetQR: https://getqr.tr/
- GetRandevu: https://getrandevu.tr/
- Syria restaurant: https://restaurant.sy/en/pricing/
- Syria salon: https://play.google.com/store/apps/details?id=com.kawafiry.app

Note: supplier-provided website claims/prices are observations, not independent verification of their service quality, customer count, reliability or available functionality in Syria/Türkiye. None demonstrate Beger adoption or willingness-to-pay.

## 3. Product architecture: generic engine + sector blueprints
**Platform layer:** platform-owner governance, country/currency/locale, subscription catalog and verified SaaS entitlements, merchant onboarding, feature flags, tenant audit, abuse/security, observability.
**Tenant layer:** merchant, branches, headquarters catalog, personnel and branch assignments, permissions, brand themes, hours and holidays, resources/availability, optional loyalty and analytics.
**Service engine:** typed `service_request` and `service_visit` references, customer/guest token, request_type, branch, public status token, validated options, scheduled time, allocated resource, lifecycle state, audit events. A `queue_ticket` is not the same as an order or appointment; it can reference either. Stable IDs plus separate non-secret short display labels. State transitions are server-authoritative/idempotent.
**Presentation:** first-party sector template controls labels, forms and visible capabilities. No restaurant-specific kitchen table columns in a clinic queue; no medical complaints in public ticket or common CRM.
**Integrations:** message channel adapters (in-page, email, permitted SMS, optional Web Push), printer/TV/display adapters, optional calendar connectors. Merchant financial processing is outside Beger; an authorized cashier note 'reported paid' is not a verified bank event.
**Multi-tenancy:** strict tenant and branch RLS, secondary server verification, independently protected clinic purpose/data model, no secret service tokens in guest UI.

Sector blueprint output:
- Café/restaurant: shop/menu QR; unique table QR; product modifiers/cart; independent submitted tickets; kitchen acceptance/preparing/ready; counter pager; scheduled pickup with controlled capacity.
- Bakery/pastry: quantities and production cutoff times; scheduled pickup, packaging options, ready status; counter queue; no forced table.
- Barber/salon: services/durations, stylist/resource, staff breaks, appointments, walk-in check-in, queue reorder with audit and consented reminder, 'your turn' pager.
- Retail: catalog/reserve/prepared pickup/service queue, staff assignment, status.
- Clinic: appointment/check-in/anonymous queue calls ONLY in early scope; protected receptionist roles, minimum data and retention. NEVER copy the generic public CRM into patient records.

## 4. The essential customer journeys
1. QR browse only: scan -> published catalog/service list -> staff interaction, no fake order action.
2. Dine-in: table-specific QR -> products/options -> validation -> unique order ID -> staff acceptance -> kitchen -> ready -> serve. Multiple customers at one table remain separate tickets unless merchant explicitly enables an audited shared tab. QR is locator, not payment credential or proof of being physically present.
3. Counter + digital pager: cashier takes order -> assigns collision-safe unique order status link / printed QR or optional physical buzzer -> staff preparation -> ready -> order-specific customer status; short display number alone is not claim proof. Paper/TV/physical buzzer fallback remains.
4. Remote scheduled pickup: shop link -> branch -> real availability slot -> product + packaging options -> server price -> submit -> accept -> fire preparation at proper time -> ready -> collect. Define no-show/late/cancel policies and staff-controlled exceptions. Contact may be optional for simple pickup but ensure a safe tracking/claim channel.
5. Barber walk-in: choose service / preferred barber or first available -> estimate queue -> staff confirms arrival -> unique ticket -> called -> served / missed / rescheduled. Booking is reserved resource time; queue ticket is an arrival event, not an appointment.
6. Barber appointment: service/duration -> resource skill availability -> select slot -> guest contact/confirmation -> reminder -> check-in -> service -> done. Prevent overbooking across staff breaks and service resource limits.
7. Clinic check-in: privacy-preserving QR or staff booking -> anonymous queue ticket -> called to private destination; no identifiable medical data or diagnosis on public screen.

## 5. Digital pager reliability contract
**Status must work before sound:** accessible in-page state + per-ticket status URL; guest may choose opt-in sound/haptic after interaction. Browser vibration/audio can be blocked and are never sole notification channel.
For locked/closed phones: genuine Web Push needs service worker, browser/device permission and in iOS a supported added-to-home-screen web app; NOT guaranteed merely by scanning QR. Provide fallback SMS/receipt/TV/physical pager according to merchant capability and cost. Test Android Chrome, iOS Safari, reconnect, low bandwidth, status-delay and duplicate events.
Apple primary source: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
Queue SLA: recover server state after reconnect; fail visibly rather than claim success; never miss readiness during a suspended tab; exact delivery receipts and no-show are not proven without acknowledgments.

## 6. Commercial design: sell capabilities, not complexity
Merchant chooses sector starter template and checks optional capabilities. Suggested billable dimensions:
- Workspace base (identity, locations, minimal QR service link, basic administration).
- Operational module bundles: ordering/KDS; bookings/resources; queue/pager; scheduled pickup; loyalty/advanced analytics when ready.
- Extra branches; extra bookable resources/staff only when necessary; high-cost SMS/WhatsApp usage beyond fair-use may be metered openly, NEVER per customer purchase commission.
Prefer **3 understandable bundles** in marketing with optional add-ons in control panel, rather than 10 checkboxes and a confusing running total. Prices local to country, tested with interviews, fully versioned, and published by platform owner. No synthetic active prices or unauthorized feature enablement.
**Two ledgers must never merge**: Beger's SaaS invoices/merchant subscription status versus merchant's own customer payment metadata. Payment of customer orders stays direct with merchant; initial status can be 'pay at counter' + staff-reported paid, never processed by Beger. Beger subscription must rely on a locally lawful PSP/invoice/settlement channel for Beger's own receipts, with verified state, audit, expiry, grace and renewal controls.
Financial metric definitions: MRR = sum recognized active recurring merchant subscription revenue (VAT excluded), not raw transaction total. Track activation rate, paying merchants, paid merchant retention, churn, revenue per active business, support cost per merchant, delivery cost per SMS, refund and unpaid subscription rate. Gross subscription revenue is never automatically net profit.

## 7. Example unit economics — assumptions, not sourced tariffs
If 100 active paying merchants average TRY 699/mo before VAT: gross recurring subscription bookings TRY 69,900/mo; 200 -> TRY 139,800/mo. Assuming 20% variable operating costs -> TRY 55,920/mo at 100, BEFORE fixed dev, acquisition, wages, legal, billing fees and tax. This is sensitivity math, not a profit forecast or approved pricing. CAC, churn, support, SMS and price fit dominate actual viability. No defensible Beger market share / current adoption metric exists yet.
For Syria do NOT just exchange TRY and list USD: test bank/invoice settlement, local buying power, outages, collection reliability and legal invoicing first.

## 8. Design and experience standard
- Three prebuilt premium light themes; sector-appropriate typography, service labels and layouts, not a single dark restaurant page recolored.
- Guest mobile first, 320px+ width, AR RTL/TR/EN LTR, readable horizontal text and stable product cards, keyboard/200% zoom, reduced-motion, contrast.
- Merchant onboarding <= five meaningful steps: business type -> branch -> default template -> capability shortlist -> QR/booking URL/demo. Can skip unavailable paid features; show honest status.
- Merchant home: one primary action ("start serving today"), one clear active workflow, daily workboard, no irrelevant kitchen widget for a barber, no clinical patient data in platform overview.
- Admin: tenant status, feature price drafts vs approved rates, trials/renewals, audit and incident alerts, support-only scoped access; no impersonation.
- Guided interactive tutorial, import catalog/appointments, print-friendly QR, branch preview, safe draft/publish, empty-state examples labeled as demos.

## 9. Technical and operational quality bar
- Baseline: Next.js + TypeScript + Supabase Postgres/RLS + Vercel Staging, no unnecessary new microservices. Isolate generic domain and sector modules; tenant-aware service commands and resource calendars; event history/outbox for realtime/email/Web Push adapters; idempotency keys, retry/backoff.
- Dependency contracts: requested capabilities != effective entitlements. Server-access checks derive from verified subscription and sector compatibility. Trial and grace rules explicit; do not hard-disable guest-facing status/history unpredictably when merchant subscription expires.
- Appointment concurrency locks, branch-local timezone, DST, staff break closures, kitchen preparation capacity and cancellation policies.
- Audit every merchant-admin plan, role, price, queue override and status transition. RLS negative two-tenant/two-branch tests, role escalation, expired QR/tickets, duplicate requests, different booking providers, forged price, and financial spoofing.
- Backups/restore drills, health monitoring, API error metrics, end-to-end trace IDs, operational support runbooks, staged rollout + reversible migration and rollback. Never claim "GO" based only on green unit tests.
- Clinic health data are special category under Turkish KVKK and need separate lawful basis/security/retention review, not a generic SaaS reuse. https://www.kvkk.gov.tr/Icerik/8184/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber
- Turkey physical menus still available on demand; QR does not replace legal physical information; cannot add mandatory service/cover/table fees. https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/fiyat-etiketleri-hakkinda-bilgilendirme
- Syrian e-payment regulatory framework announced 2026; this is NOT evidence of a suitable working Beger billing provider or global payout. https://sana.sy/en/economic/2337251/

## 10. Gap against actual current Beger repository (read on 2026-11-03)
**Present in development source:** merchant/branch administration and QR/catalog/table pilot; AR/TR/EN customer menu and chosen visual styles; owner-only models/feature draft picker for 7 sectors; preference storage in Supabase Staging; draft feature-price editor with owner-only audited RPC; calculator for subscription hypothetical price; initial G3 order/KDS and in-page feedback work.
**Not verified at latest commit:** full Node/Next.js build on newest code, externally accessible public Preview and device/role E2E. Existing preview alias points to older READY deployment, not latest branch.
**Not built as commercial service:** verified paid subscription authorization and billing; published rate books; booking resource scheduler; generic queue ticket state engine; true cross-browser background push; fully tested cashier pager; shop pickup order submission with capacity and packaging server checks; clinic privacy workflows; multi-vertical dashboards actually enabled.
**Do not confuse:** a declared sector/pilot feature with a working authorized service. Status in user UI must distinguish planned, demo-only, staging pilot and commercially active.

## 11. Phased plan with gates — owner does not have to fund all sectors now
**Gate A: close foundation + current restaurant pilot.** Full build/tests and real browser, branch isolation, QR/table/order/acceptance/ready/receipt on two phones. Visual sign-off against user-provided references. Commercial status NO-GO until demonstrated.
**Gate B: generic pager/queue engine.** Define ticket/events, secure guest tracking, cashier counter issuance, staff screens, optional sound/haptics and reliable fallback. Pilot counter + bakery and restaurant. Metric: no duplicate/lost/misrouted tickets, measured readiness latency and queue accuracy.
**Gate C: pre-order pickup.** Branch capacity/time slots and server-priced packaging; customer tracking and no-show. Measure selected-vs-ready accuracy and cancellation.
**Gate D: barber/salon booking.** Service duration/resource availability, booking, walk-in queue and one shared pager event bus. Test overbooking, branch shifts, staff reassignment, recurrence, missed appointment and access isolation.
**Gate E: commercial subscriptions.** Owner-reviewed regional price book; signed pricing snapshot, merchant consent/invoice, lawful verified Beger billing only, immutable entitlement audit, renewal and grace. May be developed in parallel but MUST pass before selling.
**Gate F: retail and optional loyalty**, then **clinic waiting-room pilot** with strict privacy and legal review; do not implement health records or diagnosis casually.
**Explicitly deferred:** courier marketplace, delivery routing, holding third-party merchant funds, complex ERP/e-invoicing, AI agents replacing staff decisions, multiple native customer apps, speculative hardware production.

## 12. Validation before claiming demand or commercial GO
- Interview 20-30 small merchants split across sector and geography, with 5+ paid pilots and credible re-signup intent (targets for experiment, not observed results).
- Pilot at least two distinct businesses/branch permissions, two phones and multiple staff roles; test staff-created queue and guest QR.
- Operational measures: time to publish first menu/services, % completing onboarding, service ticket loss/duplicate rate, booking no-show, customer pickup/appointment readiness, merchant weekly active operation, 30/60/90-day merchant churn, SMS cost, support contact per active business.
- Stop/modify criteria: if staff consistently bypass dashboard or phone alert fails, pause selling pager promise; if pilot businesses won't pay after four weeks, reconsider packaging/positioning/pricing.
- Verify qualitative merchant pain instead of inferring adoption from competitors' list prices.
