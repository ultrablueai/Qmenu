import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104125000_g5_loyalty_stamps_pilot.sql","utf8");
const merchant=readFileSync("app/dashboard/merchant-loyalty.tsx","utf8");
const guest=readFileSync("components/guest-loyalty-stamp.tsx","utf8");
const tracker=readFileSync("components/guest-order-watcher.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
test("stamps cannot grant money or redeem rewards: pilot is disabled by default",()=>{
 assert.match(sql,/enabled boolean not null default false/);
 assert.match(sql,/stamps_target smallint not null default 5 check\(stamps_target between 3 and 20\)/);
 assert.match(sql,/order_id uuid not null unique references public\.g3_orders/);
 assert.match(sql,/g5_loyalty_stamps_wallet_idx/);
 assert.doesNotMatch(sql,/insert into public\.g3_orders|update public\.g3_orders|discount_minor|reward_issued/);
 assert.match(merchant,/لا توجد مكافآت أو خصومات قابلة للصرف بعد/);
 assert.match(guest,/Reward redemption is not available yet/);
});
test("one stamp requires valid fulfilled order bearer token and reuses only same-branch loyalty wallet",()=>{
 assert.match(sql,/public_token=p_order_token for update/);
 assert.match(sql,/v_order\.status<>'fulfilled'/);
 assert.match(sql,/v_order\.created_at<now\(\)-interval '30 days'/);
 assert.match(sql,/order_id=v_order\.id/);
 assert.match(sql,/wallet_token=p_wallet_token/);
 assert.match(sql,/branch_id=v_order\.branch_id and business_id=v_order\.business_id/);
 assert.match(sql,/Loyalty card does not belong to branch/);
 assert.match(sql,/insert into public\.g5_loyalty_stamps/);
 assert.match(sql,/walletToken.*v_wallet\.wallet_token/);
});
test("RLS and ownership of merchant loyalty configuration and reporting",()=>{
 for(const table of ["settings","wallets","stamps"])assert.match(sql,new RegExp("alter table public\\.g5_loyalty_"+table+" enable row level security"));
 assert.match(sql,/revoke all on public\.g5_loyalty_settings,public\.g5_loyalty_wallets,public\.g5_loyalty_stamps from public,anon,authenticated/);
 assert.match(sql,/m\.user_id=auth\.uid\(\) and m\.role in \('owner','manager'\)/);
 assert.match(sql,/grant execute on function public\.g5_loyalty_configure\(uuid,boolean,integer\) to authenticated/);
 assert.match(sql,/grant execute on function public\.g5_loyalty_merchant_status\(uuid\) to authenticated/);
 assert.doesNotMatch(sql,/grant select on public\.g5_loyalty_wallets|grant select on public\.g5_loyalty_stamps/);
});
test("guest loyalty is opt-in after delivery, not tied to payments or identity",()=>{
 assert.match(tracker,/order\.status==="fulfilled"\?<GuestLoyaltyStamp/);
 assert.match(guest,/g5_loyalty_card/);
 assert.match(guest,/g5_loyalty_claim/);
 assert.match(guest,/onClick=\{\(\)=>void claim\(\)\}/);
 assert.match(guest,/localStorage\.setItem\(key,data\.walletToken\)/);
 assert.match(guest,/setClaimed\(true\)/);
 assert.match(merchant,/g5_loyalty_configure/);
 assert.match(hq,/workspace==="loyalty"/);
 assert.doesNotMatch(guest,/email|phone|paymentIntent|chargeCard/);
});
