import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { serverSupabase } from "../../../../lib/supabase/server";
import styles from "../../dashboard.module.css";
import MerchantOrderBoard from "../../merchant-order-board";
import MerchantTableQr from "../../merchant-table-qr";
import "../../../qr-experience.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ branchId: string }> };

export default async function BranchDashboard({ params }: Props) {
  const { branchId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) notFound();

  const supabase = await serverSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Owners and managers can access the business; staff only explicitly assigned branches.
  const { data: memberships, error: membershipError } = await supabase.from("memberships")
    .select("business_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager", "staff"]);

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
  let branchRole: string | null = null;
  if (role === "staff") {
    const {data:assignment,error:assignmentError} = await supabase.from("branch_assignments")
      .select("branch_role").eq("business_id",branch.business_id)
      .eq("branch_id",branch.id).eq("user_id",user.id).maybeSingle();
    if (assignmentError || !assignment) notFound();
    branchRole = assignment.branch_role;
  }
  const canManageOrders = role === "owner" || role === "manager";
  const centralLink = "/dashboard?business="+encodeURIComponent(business.id)+"#catalog-management";
  return <div className={styles.branchPage}>
    <header className={styles.branchPageHeader}>
      <Link href={"/dashboard?business="+encodeURIComponent(business.id)} className={styles.backLink}>← الرجوع إلى لوحة {business.name}</Link>
      <span className={styles.previewBadge}><span className={styles.statusDot} aria-hidden="true" />فرع تجريبي</span>
    </header>
    <main className={styles.content}>
      <p className={styles.eyebrow}>BEGER / BRANCH WORKSPACE</p>
      <h1 className={styles.heading}>{branch.name}</h1>
      <p className={styles.subheading}>لوحة خاصة بفرع <strong>{branch.name}</strong> ضمن نشاط <strong>{business.name}</strong>.</p>
      <div className={styles.branchOperationsIntro}>
        <span>BEGER · STAGING</span>
        <strong>تشغيل طلبات {branch.name}</strong>
        <p>الطلبات الحقيقية الواردة من QR الطاولات تظهر في لوحة الفرع مباشرةً. القبول والتحضير والتسليم تُدار من هنا.</p>
      </div>
      {canManageOrders ? <>
        <nav aria-label="تنقل تشغيل الفرع" className={styles.branchOperationsNav}>
          <a href="#beger-merchant-orders">الطلبات الواردة والمطبخ ↓</a>
          <a href="#beger-table-qr-title">QR الطاولات ↓</a>
          <Link href={centralLink}>المنتجات والإضافات في المركز ←</Link>
        </nav>
        <MerchantOrderBoard businessId={business.id} branchId={branch.id} branchName={branch.name}/>
        <MerchantTableQr businessId={business.id} branchId={branch.id} branchName={branch.name}/>
      </> : <section className={styles.panel}>
        <h2 className={styles.panelTitle}>تشغيل الطلبات</h2>
        <p className={styles.panelSubtitle}>حسابك مسجّل لهذا الفرع، لكن إدارة قبول الطلبات وتغيير حالات المطبخ متاحة حالياً لمالك النشاط ومديره فقط. لن نعرض الطلبات بلا صلاحية.</p>
      </section>}
      <div className={styles.twoCols}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>بيانات الفرع</h2>
          <div className={styles.details}>
            <div className={styles.detail}><span className={styles.detailName}>اسم الفرع</span><strong className={styles.detailValue}>{branch.name}</strong></div>
            <div className={styles.detail}><span className={styles.detailName}>النشاط الرئيسي</span><strong className={styles.detailValue}>{business.name}</strong></div>
            <div className={styles.detail}><span className={styles.detailName}>الصلاحية</span><span className={styles.role}>{role === "owner" ? "مالك النشاط" : role === "manager" ? "مدير النشاط" : branchRole === "branch_manager" ? "مدير الفرع" : "موظف الفرع"}</span></div>
          </div>
        </section>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>QR المتجر والطاولة</h2>
          <p className={styles.panelSubtitle}>سيأخذ الرمز الزبون إلى منيو هذا الفرع مباشرةً، دون إجباره على إنشاء حساب.</p>
          <div className={styles.empty} style={{marginTop:16}}>منيو هذا الفرع متاح للزبائن بدون حساب. رمز المتجر يفتح القائمة العامة؛ ورمز كل طاولة يربط طلب الزبون برقمها الصحيح.</div>
          <Link href={`/b/${branch.id}`} target="_blank" rel="noopener noreferrer" className={styles.branchOpenLink}>معاينة صفحة الزبون العامة ←</Link>
        </section>
      </div>
      <section className={styles.panel} aria-label="إدارة الفرع من المتجر الرئيسي">
        <h2 className={styles.panelTitle}>صلاحيات إدارة الفرع</h2>
        <p className={styles.panelSubtitle}>الكتالوج وأسعار المنتجات والتصنيفات تُدار من لوحة المتجر المركزية. أما الطلبات التشغيلية وQR الطاولات فتجدها أدناه في نفس الفرع.</p>
        {canManageOrders ? <Link href={centralLink} className={styles.branchOpenLink}>فتح كتالوج المتجر المركزي ←</Link> : null}
      </section>
      <section className={styles.modules} aria-labelledby="branch-tools-heading">
        <h2 className={styles.panelTitle} id="branch-tools-heading">وحدات هذا الفرع</h2>
        <div className={styles.moduleGrid} style={{marginTop:15}}>
          {["الحجوزات والطابور","البيجر والتنبيهات الفورية","عملاء الفرع والولاء"].map(name=>
            <div key={name} className={styles.module}><span className={styles.moduleSymbol}>◈</span><span className={styles.moduleTitle}>{name}</span><span className={styles.moduleState}>قريباً</span></div>
          )}
        </div>
      </section>
    </main>
  </div>;
}
