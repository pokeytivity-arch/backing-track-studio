/* app.js: the suite as an app on phones and tablets, plus two things every screen gets.
   - Every panel (Display, Keyboard, Console…) can be minimised to its title bar and opened again; the choice is remembered.
   - The practice rooms' Display gets a tool bar like the Transcription Studio's: Console, Tempo, Loop, Hands, Favourite, Key, Play, Stop, Full screen.
   - Phones and tablets get a tab bar at the bottom (Home, Class, Practice, Studio, Plans) on the pages without a keyboard,
     and the keyboard rooms are laid out so the 88 keys, the Display and the Console share the screen. */
(function(){
'use strict';
const root=document.documentElement, $=id=>document.getElementById(id);
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const coarse=matchMedia('(pointer:coarse)');
/* device class: a phone is a touch screen whose short side is at most 500 px; a tablet is a larger touch screen */
function devClass(){ const s=Math.min(screen.width||innerWidth,screen.height||innerHeight), touch=coarse.matches||('ontouchstart' in window&&navigator.maxTouchPoints>0);
  root.classList.toggle('m-ph',touch&&s<=500); root.classList.toggle('m-tb',touch&&s>500); root.classList.toggle('m-app',touch); }
devClass(); addEventListener('resize',devClass); addEventListener('orientationchange',()=>setTimeout(devClass,200));
const phone=()=>root.classList.contains('m-ph'), app=()=>root.classList.contains('m-app');

/* ---------------- minimise any panel ---------------- */
const MK='app-min';
const mins=()=>{ try{ return JSON.parse(localStorage.getItem(MK)||'{}')||{}; }catch(_){ return {}; } };
function setMin(p,on){ p.classList.toggle('ep-min',on); const b=p.querySelector(':scope>.ep-h .ep-mn'); if(b){ b.textContent=on?'▢':'–'; b.title=on?'Open '+(p.querySelector(':scope>.ep-h b')||{}).textContent:'Minimise'; b.setAttribute('aria-expanded',String(!on)); }
  const m=mins(); if(p.id){ m[p.id]=on; try{ localStorage.setItem(MK,JSON.stringify(m)); }catch(_){} } setTimeout(()=>dispatchEvent(new Event('resize')),30); }
function addMin(p){ if(p.__mn) return; const h=p.querySelector(':scope>.ep-h'); if(!h) return; p.__mn=true;
  const b=el('button','ep-b ep-mn','–'); b.type='button'; b.title='Minimise'; b.setAttribute('aria-label','Minimise or open this panel');
  b.onclick=e=>{ e.stopPropagation(); if(p.classList.contains('max')||p.classList.contains('float')){ const x=p.querySelector(':scope>.ep-h [data-a='+(p.classList.contains('max')?'max':'det')+']'); if(x) x.click(); } setMin(p,!p.classList.contains('ep-min')); };
  h.insertBefore(b,h.querySelector('.ep-b')||null);
  /* on a touch screen the whole title bar opens a minimised panel */
  h.addEventListener('click',e=>{ if(e.target.closest('button,select,input,a,.tx3-view')) return; if(p.classList.contains('ep-min')) setMin(p,false); });
  if(p.id&&mins()[p.id]) setMin(p,true); }
function scanPanels(){ document.querySelectorAll('section.ep').forEach(addMin); }

/* ---------------- practice rooms: the Display tool bar ---------------- */
const IC={
  con:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2.2" class="f"/><circle cx="15" cy="12" r="2.2" class="f"/><circle cx="8" cy="18" r="2.2" class="f"/></svg>',
  tempo:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 12l4.5-4.5"/><path d="M12 5v1.5M5 12h1.5M17.5 12H19M7 7l1 1"/></svg>',
  loop:'<svg viewBox="0 0 24 24"><path d="M17 3l3 3-3 3"/><path d="M4 12V9a3 3 0 013-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 12v3a3 3 0 01-3 3H4"/></svg>',
  hands:'<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 013 0V11M11 10V4a1.5 1.5 0 013 0v7M14 10.5V5.5a1.5 1.5 0 013 0V14c0 4-2.7 7-6.5 7S5 18.6 5 15.5V12a1.5 1.5 0 013 0"/></svg>',
  kbd:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8.2 4v16M12 4v16M15.8 4v16"/><rect x="6.6" y="4" width="3.2" height="9" rx=".6" class="f"/><rect x="14.2" y="4" width="3.2" height="9" rx=".6" class="f"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" class="f"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1.2" class="f"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" class="f"/></svg>',
  stop:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" class="f"/></svg>',
  full:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/></svg>',
  fav:'<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H18a2 2 0 012 2.3l-1.1 6A2 2 0 0117 20H7"/></svg>',
  metro:'<svg viewBox="0 0 24 24"><path d="M9 3h6l3.5 17h-13z"/><path d="M12 15l5-8"/></svg>',
  count:'<svg viewBox="0 0 24 24"><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="800" class="t">1234</text></svg>'
};
let pop=null;
function closePop(){ if(pop){ pop.remove(); pop=null; document.removeEventListener('pointerdown',popOut,true); } }
function popOut(e){ if(pop&&!pop.contains(e.target)&&!e.target.closest('.dbar-pop-btn')) closePop(); }
function openPop(btn,build){ if(pop){ const same=pop.__b===btn; closePop(); if(same) return; } pop=el('div','dbar-pop'); pop.__b=btn; build(pop);
  (btn.closest('#prRoom,#earRoom')||document.body).appendChild(pop); const r=btn.getBoundingClientRect(), host=pop.offsetParent||document.body, hr=host.getBoundingClientRect(), z=hr.width/(host.offsetWidth||hr.width)||1;
  let x=(r.left-hr.left)/z+(host.scrollLeft||0), y=(r.bottom-hr.top)/z+(host.scrollTop||0)+6; const W=host.clientWidth||innerWidth; if(x+pop.offsetWidth>W-8) x=Math.max(8,W-8-pop.offsetWidth);
  pop.style.left=x+'px'; pop.style.top=y+'px'; setTimeout(()=>document.addEventListener('pointerdown',popOut,true),0); }
const pr=()=>$('prRoom');
function prQ(s){ const r=pr(); return r&&r.querySelector(s); }
function tempoIn(){ return prQ('.p-tempo input[type=range]'); }
function loopIn(){ const ls=[...(pr()?pr().querySelectorAll('label.p-rng'):[])].find(l=>/loop/i.test(l.textContent)&&l.querySelector('input[type=checkbox]')); return ls&&ls.querySelector('input'); }
function handsBtn(){ const k=$('prKbP'); return k&&[...k.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hands'); }
function noteSel(){ const r=pr(); if(!r) return null; const L=[...r.querySelectorAll('#prDisp .p-sel')].find(x=>/^\s*note/i.test(x.textContent)); return L?L.querySelector('select'):null; }
function keyText(){ const v=prQ('.p-trs .p-trv'); if(v) return v.textContent.trim(); const s=noteSel(); if(s&&s.options[s.selectedIndex]) return s.options[s.selectedIndex].textContent.trim(); return ''; }
function setTempo(b){ const r=tempoIn(); if(!r) return; r.value=String(Math.max(+r.min||40,Math.min(+r.max||200,b))); r.dispatchEvent(new Event('input',{bubbles:true})); }
function prBar(){ const d=$('prDisp'); if(!d) return; const body=d.querySelector(':scope>.ep-body'); if(!body) return; let bar=$('prDbar');
  if(!bar){ bar=el('div','dbar'); bar.id='prDbar';
    bar.innerHTML='<div class="dbl"><button type="button" data-k="con" class="dbar-pop-btn" title="Console">'+IC.con+'</button><button type="button" data-k="tempo" class="dbar-pop-btn" title="Tempo">'+IC.tempo+'<small data-v="bpm"></small></button><button type="button" data-k="loop" title="Loop">'+IC.loop+'</button><button type="button" data-k="hands" title="Hands">'+IC.hands+'</button><button type="button" data-k="fav" title="Favourite: save this exercise to a memory bank">'+IC.fav+'</button></div>'
      +'<div class="dbm"><span class="dbt" data-v="title"></span></div>'
      +'<div class="dbr"><button type="button" data-k="key" class="dbpill dbar-pop-btn" title="Key and transpose"><span data-v="key">Key</span></button><button type="button" data-k="play" class="dbplay" title="Play">'+IC.play+'</button><button type="button" data-k="stop" title="Stop">'+IC.stop+'</button><button type="button" data-k="full" title="Full screen">'+IC.full+'</button></div>';
    body.insertBefore(bar,body.firstChild); pr().classList.add('app-dbar');
    bar.addEventListener('click',e=>{ const b=e.target.closest('button[data-k]'); if(!b) return; const k=b.dataset.k;
      if(k==='play'){ const p=$('prPlay'); if(p) p.click(); }
      else if(k==='stop'){ const p=$('prPause'); if(p&&!p.disabled) p.click(); }
      else if(k==='loop'){ const c=loopIn(); if(c){ c.checked=!c.checked; c.dispatchEvent(new Event('change',{bubbles:true})); } }
      else if(k==='hands'){ const h=handsBtn(); if(h) h.click(); }
      else if(k==='fav'){ const f=prQ('.p-fav'); if(f) f.click(); }
      else if(k==='con'){ const c=$('prConP'); if(c){ const on=c.classList.contains('ep-min'); setMin(c,!on); if(on) setTimeout(()=>{ try{ c.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(_){} },60); } }
      else if(k==='full') fullRoom(!document.fullscreenElement&&!root.classList.contains('app-fs'));
      else if(k==='tempo') openPop(b,p=>{ const r=tempoIn(); const cur=()=>+(r&&r.value||80);
        p.innerHTML='<div class="dp-h">Tempo</div><div class="dp-row"><button type="button" data-d="-10">−10</button><button type="button" data-d="-2">−</button><b class="dp-v"></b><button type="button" data-d="2">+</button><button type="button" data-d="10">+10</button></div><input type="range" class="dp-r" min="40" max="200" step="2"><div class="dp-row"><button type="button" class="dp-tap">Tap</button><span class="dp-n">BPM</span></div>';
        const v=p.querySelector('.dp-v'), rr=p.querySelector('.dp-r'), up=()=>{ v.textContent=cur(); rr.value=cur(); sync(); }; up();
        p.querySelectorAll('[data-d]').forEach(x=>x.onclick=()=>{ setTempo(cur()+(+x.dataset.d)); up(); }); rr.oninput=()=>{ setTempo(+rr.value); up(); };
        p.querySelector('.dp-tap').onclick=()=>{ const t=$('prTap'); if(t) t.click(); setTimeout(up,30); }; });
      else if(k==='key') openPop(b,p=>{ const trs=prQ('.p-trs');
        if(trs){ p.innerHTML='<div class="dp-h">Key</div><div class="dp-row"><button type="button" data-t="-">−</button><b class="dp-v"></b><button type="button" data-t="+">+</button><span class="dp-g"></span></div><div class="dp-n dp-s"></div>';
          const v=p.querySelector('.dp-v'), up=()=>{ v.textContent=keyText(); sync(); const g=p.querySelector('.dp-g'); if(g&&window.TRSTEP&&!g.firstChild) g.appendChild(TRSTEP.gear(()=>{ p.querySelector('.dp-s').textContent='Each press: '+TRSTEP.name().toLowerCase(); })); p.querySelector('.dp-s').textContent=window.TRSTEP?'Each press: '+TRSTEP.name().toLowerCase():''; }; up();
          p.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{ const bs=[...(prQ('.p-trs')||document).querySelectorAll('.p-trb')]; const t=x.dataset.t==='-'?bs[0]:bs[bs.length-1]; if(t) t.click(); setTimeout(up,40); }); }
        else { const s=noteSel(); p.innerHTML='<div class="dp-h">Key</div><div class="dp-n">Choose the note in the Display.</div>'; if(s) setTimeout(()=>{ closePop(); s.focus(); s.click(); },10); } });
      setTimeout(sync,60); setTimeout(sync,400); });
  }
  sync(); }
function sync(){ const bar=$('prDbar'); if(!bar) return; const r=pr(); const kind=r&&r.dataset.kind, styl=r&&r.dataset.styl==='1';
  const p=$('prPlay'), playing=p&&/Pause/.test(p.textContent), st=$('prPause');
  const pb=bar.querySelector('[data-k=play]'); pb.innerHTML=playing?IC.pause:IC.play; pb.title=playing?'Pause':p&&/Resume/.test(p.textContent)?'Resume':'Play'; pb.classList.toggle('on',playing);
  bar.querySelector('[data-k=stop]').disabled=!st||st.disabled;
  const t=tempoIn(); bar.querySelector('[data-v=bpm]').textContent=t?t.value:''; bar.querySelector('[data-k=tempo]').hidden=!t;
  const c=loopIn(); const lb=bar.querySelector('[data-k=loop]'); lb.hidden=!c; lb.setAttribute('aria-pressed',String(!!(c&&c.checked))); lb.title=c&&c.checked?'Loop is on':'Loop is off';
  const h=handsBtn(); const hb=bar.querySelector('[data-k=hands]'); hb.hidden=!h; hb.setAttribute('aria-pressed',String(!!(h&&h.getAttribute('aria-pressed')==='true')));
  const f=prQ('.p-fav'); const fb=bar.querySelector('[data-k=fav]'); fb.hidden=!f; fb.setAttribute('aria-pressed',String(!!(f&&f.classList.contains('on'))));
  const kt=keyText(); bar.querySelector('[data-v=key]').textContent=kt?'Key: '+kt:'Key'; bar.querySelector('[data-k=key]').hidden=!kt;
  const big=$('prBig'); bar.querySelector('[data-v=title]').textContent=big?big.textContent:'';
  const cp=$('prConP'); bar.querySelector('[data-k=con]').setAttribute('aria-pressed',String(!!(cp&&!cp.classList.contains('ep-min'))));
  const fs=!!document.fullscreenElement||root.classList.contains('app-fs'); const fu=bar.querySelector('[data-k=full]'); fu.innerHTML=fs?IC.close:IC.full; fu.title=fs?'Close full screen':'Full screen'; }
/* full screen: the browser's own where it can (and the phone turns to landscape); otherwise the room fills the window */
function fullRoom(on){ root.classList.toggle('app-fs',on);
  try{ if(on){ const t=document.documentElement; if(t.requestFullscreen&&!document.fullscreenElement) t.requestFullscreen({navigationUI:'hide'}).then(()=>{ try{ screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}); }catch(_){} }).catch(()=>{}); }
    else if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }catch(_){}
  setTimeout(()=>{ sync(); dispatchEvent(new Event('resize')); },120); }
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement) root.classList.remove('app-fs'); sync(); });

/* ---------------- tab bar (phones and tablets) ---------------- */
const TABS=[['home','Home','<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>'],
  ['class','Class','<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>'],
  ['hall','Practice','<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M12 5v14M16 5v14"/></svg>'],
  ['studio','Studio','<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V5l10-2v12"/></svg>'],
  ['challenge','Plans','<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 9h16M8 13l2.5 2.5L16 11"/></svg>']];
let tabs=null;
function tabBar(){ if(tabs) return tabs; tabs=el('nav','app-tabs'); tabs.setAttribute('aria-label','Spaces');
  TABS.forEach(([k,l,ic])=>{ const b=el('button','app-tab'); b.type='button'; b.dataset.k=k; b.innerHTML=ic+'<span></span>'; b.lastChild.textContent=l; b.setAttribute('aria-label',l);
    b.onclick=()=>{ closePop(); try{ if(window.PRACTICE&&PRACTICE.close) PRACTICE.close(); }catch(_){} try{ if(window.EAR&&EAR.close) EAR.close(); }catch(_){}
      if(!window.SUITE) return; if(k==='home') SUITE.home(); else if(k==='studio') SUITE.studios(); else SUITE.go(k); setTimeout(tabSync,80); };
    tabs.appendChild(b); }); document.body.appendChild(tabs); return tabs; }
function roomOpen(){ const a=$('prRoom'), b=$('earRoom'); return !!((a&&!a.hidden&&a.offsetParent!==null)||(b&&!b.hidden&&b.offsetParent!==null)); }
function tabSync(){ if(!app()){ if(tabs) tabs.hidden=true; root.classList.remove('app-has-tabs'); return; } tabBar();
  const hub=$('suiteHub'), onHub=!!(hub&&hub.classList.contains('on')), d=document.body.dataset.dest, rot=root.classList.contains('ps-rot');
  const kbdPage=roomOpen()||d==='studio'||d==='plus'; const land=innerWidth>innerHeight&&phone();
  const show=!rot&&!(kbdPage&&(phone()||land))&&!root.classList.contains('app-fs');
  tabs.hidden=!show; root.classList.toggle('app-has-tabs',show);
  const curK=onHub?'home':d==='hall'||(d==='class'&&window.SUITE&&SUITE.current&&SUITE.current()==='hall')?'hall':d==='plus'?'studio':d;
  tabs.querySelectorAll('.app-tab').forEach(b=>{ const on=b.dataset.k===curK; b.classList.toggle('on',on); b.setAttribute('aria-current',on?'page':'false'); }); }

/* ---------------- keep everything in step ---------------- */
let t0=0; function tick(){ clearTimeout(t0); t0=setTimeout(()=>{ scanPanels(); prBar(); tabSync(); },40); }
new MutationObserver(tick).observe(document.body,{childList:true,subtree:true}); new MutationObserver(tick).observe(document.body,{attributes:true,attributeFilter:['data-dest']});
setInterval(()=>{ if(!document.hidden){ sync(); tabSync(); } },700);
addEventListener('resize',tick); document.addEventListener('DOMContentLoaded',tick); tick();
window.APPSHELL={setMin,sync,fullRoom};
})();
