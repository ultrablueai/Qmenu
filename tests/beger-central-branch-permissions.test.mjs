import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const dashboard=readFileSync("app/dashboard/page.tsx","utf8");
const branch=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
const editor=readFileSync("app/dashboard/branches/[branchId]/menu-manager.tsx","utf8");
const policy=readFileSync("supabase/migrations/20261101233523_g2_branch_catalog_tables.sql","utf8");

test("catalog administration is mounted only in merchant HQ",()=>{
 assert.match(dashboard,/canManageBranches && <HeadquartersCatalog/);
 assert.match(dashboard,/country=\{primary\.country_code\}/);
 assert.match(hq,/<MenuManager key=\{activeId\}/);
 assert.match(hq,/branches\.some\(b=>b\.id===selectedBranch\)/);
 assert.doesNotMatch(branch,/import MenuManager|<MenuManager|menu-manager/);
 assert.doesNotMatch(branch,/<HeadquartersCatalog|browserSupabase/);
});

test("branch UI links authorized owners back to HQ but does not offer catalog edit",()=>{
 assert.match(branch,/role === "owner" \|\| role === "manager"/);
 assert.match(branch,/\/dashboard#catalog-management/);
 assert.match(branch,/مخصصة للتشغيل المحلي/);
});

test("central editor retains tenant-scoped mutation fields and policy checks",()=>{
 assert.match(editor,/business_id:businessId,branch_id:branchId/);
 for(const t of ["menu_categories","menu_items","dining_tables"]){
   assert.match(editor,new RegExp('from\\("'+t+'"\\)'));
   assert.match(policy,new RegExp('create policy g2_.*_manager_update on public\\.'+t));
 }
 assert.match(policy,/m\.role in \('owner','manager'\)/);
 assert.doesNotMatch(policy,/m\.role in \('owner','manager','staff'\)/);
});
