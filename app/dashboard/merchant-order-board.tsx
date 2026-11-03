"use client";
import {useEffect,useRef,useState} from "react";
import {BegerFeedbackControls,useBegerFeedback} from "../../components/beger-feedback";
import {browserSupabase} from "../../lib/supabase/browser";
import {publicServiceSignal,publicSignalLabels} from "../../lib/beger-service-workflows";
import {printOrderTicket} from "../../lib/beger-print-ticket";
import "./merchant-order-board.css";
type Status="pending"|"accepted"|"preparing"|"ready"|"fulfilled"|"rejected";
type Item={name:string;quantity:number;selections:{options?:{name_ar?:string}[];removedIngredients?:string[]}};
type Order={id:string;table:string;serviceMode?:"dine_in"|"takeaway";paymentStatus?:"unpaid"|"paid";paymentMethod?:string|null;status:Status;totalMinor:number;currency:string;createdAt:string;items:Item[]};
const titles:Record<Status,string>={pending:"بانتظار الموافقة",accepted:"تم قبول الطلب",preparing:"قيد التحضير",ready:"جاهز للتسليم",fulfilled:"تم التسليم",rejected:"مرفوض"};
function formatOrderTotal(minor:number,currency:string){const factor=currency==="TRY"?100:1;return new Intl.NumberFormat("ar",{minimumFractionDigits:currency==="TRY"?2:0,maximumFractionDigits:currency==="TRY"?2:0}).format(minor/factor)+" "+currency;}
function orderReference(id:string){return id.replace(/-/g,"").slice(0,10).toUpperCase();}
const next:Partial<Record<Status,{value:Status;label:string}>>={pending:{value:"accepted",label:"قبول الطلب"},accepted:{value:"preparing",label:"إرسال للمطبخ"},preparing:{value:"ready",label:"جاهز للتسليم"},ready:{value:"fulfilled",label:"تأكيد التسليم"}};
export default function MerchantOrderBoard({businessId,branchId,branchName}:{businessId:string;branchId:string;branchName:string}){
 const feedback=useBegerFeedback();
 const seen=useRef<Set<string>|null>(null);
 const [collectionMethods,setCollectionMethods]=useState<Record<string,string>>({});
 const [enabled,setEnabled]=useState(false),[pickupEnabled,setPickupEnabled]=useState(false),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 async function refresh(){
  const db=browserSupabase();
  const [cap,list]=await Promise.all([
   db.from("g3_branch_order_settings").select("enabled,pickup_enabled").eq("branch_id",branchId).eq("business_id",businessId).maybeSingle(),
   db.rpc("g3_branch_orders",{p_branch:branchId})
  ]);
  if(cap.error)throw cap.error;
  if(list.error)throw list.error;
  setEnabled(cap.data?.enabled===true);setPickupEnabled(cap.data?.pickup_enabled===true);
  const fresh=Array.isArray(list.data)?list.data as Order[]:[];
  const currentIds=new Set(fresh.map(o=>o.id));
  if(seen.current!==null){const unseen=fresh.filter(o=>o.status==="pending"&&!seen.current!.has(o.id));if(unseen.length)feedback.signal("new-order",unseen.length===1?"طلب جديد من "+unseen[0].table:"وصل "+unseen.length+" طلبات جديدة");}
  seen.current=currentIds;
  setOrders(fresh);
  setError("");
  setLoaded(true);
 }
 useEffect(()=>{let live=true;seen.current=null;setLoaded(false);const reload=()=>{void refresh().catch(()=>{if(live)setError("تعذّر تحميل الطلبات؛ تأكد من تسجيل الدخول وصلاحية الإدارة.")})};reload();const timer=window.setInterval(reload,7000);const onVisible=()=>{if(document.visibilityState==="visible")reload();};document.addEventListener("visibilitychange",onVisible);return()=>{live=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible)}},[branchId,businessId]);
 async function toggle(){
  if(busy||!confirm(enabled?"إيقاف استقبال طلبات QR الجديدة لهذا الفرع؟ الطلبات السابقة ستبقى محفوظة.":"تفعيل استقبال طلبات الطاولات على نسخة Staging؟ هذا يعني إمكانية إرسال طلبات اختبار حقيقية إلى هذه اللوحة."))return;
  setBusy(true);setError("");setNotice("");
  try{const {data,error}=await browserSupabase().from("g3_branch_order_settings").upsert({branch_id:branchId,business_id:businessId,enabled:!enabled,updated_at:new Date().toISOString()},{onConflict:"branch_id"}).select("enabled").single();if(error||!data)throw error??Error("No updated record");setEnabled(data.enabled);setNotice(data.enabled?"استقبال الطلبات التجريبية مفعّل لهذا الفرع.":"تم إيقاف استقبال الطلبات الجديدة.")}catch{setError("لم يتغير إعداد استقبال الطلبات. تحقق من صلاحياتك.")}finally{setBusy(false)}
 }
 async function togglePickup(){
  if(busy||!confirm(pickupEnabled?"إيقاف استقبال طلبات السفري لهذا الفرع؟ ستبقى الطلبات السابقة محفوظة.":"تفعيل طلبات السفري التجريبية لهذا الفرع؟ ستظهر الطلبات في لوحة المطبخ وتتطلب موافقتك."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().from("g3_branch_order_settings").upsert({branch_id:branchId,business_id:businessId,pickup_enabled:!pickupEnabled,updated_at:new Date().toISOString()},{onConflict:"branch_id"}).select("pickup_enabled").single();
   if(error||!data)throw error??Error("No updated setting");
   setPickupEnabled(data.pickup_enabled===true);
   setNotice(data.pickup_enabled?"تم تفعيل استقبال طلبات السفري التجريبية.":"تم إيقاف طلبات السفري الجديدة.");
  }catch{setError("لم يتغير إعداد طلبات السفري. تأكد من صلاحيات الإدارة.")}
  finally{setBusy(false)}
 }
 async function recordPayment(order:Order){
  if(busy||order.paymentStatus==="paid")return;
  const method=collectionMethods[order.id]??"cash";
  const methodLabel=method==="cash"?"نقداً":method==="external_card"?"بطاقة على جهاز التاجر":"تحويل خارجي";
  if(!confirm("تأكيد استلام كامل المبلغ "+formatOrderTotal(order.totalMinor,order.currency)+" عبر "+methodLabel+"؟ هذا لا يجري أي خصم إلكتروني."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g3_record_external_payment",{p_order:order.id,p_method:method});
   if(error||data?.paymentStatus!=="paid")throw error??Error("Collection not confirmed");
   setOrders(current=>current.map(item=>item.id===order.id?{...item,paymentStatus:"paid",paymentMethod:method}:item));
   setNotice("تم تسجيل تحصيل الطلب #"+orderReference(order.id)+" لدى التاجر. العملية ليست دفعاً إلكترونياً عبر Beger.");
   try{await refresh()}catch{setError("تم تسجيل التحصيل لكن فشل تحديث القائمة. حدّث الطلبات للتحقق.");}
  }catch{setError("تعذّر تأكيد تسجيل التحصيل. حدّث الطلبات أولاً قبل إعادة المحاولة.")}
  finally{setBusy(false)}
 }
 async function transition(order:Order,status:Status){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g3_transition_order",{p_order:order.id,p_next:status});
   if(error||data?.status!==status)throw error??Error("Update not confirmed");
   // Server has confirmed the transition; a later refresh failure must never tell staff it was undone.
   setOrders(current=>current.map(item=>item.id===order.id?{...item,status}:item));
   setNotice("تم تحديث طلب #"+orderReference(order.id)+" من "+order.table+" إلى "+titles[status]);
   feedback.signal(status==="accepted"?"accepted":status==="preparing"?"preparing":status==="ready"?"ready":status==="fulfilled"?"fulfilled":"rejected","تم تحديث طلب #"+orderReference(order.id)+" إلى "+titles[status]);
   try{await refresh()}catch{setError("تم تغيير حالة الطلب بنجاح، لكن تعذّر تحديث القائمة. أعد تحميل الطلبات للتحقق من أحدث البيانات.");}
  }catch{setError("تعذّر تأكيد تغيير حالة الطلب. حدّث القائمة قبل إعادة المحاولة لتجنّب إجراء مكرر.");}
  finally{setBusy(false)}
 }
 return <section id="beger-merchant-orders" className="beger-order-board" dir="rtl" aria-label="إدارة طلبات الطاولات">
  <header className="beger-order-board-header"><div><span>BEGER · G3 PILOT</span><h2>طلبات الطاولات والمطبخ</h2><p>{branchName} · استقبال الطلب ← موافقة المطعم ← التحضير ← الجاهزية</p></div><div><span className={enabled?"beger-order-enabled":"beger-order-disabled"}>{enabled?"● طلبات الطاولات مفعّلة":"○ طلبات الطاولات متوقفة"}</span><button type="button" disabled={busy||!loaded} onClick={()=>void toggle()}>{enabled?"إيقاف طلبات الطاولات":"تفعيل طلبات الطاولات"}</button><span className={pickupEnabled?"beger-order-enabled":"beger-order-disabled"}>{pickupEnabled?"● طلبات السفري مفعّلة":"○ طلبات السفري متوقفة"}</span><button type="button" disabled={busy||!loaded} onClick={()=>void togglePickup()}>{pickupEnabled?"إيقاف استقبال السفري":"تفعيل استقبال السفري"}</button></div></header>
  <BegerFeedbackControls settings={feedback.settings} onChange={feedback.change} onTest={()=>feedback.signal("new-order","هذا تنبيه اختبار، وليس طلباً جديداً")}/>
  {feedback.message?<p role="status" className="beger-feedback-toast">{feedback.message}</p>:null}
  {error?<p role="alert" className="beger-order-board-error">{error}</p>:null}
  {notice?<p role="status" className="beger-order-board-notice">{notice}</p>:null}
  {!loaded?<p role="status">جارٍ تحميل حالة الطلبات...</p>:null}
  <div className="beger-order-board-controls"><button type="button" disabled={busy} onClick={()=>void refresh().catch(()=>setError("تعذّر تحديث الطلبات. تحقق من الاتصال والصلاحية."))}>تحديث الطلبات الآن ↻</button><span>تُحدَّث الطلبات تلقائياً كل 7 ثوانٍ</span></div>
  <div className="beger-order-board-columns">{(["pending","accepted","preparing","ready"] as const).map(stage=><section key={stage} className="beger-order-board-column" aria-label={titles[stage]}>
    <h3>{titles[stage]} <span>{orders.filter(o=>o.status===stage).length}</span></h3>
    {orders.filter(o=>o.status===stage).map(o=><article className="beger-order-ticket" key={o.id}>
      <div className="beger-order-ticket-head"><strong>⌗ {o.serviceMode==="takeaway"?"سفري · استلام من المحل":o.table}</strong><span className="beger-order-reference" aria-label={"رقم الطلب "+orderReference(o.id)}>طلب #{orderReference(o.id)}</span><time dateTime={o.createdAt}>{new Date(o.createdAt).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</time></div>
      <ul>{o.items.map((item,index)=><li key={index}><strong>{item.quantity}× {item.name}</strong><small>{(item.selections?.options??[]).map(opt=>opt.name_ar).filter(Boolean).join(" · ")}{(item.selections?.removedIngredients??[]).length?" · بدون "+(item.selections?.removedIngredients??[]).join("، "):""}</small></li>)}</ul>
      <div className="beger-order-ticket-price">{formatOrderTotal(o.totalMinor,o.currency)}</div>
      <div className="beger-order-payment" aria-label="حالة تحصيل الطلب">
       <strong className={o.paymentStatus==="paid"?"is-paid":"is-unpaid"}>{o.paymentStatus==="paid"?"✓ تم تسجيل التحصيل":"◯ لم يُسجّل التحصيل"}</strong>
       {o.paymentStatus==="paid"?<small>{o.paymentMethod==="cash"?"نقداً":o.paymentMethod==="external_card"?"بطاقة التاجر":o.paymentMethod==="external_transfer"?"تحويل خارجي":""}</small>:<div className="beger-order-payment-actions">
        <label htmlFor={"collection-"+o.id}>طريقة التحصيل</label>
        <select id={"collection-"+o.id} disabled={busy} value={collectionMethods[o.id]??"cash"} onChange={event=>setCollectionMethods(current=>({...current,[o.id]:event.target.value}))}>
         <option value="cash">نقداً</option><option value="external_card">بطاقة على جهاز التاجر</option><option value="external_transfer">تحويل خارجي</option>
        </select>
        <button type="button" disabled={busy} onClick={()=>void recordPayment(o)}>تأكيد المبلغ المستلم</button>
       </div>}
      </div>
      <div className="beger-order-ticket-print" role="group" aria-label={"طباعة مستندات الطلب "+orderReference(o.id)}>
       <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"kitchen"))setError("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة للموقع.")}}>طباعة المطبخ</button>
       <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"pickup"))setError("المتصفح منع نافذة الطباعة.")}}>ملصق الاستلام</button>
       <button type="button" onClick={()=>{if(!printOrderTicket(o,branchName,"summary"))setError("المتصفح منع نافذة الطباعة.")}}>كشف حساب داخلي</button>
      </div>
      <div className="beger-order-pager-signal" aria-label="حالة المتابعة العامة">متابعة الزبون: {publicSignalLabels[publicServiceSignal("table_order",o.status)].ar}</div>
      {next[o.status]?<button disabled={busy} type="button" onClick={()=>void transition(o,next[o.status]!.value)}>{next[o.status]!.label}</button>:null}
      {(o.status==="pending"||o.status==="accepted")?<button className="beger-order-reject" disabled={busy} type="button" onClick={()=>{if(confirm("رفض الطلب؟ سيتم إبلاغ الزبون بحالة الرفض."))void transition(o,"rejected")}}>رفض الطلب</button>:null}
    </article>)}
    {!orders.some(o=>o.status===stage)?<p className="beger-order-board-empty">لا توجد طلبات بهذه الحالة</p>:null}
   </section>)}</div>
 </section>;
}
