import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const dashboard=readFileSync("app/dashboard/page.tsx","utf8");
const staff=readFileSync("app/staff/page.tsx","utf8");
const login=readFileSync("app/login/page.tsx","utf8");
const signup=readFileSync("app/signup/page.tsx","utf8");
const cashier=readFileSync("supabase/migrations/20261104231500_g10_branch_cashier.sql","utf8");
const kitchen=readFileSync("supabase/migrations/20261104194500_g9_kitchen_staff_workstation.sql","utf8");

test("signed-in unassigned or staff-only accounts do not enter merchant onboarding",()=>{
 assert.match(dashboard,/!memberships\?\.length \|\| memberships\.every\(m=>m\.role==="staff"\)/);
 assert.match(dashboard,/redirect\("\/staff"\)/);
 assert.doesNotMatch(dashboard,/if \(!membershipError && !memberships\?\.length\) redirect\("\/onboarding"\)/);
});

test("staff landing checks server-authenticated user and verified role RPCs only",()=>{
 assert.match(staff,/db\.auth\.getUser\(\)/);
 assert.match(staff,/redirect\("\/login"\)/);
 for(const fn of ["g10_my_cashier_branches","g9_my_kitchen_branches","g7_staff_my_pager_branches"])assert.match(staff,new RegExp(fn));
 assert.match(staff,/!results\[index\]\.error&&Array\.isArray\(results\[index\]\.data\)/);
 assert.match(staff,/encodeURIComponent\(branch\.id\)/);
});

test("unassigned staff see waiting instructions and new merchants retain explicit onboarding choice",()=>{
 assert.match(staff,/بانتظار تعيين دور/);
 assert.match(staff,/لا تنشئ نشاطاً جديداً إذا كنت موظفاً/);
 assert.match(staff,/href="\/onboarding"/);
 assert.match(signup,/للموظف: أنشئ حسابك وأكّد بريدك/);
 assert.match(login,/المالك|صاحب النشاط/);
});

test("existing assignments create staff membership with owner authorization, no duplicate business",()=>{
 for(const sql of [kitchen,cashier]){
  assert.match(sql,/m\.user_id=auth\.uid\(\) and m\.role='owner'/);
  assert.match(sql,/insert into public\.memberships\(business_id,user_id,role\)/);
  assert.match(sql,/values\(v_business,v_user,'staff'\) on conflict/);
 }
 assert.doesNotMatch(staff,/create_first_business|service_role|auth\.admin\./);
});
