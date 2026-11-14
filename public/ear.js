/* ear.js: Ear training room for Class.
   Awareness = hear it AND see it on the keyboard (explore).  Recognition = hear it only, no keyboard (quiz).
   Five areas: Note, Scale, Interval, Chord, Pattern. Pattern = chord progressions by number (PROGS below). Singing = sing a scale or mode into the microphone. */
(function(){
'use strict';
const R=n=>Math.floor(Math.random()*n);
const NAMES=['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B'];
// scale types: semitone steps from the root, up to the octave
const SCALES=[['Major',[0,2,4,5,7,9,11,12]],['Natural minor',[0,2,3,5,7,8,10,12]],['Harmonic minor',[0,2,3,5,7,8,11,12]],['Melodic minor',[0,2,3,5,7,9,11,12]],['Major pentatonic',[0,2,4,7,9,12]],['Minor pentatonic',[0,3,5,7,10,12]]];
const IV=[[1,'Minor 2nd'],[2,'Major 2nd'],[3,'Minor 3rd'],[4,'Major 3rd'],[5,'Perfect 4th'],[6,'Tritone'],[7,'Perfect 5th'],[8,'Minor 6th'],[9,'Major 6th'],[10,'Minor 7th'],[11,'Major 7th'],[12,'Octave']];
const TRIADS=[['Major',[0,4,7]],['Minor',[0,3,7]],['Diminished',[0,3,6]],['Augmented',[0,4,8]],['Sus2',[0,2,7]],['Sus4',[0,5,7]]];
const SEVENTHS=[['Major seventh',[0,4,7,11]],['Dominant seventh',[0,4,7,10]],['Minor seventh',[0,3,7,10]],['Half-diminished seventh',[0,3,6,10]],['Diminished seventh',[0,3,6,9]]];
// the chords of the major key by degree (from the lessons): label, semitones above the key, triad
const DEG=[['1 chord',0,[0,4,7]],['2 chord',2,[0,3,7]],['3 chord',4,[0,3,7]],['4 chord',5,[0,4,7]],['5 chord',7,[0,4,7]],['6 chord',9,[0,3,7]]];
const CHORDSETS={tri:{name:'Triads',list:TRIADS},sev:{name:'Seventh chords',list:SEVENTHS},deg:{name:'1-6 chords in C',list:null}};
// Patterns: waiting for the teacher. Each entry: {name:'...', notes:[semitones from the root, in order], harm:false}
// Patterns = chord progressions by number, in the key you choose (chords of the major key)
const DEGS={1:[0,[0,4,7]],2:[2,[0,3,7]],3:[4,[0,3,7]],4:[5,[0,4,7]],5:[7,[0,4,7]],6:[9,[0,3,7]],7:[11,[0,3,6]]};
const PROGS=['1-4','1-5','7-3-6','6-2-5','1-4-5','1-5-6-4','1-6-4-5','2-5-1','3-6-2-5-1','7-3-6-2-5-1','1-4-3-6-2-5-1'].map(n=>({name:n,deg:n.split('-').map(Number)}));
const chNotes=(r,d)=>DEGS[d][1].map(x=>r+DEGS[d][0]+x);
const chName=(r,d)=>midiName(r+DEGS[d][0])+(d===7?' dim':[2,3,6].includes(d)?' minor':'');
const playProg=(r,deg,gap,dur)=>deg.forEach((d,i)=>{ chNotes(r,d).forEach((m,j)=>S(m,dur,.75,i*gap+j*.015)); S(r+DEGS[d][0]-12,dur,.7,i*gap); });
// Singing: modes of the major scale, added to the scale types
let rcat='note'; try{ rcat=localStorage.getItem('ps-ear-rcat')||'note'; }catch(_){}
const RCATS=[['scale','Scale'],['note','Note'],['interval','Interval'],['chord','Chord']];
const MODES=[['Dorian',[0,2,3,5,7,9,10,12]],['Phrygian',[0,1,3,5,7,8,10,12]],['Lydian',[0,2,4,6,7,9,11,12]],['Mixolydian',[0,2,4,5,7,9,10,12]],['Locrian',[0,1,3,5,6,8,10,12]]];
const CATS=[['note','Note'],['scale','Scale'],['interval','Interval'],['chord','Chord'],['pattern','Pattern']];

let ov=null, mode='aware', cat='note', chordSet='tri', n=0, score=0, q=null, missed={}, stats={}, lit=[], timers=[], answered=false;
try{ { const v=localStorage.getItem('ps-ear-mode'); mode=v==='recog'||v==='sing'||v==='rel'?v:'aware'; } cat=localStorage.getItem('ps-ear-cat')||'note'; }catch(_){}
const S=(m,d,v,dl)=>{ if(window.CLASS&&CLASS.sound) CLASS.sound(m,d,v,dl); };
const $=s=>ov.querySelector(s);
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const clr=()=>{ timers.forEach(clearTimeout); timers=[]; };
const midiName=m=>NAMES[((m%12)+12)%12];

/* ---------- look: the same dark stage as the Studio ---------- */
const css=document.createElement('style'); css.textContent=`
#earRoom,#prRoom{position:fixed;left:0;right:0;bottom:0;top:36px;z-index:9998;background:var(--stage,#070b14);color:var(--stage-ink,#fff);display:flex;flex-direction:column;gap:18px;overflow:auto;padding:18px clamp(16px,3vw,34px) 28px;font-family:var(--body,system-ui)}
#earRoom[hidden],#prRoom[hidden]{display:none}
#earRoom button,#prRoom button,#prRoom input,#prRoom select{font-family:inherit}
.e-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.e-top h1{margin:0;font:800 clamp(24px,3.6vw,38px)/1 var(--display,var(--body));letter-spacing:-.02em;text-transform:none}
.e-round{width:42px;height:42px;border-radius:50%;border:1.5px solid var(--k6b5826,#3a4a74);background:transparent;color:inherit;font-size:18px;cursor:pointer}
.e-round:hover{border-color:var(--hi,#ffd43b)}
.e-sp{flex:1}
.e-seg{display:inline-flex;padding:4px;border-radius:999px;border:1.5px solid var(--k6b5826,#3a4a74);background:var(--k17130a,#101728)}
.e-seg button{border:0;background:transparent;color:inherit;padding:10px 22px;border-radius:999px;font:800 15px var(--body);cursor:pointer;opacity:.75}
.e-seg button[aria-pressed=true]{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);opacity:1}
.e-seg.sm button{padding:7px 14px;font-size:13px}
.e-cats{display:flex;gap:8px;flex-wrap:wrap}
.e-cat{padding:10px 20px;border-radius:999px;border:1.5px solid var(--k6b5826,#3a4a74);background:transparent;color:inherit;font:700 16px var(--body);cursor:pointer}
.e-cat[aria-pressed=true]{background:var(--k231c0f,#1d2540);border-color:var(--hi,#ffd43b);color:var(--hi,#ffd43b)}
.e-now{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:10px 32px;align-items:center}
.e-lbl{font:700 13px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}
.e-big{font:800 clamp(44px,8vw,110px)/1 var(--display,var(--body));letter-spacing:-.02em;min-height:1.1em;overflow-wrap:anywhere}
.e-sub{font:600 clamp(16px,2vw,22px) var(--body);color:var(--stage-muted,#9aa6c0);margin-top:6px}
.e-ctl{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.e-ctl select{background:var(--k17130a,#101728);color:inherit;border:1.5px solid var(--k6b5826,#3a4a74);border-radius:12px;padding:10px 12px;font:600 15px var(--body)}
.e-btn{padding:12px 22px;border-radius:999px;border:1.5px solid var(--k6b5826,#3a4a74);background:transparent;color:inherit;font:700 16px var(--body);cursor:pointer}
.e-btn:hover{border-color:var(--hi,#ffd43b)}
.e-btn.pri{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);border-color:transparent;font-weight:800}
.e-btn:disabled{opacity:.4;cursor:default}
.e-opts{display:flex;flex-wrap:wrap;gap:12px}
.e-opt{min-width:92px;padding:16px 20px;border-radius:999px;border:3px solid var(--hi,#d4af37);background:var(--k0d0b07,#0c1222);color:inherit;font:800 clamp(17px,2vw,22px) var(--display,var(--body));cursor:pointer;transition:transform .15s,background .15s}
.e-opt:hover:not(:disabled){transform:translateY(-2px);background:var(--k231c0f,#1d2540)}
.e-opt:disabled{cursor:default}
.e-opt.now{box-shadow:0 0 0 4px var(--hi,#ffd43b)}.e-opt.near{background:#8a6a12!important;border-color:#f0b429}.e-opt.sg{cursor:default;min-width:84px;text-align:center}
.rp{display:grid;gap:14px;width:100%}.rp-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.rp-grp{border:1.5px solid var(--k6b5826,#3a4a74);border-radius:16px;padding:12px 16px}.rp-grp h3{margin:0 0 8px;font:700 13px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}.rp-chk{display:inline-flex;gap:8px;align-items:center;padding:6px 18px 6px 4px;font:600 16px var(--body);cursor:pointer}.rp-chk input,.rp input[type=range]{accent-color:var(--hi,#ffd43b)}.rp-chk input{width:20px;height:20px}.rp-slide{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.rp-slide small{font:600 14px var(--body);color:var(--stage-muted,#9aa6c0)}.rp-rng{width:min(420px,70vw)}
.e-res{flex:1 1 100%;display:grid;gap:16px;margin-top:8px}.e-res-h{font:800 clamp(20px,2.4vw,28px) var(--display,var(--body))}.e-res-s{display:grid;gap:8px}.e-res-s h3{margin:0;font:700 13px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}
.e-res-r{display:grid;grid-template-columns:minmax(120px,220px) minmax(90px,150px) 1fr;gap:12px;align-items:center;padding:10px 16px;border-radius:14px;background:var(--k0d0b07,#0c1222);border-left:5px solid #2fbf64;font:600 16px var(--body)}.e-res-r.bad{border-left-color:#e0653d}.e-res-r b{font:800 18px var(--body)}.e-res-t{color:var(--stage-muted,#9aa6c0)}
.e-dots{display:flex;gap:5px;flex-wrap:wrap}.e-dots .d{width:14px;height:14px;border-radius:50%;display:inline-block}.e-dots .d.ok{background:#2fbf64}.e-dots .d.bad{background:#e0653d}
@media(max-width:700px){.e-res-r{grid-template-columns:1fr}}
.e-opt.ok{background:#1f7a3f!important;border-color:#2fbf64}.e-opt.bad{background:#a33a1c!important;border-color:#e0653d}
.e-msg{font:600 clamp(16px,1.9vw,21px)/1.5 var(--body);min-height:1.5em}
.e-kb{background:var(--k0d0b07,#0c1222);border-radius:18px;padding:12px 14px 10px}
.e-kb .e-lbl{margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
.e-kb svg{width:100%;height:auto;display:block}
.e-gap{padding:26px;border:1.5px dashed var(--k6b5826,#3a4a74);border-radius:18px;font:500 17px/1.6 var(--body);color:var(--stage-muted,#9aa6c0)}
@media(max-width:820px){.e-now{grid-template-columns:1fr}.e-seg button{padding:9px 16px}}
`; document.head.appendChild(css);

function build(){
  ov=el('div'); ov.id='earRoom'; ov.hidden=true; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Ear training');
  ov.innerHTML='<div class="e-top"><button class="e-round" id="earX" type="button" aria-label="Back" title="Back">←</button><h1>Ear training</h1><span class="e-sp"></span><div class="e-seg" id="earMode" role="group" aria-label="Awareness, recognition, singing or relative pitch"><button type="button" data-m="aware">Awareness</button><button type="button" data-m="recog">Recognition</button><button type="button" data-m="sing">Singing</button><button type="button" data-m="rel">Relative pitch</button></div><button class="e-round" id="earDots" type="button" aria-label="Whiteboard and keyboard" title="Whiteboard and keyboard">⋯</button></div>'+
    '<div class="e-cats" id="earCats"></div>'+
    '<div class="e-now"><div><div class="e-lbl" id="earLbl"></div><div class="e-big" id="earBig"></div><div class="e-sub" id="earSub"></div></div><div><div class="e-ctl" id="earCtl"></div></div></div>'+
    '<div class="e-msg" id="earMsg" aria-live="polite"></div><div class="e-opts" id="earOpts"></div>'+
    '<div class="e-kb" id="earKb"><div class="e-lbl"><span>Keyboard</span></div><div id="earKbWrap"></div></div>';
  document.body.appendChild(ov);
  $('#earX').onclick=close;
  $('#earDots').onclick=()=>{ close(); try{ if(window.CLASS) CLASS.slide(true); }catch(_){} };
  ov.querySelectorAll('#earMode button').forEach(b=>b.onclick=()=>{ mode=b.dataset.m; try{ localStorage.setItem('ps-ear-mode',mode); }catch(_){} render(); });
  document.addEventListener('keydown',e=>{ if(ov&&!ov.hidden&&e.key==='Escape') close(); });
}
function open(){ if(!ov) build(); ov.hidden=false; render(); }
function close(){ clr(); sgStop(); if(ov) ov.hidden=true; try{ if(window.CLASS&&CLASS.endPractice) CLASS.endPractice(); }catch(_){} }

function render(){
  clr(); lit=[]; n=0; score=0; missed={}; stats={}; q=null; answered=false;
  ov.querySelectorAll('#earMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===mode)));
  sgStop(); const cats=$('#earCats'); cats.textContent=''; cats.hidden=mode==='sing';
  (mode==='rel'?RCATS:CATS).forEach(([k,t])=>{ const rl=mode==='rel', b=el('button','e-cat',t+' '+(rl?'relative pitch':mode==='aware'?'awareness':'recognition')); b.type='button'; b.setAttribute('aria-pressed',String(k===(rl?rcat:cat))); b.onclick=()=>{ if(rl){ rcat=k; try{ localStorage.setItem('ps-ear-rcat',k); }catch(_){} } else { cat=k; try{ localStorage.setItem('ps-ear-cat',k); }catch(_){} } render(); }; cats.appendChild(b); });
  $('#earKb').hidden=mode!=='aware'&&mode!=='sing'&&mode!=='rel';
  $('#earLbl').textContent=mode==='sing'?'Singing test':mode==='rel'?'Relative pitch · '+RCATS.find(c=>c[0]===rcat)[1]:(mode==='aware'?'Awareness':'Recognition')+' · '+CATS.find(c=>c[0]===cat)[1];
  $('#earMsg').textContent=''; $('#earOpts').textContent=''; $('#earCtl').textContent=''; $('#earBig').textContent=''; $('#earSub').textContent='';
  if(mode==='aware') awareness(); else if(mode==='sing') singing(); else if(mode==='rel') relUI(); else recognition();
}

/* ---------- the keyboard ---------- */
function drawKb(lh,rh,spell){
  const wrap=$('#earKbWrap'); if(!wrap||typeof keyboardSVG!=='function') return;
  const svg=keyboardSVG(lh||[],rh||[],{lo:36,hi:96,height:64,fingers:false,spell:spell||null});
  svg.addEventListener('pointerdown',e=>{ const r=e.target.closest('rect[data-m]'); if(!r) return; const m=+r.dataset.m; S(m,1.6,.85,0); if(cat==='note'&&mode==='aware'){ lit=[m]; $('#earBig').textContent=midiName(m); $('#earSub').textContent='Played '+midiName(m)+(m>=60?(m>=72?' (higher)':' (middle octave)'):' (lower)'); drawKb([],lit); } });
  wrap.replaceChildren(svg);
}

/* ---------- awareness: hear it and see it ---------- */
function sel(id,opts,val){ const s=el('select'); s.id=id; opts.forEach((o,i)=>{ const x=el('option',null,o); x.value=i; s.appendChild(x); }); s.value=val||0; return s; }
function awareness(){
  const ctl=$('#earCtl'), big=$('#earBig'), sub=$('#earSub');
  const root=()=>60+(+(ctl.querySelector('#aRoot')||{value:0}).value);
  const rootSel=()=>sel('aRoot',NAMES,0);
  const btn=(t,fn,pri)=>{ const b=el('button','e-btn'+(pri?' pri':''),t); b.type='button'; b.onclick=()=>{ clr(); fn(); }; ctl.appendChild(b); return b; };
  if(cat==='note'){ big.textContent='Tap a key'; sub.textContent='Tap any key to hear it and see its name.'; drawKb([],[]);
    const lab=el('span','e-lbl','Or hear a note:'); ctl.appendChild(lab); const s=rootSel(); ctl.appendChild(s); btn('Play',()=>{ const m=root(); S(m,1.8,.85,0); lit=[m]; big.textContent=midiName(m); sub.textContent='Played '+midiName(m); drawKb([],lit); },true); }
  else if(cat==='scale'){ ctl.appendChild(rootSel()); ctl.appendChild(sel('aType',SCALES.map(x=>x[0]),0)); btn('Play scale',()=>{
      const r=root(), t=SCALES[+ctl.querySelector('#aType').value], notes=t[1].map(x=>r+x); big.textContent=midiName(r)+' '+t[0].toLowerCase(); sub.textContent=notes.map(midiName).join('  '); lit=[]; drawKb([],[]);
      notes.forEach((m,i)=>{ timers.push(setTimeout(()=>{ S(m,.9,.8,0); lit=notes.slice(0,i+1); drawKb([],lit); },i*520)); }); },true);
    big.textContent='Choose a scale'; sub.textContent='Pick the starting note and the kind of scale, then play it.'; drawKb([],[]); }
  else if(cat==='interval'){ ctl.appendChild(rootSel()); ctl.appendChild(sel('aIv',IV.map(x=>x[1]),3)); const go=(together)=>{ const r=root(), a=IV[+ctl.querySelector('#aIv').value]; big.textContent=a[1]; sub.textContent=midiName(r)+' up to '+midiName(r+a[0])+' · '+a[0]+' half step'+(a[0]===1?'':'s'); lit=[r,r+a[0]]; drawKb([],lit); S(r,1.6,.85,0); S(r+a[0],1.8,.85,together?0:.9); };
    btn('Play one after the other',()=>go(false),true); btn('Play together',()=>go(true));
    big.textContent='Choose an interval'; sub.textContent='Pick the starting note and the interval, then play it.'; drawKb([],[]); }
  else if(cat==='chord'){ const sets=[...TRIADS,...SEVENTHS]; ctl.appendChild(rootSel()); ctl.appendChild(sel('aCh',sets.map(x=>x[0]),0)); const go=(broken)=>{ const r=root(), a=sets[+ctl.querySelector('#aCh').value], notes=a[1].map(x=>r+x); big.textContent=midiName(r)+' '+a[0].toLowerCase(); sub.textContent=notes.map(midiName).join('  '); lit=notes; drawKb([],lit); notes.forEach((m,i)=>S(m,2.4,.8,broken?i*.42:i*.012)); S(r-12,2.4,.7,0); };
    btn('Play chord',()=>go(false),true); btn('Play one note at a time',()=>go(true));
    big.textContent='Choose a chord'; sub.textContent='Pick the root and the kind of chord, then play it.'; drawKb([],[]); }
  else if(cat==='pattern'){ ctl.appendChild(rootSel()); ctl.appendChild(sel('aPt',PROGS.map(x=>x.name),0));
    btn('Play progression',()=>{ const r=root(), a=PROGS[+ctl.querySelector('#aPt').value], names=a.deg.map(d=>chName(r,d)); big.textContent=a.name; lit=[]; drawKb([],[]);
      const show=k=>{ sub.innerHTML=names.map((n,j)=>j===k?'<b style="color:var(--hi,#ffd43b)">'+n+'</b>':n).join(' → '); };
      show(-1); a.deg.forEach((d,i)=>{ timers.push(setTimeout(()=>{ lit=chNotes(r,d); drawKb([],lit); show(i); },i*1500)); }); playProg(r,a.deg,1.5,1.7); },true);
    big.textContent='Choose a progression'; sub.textContent='Pick the key and the progression, then play it. Listen to how the chords move.'; drawKb([],[]); }
}


/* ---------- singing test: sing the scale or mode into the microphone ---------- */
let sg=null;
function sgStop(){ if(!sg) return; clearInterval(sg.timer); try{ sg.stream.getTracks().forEach(t=>t.stop()); }catch(_){} try{ sg.src.disconnect(); }catch(_){} sg=null; }
const sgSet=()=>{ if(!sg) return; drawKb(sg.notes.slice(0,sg.i),sg.done?[]:[sg.notes[sg.i]]); [...$('#earOpts').children].forEach((b,i)=>{ b.className='e-opt sg'+(sg.state[i]==='ok'?' ok':sg.state[i]==='near'?' near':sg.state[i]==='miss'?' bad':'')+(i===sg.i&&!sg.done?' now':''); }); };
function singing(){
  const ctl=$('#earCtl'), big=$('#earBig'), sub=$('#earSub'), msg=$('#earMsg'), opts=$('#earOpts');
  const types=[...SCALES,...MODES];
  ctl.appendChild(sel('aRoot',NAMES,0)); ctl.appendChild(sel('aType',types.map(x=>x[0]),0)); ctl.appendChild(sel('aDir',['Up','Down','Up and down'],0));
  const btn=(t,fn,pri)=>{ const b=el('button','e-btn'+(pri?' pri':''),t); b.type='button'; b.onclick=fn; ctl.appendChild(b); return b; };
  drawKb([],[]); big.textContent='Sing a scale'; sub.textContent='Choose the starting note and the scale or mode. I play the first note, you press Ready, then sing each note in turn.';
  btn('Start',()=>{
    const r=60+(+ctl.querySelector('#aRoot').value), t=types[+ctl.querySelector('#aType').value], dir=+ctl.querySelector('#aDir').value, up=t[1].map(x=>r+x);
    const notes=dir===0?up:dir===1?up.slice().reverse():up.concat(up.slice(0,-1).reverse());
    sgStop(); clr(); sg={notes,i:0,state:notes.map(()=>''),first:notes.map(()=>true),err:notes.map(()=>0),worst:notes.map(()=>''),wrong:notes.map(()=>[]),r,tname:t[0]};
    opts.textContent=''; notes.forEach(m=>{ const b=el('button','e-opt sg',midiName(m)); b.type='button'; b.disabled=true; opts.appendChild(b); }); sgSet();
    big.textContent=midiName(r)+' '+t[0].toLowerCase(); sub.textContent='The first note is '+midiName(notes[0])+'. Press Ready and sing all the notes, one at a time.'; msg.textContent='';
    S(notes[0],1.8,.85,0);
    ctl.textContent=''; btn('Hear the first note again',()=>S(notes[0],1.8,.85,0)); btn('READY',sgReady,true); btn('Change scale',()=>render());
  },true);
}
async function sgReady(){
  const msg=$('#earMsg'), sub=$('#earSub'), ctl=$('#earCtl');
  if(!sg||sg.stream) return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ msg.textContent='This browser cannot use the microphone.'; return; }
  let stream; try{ await ensureCtx(); stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:true}}); }
  catch(_){ msg.textContent='Microphone access was blocked. Allow the microphone for this site in your browser settings, then press Ready again.'; return; }
  if(!sg){ stream.getTracks().forEach(t=>t.stop()); return; }
  const src=ctx.createMediaStreamSource(stream), an=ctx.createAnalyser(); an.fftSize=2048; src.connect(an);
  Object.assign(sg,{stream,src,an,buf:new Float32Array(an.fftSize),win:[],ref:null,held:false,gone:0});
  ctl.textContent=''; const stop=el('button','e-btn','■ Stop'); stop.type='button'; stop.onclick=()=>{ sgStop(); render(); }; ctl.appendChild(stop);
  msg.textContent='Listening. Sing '+midiName(sg.notes[0])+' now.'; sgSet();
  sg.timer=setInterval(sgTick,30);
}
const fold=x=>((x%12)+18)%12-6;                     // distance in semitones, folded to -6..6 (any octave counts)
function sgTick(){
  if(!sg) return; sg.an.getFloatTimeDomainData(sg.buf); const p=detectPitch(sg.buf,ctx.sampleRate);
  const ok=p.f>0&&p.rms>0.01&&p.c>=0.6, sub=$('#earSub');
  if(!ok){ sg.win=[]; if(++sg.gone>=5){ sg.held=false; sg.ref=null; } sub.textContent=sg.i<sg.notes.length?'Sing '+midiName(sg.notes[sg.i])+'…':''; return; }
  sg.gone=0; const m=69+12*Math.log2(p.f/440); sub.textContent='Hearing '+midiName(Math.round(m));
  sg.win.push(m); if(sg.win.length>10) sg.win.shift(); if(sg.win.length<10) return;
  const ref=sg.win[sg.win.length-1], spread=Math.max(...sg.win.map(x=>Math.abs(fold(x-ref))));
  if(spread>0.6) return;                                           // still sliding: wait until the note is steady
  const med=ref+sg.win.map(x=>fold(x-ref)).sort((a,b)=>a-b)[5];
  if(sg.held&&sg.ref!=null&&Math.abs(fold(med-sg.ref))<0.7) return; // same note still being held: already judged
  const T=sg.notes[sg.i], prev=sg.i>0?sg.notes[sg.i-1]:null;
  if(prev!=null&&Math.abs(fold(med-prev))<=0.5&&sg.state[sg.i]==='') { sg.held=true; sg.ref=med; return; } // still on the note just sung
  sg.held=true; sg.ref=med; const d=Math.abs(fold(med-T)), sung=midiName(Math.round(med)), msg=$('#earMsg');
  if(d<=0.5){ sg.state[sg.i]='ok'; msg.textContent='✓ '+sung+' is right.'; sg.i++; if(sg.i>=sg.notes.length) return sgDone(); sgSet(); msg.textContent+=' Next: '+midiName(sg.notes[sg.i])+'.'; }
  else { sg.first[sg.i]=false; sg.err[sg.i]++; if(!sg.wrong[sg.i].includes(sung)) sg.wrong[sg.i].push(sung); if(d<=1.5){ sg.state[sg.i]='near'; if(!sg.worst[sg.i]) sg.worst[sg.i]='near'; msg.textContent='Close: you sang '+sung+', a semitone away from '+midiName(T)+'. Try again.'; } else { sg.state[sg.i]='miss'; sg.worst[sg.i]='miss'; msg.textContent='You sang '+sung+'. We need '+midiName(T)+'. Try again.'; } sgSet(); }
}
function sgDone(){
  const s=sg, n=s.notes.length, good=s.first.filter(Boolean).length; sgStop(); sg=null; drawKb(s.notes,[]);
  const big=$('#earBig'), sub=$('#earSub'), msg=$('#earMsg'), ctl=$('#earCtl'); ctl.textContent='';
  big.textContent=good+' / '+n; sub.textContent='First-try notes in '+midiName(s.r)+' '+s.tname.toLowerCase();
  msg.textContent=(good===n?'Every note on the first try. ':good>=n*.7?'Good singing. ':'Keep at it. Hear the scale, then sing it again. ')+' ';
  [...$('#earOpts').children].forEach((b,i)=>{ b.className='e-opt sg '+(s.worst[i]==='miss'?'bad':s.worst[i]==='near'?'near':'ok'); if(s.err[i]) b.textContent=midiName(s.notes[i])+' ×'+s.err[i]; });
  { const errs=s.err.reduce((a,b)=>a+b,0), rows=s.notes.map((m,i)=>({name:midiName(m)+(s.notes.slice(0,i).includes(m)?' (again)':''),r:s.err[i]?0:1,w:s.err[i],text:s.err[i]?s.err[i]+(s.err[i]===1?' wrong try':' wrong tries')+' · you sang '+s.wrong[i].join(', '):'right first time'})); resPanel($('#earOpts'),rows,errs); }
  const again=el('button','e-btn pri','Sing it again'); again.type='button'; again.onclick=()=>{ sg={notes:s.notes,i:0,state:s.notes.map(()=>''),first:s.notes.map(()=>true),err:s.notes.map(()=>0),worst:s.notes.map(()=>''),wrong:s.notes.map(()=>[]),r:s.r,tname:s.tname}; [...$('#earOpts').children].forEach(b=>b.className='e-opt sg'); sgSet(); $('#earBig').textContent=midiName(s.r)+' '+s.tname.toLowerCase(); S(s.notes[0],1.8,.85,0); ctl.textContent=''; const rd=el('button','e-btn pri','READY'); rd.type='button'; rd.onclick=sgReady; ctl.appendChild(rd); $('#earMsg').textContent=''; $('#earSub').textContent='The first note is '+midiName(s.notes[0])+'. Press Ready.'; };
  const hear=el('button','e-btn','Hear the scale'); hear.type='button'; hear.onclick=()=>s.notes.forEach((m,i)=>S(m,.9,.8,i*.55));
  const back=el('button','e-btn','Choose another'); back.type='button'; back.onclick=()=>render();
  ctl.append(again,hear,back);
}


/* ---------- relative pitch: scale, note, interval and chord tests, with correct spelling (double sharps and flats) ---------- */
const LET=['C','D','E','F','G','A','B'], LPC=[0,2,4,5,7,9,11], ACC={'-2':'♭♭','-1':'♭','0':'','1':'♯','2':'♯♯'};
const ROOTS=[['C',0,0],['C♯',0,1],['D♭',1,1],['D',1,2],['E♭',2,3],['E',2,4],['F',3,5],['F♯',3,6],['G♭',4,6],['G',4,7],['A♭',5,8],['A',5,9],['B♭',6,10],['B',6,11]];
const KEYS=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
function spellAt(root,gen,semis){ const li=(root[1]+gen-1)%7, pc=(((root[2]+semis)%12)+12)%12; let d=((pc-LPC[li])%12+12)%12; if(d>6) d-=12; return (d<-2||d>2)?null:LET[li]+ACC[d]; }
function pickRoot(items,key){
  const fits=r=>items.every(([g,s])=>spellAt(r,g,s)!=null);
  if(key&&key!=='rand'){ const k=ROOTS.find(r=>r[0]===key); if(k&&fits(k)) return k; const pc=k?k[2]:0, alt=ROOTS.filter(r=>r[2]===pc&&fits(r)); if(alt.length) return alt[0]; }
  const c=ROOTS.filter(fits); return c[R(c.length)]||ROOTS[0];
}
const labelMap=(pairs)=>{ const m={}; pairs.forEach(([midi,name])=>{ if(m[midi]==null) m[midi]=name; else if(m[midi]!==name){ m[midi]=[].concat(m[midi],name); } }); return m; };
// intervals: [id, group, name, generic number, semitones, quality]
const INTS=[['M2','Major','Major second',2,2,'M'],['M3','Major','Major third',3,4,'M'],['M6','Major','Major sixth',6,9,'M'],['M7','Major','Major seventh',7,11,'M'],
 ['m2','Minor','Minor second',2,1,'m'],['m3','Minor','Minor third',3,3,'m'],['m6','Minor','Minor sixth',6,8,'m'],['m7','Minor','Minor seventh',7,10,'m'],
 ['P1','Perfect','Perfect prime',1,0,'P'],['P4','Perfect','Perfect fourth',4,5,'P'],['P5','Perfect','Perfect fifth',5,7,'P'],['P8','Perfect','Perfect octave',8,12,'P'],
 ['d2','Diminished','Diminished second',2,0,'d'],['d3','Diminished','Diminished third',3,2,'d'],['d4','Diminished','Diminished fourth',4,4,'d'],['d5','Diminished','Diminished fifth',5,6,'d'],['d6','Diminished','Diminished sixth',6,7,'d'],['d7','Diminished','Diminished seventh',7,9,'d'],['d8','Diminished','Diminished octave',8,11,'d'],
 ['A1','Augmented','Augmented prime',1,1,'A'],['A2','Augmented','Augmented second',2,3,'A'],['A3','Augmented','Augmented third',3,5,'A'],['A4','Augmented','Augmented fourth',4,6,'A'],['A5','Augmented','Augmented fifth',5,8,'A'],['A6','Augmented','Augmented sixth',6,10,'A'],['A7','Augmented','Augmented seventh',7,12,'A']];
const IBY=Object.fromEntries(INTS.map(x=>[x[0],x])), IBYN=Object.fromEntries(INTS.map(x=>[x[2],x]));
const FLIPQ={M:'m',m:'M',P:'P',d:'A',A:'d'};
const invOf=e=>INTS.find(x=>x[3]===(e[3]===1?8:e[3]===8?1:9-e[3])&&x[5]===FLIPQ[e[5]]);
const CH={tri:['Triads',[['Major',[[1,0],[3,4],[5,7]]],['Minor',[[1,0],[3,3],[5,7]]],['Sus2',[[1,0],[2,2],[5,7]]],['Sus4',[[1,0],[4,5],[5,7]]],['Diminished',[[1,0],[3,3],[5,6]]],['Augmented',[[1,0],[3,4],[5,8]]],['Major add9',[[1,0],[3,4],[5,7],[9,14]]]]],
 sev:['Seventh chords',[['Major seventh',[[1,0],[3,4],[5,7],[7,11]]],['Minor seventh',[[1,0],[3,3],[5,7],[7,10]]],['Dominant seventh',[[1,0],[3,4],[5,7],[7,10]]],['Half-diminished seventh',[[1,0],[3,3],[5,6],[7,10]]],['Diminished seventh',[[1,0],[3,3],[5,6],[7,9]]],['7sus4',[[1,0],[4,5],[5,7],[7,10]]],['Diminished major seventh',[[1,0],[3,3],[5,6],[7,11]]],['Augmented major seventh',[[1,0],[3,4],[5,8],[7,11]]]]],
 nin:['Ninth chords',[['Major ninth',[[1,0],[3,4],[5,7],[7,11],[9,14]]],['Minor ninth',[[1,0],[3,3],[5,7],[7,10],[9,14]]],['Dominant ninth',[[1,0],[3,4],[5,7],[7,10],[9,14]]],['Dominant ninth (suspended fourth)',[[1,0],[4,5],[5,7],[7,10],[9,14]]]]]};
const CHK=['tri','sev','nin'];
// scale types for the Scale test: name, semitones to the octave, generic numbers
const HEPT=[1,2,3,4,5,6,7,8];
const RSC=[...SCALES,...MODES].map(([nm,iv])=>[nm,iv,iv.length===6?(nm==='Major pentatonic'?[1,2,3,5,6,8]:[1,3,4,5,7,8]):HEPT]);
const RS={key:'rand',scale:0,slide:2,grp:'stable',imode:'int',ichk:{M2:1,M3:1,M6:1,M7:1},vh:'v',cset:'tri',cchk:{}};
const MAJ=[0,2,4,5,7,9,11];
const tonicChord=iv=>[0,iv.includes(4)?4:3,iv.includes(7)?7:iv.includes(6)?6:8];
function scaleTones(t,sl){ // the notes being tested: slide right = tonic and up, slide left = tonic and down
  const iv=t[1], gn=t[2], n=iv.length-1, out=[{semis:0,gen:1,deg:1}];
  if(sl>0) for(let j=1;j<=Math.min(sl,n);j++) out.push({semis:iv[j],gen:gn[j],deg:j+1});
  else for(let k=1;k<=Math.min(-sl,n);k++){ const j=n-k; out.push({semis:iv[j]-12,gen:gn[j],deg:j+1}); }
  return out;
}
const slideText=(t,sl)=>{ if(!sl) return 'Slide left or right to choose the notes'; const r=pickRoot([[1,0],...scaleTones(t,sl).map(x=>[x.gen,x.semis])],'C'); return scaleTones(t,sl).map(x=>spellAt(r,x.gen,x.semis)).join(' '); };

function relQ(){
  if(rcat==='scale'||rcat==='note') return relNoteQ();
  if(rcat==='interval') return relIntQ();
  return relChordQ();
}
function relNoteQ(){
  let iv,gn,tones,tname,items;
  if(rcat==='note'){ iv=[...MAJ,12]; gn=HEPT; tname='major scale'; const degs=RS.grp==='stable'?[1,3,5]:[7,2,4,6]; tones=degs.map(d=>({semis:iv[d-1],gen:d,deg:d})); }
  else { const t=RSC[RS.scale]; iv=t[1]; gn=t[2]; tname=t[0].toLowerCase()+(/ pentatonic$/.test(tname||'')?'':' scale'); tname=t[0].toLowerCase(); tones=scaleTones(t,RS.slide); }
  items=[...gn.map((g,i)=>[g,iv[i]]),...tones.map(x=>[x.gen,x.semis])];
  const root=pickRoot(items,RS.key), t0=60+root[2], nm=x=>spellAt(root,x.gen,x.semis), tc=tonicChord(iv);
  const lab=x=>rcat==='note'?x.deg+' · '+nm(x):nm(x);
  const target=tones[R(tones.length)];
  const ctx=()=>{ clr(); drawKb([],[]); iv.forEach((x,i)=>{ S(t0+x,.55,.8,i*.42); timers.push(setTimeout(()=>drawKb([],[t0+x]),i*420)); }); const d=iv.length*.42+.35; tc.forEach(x=>S(t0+x,2,.75,d+.012*x)); S(t0-12,2,.7,d); timers.push(setTimeout(()=>drawKb([],tc.map(x=>t0+x)),d*1000)); timers.push(setTimeout(()=>drawKb([],[]),(d+2)*1000)); };
  const play=()=>S(t0+target.semis,1.8,.9,0);
  const opts=(rcat==='note'?tones.slice().sort((a,b)=>a.deg-b.deg):tones.slice().sort((a,b)=>a.semis-b.semis)).map(lab);
  const why=rcat==='note'?'That was '+nm(target)+', the '+target.deg+' of the '+nm({gen:1,semis:0})+' major scale ('+(RS.grp==='stable'?'a stable tone':'an active tone')+').':'That was '+nm(target)+' in '+nm({gen:1,semis:0})+' '+tname+'.';
  const tm=t0+target.semis; return {opts,ans:lab(target),ctx,play,why,kb:{lh:[t0],rh:[tm],spell:labelMap([[t0,nm({gen:1,semis:0})],[tm,nm(target)]])}};
}
function relIntQ(){
  const picks=Object.keys(RS.ichk).filter(k=>RS.ichk[k]).map(k=>IBY[k]), base=picks[R(picks.length)], inv=RS.imode==='inv';
  const root=pickRoot([[1,0],[base[3],base[4]]],'rand'), b=48+root[2], rn=spellAt(root,1,0), un=spellAt(root,base[3],base[4]);
  let lo,hi,loN,hiN,heard;
  if(!inv){ lo=b; hi=b+base[4]; loN=rn; hiN=un; heard=base; } else { lo=b+base[4]; hi=b+12; loN=un; hiN=rn; heard=invOf(base); }
  const names=[...new Set(picks.map(e=>inv?invOf(e)[2]:e[2]))];
  const ser=names.map(x=>IBYN[x][4]);
  return {opts:names,ans:heard[2],eq:o=>IBYN[o]&&IBYN[o][4]===heard[4],
    play(){ S(lo,1.5,.85,0); S(hi,1.8,.85,.95); },
    kb:{lh:[lo],rh:[hi],spell:labelMap([[lo,loN],[hi,hiN]])},
    why:heard[2]+': '+loN+' up to '+hiN+(inv?', the inversion of a '+base[2].toLowerCase()+' ('+rn+' up to '+un+')':'')+'.'+(names.filter(x=>IBYN[x][4]===heard[4]).length>1?' (Some of these sound the same; only the spelling differs.)':'')};
}
function relChordQ(){
  const list=CH[RS.cset][1].filter(c=>RS.cchk[RS.cset+':'+c[0]]), c=list[R(list.length)];
  const root=pickRoot(c[1],'rand'), b=48+root[2], notes=c[1].map(([g,s])=>b+s), horiz=RS.vh==='h';
  return {opts:list.map(x=>x[0]),ans:c[0],
    play(){ notes.forEach((m,i)=>S(m,horiz?1.1:2.6,.8,horiz?i*.55:i*.012)); },
    kb:{lh:[],rh:notes,spell:labelMap(c[1].map(([g,s])=>[b+s,spellAt(root,g,s)]))},
    why:'That was a '+c[0]+' chord on '+spellAt(root,1,0)+': '+c[1].map(([g,s])=>spellAt(root,g,s)).join(' ')+'. '+(horiz?'Played one note at a time (horizontal).':'Played together (vertical).')};
}

/* settings screen */
function relUI(){
  const ctl=$('#earCtl'), opts=$('#earOpts'), big=$('#earBig'), sub=$('#earSub'); ctl.textContent=''; opts.textContent='';
  const box=el('div','rp'); opts.appendChild(box);
  const seg=(list,val,fn)=>{ const d=el('div','e-seg sm'); list.forEach(([k,t])=>{ const b=el('button',null,t); b.type='button'; b.setAttribute('aria-pressed',String(k===val)); b.onclick=()=>{ fn(k); d.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); }; d.appendChild(b); }); return d; };
  const row=(lbl,...kids)=>{ const r=el('div','rp-row'); if(lbl) r.appendChild(el('span','e-lbl',lbl)); kids.forEach(k=>r.appendChild(k)); box.appendChild(r); return r; };
  const sl=(list,val,fn)=>{ const s=el('select'); list.forEach(([k,t])=>{ const o=el('option',null,t); o.value=k; s.appendChild(o); }); s.value=val; s.onchange=()=>fn(s.value); return s; };
  const checks=(items,get,set,wrap)=>{ items.forEach(([id,txt])=>{ const l=el('label','rp-chk'), c=document.createElement('input'); c.type='checkbox'; c.checked=!!get(id); c.onchange=()=>set(id,c.checked); l.append(c,document.createTextNode(txt)); wrap.appendChild(l); }); };
  const keySel=()=>sl([['rand','Any key'],...KEYS.map(k=>[k,k+' major'])],RS.key,v=>{ RS.key=v; });
  const start=el('button','e-btn pri','Start the test'); start.type='button';
  if(rcat==='scale'){
    big.textContent='Scale test'; sub.textContent='Choose the scale or mode and how many notes to be tested on. I play the scale and the 1 chord, you press READY, then I sound one note.';
    const lbl=el('div','e-big'); lbl.style.cssText='font-size:clamp(28px,4vw,48px);min-height:0'; const rng=document.createElement('input'); rng.type='range'; rng.step=1; rng.className='rp-rng';
    const setR=()=>{ const t=RSC[RS.scale], n=t[1].length-1; rng.min=-n; rng.max=n; if(Math.abs(RS.slide)>n) RS.slide=Math.sign(RS.slide)*n; rng.value=RS.slide; lbl.textContent=slideText(t,RS.slide); };
    rng.oninput=()=>{ RS.slide=+rng.value; lbl.textContent=slideText(RSC[RS.scale],RS.slide); start.disabled=RS.slide===0; };
    row('Key',keySel()); row('Scale or mode',sl(RSC.map((x,i)=>[String(i),x[0]]),String(RS.scale),v=>{ RS.scale=+v; setR(); }));
    const r=row('Notes to be tested'); const w=el('div','rp-slide'); w.append(el('small',null,'◀ down from the tonic'),rng,el('small',null,'up from the tonic ▶')); r.appendChild(w); box.appendChild(lbl); setR(); start.disabled=RS.slide===0;
  } else if(rcat==='note'){
    big.textContent='Note test'; sub.textContent='I play the major scale, then the 1 chord. You press READY and I sound one note. Which note is it?';
    ctl.appendChild(seg([['stable','Stable tones (1, 3, 5)'],['active','Active tones (7, 2, 4, 6)']],RS.grp,v=>{ RS.grp=v; })); row('Key',keySel());
  } else if(rcat==='interval'){
    big.textContent='Interval test'; sub.textContent='Tick the intervals you want to be tested on. In Intervals, I play the lower note then the higher one. In Inversions, the interval is turned upside down.';
    ctl.appendChild(seg([['int','Intervals'],['inv','Inversions']],RS.imode,v=>{ RS.imode=v; }));
    ['Major','Minor','Perfect','Diminished','Augmented'].forEach(g=>{ const grp=el('div','rp-grp'); grp.appendChild(el('h3',null,g+' intervals')); const ex={Major:[2,4,9,11],Minor:[1,3,8,10]}; const base=ROOTS[0];
      checks(INTS.filter(x=>x[1]===g).map(x=>[x[0],x[2]+' (C and '+spellAt(base,x[3],x[4])+')']),id=>RS.ichk[id],(id,v)=>{ RS.ichk[id]=v; },grp); box.appendChild(grp); });
  } else {
    big.textContent='Chord test'; sub.textContent='Choose vertical (notes together) or horizontal (notes one at a time), and which chords make up the test. Any key.';
    ctl.appendChild(seg([['v','Vertical (together)'],['h','Horizontal (separately)']],RS.vh,v=>{ RS.vh=v; }));
    const rng=document.createElement('input'); rng.type='range'; rng.min=0; rng.max=2; rng.step=1; rng.className='rp-rng'; rng.value=CHK.indexOf(RS.cset); const names=el('div','e-lbl'); const boxes=el('div','rp-grp');
    const draw=()=>{ boxes.textContent=''; const base=ROOTS[0]; boxes.appendChild(el('h3',null,CH[RS.cset][0])); const list=CH[RS.cset][1]; list.forEach(c=>{ if(RS.cchk[RS.cset+':'+c[0]]===undefined) RS.cchk[RS.cset+':'+c[0]]=true; }); checks(list.map(c=>[c[0],c[0]+' (C '+c[1].slice(1).map(([g,s])=>spellAt(base,g,s)).join(' ')+')']),id=>RS.cchk[RS.cset+':'+id],(id,v)=>{ RS.cchk[RS.cset+':'+id]=v; },boxes); names.textContent=CHK.map(k=>CH[k][0]).join('  ·  '); };
    rng.oninput=()=>{ RS.cset=CHK[+rng.value]; draw(); };
    const r=row('Chords in the test'); const w=el('div','rp-slide'); w.append(el('small',null,'Triads'),rng,el('small',null,'Ninths')); r.appendChild(w); box.appendChild(boxes); draw();
  }
  ctl.appendChild(start);
  start.onclick=()=>{
    if(rcat==='interval'&&Object.keys(RS.ichk).filter(k=>RS.ichk[k]).length<2){ $('#earMsg').textContent='Tick at least two intervals.'; return; }
    if(rcat==='chord'&&CH[RS.cset][1].filter(c=>RS.cchk[RS.cset+':'+c[0]]).length<2){ $('#earMsg').textContent='Tick at least two chords.'; return; }
    n=0; score=0; missed={}; stats={}; ctl.textContent=''; opts.textContent=''; $('#earMsg').textContent=''; next(); };
}


/* ---------- results: how well each note / item went ---------- */
function resPanel(host,rows,errs){
  const box=el('div','e-res'), good=rows.filter(x=>!x.w), bad=rows.filter(x=>x.w);
  box.appendChild(el('div','e-res-h',(errs===0?'No errors':errs+(errs===1?' error':' errors'))+' · '+good.length+' of '+rows.length+' done well'));
  [['Needs work',bad,'bad'],['Did well',good,'ok']].forEach(([t,list,c])=>{ if(!list.length) return; const sec=el('div','e-res-s'); sec.appendChild(el('h3',null,t));
    list.forEach(x=>{ const r=el('div','e-res-r '+c), d=el('span','e-dots'); for(let i=0;i<x.r;i++) d.appendChild(el('i','d ok')); for(let i=0;i<x.w;i++) d.appendChild(el('i','d bad')); r.append(el('b',null,x.name),d,el('span','e-res-t',x.text)); sec.appendChild(r); }); box.appendChild(sec); });
  host.appendChild(box);
}
const mixText=m=>{ const k=Object.keys(m||{}); return k.length?' · mistaken for '+k.join(', '):''; };

/* ---------- recognition: hear it, no keyboard ---------- */
function makeQ(){
  if(mode==='rel') return relQ();
  const root=48+R(12);
  if(cat==='note'){ const m=60+R(12); return {opts:NAMES,ans:NAMES[m%12],play(){ S(m,2,.85,0); },why:'That was '+NAMES[m%12]+'.'}; }
  if(cat==='scale'){ const a=SCALES[R(SCALES.length)], r=root; return {opts:SCALES.map(x=>x[0]),ans:a[0],play(){ a[1].forEach((x,i)=>S(r+x,.8,.8,i*.5)); },why:'That was a '+a[0].toLowerCase()+' scale starting on '+midiName(r)+'.'}; }
  if(cat==='interval'){ const a=IV[R(IV.length)], r=root; return {opts:IV.map(x=>x[1]),ans:a[1],play(){ S(r,1.4,.8,0); S(r+a[0],1.8,.8,.9); },why:a[1]+': '+midiName(r)+' up to '+midiName(r+a[0])+', '+a[0]+' half step'+(a[0]===1?'':'s')+'.'}; }
  if(cat==='chord'){
    if(chordSet==='deg'){ const a=DEG[R(DEG.length)]; return {opts:DEG.map(x=>x[0]),ans:a[0],play(){ [0,4,7].forEach((x,i)=>S(48+x,1.2,.7,i*.015)); S(36,1.2,.7,0); a[2].forEach((x,i)=>S(48+a[1]+x,2.2,.75,1.5+i*.015)); S(36+a[1],2.2,.75,1.5); },why:'That was the '+a[0]+' in C: '+NAMES[a[1]]+(a[2][1]===3?' minor':' major')+'.'}; }
    const L=CHORDSETS[chordSet].list, a=L[R(L.length)], r=root; return {opts:L.map(x=>x[0]),ans:a[0],play(){ a[1].forEach((x,i)=>S(r+x,2.2,.75,i*.015)); S(r-12,2.2,.7,0); },why:'That was a '+a[0].toLowerCase()+' chord on '+midiName(r)+'.'}; }
  const a=PROGS[R(PROGS.length)], r=48+R(12), others=PROGS.filter(x=>x!==a).sort(()=>Math.random()-.5).slice(0,5), opts=[a,...others].sort((x,y)=>PROGS.indexOf(x)-PROGS.indexOf(y)).map(x=>x.name);
  return {opts,ans:a.name,play(){ playProg(r,a.deg,1.3,1.5); },why:'That was '+a.name+' in '+midiName(r)+': '+a.deg.map(d=>chName(r,d)).join(' → ')+'.'};
}
function recognition(){
  const ctl=$('#earCtl');
  if(cat==='chord'){ const seg=el('div','e-seg sm'); Object.keys(CHORDSETS).forEach(k=>{ const b=el('button',null,CHORDSETS[k].name); b.type='button'; b.setAttribute('aria-pressed',String(k===chordSet)); b.onclick=()=>{ chordSet=k; render(); }; seg.appendChild(b); }); ctl.appendChild(seg); }
  next();
}
function next(){
  clr(); answered=false; const ctl=$('#earCtl'); ctl.querySelectorAll('.e-btn').forEach(b=>b.remove());
  const msg=$('#earMsg'), opts=$('#earOpts'); msg.textContent=''; opts.textContent='';
  if(n>=10) return done();
  q=makeQ(); $('#earBig').textContent='?'; $('#earSub').textContent='Question '+(n+1)+' of 10 · Score '+score;
  const mk=(t,fn,pri)=>{ const b=el('button','e-btn'+(pri?' pri':''),t); b.type='button'; b.onclick=fn; ctl.appendChild(b); return b; };
  if(mode==='rel') drawKb([],[]);
  if(q.ctx){ mk('Hear the key again',()=>q.ctx()); const rd=mk('READY',()=>{ rd.disabled=true; clr(); drawKb([],[]); opts.querySelectorAll('.e-opt').forEach(x=>x.disabled=false); q.play(); mk('Hear the note again',()=>q.play()); },true); }
  else { mk('▶ Play it',()=>{ q.play(); },true); mk('Hear again',()=>q.play()); }
  if(mode==='recog'&&cat==='note') mk('Hear C first',()=>S(60,1.6,.8,0));
  q.opts.forEach(o=>{ const b=el('button','e-opt',o); b.type='button'; if(q.ctx) b.disabled=true; b.onclick=()=>answer(o,b); opts.appendChild(b); });
  timers.push(setTimeout(()=>q.ctx?q.ctx():q.play(),300));
}
function answer(o,b){
  if(answered) return; answered=true; const opts=[...$('#earOpts').children], msg=$('#earMsg');
  opts.forEach(x=>{ x.disabled=true; if(x.textContent===q.ans||(q.eq&&q.eq(x.textContent))) x.classList.add('ok'); });
  const ok=q.eq?q.eq(o):o===q.ans; { const k=q.ans, t=stats[k]||(stats[k]={r:0,w:0,mix:{}}); if(ok) t.r++; else { t.w++; t.mix[o]=(t.mix[o]||0)+1; } } if(q.kb){ $('#earKb').hidden=false; drawKb(q.kb.lh,q.kb.rh,q.kb.spell); } if(ok) score++; else { b.classList.add('bad'); missed[q.ans]=(missed[q.ans]||0)+1; }
  $('#earBig').textContent=q.ans; $('#earSub').textContent='Question '+(n+1)+' of 10 · Score '+score;
  msg.textContent=(ok?'Right! ':'Not quite. ')+q.why+' '; n++;
  const nx=el('button','e-btn pri',n>=10?'See my score':'Next →'); nx.type='button'; nx.onclick=next; msg.appendChild(nx); nx.focus({preventScroll:true});
  try{ if(window.PSPROG) PSPROG.mark(); }catch(_){}
}
function done(){
  const msg=$('#earMsg'), ctl=$('#earCtl'); ctl.querySelectorAll('.e-btn').forEach(b=>b.remove());
  $('#earBig').textContent=score+' / 10'; $('#earSub').textContent='Round complete';
  $('#earKb').hidden=mode!=='rel';
  const miss=Object.keys(missed);
  { const rows=Object.keys(stats).map(k=>({name:k,r:stats[k].r,w:stats[k].w,text:stats[k].r+' right'+(stats[k].w?' · '+stats[k].w+' wrong'+mixText(stats[k].mix):'')})); $('#earOpts').textContent=''; resPanel($('#earOpts'),rows,10-score); }
  msg.textContent=(score>=9?'Excellent ear! Try another area. ':score>=6?'Good work. Keep going and it will get easier. ':'This takes practice, and that is normal. Switch to Awareness to hear and see them, then try again. ')+' ';
  const again=el('button','e-btn pri','Play another round'); again.type='button'; again.onclick=()=>{ n=0; score=0; missed={}; stats={}; next(); }; msg.appendChild(again);
  if(mode==='rel'){ const cs=el('button','e-btn','Change settings'); cs.type='button'; cs.onclick=()=>render(); msg.appendChild(cs); }
  const aw=el('button','e-btn','Switch to Awareness'); aw.type='button'; aw.onclick=()=>{ mode='aware'; try{ localStorage.setItem('ps-ear-mode',mode); }catch(_){} render(); }; msg.appendChild(aw);
  if(miss.length){ const ask=el('button','e-btn','Ask Pokey about what I missed'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout('In ear training ('+(mode==='rel'?RCATS.find(c=>c[0]===rcat)[1]+' relative pitch':CATS.find(c=>c[0]===cat)[1]+' recognition')+') I missed: '+miss.join(', ')+'. Help me hear the difference and give me something to practice on the keyboard.',{fresh:true}); }; msg.appendChild(ask); }
}
window.EAR={open,close};
})();
