import {createCipheriv,createECDH,createPrivateKey,hkdfSync,randomBytes,sign} from "node:crypto";

const b64u=(v)=>Buffer.from(v).toString("base64url");
const buffer=(str)=>Buffer.from(str,"base64url");
const encodeHeader=(obj)=>b64u(Buffer.from(JSON.stringify(obj)));

export function isTrustedPushEndpoint(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.port||u.username||u.password||u.hash)return false;
  const host=u.hostname.toLowerCase();
  return host==="fcm.googleapis.com"||host==="updates.push.services.mozilla.com"||
   /^([a-z0-9-]+\.)*push\.apple\.com$/.test(host)||
   /^([a-z0-9-]+\.)*notify\.windows\.com$/.test(host);
 }catch{return false}
}

export function encryptWebPushPayload(userPublicKey,authSecret,payload){
 const receiver=buffer(userPublicKey),authentication=buffer(authSecret);
 if(receiver.length!==65||receiver[0]!==4||authentication.length!==16)throw Error("Invalid subscription keys");
 const sender=createECDH("prime256v1");
 sender.generateKeys();
 const senderPub=sender.getPublicKey();
 const shared=sender.computeSecret(receiver);
 const ikm=Buffer.from(hkdfSync("sha256",shared,authentication,Buffer.concat([
  Buffer.from("WebPush: info\0"),receiver,senderPub]),32));
 const salt=randomBytes(16);
 const cek=Buffer.from(hkdfSync("sha256",ikm,salt,Buffer.from("Content-Encoding: aes128gcm\0"),16));
 const nonce=Buffer.from(hkdfSync("sha256",ikm,salt,Buffer.from("Content-Encoding: nonce\0"),12));
 const cipher=createCipheriv("aes-128-gcm",cek,nonce);
 const plaintext=Buffer.concat([Buffer.from(JSON.stringify(payload),"utf8"),Buffer.from([2])]);
 const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final(),cipher.getAuthTag()]);
 const header=Buffer.alloc(21);
 salt.copy(header);
 header.writeUInt32BE(4096,16);
 header.writeUInt8(senderPub.length,20);
 return Buffer.concat([header,senderPub,ciphertext]);
}

export function vapidAuthorization(endpoint,publicKey,privateKey,subject){
 if(!isTrustedPushEndpoint(endpoint))throw Error("Push endpoint not trusted");
 const receiverPub=buffer(publicKey),privateScalar=buffer(privateKey);
 if(receiverPub.length!==65||privateScalar.length!==32)throw Error("Invalid server VAPID key");
 const privateJwk={kty:"EC",crv:"P-256",x:b64u(receiverPub.subarray(1,33)),
  y:b64u(receiverPub.subarray(33)),d:b64u(privateScalar)};
 const jwtHead=encodeHeader({typ:"JWT",alg:"ES256"});
 const now=Math.floor(Date.now()/1000);
 const jwtPayload=encodeHeader({aud:new URL(endpoint).origin,exp:now+12*60*60,sub:subject});
 const signed=jwtHead+"."+jwtPayload;
 const signature=sign("sha256",Buffer.from(signed),{
  key:createPrivateKey({key:privateJwk,format:"jwk"}),dsaEncoding:"ieee-p1363"});
 return "vapid t="+signed+"."+b64u(signature)+", k="+publicKey;
}

export async function sendWebPush(subscription,payload,serverKeys){
 if(!isTrustedPushEndpoint(subscription.endpoint))throw Error("Push subscription destination blocked");
 const body=encryptWebPushPayload(subscription.p256dh,subscription.auth,payload);
 const authorization=vapidAuthorization(subscription.endpoint,serverKeys.publicKey,
  serverKeys.privateKey,serverKeys.subject);
 const response=await fetch(subscription.endpoint,{
  method:"POST",redirect:"error",
  headers:{Authorization:authorization,"Content-Encoding":"aes128gcm",
   "Content-Type":"application/octet-stream",TTL:"300",Urgency:"high"},
  body,
  signal:AbortSignal.timeout(6500)
 });
 if(!response.ok)throw Error("Push provider response "+response.status);
 return true;
}
