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
const S={notes:[],dur:0,audio:null,url:null,ac:null,gain:null,mixNote:1,rate:1,tr:0,names:false,look:4,loopA:null,loopB:null,
  met:false,bpm:100,bpb:4,metOrigin:0,raf:0,sched:new Set(),metNext:0,lo:48,hi:84,title:'',a4:440,rec:null,recChunks:null,playing:false,busy:false,hands:'auto',kbd:88};
const nm=(p,flats)=>(flats?NAMES_F:NAMES_S)[((p%12)+12)%12];
const oct=p=>Math.floor(p/12)-1;
const isBlack=p=>[1,3,6,8,10].includes(((p%12)+12)%12);

/* ---------- the "working" panel ---------- */
const STAGES=[['Listening',['Hearing every note…','Taking in the whole recording…']],['Analyzing',['Separating the melody from the harmony…','Tracking each key and the sustain…','Finding where every note begins…']],['Transcribing',['Writing down each note…','Placing every note in time…','Getting the lengths right…']],['Cross-checking',['Weeding out stray notes…','Checking the notes against the recording…','Tidying the high notes…']]];
let wk={on:false,i:0,pct:0,tick:null,n:0};
function work(i,pct){
  let box=$('txWork');
  if(!box){ box=document.createElement('div'); box.id='txWork'; box.className='txwork'; const m=$('txMsg'); m.parentNode.insertBefore(box,m); }
  if(!wk.on){ wk.on=true; box.hidden=false; box.innerHTML='<div class="eq"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="wmain"><ol class="wst"></ol><div class="wbar"><b></b></div><div class="wline"><span class="wsub"></span><span class="wpct"></span></div></div>'; box.querySelector('.wst').innerHTML=STAGES.map(s=>'<li>'+s[0]+'</li>').join(''); wk.tick=setInterval(()=>{ wk.n++; paintWork(); },2200); }
  wk.i=Math.max(wk.i,i); wk.pct=Math.max(wk.pct,Math.round(pct)); paintWork();
}
function paintWork(){
  const box=$('txWork'); if(!box||!wk.on) return;
  box.querySelectorAll('.wst li').forEach((li,k)=>{ li.className=k<wk.i?'wdone':k===wk.i?'wnow':''; });
  const subs=STAGES[wk.i][1]; box.querySelector('.wsub').textContent=subs[wk.n%subs.length];
  box.querySelector('.wpct').textContent=wk.pct+'%'; box.querySelector('.wbar b').style.width=wk.pct+'%';
}
function workEnd(){ if(wk.tick) clearInterval(wk.tick); wk={on:false,i:0,pct:0,tick:null,n:0}; const b=$('txWork'); if(b){ b.hidden=true; b.innerHTML=''; } }

function say(t,err){ const e=$('txMsg'); if(e){ e.textContent=t||''; e.style.color=err?'var(--danger)':''; } }

/* ---------- loading the model (only when first needed) ---------- */
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Could not load '+src)); document.head.appendChild(s); }); }
let bpP=null;
let noGL=false, proWhy='';
function useSafeMode(){
  if(!noGL){ noGL=true; const g=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(t,...a){ if(/webgl/i.test(t)) return null; return g.call(this,t,...a); }; }
  window.BP=null; bpP=null;
}
async function getModel(){
  if(!bpP) bpP=(async()=>{ if(!window.BP) await loadScript('vendor/basic-pitch.js'+(noGL?'?safe='+Date.now():'')); return new window.BP.BasicPitch(new URL('vendor/basic-pitch/model.json',location.href).href); })();
  return bpP;
}

/* ---------- audio in ---------- */
function ensureCtx(){ if(!S.ac){ const AC=window.AudioContext||window.webkitAudioContext; S.ac=new AC(); S.gain=S.ac.createGain(); S.gain.connect(S.ac.destination); } if(S.ac.state==='suspended') S.ac.resume(); return S.ac; }
async function toMono22k(buf){
  const secs=Math.min(buf.duration,MAX_SEC), sr=22050, n=Math.ceil(secs*sr);
  const off=new OfflineAudioContext(1,n,sr), src=off.createBufferSource(); src.buffer=buf; src.connect(off.destination); src.start(0);
  const out=await off.startRendering(); return out.getChannelData(0);
}

/* ---------- note finding: sensitivity + cleanup ---------- */
function sensVal(){ const e=$('txSens'); return e?+e.value/100:0.38; }
function extract(raw,s){
  const thr=Math.max(0.1,Math.min(0.6,0.475-0.35*s)), thrO=Math.max(0.3,Math.min(0.85,0.85-0.46*s)), minLen=Math.max(3,Math.round(11-8*s));
  const ev=window.BP.noteFramesToTime(window.BP.addPitchBendsToNoteEvents(raw.contours,window.BP.outputToNotesPoly(raw.frames,raw.onsets,thrO,thr,minLen,true,null,null,false)));
  const LAT=0.02; // the model reports onsets ~20 ms late (measured against the audio); undo it so notes land where they were played
  const notes=ev.map(n=>{const t=Math.max(0,n.startTimeSeconds-LAT);return {p:n.pitchMidi,t,d:n.durationSeconds+(n.startTimeSeconds-t),a:n.amplitude};}).filter(n=>n.p>=21&&n.p<=108);
  return cleanup(notes,s);
}


/* ---------- cross-check high notes against the actual recording ---------- */
// For each note from C5 up: is there really a peak of energy at that pitch in the audio right after the note starts?
// Notes the model imagined have no peak there. Stored as n.pk (ratio of energy at the pitch vs. the pitches a semitone or two either side).
function addPeaks(notes,buf){
  const ch=buf.getChannelData(0), sr=buf.sampleRate, L=Math.round(0.12*sr), win=new Float32Array(L); for(let i=0;i<L;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(L-1));
  const pw=(t0,f)=>{ const i0=Math.round(t0*sr); if(i0<0||i0+L>ch.length) return null; const c=2*Math.cos(2*Math.PI*f/sr); let s1=0,s2=0; for(let i=0;i<L;i++){ const s0=ch[i0+i]*win[i]+c*s1-s2; s2=s1; s1=s0; } return (s1*s1+s2*s2-c*s1*s2)/L; };
  return notes.map(n=>{
    if(n.p<72) return n;
    const f=440*Math.pow(2,(n.p-69)/12), e=pw(n.t+0.01,f); if(e==null) return n;
    let nb=0,k=0; for(const st of [-2,-1,1,2]){ const x=pw(n.t+0.01,f*Math.pow(2,st/12)); if(x!=null){ nb+=x; k++; } }
    return Object.assign({},n,{pk:e/((k?nb/k:0)+1e-12)});
  });
}

/* ---------- piano-model cleanup: only weed out stray high notes and overtone ghosts ---------- */
function cleanupPro(notes,s){
  if(notes.length<12) return notes;
  const as=notes.map(n=>n.a).sort((x,y)=>x-y), med=as[Math.floor(as.length/2)]||0.5;
  const k=0.75+0.5*(1-s);                       // higher sensitivity keeps more
  const by=notes.slice().sort((x,y)=>x.t-y.t);
  const near=(n,span,pr)=>by.some(o=>o!==n&&Math.abs(o.t-n.t)<span&&Math.abs(o.p-n.p)<=pr);
  const HARM=[12,19,24,28,31,34];
  return notes.filter(n=>{
    if(n.pk!=null&&n.p>=72){ const need=1.5+3.5*(1-s); if(n.pk<need&&!(n.a>=med*1.5&&n.d>=0.4)) return false; }
    // overtone ghost: a clearly louder note 12/19/24/28/31 semitones below starting at the same moment
    if(n.p>=60 && by.some(o=>o!==n&&Math.abs(o.t-n.t)<0.06&&HARM.includes(n.p-o.p)&&o.a>n.a*1.15)) return false;
    if(n.p>=96) return n.a>=med*1.1*k&&n.d>=0.15;
    if(n.p>=84) return !(n.a<med*0.9*k&&(n.d<0.25||!near(n,0.8,9)));
    if(n.p>=79) return !(n.a<med*0.75*k&&n.d<0.2&&!near(n,0.6,9));
    return true;
  });
}

function keyPcs(notes){
  if(notes.length<8) return null; const h=new Array(12).fill(0); notes.forEach(n=>h[n.p%12]+=n.d*(0.5+n.a));
  let best=null; for(let r=0;r<12;r++){ for(const [prof,minor] of [[MAJ,0],[MIN,1]]){ let sx=0,sy=0,sxx=0,syy=0,sxy=0; for(let i=0;i<12;i++){ const x=h[(i+r)%12],y=prof[i]; sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y; } const d=Math.sqrt((sxx-sx*sx/12)*(syy-sy*sy/12)), c=d?(sxy-sx*sy/12)/d:0; if(!best||c>best.c) best={c,r,minor}; } }
  if(best.c<0.5) return null;
  const sc=best.minor?[0,2,3,5,7,8,10,11]:[0,2,4,5,7,9,11]; return new Set(sc.map(i=>(i+best.r)%12));
}
function cleanup(notes,s){
  const minD=0.17-0.1*s, minA=0.34-0.3*s;
  let n=notes.filter(x=>x.d>=minD).sort((a,b)=>a.t-b.t||a.p-b.p);
  // overtone ghosts: short notes an octave, twelfth or two octaves above a stronger note that starts together
  n=n.filter(x=>!(x.d<0.3&&n.some(m=>m!==x&&Math.abs(m.t-x.t)<0.06&&m.d>x.d*1.5&&m.a>=x.a*0.8&&[12,19,24,28,31].includes(x.p-m.p))));
  // merge repeats: the same pitch re-found after a tiny gap, without a stronger new onset, is one note
  // (a piano note that rings on is often "heard" again as it fades: a re-trigger that is weaker than the note before it, or that starts almost at once, is the same note)
  const last={}, out=[], merge=S.merge!==false, gapMax=0.1+0.12*(1-s);
  for(const x of n){ const l=last[x.p]; if(merge&&l){ const gap=x.t-(l.t+l.d), onset=x.t-l.t; if((gap<gapMax&&x.a<=l.a*(0.92+1.2*(1-s)))||onset<0.12||(gap<0.07&&x.a<=l.a*2.2)){ l.d=Math.max(l.d,x.t+x.d-l.t); continue; } } const c={...x}; last[x.p]=c; out.push(c); }
  // drop weak notes
  let r=out.filter(x=>x.a>=minA||x.d>=0.4);
  // key-aware: short, quiet notes outside the key are most likely mistakes
  const pcs=keyPcs(r); if(pcs) r=r.filter(x=>pcs.has(x.p%12)||x.d>=0.25||x.a>=0.5);
  return r.sort((a,b)=>a.t-b.t||a.p-b.p);
}

/* ---------- careful analysis: listen several times and keep what the passes agree on ---------- */
function resample(mono,ratio){ // ratio>1: faster and higher; the model sees the same music shifted by 12*log2(ratio) semitones
  const n=Math.floor(mono.length/ratio), out=new Float32Array(n); for(let i=0;i<n;i++){ const x=i*ratio, i0=x|0, f=x-i0, a=mono[i0], b=mono[Math.min(i0+1,mono.length-1)]; out[i]=a+(b-a)*f; } return out;
}
async function runPass(bp,audio,label){
  const frames=[],onsets=[],contours=[]; say('Listening… '+label+' 0%');
  await bp.evaluateModel(audio,(f,o,c)=>{ for(const x of f) frames.push(Float32Array.from(x)); for(const x of o) onsets.push(Float32Array.from(x)); for(const x of c) contours.push(x); },p=>say('Listening… '+label+' '+Math.round(p*100)+'%'));
  return {frames,onsets,contours};
}
function fuse(base,others){
  const n=base.frames.length, cnt=1+others.length;
  const F=base.frames.map(a=>Float32Array.from(a)), O=base.onsets.map(a=>Float32Array.from(a));
  others.forEach(({r,ratio})=>{ const L=r.frames.length; if(!L) return;
    for(let j=0;j<n;j++){ const x=j/ratio, i0=Math.min(L-1,Math.floor(x)), i1=Math.min(L-1,i0+1), fr=Math.max(0,Math.min(1,x-Math.floor(x)));
      const fa=r.frames[i0], fb=r.frames[i1], oa=r.onsets[i0], ob=r.onsets[i1], Fj=F[j], Oj=O[j];
      for(let p=0;p<Fj.length;p++){ Fj[p]+=fa[p]*(1-fr)+fb[p]*fr; Oj[p]+=oa[p]*(1-fr)+ob[p]*fr; } } });
  for(let j=0;j<n;j++){ const Fj=F[j], Oj=O[j]; for(let p=0;p<Fj.length;p++){ Fj[p]/=cnt; Oj[p]/=cnt; } }
  return {frames:F,onsets:O,contours:base.contours};
}

/* ---------- hosted piano model (server route /api/transcribe) ---------- */
function wav16k(buf){
  const secs=Math.min(buf.duration,MAX_SEC), sr=16000, n=Math.ceil(secs*sr);
  const off=new OfflineAudioContext(1,n,sr), src=off.createBufferSource(); src.buffer=buf; src.connect(off.destination); src.start(0);
  return off.startRendering().then(out=>{
    const d=out.getChannelData(0), ab=new ArrayBuffer(44+d.length*2), v=new DataView(ab), w=(o,t)=>{ for(let i=0;i<t.length;i++) v.setUint8(o+i,t.charCodeAt(i)); };
    w(0,'RIFF'); v.setUint32(4,36+d.length*2,true); w(8,'WAVEfmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,d.length*2,true);
    for(let i=0;i<d.length;i++){ const x=Math.max(-1,Math.min(1,d[i])); v.setInt16(44+i*2,x<0?x*0x8000:x*0x7fff,true); }
    return new Blob([ab],{type:'audio/wav'});
  });
}
function parseMidi(ab){
  const v=new DataView(ab); let p=0; const u32=()=>{ const x=v.getUint32(p); p+=4; return x; }, u16=()=>{ const x=v.getUint16(p); p+=2; return x; };
  if(u32()!==0x4d546864) throw new Error('not midi'); u32(); u16(); const nt=u16(); const div=u16();
  const tempos=[[0,500000]], evs=[];
  for(let t=0;t<nt;t++){
    if(u32()!==0x4d54726b) break; const len=u32(), end=p+len; let tick=0, run=0;
    const vlq=()=>{ let x=0,b; do{ b=v.getUint8(p++); x=(x<<7)|(b&127); }while(b&128); return x; };
    while(p<end){
      tick+=vlq(); let st=v.getUint8(p);
      if(st===0xff){ p++; const ty=v.getUint8(p++), l=vlq(); if(ty===0x51&&l===3) tempos.push([tick,(v.getUint8(p)<<16)|(v.getUint8(p+1)<<8)|v.getUint8(p+2)]); p+=l; continue; }
      if(st===0xf0||st===0xf7){ p++; p+=vlq(); continue; }
      if(st&128){ run=st; p++; } else st=run;
      const hi=st&0xf0, a=v.getUint8(p++), b=(hi===0xc0||hi===0xd0)?0:v.getUint8(p++);
      if(hi===0x90||hi===0x80) evs.push({tick,on:hi===0x90&&b>0,p:a,vel:b});
    }
    p=end;
  }
  tempos.sort((x,y)=>x[0]-y[0]);
  const sec=tick=>{ let s=0,lt=0,tp=500000; for(const [tt,tv] of tempos){ if(tt>tick) break; s+=(tt-lt)*tp/1e6/div; lt=tt; tp=tv; } return s+(tick-lt)*tp/1e6/div; };
  evs.sort((x,y)=>x.tick-y.tick); const open={}, notes=[];
  for(const e of evs){
    if(e.on){ if(open[e.p]){ const o=open[e.p]; notes.push({p:e.p,t:sec(o.tick),d:Math.max(0.03,sec(e.tick)-sec(o.tick)),a:o.vel/127}); } open[e.p]={tick:e.tick,vel:e.vel}; }
    else if(open[e.p]){ const o=open[e.p]; delete open[e.p]; notes.push({p:e.p,t:sec(o.tick),d:Math.max(0.03,sec(e.tick)-sec(o.tick)),a:o.vel/127}); }
  }
  notes.sort((x,y)=>x.t-y.t||x.p-y.p); return notes.filter(n=>n.p>=21&&n.p<=108);
}
async function proTranscribe(buf,onProg){
  const t0=Date.now(), est=40+Math.min(buf.duration,MAX_SEC)*0.6;
  onProg(2,'Sending the recording…');
  const wav=await wav16k(buf);
  const fail=async r=>{ let j={}; try{ j=await r.json(); }catch(_){} const err=new Error(j.error||('status '+r.status)); err.code=j.error; err.up=j.status; err.detail=j.detail; return err; };
  const r=await fetch('/api/transcribe',{method:'POST',headers:{'content-type':'audio/wav'},body:wav});
  if(!r.ok) throw await fail(r);
  const {id}=await r.json(); if(!id) throw Object.assign(new Error('no id'),{code:'no_id'});
  for(let i=0;i<150;i++){
    await new Promise(res=>setTimeout(res,2500));
    const q=await fetch('/api/transcribe?id='+encodeURIComponent(id));
    if(!q.ok) throw await fail(q);
    if((q.headers.get('content-type')||'').includes('midi')){ onProg(100,'Reading the notes…'); return parseMidi(await q.arrayBuffer()); }
    const j=await q.json(), el=(Date.now()-t0)/1000;
    if(j.status==='starting') onProg(Math.min(12,4+el/10),'Waking the piano model (first run can take a few minutes)…');
    else { const pct=j.pct!=null?j.pct:Math.round(15+80*(1-Math.exp(-el/est))); onProg(Math.max(15,Math.min(97,pct)),'Listening to the piano…'); }
  }
  throw Object.assign(new Error('timeout'),{code:'timeout'});
}

async function transcribeBlob(blob,title){
  if(S.busy) return; S.busy=true; clearCurrent(true); setBusy(true);
  try{
    work(0,1); say('');
    const ab=await blob.arrayBuffer(), ctx=ensureCtx();
    const buf=await new Promise((res,rej)=>ctx.decodeAudioData(ab.slice(0),res,()=>rej(new Error('This audio file could not be read. Try an mp3, m4a, wav or ogg file.'))));
    const long=buf.duration>MAX_SEC;
    proWhy='';
    if(!$('txPro')||$('txPro').checked){
      try{
        work(0,2);
        const pn=await proTranscribe(buf,(p,m)=>{ work(p<12?0:p<50?1:2,p); });
        work(3,98); await new Promise(r=>setTimeout(r,900));
        if(pn.length>3){ S.raw=null; const pv=addPeaks(pn,buf), cl=cleanupPro(pv,sensVal()); await showResult({blob,notes:cl,dur:buf.duration,title,long,fresh:true,pro:true}); S.baseNotes=pv; saveItem({blob,notes:cl,dur:buf.duration,title:title||'Recording',pro:true}); return; }
      }catch(e){ console.log('piano model unavailable',e); const why=!e||!e.code?'could not be reached':e.code==='daily_limit'?'has reached today\'s limit on this device':e.code==='access'?'needs the access code':e.code==='not_configured'?'is not switched on yet (no token on the server)':e.up===401||e.up===403?'refused the token (check REPLICATE_API_TOKEN)':e.up===402?'needs billing: add a card and credit in Replicate':e.up===429?'is busy or rate-limited, try again in a minute':'failed ('+e.code+(e.up?' '+e.up:'')+(e.detail?': '+String(e.detail).slice(0,120):'')+')'; proWhy='The piano model '+why+'.'; say(proWhy+' Using the built-in note finder instead…',true); await new Promise(r=>setTimeout(r,1500)); }
      S.pro=false;
    }
    work(0,3);
    const bp=await getModel();
    const mono=await toMono22k(buf); work(1,10);
    const careful=!!$('txCareful')&&$('txCareful').checked, passes=careful?[0,0.3,-0.3]:[0];
    let base; try{ base=await runPass(bp,mono,careful?'pass 1 of '+passes.length:''); }catch(e){ if(/shader|webgl|context/i.test(String(e&&e.message))){ say('Your graphics card rejected the note finder. Switching to a slower safe mode…'); useSafeMode(); const bp2=await getModel(); base=await runPass(bp2,mono,''); } else throw e; }
    let raw=base;
    if(careful){ const others=[]; for(let k=1;k<passes.length;k++){ const ratio=Math.pow(2,passes[k]/12), r=await runPass(bp,resample(mono,ratio),'pass '+(k+1)+' of '+passes.length); others.push({r,ratio}); } say('Comparing the passes…'); raw=fuse(base,others); }
    work(2,80); S.raw=raw; S.sens=sensVal(); const notes=extract(S.raw,S.sens); work(3,96);
    await showResult({blob,notes,dur:buf.duration,title,long,fresh:true,pro:false});
    saveItem({blob,notes,dur:buf.duration,title:title||'Recording'});
  }catch(e){ say(e&&e.message?e.message:'Something went wrong while reading the audio.',true); }
  finally{ workEnd(); S.busy=false; setBusy(false); }
}


function clearCurrent(quiet){
  try{ localStorage.removeItem('tx-last'); }catch(_){}
  stopPlay(); if(S.audio){ try{ S.audio.pause(); }catch(_){} S.audio=null; } if(S.url){ URL.revokeObjectURL(S.url); S.url=null; }
  S.notes=[]; S.baseNotes=null; S.raw=null; S.pro=false; S.itemId=null; S.dur=0; S.loopA=S.loopB=null; S.title='';
  const set=(id,f)=>{ const e=$(id); if(e) f(e); };
  set('txTitle',e=>e.textContent=''); set('txKey',e=>e.textContent='Key: –'); set('txTime',e=>e.textContent='0:00 / 0:00'); set('txSeek',e=>{ e.max='0'; e.value='0'; });
  ['txPlay','txBack','txMidi','txWav','txAsk'].forEach(id=>set(id,e=>e.disabled=true));
  if(!quiet) say('Removed. Choose an audio file or record to start again.'); try{ draw(0); }catch(_){}
}

function showResult({blob,notes,dur,title,long,fresh,pro}){
  S.pro=!!pro;
  if(!fresh) S.raw=null; S.baseNotes=notes; S.itemId=null; loadPiano();
  if(S.url) URL.revokeObjectURL(S.url);
  S.url=URL.createObjectURL(blob); S.notes=notes; S.dur=dur; S.title=title||'Recording';
  stopPlay(); if(S.audio){ S.audio.pause(); }
  S.audio=new Audio(S.url); S.audio.preservesPitch=true; S.audio.mozPreservesPitch=true; S.audio.webkitPreservesPitch=true; S.audio.preload='auto';
  S.audio.onended=()=>{ if(S.playing) pausePlay(); };
  S.loopA=S.loopB=null; S.metOrigin=0; applyMix(); S.audio.playbackRate=S.rate;
  setNorm(); assignHands(); fitRange(); const key=detectKey(); $('txKey').textContent=key?('Key: '+key.label):'Key: –';
  $('txTitle').textContent=S.title+' · '+notes.length+' notes'+(long?' (first 5 minutes only)':'');
  $('txSeek').max=String(Math.floor(S.dur*100)); $('txSeek').value='0'; $('txTime').textContent='0:00 / '+fmt(S.dur); $('txPlay').disabled=false; $('txBack').disabled=false; $('txMidi').disabled=!notes.length; $('txWav').disabled=!notes.length; $('txAsk').disabled=!notes.length; $('txClearLoop').disabled=false;
  say((proWhy?proWhy+' ':'')+(notes.length?'Done. Press Play: the notes fall onto the keys in time with the recording.':'I could not find clear notes in this audio. Try a recording with less noise, or a single instrument.'),!!proWhy);
  draw(0);
}

/* ---------- saved library (in this browser only, IndexedDB) ---------- */
let dbP=null;
function db(){ if(!dbP) dbP=new Promise((res,rej)=>{ const r=indexedDB.open('bts-transcribe',1); r.onupgradeneeded=()=>r.result.createObjectStore('items',{keyPath:'id'}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); return dbP; }
const tx=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{ const t=d.transaction('items',mode), st=t.objectStore('items'), q=fn(st); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }));
async function saveItem(it){ try{ const id=Date.now()+'-'+Math.random().toString(36).slice(2,6); S.itemId=id; try{ localStorage.setItem('tx-last',id); }catch(_){} await tx('readwrite',st=>st.put({id,when:Date.now(),title:it.title,dur:it.dur,notes:it.notes,blob:it.blob})); renderLib(); }catch(e){ say('Done, but this browser would not save it to your library (private browsing?).',true); } }
async function renderLib(){
  const box=$('txLib'); if(!box) return; let items=[]; try{ items=(await tx('readonly',st=>st.getAll()))||[]; }catch(e){ box.textContent='Your library is not available in this browser mode.'; return; }
  items.sort((a,b)=>b.when-a.when); box.textContent='';
  if(!items.length){ box.innerHTML='<span class="help">Nothing saved yet. Every transcription you make is saved here, in this browser only.</span>'; return; }
  items.forEach(it=>{ const row=document.createElement('div'); row.className='txitem';
    const t=document.createElement('span'); t.className='txt'; t.textContent=it.title+' · '+it.notes.length+' notes · '+fmt(it.dur)+' · '+new Date(it.when).toLocaleDateString();
    const o=document.createElement('button'); o.className='btn sm'; o.textContent='Open'; o.onclick=()=>{ try{ localStorage.setItem('tx-last',it.id); }catch(_){} showResult({pro:it.pro,blob:it.blob,notes:it.notes,dur:it.dur,title:it.title}); say('Opened "'+it.title+'" from your library.'); };
    const r=document.createElement('button'); r.className='btn sm'; r.textContent='Rename'; r.onclick=async()=>{ const n=window.prompt('Name for this transcription',it.title); if(n&&n.trim()){ it.title=n.trim().slice(0,80); await tx('readwrite',st=>st.put(it)); renderLib(); } };
    const x=document.createElement('button'); x.className='btn sm'; x.textContent='Delete'; x.onclick=async()=>{ if(window.confirm('Delete "'+it.title+'" from your library?')){ await tx('readwrite',st=>st.delete(it.id)); try{ if(localStorage.getItem('tx-last')===it.id) localStorage.removeItem('tx-last'); }catch(_){} if(S.itemId===it.id) clearCurrent(); renderLib(); } };
    row.append(t,o,r,x); box.appendChild(row); });
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
const KB={61:[36,96],76:[28,103],88:[21,108]};
function fitRange(){
  if(S.kbd&&KB[S.kbd]){ S.lo=KB[S.kbd][0]; S.hi=KB[S.kbd][1]; return; }
  if(!S.notes.length){ S.lo=36; S.hi=95; return; }
  const ps=S.notes.map(n=>n.p).sort((a,b)=>a-b), lo=ps[Math.floor(ps.length*0.01)], hi=ps[Math.ceil(ps.length*0.99)-1];
  let a=Math.floor(lo/12)*12, b=Math.ceil((hi+1)/12)*12-1; while(b-a<59){ if(a>21) a-=12; if(b-a<59&&b<108) b+=12; if(a<=21&&b>=108) break; } S.lo=Math.max(21,a); S.hi=Math.min(108,b);
}

/* ---------- playback ---------- */
const cur=()=>S.audio?S.audio.currentTime:0;
function applyMix(){ const m=S.mixNote; if(S.audio) S.audio.volume=Math.min(1,Math.max(0,1-m*1.0)); if(S.gain) S.gain.gain.value=Math.min(1,m*1.2+0.0001); }
function freq(p){ return S.a4*Math.pow(2,(p-69)/12); }
let pianoReady=false;
function loadPiano(){ try{ if(typeof BANK==='undefined'||typeof loadBank!=='function') return; if(BANK.ready){ pianoReady=true; return; } loadBank(S.ac).then(()=>{ pianoReady=!!BANK.ready; }); }catch(_){} }
// one piano note, from the Studio's own recorded piano samples (nearest sample, pitch-shifted), into any context
// a little room around the piano, so notes sit in a space instead of sounding dry and clipped
function makeFx(ac,dest){
  const inp=ac.createGain(), conv=ac.createConvolver(), wet=ac.createGain(), sr=ac.sampleRate, len=Math.floor(sr*1.7), buf=ac.createBuffer(2,len,sr);
  for(let c=0;c<2;c++){ const d=buf.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
  conv.buffer=buf; wet.gain.value=0.13; inp.connect(dest); inp.connect(conv); conv.connect(wet); wet.connect(dest); return inp;
}
function pianoNote(ac,dest,midi,at,dur,vel,a4){
  const keys=BANK.keys.piano, buf=BANK.buf.piano; let k=keys[0]; for(const x of keys) if(Math.abs(x-midi)<Math.abs(k-midi)) k=x;
  const src=ac.createBufferSource(); src.buffer=buf[k]; src.playbackRate.value=Math.pow(2,(midi-k)/12)*(a4/440);
  const v=Math.max(0.05,Math.min(1,vel)), g=ac.createGain(), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1800+6000*Math.min(1,v*1.6);
  const hold=Math.max(0.3,dur), end=Math.min(at+hold+0.9,at+2.8);   // let the note ring and fade like a real piano instead of cutting off
  g.gain.setValueAtTime(0.9*(0.25+0.75*v),at); g.gain.setValueAtTime(0.9*(0.25+0.75*v),Math.min(at+hold,end-0.05)); g.gain.exponentialRampToValueAtTime(0.0001,end);
  let out=g; if(ac.createStereoPanner){ const pn=ac.createStereoPanner(); pn.pan.value=Math.max(-0.55,Math.min(0.55,(midi-62)/70)); g.connect(pn); out=pn; }
  src.connect(lp); lp.connect(g); out.connect(dest); src.start(at); src.stop(end+0.05);
}
function playNote(p,at,dur,vel){
  const m=p+S.tr;
  if(pianoReady&&BANK.ready&&BANK.keys.piano){ if(!S.fx) S.fx=makeFx(S.ac,S.gain); pianoNote(S.ac,S.fx,m,at,dur/S.rate,vel,S.a4); return; }
  const ac=S.ac, o=ac.createOscillator(), o2=ac.createOscillator(), g=ac.createGain();
  o.type='triangle'; o2.type='sine'; const f=freq(m); o.frequency.value=f; o2.frequency.value=f*2;
  const v=0.08+0.22*Math.min(1,vel), end=at+Math.max(0.12,dur/S.rate); g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(v,at+0.01); g.gain.exponentialRampToValueAtTime(v*0.35,at+Math.min(0.4,(end-at)*0.6)); g.gain.exponentialRampToValueAtTime(0.0001,end+0.12);
  const g2=ac.createGain(); g2.gain.value=0.25; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(S.gain); o.start(at); o2.start(at); o.stop(end+0.15); o2.stop(end+0.15);
}
// Save the notes as a clean piano WAV file (transposition and tuning applied)
async function saveWav(){
  if(!S.notes.length) return; const btn=$('txWav'); btn.disabled=true; const old=btn.textContent; btn.textContent='Making the audio file…';
  try{
    const ac=ensureCtx(); if(typeof loadBank==='function') await loadBank(ac); if(!(BANK.ready&&BANK.keys.piano)) throw new Error('The piano sounds did not load. Reload and try again.');
    const sr=44100, len=Math.ceil((S.dur+3)*sr), off=new OfflineAudioContext(2,len,sr), mast=off.createGain(); mast.gain.value=0.7; mast.connect(off.destination); const fxIn=makeFx(off,mast);
    S.notes.forEach(n=>pianoNote(off,fxIn,n.p+S.tr,n.t,n.d,velOf(n.a),S.a4));
    const r=await off.startRendering(); let L=r.getChannelData(0), R=r.getChannelData(1), end=L.length; while(end>sr&&Math.abs(L[end-1])<0.0005&&Math.abs(R[end-1])<0.0005) end--;
    end=Math.min(L.length,end+Math.round(sr*0.3)); let pk=0; for(let i=0;i<end;i++){ pk=Math.max(pk,Math.abs(L[i]),Math.abs(R[i])); } const gn=pk>0?0.89/pk:1; const data=new DataView(new ArrayBuffer(44+end*4)); const w=(o,t)=>{ for(let i=0;i<t.length;i++) data.setUint8(o+i,t.charCodeAt(i)); };
    w(0,'RIFF'); data.setUint32(4,36+end*4,true); w(8,'WAVEfmt '); data.setUint32(16,16,true); data.setUint16(20,1,true); data.setUint16(22,2,true); data.setUint32(24,sr,true); data.setUint32(28,sr*4,true); data.setUint16(32,4,true); data.setUint16(34,16,true); w(36,'data'); data.setUint32(40,end*4,true);
    for(let i=0;i<end;i++){ data.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]*gn))*32767,true); data.setInt16(46+i*4,Math.max(-1,Math.min(1,R[i]*gn))*32767,true); }
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data.buffer],{type:'audio/wav'})); a.download=(S.title||'recording').replace(/[^\w\- ]+/g,'')+' (piano).wav'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000);
    say('Saved a clean piano version of the notes as a WAV file.');
  }catch(e){ say(e&&e.message?e.message:'Could not make the audio file.',true); }
  finally{ btn.disabled=false; btn.textContent=old; }
}
// move the sensitivity slider: look again at the original analysis when it is still here, otherwise just tidy harder
function applySens(){
  if(!S.audio) return; const s=sensVal(); let notes;
  if(S.pro){ notes=cleanupPro(S.baseNotes||S.notes,s); } else if(S.raw){ notes=extract(S.raw,s); } else { notes=cleanup(S.baseNotes||S.notes,s); }
  S.notes=notes; setNorm(); stopPlay(); resetSched(); assignHands(); fitRange(); const key=detectKey(); $('txKey').textContent=key?('Key: '+key.label):'Key: –';
  $('txTitle').textContent=S.title+' · '+notes.length+' notes'; $('txMidi').disabled=!notes.length; $('txWav').disabled=!notes.length; $('txAsk').disabled=!notes.length; draw(cur());
  say(notes.length+' notes at this sensitivity.'+(S.raw||S.pro&&S.baseNotes?'':' (On a reopened recording the slider can only remove notes.)'));
  if(S.itemId){ const id=S.itemId; tx('readwrite',st=>{ const q=st.get(id); q.onsuccess=()=>{ if(q.result){ q.result.notes=notes; st.put(q.result); } }; }).catch(()=>{}); }
}

// take the part of the recording the student is stuck on to Class
function askClass(){
  if(!S.notes.length||!window.CLASS) return; const t=cur(), flats=!!S.flats;
  const name=n=>nm(n.p+S.tr,flats)+oct(n.p+S.tr), inRange=(a,b)=>S.notes.filter(n=>n.t<b&&n.t+n.d>a);
  let a,b,what;
  if(S.loopA!=null&&S.loopB!=null&&S.loopB>S.loopA){ a=S.loopA; b=S.loopB; what='the section from '+fmt(a)+' to '+fmt(b)+' (my loop)'; }
  else { a=Math.max(0,t-0.05); b=t+0.6; what='the moment at '+fmt(t); }
  let ns=inRange(a,b).sort((x,y)=>x.t-y.t||x.p-y.p).slice(0,40);
  if(!ns.length){ say('I could not find notes there. Move to a spot where notes are falling, or set a loop around the part you want to ask about.',true); return; }
  const list=ns.map(name).join(' '), key=($('txKey').textContent||'').replace(/^Key:\s*/,'');
  const range=S.loopA!=null&&S.loopB!=null;
  const q=range?`I'm breaking down "${S.title}" in Studio+ and I'm stuck on ${what}. The notes there, in order, are: ${list}. The key looks like ${key}. What chords or run is this, and how do I play and practice it?`
               :`I'm breaking down "${S.title}" in Studio+. At ${fmt(t)} these notes sound together: ${list}. The key looks like ${key}. What chord or run is this, and how do I play it?`;
  const heard='Studio+ transcription of "'+S.title+'" (notes found by software, so a few may be wrong). Key: '+key+'. '+what+': '+list;
  window.CLASS.askAbout(q,{heard,fresh:false});
}
function click(at,accent){ const ac=S.ac, o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=accent?1500:1000; g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(accent?0.6:0.4,at+0.002); g.gain.exponentialRampToValueAtTime(0.0001,at+0.05); o.connect(g); g.connect(S.ac.destination); o.start(at); o.stop(at+0.06); }
function resetSched(){ S.sched.clear(); S.metNext=null; S.offs=[]; }
function setNorm(){ const a=S.notes.map(n=>n.a).sort((x,y)=>x-y); S.aNorm=a.length?Math.max(0.2,a[Math.floor(a.length*0.95)]||a[a.length-1]):1; }
const velOf=a=>Math.max(0.12,Math.min(1,Math.pow(a/(S.aNorm||1),0.85)));
function scheduleAhead(t){
  const ac=S.ac, ahead=0.3*S.rate, now=ac.currentTime;
  // Notes keep the exact times found in the recording (no quantizing). To land them on the recording's own beat, lock the audio element's clock to the audio-context clock.
  S.offs=S.offs||[]; S.offs.push(now-t/S.rate); if(S.offs.length>30) S.offs.shift(); const off=Math.min(...S.offs), nudge=(S.nudge||0)/1000;
  if(S.mixNote>0.02){ for(let i=0;i<S.notes.length;i++){ const n=S.notes[i]; if(n.t>t+ahead) break; if(n.t<t-0.25||S.sched.has(i)) continue; S.sched.add(i); const when=Math.max(now,off+n.t/S.rate+nudge); playNote(n.p,when,n.d,velOf(n.a)); } }
  if(S.met){ const sp=60/S.bpm; if(S.metNext==null){ S.metNext=Math.max(0,Math.ceil((t-S.metOrigin)/sp-1e-6)); }
    while(S.metOrigin+S.metNext*sp<=t+ahead){ const bt=S.metOrigin+S.metNext*sp; if(bt>=t-0.02) click(now+Math.max(0,(bt-t)/S.rate),S.metNext%S.bpb===0); S.metNext++; } }
}
function startPlay(){ if(!S.audio) return; ensureCtx(); applyMix(); S.audio.playbackRate=S.rate; resetSched(); S.audio.play().then(()=>{ S.playing=true; $('txPlay').textContent='❚❚ Pause'; bgTick.start(); loop(); }).catch(()=>say('Press Play again to start the sound.',true)); }
function pausePlay(){ if(S.audio) S.audio.pause(); S.playing=false; bgTick.stop(); $('txPlay').textContent='▶ Play'; cancelAnimationFrame(S.raf); draw(cur()); }
function stopPlay(){ if(S.audio&&S.playing) pausePlay(); }
function seek(t){ if(!S.audio) return; S.audio.currentTime=Math.max(0,Math.min(S.dur,t)); resetSched(); draw(cur()); $('txSeek').value=String(Math.floor(cur()*100)); $('txTime').textContent=fmt(cur())+' / '+fmt(S.dur); }
const fmt=t=>{ t=Math.max(0,t); const m=Math.floor(t/60), s=Math.floor(t%60); return m+':'+String(s).padStart(2,'0'); };
// Scheduling runs on a worker timer, not requestAnimationFrame, so playback keeps going (in time) when you switch tabs.
const bgTick=(()=>{ let w=null,iv=null; const run=()=>{ if(!S.playing||!S.audio) return; const t=cur();
    if(S.loopA!=null&&S.loopB!=null&&S.loopB>S.loopA&&t>=S.loopB){ seek(S.loopA); return; }
    scheduleAhead(t); };
  const mk=()=>{ try{ const u=URL.createObjectURL(new Blob(["let i=null;onmessage=e=>{clearInterval(i);i=null;if(e.data==='start')i=setInterval(()=>postMessage(0),25);};"],{type:'text/javascript'})); w=new Worker(u); w.onmessage=run; }catch(_){ w=null; } };
  return { start(){ if(!w&&!iv) mk(); if(w) w.postMessage('start'); else { clearInterval(iv); iv=setInterval(run,25); } }, stop(){ if(w) w.postMessage('stop'); if(iv){ clearInterval(iv); iv=null; } } };
})();
function loop(){
  const t=cur();
  draw(t); $('txSeek').value=String(Math.floor(t*100)); $('txTime').textContent=fmt(t)+' / '+fmt(S.dur);
  if(S.playing) S.raf=requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&S.playing){ cancelAnimationFrame(S.raf); loop(); } });


/* ---------- left and right hand (two colours, like the Studio keyboard) ---------- */
const LH_COL='#1c7ed6', RH_COL='#f76707';
function assignHands(){
  const N=S.notes; if(!N.length) return;
  if(S.hands==='c4'){ N.forEach(n=>n.h=n.p<60?0:1); return; }
  let lc=48, rc=72; const groups=[]; let g=null;
  N.forEach(n=>{ if(g&&n.t-g.t<0.07){ g.n.push(n); } else { g={t:n.t,n:[n]}; groups.push(g); } });
  groups.forEach(gr=>{
    const ns=gr.n.slice().sort((a,b)=>a.p-b.p);
    if(ns.length>=2){
      // look for a clear gap between the hands inside the middle of the keyboard
      let best=-1,gap=0,bs=-1e9; for(let i=0;i<ns.length-1;i++){ const d=ns[i+1].p-ns[i].p, mid=(ns[i].p+ns[i+1].p)/2; if(mid<45||mid>75) continue; const lo=ns.slice(0,i+1).reduce((a,n)=>a+n.p,0)/(i+1), hi=ns.slice(i+1).reduce((a,n)=>a+n.p,0)/(ns.length-i-1), sc=d-Math.abs(lo-lc)*0.15-Math.abs(hi-rc)*0.15; if(sc>bs){ bs=sc; gap=d; best=i; } }
      if(best>=0&&gap>=5){ ns.forEach((n,i)=>n.h=i<=best?0:1); }
      else{ const m=ns.reduce((a,n)=>a+n.p,0)/ns.length, h=Math.abs(m-lc)<=Math.abs(m-rc)?0:1; ns.forEach(n=>n.h=h); }
    } else { const n=ns[0]; n.h=n.p<=47?0:n.p>=73?1:(Math.abs(n.p-lc)<=Math.abs(n.p-rc)-1?0:1); }
    ns.forEach(n=>{ if(n.h===0) lc=lc*0.8+n.p*0.2; else rc=rc*0.8+n.p*0.2; });
    lc=Math.min(lc,60); rc=Math.max(rc,60);
  });
}
const noteHue=(n)=>HUES[((n.p+S.tr)%12+12)%12];
function hsl2hex(h,sat,l){ sat/=100; l/=100; const k=n=>(n+h/30)%12, a=sat*Math.min(l,1-l), f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))); return '#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''); }
function noteFill(n){ if(S.hands==='note') return hsl2hex(noteHue(n),85,55); return n.h===0?LH_COL:RH_COL; }
/* ---------- falling notes ---------- */
const HUES=[210,255,300,345,25,50,95,150,175,190,230,280];
function draw(t){
  { const em=$('txEmpty'); if(em) em.hidden=!!(S.audio||(S.notes&&S.notes.length)); }
  const cv=$('txCanvas'); if(!cv) return; const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1)), H=cv.clientHeight; let W=cv.clientWidth; if(!W||!H) return;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  const snap=v=>Math.round(v*dpr)/dpr;
  const bgG=g.createLinearGradient(0,0,0,H); bgG.addColorStop(0,'#05080f'); bgG.addColorStop(1,'#0e1528'); g.fillStyle=bgG; g.fillRect(0,0,W,H);
  const PAD=0, W0=W;
  const whites=[]; for(let p=S.lo;p<=S.hi;p++) if(!isBlack(p)) whites.push(p);
  const kw=W/whites.length, KH=Math.max(70,Math.min(kw*5.2,H*0.3)), fallH=snap(H-KH), lo=S.lo, hi=S.hi;
  const pos={}; whites.forEach((p,i)=>{ const x0=snap(i*kw), x1=snap((i+1)*kw); pos[p]={x:x0,w:x1-x0}; });
  for(let p=lo;p<=hi;p++) if(isBlack(p)){ const left=pos[p-1]; const bw=kw*0.62; const cx=left?left.x+left.w:0; pos[p]={x:snap(cx-bw/2),w:snap(bw)}; }
  const rr=(x,y,w,h,r)=>{ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); };
  // octave guide lines (a faint line at every C)
  g.lineWidth=1; for(const p of whites){ g.strokeStyle=p%12===0?'rgba(255,255,255,.10)':'rgba(255,255,255,.035)'; const x=pos[p].x+0.5; g.beginPath(); g.moveTo(x,0); g.lineTo(x,fallH); g.stroke(); }
  const look=S.look, pps=fallH/look, active=new Map();
  // loop band
  if(S.loopA!=null){ const ya=fallH-(S.loopA-t)*pps, yb=S.loopB!=null?fallH-(S.loopB-t)*pps:null; g.fillStyle='rgba(255,212,59,.14)'; if(yb!=null){ g.fillRect(0,Math.min(ya,yb),W,Math.abs(ya-yb)); } g.fillStyle='rgba(255,212,59,.9)'; g.fillRect(0,ya-1,W,2); if(yb!=null) g.fillRect(0,yb-1,W,2); }
  // beat lines when metronome is on
  if(S.met){ const sp=60/S.bpm; let k=Math.ceil((t-S.metOrigin)/sp); for(;;k++){ const bt=S.metOrigin+k*sp; if(bt>t+look) break; const y=snap(fallH-(bt-t)*pps)+0.5; g.strokeStyle=k%S.bpb===0?'rgba(255,255,255,.28)':'rgba(255,255,255,.09)'; g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); } }
  const flats=!!S.flats;
  // find the notes sounding now first, so their glow sits behind the bars
  for(let i=0;i<S.notes.length;i++){ const n=S.notes[i]; if(n.t>t) break; if(n.t+n.d<t) continue; const p=n.p+S.tr; if(pos[p]) active.set(p,n); }
  for(const [p,n] of active){ const b=pos[p], c=noteFill(n); const gl=g.createRadialGradient(b.x+b.w/2,fallH,0,b.x+b.w/2,fallH,Math.max(60,kw*5)); gl.addColorStop(0,c+'99'); gl.addColorStop(1,c+'00'); g.fillStyle=gl; g.fillRect(b.x-kw*5,fallH-Math.max(60,kw*5),kw*10+b.w,Math.max(60,kw*5)); }
  // the falling notes: rounded bars with a soft glow
  for(let i=0;i<S.notes.length;i++){ const n=S.notes[i]; if(n.t>t+look) break; const end=n.t+n.d; if(end<t) continue; const p=n.p+S.tr; if(p<lo||p>hi||!pos[p]) continue;
    const y2=fallH-(n.t-t)*pps, y1=fallH-(end-t)*pps, bx=pos[p], h=Math.max(6,y2-y1), on=n.t<=t&&end>=t, c=noteFill(n), black=isBlack(p);
    const w=Math.max(4,bx.w-(black?2:3)), x=bx.x+(bx.w-w)/2, r=Math.min(w/2,10), yy=Math.min(y1,fallH-6);
    g.save(); g.shadowColor=c; g.shadowBlur=on?18:7; const gr=g.createLinearGradient(x,0,x+w,0); gr.addColorStop(0,c); gr.addColorStop(0.5,on?'#ffffff55':'#ffffff33'); gr.addColorStop(1,c);
    rr(x,yy,w,Math.min(h,fallH-yy),r); g.fillStyle=c; g.fill(); g.shadowBlur=0; g.fillStyle=gr; g.globalAlpha=.55; g.fill(); g.restore();
    if(S.names&&h>15&&w>13){ g.fillStyle='#fff'; g.font=`700 ${Math.min(12,w*0.6)}px Inter,system-ui,sans-serif`; g.textAlign='center'; g.fillText(nm(p,flats),x+w/2,Math.min(y2-4,fallH-4)); } }
  // sparks where a note meets its key
  for(const [p,n] of active){ const b=pos[p], c=noteFill(n); for(let k=0;k<7;k++){ const ph=((t*1.7+k*0.37+p*0.13)%1), a=1-ph, sx=b.x+b.w/2+Math.sin(k*2.3+p+t*3)*b.w*0.9, sy=fallH-ph*Math.max(26,kw*3.2); g.fillStyle=c; g.globalAlpha=a*0.9; g.beginPath(); g.arc(sx,sy,1.1+1.2*a,0,6.3); g.fill(); } g.globalAlpha=1; }
  // keyboard: clean white keys with soft shading, short black keys, pressed keys take the note colour
  const fs=Math.max(8,Math.min(12,kw*0.5));
  for(const p of whites){ const b=pos[p], on=active.has(p); const x=b.x+0.5, w=b.w-1;
    const kg=g.createLinearGradient(0,fallH,0,fallH+KH); if(on){ const c=noteFill(active.get(p)); kg.addColorStop(0,c); kg.addColorStop(1,c+'cc'); } else { kg.addColorStop(0,'#ffffff'); kg.addColorStop(0.85,'#eef1f6'); kg.addColorStop(1,'#d9dde6'); }
    g.beginPath(); if(g.roundRect) g.roundRect(x,fallH+1,w,KH-1,[0,0,4,4]); else g.rect(x,fallH+1,w,KH-1); g.fillStyle=kg; g.fill(); g.strokeStyle=on?'rgba(0,0,0,.25)':'#b9bfcc'; g.lineWidth=1; g.stroke();
    g.textAlign='center'; if(on){ g.fillStyle='#fff'; g.font=`700 ${fs}px Inter,Arial,sans-serif`; g.fillText(nm(p,flats),b.x+b.w/2,fallH+KH-7); }
    if(p%12===0){ g.fillStyle=on?'#fff':'#8a93a6'; g.font=`600 ${Math.max(8,fs-2)}px Inter,Arial,sans-serif`; g.textAlign='center'; g.fillText('C'+oct(p),b.x+b.w/2,fallH+KH-(on?fs+10:7)); } }
  for(let p=lo;p<=hi;p++){ if(!isBlack(p)) continue; const b=pos[p], on=active.has(p), bh=KH*0.62;
    const kg=g.createLinearGradient(0,fallH,0,fallH+bh); if(on){ const c=noteFill(active.get(p)); kg.addColorStop(0,c); kg.addColorStop(1,c+'dd'); } else { kg.addColorStop(0,'#2b3040'); kg.addColorStop(1,'#0c0f16'); }
    g.beginPath(); if(g.roundRect) g.roundRect(b.x,fallH,b.w,bh,[0,0,3,3]); else g.rect(b.x,fallH,b.w,bh); g.fillStyle=kg; g.fill(); g.strokeStyle='#06080d'; g.lineWidth=1; g.stroke();
    if(!on){ g.fillStyle='rgba(255,255,255,.10)'; g.fillRect(b.x+2,fallH+1,b.w-4,bh*0.55); }
    if(on){ g.fillStyle='#fff'; g.font=`700 ${Math.max(7,fs-2)}px Inter,Arial,sans-serif`; g.textAlign='center'; g.fillText(nm(p,flats),b.x+b.w/2,fallH+bh-5); } }
  // the line where notes land
  const lg=g.createLinearGradient(0,fallH-3,0,fallH+2); lg.addColorStop(0,'rgba(255,255,255,0)'); lg.addColorStop(1,'rgba(255,255,255,.55)'); g.fillStyle=lg; g.fillRect(0,fallH-3,W,5);
  if(!S.notes.length){ g.fillStyle='rgba(255,255,255,.72)'; g.font='600 15px Inter,system-ui,sans-serif'; g.textAlign='center'; g.fillText('Choose an audio file or record with the microphone',W0/2,fallH/2); }
}

/* ---------- MIDI export (format 0) ---------- */
function vlq(n){ const b=[n&0x7f]; while((n>>=7)>0) b.unshift((n&0x7f)|0x80); return b; }
function midiBytes(){
  const PPQ=480, TPS=PPQ*2, ev=[]; S.notes.forEach(n=>{ const p=Math.max(0,Math.min(127,n.p+S.tr)), v=Math.max(24,Math.min(127,Math.round(30+velOf(n.a)*97))); ev.push({t:Math.round(n.t*TPS),o:1,p,v}); ev.push({t:Math.round((n.t+n.d)*TPS),o:0,p,v:0}); });
  ev.sort((a,b)=>a.t-b.t||a.o-b.o); const tr=[0,0xFF,0x51,3,0x07,0xA1,0x20, 0,0xFF,0x58,4,4,2,24,8, 0,0xC0,0, 0,0xB0,7,110, 0,0xB0,91,76, 0,0xB0,93,24];   // acoustic piano, with reverb (CC91) and a touch of chorus (CC93) for players that honour them let last=0;
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
function updLegend(){ const l=$('txLegend'); if(!l) return; l.innerHTML=S.hands==='note'?'':'<i style="background:'+LH_COL+'"></i> Left hand <i style="background:'+RH_COL+'"></i> Right hand'; }
function init(){
  if(!$('txCanvas')||X) return; X=1;
  $('txFileBtn').onclick=()=>$('txFile').click();
  $('txFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(f) transcribeBlob(f,f.name.replace(/\.[^.]+$/,'')); e.target.value=''; };
  $('txRec').onclick=toggleRec;
  $('txPlay').onclick=()=>S.playing?pausePlay():startPlay();
  $('txBack').onclick=()=>seek(S.loopA!=null?S.loopA:cur()-5);
  $('txSeek').oninput=e=>seek(+e.target.value/100);
  const setRate=p=>{ p=Math.max(25,Math.min(150,Math.round(p/5)*5)); S.rate=p/100; $('txSpeed').textContent=p+'%'; if(S.audio) S.audio.playbackRate=S.rate; resetSched(); };
  $('txSpDn').onclick=()=>setRate(S.rate*100-5); $('txSpUp').onclick=()=>setRate(S.rate*100+5); setRate(100);
  try{ const k=+localStorage.getItem('tx-kbd3'); if(KB[k]){ S.kbd=k; $('txKbd').value=String(k); } }catch(_){}
  try{ if(!localStorage.getItem('tx-kbd3')&&matchMedia('(max-width:700px)').matches){ S.kbd=0; $('txKbd').value='0'; } }catch(_){}
  fitRange();
  { const menu=$('txMenu'), mb=$('txMenuBtn'); const tog=o=>{ menu.classList.toggle('on',o); menu.setAttribute('aria-hidden',o?'false':'true'); mb.setAttribute('aria-expanded',o?'true':'false'); };
    mb.onclick=()=>tog(!menu.classList.contains('on')); $('txMenuX').onclick=()=>tog(false);
    $('txQFile').onclick=()=>$('txFileBtn').click(); $('txQRec').onclick=()=>$('txRec').click();
    ['txFileBtn','txRec'].forEach(id=>$(id).addEventListener('click',()=>{ if(matchMedia('(max-width:900px)').matches) setTimeout(()=>tog(false),150); }));
    window.TXMENU={close:()=>{ if(menu.classList.contains('on')){ tog(false); return true; } return false; },open:()=>tog(true)}; }
  $('txKbd').onchange=e=>{ S.kbd=+e.target.value||0; try{ localStorage.setItem('tx-kbd3',e.target.value); }catch(_){} fitRange(); draw(cur()); };
  $('txHands').onchange=e=>{ S.hands=e.target.value; try{ localStorage.setItem('tx-hands',S.hands); }catch(_){} assignHands(); draw(cur()); updLegend(); };
  try{ const hv=localStorage.getItem('tx-hands'); if(['auto','c4','note'].includes(hv)){ S.hands=hv; $('txHands').value=hv; } }catch(_){}
  updLegend();
  $('txLook').onchange=e=>{ S.look=+e.target.value; draw(cur()); };
  const setTr=n=>{ n=Math.max(-12,Math.min(12,n)); S.tr=n; $('txTr').textContent=(n>0?'+':'')+n; resetSched(); draw(cur()); };
  $('txTrDn').onclick=()=>setTr((S.tr||0)-1); $('txTrUp').onclick=()=>setTr((S.tr||0)+1); setTr(0);
  $('txMix').oninput=e=>{ S.mixNote=+e.target.value/100; applyMix(); };
  $('txNames').onchange=e=>{ S.names=e.target.checked; draw(cur()); };
  try{ S.nudge=+localStorage.getItem('tx-nudge')||0; $('txNudge').value=S.nudge; }catch(_){}
  $('txNudge').onchange=e=>{ S.nudge=Math.max(-250,Math.min(250,+e.target.value||0)); e.target.value=S.nudge; try{ localStorage.setItem('tx-nudge',S.nudge); }catch(_){} resetSched(); };
  $('txA4').onchange=e=>{ S.a4=+e.target.value; };
  $('txSetA').onclick=()=>{ S.loopA=cur(); if(S.loopB!=null&&S.loopB<=S.loopA) S.loopB=null; say('Loop start set at '+fmt(S.loopA)+'. Now set the end.'); draw(cur()); };
  $('txSetB').onclick=()=>{ if(S.loopA==null){ say('Set the loop start first.',true); return; } if(cur()<=S.loopA){ say('Move forward, then set the loop end.',true); return; } S.loopB=cur(); say('Looping '+fmt(S.loopA)+' to '+fmt(S.loopB)+'.'); draw(cur()); };
  $('txClearLoop').onclick=()=>{ S.loopA=S.loopB=null; say('Loop cleared.'); draw(cur()); };
  $('txMet').onchange=e=>{ S.met=e.target.checked; resetSched(); draw(cur()); };
  $('txBpm').onchange=e=>{ S.bpm=Math.max(30,Math.min(240,+e.target.value||100)); e.target.value=S.bpm; resetSched(); };
  $('txBpb').onchange=e=>{ S.bpb=+e.target.value; resetSched(); };
  $('txBeat1').onclick=()=>{ S.metOrigin=cur(); resetSched(); say('Beat 1 is now at '+fmt(cur())+'.'); draw(cur()); };
  $('txMidi').onclick=downloadMidi; $('txWav').onclick=saveWav; $('txAsk').onclick=askClass;
  S.merge=true;
  $('txSens').onchange=applySens; $('txSens').oninput=()=>{ $('txSensV').textContent=String(Math.round(sensVal()*100)); };
  $('txCanvas').addEventListener('click',()=>{ if(S.audio) S.playing?pausePlay():startPlay(); });
  $('txCard').addEventListener('keydown',e=>{ if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&S.audio){ e.preventDefault(); e.stopPropagation(); S.playing?pausePlay():startPlay(); } },true);
  new ResizeObserver(()=>draw(cur())).observe($('txCanvas')); renderLib();
  draw(0);
}
async function restoreLast(){ if(S.audio) return; let id=null; try{ id=localStorage.getItem('tx-last'); }catch(_){} if(!id) return; try{ const it=await tx('readonly',st=>st.get(id)); if(it){ showResult({pro:it.pro,blob:it.blob,notes:it.notes,dur:it.dur,title:it.title}); say('Welcome back. I opened "'+it.title+'", where you left off.'); } }catch(_){} }
window.TX={init,restoreLast,S,clear:()=>clearCurrent(),_test:{extract,cleanup,transcribeBlob,midiBytes,detectKey,draw,assignHands}};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
