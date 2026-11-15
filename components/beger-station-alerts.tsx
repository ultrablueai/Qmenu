"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {FeedbackKind} from "./beger-feedback";
import {
 reconcileStationMemory,parseStationMemory,stationStorageKey,
 type OrderSnapshot,type Station,type StationAlert,type StationMemory
} from "../lib/beger-station-alerts";

function readMemory(key:string):StationMemory|null{
 try{return parseStationMemory(JSON.parse(sessionStorage.getItem(key)??"null"))}
 catch{return null}
}
export function useStationAlerts(
 station:Station,branchId:string,signal:(kind:FeedbackKind,text:string)=>void
){
 const key=stationStorageKey(station,branchId);
 const last=useRef<{key:string;memory:StationMemory|null}>({key:"",memory:null});
 const [alerts,setAlerts]=useState<StationAlert[]>([]);
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{
  const stored=readMemory(key);
  last.current={key,memory:stored};
  setAlerts(stored?.alerts??[]);
  setEnabled(true);
 },[key]);
 const observe=useCallback((orders:OrderSnapshot[])=>{
  if(last.current.key!==key){
   last.current={key,memory:readMemory(key)};
  }
  const {next,newAlerts}=reconcileStationMemory(last.current.memory,station,orders,new Date().toISOString());
  last.current={key,memory:next};
  setAlerts(next.alerts);
  try{sessionStorage.setItem(key,JSON.stringify(next))}catch{/* visible alert still works */}
  if(newAlerts.length){
   const type:FeedbackKind=station==="kitchen"?"accepted":newAlerts.some(a=>a.status==="ready")?"ready":"new-order";
   const msg=newAlerts.length===1?newAlerts[0].message:"هناك "+newAlerts.length+" تنبيهات جديدة للمحطة";
   signal(type,msg);
  }
 },[key,signal,station]);
 const clear=useCallback(()=>{
  if(last.current.key!==key)return;
  const fresh={seen:last.current.memory?.seen??{},alerts:[]};
  last.current={key,memory:fresh};
  setAlerts([]);
  try{sessionStorage.setItem(key,JSON.stringify(fresh))}catch{/* local only */}
 },[key]);
 return {observe,alerts,clear,enabled};
}
export function StationAlertBell({
 alerts,clear,actionable,label
}:{alerts:StationAlert[];clear:()=>void;actionable:number;label:string}){
 const [open,setOpen]=useState(false);
 return <section dir="rtl" aria-label={"تنبيهات "+label} style={{padding:"10px 13px",background:"#fff",border:"1px solid #dce5d8",borderRadius:11,margin:"12px 0"}}>
  <button type="button" aria-expanded={open} aria-controls={"station-alerts-"+label} onClick={()=>setOpen(x=>!x)}
   style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap",width:"100%",background:"none",border:0,textAlign:"right",cursor:"pointer",color:"#355a3c",fontWeight:800}}>
   <span aria-hidden="true">🔔</span> جرس تنبيهات {label}
   <span style={{fontSize:12,background:"#ebf3e8",padding:"4px 9px",borderRadius:15}}>تحتاج إجراء: {actionable}</span>
   <span style={{fontSize:12,color:"#69786a"}}>آخر تنبيهات الجلسة: {alerts.length}</span>
  </button>
  {open?<div id={"station-alerts-"+label} style={{paddingTop:11}}>
   <p style={{fontSize:12,lineHeight:1.7,color:"#6e766d"}}>تظهر تغيّرات الطلبات عند فتح المحطة أو العودة إليها؛ الصوت والاهتزاز يتطلبان تفعيلهما من إعدادات الجرس. لا توجد إشعارات هاتف خارج المتصفح.</p>
   {alerts.length===0?<p style={{fontSize:13}}>لا توجد تنبيهات جديدة مسجلة في هذه الجلسة.</p>:<ul style={{display:"grid",gap:7,paddingInlineStart:18,fontSize:13}}>
    {[...alerts].reverse().slice(0,12).map(a=><li key={a.key}>{a.message} · {new Date(a.at).toLocaleTimeString("ar")}</li>)}
   </ul>}
   {alerts.length>0?<button type="button" onClick={clear} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #cbd9c6",background:"#fff"}}>مسح سجل التنبيهات المعروض</button>:null}
  </div>:null}
 </section>;
}
