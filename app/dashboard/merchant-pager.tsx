"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import QrSvg from "../../lib/qr/qr-svg";
import "./merchant-pager.css";
type PagerStatus="waiting"|"preparing"|"ready"|"fulfilled"|"cancelled";
type Ticket={id:string;number:number;token:string;reference:string|null;status:PagerStatus;createdAt:string;readyAt:string|null};
const titles:Record<PagerStatus,string>={waiting:"بانتظار التحضير",preparing:"قيد التحضير",ready:"جاهز للاستلام",fulfilled:"تم التسليم",cancelled:"ملغي"};
const next:Partial<Record<PagerStatus,{status:PagerStatus;label:string}>>={
 waiting:{status:"preparing",label:"بدء التحضير"},
 preparing:{status:"ready",label:"نداء: جاهز"},
 ready:{status:"fulfilled",label:"تأكيد التسليم"}
};
export default function MerchantPager({branchId,branchName}:{branchId:string;branchName:string}){
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [reference,setReference]=useState("");
 const [origin,setOrigin]=useState("");
 const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const [selected,setSelected]=useState<Ticket|null>(null);
 const [view,setView]=useState<"active"|"closed">("active");
 useEffect(()=>{setOrigin(window.location.origin);},[]);
 const refresh=useCallback(async()=>{
  try{
   const {data,error}=await browserSupabase().rpc("g6_pager_branch_tickets",{p_branch:branchId});
   if(error||!Array.isArray(data))throw error??Error("Invalid tickets");
   setTickets(data as Ticket[]);setLoaded(true);
  }catch{setError("تعذّر تحميل أرقام البيجر. تحقق من صلاحية الفرع.");}
 },[branchId]);
 useEffect(()=>{
  setTickets([]);setSelected(null);setLoaded(false);setError("");void refresh();
  const timer=window.setInterval(()=>{void refresh();},8000);
  return()=>window.clearInterval(timer);
 },[refresh]);
 async function issue(){
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const {data,error}=await browserSupabase().rpc("g6_pager_issue",{p_branch:branchId,p_reference:reference.trim()||null});
   if(error||!data?.token)throw error??Error("Ticket not issued");
   setSelected({id:data.id,number:data.number,token:data.token,reference:reference.trim()||null,status:"waiting",createdAt:data.createdAt,readyAt:null});
   setReference("");setMessage("تم إنشاء نداء جديد. أعطِ الزبون رمز QR أو اطبع بطاقته.");
   await refresh();
  }catch{setError("تعذّر إصدار رقم انتظار. أعد المحاولة بعد فحص الاتصال والصلاحيات.");}
  finally{setBusy(false)}
 }
 async function transition(ticket:Ticket,status:PagerStatus){
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const {error}=await browserSupabase().rpc("g6_pager_transition",{p_ticket:ticket.id,p_next:status});
   if(error)throw error;
   setMessage("تم تحديث حالة النداء رقم "+ticket.number);
   await refresh();
  }catch{setError("لم تتغير حالة النداء. حدّث القائمة وحاول مجدداً.");}
  finally{setBusy(false)}
 }
 const active=tickets.filter(t=>!["fulfilled","cancelled"].includes(t.status));
 const closed=tickets.filter(t=>["fulfilled","cancelled"].includes(t.status));
 const visible=view==="active"?active:closed;
 const ticketUrl=(token:string)=>origin+"/pager/"+encodeURIComponent(token);
 return <section className="beger-pager-manager" dir="rtl" aria-label="البيجر المستقل">
  <div className="beger-pager-manager-intro">
   <div><span>BEGER · STANDALONE PAGER</span><h3>بيجر الكاشير المستقل</h3><p>{branchName} · يعمل مع أي نظام كاشير بدون منيو أو تسجيل حساب للزبون</p></div>
   <div className="beger-pager-counts"><strong>{active.length}</strong><small>قيد الانتظار والمتابعة</small></div>
  </div>
  <form className="beger-pager-create" onSubmit={event=>{event.preventDefault();void issue()}}>
   <label>رقم الفاتورة الخارجية (اختياري)
    <input value={reference} maxLength={60} onChange={e=>setReference(e.target.value)} placeholder="مثال: 1045" autoComplete="off"/>
   </label>
   <button type="submit" disabled={busy}>+ إصدار رقم انتظار جديد</button>
  </form>
  <p className="beger-pager-notice">رقم الفاتورة للموظف فقط؛ رابط QR فريد وسري، ولا يتضمن معلومات عن المدفوعات.</p>
  {message?<p className="beger-pager-success" role="status">{message}</p>:null}
  {error?<p className="beger-pager-error" role="alert">{error}</p>:null}
  {selected&&origin?<section className="beger-pager-new-ticket" aria-label="بطاقة النداء الجديدة">
   <div><small>رقم النداء</small><strong>{selected.number}</strong><span>{titles[selected.status]}</span></div>
   <div><QrSvg value={ticketUrl(selected.token)} size={152} label={"QR بيجر رقم "+selected.number}/><button type="button" onClick={()=>{window.print()}}>طباعة البطاقة</button></div>
   <a href={ticketUrl(selected.token)} target="_blank" rel="noopener noreferrer">فتح بطاقة الزبون ↗</a>
   <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(ticketUrl(selected.token));setMessage("تم نسخ رابط النداء.");}catch{setError("تعذّر النسخ. استخدم رابط فتح بطاقة الزبون.");}}}>نسخ الرابط</button>
  </section>:null}
  <div className="beger-pager-tabs" role="group" aria-label="عرض النداءات">
   <button type="button" aria-pressed={view==="active"} onClick={()=>setView("active")}>النشطة ({active.length})</button>
   <button type="button" aria-pressed={view==="closed"} onClick={()=>setView("closed")}>المغلقة ({closed.length})</button>
   <button type="button" disabled={busy} onClick={()=>void refresh()}>تحديث ↻</button>
  </div>
  {loaded&&visible.length===0?<p className="beger-pager-empty">لا توجد نداءات في هذا القسم خلال آخر 24 ساعة.</p>:null}
  <div className="beger-pager-tickets">{visible.map(t=><article key={t.id} className="beger-pager-ticket">
   <div className="beger-pager-ticket-number"><small>نداء</small><strong>{t.number}</strong><span>{titles[t.status]}</span></div>
   <div className="beger-pager-ticket-detail">
    <small>{t.reference?"فاتورة: "+t.reference:"بدون مرجع فاتورة"} · {new Date(t.createdAt).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}</small>
    {origin?<a href={ticketUrl(t.token)} target="_blank" rel="noopener noreferrer">بطاقة QR للزبون</a>:null}
    {next[t.status]?<button type="button" disabled={busy} onClick={()=>void transition(t,next[t.status]!.status)}>{next[t.status]!.label}</button>:null}
    {t.status==="waiting"||t.status==="preparing"?<button className="beger-pager-secondary" type="button" disabled={busy} onClick={()=>{if(window.confirm("إلغاء هذا النداء؟"))void transition(t,"cancelled");}}>إلغاء النداء</button>:null}
   </div>
  </article>)}</div>
 </section>;
}
