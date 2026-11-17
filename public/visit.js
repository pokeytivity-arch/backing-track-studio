/* Visit log: which spaces a visitor opens and how long they stay in each (counted only while the page is on screen).
   Sent to /api/visit; only the owner's account can read it, on /visitors. Runs on hearandplay.app and app.pokeytivity.com. */
(function(){
/* a link to the Visitors board, for the owner's account only */
async function owner(){ try{ const tok=localStorage.getItem('ps-tok'); if(!tok) return false; const r=await fetch('/api/visit',{method:'POST',headers:{authorization:'Bearer '+tok,'content-type':'text/plain'},body:JSON.stringify({a:'me'})}); const j=await r.json(); return !!j.owner; }catch(_){ return false; } }
window.VISIT={owner,mount(box){ owner().then(o=>{ if(!o||!box||!document.body.contains(box)||box.querySelector('.vis-link')) return; const a=document.createElement('a'); a.className='btn pri vis-link'; a.href='/visitors'; a.textContent='📊 Visitors'; a.style.textDecoration='none'; a.style.display='inline-block'; box.appendChild(a); }); }};
const UA=navigator.userAgent||'';
if(/bot|crawl|spider|slurp|headless|lighthouse/i.test(UA)||navigator.webdriver&&!/[?&]vtest=1/.test(location.search)) return;
let mine=false; try{ mine=localStorage.getItem('ps-vis-me')==='1'; }catch(_){}
const now=()=>Date.now(), rid=()=>(Math.random().toString(36).slice(2,10)+now().toString(36)).replace(/[^a-z0-9]/g,'').slice(0,24);
let vid=''; try{ vid=localStorage.getItem('ps-vid')||''; if(!/^[a-z0-9]{8,32}$/.test(vid)){ vid=rid(); localStorage.setItem('ps-vid',vid); } }catch(_){ vid=rid(); }
let sid='', seq=0, total=0, views=[];
try{ const s=JSON.parse(sessionStorage.getItem('ps-visit')||'null'); if(s&&now()-s.at<30*60e3&&/^[a-z0-9]{8,32}$/.test(s.id)){ sid=s.id; seq=s.seq||0; total=s.total||0; } }catch(_){}
if(!sid) sid=rid();
const NAMES={class:'Class',hall:'Practice Arena',studio:'Backing Track Studio',plus:'Transcription Studio',challenge:'Practice Plan Builder',account:'Account'};
const shown=id=>{ const e=document.getElementById(id); return !!(e&&!e.hidden&&e.getClientRects().length); };
function where(){
  let s;
  if(shown('rlDashPage')) s='Teacher dashboard';
  else if(shown('prRoom')){ const k=document.getElementById('prRoom').dataset.kind; s=k==='chords'?'Chord Practice':'Scale Practice'; }
  else if(shown('earRoom')) s='Ear Training';
  else{ const h=document.getElementById('suiteHub'); if(!h||h.classList.contains('on')) s=h&&h.dataset.view==='studios'?'Studio (choosing a studio)':'Home';
    else{ let c=''; try{ c=(window.SUITE&&SUITE.current&&SUITE.current())||document.body.dataset.dest||''; }catch(_){} if(c==='class'&&document.body.dataset.area==='hall') c='hall'; s=NAMES[c]||'Home'; } }
  const m=/^\/([A-Za-z0-9]{3,30})\/?$/.exec(location.pathname); if(m) s='@'+m[1].toLowerCase()+' · '+s;
  return s;
}
let cur=null, dirty=new Set(), lastIn=now(), lastT=now();
function open(space){ seq++; cur={seq,space,at:now(),dur:0}; views.push(cur); if(views.length>60) views=views.filter(v=>v===cur||dirty.has(v.seq)).slice(-60); dirty.add(cur.seq); save(); }
function save(){ try{ sessionStorage.setItem('ps-visit',JSON.stringify({id:sid,at:now(),seq,total})); }catch(_){} }
['pointerdown','keydown','touchstart','wheel','scroll'].forEach(e=>addEventListener(e,()=>{ lastIn=now(); },{passive:true,capture:true}));
function busy(){ try{ return !!(window.TX&&TX.S&&TX.S.playing)||[...document.querySelectorAll('audio,video')].some(m=>!m.paused&&!m.muted); }catch(_){ return false; } }
let flushT=null;
function tick(){
  const t=now(), dt=Math.min(5000,t-lastT); lastT=t;
  const vis=document.visibilityState==='visible', active=vis&&(t-lastIn<20*60e3||busy());
  const sp=where(); if(!cur||cur.space!==sp){ open(sp); clearTimeout(flushT); flushT=setTimeout(flush,2500); }
  if(active&&cur){ cur.dur+=dt/1000; total+=dt/1000; dirty.add(cur.seq); }
}
function body(){ let u=null; try{ u=window.AUTH&&AUTH.user&&AUTH.user(); }catch(_){}
  let ref=''; try{ const q=new URLSearchParams(location.search).get('utm_source'); if(q) ref=q; else if(document.referrer){ const h=new URL(document.referrer).hostname.replace(/^www\./,''); if(h&&h!==location.hostname) ref=h; } }catch(_){}
  const vs=views.filter(v=>dirty.has(v.seq)).map(v=>({seq:v.seq,space:v.space,at:v.at,dur:Math.round(v.dur)})); dirty=new Set();
  return JSON.stringify({a:'log',sid,vid,seq,total:Math.round(total),views:vs,path:location.pathname,ref:ref||'',lang:navigator.language||'',uname:u&&u.name||null,urole:u&&u.role||null}); }
let sent=0;
function flush(beacon){ if(mine) return; if(!dirty.size&&sent) return; save(); const b=body(); sent++;
  try{ if(beacon&&navigator.sendBeacon){ navigator.sendBeacon('/api/visit',new Blob([b],{type:'text/plain'})); return; } fetch('/api/visit',{method:'POST',body:b,headers:{'content-type':'text/plain'},keepalive:true}).catch(()=>{}); }catch(_){} }
setInterval(tick,1000); setInterval(()=>{ if(document.visibilityState==='visible') flush(); },60000);
addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'){ tick(); flush(true); } else lastT=now(); });
addEventListener('pagehide',()=>{ tick(); flush(true); });
setTimeout(()=>{ tick(); flush(); },4000);
/* a short notice, once */
try{ if(!localStorage.getItem('ps-vis-note')){ setTimeout(()=>{ const n=document.createElement('div'); n.setAttribute('role','status'); n.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;max-width:min(560px,calc(100vw - 24px));display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:14px;background:rgba(18,22,34,.96);color:#e8ecf5;font:500 13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12)';
  n.innerHTML='<span>HearandPlay counts visits (country, the spaces you open and time spent) to make the suite better. No names unless you’re signed in.</span><button type="button" style="flex:none;border:0;border-radius:999px;padding:7px 14px;background:#ffd43b;color:#151b28;font:800 13px system-ui,sans-serif;cursor:pointer">OK</button>';
  n.querySelector('button').onclick=()=>{ try{ localStorage.setItem('ps-vis-note','1'); }catch(_){} n.remove(); }; document.body.appendChild(n); },6000); } }catch(_){}
})();
