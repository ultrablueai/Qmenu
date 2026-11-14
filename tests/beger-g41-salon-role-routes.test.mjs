import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync("app/demo/salon/salon-role-demo.tsx","utf8");
const arrival=readFileSync("app/demo/salon/checkin/salon-checkin.tsx","utf8");
const landing=readFileSync("app/demo/salon/page.tsx","utf8");
const route=(role)=>readFileSync("app/demo/salon/"+role+"/page.tsx","utf8");
test("G41 role views have independent routes and customer-only booking UI",()=>{
 for(const role of ["customer","barber","owner"]){assert.match(route(role),new RegExp('role="'+role+'"'));assert.match(route(role),/index:false/);}
 assert.match(landing,/\/demo\/salon\/customer/);
 assert.match(landing,/\/demo\/salon\/owner/);
 assert.match(landing,/\/demo\/salon\/barber/);
 assert.match(ui,/role==="customer"/);
 assert.match(ui,/role==="owner"/);
 assert.match(ui,/role==="barber"/);
});
test("G41 appointment stages are explicit and owner and barber transitions separate",()=>{
 assert.match(ui,/pending:\["confirmed","cancelled"\]/);
 assert.match(ui,/confirmed:\["arrived","cancelled"\]/);
 assert.match(ui,/arrived:\["in_service","cancelled"\]/);
 assert.match(ui,/in_service:\["completed"\]/);
 assert.match(ui,/b\.state==="pending"\?<button/);
 assert.match(ui,/b\.state==="arrived"\?<button/);
 assert.match(ui,/b\.state==="in_service"\?<button/);
 assert.match(ui,/serviceIds:\[\.\.\.selected\]/);
 assert.match(ui,/slotFree\(/);
});
test("G41 arrival link requires an individual appointment token in confirmed state",()=>{
 assert.match(ui,/crypto\.randomUUID\(\)/);
 assert.match(ui,/checkin\?token=/);
 assert.match(arrival,/rows\.find\(b=>b\.token===token\)/);
 assert.match(arrival,/b\.token===record\.token&&b\.state==="confirmed"/);
 assert.match(arrival,/state:"arrived"/);
 assert.match(arrival,/جهاز/);
});
test("G41 timeline, local change events and opt-in browser notifications are explicit",()=>{
 assert.match(ui,/bs-role-timeline/);
 assert.match(ui,/window\.addEventListener\("storage"/);
 assert.match(ui,/Notification\.requestPermission\(\)/);
 assert.match(ui,/Notification\.permission==="granted"/);
 assert.match(ui,/new Notification\(/);
 assert.match(ui,/لا تدير مواعيد أو تنبيهات حقيقية/);
 assert.match(ui,/نفس المتصفح\/الجهاز/);
 assert.doesNotMatch(ui,/browserSupabase|supabase\.rpc|pushManager\.subscribe|navigator\.serviceWorker/);
});
