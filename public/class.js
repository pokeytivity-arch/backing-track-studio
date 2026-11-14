/* Class: the coach with a whiteboard, a keyboard and a chat, saved conversations,
   read-aloud and speaking to the coach. Part of Piano Suite. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const KEY='ps-class-v2', MAXCHATS=60, MAXMSG=60;
let DB={cur:null,chats:[]}, busy=false, R=null;
const K={steps:[],i:0,playing:false,timer:null,title:'',size:61,mode:'harmonic',dir:'up',mem:{},p:0};
const SC_KEYS=['C','G','D','A','E','B','F','Bb','Eb','Ab','Db','Gb'];
const PLAYLBL=()=>K.mode==='melodic'?'▶ Play scale':'▶ Play progression';

/* ---------- saved conversations ---------- */
function loadDB(){
  const d=store.get(KEY,null); if(d&&Array.isArray(d.chats)) DB=d;
  if(!DB.chats.length){ const old=store.get('bt-teacher',[]); if(Array.isArray(old)&&old.length){ const c=newChat(); c.log=old.slice(-MAXMSG); c.title=autoTitle(old); DB.cur=c.id; } }
  if(!DB.chats.find(c=>c.id===DB.cur)) DB.cur=DB.chats.length?DB.chats.slice().sort((a,b)=>b.when-a.when)[0].id:null;
}
function saveDB(){ DB.chats=DB.chats.filter(c=>c.log.length||c.id===DB.cur); DB.chats.sort((a,b)=>b.when-a.when); DB.chats=DB.chats.slice(0,MAXCHATS); DB.chats.forEach(c=>{ if(c.log.length>MAXMSG) c.log=c.log.slice(-MAXMSG); }); store.set(KEY,DB); }
function newChat(){ const c={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),title:'New chat',when:Date.now(),log:[],board:null,keys:null}; DB.chats.unshift(c); DB.cur=c.id; return c; }
const chat=()=>DB.chats.find(c=>c.id===DB.cur)||newChat();
function autoTitle(log){ const u=(log.find(m=>m.role==='user')||{}).content||'New chat'; const t=u.replace(/\s+/g,' ').trim(); return t.length>46?t.slice(0,44)+'…':t; }

/* ---------- reading the coach's reply ---------- */
function splitReply(txt){
  let t=String(txt||''), board=null, keys=null; const tracks=[];
  t=t.replace(/```board\s*([\s\S]*?)```/g,(m,b)=>{ board=parseBoard(b); return ''; });
  t=t.replace(/```keys\s*([\s\S]*?)```/g,(m,j)=>{ try{ keys=cleanKeys(JSON.parse(j.trim())); }catch(_){} return ''; });
  t=t.replace(/```studio\s*([\s\S]*?)```/g,(m,j)=>{ try{ const tr=tCleanTrack(JSON.parse(j.trim())); if(tr) tracks.push(tr); }catch(_){} return ''; });
  t=t.replace(/```(board|keys|studio)[\s\S]*$/,'').trim();   // an unfinished block is dropped
  return {text:t,board,keys,tracks};
}
function parseBoard(src){
  const lines=String(src).replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean).slice(0,24), b={title:'',lines:[]};
  lines.forEach(l=>{ let m;
    if((m=/^#\s+(.*)$/.exec(l))&&!b.title&&!b.lines.length) b.title=m[1].slice(0,80);
    else if((m=/^##\s+(.*)$/.exec(l))) b.lines.push({k:'h',t:m[1].slice(0,100)});
    else if((m=/^(.{1,40}?)\s*::\s*(.+)$/.exec(l))) b.lines.push({k:'def',a:m[1],t:m[2].slice(0,300)});
    else if((m=/^[-*•]\s+(.*)$/.exec(l))) b.lines.push({k:'li',t:m[1].slice(0,300)});
    else b.lines.push({k:'p',t:l.slice(0,300)}); });
  return b.title||b.lines.length?b:null;
}
const NOTE_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function noteMidi(s){ const m=/^([A-Ga-g])([#b♯♭]?)(-?\d)$/.exec(String(s).trim()); if(!m) return null; let pc=NOTE_PC[m[1].toUpperCase()]; if(m[2]==='#'||m[2]==='♯') pc++; if(m[2]==='b'||m[2]==='♭') pc--; return 12*(+m[3]+1)+pc; }
function notesList(v){ const a=Array.isArray(v)?v:String(v||'').split(/[\s,]+/); return a.map(noteMidi).filter(x=>x!=null&&x>=21&&x<=108); }
function stepsFrom(list){
  const out=[];
  (Array.isArray(list)?list:[]).slice(0,16).forEach(s=>{
    const src=typeof s==='string'?s:String((s&&(s.name||s.chord))||''); if(!src.trim()) return;
    let sg; try{ sg=parseChart(src.trim(),0,16); }catch(_){ return; }
    if(sg.errors.length||!sg.events.some(e=>e.chord)) return;
    out.push({src:src.trim(),obj:typeof s==='object'?s:null,ev:sg.events.find(e=>e.chord)}); });
  if(!out.length) return [];
  let prev=null; const vz=out.map(o=>{ const v=sheetVoicing(o.ev,prev); if(v) prev=v.rh; return v; });
  return out.map((o,i)=>{ let lh=vz[i].lh, rh=vz[i].rh;
    if(o.obj){ const l=notesList(o.obj.lh), r=notesList(o.obj.rh); if(l.length||r.length){ lh=l; rh=r; } }
    const n=o.ev.name; return {name:n?(n.root+n.q):o.src,src:o.src,lh,rh,fing:(o.obj&&o.obj.fing!=null)?String(o.obj.fing).slice(0,10):'',lfing:(o.obj&&o.obj.lfing!=null)?String(o.obj.lfing).slice(0,10):''}; });
}
function cleanKeys(o){ if(!o) return null;
  const pack=(st,extra)=>({title:String(o.title||'').slice(0,80),mode:'melodic',dir:/^(down|updown)$/.test(o.dir||'')?o.dir:'up',steps:st.map(x=>({src:x.src,lh:x.lh,rh:x.rh,name:x.name,fing:x.fing,lfing:x.lfing}))});
  const hnd=/^(lh|left)/i.test(o.hand||'')?'lh':/both/i.test(o.hand||'')?'both':'rh';
  if(o.scale){ const m=String(o.scale).trim().match(/^([A-Ga-g][b#]?)(?:\s*major)?$/); if(!m||!window.SCALES||!SCALES.has) return null; const k=m[1][0].toUpperCase()+m[1].slice(1), h=SCALES.has(k); if(!h) return null; const hh=(hnd!=='rh'&&!h.lh)?'rh':hnd; const r=pack(SCALES.build(k,hh)); if(!r.title) r.title=k+' major'; return r; }
  if(Array.isArray(o.notes)){ const st=[]; o.notes.slice(0,16).forEach(n=>{ const nm=typeof n==='string'?n:String((n&&(n.n||n.note))||''), f=(n&&typeof n==='object'&&n.f!=null)?String(n.f).slice(0,6):''; const mid=notesList([nm])[0]; if(mid==null) return; const lab=nm.replace(/[0-9\-]+$/,'');
      st.push({src:nm,name:lab,lh:hnd==='lh'?[mid]:[],rh:hnd==='lh'?[]:[mid],fing:hnd==='lh'?'':f,lfing:hnd==='lh'?f:''}); }); return st.length?pack(st):null; } const st=stepsFrom(o.steps||o.chords&&String(o.chords).split(/[|\s]+/).filter(Boolean)); return st.length?{title:String(o.title||'').slice(0,80),steps:st.map(s=>({src:s.src,lh:s.lh,rh:s.rh,name:s.name,fing:s.fing,lfing:s.lfing}))}:null; }

/* ---------- the whiteboard ---------- */
const CHORD_RE=/(?<![A-Za-z0-9#♯♭])[A-G][b#♭♯]?(?:maj13|maj11|maj9|maj7|maj|M7|m7b5|m7♭5|m13|m11|m9|m7|m6|m|dim7|dim|aug|sus4|sus2|sus|add9|13|11|9|7|6)[0-9#b♭♯+\-]*(?:\/[A-G][b#♭♯]?)?(?![A-Za-z])/g;
function inline(text,host){
  const frag=document.createDocumentFragment(); const parts=String(text).split(/(\*\*[^*]+\*\*)/);
  parts.forEach(p=>{ const bold=/^\*\*[^*]+\*\*$/.test(p), s=bold?p.slice(2,-2):p; if(!s) return; let last=0, m; CHORD_RE.lastIndex=0;
    const wrap=bold?document.createElement('strong'):frag;
    while((m=CHORD_RE.exec(s))){ if(m.index>last) wrap.appendChild(document.createTextNode(s.slice(last,m.index)));
      const cn=m[0], b=document.createElement('button'); b.type='button'; b.className='cl-chord'; b.textContent=cn; b.title='Show and play '+cn; b.onclick=()=>showChordNow(cn); wrap.appendChild(b); last=m.index+m[0].length; }
    if(last<s.length) wrap.appendChild(document.createTextNode(s.slice(last))); if(bold) frag.appendChild(wrap); });
  host.appendChild(frag); return host;
}
function renderBoard(b){
  const el=$('clBoard'); el.textContent='';
  const face=document.createElement('div'); face.className='cl-face'; el.appendChild(face);
  if(!b){ face.innerHTML='<div class="cl-empty"><b>Whiteboard</b><span>Chord names and definitions from your coach appear here. Tap a chord name to see and hear it on the keyboard.</span></div>'; return; }
  if(b.title){ const h=document.createElement('h3'); h.textContent=b.title; face.appendChild(h); }
  let ul=null;
  b.lines.forEach(l=>{
    if(l.k!=='li') ul=null;
    if(l.k==='h'){ const h=document.createElement('h4'); h.textContent=l.t; face.appendChild(h); }
    else if(l.k==='def'){ const d=document.createElement('div'); d.className='cl-def'; const a=document.createElement('span'); a.className='cl-term'; inline(l.a,a); const t=document.createElement('span'); inline(l.t,t); d.append(a,t); face.appendChild(d); }
    else if(l.k==='li'){ if(!ul){ ul=document.createElement('ul'); face.appendChild(ul); } const li=document.createElement('li'); inline(l.t,li); ul.appendChild(li); }
    else { const p=document.createElement('p'); inline(l.t,p); face.appendChild(p); } });
  const tray=document.createElement('div'); tray.className='cl-tray'; tray.innerHTML='<i style="background:#1c7ed6"></i><i style="background:#d9480f"></i><i style="background:#2f9e44"></i>'; el.appendChild(tray);
}

/* ---------- sound ---------- */
async function ready(){ await ensureCtx(); try{ loadBank(ctx); }catch(_){} }
async function sound(midi,dur,vel,delay){ await ready(); const t=ctx.currentTime+0.03+(delay||0); E.note(t,midi,dur,vel||0.8,'piano','keys'); }
async function playStep(s,len){ await ready(); const t=ctx.currentTime+0.04, d=len||1.6;
  s.lh.forEach((m,i)=>E.note(t+i*0.012,m,d,0.75,'piano','keys')); s.rh.forEach((m,i)=>E.note(t+0.03+i*0.018,m,d,0.7,'piano','keys')); }

/* ---------- the keyboard ---------- */
const KB_R={88:[21,108],76:[28,103],61:[36,96]};
function drawKeys(){
  const wrap=$('clKbdWrap'); if(!wrap) return; const [lo,hi]=KB_R[K.size]||KB_R[61], s=K.steps[K.i];
  const svg=keyboardSVG(s?s.lh:[],s?s.rh:[],{lo,hi,height:K.size===88?58:64,fingers:K.mode!=='melodic'});
  svg.querySelectorAll('rect').forEach((r,idx)=>{ r.style.cursor='pointer'; });
  svg.addEventListener('pointerdown',e=>{ const r=e.target.closest('rect[data-m]'); if(!r) return; const m=+r.dataset.m, old=r.getAttribute('fill'); r.setAttribute('fill','var(--ke8c25a,#ffd43b)'); sound(m,1.4,0.85); setTimeout(()=>r.setAttribute('fill',old),260); });
  wrap.replaceChildren(svg);
  document.querySelectorAll('#clKbdSize button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.k===K.size)));
  const nm=$('clStepName'); if(nm) nm.textContent=s?s.name:'';
  const notes=$('clStepNotes'); if(notes&&K.mode==='melodic'){ const N=useFlatsText(s); const any=K.steps.some(x=>x.fing||x.lfing); notes.textContent=s?('Note '+s.lh.concat(s.rh).map(m=>N[m%12]).join(' ')+(s.fing?'  ·  Right-hand finger '+s.fing:'')+(s.lfing?'  ·  Left-hand finger '+s.lfing:'')+(any?'':'  ·  Fingering for this scale is not in the lessons yet.')):''; }
  else if(notes){ const N=useFlatsText(s); notes.textContent=s?((s.fing||s.lfing)?('Note '+s.lh.concat(s.rh).map(m=>N[m%12]).join(' ')+(s.fing?'  ·  Right-hand finger '+s.fing:'')+(s.lfing?'  ·  Left-hand finger '+s.lfing:'')):('Left hand '+s.lh.map(m=>N[m%12]).join(' ')+'  ·  Right hand '+s.rh.map(m=>N[m%12]).join(' ')+'  ·  Fingers: RH '+fingerText(s.lh,s.rh).rh+', LH '+fingerText(s.lh,s.rh).lh)):'Tap any key to hear it, or type chords below.'; }
  document.querySelectorAll('#clSteps button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===K.i)));
}
function useFlatsText(s){ return s&&/b|♭|F(?!#)/.test(s.name)&&!/#|♯/.test(s.name)?FLAT_N:SHARP_N; }
function setMode(m,keep){
  m=m==='melodic'?'melodic':'harmonic'; if(!keep){ K.mem[K.mode]={title:K.title,steps:K.steps}; }
  stopProg(); K.mode=m; const box=document.querySelector('.cl-keys'); if(box) box.dataset.mode=m;
  document.querySelectorAll('#clMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));
  const pg=$('clPlayProg'); if(pg) pg.textContent=PLAYLBL(); const ak=$('clAskKeys'); if(ak) ak.textContent=m==='melodic'?'Ask about this scale':'Ask about this chord';
  if(!keep){ const mm=K.mem[m]||{title:'',steps:[]}; setSteps(mm.title,mm.steps,{}); }
}
function showScale(key,hand,dir){
  if(!window.SCALES||!SCALES.build) return; const h=SCALES.has(key); if(!h) return;
  if(hand!=='rh'&&!h.lh){ hand='rh'; toast('Left-hand fingering for '+key+' major is not in the lessons yet. Showing the right hand.'); }
  if(dir){ K.dir=dir; if($('clScDir')) $('clScDir').value=dir; }
  const hs=hand==='rh'?'right hand':hand==='lh'?'left hand':'both hands';
  setSteps(key+' major: 3+4 ('+hs+')',SCALES.build(key,hand),{mode:'melodic'}); setPane('keys');
}
function setSteps(title,steps,{play,mode}={}){
  stopProg(); if(mode&&mode!==K.mode){ K.mem[K.mode]={title:K.title,steps:K.steps}; setMode(mode,true); } K.steps=steps||[]; K.i=0; K.title=title||''; K.mem[K.mode]={title:K.title,steps:K.steps};
  $('clKbdTitle').textContent=K.title||'Keyboard';
  const box=$('clSteps'); box.textContent='';
  K.steps.forEach((s,i)=>{ const b=document.createElement('button'); b.type='button'; b.className='cl-step'; if(K.mode==='melodic'){ const f=[s.fing&&('R '+s.fing),s.lfing&&('L '+s.lfing)].filter(Boolean).join(' · '); b.innerHTML='<span class="n"></span><small></small>'; b.firstChild.textContent=s.name; b.lastChild.textContent=f||'–'; } else b.textContent=s.name; b.onclick=()=>{ stopProg(); K.i=i; drawKeys(); playStep(s); }; box.appendChild(b); });
  $('clKbdTools').hidden=!K.steps.length; drawKeys(); if(play&&K.steps.length) playStep(K.steps[0]);
  const c=chat(); c.keys=K.steps.length?{title:K.title,mode:K.mode,steps:K.steps.map(s=>({src:s.src,lh:s.lh,rh:s.rh,name:s.name,fing:s.fing,lfing:s.lfing}))}:null; saveDB();
}
function showChordNow(name){ const st=stepsFrom([name]); if(!st.length) return; setPane('keys'); if(K.mode!=='harmonic') setMode('harmonic'); const cur=K.steps.findIndex(s=>s.src===name||s.name===st[0].name);
  if(cur>=0){ stopProg(); K.i=cur; drawKeys(); playStep(K.steps[cur]); } else setSteps(name,st,{play:true}); }
function scaleSeq(){ const n=K.steps.length, up=[...Array(n).keys()]; return K.dir==='down'?up.slice().reverse():K.dir==='updown'?up.concat(up.slice(0,-1).reverse()):up; }
function playProg(){
  if(!K.steps.length) return; if(K.playing){ stopProg(); return; }
  K.playing=true; $('clPlayProg').textContent='■ Stop'; const bpm=+$('clTempo').value||80;
  if(K.mode==='melodic'){ const seq=scaleSeq(), gap=(60/bpm)*1000; K.p=0; if(K.dir==='updown'&&false) K.p=0;
    const tick=()=>{ if(!K.playing) return; K.i=seq[K.p]; drawKeys(); playStep(K.steps[K.i],gap/1000*1.6);
      K.timer=setTimeout(()=>{ if(!K.playing) return; K.p++; if(K.p>=seq.length){ if($('clLoop').checked) K.p=0; else { stopProg(); return; } } tick(); },gap); };
    tick(); return; }
  const gap=(60/bpm)*(K.steps.length>1?2:4)*1000;
  const tick=()=>{ if(!K.playing) return; drawKeys(); playStep(K.steps[K.i],gap/1000*1.05);
    K.timer=setTimeout(()=>{ if(!K.playing) return; if(K.i<K.steps.length-1) K.i++; else if($('clLoop').checked) K.i=0; else { stopProg(); return; } tick(); },gap); };
  tick();
}
function stopProg(){ K.playing=false; clearTimeout(K.timer); const b=$('clPlayProg'); if(b) b.textContent=PLAYLBL(); }
function stepGo(d){ if(!K.steps.length) return; stopProg(); K.i=(K.i+d+K.steps.length)%K.steps.length; drawKeys(); playStep(K.steps[K.i]); }

/* save the keyboard as a picture, or open sheet music */
async function savePNG(){
  if(!K.steps.length) return; const cols=2, W=1000, cw=W/cols, pad=24;
  const [lo,hi]=[36,Math.max(83,...K.steps.flatMap(s=>[...s.lh,...s.rh]))]; const hi2=hi+11-(((hi%12)+12)%12);
  const imgs=await Promise.all(K.steps.map(s=>new Promise(res=>{ const svg=keyboardSVG(s.lh,s.rh,{lo,hi:hi2,height:70}); const vb=svg.getAttribute('viewBox').split(' ').map(Number); svg.setAttribute('width',vb[2]*3); svg.setAttribute('height',vb[3]*3);
    const x=new XMLSerializer().serializeToString(svg); const im=new Image(); im.onload=()=>res({im,w:vb[2],h:vb[3]}); im.onerror=()=>res(null); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x); })));
  const rows=Math.ceil(K.steps.length/cols), ih=(cw-pad*1.5)*(imgs[0]?imgs[0].h/imgs[0].w:0.2), rh=ih+44, head=84, H=head+rows*rh+30, sc=2;
  const cv=document.createElement('canvas'); cv.width=W*sc; cv.height=H*sc; const g=cv.getContext('2d'); g.scale(sc,sc); g.fillStyle='#fff'; g.fillRect(0,0,W,H);
  g.fillStyle='#111'; g.font='700 30px Arial'; g.fillText(K.title||'Keyboard diagrams',pad,46); g.fillStyle='#555'; g.font='14px Arial'; g.fillText('Left hand blue · right hand orange · Piano Suite',pad,70);
  K.steps.forEach((s,i)=>{ const r=Math.floor(i/cols), c=i%cols, x=c*cw+pad, y=head+r*rh; g.fillStyle='#111'; g.font='700 20px Arial'; g.fillText(s.name,x,y+22); if(imgs[i]) g.drawImage(imgs[i].im,x,y+30,cw-pad*1.5,ih); });
  const a=document.createElement('a'); a.href=cv.toDataURL('image/png'); a.download=((K.title||'keyboard diagrams').replace(/[^\w\- ]+/g,'')||'keyboard')+'.png'; document.body.appendChild(a); a.click(); a.remove();
}
function sheetMusic(){
  if(!K.steps.length) return; stopProg(); const o={title:S.title,chords:S.chords,style:S.style,transpose:S.transpose,meter:S.meter,bpm:S.bpm};
  S.title=K.title||'Chord progression'; S.chords=K.steps.map(s=>s.src).join(' | '); S.style='pop'; S.transpose=0; S.meter='4/4'; S.bpm=80;
  const modal=$('sheetModal'); modal.style.zIndex=200000; const obs=new MutationObserver(()=>{ if(modal.hidden){ Object.assign(S,o); obs.disconnect(); } }); obs.observe(modal,{attributes:true,attributeFilter:['hidden']});
  openSheet();
}
function toStudio(){
  if(!K.steps.length) return; const chords='| '+K.steps.map(s=>s.src).join(' | ')+' | '; loadTrack({title:K.title||'Practice progression',chords,style:'pop',bpm:90,transpose:0,meter:'4/4'}); rebuild(); SUITE.go('studio');
  toast('Loaded. Press Play and practice it with the band.');
}
function askAboutKeys(){ const s=K.steps[K.i]; if(!s) return; ask('Tell me more about '+s.name+'. How is it built, how do I voice it, and what should I practice with it?'); }

/* ---------- read aloud ---------- */
let speakingEl=null;
function spoken(t){
  return String(t).replace(/\*\*/g,'').replace(CHORD_RE,m=>{ const r=/^([A-G])([b#♭♯]?)(.*?)(\/([A-G])([b#♭♯]?))?$/.exec(m); if(!r) return m;
    const acc=a=>a==='b'||a==='♭'?' flat':a==='#'||a==='♯'?' sharp':''; let q=r[3].replace(/maj/i,' major ').replace(/^m(?!aj)/,' minor ').replace(/dim/,' diminished ').replace(/aug/,' augmented ').replace(/sus/,' sus ').replace(/add/,' add ').replace(/b5|♭5/,' flat 5').replace(/#5|♯5/,' sharp 5').replace(/b9|♭9/,' flat 9').replace(/#9|♯9/,' sharp 9').replace(/#11|♯11/,' sharp 11').replace(/b13|♭13/,' flat 13');
    return r[1]+acc(r[2])+q+(r[5]?' over '+r[5]+acc(r[6]):''); }).replace(/\s+/g,' ');
}
function stopSpeak(){ try{ speechSynthesis.cancel(); }catch(_){} if(speakingEl){ speakingEl.textContent='🔊 Listen'; speakingEl=null; } }
function speak(text,btn){
  if(!('speechSynthesis' in window)){ toast('Your browser cannot read aloud.'); return; }
  const was=speakingEl===btn; stopSpeak(); if(was) return;
  const u=new SpeechSynthesisUtterance(spoken(text)); const vs=speechSynthesis.getVoices(), pick=vs.find(v=>/^en-(US|GB)/i.test(v.lang)&&/natural|premium|enhanced|google|samantha|daniel|alex/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang)); if(pick) u.voice=pick; u.rate=0.98;
  if(btn){ speakingEl=btn; btn.textContent='■ Stop'; } u.onend=u.onerror=()=>{ if(btn&&speakingEl===btn){ btn.textContent='🔊 Listen'; speakingEl=null; } };
  speechSynthesis.speak(u);
}
/* speaking to the coach */
let rec=null;
function mic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition; const b=$('clMic');
  if(!SR){ toast('Speaking to the coach needs Chrome, Edge or Safari.'); return; }
  if(rec){ rec.stop(); return; } stopSpeak();
  rec=new SR(); rec.lang=navigator.language||'en-US'; rec.interimResults=true; rec.continuous=false; let final='';
  rec.onstart=()=>{ b.classList.add('on'); b.textContent='■ Listening…'; };
  rec.onresult=e=>{ let t=''; for(let i=0;i<e.results.length;i++){ t+=e.results[i][0].transcript; if(e.results[i].isFinal) final=t; } $('tInput').value=t; };
  rec.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed') toast('Allow the microphone to speak to the coach.'); };
  rec.onend=()=>{ b.classList.remove('on'); b.textContent='🎤 Speak'; const t=($('tInput').value||'').trim(); rec=null; if(t&&final) ask(t); };
  try{ rec.start(); }catch(_){ rec=null; }
}

/* ---------- the chat ---------- */
function renderChat(extra){
  const c=chat(), log=$('tLog'); log.textContent='';
  $('clName').textContent=c.title;
  if(!c.log.length&&false){ const d=document.createElement('div'); d.className='t-msg bot'; d.innerHTML=tFormat("Hello, and a very good day to you! I'm **Pokey**, your piano coach. Ask me about chords, scales, ear training, or the chart you're playing right now. I'll write the important things on the whiteboard and show them on the keyboard. Are you ready? Let's go!"); log.appendChild(d); }
  c.log.forEach((m,i)=>{ const d=document.createElement('div'); d.className='t-msg '+(m.role==='user'?'user':'bot');
    if(m.role==='user') d.textContent=m.content;
    else { const sp=splitReply(m.content); d.innerHTML=tFormat(sp.text); const row=document.createElement('div'); row.className='cl-acts';
      const l=document.createElement('button'); l.type='button'; l.className='cl-act'; l.textContent='🔊 Listen'; l.onclick=()=>speak(sp.text,l); row.appendChild(l);
      if(sp.board||sp.keys){ const w=document.createElement('button'); w.type='button'; w.className='cl-act'; w.textContent='📋 Show on the board'; w.onclick=()=>applyBoard(sp,true); row.appendChild(w); }
      sp.tracks.forEach(tk=>{ const lb=document.createElement('button'); lb.type='button'; lb.className='cl-act pri'; const kn=T_KEYS[String(tk.transpose)]||''; lb.textContent='🎹 Practice in the Studio · '+tk.title+(kn?' ('+kn+')':'');
        lb.onclick=()=>{ loadTrack(tk); S.flatsHint=tk.flats; rebuild(); SUITE.go('studio'); toast('Loaded. Press Play to practice. Use “Ask Class” if you want to talk about the chords.'); }; row.appendChild(lb); });
      d.appendChild(row); }
    log.appendChild(d); });
  if(extra){ const d=document.createElement('div'); d.className='t-msg '+extra.cls; d.textContent=extra.text; log.appendChild(d); }
  log.scrollTop=log.scrollHeight; $('tChips').hidden=c.log.length>0;
  { const v=$('clChatView'); if(v) v.classList.toggle('empty',!c.log.length); let nm=''; try{ nm=(window.ACCOUNT&&ACCOUNT.name&&ACCOUNT.name())||''; }catch(_){} const hr=new Date().getHours(); const tod=hr<5?'Good evening':hr<12?'Good morning':hr<17?'Good afternoon':'Good evening'; const g=$('clGreetT'); if(g) g.textContent=tod+(nm?', '+nm:''); const gs=$('clGreetS'); if(gs){ if(!greetPick) greetPick=GREET_Q[Math.floor(Math.random()*GREET_Q.length)]; gs.textContent=greetPick; } }
  drawList();
}
function applyBoard(sp,force){ if(sp.board||force){ const c=chat(); if(sp.board){ c.board=sp.board; renderBoard(sp.board); } }
  if(sp.keys){ applyKeys(sp); setPane(sp.board?'board':'keys'); } }
function applyKeys(sp){ if(sp.keys.dir&&$('clScDir')){ K.dir=sp.keys.dir; $('clScDir').value=sp.keys.dir; } setSteps(sp.keys.title,sp.keys.steps.map(s=>({...s})),{mode:sp.keys.mode||'harmonic'}); }
function restoreRoom(){ const c=chat(); renderBoard(c.board||null); if(c.keys&&c.keys.steps&&c.keys.steps.length) setSteps(c.keys.title,c.keys.steps.map(s=>({...s})),{mode:c.keys.mode||'harmonic'}); else setSteps('',[],{}); }
let pendingCtx=null;
const GREET_Q=['How may I be of help to you today?','What do you want to tell me?',"What's on your mind today?"]; let greetPick='';

const HOT=[
 {id:'phraseology',t:'Hymn phraseology',q:'Teach me the phraseology of a hymn: antecedent and consequent, the four phrases, and what to play on each phrase.'},
 {id:'melody',t:'Melody determination',q:'Teach me melody determination: how do I find the notes of a melody by ear? Walk me through it step by step.'},
 {id:'bass',t:'Bass note determination',q:'Teach me bass note determination: how do I find the bass note under a melody? Walk me through it step by step.'},
 {id:'scales34',t:'The 3+4 scale method',q:'Teach me the 3+4 method of learning scales, including how knowing C gives me G, D gives me A, and E gives me B.'},
 {id:'neighborhood',t:'The neighborhood method',q:'Teach me the neighborhood method of learning chords in C major.'},
 {id:'run736',t:'7-3-6-2-5-1-4-3-6-2-5-1',q:'Teach me the full 7-3-6-2-5-1-4-3-6-2-5-1 progression and how to know which key I am in.'},
 {id:'251',t:'The 2-5-1 progression',q:'Teach me the 2-5-1 progression.'},
 {id:'cadences',t:'Cadences',q:'Teach me cadences: perfect, plagal, and deceptive, and how to play them.'}];
let hotCounts={};
let hotGone={}, hotShown={};
function hotDraw(){ const box=$('hotL'); if(!box) return; const all=HOT.map((h,i)=>({h,i,n:hotCounts[h.id]||0})).sort((a,b)=>b.n-a.n||a.i-b.i).filter(x=>!hotGone[x.h.id]); const list=all.slice(0,4);
  const wrap=$('hot'); if(wrap) wrap.hidden=!list.length;
  const prev=hotShown; hotShown={};
  box.innerHTML=''; list.forEach((x,r)=>{ hotShown[x.h.id]=1; const b=document.createElement('button'); b.type='button'; b.className='hot-b'+(r===0&&x.n>0?' top':'')+(prev[x.h.id]||!Object.keys(prev).length?'':' pop'); b.textContent=x.h.t+' '; const s=document.createElement('i'); s.textContent=x.n+' '+(x.n===1?'view':'views'); b.appendChild(s);
    const xb=document.createElement('span'); xb.className='hot-x'; xb.setAttribute('role','button'); xb.setAttribute('aria-label','Close this topic'); xb.title='Close'; xb.textContent='\u00d7'; xb.onclick=e=>{ e.stopPropagation(); hotGone[x.h.id]=1; hotDraw(); }; b.appendChild(xb);
    b.onclick=()=>{ hotCounts[x.h.id]=(hotCounts[x.h.id]||0)+1; try{ if(window.PSPROG) PSPROG.topic(x.h.id); }catch(_){} try{ fetch('/api/hot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:x.h.id})}).catch(()=>{}); }catch(e){} ask(x.h.q); }; box.appendChild(b); }); }
function hotClear(){ HOT.forEach(h=>hotGone[h.id]=1); hotDraw(); }
function hotInit(){ hotDraw(); try{ fetch('/api/hot').then(r=>r.json()).then(d=>{ hotCounts=d.counts||{}; hotDraw(); }).catch(()=>{}); }catch(e){} }
async function ask(q,opts){
  try{ if(window.PSPROG) PSPROG.mark(); }catch(_){}
  q=(q||'').trim(); if(!q||busy) return; stopSpeak(); setView('chat'); slide(false);
  if(opts&&opts.fresh){ const c=chat(); if(c.log.length){ newChat(); restoreRoom(); } }
  busy=true; $('tSend').disabled=true; const c=chat(); c.log.push({role:'user',content:q}); if(c.title==='New chat') c.title=autoTitle(c.log); c.when=Date.now(); renderChat({cls:'bot wait',text:'Thinking…'});
  const context={level:$('tLevel').value};
  if($('tShare').checked&&S.chords.trim()) Object.assign(context,{chart:S.chords,title:S.title,style:(STYLES[S.style]&&STYLES[S.style].label)||S.style,bpm:S.bpm,meter:S.meter,transpose:S.transpose});
  if(opts&&opts.heard) context.heard=opts.heard;
  if(K.steps.length) context.keyboard=K.steps.map(s=>s.name).join(' ');
  let err='', reply='';
  try{
    const r=await fetch('/api/teacher',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:c.log.slice(-20),context})});
    const d=await r.json().catch(()=>({}));
    if(r.ok&&d.reply){ reply=d.reply; c.log.push({role:'assistant',content:reply}); }
    else err=d.error==='not_configured'?'The coach isn\'t switched on yet. The site owner needs to add the Claude API key in Cloudflare.':d.error==='slow_down'?'Lots of questions! Give it a minute, then ask again.':d.error==='daily_limit'?'You\'ve used today\'s questions for the coach on this device. Come back tomorrow and Pokey will be ready for you.':d.error==='access'?'The coach needs the access code. Ask your question again and enter the code when it appears.':'Something went wrong reaching the coach. Please try again.';
  }catch(_){ err='Couldn\'t reach the coach. Check your internet connection and try again.'; }
  if(err) c.log.pop();
  busy=false; $('tSend').disabled=false; c.when=Date.now();
  if(reply){ const sp=splitReply(reply); if(sp.board) c.board=sp.board; saveDB(); renderChat(); if(sp.board) renderBoard(sp.board); if(sp.keys) applyKeys(sp); $('tInput').value=''; if($('clAuto').checked) speak(sp.text,null); }
  else { saveDB(); renderChat({cls:'err',text:err}); $('tInput').value=q; }
}

/* ---------- the list of previous chats ---------- */
let view='home', slideAfterLoad=false, practice=false;
function syncBar(){ const r=$('clRoot'); if(r) r.classList.toggle('cl-work',view==='chat'||!!practice); document.body.dataset.clMini=(view==='chat'||practice==='scales'||practice==='chords')?'1':''; }
function welcome(){ const h=$('clHome'); if(!h||view!=='home') return; practice=false; syncBar(); h.classList.remove('cl-in'); void h.offsetWidth; h.classList.add('cl-in'); }
function setView(v){ view=v; if(v==='home') setTimeout(welcome,0); const h=$('clHome'),c=$('clChatView'); if(h) h.hidden=v!=='home'; if(c) c.hidden=v!=='chat'; syncBar(); { const r=$('clRoot'); if(r) r.classList.toggle('cl-inchat',v==='chat'); } if(v==='chat'){ const L=$('tLog'); if(L) L.scrollTop=L.scrollHeight; } }
let pane='board';
function setPane(p){ pane=p==='keys'?'keys':'board'; const el=$('clSlide'); if(el) el.dataset.pane=pane; document.querySelectorAll('#clPane button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p===pane))); }
function slide(open){ const el=$('clSlide'); if(!el) return; el.classList.toggle('on',!!open); el.setAttribute('aria-hidden',open?'false':'true'); const d=$('clDots'); d.setAttribute('aria-expanded',open?'true':'false'); if(open) d.classList.remove('new'); }
function back(){ const el=$('clSlide'); if(el&&el.classList.contains('on')){ slide(false); return true; } if($('clDrawer')&&!$('clDrawer').hidden){ drawer(false); return true; } if(practice){ practice=false; syncBar(); return true; } if(view==='chat'){ setView('home'); return true; } return false; }
function rowMenu(btn,c){
  const old=document.getElementById('clPop'); if(old){ const same=old._for===btn; old.remove(); if(same) return; }
  const pop=document.createElement('div'); pop.id='clPop'; pop.className='cl-pop'; pop.setAttribute('role','menu'); pop._for=btn;
  const item=(t,fn,danger)=>{ const b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem'); b.textContent=t; if(danger) b.className='danger'; b.onclick=e=>{ e.stopPropagation(); pop.remove(); fn(); }; return b; };
  pop.append(item('Rename',()=>{ const n=prompt('Name this chat',c.title); if(n&&n.trim()){ c.title=n.trim().slice(0,60); saveDB(); if(c.id===DB.cur) $('clName').textContent=c.title; drawList(); } }),
    item('Delete',()=>{ if(!confirm('Delete this chat?')) return; DB.chats=DB.chats.filter(x=>x!==c); if(DB.cur===c.id) DB.cur=DB.chats.length?DB.chats[0].id:null; chat(); saveDB(); restoreRoom(); renderChat(); drawList(); },true));
  document.body.appendChild(pop); { const r=btn.getBoundingClientRect(); pop.style.top=(r.bottom+4)+'px'; pop.style.right=Math.max(8,innerWidth-r.right)+'px'; } const close=e=>{ if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('pointerdown',close,true); } }; setTimeout(()=>document.addEventListener('pointerdown',close,true),0);
}
function drawer(open){ const d=$('clDrawer'); d.hidden=!open; if(open) drawList(); }
function drawList(){
  const list=$('clList'); if(!list) return; list.textContent=''; const qs=(($('clSearch')||{}).value||'').trim().toLowerCase();
  DB.chats.slice().sort((a,b)=>b.when-a.when).filter(c=>!qs||c.title.toLowerCase().includes(qs)).forEach(c=>{
    const row=document.createElement('div'); row.className='cl-row'+(c.id===DB.cur?' cur':'');
    const open=document.createElement('button'); open.type='button'; open.className='cl-open'; const t=document.createElement('b'); t.textContent=c.title; const s=document.createElement('small'); s.textContent=new Date(c.when).toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+Math.ceil(c.log.length/2)+' questions'; open.append(t,s);
    open.onclick=()=>{ DB.cur=c.id; saveDB(); stopProg(); stopSpeak(); restoreRoom(); renderChat(); drawer(false); };
    const more=document.createElement('button'); more.type='button'; more.className='cl-mini cl-more'; more.textContent='\u22ef'; more.title='More'; more.setAttribute('aria-haspopup','menu'); more.setAttribute('aria-label','Chat options');
    more.onclick=e=>{ e.stopPropagation(); rowMenu(more,c); };
    row.append(open,more); list.appendChild(row); });
  if(!list.children.length) list.textContent=qs?'No chats match.':'No chats yet.';
}
function startNew(){ greetPick=''; hotGone={}; const c=chat(); if(c.log.length){ newChat(); saveDB(); } stopProg(); stopSpeak(); restoreRoom(); renderChat(); drawer(false); $('tInput').focus(); }


/* ---------- clearing ---------- */
function clearBoard(){ const c=chat(); c.board=null; saveDB(); renderBoard(null); }
function clearKeys(){ stopProg(); setSteps('',[],{}); }
function clearChat(quiet){ const c=chat(); if(!quiet&&c.log.length&&!confirm('Delete the messages in this chat?')) return; stopSpeak(); c.log=[]; c.title='New chat'; c.when=Date.now(); saveDB(); renderChat(); }
// auto = true after an hour away: start a fresh chat (the old one stays in Chats), with a blank board and keyboard
function clearAll(auto){
  if(!auto&&(chat().log.length||chat().board||K.steps.length)&&!confirm('Clear the whiteboard, keyboard and chat?')) return;
  if(auto){ if(chat().log.length) newChat(); saveDB(); stopProg(); stopSpeak(); restoreRoom(); renderChat(); return; }
  clearBoard(); clearKeys(); clearChat(true);
}

/* ---------- build the page ---------- */
const CSS=`
body[data-dest="class"] .card[data-panel="teacher"] .ps-head{display:none!important}
body[data-dest="class"] #teacherCard{display:flex!important;flex-direction:column}
#clRoot{flex:1 1 0!important;min-height:0}
.cl{display:flex;flex-direction:column;gap:12px;min-height:0;flex:1;position:relative;overflow:hidden}
.cl-clr{display:inline-flex;gap:6px}
.cl-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}
.cl-bar .cl-brand{font:800 22px var(--display);letter-spacing:-.01em;color:var(--stage-ink);margin-right:4px}
.cl-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:14px;flex:1;min-height:0}
.cl-left{display:flex;flex-direction:column;gap:12px;min-height:0;overflow:auto;padding-right:2px}
.cl-chat{display:flex;flex-direction:column;gap:8px;min-height:0;background:var(--k0d0b07,#0c1222);border-radius:14px;padding:12px}
.cl-chatname{font:700 12px var(--body);text-transform:uppercase;letter-spacing:.1em;color:var(--stage-muted)}
.cl-chat .t-log{flex:1;min-height:0;overflow:auto}
.cl-board{position:relative;border-radius:14px;background:#cfd6e2;padding:10px 10px 0;box-shadow:inset 0 0 0 1px #aab4c6}
.cl-face{background:#fbfcfa;border-radius:8px;padding:16px 20px 18px;min-height:150px;max-height:34vh;overflow:auto;color:#14213d;font:500 17px/1.5 var(--body);box-shadow:inset 0 0 0 1px #e1e5ea}
.cl-face h3{font:800 26px var(--display);margin:0 0 8px;color:var(--kb8892a,#1c4fa0);letter-spacing:-.01em}
.cl-face h4{font:700 14px var(--body);text-transform:uppercase;letter-spacing:.08em;color:#5b6577;margin:12px 0 4px}
.cl-face p{margin:4px 0}.cl-face ul{margin:4px 0 4px 20px;padding:0}.cl-face li{margin:3px 0}
.cl-def{margin:8px 0;padding:8px 12px;border-left:4px solid #f76707;background:#fff4e8;border-radius:0 8px 8px 0}
.cl-term{font-weight:800;margin-right:8px;color:#b34100}
.cl-chord{font:800 inherit;font-family:var(--display);color:#c2410c;background:#fff1e6;border:1.5px solid #f4b183;border-radius:8px;padding:0 7px;margin:0 1px;cursor:pointer}
.cl-chord:hover{background:#ffe0c7}
.hot{width:100%;margin:0 0 8px}.hot-h{font:800 15px var(--display);color:var(--ke8c25a,#ffd54a);margin-bottom:6px}.hot-h span{font:500 12px system-ui;color:var(--kc8b98f,#a9b6cf);margin-left:6px}.hot-l{display:flex;flex-wrap:wrap;gap:6px}.hot-b{border:1px solid var(--kb8892a,#f0b3a0);background:linear-gradient(180deg,var(--k2a2210,#fff7f2),var(--k1a140a,#ffe9df));color:var(--kf3ead8,#7a2a10);border-radius:999px;padding:7px 12px;font:600 14px system-ui;cursor:pointer;display:inline-flex;gap:7px;align-items:center}.hot-b:hover{background:var(--k3a2e14,#ffe0d2)}.hot-b i{font:700 11px system-ui;font-style:normal;background:var(--ke8c25a,#fff);border-radius:99px;padding:1px 7px;color:var(--k111,#b4421f)}.hot-b.top{border-color:var(--ke8c25a,#e8743f);box-shadow:0 0 0 2px rgba(232,194,90,.25)}
.cl-empty{display:grid;gap:6px;color:#5b6577;font-size:15px}.cl-empty b{font:800 20px var(--display);color:var(--kb8892a,#1c4fa0)}
.cl-tray{height:12px;margin:10px -10px 0;background:#aab4c6;border-radius:0 0 14px 14px;display:flex;gap:8px;align-items:center;padding-left:18px}
.cl-tray i{display:block;width:34px;height:5px;border-radius:3px}
.cl-keys{background:var(--k0d0b07,#0c1222);border-radius:14px;padding:10px;display:grid;gap:8px}
.cl-khead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.cl-khead span{font:700 12px var(--body);color:var(--stage-muted);text-transform:uppercase;letter-spacing:.08em}
.cl-keys .seg.dark{background:var(--k17130a,#141c33);border-color:var(--k4a3f1d,#2c3a5e)}
.cl-steps{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cl-step{font:800 16px var(--display);padding:7px 14px;border-radius:10px;border:1.5px solid var(--k6b5826,#3a4a74);background:#1b2440;color:#fff;cursor:pointer}
.cl-step[aria-pressed="true"]{background:var(--hi);color:var(--hi-ink);border-color:var(--hi)}
.cl-notes{font:500 13px var(--body);color:var(--stage-muted)}
.cl-ktools{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cl-ktools .btn,.cl-type .btn{padding:6px 12px!important;font-size:13px!important}
.cl-type{display:flex;gap:6px}.cl-type input{flex:1;min-width:0;background:var(--k17130a,#141c33);color:var(--stage-ink);border:1.5px solid var(--k6b5826,#34446c);border-radius:10px;padding:7px 10px;font:600 14px var(--body)}
.cl-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.cl-act{font:600 13px var(--body);padding:5px 11px;border-radius:999px;border:1.5px solid var(--k6b5826,#3a4a74);background:transparent;color:var(--stage-ink);cursor:pointer}
.cl-act:hover{border-color:var(--hi);color:var(--hi)}.cl-act.pri{background:var(--hi);color:var(--hi-ink);border-color:var(--hi)}
.cl-form{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
.cl-form textarea{grid-column:1/-1}
.cl-form .row{display:flex;gap:8px;justify-content:flex-end}
#clMic.on{background:#e03131!important;border-color:#e03131!important;color:#fff!important}
.cl-drawer{position:absolute;left:0;top:44px;bottom:0;width:min(340px,90%);z-index:20;background:var(--k0d0b07,#0c1222);border:1px solid var(--k6b5826,#34446c);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 18px 40px rgba(0,0,0,.45)}
.cl-drawer[hidden]{display:none}
.cl-drawer h3{margin:0;font:700 12px var(--body);text-transform:uppercase;letter-spacing:.1em;color:var(--stage-muted)}
#clList{overflow:auto;display:grid;gap:6px;align-content:start}
.cl-row{display:flex;gap:4px;align-items:stretch;border-radius:10px;background:var(--k17130a,#141c33)}
.cl-row.cur{outline:2px solid var(--hi)}
.cl-open{flex:1;min-width:0;text-align:left;background:none;border:0;color:var(--stage-ink);padding:8px 10px;cursor:pointer;display:grid;gap:2px;font:inherit}
.cl-open b{font:700 14px var(--body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cl-open small{color:var(--stage-muted);font-size:12px}
.cl-mini{background:none;border:0;color:var(--stage-muted);cursor:pointer;padding:0 8px;font-size:13px}.cl-mini:hover{color:var(--hi)}
@media(max-width:900px){.cl{overflow:auto}.cl-chat{min-height:60vh}.cl-chat .t-log{min-height:42vh}}
.cl-bar .cl-back{padding:6px 12px;font-size:18px;line-height:1}
.cl-brand{font:800 clamp(24px,3.2vw,32px)/1 var(--display,var(--body))!important;letter-spacing:-.02em}
.cl:not(.cl-work) #clDots,.cl:not(.cl-inchat) #clChats,.cl:not(.cl-inchat) #clNew{display:none}
.cl-home{gap:10px;padding-top:0;margin-top:-8px}
.cl-dots{margin-left:auto;font-size:22px;line-height:1;padding:2px 14px 6px;position:relative}
.cl-dots.new:after{content:"";position:absolute;top:4px;right:6px;width:10px;height:10px;border-radius:50%;background:var(--hi);box-shadow:0 0 0 0 var(--hi);animation:clPulse 1.4s infinite}
@keyframes clPulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.5)}100%{box-shadow:0 0 0 12px rgba(255,255,255,0)}}
.cl-home{display:flex;flex-direction:column;gap:18px;max-width:1240px;width:100%;margin:0 auto;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:8px 10px 24px;-webkit-overflow-scrolling:touch}
.cl-welcome{margin:0 auto;max-width:780px;text-align:center;font:500 clamp(15px,1.9vw,19px)/1.55 var(--body);color:var(--stage-ink)}
.cl-welcome b{color:var(--hi);letter-spacing:.04em}
.cl-four{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.cl-box{position:relative;display:flex;flex-direction:column;text-align:left;padding:0;min-height:430px;overflow:hidden;border-radius:26px;border:1px solid rgba(var(--gl),.45);background:linear-gradient(165deg,var(--g1) -30%,var(--g2) 62%);color:#fff;cursor:pointer;font:inherit;box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 3px 6px rgba(0,0,0,.5),0 26px 40px -14px rgba(0,0,0,.75);transition:box-shadow .3s,border-color .3s}
.cl-box .ph{display:block;width:100%;flex:1 1 0;min-height:170px;height:0;object-fit:cover;object-position:center;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)}
.cl-box .tx{display:flex;flex-direction:column;gap:8px;padding:0 20px 20px;margin-top:-34px;position:relative}
.cl-box:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.28),transparent 58%);opacity:0;transition:opacity .25s;z-index:2}
.cl-box:hover,.cl-box:focus-visible{border-color:rgba(var(--gl),.95);box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 0 0 2px rgba(var(--gl),.7),0 0 60px 4px rgba(var(--gl),.55),0 30px 50px -14px rgba(0,0,0,.8);outline:0}
.cl-box:hover:before,.cl-box:focus-visible:before{opacity:1}
.cl-box .ic{width:56px;height:56px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(150deg,var(--c1),var(--c2));box-shadow:0 1px 0 rgba(255,255,255,.55) inset,0 -6px 10px rgba(0,0,0,.28) inset,0 10px 18px -4px var(--c2)}
.cl-box .ic svg{width:33px;height:33px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
.cl-box b{font:800 24px var(--display);letter-spacing:-.01em;text-shadow:0 2px 10px rgba(0,0,0,.45)}
.cl-box span{color:rgba(255,255,255,.85);font:500 15px/1.45 var(--body)}
.cl-box .go{align-self:flex-start;margin-top:6px;font-style:normal;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);font:700 14px var(--body)}
.cl-box:hover .go{background:var(--hi);color:var(--hi-ink);border-color:transparent}
@media(max-width:1000px){.cl-four{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-box{min-height:380px}}
@media(max-width:560px){.cl-four{gap:12px}.cl-box{min-height:300px;border-radius:20px}.cl-box .ph{min-height:120px}.cl-box .tx{padding:0 12px 14px;margin-top:-26px;gap:6px}.cl-box .ic{width:42px;height:42px;border-radius:13px}.cl-box .ic svg{width:25px;height:25px}.cl-box b{font-size:18px}.cl-box span{font-size:13px}.cl-box .go{padding:6px 12px;font-size:12.5px}}
.cl-in .cl-welcome{animation:clFade 1s ease both}
.cl-in .cl-box{animation-duration:.95s;animation-timing-function:cubic-bezier(.18,.9,.25,1);animation-fill-mode:both}
.cl-in .cl-box[data-k=chat]{animation-name:clFromTop;animation-delay:.15s}
.cl-in .cl-box[data-k=ear]{animation-name:clFromRight;animation-delay:.35s}
.cl-in .cl-box[data-k=scales]{animation-name:clFromLeft;animation-delay:.55s}
.cl-in .cl-box[data-k=chords]{animation-name:clFromBottom;animation-delay:.75s}
@keyframes clFade{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
@keyframes clFromTop{from{transform:translateY(-130%);opacity:0}to{transform:none;opacity:1}}
@keyframes clFromBottom{from{transform:translateY(130%);opacity:0}to{transform:none;opacity:1}}
@keyframes clFromLeft{from{transform:translateX(-130%);opacity:0}to{transform:none;opacity:1}}
@keyframes clFromRight{from{transform:translateX(130%);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.cl-in .cl-box,.cl-in .cl-welcome{animation:none}}
.cl-chat{max-width:900px;width:100%;margin:0 auto;flex:1}
.cl-chat[hidden],.cl-home[hidden]{display:none!important}
/* chat row menu */
.cl-row{position:relative}
.cl-more{font-size:20px;line-height:1;padding:0 12px}
.cl-pop{position:fixed;z-index:200000;min-width:140px;padding:6px;border-radius:14px;background:var(--k231c0f,#1d2540);border:1px solid var(--k4a3f1d,#2c3a5e);box-shadow:0 14px 34px rgba(0,0,0,.55);display:grid;gap:2px}
.cl-pop button{background:none;border:0;color:var(--stage-ink);text-align:left;padding:9px 12px;border-radius:9px;font:600 14px var(--body);cursor:pointer}
.cl-pop button:hover{background:color-mix(in srgb,var(--hi) 18%,transparent)}
.cl-pop button.danger{color:#ff8787}
@media(min-width:1000px){.cl-mini{opacity:.55!important}.cl-row:hover .cl-mini{opacity:1!important}}
/* whiteboard | keyboard toggle */
.cl-pane button{font-weight:800;padding:8px 18px}
#clSlide[data-pane=board] .cl-keys,#clSlide[data-pane=keys] .cl-boardwrap{display:none}
/* harmonic | melodic */
.cl-mode{justify-self:start}
.cl-scale{display:none;flex-wrap:wrap;gap:8px;align-items:center}
.cl-keys[data-mode=melodic] .cl-scale{display:flex}
.cl-keys[data-mode=melodic] .cl-type,.cl-keys[data-mode=melodic] #clCheck{display:none}
.cl-scale .btn{padding:7px 16px!important;font-size:14px!important}
.cl-scale select{background:var(--k17130a,#141c33);color:var(--stage-ink);border:1.5px solid var(--k6b5826,#34446c);border-radius:10px;padding:7px 10px;font:600 14px var(--body)}
.cl-keys[data-mode=melodic] .cl-step{display:inline-flex;flex-direction:column;align-items:center;gap:1px;min-width:46px;padding:6px 10px}
.cl-keys[data-mode=melodic] .cl-step small{font:700 11px var(--body);opacity:.8}

/* ---- chat view, in the style of a modern assistant ---- */
.cl-chat{background:transparent;padding:0 4px;max-width:none;gap:10px}
.cl-chat>*{width:100%;max-width:820px;margin-inline:auto}
.cl-chat:not(.empty){padding-bottom:56px}
.cl-chat .t-log{display:flex;flex-direction:column;gap:14px;padding:8px 2px}
.cl-chat .t-msg.user{background:var(--k231c0f,#1d2540)!important;color:var(--stage-ink)!important;border-radius:20px 20px 6px 20px;padding:10px 16px;max-width:85%}
.cl-chat .t-msg.bot{background:none!important;border:0!important;padding:2px 2px!important;max-width:100%;color:var(--stage-ink);font-size:16.5px;line-height:1.6}
.cl-greet{display:none;align-items:center;justify-content:center;gap:14px;text-align:center;margin-bottom:6px}
.cl-greet{flex-direction:column;gap:6px}
.cl-greet p{margin:0;font:500 clamp(16px,2.2vw,21px) var(--body);color:var(--stage-muted)}
.hot-h{display:flex;align-items:baseline;gap:12px}
.hot-h span.hot-t{font:600 14px var(--body);margin:0}
.hot-clr{margin-left:auto;background:none;border:0;color:var(--stage-muted);font:500 11px var(--body);cursor:pointer;padding:2px 4px;text-decoration:underline;text-underline-offset:3px}
.hot-clr:hover{color:var(--hi)}
.hot-l{grid-template-columns:repeat(4,minmax(0,1fr))!important}
@media(max-width:760px){.hot-l{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
.hot-b{position:relative}.hot-l .hot-b{padding-right:36px!important;min-height:96px!important}
.hot-x{position:absolute;top:8px;right:10px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;font:400 20px/1 var(--body);opacity:.55}
.hot-x:hover{opacity:1;background:color-mix(in srgb,var(--hi) 25%,transparent)}
.hot-b.pop{animation:hotPop .5s cubic-bezier(.2,.9,.25,1.2) both}
@keyframes hotPop{from{opacity:0;transform:scale(.85) translateY(10px)}to{opacity:1;transform:none}}
.cl-greet h2{text-transform:none;margin:0;font:700 clamp(26px,4vw,40px)/1.15 var(--display);color:var(--stage-ink);letter-spacing:-.01em}
.cl-chat.empty{justify-content:flex-start;padding-bottom:4vh}.cl-chat.empty>.cl-greet{margin-top:auto}.cl-chat.empty>p.help{margin-bottom:auto}
.cl-chat.empty .cl-greet{display:flex;order:1}
.cl-chat.empty .cl-chathead,.cl-chat.empty .t-log{display:none}
.cl-chat.empty .cl-form{order:2}.cl-chat.empty .cl-set{order:3;justify-content:center}.cl-chat.empty .t-chips{order:4}.cl-chat.empty p.help{order:5;text-align:center}
.cl-form{display:grid;grid-template-columns:1fr auto;align-items:end;gap:4px 8px;padding:12px 14px 10px 18px;border-radius:26px;background:var(--k17130a,#141c33);border:1.5px solid var(--k4a3f1d,#2c3a5e);box-shadow:0 10px 30px -12px rgba(0,0,0,.6);transition:border-color .2s,box-shadow .2s}
.cl-form:focus-within{border-color:var(--hi);box-shadow:0 0 0 3px color-mix(in srgb,var(--hi) 25%,transparent),0 10px 30px -12px rgba(0,0,0,.6)}
.cl-form textarea{grid-column:1/-1;background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important;resize:none;color:var(--stage-ink);font:500 17px/1.5 var(--body);padding:4px 0;min-height:56px}
.cl-form span{display:none}
.cl-form .row{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}
.cl-ib{width:40px;height:40px;border-radius:50%;border:1px solid var(--k4a3f1d,#2c3a5e);background:transparent;color:var(--stage-ink);font-size:17px;cursor:pointer;display:grid;place-items:center;padding:0}
.cl-ib:hover{border-color:var(--hi)}
.cl-ib.send{background:var(--hi);color:var(--hi-ink);border-color:transparent;font:800 20px var(--body)}
.cl-ib.send:disabled{opacity:.45}
.cl-set{gap:6px 10px}.cl-set .flabel{font-size:13px;opacity:.8}
.cl-set select{border-radius:999px;padding:5px 12px}
.cl-set .t-chk{font-size:13px;padding:5px 12px;border-radius:999px;border:1px solid var(--k4a3f1d,#2c3a5e);background:transparent}
.t-chips .chip{display:none}
.t-chips{display:block}
.hot{margin-top:6px}
.hot-h{font:600 14px var(--body)!important;color:var(--stage-muted)!important;margin-bottom:8px}
.hot-l{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.hot-b{text-align:left;display:flex!important;flex-direction:column;gap:6px;min-height:84px;padding:14px 16px!important;border-radius:18px!important;background:var(--k17130a,#141c33)!important;border:1px solid var(--k4a3f1d,#2c3a5e)!important;color:var(--stage-ink)!important;font:700 15px/1.3 var(--body)!important;cursor:pointer;transition:border-color .2s,transform .2s}
.hot-b:hover{border-color:var(--hi)!important}
.hot-b{align-items:flex-start;justify-content:flex-start}.hot-b i{font:500 12px var(--body);font-style:normal;opacity:.65;margin-top:auto;background:transparent!important;color:inherit!important;padding:0!important}
/* sidebar of recent chats (wide screens, chat view) */
.cl-drawer h3{margin:6px 4px 0}
.cl-sbnew{display:block;width:100%;padding:11px 14px;border-radius:14px;border:0;background:var(--k231c0f,#1d2540);color:var(--stage-ink);font:700 15px var(--body);text-align:left;cursor:pointer}
.cl-sbnew:hover{background:color-mix(in srgb,var(--hi) 22%,transparent)}
#clSearch{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid var(--k4a3f1d,#2c3a5e);background:transparent;color:var(--stage-ink);padding:9px 12px;font:500 14px var(--body)}
@media(min-width:1000px){
  .cl.cl-inchat{display:grid;grid-template-columns:268px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:12px 18px}
  .cl.cl-inchat .cl-bar{grid-column:1/-1}
  .cl.cl-inchat .cl-drawer{display:flex!important;position:static;grid-column:1;grid-row:2;width:auto;box-shadow:none;border-radius:18px;background:transparent;border:0;border-right:1px solid var(--k4a3f1d,#2c3a5e);border-radius:0;padding:0 14px 0 0;z-index:1}
  .cl.cl-inchat .cl-chat{grid-column:2;grid-row:2;min-height:0}
  .cl.cl-inchat #clChats,.cl.cl-inchat #clCloseDrawer,.cl.cl-inchat #clNew{display:none}
  .cl-row{background:transparent}.cl-row:hover{background:var(--k17130a,#141c33)}
  .cl-row.cur{outline:0;background:var(--k231c0f,#1d2540)}
  .cl-mini{opacity:0}.cl-row:hover .cl-mini{opacity:1}
}

.cl-chathead{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.cl-chatbtns{display:inline-flex;gap:6px}.cl-chatbtns .btn{padding:5px 12px!important;font-size:13px!important}
.cl-set{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.cl-slide{position:absolute;top:0;right:0;bottom:0;width:min(700px,100%);z-index:40;background:var(--stage,#070b14);border:1px solid var(--k6b5826,#34446c);border-radius:16px 0 0 16px;padding:12px;display:flex;flex-direction:column;gap:10px;overflow:auto;box-shadow:-20px 0 50px rgba(0,0,0,.55);transform:translateX(108%);visibility:hidden;transition:transform .34s cubic-bezier(.2,.8,.2,1),visibility 0s .34s}
.cl-slide.on{transform:none;visibility:visible;transition:transform .34s cubic-bezier(.2,.8,.2,1)}
.cl-slidehead{display:flex;align-items:center;justify-content:space-between;font:800 16px var(--display);color:var(--stage-ink)}
.cl-slidehead .btn{padding:5px 13px!important;font-size:16px!important}
.cl-turn{display:none;margin:0;color:var(--stage-muted);font-size:13px}
.cl-areahead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 6px}
.cl-areahead span{font:700 12px var(--body);color:var(--stage-muted);text-transform:uppercase;letter-spacing:.08em}
.cl-areahead .btn,.cl-khead .btn{padding:4px 11px!important;font-size:12px!important}
.cl-slide .cl-left{overflow:visible;padding:0}
@media(max-width:700px){.cl-slide{position:fixed;top:36px;left:0;right:0;bottom:0;width:100%;border-radius:0;z-index:150001}.cl-turn{display:block}}
@media(max-width:900px) and (orientation:landscape) and (max-height:520px){.cl-slide{position:fixed;top:36px;left:0;right:0;bottom:0;width:100%;border-radius:0;z-index:150001}.cl-slide .cl-left{flex-direction:row;align-items:flex-start;gap:10px}.cl-slide .cl-boardwrap{flex:0 0 38%;min-width:0}.cl-slide .cl-keys{flex:1;min-width:0}.cl-face{max-height:50vh}.cl-turn{display:none}}

`;
function build(){
  const card=$('teacherCard'); if(!card||$('clRoot')) return;
  const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
  card.querySelectorAll('.card-h,.t-opts,#tLog,#tChips,#tForm,p.help').forEach(e=>e.remove());
  const root=document.createElement('div'); root.id='clRoot'; root.className='cl';
  root.innerHTML=`
  <div class="cl-bar">
    <button class="btn cl-back" id="clBack" type="button" aria-label="Back" title="Back">←</button>
    <span class="cl-brand">Class Area</span>
    <button class="btn" id="clChats" type="button">☰ Chats</button>
    <button class="btn" id="clNew" type="button">＋ New chat</button>
    <button class="btn cl-dots" id="clDots" type="button" aria-label="Whiteboard and keyboard" aria-expanded="false" title="Whiteboard and keyboard">⋯</button>
  </div>
  <div class="cl-home" id="clHome">
    <p class="cl-welcome">Welcome to class today, from consultation sessions, to scale and chord practice sessions and ear-training sessions, this is a very important part of the piano suite that you must <b>NOT</b> go for a day without.</p>
    <div class="cl-four">
    <button type="button" class="cl-box" data-go="chat" data-k="chat" style="--g1:#3a62e0;--g2:#0c1650;--gl:91,140,255;--c1:#5b8cff;--c2:#2a45c9"><img class="ph" src="class-chat.webp?v=n" alt="" style="object-position:22% center" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><path d="M8 10h32a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H25l-9 8v-8H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" fill="#fff"/><circle cx="16" cy="21.5" r="2.4" fill="#2a45c9"/><circle cx="24" cy="21.5" r="2.4" fill="#2a45c9"/><circle cx="32" cy="21.5" r="2.4" fill="#2a45c9"/></svg></i><b>Consultation</b><span>Talk it through with Pokey, one step at a time.</span><em class="go">Open →</em></div></button>
    <button type="button" class="cl-box" data-go="ear" data-k="ear" style="--g1:#8a52f0;--g2:#1c0f4a;--gl:170,120,255;--c1:#b78bff;--c2:#6a35d8"><img class="ph" src="class-ear.webp?v=n" alt="" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><path d="M9 28v-4a15 15 0 0 1 30 0v4" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><rect x="5.5" y="26" width="9" height="15" rx="4" fill="#fff"/><rect x="33.5" y="26" width="9" height="15" rx="4" fill="#fff"/><path d="M20 30v7M24 26v15M28 31v6" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".9"/></svg></i><b>Ear training</b><span>Train your ear with short quizzes.</span><em class="go">Open →</em></div></button>
    <button type="button" class="cl-box" data-go="scales" data-k="scales" style="--g1:#e0911a;--g2:#3b2205;--gl:255,190,70;--c1:#ffd24d;--c2:#e0911a"><img class="ph" src="class-scales.webp?v=n" alt="" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><path d="M6 36h5v-5h5v-5h5v-5h5v-5h5v-5h6v26H6Z" fill="#fff"/><path d="M6 36h36" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></i><b>Scales</b><span>Load a scale on the keyboard with fingering.</span><em class="go">Open →</em></div></button>
    <button type="button" class="cl-box" data-go="chords" data-k="chords" style="--g1:#d6336c;--g2:#3d0a1f;--gl:255,130,170;--c1:#ff8a8a;--c2:#d6336c"><img class="ph" src="class-chords.webp?v=n" alt="" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><rect x="5" y="9" width="38" height="30" rx="4" fill="#fff"/><path d="M14.5 9v30M24 9v30M33.5 9v30" stroke="#c9ccd6" stroke-width="1.6"/><rect x="11" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/><rect x="20.5" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/><rect x="30" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/></svg></i><b>Chords</b><span>Type chords and see and hear them on the keyboard.</span><em class="go">Open →</em></div></button>
    </div>
  </div>
  <div class="cl-chat" id="clChatView" hidden>
    <div class="cl-greet" id="clGreet"><h2 id="clGreetT">Hello</h2><p id="clGreetS"></p></div>
    <div class="cl-chathead"><span class="cl-chatname" id="clName"></span><span class="cl-chatbtns"><button class="btn" id="tCopyAll" type="button">Copy chat</button><button class="btn" id="clClrChat" type="button" title="Wipe this chat">Clear chat</button></span></div>
    <div class="cl-set"><label for="tLevel" class="flabel">My level</label>
      <select id="tLevel"><option value="">Not sure</option><option>Beginners</option><option>Intermediate</option><option>Progressive</option><option>Pre-advanced</option></select>
      <label class="t-chk"><input type="checkbox" id="tShare" checked> Show it my chord chart</label>
      <label class="t-chk"><input type="checkbox" id="clAuto"> Read replies aloud</label></div>
    <div id="tLog" class="t-log" aria-live="polite"></div>
    <div class="t-chips" id="tChips">
      <div class="hot" id="hot"><div class="hot-h"><span class="hot-t">Here's what other musicians are talking about</span><button type="button" class="hot-clr" id="hotClr">Clear all</button></div><div class="hot-l" id="hotL"></div></div>
      <button class="btn chip" type="button">Explain the chords in my chart</button>
      <button class="btn chip" type="button">Teach me the 2-5-1 progression</button>
      <button class="btn chip" type="button">Quiz me on what I'm learning</button>
      <button class="btn chip" type="button">How do I find the bass note for a melody?</button>
    </div>
    <form id="tForm" class="cl-form">
      <label for="tInput" class="sr">Your answer or question</label>
      <textarea id="tInput" rows="2" maxlength="2000" placeholder="Type your answer or ask Pokey anything…"></textarea>
      <span></span><div class="row"><button class="cl-ib" id="clMic" type="button" aria-label="Speak" title="Speak">🎤</button><button class="cl-ib send" id="tSend" type="submit" aria-label="Send" title="Send">↑</button></div>
    </form>
    <p class="help" style="margin:0">AI coach trained from real music lessons with real people all around the world.</p>
  </div>
  <aside class="cl-slide" id="clSlide" aria-label="Whiteboard and keyboard" aria-hidden="true">
    <div class="cl-slidehead"><div class="seg dark cl-pane" id="clPane" role="group" aria-label="Whiteboard or keyboard"><button type="button" data-p="board">Whiteboard</button><button type="button" data-p="keys">Keyboard</button></div><button class="btn" id="clX" type="button" aria-label="Close and return" title="Close">✕</button></div>
    <p class="cl-turn">Tip: turn your phone sideways for a wider keyboard.</p>
    <div class="cl-left">
      <div class="cl-boardwrap"><div class="cl-areahead"><span>Whiteboard</span><button class="btn" id="clClrBoard" type="button" title="Wipe the whiteboard">Clear board</button></div>
        <div class="cl-board" id="clBoard" aria-label="Whiteboard"></div></div>
      <div class="cl-keys">
        <div class="cl-khead"><span id="clKbdTitle">Keyboard</span><button class="btn" id="clClrKeys" type="button" title="Wipe the keyboard">Clear keyboard</button><div class="seg dark" id="clKbdSize" role="group" aria-label="Keyboard size"><button data-k="88">88 keys</button><button data-k="76">76 keys</button><button data-k="61">61 keys</button></div></div>
        <div class="seg dark cl-mode" id="clMode" role="group" aria-label="Keyboard mode"><button type="button" data-m="harmonic" title="Chords: notes played together">Harmonic</button><button type="button" data-m="melodic" title="Scales: notes played one after another">Melodic</button></div>
        <div class="cl-scale" id="clScale"><select id="clScKey" aria-label="Scale"></select><select id="clScHand" aria-label="Hand"><option value="rh">Right hand</option><option value="lh">Left hand</option><option value="both">Both hands</option></select><select id="clScDir" aria-label="Direction"><option value="up">Up</option><option value="down">Down</option><option value="updown">Up and down</option></select><button class="btn pri" id="clScGo" type="button">Show scale</button></div>
        <div id="clKbdWrap"></div>
        <div class="cl-steps" id="clSteps"></div>
        <div class="cl-notes"><b id="clStepName" style="color:#fff;font:800 15px var(--display);margin-right:8px"></b><span id="clStepNotes"></span></div>
        <div class="cl-ktools" id="clKbdTools" hidden>
          <button class="btn" id="clPrev" type="button" aria-label="Previous chord">◀</button><button class="btn" id="clNext" type="button" aria-label="Next chord">▶</button>
          <button class="btn pri" id="clPlayProg" type="button">▶ Play progression</button><button class="btn" id="clCheck" type="button" title="Play the chord on a MIDI keyboard and Pokey checks it">🎹 Check my playing</button>
          <label class="t-chk"><input type="checkbox" id="clLoop"> Loop</label>
          <select id="clTempo" aria-label="Speed"><option value="60">Slow</option><option value="80" selected>Medium</option><option value="104">Fast</option></select>
          <button class="btn" id="clPng" type="button">Save keyboard diagram</button><button class="btn" id="clSheet" type="button">Sheet music</button>
          <button class="btn" id="clToStudio" type="button">Practice in Studio →</button><button class="btn" id="clAskKeys" type="button">Ask about this chord</button>
        </div>
        <form class="cl-type" id="clType"><input id="clTypeIn" placeholder="Type chords to see them, e.g. Dm7 G7 Cmaj7" aria-label="Type chords"><button class="btn" type="submit">Show</button></form>
      </div>
    </div>
  </aside>
  <aside class="cl-drawer" id="clDrawer" hidden><button class="cl-sbnew" id="clNew2" type="button">＋ New chat</button><input id="clSearch" type="search" placeholder="Search chats" aria-label="Search chats" autocomplete="off"><h3>Recents</h3><div id="clList"></div><button class="btn" id="clCloseDrawer" type="button">Close</button></aside>`;
  card.appendChild(root);
  $('tLevel').value=store.get('bt-teacher-level',''); $('tLevel').onchange=()=>store.set('bt-teacher-level',$('tLevel').value);
  $('clAuto').checked=!!store.get('cl-auto',false); $('clAuto').onchange=e=>store.set('cl-auto',e.target.checked);
  K.size=+store.get('cl-kbd',61)||61;
  $('tForm').onsubmit=e=>{ e.preventDefault(); ask($('tInput').value); };
  $('tInput').onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); ask($('tInput').value); } };
  $('tCopyAll').onclick=()=>{ const c=chat(); if(!c.log.length){ toast('Nothing to copy yet'); return; } tCopy(c.log.map(m=>(m.role==='user'?'Student: ':'Coach: ')+(m.role==='user'?m.content:splitReply(m.content).text)).join('\n\n')); };
  $('tChips').querySelectorAll('.chip').forEach(b=>b.onclick=()=>ask(b.textContent));
  hotInit();
  $('clChats').onclick=()=>drawer($('clDrawer').hidden); $('clCloseDrawer').onclick=()=>drawer(false); $('clNew').onclick=startNew; $('hotClr').onclick=hotClear; $('clNew2').onclick=startNew; $('clSearch').oninput=drawList; $('clClrBoard').onclick=clearBoard; $('clClrKeys').onclick=clearKeys; $('clClrChat').onclick=()=>clearChat(false);
  $('clCheck').onclick=()=>window.CHECK&&CHECK.toggle();
  document.querySelectorAll('.cl-box').forEach(b=>b.addEventListener('pointermove',e=>{ const r=b.getBoundingClientRect(); b.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); b.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); }));
  document.querySelectorAll('.cl-box').forEach(b=>b.onclick=()=>{ const g=b.dataset.go;
    if(g==='chat'){ setView('chat'); setTimeout(()=>{ try{ $('tInput').focus({preventScroll:true}); }catch(_){} },60); }
    else if(g==='ear'){ practice='ear'; syncBar(); if(window.EAR) EAR.open(); }
    else if(g==='scales'){ practice='scales'; syncBar(); slideAfterLoad=true; if(window.SCALES) SCALES.open(); }
    else if(g==='chords'){ practice='chords'; syncBar(); setPane('keys'); setMode('harmonic'); slide(true); setTimeout(()=>{ try{ $('clTypeIn').focus(); }catch(_){} },350); } });
  $('clDots').onclick=()=>slide(!$('clSlide').classList.contains('on')); $('clX').onclick=()=>slide(false);
  $('clBack').onclick=()=>{ if(window.SUITE) SUITE.back(); };
  setTimeout(()=>{ try{ const mo=new MutationObserver(()=>{ if(!$('clSlide').classList.contains('on')) $('clDots').classList.add('new'); }); mo.observe($('clBoard'),{childList:true,subtree:true,characterData:true}); mo.observe($('clSteps'),{childList:true}); }catch(_){} },2500);
  $('clMic').onclick=mic; if(!(window.SpeechRecognition||window.webkitSpeechRecognition)) $('clMic').title='Speaking needs Chrome, Edge or Safari';
  document.querySelectorAll('#clKbdSize button').forEach(b=>b.onclick=()=>{ K.size=+b.dataset.k; store.set('cl-kbd',K.size); drawKeys(); });
  { const sel=$('clScKey'); SC_KEYS.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k+' major'; sel.appendChild(o); }); }
  document.querySelectorAll('#clMode button').forEach(b=>b.onclick=()=>setMode(b.dataset.m));
  document.querySelectorAll('#clPane button').forEach(b=>b.onclick=()=>setPane(b.dataset.p));
  $('clScGo').onclick=()=>showScale($('clScKey').value,$('clScHand').value,$('clScDir').value); $('clScDir').onchange=()=>{ K.dir=$('clScDir').value; };
  setPane('board'); setMode('harmonic',true);
  $('clPrev').onclick=()=>stepGo(-1); $('clNext').onclick=()=>stepGo(1); $('clPlayProg').onclick=playProg;
  $('clPng').onclick=savePNG; $('clSheet').onclick=sheetMusic; $('clToStudio').onclick=toStudio; $('clAskKeys').onclick=askAboutKeys;
  $('clType').onsubmit=e=>{ e.preventDefault(); const v=$('clTypeIn').value.trim(); if(!v) return; const st=stepsFrom(v.split(/[\s|,]+/).filter(Boolean)); if(!st.length){ toast('I could not read those chords. Try names like Dm7 G7 Cmaj7.'); return; } setSteps(v,st,{play:true}); };
  loadDB(); restoreRoom(); renderChat();
  window.addEventListener('beforeunload',()=>{ try{ speechSynthesis.cancel(); }catch(_){} });
}

window.CLASS={
  sound,K,stepGo,loadSteps(title,steps){ setSteps(title,steps,{mode:'melodic'}); setPane('keys'); if(slideAfterLoad){ slideAfterLoad=false; slide(true); } },
  back,slide,setView,welcome,
  init:build,
  ask,
  // from the Studio or Studio+: open Class and ask about what the student is practicing
  askAbout(q,opts){ if(window.SUITE) SUITE.go('class'); setTimeout(()=>ask(q,opts),120); },
  clearAll,clearBoard,clearKeys,clearChat,
  showChords(title,list){ const st=stepsFrom(list); if(st.length) setSteps(title,st,{}); }
};
build();
})();
