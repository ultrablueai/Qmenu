import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync("components/beger-feedback.tsx","utf8");

test("urgent order and pager alerts use three full audio and vibration repetitions",()=>{
 assert.match(source,/repeatedAlerts=new Set<FeedbackKind>\(\["new-order","accepted","preparing","ready","rejected","fulfilled"\]\)/);
 assert.match(source,/repeatedAlerts\.has\(kind\)\?3:1/);
 assert.match(source,/for\(let cycle=0;cycle<repeatCount\(kind\);cycle\+\+\)/);
 assert.match(source,/cycle\*pulseLength\+i\*step/);
 assert.match(source,/sequence\.push\(220\)/);
 assert.match(source,/navigator\.vibrate\(vibrationSequence\(kind\)\)/);
});
test("sound and vibration remain opt-in and lightweight add-to-cart remains single pulse",()=>{
 assert.match(source,/const DEFAULT:FeedbackSettings=\{sound:false,vibration:false\}/);
 assert.match(source,/if\(current\.sound\)play\(kind\)/);
 assert.match(source,/if\(current\.vibration&&typeof navigator/);
 assert.doesNotMatch(source,/repeatedAlerts=new Set<FeedbackKind>\(\[[^\]]*"added"/);
 assert.match(source,/if\(!ctx\|\|ctx\.state!=="running"\)return/);
});
