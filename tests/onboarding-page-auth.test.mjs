import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gate = readFileSync("app/onboarding/layout.tsx", "utf8");
const onboarding = readFileSync("app/onboarding/page.tsx", "utf8");
const rpc = readFileSync("supabase/migrations/202610300002_g1_first_owner_onboarding.sql", "utf8");

test("onboarding requires verified server session before rendering", () => {
  assert.match(gate, /supabase\.auth\.getUser\(\)/);
  assert.match(gate, /if \(error \|\| !user\) redirect\("\/login"\)/);
  assert.match(gate, /export const dynamic = "force-dynamic"/);
});

test("existing members cannot repeat first-business onboarding", () => {
  assert.match(gate, /\.from\("memberships"\)/);
  assert.match(gate, /\.eq\("user_id", user\.id\)/);
  assert.match(gate, /if \(memberships\?\.length\) redirect\("\/dashboard"\)/);
  assert.match(gate, /if \(membershipError\)/);
  assert.match(rpc, /if exists \(select 1 from public\.memberships where user_id=v_user\)/);
});

test("onboarding never takes client-supplied owner ID", () => {
  assert.match(onboarding, /\.rpc\("create_first_business"/);
  assert.doesNotMatch(onboarding, /service_role|SERVICE_ROLE|p_owner_id|p_user_id/);
});
