import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const company = readFileSync("app/dashboard/page.tsx","utf8");
const branch = readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
const css = readFileSync("app/dashboard/dashboard.module.css","utf8");

test("company dashboard lists only RLS-visible branches and limits editing to managers/owners",()=>{
  assert.match(company,/canManageBranches = currentRole === "owner" \|\| currentRole === "manager"/);
  assert.match(company,/<Link href=\{\x60\/dashboard\/branches\/\$\{branch.id\}\x60\}/);
});
test("branch dashboard requires signed in user, tenant membership and scoped branch",()=>{
  assert.match(branch,/supabase\.auth\.getUser\(\)/);
  assert.match(branch,/if \(authError \|\| !user\) redirect\("\/login"\)/);
  assert.match(branch,/\.eq\("user_id", user\.id\)/);
  assert.match(branch,/\.in\("role", \["owner", "manager", "staff"\]\)/);
  assert.match(branch,/\.in\("business_id", businessIds\)/);
  assert.match(branch,/\.eq\("id", branchId\)/);
  assert.match(branch,/if \(!branch\) notFound\(\)/);
  assert.match(branch,/\.from\("branch_assignments"\)/);
  assert.match(branch,/if \(assignmentError \|\| !assignment\) notFound\(\)/);
  assert.doesNotMatch(branch,/service_role|SERVICE_ROLE|admin\.listUsers/);
});
test("branch identity and QR status are not fabricated",()=>{
  assert.match(branch,/branch\.name/);
  assert.match(branch,/business\.name/);
  assert.match(branch,/QR المتجر والطاولة/);
  assert.doesNotMatch(branch,/Math\.random|fakeCustomerCount|fakeOrders/);
});
test("branch workspace has navigation and mobile style",()=>{
  assert.match(branch,/href="\/dashboard"/);
  assert.match(css,/\.branchPageHeader/);
  assert.match(css,/@media\(max-width:720px\)/);
});
