/* ear.js: Ear training quiz for Class. Intervals, chord quality, and which chord (1, 4, 5, 6, 2, 3). */
(function(){
'use strict';
const R=n=>Math.floor(Math.random()*n);
const NN=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const IV=[[2,'Major 2nd'],[3,'Minor 3rd'],[4,'Major 3rd'],[5,'Perfect 4th'],[7,'Perfect 5th'],[12,'Octave']];
const QL=[['Major',[0,4,7]],['Minor',[0,3,7]],['Dominant 7',[0,4,7,10]],['Major 7',[0,4,7,11]],['Minor 7',[0,3,7,10]]];
// chords in the major key, by scale degree: [degree label, semitone root above the key, triad]
const DG=[['1 chord',0,[0,4,7]],['2 chord',2,[0,3,7]],['3 chord',4,[0,3,7]],['4 chord',5,[0,4,7]],['5 chord',7,[0,4,7]],['6 chord',9,[0,3,7]]];
const MODES={
 iv:{name:'Intervals',help:'Two notes, one after the other. How far apart are they?',opts:()=>IV.map(x=>x[1]),make(){ const a=IV[R(IV.length)], root=48+R(12); return {ans:a[1],play:(S)=>{ S(root,1.4,.8,0); S(root+a[0],1.6,.8,.9); },why:a[1]+': the second note is '+a[0]+' half step'+(a[0]===1?'':'s')+' above the first.'}; }},
 ql:{name:'Chord quality',help:'One chord. What kind is it?',opts:()=>QL.map(x=>x[0]),make(){ const a=QL[R(QL.length)], root=48+R(12); return {ans:a[0],play:(S)=>{ a[1].forEach((n,i)=>S(root+n,2.2,.7,i*0.015)); S(root-12,2.2,.7,0); },why:'That was a '+a[0]+' chord.'}; }},
 dg:{name:'Which chord? (key of C)',help:'First you hear C (the 1 chord) so you know where home is. Then a chord from the key. Which one is it?',opts:()=>DG.map(x=>x[0]),make(){ const a=DG[R(DG.length)]; return {ans:a[0],play:(S)=>{ [0,4,7].forEach((n,i)=>S(48+n,1.2,.7,i*0.015)); S(36,1.2,.7,0); DG[0]; a[2].forEach((n,i)=>S(48+a[1]+n,2.2,.75,1.5+i*0.015)); S(36+a[1],2.2,.75,1.5); },why:'That was the '+a[0]+' in C: '+NN[a[1]]+(a[2][1]===3?' minor':' major')+'.'}; }}
};
let mode='iv', n=0, score=0, q=null, missed={}, ov=null;
function S(m,d,v,dl){ if(window.CLASS&&CLASS.sound) CLASS.sound(m,d,v,dl); }
function open(m){ mode=m||mode; n=0; score=0; missed={}; if(!ov) build(); ov.hidden=false; next(); }
function close(){ if(ov) ov.hidden=true; }
function build(){
  ov=document.createElement('div'); ov.hidden=true; ov.style.cssText='position:fixed;inset:0;z-index:9998;background:rgba(4,4,4,.78);display:grid;place-items:center;font-family:system-ui,sans-serif';
  ov.innerHTML='<div style="background:#14110a;color:#f3ead8;border:1px solid #6b5826;border-radius:18px;padding:22px;width:min(560px,94vw);max-height:92vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0;font-size:22px;color:#fff;text-transform:none;letter-spacing:0">🎧 Ear training</h2><button type="button" id="earX" style="background:none;border:1px solid #8a7230;color:#f3ead8;border-radius:10px;padding:6px 12px;cursor:pointer">Close</button></div><div id="earTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0"></div><p id="earHelp" style="color:#c8b98f;margin:0 0 8px;font-size:14px"></p><div id="earBar" style="font-weight:700;margin-bottom:8px"></div><button type="button" id="earPlay" style="background:#e8c25a;color:#1a1a1a;border:0;border-radius:12px;padding:12px 18px;font-size:16px;font-weight:800;cursor:pointer">▶ Play it</button> <button type="button" id="earAgain" style="background:transparent;color:#f3ead8;border:1px solid #8a7230;border-radius:12px;padding:12px 16px;font-size:15px;cursor:pointer">Hear again</button><div id="earOpts" style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0"></div><div id="earMsg" style="min-height:44px;font-size:15px"></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#earX').onclick=close; ov.addEventListener('click',e=>{ if(e.target===ov) close(); });
  ov.querySelector('#earPlay').onclick=()=>q&&q.play(S); ov.querySelector('#earAgain').onclick=()=>q&&q.play(S);
}
const btn=(t,css)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.style.cssText=css; return b; };
function tabs(){ const box=ov.querySelector('#earTabs'); box.textContent=''; Object.keys(MODES).forEach(k=>{ const b=btn(MODES[k].name,'border-radius:999px;padding:7px 13px;cursor:pointer;font-size:14px;border:1px solid #8a7230;'+(k===mode?'background:#d4af37;color:#111':'background:transparent;color:#f3ead8')); b.onclick=()=>open(k); box.appendChild(b); }); }
function next(){
  tabs(); const M=MODES[mode]; ov.querySelector('#earHelp').textContent=M.help;
  const msg=ov.querySelector('#earMsg'), opts=ov.querySelector('#earOpts'); opts.textContent=''; msg.textContent='';
  if(n>=10) return done();
  q=M.make(); ov.querySelector('#earBar').textContent='Question '+(n+1)+' of 10 · Score '+score; ov.querySelector('#earPlay').hidden=false; ov.querySelector('#earAgain').hidden=false;
  M.opts().forEach(o=>{ const b=btn(o,'background:#231c0f;color:#f3ead8;border:1px solid #8a7230;border-radius:12px;padding:11px 15px;font-size:15px;cursor:pointer'); b.onclick=()=>answer(o,b); opts.appendChild(b); });
  setTimeout(()=>q.play(S),250);
}
function answer(o,b){
  const msg=ov.querySelector('#earMsg'), opts=[...ov.querySelectorAll('#earOpts button')]; if(opts.some(x=>x.disabled)) return;
  opts.forEach(x=>{ x.disabled=true; if(x.textContent===q.ans) x.style.background='#1f7a3f'; });
  const ok=o===q.ans; if(ok) score++; else { b.style.background='#a33a1c'; missed[q.ans]=(missed[q.ans]||0)+1; }
  msg.textContent=(ok?'Right! ':'Not quite. ')+q.why; n++;
  const nx=btn(n>=10?'See my score':'Next →','margin-top:10px;display:block;background:#e8c25a;color:#1a1a1a;border:0;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer'); nx.onclick=next; msg.appendChild(nx); nx.focus();
  try{ if(window.PSPROG) PSPROG.mark(); }catch(_){}
}
function done(){
  const msg=ov.querySelector('#earMsg'); ov.querySelector('#earBar').textContent='Round complete: '+score+' out of 10'; ov.querySelector('#earPlay').hidden=true; ov.querySelector('#earAgain').hidden=true;
  const miss=Object.keys(missed); msg.textContent=score>=9?'Excellent ear! Try another mode.':score>=6?'Good work. Keep going and it will get easier.':'This takes practice, and that is normal. Play the ones you missed on your keyboard and try again.';
  const row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
  const again=btn('Play another round','background:#e8c25a;color:#1a1a1a;border:0;border-radius:12px;padding:10px 16px;font-weight:800;cursor:pointer'); again.onclick=()=>open(mode); row.appendChild(again);
  if(miss.length){ const ask=btn('Ask Pokey about what I missed','background:transparent;color:#f3ead8;border:1px solid #8a7230;border-radius:12px;padding:10px 16px;cursor:pointer'); ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout('In ear training ('+MODES[mode].name+') I missed: '+miss.join(', ')+'. Help me hear the difference and give me something to practice on the keyboard.',{fresh:true}); }; row.appendChild(ask); }
  msg.appendChild(row);
}
window.EAR={open,close};
})();
