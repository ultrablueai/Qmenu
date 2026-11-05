import Link from "next/link";
import MerchantSubscriptionRequests from "./merchant-subscription-requests";

export type MerchantSubscriptionStatus={
 state:string;has_subscription:boolean;plan_code?:string;plan_name?:string;starts_at?:string;ends_at?:string|null;
};
const labels:Record<string,string>={
 not_configured:"لم تُفعّل باقة بعد",
 trial:"فترة تجريبية",
 active:"اشتراك نشط",
 past_due:"بحاجة إلى مراجعة الاشتراك",
 paused:"موقوف مؤقتاً",
 canceled:"ملغى",
 cancelled:"ملغى",
 expired:"انتهت مدة الاشتراك",
 scheduled:"مجدول ولم يبدأ بعد"
};
export default function MerchantSubscriptionStatusPanel({data,error,businessId,canRequest}:{data:MerchantSubscriptionStatus|null;error:boolean;businessId:string;canRequest:boolean}){
 const state=data?.state??"not_configured";
 const fmt=(value?:string|null)=>{if(!value)return "غير محدد";const date=new Date(value);return Number.isNaN(date.valueOf())?"غير متاح":date.toLocaleDateString("ar",{year:"numeric",month:"short",day:"numeric"});};
 return <section dir="rtl" aria-labelledby="beger-subscription-status-title" style={{background:"#fff",border:"1px solid #e5e8dc",borderRadius:16,padding:"clamp(16px,3vw,25px)",margin:"18px 0"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <div><span style={{fontSize:11,color:"#708653",fontWeight:900}}>BEGER · SUBSCRIPTION</span><h2 id="beger-subscription-status-title" style={{margin:"6px 0 0",fontSize:21}}>اشتراك نشاطك</h2></div>
   <span style={{background:"#f1f5ea",color:"#4b6540",padding:"8px 12px",borderRadius:30,fontSize:12,fontWeight:850}}>{error?"تعذّر التحقق":labels[state]??"حالة تحتاج مراجعة"}</span>
  </div>
  {error?<p role="alert" style={{color:"#9f4938",lineHeight:1.8}}>تعذّر قراءة حالة الاشتراك من قاعدة البيانات. لن نعتبر الاشتراك مفعّلاً دون تحقق. حدّث الصفحة أو تواصل مع دعم المنصة.</p>:
  !data?.has_subscription?<p style={{color:"#756b5e",lineHeight:1.8}}>لا توجد باقة مسجلة لهذا النشاط حتى الآن. تشغيلك الحالي هو للتجربة على Staging، وليس اشتراكاً مدفوعاً أو فاتورة تجارية.</p>:
  <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,185px),1fr))",gap:12,marginTop:18}}>
   <div><dt style={{fontSize:12,color:"#807668"}}>الباقة</dt><dd style={{margin:"6px 0",fontWeight:800}}>{data.plan_name??data.plan_code??"غير مسمى"}</dd></div>
   <div><dt style={{fontSize:12,color:"#807668"}}>بداية الفترة</dt><dd style={{margin:"6px 0",fontWeight:800}}>{fmt(data.starts_at)}</dd></div>
   <div><dt style={{fontSize:12,color:"#807668"}}>نهاية الفترة</dt><dd style={{margin:"6px 0",fontWeight:800}}>{fmt(data.ends_at)}</dd></div>
  </dl>}
  <p style={{fontSize:12,lineHeight:1.9,color:"#86796b",marginBottom:0}}>هذه صفحة معلومات فقط. لا تخصم أي مبالغ ولا تفعّل أو تجدّد الاشتراك. أي باقة مدفوعة تحتاج اعتماد الأسعار والفواتير أولاً.</p>
  {!error?<MerchantSubscriptionRequests businessId={businessId} hasSubscription={Boolean(data?.has_subscription)} canRequest={canRequest}/>:null}
  <Link href="/dashboard?view=operations" style={{display:"inline-flex",marginTop:12,color:"#4d703a",fontWeight:800,textDecoration:"none",fontSize:13}}>العودة إلى إدارة المتجر ←</Link>
 </section>;
}
