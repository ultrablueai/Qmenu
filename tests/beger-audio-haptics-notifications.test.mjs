import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const feedback=read("components/beger-feedback.tsx");
const merchant=read("app/dashboard/merchant-order-board.tsx");
const guest=read("components/guest-order-submission.tsx");
const basket=read("components/guest-cart.tsx");
const guestCss=read("components/public-menu.css");
const merchantCss=read("app/dashboard/merchant-order-board.css");
test("sound and vibration are opt-in and use no external audio dependency or permission request",()=>{
 assert.match(feedback,/const DEFAULT:FeedbackSettings=\{sound:false,vibration:false\}/);
 assert.match(feedback,/new C\(\)/);
 assert.match(feedback,/oscillator\.type="sine"/);
 assert.match(feedback,/navigator\.vibrate\(patterns\[kind\]\)/);
 assert.match(feedback,/ctx\.state!=="running"\)return/);
 assert.doesNotMatch(feedback,/Notification\.requestPermission|new Notification\(|pushManager|fetch\(|https?:\/\//);
 assert.match(feedback,/onChange=\{e=>onChange\(\{\.\.\.settings,sound:e\.target\.checked\}\)\}/);
 assert.match(feedback,/onChange=\{e=>onChange\(\{\.\.\.settings,vibration:e\.target\.checked\}\)\}/);
});
test("feedback preferences persist locally and synchronize across guest modules",()=>{
 assert.match(feedback,/beger-feedback-prefs-v1/);
 assert.match(feedback,/window\.dispatchEvent\(new Event\("beger-feedback-change"\)\)/);
 assert.match(feedback,/window\.addEventListener\("storage",read\)/);
 assert.match(feedback,/window\.removeEventListener\("beger-feedback-change",read\)/);
 assert.match(feedback,/ctx\.resume\(\)/);
});
test("merchant alerts only for genuinely new pending orders, not preexisting tickets on first load",()=>{
 assert.match(merchant,/seen=useRef<Set<string>\|null>\(null\)/);
 assert.match(merchant,/if\(seen\.current!==null\)/);
 assert.match(merchant,/o\.status==="pending"&&!seen\.current!\.has\(o\.id\)/);
 assert.match(merchant,/seen\.current=currentIds/);
 assert.match(merchant,/feedback\.signal\("new-order"/);
 assert.match(merchant,/<BegerFeedbackControls/);
 assert.match(merchant,/feedback\.signal\(status==="accepted"/);
});
test("guest order tracker responds to server-confirmed transition, not speculative status",()=>{
 assert.match(guest,/lastStatusRef\.current&&lastStatusRef\.current!==next/);
 assert.match(guest,/feedback\.signal\(kind,t\[next\]\)/);
 assert.match(guest,/feedback\.signal\("sent",t\.success\)/);
 assert.match(guest,/BegerFeedbackControls settings=\{feedback\.settings\}/);
 assert.match(basket,/feedback\.signal\("added"/);
 assert.match(basket,/feedback\.message\?<p className="beger-feedback-toast"/);
});
test("subtle UI animation honors operating system reduced motion preference",()=>{
 assert.match(guestCss,/@keyframes beger-product-enter/);
 assert.match(guestCss,/@keyframes beger-basket-enter/);
 assert.match(guestCss,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(merchantCss,/@keyframes beger-ticket-appear/);
 assert.match(merchantCss,/@media\(prefers-reduced-motion:reduce\)/);
});
