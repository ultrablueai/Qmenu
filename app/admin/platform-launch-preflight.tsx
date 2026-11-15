"use client";
import {useTransition} from "react";
import {useRouter} from "next/navigation";

export type PlatformLaunchSnapshot={
 checked_at:string;businesses:number;branches:number;plans:number;active_plans:number;
 subscription_records:number;current_trials:number;elapsed_subscription_periods:number;
 pending_subscription_reviews:number;pending_staff_invitations:number;
 commercial_go:boolean;billing_live:boolean;
};

const checkpoints=[
 {title:"تجربة فعلية بحسابات مستقلة",detail:"مالك متجرين، موظفو الكاشير والمطبخ والبيجر، وجهاز زبون — مع إثبات عزل الفروع"},
 {title:"تسعير وفواتير واشتراك مدفوع",detail:"اعتماد العملة والضرائب والأسعار، ثم اختبار التحصيل والفواتير والإلغاء والتجديد"},
 {title:"تشغيل وأمان واستعادة",detail:"اختبارات صلاحيات فعلية، تنبيهات الأعطال، تدريب استعادة نسخة احتياطية"},
 {title:"اعتماد قانوني وتجربة أجهزة",detail:"الخصوصية والشروط والإيصالات، وفحص عربي وتركي وإنجليزي على هاتف حقيقي"}
];

function Stat({title,value,description}:{title:string;value:number;description:string}){
 return <div style={{border:"1px solid #dbe4e4",borderRadius:13,padding:"15px 16px",background:"#fff"}}>
  <p style={{fontSize:12,margin:"0 0 7px",color:"#657780"}}>{title}</p>
  <strong style={{fontSize:27,color:"#214b51",fontVariantNumeric:"tabular-nums"}}>{value.toLocaleString("ar")}</strong>
  <p style={{fontSize:11,color:"#7b8d8c",margin:"6px 0 0",lineHeight:1.6}}>{description}</p>
 </div>;
}

export default function PlatformLaunchPreflight({snapshot,error}:{snapshot:PlatformLaunchSnapshot|null;error:boolean}){
 const router=useRouter();
 const [refreshing,startTransition]=useTransition();
 const checked=snapshot?.checked_at?new Date(snapshot.checked_at):null;
 const checkedText=checked&&!Number.isNaN(checked.valueOf())?checked.toLocaleString("ar",{dateStyle:"medium",timeStyle:"short"}):"غير متاح";
 return <section id="launch-readiness" dir="rtl" aria-labelledby="launch-readiness-heading" style={{border:"1px solid #dbe4e4",borderRadius:17,background:"#f6f9f6",padding:"clamp(18px,3vw,27px)",margin:"20px 0"}}>
  <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
   <div><p style={{margin:"0 0 6px",fontSize:11,fontWeight:900,letterSpacing:1,color:"#53716c"}}>BEGER · STAGING RELEASE GATE</p>
    <h2 id="launch-readiness-heading" style={{margin:0,fontSize:22,color:"#21444a"}}>فحص جاهزية الإطلاق التجاري</h2>
    <p style={{color:"#627777",lineHeight:1.8,fontSize:13,maxWidth:680}}>الأرقام أدناه قراءة مباشرة من Staging. لا تشمل موافقات الأسعار والضرائب أو نتائج الاختبارات اليدوية، ولا تعني جاهزية الإطلاق.</p>
   </div>
   <span role="status" style={{background:"#fff1de",color:"#8b5a18",border:"1px solid #e9cc92",borderRadius:999,padding:"9px 14px",fontSize:12,fontWeight:850}}>الإطلاق التجاري غير معتمد</span>
  </div>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",margin:"12px 0 18px"}}>
   <p style={{color:"#657675",fontSize:12,margin:0}}>آخر تحقق: {error?"فشل التحقق":checkedText}</p>
   <button type="button" onClick={()=>startTransition(()=>router.refresh())} disabled={refreshing} style={{border:"1px solid #b9d0cb",borderRadius:10,minHeight:44,padding:"10px 14px",background:"#fff",color:"#316e68",fontWeight:800,cursor:"pointer"}}>{refreshing?"جارٍ التحديث…":"↻ تحديث المؤشرات"}</button>
  </div>
  {error||!snapshot?<p role="alert" style={{padding:16,background:"#fff1eb",color:"#994b34",borderRadius:12}}>فشل التحقق من المؤشرات، ولا يجوز الاستناد إلى أرقام أو إصدار قرار إطلاق. تحقق من صلاحيات المنصة وحالة قاعدة البيانات.</p>:
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,190px),1fr))",gap:10}}>
    <Stat title="الأنشطة" value={snapshot.businesses} description="نشاطات مسجّلة — ليست عملاء مدفوعين"/>
    <Stat title="الفروع" value={snapshot.branches} description="فروع موجودة في Staging"/>
    <Stat title="الباقات المتاحة" value={snapshot.active_plans} description={snapshot.plans+" باقة معرّفة إجمالاً"}/>
    <Stat title="سجلات الاشتراكات" value={snapshot.subscription_records} description="تشمل الحالات غير النشطة، لا تمثل إيراداً"/>
    <Stat title="التجارب السارية" value={snapshot.current_trials} description="حسب وقت البداية والنهاية المسجلين"/>
    <Stat title="فترات اشتراك منتهية" value={snapshot.elapsed_subscription_periods} description="قياس زمني، لا يؤكد تنفيذ تقييد الوصول"/>
    <Stat title="طلبات اشتراك معلّقة" value={snapshot.pending_subscription_reviews} description="تحتاج متابعة من إدارة المنصة"/>
    <Stat title="دعوات موظفين معلّقة" value={snapshot.pending_staff_invitations} description="لم تُقبل بعد، ولا تمنح صلاحية"/>
   </div>}
  <div style={{marginTop:23}}>
   <h3 style={{margin:"0 0 12px",fontSize:17,color:"#2f4e4d"}}>شروط يجب إغلاقها قبل البيع</h3>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:10}}>
    {checkpoints.map(item=><article key={item.title} style={{padding:15,border:"1px solid #e2e8e2",background:"#fff",borderRadius:13}}>
     <strong style={{fontSize:13,color:"#354e4c"}}>○ {item.title}</strong>
     <p style={{fontSize:12,lineHeight:1.8,color:"#6c7b79",margin:"6px 0 0"}}>{item.detail}</p>
    </article>)}
   </div>
  </div>
  <p style={{fontSize:12,color:"#697b73",lineHeight:1.8,marginTop:16}}>هذه لوحة فحص للقراءة فقط. لا تنشئ باقات أو اشتراكات أو فواتير، ولا تستطيع نشر Production أو منح شهادة مطابقة.</p>
 </section>;
}
