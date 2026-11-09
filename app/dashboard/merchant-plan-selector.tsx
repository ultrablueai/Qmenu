"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
type Offer={code:"start"|"pro"|"business";name:string;currency:string;monthlyGrossMinor:number;annualGrossMinor:number;trialDays:number;includedBranches:number;promoMonthlyGrossMinor:number|null;promoMonths:number|null;promoMaxMerchants:number|null;published:boolean;billingEnabled:boolean};
const format=(n:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n/100);
const features:Record<Offer["code"],string>={
 start:"منيو QR والمنتجات والإضافات والتصميم واللغات",
 pro:"كل Start، مع طلبات الطاولات والسفري والمطبخ والكاشير والطباعة والبيجر",
 business:"كل Pro، مع فرعين وتقارير وإدارة موسّعة"
};
export default function MerchantPlanSelector({businessId,canRequest,hasSubscription,countryCode}:{businessId:string;canRequest:boolean;hasSubscription:boolean;countryCode:string}){
 const [offers,setOffers]=useState<Offer[]>([]);
 const [period,setPeriod]=useState<"monthly"|"yearly">("monthly");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const seq=useRef(0);
 const load=useCallback(async()=>{
  const current=++seq.current;
  const supabase=browserSupabase();
  const [catalog,requests]=await Promise.all([
   supabase.rpc("beger_g31_merchant_offer_catalog",{p_business:businessId}),
   supabase.rpc("g13_merchant_requests",{p_business:businessId})
  ]);
  if(current!==seq.current)return;
  if(catalog.error||!Array.isArray(catalog.data)||catalog.data.length!==3||requests.error||!Array.isArray(requests.data))
   throw Error("Unable to validate plan catalog or request state");
  const codes=new Set(catalog.data.map((o:Offer)=>o.code));
  if(codes.size!==3||!["start","pro","business"].every(k=>codes.has(k)))throw Error("Incomplete catalog");
  setOffers(catalog.data as Offer[]);
  setPending(requests.data.some((r:{status:string})=>r.status==="pending"));
  setError("");
 },[businessId]);
 useEffect(()=>{
  let active=true;setOffers([]);setError("");setNotice("");setLoading(true);setPending(false);
  void load().catch(()=>{if(active)setError("تعذّر التحقق من الباقات أو الطلبات، تم إيقاف الاختيار مؤقتاً.")}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;seq.current++};
 },[load]);
 async function request(code:Offer["code"],trial:boolean){
  if(!canRequest||busy||loading||pending||error)return;
  const o=offers.find(p=>p.code===code);
  if(!o||!window.confirm(trial?`إرسال طلب تجربة مجانية 14 يوماً لباقة ${o.name} إلى إدارة Beger؟`:`طلب مراجعة باقة ${o.name} (${period==="monthly"?"شهرية":"سنوية"}) دون دفع أو تفعيل تلقائي؟`))return;
  setBusy(true);setNotice("");setError("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_g31_request_plan",{
    p_business:businessId,p_plan_code:code,p_period:period,p_trial:trial
   });
   if(rpcError||data?.status!=="pending"||data?.billing_enabled!==false||data?.subscription_activated!==false)
    throw Error("Plan request failed");
   await load();
   setNotice("وصل طلب اختيار الباقة إلى إدارة Beger. لا يوجد تحصيل أو اشتراك مدفوع، والتجربة تحتاج موافقة الإدارة.");
  }catch{setError("تعذّر تقديم الطلب. ربما يوجد طلب معلّق أو بيانات الباقة غير صالحة؛ حدّث الصفحة.");}
  finally{setBusy(false);}
 }
 if(countryCode!=="TR")return null;
 return <section aria-labelledby="beger-plan-selector-title" style={{margin:"22px 0",padding:"20px 0",borderTop:"1px solid #e7e9dd"}}>
  <div style={{display:"flex",gap:12,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
   <div><h3 id="beger-plan-selector-title" style={{fontSize:19,margin:"0 0 7px"}}>اختر باقة Beger</h3>
    <p style={{fontSize:12,color:"#6b776b",lineHeight:1.8,margin:0}}>أسعار تركيا المقترحة شاملة KDV بافتراض 20%. هذه معاينة Staging وليست عرض بيع نهائياً.</p></div>
   <div role="group" aria-label="دورة الاشتراك" style={{display:"flex",gap:6}}>
    {(["monthly","yearly"] as const).map(p=><button type="button" key={p} aria-pressed={period===p} disabled={busy} onClick={()=>setPeriod(p)} style={{border:"1px solid #c8d7c3",borderRadius:8,padding:"8px 12px",background:period===p?"#e7f2e5":"#fff",fontWeight:700,color:"#365b44"}}>{p==="monthly"?"شهري":"سنوي"}</button>)}
   </div>
  </div>
  {loading?<p role="status">جارٍ تحميل الباقات…</p>:null}
  {error?<p role="alert" style={{color:"#a04c3e"}}>{error}</p>:null}
  {notice?<p role="status" style={{color:"#2c7153"}}>{notice}</p>:null}
  {!loading&&offers.length===3?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,225px),1fr))",gap:12,marginTop:18}}>
    {offers.map(o=><article key={o.code} style={{border:o.code==="pro"?"2px solid #4f9076":"1px solid #dce5dc",borderRadius:15,padding:17,background:"#fff",display:"grid",gap:10}}>
      <div><strong style={{fontSize:18}}>{o.name}</strong>{o.code==="pro"?<span style={{marginInlineStart:9,color:"#2e785c",fontSize:11}}>الأكثر مناسبة للمطاعم</span>:null}</div>
      <strong style={{fontSize:25,color:"#244b3d"}}>{format(period==="monthly"?o.monthlyGrossMinor:o.annualGrossMinor)}</strong>
      <span style={{fontSize:12,color:"#697a6c"}}>{period==="monthly"?"شهرياً":"سنوياً"} · {o.includedBranches} {o.includedBranches===1?"فرع":"فروع"}</span>
      <p style={{fontSize:13,lineHeight:1.8,color:"#50615a",margin:0}}>{features[o.code]}</p>
      {o.code==="pro"&&o.promoMonthlyGrossMinor!=null?<small style={{color:"#546e5b",lineHeight:1.7}}>عرض تأسيسي مقترح: {format(o.promoMonthlyGrossMinor)} شهرياً لأول {o.promoMaxMerchants} متجر لمدة {o.promoMonths} أشهر؛ غير متاح للحجز أو الدفع حالياً.</small>:null}
      <button type="button" disabled={!canRequest||busy||pending||Boolean(error)} onClick={()=>void request(o.code,!hasSubscription)}
       style={{minHeight:43,background:"#286c56",color:"#fff",border:0,borderRadius:9,fontWeight:800,cursor:"pointer"}}>
       {pending?"لديك طلب قيد المراجعة":busy?"جارٍ الإرسال":!hasSubscription?"اطلب تجربة مجانية 14 يوم":"اطلب تغيير / مراجعة الباقة"}
      </button>
    </article>)}
   </div>:null}
   {!canRequest?<p style={{fontSize:12,color:"#7b8076"}}>صاحب النشاط فقط يستطيع طلب الباقة، والمدير يمكنه الاطلاع عليها.</p>:null}
   <p style={{fontSize:12,color:"#72816f",lineHeight:1.8}}>لا تُفعّل الباقة عند الضغط. يراجعها مالك منصة Beger أولاً؛ والتفعيل المدفوع يحتاج دفعاً مؤكداً وفاتورة معتمدة قانونياً.</p>
 </section>;
}
