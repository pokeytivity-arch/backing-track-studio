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
let paused=false, waitL=false, pauseFn=null;
let ov=null, kind='scales', steps=[], cur=-1, playing=false, timers=[], title='', sub='';
let st={sys:'letter',family:'regular',motion:'similar',mode:'practice',oct:1,type:'major',key:'C',hand:'rh',fa:'main',dir:'updown',bpm:80,loop:false,chords:'',vh:'v',ckey:'C'};
try{ Object.assign(st,JSON.parse(localStorage.getItem('ps-pr')||'{}')); if(st.family!=='exotic') st.family='regular'; if(!['letter','solfa','number'].includes(st.sys)) st.sys='letter'; }catch(_){}
const save=()=>{ try{ localStorage.setItem('ps-pr',JSON.stringify(st)); }catch(_){} };
const $=s=>ov.querySelector(s);
let curDesc=false;
/* one Play / Pause / Resume button, and a separate Stop */
const updPause=()=>{ const pl=document.getElementById('prPlay'), b=document.getElementById('prPause');
  if(pl) pl.textContent=!playing?(kind==='scales'?'▶ Play scale':'▶ Play chords'):paused?'▶ Resume':'❚❚ Pause';
  if(!b) return; b.textContent='■ Stop'; b.disabled=!playing; b.style.opacity=b.disabled?'.45':''; };
const playPause=()=>{ if(!playing){ playAll(); updPause(); return; } if(waitL) return; if(pauseFn) pauseFn(); };
const clr=()=>{ curDesc=false; timers.forEach(clearTimeout); timers=[]; playing=false; paused=false; waitL=false; pauseFn=null; try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(false); }catch(_){} updPause(); const lp=document.getElementById('prLearn'); if(lp) lp.hidden=true; const b=$('#prPlay'); if(b) b.textContent=kind==='scales'?'▶ Play scale':'▶ Play chords'; };

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
#prRoom .e-kb .e-lbl{gap:12px;flex-wrap:wrap} #prRoom[data-kind=chords] .e-big{font-size:clamp(26px,3.4vw,44px)!important;line-height:1.05} #prRoom[data-kind=chords] .e-now{margin-bottom:6px} html.ps-rot #prRoom[data-kind=chords] .e-now>div:first-child{display:none} @media (max-height:520px) and (pointer:coarse){ #prRoom[data-kind=chords] .e-now>div:first-child{display:none} } #prRoom[data-kind=chords] .p-chips:empty{display:none} #prRoom[data-kind=chords] .e-msg:empty{display:none} #prRoom .p-motop{margin-left:auto;margin-right:10px} #prRoom .p-motop+#prHand{margin-left:0} #prRoom .p-r0{display:flex;align-items:flex-end;gap:14px 22px;flex-wrap:wrap;flex-basis:100%;width:100%} #prRoom .p-r0 .p-rng{align-self:center;margin-bottom:4px} #prRoom .p-cdd{gap:10px;flex-wrap:wrap;align-items:flex-end} #prRoom .p-cdd .p-sel{min-width:130px} #prRoom #prChord{min-width:220px} #prRoom .p-more{position:relative;display:inline-block} #prRoom .p-more>summary{list-style:none;cursor:pointer} #prRoom .p-more>summary::-webkit-details-marker{display:none} #prRoom .p-morebox{position:absolute;right:0;top:calc(100% + 6px);z-index:30;background:#12141c;border:1px solid #3a3424;border-radius:12px;padding:12px;width:min(520px,86vw);box-shadow:0 10px 30px rgba(0,0,0,.5)} #prRoom .p-tab{position:relative;height:22px;margin:0 0 3px} #prRoom .p-tab span{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;border-radius:5px;background:#1a2340;color:#7d8bb0;font:700 11px/1 system-ui,sans-serif;letter-spacing:-.3px;white-space:nowrap;overflow:visible;transition:background .12s,color .12s} #prRoom .p-tab span.on{color:#fff;box-shadow:0 0 10px currentColor} #prRoom .p-tab span.on.l{background:${LH};color:#fff;box-shadow:0 0 12px ${LH}} #prRoom .p-tab span.on.r{background:${RH};color:#fff;box-shadow:0 0 12px ${RH}}
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
    /* written voicings: "C.E / G B D E" = left hand / right hand notes, a dot lifts the next note an octave; chords are separated by commas */
    if(/^\[.*\]$/.test(seg)){ out.push(seg); return; }
    if(seg.includes('/')&&/^[A-G][#b♯♭]?-?\d?(\s*\.\s*[A-G][#b♯♭]?-?\d?)*(\s+\.?\s*[A-G][#b♯♭]?-?\d?)*\s*\/\s*[A-G]/.test(seg)){ out.push('['+seg.replace(/\s*\.\s*/g,'.')+']'); return; }
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
  const wrap=$('#prKb'); if(!wrap||typeof keyboardSVG!=='function') return; const s=curS(); if(kind==='scales') handPos();
  let fm=null; if(kind==='scales'&&s){ fm={}; (s.lh||[]).forEach(m=>{ if(s.lfing) fm[m]=s.lfing; }); (s.rh||[]).forEach(m=>{ if(s.fing) fm[m]=s.fing; }); }
  if(kind==='chords'&&s&&(s.rfm||s.lfm)&&typeof fingering==='function') fm=Object.assign(fingering(s.lh||[],s.rh||[]),s.lfm||{},s.rfm||{}); const rng=kbRange(); const svg=keyboardSVG(s?s.lh:[],s?s.rh:[],{lo:rng[0],hi:rng[1],height:64,labels:kind!=='scales',fingers:kind==='chords'&&!(s&&s.nofing),fmap:fm,spell:(s&&sysNow()!=='letter'&&s.sol)?(()=>{ const o={}; [...(s.lh||[]),...(s.rh||[])].forEach(m=>{ o[m]=lab(s,curDesc); }); return o; })():(s&&s.spell||null)});
  svg.addEventListener('pointerdown',e=>{ const r=e.target.closest('rect[data-m]'); if(!r) return; const m=+r.dataset.m, old=r.getAttribute('fill'); r.setAttribute('fill','#ffd43b'); if(window.CLASS) CLASS.sound(m,1.4,.85); setTimeout(()=>r.setAttribute('fill',old),260); });
  wrap.replaceChildren(svg); tab(svg,s);
  if(window.PSHANDS){ if(kind==="scales") PSHANDS.sync(wrap,steps.some(x=>x.fing||x.lfing),s,drawKb); else if(kind==="chords"&&s&&typeof fingering==="function") PSHANDS.sync(wrap,true,chordHands(s),drawKb); else PSHANDS.sync(null,false); }
  ov.querySelectorAll('.p-chip').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===cur)));
}
/* the name tab above the keys: every note of the scale has a cell over its key showing its letter, solfa or number; the note being played lights up in its hand's colour */
function tab(svg,s){
  const kbw=$('#prRoom .p-kbw'); if(!kbw) return; let bar=kbw.querySelector('.p-tab');
  if(kind!=='scales'||!steps.length){ if(bar) bar.remove(); return; }
  if(!bar){ bar=el('div','p-tab'); bar.setAttribute('aria-hidden','true'); kbw.insertBefore(bar,kbw.firstChild); }
  const vb=svg.viewBox.baseVal, Wv=vb&&vb.width||1, pos={}; svg.querySelectorAll('rect[data-m]').forEach(r=>{ pos[r.dataset.m]=(+r.getAttribute('x')+ +r.getAttribute('width')/2)/Wv*100; });
  const cell={}; steps.forEach(x=>{ [...(x.lh||[]).map(m=>[m,'l']),...(x.rh||[]).map(m=>[m,'r'])].forEach(([m,hd])=>{ if(!(m in cell)) cell[m]={t:lab(x,false),hd}; }); });
  const on={}; if(s){ (s.lh||[]).forEach(m=>{ on[m]='l'; cell[m]=Object.assign(cell[m]||{},{t:lab(s,curDesc)}); }); (s.rh||[]).forEach(m=>{ on[m]='r'; cell[m]=Object.assign(cell[m]||{},{t:lab(s,curDesc)}); }); }
  bar.replaceChildren(); const cw=6.8/Wv*100;
  const blk=m=>[1,3,6,8,10].includes(((m%12)+12)%12), u=1/Wv*100;
  Object.keys(cell).forEach(m=>{ if(pos[m]==null) return; m=+m; let x=pos[m]; if(!blk(m)){ if(blk(m-1)&&(m-1) in cell) x+=1.9*u; if(blk(m+1)&&(m+1) in cell) x-=1.9*u; }
    const c=el('span',on[m]?'on '+on[m]:'',cell[m].t); c.style.left=(x-cw/2)+'%'; c.style.width=cw+'%'; bar.appendChild(c); });
}
/* hand positions: the notes between two crossings form one position of the hand. Every finger has a key in it (the fingers the scale does not
   use there sit over the next scale notes in line), so the hand stays in place, the playing finger goes down and the others wait just above their keys. */
function handPos(){
  if(steps.__pos===steps.length) return; steps.__pos=steps.length;
  [['rh','fing','rpos',1],['lh','lfing','lpos',-1]].forEach(([hk,fk,pk,dir])=>{
    const seq=steps.map(x=>x[hk]&&x[hk].length&&x[fk]?[x[hk][0],+x[fk]]:null);
    const base=[...new Set(seq.filter(Boolean).map(v=>v[0]))]; if(!base.length) return;
    const ext=[...new Set(base.flatMap(m=>[m-24,m-12,m,m+12,m+24]))].sort((a,b)=>a-b);
    let grp=[]; const flush=()=>{ if(!grp.length) return; const fm={}; grp.forEach(i=>{ const [m,f]=seq[i]; if(fm[f]==null) fm[f]=m; });
      const have=Object.keys(fm).map(Number); const pos={};
      for(let j=1;j<=5;j++){ if(fm[j]!=null){ pos[j]=fm[j]; continue; } const r=have.reduce((a,b)=>Math.abs(b-j)<Math.abs(a-j)?b:a); const ix=ext.indexOf(fm[r])+(j-r)*dir; pos[j]=ext[Math.max(0,Math.min(ext.length-1,ix))]; }
      grp.forEach(i=>{ steps[i][pk]=pos; }); grp=[]; };
    seq.forEach((v,i)=>{ if(!v){ flush(); return; } const p=grp.length?seq[grp[grp.length-1]]:null;
      if(p){ const dm=v[0]-p[0], df=v[1]-p[1]; const same=(dm===0&&df===0)||(dm!==0&&df!==0&&Math.sign(df)===Math.sign(dm)*dir); if(!same) flush(); }
      grp.push(i); });
    flush(); });
}
/* on a phone the keyboard shows three octaves, placed over the notes the scale uses */
function kbRange(){
  const ph=document.documentElement.classList.contains('ps-rot')||matchMedia('(max-height:500px) and (pointer:coarse)').matches;
  if(!ph||kind!=='scales'||!steps.length) return [36,96];
  const ms=steps.flatMap(x=>[...(x.lh||[]),...(x.rh||[]),...Object.values(x.rpos||{}),...Object.values(x.lpos||{})]); if(!ms.length) return [36,96];
  /* always three octaves, placed over the notes in use */
  const mid=(Math.min(...ms)+Math.max(...ms))/2; let lo=Math.round((mid-18)/12)*12; lo=Math.max(24,Math.min(72,lo));
  return [lo,lo+36];
}
/* chords: every finger of each hand gets a key. The chord's own fingering (the numbers shown on the keys) presses its notes together;
   the other fingers wait over the neighbouring white keys, a step apart, as a hand naturally sits */
function chordHands(s){
  const all=[...(s.lh||[]),...(s.rh||[])].sort((a,b)=>a-b), done=arpN==null?null:new Set(all.slice(0,arpN));
  const F=Object.assign(fingering(s.lh||[],s.rh||[]),s.lfm||{},s.rfm||{}), W=[0,2,4,5,7,9,11], isW=m=>W.includes(((m%12)+12)%12);
  const side=(notes,dir)=>{ if(!notes||!notes.length) return null; const pos={}; notes.forEach(m=>{ const f=F[m]; if(f&&pos[f]==null) pos[f]=m; });
    const have=Object.keys(pos).map(Number); if(!have.length) return null; const press=done?have.filter(f=>done.has(pos[f])):have.slice();
    for(let j=1;j<=5;j++){ if(pos[j]!=null) continue;
      /* a finger between two chord fingers sits evenly between them; one outside them steps out a white key at a time */
      const lo=have.filter(x=>x<j), hi=have.filter(x=>x>j);
      if(lo.length&&hi.length){ const a=Math.max(...lo), b=Math.min(...hi); let m=Math.round(pos[a]+(pos[b]-pos[a])*(j-a)/(b-a)); if(!isW(m)) m+=(pos[b]>pos[a]?1:-1); pos[j]=m; continue; }
      const r=have.reduce((a,b)=>Math.abs(b-j)<Math.abs(a-j)?b:a); let m=pos[r], n=Math.abs(j-r), st=Math.sign(j-r)*dir;
      while(n>0){ m+=st; while(!isW(m)) m+=st; n--; } pos[j]=m; }
    const last=done?[...press].sort((a,b)=>all.indexOf(pos[b])-all.indexOf(pos[a]))[0]:null; const f=last||(press.includes(1)?1:press.length?Math.min(...press):Math.min(...have)); return {pos,press,f,note:pos[f]}; };
  const R=side(s.rh,1), L=side(s.lh,-1);
  return {rh:R?[R.note]:[],fing:R?String(R.f):'',rpos:R?R.pos:null,rpress:R?R.press:null,lh:L?[L.note]:[],lfing:L?String(L.f):'',lpos:L?L.pos:null,lpress:L?L.press:null};
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
  if(kind==='chords'&&!steps.multi) return;   /* a single chord from the dropdown needs no chip */
  steps.forEach((s,i)=>{ box.appendChild(mk(s,i)); });
}
/* One by one: the notes sound from the bottom up, half a second apart, and each finger goes down as its note sounds and stays down;
   Together: every finger of the chord goes down at once */
let arpN=null;
function play1(s,len){ try{ if(kind==='chords'&&st.vh==='h'){ const ns=[...s.lh,...s.rh].sort((a,b)=>a-b); ns.forEach((m,i)=>CLASS.sound(m,1.1,.8,i*.5));
      arpN=0; drawKb(); ns.forEach((m,i)=>timers.push(setTimeout(()=>{ if(steps.indexOf(s)<0&&curS()!==s) return; arpN=i+1; drawKb(); },i*500+20))); timers.push(setTimeout(()=>{ arpN=null; },ns.length*500+1200)); }
    else { arpN=null; if(kind==='chords') drawKb(); CLASS.playStep(s,len||1.6); } }catch(_){} }
function show(){
  const s=steps[cur]; $('#prBig').style.fontSize='';
  if(kind==='chords'){ if(s){ $('#prBig').textContent=s.name; const N=names(s), t=(typeof fingerText==='function')?fingerText(s.lh,s.rh):null; if(t&&s.rfm) t.rh=[...s.rh].sort((x,y)=>x-y).map(m=>s.rfm[m]).join('-'); if(t&&s.lfm) t.lh=[...s.lh].sort((x,y)=>x-y).map(m=>s.lfm[m]).join('-'); $('#prSub').textContent='Left hand '+s.lh.map(m=>N[m%12]).join(' ')+'  ·  Right hand '+s.rh.map(m=>N[m%12]).join(' ')+(t?'  ·  Fingers: LH '+t.lh+', RH '+t.rh:''); } else { $('#prBig').textContent=steps.length?'Tap a chord':'Type chords'; $('#prSub').textContent=steps.length?'Tap a chord below, or press Play.':'Type chord names like Dm7 G7 Cmaj7, then press Show.'; } }
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
  const b=el('button','e-btn pri','Continue'); b.type='button'; b.onclick=()=>{ t.hidden=true; waitL=false; updPause(); go(); }; t.appendChild(b); t.hidden=false; try{ t.scrollIntoView({block:'nearest'}); }catch(_){}
}
function playAll(){
  if(playing){ clr(); return; } if(!steps.length) return;
  const order=kind==='scales'?seq():[...Array(steps.length).keys()], gap=(60/st.bpm)*(kind==='scales'?1:(steps.length>1?2:4))*1000;
  playing=true; let p=0, t0=0, rem=0; paused=false; waitL=false;
  const adv=()=>{ if(!playing||paused) return; p++; if(p>=order.length){ if(st.loop) p=0; else { clr(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } tick(); };
  const sched=ms=>{ rem=ms; t0=Date.now(); timers.push(setTimeout(adv,ms)); };
  const go=()=>{ if(!playing) return; cur=order[p]; curDesc=kind==='scales'&&p>0&&order[p]<order[p-1]; show(); play1(curS(),gap/1000*(kind==='scales'?1.6:1.05)); sched(gap);
    /* a finger that crosses over the thumb starts moving half way through the thumb's note, so you can see it travel before the next note sounds */
    if(kind==='scales'&&window.PSHANDS&&PSHANDS.lead&&order[p+1]!=null){ const c=curS(), ni=order[p+1], nx0=steps[ni], nx=(ni<order[p]&&nx0.alt)?nx0.alt:nx0;
      if(c&&nx&&((c.lfing==='1'&&nx.lfing&&nx.lfing!=='1')||(c.fing==='1'&&nx.fing&&nx.fing!=='1')&&+nx.fing>=2)) timers.push(setTimeout(()=>{ if(playing&&!paused&&!waitL) PSHANDS.lead(nx); },gap*.45)); } };
  const tick=()=>{ if(!playing) return;
    if(kind==='scales'&&st.mode==='learn'&&p>0&&order[p]===order[p-1]+1){ const ln=learnLines(steps[order[p-1]],steps[order[p]]); if(ln.length){ waitL=true; updPause(); showLearn(ln,go); return; } }
    go(); };
  /* Pause keeps the place in the scale and freezes the hands; Resume carries on with the time that was left on the current note */
  pauseFn=()=>{ if(!playing||waitL) return;
    if(!paused){ paused=true; timers.forEach(clearTimeout); timers=[]; rem=Math.max(0,rem-(Date.now()-t0)); try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(true); }catch(_){} }
    else { paused=false; try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(false); }catch(_){} sched(rem); }
    updPause(); };
  updPause();
  tick();
}

/* ---------- controls ---------- */
const MQM=matchMedia('(max-width:700px)'); try{ MQM.addEventListener('change',()=>{ if(ov&&!ov.hidden&&kind==='scales') render(); }); }catch(_){}
/* Studio practice: only scales with 7 different notes (8 counting the octave note). Beat plan, 4/4:
   one octave up or down = every note one beat, played twice to fill 4 bars; one octave up and down = every note one beat, the last tonic two (4 bars);
   two or three octaves, up and down only = every tonic two beats, so each tonic lands on beat 1. Other combinations are not set up yet. */
const studioNotes=()=>{ const T=((window.SCALES&&SCALES.types)||[]).find(t=>t.id===st.type); return T?T.d.length:0; };
function studioWhy(){ if(studioNotes()!==7) return 'Studio practice is for scales with 7 different notes.'; if(st.oct>3) return 'Studio practice is set up for up to three octaves.'; if(st.oct>1&&st.dir!=='updown') return 'For two or three octaves, Studio practice is set up for Up and down only.'; return ''; }
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
  const b=el('button','e-btn pri',kind==='scales'?'▶ Play scale':'▶ Play chords'); b.id='prPlay'; b.type='button'; b.onclick=playPause; ctl.appendChild(b);
  { const pb=el('button','e-btn','■ Stop'); pb.id='prPause'; pb.type='button'; pb.onclick=()=>{ if(!playing) return; clr(); show(); }; ctl.appendChild(pb); updPause(); }
  if(kind==='scales'){ const sb=el('button','e-btn','Practice in Studio'); sb.id='prStudio'; sb.type='button'; sb.onclick=toStudio; { const w=studioWhy(); sb.disabled=!!w; sb.title=w||'Practice this scale with a backing track in the Studio'; if(w) sb.style.opacity='.45'; } ctl.appendChild(sb); }
  const t=el('label','p-rng'); t.innerHTML='Tempo <input type="range" min="40" max="200" step="2"><span></span>'; const r=t.querySelector('input'), o=t.querySelector('span'); r.value=st.bpm; o.textContent=st.bpm; r.oninput=()=>{ st.bpm=+r.value; o.textContent=r.value; save(); }; ctl.appendChild(t);
  const l=el('label','p-rng'); l.innerHTML='<input type="checkbox"> Loop'; const c=l.querySelector('input'); c.checked=!!st.loop; c.onchange=()=>{ st.loop=c.checked; save(); }; ctl.appendChild(l);
}
function seg(parent,list,val,fn,small){ parent.textContent=''; if(small) parent.classList.add('sm'); list.forEach(([k,t])=>{ const b=el('button',null,t); b.type='button'; b.dataset.k=k; b.setAttribute('aria-pressed',String(k===val)); b.onclick=()=>fn(k); parent.appendChild(b); }); }

function render(){
  { const pk=$('#prPick'); if(pk) pk.hidden=false; }
  clr(); const SC=window.SCALES, hand=$('#prHand'), cats=$('#prCats'), ctl=$('#prCtl'); { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); } ctl.textContent=''; cats.textContent=''; document.querySelectorAll('#prRoom .p-sels').forEach(n=>n.remove()); $('#prMsg').textContent='';
  $('#prH').textContent=kind==='scales'?'Scale practice':'Chord practice'; ov.setAttribute('aria-label',$('#prH').textContent);
  if(kind==='scales'){
    hand.hidden=st.motion==='contrary'; seg(hand,HANDS,st.hand,k=>{ st.hand=k; save(); hand.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); loadScale(); render(); });
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
    const fav=(SC&&SC.alts)?SC.alts(st.key,st.type):null; if(!fav&&st.fa==='alt') st.fa='main'; let fg=null;
    if(fav){ fg=el('div','e-seg sm'); fg.setAttribute('role','group'); fg.setAttribute('aria-label','Fingering'); seg(fg,[['main','Main fingering'],['alt','Alternate']],st.fa||'main',k=>{ st.fa=k; save(); fg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); loadScale(); },true); fg.title='Alternate fingering, from the book'; ctl.appendChild(fg); }
    const sy=el('div','e-seg sm'); sy.setAttribute('role','group'); sy.setAttribute('aria-label','Note names'); seg(sy,[['letter','Letters'],['solfa','Solfa'],['number','Numbers']],st.sys,k=>{ st.sys=k; save(); clr(); render(); },true);
    if(!hasSol()) sy.querySelectorAll('[data-k=solfa],[data-k=number]').forEach(b=>{ b.disabled=true; b.title='Solfa is not added for this scale yet'; }); ctl.appendChild(sy);
    const mo4=(SC&&SC.maxOct)?SC.maxOct(st.key,st.hand,st.motion):3; if(st.oct>mo4) st.oct=mo4;
    ctl.appendChild(sel('Octaves',[{v:'1',t:'One octave'},{v:'2',t:'Two octaves'}].concat(st.motion==='contrary'?[]:[{v:'3',t:'Three octaves'}]).concat(mo4>=4?[{v:'4',t:'Four octaves'}]:[]),String(st.oct||1),v=>{ st.oct=+v; save(); loadScale(); }));
    ctl.lastChild.classList.add('p-octs');
    transport(ctl); ctl.appendChild(d);
    const ask=el('button','e-btn','Ask Pokey about this scale'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout(st.type==='major'?'Tell me about the '+st.key+' major scale. How is it built with the 3+4 method, and what should I practice with it?':'Tell me about the '+st.key+' '+((SC&&SC.types||[]).find(t=>t.id===st.type)||{l:''}).l+' scale. How is it built, and what should I practice with it?',{fresh:true}); }; ctl.appendChild(ask);
    if(MQM.matches){ /* phone: row 1 = Scale, Note, Octaves, Loop, Tempo, Ask Pokey; row 2 = the toggles and Play scale; keyboard below. Desktop keeps its layout. */
      const r1=el('div','p-r1'), r2=el('div','p-r2'), rg=ctl.querySelectorAll('.p-rng'), pl=$('#prPlay'), oc=ctl.querySelector('.p-octs');
      ms.querySelectorAll('.p-sel').forEach(x=>r1.appendChild(x)); ms.remove();
      const r3=el('div','p-r3'); r1.append(oc,rg[1],rg[0]); ask.textContent='Ask Pokey'; r2.append(fm,mo,md,sy,hand,d); if(fg) r2.append(fg); r3.append(ask,$('#prStudio'),$('#prPause'),pl); ctl.append(r1,r2,r3); hand.classList.add('sm');
    } else { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); /* Similar / Contrary sits with the hands */ mo.classList.add('p-motop'); top.insertBefore(mo,hand); /* desktop: Scale and Note sit with the other controls */ const sl=[...ms.querySelectorAll('.p-sel')]; /* first row: Scale, Note, Tempo and Loop together */ const r0=el('div','p-r0'); sl.forEach(x=>{ x.classList.add('p-sel-d'); r0.appendChild(x); }); ctl.querySelectorAll('.p-rng').forEach(x=>r0.appendChild(x)); ctl.insertBefore(r0,ctl.firstChild); ms.remove(); }
    loadScale();
  } else {
    hand.hidden=true; $('#prPick').textContent=''; $('#prPick').hidden=true;
    /* everything for chords sits in a few dropdowns, so the keyboard and hands are in view as soon as the room opens */
    if(st.cpick===undefined&&!st.chords&&window.EAR&&EAR.kit) st.cpick=EAR.kit.CHK[0]+':0';
    const K=window.EAR&&EAR.kit, r1=el('div','e-ctl p-cdd'), r2=el('div','e-ctl'); r2.style.marginTop='8px'; ctl.append(r1,r2);
    if(K){ r1.appendChild(selBox('Key',K.KEYS.map(k=>({v:k,t:DSP(k)})),st.ckey,v=>{ st.ckey=v; save(); const c=chordPick(); if(c&&!steps.multi){ clr(); showPicked(c,K); } }));
      const opts=[{v:'',t:'Typed chords',g:''}]; K.CHK.forEach(c=>K.CH[c][1].forEach((ch,i)=>opts.push({g:K.CH[c][0],v:c+':'+i,t:ch[0]})));
      r1.appendChild(selBox('Chord',opts,st.cpick||'',v=>{ st.cpick=v; save(); clr(); const c=chordPick(); if(c) showPicked(c,K); else if(st.chords) loadChords(st.chords,true); else { steps=[]; cur=-1; chips(); show(); } }, 'prChord')); }
    r1.appendChild(selBox('Inversion',INV.map((t,i)=>({v:String(i),t:i?t+' inversion':'Root position'})),String(st.inv||0),v=>{ st.inv=+v; save(); const c=cur; reChord(); if(c>=0&&c<steps.length){ cur=c; show(); } if(steps[cur>=0?cur:0]) play1(steps[cur>=0?cur:0]); },'prInv'));
    r1.appendChild(selBox('Notes',[{v:'v',t:'Together'},{v:'h',t:'One by one'}],st.vh||'v',v=>{ st.vh=v; save(); if(steps[cur>=0?cur:0]&&!playing) play1(steps[cur>=0?cur:0]); }));
    transport(r2);
    const lp=r2.querySelectorAll('.p-rng')[1];
    /* the rest lives in a More menu */
    const more=el('details','p-more'); more.appendChild(el('summary','e-btn','More ▾')); const mb=el('div','p-morebox'); more.appendChild(mb);
    const row=el('div','e-ctl'); const inp=el('input','p-in'); inp.type='text'; inp.id='prIn'; inp.placeholder='Type chords: Dm7 G7 Cmaj7'; inp.value=st.chords||''; inp.setAttribute('aria-label','Chords'); inp.autocomplete='off'; inp.spellcheck=false;
    const go=el('button','e-btn pri','Show chords'); go.type='button'; row.append(inp,go); mb.appendChild(row); const go2=()=>{ st.cpick=''; save(); const cs=document.querySelector('#prChord select'); if(cs) cs.value=''; loadChords(inp.value); more.open=false; }; go.onclick=go2; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); go2(); } };
    const r3=el('div','e-ctl'); r3.style.marginTop='8px'; mb.appendChild(r3); if(lp) r3.appendChild(lp);
    const vb=el('button','e-btn','Voicings'); vb.type='button'; vb.onclick=()=>{ if(window.VOICE) VOICE.open(); }; r3.appendChild(vb);
    const ask=el('button','e-btn','Ask Pokey about this chord'); ask.type='button'; ask.onclick=()=>{ const s=steps[cur>=0?cur:0]; close(); if(window.CLASS) CLASS.askAbout(s?'Tell me more about '+s.name+'. How is it built, how do I voice it, and what should I practice with it?':'Help me practice chords on the keyboard.',{fresh:true}); }; r3.appendChild(ask);
    r2.appendChild(more);
    $('#prLbl').textContent='Chord practice';
    { const c=chordPick(); if(st.cpick===undefined&&!st.chords&&K){ st.cpick=K.CHK[0]+':0'; } const c2=chordPick();
      if(c2&&K) showPicked(c2,K,true); else if(st.chords) loadChords(st.chords,true); else { steps=[]; cur=-1; chips(); show(); chordTip([]); } void c; }
  }
}
function pick(){
  const box=$('#prPick'); box.textContent=''; const K=window.EAR&&EAR.kit; if(!K) return;
  const wrap=el('div','p-pick'), top=el('div','e-ctl'); top.appendChild(el('h3',null,'Chords in any key'));
  const sel=document.createElement('select'); sel.setAttribute('aria-label','Key'); K.KEYS.forEach(k=>{ const o=el('option',null,k); o.value=k; sel.appendChild(o); }); sel.value=st.ckey; sel.onchange=()=>{ st.ckey=sel.value; save(); }; top.appendChild(sel); wrap.appendChild(top);
  K.CHK.forEach(c=>{ const g=el('div','p-pills'); g.appendChild(el('h3',null,K.CH[c][0])); g.firstChild.style.marginRight='6px'; K.CH[c][1].forEach(ch=>{ const b=el('button','p-pill',ch[0]); b.type='button'; b.onclick=()=>{ clr(); showPicked(ch,K); wrap.querySelectorAll('.p-pill').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); }; g.appendChild(b); }); wrap.appendChild(g); });
  box.appendChild(wrap);
}
function showPicked(ch,K,quiet){
  const root=K.pickRoot(ch[1],st.ckey), pc=root[2], names=ch[1].map(([g,s])=>K.spellAt(root,g,s)), rootN=K.spellAt(root,1,0);
  const rh=ch[1].map(([g,s])=>60+pc+s), lh=[36+pc]; const step={name:rootN+' '+ch[0].toLowerCase(),src:rootN+' '+ch[0],lh,rh,fing:'',lfing:'',nofing:true,spell:K.labelMap([[lh[0],rootN],...ch[1].map(([g,s],i)=>[rh[i],names[i]])])};
  const st2=handFit(invert(step)); steps=[st2]; steps.multi=false; cur=0; chips(); invBtn(); $('#prBig').textContent=step.name[0].toUpperCase()+step.name.slice(1); $('#prBig').style.fontSize=step.name.length>12?'clamp(30px,4.6vw,64px)':'';  $('#prMsg').textContent=''; show(); if(!quiet) play1(steps[0]);
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
  syncStudioBtn(); clr(); const SC=window.SCALES; if(!SC||!SC.build) return; steps=SC.build(st.key,st.hand,st.type,st.oct,st.motion,st.fa==='alt'); cur=-1; chips();
  const g=steps.map(s=>s.name), TL=(SC.types.find(t=>t.id===st.type)||{l:'Major'}).l, maj=st.type==='major'; $('#prLbl').textContent='Scale practice'; $('#prBig').textContent=SYMK(st.key)+' '+(maj?'major':TL)+(st.oct>1?' · '+st.oct+' octaves':'')+(st.motion==='contrary'?' · contrary motion':'')+((st.fa==='alt'&&SC.alts&&SC.alts(st.key,st.type))?' · alternate fingering':''); { const L=steps.map(x=>lab(x,false)); let sub=(maj&&st.oct===1)?(L.slice(0,3).join(' ')+'  |  '+L.slice(3,7).join(' ')+'  |  '+L[7]):L.join(' '); const dn=steps.map(x=>lab(x.alt||x,true)); if(dn.join(' ')!==L.join(' ')&&(steps.some(x=>x.alt)||(sysNow()!=='letter'&&steps.some(x=>x.solD)))) sub+='   ·   coming down: '+dn.slice().reverse().join(' '); $('#prSub').textContent=sub; }
  const rh=steps.some(s=>s.fing), lh=steps.some(s=>s.lfing), hs=st.hand!=='lh', ls=st.hand!=='rh';
  if(st.motion==='contrary'){ $('#prMsg').textContent='Contrary motion: both hands start together on the '+SYMK(st.key)+'. Open: the right hand goes up and the left hand goes down. Close: they come back together.'+((hs&&!rh)||(ls&&!lh)?' The fingering for this key is not in the lessons yet.':''); drawKb(); keyTip(); return; }
  const miss=[]; if(hs&&!rh) miss.push('right-hand'); if(ls&&!lh) miss.push('left-hand');
  $('#prMsg').textContent=miss.length?('The '+miss.join(' and ')+' fingering for '+SYMK(st.key)+(st.type==='major'?' major':' '+TL)+(st.oct>1?' in '+st.oct+' octaves':'')+' is not in the lessons yet. The notes are shown; fingering will appear once it is added.'):'Press Play scale to hear it.';
  drawKb(); keyTip();
}
function chordTip(list){
  let t=document.getElementById('prTip'); if(!t){ t=el('div','p-tip'); t.id='prTip'; const m=$('#prMsg'); m.parentNode.insertBefore(t,m.nextSibling); }
  t.textContent=''; t.hidden=true; const seen={};
  (list||[]).forEach(n=>{ const m=String(n).match(/^([A-G])(#|b)?(m|min|-)(?!aj|a)/); if(!m) return; let k=m[1]+(m[2]||''); if(k==='A#') k='Bb'; if(k==='Db'||k==='Gb'||k==='Ab') return; if(MCH[k]&&!seen[k==='Eb'?'D#':k]){ seen[k==='Eb'?'D#':k]=1; t.appendChild(el('p',null,MCH[k])); } });
  t.hidden=!t.children.length;
}
const INV=['Root','1st','2nd'];
function selBox(lab,opts,val,fn,id){ const w=el('label','p-sel'); if(id) w.id=id; w.appendChild(el('span',null,lab)); const s2=document.createElement('select'); s2.setAttribute('aria-label',lab); let og=null,gl=null;
  opts.forEach(o=>{ if(o.g&&o.g!==gl){ gl=o.g; og=document.createElement('optgroup'); og.label=gl; s2.appendChild(og); } const op=document.createElement('option'); op.value=o.v; op.textContent=o.t; if(o.v===val) op.selected=true; (o.g&&og?og:s2).appendChild(op); });
  s2.onchange=()=>fn(s2.value); w.appendChild(s2); return w; }
function chordPick(){ const K=window.EAR&&EAR.kit; if(!K||!st.cpick) return null; const [c,i]=String(st.cpick).split(':'); return K.CH[c]&&K.CH[c][1][+i]||null; }
function reChord(){ const K=window.EAR&&EAR.kit, c=chordPick(); if(c&&K) showPicked(c,K,true); else if(st.chords) loadChords(st.chords,true); }
/* is this chord a triad? returns its root and the other two tones (as pitch classes, stacked in thirds or as a sus chord) */
function triad(s){ const all=[...(s.lh||[]),...(s.rh||[])]; const pcs=[...new Set(all.map(m=>((m%12)+12)%12))]; if(pcs.length!==3) return null;
  const shapes=[[4,7],[3,7],[3,6],[4,8],[2,7],[5,7]]; const bass=((Math.min(...all)%12)+12)%12;
  const order=[bass,...pcs.filter(x=>x!==bass)];
  for(const r of order){ const iv=pcs.filter(x=>x!==r).map(x=>(x-r+12)%12).sort((a,b)=>a-b); if(shapes.some(sh=>sh[0]===iv[0]&&sh[1]===iv[1])) return {r,t:iv.map(i=>(r+i)%12)}; }
  return null; }
/* the right hand plays the chosen inversion; of the three fingerings 1 2 4, 1 3 5 and 1 2 5 it takes the one that fits these gaps best */
function invert(s){ const T=triad(s); if(!T||!(s.rh&&s.rh.length)) return s; s.tri=true; const inv=st.inv||0;
  const pcs=[T.r,T.t[0],T.t[1]], seq=[pcs.slice(0),[pcs[1],pcs[2],pcs[0]],[pcs[2],pcs[0],pcs[1]]][inv];
  const low=Math.min(...s.rh)-2; let m=low; while(((m%12)+12)%12!==seq[0]) m++; const rh=[m]; for(let i=1;i<3;i++){ let n=rh[i-1]+1; while(((n%12)+12)%12!==seq[i]) n++; rh.push(n); }
  const g=[rh[1]-rh[0],rh[2]-rh[1]], pref={'1,2':2,'1,3':4,'2,4':3,'3,5':3,'2,5':5}, F=[[1,2,4],[1,3,5],[1,2,5]];
  let best=F[1], bc=1e9; F.forEach(f=>{ const c=Math.abs(g[0]-pref[f[0]+','+f[1]])+Math.abs(g[1]-pref[f[1]+','+f[2]]); if(c<bc){ bc=c; best=f; } });
  const rfm={}; rh.forEach((n,i)=>rfm[n]=best[i]);
  return Object.assign({},s,{rh,rfm,fing:'',name:s.name+(inv?' ('+INV[inv]+' inversion)':'')}); }
/* chords in the right hand: 4 notes (seventh chords, 1 3 5 7) take fingers 1 2 3 5, 5 notes (ninth chords, 1 3 5 7 9) take 1 2 3 4 5,
   and no hand is asked to stretch past a tenth: a note beyond that drops an octave */
function handFit(s){ if(!s) return s; const fit=(a,up)=>{ if(!a||a.length<2) return a; a=a.slice().sort((x,y)=>x-y); let guard=0; while(a[a.length-1]-a[0]>16&&guard++<6){ if(up){ a[a.length-1]-=12; } else { a[0]+=12; } a.sort((x,y)=>x-y); } return a; };
  const wr=/^\[/.test(s.src||''), rh=wr?s.rh:fit(s.rh,true), lh=wr?s.lh:fit(s.lh,false), o=Object.assign({},s,{rh,lh});   /* written voicings stay exactly as written */
  /* four notes: whichever of 1 2 3 5 / 1 2 4 5 / 1 3 4 5 fits the gaps best (G B D E -> 1 2 4 5, C E G B -> 1 2 3 5); five notes: 1 2 3 4 5 */
  if(!o.rfm&&rh&&(rh.length===4||rh.length===5)){ let F=[1,2,3,4,5];
    if(rh.length===4){ const pref={'1,2':3,'1,3':5,'2,3':2,'2,4':3,'3,4':2,'3,5':3,'4,5':2}, g=[rh[1]-rh[0],rh[2]-rh[1],rh[3]-rh[2]]; let bc=1e9;
      [[1,2,3,5],[1,2,4,5],[1,3,4,5]].forEach(f=>{ let c=0; for(let k=0;k<3;k++) c+=Math.abs(g[k]-pref[f[k]+','+f[k+1]]); if(c<bc){ bc=c; F=f; } }); }
    o.rfm={}; rh.forEach((m,i)=>o.rfm[m]=F[i]); o.nofing=false; }
  /* left hand: two notes 5 1, three notes 5 3 1 (or 5 2 1 when the top two are close) */
  if(!o.lfm&&lh&&lh.length>=2&&lh.length<=3){ o.lfm={}; const L=lh.length===2?[5,1]:(lh[2]-lh[1]<=2?[5,2,1]:[5,3,1]); lh.forEach((m,i)=>o.lfm[m]=L[i]); }
  if(o.rfm) o.nofing=false; return o; }
function invBtn(){ const b=document.getElementById('prInv'); if(!b) return; const ok=steps.some(x=>x.tri), s=b.querySelector('select'); if(s) s.disabled=!ok; b.style.opacity=ok?'':'.45'; b.title=ok?'Play the triads in root position, first or second inversion':'Inversions work on triads only'; }
function loadChords(text,quiet){
  clr(); st.chords=String(text||'').trim(); save();
  const list=normChords(st.chords).slice(0,16); const out=(window.CLASS&&CLASS.stepsFrom)?CLASS.stepsFrom(list):[];
  if(!out.length){ steps=[]; cur=-1; chips(); show(); $('#prMsg').textContent=st.chords?'I did not recognise those chords. Try names like Dm7, G7, Cmaj7, F#m7b5.':''; chordTip([]); return; }
  steps=out.map(x=>handFit(invert(x))); steps.multi=true; cur=0; chips(); show(); invBtn(); $('#prMsg').textContent=(list.length>out.length?'Some of those were not recognised and were skipped. ':'')+'Tap a chord to hear it, or press Play chords.'; if(!quiet) play1(steps[0]); chordTip(list);
}
document.addEventListener('keydown',e=>{ if(e.code!=='Space'&&e.key!==' ') return; if(!ov||ov.hidden||kind!=='scales') return;
  const t=e.target, tg=t&&t.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||(t&&t.isContentEditable)) return;
  e.preventDefault(); if(t&&t.blur&&tg==='BUTTON') t.blur(); playPause(); });
window.PRACTICE={open,close};
})();
