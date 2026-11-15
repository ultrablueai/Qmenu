import test from "node:test";
import assert from "node:assert/strict";
import { validateStagingDeployment } from "../scripts/verify-staging.mjs";

const valid = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "feat/g1-foundation",
  NEXT_PUBLIC_SUPABASE_URL: "https://qandxrcuetwzenlqspez.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_placeholder",
};

test("only correct staging preview configuration is allowed", () => {
  assert.equal(validateStagingDeployment(valid).ok, true);
});

test("production-target deployments are blocked", () => {
  assert.deepEqual(validateStagingDeployment({ ...valid, VERCEL_ENV: "production" }), {
    ok: false,
    reason: "non_preview_vercel_environment",
  });
});

test("unreviewed branch is blocked", () => {
  assert.equal(validateStagingDeployment({ ...valid, VERCEL_GIT_COMMIT_REF: "main" }).ok, false);
});

test("production Supabase URL is blocked", () => {
  assert.deepEqual(validateStagingDeployment({
    ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://fstpxknegaxppjilbnke.supabase.co",
  }), { ok: false, reason: "production_database_forbidden" });
});

test("other or missing Supabase endpoint is blocked", () => {
  assert.equal(validateStagingDeployment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "" }).ok, false);
  assert.equal(validateStagingDeployment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://wrong.supabase.co" }).ok, false);
});

test("missing publishable key is blocked", () => {
  assert.equal(validateStagingDeployment({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }).ok, false);
});

test("local execution stays available for developers", () => {
  assert.equal(validateStagingDeployment({}).ok, true);
});
