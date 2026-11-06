"use client";
import {useState,type FormEvent} from "react";

export type CentralEditableProduct={
 id:string;category_id:string;name_ar:string;name_tr:string;name_en:string|null;
 description_ar:string;description_tr:string;description_en:string;
 image_url:string|null;active:boolean;
};
type CategoryOption={id:string;name_ar:string};
type Props={product:CentralEditableProduct;categories:CategoryOption[];busy:boolean;onSave:(data:Record<string,string|boolean|null>)=>Promise<boolean>};
const input={display:"block" as const,width:"100%",maxWidth:400,padding:9,border:"1px solid #bdcfcf",borderRadius:8,boxSizing:"border-box" as const};
export default function EditCentralProduct({product,categories,busy,onSave}:Props){
 const [open,setOpen]=useState(false),[ar,setAr]=useState(product.name_ar),[tr,setTr]=useState(product.name_tr),[en,setEn]=useState(product.name_en??"");
 const [descAr,setDescAr]=useState(product.description_ar),[descTr,setDescTr]=useState(product.description_tr),[descEn,setDescEn]=useState(product.description_en);
 const [image,setImage]=useState(product.image_url??""),[category,setCategory]=useState(product.category_id),[active,setActive]=useState(product.active),[error,setError]=useState("");
 async function submit(e:FormEvent){e.preventDefault();setError("");
  if(!ar.trim()||!tr.trim()||!categories.some(c=>c.id===category)){setError("أكمل الاسم والتصنيف الصحيح.");return;}
  if(image.trim()&&!/^https:\/\/[^\s]+$/.test(image.trim())){setError("رابط الصورة يجب أن يبدأ https://");return;}
  const ok=await onSave({category_id:category,name_ar:ar.trim(),name_tr:tr.trim(),name_en:en.trim()||null,
    description_ar:descAr.trim(),description_tr:descTr.trim(),description_en:descEn.trim(),
    image_url:image.trim()||null,active});
  if(ok)setOpen(false);
 }
 return <div dir="rtl" style={{margin:"12px 0"}}>
  {!open?<button type="button" onClick={()=>setOpen(true)} style={{padding:"8px 12px",border:"1px solid #a6c8c2",borderRadius:8,background:"#eef8f6",cursor:"pointer"}}>تعديل تفاصيل المنتج والترجمات</button>:
   <form onSubmit={submit} style={{display:"grid",gap:10,padding:15,border:"1px solid #c9ddda",borderRadius:12}}>
    <h4 style={{margin:0}}>تعديل المنتج المركزي</h4>
    <label>التصنيف<select style={input} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
    <label>الاسم بالعربية<input style={input} required maxLength={120} value={ar} onChange={e=>setAr(e.target.value)}/></label>
    <label>Türkçe ürün adı<input style={input} required maxLength={120} value={tr} onChange={e=>setTr(e.target.value)}/></label>
    <label>English product name<input style={input} maxLength={120} value={en} onChange={e=>setEn(e.target.value)}/></label>
    <label>وصف عربي<textarea style={input} maxLength={1000} value={descAr} onChange={e=>setDescAr(e.target.value)}/></label>
    <label>Türkçe açıklama<textarea style={input} maxLength={1000} value={descTr} onChange={e=>setDescTr(e.target.value)}/></label>
    <label>English description<textarea style={input} maxLength={1000} value={descEn} onChange={e=>setDescEn(e.target.value)}/></label>
    <label>رابط صورة HTTPS<input style={input} type="url" maxLength={2048} value={image} onChange={e=>setImage(e.target.value)}/></label>
    <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> المنتج متاح للنشر في المتجر (عند إلغائه يختفي من جميع الفروع)</label>
    {error?<p role="alert" style={{color:"#ba2929"}}>{error}</p>:null}
    <div style={{display:"flex",gap:8}}>
     <button disabled={busy} type="submit">حفظ التغييرات</button>
     <button type="button" onClick={()=>setOpen(false)}>إلغاء</button>
    </div>
   </form>}
 </div>;
}
