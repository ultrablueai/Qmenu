"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-order-board.css";
type Status="pending"|"accepted"|"preparing"|"ready"|"fulfilled"|"rejected";
type Item={name:string;quantity:number;selections:{options?:{name_ar?:string}[];removedIngredients?:string[]}};
type Order={id:string;table:string;status:Status;totalMinor:number;currency:string;createdAt:string;items:Item[]};
const titles:Record<Status,string>={pending:"بانتظار الموافقة",accepted:"تم قبول الطلب",preparing:"قيد التحضير",ready:"جاهز للتسليم",fulfilled:"تم التسليم",rejected:"مرفوض"};
function formatOrderTotal(minor:number,currency:string){const factor=currency==="TRY"?100:1;return new Intl.NumberFormat("ar",{minimumFractionDigits:currency==="TRY"?2:0,maximumFractionDigits:currency==="TRY"?2:0}).format(minor/factor)+" "+currency;}
function orderReference(id:string){return id.replace(/-/g,"").slice(0,8).toUpperCase();}
const next:Partial<Record<Status,{value:Status;label:string}>>={pending:{value:"accepted",label:"قبول الطلب"},accepted:{value:"preparing",label:"إرسال للمطبخ"},preparing:{value:"ready",label:"جاهز للتسليم"},ready:{value:"fulfilled",label:"تأكيد التسليم"}};
export default function MerchantOrderBoard({businessId,branchId,branchName}:{businessId:string;branchId:string;branchName:string}){
 const [enabled,setEnabled]=useState(false),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 async function refresh(){
  const db=browserSupabase();
  const [cap,list]=await Promise.all([
   db.from("g3_branch_order_settings").select("enabled").eq("branch_id",branchId).eq("business_id",businessId).maybeSingle(),
   db.rpc("g3_branch_orders",{p_branch:branchId})
  ]);
  if(cap.error)throw cap.error;
  if(list.error)throw list.error;
  setEnabled(cap.data?.enabled===true);
  setOrders(Array.isArray(list.data)?list.data as Order[]:[]);
  setError("");
  setLoaded(true);
 }
 useEffect(()=>{let live=true;setLoaded(false);const reload=()=>{void refresh().catch(()=>{if(live)setError("تعذّر تحميل الطلبات؛ تأكد من تسجيل الدخول وصلاحية الإدارة.")})};reload();const timer=window.setInterval(reload,7000);return()=>{live=false;window.clearInterval(timer)}},[branchId,businessId]);
 async function toggle(){
  if(busy||!confirm(enabled?"إيقاف استقبال طلبات QR الجديدة لهذا الفرع؟ الطلبات السابقة ستبقى محفوظة.":"تفعيل استقبال طلبات الطاولات على نسخة Staging؟ هذا يعني إمكانية إرسال طلبات اختبار حقيقية إلى هذه اللوحة."))return;
  setBusy(true);setError("");setNotice("");
  try{const {data,error}=await browserSupabase().from("g3_branch_order_settings").upsert({branch_id:branchId,business_id:businessId,enabled:!enabled,updated_at:new Date().toISOString()},{onConflict:"branch_id"}).select("enabled").single();if(error||!data)throw error??Error("No updated record");setEnabled(data.enabled);setNotice(data.enabled?"استقبال الطلبات التجريبية مفعّل لهذا الفرع.":"تم إيقاف استقبال الطلبات الجديدة.")}catch{setError("لم يتغير إعداد استقبال الطلبات. تحقق من صلاحياتك.")}finally{setBusy(false)}
 }
 async function transition(order:Order,status:Status){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{const {data,error}=await browserSupabase().rpc("g3_transition_order",{p_order:order.id,p_next:status});if(error||data?.status!==status)throw error??Error("Update not confirmed");await refresh();setNotice("تم تحديث طلب #"+orderReference(order.id)+" من "+order.table+" إلى "+titles[status])}catch{setError("تعذّر تحديث الطلب. لم تتغير حالته.")}finally{setBusy(false)}
 }
 return <section id="beger-merchant-orders" className="beger-order-board" dir="rtl" aria-label="إدارة طلبات الطاولات">
  <header className="beger-order-board-header"><div><span>BEGER · G3 PILOT</span><h2>طلبات الطاولات والمطبخ</h2><p>{branchName} · استقبال الطلب ← موافقة المطعم ← التحضير ← الجاهزية</p></div><div><span className={enabled?"beger-order-enabled":"beger-order-disabled"}>{enabled?"● استقبال الطلبات مفعّل":"○ استقبال الطلبات متوقف"}</span><button type="button" disabled={busy||!loaded} onClick={()=>void toggle()}>{enabled?"إيقاف استقبال الطلبات":"تفعيل استقبال الطلبات"}</button></div></header>
  {error?<p role="alert" className="beger-order-board-error">{error}</p>:null}
  {notice?<p role="status" className="beger-order-board-notice">{notice}</p>:null}
  {!loaded?<p role="status">جارٍ تحميل حالة الطلبات...</p>:null}
  <div className="beger-order-board-controls"><button type="button" disabled={busy} onClick={()=>void refresh().catch(()=>setError("تعذّر تحديث الطلبات. تحقق من الاتصال والصلاحية."))}>تحديث الطلبات الآن ↻</button><span>تُحدَّث الطلبات تلقائياً كل 7 ثوانٍ</span></div>
  <div className="beger-order-board-columns">{(["pending","accepted","preparing","ready"] as const).map(stage=><section key={stage} className="beger-order-board-column" aria-label={titles[stage]}>
    <h3>{titles[stage]} <span>{orders.filter(o=>o.status===stage).length}</span></h3>
    {orders.filter(o=>o.status===stage).map(o=><article className="beger-order-ticket" key={o.id}>
      <div className="beger-order-ticket-head"><strong>⌗ {o.table}</strong><span className="beger-order-reference" aria-label={"رقم الطلب "+orderReference(o.id)}>طلب #{orderReference(o.id)}</span><time dateTime={o.createdAt}>{new Date(o.createdAt).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</time></div>
      <ul>{o.items.map((item,index)=><li key={index}><strong>{item.quantity}× {item.name}</strong><small>{(item.selections?.options??[]).map(opt=>opt.name_ar).filter(Boolean).join(" · ")}{(item.selections?.removedIngredients??[]).length?" · بدون "+(item.selections?.removedIngredients??[]).join("، "):""}</small></li>)}</ul>
      <div className="beger-order-ticket-price">{formatOrderTotal(o.totalMinor,o.currency)}</div>
      {next[o.status]?<button disabled={busy} type="button" onClick={()=>void transition(o,next[o.status]!.value)}>{next[o.status]!.label}</button>:null}
      {(o.status==="pending"||o.status==="accepted")?<button className="beger-order-reject" disabled={busy} type="button" onClick={()=>{if(confirm("رفض الطلب؟ سيتم إبلاغ الزبون بحالة الرفض."))void transition(o,"rejected")}}>رفض الطلب</button>:null}
    </article>)}
    {!orders.some(o=>o.status===stage)?<p className="beger-order-board-empty">لا توجد طلبات بهذه الحالة</p>:null}
   </section>)}</div>
 </section>;
}
