"use client";
import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {formatPrice,type GuestLang} from "../lib/g2-public";

type CartItem={key:string;name:string;unitMinor:number;quantity:number;selections:string[]};
type CartContextValue={add:(item:Omit<CartItem,"quantity">)=>void;count:number;open:()=>void};
const CartContext=createContext<CartContextValue|null>(null);
export function useGuestCart(){return useContext(CartContext);}
export default function GuestCart({children,country,lang,accent}:{children:ReactNode;country:string;lang:GuestLang;accent:string}){
 const [items,setItems]=useState<CartItem[]>([]);
 const [open,setOpen]=useState(false);
 const closeRef=useRef<HTMLButtonElement|null>(null);
 const openerRef=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{if(!open)return;
   const prior=document.activeElement instanceof HTMLElement?document.activeElement:null;
   closeRef.current?.focus();
   function handleKey(event:KeyboardEvent){if(event.key==="Escape")setOpen(false);}
   document.addEventListener("keydown",handleKey);
   const originalOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
   return()=>{document.removeEventListener("keydown",handleKey);document.body.style.overflow=originalOverflow;(prior??openerRef.current)?.focus();};
 },[open]);
 const count=items.reduce((n,i)=>n+i.quantity,0);
 const total=items.reduce((n,i)=>n+i.quantity*i.unitMinor,0);
 const tr=lang==="tr",en=lang==="en";
 const labels={
  cart:en?"My preview basket":tr?"Önizleme sepetim":"سلتي التجريبية",
  empty:en?"Your basket is empty":tr?"Sepetiniz boş":"السلة فارغة",
  notice:en?"Preview only. No order has been placed or sent. Final prices will be verified by the business when ordering is enabled.":tr?"Bu sadece önizlemedir. Sipariş gönderilmedi. Sipariş özelliği açıldığında fiyatlar yeniden doğrulanacaktır.":"هذه سلة للمعاينة فقط؛ لم يتم إرسال أي طلب. ستُتحقق الأسعار عند تفعيل الطلب الفعلي.",
  total:en?"Estimated total":tr?"Tahmini toplam":"المجموع التقديري",
  close:en?"Close":tr?"Kapat":"إغلاق",
  clear:en?"Clear basket":tr?"Sepeti temizle":"تفريغ السلة",
  quantity:en?"Quantity":tr?"Adet":"الكمية",
  preview:en?"DEMO · NO ORDER PLACED":tr?"DEMO · SİPARİŞ VERİLMEDİ":"معاينة · لم يُرسل طلب",
  items:en?"Items":tr?"Ürünler":"المنتجات",
  remove:en?"Remove product":tr?"Ürünü kaldır":"إزالة المنتج",
 };
 const context=useMemo(()=>({count,open:()=>setOpen(true),add(item:Omit<CartItem,"quantity">){
  setItems(existing=>{const idx=existing.findIndex(x=>x.key===item.key);if(idx<0)return [...existing,{...item,quantity:1}];return existing.map((x,i)=>i===idx?{...x,quantity:Math.min(99,x.quantity+1)}:x);});
  setOpen(true);
 }}),[count]);
 return <CartContext.Provider value={context}>
  {children}
  <button ref={openerRef} className="beger-basket-trigger" type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={labels.cart} style={{position:"fixed",bottom:20,insetInlineEnd:20,zIndex:40,background:accent,color:"#fff",border:0,borderRadius:19,padding:"14px 20px",fontWeight:800,boxShadow:"0 13px 35px #183b3250",cursor:"pointer",fontSize:14}}>
    🛍 {labels.cart} <span style={{background:"#ffffff2b",borderRadius:20,padding:"4px 9px",marginInlineStart:8}}>{count}</span>
  </button>
  {open?<div className="beger-basket-overlay" style={{position:"fixed",inset:0,zIndex:60,background:"#1a241e9c",display:"flex",justifyContent:"flex-end"}} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <section className="beger-basket-sheet" role="dialog" aria-modal="true" aria-label={labels.cart} style={{width:"min(100%,470px)",height:"100%",background:"#FFFCF7",color:"#352E23",padding:24,overflowY:"auto",boxShadow:"0 20px 50px #11271e33",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:15}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:15,alignItems:"center"}}>
     <div><span style={{color:"#937047",fontSize:11,fontWeight:800,letterSpacing:".05em"}}>{labels.preview}</span><h2 style={{fontSize:24,margin:"5px 0 0"}}>{labels.cart}</h2></div>
     <button ref={closeRef} type="button" onClick={()=>setOpen(false)} style={{padding:"8px 13px",background:"#edf3ef",border:0,borderRadius:11,cursor:"pointer"}}>{labels.close} ✕</button>
    </div>
    <p style={{color:"#637b6c",fontSize:13,lineHeight:1.8,margin:0}}>{labels.notice}</p>
    {items.length>0?<strong style={{fontSize:13,color:"#6F7658"}}>{labels.items} · {count}</strong>:null}
    {items.length===0?<p style={{padding:35,textAlign:"center",color:"#73887d",background:"#F3F0E7",borderRadius:17}}>{labels.empty}</p>:items.map(item=><article key={item.key} style={{border:"1px solid #E9E1D5",background:"#fff",borderRadius:18,padding:16,minWidth:0}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:9,alignItems:"center"}}><strong style={{display:"block",marginBottom:6,overflowWrap:"anywhere"}}>{item.name}</strong><button type="button" aria-label={labels.remove+" "+item.name} onClick={()=>setItems(prev=>prev.filter(x=>x.key!==item.key))} style={{border:"1px solid #EFE4D6",background:"#FBF6EE",borderRadius:10,padding:"6px 9px",color:"#956443",cursor:"pointer"}}>✕</button></div>
     {item.selections.length?<p style={{fontSize:12,color:"#728579",margin:"0 0 12px"}}>{item.selections.join(" · ")}</p>:null}
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <strong style={{color:accent,overflowWrap:"anywhere"}}>{formatPrice(item.unitMinor*item.quantity,country,lang)}</strong>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
       <button type="button" aria-label={labels.quantity+" − "+item.name} onClick={()=>setItems(prev=>prev.flatMap(x=>x.key!==item.key?[x]:x.quantity<=1?[]:[{...x,quantity:x.quantity-1}]))} style={{border:"1px solid #dce8df",background:"#f4faf6",borderRadius:9,padding:"6px 12px",cursor:"pointer"}}>−</button>
       <span style={{minWidth:15,textAlign:"center"}}>{item.quantity}</span>
       <button type="button" aria-label={labels.quantity+" + "+item.name} onClick={()=>setItems(prev=>prev.map(x=>x.key===item.key?{...x,quantity:Math.min(99,x.quantity+1)}:x))} style={{border:"1px solid #dce8df",background:"#f4faf6",borderRadius:9,padding:"6px 12px",cursor:"pointer"}}>+</button>
      </div>
     </div>
    </article>)}
    <div style={{marginTop:"auto",borderTop:"1px solid #E6DED0",paddingTop:18}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:15,fontSize:19,marginBottom:13}}><strong>{labels.total}</strong><strong>{formatPrice(total,country,lang)}</strong></div>
     {items.length>0?<button type="button" onClick={()=>setItems([])} style={{width:"100%",padding:12,border:"1px solid #dce6dd",color:"#5d6e62",background:"#fff",borderRadius:12,cursor:"pointer"}}>{labels.clear}</button>:null}
    </div>
   </section>
  </div>:null}
 </CartContext.Provider>;
}
