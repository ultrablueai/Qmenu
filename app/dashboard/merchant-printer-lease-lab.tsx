"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";

type Kind="kitchen"|"pickup"|"summary";
type TestDevice={id:string;kind:Kind;label:string;activeLeaseCount:number;simulation_only:true};
type Lease={claimed:boolean;jobId?:string;leaseToken?:string;expiresAt?:string;kind?:Kind;simulation_only:boolean};
const titles:Record<Kind,string>={kitchen:"المطبخ",pickup:"الاستلام",summary:"الكاشير"};

export default function MerchantPrinterLeaseLab({branchId}:{branchId:string}){
 const [devices,setDevices]=useState<TestDevice[]>([]);
 const [kind,setKind]=useState<Kind>("kitchen");
 const [label,setLabel]=useState("محطة طباعة تجريبية");
 const [lease,setLease]=useState<(Lease&{deviceId:string})|null>(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error:rpcError}=await browserSupabase().rpc("g20_test_printer_status",{p_branch:branchId});
  if(rpcError||!Array.isArray(data))throw Error("Lab status unavailable");
  setDevices(data as TestDevice[]);setError("");
 },[branchId]);
 useEffect(()=>{
  let active=true;setDevices([]);setLease(null);setError("");setNotice("");setLoading(true);
  void refresh().catch(()=>{if(active)setError("تعذّر تحميل المحطات التجريبية أو التحقق من صلاحية الفرع.")}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[refresh]);
 async function register(){
  if(busy||!label.trim()||label.trim().length>80||/[\r\n]/.test(label)){setError("اختر اسماً واضحاً للمحطة (حتى 80 حرفاً).");return}
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g20_register_test_printer",{p_branch:branchId,p_kind:kind,p_label:label.trim()});
   if(rpcError||data?.simulation_only!==true)throw Error("Registration failed");
   await refresh();setNotice("سُجلت محطة محاكاة فقط. لم يتم الاتصال بطابعة.");
  }catch{setError("تعذّر إنشاء محطة المحاكاة. تحقق من صلاحية مالك/مدير الفرع.")}
  finally{setBusy(false)}
 }
 async function claim(device:TestDevice){
  if(busy||lease)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g20_claim_test_print",{p_device:device.id});
   if(rpcError||data?.simulation_only!==true)throw Error("Claim failed");
   if(data.claimed!==true){setNotice("لا توجد مهمة طباعة جديدة متاحة لهذه المحطة، أو أنها محجوزة بالفعل.");return}
   if(typeof data.jobId!=="string"||typeof data.leaseToken!=="string")throw Error("Incomplete lease");
   setLease({...data,deviceId:device.id} as Lease&{deviceId:string});
   setNotice("تم حجز مهمة للاختبار لمدة 90 ثانية فقط. لم تُرسل بيانات إلى طابعة.");
   await refresh();
  }catch{setError("تعذّر حجز المهمة. قد يكون جهاز آخر حجزها أو أن صلاحيات الفرع لا تسمح.")}
  finally{setBusy(false)}
 }
 async function release(){
  if(busy||!lease?.jobId||!lease.leaseToken)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g20_release_test_print",{
    p_device:lease.deviceId,p_job:lease.jobId,p_token:lease.leaseToken
   });
   if(rpcError||data!==true)throw Error("Release failed");
   setLease(null);await refresh();setNotice("حُرر الحجز. مهمة الطباعة بقيت في حالتها الأصلية.");
  }catch{
   setLease(null);setError("تعذّر تحرير الحجز. سينتهي تلقائياً بعد 90 ثانية من إنشائه. حدّث القائمة.");
  }finally{setBusy(false)}
 }
 return <details style={{margin:"14px 0",border:"1px solid #d9e5de",background:"#f5faf7",borderRadius:13,padding:"13px 16px"}}>
  <summary style={{cursor:"pointer",fontWeight:800}}>مختبر حجز الطباعة — بدون طابعة فعلية</summary>
  <p style={{fontSize:12,lineHeight:1.8,color:"#5c7265"}}>جرب جهازاً افتراضياً لكل محطة، وحجز مهمة واحدة بشكل حصري ثم تحريرها. هذا اختبار نظام الحجز فقط؛ لا يطبع ولا يشغّل USB ولا يؤكد خروج ورقة.</p>
  {error?<p role="alert" style={{color:"#944b38"}}>{error}</p>:null}
  {notice?<p role="status" style={{color:"#326c50"}}>{notice}</p>:null}
  <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"end"}}>
   <label style={{display:"grid",gap:5,fontSize:12}}>نوع المحطة
    <select disabled={busy||loading} value={kind} onChange={e=>setKind(e.target.value as Kind)} style={{padding:10,border:"1px solid #c9d9ce",borderRadius:8}}>
     <option value="kitchen">مطبخ</option><option value="pickup">استلام</option><option value="summary">كاشير</option>
    </select>
   </label>
   <label style={{display:"grid",gap:5,fontSize:12}}>اسم محطة المحاكاة
    <input disabled={busy||loading} maxLength={80} value={label} onChange={e=>setLabel(e.target.value)} style={{padding:10,border:"1px solid #c9d9ce",borderRadius:8}}/>
   </label>
   <button type="button" disabled={busy||loading} onClick={()=>void register()} style={{minHeight:42,padding:"9px 13px",border:"1px solid #b9d1c0",borderRadius:9,background:"#fff"}}>تسجيل محطة تجريبية</button>
   <button type="button" disabled={busy||loading} onClick={()=>void refresh().catch(()=>setError("تعذّر تحديث الأجهزة."))} style={{minHeight:42,padding:"9px 13px",border:"1px solid #d3e2d8",borderRadius:9,background:"#fff"}}>تحديث</button>
  </div>
  {loading?<p>جارٍ التحقق…</p>:devices.length===0?<p style={{fontSize:12}}>لا توجد محطات محاكاة مسجلة لهذا الفرع.</p>:<div style={{display:"grid",gap:8,marginTop:14}}>
   {devices.map(device=><div key={device.id} style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",background:"#fff",border:"1px solid #e0e7e1",borderRadius:10,padding:11}}>
    <span style={{fontSize:13}}><strong>{device.label}</strong> · {titles[device.kind]} · حجوزات نشطة {device.activeLeaseCount}</span>
    <button type="button" disabled={busy||Boolean(lease)} onClick={()=>void claim(device)} style={{padding:"9px 12px",borderRadius:8,background:"#e5f1e9",border:"1px solid #b7d8c4"}}>محاكاة استلام مهمة</button>
   </div>)}
  </div>}
  {lease?<div role="status" style={{marginTop:14,padding:13,border:"1px solid #a9c9bd",background:"#eaf5ef",borderRadius:11}}>
   <strong>مهمة محجوزة للمحاكاة</strong><p style={{fontSize:12,overflowWrap:"anywhere"}}>معرّف المهمة: {lease.jobId} · انتهاء الحجز: {lease.expiresAt?new Date(lease.expiresAt).toLocaleTimeString("ar"):"غير معروف"}</p>
   <button type="button" disabled={busy} onClick={()=>void release()} style={{minHeight:42,padding:"9px 13px",borderRadius:8,border:"1px solid #8ab69c",background:"#fff"}}>تحرير الحجز التجريبي</button>
  </div>:null}
 </details>;
}
