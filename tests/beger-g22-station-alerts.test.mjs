import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const engine=readFileSync("lib/beger-station-alerts.ts","utf8");
const bell=readFileSync("components/beger-station-alerts.tsx","utf8");
const owner=readFileSync("app/dashboard/merchant-order-board.tsx","utf8");
const cashier=readFileSync("app/dashboard/merchant-cashier.tsx","utf8");
const kitchen=readFileSync("app/dashboard/merchant-kitchen.tsx","utf8");

test("G22 creates per-branch station notification snapshots, never arbitrary background pushes",()=>{
 assert.match(engine,/beger-station-alerts-v1:/);
 assert.match(engine,/export function reconcileStationMemory/);
 assert.match(engine,/if\(previous!==null&&label&&prior!==order.status\)/);
 assert.match(engine,/if\(!previous\.alerts\.some\(a=>a\.key===key\)\)/);
 assert.match(engine,/maxSeen=250/);
 assert.match(engine,/maxAlerts=30/);
 assert.match(engine,/cashier:\{pending:/);
 assert.match(engine,/ready:"طلب جاهز للاستلام"/);
 assert.match(engine,/kitchen:\{accepted:/);
 assert.match(bell,/sessionStorage\.setItem\(key,JSON\.stringify\(next\)\)/);
 assert.doesNotMatch(bell,/Notification\.requestPermission|serviceWorker\.register|PushManager/);
});
test("G22 merchant, cashier and kitchen have bell counters and station status polling",()=>{
 for(const [page,role] of [[owner,"merchant"],[cashier,"cashier"],[kitchen,"kitchen"]]){
  assert.ok(page.includes('useStationAlerts("'+role+'",branchId,feedback.signal)'),role);
  assert.match(page,/<StationAlertBell alerts=\{stationAlerts\.alerts\} clear=\{stationAlerts\.clear\}/);
  assert.match(page,/stationAlerts\.observe\(/);
 }
 assert.match(kitchen,/BegerFeedbackControls settings=\{feedback\.settings\}/);
 assert.match(kitchen,/onTest=\{\(\)=>feedback\.signal\("accepted"/);
 assert.match(cashier,/document\.addEventListener\("visibilitychange",onVisible\)/);
 assert.match(cashier,/window\.addEventListener\("focus",onFocus\)/);
 assert.match(kitchen,/document\.addEventListener\("visibilitychange",onVisible\)/);
 assert.match(kitchen,/window\.addEventListener\("focus",onFocus\)/);
 assert.match(owner,/document\.addEventListener\("visibilitychange",onVisible\)/);
});
test("G22 explains browser-only notification limitations and supports dismissal",()=>{
 assert.match(bell,/لا توجد إشعارات هاتف خارج المتصفح/);
 assert.match(bell,/مسح سجل التنبيهات المعروض/);
 assert.match(bell,/aria-expanded=\{open\}/);
 assert.match(bell,/تحتاج إجراء: \{actionable\}/);
 assert.match(bell,/sessionStorage\.getItem\(key\)/);
 assert.match(bell,/signal\(type,msg\)/);
});
