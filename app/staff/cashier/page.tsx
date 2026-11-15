import Link from "next/link";
import {redirect} from "next/navigation";
import {serverSupabase} from "../../../lib/supabase/server";
import MerchantCashier from "../../dashboard/merchant-cashier";
export const dynamic="force-dynamic";
type Branch={id:string;name:string};
export default async function StaffCashierPage({searchParams}:{searchParams:Promise<{branch?:string}>}){
 const db=await serverSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/login");
 const {data,error}=await db.rpc("g10_my_cashier_branches");
 if(error)return <main lang="ar" dir="rtl" style={{padding:28}}><h1>محطة الكاشير</h1><p>تعذّر التحقق من صلاحيات الكاشير.</p></main>;
 const branches=(Array.isArray(data)?data:[]) as Branch[];
 const params=await searchParams;
 const active=branches.find(b=>b.id===params.branch)??branches[0];
 return <main dir="rtl" style={{maxWidth:1240,margin:"0 auto",minHeight:"100dvh",padding:"clamp(14px,3vw,28px)",background:"#f8f7f0"}}>
  <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,borderBottom:"1px solid #e5ded0",paddingBottom:14,marginBottom:19}}>
   <div><strong style={{fontSize:24,color:"#526b3e"}}>Beger · محطة الكاشير</strong><p style={{fontSize:12,color:"#817668",margin:"5px 0"}}>قبول الطلبات واستلامها · لا صلاحيات إعدادات أو تقارير</p></div>
   <form action="/auth/signout" method="post"><button type="submit" style={{border:"1px solid #dad4c6",background:"white",padding:"10px 13px",borderRadius:9}}>تسجيل الخروج</button></form>
  </header>
  {!branches.length?<section style={{background:"white",borderRadius:14,padding:24}}><h1>لا توجد فروع مخصصة</h1><p>اطلب من مالك المتجر ربط حسابك بصلاحية الكاشير.</p></section>:<>
   {branches.length>1?<nav aria-label="اختيار فرع الكاشير" style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:16}}>{branches.map(b=><Link key={b.id} href={"/staff/cashier?branch="+encodeURIComponent(b.id)} aria-current={b.id===active.id?"page":undefined} style={{textDecoration:"none",borderRadius:9,padding:"10px 13px",background:b.id===active.id?"#647e48":"white",color:b.id===active.id?"white":"#506a3b"}}>{b.name}</Link>)}</nav>:null}
   <MerchantCashier key={active.id} branchId={active.id} branchName={active.name}/>
  </>}
 </main>;
}
