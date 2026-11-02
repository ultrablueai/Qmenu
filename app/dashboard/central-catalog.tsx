"use client";
import {useEffect,useState,type FormEvent,type CSSProperties} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import CentralPriceEditor from "./central-price-editor";
import ProductOptionsManager from "./product-options-manager";

type Branch={id:string;name:string};
type Cat={id:string;name_ar:string;name_tr:string;active:boolean};
type Item={id:string;category_id:string;name_ar:string;name_tr:string;price_minor:number;active:boolean};
type Publication={id:string;branch_id:string;product_id:string;active:boolean;available:boolean;price_override_minor:number|null};
const input:CSSProperties={width:"100%",padding:10,border:"1px solid #c8d8da",borderRadius:9,boxSizing:"border-box",font:"inherit"};
const button:CSSProperties={padding:"10px 16px",border:"none",background:"#176e69",color:"white",borderRadius:10,fontWeight:700,cursor:"pointer"};
const section:CSSProperties={background:"#fff",padding:20,borderRadius:16,border:"1px solid #dce8e8",marginTop:18};
const line:CSSProperties={display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,margin:"12px 0"};
export default function CentralCatalog({businessId,country,branches}:{businessId:string;country:string;branches:Branch[]}){
  const [cats,setCats]=useState<Cat[]>([]),[products,setProducts]=useState<Item[]>([]),[pubs,setPubs]=useState<Publication[]>([]);
  const [catAr,setCatAr]=useState(""),[catTr,setCatTr]=useState(""),[catEn,setCatEn]=useState("");
  const [nameAr,setNameAr]=useState(""),[nameTr,setNameTr]=useState(""),[nameEn,setNameEn]=useState(""),[price,setPrice]=useState(""),[category,setCategory]=useState("");
  const [descAr,setDescAr]=useState(""),[descTr,setDescTr]=useState(""),[descEn,setDescEn]=useState(""),[imageUrl,setImageUrl]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true);
  const factor=country==="TR"?100:1,currency=country==="TR"?"TRY":country==="SY"?"SYP":country;
  async function refresh(){
    const db=browserSupabase();
    const [a,b,c]=await Promise.all([
      db.from("catalog_categories").select("id,name_ar,name_tr,active").eq("business_id",businessId).order("created_at"),
      db.from("catalog_products").select("id,category_id,name_ar,name_tr,price_minor,active").eq("business_id",businessId).order("created_at"),
      db.from("catalog_branch_publications").select("id,branch_id,product_id,active,available,price_override_minor").eq("business_id",businessId)
    ]);
    if(a.error||b.error||c.error)throw new Error("تعذّر قراءة الكتالوج المركزي؛ تحقق من عضوية الإدارة.");
    setCats(a.data??[]);setProducts(b.data??[]);setPubs(c.data??[]);
  }
  useEffect(()=>{let valid=true;setLoading(true);refresh().catch(e=>{if(valid)setError(e.message)}).finally(()=>{if(valid)setLoading(false)});return()=>{valid=false};},[businessId]);
  async function save(doWrite:()=>Promise<{error:{message:string}|null;data?:unknown}>,message:string,requireRow=false){
    if(busy)return false;setBusy(true);setError("");setNotice("");
    try{const result=await doWrite();if(result.error)throw new Error(result.error.message);
      if(requireRow&&!result.data)throw new Error("لم يتم تحديث أي سجل؛ تحقق من الصلاحية.");
      await refresh();setNotice(message);return true;
    }catch(e){setError(e instanceof Error?e.message:"تعذر الحفظ");return false;}finally{setBusy(false);}
  }
  async function addCategory(e:FormEvent){e.preventDefault();if(await save(async()=>browserSupabase().from("catalog_categories").insert({business_id:businessId,name_ar:catAr.trim(),name_tr:catTr.trim(),name_en:catEn.trim()||null}),"تمت إضافة التصنيف المركزي")){setCatAr("");setCatTr("");setCatEn("");}}
  async function addProduct(e:FormEvent){e.preventDefault();const n=Number(price),minor=Math.round(n*factor);
    if(!cats.some(c=>c.id===category)){setError("اختر تصنيفاً صحيحاً");return;}
    if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(minor)||minor>100000000000){setError("السعر غير صالح");return;}
    if(imageUrl.trim()&&!/^https:\/\/[^\s]+$/.test(imageUrl.trim())){setError("رابط الصورة يجب أن يبدأ بـ https://");return;}
    if(await save(async()=>browserSupabase().from("catalog_products").insert({business_id:businessId,category_id:category,name_ar:nameAr.trim(),name_tr:nameTr.trim(),name_en:nameEn.trim()||null,description_ar:descAr.trim(),description_tr:descTr.trim(),description_en:descEn.trim(),image_url:imageUrl.trim()||null,price_minor:minor}),"تم إنشاء المنتج مرة واحدة في كتالوج المؤسسة")){setNameAr("");setNameTr("");setNameEn("");setPrice("");setDescAr("");setDescTr("");setDescEn("");setImageUrl("");}
  }
  async function toggleProduct(branchId:string,productId:string,existing:Publication|undefined){
    if(existing){await save(async()=>browserSupabase().from("catalog_branch_publications").update({active:!existing.active}).eq("id",existing.id).eq("business_id",businessId).select("id").single(),existing.active?"تم إلغاء نشر المنتج في الفرع":"تم نشر المنتج في الفرع",true);}
    else await save(async()=>browserSupabase().from("catalog_branch_publications").insert({business_id:businessId,branch_id:branchId,product_id:productId,active:true}),"تم نشر المنتج في الفرع المحدد");
  }
  if(loading)return <section style={section} role="status">جارٍ تحميل كتالوج المؤسسة…</section>;
  return <section dir="rtl" lang="ar" aria-label="الكتالوج المركزي" style={{marginTop:22}}>
    <h2 style={{fontSize:23}}>الكتالوج المشترك للمؤسسة</h2>
    <p style={{color:"#536d70",fontSize:13}}>أنشئ المنتج مرة واحدة، ثم اختر الفروع التي تنشره. الفرع غير المحدد لا يظهر فيه المنتج. الأسعار لا يغيرها موظف الفرع.</p>
    {error?<p role="alert" style={{background:"#fff2f2",color:"#9f2020",padding:12,borderRadius:8}}>{error}</p>:null}
    {notice?<p role="status" style={{background:"#e8f7ec",color:"#116443",padding:12,borderRadius:8}}>{notice}</p>:null}
    <section style={section}>
      <h3>1. التصنيفات المركزية</h3>
      <form onSubmit={addCategory} style={line}>
        <label style={{flex:"1 1 170px"}}>الاسم بالعربية<input style={input} required maxLength={100} value={catAr} onChange={e=>setCatAr(e.target.value)}/></label>
        <label style={{flex:"1 1 170px"}}>English category (optional)<input style={input} maxLength={100} value={catEn} onChange={e=>setCatEn(e.target.value)}/></label>
        <label style={{flex:"1 1 170px"}}>Türkçe kategori<input style={input} required maxLength={100} value={catTr} onChange={e=>setCatTr(e.target.value)}/></label>
        <button style={button} disabled={busy}>إضافة تصنيف</button>
      </form>
      {cats.map(c=><div key={c.id} style={line}><strong>{c.name_ar}</strong><span>({c.name_tr})</span></div>)}
    </section>
    <section style={section}>
      <h3>2. إنشاء المنتج المركزي</h3>
      <form onSubmit={addProduct}>
        <div style={line}>
          <label style={{flex:"1 1 170px"}}>التصنيف<select style={input} required value={category} onChange={e=>setCategory(e.target.value)}><option value="">اختر تصنيفاً</option>{cats.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
          <label style={{flex:"1 1 170px"}}>الاسم بالعربية<input style={input} required maxLength={120} value={nameAr} onChange={e=>setNameAr(e.target.value)}/></label>
          <label style={{flex:"1 1 170px"}}>English product name (optional)<input style={input} maxLength={120} value={nameEn} onChange={e=>setNameEn(e.target.value)}/></label>
          <label style={{flex:"1 1 170px"}}>Türkçe ürün adı<input style={input} required maxLength={120} value={nameTr} onChange={e=>setNameTr(e.target.value)}/></label>
          <label style={{flex:"1 1 120px"}}>السعر ({currency})<input style={input} type="number" required min="0" step={factor===100?"0.01":"1"} value={price} onChange={e=>setPrice(e.target.value)}/></label>
        </div>
        <div style={line}>
          <label style={{flex:"1 1 190px"}}>وصف المنتج بالعربية<textarea style={input} maxLength={1000} value={descAr} onChange={e=>setDescAr(e.target.value)}/></label>
          <label style={{flex:"1 1 190px"}}>English description (optional)<textarea style={input} maxLength={1000} value={descEn} onChange={e=>setDescEn(e.target.value)}/></label>
          <label style={{flex:"1 1 190px"}}>Türkçe açıklama<textarea style={input} maxLength={1000} value={descTr} onChange={e=>setDescTr(e.target.value)}/></label>
          <label style={{flex:"1 1 190px"}}>رابط صورة HTTPS (اختياري)<input type="url" style={input} maxLength={2048} value={imageUrl} onChange={e=>setImageUrl(e.target.value)}/></label>
        </div>
        <button style={button} disabled={busy||!cats.length}>إنشاء المنتج</button>
      </form>
    </section>
    <section style={section}>
      <h3>3. نشر المنتجات على الفروع</h3>
      {products.length===0?<p>لم تُنشأ منتجات مركزية بعد.</p>:products.map(prod=><article key={prod.id} style={{padding:"14px 0",borderTop:"1px solid #e3eded"}}>
        <strong>{prod.name_ar}</strong> · <span>{prod.name_tr}</span> · <span>{(Number(prod.price_minor)/factor).toFixed(factor===100?2:0)} {currency}</span>
        <CentralPriceEditor label="السعر المركزي للمنتج" baseMinor={Number(prod.price_minor)} factor={factor} currency={currency} busy={busy}
          onBasePrice={async minor=>save(async()=>browserSupabase().from("catalog_products").update({price_minor:minor}).eq("id",prod.id).eq("business_id",businessId).select("id").single(),"تم تحديث السعر المركزي",true)}
          onOverride={async()=>false} onAvailability={async()=>false}
        />
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
          {branches.map(branch=>{const publication=pubs.find(p=>p.branch_id===branch.id&&p.product_id===prod.id);
            return <div key={branch.id} style={{padding:10,border:"1px solid #d6e3e3",borderRadius:10,flex:"1 1 220px"}}>
              <button type="button" disabled={busy} onClick={()=>toggleProduct(branch.id,prod.id,publication)}
                aria-pressed={Boolean(publication?.active)} style={{...button,background:publication?.active?"#146b55":"#64748b",fontSize:12}}>
                {branch.name} · {publication?.active?"منشور ✓":"غير منشور"}
              </button>
              {publication?.active?<CentralPriceEditor key={publication.id} label={branch.name} baseMinor={Number(prod.price_minor)} factor={factor} currency={currency} publication={publication} busy={busy} showBase={false}
                onBasePrice={async minor=>save(async()=>browserSupabase().from("catalog_products").update({price_minor:minor}).eq("id",prod.id).eq("business_id",businessId).select("id").single(),"تم تحديث السعر المركزي",true)}
                onOverride={async minor=>save(async()=>browserSupabase().from("catalog_branch_publications").update({price_override_minor:minor}).eq("id",publication.id).eq("business_id",businessId).select("id").single(),"تم تحديث سعر الفرع",true)}
                onAvailability={async()=>save(async()=>browserSupabase().from("catalog_branch_publications").update({available:!publication.available}).eq("id",publication.id).eq("business_id",businessId).select("id").single(),"تم تحديث توفر الفرع",true)}
              />:null}
            </div>;
          })}
        </div>
      </article>)}
    </section>
    <ProductOptionsManager businessId={businessId} country={country} products={products.map(p=>({id:p.id,name_ar:p.name_ar}))}/>
  </section>;
}
