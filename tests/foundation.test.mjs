import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration = readFileSync('supabase/migrations/202610300001_g1_core.sql', 'utf8');
test('all G1 public tables have RLS enabled', () => {
 for (const table of ['businesses','branches','memberships','plans','subscriptions','audit_logs']) {
  assert.match(migration, new RegExp('alter table public\\.'+table+' enable row level security;', 'i'));
 }
});
test('no public write grants in baseline', () => {
 assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all)\s+on\s+public\./i);
});
test('membership authorization uses authenticated uid', () => {
 assert.match(migration, /memberships_self_read/);
 assert.match(migration, /auth\.uid\(\)/);
});
