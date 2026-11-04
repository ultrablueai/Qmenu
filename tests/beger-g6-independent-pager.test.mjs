import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104150000_g6_independent_pager.sql","utf8");
const merchant=readFileSync("app/dashboard/merchant-pager.tsx","utf8");
const client=readFileSync("app/pager/[token]/pager-customer.tsx","utf8");
const page=readFileSync("app/pager/[token]/page.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
test("independent pager does not touch commercial orders, payments or tables",()=>{
 assert.match(sql,/create table if not exists public\.g6_pager_tickets/);
 assert.match(sql,/unique\(branch_id,display_number\)/);
 assert.match(sql,/on conflict\(branch_id\) do update set last_number=public\.g6_pager_counters\.last_number\+1/);
 assert.doesNotMatch(sql,/insert into public\.g3_orders|update public\.g3_orders|payment_intent|total_minor/);
 assert.match(merchant,/g6_pager_issue/);
 assert.match(hq,/workspace==="pager"/);
});
test("pager history and mutations are restricted to same-business manager membership",()=>{
 assert.match(sql,/m\.user_id=auth\.uid\(\) and m\.role in \('owner','manager'\)/);
 for(const name of ["g6_pager_counters","g6_pager_tickets"])assert.match(sql,new RegExp("alter table public\\."+name+" enable row level security"));
 assert.match(sql,/revoke all on public\.g6_pager_counters,public\.g6_pager_tickets from public,anon,authenticated/);
 for(const fn of ["issue","branch_tickets","transition"])assert.match(sql,new RegExp("grant execute on function public\\.g6_pager_"+fn+"\\("));
 assert.match(sql,/for update/);
 assert.match(sql,/Invalid pager state transition/);
});
test("customer needs secret tracking token; public status returns no reference or identity",()=>{
 assert.match(sql,/secret_token uuid not null unique default gen_random_uuid/);
 assert.match(sql,/where t\.secret_token=p_token/);
 assert.match(sql,/grant execute on function public\.g6_pager_public_status\(uuid\) to anon,authenticated/);
 const statusSql=sql.slice(sql.indexOf('create or replace function public.g6_pager_public_status'));
 assert.doesNotMatch(statusSql,/external_reference|user_id|email|phone|payment/);
 assert.match(page,/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}/);
 assert.match(client,/g6_pager_public_status/);
 assert.match(client,/window\.setInterval\(\(\)=>\{void check\(\)\},7000\)/);
});
test("cashier can print QR, search via branch list, transition status and confirm fulfillment",()=>{
 assert.match(merchant,/QrSvg value=\{ticketUrl\(selected\.token\)\}/);
 assert.match(merchant,/window\.print\(\)/);
 assert.match(merchant,/g6_pager_branch_tickets/);
 assert.match(merchant,/g6_pager_transition/);
 assert.match(merchant,/فاتورة الخارجية/);
 assert.match(merchant,/تأكيد التسليم/);
 assert.match(client,/احتفظ بهذه الصفحة مفتوحة/);
});
