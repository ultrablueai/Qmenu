import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const health = readFileSync("app/api/health/route.ts", "utf8");
test("health endpoint never claims database validation or staging certification", () => {
  assert.match(health, /databaseVerified:\s*false/);
  assert.match(health, /stagingCertified:\s*false/);
  assert.match(health, /configured_unverified/);
  assert.doesNotMatch(health, /service_role|SERVICE_ROLE|process\.env\.[A-Z_]+\s*[,}]/);
});
test("health endpoint cannot be cached as a success forever", () => {
  assert.match(health, /Cache-Control/);
  assert.match(health, /no-store/);
});
