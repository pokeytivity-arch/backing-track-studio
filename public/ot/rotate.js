/* Keyboard screens on an upright phone are laid out sideways (a landscape layout turned 90 degrees),
   so the keys are wide and big without asking the person to do anything. Turn the phone and it switches to normal landscape. */
(function(){
'use strict';
const mq=matchMedia('(max-width:700px) and (orientation:portrait) and (pointer:coarse)');
const IDS=['earKb','prKb','stageKbd','clKbdWrap','gkb','scKeys'];
const root=document.documentElement;
function vis(el){ if(!el) return false; if(el.closest('[hidden]')) return false; return el.offsetWidth>40&&el.offsetHeight>10&&getComputedStyle(el).visibility!=='hidden'; }
function which(){
  const d=document.body.dataset.dest; if(d==='challenge'||d==='account') return null;
  for(const id of IDS){ if(id==='stageKbd'&&d!=='studio') continue; const el=document.getElementById(id); if(vis(el)) return id; }
  if(document.body.dataset.dest==='plus'&&vis(document.getElementById('txCard'))) return 'plus';
  return null;
}
function stretch(){ if(!root.classList.contains('ps-rot')) return; document.querySelectorAll('.e-kb svg.kbd').forEach(v=>{ if(v.getAttribute('preserveAspectRatio')!=='none') v.setAttribute('preserveAspectRatio','none'); }); }
function check(){ const hub=document.getElementById('suiteHub'); root.classList.toggle('ps-rot',mq.matches&&!(hub&&hub.classList.contains('on'))&&!!which()); stretch(); }
mq.addEventListener?mq.addEventListener('change',check):mq.addListener(check);
window.addEventListener('orientationchange',()=>setTimeout(check,250));
setInterval(check,500);
/* A redrawn keyboard gets its stretch right away (before paint), so it never flashes at the wrong size while a scale plays */
try{ new MutationObserver(stretch).observe(document.body,{childList:true,subtree:true}); }catch(_){}
/* A phone's own drop-down list never turns with the page, so while a page is sideways every <select> opens our own list inside the turned page */
let menu=null, lastOpen=0;
function closeMenu(){ if(menu){ menu.remove(); menu=null; } }
function openMenu(sel){
  if(menu||Date.now()-lastOpen<350) return; lastOpen=Date.now();
  const m=document.createElement('div'); m.className='ps-menu'; const sh=document.createElement('div'); sh.className='ps-sheet';
  const t=document.createElement('div'); t.className='ps-t'; t.textContent=sel.getAttribute('aria-label')||(sel.closest('label')&&sel.closest('label').textContent.trim())||'Choose'; const l=document.createElement('div'); l.className='ps-l'; l.setAttribute('role','listbox');
  const add=o=>{ const b=document.createElement('button'); b.type='button'; b.setAttribute('role','option'); b.setAttribute('aria-selected',String(o.selected)); b.textContent=o.textContent; b.disabled=o.disabled; b.onclick=e=>{ e.stopPropagation(); sel.value=o.value; closeMenu(); sel.dispatchEvent(new Event('input',{bubbles:true})); sel.dispatchEvent(new Event('change',{bubbles:true})); }; l.appendChild(b); return b; };
  let sb=null; [...sel.children].forEach(c=>{ if(c.tagName==='OPTGROUP'){ const g=document.createElement('div'); g.className='ps-g'; g.textContent=c.label; l.appendChild(g); [...c.children].forEach(o=>{ const b=add(o); if(o.selected) sb=b; }); } else { const b=add(c); if(c.selected) sb=b; } });
  sh.append(t,l); m.appendChild(sh); m.onclick=closeMenu; document.body.appendChild(m); menu=m; if(sb) sb.scrollIntoView({block:'center'});
}
const turned=()=>root.classList.contains('ps-rot');
const onSel=e=>{ const s=e.target&&e.target.closest&&e.target.closest('select'); return s&&turned()&&!menu?s:null; };
['mousedown','pointerdown','touchstart'].forEach(ev=>document.addEventListener(ev,e=>{ if(onSel(e)&&e.cancelable) e.preventDefault(); },{capture:true,passive:false}));
document.addEventListener('touchend',e=>{ const s=onSel(e); if(s){ if(e.cancelable) e.preventDefault(); openMenu(s); } },{capture:true,passive:false});
document.addEventListener('click',e=>{ const s=onSel(e); if(s){ e.preventDefault(); e.stopPropagation(); openMenu(s); } },true);
document.addEventListener('keydown',e=>{ if(menu&&e.key==='Escape'){ closeMenu(); return; } const s=e.target&&e.target.tagName==='SELECT'&&turned()?e.target:null; if(s&&(e.key==='Enter'||e.key===' '||e.key==='ArrowDown')){ e.preventDefault(); openMenu(s); } },true);
try{ new MutationObserver(()=>{ if(menu&&!turned()) closeMenu(); }).observe(root,{attributes:true,attributeFilter:['class']}); }catch(_){}
})();
