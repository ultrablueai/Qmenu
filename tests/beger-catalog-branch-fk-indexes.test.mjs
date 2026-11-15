import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("tenant composite FK indexes cover branch staffing and public catalog joins without permission changes",()=>{
 const sql=readFileSync("supabase/migrations/20261106001000_catalog_branch_fk_indexes.sql","utf8");
 const wanted=[
  "branch_assignments(business_id,branch_id)",
  "branch_assignments(business_id,user_id)",
  "catalog_branch_publications(branch_id,business_id)",
  "catalog_branch_publications(product_id,business_id)",
  "catalog_modifier_groups(product_id,business_id)",
  "catalog_modifier_options(group_id,business_id)",
  "catalog_product_ingredients(product_id,business_id)",
  "dining_tables(branch_id,business_id)"
 ];
 for(const tableColumns of wanted)assert.ok(sql.includes("on public."+tableColumns),tableColumns);
 assert.equal((sql.match(/create index if not exists/g)||[]).length,wanted.length);
 assert.doesNotMatch(sql,/\b(?:drop|truncate|delete|update|insert|grant|revoke|alter table|create policy)\b/i);
});
