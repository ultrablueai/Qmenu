import Link from "next/link";
import { redirect } from "next/navigation";
import { serverSupabase } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformAdminDashboard() {
 const supabase = await serverSupabase();
 const {data:{user},error:authError} = await supabase.auth.getUser();
 if(authError || !user) redirect("/login");
 const {data:account,error:permissionError} = await supabase.from("platform_admins")
  .select("user_id,role,enabled").eq("user_id",user.id).eq("enabled",true).maybeSingle();
 if(permissionError || !account) {
  return <main lang="ar" dir="rtl" style={{maxWidth:720,margin:"10vh auto",padding:24,fontFamily:"system-ui"}}>
   <h1>لوحة إدارة منصة بيجر</h1>
   <p role="alert">حسابك لا يملك صلاحية إدارة المنصة. صلاحية مالك نشاط تجاري لا تمنح صلاحية Super Admin تلقائياً.</p>
   <p>تخصيص صلاحية مدير المنصة يتم بإجراء منفصل مع تدقيق أمني، وليس عبر التسجيل الذاتي.</p>
   <Link href="/dashboard">العودة إلى لوحة النشاط</Link>
  </main>;
 }
 const {data:metrics,error:metricsError}=await supabase.rpc("platform_admin_overview");
 const overview=metrics?.[0] as {merchant_count:number;branch_count:number;account_memberships:number}|undefined;
 return <main lang="ar" dir="rtl" style={{minHeight:"100dvh",background:"#f5f8fa",color:"#1b3440",fontFamily:"system-ui",padding:"28px 18px"}}>
  <div style={{maxWidth:1150,margin:"0 auto"}}>
   <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap",marginBottom:27}}>
    <div><p style={{margin:0,color:"#228079",fontWeight:800,fontSize:12}}>BEGER · PLATFORM CONTROL</p><h1 style={{margin:"8px 0"}}>إدارة منصة بيجر</h1><p style={{fontSize:13,color:"#81939d"}}>لوحة تشغيل المنصة — منفصلة عن لوحات التجار والفروع.</p></div>
    <span style={{background:"#e6f5ef",padding:"9px 14px",borderRadius:25,color:"#246a54",fontWeight:750,fontSize:12}}>Staging فقط · {account.role==="platform_owner"?"مالك المنصة":"مشغّل المنصة"}</span>
   </header>
   {metricsError||!overview?<p role="alert" style={{padding:15,background:"#fff1ee",borderRadius:12}}>تعذّر تحميل ملخص المنصة. لا يمكن عرض أرقام غير مؤكدة.</p>:
    <section aria-label="مؤشرات المنصة" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14}}>
     {[
       {label:"الأنشطة المسجّلة",value:overview.merchant_count},
       {label:"إجمالي الفروع",value:overview.branch_count},
       {label:"عضويات المستخدمين",value:overview.account_memberships}
     ].map(metric=><div key={metric.label} style={{background:"white",padding:23,borderRadius:15,border:"1px solid #e6edf0"}}>
      <span style={{fontSize:12,color:"#78909b"}}>{metric.label}</span>
      <p style={{fontWeight:850,fontSize:28,margin:"12px 0 0"}}>{Number(metric.value).toLocaleString("ar")}</p>
     </div>)}
    </section>}
   <section style={{background:"#fff",borderRadius:16,border:"1px solid #e6edf0",marginTop:24,padding:25}}>
    <h2 style={{fontSize:17}}>الوظائف الإدارية التالية</h2>
    <p style={{lineHeight:2,fontSize:13,color:"#687e89"}}>الاشتراكات، إدارة التجار، إدارة خطط القطاعات، مراقبة الأخطاء، والدعم المتتبع بسجل تدقيق. هذه الوحدات لم تُفعّل بعد، ولا تمنح اللوحة وصولاً غير مقيد إلى بيانات التجار.</p>
   </section>
   <p style={{marginTop:26,fontSize:12,color:"#879aa3"}}>تظهر هنا المؤشرات الحقيقية المجمعة فقط. الإدارة التجارية الكاملة قيد التنفيذ المرحلي.</p>
  </div>
 </main>;
}
