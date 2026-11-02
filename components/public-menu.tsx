import Link from "next/link";
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
 luxe_dark:{background:"#141310",surface:"#25231f",foreground:"#fff9ed",muted:"#c3bdb1",accent:"#d6aa52",border:"#484037",hero:"#211b16",buttonForeground:"#17140f"},
 clean_light:{background:"#F8FAF9",surface:"#FFFFFF",foreground:"#18312D",muted:"#637672",accent:"#15765C",border:"#E3ECE8",hero:"#EAF5EF",buttonForeground:"#fff"},
 bold_commerce:{background:"#FFFAF4",surface:"#FFFFFF",foreground:"#352A20",muted:"#7B6B5F",accent:"#C76D31",border:"#F0E4D8",hero:"#F9EBDC",buttonForeground:"#fff"}
} as const;
function detailsText(i:{description_ar:string;description_tr:string;description_en?:string},lang:GuestLang){
 return (lang==="en"?i.description_en:lang==="tr"?i.description_tr:i.description_ar)?.trim()||i.description_ar||i.description_tr||"";
}
export default function PublicMenu({branch,categories,lang,appearance,tableLabel,tableToken}:Props){
 const t=wording[lang],theme=palettes[appearance.theme]??palettes.clean_light;
 const base=tableToken?`/t/${tableToken}`:`/b/${branch.branch_id}`;
 return <main dir={lang==="ar"?"rtl":"ltr"} lang={lang} data-beger-theme={appearance.theme}
  style={{minHeight:"100dvh",background:theme.background,color:theme.foreground,fontFamily:"system-ui, sans-serif",padding:"0 clamp(16px,4vw,32px) 72px"}}>
  <GuestCart key={branch.branch_id} country={branch.country_code} lang={lang} accent={theme.accent}>
  <div style={{maxWidth:1080,margin:"auto"}}>
   <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"22px 0",borderBottom:"1px solid "+theme.border}}>
    <strong style={{fontSize:27,letterSpacing:"-1.1px"}}>Beger<span style={{color:theme.accent}}>.</span></strong>
    <nav aria-label="Languages" style={{display:"flex",gap:9,flexWrap:"wrap",fontSize:13}}>
      {appearance.enabled_languages.map(l=><Link key={l} href={base+"?lang="+l} hrefLang={l}
        aria-current={l===lang?"page":undefined}
        style={{color:l===lang?theme.buttonForeground:theme.foreground,background:l===lang?theme.accent:"transparent",border:"1px solid "+theme.border,borderRadius:10,padding:"8px 10px",fontWeight:l===lang?800:500}}>
         {l==="ar"?"العربية":l==="tr"?"Türkçe":"English"}
       </Link>)}
    </nav>
   </header>
   <section style={{margin:"20px 0 26px",padding:"clamp(22px,5vw,40px)",borderRadius:appearance.theme==="bold_commerce"?28:26,
    background:appearance.theme==="luxe_dark"?"linear-gradient(125deg,#352716,#1b1915)":appearance.theme==="bold_commerce"?"linear-gradient(125deg,#ffe4bf,#ffc78e)":"linear-gradient(125deg,#E9F5EE,#F7FBF8)",
    border:"1px solid "+theme.border}}>
     <p style={{fontSize:13,color:appearance.theme==="luxe_dark"?theme.accent:theme.foreground,fontWeight:800,margin:"0 0 12px"}}>{t.welcome}</p>
     <h1 style={{fontSize:"clamp(29px,6vw,44px)",lineHeight:1.22,margin:"0 0 10px"}}>{branch.business_name}</h1>
     <p style={{fontSize:15,color:theme.muted,margin:"0 0 14px"}}>{t.branch}: {branch.branch_name}{tableLabel?` · ${t.table}: ${tableLabel}`:""}</p>
     <span style={{display:"inline-flex",padding:"7px 12px",borderRadius:20,color:theme.buttonForeground,background:theme.accent,fontWeight:750,fontSize:12}}>{t.guest}</span>
   </section>
   <div style={{display:"flex",alignItems:"baseline",gap:12,margin:"0 0 20px"}}>
    <h2 style={{fontSize:23,margin:0}}>{t.menu}</h2><span style={{color:theme.muted,fontSize:13}}>{t.discover}</span>
   </div>
   {categories.length===0?<div style={{padding:30,borderRadius:18,background:theme.surface,border:"1px solid "+theme.border}}>{t.empty}</div>:
    categories.map(c=><section key={c.id} style={{marginBottom:30}} aria-labelledby={`category-${c.id}`}>
     <h3 id={`category-${c.id}`} style={{fontSize:19,marginBottom:13,borderInlineStart:"4px solid "+theme.accent,paddingInlineStart:10}}>{localizedText(c,lang)}</h3>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))",gap:12}}>
      {c.items.length===0?<p style={{color:theme.muted,fontSize:14}}>{t.empty}</p>:
       c.items.map(i=><article key={i.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:16,minWidth:0,width:"100%",boxSizing:"border-box",background:theme.surface,border:"1px solid "+theme.border,
         borderRadius:22,padding:"clamp(14px,3vw,20px)",boxShadow:appearance.theme==="clean_light"?"0 8px 30px rgba(24,62,65,.055)":"0 4px 18px rgba(40,30,20,.04)"}}>
        <div style={{display:"flex",gap:14,alignItems:"flex-start",minWidth:0,width:"100%"}}>
         {i.image_url?<img src={i.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" style={{width:"clamp(88px,26vw,124px)",height:"clamp(88px,26vw,124px)",objectFit:"cover",borderRadius:17,flexShrink:0,maxWidth:"36%"}}/>:null}
         <div style={{flex:"1 1 0",minWidth:0,overflowWrap:"break-word"}}>
          <h4 style={{fontSize:17,lineHeight:1.5,margin:"0 0 8px",overflowWrap:"break-word"}}>{localizedText(i,lang)}</h4>
          {detailsText(i,lang)?<p style={{fontSize:13,lineHeight:1.7,color:theme.muted,margin:"0 0 11px",overflowWrap:"break-word"}}>{detailsText(i,lang)}</p>:null}
          <strong style={{fontSize:17,color:theme.accent,whiteSpace:"nowrap"}}>{formatPrice(Number(i.price_minor),branch.country_code,lang)}</strong>
         </div>
        </div>
        <div style={{width:"100%",minWidth:0,boxSizing:"border-box",borderTop:"1px solid "+theme.border,paddingTop:2}}>
         <ProductDetails branchId={branch.branch_id} productId={i.id} country={branch.country_code} lang={lang} accent={theme.accent} dark={appearance.theme==="luxe_dark"}/>
         <GuestRatingPreview lang={lang}/>
        </div>
       </article>)}
     </div>
    </section>)}
   <footer style={{padding:"22px 0",borderTop:"1px solid "+theme.border,color:theme.muted,fontSize:12}}>{t.note}<div style={{marginTop:10}}>Beger · Smart Business OS</div></footer>
  </div>
  </GuestCart>
 </main>;
}
