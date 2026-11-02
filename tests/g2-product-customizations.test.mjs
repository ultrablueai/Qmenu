import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/20261102054239_g2_product_modifiers.sql","utf8");
const hq=readFileSync("app/dashboard/product-options-manager.tsx","utf8");
const catalog=readFileSync("app/dashboard/central-catalog.tsx","utf8");
const guest=readFileSync("components/product-details.tsx","utf8");
const publicMenu=readFileSync("components/public-menu.tsx","utf8");

test("ingredients, option groups and priced add-ons are tenant-owned and RLS-protected",()=>{
 for(const table of ["catalog_product_ingredients","catalog_modifier_groups","catalog_modifier_options"]){
  assert.match(sql,new RegExp("CREATE TABLE public\\."+table));
  assert.match(sql,new RegExp("'"+table+"'"));
 }
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/m\.role IN \(''owner'',''manager''\)/);
 assert.match(sql,/FOREIGN KEY \(product_id,business_id\)/);
 assert.match(sql,/FOREIGN KEY \(group_id,business_id\)/);
 assert.match(sql,/price_delta_minor bigint NOT NULL DEFAULT 0 CHECK/);
 assert.match(sql,/min_select <= max_select/);
});

test("public product details is anonymous read-only and scoped to a published branch",()=>{
 assert.match(sql,/CREATE FUNCTION public\.public_catalog_product_details\(p_branch uuid,p_product uuid\)/);
 assert.match(sql,/LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''/);
 assert.match(sql,/pub\.branch_id=p_branch/);
 assert.match(sql,/WHERE p\.id=p_product AND p\.active AND pub\.active AND pub\.available/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.public_catalog_product_details\(uuid,uuid\) TO anon,authenticated/);
 assert.doesNotMatch(sql,/GRANT (INSERT|UPDATE|DELETE).* TO anon/i);
});

test("merchant HQ manages ingredients and modifiers; branch cannot administrate them",()=>{
 assert.match(catalog,/<ProductOptionsManager/);
 for(const table of ["catalog_product_ingredients","catalog_modifier_groups","catalog_modifier_options"]){
  assert.ok(hq.includes('from("'+table+'")'));
 }
 assert.match(hq,/min<0\|\|max<1\|\|min>max\|\|max>20/);
 assert.match(hq,/price_delta_minor:minor/);
});

test("guest can preview selected options and price, not submit orders in G2",()=>{
 assert.match(publicMenu,/<ProductDetails branchId=\{branch\.branch_id\}/);
 assert.match(guest,/public_catalog_product_details/);
 assert.match(guest,/const extra=details\?\.groups\.reduce/);
 assert.match(guest,/const valid=details\?\.groups\.every/);
 assert.match(guest,/min_select/);
 assert.match(guest,/max_select/);
 assert.match(guest,/Scan your table QR to submit an order/);
 assert.doesNotMatch(guest,/submitOrder|checkout|paymentIntent|\.from\("orders"\)/);
});
