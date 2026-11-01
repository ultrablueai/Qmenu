import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/b/[branchId]/page.tsx", "utf8");
const sql = readFileSync("supabase/migrations/202611020001_g2a_public_branch_identity.sql", "utf8");

test("public branch route is explicitly unauthenticated and uses strict UUID lookup", () => {
  assert.match(page, /createClient\(url, key/);
  assert.match(page, /persistSession: false/);
  assert.match(page, /public_branch_identity/);
  assert.match(page, /if \(!branch\) notFound\(\)/);
  assert.doesNotMatch(page, /service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.getUser/);
});

test("public branch SQL only publishes branch and business display metadata", () => {
  assert.match(sql, /returns table \(branch_id uuid, branch_name text, business_name text, country_code text\)/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /where b\.id=p_branch/);
  assert.match(sql, /grant execute on function public\.public_branch_identity\(uuid\) to anon, authenticated/);
  assert.doesNotMatch(sql, /select \*/i);
  assert.doesNotMatch(sql, /from\\s+(auth\\.users|public\\.memberships|public\\.business_customers)/i);
});

test("public branch G2A does not falsely advertise a functioning menu/order flow", () => {
  assert.match(page, /القائمة الرقمية قيد التجهيز/);
  assert.match(page, /دون الحاجة لحساب/);
  assert.doesNotMatch(page, /submitOrder|checkout|payment/);
});
