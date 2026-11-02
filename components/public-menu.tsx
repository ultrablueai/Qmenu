import Link from "next/link";
import "./public-menu.css";
import ProductDetails from "./product-details";
import GuestCart from "./guest-cart";
import GuestRatingPreview from "./guest-rating-preview";
import {formatPrice,localizedText,type G2Branch,type G2Category,type GuestAppearance,type GuestLang} from "../lib/g2-public";

type Props={branch:G2Branch;categories:G2Category[];lang:GuestLang;appearance:GuestAppearance;tableLabel?:string;tableToken?:string};
const wording={
 ar:{welcome:"أهلاً بك في",branch:"الفرع",table:"الطاولة",menu:"القائمة الرقمية",empty:"لم تُنشر منتجات متاحة بعد.",guest:"بدون حساب أو تطبيق",note:"عرض القائمة فقط — الطلبات والدفع سيتم تفعيلهما بعد اختبار المرحلة التالية.",products:"المنتجات",discover:"استكشف قائمتنا"},
 tr:{welcome:"Hoş geldiniz",branch:"Şube",table:"Masa",menu:"Dijital Menü",empty:"Henüz yayınlanmış ürün bulunmuyor.",guest:"Hesap veya uygulama gerekmiyor",note:"Şimdilik yalnızca menü görüntüleme. Sipariş ve ödeme sonraki aşamada etkinleşecek.",products:"Ürünler",discover:"Menümüzü keşfedin"},
 en:{welcome:"Welcome to",branch:"Branch",table:"Table",menu:"Digital menu",empty:"No products available yet.",guest:"No account or app required",note:"Menu preview only — ordering and payment will be enabled after the next phase is tested.",products:"Products",discover:"Explore our menu"}
} as const;
const palettes={
 luxe_dark:{background:"#FAF6EF",surface:"#FFFEFA",foreground:"#33291F",muted:"#827568",accent:"#687843",border:"#E9DED0",hero:"#F4E6D6",buttonForeground:"#fff"},
 clean_light:{background:"#FCFAF6",surface:"#FFFFFF",foreground:"#25382F",muted:"#6D7B6F",accent:"#477D5A",border:"#E6E9E0",hero:"#F1F3E9",buttonForeground:"#fff"},
 bold_commerce:{background:"#FFF9F2",surface:"#FFFEFA",foreground:"#402F24",muted:"#806F61",accent:"#B85E35",border:"#EDDCCF",hero:"#FBE5D0",buttonForeground:"#fff"}
} as const;
function detailsText(i:{description_ar:string;description_tr:string;description_en?:string},lang:GuestLang){
 return (lang==="en"?i.description_en:lang==="tr"?i.description_tr:i.description_ar)?.trim()||i.description_ar||i.description_tr||"";
}
export default function PublicMenu({branch,categories,lang,appearance,tableLabel,tableToken}:Props){
 const t=wording[lang],theme=palettes[appearance.theme]??palettes.clean_light;
 const base=tableToken?`/t/${tableToken}`:`/b/${branch.branch_id}`;
 const heroImage=categories.flatMap(category=>category.items).find(item=>item.image_url)?.image_url;
 const totalItems=categories.reduce((sum,category)=>sum+category.items.length,0);
 const categorySymbol=(label:string)=>/قهو|coffee|kahve|drink|مشروب|içecek/i.test(label)?"☕":/sandwich|sandviç|سندوي|burger|برغر|food|وجبة/i.test(label)?"🥪":/حلو|tatlı|dessert|cake/i.test(label)?"🍰":"✦";
 return <main className="beger-guest" dir={lang==="ar"?"rtl":"ltr"} lang={lang} data-beger-theme={appearance.theme}
  style={{minHeight:"100dvh",background:theme.background,color:theme.foreground,fontFamily:"system-ui, sans-serif",padding:"0 clamp(16px,4vw,32px) 92px"}}>
  <GuestCart key={branch.branch_id} country={branch.country_code} lang={lang} accent={theme.accent}>
  <div className="beger-guest-container" style={{maxWidth:1120,margin:"auto"}}>
   <header className="beger-guest-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"22px 0",borderBottom:"1px solid "+theme.border}}>
    <strong className="beger-guest-brand" style={{fontSize:27,letterSpacing:"-1.1px"}}><span className="beger-brand-symbol" aria-hidden="true">B</span> Beger<span style={{color:"#BD7044"}}>.</span></strong>
    <nav className="beger-guest-languages" aria-label="Languages" style={{display:"flex",gap:9,flexWrap:"wrap",fontSize:13}}>
      {appearance.enabled_languages.map(l=><Link key={l} href={base+"?lang="+l} hrefLang={l}
        aria-current={l===lang?"page":undefined}
        style={{color:l===lang?theme.buttonForeground:theme.foreground,background:l===lang?theme.accent:"transparent",border:"1px solid "+theme.border,borderRadius:10,padding:"8px 10px",fontWeight:l===lang?800:500}}>
         {l==="ar"?"العربية":l==="tr"?"Türkçe":"English"}
       </Link>)}
    </nav>
   </header>
   <section className="beger-guest-hero beger-welcome-screen" style={{background:theme.hero,border:"1px solid "+theme.border}}>
     <div className="beger-welcome-photo" aria-hidden="true">
       {heroImage?<img src={heroImage} alt="" loading="eager" referrerPolicy="no-referrer"/>:<span className="beger-guest-coffee-symbol">☕</span>}
     </div>
     <div className="beger-welcome-content">
       <span className="beger-guest-overline">{lang==="ar"?"BEGER · مرحباً بكم":lang==="tr"?"BEGER · HOŞ GELDİNİZ":"BEGER · WELCOME"}</span>
       <h1>{branch.business_name}</h1>
       <p>{t.branch}: {branch.branch_name}{tableLabel?` · ${t.table}: ${tableLabel}`:""}</p>
       <div className="beger-welcome-panel">
         <h2>{lang==="ar"?"أهلاً وسهلاً":lang==="tr"?"Hoş geldiniz":"Welcome"}</h2>
         <p>{lang==="ar"?"تصفّح قائمتنا، واختَر مكوناتك وإضافاتك بكل سهولة.":lang==="tr"?"Menümüzü keşfedin, malzemelerinizi ve eklemelerinizi seçin.":"Explore the menu and personalize ingredients and extras."}</p>
         <a className="beger-welcome-cta" href="#beger-categories" style={{background:theme.accent,color:theme.buttonForeground}}>⌗ {t.discover} <span aria-hidden="true">←</span></a>
       </div>
       <div className="beger-service-types" aria-label={lang==="ar"?"أنواع الخدمة — عرض توضيحي":lang==="tr"?"Servis türleri — önizleme":"Service formats — preview"}>
        <span><b>☕</b>{lang==="ar"?"داخل المقهى":lang==="tr"?"Mekânda":"Dine in"}</span>
        <span><b>♧</b>{lang==="ar"?"استلام":lang==="tr"?"Paket":"Takeaway"}</span>
        <span><b>♧</b>{lang==="ar"?"توصيل (لاحقاً)":lang==="tr"?"Teslimat (yakında)":"Delivery (soon)"}</span>
       </div>
     </div>
   </section>
   <section className="beger-menu-intro" aria-label={t.menu}>
    <div className="beger-menu-intro-top">
      <div><span className="beger-guest-overline">BEGER · MENU</span><h2>{lang==="ar"?"قائمتنا":lang==="tr"?"Menümüz":"Our Menu"}</h2><p>{t.discover} · {totalItems} {t.products}</p></div>
      <span className="beger-preview-pill">{lang==="ar"?"معاينة":lang==="tr"?"Önizleme":"Preview"}</span>
    </div>
    <nav id="beger-categories" aria-label={t.menu} className="beger-category-tiles">
      {categories.map(c=><a key={c.id} href={`#category-${c.id}`} style={{borderColor:theme.border,color:theme.foreground}}>
        <span aria-hidden="true">{categorySymbol(localizedText(c,lang))}</span><strong>{localizedText(c,lang)}</strong>
      </a>)}
    </nav>
   </section>
   {categories.length===0?<div style={{padding:30,borderRadius:18,background:theme.surface,border:"1px solid "+theme.border}}>{t.empty}</div>:
    categories.map(c=><section key={c.id} style={{marginBottom:30}} aria-labelledby={`category-${c.id}`}>
     <h3 id={`category-${c.id}`} className="beger-guest-category-name" style={{fontSize:22,marginBottom:15,borderInlineStart:"4px solid "+theme.accent,paddingInlineStart:13}}>{localizedText(c,lang)}</h3>
     <div className="beger-menu-product-list">
      {c.items.length===0?<p style={{color:theme.muted,fontSize:14}}>{t.empty}</p>:
       c.items.map(i=><article className="beger-guest-product" key={i.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:10,minWidth:0,width:"100%",boxSizing:"border-box",background:theme.surface,border:"1px solid "+theme.border,
         borderRadius:22,padding:"clamp(14px,3vw,20px)",boxShadow:appearance.theme==="clean_light"?"0 8px 30px rgba(24,62,65,.055)":"0 4px 18px rgba(40,30,20,.04)"}}>
        <div className="beger-guest-product-top" style={{display:"flex",gap:14,alignItems:"flex-start",minWidth:0,width:"100%"}}>
         {i.image_url?<img src={i.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="beger-guest-product-photo" style={{width:"clamp(85px,22vw,115px)",height:"clamp(85px,22vw,115px)",objectFit:"cover",borderRadius:17,flexShrink:0,maxWidth:"36%"}}/>:null}
         <div style={{flex:"1 1 0",minWidth:0,overflowWrap:"break-word"}}>
          <h4 style={{fontSize:16,lineHeight:1.5,margin:"0 0 5px",overflowWrap:"break-word"}}>{localizedText(i,lang)}</h4>
          {detailsText(i,lang)?<p style={{fontSize:12,lineHeight:1.55,color:theme.muted,margin:"0 0 8px",overflowWrap:"break-word"}}>{detailsText(i,lang)}</p>:null}
          <strong style={{fontSize:17,color:theme.accent,whiteSpace:"nowrap"}}>{formatPrice(Number(i.price_minor),branch.country_code,lang)}</strong>
         </div>
        </div>
        <div style={{width:"100%",minWidth:0,boxSizing:"border-box",borderTop:"1px solid "+theme.border,paddingTop:2}}>
         <ProductDetails branchId={branch.branch_id} productId={i.id} country={branch.country_code} lang={lang} accent={theme.accent} dark={false} imageUrl={i.image_url}/>
         <GuestRatingPreview lang={lang}/>
        </div>
       </article>)}
     </div>
    </section>)}
   <nav className="beger-guest-bottom-nav" aria-label={lang==="ar"?"القائمة السريعة":lang==="tr"?"Hızlı menü":"Quick navigation"}>
      <a href="#beger-categories" aria-current="page"><span aria-hidden="true">⌂</span>{lang==="ar"?"الرئيسية":lang==="tr"?"Ana sayfa":"Home"}</a>
      <a href={`#category-${categories[0]?.id??""}`}><span aria-hidden="true">♧</span>{t.menu}</a>
      <a href="#beger-categories"><span aria-hidden="true">☕</span>{t.products}</a>
   </nav>
   <footer style={{padding:"22px 0",borderTop:"1px solid "+theme.border,color:theme.muted,fontSize:12}}>{t.note}<div style={{marginTop:10}}>Beger · Smart Business OS</div></footer>
  </div>
  </GuestCart>
 </main>;
}
