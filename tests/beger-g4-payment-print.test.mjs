import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104003000_g4_manual_collection_and_tickets.sql","utf8");
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const guest=readFileSync("components/guest-order-submission.tsx","utf8");
const printer=readFileSync("lib/beger-print-ticket.ts","utf8");

test("G4 collection is unpaid by default and merchant verified, with an immutable event",()=>{
 assert.match(sql,/payment_status text not null default 'unpaid'/);
 assert.match(sql,/payment_method in \('cash','external_card','external_transfer'\)/);
 assert.match(sql,/g3_payment_events_one_paid_per_order/);
 assert.match(sql,/alter table public\.g3_payment_events enable row level security/);
 assert.match(sql,/revoke all on public\.g3_payment_events from public,anon,authenticated/);
 assert.match(sql,/if auth\.uid\(\) is null then raise exception/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/for update/);
 assert.match(sql,/Payment already recorded with another method/);
 assert.match(sql,/insert into public\.g3_payment_events/);
 assert.match(sql,/revoke all on function public\.g3_record_external_payment\(uuid,text\) from public,anon/);
});
test("merchant payment button records received money but never invokes a card charge",()=>{
 assert.match(board,/g3_record_external_payment/);
 assert.match(board,/تأكيد استلام كامل المبلغ/);
 assert.match(board,/هذا لا يجري أي خصم إلكتروني/);
 assert.match(board,/paymentStatus:"paid"/);
 assert.match(board,/o\.paymentStatus==="paid"/);
 assert.doesNotMatch(board,/createPaymentIntent|stripe\.charges|capturePayment/);
});
test("shared customer and merchant references reflect server order identifier",()=>{
 assert.match(sql,/upper\(substr\(replace\(o\.id::text,'-',''\),1,10\)\)/);
 assert.match(guest,/setOrderReference\(data\.reference\)/);
 assert.match(guest,/orderReference\?"#"\+orderReference/);
 assert.match(guest,/paymentStatus==="paid"/);
 assert.match(board,/orderReference\(o\.id\)/);
 assert.match(printer,/slice\(0,10\)\.toUpperCase\(\)/);
});
test("printing is initiated by staff, protects user product names and clearly avoids fiscal claims",()=>{
 assert.match(board,/printOrderTicket\(o,branchName,"kitchen"\)/);
 assert.match(board,/printOrderTicket\(o,branchName,"pickup"\)/);
 assert.match(board,/printOrderTicket\(o,branchName,"summary"\)/);
 assert.match(printer,/window\.open\("","_blank"/);
 assert.match(printer,/node\.textContent=value/);
 assert.doesNotMatch(printer,/\.innerHTML\s*=|document\.write\(/);
 assert.match(printer,/ليست فاتورة ضريبية/);
 assert.match(printer,/ليست إيصالاً ضريبياً/);
 assert.match(printer,/@page\{size:80mm auto/);
});
