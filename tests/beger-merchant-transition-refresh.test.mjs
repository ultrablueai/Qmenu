import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const board=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");

test("merchant board distinguishes confirmed server transition from failed subsequent refresh",()=>{
 assert.match(board,/if\(error\|\|data\?\.status!==status\)throw/);
 assert.match(board,/setOrders\(current=>current\.map\(item=>item\.id===order\.id\?\{\.\.\.item,status\}:item\)\)/);
 assert.match(board,/try\{await refresh\(\)\}catch\{setError\("تم تغيير حالة الطلب بنجاح/);
 assert.match(board,/تعذّر تحديث القائمة/);
 assert.match(board,/حدّث القائمة قبل إعادة المحاولة/);
 assert.doesNotMatch(board,/تعذّر تحديث الطلب\. لم تتغير حالته/);
});
test("merchant order transitions still use server-authoritative RPC and prevent duplicate clicks",()=>{
 assert.match(board,/if\(busy\)return/);
 assert.match(board,/setBusy\(true\)/);
 assert.match(board,/g3_transition_order/);
 assert.match(board,/finally\{setBusy\(false\)\}/);
 assert.match(board,/disabled=\{busy\}/);
});
