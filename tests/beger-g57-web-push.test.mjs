import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createDecipheriv,createECDH,createPublicKey,hkdfSync,randomBytes,verify} from "node:crypto";
import {encryptWebPushPayload,isTrustedPushEndpoint,vapidAuthorization} from "../lib/beger-web-push.mjs";
const sql=readFileSync("supabase/migrations/20261115001100_g57_salon_optin_webpush.sql","utf8");
const sw=readFileSync("public/salon-booking-sw.js","utf8");
const route=readFileSync("app/api/salon/push/route.ts","utf8");
const customer=readFileSync("app/salon/book/[slug]/public-salon-booking.tsx","utf8");
const worker=readFileSync("app/salon/workspace/salon-early-offer-controls.tsx","utf8");
test("G57 encrypted RFC8291 payload decrypts under customer receiver keys",()=>{
 const receiver=createECDH("prime256v1");receiver.generateKeys();
 const auth=randomBytes(16);
 const payload={title:"Beger",body:"Earlier time",url:"/salon/book/salon-"+("a".repeat(24))};
 const frame=encryptWebPushPayload(receiver.getPublicKey().toString("base64url"),
  auth.toString("base64url"),payload);
 assert.equal(frame.readUInt32BE(16),4096);
 assert.equal(frame.readUInt8(20),65);
 const senderPub=frame.subarray(21,86),salt=frame.subarray(0,16);
 const ikm=Buffer.from(hkdfSync("sha256",receiver.computeSecret(senderPub),auth,
  Buffer.concat([Buffer.from("WebPush: info\0"),receiver.getPublicKey(),senderPub]),32));
 const key=Buffer.from(hkdfSync("sha256",ikm,salt,Buffer.from("Content-Encoding: aes128gcm\0"),16));
 const nonce=Buffer.from(hkdfSync("sha256",ikm,salt,Buffer.from("Content-Encoding: nonce\0"),12));
 const body=frame.subarray(86),ciphertext=body.subarray(0,-16),tag=body.subarray(-16);
 const cipher=createDecipheriv("aes-128-gcm",key,nonce);cipher.setAuthTag(tag);
 const plaintext=Buffer.concat([cipher.update(ciphertext),cipher.final()]);
 assert.equal(plaintext.at(-1),2);
 assert.deepEqual(JSON.parse(plaintext.subarray(0,-1).toString()),payload);
});
test("G57 VAPID signs ES256 audience-bound JWT",()=>{
 const ecdh=createECDH("prime256v1");ecdh.generateKeys();
 const pub=ecdh.getPublicKey().toString("base64url"),priv=ecdh.getPrivateKey().toString("base64url");
 const endpoint="https://fcm.googleapis.com/fcm/send/abc123";
 const auth=vapidAuthorization(endpoint,pub,priv,"https://example.com");
 const match=/^vapid t=([^,]+), k=(.+)$/.exec(auth);assert.ok(match);
 const [header,payload,signature]=match[1].split(".");
 assert.equal(JSON.parse(Buffer.from(payload,"base64url").toString()).aud,"https://fcm.googleapis.com");
 const raw=ecdh.getPublicKey();
 const key=createPublicKey({key:{kty:"EC",crv:"P-256",
  x:raw.subarray(1,33).toString("base64url"),y:raw.subarray(33).toString("base64url")},format:"jwk"});
 assert.ok(verify("sha256",Buffer.from(header+"."+payload),
  {key,dsaEncoding:"ieee-p1363"},Buffer.from(signature,"base64url")));
});
test("G57 URL allowlist blocks localhost, IP, redirects and arbitrary websites",()=>{
 assert.equal(isTrustedPushEndpoint("https://fcm.googleapis.com/fcm/send/a"),true);
 assert.equal(isTrustedPushEndpoint("https://web.push.apple.com/Q123"),true);
 assert.equal(isTrustedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/A"),true);
 assert.equal(isTrustedPushEndpoint("https://127.0.0.1/private"),false);
 assert.equal(isTrustedPushEndpoint("https://fcm.googleapis.com.evil.net/send"),false);
 assert.equal(isTrustedPushEndpoint("http://fcm.googleapis.com/"),false);
 assert.equal(isTrustedPushEndpoint("https://example.com/internal"),false);
 assert.equal(isTrustedPushEndpoint("https://fcm.googleapis.com:443/send"),false);
});
test("G57 token-bound subscriptions RLS and staff dispatch, no public subscription read",()=>{
 assert.match(sql,/alter table public\.salon_push_subscriptions enable row level security/);
 assert.match(sql,/revoke all on public\.salon_push_subscriptions from public,anon,authenticated/);
 assert.match(sql,/access_hash=pg_catalog\.md5\(p_token\)/);
 assert.match(sql,/v_count>=3/);
 assert.match(sql,/v_role='staff' and not exists/);
 assert.match(sql,/v_e\.expires_at<=now\(\)/);
 assert.match(sql,/push_claimed_at>now\(\)-interval '75 seconds'/);
 assert.match(route,/auth\.getUser\(\)/);
 assert.match(route,/headers\.get\("origin"\)/);
 assert.match(route,/beger_g57_claim_offer_push/);
 assert.match(route,/beger_g57_finish_offer_push/);
 assert.match(route,/redirect:"error"/);
});
test("G57 customer opt-in and private generic SW notification, no claimed phone-call ringtone",()=>{
 assert.match(customer,/Notification\.requestPermission\(\)/);
 assert.match(customer,/serviceWorker\.register\("\/salon-booking-sw\.js"/);
 assert.match(customer,/beger_g57_register_push/);
 assert.match(customer,/beger_g57_unregister_push/);
 assert.match(customer,/ios_install_first/);
 assert.match(worker,/fetch\("\/api\/salon\/push"/);
 assert.match(sw,/self\.registration\.showNotification/);
 assert.match(sw,/notificationclick/);
 assert.doesNotMatch(sw,/customer_name|access_token|localStorage/);
 assert.match(customer,/صوت شاشة القفل ومدته يحددهما النظام/);
});
