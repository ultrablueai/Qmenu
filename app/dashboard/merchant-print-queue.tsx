"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import {printOrderTicket,type PrintableOrder} from "../../lib/beger-print-ticket";
import type {BranchPrintSettings} from "./merchant-print-settings";

type Kind="kitchen"|"pickup"|"summary";
type State="queued"|"previewed"|"confirmed";
type PrintJob={id:string;kind:Kind;state:State;attempts:number;createdAt:string;order:PrintableOrder};
const titles:Record<Kind,string>={kitchen:"ورقة المطبخ",pickup:"بطاقة الاستلام",summary:"كشف الكاشير الداخلي"};
const states:Record<State,string>={queued:"بانتظار فتح الطباعة",previewed:"تم فتح المعاينة — لم تؤكد الطباعة",confirmed:"أكد الموظف الطباعة"};

export default function MerchantPrintQueue({branchId,branchName,settings}:{branchId:string;branchName:string;settings:BranchPrintSettings}){
 const [jobs,setJobs]=useState<PrintJob[]>([]),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error:rpcError}=await browserSupabase().rpc("g17_branch_print_jobs",{p_branch:branchId});
  if(rpcError||!Array.isArray(data))throw Error("Print queue unavailable");
  setJobs(data as PrintJob[]);setLoaded(true);setError("");
 },[branchId]);
 useEffect(()=>{
  let live=true;setLoaded(false);setJobs([]);setError("");
  const update=()=>{void refresh().catch(()=>{if(live)setError("تعذّر تحميل سجل الطباعة؛ تأكد من صلاحيات مالك/مدير الفرع.")})};
  update();const timer=window.setInterval(update,8000);
  return()=>{live=false;window.clearInterval(timer)};
 },[refresh]);
 async function action(job:PrintJob,next:"preview"|"confirm"|"retry"){
  if(busy)return;
  if(next==="preview"){
   const opened=printOrderTicket(job.order,branchName,job.kind,settings);
   if(!opened){setError("المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");return}
  }
  if(next==="confirm"&&!window.confirm("هل تأكدت من خروج الورقة من الطابعة؟ فتح المعاينة وحده لا يعني نجاح الطباعة."))return;
  if(next==="retry"&&!window.confirm("إعادة فتح مهمة الطباعة؟ راجع الطابعة حتى لا تخرج نسختان."))return;
  setBusy(job.id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g17_print_job_action",{p_job:job.id,p_action:next});
   if(rpcError||data?.id!==job.id)throw Error("Print status update failed");
   setNotice(next==="preview"?"فُتحت المعاينة. استخدم زر طباعة المستند، ثم أكد خروج الورقة.":next==="confirm"?"تم تسجيل تأكيد الموظف بخروج الورقة.":"أُعيدت المهمة إلى قائمة الانتظار.");
   await refresh();
  }catch{setError("تعذّر تسجيل حالة مهمة الطباعة. حدّث القائمة وتحقق قبل تكرار الطباعة.")}
  finally{setBusy("")}
 }
 const queued=jobs.filter(j=>j.state!=="confirmed");
 return <section id="beger-print-queue" dir="rtl" aria-label="طابور طباعة الطلبات" style={{background:"#fff",border:"1px solid #dce4d6",borderRadius:16,padding:"clamp(14px,3vw,24px)",margin:"20px 0"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <div><h3 style={{fontSize:19,margin:"0 0 6px"}}>سجل ومهام طباعة الطلبات</h3><p style={{margin:0,fontSize:12,color:"#6f796b",lineHeight:1.8}}>تُنشأ المهام تلقائياً عند قبول الطلب، دون خطوة إرسال إضافية للمطبخ. الطباعة الفعلية من المتصفح تتطلب ضغط الموظف.</p></div>
   <button type="button" disabled={Boolean(busy)} onClick={()=>void refresh().catch(()=>setError("فشل تحديث الطابور."))} style={{padding:"10px 14px",border:"1px solid #bfd2b7",borderRadius:10,background:"#f6faf2",fontWeight:750}}>تحديث ↻</button>
  </header>
  <p style={{color:"#566c4f",fontSize:12,margin:"12px 0"}}>المهام غير المؤكدة: <strong>{queued.length}</strong> · إجمالي المعروض: {jobs.length}. لا تصدر هذه المستندات فواتير ضريبية.</p>
  {error?<p role="alert" style={{color:"#9c4436"}}>{error}</p>:null}
  {notice?<p role="status" style={{color:"#426e41"}}>{notice}</p>:null}
  {!loaded?<p role="status">جارٍ تحميل مهام الطباعة…</p>:null}
  {loaded&&jobs.length===0?<p>لا توجد مهام بعد. ستظهر أول مهمة عند قبول طلب جديد في هذا الفرع.</p>:null}
  {loaded?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,255px),1fr))",gap:10}}>
   {jobs.map(job=><article key={job.id} style={{border:"1px solid #e0e7dd",borderRadius:12,padding:14,display:"grid",gap:9,alignContent:"start"}}>
    <strong>{titles[job.kind]} · #{job.order.id.replace(/-/g,"").slice(0,10).toUpperCase()}</strong>
    <span style={{fontSize:12,color:"#69736b"}}>{job.order.table} · {states[job.state]??"حالة غير معروفة"}</span>
    <small style={{color:"#7e857b"}}>محاولات المعاينة: {job.attempts}</small>
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
     {job.state!=="confirmed"?<button type="button" disabled={Boolean(busy)} onClick={()=>void action(job,"preview")} style={{padding:"9px 11px",minHeight:42,border:0,borderRadius:9,background:"#4e7540",color:"#fff",fontWeight:750}}>فتح وطباعة</button>:null}
     {job.state==="previewed"?<button type="button" disabled={Boolean(busy)} onClick={()=>void action(job,"confirm")} style={{padding:"9px 11px",minHeight:42,border:"1px solid #c4d2bf",background:"#fff",borderRadius:9}}>تأكيد خروج الورقة</button>:null}
     {job.state!=="queued"?<button type="button" disabled={Boolean(busy)} onClick={()=>void action(job,"retry")} style={{padding:"9px 11px",minHeight:42,border:"1px solid #ded3be",background:"#fff",borderRadius:9}}>إعادة محاولة</button>:null}
    </div>
   </article>)}
  </div>:null}
 </section>;
}
