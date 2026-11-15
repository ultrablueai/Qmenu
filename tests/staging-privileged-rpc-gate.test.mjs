import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gate = readFileSync("tests/sql/staging-privileged-rpc-readonly-gate.sql","utf8");
test("staging privileged RPC drift gate remains read-only and fail-closed",()=>{
  for(const name of [
    "assign_branch_staff","create_first_business",
    "platform_admin_audit_overview","platform_admin_business_directory",
    "platform_admin_overview","platform_admin_trial_overview",
    "platform_owner_access_roster","platform_owner_create_plan",
    "platform_owner_set_plan_active","platform_owner_start_trial"
  ]) assert.ok(gate.includes(name),name+" missing");
  assert.match(gate,/has_function_privilege\('anon'/);
  assert.match(gate,/has_function_privilege\('authenticated'/);
  assert.match(gate,/auth\.uid\(\)/);
  assert.match(gate,/platform_admins/);
  assert.match(gate,/rowsecurity=false/);
  assert.match(gate,/raise exception/i);
  assert.doesNotMatch(gate,/\b(insert|update|delete|truncate|drop|alter|grant|revoke|commit)\s+(into\s+|table\s+|on\s+|role\s+|from\s+)?(?:public\.|auth\.|pg_)/i);
});
