import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql = readFileSync("supabase/migrations/202610300001_g1_core.sql","utf8");
const dash = readFileSync("app/dashboard/page.tsx","utf8");
const signout = readFileSync("app/auth/signout/route.ts","utf8");
const server = readFileSync("lib/supabase/server.ts","utf8");

test("all tenant-owned tables have restrictive row security",()=>{
  for(const table of ["businesses","branches","memberships","subscriptions","audit_logs"])
    assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security","i"));
});
test("business and branch reads are tied to authenticated membership",()=>{
  for(const name of ["businesses_member_read","branches_member_read","subscriptions_member_read"])
    assert.ok(sql.includes(name));
  assert.match(sql,/m\.user_id = \(select auth\.uid\(\)\)/);
});
test("no anonymous access or tenant client writes granted",()=>{
  assert.doesNotMatch(sql,/grant\s+(insert|update|delete|all)\s+on\s+public\./i);
  assert.doesNotMatch(sql,/create policy\s+\w+\s+on\s+public\.\w+\s+for\s+(insert|update|delete)/i);
});
test("dashboard verifies user on server before querying data",()=>{
  assert.match(dash,/supabase\.auth\.getUser\(\)/);
  assert.match(dash,/if \(error \|\| !user\) redirect\("\/login"\)/);
});
test("logout uses POST and server client",()=>{
  assert.match(signout,/export async function POST/);
  assert.match(signout,/auth\.signOut\(\)/);
});
test("server configuration uses publishable key, not service role",()=>{
  assert.match(server,/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(server,/SERVICE_ROLE|secretKey|service_role/);
});
