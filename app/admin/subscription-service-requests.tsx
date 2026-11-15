"use client";
import {useCallback,useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";

type RequestRow={
 id:string;businessId:string;businessName:string;
 kind:"trial"|"plan_review"|"renewal"|"cancellation";
 status:"pending"|"acknowledged"|"declined"|"withdrawn";createdAt:string;
 planCode:string|null;period:"monthly"|"yearly"|null;
};
const kinds:Record<RequestRow["kind"],string>={trial:"طلب تجربة",plan_review:"مراجعة الباقة",renewal:"طلب تجديد",cancellation:"طلب إلغاء"};
const states:Record<RequestRow["status"],string>={pending:"بانتظار المراجعة",acknowledged:"تمت المراجعة",declined:"تعذّرت الموافقة",withdrawn:"سُحب الطلب"};

export default function PlatformSubscriptionRequests({canReview}:{canReview:boolean}){
 const [requests,setRequests]=useState<RequestRow[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  const {data,error:rpcError}=await browserSupabase().rpc("g13_platform_request_queue");
  if(rpcError||!Array.isArray(data))throw Error("Cannot read subscription review queue");
  setRequests(data as RequestRow[]);setError("");
 },[]);
 useEffect(()=>{let active=true;void refresh().catch(()=>{if(active)setError("تعذّر التحقق من طلبات الاشتراكات. لا يجوز إصدار قرارات دون بيانات مؤكدة.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[refresh]);
 async function approveTrial(request:RequestRow){
  if(!canReview||busy||request.kind!=="trial"||request.status!=="pending"||!request.planCode)return;
  if(!window.confirm(`تفعيل تجربة مجانية لمدة 14 يوماً لباقة ${request.planCode} للمتجر ${request.businessName}؟ لا يوجد تحصيل أو تجديد تلقائي.`))return;
  setBusy(request.id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g32_approve_trial_request",{p_request:request.id});
   if(rpcError||data?.state!=="trial"||data?.trial_days!==14||data?.billing_enabled!==false)
    throw Error("Trial not activated");
   await refresh();
   setNotice("تم تفعيل التجربة المجانية لمدة 14 يوماً للباقة المختارة، دون تحصيل أو تجديد تلقائي.");
  }catch{setError("تعذّر تفعيل التجربة. تحقّق أن التاجر بلا اشتراك سابق وأن الطلب معلّق والباقة متاحة.");}
  finally{setBusy(null);}
 }
 async function changeTrialPlan(request:RequestRow){
  if(!canReview||busy||request.status!=="pending"||request.kind!=="plan_review"||!request.planCode||!request.period)return;
  if(!window.confirm(`موافقة على تغيير باقة التجربة الحالية للمتجر ${request.businessName} إلى ${request.planCode}؟ تاريخ انتهاء الـ14 يوم لن يتغير. الدفع والتجديد غير مفعّلين.`))return;
  setBusy(request.id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g35_approve_trial_plan_change",{p_request:request.id});
   if(rpcError||data?.status!=="trial"||data?.plan!==request.planCode||
      data?.trial_extended!==false||data?.billing_enabled!==false||
      data?.paid_subscription_modified!==false)
    throw Error("Trial plan change not verified");
   await refresh();
   setNotice("تم تغيير باقة التجربة فقط دون تمديدها أو تحصيل أي رسوم. سجل التدقيق محفوظ.");
  }catch{
   setError("تعذّر تغيير الباقة: قد تكون التجربة منتهية، أو الباقة هي نفسها، أو الطلب تمت معالجته. الاشتراك المدفوع يتطلب مساراً مختلفاً.");
  }finally{setBusy(null);}
 }
 async function cancelTrial(request:RequestRow){
  if(!canReview||busy||request.kind!=="cancellation"||request.status!=="pending")return;
  if(!window.confirm(`تأكيد إلغاء التجربة المجانية للمتجر ${request.businessName} فوراً؟ الطلبات والبيانات لا تُحذف، ولا يشمل هذا الإجراء الاشتراكات المدفوعة.`))return;
  setBusy(request.id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g34_approve_trial_cancellation",{p_request:request.id});
   if(rpcError||data?.status!=="cancelled"||data?.data_retained!==true||data?.billing_enabled!==false)
    throw Error("Trial cancellation was not confirmed");
   await refresh();
   setNotice("تم إلغاء التجربة المجانية وتوثيق العملية. بيانات المتجر محفوظة، ولم تُغيَّر أي مدفوعات.");
  }catch{
   setError("تعذّر إلغاء التجربة. لا يُسمح بإلغاء الاشتراك المدفوع بهذا الإجراء؛ افحص نوع الاشتراك وحالة الطلب.");
  }finally{setBusy(null);}
 }
 async function review(request:RequestRow,decision:"acknowledged"|"declined"){
  if(!canReview||busy||!window.confirm(decision==="acknowledged"?"تسجيل مراجعة الطلب فقط؟ لن يُفعّل أو يتغير أي اشتراك.":"تسجيل تعذّر الموافقة على هذا الطلب دون تغيير الاشتراك؟"))return;
  setBusy(request.id);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("g13_platform_resolve_request",{p_request:request.id,p_decision:decision});
   if(rpcError||data!==true)throw Error("Review not committed");
   await refresh();setNotice("تم توثيق قرار المراجعة. لم يتم تفعيل باقة أو إلغاء اشتراك أو تحصيل رسوم.");
  }catch{setError("تعذّر حفظ المراجعة. قد يكون الطلب تغير بالفعل، حدّث الصفحة وتحقق من صلاحية مالك المنصة.")}
  finally{setBusy(null)}
 }
 return <section id="subscription-service-requests" dir="rtl" style={{background:"#fff",border:"1px solid #dbe3e6",borderRadius:16,padding:"clamp(16px,3vw,26px)",margin:"18px 0"}}>
  <h2 style={{margin:"0 0 9px",fontSize:21,color:"#203e49"}}>طلبات خدمة الاشتراكات</h2>
  <p style={{fontSize:13,lineHeight:1.8,color:"#687986"}}>طلبات التجار للمراجعة البشرية فقط. زر «تمت المراجعة» لا يفعّل اشتراكاً أو يحصّل أموالاً؛ الفوترة تتطلب مسار موافقة مستقلاً.</p>
  <button type="button" onClick={()=>{if(!busy){setLoading(true);setError("");void refresh().catch(()=>setError("تعذّر تحديث قائمة الطلبات. حاول مرة أخرى.")).finally(()=>setLoading(false))}}} disabled={Boolean(busy)||loading} style={{minHeight:42,padding:"9px 13px",border:"1px solid #d2e0da",borderRadius:10,background:"#fff",color:"#356c61",cursor:"pointer",marginBottom:12}}>↻ تحديث قائمة الطلبات</button>
  {loading?<p role="status">جارٍ تحميل الطلبات…</p>:null}
  {error?<p role="alert" style={{color:"#a74734"}}>{error}</p>:null}
  {notice?<p role="status" style={{color:"#3f785c"}}>{notice}</p>:null}
  {!loading&&!error&&requests.length===0?<p style={{color:"#7e8d96",fontSize:13}}>لا توجد طلبات اشتراك حالياً.</p>:null}
  {!loading&&requests.length>0?<div style={{display:"grid",gap:10}}>{requests.map(request=><article key={request.id} style={{border:"1px solid #e3e8ea",borderRadius:12,padding:14,display:"grid",gap:7}}>
   <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between",flexWrap:"wrap"}}><strong>{request.businessName}</strong><span style={{fontSize:12,color:request.status==="pending"?"#986d30":"#577265"}}>{states[request.status]}</span></div>
   <p style={{margin:0,fontSize:13,color:"#697985"}}>{kinds[request.kind]} · {new Date(request.createdAt).toLocaleDateString("ar")}</p>
   {request.planCode?<p style={{margin:0,fontSize:13,color:"#315e51",fontWeight:750}}>الباقة المختارة: {request.planCode} · {request.period==="yearly"?"سنوي":"شهري"}</p>:null}
   {canReview&&request.status==="pending"?<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    {request.kind==="plan_review"&&request.planCode&&request.period?<button type="button" disabled={Boolean(busy)} onClick={()=>void changeTrialPlan(request)} style={{minHeight:42,padding:"9px 13px",background:"#e4f1ea",border:"1px solid #a8d1ba",borderRadius:9,color:"#246149",fontWeight:800,cursor:"pointer"}}>{busy===request.id?"جارٍ التبديل…":"تغيير باقة التجربة"}</button>:null}
    {request.kind==="cancellation"?<button type="button" disabled={Boolean(busy)} onClick={()=>void cancelTrial(request)} style={{minHeight:42,padding:"9px 13px",background:"#fff0ec",border:"1px solid #d4a294",borderRadius:9,color:"#944536",fontWeight:800,cursor:"pointer"}}>{busy===request.id?"جارٍ الإلغاء…":"اعتماد إلغاء التجربة"}</button>:null}
    {request.kind==="trial"&&request.planCode?<button type="button" disabled={Boolean(busy)} onClick={()=>void approveTrial(request)} style={{minHeight:42,padding:"9px 13px",background:"#286c56",color:"#fff",border:0,borderRadius:9,fontWeight:800,cursor:"pointer"}}>{busy===request.id?"جارٍ التفعيل…":"تفعيل تجربة 14 يوم"}</button>:null}
    <button type="button" disabled={Boolean(busy)} onClick={()=>void review(request,"acknowledged")} style={{minHeight:42,padding:"9px 13px",background:"#e6f2e7",border:"1px solid #b5d8bb",borderRadius:9,color:"#356949",cursor:"pointer"}}>{busy===request.id?"جارٍ الحفظ…":"تسجيل المراجعة"}</button>
    <button type="button" disabled={Boolean(busy)} onClick={()=>void review(request,"declined")} style={{minHeight:42,padding:"9px 13px",background:"#fff",border:"1px solid #dcb9b0",borderRadius:9,color:"#8b4f42",cursor:"pointer"}}>تعذّرت الموافقة</button>
   </div>:null}
  </article>)}</div>:null}
  {!canReview?<p style={{fontSize:12,color:"#6e7c84"}}>المشغّل يقرأ الطلبات؛ اعتماد المراجعة متاح لمالك المنصة فقط.</p>:null}
 </section>;
}
