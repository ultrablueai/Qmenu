import Link from "next/link";
import "./public-menu.css";
import "../app/qr-experience.css";
import ProductDetails from "./product-details";
import GuestCart from "./guest-cart";
import GuestScreenSwitcher,{GuestOpenMenu,GuestLanguageSwitcher} from "./guest-screen-switcher";
import GuestCatalogExplorer from "./guest-catalog-explorer";
import GuestRewardsPreview from "./guest-rewards-preview";
import GuestFavorite from "./guest-favorite";
import GuestIcon from "./guest-icons";
import GuestServiceChoice from "./guest-service-choice";
import {formatPrice,localizedText,type G2Branch,type G2Category,type GuestAppearance,type GuestLang} from "../lib/g2-public";

type Props={branch:G2Branch;categories:G2Category[];lang:GuestLang;appearance:GuestAppearance;tableLabel?:string;tableToken?:string;initialProductId?:string;serviceMode?:"browse"|"takeaway"};
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
export default function PublicMenu({branch,categories,lang,appearance,tableLabel,tableToken,initialProductId,serviceMode="browse"}:Props){
 const t=wording[lang],theme=palettes[appearance.theme]??palettes.clean_light;
 const initialCategoryId=initialProductId?categories.find(c=>c.items.some(i=>i.id===initialProductId))?.id:undefined;
 const base=tableToken?`/t/${tableToken}`:`/b/${branch.branch_id}`;
 const heroImage="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=85&fit=crop";
 const totalItems=categories.reduce((sum,category)=>sum+category.items.length,0);
 const categorySymbol=(label:string):"coffee"|"sandwich"|"dessert"|"more"=>/قهو|coffee|kahve|drink|مشروب|içecek/i.test(label)?"coffee":/sandwich|sandviç|سندوي|burger|برغر|food|وجبة/i.test(label)?"sandwich":/حلو|tatlı|dessert|cake/i.test(label)?"dessert":"more";
 return <main className="beger-guest" dir={lang==="ar"?"rtl":"ltr"} lang={lang} data-beger-theme={appearance.theme}
  style={{minHeight:"100dvh",background:theme.background,color:theme.foreground,fontFamily:"system-ui, sans-serif",padding:"0 clamp(16px,4vw,32px) 92px"}}>
  <GuestCart key={branch.branch_id} country={branch.country_code} lang={lang} accent={theme.accent} branchId={branch.branch_id} tableToken={tableToken} tableLabel={tableLabel} serviceMode={tableToken?"dine_in":serviceMode}>
  <GuestScreenSwitcher lang={lang} initialStage={tableToken?"menu":"welcome"}>
  <div className="beger-guest-container" style={{maxWidth:1120,margin:"auto"}}>
   <header className="beger-guest-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"22px 0",borderBottom:"1px solid "+theme.border}}>
    <strong className="beger-guest-brand" style={{fontSize:27,letterSpacing:"-1.1px"}}><span className="beger-brand-symbol" aria-hidden="true">B</span> Beger<span style={{color:"#BD7044"}}>.</span></strong>
    <GuestLanguageSwitcher lang={lang} enabled={appearance.enabled_languages}/>
   </header>
   {tableLabel?<div className="beger-table-confirmation" role="status" aria-label={lang==="ar"?"الطاولة المحددة":lang==="tr"?"Seçilen masa":"Selected table"}><span aria-hidden="true">▦</span><div><small>{lang==="ar"?"أنت تتصفح منيو الطاولة":lang==="tr"?"Bu masanın menüsünü görüntülüyorsunuz":"You're viewing the menu for"}</small><strong>{tableLabel}</strong></div><span className="beger-table-confirmed">{lang==="ar"?"تم التعرف على الطاولة":lang==="tr"?"Masa tanındı":"Table identified"} ✓</span></div>:null}
   <section className="beger-guest-hero beger-welcome-screen" style={{background:theme.hero,border:"1px solid "+theme.border}}>
     <div className="beger-welcome-photo" aria-hidden="true">
       <img src={heroImage} alt="" loading="eager" referrerPolicy="no-referrer"/>
     </div>
     <div className="beger-welcome-content">
       <span className="beger-guest-overline">{lang==="ar"?"مقهى · مطعم · مخبوزات":lang==="tr"?"Kafe · Restoran · Fırın":"Café · Restaurant · Bakery"}</span>
       <h1>{branch.business_name}</h1>
       <p>{branch.branch_name}{tableLabel?` · ${t.table}: ${tableLabel}`:""}</p>
       <div className="beger-welcome-panel">
         <h2>{lang==="ar"?"أهلاً وسهلاً":lang==="tr"?"Hoş geldiniz":"Welcome"}</h2>
         <p>{lang==="ar"?"تصفّح قائمتنا، واختَر مكوناتك وإضافاتك بكل سهولة.":lang==="tr"?"Menümüzü keşfedin, malzemelerinizi ve eklemelerinizi seçin.":"Explore the menu and personalize ingredients and extras."}</p>
         <GuestOpenMenu lang={lang}/>
       </div>
       <GuestServiceChoice lang={lang} branchId={branch.branch_id} mode={serviceMode}/>

     </div>
   </section>
   {serviceMode==="takeaway"&&!tableToken?<div className="beger-service-context" role="status"><strong>{lang==="ar"?"سفري · استلام من المحل":lang==="tr"?"Paket · Mağazadan teslim":"Takeaway · Pick up at shop"}</strong><p>{lang==="ar"?"تصفح المنتجات واختر إضافاتك. الطلب السفري والتغليف وأسعارهما لم يُفعّلا بعد؛ لن يُرسل طلب من هذه المعاينة.":lang==="tr"?"Ürünlere göz atın. Paket sipariş ve ambalaj ücretleri henüz etkin değil; bu önizleme sipariş göndermez.":"Browse products and add-ons. Takeaway ordering and packaging charges are not active yet; this preview cannot submit an order."}</p></div>:null}
   <section className="beger-menu-intro" aria-label={t.menu}>
    <div className="beger-menu-intro-top">
      <div><span className="beger-guest-overline">BEGER · MENU</span><h2>{lang==="ar"?"قائمتنا":lang==="tr"?"Menümüz":"Our Menu"}</h2><p>{t.discover} · {totalItems} {t.products}</p></div>
      <span className="beger-preview-pill">{lang==="ar"?"قائمة QR":lang==="tr"?"QR Menü":"QR Menu"}</span>
    </div>
   </section>
   <GuestCatalogExplorer lang={lang} initialCategoryId={initialCategoryId} categories={categories.map(c=>({id:c.id,name:localizedText(c,lang),icon:categorySymbol(localizedText(c,lang)),count:c.items.length}))}>
   {categories.length===0?<div style={{padding:30,borderRadius:18,background:theme.surface,border:"1px solid "+theme.border}}>{t.empty}</div>:
    categories.map(c=><section className="beger-menu-section" data-category-id={c.id} key={c.id} style={{marginBottom:30}} aria-labelledby={`category-${c.id}`}>
     <div className="beger-category-heading"><h3 id={`category-${c.id}`} className="beger-guest-category-name" style={{fontSize:22,marginBottom:15,borderInlineStart:"4px solid "+theme.accent,paddingInlineStart:13}}>{localizedText(c,lang)}</h3><span className="beger-category-count">{c.items.length} {t.products}</span></div>
     <div className="beger-menu-product-list">
      {c.items.length===0?<p style={{color:theme.muted,fontSize:14}}>{t.empty}</p>:
       c.items.map(i=><article className="beger-guest-product" data-search-text={`${i.name_ar} ${i.name_tr} ${i.name_en??""} ${i.description_ar} ${i.description_tr} ${i.description_en??""}`} key={i.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:10,minWidth:0,width:"100%",boxSizing:"border-box",background:theme.surface,border:"1px solid "+theme.border,
         borderRadius:22,padding:"clamp(14px,3vw,20px)",boxShadow:appearance.theme==="clean_light"?"0 8px 30px rgba(24,62,65,.055)":"0 4px 18px rgba(40,30,20,.04)"}}>
        <div className="beger-guest-product-top" style={{display:"flex",gap:14,alignItems:"flex-start",minWidth:0,width:"100%"}}>
         {i.image_url?<img src={i.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="beger-guest-product-photo" style={{width:"clamp(85px,22vw,115px)",height:"clamp(85px,22vw,115px)",objectFit:"cover",borderRadius:17,flexShrink:0,maxWidth:"36%"}}/>:null}
         <div className="beger-product-info">
          <h4>{localizedText(i,lang)}</h4>
          {detailsText(i,lang)?<p>{detailsText(i,lang)}</p>:null}
          <span className="beger-product-verified-rating">{lang==="ar"?"☆ لم تُقيّم بعد":lang==="tr"?"☆ Henüz puan yok":"☆ Not rated yet"}</span>
         </div>
         <div className="beger-product-side"><GuestFavorite lang={lang}/><strong>{formatPrice(Number(i.price_minor),branch.country_code,lang)}</strong></div>
        </div>
        <ProductDetails branchId={branch.branch_id} productId={i.id} country={branch.country_code} lang={lang} accent={theme.accent} dark={false} imageUrl={i.image_url} tableOrdering={Boolean(tableToken)}/>
       </article>)}
     </div>
    </section>)}
   </GuestCatalogExplorer>
   <GuestRewardsPreview lang={lang}/>
   <footer className="beger-guest-footer" style={{padding:"22px 0",borderTop:"1px solid "+theme.border,color:theme.muted,fontSize:12}}>{t.note}<div style={{marginTop:10}}>Beger · Smart Business OS</div></footer>
  </div>
  </GuestScreenSwitcher>
  </GuestCart>
 </main>;
}
