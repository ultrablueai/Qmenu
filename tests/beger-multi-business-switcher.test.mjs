import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const page=readFileSync("app/dashboard/page.tsx","utf8"),css=readFileSync("app/dashboard/dashboard.module.css","utf8");
test("merchant can choose only businesses verified from their memberships",()=>{
 assert.match(page,/\.eq\("user_id", user\.id\)/);
 assert.match(page,/businesses\.find\(\(b\) => b\.id === requestedBusiness && ids\.includes\(b\.id\)\)/);
 assert.match(page,/businesses\.map\(b=><Link key=\{b\.id\}/);
 assert.match(page,/href=\{\/dashboard\?business=/);
 assert.match(css,/\.businessSwitchOption\[aria-current="page"\]/);
});
