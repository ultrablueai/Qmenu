import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TR_BALANCED,TR_PROMO,TR_TRIAL_DAYS,previewTurkeyOffer} from "../lib/beger-tr-balanced-offers.mjs";
const sql=readFileSync("supabase/migrations/20261109200000_g27_tr_balanced_offer_drafts.sql","utf8");
const admin=readFileSync("app/admin/page.tsx","utf8");
const ui=readFileSync("app/admin/turkey-offer-drafts.tsx","utf8");

test("Beger Balanced amounts, annual discount and trial reflect approved preliminary policy",()=>{
 assert.deepEqual(Object.entries(TR_BALANCED).map(([k,v])=>[k,v.monthlyGrossMinor,v.annualGrossMinor,v.branches]),[
 ["start",39900,399000,1],["pro",99900,999000,1],["business",179900,1799000,2]
 ]);
 assert.equal(TR_TRIAL_DAYS,14);
 assert.deepEqual(TR_PROMO,{code:"pro",monthlyGrossMinor:79900,maxMerchants:30,months:6});
 for(const p of Object.values(TR_BALANCED))assert.equal(p.annualGrossMinor,p.monthlyGrossMinor*10);
});
test("promo preview refuses unverified capacity and non-Pro/yearly requests",()=>{
 assert.throws(()=>previewTurkeyOffer({plan:"pro",promo:true}),/unverified/);
 assert.throws(()=>previewTurkeyOffer({plan:"start",promo:true,claimedPromoMerchants:0}),/monthly Pro/);
 assert.throws(()=>previewTurkeyOffer({plan:"pro",period:"yearly",promo:true,claimedPromoMerchants:0}),/monthly Pro/);
 assert.deepEqual(previewTurkeyOffer({plan:"pro",promo:true,claimedPromoMerchants:29}),{grossMinor:79900,offer:"pro_founder_preview",promoMonths:6,billingEnabled:false});
 assert.deepEqual(previewTurkeyOffer({plan:"pro",promo:true,claimedPromoMerchants:30}),{grossMinor:99900,offer:"regular",billingEnabled:false});
 assert.throws(()=>previewTurkeyOffer({plan:"pro",promo:true,claimedPromoMerchants:-1}),/unverified/);
});
test("Staging SQL forbids publication, purchase and entitlement activation",()=>{
 assert.match(sql,/published boolean not null default false check \(published=false\)/);
 assert.match(sql,/billing_enabled boolean not null default false check \(billing_enabled=false\)/);
 assert.match(sql,/alter table public\.beger_tr_offer_drafts enable row level security/);
 assert.match(sql,/revoke all on public\.beger_tr_offer_drafts from public,anon,authenticated/);
 assert.match(sql,/a\.role in \('platform_owner','platform_operator'\)/);
 assert.doesNotMatch(sql,/insert into public\.(plans|subscriptions|payment_events|invoices)/);
});
test("platform admin displays unpublished regional drafts, not checkout",()=>{
 assert.match(admin,/TurkeyOfferDrafts/);
 assert.match(admin,/supabase\.from\("beger_tr_offer_drafts"\)/);
 assert.match(ui,/مسودة · الدفع معطّل/);
 assert.doesNotMatch(ui,/checkout\(|chargeCustomer|subscribe\(/);
});
