"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";

type Kind="kitchen"|"pickup"|"summary";
export type PrintDestinations=Record<Kind,string>;
const fallback:PrintDestinations={kitchen:"مطبخ الفرع",pickup:"بطاقات الاستلام",summary:"كاشير الفرع"};
const title:PrintDestinations={kitchen:"تذكرة المطبخ",pickup:"بطاقة الاستلام",summary:"كشف الكاشير الداخلي"};
const kinds:Kind[]=["kitchen","pickup","summary"];
type ServerRoutes=PrintDestinations&{mode:"browser_manual";device_connected:boolean};
function valid(v:unknown):v is ServerRoutes{
 if(!v||typeof v!=="object")return false;
 const data=v as Record<string,unknown>;
 return kinds.every(k=>typeof data[k]==="string"&&(data[k] as string).length<=80)
  &&data.mode==="browser_manual"&&data.device_connected===false;
}
export default function MerchantPrintRoutes({branchId,onRoutes}:{branchId:string;onRoutes:(r:PrintDestinations)=>void}){
 const [routes,setRoutes]=useState<PrintDestinations>(fallback);
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState<Kind|null>(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const fetchRoutes=useCallback(async()=>{
  const {data,error:rpcError}=await browserSupabase().rpc("g19_branch_print_routes",{p_branch:branchId});
  if(rpcError||!valid(data))throw Error("Unverified print routes");
  const next={kitchen:data.kitchen,pickup:data.pickup,summary:data.summary};
  setRoutes(next);onRoutes(next);setLoaded(true);setError("");
 },[branchId,onRoutes]);
 useEffect(()=>{
  let live=true;setRoutes(fallback);onRoutes(fallback);setLoaded(false);setError("");setNotice("");
  void fetchRoutes().catch(()=>{if(live)setError("تعذّر التحقق من توجيه الطابعات. التعديل معطّل لحين إعادة التحميل.")});
  return()=>{live=false};
 },[fetchRoutes,onRoutes]);
 async function save(kind:Kind){
  if(!loaded||busy)return;
  const destination=routes[kind].trim();
  if(!destination||destination.length>80||/[\r\n]/.test(destination)){
   setError("اكتب اسم وجهة الطباعة بما لا يتجاوز 80 حرفاً، دون أسطر جديدة.");return;
  }
  setBusy(kind);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g19_update_print_route",{
    p_branch:branchId,p_kind:kind,p_destination:destination
   });
   if(rpcError||data?.kind!==kind||data?.destination!==destination)throw Error("Route update failed");
   await fetchRoutes();setNotice("تم حفظ توجيه "+title[kind]+" للفرع. ما زال اختيار الطابعة الفعلية يدوياً.");
  }catch{setError("تعذّر حفظ وجهة الطباعة. تحقق من صلاحية المالك/المدير وحاول مجدداً.")}
  finally{setBusy(null)}
 }
 return <details style={{border:"1px solid #e2e8db",borderRadius:12,padding:"13px 16px",background:"#fbfcf8",margin:"12px 0"}}>
  <summary style={{cursor:"pointer",fontWeight:750}}>توجيه الأوراق إلى محطات الفرع</summary>
  <p style={{fontSize:12,lineHeight:1.8,color:"#667662"}}>هذه أسماء وجهات تشغيلية، وليست أجهزة مقترنة. لا توجد طباعة صامتة أو اتصال USB/شبكة. اختر الطابعة الفعلية في نافذة الطباعة.</p>
  {error?<p role="alert" style={{color:"#983f31"}}>{error} <button type="button" onClick={()=>void fetchRoutes().catch(()=>setError("ما زال تحميل التوجيه غير متاحاً."))}>إعادة المحاولة</button></p>:null}
  {notice?<p role="status" style={{color:"#3e7045"}}>{notice}</p>:null}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:12}}>
   {kinds.map(kind=><label key={kind} style={{display:"grid",gap:7,fontSize:13,fontWeight:750}}>
    {title[kind]}
    <input value={routes[kind]} maxLength={80} disabled={!loaded||Boolean(busy)}
     onChange={event=>setRoutes(current=>({...current,[kind]:event.target.value}))}
     style={{minHeight:42,padding:"9px 11px",background:"#fff",border:"1px solid #d8e0d3",borderRadius:9}}/>
    <button type="button" disabled={!loaded||Boolean(busy)} onClick={()=>void save(kind)} style={{minHeight:42,padding:"9px 11px",background:"#eef4e8",border:"1px solid #c8d9c0",borderRadius:9,fontWeight:750}}>
     {busy===kind?"جارٍ الحفظ…":"حفظ الوجهة"}
    </button>
   </label>)}
  </div>
 </details>;
}
