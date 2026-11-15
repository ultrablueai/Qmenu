type Name="coffee"|"sandwich"|"dessert"|"more"|"dine"|"bag"|"delivery"|"home"|"menu"|"basket"|"rewards"|"search";
export default function GuestIcon({name,size=22}:{name:Name;size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 {name==="coffee"?<><path d="M4 8h14v6a7 7 0 0 1-14 0V8Z"/><path d="M18 9h2a2 2 0 0 1 0 4h-2M2 21h19M8 2c-2 1.5 2 2.5 0 4M13 2c-2 1.5 2 2.5 0 4"/></>:null}
 {name==="sandwich"?<><path d="M2 11 12 6l10 5-10 5-10-5Z"/><path d="M2 15 12 20l10-5M2 11v4M22 11v4"/><path d="m5 13 7 3.5 7-3.5"/></>:null}
 {name==="dessert"?<><path d="M4 10h16v11H4V10ZM2 10h20M6 10l2-5h8l2 5"/><path d="M12 5c-2.5-3 1-3.5 0-4M4 15c4-3 7 3 11 0 2-1 3-1 5 0"/></>:null}
 {name==="more"?<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>:null}
 {name==="dine"?<><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M16 3c-4 4-4 8 0 11h3V3h-3ZM19 14v7"/></>:null}
 {name==="bag"||name==="basket"?<><rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></>:null}
 {name==="delivery"?<><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 18h6l-2-8H6L4 13M15 9h4l3 4v5h-1M9 8h3l1 3"/></>:null}
 {name==="home"?<><path d="m3 10 9-7 9 7v10h-7v-7h-4v7H3V10Z"/></>:null}
 {name==="menu"?<><path d="M4 3v8M7 3v8M10 3v8M7 11v10M17 3v18M17 3c-6 4-6 9 0 9"/></>:null}
 {name==="rewards"?<><path d="m12 2 3.1 6.4 7.1 1-5.1 5 1.2 7-6.3-3.3-6.3 3.3 1.2-7-5.1-5 7.1-1L12 2Z"/></>:null}
 {name==="search"?<><circle cx="10" cy="10" r="7"/><path d="m15.5 15.5 6 6"/></>:null}
 </svg>;
}
