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
/* Scale types come from the library (scale-library.js): degrees against the major scale. Only Natural major carries the lessons' fingering for now. */
const MAJS={1:0,2:2,3:4,4:5,5:7,6:9,7:11};
const LIB=(window.SCALELIB&&SCALELIB.list)||[];
const TYPES=LIB.map(x=>({id:x.rid,lid:x.id,g:x.grp,l:x.name,fam:x.fam,d:x.deg.split(' '),keys:x.keys,s:x.deg.split(' ').map(t=>{ const m=/^(bb|b|#)?(\d)$/.exec(t); return MAJS[+m[2]]+(!m[1]?0:m[1]==='#'?1:m[1]==='b'?-1:-2); })}));
/* Enharmonic keys sound the same, so they share the fingering of their twin */
/* Fingering families from the lessons. lhm = left hand over several octaves: first octave, repeated octave, last note */
['C','G','D','A','E','B'].forEach(k=>{ SC[k].rh='1 2 3 1 2 3 4 5'; SC[k].lh='5 4 3 2 1 3 2 1'; SC[k].lhm={f:'5 4 3 2 1 3 2',r:'1 4 3 2 1 3 2',l:'1'}; });
['Bb','Eb','Ab','Db'].forEach(k=>{ SC[k].lh='3 2 1 4 3 2 1 2'; SC[k].lhm={f:'3 2 1 4 3 2 1',r:'3 2 1 4 3 2 1',l:'3'}; });
SC.Gb.lhm={f:'4 3 2 1 3 2 1',r:'4 3 2 1 3 2 1',l:'4'};
const TWIN={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
Object.keys(TWIN).forEach(k=>{ SC[k].rh=SC[TWIN[k]].rh; SC[k].lh=SC[TWIN[k]].lh; SC[k].lhm=SC[TWIN[k]].lhm; });
const LET='CDEFGAB', NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function spellDeg(key,degs){ // letters follow the scale degree; accidentals follow the formula
  const r=key[0], i0=LET.indexOf(r), base=NAT[r]+(key[1]==='b'?-1:key[1]==='#'?1:0);
  return degs.map(t=>{ const m=/^(bb|b|#)?(\d)$/.exec(t), semi=MAJS[+m[2]]+(!m[1]?0:m[1]==='#'?1:m[1]==='b'?-1:-2), L=LET[(i0+(+m[2])-1)%7]; let d=((base+semi)-NAT[L])%12; if(d>6) d-=12; if(d<-6) d+=12; return L+(d>0?'#'.repeat(d):d<0?'b'.repeat(-d):''); });
}
const typeOf=id=>TYPES.find(t=>t.id===id)||TYPES[0];
const dispName=nm=>nm.replace(/##|x/,'𝄪').replace(/bb/,'𝄫').replace('#','♯').replace('b','♭');
function allowedKeys(type){ const T=typeOf(type); return T.keys?ORDER.filter(k=>T.keys.includes(k)):ORDER; }
function buildContrary(key,type,oct){
  oct=Math.max(1,Math.min(2,Math.round(+oct)||1));
  const T=typeOf(type), d=SC[key], names=spellDeg(key,T.d), f=T.s, n=f.length, N=n*oct;
  /* contrary fingering comes from each hand's own up and down fingering: the right hand goes up the scale, the left hand goes down it (the same finger plays a note either way) */
  const RF=(T.id==='major'&&d.rh)?build(key,'rh',type,oct,'similar').map(x=>x.fing):null, LF=(T.id==='major'&&d.lh)?build(key,'lh',type,oct,'similar').map(x=>x.lfing):null;
  const T0=60+d.m%12; /* hands meet on the tonic; two octaves open and close always fit between C2 and C7 */
  const steps=[];
  for(let i=0;i<=N;i++){
    const q=Math.floor(i/n), r=i%n, top=i===N;
    const up=top?12*oct:f[r]+12*q, down=top?12*oct:(r===0?12*q:12*q+(12-f[n-r]));
    const rn=top?names[0]:names[r], ln=top?names[0]:names[(n-r)%n];
    const rm=T0+up, lm=T0-down, st={src:key,name:rn,lname:ln,lh:[lm],rh:[rm],fing:RF?(RF[i]||''):'',lfing:LF?(LF[N-i]||''):'',spell:{}};
    st.spell[rm]=dispName(rn); st.spell[lm]=dispName(ln); steps.push(st); }
  return steps;
}
function build(key,hand,type,oct,motion){
  if(motion==='contrary') return buildContrary(key,type,oct);
  oct=Math.max(1,Math.min(3,Math.round(+oct)||1));
  const T=typeOf(type), isMaj=T.id==='major', d=SC[key], names=spellDeg(key,T.d), f=T.s, n=f.length, N=n*oct, p=d.m%12;
  const rhF=isMaj&&d.rh?d.rh.split(' '):null, lhF=isMaj&&d.lh?d.lh.split(' '):null;
  /* start notes keep every hand inside the keyboard (C2 to C7) */
  const r0=(60+p+12*oct<=96)?60+p:48+p, lBoth=(r0-24>=36)?r0-24:r0-12, lOnly=48+p;
  const steps=[];
  for(let i=0;i<=N;i++){
    const top=i===N, deg=i%n, semi=top?12*oct:f[deg]+12*Math.floor(i/n), nm=top?names[0]:names[deg], dsp=dispName(nm);
    const st={src:key,name:nm,lh:[],rh:[],fing:'',lfing:'',spell:{}};
    if(hand==='lh'||hand==='both'){ const m=(hand==='both'?lBoth:lOnly)+semi; st.lh=[m]; st.spell[m]=dsp; }
    if(hand==='rh'||hand==='both'){ const m=r0+semi; st.rh=[m]; st.spell[m]=dsp; }
    if(hand!=='lh'){ if(rhF){ st.fing=(top?rhF[7]:rhF[deg])||''; if(oct===1) st.fing=rhF[i]||''; } else if(isMaj&&/^(C|F)$/.test(nm)&&!top) st.fing='1'; }
    if(hand!=='rh'&&isMaj&&d.lh){ if(oct===1) st.lfing=lhF[i]||''; else if(d.lhm){ const M=d.lhm; st.lfing=top?M.l:(i<7?M.f.split(' ')[i]:M.r.split(' ')[(i-7)%7]); } }
    steps.push(st); }
  return steps;
}
function acc(key){ const n=spellDeg(key,TYPES[0].d).slice(0,7); let sh=0,fl=0; n.forEach(x=>{ const a=x.slice(1); if(a[0]==='#') sh+=a.length; else if(a[0]==='b') fl+=a.length; }); return {sharps:sh,flats:fl}; }
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
window.SCALES={open,build,buildContrary,allowedKeys,acc,types:TYPES,keys:ORDER,has:k=>SC[k]?{rh:!!SC[k].rh,lh:!!SC[k].lh}:null};
})();
