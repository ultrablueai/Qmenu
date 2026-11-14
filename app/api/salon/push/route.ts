import {NextRequest,NextResponse} from "next/server";
import {serverSupabase} from "../../../../lib/supabase/server";
// @ts-expect-error JavaScript Web Push helper is intentionally dependency-free
import {sendWebPush} from "../../../../lib/beger-web-push.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Destination={endpoint:string;p256dh:string;auth:string};
type Claimed={already_sent?:boolean;claim_in_progress?:boolean;devices:Destination[];slug:string;expires_at:string};
export async function GET(){
 const publicKey=process.env.VAPID_PUBLIC_KEY;
 return NextResponse.json({enabled:Boolean(publicKey&&process.env.VAPID_PRIVATE_KEY),
  publicKey:publicKey??null,requires_user_consent:true,
  guaranteed_phone_ringtone:false},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
 if(request.headers.get("origin")!==new URL(request.url).origin)
  return NextResponse.json({error:"cross_origin_rejected"},{status:403});
 if(Number(request.headers.get("content-length")??0)>3000)
  return NextResponse.json({error:"request_too_large"},{status:413});
 const pub=process.env.VAPID_PUBLIC_KEY,priv=process.env.VAPID_PRIVATE_KEY;
 if(!pub||!priv)return NextResponse.json({error:"push_unavailable"},{status:503});
 let incoming:unknown;
 try{incoming=await request.json()}catch{return NextResponse.json({error:"invalid_json"},{status:400})}
 if(!incoming||typeof incoming!=="object")return NextResponse.json({error:"invalid_payload"},{status:400});
 const body=incoming as Record<string,unknown>;
 const business=String(body.business??""),offer=String(body.offer??"");
 if(!uuid.test(business)||!uuid.test(offer))return NextResponse.json({error:"invalid_identifiers"},{status:400});
 const client=await serverSupabase();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:"auth_required"},{status:401});
 const claimed=await client.rpc("beger_g57_claim_offer_push",{p_business:business,p_offer:offer});
 if(claimed.error||!claimed.data)return NextResponse.json({error:"not_authorized_or_expired"},{status:403});
 const work=claimed.data as Claimed;
 if(work.already_sent)return NextResponse.json({alreadySent:true,delivered:0});
 if(work.claim_in_progress)return NextResponse.json({inProgress:true,delivered:0});
 const targets=Array.isArray(work.devices)?work.devices.slice(0,3):[];
 const slug=/^salon-[a-f0-9]{24}$/.test(work.slug??"")?work.slug:null;
 if(!slug||new Date(work.expires_at).getTime()<=Date.now()){
  await client.rpc("beger_g57_finish_offer_push",{p_business:business,p_offer:offer,p_success:false});
  return NextResponse.json({delivered:0,reason:"not_eligible"});
 }
 const url="/salon/book/"+slug;
 // Never put the customer bearer token, name or service data into a push payload.
 const payload={title:"Beger — موعد أبكر متاح!",body:"معلمك عنده وقت أبكر. افتح حجزك للقبول أو الرفض خلال دقائق.",url};
 let delivered=0;
 for(const subscription of targets){
  try{
   await sendWebPush(subscription,payload,{publicKey:pub,privateKey:priv,
     subject:"https://qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app"});
   delivered++;
  }catch{/* Continue other consenting devices without leaking endpoint details */}
 }
 await client.rpc("beger_g57_finish_offer_push",{p_business:business,p_offer:offer,p_success:delivered>0});
 return NextResponse.json({delivered,subscriptions:targets.length,
  background_delivery_guaranteed:false},{headers:{"Cache-Control":"no-store"}});
}
