import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const shop=readFileSync("app/b/[branchId]/page.tsx","utf8");
const table=readFileSync("app/t/[token]/page.tsx","utf8");
const uuid="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
test("branch and table QR accept all five groups of UUID",()=>{
 for(const source of [shop,table]){
  assert.ok(source.includes(uuid),"five-group UUID required");
  assert.ok(!source.includes("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"),"four-group UUID must not be used");
 }
 const exact=new RegExp("^"+uuid+"$","i");
 assert.equal(exact.test("b0000000-2026-4000-8000-000000000002"),true);
 assert.equal(exact.test("b0000000-2026-4000-000000000002"),false);
 assert.equal(exact.test("../dashboard"),false);
});
