import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const login = readFileSync("app/login/page.tsx", "utf8");
const forgot = readFileSync("app/forgot-password/page.tsx", "utf8");
const reset = readFileSync("app/reset-password/page.tsx", "utf8");
const callback = readFileSync("app/auth/callback/route.ts", "utf8");

test("login has recovery link for existing users", () => {
  assert.match(login, /href="\/forgot-password"/);
});

test("recovery requests a reset email from Supabase, no privileged API key", () => {
  assert.match(forgot, /auth\.resetPasswordForEmail/);
  assert.match(forgot, /"\/auth\/callback"/);
  assert.match(forgot, /callback\.searchParams\.set\("next", "\/reset-password"\)/);
  assert.doesNotMatch(forgot, /service_role|SERVICE_ROLE|admin\.updateUserById/);
});

test("callback accepts only fixed same-origin reset-password destination", () => {
  assert.match(callback, /next === "\/reset-password"/);
  assert.match(callback, /new URL\(destination,request\.url\)/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.doesNotMatch(callback, /NextResponse\.redirect\(next\)/);
});

test("password form requires authenticated session and strong matching passwords", () => {
  assert.match(reset, /auth\.getUser\(\)/);
  assert.match(reset, /password\.length < 12 \|\| password !== confirm/);
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
  assert.match(reset, /auth\.signOut\(\)/);
  assert.doesNotMatch(reset, /service_role|SERVICE_ROLE/);
});
