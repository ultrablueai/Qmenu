"use client";
import {useState,type CSSProperties} from "react";
import {createClient} from "@supabase/supabase-js";
import {formatPrice} from "../lib/g2-public";

type Ingredient={name_ar:string;name_tr:string;is_optional:boolean};
type Option={id:string;name_ar:string;name_tr:string;price_delta_minor:number};
type Group={id:string;name_ar:string;name_tr:string;min_select:number;max_select:number;options:Option[]};
type Details={id:string;name_ar:string;name_tr:string;description_ar:string;description_tr:string;price_minor:number;ingredients:Ingredient[];groups:Group[]};
type Props={branchId:string;productId:string;country:string;lang:"ar"|"tr"};
const panel:CSSProperties={padding:14,marginTop:12,border:"1px solid #d6e6e6",borderRadius:12,background:"#f6faf9"};
function publicClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error("Public configuration unavailable");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export default function ProductDetails({branchId,productId,country,lang}:Props){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[details,setDetails]=useState<Details|null>(null);
 const [selection,setSelection]=useState<Record<string,string[]>>({});
 const [removed,setRemoved]=useState<string[]>([]);
 const tr=lang==="tr";
 async function toggleDetails(){
  if(open){setOpen(false);return;}
  setOpen(true);if(details)return;
  setLoading(true);setError("");
  try{
   const {data,error}=await publicClient().rpc("public_catalog_product_details",{p_branch:branchId,p_product:productId});
   if(error)throw Error("details unavailable");
   if(!data){setError(tr?"Bu ürünün ek seçenekleri şu an mevcut değil.":"لا توجد تفاصيل إضافية منشورة لهذا المنتج.");return;}
   setDetails(data as Details);
  }catch{setError(tr?"Ürün detayları yüklenemedi.":"تعذر تحميل تفاصيل المنتج.");}
  finally{setLoading(false);}
 }
 function choose(g:Group,o:Option){
  const current=selection[g.id]??[];
  const next=current.includes(o.id)?current.filter(x=>x!==o.id):g.max_select===1?[o.id]:current.length<g.max_select?[...current,o.id]:current;
  setSelection(prev=>({...prev,[g.id]:next}));
 }
 function toggleRemoval(name:string){setRemoved(prev=>prev.includes(name)?prev.filter(x=>x!==name):[...prev,name]);}
 const extra=details?.groups.reduce((sum,g)=>sum+g.options.filter(o=>(selection[g.id]??[]).includes(o.id)).reduce((sub,o)=>sub+Number(o.price_delta_minor),0),0)??0;
 const valid=details?.groups.every(g=>(selection[g.id]??[]).length>=g.min_select)??false;
 return <div style={{marginTop:10}}>
  <button type="button" aria-expanded={open} onClick={toggleDetails} style={{padding:"8px 12px",color:"#086c66",border:"1px solid #badad6",borderRadius:10,background:"#f2faf8",cursor:"pointer"}}>
   {tr?"İçindekiler ve seçenekler":"المكونات والإضافات"} {open?"−":"+"}
  </button>
  {open?<div style={panel} aria-live="polite">
   {loading?<p>{tr?"Yükleniyor…":"جارٍ تحميل التفاصيل…"}</p>:null}
   {error?<p role="status" style={{color:"#885d36"}}>{error}</p>:null}
   {details?<div>
    <h5 style={{fontSize:16,margin:"5px 0"}}>{tr?"Ürün detayları":"تفاصيل المنتج"}</h5>
    {(tr?details.description_tr:details.description_ar)?<p style={{color:"#4c6769",fontSize:13}}>{tr?details.description_tr:details.description_ar}</p>:null}
    {details.ingredients.length>0?<fieldset style={{border:"1px solid #dbe9e5",borderRadius:10,margin:"12px 0",padding:12}}>
     <legend>{tr?"İçindekiler":"المكونات"}</legend>
     {details.ingredients.map((i,k)=><label key={k} style={{display:"block",padding:5,fontSize:13}}>
      {i.is_optional?<><input type="checkbox" checked={!removed.includes(i.name_ar)} onChange={()=>toggleRemoval(i.name_ar)}/> {tr?i.name_tr:i.name_ar} ({tr?"çıkarılabilir":"يمكن إزالته"})</>:
       <><span>• {tr?i.name_tr:i.name_ar}</span></>}
     </label>)}
    </fieldset>:null}
    {details.groups.map(g=><fieldset key={g.id} style={{border:"1px solid #dbe9e5",borderRadius:10,padding:12,margin:"12px 0"}}>
     <legend><strong>{tr?g.name_tr:g.name_ar}</strong></legend>
     <p style={{fontSize:12,color:"#667d80"}}>{tr?"Seçim":"الاختيارات"}: {g.min_select}–{g.max_select}{g.min_select>0?(tr?" · Zorunlu":" · مطلوب"):""}</p>
     {g.options.map(o=>{
      const checked=(selection[g.id]??[]).includes(o.id);
      const disabled=!checked&&g.max_select!==1&&(selection[g.id]??[]).length>=g.max_select;
      return <label key={o.id} style={{display:"flex",gap:8,alignItems:"center",padding:7,opacity:disabled?0.55:1}}>
       <input type={g.max_select===1?"radio":"checkbox"} name={g.id} checked={checked} disabled={disabled} onChange={()=>choose(g,o)}/>
       <span style={{flex:1}}>{tr?o.name_tr:o.name_ar}</span>
       <span style={{fontSize:12}}>{Number(o.price_delta_minor)>0?"+"+formatPrice(Number(o.price_delta_minor),country,lang):(tr?"Ücretsiz":"مجاني")}</span>
      </label>;
     })}
    </fieldset>)}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,paddingTop:12,borderTop:"1px solid #cddfdd"}}>
      <strong>{tr?"Önizleme toplamı":"المجموع التقديري"}</strong>
      <strong>{formatPrice(Number(details.price_minor)+extra,country,lang)}</strong>
    </div>
    {!valid?<p style={{fontSize:12,color:"#99651c"}}>{tr?"Lütfen zorunlu seçenekleri seçin.":"يرجى إكمال الاختيارات المطلوبة."}</p>:null}
    <p style={{fontSize:12,color:"#667d80",marginBottom:0}}>{tr?"Bu sadece bir önizlemedir. Sipariş ve ödeme henüz etkin değil.":"هذه معاينة فقط. الطلب والدفع غير مفعّلين بعد، والسعر يُعاد احتسابه على الخادم عند تفعيل الطلبات."}</p>
   </div>:null}
  </div>:null}
 </div>;
}
