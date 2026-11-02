"use client";
import {useState,type FormEvent} from "react";
type Cat={id:string;name_ar:string;name_tr:string;name_en:string|null;active:boolean};
export default function EditCentralCategory({category,busy,onSave}:{category:Cat;busy:boolean;onSave:(patch:{name_ar:string;name_tr:string;name_en:string|null;active:boolean})=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[ar,setAr]=useState(category.name_ar),[tr,setTr]=useState(category.name_tr),
 [en,setEn]=useState(category.name_en??""),[active,setActive]=useState(category.active);
 async function submit(e:FormEvent){e.preventDefault();if(!ar.trim()||!tr.trim())return;
  if(await onSave({name_ar:ar.trim(),name_tr:tr.trim(),name_en:en.trim()||null,active}))setOpen(false);
 }
 const input={padding:7,marginTop:5,borderRadius:7,border:"1px solid #bed3d1",width:"100%"} as const;
 return <div style={{flexBasis:"100%"}}>
 {!open?<button type="button" onClick={()=>setOpen(true)} style={{padding:"7px 12px",border:"1px solid #b9d3d0",borderRadius:8}}>تعديل التصنيف</button>:
  <form onSubmit={submit} style={{display:"grid",gap:8,padding:12,border:"1px solid #cee0df",borderRadius:9}}>
   <label>عربي<input style={input} required maxLength={100} value={ar} onChange={e=>setAr(e.target.value)}/></label>
   <label>Türkçe<input style={input} required maxLength={100} value={tr} onChange={e=>setTr(e.target.value)}/></label>
   <label>English<input style={input} maxLength={100} value={en} onChange={e=>setEn(e.target.value)}/></label>
   <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> التصنيف ظاهر للزبائن</label>
   <div><button disabled={busy}>حفظ</button> <button type="button" onClick={()=>setOpen(false)}>إلغاء</button></div>
  </form>}
 </div>;
}
