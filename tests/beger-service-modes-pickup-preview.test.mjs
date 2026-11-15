import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const branch=read("app/b/[branchId]/page.tsx");
const menu=read("components/public-menu.tsx");
const choices=read("components/guest-service-choice.tsx");
const cart=read("components/guest-cart.tsx");
const sql=read("supabase/migrations/20261102195000_g3_pilot_table_orders.sql");
const rules=read("docs/BEGER-SERVICE-MODES-PACKAGING-CONTRACT-20261103.md");
test("shop visitor can deliberately choose a separate pickup preview while table QR remains dine-in",()=>{
 assert.match(branch,/search\.service==="takeaway"\?"takeaway":"browse"/);
 assert.match(menu,/serviceMode=\{tableToken\?"dine_in":serviceMode\}/);
 assert.match(menu,/<GuestServiceChoice lang=\{lang\}/);
 assert.match(choices,/service=takeaway&view=menu&lang=/);
 assert.match(choices,/Paket \/ Gel-al/);
 assert.match(choices,/داخل المحل/);
 assert.match(choices,/Delivery/);
});
test("pickup ordering requires a server-authoritative RPC and opt-in; paid packaging remains disabled",()=>{
 assert.match(cart,/isTakeaway=serviceMode==="takeaway"/);
 assert.match(cart,/Takeaway orders can be sent for restaurant approval when pickup is enabled/);
 assert.match(menu,/تصفح المنتجات واختر إضافاتك وأرسل طلب السفري/);
 assert.match(read("components/guest-order-submission.tsx"),/g3_submit_pickup_order/);
 assert.match(read("supabase/migrations/20261103231000_g3_pilot_takeaway_orders.sql"),/pickup_enabled boolean not null default false/);
 assert.match(sql,/g3_submit_table_order\(p_table_token uuid/);
 assert.doesNotMatch(sql,/g3_submit_takeaway_order/);
 assert.match(rules,/No client-only order submission/);
});
test("carts are isolated by verified table QR and service mode",()=>{
 assert.match(cart,/tableToken\?\?\(serviceMode==="takeaway"\?"takeaway":"shop"\)/);
 assert.match(cart,/sessionStorage\.getItem\(storageKey\)/);
 assert.match(cart,/sessionStorage\.setItem\(storageKey,JSON\.stringify\(items\)\)/);
});
test("packaging model defines product- and order-level charges without fabricated prices",()=>{
 assert.match(rules,/catalog_packaging_items/);
 assert.match(rules,/catalog_product_packaging_rules/);
 assert.match(rules,/per-order packaging/);
 assert.match(rules,/integer minor units/);
 assert.match(rules,/Data shape proposed for a reviewed migration, not yet applied/);
});
