/* Piano Suite: one home with three destinations.
   Class with Coach  = the coach, full size
   Studio            = backing tracks
   Studio+           = transcription
   Remembers the last destination, and the Window menu switches between them. */
(function(){
'use strict';
const KEY='ps-dest';
const DEST={
  class:{name:'Class with Coach',icon:'🎓',blurb:'Learn with Onyemachi Chuku. Ask anything about chords, scales, hymns and ear training, and get practice tracks to load into the Studio.',panel:'teacher'},
  studio:{name:'Studio',icon:'🎹',blurb:'Type a chord chart, pick a style and play along with a full band. Slow it down, change the key, loop a section.',panel:null},
  plus:{name:'Studio+',icon:'🎧',blurb:'Transcription. Bring in a recording or play into the microphone and see the notes fall onto the keys.',panel:'transcribe'}
};
const ORDER=['class','studio','plus'];
const get=()=>{ try{ const v=localStorage.getItem(KEY); return DEST[v]?v:null; }catch(_){ return null; } };
const put=v=>{ try{ localStorage.setItem(KEY,v); }catch(_){} };
let cur=null;

const css=document.createElement('style'); css.textContent=`
#suiteHub{position:fixed;inset:0;z-index:300;display:none;overflow:auto;background:radial-gradient(1200px 600px at 50% -10%,color-mix(in srgb,var(--accent) 30%,#0a0e17),#0a0e17 70%);color:#e6eaf2;font-family:var(--body)}
#suiteHub.on{display:block}
#suiteHub .in{max-width:1040px;margin:0 auto;padding:7vh 20px 40px;text-align:center}
#suiteHub h1{font:800 clamp(34px,6vw,56px)/1.05 var(--display,var(--body));margin:0 0 10px;letter-spacing:-.02em}
#suiteHub .sub{font-size:clamp(15px,2vw,18px);color:#b4bdd0;margin:0 auto 34px;max-width:620px}
#suiteHub .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;text-align:left}
#suiteHub .dcard{position:relative;display:flex;flex-direction:column;gap:10px;padding:26px 24px 22px;border-radius:20px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:inherit;font:inherit;cursor:pointer;text-align:left;transition:transform .15s,background .15s,border-color .15s}
#suiteHub .dcard:hover,#suiteHub .dcard:focus-visible{transform:translateY(-3px);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.35);outline:none}
#suiteHub .dcard .ic{font-size:38px;line-height:1}
#suiteHub .dcard .nm{font:700 24px var(--display,var(--body))}
#suiteHub .dcard .bl{font-size:14.5px;line-height:1.5;color:#b4bdd0;flex:1}
#suiteHub .dcard .go{font-weight:700;color:var(--hi,#ffd43b)}
#suiteHub .dcard.last{border-color:var(--hi,#ffd43b);background:rgba(255,212,59,.09)}
#suiteHub .badge{position:absolute;top:14px;right:14px;font:700 11px var(--body);letter-spacing:.04em;text-transform:uppercase;background:var(--hi,#ffd43b);color:#151b28;padding:4px 9px;border-radius:999px}
#suiteHub .foot{margin-top:30px;font-size:13px;color:#8d98ae}
#suiteHub .back{margin-top:18px;background:transparent;border:1px solid rgba(255,255,255,.25);color:#e6eaf2;font:600 14px var(--body);padding:9px 16px;border-radius:999px;cursor:pointer}
.ps-chip{border:1px solid color-mix(in srgb,var(--accent) 45%,transparent)!important;background:color-mix(in srgb,var(--accent) 12%,transparent)!important;color:var(--accent)!important;font-weight:700!important;border-radius:999px!important;padding:3px 12px!important;margin-left:6px}
/* destinations other than the Studio hide the chord stage and show one big window */
body[data-dest="class"] header.top,body[data-dest="class"] #stage,body[data-dest="plus"] header.top,body[data-dest="plus"] #stage{display:none}
body[data-dest="class"] .card[data-panel="teacher"].panel-active,
body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{position:fixed!important;left:max(8px,calc(50% - 480px))!important;top:46px!important;width:min(960px,calc(100vw - 16px))!important;height:calc(100vh - 56px)!important;resize:none!important;border-radius:14px}
body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{left:max(8px,calc(50% - 520px))!important;width:min(1040px,calc(100vw - 16px))!important}
body[data-dest="class"] .card[data-panel="teacher"] .panel-bar .panel-btn,
body[data-dest="plus"] .card[data-panel="transcribe"] .panel-bar .panel-btn{display:none}
body[data-dest="class"] .card[data-panel="teacher"] .panel-bar,body[data-dest="plus"] .card[data-panel="transcribe"] .panel-bar{cursor:default}
body[data-dest="plus"] .tx canvas{height:clamp(200px,32vh,360px)}
#psMini{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:120;display:none;gap:8px;align-items:center;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:6px 8px 6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.28);font:600 13px var(--body)}
body[data-dest="class"] #psMini{display:flex}
#psMini button{border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 13px var(--body);padding:6px 12px;border-radius:999px;cursor:pointer}
#psMini button.pri{background:var(--hi,#ffd43b);color:#151b28;border-color:transparent}
@media(max-width:700px){body[data-dest="class"] .card[data-panel="teacher"].panel-active,body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{left:0!important;top:40px!important;width:100vw!important;height:calc(100vh - 40px)!important;border-radius:0}#psMini{bottom:8px}}
`; document.head.appendChild(css);

/* ---------- the home screen ---------- */
const hub=document.createElement('div'); hub.id='suiteHub'; hub.setAttribute('role','dialog'); hub.setAttribute('aria-label','Piano Suite home');
hub.innerHTML='<div class="in"><h1>Piano Suite</h1><p class="sub">Learn with the coach, practice with a full band, and transcribe what you hear. Choose where you want to go.</p><div class="cards" id="psCards"></div><div class="foot" id="psFoot"></div><button class="back" id="psBack" hidden>Back to where I was</button></div>';
document.body.appendChild(hub);
function renderHub(){
  const last=get(), box=document.getElementById('psCards'); box.textContent='';
  ORDER.forEach(k=>{ const d=DEST[k], b=document.createElement('button'); b.type='button'; b.className='dcard'+(k===last?' last':'');
    b.innerHTML=(k===last?'<span class="badge">Continue where you left off</span>':'')+'<div class="ic"></div><div class="nm"></div><div class="bl"></div><div class="go"></div>';
    b.querySelector('.ic').textContent=d.icon; b.querySelector('.nm').textContent=d.name; b.querySelector('.bl').textContent=d.blurb; b.querySelector('.go').textContent=(k===last?'Continue':'Open')+' →';
    b.onclick=()=>go(k); box.appendChild(b); });
  document.getElementById('psFoot').textContent=last?'Your last place is saved on this device.':'You can switch any time from the Window menu.';
  const back=document.getElementById('psBack'); back.hidden=!cur; back.onclick=()=>go(cur);
}
function showHub(){ renderHub(); hub.classList.add('on'); document.body.style.overflow='hidden'; const f=hub.querySelector('.dcard.last')||hub.querySelector('.dcard'); if(f) f.focus({preventScroll:true}); }
function hideHub(){ hub.classList.remove('on'); document.body.style.overflow=''; }

/* ---------- moving between destinations ---------- */
function stopEverything(){ try{ if(typeof playing!=='undefined'&&(playing||paused)&&typeof stop==='function') stop(); }catch(_){} try{ if(window.TX&&TX.S&&TX.S.playing) document.getElementById('txPlay').click(); }catch(_){} }
function go(k){
  if(!DEST[k]) return; const prev=cur; hideHub(); if(prev&&prev!==k) stopEverything();
  cur=k; put(k); document.body.dataset.dest=k;
  ['teacher','transcribe'].forEach(p=>{ try{ closePanel(p); }catch(_){} });
  if(k==='class'){ openPanel('teacher'); setTimeout(()=>{ const i=document.getElementById('tInput'); if(i) i.focus({preventScroll:true}); },80); }
  else if(k==='plus'){ openPanel('transcribe'); if(window.TX&&TX.restoreLast) TX.restoreLast(); }
  else { try{ closePanel(); }catch(_){} window.scrollTo(0,0); }
  chip(); window.dispatchEvent(new Event('resize'));
}
function chip(){ const c=document.getElementById('psChip'); if(c) c.textContent=DEST[cur]?DEST[cur].name+' ▾':'Piano Suite ▾'; }
function addChip(){
  const mb=document.querySelector('.menubar'); if(!mb||document.getElementById('psChip')) return;
  const c=document.createElement('button'); c.id='psChip'; c.type='button'; c.className='menu-btn ps-chip'; c.title='Piano Suite home'; c.onclick=showHub;
  const br=mb.querySelector('.brand'); if(br&&br.nextSibling) mb.insertBefore(c,br.nextSibling); else mb.appendChild(c); chip();
}
function mini(){
  const m=document.createElement('div'); m.id='psMini'; m.innerHTML='<span>Practice track</span><button class="pri" id="psMPlay">▶ Play</button><button id="psMStop">■ Stop</button><button id="psMOpen">Open in Studio</button>'; document.body.appendChild(m);
  const play=document.getElementById('playBtn'), stopb=document.getElementById('stopBtn');
  document.getElementById('psMPlay').onclick=()=>play&&play.click(); document.getElementById('psMStop').onclick=()=>{ if(stopb&&!stopb.disabled) stopb.click(); }; document.getElementById('psMOpen').onclick=()=>go('studio');
  setInterval(()=>{ const t=document.getElementById('playTxt'); const b=document.getElementById('psMPlay'); if(t&&b) b.textContent=(/pause/i.test(t.textContent)?'❚❚ ':'▶ ')+t.textContent; },400);
}

window.SUITE={go,home:showHub,current:()=>cur,DEST,ORDER};

function boot(){
  addChip(); mini();
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&hub.classList.contains('on')&&cur){ e.preventDefault(); go(cur); } },true);
  const last=get(); if(last){ cur=null; document.body.dataset.dest=last; }
  showHub();
}
// the menu bar is built by the main script on load; wait for it
function ready(n){ if(document.querySelector('.menubar')&&typeof openPanel==='function'&&document.querySelector('[data-panel="teacher"]')) boot(); else if(n<80) setTimeout(()=>ready(n+1),50); else boot(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>ready(0)); else ready(0);
})();
