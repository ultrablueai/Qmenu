import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gate = readFileSync("app/onboarding/layout.tsx", "utf8");
const onboarding = readFileSync("app/onboarding/page.tsx", "utf8");

test("onboarding requires verified server session before rendering", () => {
  assert.match(gate, /supabase\.auth\.getUser\(\)/);
  assert.match(gate, /if \(error \|\| !user\) redirect\("\/login"\)/);
  assert.match(gate, /export const dynamic = "force-dynamic"/);
});

test("onboarding never takes a client-supplied owner or grants elevated roles", () => {
  assert.match(onboarding, /\.rpc\("create_first_business"/);
  assert.doesNotMatch(onboarding, /service_role|SERVICE_ROLE|p_owner_id|p_user_id/);
});
