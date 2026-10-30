import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const probe = readFileSync("supabase/tests/g1_tenant_isolation.psql", "utf8");

test("integration probe checks both tenant identities", () => {
  assert.match(probe, /owner_a/);
  assert.match(probe, /owner_b/);
  assert.match(probe, /SET LOCAL ROLE authenticated/);
  assert.match(probe, /request\.jwt\.claim\.sub/);
});
test("integration probe checks cross-tenant writes and role escalation", () => {
  assert.match(probe, /ILLEGAL CROSS TENANT UPDATE/g);
  assert.match(probe, /Unsafe direct membership write privilege/);
  assert.match(probe, /Unsafe anonymous business read privilege/);
  assert.match(probe, /ROW_COUNT/);
});
test("integration probe always rolls back test fixtures on success", () => {
  assert.match(probe, /ROLLBACK;\s*$/);
  assert.match(probe, /ON_ERROR_STOP/);
});
