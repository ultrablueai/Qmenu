import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("app/b/[branchId]/page.tsx","utf8");
const table=readFileSync("app/t/[token]/page.tsx","utf8");
const lib=readFileSync("lib/g2-public.ts","utf8");
const view=readFileSync("components/public-menu.tsx","utf8");
const sql=readFileSync("supabase/migrations/20261101232646_g2a_public_branch_identity.sql","utf8");
const g2=readFileSync("supabase/migrations/20261101233523_g2_branch_catalog_tables.sql","utf8");
const editor=readFileSync("app/dashboard/branches/[branchId]/menu-manager.tsx","utf8");

test("guest pages use anonymous client without account tokens",()=>{
  assert.match(lib,/createClient\(url,key/);
  assert.match(lib,/persistSession:false/);
  assert.match(page,/public_branch_identity/);
  assert.match(page,/loadPublicMenu/);
  assert.match(table,/public_table_locator/);
  assert.match(table,/loadPublicMenu/);
  assert.doesNotMatch(page+table+lib,/service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.getUser/);
});
test("G2A display identity exposes no private fields",()=>{
  assert.match(sql,/returns table \(branch_id uuid, branch_name text, business_name text, country_code text\)/);
  assert.match(sql,/set search_path = ''/);
  assert.match(sql,/where b\.id=p_branch/);
  assert.match(sql,/to anon, authenticated/);
});
test("G2 catalog and tables are tenant-scoped with controlled public read",()=>{
  for(const t of ["menu_categories","menu_items","dining_tables"]){
    assert.ok(g2.includes("alter table public."+t+" enable row level security"));
    assert.ok(g2.includes("revoke all on public.menu_categories,public.menu_items,public.dining_tables"));
  }
  assert.match(g2,/foreign key \(category_id, branch_id\)/);
  assert.match(g2,/where t\.qr_token=p_token and t\.active/);
  assert.match(g2,/where i\.branch_id=p_branch and i\.category_id=c\.id and i\.active and i\.available/);
  assert.match(g2,/auth\.uid\(\)/);
});
test("no phase 3 ordering or checkout invented",()=>{
  assert.match(view,/formatPrice/);
  assert.match(editor,/price_minor/);
  assert.match(view,/عرض القائمة فقط/);
  assert.doesNotMatch(page+table+view,/submitOrder|checkout|paymentIntent/);
});
