import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync("supabase/migrations/202611010005_platform_admin_business_directory.sql","utf8");
const page=readFileSync("app/admin/page.tsx","utf8");
const css=readFileSync("app/admin/admin.module.css","utf8");

test("owner merchant directory requires a separate active platform admin",()=>{
 assert.match(migration,/from public\.platform_admins pa/);
 assert.match(migration,/pa\.user_id=v_actor and pa\.enabled=true/);
 assert.match(migration,/raise exception 'platform admin required'/);
 assert.match(migration,/revoke all on function public\.platform_admin_business_directory\(\) from public,anon,authenticated/);
 assert.match(migration,/grant execute on function public\.platform_admin_business_directory\(\) to authenticated/);
});
test("directory contains bounded general tenant data only",()=>{
 assert.match(migration,/from public\.businesses b/);
 assert.match(migration,/from public\.branches br where br\.business_id=b\.id/);
 assert.match(migration,/from public\.subscriptions s where s\.business_id=b\.id/);
 assert.match(migration,/limit 100/);
 assert.doesNotMatch(migration,/customer_qr_scans|business_customers|auth\.users\s+u\s+join|select\s+password/);
});
test("owner panel does not inherit merchant access",()=>{
 assert.match(page,/supabase\.auth\.getUser\(\)/);
 assert.match(page,/\.from\("platform_admins"\)/);
 assert.match(page,/if\s*\(permissionError \|\| !account\)/);
 assert.match(page,/\.rpc\("platform_admin_business_directory"\)/);
 assert.match(page,/\.rpc\("platform_admin_overview"\)/);
 assert.doesNotMatch(page,/service_role|SERVICE_ROLE|admin\.listUsers|impersonate/);
});
test("owner panel makes future functionality explicitly unavailable",()=>{
 assert.match(page,/قراءة فقط/);
 assert.match(page,/غير متاح بعد/);
 assert.match(page,/لم تُطلق بعد/);
 assert.match(page,/أول 100 نشاط/);
});
test("owner panel has mobile navigation, semantic table and reduced motion",()=>{
 assert.match(page,/aria-label="تنقل كنترول بنل المالك على الهاتف"/);
 assert.match(page,/<table className=\{styles\.table\}>/);
 assert.match(page,/<th scope="col">النشاط<\/th>/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
