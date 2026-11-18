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
/* the page's own height: on a phone turned sideways by rotate.js the page is turned, so its height is the window's width */
function appH(){ const rot=root.classList.contains('ps-rot'); root.style.setProperty('--appH',(rot?innerWidth:innerHeight)+'px'); root.style.setProperty('--appW',(rot?innerHeight:innerWidth)+'px'); }
setInterval(appH,600); addEventListener('resize',appH); appH();
devClass(); addEventListener('resize',devClass); addEventListener('orientationchange',()=>setTimeout(devClass,200));
const phone=()=>root.classList.contains('m-ph'), app=()=>root.classList.contains('m-app');

/* ---------------- minimise any panel ---------------- */
const MK='app-min';
const mins=()=>{ try{ return JSON.parse(localStorage.getItem(MK)||'{}')||{}; }catch(_){ return {}; } };
function setMin(p,on){ p.classList.toggle('ep-min',on); const b=p.querySelector(':scope>.ep-h .ep-mn'); if(b){ b.textContent=on?'▢':'–'; b.title=on?'Open '+(p.querySelector(':scope>.ep-h b')||{}).textContent:'Minimise'; b.setAttribute('aria-expanded',String(!on)); }
  const m=mins(); if(p.id){ m[p.id]=on; try{ localStorage.setItem(MK,JSON.stringify(m)); }catch(_){} } setTimeout(()=>dispatchEvent(new Event('resize')),30); }
function addMin(p){ if(p.__mn) return; const h=p.querySelector(':scope>.ep-h'); if(!h) return; p.__mn=true;
  const b=el('button','ep-b ep-mn','–'); b.type='button'; b.title='Minimise'; b.setAttribute('aria-label','Minimise or open this panel');
  b.onclick=e=>{ e.stopPropagation(); if(p.classList.contains('ep-sheet')){ p.classList.remove('ep-sheet'); setTimeout(syncAll,30); return; } if(p.classList.contains('max')||p.classList.contains('float')){ const x=p.querySelector(':scope>.ep-h [data-a='+(p.classList.contains('max')?'max':'det')+']'); if(x) x.click(); } setMin(p,!p.classList.contains('ep-min')); };
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
  count:'<span class="dbcnt">1 2<br>3 4</span>'
};
let pop=null;
function closePop(){ if(pop){ pop.remove(); pop=null; document.removeEventListener('pointerdown',popOut,true); } }
function popOut(e){ if(pop&&!pop.contains(e.target)&&!e.target.closest('.dbar-pop-btn')) closePop(); }
function openPop(btn,build){ if(pop){ const same=pop.__b===btn; closePop(); if(same) return; } pop=el('div','dbar-pop'); pop.__b=btn; build(pop);
  const host=btn.closest('#prRoom,#earRoom')||document.body; host.appendChild(pop);
  /* placed from the layout's own offsets, so it lands under its button even while rotate.js has the page turned sideways */
  let x=0,y=0,e=btn; while(e&&e!==host&&e!==document.body){ x+=e.offsetLeft; y+=e.offsetTop; e=e.offsetParent; }
  if(host===document.body&&e!==document.body){ x=btn.getBoundingClientRect().left; y=btn.getBoundingClientRect().top; }
  y+=btn.offsetHeight+6; const W=host.clientWidth||innerWidth; if(x+pop.offsetWidth>W-8) x=Math.max(8,W-8-pop.offsetWidth);
  pop.style.left=x+'px'; pop.style.top=y+'px'; setTimeout(()=>document.addEventListener('pointerdown',popOut,true),0); }
const pr=()=>$('prRoom');
function prQ(s){ const r=pr(); return r&&r.querySelector(s); }
function tempoIn(){ return prQ('.p-tempo input[type=range]'); }
function loopIn(){ const ls=[...(pr()?pr().querySelectorAll('label.p-rng'):[])].find(l=>/loop/i.test(l.textContent)&&l.querySelector('input[type=checkbox]')); return ls&&ls.querySelector('input'); }
function handsBtn(){ const k=$('prKbP'); return k&&[...k.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hands'); }
function noteSel(){ const r=pr(); if(!r) return null; const L=[...r.querySelectorAll('#prDisp .p-sel')].find(x=>/^\s*note/i.test(x.textContent)); return L?L.querySelector('select'):null; }
function keyText(){ const v=prQ('.p-trs .p-trr .p-trv'); if(v) return v.textContent.trim(); const s=noteSel(); if(s&&s.options[s.selectedIndex]) return s.options[s.selectedIndex].textContent.trim(); return ''; }
const fire=(x,ev)=>x&&x.dispatchEvent(new Event(ev,{bubbles:true}));
/* a tempo pop-up for any range input */
function tempoPop(p,inp,tap){ const cur=()=>+(inp&&inp.value||80), set=b=>{ if(!inp) return; inp.value=String(Math.max(+inp.min||30,Math.min(+inp.max||300,b))); fire(inp,'input'); fire(inp,'change'); };
  p.innerHTML='<div class="dp-h">Tempo</div><div class="dp-row"><button type="button" data-d="-10">−10</button><button type="button" data-d="-1">−</button><b class="dp-v"></b><button type="button" data-d="1">+</button><button type="button" data-d="10">+10</button></div><input type="range" class="dp-r"><div class="dp-row">'+(tap?'<button type="button" class="dp-tap">Tap</button>':'')+'<span class="dp-n">BPM</span></div>';
  const v=p.querySelector('.dp-v'), rr=p.querySelector('.dp-r'); rr.min=inp.min||30; rr.max=inp.max||300; rr.step=inp.step||1; const up=()=>{ v.textContent=cur(); rr.value=cur(); syncAll(); }; up();
  p.querySelectorAll('[data-d]').forEach(x=>x.onclick=()=>{ set(cur()+(+x.dataset.d)*(+(inp.step)||1)); up(); }); rr.oninput=()=>{ set(+rr.value); up(); };
  const tb=p.querySelector('.dp-tap'); if(tb) tb.onclick=()=>{ if(tap) tap(); setTimeout(up,30); }; }
/* a key pop-up: − and + (with the settings wheel for the step) */
function keyPop(p,minus,plus,txt){ p.innerHTML='<div class="dp-h">Key</div><div class="dp-row"><button type="button" data-t="-">−</button><b class="dp-v"></b><button type="button" data-t="+">+</button><span class="dp-g"></span></div><div class="dp-n dp-s"></div>';
  const v=p.querySelector('.dp-v'), sN=()=>{ p.querySelector('.dp-s').textContent=window.TRSTEP?'Each press: '+TRSTEP.name().toLowerCase():''; }, up=()=>{ v.textContent=txt(); sN(); syncAll(); };
  { const g=p.querySelector('.dp-g'); if(window.TRSTEP) g.appendChild(TRSTEP.gear(sN)); } up();
  p.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{ const b=x.dataset.t==='-'?minus():plus(); if(b) b.click(); setTimeout(up,60); }); }
/* the bars: each space says what its buttons do; the bar itself is the same everywhere */
const BARS={
  pr:{host:()=>{ const d=$('prDisp'); return d&&d.querySelector(':scope>.ep-body'); }, room:()=>pr(), cls:'app-dbar',
    title:()=>($('prBig')||{}).textContent||'',
    items:[
      {k:'con',ic:'con',t:'Console',pressed:()=>conOn('prConP'),go:()=>toggleCon('prConP')},
      {k:'tempo',ic:'tempo',t:'Tempo',hide:()=>!tempoIn(),val:()=>(tempoIn()||{}).value,pop:p=>tempoPop(p,tempoIn(),()=>{ const t=$('prTap'); if(t) t.click(); })},
      {k:'loop',ic:'loop',t:'Loop',hide:()=>!loopIn(),pressed:()=>!!(loopIn()&&loopIn().checked),go:()=>{ const c=loopIn(); c.checked=!c.checked; fire(c,'change'); }},
      {k:'hands',ic:'hands',t:'Hands',hide:()=>!handsBtn(),pressed:()=>{ const h=handsBtn(); return !!(h&&h.getAttribute('aria-pressed')==='true'); },go:()=>handsBtn().click()},
      {k:'fav',ic:'fav',t:'Favourite: save this exercise to a memory bank',hide:()=>!prQ('.p-fav'),pressed:()=>{ const f=prQ('.p-fav'); return !!(f&&f.classList.contains('on')); },go:()=>prQ('.p-fav').click()}],
    right:[
      {k:'key',pill:1,t:'Key and transpose',hide:()=>!keyText(),label:()=>(/^[+-]?\d/.test(keyText())?'Transpose: ':'Key: ')+keyText(),pop:p=>{ const row=prQ('.p-trs .p-trr'); if(row) keyPop(p,()=>row.querySelectorAll('.p-trb')[0],()=>row.querySelectorAll('.p-trb')[1],keyText); else { closePop(); const s=noteSel(); if(s){ s.focus(); s.click(); } } }},
      {k:'play',play:1,t:'Play',playing:()=>/Pause/.test(($('prPlay')||{}).textContent||''),go:()=>$('prPlay')&&$('prPlay').click()},
      {k:'stop',ic:'stop',t:'Stop',dis:()=>{ const b=$('prPause'); return !b||b.disabled; },go:()=>{ const b=$('prPause'); if(b&&!b.disabled) b.click(); }},
      {k:'full',full:1,t:'Full screen'}]},
  st:{host:()=>{ const d=$('stDisp'); return d&&d.querySelector(':scope>.ep-body'); }, room:()=>document.body.dataset.dest==='studio'?document.body:null, cls:'app-stbar',
    title:()=>{ const n=document.querySelector('#stage .stage-top .now'); return n?n.textContent.replace(/\s+/g,' ').trim():''; },
    items:[
      {k:'con',ic:'con',t:'Console',pressed:()=>conOn('stConP'),go:()=>toggleCon('stConP')},
      {k:'tempo',ic:'tempo',t:'Tempo',hide:()=>!$('bpmRange'),val:()=>($('bpmRange')||{}).value,pop:p=>tempoPop(p,$('bpmRange'),()=>{ const t=document.querySelector('.stage-tempo .tapbig,#tapBtn'); if(t) t.click(); })},
      {k:'count',ic:'count',t:'Count-in',hide:()=>!$('countBtn'),pressed:()=>($('countBtn')||{}).getAttribute&&$('countBtn').getAttribute('aria-pressed')==='true',go:()=>$('countBtn').click()},
      {k:'metro',ic:'metro',t:'Metronome',hide:()=>!$('clickBtn'),pressed:()=>($('clickBtn')||{}).getAttribute&&$('clickBtn').getAttribute('aria-pressed')==='true',go:()=>$('clickBtn').click()},
      {k:'fing',ic:'hands',t:'Fingering',hide:()=>!$('fingChk'),pressed:()=>!!($('fingChk')||{}).checked,go:()=>{ const c=$('fingChk'); c.checked=!c.checked; fire(c,'change'); }},
      {k:'size',ic:'kbd',t:'Keyboard size: 88, 76 or 61 keys',hide:()=>!document.querySelector('.kbd-bar .seg [data-k]'),val:()=>{ const b=document.querySelector('.kbd-bar .seg [aria-pressed=true],.kbd-bar .seg .on'); return b?b.dataset.k:''; },go:()=>{ const bs=[...document.querySelectorAll('.kbd-bar .seg [data-k]')]; const i=bs.findIndex(b=>b.getAttribute('aria-pressed')==='true'||b.classList.contains('on')); (bs[(i+1)%bs.length]||bs[0]).click(); }}],
    right:[
      {k:'key',pill:1,t:'Key and transpose',hide:()=>!$('keyLbl'),label:()=>{ const t=(($('keyLbl')||{}).textContent||'').replace(/original key|[+-]?\d+ semitones?/g,'').replace(/^Starts on\s*/,'').trim(); return 'Key: '+(t||'–'); },pop:p=>keyPop(p,()=>$('trDown'),()=>$('trUp'),()=>{ const t=(($('keyLbl')||{}).textContent||'').replace(/original key|[+-]?\d+ semitones?/g,'').replace(/^Starts on\s*/,'').trim(); return t||'–'; })},
      {k:'play',play:1,t:'Play',playing:()=>/pause/i.test(($('playTxt')||{}).textContent||''),go:()=>$('playBtn')&&$('playBtn').click()},
      {k:'stop',ic:'stop',t:'Stop',dis:()=>{ const b=$('stopBtn'); return !b||b.disabled; },go:()=>{ const b=$('stopBtn'); if(b&&!b.disabled) b.click(); }},
      {k:'full',full:1,t:'Full screen'}]}
};
function conOn(id){ const c=$(id); if(!c) return false; return phone()?c.classList.contains('ep-sheet'):!c.classList.contains('ep-min'); }
function toggleCon(id){ const c=$(id); if(!c) return;
  /* on a phone the Console comes up as a sheet over the lower part of the screen, with room to work; – or the button again puts it back */
  if(phone()){ const on=!c.classList.contains('ep-sheet'); c.classList.toggle('ep-sheet',on); if(on&&c.classList.contains('ep-min')) setMin(c,false); setTimeout(()=>dispatchEvent(new Event('resize')),30); return; } const on=c.classList.contains('ep-min'); setMin(c,!on); if(on) setTimeout(()=>{ try{ c.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(_){} },60); }
function btnFor(it){ const b=el('button',it.pill?'dbpill':it.play?'dbplay':''); b.type='button'; b.dataset.k=it.k; b.title=it.t; b.setAttribute('aria-label',it.t); if(it.pop) b.classList.add('dbar-pop-btn');
  b.innerHTML=it.pill?'<span></span>':it.play?IC.play:it.full?IC.full:(IC[it.ic]||'')+(it.val?'<small></small>':''); b.__it=it; return b; }
function makeBar(name){ const C=BARS[name], host=C.host(); if(!host||!C.room()) return; let bar=host.querySelector(':scope>.dbar'); if(bar) return bar;
  bar=el('div','dbar'); bar.dataset.bar=name; const L=el('div','dbl'), M=el('div','dbm'), R=el('div','dbr'); M.appendChild(el('span','dbt'));
  C.items.forEach(it=>L.appendChild(btnFor(it))); C.right.forEach(it=>R.appendChild(btnFor(it))); bar.append(L,M,R); host.insertBefore(bar,host.firstChild);
  const rm=C.room(); if(rm&&rm!==document.body) rm.classList.add(C.cls); else root.classList.add(C.cls);
  bar.addEventListener('click',e=>{ const b=e.target.closest('button[data-k]'); if(!b||!b.__it) return; const it=b.__it;
    if(it.full) fullRoom(!document.fullscreenElement&&!root.classList.contains('app-fs'));
    else if(it.pop) openPop(b,it.pop); else if(it.go) try{ it.go(); }catch(_){}
    setTimeout(syncAll,60); setTimeout(syncAll,400); });
  syncBar(bar); return bar; }
function syncBar(bar){ const C=BARS[bar.dataset.bar]; bar.querySelectorAll('button[data-k]').forEach(b=>{ const it=b.__it; let h=false; try{ h=!!(it.hide&&it.hide()); }catch(_){ h=true; } b.hidden=h; if(h) return;
    if(it.pressed) b.setAttribute('aria-pressed',String(!!it.pressed())); if(it.dis) b.disabled=!!it.dis();
    if(it.val){ const sm=b.querySelector('small'); if(sm) sm.textContent=it.val()||''; } if(it.pill) b.firstChild.textContent=it.label();
    if(it.play){ const on=!!it.playing(); b.innerHTML=on?IC.pause:IC.play; b.classList.toggle('on',on); b.title=on?'Pause':'Play'; }
    if(it.full){ const fs=!!document.fullscreenElement||root.classList.contains('app-fs'); b.innerHTML=fs?IC.close:IC.full; b.title=fs?'Close full screen':'Full screen'; } });
  const t=bar.querySelector('.dbt'); if(t) t.textContent=C.title(); }
function syncAll(){ document.querySelectorAll('.dbar[data-bar]').forEach(syncBar); }
function prBar(){ makeBar('pr'); if(document.body.dataset.dest==='studio') makeBar('st'); }
const sync=syncAll;
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
function roomOpen(){ const v=x=>!!(x&&!x.hidden&&getComputedStyle(x).display!=='none'); return v($('prRoom'))||v($('earRoom')); }
function tabSync(){ if(!app()){ if(tabs) tabs.hidden=true; root.classList.remove('app-has-tabs'); return; } tabBar();
  const hub=$('suiteHub'), onHub=!!(hub&&hub.classList.contains('on')), d=document.body.dataset.dest, rot=root.classList.contains('ps-rot');
  const kbdPage=roomOpen()||d==='studio'||d==='plus'; const land=innerWidth>innerHeight;
  const show=!rot&&!(kbdPage&&(phone()||land))&&!root.classList.contains('app-fs');
  tabs.hidden=!show; root.classList.toggle('app-has-tabs',show);
  const curK=onHub?'home':d==='hall'||(d==='class'&&window.SUITE&&SUITE.current&&SUITE.current()==='hall')?'hall':d==='plus'?'studio':d;
  tabs.querySelectorAll('.app-tab').forEach(b=>{ const on=b.dataset.k===curK; b.classList.toggle('on',on); b.setAttribute('aria-current',on?'page':'false'); }); }

/* ---------------- keep everything in step ---------------- */
let t0=0; function tick(){ clearTimeout(t0); t0=setTimeout(()=>{ scanPanels(); prBar(); tabSync(); },40); }
new MutationObserver(tick).observe(document.body,{childList:true,subtree:true}); new MutationObserver(tick).observe(document.body,{attributes:true,attributeFilter:['data-dest']});
setInterval(()=>{ if(!document.hidden){ sync(); tabSync(); } },700);
addEventListener('resize',tick); document.addEventListener('DOMContentLoaded',tick); tick();
window.APPSHELL={setMin,sync,fullRoom,toggleCon,isPhone:phone};
})();
