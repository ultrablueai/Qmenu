import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const cart=readFileSync("components/guest-cart.tsx","utf8");
const sql=readFileSync("supabase/migrations/20261102195000_g3_pilot_table_orders.sql","utf8");

test("basket never exceeds the 20 distinct products supported by session restoration",()=>{
 assert.match(cart,/parsed\.length<=20/);
 assert.match(sql,/v_item_count>20/);
 assert.match(cart,/items\.length>=20&&!items\.some\(x=>x\.key===item\.key\)/);
 assert.match(cart,/existing\.length>=20\?existing:\[\.\.\.existing,\{\.\.\.item,quantity\}\]/);
});
test("full basket tells users in all supported languages and still permits incrementing an existing item",()=>{
 assert.match(cart,/السلة ممتلئة/);
 assert.match(cart,/Sepet dolu/);
 assert.match(cart,/Basket is full/);
 assert.match(cart,/existing\.findIndex\(x=>x\.key===item\.key\)/);
 assert.match(cart,/Math\.min\(20,x\.quantity\+quantity\)/);
});
