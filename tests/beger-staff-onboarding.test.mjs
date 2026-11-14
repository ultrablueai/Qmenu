import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const staff=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const style=readFileSync("app/dashboard/merchant-staff.css","utf8");
const signup=readFileSync("app/signup/page.tsx","utf8");
const employee=readFileSync("app/staff/register/page.tsx","utf8");
const sql=readFileSync("supabase/migrations/20261105000500_g11_staff_pending_invitations.sql","utf8");
test("owner chooses a branch role and creates a pending invitation, not instant privilege",()=>{
 assert.match(staff,/type StaffRole="cashier"\|"kitchen"\|"pager"/);
 assert.match(staff,/rpc\("g11_staff_invite",\{p_branch:branchId,p_email:target,p_role:role\}\)/);
 assert.match(staff,/rpc\("g11_owner_invitations"/);
 assert.match(staff,/rpc\("g11_revoke_invitation"/);
 assert.match(staff,/value=\{role\}/);
 assert.match(staff,/setRole\(e\.target\.value as StaffRole\)/);
 assert.match(staff,/بانتظار القبول/);
});
test("employee registration is separate from merchant and does not create a business",()=>{
 assert.match(signup,/هذا التسجيل مخصص لمالكي الأنشطة/);
 assert.match(employee,/تسجيل موظف في Beger/);
 assert.match(employee,/auth\.signUp/);
 assert.match(employee,/emailRedirectTo/);
 assert.match(staff,/href="\/staff\/register"/);
 assert.doesNotMatch(employee,/create_first_business|service_role|auth\.admin\./);
});
test("owner-only pending invitation stays scoped and cannot auto-assign role",()=>{
 assert.match(sql,/m\.user_id=auth\.uid\(\) and m\.role='owner'/);
 assert.match(sql,/unique\(branch_id,email,role\)/);
 assert.match(sql,/accepted_at is null and i\.revoked_at is null/);
 assert.match(sql,/u\.email_confirmed_at is not null/);
 assert.match(sql,/g11_accept_invitation/);
 assert.match(sql,/p_role not in \('cashier','kitchen','pager'\)/);
});
test("staff setup remains legible on mobile and links existing workstations",()=>{
 assert.match(style,/\.beger-staff-quick-add/);
 assert.match(style,/@media\(max-width:620px\)/);
 for(const name of ["cashier","kitchen","pager"])assert.match(staff,new RegExp("/staff/"+name));
});
