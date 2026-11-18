/* Transpose step: every transpose control in the suite moves by this interval (default a minor second).
   A settings wheel beside each control opens the choice: minor second, major second, minor third, major third, perfect fourth, perfect fifth. */
(function(){
const KEY='tr-step', OPTS=[[1,'Minor second','½ step'],[2,'Major second','1 step'],[3,'Minor third','m3'],[4,'Major third','M3'],[5,'Perfect fourth','P4'],[7,'Perfect fifth','P5']];
const L=new Set();
const get=()=>{ let n=1; try{ n=+localStorage.getItem(KEY)||1; }catch(_){} return OPTS.some(o=>o[0]===n)?n:1; };
const set=n=>{ try{ localStorage.setItem(KEY,String(n)); }catch(_){} L.forEach(f=>{ try{ f(n); }catch(_){} }); };
const short=n=>(OPTS.find(o=>o[0]===(n||get()))||OPTS[0])[2], name=n=>(OPTS.find(o=>o[0]===(n||get()))||OPTS[0])[1];
let menu=null;
function closeMenu(){ if(menu){ menu.remove(); menu=null; document.removeEventListener('pointerdown',outside,true); } }
function outside(e){ if(menu&&!menu.contains(e.target)&&!e.target.closest('.trs-gear')) closeMenu(); }
function open(btn){ if(menu){ const was=menu.__btn===btn; closeMenu(); if(was) return; }
  menu=document.createElement('div'); menu.className='trs-menu'; menu.__btn=btn; menu.setAttribute('role','menu');
  const h=document.createElement('div'); h.className='trs-h'; h.textContent='Transpose by'; menu.appendChild(h);
  OPTS.forEach(([n,l,s])=>{ const b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitemradio'); b.setAttribute('aria-checked',String(get()===n)); b.className='trs-o'+(get()===n?' on':'');
    b.innerHTML='<i></i><span></span><em></em>'; b.children[1].textContent=l; b.children[2].textContent=s; b.onclick=()=>{ set(n); closeMenu(); }; menu.appendChild(b); });
  document.body.appendChild(menu); const r=btn.getBoundingClientRect(), mw=menu.offsetWidth, mh=menu.offsetHeight;
  let x=r.left, y=r.bottom+6; if(x+mw>innerWidth-8) x=innerWidth-8-mw; if(y+mh>innerHeight-8) y=r.top-6-mh; menu.style.left=Math.max(8,x)+'px'; menu.style.top=Math.max(8,y)+'px';
  setTimeout(()=>document.addEventListener('pointerdown',outside,true),0); }
function gear(onChange){ const b=document.createElement('button'); b.type='button'; b.className='trs-gear'; b.innerHTML='⚙';
  const sync=()=>{ b.title='Transpose by: '+name()+' (click to change)'; b.setAttribute('aria-label',b.title); }; sync();
  b.onclick=e=>{ e.stopPropagation(); open(b); }; const f=n=>{ sync(); if(onChange) onChange(n); }; L.add(f);
  /* forget the listener once the button leaves the page */
  const mo=new MutationObserver(()=>{ if(!b.isConnected&&b.__was){ L.delete(f); mo.disconnect(); } if(b.isConnected) b.__was=true; }); mo.observe(document.documentElement,{childList:true,subtree:true});
  return b; }
const cs=document.createElement('style'); cs.textContent=`.trs-gear{min-width:30px;height:30px;padding:0 6px;border-radius:8px;border:1px solid rgba(255,255,255,.16);background:#141925;color:#c9cfdc;font-size:16px;line-height:1;cursor:pointer;flex:0 0 auto}
.trs-gear:hover{background:#1f2738;color:#fff}
.trs-menu{position:fixed;z-index:2147483600;min-width:210px;background:#0f1420;border:1px solid #2b3347;border-radius:12px;padding:6px;box-shadow:0 14px 40px rgba(0,0,0,.6);font-family:var(--body,system-ui,sans-serif)}
.trs-h{font:800 10.5px var(--body,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#8b93a7;padding:6px 8px 4px}
.trs-o{display:flex;align-items:center;gap:9px;width:100%;background:transparent;border:0;border-radius:8px;padding:7px 8px;color:#e6e9f2;font:700 13px var(--body,system-ui);cursor:pointer;text-align:left}
.trs-o:hover{background:#1a2132} .trs-o i{width:8px;height:8px;border-radius:50%;background:#2a3142;flex:0 0 auto} .trs-o.on i{background:#69db7c;box-shadow:0 0 6px #69db7c}
.trs-o span{flex:1} .trs-o em{font-style:normal;color:#8b93a7;font-size:12px}`; document.head.appendChild(cs);
window.TRSTEP={get,set,short,name,gear,on:f=>L.add(f)};
})();
