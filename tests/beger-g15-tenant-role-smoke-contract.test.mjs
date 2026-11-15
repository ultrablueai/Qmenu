import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/tests/beger-g15-tenant-role-smoke.sql","utf8");

test("G15 security smoke runs only as rollback-only, pre-existing, authenticated identities",()=>{
 assert.equal((sql.match(/^begin;$/gm)||[]).length,3);
 assert.equal((sql.match(/^rollback;$/gm)||[]).length,3);
 assert.equal((sql.match(/^set local role authenticated;$/gm)||[]).length,3);
 assert.equal((sql.match(/set_config\('request\.jwt\.claim\.sub'/g)||[]).length,3);
 assert.doesNotMatch(sql,/\b(?:insert into|update public\.|delete from|truncate|create user|create role|drop table|grant |revoke )\b/i);
});
test("G15 merchant-only fixture excludes users who separately administer Beger platform",()=>{
 assert.match(sql,/not exists\(select 1 from public\.platform_admins a where a\.user_id=m\.user_id and a\.enabled=true\)/);
 assert.match(sql,/not exists\(select 1 from public\.memberships z where z\.user_id=m\.user_id and z\.business_id=b\.id\)/);
 assert.match(sql,/g12_merchant_subscription_status\(own\)/);
 assert.match(sql,/g12_merchant_subscription_status\(other\)/);
 assert.match(sql,/g13_merchant_requests\(own\)/);
 assert.match(sql,/g13_merchant_requests\(other\)/);
 assert.match(sql,/g14_platform_launch_preflight\(\)/);
});
test("G15 checks correct cashier and pager permissions, including denied foreign stations",()=>{
 for(const fn of ["g10_cashier_queue(own)","g10_cashier_queue(other)",
 "g9_kitchen_queue(own)","g9_kitchen_queue(other)",
 "g6_pager_branch_tickets(own)","g6_pager_branch_tickets(other)"]){
  assert.ok(sql.includes(fn),fn);
 }
 assert.match(sql,/when sqlstate '42501'/);
 assert.match(sql,/checks<>5/);
 assert.equal((sql.match(/checks<>4/g)||[]).length,2);
});
