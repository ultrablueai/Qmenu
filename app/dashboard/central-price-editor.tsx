"use client";
import {useEffect,useState,type FormEvent} from "react";

type Publication={id:string;active:boolean;available:boolean;price_override_minor:number|null};
export default function CentralPriceEditor({label,baseMinor,factor,currency,publication,busy,onBasePrice,onOverride,onAvailability}:{
 label:string; baseMinor:number; factor:number; currency:string; publication?:Publication; busy:boolean;
 onBasePrice:(minor:number)=>Promise<boolean>; onOverride:(minor:number|null)=>Promise<boolean>; onAvailability:()=>Promise<boolean>;
}){
 const [base,setBase]=useState(String(baseMinor/factor));
 const [override,setOverride]=useState(publication?.price_override_minor==null?"":String(publication.price_override_minor/factor));
 const [err,setErr]=useState("");
 useEffect(()=>setBase(String(baseMinor/factor)),[baseMinor,factor]);
 useEffect(()=>setOverride(publication?.price_override_minor==null?"":String(publication.price_override_minor/factor)),[publication?.price_override_minor,factor]);
 function parse(input:string){const n=Number(input),minor=Math.round(n*factor);
   return input.trim()!==""&&Number.isFinite(n)&&n>=0&&Number.isSafeInteger(minor)&&minor<=100000000000?minor:null;}
 async function changeBase(e:FormEvent){e.preventDefault();const minor=parse(base);if(minor===null){setErr("سعر المنتج غير صالح");return;}setErr("");await onBasePrice(minor);}
 async function changeOverride(e:FormEvent){e.preventDefault();const minor=override.trim()===""?null:parse(override);if(override.trim()!==""&&minor===null){setErr("السعر المخصص غير صالح");return;}setErr("");await onOverride(minor);}
 const input={padding:8,border:"1px solid #ccdadd",borderRadius:8,maxWidth:130,width:"100%"};
 const button={padding:"8px 11px",border:"1px solid #9cbdb8",borderRadius:8,background:"#eaf6f2",cursor:"pointer"};
 return <div aria-label={label} style={{display:"grid",gap:9,margin:"10px 0",padding:10,background:"#f7faf9",borderRadius:10}}>
   {err?<p role="alert" style={{color:"#b42318"}}>{err}</p>:null}
   <form onSubmit={changeBase} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
    <label>السعر المركزي ({currency}) <input style={input} type="number" min="0" step={factor===100?"0.01":"1"} required value={base} onChange={e=>setBase(e.target.value)}/></label>
    <button style={button} disabled={busy}>حفظ السعر المركزي</button>
   </form>
   {publication?<div style={{display:"grid",gap:8}}>
    <form onSubmit={changeOverride} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <label>سعر الفرع (اتركه فارغاً لتطبيق السعر المركزي) <input style={input} type="number" min="0" step={factor===100?"0.01":"1"} value={override} onChange={e=>setOverride(e.target.value)}/></label>
      <button style={button} disabled={busy}>حفظ سعر الفرع</button>
    </form>
    <button type="button" style={{...button,justifySelf:"start"}} disabled={busy} onClick={onAvailability}>
      {publication.available?"إيقاف التوفر في هذا الفرع":"إعادة إتاحة المنتج في هذا الفرع"}
    </button>
   </div>:null}
 </div>;
}
