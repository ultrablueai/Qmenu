import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.example", "utf8");
const ignore = readFileSync(".gitignore", "utf8");

test("example env points to isolated staging, never Qmenu production", () => {
  assert.match(env, /^NEXT_PUBLIC_SUPABASE_URL=https:\/\/qandxrcuetwzenlqspez\.supabase\.co$/m);
  assert.doesNotMatch(env, /fstpxknegaxppjilbnke/);
});
test("example env contains no real credentials or elevated roles", () => {
  assert.match(env, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-/);
  assert.doesNotMatch(env, /^SUPABASE_SERVICE_ROLE_KEY=|^SUPABASE_SECRET_KEY=|^DATABASE_URL=/m);
});
test("environment files are git-ignored", () => {
  assert.match(ignore, /\.env/);
});
