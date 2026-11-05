"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";

type Kind="trial"|"plan_review"|"renewal"|"cancellation";
type RequestRow={id:string;kind:Kind;status:"pending"|"acknowledged"|"declined"|"withdrawn";createdAt:string;reviewedAt:string|null};
const kinds:Record<Kind,string>={trial:"طلب تجربة",plan_review:"استفسار عن الباقة",renewal:"طلب تجديد",cancellation:"طلب إلغاء"};
const states:Record<RequestRow["status"],string>={pending:"بانتظار المراجعة",acknowledged:"تمت مراجعة الطلب",declined:"تعذّرت الموافقة",withdrawn:"سُحب الطلب"};

export default function MerchantSubscriptionRequests({businessId,hasSubscription,canRequest}:{businessId:string;hasSubscription:boolean;canRequest:boolean}){
 const [items,setItems]=useState<RequestRow[]>([]);
 const [kind,setKind]=useState<Kind>("plan_review");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const loadGeneration=useRef(0);
 const load=useCallback(async()=>{
  const generation=++loadGeneration.current;
  const {data,error:rpcError}=await browserSupabase().rpc("g13_merchant_requests",{p_business:businessId});
  if(generation!==loadGeneration.current)return; // Ignore a response from a previous business.
  if(rpcError||!Array.isArray(data))throw Error("Cannot verify subscription requests");
  setItems(data as RequestRow[]);
  setError("");
 },[businessId]);
 useEffect(()=>{
  let active=true;setLoading(true);setItems([]);setError("");setNotice("");
  void load().catch(()=>{if(active)setError("تعذّر قراءة طلبات الاشتراك؛ لا يمكن إنشاء طلب جديد قبل التحقق.")}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;loadGeneration.current++};
 },[load]);
 const pending=items.find(item=>item.status==="pending");
 const choices:Kind[]=hasSubscription?["plan_review","renewal","cancellation"]:["plan_review","trial"];
 const effectiveKind=choices.includes(kind)?kind:choices[0];
 async function submit(){
  if(!canRequest||busy||loading||pending||error||!choices.includes(effectiveKind))return;
  const confirmation=effectiveKind==="cancellation"?"هذه رسالة طلب إلغاء للمراجعة فقط، وليست إلغاءً فورياً. هل تريد إرسالها؟":"إرسال طلب مراجعة الاشتراك إلى إدارة Beger؟";
  if(!window.confirm(confirmation))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g13_subscription_request",{p_business:businessId,p_kind:effectiveKind});
   if(rpcError||data?.status!=="pending")throw Error("Request was not created");
   await load();setNotice("تم إرسال طلبك للمراجعة. لم يُغيّر اشتراكك أو يُحصّل أي مبلغ.");
  }catch{setError("تعذّر إرسال الطلب. ربما توجد مراجعة معلّقة أو لا تملك الصلاحية المطلوبة. حدّث الصفحة وحاول مرة أخرى.")}
  finally{setBusy(false)}
 }
 async function withdraw(id:string){
  if(!canRequest||busy||!window.confirm("سحب الطلب المعلّق؟"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g13_withdraw_request",{p_request:id});
   if(rpcError||data!==true)throw Error("Cannot withdraw");
   await load();setNotice("تم سحب الطلب المعلّق دون تغيير الاشتراك.");
  }catch{setError("تعذّر سحب الطلب. ربما تمت مراجعته بالفعل. حدّث القائمة.")}
  finally{setBusy(false)}
 }
 return <section aria-labelledby="subscription-requests-heading" style={{borderTop:"1px solid #e7e9dd",marginTop:18,paddingTop:20}}>
  <h3 id="subscription-requests-heading" style={{fontSize:17,margin:"0 0 8px"}}>طلبات الاشتراك</h3>
  <p style={{fontSize:13,color:"#726d63",lineHeight:1.9}}>اطلب تجربة أو تغييراً أو تجديداً أو إلغاءً لتراجعه إدارة المنصة. الطلب لا يغيّر اشتراكك تلقائياً ولا يُنشئ فاتورة.</p>
  <button type="button" onClick={()=>{if(!busy){setLoading(true);setError("");void load().catch(()=>setError("تعذّر تحديث الطلبات؛ حاول مجدداً.")).finally(()=>setLoading(false))}}} disabled={busy||loading} aria-label="تحديث قائمة طلبات الاشتراك" style={{padding:"8px 12px",border:"1px solid #dadfd0",borderRadius:10,background:"#fff",color:"#517040",cursor:"pointer",marginBottom:10}}>↻ تحديث الطلبات</button>
  {loading?<p role="status">جارٍ تحميل الطلبات…</p>:null}
  {error?<p role="alert" style={{color:"#a14b37"}}>{error}</p>:null}
  {notice?<p role="status" style={{color:"#48713c"}}>{notice}</p>:null}
  {canRequest&&!loading&&!error?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:9,alignItems:"end"}}>
   <label style={{fontSize:13,fontWeight:750,display:"grid",gap:7}}>نوع الطلب
    <select value={effectiveKind} onChange={event=>setKind(event.target.value as Kind)} disabled={busy||Boolean(pending)} style={{minHeight:44,border:"1px solid #ddd9c9",borderRadius:10,padding:10,background:"#fff"}}>
     {choices.map(value=><option key={value} value={value}>{kinds[value]}</option>)}
    </select>
   </label>
   <button type="button" onClick={()=>void submit()} disabled={busy||Boolean(pending)} style={{minHeight:44,padding:"11px 14px",border:0,borderRadius:10,background:"#557543",color:"#fff",fontWeight:800,cursor:"pointer"}}>{pending?"يوجد طلب قيد المراجعة":busy?"جارٍ الإرسال…":"إرسال طلب للمراجعة"}</button>
  </div>:null}
  {!canRequest?<p style={{fontSize:12,color:"#817365"}}>إنشاء الطلبات وسحبها مخصص لمالك النشاط، ويستطيع المدير الاطلاع عليها فقط.</p>:null}
  {!loading&&items.length===0?<p style={{color:"#8a8072",fontSize:12}}>لا توجد طلبات اشتراك سابقة.</p>:null}
  {!loading&&items.length>0?<div style={{display:"grid",gap:9,marginTop:16}}>{items.map(item=><div key={item.id} style={{border:"1px solid #e7e3d8",borderRadius:10,padding:13,display:"flex",justifyContent:"space-between",flexWrap:"wrap",alignItems:"center",gap:12}}>
   <div><strong>{kinds[item.kind]??"طلب اشتراك"}</strong><p style={{margin:"5px 0 0",fontSize:12,color:"#796f62"}}>{states[item.status]??"حالة غير معروفة"} · {new Date(item.createdAt).toLocaleDateString("ar")}</p></div>
   {item.status==="pending"&&canRequest?<button type="button" disabled={busy} onClick={()=>void withdraw(item.id)} style={{background:"#fff",border:"1px solid #d9b7ad",color:"#90503e",padding:"9px 13px",borderRadius:9,cursor:"pointer"}}>سحب الطلب</button>:null}
  </div>)}</div>:null}
 </section>;
}
