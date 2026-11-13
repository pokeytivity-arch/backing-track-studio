/* gate.js: sends a device id and the access code with coach/transcribe calls,
   asks for the code once if the site needs it, and remembers it on this device. */
(function(){
'use strict';
const of=window.fetch.bind(window);
const ls={get:k=>{try{return localStorage.getItem(k);}catch(_){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(_){}}};
let dev=ls.get('ps-device'); if(!dev){ dev=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2)); ls.set('ps-device',dev); }
let pending=null;
function askCode(retry){
  if(pending) return pending;
  pending=new Promise(res=>{
    const o=document.createElement('div'); o.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(4,4,4,.72);display:grid;place-items:center;font-family:system-ui,sans-serif';
    o.innerHTML='<form style="background:#fff;color:#15203a;border-radius:16px;padding:24px;width:min(380px,92vw);box-shadow:0 20px 60px rgba(0,0,0,.4)"><h2 style="margin:0 0 6px;font-size:20px">Enter your access code</h2><p style="margin:0 0 12px;color:#5b6577;font-size:14px">Pokeytivity Piano Suite is open to invited students for now. Type the code you were given.</p><input type="password" autocomplete="off" style="width:100%;box-sizing:border-box;padding:11px;font-size:16px;border:1px solid #b8c2d6;border-radius:10px" aria-label="Access code"><div class="m" style="color:#b4421f;font-size:13px;min-height:18px;margin-top:6px">'+(retry?'That code did not work. Try again.':'')+'</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button type="button" class="x" style="padding:10px 14px;border:1px solid #b8c2d6;background:#fff;border-radius:10px;font-size:15px">Cancel</button><button type="submit" style="padding:10px 16px;border:0;background:#d4af37;color:#111;border-radius:10px;font-size:15px;font-weight:700">Continue</button></div></form>';
    document.body.appendChild(o); const inp=o.querySelector('input'); inp.focus();
    o.querySelector('.x').onclick=()=>{ o.remove(); pending=null; res(null); };
    o.querySelector('form').onsubmit=e=>{ e.preventDefault(); const v=inp.value.trim(); if(!v) return; ls.set('ps-access',v); o.remove(); pending=null; res(v); };
  });
  return pending;
}
function gated(u){ try{ const p=new URL(u,location.href); return p.origin===location.origin&&(p.pathname==='/api/teacher'||p.pathname==='/api/transcribe'); }catch(_){ return false; } }
window.fetch=async function(input,init){
  const u=typeof input==='string'?input:(input&&input.url)||''; if(!gated(u)) return of(input,init);
  const run=code=>{ const h=new Headers((init&&init.headers)||(typeof input!=='string'&&input.headers)||{}); h.set('x-device',dev); if(code) h.set('x-access',code); return of(input,Object.assign({},init||{},{headers:h})); };
  let r=await run(ls.get('ps-access'));
  for(let i=0;i<3&&r.status===401;i++){
    let j={}; try{ j=await r.clone().json(); }catch(_){}
    if(j.error!=='access') break;
    const had=!!ls.get('ps-access'); try{ localStorage.removeItem('ps-access'); }catch(_){}
    const c=await askCode(had||i>0); if(!c) break; r=await run(c);
  }
  return r;
};
})();
