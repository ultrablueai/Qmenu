import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync("supabase/migrations/20261110000100_g28_founder_dry_run_slots.sql","utf8");
const status=readFileSync("supabase/migrations/20261110000200_g28_founder_dry_run_status.sql","utf8");
const smoke=readFileSync("supabase/tests/beger-g28-30-slot-rollback.sql","utf8");
const admin=readFileSync("app/admin/page.tsx","utf8");
const ui=readFileSync("app/admin/turkey-offer-drafts.tsx","utf8");

test("Founder quota simulation is bounded and unique with transaction serialization",()=>{
 assert.match(migration,/slot smallint primary key check \(slot between 1 and 30\)/);
 assert.match(migration,/business_id uuid not null unique/);
 assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/generate_series\(1,30\)/);
 assert.match(migration,/v_slot is null/);
 assert.match(migration,/duplicate',true/);
});
test("Staging allocation has owner-only gate, no public mutations or billing",()=>{
 assert.match(migration,/a\.role='platform_owner'/);
 assert.match(migration,/raise exception 'Platform owner required for dry run'/);
 assert.match(migration,/country_code='TR'/);
 assert.match(migration,/kind text not null default 'simulation' check \(kind='simulation'\)/);
 assert.match(migration,/alter table public\.beger_tr_founder_dry_run_slots enable row level security/);
 assert.match(migration,/revoke all on public\.beger_tr_founder_dry_run_slots from public,anon,authenticated/);
 assert.match(migration,/revoke all on function public\.beger_g28_founder_dry_run_claim\(uuid\) from public,anon,authenticated/);
 assert.doesNotMatch(migration,/insert into public\.(subscriptions|plans|invoices|payment_events)/);
});
test("Read-only status is authorized and visibly simulation-only",()=>{
 assert.match(status,/a\.role in \('platform_owner','platform_operator'\)/);
 assert.match(status,/'promo_live',false/);
 assert.match(status,/'billing_enabled',false/);
 assert.match(admin,/supabase\.rpc\("beger_g28_founder_dry_run_status"\)/);
 assert.match(ui,/هذه ليست حجوزات حقيقية/);
});
test("Acceptance fixtures are rolled back and 31st merchant is rejected",()=>{
 assert.match(smoke,/begin;/);
 assert.match(smoke,/rollback;/);
 assert.match(smoke,/generate_series\(1,31\)/);
 assert.match(smoke,/for i in 1\.\.30 loop/);
 assert.match(smoke,/exception when sqlstate 'P0001'/);
});
