/* First-visit tour of the suite home screen. Shows once; replay with "Take the tour". */
(function(){
const KEY='ps-tour';
const STEPS=[
 {t:'Welcome to the Pokeytivity Piano Suite',b:'A quick tour of where everything is. It takes less than a minute.'},
 {sel:'.dcard[data-k=class]',t:'Class',b:'Learn with Pokey. Ask anything about chords, scales, hymns and ear training, and get practice tracks to load into the Studio.'},
 {sel:'.dcard[data-k=studio]',t:'Studio',b:'Type a chord chart, pick a style and play along with a full band. Slow it down, change the key, loop a section.'},
 {sel:'.dcard[data-k=plus]',t:'Studio+',b:'Transcription. Turn any recording into notes you can see and practice on the keyboard.'},
 {sel:'.dcard[data-k=challenge]',t:'90 Day Challenge',b:'Build a practice plan, check in every day for 90 days, and earn your certificate of consistency.'},
 {sel:'#hubTop .thbtn',t:'Theme',b:'Change the look of the whole suite. Five themes to choose from.'},
 {sel:'#hubTop .ac-av',t:'Your account',b:'Tap your photo to open your Account: your photo, name, streak and progress.'},
 {t:'Moving around',b:'Inside any room, the arrow at the top left takes you back to where you came from, and the room name at the top opens a menu to jump anywhere.'}
];
let i=0, ov, hl, card, on=false;
const css=document.createElement('style');
css.textContent=`
#psTour{position:fixed;inset:0;z-index:400000;pointer-events:none}
#psTour .hl{position:fixed;border-radius:22px;box-shadow:0 0 0 9999px rgba(3,6,14,.78),0 0 0 3px var(--hi,#ffd43b),0 0 36px 6px rgba(255,212,59,.35);transition:all .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}
#psTour .hl.none{box-shadow:0 0 0 9999px rgba(3,6,14,.78)}
#psTour .cd{position:fixed;width:min(380px,calc(100vw - 28px));padding:20px 22px 16px;border-radius:20px;background:var(--surface,#141a2c);color:var(--ink,#fff);border:1px solid var(--line,rgba(255,255,255,.2));box-shadow:0 24px 60px rgba(0,0,0,.6);pointer-events:auto;font:500 15px/1.5 var(--body,system-ui)}
#psTour .cd h3{margin:0 0 6px;font:800 21px var(--display,system-ui)}
#psTour .cd p{margin:0 0 14px;opacity:.9}
#psTour .row{display:flex;align-items:center;gap:8px}
#psTour .dots{flex:1;display:flex;gap:5px}
#psTour .dots i{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.25}
#psTour .dots i.on{opacity:1;background:var(--hi,#ffd43b)}
#psTour button{font:700 14px var(--body,system-ui);padding:9px 16px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.25));background:transparent;color:inherit;cursor:pointer}
#psTour button.pri{background:var(--hi,#ffd43b);color:var(--hi-ink,#1a1200);border-color:transparent}
#psTour button.skip{border:0;opacity:.7;padding:9px 6px}
#psTourBtn{display:block;margin:10px auto 0;padding:7px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:#d0d7e6;font:600 13px system-ui;cursor:pointer}
#psTourBtn:hover{color:var(--hi,#ffd43b);border-color:var(--hi,#ffd43b)}
@media (prefers-reduced-motion:reduce){#psTour .hl{transition:none}}
`;
document.head.appendChild(css);
function end(){ on=false; try{ localStorage.setItem(KEY,'1'); }catch(_){} if(ov) ov.remove(); ov=null; document.removeEventListener('keydown',key,true); removeEventListener('resize',place); }
function key(e){ if(!on) return; if(e.key==='Escape'){ e.preventDefault(); end(); } else if(e.key==='ArrowRight'||e.key==='Enter'){ e.preventDefault(); next(); } else if(e.key==='ArrowLeft'){ e.preventDefault(); if(i>0){ i--; show(); } } }
function next(){ if(i>=STEPS.length-1) return end(); i++; show(); }
function show(){
  const s=STEPS[i]; let el=s.sel?document.querySelector(s.sel):null;
  if(el&&!el.offsetParent&&getComputedStyle(el).position!=='fixed') el=null;
  if(el) try{ el.scrollIntoView({block:'center',inline:'center'}); }catch(_){}
  card.innerHTML='<h3></h3><p></p><div class="row"><button class="skip" type="button">Skip</button><span class="dots"></span>'+(i>0?'<button class="bk" type="button">Back</button>':'')+'<button class="pri nx" type="button"></button></div>';
  card.querySelector('h3').textContent=s.t; card.querySelector('p').textContent=s.b;
  const d=card.querySelector('.dots'); STEPS.forEach((_,n)=>{ const q=document.createElement('i'); if(n===i) q.className='on'; d.appendChild(q); });
  const nx=card.querySelector('.nx'); nx.textContent=i===STEPS.length-1?'Done':(i===0?'Start':'Next'); nx.onclick=next;
  card.querySelector('.skip').onclick=end; const bk=card.querySelector('.bk'); if(bk) bk.onclick=()=>{ i--; show(); };
  card._el=el; place(); setTimeout(place,380); nx.focus({preventScroll:true});
}
function place(){
  if(!on||!card) return; const el=card._el, W=innerWidth, H=innerHeight, cw=card.offsetWidth, ch=card.offsetHeight;
  if(el){ const r=el.getBoundingClientRect(), p=8;
    hl.className='hl'; hl.style.cssText=`left:${r.left-p}px;top:${r.top-p}px;width:${r.width+2*p}px;height:${r.height+2*p}px`;
    let x=Math.min(Math.max(14,r.left+r.width/2-cw/2),W-cw-14), y;
    if(r.bottom+p+14+ch<=H) y=r.bottom+p+14; else if(r.top-p-14-ch>=0) y=r.top-p-14-ch; else { y=H-ch-14; x=Math.min(Math.max(14,W-cw-14),W-cw-14); }
    if(r.right+p+14+cw<=W&&r.height>H*.5){ x=r.right+p+14; y=Math.max(14,Math.min(H-ch-14,r.top+20)); }
    card.style.left=x+'px'; card.style.top=y+'px';
  } else { hl.className='hl none'; hl.style.cssText='left:50%;top:50%;width:0;height:0'; card.style.left=(W-cw)/2+'px'; card.style.top=Math.max(14,(H-ch)/2)+'px'; }
}
function start(){
  const hub=document.getElementById('suiteHub'); if(!hub||!hub.classList.contains('on')||on) return;
  on=true; i=0; ov=document.createElement('div'); ov.id='psTour'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Tour of the Piano Suite');
  hl=document.createElement('div'); hl.className='hl none'; card=document.createElement('div'); card.className='cd';
  ov.appendChild(hl); ov.appendChild(card); document.body.appendChild(ov);
  document.addEventListener('keydown',key,true); addEventListener('resize',place); show();
}
function addBtn(){ const f=document.getElementById('psFoot'); if(!f||document.getElementById('psTourBtn')) return; const b=document.createElement('button'); b.type='button'; b.id='psTourBtn'; b.textContent='Take the tour'; b.onclick=()=>{ start(); }; f.after(b); }
window.TOUR={start};
function init(){ addBtn(); let seen=false; try{ seen=localStorage.getItem(KEY)==='1'; }catch(_){} if(!seen) setTimeout(start,1400); }
if(document.readyState==='complete') init(); else addEventListener('load',init);
})();
