import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const booking=readFileSync("app/demo/salon/salon-role-demo.tsx","utf8");
const share=readFileSync("app/demo/salon/share/salon-share-kit.tsx","utf8");
test("G44 staff links select a staff member only from a known whitelist",()=>{
 assert.match(booking,/new URLSearchParams\(window\.location\.search\)\.get\("barber"\)/);
 assert.match(booking,/staff\.some\(s=>s\.id===requested\)/);
 assert.match(booking,/setBarber\(requested!\)/);
 assert.match(booking,/role==="customer"/);
});
test("G44 owner can share personal staff booking links separately from public QR",()=>{
 assert.match(share,/رابط خاص بكل معلم/);
 assert.match(share,/base\+"\?barber="\+encodeURIComponent\(person\.id\)/);
 assert.match(share,/source=staff/);
 assert.match(share,/كرسي \{person\.chair\}/);
 assert.match(share,/public/);
});
