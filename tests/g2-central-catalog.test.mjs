import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const migration=readFileSync("supabase/migrations/20261102053112_g2_hq_canonical_catalog.sql","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
const central=readFileSync("app/dashboard/central-catalog.tsx","utf8");
const prices=readFileSync("app/dashboard/central-price-editor.tsx","utf8");
const branch=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");

test("HQ canonical catalog is additive; keeps legacy menu and public QR URLs",()=>{
 for(const t of ["catalog_categories","catalog_products","catalog_branch_publications"]){
  assert.match(migration,new RegExp("create table public\\."+t));
  assert.match(migration,new RegExp("alter table public\\."+t+" enable row level security"));
 }
 assert.match(migration,/from public\.menu_items i/);
 assert.match(migration,/legacy\.data \|\| central\.data/);
 assert.doesNotMatch(migration,/drop table|truncate table|delete from public\.menu_/i);
});
test("cross-business branch/product publications must have composite foreign keys",()=>{
 assert.match(migration,/foreign key \(branch_id,business_id\) references public\.branches\(id,business_id\)/);
 assert.match(migration,/foreign key \(product_id,business_id\) references public\.catalog_products\(id,business_id\)/);
 assert.match(migration,/where cat\.active and exists/);
 assert.match(migration,/pub\.branch_id=p_branch and pub\.active and pub\.available/);
 assert.match(migration,/coalesce\(pub\.price_override_minor,prod\.price_minor\)/);
});
test("only central managers can write, guests see published public JSON only",()=>{
 assert.match(migration,/m\.role in \('owner','manager'\)/);
 assert.doesNotMatch(migration,/m\.role in \('owner','manager','staff'\)/);
 assert.match(migration,/revoke all on public\.catalog_categories,public\.catalog_products,public\.catalog_branch_publications from public,anon,authenticated/);
 assert.match(migration,/grant execute on function public\.public_branch_menu\(uuid\) to anon,authenticated/);
});
test("HQ renders one shared product catalog and branch-local availability/override controls",()=>{
 assert.match(hq,/<CentralCatalog businessId=\{businessId\}/);
 assert.match(central,/<CentralPriceEditor/);
 assert.match(central,/catalog_branch_publications/);
 assert.match(prices,/onBasePrice/);
 assert.match(prices,/onOverride/);
 assert.match(prices,/onAvailability/);
 assert.doesNotMatch(branch,/<CentralCatalog|<MenuManager/);
});
