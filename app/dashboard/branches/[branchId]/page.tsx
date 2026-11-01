import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { serverSupabase } from "../../../../lib/supabase/server";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ branchId: string }> };

export default async function BranchDashboard({ params }: Props) {
  const { branchId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) notFound();

  const supabase = await serverSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Until branch-scoped assignments are implemented, do not grant staff
  // access to a specific branch just because they work for the business.
  const { data: memberships, error: membershipError } = await supabase.from("memberships")
    .select("business_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager"]);

  if (membershipError) return <main className={styles.content}><p className={styles.error} role="alert">تعذر التحقق من صلاحيات الفرع. حاول مرة أخرى.</p></main>;
  if (!memberships?.length) notFound();

  const businessIds = memberships.map(m => m.business_id);
  const { data: branch, error: branchError } = await supabase.from("branches")
    .select("id,business_id,name")
    .eq("id", branchId)
    .in("business_id", businessIds)
    .maybeSingle();

  if (branchError) return <main className={styles.content}><p className={styles.error} role="alert">تعذّر تحميل بيانات الفرع حالياً.</p></main>;
  if (!branch) notFound();

  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("id,name,country_code")
    .eq("id", branch.business_id)
    .maybeSingle();
  if (businessError || !business) return <main className={styles.content}><p className={styles.error} role="alert">تعذّر التحقق من النشاط المرتبط بهذا الفرع.</p></main>;

  const role = memberships.find(m => m.business_id === branch.business_id)?.role;
  return <div className={styles.branchPage}>
    <header className={styles.branchPageHeader}>
      <Link href="/dashboard" className={styles.backLink}>← الرجوع إلى اللوحة الرئيسية للنشاط</Link>
      <span className={styles.previewBadge}><span className={styles.statusDot} aria-hidden="true" />فرع تجريبي</span>
    </header>
    <main className={styles.content}>
      <p className={styles.eyebrow}>QMENU / BRANCH WORKSPACE</p>
      <h1 className={styles.heading}>{branch.name}</h1>
      <p className={styles.subheading}>لوحة خاصة بفرع <strong>{branch.name}</strong> ضمن نشاط <strong>{business.name}</strong>.</p>
      <section className={styles.hero} style={{ marginTop:24 }}>
        <div className={styles.heroCopy}>
          <span className={styles.heroBadge}>⌂ لوحة الفرع</span>
          <h2 className={styles.heroTitle}>إدارة {branch.name}</h2>
          <p className={styles.heroText}>هذه مساحة الفرع المستقلة. خدمات QR والطلبات والانتظار والعملاء ستُربط بهذا الفرع عند تفعيل وحداتها، ولا نعرض أرقام تشغيل غير موجودة.</p>
        </div>
        <div className={styles.heroGraphic} aria-hidden="true"><div className={styles.heroGraphicInner}><span className={styles.heroGraphicText}>Q</span></div></div>
      </section>
      <div className={styles.twoCols}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>بيانات الفرع</h2>
          <div className={styles.details}>
            <div className={styles.detail}><span className={styles.detailName}>اسم الفرع</span><strong className={styles.detailValue}>{branch.name}</strong></div>
            <div className={styles.detail}><span className={styles.detailName}>النشاط الرئيسي</span><strong className={styles.detailValue}>{business.name}</strong></div>
            <div className={styles.detail}><span className={styles.detailName}>الصلاحية</span><span className={styles.role}>{role === "owner" ? "مالك النشاط" : "مدير النشاط"}</span></div>
          </div>
        </section>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>رموز QR للعملاء</h2>
          <p className={styles.panelSubtitle}>سيكون لكل عميل رمز غير قابل للتخمين، مرتبط بالنشاط والفرع وفق صلاحيات مستقلة.</p>
          <div className={styles.empty} style={{marginTop:16}}>لم نفعّل إصدار رموز QR بعد؛ نثبت أولاً طريقة تعريف العميل وإعادة استخدام رمزه بين الفروع بشكل آمن.</div>
        </section>
      </div>
      <section className={styles.modules} aria-labelledby="branch-tools-heading">
        <h2 className={styles.panelTitle} id="branch-tools-heading">وحدات هذا الفرع</h2>
        <div className={styles.moduleGrid} style={{marginTop:15}}>
          {["قائمة المنتجات والخدمات","الطابور والبيجر","الطلبات والحجوزات","عملاء الفرع والولاء"].map(name=>
            <div key={name} className={styles.module}><span className={styles.moduleSymbol}>◈</span><span className={styles.moduleTitle}>{name}</span><span className={styles.moduleState}>قريباً</span></div>
          )}
        </div>
      </section>
    </main>
  </div>;
}
