"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";

type Health={
 total:number;queued:number;previewed:number;failed:number;confirmed:number;
 queued_over_5m:number;previewed_over_10m:number;
 oldest_pending_at:string|null;
 simulated_devices:number;active_simulated_leases:number;expired_simulated_leases:number;
 status:"normal"|"delayed"|"needs_attention"|"no_jobs";
 checked_at:string;manual_print_only:boolean;hardware_connected:boolean;
 failure_examples:{jobId:string;kind:string;failureNote:string|null;updatedAt:string}[];
};
const statusLabel={
 normal:"المهام ضمن الحدود المتوقعة",delayed:"مهام طباعة متأخرة",
 needs_attention:"توجد مهام طباعة فاشلة",no_jobs:"لا توجد مهام طباعة حالياً"
};
export default function MerchantPrintHealth({branchId}:{branchId:string}){
 const [data,setData]=useState<Health|null>(null);
 const [loaded,setLoaded]=useState(false),[error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const {data:result,error:rpcError}=await browserSupabase().rpc("g21_branch_print_health",{p_branch:branchId});
  if(rpcError||!result||typeof result!=="object"||!["normal","delayed","needs_attention","no_jobs"].includes(result.status))
   throw Error("Unavailable");
  setData(result as Health);setLoaded(true);setError("");
 },[branchId]);
 useEffect(()=>{
  let active=true;setLoaded(false);setData(null);setError("");
  const update=()=>void refresh().catch(()=>{if(active)setError("فشل تحميل مراقبة الطباعة؛ تحقق من صلاحية إدارة الفرع.")});
  update();
  const timer=window.setInterval(update,15000);
  return()=>{active=false;window.clearInterval(timer)};
 },[refresh]);
 const alert=data?.status==="needs_attention"||data?.status==="delayed";
 return <section dir="rtl" aria-label="مراقبة تشغيل الطباعة" style={{background:"#fff",border:"1px solid #dae6d8",borderRadius:15,padding:"16px 18px",margin:"14px 0"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:9}}>
   <div><h3 style={{fontSize:18,margin:0}}>مراقبة الطباعة والأعطال</h3><p style={{fontSize:12,color:"#68786b",margin:"7px 0 0"}}>تُحدّث كل 15 ثانية أثناء فتح اللوحة. ليست مراقبة لطابعة فعلية.</p></div>
   <button type="button" onClick={()=>void refresh().catch(()=>setError("تعذر تحديث المؤشرات."))} style={{padding:"9px 12px",background:"#f2f7ec",border:"1px solid #ccdec5",borderRadius:9}}>تحديث الآن</button>
  </header>
  {error?<p role="alert" style={{color:"#a3473a"}}>{error}</p>:null}
  {!loaded?<p role="status">جارٍ فحص حالة مهام الطباعة…</p>:null}
  {data?<div style={{marginTop:13}}>
   <p role={alert?"alert":"status"} style={{padding:"11px 13px",margin:"0 0 12px",borderRadius:10,background:alert?"#fff1e9":"#f1f7eb",color:alert?"#9e4834":"#3f6b3f",fontWeight:800}}>
    {statusLabel[data.status]}
   </p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(105px,1fr))",gap:8}}>
    {([
     ["بالانتظار",data.queued],["فشلت",data.failed],["معاينة مفتوحة",data.previewed],
     ["مؤكدة يدوياً",data.confirmed],["انتظار أكثر من 5 دقائق",data.queued_over_5m],
     ["معاينة أكثر من 10 دقائق",data.previewed_over_10m]
    ] as [string,number][]).map(([name,count])=><div key={name} style={{background:"#f7f9f5",borderRadius:9,padding:"12px 10px",display:"grid",gap:5}}>
     <strong style={{fontSize:20}}>{count}</strong><small style={{fontSize:11,color:"#617261"}}>{name}</small>
    </div>)}
   </div>
   {data.failure_examples.length>0?<div style={{marginTop:12}}>
    <strong style={{fontSize:13}}>آخر أسباب تعذّر الطباعة</strong>
    <ul style={{fontSize:12,lineHeight:1.8,margin:"8px 0"}}>
     {data.failure_examples.map(f=><li key={f.jobId}>{f.kind} — {f.failureNote||"لم يسجل سبب"}</li>)}
    </ul>
   </div>:null}
   <p style={{fontSize:12,color:"#68776c",lineHeight:1.8,margin:"12px 0 0"}}>
    محطات المحاكاة: {data.simulated_devices} · حجوزات محاكاة نشطة: {data.active_simulated_leases} · حجوزات محاكاة منتهية: {data.expired_simulated_leases}
   </p>
   <p style={{fontSize:12,color:"#806f52",lineHeight:1.8,margin:"5px 0 0"}}>الطباعة من المتصفح يدوية؛ لا يوجد جهاز طباعة متصل بالنظام أو تأكيد آلي لخروج الورقة.</p>
  </div>:null}
 </section>;
}
