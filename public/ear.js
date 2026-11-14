/* ear.js: Ear training room for Class.
   Awareness = hear it AND see it on the keyboard (explore).  Recognition = hear it only, no keyboard (quiz).
   Five areas: Note, Scale, Interval, Chord, Pattern. Pattern waits for the teacher's own patterns (PATTERNS below). */
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
const PATTERNS=[];
const CATS=[['note','Note'],['scale','Scale'],['interval','Interval'],['chord','Chord'],['pattern','Pattern']];

let ov=null, mode='aware', cat='note', chordSet='tri', n=0, score=0, q=null, missed={}, lit=[], timers=[], answered=false;
try{ mode=localStorage.getItem('ps-ear-mode')==='recog'?'recog':'aware'; cat=localStorage.getItem('ps-ear-cat')||'note'; }catch(_){}
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
  ov.innerHTML='<div class="e-top"><button class="e-round" id="earX" type="button" aria-label="Back" title="Back">←</button><h1>Ear training</h1><span class="e-sp"></span><div class="e-seg" id="earMode" role="group" aria-label="Awareness or recognition"><button type="button" data-m="aware">Awareness</button><button type="button" data-m="recog">Recognition</button></div><button class="e-round" id="earDots" type="button" aria-label="Whiteboard and keyboard" title="Whiteboard and keyboard">⋯</button></div>'+
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
function close(){ clr(); if(ov) ov.hidden=true; try{ if(window.CLASS&&CLASS.endPractice) CLASS.endPractice(); }catch(_){} }

function render(){
  clr(); lit=[]; n=0; score=0; missed={}; q=null; answered=false;
  ov.querySelectorAll('#earMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===mode)));
  const cats=$('#earCats'); cats.textContent=''; CATS.forEach(([k,t])=>{ const b=el('button','e-cat',t+' '+(mode==='aware'?'awareness':'recognition')); b.type='button'; b.setAttribute('aria-pressed',String(k===cat)); b.onclick=()=>{ cat=k; try{ localStorage.setItem('ps-ear-cat',k); }catch(_){} render(); }; cats.appendChild(b); });
  $('#earKb').hidden=mode!=='aware';
  $('#earLbl').textContent=(mode==='aware'?'Awareness':'Recognition')+' · '+CATS.find(c=>c[0]===cat)[1];
  $('#earMsg').textContent=''; $('#earOpts').textContent=''; $('#earCtl').textContent=''; $('#earBig').textContent=''; $('#earSub').textContent='';
  if(cat==='pattern'&&!PATTERNS.length){ $('#earBig').textContent='Pattern'; $('#earSub').textContent=''; const g=el('div','e-gap','Pattern ear training is waiting for your patterns. Tell me what a pattern is in your method and which ones to include, and they will appear here for both awareness and recognition.'); $('#earOpts').appendChild(g); $('#earKb').hidden=true; return; }
  if(mode==='aware') awareness(); else recognition();
}

/* ---------- the keyboard ---------- */
function drawKb(lh,rh){
  const wrap=$('#earKbWrap'); if(!wrap||typeof keyboardSVG!=='function') return;
  const svg=keyboardSVG(lh||[],rh||[],{lo:36,hi:96,height:64,fingers:false});
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
  else if(cat==='pattern'){ const P=PATTERNS; ctl.appendChild(rootSel()); ctl.appendChild(sel('aPt',P.map(x=>x.name),0)); btn('Play',()=>{ const r=root(), a=P[+ctl.querySelector('#aPt').value], notes=a.notes.map(x=>r+x); big.textContent=a.name; sub.textContent=notes.map(midiName).join('  '); lit=[]; drawKb([],[]); notes.forEach((m,i)=>{ timers.push(setTimeout(()=>{ S(m,a.harm?2.4:.9,.8,0); lit=a.harm?notes:notes.slice(0,i+1); drawKb([],lit); },a.harm?0:i*520)); }); },true); big.textContent='Choose a pattern'; drawKb([],[]); }
}

/* ---------- recognition: hear it, no keyboard ---------- */
function makeQ(){
  const root=48+R(12);
  if(cat==='note'){ const m=60+R(12); return {opts:NAMES,ans:NAMES[m%12],play(){ S(m,2,.85,0); },why:'That was '+NAMES[m%12]+'.'}; }
  if(cat==='scale'){ const a=SCALES[R(SCALES.length)], r=root; return {opts:SCALES.map(x=>x[0]),ans:a[0],play(){ a[1].forEach((x,i)=>S(r+x,.8,.8,i*.5)); },why:'That was a '+a[0].toLowerCase()+' scale starting on '+midiName(r)+'.'}; }
  if(cat==='interval'){ const a=IV[R(IV.length)], r=root; return {opts:IV.map(x=>x[1]),ans:a[1],play(){ S(r,1.4,.8,0); S(r+a[0],1.8,.8,.9); },why:a[1]+': '+midiName(r)+' up to '+midiName(r+a[0])+', '+a[0]+' half step'+(a[0]===1?'':'s')+'.'}; }
  if(cat==='chord'){
    if(chordSet==='deg'){ const a=DEG[R(DEG.length)]; return {opts:DEG.map(x=>x[0]),ans:a[0],play(){ [0,4,7].forEach((x,i)=>S(48+x,1.2,.7,i*.015)); S(36,1.2,.7,0); a[2].forEach((x,i)=>S(48+a[1]+x,2.2,.75,1.5+i*.015)); S(36+a[1],2.2,.75,1.5); },why:'That was the '+a[0]+' in C: '+NAMES[a[1]]+(a[2][1]===3?' minor':' major')+'.'}; }
    const L=CHORDSETS[chordSet].list, a=L[R(L.length)], r=root; return {opts:L.map(x=>x[0]),ans:a[0],play(){ a[1].forEach((x,i)=>S(r+x,2.2,.75,i*.015)); S(r-12,2.2,.7,0); },why:'That was a '+a[0].toLowerCase()+' chord on '+midiName(r)+'.'}; }
  const P=PATTERNS, a=P[R(P.length)], r=root; return {opts:P.map(x=>x.name),ans:a.name,play(){ a.notes.forEach((x,i)=>S(r+x,a.harm?2.2:.8,.8,a.harm?0:i*.5)); },why:'That was '+a.name+'.'};
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
  mk('▶ Play it',()=>{ q.play(); },true); mk('Hear again',()=>q.play());
  if(cat==='note') mk('Hear C first',()=>S(60,1.6,.8,0));
  q.opts.forEach(o=>{ const b=el('button','e-opt',o); b.type='button'; b.onclick=()=>answer(o,b); opts.appendChild(b); });
  timers.push(setTimeout(()=>q.play(),300));
}
function answer(o,b){
  if(answered) return; answered=true; const opts=[...$('#earOpts').children], msg=$('#earMsg');
  opts.forEach(x=>{ x.disabled=true; if(x.textContent===q.ans) x.classList.add('ok'); });
  const ok=o===q.ans; if(ok) score++; else { b.classList.add('bad'); missed[q.ans]=(missed[q.ans]||0)+1; }
  $('#earBig').textContent=q.ans; $('#earSub').textContent='Question '+(n+1)+' of 10 · Score '+score;
  msg.textContent=(ok?'Right! ':'Not quite. ')+q.why+' '; n++;
  const nx=el('button','e-btn pri',n>=10?'See my score':'Next →'); nx.type='button'; nx.onclick=next; msg.appendChild(nx); nx.focus({preventScroll:true});
  try{ if(window.PSPROG) PSPROG.mark(); }catch(_){}
}
function done(){
  const msg=$('#earMsg'), ctl=$('#earCtl'); ctl.querySelectorAll('.e-btn').forEach(b=>b.remove());
  $('#earBig').textContent=score+' / 10'; $('#earSub').textContent='Round complete';
  const miss=Object.keys(missed);
  msg.textContent=(score>=9?'Excellent ear! Try another area. ':score>=6?'Good work. Keep going and it will get easier. ':'This takes practice, and that is normal. Switch to Awareness to hear and see them, then try again. ')+' ';
  const again=el('button','e-btn pri','Play another round'); again.type='button'; again.onclick=()=>{ n=0; score=0; missed={}; next(); }; msg.appendChild(again);
  const aw=el('button','e-btn','Switch to Awareness'); aw.type='button'; aw.onclick=()=>{ mode='aware'; try{ localStorage.setItem('ps-ear-mode',mode); }catch(_){} render(); }; msg.appendChild(aw);
  if(miss.length){ const ask=el('button','e-btn','Ask Pokey about what I missed'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout('In ear training ('+CATS.find(c=>c[0]===cat)[1]+' recognition) I missed: '+miss.join(', ')+'. Help me hear the difference and give me something to practice on the keyboard.',{fresh:true}); }; msg.appendChild(ask); }
}
window.EAR={open,close};
})();
