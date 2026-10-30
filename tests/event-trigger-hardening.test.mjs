import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/202610300004_g1_event_trigger_grants.sql","utf8");
test("RLS DDL event trigger remains installed but client execution is revoked",()=>{
  assert.match(sql,/revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/);
  assert.doesNotMatch(sql,/drop\s+(event trigger|function)|disable\s+trigger/i);
});
