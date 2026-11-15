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
 F:{n:'F G A Bb C D E F',m:65,rh:'1 2 3 4 1 2 3',lh:'5 4 3 2 1 3 2 1'},
 Bb:{n:'Bb C D Eb F G A Bb',m:70,rh:'4 1 2 3 1 2 3 4',lh:'3 2 1 4 3 2 1 3'},
 Eb:{n:'Eb F G Ab Bb C D Eb',m:63,rh:'3 1 2 3 4 1 2 3',lh:'3 2 1 4 3 2 1 3'},
 Ab:{n:'Ab Bb C Db Eb F G Ab',m:68,rh:'2 3 1 2 3 1 2 3',lh:'3 2 1 4 3 2 1 3'},
 Db:{n:'Db Eb F Gb Ab Bb C Db',m:61,rh:'2 3 1 2 3 4 1 2',lh:'3 2 1 4 3 2 1 3'},
 Gb:{n:'Gb Ab Bb Cb Db Eb F Gb',m:66,rh:'2 3 4 1 2 3 1 2',lh:'4 3 2 1 3 2 1 4'},
 'C#':{n:'',m:61,rh:'',lh:''}, 'D#':{n:'',m:63,rh:'',lh:''}, 'F#':{n:'',m:66,rh:'',lh:''}, 'G#':{n:'',m:68,rh:'',lh:''}, 'A#':{n:'',m:70,rh:'',lh:''}
};
const ORDER=['C','G','D','A','E','B','F#','C#','G#','D#','A#','F','Bb','Eb','Ab','Db','Gb'];
/* Scale types: seven-note formulas (semitones above the tonic). Only major carries the lessons' fingering for now. */
const TYPES=[
 {id:'major',g:'Major',l:'Major (Ionian)',f:[0,2,4,5,7,9,11,12]},
 {id:'nat',g:'Minor',l:'Natural minor (Aeolian)',f:[0,2,3,5,7,8,10,12]},
 {id:'harm',g:'Minor',l:'Harmonic minor',f:[0,2,3,5,7,8,11,12]},
 {id:'mel',g:'Minor',l:'Melodic minor',f:[0,2,3,5,7,9,11,12]},
 {id:'dor',g:'Modes of the major scale',l:'Dorian',f:[0,2,3,5,7,9,10,12]},
 {id:'phr',g:'Modes of the major scale',l:'Phrygian',f:[0,1,3,5,7,8,10,12]},
 {id:'lyd',g:'Modes of the major scale',l:'Lydian',f:[0,2,4,6,7,9,11,12]},
 {id:'mix',g:'Modes of the major scale',l:'Mixolydian',f:[0,2,4,5,7,9,10,12]},
 {id:'loc',g:'Modes of the major scale',l:'Locrian',f:[0,1,3,5,6,8,10,12]},
 {id:'dorb2',g:'Modes of the melodic minor',l:'Dorian ♭2',f:[0,1,3,5,7,9,10,12]},
 {id:'lydaug',g:'Modes of the melodic minor',l:'Lydian augmented',f:[0,2,4,6,8,9,11,12]},
 {id:'lyddom',g:'Modes of the melodic minor',l:'Lydian dominant',f:[0,2,4,6,7,9,10,12]},
 {id:'mixb6',g:'Modes of the melodic minor',l:'Mixolydian ♭6',f:[0,2,4,5,7,8,10,12]},
 {id:'super',g:'Modes of the melodic minor',l:'Super Locrian',f:[0,1,3,4,6,8,10,12]}
];
/* Enharmonic keys sound the same, so they share the fingering of their twin */
const TWIN={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
Object.keys(TWIN).forEach(k=>{ SC[k].rh=SC[TWIN[k]].rh; SC[k].lh=SC[TWIN[k]].lh; });
const LET='CDEFGAB', NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function spellScale(key,f){ // letters in order from the tonic, accidentals from the formula
  const r=key[0], i0=LET.indexOf(r), base=NAT[r]+(key[1]==='b'?-1:key[1]==='#'?1:0);
  return f.map((semi,i)=>{ const L=LET[(i0+i)%7]; let d=((base+semi)-NAT[L])%12; if(d>6) d-=12; if(d<-6) d+=12; return L+(d>0?'#'.repeat(d):d<0?'b'.repeat(-d):''); });
}
function build(key,hand,type,oct){
  oct=Math.max(1,Math.min(3,Math.round(+oct)||1));
  const T=TYPES.find(t=>t.id===type)||TYPES[0], isMaj=T.id==='major', d=SC[key], names=spellScale(key,T.f);
  const f7=T.f.slice(0,7), N=7*oct, p=d.m%12;
  const rhF=isMaj&&d.rh?d.rh.split(' '):null, lhF=isMaj&&d.lh?d.lh.split(' '):null;
  /* start notes keep every hand inside the keyboard (C2 to C7) */
  const r0=(60+p+12*oct<=96)?60+p:48+p, lBoth=(r0-24>=36)?r0-24:r0-12, lOnly=48+p;
  const steps=[];
  for(let i=0;i<=N;i++){
    const top=i===N, deg=i%7, semi=top?12*oct:f7[deg]+12*Math.floor(i/7), nm=top?names[0]:names[deg];
    const dsp=nm.replace(/##|x/,'𝄪').replace(/bb/,'𝄫').replace('#','♯').replace('b','♭');
    const st={src:key,name:nm,lh:[],rh:[],fing:'',lfing:'',spell:{}};
    if(hand==='lh'||hand==='both'){ const m=(hand==='both'?lBoth:lOnly)+semi; st.lh=[m]; st.spell[m]=dsp; }
    if(hand==='rh'||hand==='both'){ const m=r0+semi; st.rh=[m]; st.spell[m]=dsp; }
    if(hand!=='lh'){ if(rhF){ st.fing=(top?rhF[7]:rhF[deg])||''; if(oct===1) st.fing=rhF[i]||''; } else if(isMaj&&/^(C|F)$/.test(nm)&&!top) st.fing='1'; }
    if(hand!=='rh'&&lhF&&oct===1) st.lfing=lhF[i]||'';
    steps.push(st); }
  return steps;
}
let ov=null;
function open(){
  if(!ov){
    ov=document.createElement('div'); ov.hidden=true; ov.style.cssText='position:fixed;inset:0;z-index:9998;background:rgba(4,4,4,.78);display:grid;place-items:center;font-family:system-ui,sans-serif';
    ov.innerHTML='<div style="background:var(--k14110a,#101a33);color:var(--kf3ead8,#eaf0ff);border:1px solid var(--k6b5826,#34446c);border-radius:18px;padding:22px;width:min(460px,94vw)"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:22px;color:#fff;text-transform:none;letter-spacing:0">🎼 Major scales (3+4 method)</h2><button type="button" id="scX" style="background:none;border:1px solid var(--k8a7230,#4a5d8f);color:var(--kf3ead8,#eaf0ff);border-radius:10px;padding:6px 12px;cursor:pointer">Close</button></div><p style="color:var(--kc8b98f,#a9b6cf);font-size:14px;margin:10px 0">Pick a scale and a hand. It loads on the keyboard note by note, with the finger on each note.</p><div id="scKeys" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div><div id="scHand" style="display:flex;gap:6px;margin-bottom:10px"></div><div id="scInfo" style="font-size:14px;min-height:40px;color:var(--ke8c25a,#ffd54a)"></div><button type="button" id="scGo" style="margin-top:10px;background:var(--ke8c25a,#ffd54a);color:#1a1a1a;border:0;border-radius:12px;padding:11px 18px;font-size:16px;font-weight:800;cursor:pointer">Load on the keyboard</button></div>';
    document.body.appendChild(ov); ov.querySelector('#scX').onclick=()=>{ ov.hidden=true; }; ov.addEventListener('click',e=>{ if(e.target===ov) ov.hidden=true; });
    ov.querySelector('#scGo').onclick=go;
  }
  ov.hidden=false; draw();
}
let key='C', hand='rh';
const mk=(t,on,fn)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.style.cssText='border-radius:999px;padding:7px 13px;cursor:pointer;font-size:14px;border:1px solid var(--k8a7230,#4a5d8f);'+(on?'background:var(--kd4af37,#1c4fa0);color:var(--k111,#fff)':'background:transparent;color:var(--kf3ead8,#eaf0ff)'); b.onclick=fn; return b; };
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
function acc(key){ const n=spellScale(key,TYPES[0].f).slice(0,7); let sh=0,fl=0; n.forEach(x=>{ const a=x.slice(1); if(a[0]==='#') sh+=a.length; else if(a[0]==='b') fl+=a.length; }); return {sharps:sh,flats:fl}; }
window.SCALES={open,build,acc,types:TYPES,keys:ORDER,has:k=>SC[k]?{rh:!!SC[k].rh,lh:!!SC[k].lh}:null};
})();
