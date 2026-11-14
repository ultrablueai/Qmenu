import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261110000400_g30_turkey_trial_14_days.sql","utf8");
const ui=readFileSync("app/admin/trial-manager.tsx","utf8");
const smoke=readFileSync("supabase/tests/beger-g30-turkey-trial-policy.sql","utf8");
test("Turkey trial is exactly 14 days in owner-only RPC",()=>{
 assert.match(sql,/a\.role='platform_owner'/);
 assert.match(sql,/b\.country_code='TR'/);
 assert.match(sql,/p_days<>14/);
 assert.match(sql,/Turkey trials must last exactly 14 days/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/business already has a subscription history/);
});
test("Turkey admin trial form only offers 14 days and resets on business change",()=>{
 assert.match(ui,/selected\.country_code==="TR"&&days!==14/);
 assert.match(ui,/selected\?\.country_code!=="TR"&&<option value=\{7\}>/);
 assert.match(ui,/selected\?\.country_code!=="TR"&&<option value=\{30\}>/);
 assert.match(ui,/onChange=\{e=>\{setBusiness\(e\.target\.value\);setDays\(14\);\}\}/);
});
test("readonly staging rejection cases 7, 30 and no plan on 14 are archived",()=>{
 assert.match(smoke,/begin read only;/);
 assert.match(smoke,/rollback;/);
 assert.match(smoke,/platform_owner_start_trial\(b,p,7\)/);
 assert.match(smoke,/platform_owner_start_trial\(b,p,30\)/);
 assert.match(smoke,/platform_owner_start_trial\(b,p,14\)/);
});
