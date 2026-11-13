/* Piano Suite: one home with three destinations.
   Class = the coach with whiteboard, keyboard and chat
   Studio            = backing tracks
   Studio+           = transcription
   Remembers the last destination, and the Window menu switches between them. */
(function(){
'use strict';
const KEY='ps-dest';
const DEST={
  class:{name:'Class',icon:'🎓',blurb:'Learn with Pokey. Ask anything about chords, scales, hymns and ear training, and get practice tracks to load into the Studio.',panel:'teacher'},
  studio:{name:'Studio',icon:'🎹',blurb:'Type a chord chart, pick a style and play along with a full band. Slow it down, change the key, loop a section.',panel:null},
  plus:{name:'Studio+',icon:'🎧',blurb:'Transcription. Bring in a recording or play into the microphone and see the notes fall onto the keys.',panel:'transcribe'}
};
const ORDER=['class','studio','plus'];
const get=()=>{ try{ const v=localStorage.getItem(KEY); return DEST[v]?v:null; }catch(_){ return null; } };
const put=v=>{ try{ localStorage.setItem(KEY,v); }catch(_){} };
let cur=null;

const css=document.createElement('style'); css.textContent=`
#suiteHub{position:fixed;inset:0;z-index:200000;display:none;overflow:auto;background:radial-gradient(1200px 600px at 50% -10%,color-mix(in srgb,var(--accent) 30%,#0a0e17),#0a0e17 70%);color:#e6eaf2;font-family:var(--body)}
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
/* Class with Coach and Studio+ use the Studio's dark stage look: same fonts, colours, pill buttons */
body[data-dest="class"] header.top,body[data-dest="class"] #stage,body[data-dest="plus"] header.top,body[data-dest="plus"] #stage{display:none}
body[data-dest="class"] .card[data-panel="teacher"].panel-active,
body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{position:fixed!important;left:max(12px,calc(50% - 590px))!important;top:48px!important;width:min(1180px,calc(100vw - 24px))!important;height:calc(100vh - 60px)!important;resize:none!important;border-radius:18px;background:var(--stage)!important;color:var(--stage-ink);border:0;padding:clamp(16px,3vw,28px)!important;overflow:auto;box-shadow:none;display:flex;flex-direction:column;gap:12px}
body[data-dest="class"] .card[data-panel="teacher"] .panel-bar,body[data-dest="plus"] .card[data-panel="transcribe"] .panel-bar,
body[data-dest="class"] .card[data-panel="teacher"] .card-h,body[data-dest="plus"] .card[data-panel="transcribe"] .card-h{display:none}
.ps-head{display:none}
body[data-dest="class"] .card[data-panel="teacher"] .ps-head,body[data-dest="plus"] .card[data-panel="transcribe"] .ps-head{display:block}
.ps-head .lbl{display:block;margin-bottom:2px}
.ps-head h1{font:800 clamp(30px,5vw,52px)/1 var(--display);letter-spacing:-.02em;margin:0;color:var(--stage-ink)}
.ps-head p{margin:6px 0 0;color:var(--stage-muted);font-size:14px}
body[data-dest="class"] .teacher,body[data-dest="plus"] .tx{--ink:var(--stage-ink);--muted:var(--stage-muted);--line:#34446c;--bg:var(--stage-2);--surface:var(--stage-2)}
body[data-dest="class"] .teacher .help,body[data-dest="plus"] .tx .help{color:var(--stage-muted)}
/* buttons: the Studio's outlined pills, yellow for the main action */
body[data-dest="class"] .teacher .btn,body[data-dest="plus"] .tx .btn,body[data-dest="class"] .t-chips .chip{background:transparent;border:1.5px solid #3a4a74;color:var(--stage-ink);border-radius:999px;padding:8px 14px;font-weight:500;font-size:14px;box-shadow:none}
body[data-dest="class"] .teacher .btn:hover,body[data-dest="plus"] .tx .btn:hover:not(:disabled),body[data-dest="class"] .t-chips .chip:hover{background:var(--stage-2);border-color:var(--hi);color:var(--hi)}
body[data-dest="class"] .teacher .btn.pri,body[data-dest="plus"] .tx .btn.pri{background:var(--hi);color:var(--hi-ink);border:0;font:800 16px var(--display);padding:11px 22px}
body[data-dest="class"] .teacher .btn.pri:hover,body[data-dest="plus"] .tx .btn.pri:hover:not(:disabled){background:var(--hi);color:var(--hi-ink);filter:brightness(1.06)}
body[data-dest="plus"] .tx .btn:disabled{opacity:.4}
body[data-dest="plus"] .tx .btn.rec{border-color:#ff5a64;color:#ff8a92}
body[data-dest="plus"] .tx .btn.on{background:#ff5a64;color:#fff;border-color:#ff5a64}
/* fields */
body[data-dest="class"] .teacher select,body[data-dest="class"] .teacher textarea,body[data-dest="plus"] .tx select,body[data-dest="plus"] .tx input[type=number]{background:var(--stage-2);color:var(--stage-ink);border:1.5px solid #34446c;border-radius:8px;padding:7px 10px}
body[data-dest="class"] .teacher textarea{font-family:var(--body);font-size:16px}
body[data-dest="class"] .teacher textarea::placeholder{color:var(--stage-muted)}
body[data-dest="class"] .t-opts label,body[data-dest="class"] .t-chk,body[data-dest="plus"] .tx .txrow label{font:700 12px var(--body);color:var(--stage-muted);text-transform:uppercase;letter-spacing:.08em}
body[data-dest="plus"] .tx .txrow label.check,body[data-dest="class"] .t-chk{text-transform:none;letter-spacing:0;font-weight:500;font-size:14px;color:var(--stage-ink)}
body[data-dest="plus"] .tx input[type=range],body[data-dest="plus"] .tx #txSeek{accent-color:var(--hi)}
/* the conversation */
body[data-dest="class"] .t-log{flex:1}
body[data-dest="class"] .t-msg{font-size:16px;line-height:1.55}
body[data-dest="class"] .t-msg.bot{background:var(--stage-2);border:0;color:var(--stage-ink)}
body[data-dest="class"] .t-msg.user{background:var(--hi);color:var(--hi-ink);font-weight:500}
body[data-dest="class"] .t-msg.err{border-color:#ff6f79;color:#ff8a92}
body[data-dest="class"] .t-load{background:var(--hi);color:var(--hi-ink);border-radius:999px;font-family:var(--display);font-weight:800;padding:8px 16px}
body[data-dest="class"] .t-copy{color:var(--stage-muted);border-color:#34446c}
body[data-dest="class"] .t-form{margin-top:auto}
body[data-dest="plus"] .tx #txTitle{font:700 14px var(--display);color:var(--stage-ink)}
body[data-dest="plus"] .tx canvas{height:clamp(320px,56vh,640px);border-radius:12px}
body[data-dest="plus"] .tx .txitem{border-top-color:#34446c;color:var(--stage-ink)}
body[data-dest="plus"] .tx h3{color:var(--stage-muted);text-transform:uppercase;letter-spacing:.12em;font:600 12px var(--body)!important}
body[data-dest="plus"] .tx .help{color:var(--stage-muted)}
#psMini{position:fixed;right:28px;bottom:22px;z-index:120;display:none;gap:8px;align-items:center;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:6px 8px 6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.28);font:600 13px var(--body)}
body[data-dest="class"] #psMini{display:flex}
#psMini button{border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 13px var(--body);padding:6px 12px;border-radius:999px;cursor:pointer}
#psMini button.pri{background:var(--hi,#ffd43b);color:#151b28;border-color:transparent}
@media(max-width:700px){body[data-dest="class"] .card[data-panel="teacher"].panel-active,body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{left:0!important;top:40px!important;width:100vw!important;height:calc(100vh - 40px)!important;border-radius:0}#psMini{right:10px;bottom:10px}}
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

function heads(){
  [['teacher','Class','Class','Ask anything. Learn by ear and by understanding.'],['transcribe','Studio+','Transcription','Turn any recording into notes you can see and practice.']].forEach(([p,lbl,t,sub])=>{
    const c=document.querySelector('[data-panel="'+p+'"]'); if(!c||c.querySelector('.ps-head')) return;
    const d=document.createElement('div'); d.className='ps-head'; d.innerHTML='<span class="lbl"></span><h1></h1><p></p>'; d.querySelector('.lbl').textContent=lbl; d.querySelector('h1').textContent=t; d.querySelector('p').textContent=sub;
    const bar=c.querySelector('.panel-bar'); if(bar) bar.after(d); else c.prepend(d); });
}
window.SUITE={go,home:showHub,current:()=>cur,DEST,ORDER};


/* ---------- clear buttons + clear after an hour away ---------- */
const HOUR=3600e3, ACT='ps-active';
function busyPlaying(){ try{ return (typeof playing!=='undefined'&&playing)||(window.TX&&TX.S&&TX.S.playing); }catch(_){ return false; } }
function clearRoom(k,auto){
  try{
    if(k==='class'){ if(window.CLASS) CLASS.clearAll(auto); }
    else if(k==='plus'){ if(window.TX){ if(auto||!(TX.S.notes||[]).length||confirm('Clear the keyboard? Your saved transcriptions stay in the list below.')) TX.clear(); } }
    else if(typeof newTrack==='function') newTrack(auto?true:undefined);
  }catch(e){ console.log('clear',e); }
}
function clearEverything(){ ['class','plus','studio'].forEach(k=>clearRoom(k,true)); }
function idleCheck(){
  let last=0; try{ last=+localStorage.getItem(ACT)||0; }catch(_){}
  if(last&&Date.now()-last>HOUR&&!busyPlaying()){ clearEverything(); try{ localStorage.setItem(ACT,String(Date.now())); }catch(_){} }
}
function touchActive(){ try{ localStorage.setItem(ACT,String(Date.now())); }catch(_){} }
function addClear(){
  const mb=document.querySelector('.menubar'); if(!mb||document.getElementById('psClear')) return;
  const b=document.createElement('button'); b.id='psClear'; b.type='button'; b.className='menu-btn ps-clear'; b.textContent='Clear'; b.title='Clear this room (Class: board, keyboard and chat)';
  b.onclick=()=>clearRoom(cur||'studio',false); const chipEl=document.getElementById('psChip'); if(chipEl) chipEl.after(b); else mb.appendChild(b);
}

function boot(){
  addChip(); addClear(); mini(); heads();
  const first=()=>setTimeout(()=>{ idleCheck(); touchActive(); },400); if(document.readyState==='complete') first(); else window.addEventListener('load',first);
  let lt=0; ['pointerdown','keydown','touchstart','input'].forEach(ev=>document.addEventListener(ev,()=>{ const n=Date.now(); if(n-lt>20000){ lt=n; touchActive(); } },true));
  setInterval(()=>{ if(busyPlaying()) touchActive(); else idleCheck(); },60000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) idleCheck(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&hub.classList.contains('on')&&cur){ e.preventDefault(); go(cur); } },true);
  const last=get(); if(last){ cur=null; document.body.dataset.dest=last; }
  showHub();
}
// the menu bar is built by the main script on load; wait for it
function ready(n){ if(document.querySelector('.menubar')&&typeof openPanel==='function'&&document.querySelector('[data-panel="teacher"]')) boot(); else if(n<80) setTimeout(()=>ready(n+1),50); else boot(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>ready(0)); else ready(0);
})();
