"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {GuestLang} from "../lib/g2-public";
import GuestIcon from "./guest-icons";
type Detected={rawValue:string};
type Detector={detect(source:HTMLVideoElement):Promise<Detected[]>};
type DetectorConstructor=new (options:{formats:string[]})=>Detector;
const validRoute=/^\/(?:b|t)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;
function targetFromQr(value:string):string|null{
 try{const url=new URL(value,window.location.origin);if(url.origin!==window.location.origin||!validRoute.test(url.pathname))return null;const p=url.searchParams.get("product");if(p&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p))return null;return url.pathname+(p?"?product="+encodeURIComponent(p):"");}catch{return null;}
}
export default function GuestQrScanner({lang}:{lang:GuestLang}){
 const [open,setOpen]=useState(false),[active,setActive]=useState(false),[error,setError]=useState(""),[manual,setManual]=useState("");
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null),frameRef=useRef<number|null>(null),runningRef=useRef(false);
 const strings=lang==="ar"?{open:"افتح الكاميرا لمسح QR",close:"إغلاق الماسح",title:"امسح رمز المتجر أو الطاولة",note:"وجّه الكاميرا إلى رمز QR الخاص بـ Beger. يمكن لصق رابط المنيو أيضاً.",manual:"ألصق رابط QR هنا",go:"فتح الرابط",invalid:"هذا الرمز ليس رابط Beger موثوقاً.",unsupported:"المتصفح لا يدعم قراءة QR بالكاميرا. افتح الكاميرا العادية لمسح الرمز أو الصق رابطه هنا.",permission:"تعذّر فتح الكاميرا. تأكد من إذن الكاميرا أو استخدم الرابط."}:lang==="tr"?{open:"QR kamerayı aç",close:"Tarayıcıyı kapat",title:"Mağaza veya masa QR tara",note:"Beger QR koduna kamerayı tutun veya bağlantıyı yapıştırın.",manual:"QR bağlantısını yapıştır",go:"Bağlantıyı aç",invalid:"Bu güvenilir bir Beger QR bağlantısı değil.",unsupported:"Tarayıcınız kamera QR tanımayı desteklemiyor. Telefon kamerasını kullanın veya bağlantı yapıştırın.",permission:"Kamera açılamadı. İzin verin veya bağlantıyı yapıştırın."}:{open:"Scan shop or table QR",close:"Close scanner",title:"Scan a shop or table QR",note:"Point your camera at a Beger QR or paste a menu link.",manual:"Paste QR link",go:"Open link",invalid:"This is not a trusted Beger QR link.",unsupported:"Camera QR detection is unavailable here. Use your phone camera or paste the link.",permission:"Camera couldn't start. Check permission or paste the link."};
 function stop(){runningRef.current=false;if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);frameRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;setActive(false);}
 useEffect(()=>()=>{runningRef.current=false;if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);streamRef.current?.getTracks().forEach(t=>t.stop())},[]);
 function proceed(value:string){const target=targetFromQr(value);if(!target){setError(strings.invalid);return false;}stop();window.location.assign(target);return true;}
 async function camera(){setOpen(true);setError("");const Detector=(window as unknown as {BarcodeDetector?:DetectorConstructor}).BarcodeDetector;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!Detector){setError(strings.unsupported);return;}
 try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});streamRef.current=stream;runningRef.current=true;setActive(true);
 await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(!runningRef.current||!videoRef.current){stream.getTracks().forEach(t=>t.stop());return;}
 videoRef.current.srcObject=stream;await videoRef.current.play();const detector=new Detector({formats:["qr_code"]});
 const tick=async()=>{if(!runningRef.current||!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes.some(c=>proceed(c.rawValue)))return;}catch{/* frame not ready */}if(runningRef.current)frameRef.current=requestAnimationFrame(()=>{void tick()})};
 frameRef.current=requestAnimationFrame(()=>{void tick()});
 }catch{stop();setError(strings.permission);}
 }
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();proceed(manual);}
 return <>
  <button type="button" className="beger-scan-open" onClick={()=>void camera()}><GuestIcon name="more" size={19}/>{strings.open}</button>
  {open?<div className="beger-scanner-overlay" onMouseDown={e=>{if(e.target===e.currentTarget){stop();setOpen(false)}}}><section className="beger-scanner-panel" role="dialog" aria-modal="true" aria-label={strings.title} dir={lang==="ar"?"rtl":"ltr"}>
    <div className="beger-scanner-header"><h2>{strings.title}</h2><button type="button" onClick={()=>{stop();setOpen(false)}} aria-label={strings.close}>×</button></div>
    <p>{strings.note}</p>
    {active?<video ref={videoRef} playsInline muted autoPlay aria-label={strings.title} className="beger-scanner-video"/>:null}
    {error?<p role="alert" className="beger-scanner-error">{error}</p>:null}
    <form onSubmit={submit} className="beger-scanner-form"><label htmlFor="beger-qr-link">{strings.manual}</label><input id="beger-qr-link" type="text" inputMode="url" autoComplete="off" placeholder="https://..." value={manual} onChange={e=>setManual(e.target.value)}/><button type="submit" disabled={!manual.trim()}>{strings.go}</button></form>
  </section></div>:null}
 </>;
}
