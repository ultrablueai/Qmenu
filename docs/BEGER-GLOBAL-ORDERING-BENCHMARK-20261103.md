> **SCOPE OVERRIDE — Owner decision 2026-11-03:** Delivery, routing, maps, customer address books, courier accounts and delivery pricing are **DEFERRED, NOT ACTIVE ROADMAP**. This file is historical exploratory research only. Current product focus is merchant QR menu, dine-in table ordering and scheduled shop pickup (gel-al / تعال استلم), payments, and Beger merchant subscription monetization. The experimental pure calculations in lib/beger-fulfillment-planning.ts do not authorize UI, migrations, integrations or delivery work. Phone OTP can be scoped to scheduled pickup only when necessary. No new delivery work until explicit owner decision.

# Beger — Global Ordering Benchmark, Architecture Decision & Delivery/Pickup Roadmap
Date: 2026-11-03 | Project: ultrablueai/Qmenu | Staging branch: feat/g1-foundation
Status: Research-backed IMPLEMENTATION PLAN. Does not authorize production payments, activating external delivery services, or migrations before G1/G2 and G3 pilot release gates.

## Official-source comparison (verified Nov 2026)
- Toast: https://support.toasttab.com/en/article/Creating-an-Online-Ordering-Account — allows guest checkout, and passwordless optional account with phone OTP; https://support.toasttab.com/en/article/Managing-Your-Takeout-and-Delivery-Schedule — future scheduling, per-location days; https://support.toasttab.com/en/article/Getting-Started-Online-Ordering — merchant acceptance mode and separate pickup/delivery availability.
- Square: https://squareup.com/help/us/en/article/8608-set-up-pickup-options-for-your-online-ordering-profile — pickup prep time, advance lead time, availability and location hours; https://js.squareup.com/help/us/en/article/8285-sell-items-as-preorders-with-square-online — product-specific preorder vs scheduled pickup distinction.
- Uber Eats: https://help.uber.com/en/merchants-and-restaurants/article/what-is-the-delivery-fee?nodeId=275f38aa-2092-4f02-a21a-4ec39a7c57ab — distance plus demand/weather influences delivery fee; not a deterministic per-km price for every merchant.
- DoorDash Drive: https://merchants.doordash.com/en-us/products/drive-on-demand — merchant's own website can contract external delivery. This is NOT automatic access in Türkiye or Syria. https://developer.doordash.com/en-US/docs/drive/how_to/build_for_restaurants/ says API access is limited.
- Mapbox: https://docs.mapbox.com/api/navigation/directions/ — provider returns road-distance meters and travel-time seconds, including traffic-dependent profiles, by market coverage. https://docs.mapbox.com/api/navigation/matrix/ — scalable multiple stops/duration checks.
- Google Places: https://developers.google.com/maps/documentation/places/web-service/place-session-tokens — sessions for address autocomplete and selection to manage billing.
- Supabase Auth: https://supabase.com/docs/guides/auth/phone-login — phone OTP login, SMS provider and anti-abuse setup; do not enable SMS without tested provider, rate limits and CAPTCHA.
- Türkiye: https://www.kvkk.gov.tr/Icerik/6607/Conditions-for-Processing-Personal-Data- — personal data handling needs an appropriate lawful basis; transactional address/contact collection must be separated from optional marketing consent.

## Decision for Beger (user requirements)
**Account concept: one lightweight Beger customer account via phone OTP, used for both remote pickup and delivery**. No forced full password / profile form. Guest at a physical QR table remains anonymous (no account). Upon remote ordering, verify phone at checkout or earlier if returning customer; authenticated account can save default pickup point, preferred branch and optional delivery addresses. Never mix customer authorization or addresses with merchant memberships or loyalty identities. Merchant never creates customer accounts.
- Scope B2C: one identity can order from many merchants; merchant may see only its own orders and minimal fulfillment contact details, never the user's unrelated purchases, saved cross-merchant addresses, or marketing preferences.
- Phone verification at order time; client should not be able to assert is_verified. Country-specific SMS deliverability/cost, consent notices, rate limits and CAPTCHA must be tested on Staging before activation.
- Keep a single order aggregate with `service_mode` (dine_in, pickup, delivery) and three typed fulfillment payloads; table token MUST NOT be required for pickup/delivery. Do not fork the catalog.

## Three checkout journeys
1. Dine-in: verified QR table token -> correct table menu -> options -> basket -> server-priced submit -> separate ticket for each request -> approve -> preparing -> ready/served. No account.
2. Pickup/Takeaway **before arriving**: shop QR/domain -> choose pickup -> select branch -> ASAP or scheduled slot -> items/options -> packaging charge + ETA preview -> phone OTP account -> quote/confirm -> pending -> merchant approves -> hold/schedule fire-to-kitchen -> preparing -> ready -> pickup verification code -> collected/fulfilled. No address, no map required for pickup; show merchant location and optional directions. Schedule availability based on branch opening hours, actual prep duration, kitchen load and max advance lead time. A chosen clock time is not guaranteed until merchant/server confirms.
3. Delivery: shop/menu -> choose delivery -> phone OTP account -> saved/new address (manual address entry always possible; pin optional) -> geocode/route validation -> service-zone check -> choose merchant delivery / platform courier / external integration IF allowed -> server delivery quote & ETA -> products/options/packaging -> checkout/payment options -> merchant acceptance -> preparation -> dispatch -> courier assignment + status -> pickup handoff -> delivery completion/proof -> post-delivery support. No fake live tracking while not backed by actual provider events.

## Route, address and fee architecture
- Address structure: recipient_name, E.164 verified phone, country/city/district, neighborhood, street/building/apartment/floor, delivery_notes, lat/lng, source ('manual'|'provider'), provider_place_id, last_verified_at. GPS permission optional. Never use delivery map pin as sole address.
- Per-user addresses stored under auth.uid() with strict RLS; order snapshots store the address at order time and immutable currency/fee/packaging/merchant settlement values.
- Routing provider boundary `RoutingProvider.getRoadRoute(origin,destination)` returns verifiable route ID, distanceMeters, durationSeconds, quotedAt; route price calculated on server only; do NOT trust client-provided distance or route evidence. Compare Google vs Mapbox cost, EEA terms, coverage in Türkiye and Syria before selecting; have a fallback quote-unavailable state.
- Delivery coverage is based on merchant service polygon/zone and maximum road distance, NOT only a fixed circular radius. Price policy: base + ceil(distance_meters * per_km_minor / 1000), optional floor/cap, minimum basket, free delivery threshold and service zone surcharge. Only a verified server snapshot is authoritative. Fees and customer charge are separate from driver compensation and Beger subscription/platform revenue.
- Merchant's own courier: branch dispatch + authorized driver account; third-party logistics: contract/coverage/quote before exposing. No assumption that a US service is available to Turkish/Syrian customers. Platform fleet is a separate future operations module.
- Price transparency: merchandise + options + packaging + delivery fee + taxes/discounts (as applicable) = final pre-confirm total. Recalculate on server, use a brief signed quote expiry, log a price change requiring reconfirmation.
- Avoid collecting GPS/location until needed. Address for a particular order is operational data, not a marketing opt-in. Retention, access logs and deletion subject to local legal review.

## Packaging examples (catalog references, no fabricated fees)
- cappuccino: dine-in ceramic cup; pickup disposable cup + lid + optional sleeve; delivery may require a sealing policy.
- cheesecake: dine-in plate; pickup food-safe box + fork; delivery box plus per-order outer bag.
- `per-item` rule applies per quantity; `per-order` container/outer bag applies once per basket, not once per product. Optional vs included vs charged stored per merchant and branch.
- Order confirmation snapshots actual packaging quantities and price. Kitchen ticket displays service mode, required packaging and pickup time; the merchant can configure defaults and overrides, no duplicate product SKUs.

## Shared stage machine + fulfillment branches
- Common: pending -> accepted -> preparing -> ready -> fulfilled/rejected (only valid transitions).
- Dine-in ready => server marks table-service ready, staff serves it.
- Pickup ready => notify verified customer; pickup handoff may use short pickup code and expires based on merchant retention policy.
- Delivery ready => waiting_dispatch -> courier_assigned -> picked_up -> on_route -> delivered or exceptions. Delivery fulfillment status is separate from kitchen order status; explicit control avoids marking delivered when kitchen only says ready.
- When scheduled, use `accepted_scheduled` or a substatus `awaiting_fire_time`, then `preparing`. The owner/manager can override kitchen load with audit trail, never overwrite the user's promised pickup time silently.

## Suggested differentiator: Ready Near Arrival
Optional ETA-based pickup, distinct from an invented real-time GPS claim. A customer may select "arriving in about 15 minutes" (example only) and the server proposes an available slot based on configured prep time and capacity. Kitchen prep begins at the correct fire time; if the guest is delayed they can request rescheduling while the order has not started; once preparing, stop/advance rules must be explained. Location sharing stays opt-in; no continuous tracking required.
- Extend later to "I'm here" button for curbside / pickup counter, which does NOT automatically mark order fulfilled.

## Phased build and safety
A. Close G1/G2 physical QR and permissions E2E; finish existing staging table pilot.
B. Merchant packaging configuration and explicit service-mode settings: default OFF for pickup/delivery. Product/branch overrides, stock, food safety and per-order packaging consolidation.
C. Passwordless phone OTP customer auth; customer profile, saved delivery addresses RLS, admin-controlled SMS rate/captcha; repeat purchase; no mandatory customer identity for table use.
D. Scheduled pickup slots and server-priced pickup order; pilot on one branch then role/device E2E before opening.
E. Delivery road routing, service zones, server fee quotes, operational address snapshots, one delivery model initially (merchant courier); expand provider integrations only after contract/coverage and incident tests.
F. Courier dispatch, authorized driver tracking, disputes, refunds, push and pilot commercialization. All steps require rollback + explicit launch GO.

## Source implementation checkpoint
- `lib/beger-fulfillment-planning.ts`: pure policy and minor-unit route quote/packaging/pickup-slot primitives, **not a live order API**.
- `components/guest-service-choice.tsx`: pickup preview only; cannot submit. Table order pilot remains its own path.
- No new migration, payments, live SMS, geocoding, courier tracking or production changes in this turn.
