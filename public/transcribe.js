/* Transcribe a recording: audio file or microphone -> notes (Spotify Basic Pitch, Apache-2.0,
   runs in the browser) -> falling notes on a keyboard, with practice tools and MIDI export. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const NAMES_S=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], NAMES_F=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_KEYS=new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm']);
const MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const MAX_SEC=300;
let X=null; // state
const S={notes:[],dur:0,audio:null,url:null,ac:null,gain:null,mixNote:0.5,rate:1,tr:0,names:false,look:4,loopA:null,loopB:null,
  met:false,bpm:100,bpb:4,metOrigin:0,raf:0,sched:new Set(),metNext:0,lo:48,hi:84,title:'',a4:440,rec:null,recChunks:null,playing:false,busy:false};
const nm=(p,flats)=>(flats?NAMES_F:NAMES_S)[((p%12)+12)%12];
const oct=p=>Math.floor(p/12)-1;
const isBlack=p=>[1,3,6,8,10].includes(((p%12)+12)%12);
function say(t,err){ const e=$('txMsg'); if(e){ e.textContent=t||''; e.style.color=err?'var(--danger)':''; } }

/* ---------- loading the model (only when first needed) ---------- */
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Could not load '+src)); document.head.appendChild(s); }); }
let bpP=null;
async function getModel(){
  if(!bpP) bpP=(async()=>{ if(!window.BP) await loadScript('vendor/basic-pitch.js'); return new window.BP.BasicPitch(new URL('vendor/basic-pitch/model.json',location.href).href); })();
  return bpP;
}

/* ---------- audio in ---------- */
function ensureCtx(){ if(!S.ac){ const AC=window.AudioContext||window.webkitAudioContext; S.ac=new AC(); S.gain=S.ac.createGain(); S.gain.connect(S.ac.destination); } if(S.ac.state==='suspended') S.ac.resume(); return S.ac; }
async function toMono22k(buf){
  const secs=Math.min(buf.duration,MAX_SEC), sr=22050, n=Math.ceil(secs*sr);
  const off=new OfflineAudioContext(1,n,sr), src=off.createBufferSource(); src.buffer=buf; src.connect(off.destination); src.start(0);
  const out=await off.startRendering(); return out.getChannelData(0);
}
async function transcribeBlob(blob,title){
  if(S.busy) return; S.busy=true; stopPlay(); setBusy(true);
  try{
    say('Reading the audio…');
    const ab=await blob.arrayBuffer(), ctx=ensureCtx();
    const buf=await new Promise((res,rej)=>ctx.decodeAudioData(ab.slice(0),res,()=>rej(new Error('This audio file could not be read. Try an mp3, m4a, wav or ogg file.'))));
    const long=buf.duration>MAX_SEC;
    say('Loading the note-finder (first time only)…');
    const bp=await getModel();
    const mono=await toMono22k(buf);
    const frames=[],onsets=[],contours=[];
    say('Listening… 0%');
    await bp.evaluateModel(mono,(f,o,c)=>{ frames.push(...f); onsets.push(...o); contours.push(...c); },p=>say('Listening… '+Math.round(p*100)+'%'));
    const ev=window.BP.noteFramesToTime(window.BP.addPitchBendsToNoteEvents(contours,window.BP.outputToNotesPoly(frames,onsets,0.3,0.3,5,true,null,null,false)));
    let notes=ev.map(n=>({p:n.pitchMidi,t:n.startTimeSeconds,d:n.durationSeconds,a:n.amplitude})).filter(n=>n.d>=0.06&&n.p>=21&&n.p<=108).sort((a,b)=>a.t-b.t||a.p-b.p);
    // drop short ghost notes that are just overtones (an octave, 12th or two octaves above a stronger note that starts at the same time)
    notes=notes.filter(n=>!(n.d<0.3&&notes.some(m=>m!==n&&Math.abs(m.t-n.t)<0.06&&m.d>n.d*1.5&&m.a>=n.a*0.8&&[12,19,24,28,31].includes(n.p-m.p))));
    if(S.url) URL.revokeObjectURL(S.url);
    S.url=URL.createObjectURL(blob); S.notes=notes; S.dur=buf.duration; S.title=title||'Recording';
    if(S.audio){ S.audio.pause(); }
    S.audio=new Audio(S.url); S.audio.preservesPitch=true; S.audio.mozPreservesPitch=true; S.audio.webkitPreservesPitch=true; S.audio.preload='auto';
    S.audio.onended=()=>{ if(S.playing) pausePlay(); };
    S.loopA=S.loopB=null; S.metOrigin=0; applyMix(); S.audio.playbackRate=S.rate;
    fitRange(); const key=detectKey(); $('txKey').textContent=key?('Key: '+key.label):'Key: –';
    $('txTitle').textContent=S.title+' · '+notes.length+' notes'+(long?' (first 5 minutes only)':'');
    $('txSeek').max=String(Math.floor(S.dur*100)); $('txSeek').value='0'; $('txPlay').disabled=false; $('txBack').disabled=false; $('txMidi').disabled=!notes.length; $('txClearLoop').disabled=false;
    say(notes.length?'Done. Press Play: the notes fall onto the keys in time with the recording.':'I could not find clear notes in this audio. Try a recording with less noise, or a single instrument.');
    draw(0);
  }catch(e){ say(e&&e.message?e.message:'Something went wrong while reading the audio.',true); }
  finally{ S.busy=false; setBusy(false); }
}
function setBusy(b){ ['txFile','txRec'].forEach(i=>{ const e=$(i); if(e) e.disabled=b&&i!=='txRec'; }); $('txFileBtn').disabled=b; }

/* ---------- microphone ---------- */
async function toggleRec(){
  if(S.rec){ S.rec.stop(); return; }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    S.recChunks=[]; const mr=new MediaRecorder(stream); S.rec=mr;
    mr.ondataavailable=e=>{ if(e.data&&e.data.size) S.recChunks.push(e.data); };
    mr.onstop=()=>{ stream.getTracks().forEach(t=>t.stop()); const blob=new Blob(S.recChunks,{type:mr.mimeType||'audio/webm'}); S.rec=null; $('txRec').textContent='● Record with the microphone'; $('txRec').classList.remove('on'); transcribeBlob(blob,'My recording'); };
    mr.start(); $('txRec').textContent='■ Stop and transcribe'; $('txRec').classList.add('on'); say('Recording… play or sing, then press Stop.');
  }catch(e){ S.rec=null; say('The microphone is not available. Allow microphone access in your browser, or choose an audio file instead.',true); }
}

/* ---------- key detection ---------- */
function detectKey(){
  if(!S.notes.length) return null; const h=new Array(12).fill(0); S.notes.forEach(n=>h[n.p%12]+=n.d*(0.5+n.a));
  const corr=(prof,r)=>{ let sx=0,sy=0,sxx=0,syy=0,sxy=0; for(let i=0;i<12;i++){ const x=h[(i+r)%12],y=prof[i]; sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y; } const c=sxy-sx*sy/12, d=Math.sqrt((sxx-sx*sx/12)*(syy-sy*sy/12)); return d?c/d:0; };
  let best=null; for(let r=0;r<12;r++){ for(const [prof,mode] of [[MAJ,'major'],[MIN,'minor']]){ const c=corr(prof,r); if(!best||c>best.c) best={c,r,mode}; } }
  const k=(NAMES_S[best.r]); const flatsTonic=NAMES_F[best.r]; const useFlat=FLAT_KEYS.has(flatsTonic+(best.mode==='minor'?'m':'')); const tonic=useFlat?flatsTonic:k;
  const rel=best.mode==='major'?nm((best.r+9)%12,useFlat)+' minor':nm((best.r+3)%12,useFlat)+' major';
  S.flats=useFlat; return {label:tonic+' '+best.mode+' (same notes as '+rel+')'};
}

/* ---------- note range for the keyboard ---------- */
function fitRange(){
  if(!S.notes.length){ S.lo=48; S.hi=84; return; }
  const ps=S.notes.map(n=>n.p).sort((a,b)=>a-b), lo=ps[Math.floor(ps.length*0.01)], hi=ps[Math.ceil(ps.length*0.99)-1];
  let a=Math.floor(lo/12)*12, b=Math.ceil((hi+1)/12)*12-1; while(b-a<35){ if(a>21) a-=12; if(b-a<35&&b<108) b+=12; if(a<=21&&b>=108) break; } S.lo=Math.max(21,a); S.hi=Math.min(108,b);
}

/* ---------- playback ---------- */
const cur=()=>S.audio?S.audio.currentTime:0;
function applyMix(){ const m=S.mixNote; if(S.audio) S.audio.volume=Math.min(1,Math.max(0,1-m*1.0)); if(S.gain) S.gain.gain.value=Math.min(1,m*1.2+0.0001); }
function freq(p){ return S.a4*Math.pow(2,(p-69)/12); }
function playNote(p,at,dur,vel){
  const ac=S.ac, o=ac.createOscillator(), o2=ac.createOscillator(), g=ac.createGain();
  o.type='triangle'; o2.type='sine'; const f=freq(p+S.tr); o.frequency.value=f; o2.frequency.value=f*2;
  const v=0.08+0.22*Math.min(1,vel), end=at+Math.max(0.12,dur/S.rate); g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(v,at+0.01); g.gain.exponentialRampToValueAtTime(v*0.35,at+Math.min(0.4,(end-at)*0.6)); g.gain.exponentialRampToValueAtTime(0.0001,end+0.12);
  const g2=ac.createGain(); g2.gain.value=0.25; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(S.gain); o.start(at); o2.start(at); o.stop(end+0.15); o2.stop(end+0.15);
}
function click(at,accent){ const ac=S.ac, o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=accent?1500:1000; g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(accent?0.6:0.4,at+0.002); g.gain.exponentialRampToValueAtTime(0.0001,at+0.05); o.connect(g); g.connect(S.ac.destination); o.start(at); o.stop(at+0.06); }
function resetSched(){ S.sched.clear(); S.metNext=null; }
function scheduleAhead(t){
  const ac=S.ac, ahead=0.18*S.rate, now=ac.currentTime;
  if(S.mixNote>0.02){ for(let i=0;i<S.notes.length;i++){ const n=S.notes[i]; if(n.t>t+ahead) break; if(n.t<t-0.02||S.sched.has(i)) continue; S.sched.add(i); playNote(n.p,now+Math.max(0,(n.t-t)/S.rate),n.d,n.a); } }
  if(S.met){ const sp=60/S.bpm; if(S.metNext==null){ S.metNext=Math.max(0,Math.ceil((t-S.metOrigin)/sp-1e-6)); }
    while(S.metOrigin+S.metNext*sp<=t+ahead){ const bt=S.metOrigin+S.metNext*sp; if(bt>=t-0.02) click(now+Math.max(0,(bt-t)/S.rate),S.metNext%S.bpb===0); S.metNext++; } }
}
function startPlay(){ if(!S.audio) return; ensureCtx(); applyMix(); S.audio.playbackRate=S.rate; resetSched(); S.audio.play().then(()=>{ S.playing=true; $('txPlay').textContent='❚❚ Pause'; loop(); }).catch(()=>say('Press Play again to start the sound.',true)); }
function pausePlay(){ if(S.audio) S.audio.pause(); S.playing=false; $('txPlay').textContent='▶ Play'; cancelAnimationFrame(S.raf); draw(cur()); }
function stopPlay(){ if(S.audio&&S.playing) pausePlay(); }
function seek(t){ if(!S.audio) return; S.audio.currentTime=Math.max(0,Math.min(S.dur,t)); resetSched(); draw(cur()); $('txSeek').value=String(Math.floor(cur()*100)); $('txTime').textContent=fmt(cur())+' / '+fmt(S.dur); }
const fmt=t=>{ t=Math.max(0,t); const m=Math.floor(t/60), s=Math.floor(t%60); return m+':'+String(s).padStart(2,'0'); };
function loop(){
  const t=cur();
  if(S.loopA!=null&&S.loopB!=null&&S.loopB>S.loopA&&t>=S.loopB){ seek(S.loopA); S.raf=requestAnimationFrame(loop); return; }
  scheduleAhead(t); draw(t); $('txSeek').value=String(Math.floor(t*100)); $('txTime').textContent=fmt(t)+' / '+fmt(S.dur);
  if(S.playing) S.raf=requestAnimationFrame(loop);
}

/* ---------- falling notes ---------- */
const HUES=[210,255,300,345,25,50,95,150,175,190,230,280];
function draw(t){
  const cv=$('txCanvas'); if(!cv) return; const dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight; if(!W||!H) return;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); const cs=getComputedStyle(document.documentElement);
  const bg=cs.getPropertyValue('--surface').trim()||'#fff', ink=cs.getPropertyValue('--ink').trim()||'#111', line=cs.getPropertyValue('--line').trim()||'#ccc';
  g.fillStyle='#0d1320'; g.fillRect(0,0,W,H);
  const KH=Math.min(84,H*0.26), fallH=H-KH, lo=S.lo, hi=S.hi, whites=[]; for(let p=lo;p<=hi;p++) if(!isBlack(p)) whites.push(p);
  const kw=W/whites.length, pos={}; whites.forEach((p,i)=>pos[p]={x:i*kw,w:kw}); for(let p=lo;p<=hi;p++) if(isBlack(p)){ const left=pos[p-1]; const bw=kw*0.62; pos[p]={x:(left?left.x+kw:0)-bw/2,w:bw}; }
  // octave guide lines
  g.strokeStyle='rgba(255,255,255,.06)'; g.lineWidth=1; for(const p of whites){ if(p%12===0){ g.beginPath(); g.moveTo(pos[p].x,0); g.lineTo(pos[p].x,fallH); g.stroke(); } }
  const look=S.look, pps=fallH/look, active=new Map();
  // loop band
  if(S.loopA!=null){ const ya=fallH-(S.loopA-t)*pps, yb=S.loopB!=null?fallH-(S.loopB-t)*pps:null; g.fillStyle='rgba(255,212,59,.18)'; if(yb!=null){ g.fillRect(0,Math.min(ya,yb),W,Math.abs(ya-yb)); } g.fillStyle='rgba(255,212,59,.9)'; g.fillRect(0,ya-1,W,2); if(yb!=null) g.fillRect(0,yb-1,W,2); }
  // beat lines when metronome is on
  if(S.met){ const sp=60/S.bpm; let k=Math.ceil((t-S.metOrigin)/sp); for(;;k++){ const bt=S.metOrigin+k*sp; if(bt>t+look) break; const y=fallH-(bt-t)*pps; g.strokeStyle=k%S.bpb===0?'rgba(255,255,255,.25)':'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); } }
  const flats=!!S.flats;
  for(let i=0;i<S.notes.length;i++){ const n=S.notes[i]; if(n.t>t+look) break; const end=n.t+n.d; if(end<t) continue; const p=n.p+S.tr; if(p<lo||p>hi||!pos[p]) continue;
    const y2=fallH-(n.t-t)*pps, y1=fallH-(end-t)*pps, bx=pos[p], h=Math.max(4,y2-y1); const hue=HUES[((p%12)+12)%12], on=n.t<=t&&end>=t;
    g.fillStyle=`hsl(${hue} 85% ${on?62:50}%)`; const x=bx.x+1, w=bx.w-2, r=Math.min(4,w/3); g.beginPath(); g.roundRect?g.roundRect(x,y1,w,h,r):g.rect(x,y1,w,h); g.fill();
    if(on) active.set(p,hue);
    if(S.names&&h>13&&w>12){ g.fillStyle='#fff'; g.font=`600 ${Math.min(12,w*0.62)}px system-ui,sans-serif`; g.textAlign='center'; g.fillText(nm(p,flats),x+w/2,Math.min(y2-3,fallH-3)); } }
  // keyboard
  g.fillStyle='#fff'; g.fillRect(0,fallH,W,KH);
  for(const p of whites){ const b=pos[p]; if(active.has(p)){ g.fillStyle=`hsl(${active.get(p)} 85% 60%)`; g.fillRect(b.x,fallH,b.w,KH); } g.strokeStyle='#8a93a6'; g.strokeRect(b.x+.5,fallH+.5,b.w-1,KH-1);
    if(S.names&&(p%12===0||active.has(p))){ g.fillStyle='#333'; g.font=`600 ${Math.min(11,kw*0.55)}px system-ui,sans-serif`; g.textAlign='center'; g.fillText(nm(p,flats)+(p%12===0?oct(p):''),b.x+b.w/2,fallH+KH-5); } }
  for(let p=lo;p<=hi;p++){ if(!isBlack(p)) continue; const b=pos[p]; g.fillStyle=active.has(p)?`hsl(${active.get(p)} 85% 45%)`:'#161a24'; g.fillRect(b.x,fallH,b.w,KH*0.62); }
  g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=2; g.beginPath(); g.moveTo(0,fallH); g.lineTo(W,fallH); g.stroke();
  if(!S.notes.length){ g.fillStyle='rgba(255,255,255,.7)'; g.font='600 14px system-ui,sans-serif'; g.textAlign='center'; g.fillText('Choose an audio file or record with the microphone',W/2,fallH/2); }
}

/* ---------- MIDI export (format 0) ---------- */
function vlq(n){ const b=[n&0x7f]; while((n>>=7)>0) b.unshift((n&0x7f)|0x80); return b; }
function midiBytes(){
  const PPQ=480, TPS=PPQ*2, ev=[]; S.notes.forEach(n=>{ const p=Math.max(0,Math.min(127,n.p+S.tr)), v=Math.max(20,Math.min(127,Math.round(40+n.a*110))); ev.push({t:Math.round(n.t*TPS),o:1,p,v}); ev.push({t:Math.round((n.t+n.d)*TPS),o:0,p,v:0}); });
  ev.sort((a,b)=>a.t-b.t||a.o-b.o); const tr=[0,0xFF,0x51,3,0x07,0xA1,0x20, 0,0xFF,0x58,4,4,2,24,8]; let last=0;
  for(const e of ev){ tr.push(...vlq(e.t-last),e.o?0x90:0x80,e.p,e.v); last=e.t; } tr.push(0,0xFF,0x2F,0);
  const hdr=[0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,PPQ>>8,PPQ&255], len=tr.length, th=[0x4d,0x54,0x72,0x6b,(len>>>24)&255,(len>>>16)&255,(len>>>8)&255,len&255];
  return new Uint8Array([...hdr,...th,...tr]);
}
function downloadMidi(){
  if(!S.notes.length) return; const blob=new Blob([midiBytes()],{type:'audio/midi'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=(S.title||'transcription').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-').slice(0,50)+'.mid'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  say('Saved as a MIDI file'+(S.tr?' (transposed '+(S.tr>0?'+':'')+S.tr+')':'')+'. Open it in MuseScore, a notation app or your DAW.');
}

/* ---------- wiring ---------- */
function init(){
  if(!$('txCanvas')||X) return; X=1;
  $('txFileBtn').onclick=()=>$('txFile').click();
  $('txFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(f) transcribeBlob(f,f.name.replace(/\.[^.]+$/,'')); e.target.value=''; };
  $('txRec').onclick=toggleRec;
  $('txPlay').onclick=()=>S.playing?pausePlay():startPlay();
  $('txBack').onclick=()=>seek(S.loopA!=null?S.loopA:cur()-5);
  $('txSeek').oninput=e=>seek(+e.target.value/100);
  $('txSpeed').onchange=e=>{ S.rate=+e.target.value; if(S.audio) S.audio.playbackRate=S.rate; resetSched(); };
  $('txLook').onchange=e=>{ S.look=+e.target.value; draw(cur()); };
  $('txTr').onchange=e=>{ S.tr=+e.target.value; resetSched(); draw(cur()); };
  $('txMix').oninput=e=>{ S.mixNote=+e.target.value/100; applyMix(); };
  $('txNames').onchange=e=>{ S.names=e.target.checked; draw(cur()); };
  $('txA4').onchange=e=>{ S.a4=+e.target.value; };
  $('txSetA').onclick=()=>{ S.loopA=cur(); if(S.loopB!=null&&S.loopB<=S.loopA) S.loopB=null; say('Loop start set at '+fmt(S.loopA)+'. Now set the end.'); draw(cur()); };
  $('txSetB').onclick=()=>{ if(S.loopA==null){ say('Set the loop start first.',true); return; } if(cur()<=S.loopA){ say('Move forward, then set the loop end.',true); return; } S.loopB=cur(); say('Looping '+fmt(S.loopA)+' to '+fmt(S.loopB)+'.'); draw(cur()); };
  $('txClearLoop').onclick=()=>{ S.loopA=S.loopB=null; say('Loop cleared.'); draw(cur()); };
  $('txMet').onchange=e=>{ S.met=e.target.checked; resetSched(); draw(cur()); };
  $('txBpm').onchange=e=>{ S.bpm=Math.max(30,Math.min(240,+e.target.value||100)); e.target.value=S.bpm; resetSched(); };
  $('txBpb').onchange=e=>{ S.bpb=+e.target.value; resetSched(); };
  $('txBeat1').onclick=()=>{ S.metOrigin=cur(); resetSched(); say('Beat 1 is now at '+fmt(cur())+'.'); draw(cur()); };
  $('txMidi').onclick=downloadMidi;
  $('txCanvas').addEventListener('click',()=>{ if(S.audio) S.playing?pausePlay():startPlay(); });
  $('txCard').addEventListener('keydown',e=>{ if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&S.audio){ e.preventDefault(); e.stopPropagation(); S.playing?pausePlay():startPlay(); } },true);
  new ResizeObserver(()=>draw(cur())).observe($('txCanvas'));
  draw(0);
}
window.TX={init,S,_test:{transcribeBlob,midiBytes,detectKey,draw}};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
