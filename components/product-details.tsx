"use client";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {createClient} from "@supabase/supabase-js";
import {formatPrice,type GuestLang} from "../lib/g2-public";
import {useGuestCart} from "./guest-cart";
import GuestRatingPreview from "./guest-rating-preview";

type Ingredient={name_ar:string;name_tr:string;name_en?:string;is_optional:boolean};
type Option={id:string;name_ar:string;name_tr:string;name_en?:string;price_delta_minor:number};
type Group={id:string;name_ar:string;name_tr:string;name_en?:string;min_select:number;max_select:number;options:Option[]};
type Details={id:string;name_ar:string;name_tr:string;name_en?:string;description_ar:string;description_tr:string;description_en?:string;price_minor:number;ingredients:Ingredient[];groups:Group[]};
type Props={branchId:string;productId:string;country:string;lang:GuestLang;accent?:string;dark?:boolean;imageUrl?:string|null;tableOrdering?:boolean};
const panel:CSSProperties={padding:18,marginTop:12,border:"1px solid #DCE9E1",borderRadius:20,background:"#FAFCFA",boxShadow:"0 9px 28px rgba(29,65,44,.045)"};
const sectionCard:CSSProperties={border:"1px solid #E1EBE3",borderRadius:16,margin:"14px 0",padding:14,background:"#FFFFFF",minWidth:0};
function publicClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error("Public configuration unavailable");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export default function ProductDetails({branchId,productId,country,lang,accent="#086c66",dark=false,imageUrl,tableOrdering=false}:Props){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[details,setDetails]=useState<Details|null>(null);
 const [selection,setSelection]=useState<Record<string,string[]>>({});
 const [removed,setRemoved]=useState<string[]>([]);
 const tr=lang==="tr",en=lang==="en";
 const cart=useGuestCart();
 const [added,setAdded]=useState("");
 const [quantity,setQuantity]=useState(1);
 const closeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
  document.addEventListener("keydown",onEscape);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",onEscape);};
 },[open]);
 const title=(v:{name_ar:string;name_tr:string;name_en?:string})=>(en?v.name_en:tr?v.name_tr:v.name_ar)||v.name_ar;
 async function toggleDetails(){
  if(open){setOpen(false);return;}
  setOpen(true);if(details)return;
  setLoading(true);setError("");
  try{
   const {data,error}=await publicClient().rpc("public_catalog_product_details",{p_branch:branchId,p_product:productId});
   if(error)throw Error("details unavailable");
   if(!data){setError(en?"Additional options are not available for this product.":tr?"Bu ürünün ek seçenekleri şu an mevcut değil.":"لا توجد تفاصيل إضافية منشورة لهذا المنتج.");return;}
   setDetails(data as Details);
  }catch{setError(en?"Could not load product details.":tr?"Ürün detayları yüklenemedi.":"تعذر تحميل تفاصيل المنتج.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  const requested=new URLSearchParams(window.location.search).get("product");
  if(requested===productId){void toggleDetails();}
  // A product QR opens its detail on first mount, never bypasses public catalog publication.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[branchId,productId]);
 function choose(g:Group,o:Option){
  const current=selection[g.id]??[];
  const next=current.includes(o.id)?current.filter(x=>x!==o.id):g.max_select===1?[o.id]:current.length<g.max_select?[...current,o.id]:current;
  setSelection(prev=>({...prev,[g.id]:next}));
 }
 function toggleRemoval(name:string){setRemoved(prev=>prev.includes(name)?prev.filter(x=>x!==name):[...prev,name]);}
 const extra=details?.groups.reduce((sum,g)=>sum+g.options.filter(o=>(selection[g.id]??[]).includes(o.id)).reduce((sub,o)=>sub+Number(o.price_delta_minor),0),0)??0;
 const valid=details?.groups.every(g=>(selection[g.id]??[]).length>=g.min_select&&(selection[g.id]??[]).length<=g.max_select)??false;
 const completed=details?.groups.filter(g=>(selection[g.id]??[]).length>=g.min_select).length??0;
 const required=details?.groups.filter(g=>g.min_select>0).length??0;
 function addToBasket(){
  if(!details||!valid||!cart)return;
  const choices=details.groups.flatMap(g=>g.options.filter(o=>(selection[g.id]??[]).includes(o.id)).map(o=>title(g)+": "+title(o)));
  const omissions=details.ingredients.filter(i=>i.is_optional&&removed.includes(i.name_ar)).map(i=>(en?"Without ":tr?"Olmadan ":"بدون ")+title(i));
  const selectedIds=details.groups.flatMap(g=>(selection[g.id]??[]).slice().sort());
  const key=JSON.stringify([productId,selectedIds,removed.slice().sort()]);
  cart.add({key,productId,optionIds:selectedIds,removedIngredients:removed, name:title(details),unitMinor:Number(details.price_minor)+extra,baseMinor:Number(details.price_minor),extraMinor:extra,imageUrl:imageUrl??undefined,quantity,selections:[...choices,...omissions]});
  setAdded(en?"Added to basket":tr?"Sepete eklendi":"أضيف إلى السلة");
  setQuantity(1);setSelection({});setRemoved([]);
  setOpen(false);
 }
 return <div className="beger-product-action-mount" style={{marginTop:13}}>
  <button className="beger-product-open-trigger" type="button" aria-expanded={open} onClick={toggleDetails} style={{display:"inline-flex",alignItems:"center",gap:9,padding:"11px 15px",minHeight:42,color:dark?"#20170f":"#17694E",border:"1px solid #CFE5D6",borderRadius:13,background:dark?accent:"#ECF7F0",cursor:"pointer",font:"inherit",fontSize:13,fontWeight:800}}>
   <span aria-hidden="true">✦</span> {en?"Ingredients & extras":tr?"İçindekiler ve seçenekler":"المكونات والإضافات"} <span aria-hidden="true">{open?"⌃":"⌄"}</span>
  </button>
  {open?<div className="beger-product-popup-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
    <section className="beger-product-popup" role="dialog" aria-modal="true" aria-label={en?"Customize product":tr?"Ürünü kişiselleştir":"تخصيص المنتج"}>
     <div className="beger-product-popup-hero">
      {imageUrl?<img src={imageUrl} alt="" loading="eager" referrerPolicy="no-referrer"/>:<span aria-hidden="true" style={{fontSize:66,display:"grid",placeItems:"center",height:"100%"}}>☕</span>}
      <button ref={closeRef} type="button" className="beger-product-popup-close" onClick={()=>setOpen(false)} aria-label={en?"Close":tr?"Kapat":"إغلاق"}>×</button>
     </div>
     <div className="beger-product-popup-body"><div style={{...panel,color:"#21383b",border:0,boxShadow:"none",background:"transparent",marginTop:0,padding:"16px 0 0"}} aria-live="polite">
   {loading?<p role="status" style={{color:"#658074",fontSize:13}}>{en?"Loading…":tr?"Yükleniyor…":"جارٍ تحميل التفاصيل…"}</p>:null}
   {error?<p role="status" style={{color:"#885d36",background:"#FFF7EA",padding:12,borderRadius:10,fontSize:13}}>{error}</p>:null}
   {details?<div>
    <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
     <div>
      <span style={{color:"#698274",fontWeight:750,fontSize:10,letterSpacing:".09em"}}>{en?"MAKE IT YOURS":tr?"KENDİNE GÖRE":"على ذوقك"}</span>
      <h5 className="beger-product-name" style={{fontSize:23,margin:"4px 0 2px",fontWeight:850}}>{title(details)}</h5>
      <strong className="beger-product-base-price" style={{display:"block",fontSize:19,color:"#A65330",marginTop:4}}>{formatPrice(Number(details.price_minor),country,lang)}</strong>
     </div>
     <span style={{borderRadius:999,padding:"7px 10px",fontSize:11,fontWeight:750,background:"#EAF6EE",color:"#327051"}}>{en?"Preview":tr?"Önizleme":"معاينة"}</span>
    </div>
    {(en?details.description_en||details.description_ar:tr?details.description_tr:details.description_ar)?<p style={{color:"#647C6F",fontSize:13,lineHeight:1.8,margin:"10px 0"}}>{en?details.description_en||details.description_ar:tr?details.description_tr:details.description_ar}</p>:null}
    {details.ingredients.length>0?<fieldset className="beger-ingredients-card" style={sectionCard}>
     <legend style={{padding:"0 6px",fontWeight:850,fontSize:14}}>{en?"Ingredients":tr?"İçindekiler":"المكونات"}</legend>
     <p style={{color:"#7A8A7E",fontSize:12,margin:"3px 0 10px"}}>{en?"Uncheck a removable ingredient":tr?"Çıkarılabilir malzemelerin işaretini kaldırın":"أزل علامة الاختيار عن المكوّن القابل للإزالة"}</p>
     <div style={{display:"grid",gap:8}}>
     {details.ingredients.map((i,k)=><label key={k} style={{display:"flex",gap:11,alignItems:"center",background:i.is_optional?"#F8FBF8":"#F3F6F3",padding:"10px 12px",borderRadius:12,fontSize:13,minHeight:42,boxSizing:"border-box"}}>
      {i.is_optional?<><input type="checkbox" style={{width:18,height:18,accentColor:accent}} checked={!removed.includes(i.name_ar)} onChange={()=>toggleRemoval(i.name_ar)}/> <span style={{flex:1}}>{title(i)}</span><small style={{color:"#738678"}}>{en?"Removable":tr?"Çıkarılabilir":"قابل للإزالة"}</small></>:
       <><span aria-hidden="true" style={{color:"#428563"}}>✓</span><span>{title(i)}</span></>}
     </label>)}
     </div>
    </fieldset>:null}
    {details.groups.length>0?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"12px 2px 0",flexWrap:"wrap"}}>
      <strong style={{fontSize:15}}>{en?"Your additions":tr?"Ek seçeneklerin":"الإضافات والخيارات"}</strong>
      <span style={{fontSize:12,color:"#718678"}}>{en?"Groups":tr?"Gruplar":"المجموعات"} {completed}/{details.groups.length} · {en?"Required":tr?"Zorunlu":"إلزامي"} {required}</span>
    </div>:null}
    {details.groups.slice().sort((a,b)=>Number(b.min_select>0)-Number(a.min_select>0)).map((g,index)=>{
      const picked=selection[g.id]??[];
      const maxed=picked.length>=g.max_select;
      const fulfilled=picked.length>=g.min_select;
      return <fieldset key={g.id} className="beger-modifier-card" style={{...sectionCard,borderColor:fulfilled?"#DDE9E0":"#E9D8B6"}}>
       <legend style={{padding:"0 5px",fontSize:12,color:"#778A7A",fontWeight:800}}>{en?"Option":tr?"Seçenek":"المجموعة"} {index+1}</legend>
       <div style={{display:"flex",gap:10,alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",marginBottom:12}}>
        <div style={{minWidth:0,flex:"1 1 140px"}}>
         <strong style={{fontSize:15}}>{title(g)}</strong>
         <p style={{fontSize:12,color:"#7C897E",margin:"5px 0 0"}}>{g.max_select===1?(en?"Choose one":tr?"Birini seç":"اختر واحداً"):(en?"Choose up to ":tr?"En fazla ":"اختر حتى ")+g.max_select}</p>
        </div>
        <span style={{padding:"6px 10px",borderRadius:999,fontWeight:800,fontSize:11,background:g.min_select>0?"#FFF1D8":"#EDF5EF",color:g.min_select>0?"#8B5B12":"#47775B"}}>{g.min_select>0?(en?" · Required":tr?" · Zorunlu":" · مطلوب"):(en?"Optional":tr?"İsteğe bağlı":"اختياري")}</span>
       </div>
       <div className={g.max_select===1&&g.options.length<=4?"beger-choice-pills":"beger-choice-list"} style={{display:"grid",gap:9}}>
       {g.options.map(o=>{
        const checked=picked.includes(o.id);
        const disabled=!checked&&g.max_select!==1&&maxed;
        return <label key={o.id} className="beger-choice-option" data-selected={checked} style={{display:"flex",gap:10,alignItems:"center",padding:"12px 13px",minHeight:48,boxSizing:"border-box",borderRadius:13,border:"1px solid "+(checked?"#7EBE98":"#E2EAE4"),background:checked?"#EFF9F1":"#FFF",opacity:disabled?0.55:1,cursor:disabled?"not-allowed":"pointer",transition:"border-color .15s,background .15s"}}>
         <input type={g.max_select===1?"radio":"checkbox"} name={g.id} style={{width:18,height:18,accentColor:accent,flexShrink:0}} checked={checked} disabled={disabled} onChange={()=>choose(g,o)}/>
         <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:checked?800:600,overflowWrap:"anywhere"}}>{title(o)}</span>
         <span style={{fontSize:12,fontWeight:800,color:Number(o.price_delta_minor)>0?"#2B7353":"#72877A",whiteSpace:"nowrap"}}>{Number(o.price_delta_minor)>0?"+"+formatPrice(Number(o.price_delta_minor),country,lang):(en?"Free":tr?"Ücretsiz":"مجاني")}</span>
        </label>;
       })}
       </div>
       <div style={{fontSize:11,color:fulfilled?"#548067":"#9B6826",marginTop:10}}>{picked.length}/{g.max_select} · {fulfilled?(en?"Selection ready":tr?"Seçim hazır":"الاختيار مكتمل"):(en?"Select at least ":tr?"En az ":"اختر على الأقل ")+g.min_select}</div>
      </fieldset>;
    })}
    <div style={{background:"#EAF4EC",border:"1px solid #D5E8D9",borderRadius:15,padding:14,marginTop:18}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <strong style={{fontSize:13}}>{en?"Estimated total":tr?"Önizleme toplamı":"المجموع التقديري"}</strong>
      <strong style={{color:"#17694E",fontSize:20}}>{formatPrice((Number(details.price_minor)+extra)*quantity,country,lang)}</strong>
     </div>
     {extra>0?<p style={{fontSize:11,color:"#698476",margin:"8px 0 0"}}>{en?"Includes additions":tr?"Ek seçenekler dahil":"يشمل الإضافات"} +{formatPrice(extra,country,lang)}</p>:null}
    </div>
    <div className="beger-product-quantity-control" role="group" aria-label={en?"Product quantity":tr?"Ürün adedi":"كمية المنتج"}>
      <span>{en?"Quantity":tr?"Adet":"الكمية"}</span>
      <div><button type="button" aria-label={en?"Decrease quantity":tr?"Adedi azalt":"تقليل الكمية"} disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}>−</button><strong aria-live="polite">{quantity}</strong><button type="button" aria-label={en?"Increase quantity":tr?"Adedi artır":"زيادة الكمية"} disabled={quantity>=20} onClick={()=>setQuantity(q=>Math.min(20,q+1))}>+</button></div>
    </div>
    {cart?<button className="beger-product-add-button" type="button" disabled={!valid} onClick={addToBasket} style={{width:"100%",minHeight:50,padding:"13px 16px",borderRadius:14,border:0,background:valid?accent:"#adbcb5",color:dark?"#20170f":"white",fontSize:14,fontWeight:800,cursor:valid?"pointer":"not-allowed",marginTop:13}}>
     {en?"Add to basket":tr?"Sepete ekle":"أضف إلى السلة"} · {formatPrice((Number(details.price_minor)+extra)*quantity,country,lang)}
    </button>:null}
    {added?<p role="status" style={{fontSize:12,color:"#176d4c",margin:"9px 0"}}>{added}</p>:null}
    {!valid?<p role="status" style={{fontSize:12,color:"#99651c"}}>{en?"Please complete required selections.":tr?"Lütfen zorunlu seçenekleri seçin.":"يرجى إكمال الاختيارات المطلوبة."}</p>:null}
    <p style={{fontSize:11,color:"#75887B",lineHeight:1.8,marginBottom:0}}>{tableOrdering?(en?"Add your choices to the basket, then submit from the basket if table ordering is enabled. Final prices are verified by the server.":tr?"Seçimlerinizi sepete ekleyin. Masa siparişleri açıksa sepetten gönderin; fiyatlar sunucuda doğrulanır.":"أضف اختياراتك إلى السلة ثم أرسل الطلب منها إذا كان استقبال طلبات الطاولة مفعّلاً. يتحقق الخادم من السعر النهائي."):(en?"This is a shop menu preview. Scan your table QR to submit an order; no payment is active.":tr?"Bu mağaza menüsüdür. Sipariş göndermek için masa QR kodunuzu tarayın; ödeme henüz aktif değildir.":"هذه قائمة المتجر للتصفح. لإرسال طلب امسح QR الطاولة؛ الدفع الإلكتروني غير مفعّل حالياً.")}</p>
    <GuestRatingPreview lang={lang}/>
   </div>:null}
    </div></div>
   </section></div>:null}
 </div>;
}
