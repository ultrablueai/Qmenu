import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261108020000_g23_durable_station_notifications.sql","utf8");
const inbox=readFileSync("components/beger-durable-station-notifications.tsx","utf8");
const paths=["app/dashboard/merchant-order-board.tsx","app/dashboard/merchant-cashier.tsx","app/dashboard/merchant-kitchen.tsx"];
test("G23 notifications are atomically emitted on create/status change with idempotent status-station keys",()=>{
 assert.match(sql,/after insert or update of status on public\.g3_orders/);
 assert.match(sql,/new\.status is distinct from old\.status/);
 assert.match(sql,/unique\(order_id,status,station\)/);
 assert.match(sql,/on conflict\(order_id,status,station\) do nothing/g);
 for(const state of ["pending","accepted","ready","rejected"])assert.ok(sql.includes("new.status='"+state+"'"));
 assert.match(sql,/values\(new\.id,new\.business_id,new\.branch_id,'pending','merchant'\),\s*\(new\.id,new\.business_id,new\.branch_id,'pending','cashier'\)/);
 assert.match(sql,/values\(new\.id,new\.business_id,new\.branch_id,'accepted','kitchen'\)/);
});
test("G23 authorization is role-specific, branch-tenant scoped and denies direct table access",()=>{
 for(const table of ["g23_order_notifications","g23_notification_reads"]){
  assert.ok(sql.includes("alter table public."+table+" enable row level security"));
  assert.ok(sql.includes("revoke all on public."+table+" from public,anon,authenticated"));
 }
 assert.match(sql,/join public\.memberships m on m\.business_id=b\.business_id and m\.user_id=auth\.uid\(\)/);
 assert.match(sql,/m\.role in \('owner','manager'\)/);
 assert.match(sql,/m\.role='staff' and p_station='cashier'/);
 assert.match(sql,/m\.role='staff' and p_station='kitchen'/);
 assert.doesNotMatch(sql,/m\.role='staff' and p_station='merchant'/);
 for(const fn of ["g23_branch_notifications(uuid,text)","g23_mark_notification_read(uuid)"]){
  assert.ok(sql.includes("revoke all on function public."+fn+" from public,anon,authenticated;"));
  assert.ok(sql.includes("grant execute on function public."+fn+" to authenticated;"));
 }
 assert.match(sql,/left join public\.g23_notification_reads r on r\.notification_id=n\.id and r\.user_id=auth\.uid\(\)/);
 assert.match(sql,/on conflict\(notification_id,user_id\) do nothing/);
});
test("G23 limits durable feed to recent events, no payments, no browser tokens or false push claims",()=>{
 assert.match(sql,/created_at>=now\(\)-interval '7 days'/);
 assert.match(sql,/limit 60/);
 assert.match(inbox,/g23_branch_notifications/);
 assert.match(inbox,/g23_mark_notification_read/);
 assert.match(inbox,/لا يغيّر حالة الطلب ولا يرسل إشعاراً للهاتف المغلق/);
 assert.match(inbox,/document\.addEventListener\("visibilitychange",onVisible\)/);
 assert.doesNotMatch(inbox,/service_role|Notification\.requestPermission|serviceWorker\.register|PushManager/);
});
test("G23 is visible inside existing authorized merchant cashier kitchen workstations",()=>{
 for(const [i,path] of paths.entries()){
  const page=readFileSync(path,"utf8");
  const station=["merchant","cashier","kitchen"][i];
  assert.ok(page.includes('<DurableStationNotifications branchId={branchId} station="'+station+'"/>'));
  assert.match(page,/useStationAlerts/);
 }
});
