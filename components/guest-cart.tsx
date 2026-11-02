"use client";
import {createContext,useContext,useMemo,useState,type ReactNode} from "react";
import {formatPrice,type GuestLang} from "../lib/g2-public";

type CartItem={key:string;name:string;unitMinor:number;quantity:number;selections:string[]};
type CartContextValue={add:(item:Omit<CartItem,"quantity">)=>void;count:number};
const CartContext=createContext<CartContextValue|null>(null);
export function useGuestCart(){return useContext(CartContext);}
export default function GuestCart({children,country,lang,accent}:{children:ReactNode;country:string;lang:GuestLang;accent:string}){
 const [items,setItems]=useState<CartItem[]>([]);
 const [open,setOpen]=useState(false);
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
 };
 const context=useMemo(()=>({count,add(item:Omit<CartItem,"quantity">){
  setItems(existing=>{const idx=existing.findIndex(x=>x.key===item.key);if(idx<0)return [...existing,{...item,quantity:1}];return existing.map((x,i)=>i===idx?{...x,quantity:Math.min(99,x.quantity+1)}:x);});
  setOpen(true);
 }}),[count]);
 return <CartContext.Provider value={context}>
  {children}
  <button type="button" onClick={()=>setOpen(true)} aria-label={labels.cart} style={{position:"fixed",bottom:20,insetInlineEnd:20,zIndex:40,background:accent,color:"#fff",border:0,borderRadius:19,padding:"14px 20px",fontWeight:800,boxShadow:"0 13px 35px #183b3250",cursor:"pointer",fontSize:14}}>
    🛍 {labels.cart} <span style={{background:"#ffffff2b",borderRadius:20,padding:"4px 9px",marginInlineStart:8}}>{count}</span>
  </button>
  {open?<div style={{position:"fixed",inset:0,zIndex:60,background:"#10271f80",display:"flex",justifyContent:"flex-end"}} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <section role="dialog" aria-modal="true" aria-label={labels.cart} style={{width:"min(100%,440px)",height:"100%",background:"#fcfdfb",color:"#183b32",padding:24,overflowY:"auto",boxShadow:"0 20px 50px #11271e33",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:15}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:15,alignItems:"center"}}>
     <h2 style={{fontSize:24,margin:0}}>{labels.cart}</h2>
     <button type="button" onClick={()=>setOpen(false)} style={{padding:"8px 13px",background:"#edf3ef",border:0,borderRadius:11,cursor:"pointer"}}>{labels.close} ✕</button>
    </div>
    <p style={{color:"#637b6c",fontSize:13,lineHeight:1.8,margin:0}}>{labels.notice}</p>
    {items.length===0?<p style={{padding:35,textAlign:"center",color:"#73887d",background:"#f1f6f2",borderRadius:17}}>{labels.empty}</p>:items.map(item=><article key={item.key} style={{border:"1px solid #e1ebe4",background:"#fff",borderRadius:18,padding:16}}>
     <strong style={{display:"block",marginBottom:6}}>{item.name}</strong>
     {item.selections.length?<p style={{fontSize:12,color:"#728579",margin:"0 0 12px"}}>{item.selections.join(" · ")}</p>:null}
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <strong style={{color:accent}}>{formatPrice(item.unitMinor*item.quantity,country,lang)}</strong>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
       <button type="button" aria-label="Decrease quantity" onClick={()=>setItems(prev=>prev.flatMap(x=>x.key!==item.key?[x]:x.quantity<=1?[]:[{...x,quantity:x.quantity-1}]))} style={{border:"1px solid #dce8df",background:"#f4faf6",borderRadius:9,padding:"6px 12px",cursor:"pointer"}}>−</button>
       <span style={{minWidth:15,textAlign:"center"}}>{item.quantity}</span>
       <button type="button" aria-label="Increase quantity" onClick={()=>setItems(prev=>prev.map(x=>x.key===item.key?{...x,quantity:Math.min(99,x.quantity+1)}:x))} style={{border:"1px solid #dce8df",background:"#f4faf6",borderRadius:9,padding:"6px 12px",cursor:"pointer"}}>+</button>
      </div>
     </div>
    </article>)}
    <div style={{marginTop:"auto",borderTop:"1px solid #e2eae3",paddingTop:18}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:15,fontSize:19,marginBottom:13}}><strong>{labels.total}</strong><strong>{formatPrice(total,country,lang)}</strong></div>
     {items.length>0?<button type="button" onClick={()=>setItems([])} style={{width:"100%",padding:12,border:"1px solid #dce6dd",color:"#5d6e62",background:"#fff",borderRadius:12,cursor:"pointer"}}>{labels.clear}</button>:null}
    </div>
   </section>
  </div>:null}
 </CartContext.Provider>;
}
