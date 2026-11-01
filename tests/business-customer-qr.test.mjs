import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const migration=readFileSync("supabase/migrations/202611010001_unified_business_customer_qr.sql","utf8");
const customerUi=readFileSync("app/dashboard/customer-cards.tsx","utf8");
const branchUi=readFileSync("app/dashboard/branches/[branchId]/branch-qr-scanner.tsx","utf8");
const branchPage=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
const companyPage=readFileSync("app/dashboard/page.tsx","utf8");
const encoder=readFileSync("lib/qr/qr-svg.tsx","utf8");

test("each issued card belongs to one business, never to a single branch",()=>{
 assert.match(migration,/create table public\.business_customers/);
 assert.match(migration,/business_id uuid not null references public\.businesses/);
 assert.match(migration,/qr_hash text not null unique/);
 assert.match(migration,/unique\(business_id,id\)/);
 assert.match(migration,/v_token := 'QMB1\.'/);
 assert.doesNotMatch(migration,/insert into public\.business_customers\(business_id,branch_id/);
});
test("branch attribution comes from authorized scanner branch, not QR input",()=>{
 assert.match(migration,/from public\.branches b join public\.memberships m on m\.business_id=b\.business_id/);
 assert.match(migration,/where b\.id=p_branch and m\.user_id=v_actor/);
 assert.match(migration,/where c\.business_id=v_business and c\.qr_hash/);
 assert.match(migration,/insert into public\.customer_qr_scans\(business_id,branch_id,customer_id,scanned_by\)/);
 assert.match(branchUi,/p_branch:branchId,p_code:token/);
});
test("QR secret stays hashed at rest and hidden from Data API client reads",()=>{
 assert.match(migration,/extensions\.digest\(v_token,'sha256'\)/);
 assert.match(migration,/revoke all on public\.business_customers/);
 assert.match(migration,/grant select\(id,business_id,display_name,active,created_at,consent_at\)/);
 assert.doesNotMatch(migration,/grant select\(qr_hash\)/);
 assert.match(customerUi,/setIssued\(\{code:card\.qr_code/);
 assert.match(encoder,/qr\.addData\(value\)/);
});
test("scanning is rate-limited and duplicate-protected with branch level audit",()=>{
 assert.match(migration,/>= 15 then/);
 assert.match(migration,/interval '30 seconds'/);
 assert.match(migration,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(migration,/scanned_by uuid not null references auth\.users/);
 assert.match(branchUi,/result==="duplicate"/);
});
test("owners can revoke and rotate cards; anonymous is denied all RPCs",()=>{
 assert.match(migration,/create function public\.rotate_business_customer_qr/);
 assert.match(migration,/create function public\.deactivate_business_customer_qr/);
 assert.match(migration,/revoke all on function public\.scan_business_customer_qr\(uuid,text\) from public,anon,authenticated/);
 assert.match(migration,/grant execute on function public\.scan_business_customer_qr\(uuid,text\) to authenticated/);
 assert.match(customerUi,/p_consent:true/);
 assert.match(customerUi,/p_customer:customer\.id/);
});
test("company offers QR card issuance; branch shows branch-only history and scanner",()=>{
 assert.match(companyPage,/\.from\("business_customers"\)/);
 assert.match(companyPage,/<CustomerCards businessId=\{primary\.id\}/);
 assert.match(branchPage,/\.from\("customer_qr_scans"\)/);
 assert.match(branchPage,/\.eq\("branch_id",branch\.id\)/);
 assert.match(branchPage,/<BranchQrScanner branchId=\{branch\.id\}/);
});
