"use client";
import {useState,type FormEvent,type CSSProperties} from "react";
const input:CSSProperties={width:"100%",boxSizing:"border-box",padding:8,border:"1px solid #b8c9cb",borderRadius:7,font:"inherit"};
const group:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,margin:"12px 0"};
const button:CSSProperties={border:"1px solid #bdd4d4",borderRadius:8,padding:"8px 14px",background:"#fff",cursor:"pointer"};
type Category={id:string;name_ar:string;name_tr:string;sort_order:number};
type Product={id:string;category_id:string;name_ar:string;name_tr:string;description_ar:string;description_tr:string;price_minor:number;image_url:string|null};
type Table={id:string;label:string};
export function EditCategory({value,busy,save}:{value:Category;busy:boolean;save:(data:Record<string,string|number>)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[ar,setAr]=useState(value.name_ar),[tr,setTr]=useState(value.name_tr),[order,setOrder]=useState(String(value.sort_order));
 async function submit(e:FormEvent){e.preventDefault();if(await save({name_ar:ar.trim(),name_tr:tr.trim(),sort_order:Number(order)}))setOpen(false);}
 return <div>{!open?<button type="button" style={button} onClick={()=>setOpen(true)}>تعديل</button>:
 <form onSubmit={submit} style={group}>
  <label>عربي<input style={input} required maxLength={100} value={ar} onChange={e=>setAr(e.target.value)}/></label>
  <label>Türkçe<input style={input} required maxLength={100} value={tr} onChange={e=>setTr(e.target.value)}/></label>
  <label>الترتيب<input style={input} type="number" step="1" value={order} onChange={e=>setOrder(e.target.value)}/></label>
  <button disabled={busy} style={button}>حفظ</button><button type="button" style={button} onClick={()=>setOpen(false)}>إلغاء</button>
 </form>}</div>;
}
export function EditProduct({value,categories,factor,busy,save}:{value:Product;categories:Category[];factor:number;busy:boolean;save:(data:Record<string,string|number|null>)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[ar,setAr]=useState(value.name_ar),[tr,setTr]=useState(value.name_tr),
 [descAr,setDescAr]=useState(value.description_ar),[descTr,setDescTr]=useState(value.description_tr),
 [photo,setPhoto]=useState(value.image_url??""),[price,setPrice]=useState(String(Number(value.price_minor)/factor)),[category,setCategory]=useState(value.category_id),
 [validation,setValidation]=useState("");
 async function submit(e:FormEvent){e.preventDefault();setValidation("");
  const n=Number(price),minor=Math.round(n*factor);
  if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(minor)||minor>100000000000){setValidation("السعر غير صالح");return;}
  if(photo.trim()&&!/^https:\/\/[^\s]+$/.test(photo.trim())){setValidation("رابط الصورة يجب أن يبدأ https://");return;}
  if(!categories.some(c=>c.id===category)){setValidation("التصنيف غير صالح");return;}
  const didSave=await save({name_ar:ar.trim(),name_tr:tr.trim(),description_ar:descAr.trim(),description_tr:descTr.trim(),
   category_id:category,price_minor:minor,image_url:photo.trim()||null});
  if(didSave)setOpen(false);
 }
 return <div>{!open?<button type="button" style={button} onClick={()=>setOpen(true)}>تعديل التفاصيل والسعر</button>:
 <form onSubmit={submit} style={{...group,flexBasis:"100%"}}>
  <label>الاسم بالعربية<input style={input} required maxLength={120} value={ar} onChange={e=>setAr(e.target.value)}/></label>
  <label>Türkçe ad<input style={input} required maxLength={120} value={tr} onChange={e=>setTr(e.target.value)}/></label>
  <label>التصنيف<select style={input} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
  <label>السعر<input style={input} type="number" min="0" step={factor===100?"0.01":"1"} required value={price} onChange={e=>setPrice(e.target.value)}/></label>
  <label>الوصف العربي<textarea style={input} maxLength={1000} value={descAr} onChange={e=>setDescAr(e.target.value)}/></label>
  <label>Türkçe açıklama<textarea style={input} maxLength={1000} value={descTr} onChange={e=>setDescTr(e.target.value)}/></label>
  <label>صورة HTTPS<input style={input} type="url" maxLength={2048} value={photo} onChange={e=>setPhoto(e.target.value)}/></label>
  {validation?<span role="alert" style={{color:"crimson"}}>{validation}</span>:null}
  <button disabled={busy} style={button}>حفظ التعديلات</button><button type="button" style={button} onClick={()=>setOpen(false)}>إلغاء</button>
 </form>}</div>;
}
export function EditTable({value,busy,save}:{value:Table;busy:boolean;save:(label:string)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[label,setLabel]=useState(value.label);
 async function submit(e:FormEvent){e.preventDefault();if(await save(label.trim()))setOpen(false);}
 return <div>{!open?<button type="button" style={button} onClick={()=>setOpen(true)}>تغيير الاسم</button>:
 <form onSubmit={submit} style={{display:"flex",gap:8}}><input style={input} required maxLength={50} value={label} onChange={e=>setLabel(e.target.value)}/><button disabled={busy} style={button}>حفظ</button><button type="button" style={button} onClick={()=>setOpen(false)}>إلغاء</button></form>}</div>;
}
