/* On a phone held upright, any screen with a piano keyboard asks to be turned sideways.
   "Rotate for me" locks landscape where the browser allows it (Android Chrome, full screen). iPhones can't be locked: they turn by hand. */
(function(){
'use strict';
const mq=matchMedia('(max-width:700px) and (orientation:portrait) and (pointer:coarse)');
const IDS=['earKb','prKb','stageKbd','clKbdWrap','txKbd','gkb','scKeys'];
const skip=new Set(); let box=null, locked=false;
function vis(el){ if(!el) return false; if(el.closest('[hidden]')) return false; const r=el.getBoundingClientRect(); return r.width>40&&r.height>10&&getComputedStyle(el).visibility!=='hidden'; }
function which(){
  for(const id of IDS){ const el=document.getElementById(id); if(vis(el)) return id; }
  const tx=document.querySelector('body[data-dest="plus"] #txRoomBack'); if(tx&&vis(tx)) return 'plus';
  return null;
}
function build(){
  box=document.createElement('div'); box.id='psRotate'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Turn your phone sideways');
  box.innerHTML='<div class="ph" aria-hidden="true"></div><h2>Turn your phone sideways</h2><p>The keyboard needs the wide screen so the keys are big enough to see and tap. If it does not turn, unlock rotation in your phone’s control centre.</p><button class="go" type="button">Rotate for me</button><button class="no" type="button">Stay upright</button><div class="msg" style="font-size:13px;color:#ffd43b;min-height:1.2em"></div>';
  document.body.appendChild(box);
  box.querySelector('.go').onclick=async()=>{
    const m=box.querySelector('.msg'); m.textContent='';
    try{ const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen) await d.requestFullscreen(); await screen.orientation.lock('landscape'); locked=true; }
    catch(_){ m.textContent='Your browser will not turn it for you. Please turn the phone by hand.'; }
  };
  box.querySelector('.no').onclick=()=>{ const k=which(); if(k) skip.add(k); check(); };
}
function release(){
  if(!locked) return; locked=false;
  try{ screen.orientation.unlock(); }catch(_){}
  try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(_){}
}
function check(){
  const k=mq.matches?which():null, want=!!k&&!skip.has(k);
  if(want&&!box) build();
  if(box) box.classList.toggle('on',want);
  if(!which()) release();
}
mq.addEventListener?mq.addEventListener('change',check):mq.addListener(check);
window.addEventListener('orientationchange',()=>setTimeout(check,250));
setInterval(check,700);
})();
