import Link from "next/link";
import type {G2Branch,G2Category} from "../lib/g2-public";
import {formatPrice} from "../lib/g2-public";

type Props={branch:G2Branch;categories:G2Category[];lang:"ar"|"tr";tableLabel?:string;tableToken?:string};
const a={ar:{welcome:"أهلاً بك في",branch:"الفرع",table:"الطاولة",menu:"القائمة الرقمية",empty:"لم تُنشر منتجات متاحة بعد.",unavailable:"القائمة غير متاحة حالياً",guest:"بدون حساب أو تطبيق",note:"عرض القائمة فقط — الطلبات والدفع سيتم تفعيلهما بعد اختبار المرحلة التالية."},
tr:{welcome:"Hoş geldiniz",branch:"Şube",table:"Masa",menu:"Dijital Menü",empty:"Henüz yayınlanmış ürün bulunmuyor.",unavailable:"Menü şu anda kullanılamıyor",guest:"Hesap veya uygulama gerekmiyor",note:"Şimdilik yalnızca menü görüntüleme. Sipariş ve ödeme sonraki aşamada etkinleşecek."}} as const;

export default function PublicMenu({branch,categories,lang,tableLabel,tableToken}:Props){
  const t=a[lang],base=tableToken?`/t/${tableToken}`:`/b/${branch.branch_id}`;
  const direction=lang==="ar"?"rtl":"ltr";
  return <main dir={direction} lang={lang} style={{minHeight:"100dvh",background:"#f6f8f8",color:"#1a3438",fontFamily:"system-ui",padding:"0 16px 70px"}}>
    <div style={{maxWidth:760,margin:"auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,padding:"22px 0",borderBottom:"1px solid #dce5e5"}}>
        <strong style={{fontSize:27,letterSpacing:"-1px"}}>Beger<span style={{color:"#188c83"}}>.</span></strong>
        <nav aria-label="Language" style={{display:"flex",gap:10,fontSize:13}}>
          <Link href={`${base}?lang=ar`} hrefLang="ar" aria-current={lang==="ar"?"page":undefined}>العربية</Link>
          <Link href={`${base}?lang=tr`} hrefLang="tr" aria-current={lang==="tr"?"page":undefined}>Türkçe</Link>
        </nav>
      </header>
      <section style={{padding:"34px 0 22px"}}>
        <p style={{fontSize:13,color:"#267b73",fontWeight:700,margin:"0 0 8px"}}>{t.welcome}</p>
        <h1 style={{fontSize:"clamp(29px,6vw,43px)",margin:"0 0 12px"}}>{branch.business_name}</h1>
        <p style={{fontSize:16,color:"#526c72",margin:0}}>{t.branch}: {branch.branch_name} {tableLabel?` · ${t.table}: ${tableLabel}`:""}</p>
        <p style={{fontSize:12,color:"#467c77"}}>{t.guest}</p>
      </section>
      <h2 style={{fontSize:21,margin:"8px 0 20px"}}>{t.menu}</h2>
      {categories.length===0?<div style={{padding:30,borderRadius:20,background:"white",border:"1px solid #dfebeb",color:"#567177"}}>{t.empty}</div>:
        categories.map(c=><section key={c.id} style={{marginBottom:25}} aria-labelledby={`category-${c.id}`}>
          <h3 id={`category-${c.id}`} style={{fontSize:19,marginBottom:12}}>{lang==="tr"?c.name_tr:c.name_ar}</h3>
          <div style={{display:"grid",gap:12}}>
            {c.items.length===0?<p style={{color:"#70858a",fontSize:14}}>{t.empty}</p>:c.items.map(i=><article key={i.id} style={{display:"flex",gap:17,alignItems:"center",background:"white",border:"1px solid #e0eaea",borderRadius:16,padding:16}}>
              {i.image_url?<img src={i.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" style={{width:96,height:96,objectFit:"cover",borderRadius:12,flexShrink:0}}/>:null}
              <div style={{flex:1,minWidth:0}}>
                <h4 style={{fontSize:17,margin:"0 0 6px"}}>{lang==="tr"?i.name_tr:i.name_ar}</h4>
                {(lang==="tr"?i.description_tr:i.description_ar)?<p style={{margin:"0 0 8px",fontSize:13,color:"#687d82",overflowWrap:"anywhere"}}>{lang==="tr"?i.description_tr:i.description_ar}</p>:null}
                <strong style={{color:"#11746b",fontSize:16}}>{formatPrice(Number(i.price_minor),branch.country_code,lang)}</strong>
              </div>
            </article>)}
          </div>
        </section>)}
      <footer style={{fontSize:12,color:"#718388",marginTop:35,padding:"18px 0",borderTop:"1px solid #dce5e5"}}>{t.note}<div style={{marginTop:10}}>Beger · Smart Business OS</div></footer>
    </div>
  </main>;
}
