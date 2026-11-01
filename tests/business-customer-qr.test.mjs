import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const canonical=readFileSync("docs/BEGER-CANONICAL-PLAN.md","utf8");
const company=readFileSync("app/dashboard/page.tsx","utf8");
const branch=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
const containment=readFileSync("supabase/migrations/202611010003_disable_premature_customer_qr.sql","utf8");
const oldSchema=readFileSync("supabase/migrations/202611010001_unified_business_customer_qr.sql","utf8");

test("canonical journey starts with shop/table QR and guest menu rather than customer card",()=>{
 assert.match(canonical,/Scan SHOP\/TABLE QR/);
 assert.match(canonical,/guest allowed/);
 assert.match(canonical,/merchant does NOT create their account/);
});
test("merchant dashboard cannot issue customer card",()=>{
 assert.doesNotMatch(company,/CustomerCards|customerResult|issue_business_customer_qr/);
 assert.match(company,/QR المتجر والمنيو/);
});
test("branch dashboard does not expose premature customer-card scanner",()=>{
 assert.doesNotMatch(branch,/BranchQrScanner|customer_qr_scans/);
 assert.match(branch,/QR المتجر والطاولة/);
 assert.match(branch,/ليست جاهزة للاستخدام بعد/);
});
test("staging closure revokes every premature customer QR RPC",()=>{
 for(const rpc of [
  "issue_business_customer_qr(uuid,text,boolean)",
  "rotate_business_customer_qr(uuid,uuid)",
  "deactivate_business_customer_qr(uuid,uuid)",
  "scan_business_customer_qr(uuid,text)"
 ]) assert.ok(containment.includes("revoke execute on function public."+rpc+" from public,anon,authenticated"),rpc);
});
test("old customer schema preserved without claiming a customer journey was shipped",()=>{
 assert.match(oldSchema,/create table public\.business_customers/);
 assert.match(containment,/Non-destructive/);
 assert.match(canonical,/PHASE 4 — Optional customer identity/);
});
