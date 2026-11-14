"use client";
import {useEffect,useMemo,useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
type Shift={weekday:number;opens_at:string;closes_at:string;gap_minutes:number;break_start:string|null;break_end:string|null};
type Offering={service_id:string;enabled:boolean;name:string};
type Worker={id:string;name:string;accepts_bookings:boolean;branch_id:string;shifts:Shift[];services:Offering[]};
export type WorkerControls={business_id:string;role:string;scope:"own_only"|"whole_business";workers:Worker[];realtime_write_enabled:true};
const days=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const input={minHeight:43,padding:"9px 11px",border:"1px solid #d4e5d7",borderRadius:9,background:"#fff",width:"100%"};
export default function SalonWorkerControls({businessId,initial}:{businessId:string;initial:WorkerControls|null}){
 const [data,setData]=useState<WorkerControls|null>(initial),[staff,setStaff]=useState(initial?.workers[0]?.id??"");
 const [weekday,setWeekday]=useState(1),[open,setOpen]=useState("09:00"),[close,setClose]=useState("19:00");
 const [gap,setGap]=useState(10),[breakStart,setBreakStart]=useState("13:00"),[breakEnd,setBreakEnd]=useState("14:00");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const verified=data?.business_id===businessId&&Array.isArray(data?.workers)&&
   (data.scope==="own_only"||data.scope==="whole_business");
 const worker=data?.workers.find(s=>s.id===staff);
 const shift=useMemo(()=>worker?.shifts.find(s=>s.weekday===weekday),[worker,weekday]);
 useEffect(()=>{setOpen(shift?.opens_at?.slice(0,5)??"09:00");setClose(shift?.closes_at?.slice(0,5)??"19:00");
  setGap(shift?.gap_minutes??10);setBreakStart(shift?.break_start?.slice(0,5)??"");
  setBreakEnd(shift?.break_end?.slice(0,5)??"");},[shift]);
 async function reload(){
  const {data:next,error:e}=await browserSupabase().rpc("beger_g55_worker_controls",{p_business:businessId});
  if(e||next?.business_id!==businessId||next.scope!==data?.scope||!Array.isArray(next.workers))throw new Error("scope mismatch");
  setData(next as WorkerControls);
 }
 async function action(label:string,fn:()=>Promise<boolean>){
  if(busy)return;
  setBusy(true);setNotice("");setError("");
  try{
   if(!await fn())throw new Error("Rejected by server");
   await reload();setNotice("تم تحديث "+label+" على الخادم.");
  }catch{setError("تعذّر تعديل "+label+". قد تتعارض الإعدادات مع حجوزات موجودة أو لا تملك الصلاحية المطلوبة.");}
  finally{setBusy(false)}
 }
 if(!verified)return <section style={{background:"#fff",padding:18,borderRadius:15}}>إعدادات المعلمين غير متاحة لهذا الحساب.</section>;
 return <section style={{background:"#fff",padding:20,borderRadius:16,border:"1px solid #d9e8df",display:"grid",gap:16}}>
  <div><span style={{fontSize:12,color:"#32825e",fontWeight:900}}>BEGER · MY WORKSPACE</span><h2 style={{fontSize:21,margin:"8px 0"}}>{data!.scope==="own_only"?"دوامي وخدماتي":"دوام المعلمين وخدماتهم"}</h2>
   <p style={{fontSize:12,color:"#698274",lineHeight:1.8,margin:0}}>تتحكم بإتاحة الحجوزات ودوامك واستراحتك والخدمات المسندة لك. الخادم يمنع تغيير ساعات أو خدمات تؤثر على الحجوزات الموجودة. النِّسب المالية يحددها المالك وحده.</p>
  </div>
  {data!.scope==="whole_business"?<label style={{fontSize:12,display:"grid",gap:6,maxWidth:360}}>اختر المعلم<select style={input} value={staff} onChange={e=>setStaff(e.target.value)}>{data!.workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>:null}
  {!worker?<p>لا يوجد ملف معلم لهذا الحساب بعد.</p>:<>
   <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"space-between",border:"1px solid #e2ebe4",borderRadius:11,padding:13}}>
    <div><strong>{worker.name}</strong><p style={{fontSize:12,color:"#718372",margin:"4px 0"}}>{worker.accepts_bookings?"متاح لحجوزات جديدة":"استقبال الحجوزات متوقف مؤقتاً"}</p></div>
    <button type="button" disabled={busy} onClick={()=>void action("استقبال الحجوزات",async()=>{
     const {data:r,error:e}=await browserSupabase().rpc("beger_g55_set_worker_booking_pause",
      {p_business:businessId,p_staff:worker.id,p_accept:!worker.accepts_bookings});
     return !e&&r?.accepts_bookings===!worker.accepts_bookings;
    })} style={{border:0,borderRadius:10,padding:12,background:worker.accepts_bookings?"#fff2e6":"#207452",color:worker.accepts_bookings?"#8d602e":"#fff",fontWeight:850}}>
     {worker.accepts_bookings?"إيقاف الحجوزات الجديدة":"استقبال حجوزات جديدة"}
    </button>
   </div>
   <h3 style={{fontSize:16,margin:"0"}}>ساعات الدوام والاستراحة</h3>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,175px),1fr))",gap:11}}>
    <label style={{display:"grid",gap:6,fontSize:12}}>اليوم<select style={input} value={weekday} onChange={e=>setWeekday(Number(e.target.value))}>{days.map((d,i)=><option value={i} key={i}>{d}</option>)}</select></label>
    <label style={{display:"grid",gap:6,fontSize:12}}>بداية الدوام<input style={input} type="time" value={open} onChange={e=>setOpen(e.target.value)}/></label>
    <label style={{display:"grid",gap:6,fontSize:12}}>نهاية الدوام<input style={input} type="time" value={close} onChange={e=>setClose(e.target.value)}/></label>
    <label style={{display:"grid",gap:6,fontSize:12}}>الفاصل بين الحجوزات (دقائق)<input style={input} type="number" min={0} max={120} value={gap} onChange={e=>setGap(Number(e.target.value))}/></label>
    <label style={{display:"grid",gap:6,fontSize:12}}>بداية الاستراحة<input style={input} type="time" value={breakStart} onChange={e=>setBreakStart(e.target.value)}/></label>
    <label style={{display:"grid",gap:6,fontSize:12}}>نهاية الاستراحة<input style={input} type="time" value={breakEnd} onChange={e=>setBreakEnd(e.target.value)}/></label>
   </div>
   <button type="button" disabled={busy||!open||!close||open>=close||gap<0||gap>120||Boolean(breakStart)!==Boolean(breakEnd)}
    onClick={()=>void action("جدول الدوام",async()=>{
      const {data:r,error:e}=await browserSupabase().rpc("beger_g55_set_worker_shift",
       {p_business:businessId,p_staff:worker.id,p_weekday:weekday,p_open:open,
        p_close:close,p_gap:gap,p_break_start:breakStart||null,p_break_end:breakEnd||null});
      return !e&&r?.saved===true&&r?.existing_bookings_preserved===true;
    })} style={{border:0,borderRadius:10,padding:"12px 18px",background:"#226d50",color:"#fff",fontWeight:850,justifySelf:"start"}}>
    حفظ دوام {days[weekday]}
   </button>
   <h3 style={{fontSize:16,margin:"0"}}>الخدمات التي أقدمها</h3>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,195px),1fr))",gap:9}}>
    {worker.services.map(s=><label key={s.service_id} style={{display:"flex",gap:9,padding:12,border:"1px solid #e2e9e3",borderRadius:10,alignItems:"center",fontSize:13}}>
     <input type="checkbox" disabled={busy} checked={s.enabled} onChange={()=>void action("الخدمة",async()=>{
       const {data:r,error:e}=await browserSupabase().rpc("beger_g55_set_worker_service",
        {p_business:businessId,p_staff:worker.id,p_service:s.service_id,p_enabled:!s.enabled});
       return !e&&r?.active===!s.enabled&&r?.future_booking_safety_checked===true;
      })}/>{s.name}
    </label>)}
    {!worker.services.length?<p style={{fontSize:12}}>لا توجد خدمات مسندة بعد.</p>:null}
   </div>
  </>}
  {notice?<p role="status" style={{fontSize:12,color:"#1b704f"}}>{notice}</p>:null}
  {error?<p role="alert" style={{fontSize:12,color:"#a24d40"}}>{error}</p>:null}
 </section>;
}
