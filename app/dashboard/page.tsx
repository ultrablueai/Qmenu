import { redirect } from "next/navigation";
import styles from "./dashboard.module.css";
import BranchManager from "./branch-manager";
import { serverSupabase } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

const soonModules = [
  { icon: "▦", name: "المنيو والخدمات", status: "قريباً" },
  { icon: "◷", name: "الحجوزات والطوابير", status: "قريباً" },
  { icon: "♡", name: "العملاء والولاء", status: "قريباً" },
  { icon: "▥", name: "التقارير والتحليلات", status: "قريباً" },
];

function roleLabel(role: string) {
  return role === "owner" ? "مالك النشاط" : role === "manager" ? "مدير" : role === "staff" ? "موظف" : "عضو";
}
function countryLabel(code: string | null) {
  return code === "TR" ? "تركيا" : code === "SY" ? "سوريا" : "غير محددة";
}
function initials(name: string) {
  return (name.trim()[0] || "ب").toLocaleUpperCase("ar");
}

export default async function Dashboard() {
  const supabase = await serverSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id,role")
    .eq("user_id", user.id)
    .limit(10);

  if (!membershipError && !memberships?.length) redirect("/onboarding");

  const ids = (memberships ?? []).map((m) => m.business_id);
  const businessResult = ids.length
    ? await supabase.from("businesses").select("id,name,country_code").in("id", ids)
    : { data: [], error: null };
  const branchResult = ids.length
    ? await supabase.from("branches").select("id,business_id,name").in("business_id", ids)
    : { data: [], error: null };

  const loadError = Boolean(membershipError || businessResult.error || branchResult.error);
  const businesses = businessResult.data ?? [];
  const branches = branchResult.data ?? [];
  const primary = businesses.find((b) => b.id === ids[0]) ?? businesses[0];
  const currentRole = memberships?.find((m) => m.business_id === primary?.id)?.role ?? "staff";
  const displayName = primary?.name ?? "نشاطك التجاري";
  const firstName = user.email?.split("@")[0] ?? "صاحب النشاط";
  const ownerCount = memberships?.length ?? 0;
  const country = primary?.country_code ?? null;
  const primaryBranches = branches.filter((b) => b.business_id === primary?.id);
  const canManageBranches = currentRole === "owner" || currentRole === "manager";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="القائمة الجانبية">
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden="true">Q</div>
          <div><div className={styles.brandTitle}>Qmenu</div><div className={styles.brandSubtitle}>SMART BUSINESS OS</div></div>
        </div>
        <div className={styles.businessChip}>
          <div className={styles.businessAvatar} aria-hidden="true">{initials(displayName)}</div>
          <div className={styles.businessChipText}>
            <strong>{displayName}</strong>
            <small>{roleLabel(currentRole)} · {countryLabel(country)}</small>
          </div>
        </div>
        <nav aria-label="التنقل الرئيسي" className={styles.navGroup}>
          <div className={styles.navLabel}>مساحة العمل</div>
          <a className={`${styles.navItem} ${styles.navItemActive}`} href="/dashboard" aria-current="page">
            <span className={styles.navIcon} aria-hidden="true">▦</span> نظرة عامة
          </a>
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">▤</span> المنيو والخدمات <span className={styles.soon}>قريباً</span>
          </span>
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">◷</span> الحجوزات والطوابير <span className={styles.soon}>قريباً</span>
          </span>
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">♧</span> العملاء والولاء <span className={styles.soon}>قريباً</span>
          </span>
          <div className={styles.navLabel} style={{marginTop:19}}>إدارة الأعمال</div>
          <a className={styles.navItem} href="#branches"><span className={styles.navIcon} aria-hidden="true">⌂</span> الفروع</a>
          <a className={styles.navItem} href="#business-details"><span className={styles.navIcon} aria-hidden="true">⚙</span> معلومات النشاط</a>
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">▥</span> التقارير <span className={styles.soon}>قريباً</span>
          </span>
        </nav>
        <div className={styles.sidebarFooter}>
          <p className={styles.sidebarNote}>لوحة تجريبية آمنة · لا توجد بيانات مبيعات أو طلبات تجريبية مصطنعة.</p>
          <form action="/auth/signout" method="post"><button className={styles.signout} type="submit">↪ تسجيل الخروج</button></form>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>مساحة العمل</span><span aria-hidden="true">/</span><strong>نظرة عامة</strong></div>
          <div className={styles.topActions}>
            <span className={styles.previewBadge}><span className={styles.statusDot} aria-hidden="true" />بيئة تجريبية</span>
            <div className={styles.profile}>
              <div className={styles.profileIcon} aria-hidden="true">{initials(firstName)}</div>
              <div><strong>{firstName}</strong><small>{roleLabel(currentRole)}</small></div>
            </div>
          </div>
        </header>
        <main className={styles.content}>
          <div className={styles.pageHead}>
            <div>
              <p className={styles.eyebrow}>لوحة التحكم / OVERVIEW</p>
              <h1 className={styles.heading}>أهلاً بعودتك، {firstName} 👋</h1>
              <p className={styles.subheading}>كل ما تحتاج معرفته عن نشاطك، في مكان واحد وواضح.</p>
            </div>
            <div className={styles.headBadge}><span className={styles.statusDot} aria-hidden="true" /> حسابك: <b>{roleLabel(currentRole)}</b></div>
          </div>

          {membershipError ? <div className={styles.error} role="alert">تعذّر التحقق من عضوية نشاطك. حاول إعادة تحميل الصفحة، ولا تنشئ نشاطاً جديداً قبل التأكد.</div> : null}
          {loadError && !membershipError ? <div className={styles.error} role="alert">تعذّر تحميل بعض بيانات نشاطك. حاول إعادة تحميل الصفحة؛ لن نعرض أرقاماً غير مؤكدة.</div> : null}

          <section className={styles.hero} aria-label="مرحباً بنشاطك">
            <div className={styles.heroCopy}>
              <span className={styles.heroBadge}>✦ بداية مساحة عملك</span>
              <h2 className={styles.heroTitle}>أهلاً بك في {displayName}</h2>
              <p className={styles.heroText}>مساحتك لإدارة النشاط والفروع. نحن نجهّز أدوات المنيو والحجوزات والعملاء لتصبح متاحة لك تدريجياً، مع الحفاظ على بيانات كل نشاط منفصلة وآمنة.</p>
            </div>
            <div className={styles.heroGraphic} aria-hidden="true"><div className={styles.heroGraphicInner}><span className={styles.heroGraphicText}>Q</span></div></div>
          </section>

          <section className={styles.stats} aria-label="ملخص نشاطك">
            <div className={styles.stat}>
              <div className={styles.statTop}><span className={styles.statLabel}>الأنشطة المرتبطة</span><span className={styles.statIcon} aria-hidden="true">▧</span></div>
              <p className={styles.statValue}>{membershipError ? "—" : ownerCount.toLocaleString("ar")}</p>
              <p className={styles.statHint}>حسب عضويات حسابك المسجّلة</p>
            </div>
            <div className={styles.stat}>
              <div className={styles.statTop}><span className={styles.statLabel}>فروع النشاط الحالي</span><span className={styles.statIcon} aria-hidden="true">⌂</span></div>
              <p className={styles.statValue}>{loadError ? "—" : primaryBranches.length.toLocaleString("ar")}</p>
              <p className={styles.statHint}>فروع مسجّلة في قاعدة البيانات</p>
            </div>
            <div className={styles.stat}>
              <div className={styles.statTop}><span className={styles.statLabel}>حالة مساحة العمل</span><span className={styles.statIcon} aria-hidden="true">◈</span></div>
              <p className={styles.statValue} style={{fontSize:24}}>تجريبية</p>
              <p className={styles.statHint}>لم تبدأ خدمات التشغيل التجاري بعد</p>
            </div>
          </section>

          <div className={styles.twoCols}>
            <section className={styles.panel} id="branches" aria-labelledby="branches-heading">
              <div className={styles.panelHead}>
                <div><h2 className={styles.panelTitle} id="branches-heading">الفروع</h2><p className={styles.panelSubtitle}>الفروع المرتبطة بنشاطك الحالي</p></div>
                <span className={styles.panelTag}>البيانات الفعلية</span>
              </div>
              {loadError ? <div className={styles.empty}>بيانات الفروع غير متاحة حالياً.</div>
                : primaryBranches.length ? <div className={styles.branchList}>
                  {primaryBranches.map((branch) => (
                    <div key={branch.id} className={styles.branch}>
                      <span className={styles.branchIcon} aria-hidden="true">⌂</span>
                      <div><div className={styles.branchName}>{branch.name}</div><div className={styles.branchMeta}>فرع تابع لـ{displayName}</div></div>
                      <span className={styles.branchBadge}>مسجّل</span>
                    </div>
                  ))}
                </div> : <div className={styles.empty}>لم يتم العثور على فروع لهذا النشاط.</div>}
              {!loadError && primary && <BranchManager businessId={primary.id} branches={primaryBranches.map((b) => ({id:b.id, name:b.name}))} canManage={canManageBranches} />}
            </section>
            <section className={styles.panel} id="business-details" aria-labelledby="business-heading">
              <div className={styles.panelHead}>
                <div><h2 className={styles.panelTitle} id="business-heading">معلومات النشاط</h2><p className={styles.panelSubtitle}>ملخص الحساب التجاري والهوية</p></div>
              </div>
              <div className={styles.details}>
                <div className={styles.detail}><span className={styles.detailName}>اسم النشاط</span><span className={styles.detailValue}>{loadError ? "غير متاح" : displayName}</span></div>
                <div className={styles.detail}><span className={styles.detailName}>الدولة</span><span className={styles.detailValue}>{loadError ? "غير متاحة" : countryLabel(country)}</span></div>
                <div className={styles.detail}><span className={styles.detailName}>الصلاحية</span><span className={styles.role}>{roleLabel(currentRole)}</span></div>
                <div className={styles.detail}><span className={styles.detailName}>البريد المسجّل</span><span className={styles.detailValue} dir="ltr">{user.email ?? "—"}</span></div>
              </div>
            </section>
          </div>

          <section className={styles.modules} aria-labelledby="modules-heading">
            <div className={styles.panelHead}>
              <div><h2 className={styles.panelTitle} id="modules-heading">أدوات أعمالك</h2><p className={styles.panelSubtitle}>وحدات ستُفعّل بحسب نوع النشاط بعد استكمال البناء والاختبارات</p></div>
              <span className={styles.panelTag}>قيد التطوير</span>
            </div>
            <div className={styles.moduleGrid}>
              {soonModules.map((module) => (
                <div className={styles.module} key={module.name} aria-label={`${module.name} — ${module.status}`}>
                  <span className={styles.moduleSymbol} aria-hidden="true">{module.icon}</span>
                  <span className={styles.moduleTitle}>{module.name}</span>
                  <span className={styles.moduleState}>{module.status}</span>
                </div>
              ))}
            </div>
          </section>
          <footer className={styles.footer}>Qmenu · Smart Business OS · نسخة Staging للاختبار فقط</footer>
        </main>
      </div>

      <nav className={styles.mobileBar} aria-label="التنقل السريع">
        <a href="/dashboard" className={`${styles.mobileLink} ${styles.mobileActive}`} aria-current="page"><span className={styles.mobileIcon} aria-hidden="true">▦</span>الرئيسية</a>
        <a href="#branches" className={styles.mobileLink}><span className={styles.mobileIcon} aria-hidden="true">⌂</span>الفروع</a>
        <a href="#business-details" className={styles.mobileLink}><span className={styles.mobileIcon} aria-hidden="true">⚙</span>النشاط</a>
        <form action="/auth/signout" method="post"><button type="submit" className={styles.signout} aria-label="تسجيل الخروج">↪<span style={{display:"block",fontSize:10}}>خروج</span></button></form>
      </nav>
    </div>
  );
}
