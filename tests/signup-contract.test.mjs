import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const signup=readFileSync("app/signup/page.tsx","utf8");
const callback=readFileSync("app/auth/callback/route.ts","utf8");
test("signup defers company permissions to server and does not use privileged keys",()=>{
 assert.match(signup,/auth\.signUp/);
 assert.doesNotMatch(signup,/service_role|SERVICE_ROLE|p_owner_id/);
});
test("email confirmation trades auth code for session without user supplied redirect",()=>{
 assert.match(callback,/exchangeCodeForSession\(code\)/);
 assert.match(callback,/new URL\("\/dashboard",request\.url\)/);
 assert.doesNotMatch(callback,/searchParams\.get\("next"\)/);
});
