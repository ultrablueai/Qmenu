import Link from "next/link";

const demo = "/b/b0000000-2026-4000-8000-000000000002?lang=ar";

export default function Home() {
  return <main dir="rtl" lang="ar" className="beger-home">
    <style>{`
      .beger-home{--ink:#17382f;--muted:#60766d;--green:#167759;--line:#deebe4;min-height:100dvh;background:#fbfcfa;color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
      .beger-home *{box-sizing:border-box}
      .beger-home a{text-decoration:none}
      .beger-wrap{max-width:1120px;margin:auto;padding:0 24px}
      .beger-nav{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:24px 0;border-bottom:1px solid var(--line)}
      .beger-brand{font-weight:850;font-size:30px;color:var(--ink);letter-spacing:-1.6px;direction:ltr}.beger-brand span{color:var(--green)}
      .beger-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .beger-btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 19px;border-radius:13px;font-size:14px;font-weight:750;color:var(--ink);border:1px solid var(--line);background:white;transition:transform .16s ease,box-shadow .16s ease}
      .beger-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px #133d2916}
      .beger-btn-primary{background:var(--green);border-color:var(--green);color:white!important}
      .beger-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:55px;align-items:center;padding:75px 0 68px}
      .beger-eyebrow{display:inline-block;border:1px solid #d6e9da;background:#edf7ef;color:#216e4d;border-radius:30px;padding:8px 13px;font-size:13px;font-weight:750}
      .beger-hero h1{font-size:clamp(38px,5.5vw,66px);line-height:1.17;letter-spacing:-1.7px;margin:20px 0}
      .beger-hero h1 em{font-style:normal;color:var(--green)}
      .beger-lead{font-size:17px;color:var(--muted);line-height:1.95;max-width:590px;margin:0 0 26px}
      .beger-note{font-size:12px;color:var(--muted);margin-top:17px}
      .beger-preview{background:#eaf3ed;border:1px solid #d8e7de;border-radius:34px;padding:22px;box-shadow:0 30px 72px #214c3420}
      .beger-preview-inner{background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px #1f3c2512}
      .beger-preview-header{padding:20px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eaf0eb}
      .beger-preview-hero{background:linear-gradient(125deg,#e6f2e8,#f9f9f1);padding:26px 22px}
      .beger-preview-hero h2{font-size:27px;margin:5px 0}.beger-preview-hero p{color:#648072;font-size:13px;margin:0}
      .beger-mini-product{display:flex;gap:13px;align-items:center;padding:16px 22px;border-bottom:1px solid #eff2ef}
      .beger-mini-image{flex-shrink:0;width:64px;height:64px;border-radius:15px;background:linear-gradient(145deg,#d6b48b,#765039);display:grid;place-items:center;font-size:29px}
      .beger-mini-product b{display:block;font-size:15px}.beger-mini-product small{display:block;color:#718077;margin-top:5px}.beger-mini-product strong{margin-inline-start:auto;white-space:nowrap;color:var(--green);font-size:13px}
      .beger-section{padding:10px 0 75px}.beger-section h2{font-size:clamp(26px,3vw,35px);margin:0 0 12px}.beger-section>p{color:var(--muted);margin:0 0 23px}
      .beger-features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
      .beger-feature{border:1px solid var(--line);border-radius:22px;background:white;padding:24px;min-height:170px}
      .beger-feature-icon{font-size:26px}.beger-feature h3{font-size:18px;margin:15px 0 8px}.beger-feature p{font-size:14px;color:var(--muted);line-height:1.8;margin:0}
      .beger-footer{border-top:1px solid var(--line);padding:24px 0 40px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}
      @media(max-width:800px){.beger-hero{grid-template-columns:1fr;gap:28px;padding:52px 0}.beger-features{grid-template-columns:1fr}.beger-hero h1{font-size:42px}.beger-nav{align-items:flex-start}.beger-actions{justify-content:flex-end}.beger-btn{min-height:42px;padding:10px 13px}}
      @media(max-width:440px){.beger-wrap{padding:0 16px}.beger-nav{flex-wrap:wrap}.beger-actions{width:100%;justify-content:space-between}.beger-hero h1{font-size:37px}.beger-preview{padding:12px;border-radius:22px}}
    `}</style>
    <div className="beger-wrap">
      <header className="beger-nav">
        <Link href="/" className="beger-brand" aria-label="Beger home">Beger<span>.</span></Link>
        <nav className="beger-actions" aria-label="حساب التاجر">
          <Link href="/login" className="beger-btn">دخول التاجر</Link>
          <Link href="/signup" className="beger-btn">إنشاء حساب تجريبي</Link>
        </nav>
      </header>
      <section className="beger-hero">
        <div>
          <span className="beger-eyebrow">Beger · Smart Business OS</span>
          <h1>تجربة أذكى،<br/><em>لكل تفاصيل عملك.</em></h1>
          <p className="beger-lead">قوائم رقمية بهوية متجرك، منتجات ومكونات وإضافات واضحة، وإدارة مركزية للفروع. تجربة عربية وتركية وإنجليزية مصممة للهاتف أولاً.</p>
          <div className="beger-actions">
            <Link href={demo} className="beger-btn beger-btn-primary">شاهد المنيو التجريبي ←</Link>
            <Link href="/signup" className="beger-btn">ابدأ كتاجر</Link>
          </div>
          <p className="beger-note">بيئة معاينة تجريبية؛ الطلب والدفع غير مفعّلين في هذه المرحلة.</p>
        </div>
        <div className="beger-preview" aria-label="معاينة توضيحية للواجهة الفاتحة">
          <div className="beger-preview-inner">
            <div className="beger-preview-header"><b>Beger<span style={{color:"#167759"}}>.</span></b><span style={{fontSize:12,color:"#688172"}}>العربية · TR · EN</span></div>
            <div className="beger-preview-hero"><small>أهلاً بك في</small><h2>Beger Demo Café</h2><p>اكتشف مشروباتنا وإضافاتك المفضلة</p></div>
            <div className="beger-mini-product"><div className="beger-mini-image" aria-hidden="true">☕</div><div><b>كابتشينو</b><small>قهوة بالحليب · إضافات حسب الرغبة</small></div><strong>تجريبي</strong></div>
            <div className="beger-mini-product"><div className="beger-mini-image" style={{background:"linear-gradient(145deg,#edd4a9,#b98e5b)"}} aria-hidden="true">🥐</div><div><b>مخبوزات طازجة</b><small>مكونات واضحة وخيارات متنوعة</small></div><strong>تجريبي</strong></div>
          </div>
        </div>
      </section>
      <section className="beger-section">
        <h2>كل شيء يبدأ بتجربة مريحة</h2>
        <p>واجهات واضحة للزبون وإدارة منظمة للتاجر، دون ازدحام أو تعقيد.</p>
        <div className="beger-features">
          <article className="beger-feature"><span className="beger-feature-icon">✦</span><h3>هوية تناسب متجرك</h3><p>ثلاثة تصاميم قابلة للاختيار، مع دعم العربية والتركية والإنجليزية.</p></article>
          <article className="beger-feature"><span className="beger-feature-icon">☕</span><h3>تفاصيل تهم الزبون</h3><p>تصنيفات ومنتجات ومكونات وإضافات مسعّرة وعرض مبدئي للخيارات.</p></article>
          <article className="beger-feature"><span className="beger-feature-icon">⌘</span><h3>إدارة مركزية للفروع</h3><p>إدارة المنتجات والأسعار والنشر حسب الفرع من لوحة التاجر.</p></article>
        </div>
      </section>
      <footer className="beger-footer"><span>Beger · Smart Business OS</span><span>نسخة معاينة على Staging — ليست إطلاقاً تجارياً نهائياً</span></footer>
    </div>
  </main>;
}
