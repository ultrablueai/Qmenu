import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const pickup=read("supabase/migrations/20261103231000_g3_pilot_takeaway_orders.sql");
const guest=read("components/guest-order-submission.tsx");
const cart=read("components/guest-cart.tsx");
const merchant=read("app/dashboard/merchant-order-board.tsx");
const menu=read("components/public-menu.tsx");
const css=read("components/public-menu.css");

test("takeaway is a separate opt-in branch service and never impersonates a table QR",()=>{
 assert.match(pickup,/pickup_enabled boolean not null default false/);
 assert.match(pickup,/service_mode text not null default 'dine_in'/);
 assert.match(pickup,/service_mode='takeaway' and table_id is null/);
 assert.match(pickup,/g3_takeaway_branch_request_idx/);
 assert.match(pickup,/g3_pickup_order_enabled\(p_branch uuid\)/);
 assert.match(pickup,/s\.pickup_enabled=true/);
 assert.match(pickup,/table_id,table_label,currency,service_mode\)/);
 assert.match(pickup,/v_table\.branch_id,null,v_table\.label,v_currency,'takeaway'/);
});
test("takeaway checkout uses its own RPC, idempotency key, persisted order and status tracking",()=>{
 assert.match(guest,/g3_submit_pickup_order/);
 assert.match(guest,/g3_pickup_order_enabled/);
 assert.match(guest,/pendingKey=isTakeaway\?/);
 assert.match(guest,/trackingKey=isTakeaway\?/);
 assert.match(guest,/sessionStorage\.setItem\(trackingKey,data\.token\)/);
 assert.match(guest,/sessionStorage\.removeItem\(trackingKey\)/);
 assert.match(guest,/g3_public_order_status/);
 assert.match(cart,/branchId=\{branchId\} serviceMode=\{serviceMode\}/);
 assert.match(guest,/إرسال طلب السفري/);
 assert.match(guest,/جاهز للاستلام/);
});
test("takeaway server validates each published item, modifiers and omissions and accepts no client prices",()=>{
 assert.match(pickup,/join public\.catalog_branch_publications pub/);
 assert.match(pickup,/pub\.active=true and pub\.available=true/);
 assert.match(pickup,/v_selected<v_group\.min_select or v_selected>v_group\.max_select/);
 assert.match(pickup,/v_known<>cardinality\(v_ids\)/);
 assert.match(pickup,/v_line_total:=\(v_prod\.price\+v_extra\)\*v_qty/);
 assert.match(pickup,/Ingredient cannot be removed/);
 assert.match(pickup,/v_item_count>20/);
 assert.match(pickup,/Too many recent takeaway requests for this branch/);
 assert.match(pickup,/unique_violation/);
 assert.doesNotMatch(guest,/price_minor:item\.unitMinor/);
});
test("merchant controls table and pickup independently; both share authenticated queue and transition engine",()=>{
 assert.match(merchant,/pickupEnabled,setPickupEnabled/);
 assert.match(merchant,/pickup_enabled:!pickupEnabled/);
 assert.match(merchant,/تفعيل استقبال السفري/);
 assert.match(merchant,/o\.serviceMode==="takeaway"/);
 assert.match(pickup,/m\.role in \('owner','manager'\)/);
 assert.match(pickup,/revoke all on function public\.g3_branch_orders\(uuid\) from public,anon/);
 assert.match(pickup,/revoke all on function public\.g3_submit_pickup_order\(uuid,uuid,jsonb\) from public/);
 assert.match(pickup,/grant execute on function public\.g3_submit_pickup_order\(uuid,uuid,jsonb\) to anon,authenticated/);
});
test("both service modes show accurate copy and all five statuses without scrolling",()=>{
 assert.match(menu,/يمكن إرسال طلب السفري للمطعم إذا كانت الخدمة مفعّلة/);
 assert.match(guest,/isTakeaway\?"تم الاستلام":"تم التسليم"/);
 assert.match(css,/User-tested order tracker: five compact steps always side by side, no horizontal swipe/);
 assert.match(css,/\.beger-guest-order-tracking \.beger-order-steps\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test("takeaway UI labels never pretend pickup is preview-only while delivery stays disabled",()=>{
 const choices=read("components/guest-service-choice.tsx");
 const detail=read("components/product-details.tsx");
 assert.match(choices,/pickupPilot:"استلام من المحل · بموافقة المطعم"/);
 assert.match(choices,/pickupPilot:"Shop pickup · restaurant approval required"/);
 assert.match(choices,/<small>\{t\.pickupPilot\}<\/small>/);
 assert.match(choices,/deliveryNote/);
 assert.match(detail,/serviceMode==="takeaway"/);
 assert.match(detail,/أضف اختياراتك ثم أرسل طلب السفري/);
 assert.match(menu,/tableOrdering=\{Boolean\(tableToken\)\} serviceMode=\{tableToken\?"dine_in":serviceMode\}/);
});
