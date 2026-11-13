/* check.js: "Check my playing" for Class. Uses a MIDI keyboard (Web MIDI: Chrome or Edge on a computer or Android).
   The student plays the chord shown on the keyboard; Pokey compares the note names. */
(function(){
'use strict';
const NN=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
let on=false, access=null, held=new Set(), played=new Set(), timer=null, bar=null;
function status(t,ok){ if(!bar){ bar=document.createElement('div'); bar.style.cssText='margin:8px 0;padding:10px 12px;border-radius:12px;font:600 14px system-ui;border:1px solid var(--k6b5826,#34446c);background:var(--k1b160c,#16233f);color:var(--kf3ead8,#eaf0ff)'; const b=document.getElementById('clCheck'); const row=b&&b.parentNode; if(row) row.parentNode.insertBefore(bar,row.nextSibling); }
  bar.hidden=false; bar.textContent=t; bar.style.borderColor=ok===true?'#2f9e44':ok===false?'#d9480f':'var(--k6b5826,#34446c)'; }
function target(){ const K=window.CLASS&&CLASS.K; const s=K&&K.steps[K.i]; if(!s) return null; const pcs=new Set(); [].concat(s.lh||[],s.rh||[]).forEach(m=>pcs.add(((m%12)+12)%12)); return {name:s.name,pcs}; }
function names(set){ return [...set].sort((a,b)=>a-b).map(p=>NN[p]).join(' '); }
function evaluate(){
  timer=null; const t=target(); if(!t){ status('Put a chord on the keyboard first (ask Pokey to teach you something).'); played.clear(); return; }
  const got=new Set([...played].map(m=>m%12)); played.clear();
  const missing=[...t.pcs].filter(p=>!got.has(p)), extra=[...got].filter(p=>!t.pcs.has(p));
  if(!missing.length&&!extra.length){ status('✓ '+t.name+': every note is right ('+names(t.pcs)+'). Moving to the next chord.',true); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} setTimeout(()=>{ if(on&&window.CLASS&&CLASS.K.steps.length>1) CLASS.stepGo(1); },900); }
  else status('Not yet on '+t.name+' ('+names(t.pcs)+'). '+(missing.length?'Missing: '+names(new Set(missing))+'. ':'')+(extra.length?'Extra: '+names(new Set(extra))+'. ':'')+'Try again.',false);
}
function onMsg(e){ const [st,n,v]=e.data, cmd=st&0xf0; if(cmd===0x90&&v>0){ played.add(n); held.add(n); clearTimeout(timer); timer=setTimeout(evaluate,700); } else if(cmd===0x80||(cmd===0x90&&v===0)) held.delete(n); }
function hook(){ if(!access) return; access.inputs.forEach(i=>{ i.onmidimessage=on?onMsg:null; }); }
async function toggle(){
  if(on){ on=false; hook(); const b=document.getElementById('clCheck'); if(b) b.textContent='🎹 Check my playing'; if(bar) bar.hidden=true; return; }
  if(!navigator.requestMIDIAccess){ alert('Check my playing needs a MIDI keyboard and a browser that supports it: Chrome or Edge on a computer or Android. iPhone and Safari do not support it yet.'); return; }
  try{ access=await navigator.requestMIDIAccess(); }catch(_){ alert('The browser did not allow access to MIDI. Allow it and try again.'); return; }
  access.onstatechange=hook; on=true; hook(); const b=document.getElementById('clCheck'); if(b) b.textContent='⏹ Stop checking';
  status(access.inputs.size?'Listening. Play the chord shown on the keyboard.':'No MIDI keyboard found. Plug it in and play a note.');
}
window.CHECK={toggle,evaluate:(notes)=>{ played=new Set(notes); evaluate(); }};
})();
