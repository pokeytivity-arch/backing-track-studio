/* layout3.js: the Studio and Studio+ in three parts, like the Scale room and Ear training:
   Display (what is playing, and the transport), Keyboard, Console (every control, including the menu-bar commands that work on this room).
   Each part can be detached (float, drag by its bar, resize from the corner) or expanded to fill the screen; press again to put it back.
   The pieces are moved, not rebuilt, so everything they do stays the same. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
function lpt(e){ let a=1,b=0,c=0,d=1; try{ const t=getComputedStyle(document.body).transform; if(t&&t!=='none'){ const m=new DOMMatrix(t), k=Math.hypot(m.a,m.b)||1; a=Math.round(m.a/k); b=Math.round(m.b/k); c=Math.round(m.c/k); d=Math.round(m.d/k); } }catch(_){}
  return {x:e.clientX*a+e.clientY*b,y:e.clientX*c+e.clientY*d}; }
function mk(id,title){ const p=el('section','ep ep3'); p.id=id; p.innerHTML='<div class="ep-h"><span class="ep-grip">⠿</span><b></b><span class="ep-x"></span><button type="button" class="ep-b" data-a="det" title="Detach">⧉</button><button type="button" class="ep-b" data-a="max" title="Expand">⤢</button></div><div class="ep-body"></div>'; p.querySelector('b').textContent=title;
  p.querySelectorAll('.ep-b').forEach(b=>b.onclick=()=>mode(p,b.dataset.a));
  p.querySelector('.ep-h').addEventListener('pointerdown',e=>{ if(!p.classList.contains('float')||e.target.closest('button')) return; e.preventDefault(); const q0=lpt(e), l0=p.offsetLeft, t0=p.offsetTop;
    const mv=ev=>{ const q=lpt(ev); p.style.left=(l0+q.x-q0.x)+'px'; p.style.top=Math.max(0,t0+q.y-q0.y)+'px'; };
    const up=()=>{ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); }; document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up); });
  return p; }
function mode(p,a){ const was=p.classList.contains(a==='det'?'float':'max'); p.classList.remove('float','max'); p.style.left=p.style.top=p.style.width=p.style.height='';
  if(!was){ if(a==='det'){ p.classList.add('float'); const par=p.offsetParent||document.body, W=Math.min((par.clientWidth||innerWidth)-40,Math.max(380,p.offsetWidth*.75)); p.style.width=W+'px'; p.style.left=Math.round(((par.clientWidth||innerWidth)-W)/2)+'px'; p.style.top=Math.round((par.scrollTop||scrollY)+70)+'px'; } else p.classList.add('max'); }
  p.querySelector('[data-a=det]').classList.toggle('on',p.classList.contains('float')); const mb=p.querySelector('[data-a=max]'); mb.classList.toggle('on',p.classList.contains('max')); mb.textContent=p.classList.contains('max')?'⤡':'⤢';
  setTimeout(()=>window.dispatchEvent(new Event('resize')),40); }

/* ---------- Studio ---------- */
/* the console: one channel per menu (File, Edit, View, Playback, Tools), each command a lit button; ticked commands light green */
const SKIP=new Set(['Piano Suite','Window','Help']);
function menuConsole(){ const M=(window.PSMENU&&PSMENU.studio)||[], con=el('div','s3-con');
  M.forEach(m=>{ if(m.brand||SKIP.has(m.label)) return; const ch=el('div','s3-ch'); ch.appendChild(el('div','s3-t',m.label)); const col=el('div','s3-col');
    (m.items||[]).forEach(it=>{ if(it.sep||it.head||!it.run) return; const b=el('button','s3-key'); b.type='button'; b.innerHTML='<i class="s3-led"></i><span></span>'; const lab=()=>{ try{ return String(typeof it.label==='function'?it.label():it.label).replace(/…$/,''); }catch(_){ return ''; } }; b.__lab=lab; b.lastChild.textContent=lab(); if(it.key) b.title='Shortcut: '+it.key;
      b.__it=it; b.onclick=()=>{ try{ it.run(); }catch(e){ console.log(e); } setTimeout(sync,60); setTimeout(sync,400); }; col.appendChild(b); });
    ch.appendChild(col); con.appendChild(ch); });
  return con; }
function sync(){ document.querySelectorAll('.s3-key').forEach(b=>{ const it=b.__it; let on=false, dis=false; try{ on=!!(it.check&&it.check()); }catch(_){} try{ dis=!!(it.enabled&&!it.enabled()); }catch(_){} b.classList.toggle('on',on); b.classList.toggle('chk',!!it.check); b.disabled=dis; if(typeof it.label==='function'&&b.__lab) b.lastChild.textContent=b.__lab(); }); }
let stDone=false;
function studio(){ if(stDone) return; const stage=$('stage'), kbd=$('stageKbd'); if(!stage||!kbd||!window.PSMENU) return; stDone=true;
  const dp=mk('stDisp','Display'), kp=mk('stKbP','Keyboard'), cp=mk('stConP','Console');
  stage.parentNode.insertBefore(dp,stage); dp.querySelector('.ep-body').appendChild(stage); dp.after(kp); kp.after(cp);
  kp.querySelector('.ep-body').appendChild(kbd);
  const kb=$('kbdBtn'); if(kb&&kb.getAttribute('aria-pressed')!=='true'){ try{ kb.click(); }catch(_){} }   /* the keyboard is always shown now */
  /* the tempo, sync lights, chord/scale mode and the Projector / Hum / Ask Dr. Onye buttons are console controls; the display keeps the chords, the beat lights, Play and Stop */
  const ctl=el('div','s3-ctl'), q=s=>stage.querySelector(s);
  [q('.stage-tempo:not(.stage-sync)'),q('.stage-sync'),$('smSeg'),$('smInfo')].forEach(x=>{ if(x) ctl.appendChild(x); });
  const row=el('div','s3-row'); ['projBtn','humJump','askClassBtn'].forEach(id=>{ const b=$(id); if(b) row.appendChild(b); }); ctl.appendChild(row);
  const tm=q('.top-mid'); if(tm) tm.remove();
  cp.querySelector('.ep-body').append(ctl,menuConsole()); sync(); fit(); window.addEventListener('resize',fit); setInterval(()=>{ if(document.body.dataset.dest==='studio'&&!document.hidden) sync(); },1500);
}

/* the display and keyboard fit on the screen together without scrolling: the chord name shrinks until they do */
let fitT=0; function fit(){ clearTimeout(fitT); fitT=setTimeout(()=>{ const dp=$('stDisp'), kp=$('stKbP'); if(!dp||!kp||document.body.dataset.dest!=='studio'||dp.classList.contains('float')||dp.classList.contains('max')) return;
  const bot=()=>kp.getBoundingClientRect().bottom+(window.scrollY||0); let f=104, g=0; dp.style.setProperty('--s3now',f+'px');
  while(g++<14&&bot()>window.innerHeight-8&&f>50){ f-=6; dp.style.setProperty('--s3now',f+'px'); } },80); }
new MutationObserver(()=>fit()).observe(document.body,{attributes:true,attributeFilter:['data-dest']});
/* ---------- Studio+ ---------- */
let txDone=false;
function plus(){ if(txDone) return; const card=$('txCard'), top=card&&card.querySelector('.txtop'), stg=card&&card.querySelector('.txstage'), menu=$('txMenu'); if(!card||!top||!stg||!menu) return; txDone=true;
  const tr=stg.nextElementSibling&&stg.nextElementSibling.classList.contains('txrow')?stg.nextElementSibling:null, msg=$('txMsg');
  /* the display and the keyboard are one: the coloured notes fall straight into the keys */
  const dp=mk('txDispP','Display and keyboard'), cp=mk('txConP','Console');
  top.parentNode.insertBefore(dp,top); const db=dp.querySelector('.ep-body'); db.append(top); if(msg) db.append(msg); db.append(stg); if(tr) db.append(tr);
  dp.after(cp); const cb=cp.querySelector('.ep-body'); const seg=$('txKbSeg');
  if(seg){ const r=el('div','tx3-kb'); r.appendChild(el('span','s3-t','Keyboard')); r.appendChild(seg); cb.appendChild(r); }
  menu.classList.add('tx3'); menu.setAttribute('aria-hidden','false'); cb.appendChild(menu);
  window.dispatchEvent(new Event('resize'));
}

const css=el('style'); css.textContent=`
body:not([data-dest="studio"]) #stDisp,body:not([data-dest="studio"]) #stKbP,body:not([data-dest="studio"]) #stConP{display:none!important}
.ep3{margin:0 0 14px} #stDisp>.ep-body{padding:0} #stDisp #stage{margin:0;border-radius:0 0 16px 16px} #stDisp .ep-h,#txDispP .ep-h{color:#3dff6e}
#kbdBtn{display:none!important}
#stDisp .tip,#stDisp .room-back{display:none!important}
#stDisp .stage{gap:12px;padding:16px 22px 18px} #stDisp .stage-top{grid-template-columns:minmax(0,1fr) auto;align-items:start}
#stDisp .now{font-size:var(--s3now,104px)} #stDisp .next{font-size:clamp(20px,calc(var(--s3now,104px)*.34),36px)}
#stDisp .beats{justify-content:center} #stDisp .beats:not(.many) i{width:clamp(36px,calc(var(--s3now,104px)*.56),58px);height:clamp(36px,calc(var(--s3now,104px)*.56),58px)} #stDisp .chart{justify-content:flex-start} #stDisp .chart>.bar:first-child{margin-left:auto} #stDisp .chart>.bar:last-child{margin-right:auto}
#stDisp .transport{justify-content:center} #stDisp .corner-tools{position:static;justify-content:flex-end} #stDisp .meter{gap:4px} #stDisp .bpmbig{font-size:clamp(26px,calc(var(--s3now,104px)*.42),44px)}
.s3-ctl{display:flex;flex-direction:column;gap:12px;padding:0 12px 16px;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08)}
.s3-ctl .stage-tempo{justify-content:flex-start;flex-wrap:wrap} .s3-ctl .stage-tempo label{min-width:110px} .s3-ctl .stage-tempo input[type=range]{max-width:none}
.s3-ctl #smSeg{align-self:flex-start} .s3-row{display:flex;gap:10px;flex-wrap:wrap} #stKbP #stageKbd{display:block!important;margin:0} #stKbP .kbd-bar>span:first-child{visibility:hidden}
.s3-con{display:flex;flex-wrap:wrap;gap:10px 0;align-items:flex-start}
.s3-ch{display:flex;flex-direction:column;gap:8px;padding:0 12px;border-right:1px solid rgba(255,255,255,.08);flex:1 1 180px;min-width:0} .s3-ch:last-child{border-right:0}
.s3-t{font:800 10px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#8d97b0}
.s3-col{display:flex;flex-direction:column;gap:6px}
.s3-key{display:flex;align-items:center;gap:8px;min-height:32px;padding:4px 12px 4px 9px;border-radius:6px;border:1px solid #070910;background:linear-gradient(180deg,#2a3042,#1a1f2c);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 2px 3px rgba(0,0,0,.55);color:#c9cfdd;font:700 13px var(--body);text-align:left;cursor:pointer}
.s3-key:hover:not(:disabled){color:#fff} .s3-key:active:not(:disabled){transform:translateY(1px)} .s3-key:disabled{opacity:.38;cursor:not-allowed}
.s3-led{flex:none;width:8px;height:8px;border-radius:50%;background:#1e2433;box-shadow:inset 0 1px 1px rgba(0,0,0,.8)} .s3-key.chk .s3-led{background:#123018}
.s3-key.on{color:#eafff0} .s3-key.on .s3-led{background:#3dff6e;box-shadow:0 0 6px 1px rgba(61,255,110,.85)}
.ep3.max .s3-key{min-height:42px;font-size:15px}
/* Studio+: the menu becomes the console, always open */
#txCard{overflow:auto!important} #txCard .txmenu.tx3{position:static!important;transform:none!important;visibility:visible!important;width:auto!important;box-shadow:none!important;border:0!important;padding:0!important;background:none!important;display:block!important}
#txCard .txmenu.tx3 .txmh,#txMenuBtn,#txMenuX{display:none!important}
#txCard .ep3{flex:none} .tx3-kb{display:flex;align-items:center;gap:14px;padding:0 4px 14px;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}
#txDispP .txstage{overflow:hidden} #txDispP .txtop:has(#txTitle:empty){display:none}
#txCard .ep.max{position:fixed;inset:44px 10px 10px}
`;
document.head.appendChild(css);
function ready(n){ studio(); plus(); if((!stDone||!txDone)&&n<120) setTimeout(()=>ready(n+1),100); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>ready(0)); else ready(0);
})();
