import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("tests/sql/staging-tenant-branch-isolation.sql","utf8");
const branch=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
const dashboard=readFileSync("app/dashboard/page.tsx","utf8");
const retired=readFileSync("supabase/migrations/202611010002_customer_self_registration.sql","utf8");

test("tenant and branch RLS fixture has real two-tenant two-branch negative checks and rollback",()=>{
 assert.match(sql,/begin;/);
 assert.match(sql,/set local role authenticated/);
 assert.match(sql,/insert into public\.branch_assignments/);
 assert.match(sql,/cross-tenant business leakage/);
 assert.match(sql,/branch assignment isolation broken/);
 assert.match(sql,/unauthorized branch visible/);
 assert.match(sql,/membership isolation broken/);
 assert.match(sql,/rollback;/);
 assert.doesNotMatch(sql,/commit;/i);
});
test("branch page verifies branch assignment for staff, not only membership",()=>{
 assert.match(branch,/role === "staff"/);
 assert.match(branch,/\.from\("branch_assignments"\)/);
 assert.match(branch,/\.eq\("branch_id",branch\.id\)/);
 assert.match(branch,/if \(assignmentError \|\| !assignment\) notFound\(\)/);
});
test("merchant dashboard uses scoped tenant data, customer QR enrollment remains retired",()=>{
 assert.match(dashboard,/\.from\("memberships"\)/);
 assert.match(dashboard,/\.from\("branches"\)/);
 assert.match(retired,/INTENTIONALLY RETIRED \/ NO-OP/);
 assert.doesNotMatch(dashboard,/CustomerCards|issue_business_customer_qr/);
});
