import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/202611010009_branch_scoped_assignments.sql","utf8");
const branch=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
const dashboard=readFileSync("app/dashboard/page.tsx","utf8");

test("branch assignments require matching tenant and existing business membership",()=>{
 assert.match(sql,/foreign key\(business_id,branch_id\) references public\.branches\(business_id,id\)/);
 assert.match(sql,/foreign key\(business_id,user_id\) references public\.memberships\(business_id,user_id\)/);
 assert.match(sql,/primary key\(branch_id,user_id\)/);
 assert.match(sql,/alter table public\.branch_assignments enable row level security/);
 assert.match(sql,/revoke all on public\.branch_assignments from public,anon,authenticated/);
});
test("branch read policy restricts staff to assignments without changing manager-wide access",()=>{
 assert.match(sql,/drop policy if exists branches_member_read/);
 assert.match(sql,/create policy branches_scoped_member_read/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/ba\.branch_id=branches\.id/);
 assert.match(sql,/ba\.user_id=\(select auth\.uid\(\)\)/);
});
test("assignment RPC checks manager/owner, staff membership, and audits",()=>{
 assert.match(sql,/create function public\.assign_branch_staff/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/m\.role='staff'/);
 assert.match(sql,/branch_staff_assigned/);
 assert.match(sql,/revoke all on function public\.assign_branch_staff\(uuid,uuid,text\)/);
});
test("server checks staff branch assignment; RLS-filtered dashboard can link staff to it",()=>{
 assert.match(branch,/\.in\("role", \["owner", "manager", "staff"\]\)/);
 assert.match(branch,/\.from\("branch_assignments"\)/);
 assert.match(branch,/if \(assignmentError \|\| !assignment\) notFound\(\)/);
 assert.match(branch,/\.eq\("user_id",user\.id\)/);
 assert.match(dashboard,/\.from\("branches"\)\.select\("id,business_id,name"\)\.in\("business_id", ids\)/);
 assert.match(dashboard,/فتح لوحة الفرع/);
});
