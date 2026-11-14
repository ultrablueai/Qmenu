import Link from "next/link";
import {redirect} from "next/navigation";
import {serverSupabase} from "../../lib/supabase/server";
import SalonVerifiedWorkspace,{type SalonWorkspaceData} from "./salon-verified-workspace";
export const dynamic="force-dynamic";
export const metadata={title:"Beger | لوحة الصالون المحمية",robots:{index:false,follow:false}};
export default async function SalonWorkspace({searchParams}:{searchParams:Promise<{business?:string}>}){
 const supabase=await serverSupabase();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError||!user)redirect("/login");
 const {data:memberships,error:membershipError}=await supabase.from("memberships").select("business_id,role").eq("user_id",user.id).in("role",["owner","manager","staff"]).limit(50);
 const params=await searchParams;
 const selected=memberships?.find(m=>m.business_id===params.business)??memberships?.[0];
 let data:SalonWorkspaceData|null=null;
 let failed=Boolean(membershipError);
 if(selected&&!failed){
  const result=await supabase.rpc("beger_g47_salon_workspace",{p_business:selected.business_id});
  if(result.error)failed=true;else data=result.data as SalonWorkspaceData;
 }
 return <main lang="ar" dir="rtl" style={{fontFamily:"system-ui,Tahoma,sans-serif",minHeight:"100vh",background:"#f5f8f5",padding:"clamp(15px,4vw,36px)",color:"#1b3528"}}>
  <div style={{maxWidth:1120,margin:"0 auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:24}}>
    <div><span style={{fontSize:11,letterSpacing:2,fontWeight:800,color:"#2d8a60"}}>BEGER · SALON OS</span><h1 style={{margin:"5px 0 0",fontSize:27}}>لوحة تشغيل الصالون</h1><p style={{margin:"8px 0",color:"#6d8170",fontSize:13}}>مصدر البيانات: حسابك المحقق وقاعدة Staging، وليس بيانات المتصفح التجريبية.</p></div>
    <Link href="/dashboard" style={{textDecoration:"none",background:"#fff",border:"1px solid #d4e2d8",borderRadius:10,padding:12,color:"#205b40",fontWeight:800}}>لوحة النشاط الرئيسية</Link>
   </header>
   {memberships&&memberships.length>1?<nav aria-label="اختيار نشاط مرتبط بحسابك" style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:18}}>{memberships.map(m=><Link key={m.business_id} href={"/salon/workspace?business="+encodeURIComponent(m.business_id)} aria-current={selected?.business_id===m.business_id?"page":undefined} style={{background:selected?.business_id===m.business_id?"#205f46":"#fff",color:selected?.business_id===m.business_id?"#fff":"#205f46",padding:10,borderRadius:9,fontSize:12}}>النشاط {m.business_id.slice(0,8)} · {m.role}</Link>)}</nav>:null}
   {failed?<section role="alert" style={{background:"#fff",border:"1px solid #eccbbd",padding:22,borderRadius:15}}>تعذّر التحقق من صلاحيات الصالون أو لم يتم ربط ملف المعلم بهذا النشاط بعد. لا يمكن عرض الحجوزات دون تحقق الخادم.</section>:!selected?<p>لا يوجد نشاط مرتبط بالحساب. أنشئ نشاطاً أو اطلب من صاحبه إضافتك.</p>:data?<SalonVerifiedWorkspace businessId={selected.business_id} initial={data}/>:<p>لا توجد بيانات صالون متاحة لهذا الحساب.</p>}
   <p style={{fontSize:12,color:"#7a887e",marginTop:24}}>هذه مرحلة تجريبية على Staging. لا يتم إرسال رسائل خارجية، ولا قبول مدفوعات، ولا تعديل بيانات Production.</p>
  </div>
 </main>;
}
