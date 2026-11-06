import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/dashboard/page.tsx","utf8");
const manager = readFileSync("app/dashboard/branch-manager.tsx","utf8");
const policies = readFileSync("supabase/migrations/202610300003_g1_branch_management.sql","utf8");
const css = readFileSync("app/dashboard/dashboard.module.css","utf8");

test("branch controls are only rendered for known membership businesses", () => {
 assert.match(page, /\.eq\("user_id", user\.id\)/);
 assert.match(page, /canManageBranches = currentRole === "owner" \|\| currentRole === "manager"/);
 assert.match(page, /!loadError && primary && <BranchManager businessId=\{primary\.id\}/);
});
test("branch insert is limited to the selected membership business", () => {
 assert.match(manager, /if \(!canManage \|\| busy/);
 assert.match(manager, /\.from\("branches"\)\.insert\(\{/);
 assert.match(manager, /business_id: businessId/);
 assert.doesNotMatch(manager,/service_role|SERVICE_ROLE|admin\./);
});
test("branch rename is narrowed by both branch ID and merchant ID", () => {
 assert.match(manager, /branches\.some\(b => b\.id === editing\)/);
 assert.match(manager, /\.eq\("id", editing\)/);
 assert.match(manager, /\.eq\("business_id", businessId\)/);
 assert.match(manager, /\.maybeSingle\(\)/);
});
test("postgres RLS only grants owner and manager branch writes", () => {
 assert.match(policies, /m\.role in \('owner','manager'\)/);
 assert.match(policies, /grant insert \(business_id,name\)/);
 assert.match(policies, /grant update \(name\)/);
 assert.match(policies, /No DELETE grant or policy/);
});
test("branch form is usable with keyboard and small screens", () => {
 assert.match(manager, /htmlFor="new-branch-name"/);
 assert.match(manager, /role="alert"/);
 assert.match(manager, /router\.refresh\(\)/);
 assert.match(css, /\.field:focus-visible/);
 assert.match(css, /@media\(max-width:420px\)/);
});
