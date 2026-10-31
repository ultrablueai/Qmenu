import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const login = readFileSync("app/login/page.tsx", "utf8");
const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
const onboarding = readFileSync("app/onboarding/page.tsx", "utf8");
const onboardingForm = readFileSync("app/onboarding/onboarding-form.tsx", "utf8");

test("login validates Supabase session before using server-side dashboard membership gate", () => {
  assert.match(login, /auth\.signInWithPassword/);
  assert.match(login, /if \(!data\.session\)/);
  assert.match(login, /window\.location\.replace\("\/dashboard"\)/);
});

test("dashboard redirects anonymous users to login", () => {
  assert.match(dashboard, /if \(error \|\| !user\) redirect\("\/login"\)/);
});

test("dashboard automatically redirects authenticated users without memberships to onboarding", () => {
  assert.match(dashboard, /if \(!membershipError && !memberships\?\.length\) redirect\("\/onboarding"\)/);
  assert.match(dashboard, /if \(membershipError\)/);
});

test("onboarding rejects anonymous sessions and directs existing merchants to dashboard", () => {
  assert.match(onboarding, /if \(error \|\| !user\) redirect\("\/login"\)/);
  assert.match(onboarding, /if \(memberships\?\.length\) redirect\("\/dashboard"\)/);
  assert.match(onboarding, /if \(membershipError\)/);
});

test("onboarding still creates businesses using authenticated Supabase RPC only", () => {
  assert.match(onboardingForm, /auth\.getUser\(\)/);
  assert.match(onboardingForm, /\.rpc\("create_first_business"/);
  assert.doesNotMatch(onboardingForm, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
});
