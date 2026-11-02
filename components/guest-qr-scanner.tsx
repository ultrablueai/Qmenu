"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {flushSync} from "react-dom";
import type {GuestLang} from "../lib/g2-public";
import GuestIcon from "./guest-icons";
type Detected={rawValue:string};
type Detector={detect(source:HTMLVideoElement):Promise<Detected[]>};
type DetectorConstructor=new (options:{formats:string[]})=>Detector;
const validRoute=/^\/(?:b|t)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;
function targetFromQr(value:string):string|null{
 try{const url=new URL(value,window.location.origin);const preview=/^qmenu-staging-(?:[a-z0-9]+|git-feat-g1-foundation)-ultrablueais-projects\.vercel\.app$/;const sameProjectPreview=preview.test(url.hostname)&&preview.test(window.location.hostname)&&url.protocol==="https:";if((url.origin!==window.location.origin&&!sameProjectPreview)||!validRoute.test(url.pathname))return null;const p=url.searchParams.get("product");if(p&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p))return null;return url.pathname+(p?"?product="+encodeURIComponent(p):"");}catch{return null;}
}
export default function GuestQrScanner({lang}:{lang:GuestLang}){
 const [open,setOpen]=useState(false),[active,setActive]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState(""),[manual,setManual]=useState(""),[pageUrl,setPageUrl]=useState(""),[showAlternatives,setShowAlternatives]=useState(false);
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null),frameRef=useRef<number|null>(null),runningRef=useRef(false),requestRef=useRef(0);
 useEffect(()=>{setPageUrl(window.location.href)},[]);
 const strings=lang==="ar"?{open:"افتح الكاميرا لمسح QR",close:"إغلاق الماسح",title:"امسح رمز المتجر أو الطاولة",note:"وجّه الكاميرا إلى رمز QR الخاص بـ Beger. يمكن لصق رابط المنيو أيضاً.",manual:"ألصق رابط QR هنا",go:"فتح الرابط",invalid:"هذا الرمز ليس رابط Beger موثوقاً.",unsupported:"المتصفح لا يدعم قراءة QR بالكاميرا. افتح الكاميرا العادية لمسح الرمز أو الصق رابطه هنا.",permission:"تعذّر فتح الكاميرا. تأكد من إذن الكاميرا أو استخدم الرابط."}:lang==="tr"?{open:"QR kamerayı aç",close:"Tarayıcıyı kapat",title:"Mağaza veya masa QR tara",note:"Beger QR koduna kamerayı tutun veya bağlantıyı yapıştırın.",manual:"QR bağlantısını yapıştır",go:"Bağlantıyı aç",invalid:"Bu güvenilir bir Beger QR bağlantısı değil.",unsupported:"Tarayıcınız kamera QR tanımayı desteklemiyor. Telefon kamerasını kullanın veya bağlantı yapıştırın.",permission:"Kamera açılamadı. İzin verin veya bağlantıyı yapıştırın."}:{open:"Scan shop or table QR",close:"Close scanner",title:"Scan a shop or table QR",note:"Point your camera at a Beger QR or paste a menu link.",manual:"Paste QR link",go:"Open link",invalid:"This is not a trusted Beger QR link.",unsupported:"Camera QR detection is unavailable here. Use your phone camera or paste the link.",permission:"Camera couldn't start. Check permission or paste the link."};
 function stop(){requestRef.current++;setStarting(false);runningRef.current=false;if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);frameRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;setActive(false);}
 useEffect(()=>()=>{runningRef.current=false;if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);streamRef.current?.getTracks().forEach(t=>t.stop())},[]);
 function proceed(value:string){const target=targetFromQr(value);if(!target){setError(strings.invalid);return false;}stop();window.location.assign(target);return true;}
 async function decodeFrame(source:CanvasImageSource,width:number,height:number){
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d",{willReadFrequently:true});
  if(!context)return null;
  context.drawImage(source,0,0,width,height);
  const pixels=context.getImageData(0,0,width,height);
  const {default:decode}=await import("../lib/qr/decoder/jsQR");
  return decode(pixels.data,width,height)?.data??null;
 }
 async function camera(){
  // Mount the dialog/video before requesting camera access. React may delay
  // normal state updates while the browser's permission sheet is visible.
  const requestId=++requestRef.current;
  flushSync(()=>{setOpen(true);setActive(false);setStarting(true);setShowAlternatives(false);setError("");});
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){setStarting(false);setError(strings.unsupported);return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
   if(requestId!==requestRef.current){stream.getTracks().forEach(track=>track.stop());return;}
   streamRef.current=stream;runningRef.current=true;
   const video=videoRef.current;
   if(!video||!runningRef.current){stream.getTracks().forEach(track=>track.stop());setStarting(false);setError(strings.permission);return;}
   video.srcObject=stream;
   video.muted=true;video.setAttribute("playsinline","");
   await video.play();
   if(!runningRef.current)return;
   setActive(true);setStarting(false);
   const Detector=(window as unknown as {BarcodeDetector?:DetectorConstructor}).BarcodeDetector;
   let native:Detector|null=null;
   if(Detector){try{native=new Detector({formats:["qr_code"]});}catch{native=null;}}
   // Decode locally even where the experimental BarcodeDetector API is unavailable (e.g. Safari).
   let last=0;
   const tick=async(time:number)=>{
    if(!runningRef.current||!videoRef.current)return;
    if(time-last>=180){
     last=time;
     try{
      let decoded:string|null=null;
      if(native){try{decoded=(await native.detect(videoRef.current))[0]?.rawValue??null;}catch{native=null;}}
      if(!decoded&&videoRef.current.videoWidth>0){
       const ratio=Math.min(1,480/videoRef.current.videoWidth);
       decoded=await decodeFrame(videoRef.current,Math.round(videoRef.current.videoWidth*ratio),Math.round(videoRef.current.videoHeight*ratio));
      }
      if(decoded&&proceed(decoded))return;
     }catch{/* Frames can be unavailable until the camera warms up. */}
    }
    if(runningRef.current)frameRef.current=requestAnimationFrame(time=>{void tick(time)});
   };
   frameRef.current=requestAnimationFrame(time=>{void tick(time)});
  }catch(problem){
   const reason=problem instanceof DOMException?problem.name:"";
   stop();
   if(reason==="NotAllowedError"||reason==="PermissionDeniedError"||reason==="SecurityError"){
    setError(lang==="ar"?"إذن الكاميرا مرفوض أو المتصفح يمنعه. افتح الرابط مباشرة في Chrome أو Safari واسمح بالكاميرا من إعدادات الموقع.":lang==="tr"?"Kamera izni engellendi. Bağlantıyı Chrome veya Safari'de açıp site için kameraya izin verin.":"Camera permission blocked. Open this page in Chrome or Safari and allow camera for the site.");
   }else if(reason==="NotFoundError"||reason==="DevicesNotFoundError"){
    setError(lang==="ar"?"ما تم العثور على كاميرا متاحة بهذا الجهاز. جرّب تصوير الرمز من تطبيق الكاميرا أو اختيار صورة.":lang==="tr"?"Kamera bulunamadı. Fotoğraftan QR açmayı deneyin.":"No available camera was found. Try scanning from a saved photo.");
   }else{
    setError(strings.permission);
   }
  }
 }
 async function scanPhoto(file:File|null){
  if(!file)return;
  setError("");
  if(!file.type.startsWith("image/")||file.size>8*1024*1024){setError(strings.invalid);return;}
  const src=URL.createObjectURL(file);
  try{
   const img=new Image();
   img.src=src;
   await img.decode();
   const scale=Math.min(1,1600/Math.max(img.width,img.height));
   const code=await decodeFrame(img,Math.max(1,Math.round(img.width*scale)),Math.max(1,Math.round(img.height*scale)));
   if(code)proceed(code);else setError(strings.invalid);
  }catch{setError(strings.invalid);}
  finally{URL.revokeObjectURL(src);}
 }
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();proceed(manual);}
 return <>
  <button type="button" className="beger-scan-open" onClick={()=>void camera()}><GuestIcon name="more" size={19}/>{strings.open}</button>
  {open?<div className="beger-scanner-overlay" onMouseDown={e=>{if(e.target===e.currentTarget){stop();setOpen(false)}}}><section className="beger-scanner-panel" role="dialog" aria-modal="true" aria-label={strings.title} dir={lang==="ar"?"rtl":"ltr"}>
    <div className="beger-scanner-header"><h2>{strings.title}</h2><button type="button" onClick={()=>{stop();setOpen(false)}} aria-label={strings.close}>×</button></div>
    <p>{strings.note}</p>
    {starting?<p role="status" className="beger-scanner-status">{lang==="ar"?"جارٍ طلب إذن الكاميرا وبدء البث...":lang==="tr"?"Kamera izni isteniyor...":"Requesting camera permission..."}</p>:null}
    <video ref={videoRef} playsInline muted autoPlay aria-label={strings.title} className="beger-scanner-video" style={{display:active?"block":"none"}}/>
    {error?<p role="alert" className="beger-scanner-error">{error}</p>:null}

    <div className="beger-scanner-alternatives">
      <button type="button" className="beger-scanner-alternatives-toggle" aria-controls="beger-qr-alternatives" aria-expanded={showAlternatives} onClick={()=>setShowAlternatives(v=>!v)}>
        {lang==="ar"?"خيارات إضافية":lang==="tr"?"Diğer seçenekler":"More options"}
        <span aria-hidden="true">{showAlternatives?"⌃":"⌄"}</span>
      </button>
      {showAlternatives?<div id="beger-qr-alternatives" className="beger-scanner-alternatives-content">
        <label className="beger-scanner-photo-label">{lang==="ar"?"اختيار صورة QR من المعرض":lang==="tr"?"Galeriden QR fotoğrafı seç":"Scan QR from a photo"}<input type="file" accept="image/*" onChange={event=>{void scanPhoto(event.target.files?.[0]??null);event.target.value="";}}/></label>
        <form onSubmit={submit} className="beger-scanner-form"><label htmlFor="beger-qr-link">{strings.manual}</label><input id="beger-qr-link" type="text" inputMode="url" autoComplete="off" placeholder="https://..." value={manual} onChange={e=>setManual(e.target.value)}/><button type="submit" disabled={!manual.trim()}>{strings.go}</button></form>
        {!active&&!starting&&pageUrl?<a className="beger-scanner-browser-link" href={pageUrl} target="_blank" rel="noopener noreferrer">{lang==="ar"?"فتح الصفحة في المتصفح الخارجي ↗":lang==="tr"?"Tarayıcıda aç ↗":"Open in browser ↗"}</a>:null}
      </div>:null}
    </div>
  </section></div>:null}
 </>;
}
