import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";
import BranchManager from "./branch-manager";
import HeadquartersCatalog from "./headquarters-catalog";
import HqReferenceOverview from "./hq-reference-overview";
import MerchantSubscriptionStatusPanel,{type MerchantSubscriptionStatus} from "./merchant-subscription-status";
import BegerSectorConfigurator from "../../components/beger-sector-configurator";
import "../../components/beger-sector-configurator.css";
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

export default async function Dashboard({searchParams}:{searchParams:Promise<{business?:string;setup?:string;view?:string}>}) {
  const supabase = await serverSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id,role")
    .eq("user_id", user.id)
    .limit(10);

  if (!membershipError && (!memberships?.length || memberships.every(m=>m.role==="staff"))) redirect("/staff");

  // Platform authority is checked independently of merchant memberships.
  // A failed permission read never grants a platform navigation entry.
  const { data: platformAccess, error: platformAccessError } = await supabase
    .from("platform_admins").select("role").eq("user_id",user.id).eq("enabled",true).maybeSingle();
  const canOpenPlatform = !platformAccessError && (platformAccess?.role === "platform_owner" || platformAccess?.role === "platform_operator");

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
  const params=await searchParams;
  const requestedBusiness=params.business;
  const workspaceViews=["overview","branches","operations","settings","subscription","modules"] as const;
  const workspaceView=workspaceViews.find(view=>view===params.view)??"overview";
  // The selection is only honored if it belongs to a verified membership.
  const primary = businesses.find((b) => b.id === requestedBusiness && ids.includes(b.id)) ?? businesses.find((b) => b.id === ids[0]) ?? businesses[0];
  const currentRole = memberships?.find((m) => m.business_id === primary?.id)?.role ?? "staff";
  const displayName = primary?.name ?? "نشاطك التجاري";
  const firstName = user.email?.split("@")[0] ?? "صاحب النشاط";
  const ownerCount = memberships?.length ?? 0;
  const country = primary?.country_code ?? null;
  const primaryBranches = branches.filter((b) => b.business_id === primary?.id);
  const canManageBranches = currentRole === "owner" || currentRole === "manager";
  const workspaceHref=(view:string)=>"/dashboard?business="+encodeURIComponent(primary?.id??"")+"&view="+view;
  const workspaceTitles:Record<string,string>={overview:"نظرة عامة",branches:"الفروع والنشاط",operations:"إدارة المتجر",settings:"النموذج والإعدادات",subscription:"اشتراك النشاط",modules:"الوحدات القادمة"};
  const subscriptionResult=workspaceView==="subscription"&&primary&&canManageBranches&&!loadError
   ?await supabase.rpc("g12_merchant_subscription_status",{p_business:primary.id})
   :null;
  const subscriptionData=(subscriptionResult?.data??null) as MerchantSubscriptionStatus|null;
  const subscriptionError=Boolean(subscriptionResult?.error);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="القائمة الجانبية">
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden="true">B</div>
          <div><div className={styles.brandTitle}>Beger</div><div className={styles.brandSubtitle}>SMART BUSINESS OS</div></div>
        </div>
        <div className={styles.businessChip}>
          <div className={styles.businessAvatar} aria-hidden="true">{initials(displayName)}</div>
          <div className={styles.businessChipText}>
            <strong>{displayName}</strong>
            <small>{roleLabel(currentRole)} · {countryLabel(country)}</small>
          </div>
        </div>
        {businesses.length>1?<nav aria-label="اختيار المتجر" className={styles.businessSwitcher}>
         <strong className={styles.businessSwitchTitle}>المتجر الحالي</strong>
         {businesses.map(b=><Link key={b.id} href={"/dashboard?business="+encodeURIComponent(b.id)} aria-current={b.id===primary?.id?"page":undefined} className={styles.businessSwitchOption}>{b.name}{b.id===primary?.id?" ✓":""}</Link>)}
        </nav>:null}
        <nav aria-label="التنقل الرئيسي" className={styles.navGroup}>
          {canOpenPlatform && <Link className={styles.navItem} href="/admin" aria-label="الانتقال إلى إدارة منصة بيجر"><span className={styles.navIcon} aria-hidden="true">◇</span> إدارة منصة بيجر</Link>}
          {!loadError&&primary?.id==="b0000000-2026-4000-8000-000000000001"&&currentRole==="owner"?<Link className={styles.navItem} href="/demo-control" style={{background:"#e8f0dd",color:"#41612f",fontWeight:900}}><span className={styles.navIcon} aria-hidden="true">✦</span> مركز اختبار المتجر التجريبي</Link>:null}
          <div className={styles.navLabel}>مساحة العمل</div>
          <a className={`${styles.navItem} ${workspaceView==="overview"?styles.navItemActive:""}`} href={workspaceHref("overview")} aria-current={workspaceView==="overview"?"page":undefined}>
            <span className={styles.navIcon} aria-hidden="true">▦</span> نظرة عامة
          </a>
          {canManageBranches ? <Link className={`${styles.navItem} ${workspaceView==="operations"?styles.navItemActive:""}`} aria-current={workspaceView==="operations"?"page":undefined} href={workspaceHref("operations")}><span className={styles.navIcon} aria-hidden="true">▤</span> إدارة المتجر والطلبات</Link> : null}
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">◷</span> الحجوزات والطوابير <span className={styles.soon}>قريباً</span>
          </span>
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">♧</span> العملاء والولاء <span className={styles.soon}>قريباً</span>
          </span>
          <div className={styles.navLabel} style={{marginTop:19}}>إدارة الأعمال</div>
          <Link className={`${styles.navItem} ${workspaceView==="branches"?styles.navItemActive:""}`} aria-current={workspaceView==="branches"?"page":undefined} href={workspaceHref("branches")}><span className={styles.navIcon} aria-hidden="true">⌂</span> الفروع ومعلومات النشاط</Link>
          {canManageBranches?<Link className={`${styles.navItem} ${workspaceView==="settings"?styles.navItemActive:""}`} aria-current={workspaceView==="settings"?"page":undefined} href={workspaceHref("settings")}><span className={styles.navIcon} aria-hidden="true">✧</span> نموذج العمل والميزات</Link>:null}
          <Link className={`${styles.navItem} ${workspaceView==="branches"?styles.navItemActive:""}`} href={workspaceHref("branches")}><span className={styles.navIcon} aria-hidden="true">⚙</span> بيانات النشاط</Link>
          {canManageBranches?<Link className={`${styles.navItem} ${workspaceView==="subscription"?styles.navItemActive:""}`} href={workspaceHref("subscription")} aria-current={workspaceView==="subscription"?"page":undefined}><span className={styles.navIcon} aria-hidden="true">▤</span> الاشتراك والباقة</Link>:null}
          <span className={`${styles.navItem} ${styles.navItemSoon}`} aria-disabled="true">
            <span className={styles.navIcon} aria-hidden="true">▥</span> التقارير <span className={styles.soon}>قريباً</span>
          </span>
        </nav>
        <div className={styles.sidebarFooter}>
          <p className={styles.sidebarNote}>لوحة تجريبية آمنة · الطلبات التي تنشئها في Staging بيانات اختبار فعلية وليست إيرادات تجارية.</p>
          <form action="/auth/signout" method="post"><button className={styles.signout} type="submit">↪ تسجيل الخروج</button></form>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>مساحة العمل</span><span aria-hidden="true">/</span><strong>{workspaceTitles[workspaceView]}</strong></div>
          <div className={styles.topActions}>
            {canOpenPlatform && <Link href="/admin" style={{textDecoration:"none",color:"#165d66",background:"#eaf4f3",padding:"9px 12px",borderRadius:10,fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>إدارة المنصة ↗</Link>}
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
              <p className={styles.eyebrow}>BEGER HQ / {workspaceView.toUpperCase()}</p>
              <h1 className={styles.heading}>{workspaceView==="overview"?`أهلاً بعودتك، ${firstName} 👋`:workspaceTitles[workspaceView]}</h1>
              <p className={styles.subheading}>{workspaceView==="overview"?"ملخص النشاط ومداخل الإدارة في مساحة مرتبة.":"لكل قسم مساحة عمل مستقلة، مع الحفاظ على بيانات المتجر الحقيقية."}</p>
            </div>
            <div className={styles.headBadge}><span className={styles.statusDot} aria-hidden="true" /> حسابك: <b>{roleLabel(currentRole)}</b></div>
          </div>

          {params.setup==="review" && <div className={styles.error} role="alert">تم إنشاء نشاطك، لكن حفظ اختيار النموذج والميزات لم يكتمل. افتح «نموذج العمل والميزات» واحفظ اختياراتك من جديد. لم يُفعّل أي اشتراك مدفوع.</div>}
          {membershipError ? <div className={styles.error} role="alert">تعذّر التحقق من عضوية نشاطك. حاول إعادة تحميل الصفحة، ولا تنشئ نشاطاً جديداً قبل التأكد.</div> : null}
          {loadError && !membershipError ? <div className={styles.error} role="alert">تعذّر تحميل بعض بيانات نشاطك. حاول إعادة تحميل الصفحة؛ لن نعرض أرقاماً غير مؤكدة.</div> : null}

          {workspaceView==="overview"&&(canManageBranches ? <HqReferenceOverview businessName={displayName} userLabel={firstName} businessCount={ownerCount} branches={primaryBranches.map(b=>({id:b.id,name:b.name}))} loadError={loadError}/> : <>
          <section className={styles.hero} aria-label="مرحباً بنشاطك">
            <div className={styles.heroCopy}>
              <span className={styles.heroBadge}>✦ بداية مساحة عملك</span>
              <h2 className={styles.heroTitle}>أهلاً بك في {displayName}</h2>
              <p className={styles.heroText}>مساحتك لإدارة النشاط والفروع. الخطوة التالية هي QR المتجر والمنيو الذي يفتح للزبون مباشرةً دون إلزامه بتسجيل حساب.</p>
            </div>
            <div className={styles.heroGraphic} aria-hidden="true"><div className={styles.heroGraphicInner}><span className={styles.heroGraphicText}>B</span></div></div>
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

          </>)}

          {workspaceView==="branches"?<div className={styles.twoCols}>
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
                      <Link href={`/dashboard/branches/${branch.id}`} className={styles.branchOpenLink}>فتح لوحة الفرع ←</Link>
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
          </div>:null}

          {workspaceView==="operations"&&!loadError && primary && canManageBranches && <HeadquartersCatalog businessId={primary.id} country={primary.country_code} branches={primaryBranches.map(b => ({id:b.id,name:b.name}))}/>}

          {workspaceView==="settings"&&!loadError && primary && canManageBranches ? <div id="business-model" style={{margin:"26px 0"}}><BegerSectorConfigurator key={primary.id} draftKey={primary.id} businessId={primary.id} canSave={currentRole==="owner"}/></div>:null}
          {workspaceView==="subscription"&&canManageBranches&&!loadError&&primary?<MerchantSubscriptionStatusPanel data={subscriptionData} error={subscriptionError} businessId={primary.id} canRequest={currentRole==="owner"}/>:null}
          {workspaceView==="modules"?<section className={styles.modules} aria-labelledby="modules-heading">
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
          </section>:null}
          <footer className={styles.footer}>Beger · Smart Business OS · نسخة Staging للاختبار فقط</footer>
        </main>
      </div>

      <nav className={styles.mobileBar} aria-label="التنقل السريع">
        <Link href={workspaceHref("overview")} className={`${styles.mobileLink} ${workspaceView==="overview"?styles.mobileActive:""}`} aria-current={workspaceView==="overview"?"page":undefined}><span className={styles.mobileIcon} aria-hidden="true">▦</span>الرئيسية</Link>
        <Link href={workspaceHref("branches")} className={`${styles.mobileLink} ${workspaceView==="branches"?styles.mobileActive:""}`}><span className={styles.mobileIcon} aria-hidden="true">⌂</span>الفروع</Link>
        {canManageBranches?<Link href={workspaceHref("operations")} className={`${styles.mobileLink} ${workspaceView==="operations"?styles.mobileActive:""}`}><span className={styles.mobileIcon} aria-hidden="true">▤</span>المتجر</Link>:null}
        <form action="/auth/signout" method="post"><button type="submit" className={styles.signout} aria-label="تسجيل الخروج">↪<span style={{display:"block",fontSize:10}}>خروج</span></button></form>
      </nav>
    </div>
  );
}
