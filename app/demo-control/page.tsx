import Link from "next/link";
import {redirect} from "next/navigation";
import {serverSupabase} from "../../lib/supabase/server";

export const dynamic="force-dynamic";
export const metadata={title:"مركز اختبار متجر Beger التجريبي | Beger",robots:{index:false,follow:false}};
const DEMO_BUSINESS="b0000000-2026-4000-8000-000000000001";
const DEMO_BRANCH="b0000000-2026-4000-8000-000000000002";
const op="/dashboard?business="+DEMO_BUSINESS+"&view=operations";
type Tile={name:string;description:string;href:string;icon:string;hint?:string;external?:boolean};
const tiles:Tile[]=[
 {name:"الزبون — منيو QR",description:"افتح المنيو وأضف المنتجات للسلة وأرسل طلباً تجريبياً.",href:"/b/"+DEMO_BRANCH+"?lang=ar",icon:"☕",external:true},
 {name:"طلب سفري",description:"جرّب طلب الاستلام من المتجر، بدون طاولة.",href:"/b/"+DEMO_BRANCH+"?lang=ar&service=takeaway",icon:"🥡",external:true},
 {name:"رموز الطاولات",description:"اختر الطاولة وامسح رمزها لفتح المنيو مع رقمها.",href:op+"#qr-management",icon:"▦"},
 {name:"الطلبات",description:"راقب الطلب الجديد وغيّر حالته من مساحة الإدارة.",href:op+"#merchant-orders",icon:"▣"},
 {name:"الكاشير",description:"قبول الطلبات وتأكيد التسليم والتحصيل.",href:"/staff/cashier?branch="+DEMO_BRANCH,icon:"▤"},
 {name:"المطبخ",description:"ابدأ التحضير وأعلن الطلب جاهزاً.",href:"/staff/kitchen?branch="+DEMO_BRANCH,icon:"♨"},
 {name:"البيجر",description:"اصدر رقم انتظار وجرّب البطاقة والتنبيه.",href:op+"#merchant-pager",icon:"♧"},
 {name:"التقارير والتحصيل",description:"راجع الطلبات والتقارير والتحصيل المسجل.",href:op+"#merchant-reports",icon:"▥"},
 {name:"المنتجات والإضافات",description:"عدّل المنيو والأسعار والمجموعات والخيارات.",href:op+"#catalog-management",icon:"▧"},
 {name:"التصاميم واللغات",description:"اختبر ثيمات المنيو ولغاته الثلاث.",href:op+"#customer-appearance",icon:"◉"},
 {name:"التقييمات",description:"راجع تقييمات الطلبات المكتملة.",href:op+"#merchant-reviews",icon:"★"},
 {name:"الولاء والمكافآت",description:"افتح إعدادات الولاء التجريبية.",href:op+"#merchant-loyalty",icon:"✦"},
 {name:"الموظفون والصلاحيات",description:"أرسل دعوة جديدة للموظف أو راجع الأدوار.",href:op+"#merchant-staff",icon:"♙"},
 {name:"إعداد نموذج العمل",description:"غيّر إعدادات النشاط والميزات المتاحة.",href:"/dashboard?business="+DEMO_BUSINESS+"&view=settings",icon:"⚙"},
 {name:"اشتراك النشاط",description:"اعرض الحالة وطلبات مراجعة الاشتراكات.",href:"/dashboard?business="+DEMO_BUSINESS+"&view=subscription",icon:"▤"},
 {name:"لوحة مالك المنصة",description:"مراجعة طلبات الاشتراك وفحص جاهزية الإطلاق.",href:"/admin",icon:"◇"}
];
export default async function DemoControl(){
 const db=await serverSupabase();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)redirect("/login");
 const {data:membership,error:membershipError}=await db.from("memberships")
  .select("role").eq("business_id",DEMO_BUSINESS).eq("user_id",user.id).maybeSingle();
 if(membershipError||membership?.role!=="owner"){
  return <main lang="ar" dir="rtl" style={{maxWidth:640,margin:"55px auto",padding:24}}>
   <h1>مركز اختبار متجر Beger</h1>
   <p role="alert">هذه المساحة مخصصة لمالك المتجر التجريبي فقط. افتح المتجر من حساب مالكه؛ لا تمنح صلاحيات إضافية لاختبارها.</p>
   <Link href="/dashboard">العودة إلى مساحة العمل</Link>
  </main>;
 }
 const {data:branch,error:branchError}=await db.from("branches")
  .select("id,name").eq("id",DEMO_BRANCH).eq("business_id",DEMO_BUSINESS).maybeSingle();
 const {data:platformAccess,error:platformError}=await db.from("platform_admins").select("role")
  .eq("user_id",user.id).eq("enabled",true).maybeSingle();
 const isAdmin=!platformError&&["platform_owner","platform_operator"].includes(platformAccess?.role??"");
 const visibleTiles=tiles.filter(t=>isAdmin||t.href!=="/admin");
 return <main dir="rtl" lang="ar" style={{minHeight:"100dvh",padding:"clamp(16px,4vw,40px)",background:"#f6f8f2",color:"#344733"}}>
  <div style={{maxWidth:1160,margin:"0 auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",paddingBottom:21,borderBottom:"1px solid #e0e6d7"}}>
    <div><span style={{fontSize:12,fontWeight:900,color:"#69874c"}}>BEGER · DEMO CONTROL</span><h1 style={{fontSize:"clamp(25px,5vw,36px)",margin:"9px 0"}}>مركز اختبار المتجر التجريبي</h1><p style={{margin:0,color:"#687765",lineHeight:1.7}}>كل أدوات تجربة الزبون والتاجر والموظفين من صفحة واحدة، على Staging فقط.</p></div>
    <Link href={"/dashboard?business="+DEMO_BUSINESS+"&view=overview"} style={{textDecoration:"none",fontWeight:800,color:"#426c3b",border:"1px solid #c8d8bd",background:"#fff",borderRadius:11,padding:"12px 15px"}}>العودة إلى لوحة التاجر</Link>
   </header>
   {branchError||!branch?<p role="alert" style={{background:"#fff1e9",padding:17,borderRadius:12}}>تعذّر التحقق من الفرع التجريبي. لا تستخدم روابط الاختبار حتى تتأكد من وجوده.</p>:<>
    <div style={{margin:"20px 0",background:"#eef4e6",border:"1px solid #d5e4c8",padding:"14px 17px",borderRadius:14}}>
     <strong>المتجر: Beger Demo Café — تجريبي · {branch.name}</strong>
     <p style={{color:"#62765b",fontSize:13,margin:"7px 0 0",lineHeight:1.7}}>حساب المالك يستطيع فتح محطات الكاشير والمطبخ والبيجر وفق قواعد الأدوار الحالية، بدون إنشاء موظف وهمي. لتجربة منع الصلاحيات استخدم حساب موظف مستقل.</p>
    </div>
    <section aria-label="محطات الاختبار" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,235px),1fr))",gap:13}}>
     {visibleTiles.map(tile=><Link key={tile.name} href={tile.href} target={tile.external?"_blank":undefined} rel={tile.external?"noopener noreferrer":undefined} style={{display:"grid",alignContent:"start",gap:9,background:"#fff",border:"1px solid #e0e6dc",borderRadius:16,padding:19,textDecoration:"none",color:"#314d32",minHeight:144,boxShadow:"0 4px 15px #20371a06"}}>
      <span aria-hidden="true" style={{fontSize:24}}>{tile.icon}</span><strong style={{fontSize:16}}>{tile.name}</strong><span style={{fontSize:12,color:"#6b7569",lineHeight:1.75}}>{tile.description}</span>
     </Link>)}
    </section>
    <section style={{margin:"25px 0 0",padding:20,borderRadius:14,background:"#fff",border:"1px solid #e2e7db"}}>
     <h2 style={{fontSize:19,margin:"0 0 8px"}}>طريقة الاختبار</h2>
     <p style={{lineHeight:1.9,margin:0,fontSize:14}}>افتح المنيو بصفحة زبون مستقلة، أرسل طلباً، ثم ارجع إلى «الطلبات» أو «الكاشير» لتقبله، وبعدها «المطبخ» لتجهيزه وإعلان الجاهزية، ثم «الكاشير» للتسليم. جرّب البيجر المستقل والـQR والتقييمات كلٌّ من قسمه. الطلبات التي تنشئها هنا بيانات اختبار حقيقية في Staging وليست مدفوعات تجارية.</p>
    </section>
   </>}
  </div>
 </main>;
}
