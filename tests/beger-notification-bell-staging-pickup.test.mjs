import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const feedback=readFileSync("components/beger-feedback.tsx","utf8");
const css=readFileSync("components/public-menu.css","utf8");
const cart=readFileSync("components/guest-cart.tsx","utf8");
const submit=readFileSync("components/guest-order-submission.tsx","utf8");

test("notifications appear as a compact accessible bell, settings open on demand",()=>{
 assert.match(feedback,/<details className="beger-feedback-panel">/);
 assert.match(feedback,/<summary className="beger-feedback-summary" aria-label=\{heading\}>/);
 assert.match(feedback,/className="beger-feedback-bell"/);
 assert.match(feedback,/<fieldset className="beger-feedback-controls">/);
 assert.match(feedback,/checked=\{settings\.sound\}/);
 assert.match(feedback,/checked=\{settings\.vibration\}/);
 assert.match(feedback,/onTest\?<button type="button" className="beger-feedback-test"/);
 assert.match(css,/\.beger-feedback-panel\[open\] \.beger-feedback-chevron/);
 assert.match(css,/\.beger-feedback-summary:focus-visible/);
});
test("bell is in-page only, retains opt-in sound and haptics and the three-pulse ready alert",()=>{
 assert.match(feedback,/Never requests OS notification permission or background push/);
 assert.match(feedback,/repeatedAlerts\.has\(kind\)\?3:1/);
 assert.match(feedback,/const DEFAULT:FeedbackSettings=\{sound:false,vibration:false\}/);
 assert.doesNotMatch(feedback,/Notification\.requestPermission\(/);
});
test("takeaway ordering is a server-checked feature, and cart no longer falsely calls it preview-only",()=>{
 assert.match(submit,/g3_pickup_order_enabled/);
 assert.match(submit,/g3_submit_pickup_order/);
 assert.match(submit,/enabled&&\(tableToken\|\|isTakeaway\)/);
 assert.match(cart,/PAKET · TEST/);
 assert.match(cart,/سفري · تجريبي/);
 assert.doesNotMatch(cart,/PAKET · ÖNİZLEME/);
});
