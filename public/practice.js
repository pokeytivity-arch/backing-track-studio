/* practice.js: Scale practice and Chord practice rooms for Class. Same look as the Ear training room.
   Left hand is blue, right hand is orange, on the keyboard and in the step chips. */
(function(){
'use strict';
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const FLAT_N=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'], SHARP_N=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const LH='#1c7ed6', RH='#f76707';
const DIRS=[['up','Up'],['down','Down'],['updown','Up and down']];
const CDIRS=[['up','Open'],['down','Close'],['updown','Open and close']];
const MOTIONS=[['similar','Similar'],['contrary','Contrary']];
const HANDS=[['rh','Right hand'],['lh','Left hand'],['both','Both hands']];
let ov=null, kind='scales', steps=[], cur=-1, playing=false, timers=[], title='', sub='';
let st={sys:'letter',family:'regular',motion:'similar',mode:'learn',oct:1,type:'major',key:'C',hand:'rh',dir:'up',bpm:80,loop:false,chords:'',vh:'v',ckey:'C'};
try{ Object.assign(st,JSON.parse(localStorage.getItem('ps-pr')||'{}')); if(st.family!=='exotic') st.family='regular'; if(!['letter','solfa','number'].includes(st.sys)) st.sys='letter'; }catch(_){}
const save=()=>{ try{ localStorage.setItem('ps-pr',JSON.stringify(st)); }catch(_){} };
const $=s=>ov.querySelector(s);
let curDesc=false;
const clr=()=>{ curDesc=false; timers.forEach(clearTimeout); timers=[]; playing=false; const lp=document.getElementById('prLearn'); if(lp) lp.hidden=true; const b=$('#prPlay'); if(b) b.textContent=kind==='scales'?'▶ Play scale':'▶ Play chords'; };

const css=document.createElement('style'); css.textContent=`
#prRoom .p-leg{display:flex;gap:18px;align-items:center;font:700 13px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}
#prRoom .p-leg i{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-2px}
#prRoom .p-chips{display:flex;gap:10px;flex-wrap:wrap}
#prRoom .p-chip{min-width:78px;padding:10px 14px 8px;border-radius:16px;border:2px solid var(--k6b5826,#3a4a74);background:var(--k0d0b07,#0c1222);color:inherit;cursor:pointer;display:grid;gap:2px;text-align:center;font:800 20px var(--display,var(--body))}
#prRoom .p-chip small{font:700 12px var(--body);letter-spacing:.05em;display:flex;gap:8px;justify-content:center}
#prRoom .p-chip small b{font-weight:800}
#prRoom .p-chip small .r{color:#ff9142}#prRoom .p-chip small .l{color:#5aa8ff}
#prRoom .p-chip[aria-pressed=true]{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);border-color:transparent}
#prRoom .p-chip[aria-pressed=true] small .r,#prRoom .p-chip[aria-pressed=true] small .l{color:inherit}
#prRoom .p-pick{display:grid;gap:12px;padding:14px 16px;border:1.5px solid var(--k6b5826,#3a4a74);border-radius:16px}#prRoom .p-pick h3{margin:0;font:700 13px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}#prRoom .p-pills{display:flex;gap:8px;flex-wrap:wrap}#prRoom .p-pill{padding:9px 16px;border-radius:999px;border:1.5px solid var(--k6b5826,#3a4a74);background:transparent;color:inherit;font:700 15px var(--body);cursor:pointer}#prRoom .p-pill[aria-pressed=true]{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);border-color:transparent}#prRoom .p-pick select{background:var(--k17130a,#101728);color:inherit;border:1.5px solid var(--k6b5826,#3a4a74);border-radius:12px;padding:9px 12px;font:600 15px var(--body)}
#prRoom .p-in{flex:1 1 260px;min-width:0;background:var(--k17130a,#101728);color:inherit;border:1.5px solid var(--k6b5826,#3a4a74);border-radius:999px;padding:13px 20px;font:600 17px var(--body)}
#prRoom .p-in:focus{outline:2px solid var(--hi,#ffd43b);outline-offset:1px}
#prRoom .p-rng{display:inline-flex;align-items:center;gap:8px;font:700 13px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}
#prRoom .p-rng input[type=range]{width:130px;accent-color:var(--hi,#ffd43b)}
#prRoom .p-rng input[type=checkbox]{width:18px;height:18px;accent-color:var(--hi,#ffd43b)}
#prRoom .e-kb .e-lbl{gap:12px;flex-wrap:wrap}
`; document.head.appendChild(css);

function build(){
  ov=el('div'); ov.id='prRoom'; ov.hidden=true; ov.setAttribute('role','dialog');
  ov.innerHTML='<div class="e-top"><button class="e-round" id="prX" type="button" aria-label="Back" title="Back">←</button><h1 id="prH"></h1><span class="e-sp"></span><div class="e-seg" id="prHand" role="group" aria-label="Which hand"></div><button class="e-round" id="prDots" type="button" aria-label="Whiteboard and keyboard" title="Whiteboard and keyboard">⋯</button></div>'+
    '<div class="e-cats" id="prCats"></div>'+
    '<div class="e-now"><div><div class="e-lbl" id="prLbl"></div><div class="e-big" id="prBig"></div><div class="e-sub" id="prSub"></div></div><div><div class="e-ctl" id="prCtl"></div></div></div>'+
    '<div class="p-chips" id="prChips"></div><div id="prPick"></div><div class="e-msg" id="prMsg" aria-live="polite"></div>'+
    '<div class="e-kb"><div class="e-lbl"><span>Keyboard</span><span class="p-leg"><span><i style="background:'+LH+'"></i>Left hand</span><span><i style="background:'+RH+'"></i>Right hand</span></span></div><div class="p-kbw"><div id="prKb"></div></div></div>';
  document.body.appendChild(ov);
  $('#prX').onclick=close;
  $('#prDots').onclick=()=>{ close(); try{ if(window.CLASS) CLASS.slide(true); }catch(_){} };
  document.addEventListener('keydown',e=>{ if(ov&&!ov.hidden&&e.key==='Escape'&&!/INPUT|SELECT/.test((e.target||{}).tagName||'')) close(); });
}
let from=null;
const DEF={family:'regular',type:'major',key:'C',motion:'similar',mode:'learn',oct:1,hand:'rh',dir:'up',sys:'letter',bpm:80,loop:false};
const isDef=()=>Object.keys(DEF).every(k=>st[k]===DEF[k]);
function resumeAsk(){
  const SCN=window.SCALES, TL=((SCN&&SCN.types||[]).find(t=>t.id===st.type)||{l:'Major'}).l, what=SYMK(st.key)+' '+(st.type==='major'?'major':TL)+(st.oct>1?', '+st.oct+' octaves':'');
  const m=el('div','ps-menu'), sh=el('div','ps-sheet'), t=el('div','ps-t','Welcome back'), body=el('div','ps-l'); body.style.padding='14px 16px';
  body.appendChild(el('p',null,'You left the scale room on '+what+'. Continue from where you left off, or reset to the default settings?')); body.lastChild.style.margin='0 0 12px';
  const row=el('div'); row.style.cssText='display:flex;gap:10px;flex-wrap:wrap'; const go=el('button','e-btn pri','Continue where I left off'), rs=el('button','e-btn','Reset to default');
  [go,rs].forEach(b=>{ b.type='button'; b.style.cssText='flex:1 1 150px;justify-content:center;text-align:center;border:1.5px solid #3a4a74;border-radius:999px'; row.appendChild(b); });
  go.style.background='#ffd24d'; go.style.color='#151b28'; go.style.fontWeight='800'; rs.style.border='1.5px solid #3a4a74';
  go.onclick=()=>m.remove(); rs.onclick=()=>{ Object.assign(st,DEF); save(); m.remove(); loadScale(); render(); };
  body.appendChild(row); sh.append(t,body); m.appendChild(sh); document.body.appendChild(m); go.focus();
}
function open(k,o){ if(!ov) build(); try{ from=(window.SUITE&&SUITE.current())||from; }catch(_){} kind=k==='chords'?'chords':'scales'; ov.dataset.kind=kind; ov.hidden=false; clr(); steps=[]; cur=-1; render(); if(kind==='scales'&&!(o&&o.resume)&&!isDef()) resumeAsk(); }
function close(){ clr(); if(ov) ov.hidden=true; try{ if(window.CLASS&&CLASS.endPractice) CLASS.endPractice(); }catch(_){} }

/* ---------- typed chord names: "D minor 9", "C major seventh", "Dm7 G7 Cmaj7" ---------- */
const QW=new Set(['major','minor','min','dominant','diminished','augmented','suspended','half','half-diminished','add','seventh','ninth','eleventh','thirteenth','sixth','second','fourth','sus','maj','dim','aug']);
function normDesc(w){
  let s=w.join(' ').toLowerCase();
  s=s.replace(/half[\s-]?diminished(\s*seventh|\s*7)?/,'m7b5').replace(/\bdominant\b/,'').replace(/\bmajor\b/,'maj').replace(/\bminor\b|\bmin\b/,'m').replace(/\bdiminished\b/,'dim').replace(/\baugmented\b/,'aug').replace(/\bsuspended\b/,'sus')
   .replace(/seventh/,'7').replace(/ninth/,'9').replace(/eleventh/,'11').replace(/thirteenth/,'13').replace(/sixth/,'6').replace(/second/,'2').replace(/fourth/,'4').replace(/[\s\-()]/g,'');
  if(s==='maj') s=''; s=s.replace(/^majadd/,'add'); return s;
}
function normChords(text){
  const out=[];
  String(text||'').split(/[|,;\n]+/).map(x=>x.trim()).filter(Boolean).forEach(seg=>{
    let cur=null; seg.split(/\s+/).forEach(t=>{
      const word=QW.has(t.toLowerCase())||/^\d+$/.test(t)||/^(add|sus)\d*$/i.test(t);
      if(!word&&/^[A-G]/.test(t)){ if(cur) out.push(cur.r+normDesc(cur.d)); cur={r:t,d:[]}; }
      else if(cur) cur.d.push(t); });
    if(cur) out.push(cur.r+normDesc(cur.d)); });
  return out;
}

/* ---------- keyboard ---------- */
/* Letters, Solfa or Numbers. Solfa and numbers only exist for the scales Pokey has given syllables for; the numbers come from the syllables. */
const hasSol=()=>!!(window.SCALELIB&&SCALELIB.solfa[st.type]);
const sysNow=()=>(kind==='scales'&&st.sys!=='letter'&&hasSol())?st.sys:'letter';
const curS=()=>{ const s=steps[cur]; return curDesc&&s&&s.alt?s.alt:s; };
function lab(s,desc){ if(!s) return ''; const y=sysNow(); if(y==='letter') return DSP(s.name); const sy=(desc&&s.solD)||s.sol; if(!sy) return DSP(s.name); return y==='solfa'?sy:(SCALELIB.solnum[sy]||sy); }
function drawKb(){
  const wrap=$('#prKb'); if(!wrap||typeof keyboardSVG!=='function') return; const s=curS();
  let fm=null; if(kind==='scales'&&s){ fm={}; (s.lh||[]).forEach(m=>{ if(s.lfing) fm[m]=s.lfing; }); (s.rh||[]).forEach(m=>{ if(s.fing) fm[m]=s.fing; }); }
  const svg=keyboardSVG(s?s.lh:[],s?s.rh:[],{lo:36,hi:96,height:64,fingers:kind==='chords'&&!(s&&s.nofing),fmap:fm,spell:(s&&sysNow()!=='letter'&&s.sol)?(()=>{ const o={}; [...(s.lh||[]),...(s.rh||[])].forEach(m=>{ o[m]=lab(s,curDesc); }); return o; })():(s&&s.spell||null)});
  svg.addEventListener('pointerdown',e=>{ const r=e.target.closest('rect[data-m]'); if(!r) return; const m=+r.dataset.m, old=r.getAttribute('fill'); r.setAttribute('fill','#ffd43b'); if(window.CLASS) CLASS.sound(m,1.4,.85); setTimeout(()=>r.setAttribute('fill',old),260); });
  wrap.replaceChildren(svg);
  if(window.PSHANDS){ if(kind==="scales") PSHANDS.sync(wrap,steps.some(x=>x.fing||x.lfing),s,drawKb); else PSHANDS.sync(null,false); }
  ov.querySelectorAll('.p-chip').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===cur)));
}
function names(s){ return /b|♭|F(?!#)/.test(s.name)&&!/#|♯/.test(s.name)?FLAT_N:SHARP_N; }

/* ---------- steps ---------- */
function chips(){
  const box=$('#prChips'); box.textContent='';
  const mk=(s,i)=>{ const b=el('button','p-chip'); b.type='button'; b.appendChild(el('span',null,lab(s,false)));
    if(kind==='scales'){ const f=el('small'); if(s.lfing){ f.appendChild(el('b','l','L '+s.lfing)); } if(s.fing){ f.appendChild(el('b','r','R '+s.fing)); } if(s.lname&&!s.lfing) f.appendChild(el('b','l','L '+DSP(s.lname))); if(!s.lfing&&!s.fing&&!s.lname) f.textContent='–'; b.appendChild(f); }
    b.onclick=()=>{ clr(); cur=i; curDesc=false; show(); play1(s); }; return b; };
  const per=(kind==='scales'&&st.oct>0)?(steps.length-1)/((st.motion==='contrary'?Math.min(st.oct,2):st.oct)||1):0;
  if(kind==='scales'&&steps.length>1&&Number.isInteger(per)&&per>=4){ /* one octave per line: C D E F G A B / C D E F G A B (the top note ends the last line) */
    const rows=(steps.length-1)/per; for(let r=0;r<rows;r++){ const row=el('div','p-orow'); for(let i=r*per;i<r*per+per;i++) row.appendChild(mk(steps[i],i)); if(r===rows-1) row.appendChild(mk(steps[steps.length-1],steps.length-1)); box.appendChild(row); }
    return; }
  steps.forEach((s,i)=>{ box.appendChild(mk(s,i)); });
}
function play1(s,len){ try{ if(kind==='chords'&&st.vh==='h'){ [...s.lh,...s.rh].sort((a,b)=>a-b).forEach((m,i)=>CLASS.sound(m,1.1,.8,i*.5)); } else CLASS.playStep(s,len||1.6); }catch(_){} }
function show(){
  const s=steps[cur]; $('#prBig').style.fontSize='';
  if(kind==='chords'){ if(s){ $('#prBig').textContent=s.name; const N=names(s), t=(typeof fingerText==='function')?fingerText(s.lh,s.rh):null; $('#prSub').textContent='Left hand '+s.lh.map(m=>N[m%12]).join(' ')+'  ·  Right hand '+s.rh.map(m=>N[m%12]).join(' ')+(t?'  ·  Fingers: LH '+t.lh+', RH '+t.rh:''); } else { $('#prBig').textContent=steps.length?'Tap a chord':'Type chords'; $('#prSub').textContent=steps.length?'Tap a chord below, or press Play.':'Type chord names like Dm7 G7 Cmaj7, then press Show.'; } }
  drawKb();
}
function seq(){ const n=steps.length, up=[...Array(n).keys()]; return st.dir==='down'?up.slice().reverse():st.dir==='updown'?up.concat(up.slice(0,-1).reverse()):up; }
/* Learning mode: playback stops where a hand crosses (thumb over / under) and explains it */
const FN={2:'index finger',3:'middle finger',4:'ring finger',5:'little finger'};
function learnLines(a,b){
  const out=[], nm=DSP(b.name);
  if(a.lfing&&b.lfing&&a.lfing==='1'&&+b.lfing>=3&&b.lh.length) out.push('Left hand · '+a.lfing+' → '+b.lfing+': move your fingers over your thumb, with the intention of reaching the next note ('+nm+') with your '+FN[b.lfing]+'.');
  if(a.fing&&b.fing&&b.fing==='1'&&+a.fing>=3&&b.rh.length) out.push('Right hand · '+a.fing+' → 1: your thumb goes under the fingers, crossing '+(a.fing==='3'?'to the space between the middle finger and the ring finger, ':'')+'to the '+nm+'.');
  return out;
}
function showLearn(lines,go){
  let t=document.getElementById('prLearn'); if(!t){ t=el('div','p-learn'); t.id='prLearn'; const m=$('#prMsg'); m.parentNode.insertBefore(t,m.nextSibling); }
  t.textContent=''; const h=el('b',null,'Pause: thumb crossing'); t.appendChild(h); lines.forEach(x=>t.appendChild(el('p',null,x)));
  const b=el('button','e-btn pri','Continue'); b.type='button'; b.onclick=()=>{ t.hidden=true; go(); }; t.appendChild(b); t.hidden=false; try{ t.scrollIntoView({block:'nearest'}); }catch(_){}
}
function playAll(){
  if(playing){ clr(); return; } if(!steps.length) return;
  const order=kind==='scales'?seq():[...Array(steps.length).keys()], gap=(60/st.bpm)*(kind==='scales'?1:(steps.length>1?2:4))*1000;
  playing=true; $('#prPlay').textContent='■ Stop'; let p=0;
  const go=()=>{ if(!playing) return; cur=order[p]; curDesc=kind==='scales'&&p>0&&order[p]<order[p-1]; show(); play1(curS(),gap/1000*(kind==='scales'?1.6:1.05));
    timers.push(setTimeout(()=>{ if(!playing) return; p++; if(p>=order.length){ if(st.loop) p=0; else { clr(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } tick(); },gap)); };
  const tick=()=>{ if(!playing) return;
    if(kind==='scales'&&st.mode==='learn'&&p>0&&order[p]===order[p-1]+1){ const ln=learnLines(steps[order[p-1]],steps[order[p]]); if(ln.length){ showLearn(ln,go); return; } }
    go(); };
  tick();
}

/* ---------- controls ---------- */
const MQM=matchMedia('(max-width:700px)'); try{ MQM.addEventListener('change',()=>{ if(ov&&!ov.hidden&&kind==='scales') render(); }); }catch(_){}
/* Studio practice: only scales with 7 different notes (8 counting the octave note). Beat plan, 4/4:
   one octave up or down = every note one beat, played twice to fill 4 bars; one octave up and down = every note one beat, the last tonic two (4 bars);
   two or three octaves, up and down only = every tonic two beats, so each tonic lands on beat 1. Other combinations are not set up yet. */
const studioNotes=()=>{ const T=((window.SCALES&&SCALES.types)||[]).find(t=>t.id===st.type); return T?T.d.length:0; };
function studioWhy(){ if(studioNotes()!==7) return 'Studio practice is for scales with 7 different notes.'; if(st.oct>1&&st.dir!=='updown') return 'For two or three octaves, Studio practice is set up for Up and down only.'; return ''; }
function syncStudioBtn(){ const b=document.getElementById('prStudio'); if(!b) return; const w=studioWhy(); b.disabled=!!w; b.title=w||'Practice this scale with a backing track in the Studio'; b.style.opacity=w?'.45':''; }
function toStudio(){
  const why=studioWhy(); if(why||!steps.length||!window.STUDIO_SCALE) return; const order=seq(), SCN=window.SCALES, TL=((SCN&&SCN.types||[]).find(t=>t.id===st.type)||{l:'Major'}).l, N=studioNotes();
  let list=order.map((i,p)=>{ const desc=p>0&&order[p]<order[p-1], s=desc&&steps[i].alt?steps[i].alt:steps[i], o={label:lab(s,desc),lh:(s.lh||[]).slice(),rh:(s.rh||[]).slice(),fing:s.fing||'',lfing:s.lfing||'',spell:null,beats:1,tonic:i%N===0};
    if(sysNow()!=='letter'&&s.sol){ o.spell={}; [...o.lh,...o.rh].forEach(m=>{ o.spell[m]=o.label; }); } else o.spell=Object.assign({},s.spell||{}); return o; });
  if(st.oct===1){ if(st.dir==='updown') list[list.length-1].beats=2; else list=list.concat(list.map(x=>Object.assign({},x))); }
  else list.forEach(x=>{ if(x.tonic) x.beats=2; });
  const total=list.reduce((a,x)=>a+x.beats,0), rests=(4-total%4)%4;
  const HL={rh:'Right hand',lh:'Left hand',both:'Both hands'}, DL=(st.motion==='contrary'?CDIRS:DIRS).find(d=>d[0]===st.dir)[1];
  const info=(st.motion==='contrary'?'Both hands, contrary motion':HL[st.hand])+' · '+DL+' · '+(st.oct>1?st.oct+' octaves':'one octave')+' · 4/4';
  const title=SYMK(st.key)+' '+(st.type==='major'?'major':TL)+(st.oct>1?' · '+st.oct+' octaves':'')+(st.motion==='contrary'?' · contrary':'')+' scale';
  const back=from||'class'; close(); if(window.SUITE&&SUITE.returnTo) window.__psRet=()=>{ SUITE.returnTo('studio',()=>{ SUITE.go(back); setTimeout(()=>{ if(back==='class'&&window.CLASS&&CLASS.reopenPractice) CLASS.reopenPractice('scales'); else open('scales',{resume:true}); },260); }); };
  window.STUDIO_SCALE({title,steps:list,rests,info,hand:st.hand,dir:st.dir,key:st.key,type:st.type});
}
function transport(ctl){
  const b=el('button','e-btn pri',kind==='scales'?'▶ Play scale':'▶ Play chords'); b.id='prPlay'; b.type='button'; b.onclick=playAll; ctl.appendChild(b);
  if(kind==='scales'){ const sb=el('button','e-btn','Practice in Studio'); sb.id='prStudio'; sb.type='button'; sb.onclick=toStudio; { const w=studioWhy(); sb.disabled=!!w; sb.title=w||'Practice this scale with a backing track in the Studio'; if(w) sb.style.opacity='.45'; } ctl.appendChild(sb); }
  const t=el('label','p-rng'); t.innerHTML='Tempo <input type="range" min="40" max="200" step="2"><span></span>'; const r=t.querySelector('input'), o=t.querySelector('span'); r.value=st.bpm; o.textContent=st.bpm; r.oninput=()=>{ st.bpm=+r.value; o.textContent=r.value; save(); }; ctl.appendChild(t);
  const l=el('label','p-rng'); l.innerHTML='<input type="checkbox"> Loop'; const c=l.querySelector('input'); c.checked=!!st.loop; c.onchange=()=>{ st.loop=c.checked; save(); }; ctl.appendChild(l);
}
function seg(parent,list,val,fn,small){ parent.textContent=''; if(small) parent.classList.add('sm'); list.forEach(([k,t])=>{ const b=el('button',null,t); b.type='button'; b.dataset.k=k; b.setAttribute('aria-pressed',String(k===val)); b.onclick=()=>fn(k); parent.appendChild(b); }); }

function render(){
  clr(); const SC=window.SCALES, hand=$('#prHand'), cats=$('#prCats'), ctl=$('#prCtl'); { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); } ctl.textContent=''; cats.textContent=''; document.querySelectorAll('#prRoom .p-sels').forEach(n=>n.remove()); $('#prMsg').textContent='';
  $('#prH').textContent=kind==='scales'?'Scale practice':'Chord practice'; ov.setAttribute('aria-label',$('#prH').textContent);
  if(kind==='scales'){
    hand.hidden=st.motion==='contrary'; seg(hand,HANDS,st.hand,k=>{ st.hand=k; save(); hand.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); loadScale(); });
    const allT=(SC&&SC.types)||[], types=allT.filter(t=>t.fam===st.family), tl=id=>(allT.find(t=>t.id===id)||{l:'Major'}).l;
    if(types.length&&!types.some(t=>t.id===st.type)) st.type=types[0].id;
    const keysOK=(SC&&SC.allowedKeys)?SC.allowedKeys(st.type):((SC&&SC.keys)||[]); if(keysOK.length&&!keysOK.includes(st.key)) st.key=keysOK[0];
    const isMaj=st.type==='major', isDia=(allT.find(t=>t.id===st.type)||{}).g==='Diatonic'; if(st.motion==='contrary'&&!isDia){ st.motion='similar'; loadScale(); }
    keysOK.forEach(k=>{ const b=el('button','e-cat',SYMK(k)+(isMaj?' major':'')); b.type='button'; b.setAttribute('aria-pressed',String(k===st.key)); b.onclick=()=>{ st.key=k; save(); loadScale(); render(); }; cats.appendChild(b); });
    const sel=(lab,opts,val,fn)=>{ const w=el('label','p-sel'); w.appendChild(el('span',null,lab)); const s2=document.createElement('select'); s2.setAttribute('aria-label',lab); let og=null,gl=''; opts.forEach(o=>{ if(o.g!==undefined&&o.g!==gl){ gl=o.g; og=document.createElement('optgroup'); og.label=gl; s2.appendChild(og); } const op=document.createElement('option'); op.value=o.v; op.textContent=o.t; if(o.v===val) op.selected=true; (og&&o.g!==undefined?og:s2).appendChild(op); }); s2.onchange=()=>fn(s2.value); w.appendChild(s2); return w; };
    const ms=el('div','p-sels'); ms.append(sel('Scale',types.map(t=>({g:t.g,v:t.id,t:t.l})),st.type,v=>{ st.type=v; save(); loadScale(); render(); }),sel('Note',keysOK.map(k=>({v:k,t:SYMK(k)})),st.key,v=>{ st.key=v; save(); loadScale(); render(); })); cats.parentNode.insertBefore(ms,cats);
    cats.classList.add('p-keybtns');
    const d=el('div','e-seg sm'); d.setAttribute('role','group'); d.setAttribute('aria-label','Direction'); seg(d,st.motion==='contrary'?CDIRS:DIRS,st.dir,k=>{ st.dir=k; save(); syncStudioBtn(); clr(); d.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); },true);
    const fm=el('div','e-seg sm'); fm.setAttribute('role','group'); fm.setAttribute('aria-label','Scale family'); seg(fm,[['regular','Regular'],['exotic','Exotic']],st.family,k=>{ st.family=k; save(); clr(); render(); },true); ctl.appendChild(fm);
    const mo=el('div','e-seg sm'); mo.setAttribute('role','group'); mo.setAttribute('aria-label','Motion'); seg(mo,MOTIONS,st.motion,k=>{ st.motion=k; if(k==='contrary'&&st.oct>2) st.oct=2; save(); clr(); render(); },true); if(!isDia){ const cb=mo.querySelector('[data-k=contrary]'); if(cb){ cb.disabled=true; cb.title='Contrary motion is for the diatonic scales'; } } ctl.appendChild(mo);
    const md=el('div','e-seg sm'); md.setAttribute('role','group'); md.setAttribute('aria-label','Mode'); seg(md,[['learn','Learning'],['practice','Practice']],st.mode,k=>{ st.mode=k; save(); clr(); md.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); },true); ctl.appendChild(md);
    const sy=el('div','e-seg sm'); sy.setAttribute('role','group'); sy.setAttribute('aria-label','Note names'); seg(sy,[['letter','Letters'],['solfa','Solfa'],['number','Numbers']],st.sys,k=>{ st.sys=k; save(); clr(); render(); },true);
    if(!hasSol()) sy.querySelectorAll('[data-k=solfa],[data-k=number]').forEach(b=>{ b.disabled=true; b.title='Solfa is not added for this scale yet'; }); ctl.appendChild(sy);
    ctl.appendChild(sel('Octaves',[{v:'1',t:'One octave'},{v:'2',t:'Two octaves'}].concat(st.motion==='contrary'?[]:[{v:'3',t:'Three octaves'}]),String(st.oct||1),v=>{ st.oct=+v; save(); loadScale(); }));
    ctl.lastChild.classList.add('p-octs');
    transport(ctl); ctl.appendChild(d);
    const ask=el('button','e-btn','Ask Pokey about this scale'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout(st.type==='major'?'Tell me about the '+st.key+' major scale. How is it built with the 3+4 method, and what should I practice with it?':'Tell me about the '+st.key+' '+((SC&&SC.types||[]).find(t=>t.id===st.type)||{l:''}).l+' scale. How is it built, and what should I practice with it?',{fresh:true}); }; ctl.appendChild(ask);
    if(MQM.matches){ /* phone: row 1 = Scale, Note, Octaves, Loop, Tempo, Ask Pokey; row 2 = the toggles and Play scale; keyboard below. Desktop keeps its layout. */
      const r1=el('div','p-r1'), r2=el('div','p-r2'), rg=ctl.querySelectorAll('.p-rng'), pl=$('#prPlay'), oc=ctl.querySelector('.p-octs');
      ms.querySelectorAll('.p-sel').forEach(x=>r1.appendChild(x)); ms.remove();
      const r3=el('div','p-r3'); r1.append(oc,rg[1],rg[0]); ask.textContent='Ask Pokey'; r2.append(fm,mo,md,sy,hand,d); r3.append(ask,$('#prStudio'),pl); ctl.append(r1,r2,r3); hand.classList.add('sm');
    } else { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); }
    loadScale();
  } else {
    hand.hidden=true;
    const row=el('div','e-ctl'); row.style.width='100%'; const inp=el('input','p-in'); inp.type='text'; inp.id='prIn'; inp.placeholder='Type chords: Dm7 G7 Cmaj7'; inp.value=st.chords||''; inp.setAttribute('aria-label','Chords'); inp.autocomplete='off'; inp.spellcheck=false;
    const go=el('button','e-btn pri','Show chords'); go.type='button'; row.append(inp,go); ctl.appendChild(row); const go2=()=>loadChords(inp.value); go.onclick=go2; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); go2(); } };
    const r2=el('div','e-ctl'); r2.style.marginTop='10px'; ctl.appendChild(r2); const keep=ctl; transport(r2);
    const vh=el('div','e-seg sm'); seg(vh,[['v','Together'],['h','One by one']],st.vh,k=>{ st.vh=k; save(); vh.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); },true); r2.appendChild(vh);
    pick();
    const ask=el('button','e-btn','Ask Pokey about this chord'); ask.type='button'; ask.onclick=()=>{ const s=steps[cur>=0?cur:0]; close(); if(window.CLASS) CLASS.askAbout(s?'Tell me more about '+s.name+'. How is it built, how do I voice it, and what should I practice with it?':'Help me practice chords on the keyboard.',{fresh:true}); }; r2.appendChild(ask);
    const vb=el('button','e-btn','Voicings'); vb.type='button'; vb.onclick=()=>{ if(window.VOICE) VOICE.open(); }; r2.appendChild(vb);
    $('#prLbl').textContent='Chord practice'; if(st.chords) loadChords(st.chords,true); else { steps=[]; cur=-1; chips(); show(); chordTip([]); }
  }
}
function pick(){
  const box=$('#prPick'); box.textContent=''; const K=window.EAR&&EAR.kit; if(!K) return;
  const wrap=el('div','p-pick'), top=el('div','e-ctl'); top.appendChild(el('h3',null,'Chords in any key'));
  const sel=document.createElement('select'); sel.setAttribute('aria-label','Key'); K.KEYS.forEach(k=>{ const o=el('option',null,k); o.value=k; sel.appendChild(o); }); sel.value=st.ckey; sel.onchange=()=>{ st.ckey=sel.value; save(); }; top.appendChild(sel); wrap.appendChild(top);
  K.CHK.forEach(c=>{ const g=el('div','p-pills'); g.appendChild(el('h3',null,K.CH[c][0])); g.firstChild.style.marginRight='6px'; K.CH[c][1].forEach(ch=>{ const b=el('button','p-pill',ch[0]); b.type='button'; b.onclick=()=>{ clr(); showPicked(ch,K); wrap.querySelectorAll('.p-pill').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); }; g.appendChild(b); }); wrap.appendChild(g); });
  box.appendChild(wrap);
}
function showPicked(ch,K){
  const root=K.pickRoot(ch[1],st.ckey), pc=root[2], names=ch[1].map(([g,s])=>K.spellAt(root,g,s)), rootN=K.spellAt(root,1,0);
  const rh=ch[1].map(([g,s])=>60+pc+s), lh=[36+pc]; const step={name:rootN+' '+ch[0].toLowerCase(),src:rootN+' '+ch[0],lh,rh,fing:'',lfing:'',nofing:true,spell:K.labelMap([[lh[0],rootN],...ch[1].map(([g,s],i)=>[rh[i],names[i]])])};
  steps=[step]; cur=0; chips(); $('#prBig').textContent=step.name[0].toUpperCase()+step.name.slice(1); $('#prBig').style.fontSize=step.name.length>12?'clamp(30px,4.6vw,64px)':''; $('#prSub').textContent=names.join('  ')+'  ·  root also in the left hand'; $('#prMsg').textContent='Tap Play chords to hear it '+(st.vh==='h'?'one note at a time.':'together.'); drawKb(); play1(step);
}
const DSP=n=>String(n).replace(/##|x/,'𝄪').replace(/bb/,'𝄫').replace('#','♯').replace(/^([A-G])b/,'$1♭');
const MINS={ // minor key: [text, switch-to or '']
 'C#':['C♯ minor is the 6th of E major ✅',''],
 'Db':['D♭ minor would be the 6th of F♭ major ❌. C♯ minor is the 6th of E major ✅. We recommend C♯ minor.','C#'],
 'D#':['D♯ minor is the 6th of F♯ major. D♯ and E♭ minor are both permissible (E♭ is the 6th of G♭ major).','Eb'],
 'Eb':['E♭ minor is the 6th of G♭ major. D♯ and E♭ minor are both permissible (D♯ is the 6th of F♯ major).','D#'],
 'F#':['F♯ minor is the 6th of A major ✅',''],
 'Gb':['G♭ minor would be the 6th of B𝄫 major ❌. F♯ minor is the 6th of A major ✅. We recommend F♯ minor.','F#'],
 'G#':['G♯ minor is the 6th of B major ✅',''],
 'Ab':['A♭ minor would be the 6th of C♭ major ❌. G♯ minor is the 6th of B major ✅. We recommend G♯ minor.','G#'],
 'A#':['A♯ minor would be the 6th of C♯ major ❌. B♭ minor is the 6th of D♭ major ✅. We recommend B♭ minor.','Bb'],
 'Bb':['B♭ minor is the 6th of D♭ major ✅','']
};
const MCH={ // the minor chord: where it lives
 'C#':'C♯ minor chord: 2 in B, 3 in A, 6 in E.',
 'D#':'D♯ minor chord (3 in B, 6 in F♯) and E♭ minor chord (2 in D♭, 6 in G♭) are both allowed but limited. If you want to use the same chord as the 2, switch to E♭ minor in D♭ major (instead of D♯ minor in C♯ major). If you want to use it as the 3 chord, switch to D♯ minor in B major (instead of E♭ minor in C♭ major).',
 'F#':'F♯ minor chord: 2 in E, 3 in D, 6 in A.',
 'G#':'G♯ minor chord: 2 in F♯, 3 in E, 6 in B.',
 'Bb':'B♭ minor chord: 2 in A♭, 3 in G♭, 6 in D♭.'
};
MCH.Eb=MCH['D#'];
const OPP={'C#':'Db','D#':'Eb','G#':'Ab','A#':'Bb','F#':'Gb','Gb':'F#'};
const SYMK=k=>k.replace('#','♯').replace(/b$/,'♭');
function keyTip(){
  let t=document.getElementById('prTip'); if(!t){ t=el('div','p-tip'); t.id='prTip'; const m=$('#prMsg'); m.parentNode.insertBefore(t,m.nextSibling); }
  t.textContent=''; t.hidden=true; const SC=window.SCALES;
  if(kind==='scales'&&['nat','harm','mel'].includes(st.type)&&MINS[st.key]){ const m=MINS[st.key]; const p1=el('p',null,m[0]); t.appendChild(p1); if(MCH[st.key]) t.appendChild(el('p',null,MCH[st.key])); if(m[1]){ const bb=el('button','e-btn','Switch to '+SYMK(m[1])+' minor'); bb.type='button'; bb.onclick=()=>{ st.key=m[1]; save(); loadScale(); render(); }; t.appendChild(bb); } t.hidden=false; return; }
  if(kind!=='scales'||st.type!=='major'||!OPP[st.key]||!SC||!SC.acc) return;
  const k=st.key, o=OPP[k], a=SC.acc(k), b=SC.acc(o), p=el('p',null,''); let msg;
  if(k==='F#'||k==='Gb') msg='F♯ and G♭ major are both allowed in music: either way it is 6 (6 sharps or 6 flats). Use F♯ when G♭ is inconvenient: the 4th tone of G♭ is C♭, so switch to F♯ if you want a B. Use G♭ when the 7th tone of F♯, E♯, is inconvenient: G♭ has F as its 7th tone.';
  else msg=SYMK(k)+' major has '+a.sharps+' sharps. '+SYMK(o)+' major has '+b.flats+' flats. The number of sharps in a key and the number of flats in the opposing key always add up to 12 ('+a.sharps+' + '+b.flats+' = 12). Switching to '+SYMK(o)+' takes you from '+a.sharps+' sharps to '+b.flats+' flats.';
  p.textContent=msg; t.appendChild(p); const b2=el('button','e-btn','Switch to '+SYMK(o)+' major'); b2.type='button'; b2.onclick=()=>{ st.key=o; save(); loadScale(); render(); }; t.appendChild(b2); t.hidden=false;
}
function loadScale(){
  syncStudioBtn(); clr(); const SC=window.SCALES; if(!SC||!SC.build) return; steps=SC.build(st.key,st.hand,st.type,st.oct,st.motion); cur=-1; chips();
  const g=steps.map(s=>s.name), TL=(SC.types.find(t=>t.id===st.type)||{l:'Major'}).l, maj=st.type==='major'; $('#prLbl').textContent=maj?'Scale practice · 3+4 method':'Scale practice'; $('#prBig').textContent=SYMK(st.key)+' '+(maj?'major':TL)+(st.oct>1?' · '+st.oct+' octaves':'')+(st.motion==='contrary'?' · contrary motion':''); { const L=steps.map(x=>lab(x,false)); let sub=(maj&&st.oct===1)?(L.slice(0,3).join(' ')+'  |  '+L.slice(3,7).join(' ')+'  |  '+L[7]):L.join(' '); const dn=steps.map(x=>lab(x.alt||x,true)); if(dn.join(' ')!==L.join(' ')&&(steps.some(x=>x.alt)||(sysNow()!=='letter'&&steps.some(x=>x.solD)))) sub+='   ·   coming down: '+dn.slice().reverse().join(' '); $('#prSub').textContent=sub; }
  const rh=steps.some(s=>s.fing), lh=steps.some(s=>s.lfing), hs=st.hand!=='lh', ls=st.hand!=='rh';
  if(st.motion==='contrary'){ $('#prMsg').textContent='Contrary motion: both hands start together on the '+SYMK(st.key)+'. Open: the right hand goes up and the left hand goes down. Close: they come back together.'+((hs&&!rh)||(ls&&!lh)?' The fingering for this key is not in the lessons yet.':''); drawKb(); keyTip(); return; }
  const miss=[]; if(hs&&!rh) miss.push('right-hand'); if(ls&&!lh) miss.push('left-hand');
  $('#prMsg').textContent=miss.length?('The '+miss.join(' and ')+' fingering for '+SYMK(st.key)+(st.type==='major'?' major':' '+TL)+(st.oct>1?' in '+st.oct+' octaves':'')+' is not in the lessons yet. The notes are shown; fingering will appear once it is added.'):'Tap a note to hear it, or press Play scale.';
  drawKb(); keyTip();
}
function chordTip(list){
  let t=document.getElementById('prTip'); if(!t){ t=el('div','p-tip'); t.id='prTip'; const m=$('#prMsg'); m.parentNode.insertBefore(t,m.nextSibling); }
  t.textContent=''; t.hidden=true; const seen={};
  (list||[]).forEach(n=>{ const m=String(n).match(/^([A-G])(#|b)?(m|min|-)(?!aj|a)/); if(!m) return; let k=m[1]+(m[2]||''); if(k==='A#') k='Bb'; if(k==='Db'||k==='Gb'||k==='Ab') return; if(MCH[k]&&!seen[k==='Eb'?'D#':k]){ seen[k==='Eb'?'D#':k]=1; t.appendChild(el('p',null,MCH[k])); } });
  t.hidden=!t.children.length;
}
function loadChords(text,quiet){
  clr(); st.chords=String(text||'').trim(); save();
  const list=normChords(st.chords).slice(0,16); const out=(window.CLASS&&CLASS.stepsFrom)?CLASS.stepsFrom(list):[];
  if(!out.length){ steps=[]; cur=-1; chips(); show(); $('#prMsg').textContent=st.chords?'I did not recognise those chords. Try names like Dm7, G7, Cmaj7, F#m7b5.':''; chordTip([]); return; }
  steps=out; cur=0; chips(); show(); $('#prMsg').textContent=(list.length>out.length?'Some of those were not recognised and were skipped. ':'')+'Tap a chord to hear it, or press Play chords.'; if(!quiet) play1(steps[0]); chordTip(list);
}
window.PRACTICE={open,close};
})();
