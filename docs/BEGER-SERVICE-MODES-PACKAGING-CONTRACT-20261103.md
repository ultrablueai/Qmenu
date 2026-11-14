# Beger — Service Modes and Packaging Contract (2026-11-03)
Status: Approved as **development direction from owner conversation**; technical implementation staged. No Production changes.

## Goal
Use ONE canonical product/catalog record, with distinct Dine-in, Pickup/Takeaway, and Delivery service modes. Never confuse table QR with pickup or assign a table number to pickup. Staff must recognize orders by a unique order ID and service-mode label, independently of all other orders.

## Route / service entry
- Table QR (/t/{token}): `dine_in` fixed by verified table lookup; shows table label; customer submits through existing table RPC; each request separately accepted, prepared and served.
- Shop QR (/b/{branchId}): starts with welcome / browsing; visitor may select `takeaway` (pickup); never require a table token or invent one. A distinct pickup reference and merchant collection area replace table number.
- Delivery: explicitly disabled until address, zone, cost, courier permissions, proof of fulfillment and cancellation rules are reviewed. Do not expose an enabled checkout.
- Customer account remains optional. No premature loyalty/customer QR enrollment.

## UX by mode
**Dine-in** -> show table ID -> select category/product/options -> basket -> send -> pending -> merchant acceptance -> kitchen preparation -> served/fulfilled. Default serving ware can be reusable plate/cup, no pickup collection identifier.
**Pickup** -> choose pickup -> products and packaging previews -> basket -> packaging and price breakdown -> optional name or pickup code (privacy reviewed) -> submit -> pending -> merchant accepts -> preparation -> ready for collection -> collected. Real submit is blocked until a new server-validated pickup RPC and branch enablement exist. No client-only order submission.
**Delivery** -> zone/address -> validated shipping fees and packaged stock -> merchant/courier workflow -> verified handoff -> delivered; future module only.

## Packaging is a fulfillment rule, NOT a duplicated product
Data shape proposed for a reviewed migration, not yet applied:
- `catalog_packaging_items`: business_id, id, sku, localized name (AR/TR/EN), cost_minor, charge_minor, quantity_unit, active, inventory tracking (optional later).
- `catalog_product_packaging_rules`: business_id, product_id, service_mode, packaging_item_id, required_units_per_product, is_optional, merchant-charge-policy ('included'|'free'|'charged'), active.
- `branch_service_settings`: business_id, branch_id, dine_in_enabled, pickup_enabled, delivery_enabled, pickup_eta_minutes, branch-specific rules and opening hours.
- `order_fulfillment_details`: order_id, service_mode, verified table_id (dine-in only), pickup_code (pickup only), delivery payload (future), fulfillment status, packaging snapshots with tax/price, and versioned validation.
- Product option groups can be mode-filtered separately, but **required choices still validated by server**. Merchant overrides for drinkware (glass / disposable) are allowed only when rules are configured and pricing is transparent.
- Each order stores snapshot of packaging quantities and unit charges at submission; merchant operations must not silently reprice already accepted orders.

## Example (illustrative, not actual prices)
Cappuccino:
- dine_in: ceramic cup + saucer (included);
- pickup: paper cup + lid + sleeve (each if applicable; merchant sets included/extra fees).
Cheesecake:
- dine_in: plated slice;
- pickup: food-safe box + utensil if configured.
Multi-item pickup: consolidate outer bag **once per order** if applicable; avoid double charging packaging by per-line and per-order packaging distinction.
Delivery may need insulated bag / tamper seal (later).

## Integrity and release gates
- Trust the server to calculate item, modifier, packaging, tax, discounts and delivery totals in integer minor units.
- Required vs optional packaging with exact per-line or per-order quantities; no price guessed in frontend.
- Branch availability, mode enabled, item packaging stock and allergen/food-safety constraints checked on submit.
- Mode-specific state machine and status messages; idempotent requests with a unique order id; per-order approval even from same table.
- Test tenant isolation, manager access, wrong table token, pickup without table, disabled pickup, mode-switch between languages, duplicate requests, item count, packaging consolidation and refunds/voids.
- Test two real phones and owner/merchant sessions before commercial GO.

## Implemented in source now
- Shop welcome presents distinct mode cards; pickup opens a dedicated preview context in the menu.
- Pickup cart is isolated from shop browsing/table QR cart and truthfully does not permit checkout.
- Table QR checkout remains the existing server-authoritative dine-in pilot.
- Delivery is shown as disabled/future.
- Existing sound/haptic preferences and visual animations remain opt-in. No notification permissions requested for this preview.

## Next small gated steps
1. Agree on initial packaging defaults and which costs are included vs charged by each merchant.
2. Implement reviewed Staging migration and mode-specific **server** RPCs, plus merchant packaging UI and price breakdown.
3. Only enable pickup for one demo branch after E2E owner/guest validation; then delivery separately.
4. Publish one bundled Staging build to the existing stable branch alias, not Production, once Vercel quota allows.
