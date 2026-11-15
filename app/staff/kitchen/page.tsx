import Link from "next/link";
import {redirect} from "next/navigation";
import {serverSupabase} from "../../../lib/supabase/server";
import MerchantKitchen from "../../dashboard/merchant-kitchen";
export const dynamic="force-dynamic";
type Branch={id:string;name:string};
export default async function StaffKitchenPage({searchParams}:{searchParams:Promise<{branch?:string}>}){
 const db=await serverSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/login");
 const {data,error}=await db.rpc("g9_my_kitchen_branches");
 if(error)return <main dir="rtl" style={{padding:28}}><h1>محطة المطبخ</h1><p>تعذّر التحقق من صلاحيات المطبخ.</p></main>;
 const branches=(Array.isArray(data)?data:[]) as Branch[];
 const params=await searchParams;
 const active=branches.find(branch=>branch.id===params.branch)??branches[0];
 return <main dir="rtl" style={{maxWidth:1250,margin:"0 auto",minHeight:"100dvh",padding:"clamp(14px,3vw,28px)",background:"#f8f7f0"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderBottom:"1px solid #e5ddcd",paddingBottom:14,marginBottom:19}}>
   <div><strong style={{fontSize:24,color:"#4b6538"}}>Beger · محطة المطبخ</strong><p style={{fontSize:12,color:"#807266",margin:"5px 0"}}>تجهيز الطلبات فقط — بدون مبيعات أو إعدادات</p></div>
   <form action="/auth/signout" method="post"><button type="submit" style={{border:"1px solid #dad2c3",background:"white",padding:"10px 13px",borderRadius:9}}>تسجيل الخروج</button></form>
  </header>
  {!branches.length?<section style={{padding:22,background:"white",borderRadius:15}}><h1>لا توجد فروع مخصصة</h1><p>اطلب من مالك المتجر منح حسابك صلاحية المطبخ لهذا الفرع.</p></section>:<>
   {branches.length>1?<nav aria-label="فروع المطبخ" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{branches.map(branch=><Link key={branch.id} href={"/staff/kitchen?branch="+encodeURIComponent(branch.id)} aria-current={branch.id===active.id?"page":undefined} style={{padding:"10px 13px",borderRadius:10,background:branch.id===active.id?"#627c46":"white",color:branch.id===active.id?"white":"#526d3a",textDecoration:"none"}}>{branch.name}</Link>)}</nav>:null}
   <MerchantKitchen key={active.id} branchId={active.id} branchName={active.name}/>
  </>}
 </main>;
}
