/* practice.js: Scale practice and Chord practice rooms for Class. Same look as the Ear training room.
   Left hand is blue, right hand is orange, on the keyboard and in the step chips. */
(function(){
'use strict';
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const FLAT_N=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'], SHARP_N=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const LH='#1c7ed6', RH='#f76707';
const DIRS=[['up','Up'],['down','Down'],['updown','Up and down']];
const HANDS=[['rh','Right hand'],['lh','Left hand'],['both','Both hands']];
let ov=null, kind='scales', steps=[], cur=-1, playing=false, timers=[], title='', sub='';
let st={key:'C',hand:'both',dir:'up',bpm:80,loop:false,chords:''};
try{ Object.assign(st,JSON.parse(localStorage.getItem('ps-pr')||'{}')); }catch(_){}
const save=()=>{ try{ localStorage.setItem('ps-pr',JSON.stringify(st)); }catch(_){} };
const $=s=>ov.querySelector(s);
const clr=()=>{ timers.forEach(clearTimeout); timers=[]; playing=false; const b=$('#prPlay'); if(b) b.textContent=kind==='scales'?'▶ Play scale':'▶ Play chords'; };

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
    '<div class="p-chips" id="prChips"></div><div class="e-msg" id="prMsg" aria-live="polite"></div>'+
    '<div class="e-kb"><div class="e-lbl"><span>Keyboard</span><span class="p-leg"><span><i style="background:'+LH+'"></i>Left hand</span><span><i style="background:'+RH+'"></i>Right hand</span></span></div><div id="prKb"></div></div>';
  document.body.appendChild(ov);
  $('#prX').onclick=close;
  $('#prDots').onclick=()=>{ close(); try{ if(window.CLASS) CLASS.slide(true); }catch(_){} };
  document.addEventListener('keydown',e=>{ if(ov&&!ov.hidden&&e.key==='Escape'&&!/INPUT|SELECT/.test((e.target||{}).tagName||'')) close(); });
}
function open(k){ if(!ov) build(); kind=k==='chords'?'chords':'scales'; ov.hidden=false; clr(); steps=[]; cur=-1; render(); }
function close(){ clr(); if(ov) ov.hidden=true; try{ if(window.CLASS&&CLASS.endPractice) CLASS.endPractice(); }catch(_){} }

/* ---------- keyboard ---------- */
function drawKb(){
  const wrap=$('#prKb'); if(!wrap||typeof keyboardSVG!=='function') return; const s=steps[cur];
  let fm=null; if(kind==='scales'&&s){ fm={}; (s.lh||[]).forEach(m=>{ if(s.lfing) fm[m]=s.lfing; }); (s.rh||[]).forEach(m=>{ if(s.fing) fm[m]=s.fing; }); }
  const svg=keyboardSVG(s?s.lh:[],s?s.rh:[],{lo:36,hi:96,height:64,fingers:kind==='chords',fmap:fm});
  svg.addEventListener('pointerdown',e=>{ const r=e.target.closest('rect[data-m]'); if(!r) return; const m=+r.dataset.m, old=r.getAttribute('fill'); r.setAttribute('fill','#ffd43b'); if(window.CLASS) CLASS.sound(m,1.4,.85); setTimeout(()=>r.setAttribute('fill',old),260); });
  wrap.replaceChildren(svg);
  ov.querySelectorAll('.p-chip').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===cur)));
}
function names(s){ return /b|♭|F(?!#)/.test(s.name)&&!/#|♯/.test(s.name)?FLAT_N:SHARP_N; }

/* ---------- steps ---------- */
function chips(){
  const box=$('#prChips'); box.textContent='';
  steps.forEach((s,i)=>{ const b=el('button','p-chip'); b.type='button'; b.appendChild(el('span',null,s.name));
    if(kind==='scales'){ const f=el('small'); if(s.lfing){ f.appendChild(el('b','l','L '+s.lfing)); } if(s.fing){ f.appendChild(el('b','r','R '+s.fing)); } if(!s.lfing&&!s.fing) f.textContent='–'; b.appendChild(f); }
    b.onclick=()=>{ clr(); cur=i; show(); play1(s); }; box.appendChild(b); });
}
function play1(s,len){ try{ CLASS.playStep(s,len||1.6); }catch(_){} }
function show(){
  const s=steps[cur];
  if(kind==='chords'){ if(s){ $('#prBig').textContent=s.name; const N=names(s), t=(typeof fingerText==='function')?fingerText(s.lh,s.rh):null; $('#prSub').textContent='Left hand '+s.lh.map(m=>N[m%12]).join(' ')+'  ·  Right hand '+s.rh.map(m=>N[m%12]).join(' ')+(t?'  ·  Fingers: LH '+t.lh+', RH '+t.rh:''); } else { $('#prBig').textContent=steps.length?'Tap a chord':'Type chords'; $('#prSub').textContent=steps.length?'Tap a chord below, or press Play.':'Type chord names like Dm7 G7 Cmaj7, then press Show.'; } }
  drawKb();
}
function seq(){ const n=steps.length, up=[...Array(n).keys()]; return st.dir==='down'?up.slice().reverse():st.dir==='updown'?up.concat(up.slice(0,-1).reverse()):up; }
function playAll(){
  if(playing){ clr(); return; } if(!steps.length) return;
  const order=kind==='scales'?seq():[...Array(steps.length).keys()], gap=(60/st.bpm)*(kind==='scales'?1:(steps.length>1?2:4))*1000;
  playing=true; $('#prPlay').textContent='■ Stop'; let p=0;
  const tick=()=>{ if(!playing) return; cur=order[p]; show(); play1(steps[cur],gap/1000*(kind==='scales'?1.6:1.05));
    timers.push(setTimeout(()=>{ if(!playing) return; p++; if(p>=order.length){ if(st.loop) p=0; else { clr(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } tick(); },gap)); };
  tick();
}

/* ---------- controls ---------- */
function transport(ctl){
  const b=el('button','e-btn pri',kind==='scales'?'▶ Play scale':'▶ Play chords'); b.id='prPlay'; b.type='button'; b.onclick=playAll; ctl.appendChild(b);
  const t=el('label','p-rng'); t.innerHTML='Tempo <input type="range" min="40" max="200" step="2"><span></span>'; const r=t.querySelector('input'), o=t.querySelector('span'); r.value=st.bpm; o.textContent=st.bpm; r.oninput=()=>{ st.bpm=+r.value; o.textContent=r.value; save(); }; ctl.appendChild(t);
  const l=el('label','p-rng'); l.innerHTML='<input type="checkbox"> Loop'; const c=l.querySelector('input'); c.checked=!!st.loop; c.onchange=()=>{ st.loop=c.checked; save(); }; ctl.appendChild(l);
}
function seg(parent,list,val,fn,small){ parent.textContent=''; if(small) parent.classList.add('sm'); list.forEach(([k,t])=>{ const b=el('button',null,t); b.type='button'; b.dataset.k=k; b.setAttribute('aria-pressed',String(k===val)); b.onclick=()=>fn(k); parent.appendChild(b); }); }

function render(){
  clr(); const SC=window.SCALES, hand=$('#prHand'), cats=$('#prCats'), ctl=$('#prCtl'); ctl.textContent=''; cats.textContent=''; $('#prMsg').textContent='';
  $('#prH').textContent=kind==='scales'?'Scale practice':'Chord practice'; ov.setAttribute('aria-label',$('#prH').textContent);
  if(kind==='scales'){
    hand.hidden=false; seg(hand,HANDS,st.hand,k=>{ st.hand=k; save(); loadScale(); });
    (SC&&SC.keys||[]).forEach(k=>{ const b=el('button','e-cat',k+' major'); b.type='button'; b.setAttribute('aria-pressed',String(k===st.key)); b.onclick=()=>{ st.key=k; save(); loadScale(); render(); }; cats.appendChild(b); });
    const d=el('div','e-seg sm'); d.setAttribute('role','group'); d.setAttribute('aria-label','Direction'); seg(d,DIRS,st.dir,k=>{ st.dir=k; save(); clr(); d.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); },true);
    transport(ctl); ctl.appendChild(d);
    const ask=el('button','e-btn','Ask Pokey about this scale'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout('Tell me about the '+st.key+' major scale. How is it built with the 3+4 method, and what should I practice with it?',{fresh:true}); }; ctl.appendChild(ask);
    loadScale();
  } else {
    hand.hidden=true;
    const row=el('div','e-ctl'); row.style.width='100%'; const inp=el('input','p-in'); inp.type='text'; inp.id='prIn'; inp.placeholder='Type chords: Dm7 G7 Cmaj7'; inp.value=st.chords||''; inp.setAttribute('aria-label','Chords'); inp.autocomplete='off'; inp.spellcheck=false;
    const go=el('button','e-btn pri','Show chords'); go.type='button'; row.append(inp,go); ctl.appendChild(row); const go2=()=>loadChords(inp.value); go.onclick=go2; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); go2(); } };
    const r2=el('div','e-ctl'); r2.style.marginTop='10px'; ctl.appendChild(r2); const keep=ctl; transport(r2);
    const ask=el('button','e-btn','Ask Pokey about this chord'); ask.type='button'; ask.onclick=()=>{ const s=steps[cur>=0?cur:0]; close(); if(window.CLASS) CLASS.askAbout(s?'Tell me more about '+s.name+'. How is it built, how do I voice it, and what should I practice with it?':'Help me practice chords on the keyboard.',{fresh:true}); }; r2.appendChild(ask);
    $('#prLbl').textContent='Chord practice'; if(st.chords) loadChords(st.chords,true); else { steps=[]; cur=-1; chips(); show(); }
  }
}
function loadScale(){
  clr(); const SC=window.SCALES; if(!SC||!SC.build) return; steps=SC.build(st.key,st.hand); cur=-1; chips();
  const g=steps.map(s=>s.name); $('#prLbl').textContent='Scale practice · 3+4 method'; $('#prBig').textContent=st.key+' major'; $('#prSub').textContent=g.slice(0,3).join(' ')+'  |  '+g.slice(3,7).join(' ')+'  |  '+g[7];
  const rh=steps.some(s=>s.fing), lh=steps.some(s=>s.lfing), hs=st.hand!=='lh', ls=st.hand!=='rh';
  const miss=[]; if(hs&&!rh) miss.push('right-hand'); if(ls&&!lh) miss.push('left-hand');
  $('#prMsg').textContent=miss.length?('The '+miss.join(' and ')+' fingering for '+st.key+' major is not in the lessons yet. The notes are shown; fingering will appear once it is added.'):'Tap a note to hear it, or press Play scale.';
  drawKb();
}
function loadChords(text,quiet){
  clr(); st.chords=String(text||'').trim(); save();
  const list=st.chords.split(/[\s|,]+/).filter(Boolean).slice(0,16); const out=(window.CLASS&&CLASS.stepsFrom)?CLASS.stepsFrom(list):[];
  if(!out.length){ steps=[]; cur=-1; chips(); show(); $('#prMsg').textContent=st.chords?'I did not recognise those chords. Try names like Dm7, G7, Cmaj7, F#m7b5.':''; return; }
  steps=out; cur=0; chips(); show(); $('#prMsg').textContent=(list.length>out.length?'Some of those were not recognised and were skipped. ':'')+'Tap a chord to hear it, or press Play chords.'; if(!quiet) play1(steps[0]);
}
window.PRACTICE={open,close};
})();
