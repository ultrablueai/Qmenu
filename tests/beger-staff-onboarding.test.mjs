import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const staff=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const style=readFileSync("app/dashboard/merchant-staff.css","utf8");
const signup=readFileSync("app/signup/page.tsx","utf8");
const kitchen=readFileSync("supabase/migrations/20261104194500_g9_kitchen_staff_workstation.sql","utf8");
const cashier=readFileSync("supabase/migrations/20261104231500_g10_branch_cashier.sql","utf8");

test("single role picker reuses existing cashier, kitchen and pager assignment RPCs",()=>{
 assert.match(staff,/type StaffRole="cashier"\|"kitchen"\|"pager"/);
 for(const rpc of ["g10_cashier_assign","g9_kitchen_assign","g7_staff_pager_assign"]){
  assert.match(staff,new RegExp(rpc));
 }
 assert.match(staff,/rpc\(selected\.rpc,\{p_branch:branchId,p_email:target,p_allow:true\}\)/);
 assert.match(staff,/value=\{role\}/);
 assert.match(staff,/setRole\(e\.target\.value as StaffRole\)/);
 assert.match(staff,/setRosterRevision\(v=>v\+1\)/);
});
test("employee signup explicitly warns against creating a separate merchant business",()=>{
 assert.match(signup,/للموظف: أنشئ حسابك وأكّد بريدك/);
 assert.match(signup,/لا تنشئ نشاطاً جديداً/);
 assert.match(staff,/الموظف ينشئ حسابه/);
 assert.match(staff,/تعيين الموظف/);
});
test("role assignment is still owner-only and branch-scoped at the database layer",()=>{
 for(const source of [cashier,kitchen]){
  assert.match(source,/m\.user_id=auth\.uid\(\) and m\.role='owner'/);
  assert.match(source,/where business_id=v_business and branch_id=p_branch and user_id=v_user/);
  assert.match(source,/Cannot change owner or manager membership/);
 }
 assert.match(staff,/منفّذ مالك النشاط/);
});
test("staff assignment stays responsive on narrow phones and links to existing role stations",()=>{
 assert.match(style,/\.beger-staff-quick-add/);
 assert.match(style,/@media\(max-width:620px\)/);
 for(const name of ["cashier","kitchen","pager"])assert.match(staff,new RegExp("/staff/"+name));
});
