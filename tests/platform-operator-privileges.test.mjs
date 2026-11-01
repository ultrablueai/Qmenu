import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const fixture=readFileSync("tests/sql/staging-operator-privilege-matrix.sql","utf8");
test("platform operator may inspect but not escalate owner privileges",()=>{
 assert.match(fixture,/begin;/);
 assert.match(fixture,/set role='platform_operator'/);
 assert.match(fixture,/set local role authenticated/);
 for(const name of ["platform_admin_business_directory","platform_admin_audit_overview","platform_admin_trial_overview","platform_admin_overview"])assert.match(fixture,new RegExp("perform \\* from public\\."+name+"\\(\\)"));
 for(const name of ["platform_owner_access_roster","platform_owner_create_plan","platform_owner_set_plan_active","platform_owner_start_trial"])assert.match(fixture,new RegExp("public\\."+name+"\\("));
 assert.match(fixture,/denied<>4/);
 assert.match(fixture,/rollback;/);
 assert.doesNotMatch(fixture,/commit;/i);
});
