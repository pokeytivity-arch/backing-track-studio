/* Keyboard screens on an upright phone are laid out sideways (a landscape layout turned 90 degrees),
   so the keys are wide and big without asking the person to do anything. Turn the phone and it switches to normal landscape. */
(function(){
'use strict';
const mq=matchMedia('(max-width:700px) and (orientation:portrait) and (pointer:coarse)');
const IDS=['earKb','prKb','stageKbd','clKbdWrap','gkb','scKeys'];
const root=document.documentElement;
function vis(el){ if(!el) return false; if(el.closest('[hidden]')) return false; return el.offsetWidth>40&&el.offsetHeight>10&&getComputedStyle(el).visibility!=='hidden'; }
function which(){
  for(const id of IDS){ const el=document.getElementById(id); if(vis(el)) return id; }
  if(document.body.dataset.dest==='plus'&&vis(document.getElementById('txCard'))) return 'plus';
  return null;
}
function check(){ root.classList.toggle('ps-rot',mq.matches&&!!which()); }
mq.addEventListener?mq.addEventListener('change',check):mq.addListener(check);
window.addEventListener('orientationchange',()=>setTimeout(check,250));
setInterval(check,500);
})();
