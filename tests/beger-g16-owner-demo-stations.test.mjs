import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261106002000_g16_owner_workstation_branches.sql","utf8");
const page=readFileSync("app/demo-control/page.tsx","utf8");
const login=readFileSync("app/dashboard/page.tsx","utf8");
test("G16 owners and managers see workstations only for existing tenant membership",()=>{
 for(const fn of ["g10_my_cashier_branches","g9_my_kitchen_branches","g7_staff_my_pager_branches"]){
  assert.ok(sql.includes("function public."+fn+"()"));
  assert.ok(sql.includes("revoke all on function public."+fn+"() from public,anon,authenticated;"));
  assert.ok(sql.includes("grant execute on function public."+fn+"() to authenticated;"));
 }
 assert.equal((sql.match(/m\.role in \('owner','manager'\)/g)||[]).length,3);
 assert.equal((sql.match(/m\.business_id=b\.business_id and m\.user_id=auth\.uid\(\)/g)||[]).length,3);
 assert.equal((sql.match(/auth\.uid\(\) is not null/g)||[]).length,3);
});
test("G16 staff branch results stay scoped to station assignment, user and business",()=>{
 for(const name of ["g10_cashier_staff_branches","g9_kitchen_staff_branches","g7_staff_branch_access"]){
  assert.ok(sql.includes("public."+name));
 }
 assert.equal((sql.match(/m\.role='staff' and exists/g)||[]).length,3);
 assert.equal((sql.match(/\.branch_id=b\.id and \w+\.business_id=b\.business_id/g)||[]).length,3);
 assert.equal((sql.match(/\.user_id=auth\.uid\(\)/g)||[]).length>=6,true);
 assert.doesNotMatch(sql,/\b(?:insert into|delete from|update public\.|drop table|alter table)\b/i);
});
test("demo control reads real table QR tokens only after owner and branch identity checks",()=>{
 assert.match(page,/membership\?\.role!=="owner"/);
 const verify=page.indexOf("if(membershipError||membership?.role!==");
 const tables=page.indexOf('db.from("dining_tables")');
 assert.ok(verify>=0&&tables>verify);
 assert.match(page,/\.eq\("business_id",DEMO_BUSINESS\)\.eq\("branch_id",DEMO_BRANCH\)\.eq\("active",true\)/);
 assert.match(page,/href=\{"\/t\/"\+encodeURIComponent\(t\.qr_token\)\+"\?lang=ar"\}/);
 assert.match(page,/tablesError\?<p role="alert"/);
 assert.match(login,/مركز اختبار المتجر التجريبي/);
});
