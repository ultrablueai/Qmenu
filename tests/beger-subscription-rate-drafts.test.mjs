import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261103081000_beger_subscription_rate_drafts.sql","utf8");
const ui=readFileSync("app/admin/subscription-rate-draft-manager.tsx","utf8");
const admin=readFileSync("app/admin/page.tsx","utf8");
const pricing=readFileSync("lib/beger-subscription-pricing.ts","utf8");
test("subscription drafts are separate from merchant transactions and never automatically activate subscriptions",()=>{
 assert.match(sql,/create table public\.beger_subscription_rate_drafts/);
 assert.match(sql,/monthly_minor bigint not null/);
 assert.match(sql,/primary key\(country,rate_key\)/);
 assert.match(sql,/alter table public\.beger_subscription_rate_drafts enable row level security/);
 assert.doesNotMatch(sql,/customer_order|order_total|commission|payment_intent|charge_card/);
 assert.match(sql,/not published rates, settlements, entitlements or invoices/);
});
test("draft pricing is platform-admin readable and platform-owner writable only",()=>{
 assert.match(sql,/revoke all on public\.beger_subscription_rate_drafts from public,anon,authenticated/);
 assert.match(sql,/create policy beger_rate_platform_admin_read/);
 assert.match(sql,/a\.role in \('platform_owner','platform_operator'\)/);
 assert.match(sql,/a\.role='platform_owner'/);
 assert.match(sql,/revoke all on function public\.beger_platform_owner_save_rate_draft\(text,text,bigint\) from public,anon,authenticated/);
 assert.match(sql,/insert into public\.platform_audit_events/);
 assert.match(sql,/using\(exists|to authenticated using\(exists/);
});
test("owner controls draft rate UI, and merchant cannot preview unpublished drafts as a purchase",()=>{
 assert.match(admin,/canManage=\{owner\} loadFailed=\{Boolean\(rateResult\.error\)\}/);
 assert.match(admin,/supabase\.from\("beger_subscription_rate_drafts"\)/);
 assert.match(ui,/rpc\("beger_platform_owner_save_rate_draft"/);
 assert.match(ui,/!canManage\|\|loadFailed\|\|busy/);
 assert.match(ui,/مسودة غير منشورة/);
 assert.doesNotMatch(ui,/payWithCard|chargeCustomer|checkout\(|merchantSettlement/);
 assert.match(pricing,/if\(!book\|\|!book\.published/);
});
