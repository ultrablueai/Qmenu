import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql=readFileSync("supabase/migrations/202610300002_g1_first_owner_onboarding.sql","utf8");
const ui=readFileSync("app/onboarding/page.tsx","utf8");

test("owner bootstrap validates authenticated identity and serializes creation",()=>{
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/exists \(select 1 from public\.memberships where user_id=v_user\)/);
});
test("privileged function uses closed search path, scoped grants, and server-side writes",()=>{
 assert.match(sql,/security definer\s+set search_path = ''/);
 assert.match(sql,/revoke all on function public\.create_first_business/);
 assert.match(sql,/grant execute on function public\.create_first_business\(text,text,text\) to authenticated/);
 for(const table of ["businesses","memberships","branches","audit_logs"])assert.match(sql,new RegExp("public\\."+table));
});
test("onboarding calls RPC without client-selected owner identifier",()=>{
 assert.match(ui,/supabase\.rpc\("create_first_business"/);
 assert.doesNotMatch(ui,/service_role|SERVICE_ROLE|p_user_id|p_owner_id/);
});
