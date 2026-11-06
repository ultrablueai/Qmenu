"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-kitchen.css";
type Status="accepted"|"preparing"|"ready";
type Item={name:string;quantity:number;selections:{options?:{name_ar?:string}[];removedIngredients?:string[]}|null};
type Order={id:string;reference:string;table:string;status:Status;createdAt:string;items:Item[]};
const labels:Record<Status,string>={accepted:"بانتظار المطبخ",preparing:"قيد التجهيز",ready:"جاهز للتسليم"};
export default function MerchantKitchen({branchId,branchName}:{branchId:string;branchName:string}){
 const [orders,setOrders]=useState<Order[]>([]);
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [filter,setFilter]=useState<"live"|"ready">("live");
 const refresh=useCallback(async()=>{
  const {data,error}=await browserSupabase().rpc("g9_kitchen_queue",{p_branch:branchId});
  if(error||!Array.isArray(data))throw Error("Unauthorized kitchen query");
  setOrders(data as Order[]);setLoaded(true);setError("");
 },[branchId]);
 useEffect(()=>{
  let active=true;setOrders([]);setLoaded(false);setError("");setNotice("");
  const update=()=>{void refresh().catch(()=>{if(active)setError("تعذّر تحميل طلبات المطبخ. تأكد من صلاحية الفرع.")})};
  update();
  const id=window.setInterval(update,7000);
  return()=>{active=false;window.clearInterval(id)};
 },[refresh]);
 async function advance(order:Order,next:"preparing"|"ready"){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g9_kitchen_advance",{p_order:order.id,p_next:next});
   if(error||data?.status!==next)throw Error("Transition not confirmed");
   setOrders(old=>old.map(o=>o.id===order.id?{...o,status:next}:o));
   setNotice("تم تحديث طلب "+order.reference+" إلى "+labels[next]);
   try{await refresh()}catch{/* retain server-confirmed state */}
  }catch{setError("لم يتم تحديث الطلب. قد يكون موظف آخر غيّر حالته؛ حدّث القائمة قبل المحاولة.");}
  finally{setBusy(false)}
 }
 const shown=orders.filter(o=>filter==="ready"?o.status==="ready":o.status!=="ready");
 return <section className="beger-kitchen" dir="rtl" aria-label="محطة المطبخ">
  <header><div><small>BEGER / KITCHEN</small><h2>محطة المطبخ</h2><p>{branchName} · أصناف وتجهيز فقط، بدون مدفوعات أو إدارة المتجر.</p></div><strong>{orders.filter(o=>o.status!=="ready").length} طلب للتجهيز</strong></header>
  <nav aria-label="عرض طلبات المطبخ"><button type="button" aria-pressed={filter==="live"} onClick={()=>setFilter("live")}>بانتظار التجهيز ({orders.filter(o=>o.status!=="ready").length})</button><button type="button" aria-pressed={filter==="ready"} onClick={()=>setFilter("ready")}>جاهزة ({orders.filter(o=>o.status==="ready").length})</button><button type="button" disabled={busy} onClick={()=>void refresh().catch(()=>setError("تعذّر التحديث."))}>تحديث ↻</button></nav>
  {notice?<p role="status" className="beger-kitchen-notice">{notice}</p>:null}
  {error?<p role="alert" className="beger-kitchen-error">{error}</p>:null}
  {!loaded&&!error?<p role="status">جارٍ تحميل الطلبات…</p>:loaded&&shown.length===0?<p>لا توجد طلبات في هذه الحالة.</p>:null}
  <div className="beger-kitchen-grid">{shown.map(order=><article key={order.id}>
   <div className="beger-kitchen-card-head"><div><strong>#{order.reference}</strong><small>{order.table} · {new Date(order.createdAt).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</small></div><span>{labels[order.status]}</span></div>
   <ul>{order.items.map((item,i)=><li key={i}><strong>{item.quantity} × {item.name}</strong>
    {item.selections?.options?.length?<small>إضافات: {item.selections.options.map(o=>o.name_ar??"").filter(Boolean).join("، ")}</small>:null}
    {item.selections?.removedIngredients?.length?<small>بدون: {item.selections.removedIngredients.join("، ")}</small>:null}
   </li>)}</ul>
   {order.status==="accepted"?<button type="button" disabled={busy} onClick={()=>void advance(order,"preparing")}>بدء تجهيز الطلب</button>:null}
   {order.status==="preparing"?<button type="button" disabled={busy} onClick={()=>void advance(order,"ready")}>الطلب جاهز</button>:null}
  </article>)}</div>
 </section>;
}
