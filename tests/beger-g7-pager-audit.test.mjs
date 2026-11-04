import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104210000_g7_pager_audit_trail.sql","utf8");
const panel=readFileSync("app/dashboard/merchant-pager-audit.tsx","utf8");
const pager=readFileSync("app/dashboard/merchant-pager.tsx","utf8");
test("pager issue and transitions create same-transaction records from DB trigger",()=>{
 assert.match(sql,/create table if not exists public\.g7_pager_audit_events/);
 assert.match(sql,/after insert or update of status on public\.g6_pager_tickets/);
 assert.match(sql,/for each row execute function public\.g7_capture_pager_audit\(\)/);
 assert.match(sql,/tg_op='INSERT'/);
 assert.match(sql,/new\.status is distinct from old\.status/);
 assert.match(sql,/auth\.uid\(\),'issued'/);
 assert.match(sql,/'status_changed',old\.status,new\.status/);
 assert.match(sql,/return new/);
});
test("audit history is branch scoped, capped, and inaccessible to staff and guests",()=>{
 assert.match(sql,/alter table public\.g7_pager_audit_events enable row level security/);
 assert.match(sql,/revoke all on public\.g7_pager_audit_events from public,anon,authenticated/);
 assert.match(sql,/m\.business_id=v_business and m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/where branch_id=p_branch and business_id=v_business/);
 assert.match(sql,/p_limit not between 1 and 100/);
 assert.match(sql,/revoke all on function public\.g7_pager_audit_history\(uuid,integer\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g7_pager_audit_history\(uuid,integer\) to authenticated/);
 assert.doesNotMatch(sql,/grant select on public\.g7_pager_audit_events|update public\.g7_pager_audit_events|delete from public\.g7_pager_audit_events/);
});
test("merchant audit panel loads on demand and never appears in staff pager",()=>{
 assert.match(panel,/g7_pager_audit_history/);
 assert.match(panel,/p_branch:branchId,p_limit:40/);
 assert.match(panel,/<details open=\{open\}/);
 assert.match(panel,/if\(expanded&&!loaded\)void load\(\)/);
 assert.match(panel,/event\.actor==="system"/);
 assert.match(pager,/!staffMode\?<MerchantPagerAudit/);
 assert.match(panel,/لم تُعرض|لا يُعرض هذا السجل/);
});
