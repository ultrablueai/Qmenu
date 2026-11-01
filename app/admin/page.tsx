import Link from "next/link";
import { redirect } from "next/navigation";
import { serverSupabase } from "../../lib/supabase/server";
import styles from "./admin.module.css";
import PlanManager from "./plan-manager";
import TrialManager from "./trial-manager";

export const dynamic = "force-dynamic";

type DirectoryEntry = {
 business_id: string;
 business_name: string;
 country_code: string;
 branch_count: number | string;
 member_count: number | string;
 subscription_status: string | null;
 created_at: string;
};

const nextModules = [
 { icon: "▤", title: "اشتراكات التجار", text: "ربط اشتراك مدفوع بتاجر وتحديد أسعاره وفواتيره. غير متاح بعد." },
 { icon: "♧", title: "الدعم وتغيير الصلاحيات", text: "تغيير صلاحيات المسؤولين ومتابعة طلبات الدعم ما زالا بحاجة إجراءات موافقة وتحقق منفصلة. غير متاح بعد." },
 { icon: "◷", title: "مراقبة الخدمات", text: "مراقبة أخطاء التشغيل والتنبيهات وسلامة النظام. لا يوجد ربط مباشر بعد." },
 { icon: "▥", title: "التحليلات والفوترة", text: "التقارير المالية والاشتراكات والتحصيل والتصدير. لا توجد إيرادات تجارية محتسبة بعد." },
];

export default async function PlatformAdminDashboard() {
 const supabase = await serverSupabase();
 const { data: { user }, error: authError } = await supabase.auth.getUser();
 if (authError || !user) redirect("/login?next=/admin");

 const { data: account, error: permissionError } = await supabase.from("platform_admins")
  .select("user_id,role,enabled").eq("user_id",user.id).eq("enabled",true).maybeSingle();

 if(permissionError || !account) {
  return <main dir="rtl" lang="ar" style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#f5f7fa",fontFamily:"system-ui",padding:20}}>
   <section style={{width:"100%",maxWidth:480,background:"#fff",border:"1px solid #e5edf1",borderRadius:19,padding:28,boxSizing:"border-box"}}>
    <p style={{color:"#1b7773",fontSize:12,fontWeight:800}}>BEGER · PLATFORM ACCESS</p>
    <h1 style={{fontSize:24,color:"#1d3542"}}>لوحة مالك منصة بيجر</h1>
    <p role="alert" style={{fontSize:13,lineHeight:2,color:"#637989"}}>هذا الحساب لا يحمل صلاحية مالك أو مشغّل المنصة. صلاحيات التاجر لا تسمح بدخول كنترول بنل بيجر.</p>
    <p style={{fontSize:12,color:"#7e8f9e",lineHeight:1.9}}>يجب اعتماد حساب مالك المنصة بشكل مستقل بعد التحقق من ملكية الحساب. لن نفعّل الصلاحية تلقائياً.</p>
    <Link href="/dashboard" style={{color:"#176c71",fontSize:13,fontWeight:800}}>العودة إلى لوحة التاجر</Link>
   </section>
  </main>;
 }

 // Keep tenant membership independent of platform access. No membership means no business switch.
 const {data: merchantMembership, error: merchantMembershipError} = await supabase.from("memberships")
  .select("business_id").eq("user_id",user.id).limit(1);
 const canOpenBusiness = !merchantMembershipError && Boolean(merchantMembership?.length);

 const [summaryResult,directoryResult,plansResult,trialsResult,auditResult,rosterResult] = await Promise.all([
  supabase.rpc("platform_admin_overview"),
  supabase.rpc("platform_admin_business_directory"),
  supabase.from("plans").select("id,code,name,active").order("code",{ascending:true}),
  supabase.rpc("platform_admin_trial_overview"),
  supabase.rpc("platform_admin_audit_overview"),
  account.role==="platform_owner" ? supabase.rpc("platform_owner_access_roster") : Promise.resolve({data:[],error:null})
 ]);
 const summary = (summaryResult.data?.[0] ?? null) as
  {merchant_count: number | string;branch_count:number | string;account_memberships:number | string} | null;
 const directory = (directoryResult.data ?? []) as DirectoryEntry[];
 const failed = Boolean(summaryResult.error || directoryResult.error || !summary);
 const owner = account.role === "platform_owner";
 const plans = (plansResult.data ?? []) as {id:string;code:string;name:string;active:boolean}[];
 const trials = (trialsResult.data ?? []) as {business_id:string;plan_code:string;starts_at:string;ends_at:string|null;effective_status:string}[];
 const auditEvents = (auditResult.data ?? []) as {event_id:number;event_action:string;target_kind:string;event_at:string}[];
 const roster = (rosterResult.data ?? []) as {account_email:string;role_name:string;is_enabled:boolean;granted_at:string}[];

 return <div className={styles.shell} dir="rtl" lang="ar">
  <aside className={styles.sidebar} aria-label="القائمة الرئيسية لمالك المنصة">
   <div className={styles.identity}>
    <div className={styles.brandIcon} aria-hidden="true">B</div>
    <div><div className={styles.brandName}>Beger</div><div className={styles.brandCaption}>PLATFORM CONTROL</div></div>
   </div>
   <nav className={styles.nav} aria-label="أقسام كنترول بنل المنصة">
    {canOpenBusiness && <Link className={styles.navLink} href="/dashboard" aria-label="الانتقال إلى نشاطي التجاري"><span className={styles.navGlyph} aria-hidden="true">⌂</span> نشاطي التجاري</Link>}
    <span className={styles.navLabel}>إدارة المنصة</span>
    <a className={`${styles.navLink} ${styles.navActive}`} href="#overview" aria-current="page"><span className={styles.navGlyph} aria-hidden="true">▦</span>نظرة عامة</a>
    <a className={styles.navLink} href="#merchants"><span className={styles.navGlyph} aria-hidden="true">⌂</span>الأنشطة والتجار</a>
    <a className={styles.navLink} href="#plans"><span className={styles.navGlyph} aria-hidden="true">▤</span>الباقات</a>
    <a className={styles.navLink} href="#trials"><span className={styles.navGlyph} aria-hidden="true">◷</span>التجارب</a>
    <a className={styles.navLink} href="#security"><span className={styles.navGlyph} aria-hidden="true">♧</span>الصلاحيات والتدقيق</a>
    <a className={styles.navLink} href="#operations"><span className={styles.navGlyph} aria-hidden="true">◈</span>جاهزية المنصة</a>
    <span className={styles.navLabel} style={{marginTop:18}}>الإدارة القادمة</span>
    <span className={`${styles.navLink} ${styles.navSoon}`}><span className={styles.navGlyph} aria-hidden="true">▤</span>الفوترة المدفوعة<span className={styles.navTag}>قريباً</span></span>
    <span className={`${styles.navLink} ${styles.navSoon}`}><span className={styles.navGlyph} aria-hidden="true">♧</span>تغيير الأدوار والدعم<span className={styles.navTag}>قريباً</span></span>
   </nav>
   <div className={styles.sidebarFoot}>لوحة منفصلة لإدارة بيجر. لا تسمح بتقمص حساب التاجر أو الوصول إلى بيانات زبائنه الخاصة.</div>
  </aside>
  <div className={styles.main}>
   <header className={styles.topbar}>
    <div className={styles.breadcrumb}>بيجر <span aria-hidden="true">/</span> <strong>إدارة المنصة</strong></div>
    <div className={styles.topActions}>{canOpenBusiness && <Link href="/dashboard" style={{textDecoration:"none",color:"#17646b",background:"#eaf7f3",padding:"9px 12px",borderRadius:10,fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>نشاطي التجاري ↗</Link>}<span className={styles.pill}><span className={styles.dot} aria-hidden="true"/> Staging</span><div className={styles.avatar} aria-label="حساب مسؤول المنصة">{user.email?.slice(0,1).toUpperCase() ?? "B"}</div></div>
   </header>
   <main className={styles.content} id="overview">
    <div className={styles.titleRow}>
     <div><p className={styles.eyebrow}>SUPER ADMIN / CONTROL CENTER</p><h1 className={styles.title}>مركز إدارة بيجر</h1><p className={styles.subtitle}>معلومات تشغيل المنصة كلها من مصدر واحد، بعيداً عن لوحات التجار والفروع.</p></div>
     <span className={styles.safe}>{owner ? "مالك المنصة" : "مشغّل المنصة"} · بيانات التجار قراءة فقط</span>
    </div>
    <section className={styles.hero} aria-label="حالة المرحلة الحالية">
     <div><h2 className={styles.heroStrong}>أساس الإدارة جاهز للتوسعة المنظمة</h2>
      <p className={styles.heroDesc}>نعمل الآن على المرحلة الأولى: التحقق من الأدوار والصلاحيات وتجهيز كنترول بنل المالك. خدمات المنيو والطلبات والمطبخ والبيجر لم تُطلق بعد.</p>
     </div><span className={styles.heroBadge}>المرحلة 1 من 5</span>
    </section>
    {failed && <p className={styles.error} role="alert">تعذّر تحميل البيانات الموثوقة من المنصة. لم نعرض إحصاءات تقديرية.</p>}
    <section className={styles.stats} aria-label="مؤشرات المنصة">
     {[
      {label:"الأنشطة المسجّلة",value:summary?.merchant_count,icon:"⌂",sub:"عدد التجار على Staging"},
      {label:"الفروع المسجّلة",value:summary?.branch_count,icon:"▧",sub:"إجمالي الفروع بالنظام"},
      {label:"عضويات النشاطات",value:summary?.account_memberships,icon:"♧",sub:"عضويات المستخدمين المسجّلة"}
     ].map(item=><div className={styles.stat} key={item.label}>
      <div className={styles.statRow}><span className={styles.statLabel}>{item.label}</span><span className={styles.statGlyph} aria-hidden="true">{item.icon}</span></div>
      <p className={styles.statValue}>{failed||item.value==null?"—":Number(item.value).toLocaleString("ar")}</p><p className={styles.statSub}>{item.sub}</p>
     </div>)}
    </section>
    <section id="merchants" className={styles.panel} aria-labelledby="merchant-heading">
     <div className={styles.panelHead}><div><h2 id="merchant-heading" className={styles.panelTitle}>دليل التجار والأنشطة</h2><p className={styles.panelDesc}>بيانات عامة موثوقة لكل نشاط؛ لا تشمل معلومات الزبائن أو الطلبات الخاصة.</p></div><span className={styles.panelCount}>قراءة فقط · أول 100 نشاط</span></div>
     {directoryResult.error ? <p className={styles.error} role="alert">تعذر تحميل قائمة الأنشطة.</p> : directory.length===0 ? <div className={styles.empty}>ما في أنشطة مسجّلة حالياً.</div>:
      <div className={styles.tableWrap}><table className={styles.table}>
       <thead><tr><th scope="col">النشاط</th><th scope="col">الدولة</th><th scope="col">الفروع</th><th scope="col">العضويات</th><th scope="col">الاشتراك</th></tr></thead>
       <tbody>{directory.map(b=><tr key={b.business_id}>
        <td><span className={styles.businessName}>{b.business_name}</span><div className={styles.detail}>تاريخ التسجيل: {new Date(b.created_at).toLocaleDateString("ar",{year:"numeric",month:"short",day:"numeric"})}</div></td>
        <td>{b.country_code==="TR"?"تركيا":b.country_code==="SY"?"سوريا":b.country_code}</td>
        <td>{Number(b.branch_count).toLocaleString("ar")}</td><td>{Number(b.member_count).toLocaleString("ar")}</td>
        <td>{b.subscription_status?<span className={styles.status}>{b.subscription_status}</span>:<span className={styles.noPlan}>لا يوجد اشتراك</span>}</td>
       </tr>)}</tbody>
      </table></div>}
    </section>
    {plansResult.error ? <p className={styles.error} role="alert">تعذّر تحميل الباقات. لا يمكن إدارة الباقات في هذه الحالة.</p> : <PlanManager plans={plans} canManage={owner} />}
    {(plansResult.error || directoryResult.error || trialsResult.error) ? <p role="alert" className={styles.error}>لا يمكن إدارة التجارب حتى يتم تحميل الأنشطة والباقات والاشتراكات بشكل موثوق.</p> : <TrialManager businesses={directory} plans={plans} trials={trials} canManage={owner} />}
    <section id="security" className={styles.panel} aria-labelledby="security-heading">
     <div className={styles.panelHead}>
      <div><h2 id="security-heading" className={styles.panelTitle}>صلاحيات المنصة وسجل التدقيق</h2>
       <p className={styles.panelDesc}>إظهار حسابات الإدارة للمالك فقط وآخر 50 عملية إدارية، دون بيانات العملاء أو محتوى السجلات الحساسة.</p></div>
      <span className={styles.panelCount}>متابعة آمنة · قراءة فقط</span>
     </div>
     {owner && (rosterResult.error ? <p role="alert" className={styles.error}>تعذر تحميل حسابات الإدارة.</p> :
      <div style={{marginBottom:22}}>
       <h3 style={{fontSize:14,marginBottom:10}}>المسؤولون المخوّلون</h3>
       {roster.length===0?<div className={styles.empty}>لا توجد حسابات إدارة مخولة.</div>:
        <div className={styles.tableWrap}><table className={styles.table}>
         <thead><tr><th scope="col">الحساب</th><th scope="col">الدور</th><th scope="col">الحالة</th><th scope="col">تاريخ الاعتماد</th></tr></thead>
         <tbody>{roster.map(a=><tr key={a.account_email}>
          <td><span className={styles.businessName} dir="ltr">{a.account_email}</span></td>
          <td>{a.role_name==="platform_owner"?"مالك المنصة":"مشغّل المنصة"}</td>
          <td>{a.is_enabled?<span className={styles.status}>مفعّل</span>:<span className={styles.noPlan}>موقوف</span>}</td>
          <td>{new Date(a.granted_at).toLocaleDateString("ar")}</td>
         </tr>)}</tbody>
        </table></div>}
       <p className={styles.panelDesc}>إضافة مسؤول أو تغيير صلاحياته ليست متاحة من الواجهة حتى يتم اعتماد مسار أمني مستقل.</p>
      </div>)}
     <h3 style={{fontSize:14,marginBottom:10}}>آخر العمليات الإدارية</h3>
     {auditResult.error?<p role="alert" className={styles.error}>تعذر تحميل سجل التدقيق؛ لا نعرض عمليات غير مؤكدة.</p>:
      auditEvents.length===0?<div className={styles.empty}>لا توجد عمليات إدارة مسجلة حتى الآن. هذا لا يعني عدم وجود نشاط سابق خارج سجل المنصة.</div>:
      <div className={styles.tableWrap}><table className={styles.table}>
       <thead><tr><th scope="col">العملية</th><th scope="col">المجال</th><th scope="col">الوقت</th></tr></thead>
       <tbody>{auditEvents.map(e=><tr key={e.event_id}>
        <td><span className={styles.businessName}>{e.event_action==="plan_created"?"إنشاء باقة":e.event_action==="plan_status_changed"?"تعديل حالة باقة":e.event_action==="merchant_trial_started"?"تفعيل تجربة تاجر":e.event_action}</span></td>
        <td>{e.target_kind==="plan"?"الباقات":e.target_kind==="subscription"?"الاشتراكات":e.target_kind}</td>
        <td>{new Date(e.event_at).toLocaleString("ar",{dateStyle:"medium",timeStyle:"short"})}</td>
       </tr>)}</tbody>
      </table></div>}
    </section>
    <section id="operations" className={styles.panel} aria-labelledby="operations-heading">
     <div className={styles.panelHead}><div><h2 id="operations-heading" className={styles.panelTitle}>وحدات الإدارة القادمة</h2><p className={styles.panelDesc}>نثبت الصلاحيات والأساس أولاً؛ لم نفعّل تشغيل أو فوترة غير مكتملين.</p></div><span className={styles.panelCount}>قيد التطوير</span></div>
     <div className={styles.grid}>{nextModules.map(m=><div className={styles.module} key={m.title}>
      <span className={styles.moduleGlyph} aria-hidden="true">{m.icon}</span><div><h3 className={styles.moduleTitle}>{m.title}</h3><p className={styles.moduleText}>{m.text}</p></div>
     </div>)}</div>
    </section>
    <p className={styles.footer}>Beger Platform Control · بيئة اختبار Staging · لا تغييرات على Production</p>
   </main>
  </div>
  <nav className={styles.mobileNav} aria-label="تنقل كنترول بنل المالك على الهاتف">
   <a href="#overview"><span aria-hidden="true">▦</span>الرئيسية</a><a href="#merchants"><span aria-hidden="true">⌂</span>التجار</a><a href="#plans"><span aria-hidden="true">▤</span>الباقات</a><a href="#trials"><span aria-hidden="true">◷</span>التجارب</a><a href="#security"><span aria-hidden="true">♧</span>الأمان</a>
  </nav>
 </div>;
}
