import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const watcher=readFileSync("components/guest-order-watcher.tsx","utf8");
const cart=readFileSync("components/guest-cart.tsx","utf8");
const submit=readFileSync("components/guest-order-submission.tsx","utf8");
const css=readFileSync("components/public-menu.css","utf8");

test("guest order watcher is always mounted outside the conditional cart and home/menu/rewards screens",()=>{
 assert.match(cart,/<GuestOrderWatcher branchId=\{branchId\} tableToken=\{tableToken\} lang=\{lang\} openCart=\{\(\)=>setOpen\(true\)\}/);
 assert.ok(cart.indexOf("<GuestOrderWatcher")<cart.indexOf("{open?<div className=\"beger-basket-overlay\""));
 assert.match(watcher,/Lives at storefront level, outside the cart dialog/);
 assert.match(watcher,/beger-g3-pickup-order:/);
 assert.match(watcher,/beger-g3-order:/);
});
test("order watcher polls independently, refreshes on returning to the app and after successful submission",()=>{
 assert.match(watcher,/window\.setInterval\(\(\)=>\{void check\(\);\},7000\)/);
 assert.match(watcher,/document\.addEventListener\("visibilitychange",onVisible\)/);
 assert.match(watcher,/document\.removeEventListener\("visibilitychange",onVisible\)/);
 assert.match(watcher,/window\.addEventListener\("beger-order-tracking-start",onTrackingStart\)/);
 assert.match(watcher,/window\.removeEventListener\("beger-order-tracking-start",onTrackingStart\)/);
 assert.match(submit,/window\.dispatchEvent\(new Event\("beger-order-tracking-start"\)\)/);
});
test("status transitions trigger exactly one in-page notification and retain state across page reload",()=>{
 assert.match(watcher,/last&&last!==status/);
 assert.match(watcher,/sessionStorage\.setItem\(rememberedKey,status\)/);
 assert.match(watcher,/feedback\.signal\(kind,display\)/);
 assert.match(watcher,/className="beger-order-watcher-alert" role="alert"/);
 assert.match(watcher,/className="beger-order-watcher-chip"/);
 assert.match(watcher,/onClick=\{openCart\}/);
 assert.doesNotMatch(submit,/feedback\.signal\(kind,t\[next\]\)/);
 assert.match(css,/Persistent customer pager alerts remain visible across home, menu and basket screens/);
});
