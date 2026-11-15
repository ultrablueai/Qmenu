/* Beger salon-specific service worker. No caching of customer identities or private tokens. */
self.addEventListener("push",event=>{
 let message={};
 try{message=event.data?.json()??{}}catch{message={}}
 const validPath=typeof message.url==="string"&&/^\/salon\/book\/salon-[a-f0-9]{24}$/.test(message.url);
 const target=validPath?message.url:"/demo/salon/customer";
 event.waitUntil(self.registration.showNotification("Beger Salon — موعد أبكر",{
  body:"المعلم متاح أبكر! افتح حجزك خلال دقائق للرد.",
  tag:"beger-salon-early-offer",renotify:true,requireInteraction:true,
  icon:"/favicon.ico",badge:"/favicon.ico",vibrate:[400,150,400,200,400],
  data:{url:target},
  actions:[{action:"open",title:"عرض الموعد"}]
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const path=event.notification.data?.url;
 const safe=typeof path==="string"&&/^\/salon\/book\/salon-[a-f0-9]{24}$/.test(path)?path:"/demo/salon/customer";
 event.waitUntil((async()=>{
  const url=new URL(safe,self.location.origin).href;
  const clientsList=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  const current=clientsList.find(c=>c.url.startsWith(url));
  if(current){await current.focus();return}
  await self.clients.openWindow(url);
 })());
});
