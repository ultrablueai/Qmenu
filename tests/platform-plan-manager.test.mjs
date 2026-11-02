import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/202611010006_platform_owner_plan_catalog.sql","utf8");
const panel=readFileSync("app/admin/page.tsx","utf8");
const form=readFileSync("app/admin/plan-manager.tsx","utf8");

test("plan creation and toggles require active platform owner, not merchant or operator",()=>{
 for(const f of ["platform_owner_create_plan","platform_owner_set_plan_active"])assert.match(sql,new RegExp("create function public\\."+f));
 assert.equal((sql.match(/a\.role='platform_owner'/g)||[]).length,2);
 assert.equal((sql.match(/raise exception 'platform owner required'/g)||[]).length,2);
 assert.match(sql,/grant execute on function public\.platform_owner_create_plan\(text,text\) to authenticated/);
 assert.match(sql,/grant execute on function public\.platform_owner_set_plan_active\(uuid,boolean\) to authenticated/);
});
test("plan writes are audited with server-side validation and no deletes",()=>{
 assert.match(sql,/create table public\.platform_audit_events/);
 assert.match(sql,/alter table public\.platform_audit_events enable row level security/);
 assert.match(sql,/revoke all on public\.platform_audit_events from public,anon,authenticated/);
 assert.match(sql,/insert into public\.platform_audit_events/);
 assert.match(sql,/v_code !~ '\^\[a-z\]/);
 assert.doesNotMatch(sql,/delete from public\.plans/);
});
test("plan controls are wired to live Supabase RPCs with server refresh",()=>{
 assert.match(panel,/\.from\("plans"\)\.select\("id,code,name,active"\)/);
 assert.match(panel,/<PlanManager plans=\{plans\} canManage=\{owner\}/);
 assert.match(form,/\.rpc\("platform_owner_create_plan"/);
 assert.match(form,/\.rpc\("platform_owner_set_plan_active"/);
 assert.match(form,/router\.refresh\(\)/);
});
test("plan management is explicitly separate from subscriptions and billing",()=>{
 assert.match(panel,/غير متاح بعد/);
 assert.match(form,/التسعير والاشتراكات والمدفوعات لم تُفعّل بعد/);
 assert.doesNotMatch(form,/insert\(\{.*subscription|stripe|iyzico|setPrice/);
});
