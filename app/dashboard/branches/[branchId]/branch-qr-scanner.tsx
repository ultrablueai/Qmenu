"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { browserSupabase } from "../../../../lib/supabase/browser";

type DetectedCode = { rawValue: string };
type Detector = { detect(source: HTMLVideoElement): Promise<DetectedCode[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

export default function BranchQrScanner({branchId,businessName,branchName}: {branchId:string;businessName:string;branchName:string}) {
 const [code,setCode] = useState("");
 const [busy,setBusy] = useState(false);
 const [cameraOpen,setCameraOpen] = useState(false);
 const [notice,setNotice] = useState("");
 const [error,setError] = useState("");
 const videoRef = useRef<HTMLVideoElement|null>(null);
 const streamRef = useRef<MediaStream|null>(null);
 const rafRef = useRef<number|null>(null);
 const activeRef = useRef(false);
 const processingRef = useRef(false);

 function closeCamera() {
  activeRef.current=false;
  if(rafRef.current!==null) cancelAnimationFrame(rafRef.current);
  rafRef.current=null;
  streamRef.current?.getTracks().forEach(track=>track.stop());
  streamRef.current=null;
  if(videoRef.current) videoRef.current.srcObject=null;
  setCameraOpen(false);
 }
 useEffect(()=>()=>{activeRef.current=false;if(rafRef.current!==null)cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(track=>track.stop());},[]);

 async function submitToken(raw:string){
  const token=raw.trim();
  if(processingRef.current) return;
  if(!/^QMB1\.[0-9a-f]{64}$/.test(token)){setError("رمز غير صالح لبطاقة زبون بيجر.");return;}
  processingRef.current=true;
  setBusy(true);setNotice("");setError("");closeCamera();
  try {
   const { data, error: rpcError } = await browserSupabase().rpc("scan_business_customer_qr",{
    p_branch:branchId,p_code:token
   });
   if(rpcError) throw rpcError;
   const outcome=data?.[0] as {result:string;customer_id:string|null;customer_name:string|null}|undefined;
   if(outcome?.result==="recorded")setNotice(`تم تسجيل زيارة ${outcome.customer_name ?? "الزبون"} في ${branchName} بنجاح.`);
   else if(outcome?.result==="duplicate")setNotice("تم مسح البطاقة قبل قليل بنفس الفرع؛ لم نُكرّر الزيارة.");
   else if(outcome?.result==="rate_limited")setError("تم تجاوز عدد محاولات المسح المسموحة مؤقتاً. انتظر دقيقة.");
   else setError("البطاقة غير صالحة أو ملغاة أو تابعة لنشاط آخر.");
   setCode("");
  }catch{setError("تعذّر التحقق من البطاقة. تأكد من الصلاحيات والاتصال.");}
  finally{setBusy(false);processingRef.current=false;}
 }
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await submitToken(code);}
 async function openCamera(){
  setError("");setNotice("");
  if(!navigator.mediaDevices?.getUserMedia){setError("المتصفح لا يدعم الكاميرا. استخدم إدخال الرمز يدوياً.");return;}
  const Ctor=(window as unknown as {BarcodeDetector?:DetectorCtor}).BarcodeDetector;
  if(!Ctor){setError("المتصفح لا يدعم قراءة QR مباشرةً. يمكنك استخدام الرمز المكتوب.");return;}
  try {
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
   streamRef.current=stream;
   activeRef.current=true;
   setCameraOpen(true);
   // Wait for React to mount the video element before attaching the stream.
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   if(!videoRef.current || !activeRef.current){stream.getTracks().forEach(t=>t.stop());return;}
   videoRef.current.srcObject=stream;
   await videoRef.current.play();
   const detector=new Ctor({formats:["qr_code"]});
   const tick=async()=>{
    if(!activeRef.current||!videoRef.current)return;
    try {
     const codes=await detector.detect(videoRef.current);
     if(codes.length && !processingRef.current){
      await submitToken(codes[0].rawValue);
      return;
     }
    } catch { /* Some browsers throw on a frame during camera warm-up. */ }
    if(activeRef.current)rafRef.current=requestAnimationFrame(()=>{void tick();});
   };
   rafRef.current=requestAnimationFrame(()=>{void tick();});
  }catch{
   closeCamera();
   setError("تعذّر تشغيل الكاميرا. اسمح باستخدامها أو أدخل الرمز يدوياً.");
  }
 }
 return <section aria-labelledby="qr-scanner-title" style={{marginTop:23,background:"#fff",border:"1px solid #e6ebef",borderRadius:17,padding:20}}>
  <h2 id="qr-scanner-title" style={{fontSize:18,margin:"0 0 8px"}}>مسح بطاقة QR للزبون</h2>
  <p style={{fontSize:12,color:"#8091a0",lineHeight:1.9}}>يمكنك مسح بطاقة أي زبون تابع لنشاط <strong>{businessName}</strong> هنا؛ تُسجّل الزيارة في <strong>{branchName}</strong> تحديداً. لا تمنح البطاقة نقاطاً أو صلاحية دفع.</p>
  <div style={{display:"flex",flexWrap:"wrap",gap:9,margin:"15px 0"}}>
   <button type="button" disabled={busy || cameraOpen} onClick={()=>void openCamera()} style={{padding:"11px 16px",borderRadius:10,background:"#165e67",border:0,color:"#fff",fontWeight:800,cursor:"pointer"}}>📷 فتح الكاميرا للمسح</button>
   {cameraOpen&&<button type="button" onClick={closeCamera} style={{padding:"11px 16px",borderRadius:10,border:"1px solid #d6e2e7",background:"white"}}>إيقاف الكاميرا</button>}
  </div>
  {cameraOpen&&<video ref={videoRef} muted playsInline autoPlay aria-label="معاينة الكاميرا لمسح رمز QR" style={{display:"block",width:"100%",maxWidth:380,aspectRatio:"4 / 3",objectFit:"cover",borderRadius:13,background:"#132d33",marginBottom:15}}/>}
  <form onSubmit={submit} style={{display:"grid",gap:9}}>
   <label htmlFor="qr-token" style={{fontSize:12,fontWeight:750}}>أو أدخل رمز البطاقة</label>
   <input id="qr-token" type="text" autoComplete="off" spellCheck={false} inputMode="text" value={code}
    onChange={e=>setCode(e.target.value)} disabled={busy} placeholder="QMB1.…"
    style={{padding:12,borderRadius:10,border:"1px solid #dce6eb",font:"inherit",minWidth:0}}/>
   <button type="submit" disabled={busy||!code.trim()} style={{padding:12,borderRadius:10,border:0,color:"white",background:"#155f68",fontWeight:800,opacity:busy?.5:1}}>تسجيل مسح البطاقة</button>
  </form>
  {notice&&<p role="status" style={{padding:11,borderRadius:10,background:"#e9f8f2",color:"#166c52",fontSize:12}}>{notice}</p>}
  {error&&<p role="alert" style={{padding:11,borderRadius:10,background:"#fff0ed",color:"#a7392d",fontSize:12}}>{error}</p>}
 </section>;
}
