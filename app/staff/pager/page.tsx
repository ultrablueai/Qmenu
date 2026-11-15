import Link from "next/link";
import {redirect} from "next/navigation";
import {serverSupabase} from "../../../lib/supabase/server";
import MerchantPager from "../../dashboard/merchant-pager";
export const dynamic="force-dynamic";
type Branch={id:string;name:string};
export default async function StaffPagerPage({searchParams}:{searchParams:Promise<{branch?:string}>}){
 const db=await serverSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/login");
 const {data,error}=await db.rpc("g7_staff_my_pager_branches");
 if(error) return <main dir="rtl" style={{padding:32,maxWidth:960,margin:"auto"}}><h1>محطة عمل البيجر</h1><p>تعذّر التحقق من صلاحيات الفرع، حاول مجدداً.</p></main>;
 const branches=(Array.isArray(data)?data:[]) as Branch[];
 const params=await searchParams;
 const active=branches.find(b=>b.id===params.branch)??branches[0];
 return <main dir="rtl" style={{maxWidth:1250,margin:"0 auto",padding:"clamp(14px,3vw,28px)",background:"#f9f7f0",minHeight:"100dvh"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:20,borderBottom:"1px solid #e6dece",paddingBottom:15}}>
   <div><strong style={{fontSize:23,color:"#435c36"}}>Beger · محطة الموظف</strong><p style={{fontSize:12,color:"#80746a",margin:"5px 0 0"}}>البيجر فقط — بدون إعدادات المتجر أو بيانات المبيعات</p></div>
   <form action="/auth/signout" method="post"><button type="submit" style={{padding:"9px 15px",border:"1px solid #ddd6c5",borderRadius:10,background:"white"}}>تسجيل الخروج</button></form>
  </header>
  {branches.length===0?<section style={{background:"white",border:"1px solid #e6dfd2",padding:24,borderRadius:16}}><h1>لا توجد فروع مصرّح لك بها</h1><p>اطلب من مالك النشاط ربط حسابك بفرع من قسم الموظفين والصلاحيات.</p></section>:<>
   {branches.length>1?<nav aria-label="اختيار الفرع" style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:19}}>{branches.map(b=><Link key={b.id} href={"/staff/pager?branch="+encodeURIComponent(b.id)} aria-current={b.id===active.id?"page":undefined} style={{padding:"10px 14px",borderRadius:11,background:b.id===active.id?"#657d48":"white",color:b.id===active.id?"white":"#53663d",textDecoration:"none",border:"1px solid #d8dfcc"}}>{b.name}</Link>)}</nav>:null}
   <MerchantPager key={active.id} branchId={active.id} branchName={active.name} staffMode/>
  </>}
 </main>;
}
