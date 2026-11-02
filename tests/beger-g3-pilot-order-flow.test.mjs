import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const sql=read("supabase/migrations/20261102195000_g3_pilot_table_orders.sql");
const cart=read("components/guest-cart.tsx");
const guest=read("components/guest-order-submission.tsx");
const product=read("components/product-details.tsx");
const merchant=read("app/dashboard/merchant-order-board.tsx");
const hq=read("app/dashboard/headquarters-catalog.tsx");
test("G3 is explicitly disabled per branch until an authorized manager opts in",()=>{
 assert.match(sql,/enabled boolean not null default false/);
 assert.match(sql,/g3_table_order_enabled\(p_table_token uuid\)/);
 assert.match(merchant,/confirm\(enabled\?/);
 assert.match(guest,/g3_table_order_enabled/);
 assert.match(guest,/enabled&&tableToken/);
});
test("G3 unauthenticated orders are priced from published products and active options on server",()=>{
 assert.match(sql,/join public\.catalog_branch_publications pub/);
 assert.match(sql,/coalesce\(pub\.price_override_minor,p\.price_minor\)/);
 assert.match(sql,/pub\.active=true and pub\.available=true/);
 assert.match(sql,/v_selected<v_group\.min_select or v_selected>v_group\.max_select/);
 assert.match(sql,/v_known<>cardinality\(v_ids\)/);
 assert.match(sql,/v_line_total:=\(v_prod\.price\+v_extra\)\*v_qty/);
 assert.match(guest,/p_table_token:tableToken,p_request_id:request,p_items:payload/);
 assert.doesNotMatch(guest,/totalMinor:total|price_minor:item\.unitMinor/);
 assert.match(product,/optionIds:selectedIds,removedIngredients:removed/);
});
test("G3 direct order tables are RLS protected with narrow grants",()=>{
 for(const table of ["g3_branch_order_settings","g3_orders","g3_order_items","g3_order_events"])assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security"));
 assert.match(sql,/revoke all on public\.g3_branch_order_settings,public\.g3_orders,public\.g3_order_items,public\.g3_order_events from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g3_submit_table_order\(uuid,uuid,jsonb\) to anon,authenticated/);
 assert.match(sql,/revoke all on function public\.g3_transition_order\(uuid,text\) from public,anon/);
 assert.match(sql,/m\.user_id=auth\.uid\(\) and m\.role in \('owner','manager'\)/);
});
test("G3 order submission is idempotent, rate-limited and state transitions are auditable",()=>{
 assert.match(sql,/unique\(table_id,request_id\)/);
 assert.match(sql,/Too many recent requests for this table/);
 assert.match(sql,/insert into public\.g3_order_events/);
 assert.match(sql,/v_order\.status='pending' and p_next in \('accepted','rejected'\)/);
 assert.match(sql,/v_order\.status='accepted' and p_next in \('preparing','rejected'\)/);
 assert.match(sql,/v_order\.status='preparing' and p_next='ready'/);
 assert.match(sql,/v_order\.status='ready' and p_next='fulfilled'/);
});
test("Guest flows from table QR to cart submission and tracked digital pager, merchant accepts and prepares",()=>{
 const menu=read("components/public-menu.tsx");
 assert.match(menu,/tableToken=\{tableToken\} tableLabel=\{tableLabel\}/);
 assert.match(cart,/<GuestOrderSubmission lang=\{lang\}/);
 assert.match(guest,/g3_submit_table_order/);
 assert.match(guest,/g3_public_order_status/);
 assert.match(guest,/sessionStorage\.setItem/);
 assert.match(guest,/setInterval\(\(\)=>\{void refresh\(\)\},7000\)/);
 assert.match(merchant,/g3_branch_orders/);
 assert.match(merchant,/g3_transition_order/);
 assert.match(hq,/MerchantOrderBoard/);
});

test("basket survives language switching without leaking between branches and table QR tokens",()=>{
 assert.match(cart,/storageKey="beger-preview-basket:"\+branchId\+":"\+\(tableToken\?\?"shop"\)/);
 assert.match(cart,/sessionStorage\.getItem\(storageKey\)/);
 assert.match(cart,/sessionStorage\.setItem\(storageKey,JSON\.stringify\(items\)\)/);
 assert.match(cart,/if\(!hydrated\)return/);
});
