/* scales.js: load any major scale on the Class keyboard with the 3+4 groups and the fingering from the lessons. */
(function(){
'use strict';
const SC={ // notes, first midi note (right hand, octave 4), right-hand fingers, left-hand fingers ('' = not in the library yet)
 C:{n:'C D E F G A B C',m:60,rh:'1 2 3 1 2 3 4 5',lh:'5 4 3 2 1 3 2 1'},
 G:{n:'G A B C D E F# G',m:67,rh:'1 2 3 1 2 3 4 5',lh:'5 4 3 2 1 3 2 1'},
 D:{n:'D E F# G A B C# D',m:62,rh:'1 2 3 1 2 3 4 5',lh:'5 4 3 2 1 3 2 1'},
 A:{n:'A B C# D E F# G# A',m:69,rh:'1 2 3 1 2 3 4 5',lh:'5 4 3 2 1 3 2 1'},
 E:{n:'E F# G# A B C# D# E',m:64,rh:'1 2 3 1 2 3 4 5',lh:'5 4 3 2 1 3 2 1'},
 B:{n:'B C# D# E F# G# A# B',m:71,rh:'1 2 3 1 2 3 4 5',lh:'4 3 2 1 4 3 2 1'},
 F:{n:'F G A Bb C D E F',m:65,rh:'',lh:''},
 Bb:{n:'Bb C D Eb F G A Bb',m:70,rh:'4 1 2 3 1 2 3 4',lh:''},
 Eb:{n:'Eb F G Ab Bb C D Eb',m:63,rh:'3 1 2 3 4 1 2 3',lh:''},
 Ab:{n:'Ab Bb C Db Eb F G Ab',m:68,rh:'',lh:''},
 Db:{n:'Db Eb F Gb Ab Bb C Db',m:61,rh:'',lh:''},
 Gb:{n:'Gb Ab Bb Cb Db Eb F Gb',m:66,rh:'',lh:''}
};
const UP=[0,2,4,5,7,9,11,12];
const ORDER=['C','G','D','A','E','B','F','Bb','Eb','Ab','Db','Gb'];
function build(key,hand){
  const d=SC[key], names=d.n.split(' '), rhF=d.rh?d.rh.split(' '):null, lhF=d.lh?d.lh.split(' '):null;
  const steps=names.map((nm,i)=>{
    const mid=d.m+UP[i]; const st={src:key,name:nm,lh:[],rh:[],fing:'',lfing:''};
    if(hand==='lh'||hand==='both') st.lh=[mid-(hand==='both'?24:12)];
    if(hand==='rh'||hand==='both') st.rh=[mid];
    if(hand!=='lh'){ if(rhF) st.fing=rhF[i]; else if(/^(C|F)$/.test(nm)&&!(i===7)) st.fing='1'; }
    if(hand!=='rh'&&lhF) st.lfing=lhF[i];
    return st; });
  return steps;
}
let ov=null;
function open(){
  if(!ov){
    ov=document.createElement('div'); ov.hidden=true; ov.style.cssText='position:fixed;inset:0;z-index:9998;background:rgba(6,10,20,.78);display:grid;place-items:center;font-family:system-ui,sans-serif';
    ov.innerHTML='<div style="background:#101a33;color:#eaf0ff;border:1px solid #34446c;border-radius:18px;padding:22px;width:min(460px,94vw)"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:22px;color:#fff;text-transform:none;letter-spacing:0">🎼 Major scales (3+4 method)</h2><button type="button" id="scX" style="background:none;border:1px solid #4a5d8f;color:#eaf0ff;border-radius:10px;padding:6px 12px;cursor:pointer">Close</button></div><p style="color:#a9b6cf;font-size:14px;margin:10px 0">Pick a scale and a hand. It loads on the keyboard note by note, with the finger on each note.</p><div id="scKeys" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div><div id="scHand" style="display:flex;gap:6px;margin-bottom:10px"></div><div id="scInfo" style="font-size:14px;min-height:40px;color:#ffd54a"></div><button type="button" id="scGo" style="margin-top:10px;background:#ffd54a;color:#1a1a1a;border:0;border-radius:12px;padding:11px 18px;font-size:16px;font-weight:800;cursor:pointer">Load on the keyboard</button></div>';
    document.body.appendChild(ov); ov.querySelector('#scX').onclick=()=>{ ov.hidden=true; }; ov.addEventListener('click',e=>{ if(e.target===ov) ov.hidden=true; });
    ov.querySelector('#scGo').onclick=go;
  }
  ov.hidden=false; draw();
}
let key='C', hand='rh';
const mk=(t,on,fn)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.style.cssText='border-radius:999px;padding:7px 13px;cursor:pointer;font-size:14px;border:1px solid #4a5d8f;'+(on?'background:#1c4fa0;color:#fff':'background:transparent;color:#eaf0ff'); b.onclick=fn; return b; };
function draw(){
  const K=ov.querySelector('#scKeys'); K.textContent=''; ORDER.forEach(k=>K.appendChild(mk(k+' major',k===key,()=>{ key=k; if(hand!=='rh'&&!SC[k].lh) hand='rh'; draw(); })));
  const H=ov.querySelector('#scHand'); H.textContent=''; [['rh','Right hand'],['lh','Left hand'],['both','Both hands']].forEach(([h,l])=>{ const ok=h==='rh'||!!SC[key].lh; const b=mk(l,hand===h,()=>{ if(ok){ hand=h; draw(); } }); if(!ok){ b.style.opacity='.4'; b.title='Left-hand fingering for this scale is not in the lessons yet'; } H.appendChild(b); });
  const d=SC[key], info=ov.querySelector('#scInfo'), g=d.n.split(' ');
  const line=g.slice(0,3).join(' ')+' | '+g.slice(3,7).join(' ')+' | '+g[7];
  const fing=hand==='rh'?d.rh:hand==='lh'?d.lh:d.rh+' (RH) · '+d.lh+' (LH)';
  info.textContent=key+' major = '+line+(fing?'   Fingers: '+fing:'   Thumb on every C and F. The other fingers for this scale are not in the lessons yet.');
}
function go(){
  if(!window.CLASS||!CLASS.loadSteps) return; const hs=hand==='rh'?'right hand':hand==='lh'?'left hand':'both hands';
  CLASS.loadSteps(key+' major: 3+4 ('+hs+')',build(key,hand)); ov.hidden=true; try{ if(window.PSPROG) PSPROG.mark(); }catch(_){}
}
window.SCALES={open,build};
})();
