"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../lib/supabase/browser";
import type {Station} from "../lib/beger-station-alerts";

type ServerEvent={
 id:string;status:string;station:Station;orderId:string;reference:string;
 table:string;createdAt:string;read:boolean
};
const statusText:Record<string,string>={
 pending:"طلب ينتظر الموافقة",accepted:"طلب وصل إلى المطبخ",
 ready:"طلب جاهز للاستلام",rejected:"تم رفض الطلب"
};
export function DurableStationNotifications({branchId,station}:{branchId:string;station:Station}){
 const [events,setEvents]=useState<ServerEvent[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [busy,setBusy]=useState(""),[open,setOpen]=useState(false);
 const refresh=useCallback(async()=>{
  const {data,error:rpcError}=await browserSupabase().rpc("g23_branch_notifications",{
   p_branch:branchId,p_station:station
  });
  if(rpcError||!Array.isArray(data))throw Error("Notifications unavailable");
  setEvents(data as ServerEvent[]);setError("");setLoading(false);
 },[branchId,station]);
 useEffect(()=>{
  let active=true;setLoading(true);setError("");setEvents([]);setOpen(false);
  const update=()=>{void refresh().catch(()=>{if(active){setError("تعذّر تحميل سجل تنبيهات الفرع.");setLoading(false)}})};
  update();
  const timer=window.setInterval(update,15000);
  const onVisible=()=>{if(document.visibilityState==="visible")update()};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible)};
 },[refresh]);
 async function markRead(item:ServerEvent){
  if(busy||item.read)return;
  setBusy(item.id);setError("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g23_mark_notification_read",{p_notification:item.id});
   if(rpcError||data!==true)throw Error("Ack failed");
   setEvents(old=>old.map(e=>e.id===item.id?{...e,read:true}:e));
  }catch{setError("تعذّر تسجيل قراءة التنبيه. أعد المحاولة.")}
  finally{setBusy("")}
 }
 const unread=events.filter(e=>!e.read).length;
 return <section dir="rtl" aria-label="سجل تنبيهات الطلبات الدائم" style={{background:"#fff",border:"1px solid #dfe5dc",borderRadius:12,padding:"12px 14px",margin:"10px 0"}}>
  <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:9,width:"100%",textAlign:"right",border:0,background:"transparent",cursor:"pointer",fontWeight:800,color:"#426540"}}>
   <span aria-hidden="true">📬</span> سجل تنبيهات الطلبات
   <span style={{fontSize:12,background:unread?"#fcefdc":"#edf3e8",borderRadius:16,padding:"4px 9px"}}>غير مقروءة: {unread}</span>
   <span style={{fontSize:12,color:"#718071"}}>{loading?"جارٍ التحميل…":"آخر "+events.length+" حدث"}</span>
  </button>
  {open?<div style={{paddingTop:12}}>
   <p style={{fontSize:12,color:"#66756b",lineHeight:1.8}}>تُحفظ أحداث الطلبات في قاعدة البيانات لمدة عرض تصل إلى 7 أيام، وتُتابع حسب الفرع وصلاحياتك. تعليم القراءة لا يغيّر حالة الطلب ولا يرسل إشعاراً للهاتف المغلق.</p>
   {error?<p role="alert" style={{color:"#a54c3a"}}>{error}</p>:null}
   <button type="button" onClick={()=>void refresh().catch(()=>setError("فشل التحديث."))} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #d3dfcc",background:"#fff"}}>تحديث السجل</button>
   {!loading&&events.length===0?<p style={{fontSize:13}}>لا توجد أحداث طلبات جديدة محفوظة لهذا الدور بعد.</p>:null}
   <div style={{display:"grid",gap:8,marginTop:11}}>
    {events.slice(0,30).map(e=><div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:12,borderRadius:10,background:e.read?"#fafbf8":"#f2f8ed",border:"1px solid #e3e9dd"}}>
     <div style={{display:"grid",gap:4}}>
      <strong style={{fontSize:13}}>{statusText[e.status]??"تحديث طلب"} · #{e.reference}</strong>
      <small style={{fontSize:11,color:"#68766b"}}>{e.table} · {new Date(e.createdAt).toLocaleString("ar")}</small>
     </div>
     {e.read?<span style={{fontSize:12,color:"#708071"}}>مقروء</span>:<button type="button" disabled={Boolean(busy)} onClick={()=>void markRead(e)} style={{minHeight:38,padding:"8px 11px",borderRadius:9,border:"1px solid #b9d4b1",background:"#fff"}}>تمت القراءة</button>}
    </div>)}
   </div>
  </div>:null}
  {!open&&error?<span role="alert" style={{fontSize:12,color:"#a54c3a"}}>{error}</span>:null}
 </section>;
}
