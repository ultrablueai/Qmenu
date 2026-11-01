"use client";
import {useEffect,useState,type FormEvent,type CSSProperties} from "react";
import {EditCategory,EditProduct,EditTable} from "./edit-row";
import {browserSupabase} from "../../../../lib/supabase/browser";

type Category={id:string;name_ar:string;name_tr:string;active:boolean;sort_order:number};
type Product={id:string;category_id:string;name_ar:string;name_tr:string;description_ar:string;description_tr:string;price_minor:number;image_url:string|null;active:boolean;available:boolean};
type Table={id:string;label:string;qr_token:string;active:boolean};

const panel:CSSProperties={background:"#fff",border:"1px solid #dfe9eb",borderRadius:16,padding:20,marginTop:22};
const field:CSSProperties={padding:10,border:"1px solid #cbd9dd",borderRadius:9,width:"100%",boxSizing:"border-box",font:"inherit"};
const btn:CSSProperties={border:0,borderRadius:9,padding:"10px 15px",background:"#176d70",color:"#fff",fontWeight:700,cursor:"pointer"};
const line:CSSProperties={display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:12};
const label:CSSProperties={display:"grid",gap:5,flex:"1 1 160px",fontSize:13};
function priceString(minor:number,factor:number){return (minor/factor).toFixed(factor===100?2:0);}
export default function MenuManager({businessId,branchId,country}: {businessId:string;branchId:string;country:string}) {
  const [cats,setCats]=useState<Category[]>([]),[items,setItems]=useState<Product[]>([]),[tables,setTables]=useState<Table[]>([]);
  const [categoryAr,setCategoryAr]=useState(""),[categoryTr,setCategoryTr]=useState("");
  const [itemAr,setItemAr]=useState(""),[itemTr,setItemTr]=useState(""),[descriptionAr,setDescriptionAr]=useState(""),[descriptionTr,setDescriptionTr]=useState("");
  const [categoryId,setCategoryId]=useState(""),[price,setPrice]=useState(""),[photo,setPhoto]=useState(""),[tableLabel,setTableLabel]=useState("");
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [origin,setOrigin]=useState("");
  const factor=country==="TR"?100:1,unit=country==="TR"?"TRY":"SYP";
  async function refresh(){
    const db=browserSupabase();
    const [a,b,c]=await Promise.all([
      db.from("menu_categories").select("id,name_ar,name_tr,active,sort_order").eq("branch_id",branchId).order("sort_order"),
      db.from("menu_items").select("id,category_id,name_ar,name_tr,description_ar,description_tr,price_minor,image_url,active,available").eq("branch_id",branchId),
      db.from("dining_tables").select("id,label,qr_token,active").eq("branch_id",branchId).order("label")
    ]);
    if(a.error||b.error||c.error)throw new Error("تعذّر تحميل بيانات G2. تأكد من صلاحياتك وأعد المحاولة.");
    setCats(a.data??[]);setItems(b.data??[]);setTables(c.data??[]);
  }
  useEffect(()=>{setOrigin(window.location.origin);},[]);
  useEffect(()=>{let alive=true;setLoading(true);refresh().catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false};},[branchId]);
  async function run(action:()=>Promise<{error: {message:string}|null}>,message:string){
    if(busy)return false;setBusy(true);setError("");setNotice("");
    try{const result=await action();if(result.error)throw new Error(result.error.message);await refresh();setNotice(message);return true;}
    catch(e){setError(e instanceof Error?e.message:"تعذّر حفظ التعديل");return false;}
    finally{setBusy(false);}
  }
  async function addCategory(e:FormEvent){e.preventDefault();const ar=categoryAr.trim(),tr=categoryTr.trim();if(!ar||!tr)return;
    await run(async()=>browserSupabase().from("menu_categories").insert({business_id:businessId,branch_id:branchId,name_ar:ar,name_tr:tr}),"تمت إضافة التصنيف");
    setCategoryAr("");setCategoryTr("");
  }
  async function addItem(e:FormEvent){e.preventDefault();
    const n=Number(price);const minor=Math.round(n*factor);if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(minor)||minor>100000000000){setError("السعر غير صالح");return;}
    if(!cats.some(c=>c.id===categoryId)){setError("اختر تصنيفاً");return;}
    if(photo.trim()&&!/^https:\/\/[^\s]+$/.test(photo.trim())){setError("رابط الصورة يجب أن يبدأ بـ https://");return;}
    await run(async()=>browserSupabase().from("menu_items").insert({business_id:businessId,branch_id:branchId,category_id:categoryId,
      name_ar:itemAr.trim(),name_tr:itemTr.trim(),description_ar:descriptionAr.trim(),description_tr:descriptionTr.trim(),
      price_minor:minor,image_url:photo.trim()||null}),"تمت إضافة المنتج");
    setItemAr("");setItemTr("");setPrice("");setPhoto("");setDescriptionAr("");setDescriptionTr("");
  }
  async function addTable(e:FormEvent){e.preventDefault();const label=tableLabel.trim();if(!label)return;
    await run(async()=>browserSupabase().from("dining_tables").insert({business_id:businessId,branch_id:branchId,label}),"تم إنشاء الطاولة ورمزها");
    setTableLabel("");
  }
  function qr(link:string){return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data="+encodeURIComponent(link);}
  const branchUrl=origin+`/b/${branchId}`;
  if(loading)return <section style={panel} aria-live="polite">جارٍ تحميل إعدادات المنيو والطاولات...</section>;
  return <section dir="rtl" lang="ar" aria-label="إدارة المنيو والطاولات" style={{marginTop:24}}>
    <h2 style={{fontSize:24}}>المنيو الرقمي ورموز QR</h2>
    <p style={{color:"#546d74",fontSize:13}}>كل الإعدادات لهذا الفرع فقط. الزبون يشاهد التصنيفات والمنتجات النشطة والمتاحة، بدون حساب.</p>
    {error?<p role="alert" style={{color:"#a32323",background:"#fff0f0",padding:12}}>{error}</p>:null}
    {notice?<p role="status" style={{color:"#086f54",background:"#eaf9f1",padding:12}}>{notice}</p>:null}
    <div style={panel}>
      <h3>رمز QR الفرع</h3>
      <p style={{fontSize:13}}>هذا رمز عام للقائمة ولا يمنح صلاحية إدارة. يمكن للزبون مسحه مباشرة.</p>
      {origin?<img src={qr(branchUrl)} alt="QR رابط قائمة الفرع" width={180} height={180} loading="lazy"/>:<p>جارٍ تجهيز رمز QR...</p>}
      <p><a href={branchUrl} target="_blank" rel="noopener noreferrer">معاينة قائمة الفرع</a></p>
      <small style={{color:"#698087"}}>يُولّد الرسم عبر خدمة QR خارجية باستخدام الرابط العام فقط؛ لا تُرسل بيانات حسابك.</small>
    </div>
    <div style={panel}>
      <h3>التصنيفات</h3>
      <form onSubmit={addCategory}>
        <div style={line}>
          <label style={label}>اسم التصنيف بالعربية<input style={field} required maxLength={100} value={categoryAr} onChange={e=>setCategoryAr(e.target.value)}/></label>
          <label style={label}>Türkçe kategori adı<input style={field} required maxLength={100} value={categoryTr} onChange={e=>setCategoryTr(e.target.value)}/></label>
        </div>
        <button disabled={busy} style={btn}>إضافة تصنيف</button>
      </form>
      {cats.map(c=><div key={c.id} style={{...line,borderTop:"1px solid #eef1f2",marginTop:14,paddingTop:12}}>
        <span style={{flex:1}}><strong>{c.name_ar}</strong><small style={{display:"block"}}>{c.name_tr}</small></span>
        <EditCategory value={c} busy={busy} save={async patch=>{return await run(async()=>browserSupabase().from("menu_categories").update(patch).eq("id",c.id).eq("branch_id",branchId).select("id").single(),"تم تعديل التصنيف");}}/>
        <button disabled={busy} type="button" onClick={()=>run(async()=>browserSupabase().from("menu_categories").update({active:!c.active}).eq("id",c.id).eq("branch_id",branchId).select("id").single(),"تم تغيير حالة التصنيف")} style={{...btn,background:c.active?"#805d2c":"#167c5a"}}>{c.active?"إخفاء":"نشر"}</button>
      </div>)}
    </div>
    <div style={panel}>
      <h3>المنتجات والخدمات</h3>
      <form onSubmit={addItem}>
        <div style={line}>
          <label style={label}>التصنيف<select required style={field} value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">اختر تصنيفاً</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
          <label style={label}>الاسم بالعربية<input required style={field} maxLength={120} value={itemAr} onChange={e=>setItemAr(e.target.value)}/></label>
          <label style={label}>Türkçe ürün adı<input required style={field} maxLength={120} value={itemTr} onChange={e=>setItemTr(e.target.value)}/></label>
        </div>
        <div style={line}>
          <label style={label}>وصف عربي<textarea style={field} maxLength={1000} value={descriptionAr} onChange={e=>setDescriptionAr(e.target.value)}/></label>
          <label style={label}>Türkçe açıklama<textarea style={field} maxLength={1000} value={descriptionTr} onChange={e=>setDescriptionTr(e.target.value)}/></label>
        </div>
        <div style={line}>
          <label style={label}>السعر ({unit})<input type="number" min="0" step={factor===100?"0.01":"1"} required style={field} value={price} onChange={e=>setPrice(e.target.value)}/></label>
          <label style={label}>رابط صورة HTTPS (اختياري)<input type="url" style={field} maxLength={2048} value={photo} onChange={e=>setPhoto(e.target.value)}/></label>
        </div>
        <button disabled={busy||cats.length===0} style={btn}>إضافة منتج</button>
      </form>
      {items.map(i=><div key={i.id} style={{...line,borderTop:"1px solid #eef1f2",paddingTop:12,marginTop:12}}>
        <span style={{flex:1}}><strong>{i.name_ar}</strong><small style={{display:"block"}}>{i.name_tr} · {priceString(Number(i.price_minor),factor)} {unit}</small></span>
        <EditProduct value={i} categories={cats} factor={factor} busy={busy} save={async patch=>{return await run(async()=>browserSupabase().from("menu_items").update(patch).eq("id",i.id).eq("branch_id",branchId).select("id").single(),"تم تعديل المنتج");}}/>
        <button disabled={busy} type="button" style={{...btn,background:"#805d2c"}} onClick={()=>run(async()=>browserSupabase().from("menu_items").update({active:!i.active}).eq("id",i.id).eq("branch_id",branchId).select("id").single(),"تم تحديث النشر")}>{i.active?"إخفاء":"نشر"}</button>
        <button disabled={busy} type="button" style={{...btn,background:i.available?"#935624":"#167c5a"}} onClick={()=>run(async()=>browserSupabase().from("menu_items").update({available:!i.available}).eq("id",i.id).eq("branch_id",branchId).select("id").single(),"تم تحديث التوفر")}>{i.available?"نفد":"متاح"}</button>
      </div>)}
    </div>
    <div style={panel}>
      <h3>طاولات الفرع</h3>
      <p style={{fontSize:13,color:"#546d74"}}>لكل طاولة QR فريد. عند تدوير رمزها يتوقف الرابط السابق عن العمل فوراً. QR لا يثبت وجود الزبون داخل المحل.</p>
      <form onSubmit={addTable} style={line}>
        <label style={label}>رقم أو اسم الطاولة<input style={field} maxLength={50} required value={tableLabel} onChange={e=>setTableLabel(e.target.value)}/></label>
        <button disabled={busy} style={btn}>إنشاء طاولة</button>
      </form>
      {tables.map(t=>{const url=origin+`/t/${t.qr_token}`;return <div key={t.id} style={{...line,borderTop:"1px solid #eef1f2",paddingTop:14,marginTop:12}}>
        <div style={{flex:1,minWidth:160}}>
          <strong>طاولة {t.label}</strong><p style={{fontSize:12}}>{t.active?"مفعّلة":"معطّلة"}</p>
          {t.active?<a href={url} target="_blank" rel="noopener noreferrer">فتح صفحة الطاولة</a>:null}
        </div>
        {t.active&&origin?<img src={qr(url)} width={125} height={125} loading="lazy" alt={`QR طاولة ${t.label}`}/>:null}
        <EditTable value={t} busy={busy} save={async label=>{return await run(async()=>browserSupabase().from("dining_tables").update({label}).eq("id",t.id).eq("branch_id",branchId).select("id").single(),"تم تعديل اسم الطاولة");}}/>
        <button disabled={busy} type="button" style={btn} onClick={()=>run(async()=>browserSupabase().from("dining_tables").update({qr_token:crypto.randomUUID()}).eq("id",t.id).eq("branch_id",branchId).select("id").single(),"تم إلغاء الرمز القديم وإنشاء رمز جديد")}>تدوير QR</button>
        <button disabled={busy} type="button" style={{...btn,background:t.active?"#935624":"#167c5a"}} onClick={()=>run(async()=>browserSupabase().from("dining_tables").update({active:!t.active}).eq("id",t.id).eq("branch_id",branchId).select("id").single(),"تم تحديث حالة الطاولة")}>{t.active?"تعطيل":"تفعيل"}</button>
      </div>})}
    </div>
    <div style={panel}>
      <h3>طباعة رموز QR</h3>
      <p style={{fontSize:13}}>جهّز ورقة A4 لرمز الفرع وكل الطاولات المفعّلة، واحفظها PDF من نافذة الطباعة عند الحاجة.</p>
      <button type="button" disabled={!origin} style={btn} onClick={()=>window.print()}>طباعة / حفظ PDF للرموز</button>
    </div>
    <style>{`@media print {
      @page { size: A4; margin: 12mm; }
      body * { visibility: hidden !important; }
      #beger-print-sheet, #beger-print-sheet * { visibility: visible !important; }
      #beger-print-sheet { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: #fff; color: #111; }
      #beger-print-sheet .beger-qr-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 15mm; }
      #beger-print-sheet .beger-qr-tile { break-inside: avoid; text-align:center; border:1px solid #ddd; padding:12mm; }
    }`}</style>
    <section id="beger-print-sheet" style={{display:"none"}} aria-label="بطاقات QR للطباعة">
      <h1 style={{textAlign:"center",fontSize:26}}>Beger · QR</h1>
      <div className="beger-qr-grid">
        {origin?<div className="beger-qr-tile"><h2>رمز الفرع</h2><img src={qr(branchUrl)} alt="رمز الفرع" width={190} height={190}/><p>قائمة الفرع</p></div>:null}
        {origin&&tables.filter(t=>t.active).map(t=><div key={t.id} className="beger-qr-tile">
          <h2>طاولة {t.label}</h2><img src={qr(origin+`/t/${t.qr_token}`)} alt={`QR طاولة ${t.label}`} width={190} height={190}/>
          <p>امسح الرمز لعرض القائمة</p>
        </div>)}
      </div>
    </section>
  </section>;
}
