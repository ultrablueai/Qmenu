"use client";
import {useCallback,useEffect,useRef,useState} from "react";

/** In-page feedback only. Never requests OS notification permission or background push. */
export type FeedbackKind="added"|"sent"|"new-order"|"accepted"|"preparing"|"ready"|"rejected"|"fulfilled";
export type FeedbackSettings={sound:boolean;vibration:boolean};
const DEFAULT:FeedbackSettings={sound:false,vibration:false};
const storage="beger-feedback-prefs-v1";
const tones:Record<FeedbackKind,[number,number] | [number,number,number]>={
 "added":[650,780],"sent":[520,720],"new-order":[670,880,670],
 "accepted":[600,800],"preparing":[540,670],"ready":[780,1050,1200],
 "rejected":[360,290],"fulfilled":[680,850]
};
const patterns:Record<FeedbackKind,number | number[]>={
 "added":18,"sent":[35,30,45],"new-order":[90,65,90],"accepted":[35,40,45],
 "preparing":30,"ready":[85,45,85,45,130],"rejected":[90,50,90],"fulfilled":45
};
let sharedAudio:AudioContext|null=null;
function audio(){
 if(typeof window==="undefined")return null;
 const C=window.AudioContext;
 if(!C)return null;
 try{sharedAudio??=new C();return sharedAudio}catch{return null}
}
function play(kind:FeedbackKind){
 const ctx=audio();if(!ctx||ctx.state!=="running")return;
 const sequence=tones[kind],step=0.115;
 sequence.forEach((hz,i)=>{
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  const at=ctx.currentTime+0.012+i*step;
  oscillator.type="sine";oscillator.frequency.setValueAtTime(hz,at);
  gain.gain.setValueAtTime(0.0001,at);gain.gain.exponentialRampToValueAtTime(0.045,at+0.016);gain.gain.exponentialRampToValueAtTime(0.0001,at+0.095);
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(at);oscillator.stop(at+0.105);
 });
}
export function useBegerFeedback(){
 const [settings,setSettings]=useState<FeedbackSettings>(DEFAULT);
 const settingsRef=useRef(DEFAULT);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const read=()=>{try{const value=JSON.parse(localStorage.getItem(storage)??"null");if(value&&typeof value.sound==="boolean"&&typeof value.vibration==="boolean"){
   const p={sound:value.sound,vibration:value.vibration};settingsRef.current=p;setSettings(p);
  }}catch{/* No local storage available */}};
  read();window.addEventListener("storage",read);window.addEventListener("beger-feedback-change",read);
  return()=>{window.removeEventListener("storage",read);window.removeEventListener("beger-feedback-change",read)};
 },[]);
 const change=useCallback((next:FeedbackSettings)=>{
  settingsRef.current=next;setSettings(next);
  try{localStorage.setItem(storage,JSON.stringify(next));window.dispatchEvent(new Event("beger-feedback-change"))}catch{/* Preferences still work until reload */}
  // Resume only from the user's settings click, never on a timer.
  if(next.sound){const ctx=audio();if(ctx?.state==="suspended")void ctx.resume().catch(()=>{});}
 },[]);
 const signal=useCallback((kind:FeedbackKind,text:string)=>{
  setMessage(text);
  const current=settingsRef.current;
  // Web Audio requires an unlocked user gesture. If blocked we silently use the visible notice.
  if(current.sound)play(kind);
  if(current.vibration&&typeof navigator!=="undefined"&&typeof navigator.vibrate==="function"){
   try{navigator.vibrate(patterns[kind])}catch{/* unsupported device */}
  }
 },[]);
 return {settings,change,signal,message,clear:()=>setMessage("")};
}
export function BegerFeedbackControls({settings,onChange,onTest,labels}:{settings:FeedbackSettings;onChange:(next:FeedbackSettings)=>void;onTest?:()=>void;labels?:{sound:string;vibration:string;test?:string}}){
 return <fieldset className="beger-feedback-controls">
  <legend>{labels?.sound==="Sound"?"Alerts":labels?.sound==="Ses"?"Bildirimler":"التنبيهات"}</legend>
  <label><input type="checkbox" checked={settings.sound} onChange={e=>onChange({...settings,sound:e.target.checked})}/>{labels?.sound??"الصوت"}</label>
  <label><input type="checkbox" checked={settings.vibration} onChange={e=>onChange({...settings,vibration:e.target.checked})}/>{labels?.vibration??"اهتزاز الهاتف"}</label>
  {onTest?<button type="button" className="beger-feedback-test" onClick={onTest}>{labels?.test??"تجربة التنبيه"}</button>:null}
 </fieldset>;
}
