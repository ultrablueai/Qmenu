import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104193000_g7_branch_staff_pager_access.sql","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
const staff=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const route=readFileSync("app/staff/pager/page.tsx","utf8");
const pager=readFileSync("app/dashboard/merchant-pager.tsx","utf8");

test("staff assignment requires branch membership, is owner-controlled and RLS protected",()=>{
 assert.match(sql,/alter table public.g7_staff_branch_access enable row level security/);
 assert.match(sql,/revoke all on public.g7_staff_branch_access from public,anon,authenticated/);
 assert.match(sql,/m.user_id=auth.uid\(\) and m.role='owner'/);
 assert.match(sql,/v_role is not null and v_role<>'staff'/);
 assert.match(sql,/insert into public.memberships\(business_id,user_id,role\)/);
 assert.match(sql,/values\(v_business,v_person,'staff'\)/);
 assert.match(sql,/where business_id=v_business and branch_id=p_branch and user_id=v_person/);
 assert.match(sql,/grant execute on function public.g7_staff_pager_assign\(uuid,text,boolean\) to authenticated/);
 assert.doesNotMatch(sql,/grant execute on function public.g7_staff_pager_assign.* to anon/);
});
test("pager-only operations allow assigned staff but administrative functions remain owner/manager only",()=>{
 assert.match(sql,/m.role='staff' and exists\(/);
 assert.match(sql,/a.branch_id=b.id/);
 assert.match(sql,/a.business_id=b.business_id and a.user_id=auth.uid\(\)/);
 assert.match(sql,/if not public.g7_pager_operator_allowed\(p_branch\)/);
 assert.match(sql,/public.g7_pager_operator_allowed\(v_row.branch_id\)/);
 const old=readFileSync("supabase/migrations/20261104163000_g6_pager_display_and_analytics.sql","utf8");
 assert.match(old,/public.g6_pager_branch_authorized\(p_branch\)/);
 assert.doesNotMatch(sql,/create or replace function public.g6_pager_display_config|create or replace function public.g6_pager_branch_analytics/);
});
test("staff workstations fetch only authenticated assigned branches and hide management tools",()=>{
 assert.match(route,/db.auth.getUser\(\)/);
 assert.match(route,/g7_staff_my_pager_branches/);
 assert.match(route,/branches.find\(b=>b.id===params.branch\)\?\?branches\[0\]/);
 assert.match(route,/<MerchantPager key=\{active.id\} branchId=\{active.id\} branchName=\{active.name\} staffMode\/>/);
 assert.match(pager,/!staffMode\?<MerchantPagerDisplay/);
 assert.match(hq,/workspace==="staff"/);
 assert.match(staff,/g7_staff_pager_roster/);
 assert.match(staff,/g7_staff_pager_assign/);
 assert.match(staff,/تسجيل الدخول|مسجلاً مسبقاً/);
});
