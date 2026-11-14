import Link from "next/link";
import {redirect} from "next/navigation";
import {serverSupabase} from "../../lib/supabase/server";
import StaffInvitations from "./staff-invitations";

export const dynamic="force-dynamic";
type Branch={id:string;name:string};
type Role="cashier"|"kitchen"|"pager";
const stations:{role:Role;title:string;description:string;rpc:string;href:string}[]=[
 {role:"cashier",title:"محطة الكاشير",description:"قبول الطلبات، التسليم وتسجيل التحصيل",rpc:"g10_my_cashier_branches",href:"/staff/cashier"},
 {role:"kitchen",title:"محطة المطبخ",description:"التحضير وإعلان الجاهزية فقط",rpc:"g9_my_kitchen_branches",href:"/staff/kitchen"},
 {role:"pager",title:"محطة البيجر",description:"إصدار أرقام الانتظار المستقلة",rpc:"g7_staff_my_pager_branches",href:"/staff/pager"}
];
export default async function StaffHome(){
 const db=await serverSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/login");
 // Each RPC verifies auth.uid() and assigned branches; never infer access from email.
 const results=await Promise.all(stations.map(station=>db.rpc(station.rpc)));
 const assigned=stations.map((station,index)=>({
  ...station,branches:!results[index].error&&Array.isArray(results[index].data)?results[index].data as Branch[]:[]
 }));
 const hasAccess=assigned.some(station=>station.branches.length>0);
 const lookupFailed=results.some(result=>Boolean(result.error));
 return <main dir="rtl" style={{maxWidth:960,margin:"0 auto",padding:"clamp(18px,4vw,42px)",minHeight:"100dvh",background:"#fbfaf6",color:"#3d382d"}}>
  <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,borderBottom:"1px solid #e8e1d4",paddingBottom:18}}>
   <div><span style={{fontWeight:900,color:"#678349",fontSize:13}}>BEGER · STAFF</span><h1 style={{margin:"6px 0",fontSize:"clamp(24px,5vw,34px)"}}>مساحة الموظف</h1><p style={{margin:0,color:"#817363",overflowWrap:"anywhere"}}>الحساب: {user.email??"حساب مسجّل"}</p></div>
   <form action="/auth/signout" method="post"><button type="submit" style={{padding:"10px 14px",border:"1px solid #d9d5c9",borderRadius:10,background:"white",cursor:"pointer"}}>تسجيل الخروج</button></form>
  </header>
  {lookupFailed?<p role="alert" style={{marginTop:20,padding:14,background:"#fff0e7",borderRadius:12}}>تعذّر التحقق من بعض صلاحياتك. حدّث الصفحة قبل طلب تعيين جديد؛ لن نعرض وصولاً غير متحقق منه.</p>:null}
  <section style={{marginTop:26}}>
   <h2 style={{fontSize:21}}>{hasAccess?"محطاتك المصرّح بها":"دعواتك وصلاحياتك"}</h2>
   <p style={{lineHeight:1.8,color:"#766e62"}}>{hasAccess?"اختر محطة العمل والفرع المخصّص لك. كل محطة تتحقق من صلاحياتك عند فتحها.":"افحص دعواتك أدناه واقبل الدعوة المرتبطة ببريدك. إن لم تجد دعوة، اطلب من المالك إدخال بريدك في إدارة الموظفين."}</p>
   {hasAccess?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:12,marginTop:18}}>
    {assigned.filter(station=>station.branches.length>0).map(station=><article key={station.role} style={{background:"white",border:"1px solid #e5ded2",borderRadius:16,padding:18}}>
     <h3 style={{marginTop:0}}>{station.title}</h3><p style={{fontSize:13,color:"#756c60"}}>{station.description}</p>
     <ul style={{paddingInlineStart:18,display:"grid",gap:10}}>{station.branches.map(branch=><li key={branch.id}><Link href={station.href+"?branch="+encodeURIComponent(branch.id)} style={{color:"#496a37",fontWeight:800}}>{branch.name} ←</Link></li>)}</ul>
    </article>)}
   </div>:<p role="status" style={{padding:18,background:"#eff4e8",borderRadius:14,color:"#506a3a"}}>لم تُمنح لك بعد صلاحية الكاشير أو المطبخ أو البيجر. لن تحتاج إلى إنشاء متجر للحصول عليها.</p>}
  </section>
  <StaffInvitations/>
  <section style={{marginTop:32,padding:18,border:"1px solid #e8dfd2",borderRadius:14,background:"white"}}>
   <h2 style={{fontSize:17,margin:"0 0 8px"}}>هل أنت صاحب نشاط جديد؟</h2>
   <p style={{fontSize:13,color:"#766c60",lineHeight:1.8}}>إذا كنت تريد فعلاً افتتاح متجرك الخاص وليس الدخول كموظف، يمكنك إنشاء نشاطك الأول.</p>
   <Link href="/onboarding" style={{color:"#4d6c38",fontWeight:800}}>الانتقال إلى إعداد نشاط جديد ←</Link>
  </section>
 </main>;
}
