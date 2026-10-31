import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const login = readFileSync("app/login/page.tsx", "utf8");
const forgot = readFileSync("app/forgot-password/page.tsx", "utf8");
const reset = readFileSync("app/reset-password/page.tsx", "utf8");
const confirmation = readFileSync("app/auth/callback/route.ts", "utf8");
const recovery = readFileSync("app/auth/recovery/callback/route.ts", "utf8");

test("existing users can request password recovery without signing up twice", () => {
 assert.match(login, /href="\/forgot-password"/);
 assert.match(forgot, /auth\.resetPasswordForEmail/);
 assert.match(forgot, /"\/auth\/recovery\/callback"/);
 assert.doesNotMatch(forgot, /service_role|SERVICE_ROLE|admin\.updateUserById/);
});

test("signup confirmation callback remains fixed to dashboard", () => {
 assert.match(confirmation, /exchangeCodeForSession\(code\)/);
 assert.match(confirmation, /new URL\("\/dashboard",request\.url\)/);
 assert.doesNotMatch(confirmation, /searchParams\.get\("next"\)/);
});

test("password recovery callback uses fixed same-origin destination", () => {
 assert.match(recovery, /exchangeCodeForSession\(code\)/);
 assert.match(recovery, /new URL\("\/reset-password", request\.url\)/);
 assert.doesNotMatch(recovery, /searchParams\.get\("next"\)/);
});

test("password update needs a real session and matching 12-character passwords", () => {
 assert.match(reset, /auth\.getUser\(\)/);
 assert.match(reset, /password\.length < 12 \|\| password !== confirm/);
 assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
 assert.match(reset, /auth\.signOut\(\)/);
 assert.doesNotMatch(reset, /service_role|SERVICE_ROLE/);
});
