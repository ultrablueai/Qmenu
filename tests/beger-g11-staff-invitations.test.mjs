import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261105000500_g11_staff_pending_invitations.sql","utf8");
const owner=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const employee=readFileSync("app/staff/staff-invitations.tsx","utf8");
const staffHome=readFileSync("app/staff/page.tsx","utf8");
test("G11 RLS keeps pending invitation records off the direct Data API",()=>{
 assert.match(sql,/alter table public\.g11_staff_invitations enable row level security/);
 assert.match(sql,/revoke all on public\.g11_staff_invitations from public,anon,authenticated/);
 for(const name of ["g11_staff_invite","g11_my_invitations","g11_accept_invitation","g11_owner_invitations","g11_revoke_invitation"]){
  assert.match(sql,new RegExp("revoke all on function public\\."+name+"\\([^;]*from public,anon,authenticated;"));
  assert.match(sql,new RegExp("grant execute on function public\\."+name+"\\([^;]*to authenticated;"));
 }
});
test("G11 staff invitations expire, are revocable, and require actual owner for create/revoke",()=>{
 assert.match(sql,/expires_at timestamptz not null default \(now\(\)\+interval '14 days'\)/);
 assert.match(sql,/m\.role='owner'/);
 assert.match(sql,/Staff invitations restricted to branch owner/);
 assert.match(sql,/Invitation revocation forbidden/);
 assert.match(sql,/g11_staff_invitations set revoked_at=now\(\)/);
});
test("G11 acceptance requires verified exact identity and locks one invitation",()=>{
 assert.match(sql,/u\.email_confirmed_at is not null/);
 assert.match(sql,/where id=p_invitation for update/);
 assert.match(sql,/v_inv\.email<>v_email/);
 assert.match(sql,/v_inv\.revoked_at is not null or v_inv\.expires_at<=now\(\)/);
 assert.match(sql,/if v_inv\.accepted_at is not null/);
 assert.match(sql,/v_role is not null and v_role<>'staff'/);
});
test("G11 acceptance creates only the selected branch role with no payment or merchant permission",()=>{
 for(const table of ["g10_cashier_staff_branches","g9_kitchen_staff_branches","g7_staff_branch_access"]){
  assert.match(sql,new RegExp("insert into public\\."+table+"\\(business_id,branch_id,user_id\\)"));
 }
 assert.match(sql,/insert into public\.memberships\(business_id,user_id,role\)/);
 assert.match(sql,/values\(v_inv\.business_id,auth\.uid\(\),'staff'\)/);
 assert.doesNotMatch(sql,/insert into public\.(?:g3_payment_events|subscriptions|g6_pager_tickets)/);
});
test("merchant cannot activate role from invitation UI; only employee accepting does",()=>{
 assert.match(owner,/g11_staff_invite/);
 assert.doesNotMatch(owner.slice(owner.indexOf("async function quickAssign()"),owner.indexOf("async function revokeInvitation")),/g10_cashier_assign|g9_kitchen_assign|g7_staff_pager_assign/);
 assert.match(employee,/g11_my_invitations/);
 assert.match(employee,/g11_accept_invitation/);
 assert.match(staffHome,/<StaffInvitations\/>/);
});
