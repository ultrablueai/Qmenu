import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const merchant=readFileSync('app/dashboard/page.tsx','utf8');
const owner=readFileSync('app/admin/page.tsx','utf8');
test('merchant console switch requires separate platform role from authenticated user',()=>{
 assert.match(merchant,/auth\.getUser\(\)/);
 assert.match(merchant,/\.from\("platform_admins"\)/);
 assert.match(merchant,/\.eq\("user_id",user\.id\)\.eq\("enabled",true\)/);
 assert.match(merchant,/const canOpenPlatform = !platformAccessError/);
 assert.match(merchant,/\{canOpenPlatform && <Link[^>]*href="\/admin"/);
});
test('platform console only exposes business switch to merchant member',()=>{
 assert.match(owner,/auth\.getUser\(\)/);
 assert.match(owner,/if\(permissionError \|\| !account\)/);
 assert.match(owner,/\.from\("memberships"\)/);
 assert.match(owner,/const canOpenBusiness = !merchantMembershipError/);
 assert.match(owner,/\{canOpenBusiness && <Link[^>]*href="\/dashboard"/);
});
test('switching does not mutate account role or impersonate merchants',()=>{
 for(const page of [merchant,owner]){
  assert.doesNotMatch(page,/update\(\{\s*role|signInAs|service_role/);
 }
});
