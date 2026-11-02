import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/202611010004_platform_admin_isolation.sql","utf8");
const page=readFileSync("app/admin/page.tsx","utf8");
const canonical=readFileSync("docs/BEGER-CANONICAL-PLAN.md","utf8");

test("platform admin membership is separate from business membership",()=>{
 assert.match(sql,/create table public\.platform_admins/);
 assert.match(sql,/references auth\.users/);
 assert.match(sql,/alter table public\.platform_admins enable row level security/);
 assert.match(sql,/platform_admin_self_read/);
 assert.doesNotMatch(sql,/insert into public\.platform_admins/);
});
test("platform aggregate RPC fails closed before accessing tenant metrics",()=>{
 assert.match(sql,/exists\([\s\S]*?from public\.platform_admins a where a\.user_id=v_actor and a\.enabled=true/);
 assert.match(sql,/raise exception 'platform admin required'/);
 assert.match(sql,/revoke all on function public\.platform_admin_overview\(\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.platform_admin_overview\(\) to authenticated/);
 assert.doesNotMatch(sql,/select \* from public\.business_customers/);
});
test("platform console checks real session and independent role",()=>{
 assert.match(page,/supabase\.auth\.getUser\(\)/);
 assert.match(page,/\.from\("platform_admins"\)/);
 assert.match(page,/if\s*\(permissionError \|\| !account\)/);
 assert.match(page,/supabase\.rpc\("platform_admin_overview"\)/);
});
test("platform console does not impersonate merchant or claim future features ready",()=>{
 assert.match(page,/غير متاح بعد/);
 assert.doesNotMatch(page,/service_role|admin\.getUserById|update.*businesses/);
 assert.match(canonical,/Super Admin/);
});
