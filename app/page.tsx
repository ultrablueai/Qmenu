import Link from "next/link";
import BegerBrand from "../components/beger-brand";
import "./beger-marketing.css";
const demo="/b/b0000000-2026-4000-8000-000000000002?lang=ar";
const photo="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=85&fit=crop";
const features=[
 {icon:"▦",title:"منيو ذكي بثلاث لغات",description:"اعرض المنتجات والصور والمكونات والإضافات بالعربية والتركية والإنجليزية، من QR مباشرة."},
 {icon:"♧",title:"إدارة مركزية للفروع",description:"كتالوج واحد للفروع، مع تحكم بالنشر والأسعار وخيارات كل منتج من مساحة التاجر."},
 {icon:"☆",title:"تجربة تليق بعلامتك",description:"تصاميم كريمية وزيتونية أنيقة، ومساحات منظمة للمنيو والسلة والمكافآت المستقبلية."}
];
export default function Home(){
 return <main className="beger-marketing" dir="rtl" lang="ar">
  <div className="beger-marketing-wrap">
   <header className="beger-marketing-nav">
    <BegerBrand/>
    <nav className="beger-marketing-navlinks" aria-label="التنقل">
     <Link href={demo} className="beger-marketing-link">تجربة الزبون</Link>
     <Link href="/login" className="beger-marketing-link">دخول التاجر</Link>
     <Link href="/signup" className="beger-marketing-button">ابدأ مع Beger <span aria-hidden="true">←</span></Link>
    </nav>
   </header>
   <section className="beger-marketing-hero" aria-labelledby="beger-landing-title">
    <div>
     <span className="beger-marketing-kicker">✦ Beger / Qmenu · Smart Business OS</span>
     <h1 id="beger-landing-title">منيو أجمل.<br/><em>إدارة أذكى.</em><br/>تجربة تتذكّرها.</h1>
     <p className="beger-marketing-lead">من أول مسح لرمز QR إلى اكتشاف المنتجات وتخصيص الإضافات، وصولاً لإدارة الكتالوج والفروع من مكان واحد. Beger يمنح مقهاك ومطعمك هوية رقمية راقية.</p>
     <div className="beger-marketing-actions">
      <Link href={demo} className="beger-marketing-button">جرّب واجهة الزبون <span aria-hidden="true">←</span></Link>
      <Link href="/login" className="beger-marketing-button beger-marketing-button--light">ادخل إلى لوحة التاجر</Link>
      <Link href="/demo-control" className="beger-marketing-button beger-marketing-button--light">مركز اختبار المتجر للمالك</Link>
     </div>
     <p className="beger-marketing-note">بيئة اختبار Staging: يمكنك تجربة إرسال الطلبات وتشغيل الكاشير والمطبخ والبيجر. لا يوجد دفع إلكتروني أو اشتراك تجاري مدفوع.</p>
    </div>
    <div className="beger-hero-art" aria-label="صورة مقهى دافئ ضمن هوية Beger">
     <img src={photo} alt="مقهى دافئ بتفاصيل طبيعية وألوان كريمية" loading="eager" referrerPolicy="no-referrer"/>
     <div className="beger-art-top"><span className="beger-art-pill">☕ Café · Restaurant</span><span className="beger-art-pill">AR · TR · EN</span></div>
     <div className="beger-art-caption"><h2>كل تجربة تبدأ بتفصيل جميل.</h2><p>قائمة رقمية بالصور، تخصيص ذكي للمنتجات، وتناسق بصري يليق بمتجرك.</p></div>
    </div>
   </section>
   <section className="beger-marketing-section" aria-labelledby="beger-value-title">
    <div className="beger-marketing-section-heading"><span className="beger-marketing-kicker">لماذا Beger؟</span><h2 id="beger-value-title">كل شيء مرتب. كل شيء بهوية واحدة.</h2><p>تجربة الزبون وإدارة التاجر تكملان بعضهما، بتصميم فاخر وواضح وسهل الاستخدام.</p></div>
    <div className="beger-feature-grid">{features.map(f=><article className="beger-feature-card" key={f.title}><span className="beger-feature-icon" aria-hidden="true">{f.icon}</span><h3>{f.title}</h3><p>{f.description}</p></article>)}</div>
   </section>
   <aside className="beger-demo-banner"><div><h2>جاهز تشوف Beger على أرض الواقع؟</h2><p>افتح تجربة الزبون أو ادخل إلى مساحة التاجر. بيانات التشغيل غير المتاحة تظهر بوضوح، دون أرقام وهمية.</p></div><div className="beger-marketing-actions"><Link href={demo} className="beger-marketing-button">تجربة المنيو</Link><Link href="/signup" className="beger-marketing-button beger-marketing-button--light">إنشاء حساب تاجر</Link></div></aside>
   <footer className="beger-marketing-footer"><span>Beger / Qmenu · Smart Business OS</span><span>نسخة Staging للمعاينة — ليس إطلاقاً تجارياً</span></footer>
  </div>
 </main>;
}
