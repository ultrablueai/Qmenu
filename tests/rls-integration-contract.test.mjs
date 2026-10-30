import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const probe = readFileSync("supabase/tests/g1_tenant_isolation.psql", "utf8");

test("integration probe checks two authenticated identities and all tenant reads", () => {
  assert.match(probe, /test-c551@invalid\.example/);
  assert.match(probe, /test-d552@invalid\.example/);
  assert.match(probe, /SET LOCAL ROLE authenticated/);
  assert.match(probe, /request\.jwt\.claim\.sub/);
  assert.match(probe, /A sees % businesses/);
  assert.match(probe, /B sees % branches/);
});

test("integration probe asserts cross-tenant insert, update and privilege escalation denial", () => {
  assert.match(probe, /CROSS_TENANT_INSERT_NOT_BLOCKED/);
  assert.match(probe, /CROSS_TENANT_UPDATE_NOT_BLOCKED/);
  assert.match(probe, /PRIVILEGE_ESCALATION_NOT_BLOCKED/);
  assert.match(probe, /WHEN insufficient_privilege/);
  assert.match(probe, /ROW_COUNT/);
});

test("staging integration probe is transactional and rolls back fixtures", () => {
  assert.match(probe, /Never run against production/);
  assert.match(probe, /\\set ON_ERROR_STOP on/);
  assert.match(probe, /ROLLBACK;\s*$/);
});
