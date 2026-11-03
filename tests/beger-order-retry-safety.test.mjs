import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const guest=readFileSync("components/guest-order-submission.tsx","utf8");
const cart=readFileSync("components/guest-cart.tsx","utf8");
const sql=readFileSync("supabase/migrations/20261102195000_g3_pilot_table_orders.sql","utf8");

test("table orders cannot exceed the same 20 distinct lines on the client and server",()=>{
 assert.match(cart,/parsed\.length<=20/);
 assert.match(cart,/items\.length>=20/);
 assert.match(sql,/v_item_count>20/);
});
test("uncertain order response reuses the same table-scoped idempotency key after reload",()=>{
 assert.match(guest,/pendingKey="beger-g3-pending:"\+tableToken/);
 assert.match(guest,/requestRef\.current\?\.signature===signature\?requestRef\.current\.request:null/);
 assert.match(guest,/requestRef\.current=\{signature,request\}/);
 assert.doesNotMatch(guest,/useEffect\(\(\)=>\{requestRef\.current=null;\},\[items\]\)/);
 assert.match(guest,/const signature=JSON\.stringify\(payload\)/);
 assert.match(guest,/pending\?\.signature===signature/);
 assert.match(guest,/sessionStorage\.setItem\(pendingKey,JSON\.stringify\(\{signature,request\}\)\)/);
 assert.match(guest,/p_table_token:tableToken,p_request_id:request,p_items:payload/);
 assert.match(sql,/unique\(table_id,request_id\)/);
 assert.match(sql,/if found then return jsonb_build_object\('id',v_order,'token',v_public/);
 assert.match(guest,/sessionStorage\.removeItem\(pendingKey\)/);
});
test("lost-network-response copy does not incorrectly say that the order was never registered",()=>{
 assert.match(guest,/ربما وصل الطلب بالفعل/);
 assert.match(guest,/Sipariş zaten alınmış olabilir/);
 assert.match(guest,/It may already have arrived/);
 assert.doesNotMatch(guest,/لم يُسجّل الطلب/);
});
