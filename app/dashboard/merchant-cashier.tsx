"use client";
import {useCallback,useEffect,useState} from "react";
import {BegerFeedbackControls,useBegerFeedback} from "../../components/beger-feedback";
import {StationAlertBell,useStationAlerts} from "../../components/beger-station-alerts";
import {DurableStationNotifications} from "../../components/beger-durable-station-notifications";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-cashier.css";
type Status="pending"|"accepted"|"preparing"|"ready"|"fulfilled";
type Payment="cash"|"external_card"|"external_transfer";
type Order={id:string;reference:string;table:string;status:Status;createdAt:string;paymentStatus:"paid"|"unpaid";paymentMethod:string|null;totalMinor:number;currency:string;items:{name:string;quantity:number}[]};
const statuses:Record<Status,string>={pending:"بانتظار قبول الطلب",accepted:"تم القبول",preparing:"قيد التحضير",ready:"جاهز للاستلام",fulfilled:"تم التسليم"};
const paymentNames:Record<Payment,string>={cash:"نقداً",external_card:"بطاقة عبر جهاز المحل",external_transfer:"تحويل خارجي"};
function money(value:number,currency:string){const div=currency==="TRY"?100:1;return new Intl.NumberFormat("ar",{maximumFractionDigits:div===100?2:0,minimumFractionDigits:div===100?2:0}).format(value/div)+" "+currency;}
export default function MerchantCashier({branchId,branchName}:{branchId:string;branchName:string}){
 const feedback=useBegerFeedback();
 const stationAlerts=useStationAlerts("cashier",branchId,feedback.signal);
 const [announcement,setAnnouncement]=useState("");
 const [orders,setOrders]=useState<Order[]>([]);
 const [methods,setMethods]=useState<Record<string,Payment>>({});
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [filter,setFilter]=useState<"active"|"complete">("active");
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g10_cashier_queue",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Queue unavailable");
  const fresh=data as Order[];
  stationAlerts.observe(fresh);

  setOrders(fresh);setLoaded(true);setError("");
 },[branchId,stationAlerts.observe]);
 useEffect(()=>{
  let active=true;setAnnouncement("");setOrders([]);setLoaded(false);setError("");setNotice("");setMethods({});
  const update=()=>{void refresh().catch(()=>{if(active)setError("تعذّر تحميل طلبات الكاشير. تحقق من صلاحية الفرع.")})};
  update();const timer=window.setInterval(update,8000);
  const onVisible=()=>{if(document.visibilityState==="visible")update()};
  const onFocus=()=>update();
  document.addEventListener("visibilitychange",onVisible);window.addEventListener("focus",onFocus);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);window.removeEventListener("focus",onFocus)};
 },[refresh]);
 async function action(order:Order,next:"accepted"|"fulfilled"){
  if(busy)return;setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g10_cashier_order_action",{p_order:order.id,p_next:next});
   if(error||data?.status!==next)throw Error("Action not confirmed");
   setOrders(old=>old.map(o=>o.id===order.id?{...o,status:next}:o));
   setNotice("تم تحديث الطلب "+order.reference+" إلى "+statuses[next]);
   try{await refresh()}catch{/* server transition confirmed */}
  }catch{setError("لم يُحدّث الطلب. ربما تغيّرت الحالة من جهاز آخر. حدّث القائمة.");}
  finally{setBusy(false)}
 }
 async function collect(order:Order){
  if(busy||order.paymentStatus==="paid")return;
  const method=methods[order.id]??"cash";
  if(!window.confirm("هل استلمت بالفعل "+money(order.totalMinor,order.currency)+" بواسطة "+paymentNames[method]+"؟ هذا تسجيل يدوي وليس تحصيلاً إلكترونياً."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g10_cashier_mark_collected",{p_order:order.id,p_method:method});
   if(error||data?.method!==method)throw Error("Collection not confirmed");
   setOrders(old=>old.map(o=>o.id===order.id?{...o,paymentStatus:"paid",paymentMethod:method}:o));
   setNotice("تم تسجيل المبلغ المستلم بالفعل للطلب "+order.reference);
   try{await refresh()}catch{/* server collection confirmed */}
  }catch{setError("تعذّر تسجيل التحصيل. تحقّق من سجل الطلب قبل إعادة المحاولة حتى لا يتكرر التسجيل.");}
  finally{setBusy(false)}
 }
 function announce(order:Order){
  const text="الطلب #"+order.reference+" جاهز للاستلام";
  setAnnouncement(text);feedback.signal("ready",text);
 }
 const active=orders.filter(o=>o.status!=="fulfilled");
 const complete=orders.filter(o=>o.status==="fulfilled");
 const visible=filter==="active"?active:complete;
 return <section className="beger-cashier" dir="rtl" aria-label="محطة الكاشير">
  <header><div><small>BEGER / CASHIER STATION</small><h2>محطة الكاشير</h2><p>{branchName} · قبول الطلبات وتسجيل الاستلام فقط، بدون إعدادات أو تسويات.</p></div><strong>{active.length} طلب نشط</strong></header>
  <BegerFeedbackControls settings={feedback.settings} onChange={feedback.change} onTest={()=>feedback.signal("ready","هذا اختبار تنبيه الجاهزية")} labels={{sound:"الصوت",vibration:"الاهتزاز",test:"تجربة النداء"}}/>
  <StationAlertBell alerts={stationAlerts.alerts} clear={stationAlerts.clear} actionable={orders.filter(o=>o.status==="pending"||o.status==="ready").length} label="الكاشير"/>
  <DurableStationNotifications branchId={branchId} station="cashier"/>
  {announcement?<p className="beger-cashier-announcement" role="status" aria-live="polite"><span aria-hidden="true">🔔</span><strong>{announcement}</strong><button type="button" onClick={()=>setAnnouncement("")} aria-label="إغلاق إعلان الطلب">إغلاق</button></p>:null}
  <nav aria-label="حالة الطلبات">
   <button type="button" aria-pressed={filter==="active"} onClick={()=>setFilter("active")}>الطلبات النشطة ({active.length})</button>
   <button type="button" aria-pressed={filter==="complete"} onClick={()=>setFilter("complete")}>المسلّمة ({complete.length})</button>
   <button type="button" disabled={busy} onClick={()=>void refresh().catch(()=>setError("تعذّر التحديث."))}>تحديث ↻</button>
  </nav>
  {notice?<p className="beger-cashier-success" role="status">{notice}</p>:null}
  {error?<p className="beger-cashier-error" role="alert">{error}</p>:null}
  {!loaded&&!error?<p role="status">جارٍ تحميل الطلبات…</p>:loaded&&visible.length===0?<p>لا توجد طلبات في هذا القسم.</p>:null}
  <div className="beger-cashier-grid">{visible.map(order=><article key={order.id}>
   <div className="beger-cashier-head"><div><strong>#{order.reference}</strong><small>{order.table} · {new Date(order.createdAt).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</small></div><span>{statuses[order.status]}</span></div>
   <div className="beger-cashier-products">{order.items.map((item,i)=><span key={i}>{item.quantity} × {item.name}</span>)}</div>
   <div className="beger-cashier-total"><span>مبلغ الطلب</span><strong dir="ltr">{money(order.totalMinor,order.currency)}</strong></div>
   {order.paymentStatus==="paid"?<p className="beger-cashier-paid">تم تسجيل الاستلام · {paymentNames[order.paymentMethod as Payment]??"طريقة خارجية"}</p>:<div className="beger-cashier-collect">
    <label>الطريقة التي استُلم بها المبلغ
     <select value={methods[order.id]??"cash"} onChange={event=>setMethods(v=>({...v,[order.id]:event.target.value as Payment}))}>
      {(["cash","external_card","external_transfer"] as const).map(method=><option key={method} value={method}>{paymentNames[method]}</option>)}
     </select>
    </label>
    <button type="button" disabled={busy} onClick={()=>void collect(order)}>تأكيد استلام المبلغ</button>
   </div>}
   {order.status==="pending"?<button type="button" disabled={busy} onClick={()=>void action(order,"accepted")}>قبول الطلب وإرساله للمطبخ</button>:null}
   {order.status==="ready"?<div className="beger-cashier-ready-actions"><button type="button" onClick={()=>announce(order)}>🔔 إعلان رقم الطلب</button><button type="button" disabled={busy} onClick={()=>void action(order,"fulfilled")}>تأكيد تسليم الطلب</button></div>:null}
  </article>)}</div>
  <p className="beger-cashier-footnote">Beger يسجّل ما يؤكده الموظف فقط. لا ينفذ خصماً بنكياً ولا يصدر فاتورة ضريبية أو تسوية.</p>
 </section>;
}
