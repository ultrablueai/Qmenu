import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql = readFileSync("supabase/migrations/202610300003_g1_branch_management.sql","utf8");

test("branch creation and rename are scoped to owner's or manager's membership",()=>{
  assert.match(sql,/branches_manager_insert/);
  assert.match(sql,/branches_manager_update/);
  assert.equal((sql.match(/m\.business_id\s*=\s*branches\.business_id/g)||[]).length,3);
  assert.equal((sql.match(/m\.user_id\s*=\s*\(select auth\.uid\(\)\)/g)||[]).length,3);
  assert.equal((sql.match(/m\.role in \('owner','manager'\)/g)||[]).length,3);
});
test("update changes only name and never tenant id",()=>{
  assert.match(sql,/grant update \(name\) on public\.branches to authenticated/);
  assert.doesNotMatch(sql,/grant update \(business_id/);
  assert.doesNotMatch(sql,/grant delete on public\.branches/);
});
test("both update predicates protect before and after values",()=>{
  assert.match(sql,/for update to authenticated[\s\S]*using\s*\([\s\S]*with check\s*\(/);
});
