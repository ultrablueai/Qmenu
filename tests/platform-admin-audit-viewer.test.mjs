import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/202611010008_platform_access_audit_read_only.sql","utf8");
const page=readFileSync("app/admin/page.tsx","utf8");

test("platform access roster is restricted to verified enabled platform owner",()=>{
 assert.match(sql,/create function public\.platform_owner_access_roster/);
 assert.match(sql,/pa\.enabled=true and pa\.role='platform_owner'/);
 assert.match(sql,/raise exception 'platform owner required'/);
 assert.match(sql,/revoke all on function public\.platform_owner_access_roster\(\) from public,anon,authenticated/);
 assert.match(sql,/limit 50/);
});
test("audit viewer is restricted and never returns arbitrary event details",()=>{
 assert.match(sql,/create function public\.platform_admin_audit_overview/);
 assert.match(sql,/pa\.user_id=v_actor and pa\.enabled=true/);
 assert.match(sql,/raise exception 'platform admin required'/);
 assert.match(sql,/return query select ev\.id,ev\.action,ev\.target_type,ev\.created_at/);
 assert.doesNotMatch(sql,/select ev\.\*|ev\.details|password|phone/);
 assert.match(sql,/revoke all on function public\.platform_admin_audit_overview\(\) from public,anon,authenticated/);
});
test("owner dashboard shows roster and audit records from verified RPCs",()=>{
 assert.match(page,/\.rpc\("platform_owner_access_roster"\)/);
 assert.match(page,/\.rpc\("platform_admin_audit_overview"\)/);
 assert.match(page,/account\.role==="platform_owner" \?/);
 assert.match(page,/id="security"/);
 assert.match(page,/لا نعرض عمليات غير مؤكدة/);
 assert.match(page,/تغيير صلاحياته ليست متاحة/);
});
