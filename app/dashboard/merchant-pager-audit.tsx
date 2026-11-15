"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-pager-audit.css";

type AuditEvent={
 id:number;number:number;action:"issued"|"status_changed";
 from:string|null;to:string;actor:string;happenedAt:string
};
const statusText:Record<string,string>={
 waiting:"بانتظار التحضير",preparing:"قيد التحضير",
 ready:"جاهز للاستلام",fulfilled:"تم التسليم",cancelled:"ملغي"
};
function eventLabel(event:AuditEvent){
 if(event.action==="issued")return "إصدار رقم انتظار";
 return (statusText[event.from??""]??event.from??"—")+" ← "+(statusText[event.to]??event.to);
}
export default function MerchantPagerAudit({branchId}:{branchId:string}){
 const [events,setEvents]=useState<AuditEvent[]>([]);
 const [loading,setLoading]=useState(false),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState("");
 const [open,setOpen]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const {data,error}=await browserSupabase().rpc("g7_pager_audit_history",{p_branch:branchId,p_limit:40});
   if(error||!Array.isArray(data))throw Error("Invalid audit");
   setEvents(data as AuditEvent[]);setLoaded(true);
  }catch{setError("تعذّر تحميل سجل الإجراءات. تحقق من صلاحية مدير الفرع.");}
  finally{setLoading(false)}
 },[branchId]);
 useEffect(()=>{
  setEvents([]);setLoaded(false);setOpen(false);setError("");
 },[branchId]);
 return <section className="beger-pager-audit" aria-label="سجل إجراءات البيجر">
  <details open={open} onToggle={event=>{
   const expanded=event.currentTarget.open;
   if(expanded!==open){setOpen(expanded);if(expanded&&!loaded)void load();}
  }}>
   <summary>سجل إجراءات الموظفين <span>آخر 40 حدثاً</span></summary>
   <div className="beger-pager-audit-body">
    <p>من أصدر رقم النداء ومن غيّر حالته، بالتاريخ والوقت. لا يُعرض هذا السجل للزبائن أو لموظف البيجر.</p>
    <button type="button" disabled={loading} onClick={()=>void load()}>{loading?"جارٍ التحديث…":"تحديث السجل ↻"}</button>
    {error?<p role="alert" className="beger-pager-audit-error">{error}</p>:null}
    {loaded&&events.length===0?<p className="beger-pager-audit-empty">لا توجد إجراءات مسجلة بعد تفعيل سجل العمليات.</p>:null}
    {loaded&&events.length>0?<div className="beger-pager-audit-scroll">
     <table><thead><tr><th>النداء</th><th>الإجراء</th><th>المنفّذ</th><th>التاريخ والوقت</th></tr></thead>
     <tbody>{events.map(event=><tr key={event.id}>
      <td><strong>#{event.number}</strong></td>
      <td>{eventLabel(event)}</td>
      <td dir="ltr">{event.actor==="system"?"عملية نظام":event.actor}</td>
      <td><time dateTime={event.happenedAt}>{new Date(event.happenedAt).toLocaleString("ar")}</time></td>
     </tr>)}</tbody></table>
    </div>:null}
   </div>
  </details>
 </section>;
}
