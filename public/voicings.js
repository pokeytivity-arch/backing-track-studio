/* voicings.js: Class > Chord practice > Voicings.
   You type the notes of a chord (any order, any inversion); it names the chord and shows each voicing on the keyboard.
   The voicings, their formulas and their descriptions are written exactly as the director gave them (see TRI and NINTH below).
   In a formula: numbers are chord tones (1 3 5 7 9), "/" separates left hand from right hand, a "." lifts the next tone an octave (1.3 is a tenth); a dot just before "/" is an octave gap between the hands.
   The first tone starts in the octave that begins at the given C, and every tone after it goes up from the one before. */
(function(){
'use strict';
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const BASE={C:0,D:2,E:4,F:5,G:7,A:9,B:11}, LETTERS='CDEFGAB', SYM={'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'};
const mod=(n,m)=>((n%m)+m)%m;

/* ----- the director's voicings ----- */
const TRI=[ // start around C4, then moved down an octave if the top would pass G5 (singable register C2 to G5)
  {f:'3 / 1 5', d:'Drop-2 voicing of root position'},
  {f:'5 / 3 1', d:'Drop-2 voicing of first inversion'},
  {f:'1 / 5 3', d:'Drop-2 voicing of second inversion'}
];
const NINTH=[ // oct = the C where the first tone's octave begins; only = chord kinds it is for (omitted = all three)
  {f:'1./3 5 7 9', oct:2, d:'Part-over-root voicing'},
  {f:'1./ 7 9 3 5', oct:2, d:'Combination of the part-over-root voicing and A and B voicing'},
  {f:'1. / 5 7 9 3', oct:2, d:'Upper-structure voicing technique', only:['maj9','dom9']},
  {f:'1.3 / 7 9 5', oct:2, d:'Combination of the part-over-root voicing and drop-2 voicing'},
  {f:'1.7 / 3 5 9', oct:3, d:'Combination of the part-over-root voicing, A and B voicing and drop-2 voicing'},
  {f:'1 5 / 7 9 3 5', oct:3, d:'Combination of A and B voicing and part over root voicing'},
  {f:'1 / 7 9 3 5', oct:3, d:'The B voicing'},
  {f:'1 5 / 3 5 7 9', oct:3, d:'Combination of A and B voicing and part over root voicing'},
  {f:'3 5 7 9', oct:4, d:'Combination of rootless voicing and A and B voicing'},
  {f:'3 7 9', oct:4, d:'Combination of rootless voicing and A and B voicing'},
  {f:'7 9 3 5', oct:3, d:'Combination of rootless voicing and A and B voicing'}
];
/* In a formula a dot right before the slash is an octave gap between the last left-hand note and the first right-hand note. */

/* ----- reading what was typed ----- */
function readNotes(text){
  const out=[]; String(text||'').replace(/♯/g,'#').replace(/♭/g,'b').replace(/𝄪/g,'x').replace(/𝄫/g,'bb').split(/[\s,;|/.\-]+/).filter(Boolean).forEach(t=>{
    const m=/^([A-Ga-g])(##|bb|x|X|#|b)?(-?\d)?$/.exec(t); if(!m) throw new Error('“'+t+'” is not a note. Type notes like C E G or Bb D F.');
    const a=(m[2]||'').toLowerCase(), d=a==='#'?1:a==='##'||a==='x'?2:a==='b'?-1:a==='bb'?-2:0, L=m[1].toUpperCase();
    out.push({L,d,pc:mod(BASE[L]+d,12)}); });
  return out;
}
const KINDS=[ // intervals above the root: third, fifth (optional for ninths), seventh, ninth
  {k:'maj',name:'major triad',t:[4,7]}, {k:'min',name:'minor triad',t:[3,7]},
  {k:'maj9',name:'major ninth',t:[4,7,11,14],nine:true}, {k:'min9',name:'minor ninth',t:[3,7,10,14],nine:true}, {k:'dom9',name:'dominant ninth',t:[4,7,10,14],nine:true}];
function identify(notes){
  const set=new Set(notes.map(n=>n.pc)); if(set.size<3) throw new Error('Type at least three different notes.');
  for(const r of notes){
    for(const K of KINDS){
      const want=K.t.map(x=>mod(r.pc+x,12)), need=K.nine?[want[0],want[2],want[3]]:want;
      if(!need.every(x=>set.has(x))) continue;
      const allowed=new Set([r.pc].concat(want)); if([...set].some(x=>!allowed.has(x))) continue;
      return {root:r,K};
    }
  }
  throw new Error('I can read major and minor triads (C E G) and major, minor and dominant ninth chords (C E G B D). Check the notes you typed.');
}
/* spell chord tones from the root: degree 1,3,5,7,9 */
function spell(root,deg,semi){
  const L=LETTERS[(LETTERS.indexOf(root.L)+deg-1)%7], target=mod(root.pc+semi,12); let d=mod(target-BASE[L]+6,12)-6;
  if(Math.abs(d)>2) throw new Error('That chord needs more than a double sharp or flat to spell.');
  return {L,d,pc:target,label:L+SYM[d]};
}
function tones(root,K){ const t=K.t; const o={1:spell(root,1,0),3:spell(root,3,t[0]),5:spell(root,5,t[1])}; if(K.nine){ o[7]=spell(root,7,t[2]); o[9]=spell(root,9,t[3]); } return o; }

/* ----- formula -> notes ----- */
function place(formula,oct,T){
  const parts=formula.split('/'), seq=[]; let up=0;
  parts.forEach((p,hi)=>{ p.trim().split(/\s+/).filter(Boolean).forEach(tok=>{ tok.split(/(\.+)/).filter(x=>x!=='').forEach(x=>{ if(/^\.+$/.test(x)) up+=x.length; else { seq.push({deg:+x,up,hand:parts.length>1&&hi===0?'lh':'rh'}); up=0; } }); }); });
  const out=[]; let prev=null;
  seq.forEach(s=>{ const n=T[s.deg]; if(!n) throw new Error('missing '+s.deg);
    let midi; if(prev==null) midi=12*(oct+1)+n.pc+12*s.up; else { midi=n.pc+12*Math.floor(prev/12); while(midi<=prev) midi+=12; while(midi-12>prev) midi-=12; midi+=12*s.up; }
    prev=midi; out.push({midi,label:n.label,hand:s.hand}); });
  return out;
}
function voicingsFor(root,K){
  const T=tones(root,K), list=[], tri=K.nine?(K.k==='min9'?KINDS[1]:KINDS[0]):K, TT=tones(root,tri);
  TRI.forEach(v=>{ let n=place(v.f,4,TT); while(Math.max.apply(null,n.map(x=>x.midi))>79) n=n.map(x=>Object.assign({},x,{midi:x.midi-12})); list.push({f:v.f,d:v.d,notes:n,group:'Triad voicings'}); });
  if(K.nine) NINTH.forEach(v=>{ if(v.only&&!v.only.includes(K.k)) return; list.push({f:v.f,d:v.d,notes:place(v.f,v.oct,T),group:'Ninth chord voicings'}); });
  return list;
}

/* ----- the room ----- */
let ov=null;
const css=el('style'); css.textContent=`
#vcRoom{position:fixed;left:0;right:0;bottom:0;top:36px;z-index:9999;background:var(--stage,#070b14);color:var(--stage-ink,#fff);display:flex;flex-direction:column;gap:16px;overflow:auto;padding:18px clamp(16px,3vw,34px) 40px;font-family:var(--body,system-ui)}
#vcRoom[hidden]{display:none}#vcRoom>*{flex-shrink:0}
#vcRoom .vc-top{display:flex;align-items:center;gap:12px}#vcRoom h1{margin:0;font:800 clamp(24px,3.6vw,38px)/1 var(--display,var(--body))}
#vcRoom .vc-x{width:42px;height:42px;border-radius:50%;border:1.5px solid #3a4a74;background:transparent;color:inherit;font-size:18px;cursor:pointer}
#vcRoom .vc-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
#vcRoom input{flex:1 1 260px;min-width:0;background:#101728;color:inherit;border:1.5px solid #3a4a74;border-radius:999px;padding:13px 20px;font:600 17px var(--body,system-ui)}
#vcRoom input:focus{outline:2px solid var(--hi,#ffd43b);outline-offset:1px}
#vcRoom .vc-b{min-height:44px;padding:0 20px;border-radius:999px;border:1.5px solid #3a4a74;background:transparent;color:inherit;font:700 15px var(--body,system-ui);cursor:pointer}
#vcRoom .vc-b.pri{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);border:0}
#vcRoom .vc-msg{min-height:1.3em;color:var(--hi,#ffd43b);font-size:15px}
#vcRoom .vc-name{font:800 clamp(28px,4.6vw,52px)/1.05 var(--display,var(--body))}#vcRoom .vc-sub{color:var(--stage-muted,#9aa6c0);font-size:16px}
#vcRoom h2{margin:10px 0 0;font:700 13px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--stage-muted,#9aa6c0)}
#vcRoom .vc-card{display:grid;gap:8px;padding:14px 16px;border:1.5px solid #34446c;border-radius:16px;background:rgba(16,23,40,.6)}
#vcRoom .vc-f{font:800 22px ui-monospace,Menlo,monospace;color:var(--hi,#ffd43b);letter-spacing:.03em}
#vcRoom .vc-d{color:var(--stage-ink,#fff);font-size:15px}#vcRoom .vc-n{font:600 14px ui-monospace,Menlo,monospace;color:var(--stage-muted,#9aa6c0)}#vcRoom .vc-n .l{color:#6db3ff}#vcRoom .vc-n .r{color:#ff9a4a}
#vcRoom .vc-leg{display:flex;gap:14px;font-size:13px;color:var(--stage-muted,#9aa6c0)}#vcRoom .vc-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
`; document.head.appendChild(css);
function build(){
  ov=el('div'); ov.id='vcRoom'; ov.hidden=true; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Voicings');
  ov.innerHTML='<div class="vc-top"><button class="vc-x" type="button" aria-label="Back" title="Back">←</button><h1>Voicings</h1></div>'
   +'<div class="vc-sub">Type the notes of a chord, in any order or inversion, and see its voicings on the keyboard.</div>'
   +'<div class="vc-row"><input id="vcIn" type="text" placeholder="C E G   or   Bb D F   or   C E G B D" aria-label="Chord notes" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="vc-b pri" id="vcGo" type="button">Show voicings</button></div>'
   +'<div class="vc-msg" id="vcMsg" aria-live="polite"></div><div id="vcOut"></div>';
  document.body.appendChild(ov);
  ov.querySelector('.vc-x').onclick=close; document.addEventListener('keydown',e=>{ if(ov&&!ov.hidden&&e.key==='Escape'&&e.target.tagName!=='INPUT') close(); });
  const go=()=>run(ov.querySelector('#vcIn').value); ov.querySelector('#vcGo').onclick=go; ov.querySelector('#vcIn').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } };
}
function run(text){
  const out=ov.querySelector('#vcOut'), msg=ov.querySelector('#vcMsg'); out.textContent=''; msg.textContent='';
  let res; try{ const notes=readNotes(text); if(!notes.length){ msg.textContent='Type the notes first.'; return; } res=identify(notes); res.list=voicingsFor(res.root,res.K); res.T=tones(res.root,res.K); }catch(e){ msg.textContent=e.message; return; }
  const nm=res.root.L+SYM[res.root.d]+' '+res.K.name, deg=Object.keys(res.T).map(k=>res.T[k].label).join('  ');
  out.appendChild(el('div','vc-name',nm)); out.appendChild(el('div','vc-sub','Chord tones: '+deg));
  let grp=''; res.list.forEach(v=>{
    if(v.group!==grp){ grp=v.group; out.appendChild(el('h2',null,grp)); }
    const c=el('div','vc-card'); c.appendChild(el('div','vc-f',v.f)); c.appendChild(el('div','vc-d',v.d));
    const l=v.notes.filter(n=>n.hand==='lh').map(n=>n.label).join(' '), r=v.notes.filter(n=>n.hand==='rh').map(n=>n.label).join(' ');
    const nn=el('div','vc-n'); if(l){ const a=el('span','l','LH '+l); nn.appendChild(a); nn.appendChild(document.createTextNode('   ')); } if(r) nn.appendChild(el('span','r','RH '+r)); c.appendChild(nn);
    if(window.ASSIGN) c.appendChild(ASSIGN.keyboard([{notes:v.notes}],0));
    const row=el('div','vc-row'); if(window.CLASS&&CLASS.sound){ const p=el('button','vc-b','▶ Play together'); p.type='button'; p.onclick=()=>v.notes.forEach(n=>CLASS.sound(n.midi,1.8,.8,0)); const q=el('button','vc-b','▶ One by one'); q.type='button'; q.onclick=()=>v.notes.forEach((n,i)=>CLASS.sound(n.midi,1.4,.8,i*.4)); row.append(p,q); }
    const lg=el('div','vc-leg'); lg.innerHTML='<span><i style="background:#1c7ed6"></i>Left hand</span><span><i style="background:#f76707"></i>Right hand</span>'; row.appendChild(lg); c.appendChild(row); out.appendChild(c); });
}
function open(text){ if(!ov) build(); ov.hidden=false; if(typeof text==='string'){ ov.querySelector('#vcIn').value=text; run(text); } setTimeout(()=>{ try{ ov.querySelector('#vcIn').focus({preventScroll:true}); }catch(_){} },50); }
function close(){ if(ov) ov.hidden=true; }
window.VOICE={open,close,_t:{readNotes,identify,voicingsFor,place,tones}};
})();
