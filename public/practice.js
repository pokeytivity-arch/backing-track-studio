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
let RET=false, ov=null, kind='scales', steps=[], cur=-1, playing=false, timers=[], title='', sub='', chBus=[], vis=null, bassFO=null, chBeat=0;
let st={sys:'letter',family:'regular',motion:'similar',mode:'practice',oct:1,type:'major',key:'C',hand:'rh',fa:'main',dir:'updown',bpm:80,loop:true,chords:'',vh:'v',ckey:'C'};
try{ Object.assign(st,JSON.parse(localStorage.getItem('ps-pr')||'{}')); if(st.family!=='exotic') st.family='regular'; if(!['letter','solfa','number'].includes(st.sys)) st.sys='letter'; }catch(_){}
try{ if(!localStorage.getItem('pr-loop-on')){ st.loop=true; localStorage.setItem('pr-loop-on','1'); } }catch(_){}   /* Loop is now on by default, once for everyone */
const save=()=>{ try{ localStorage.setItem('ps-pr',JSON.stringify(st)); }catch(_){} };
const $=s=>ov.querySelector(s);
let curDesc=false;
/* one Play / Pause / Resume button, and a separate Stop */
const updPause=()=>{ const pl=document.getElementById('prPlay'), b=document.getElementById('prPause'); if(!b){ try{ watchSync(); }catch(_){} }
  if(pl) pl.textContent=!playing?'▶ Play':paused?'▶ Resume':'❚❚ Pause';
  if(!b) return; b.textContent='■ Stop'; b.disabled=!playing; b.style.opacity=b.disabled?'.45':''; try{ watchSync(); }catch(_){} };
/* practice session: when you press Play a panel covers the console with a stopwatch, a countdown to your practice goal and your local clock,
   with encouragement and a running count of the notes you have played. The console is locked while it plays; Pause unlocks it. */
const MOTIV=['Great focus. Keep going!','Every note you play is building your skill.','Consistency beats intensity, and you are showing up.','Stay with it. Your fingers are learning.','Nice work. One more round makes it stronger.','You are getting better with every scale.','Keep the tempo steady and enjoy the music.','Practice like this adds up. Well done.'];
const SES={on:false,ms:0,t0:0,lh:0,rh:0,next:100,msg:'',until:0,mi:0,goalDone:false,timer:0};
let goalMin=(()=>{ try{ const g=+localStorage.getItem('pr-goal'); return g>=5&&g<=180?g:10; }catch(_){ return 10; } })();
const TZ=(()=>{ try{ const z=Intl.DateTimeFormat().resolvedOptions().timeZone||''; const sh=(new Intl.DateTimeFormat([], {timeZoneName:'short'}).formatToParts(new Date()).find(x=>x.type==='timeZoneName')||{}).value||''; return (z.replace(/_/g,' ')+(sh?' · '+sh:'')); }catch(_){ return ''; } })();
const two=n=>String(n).padStart(2,'0'), hms=sec=>{ sec=Math.max(0,Math.floor(sec)); const h=Math.floor(sec/3600), m=Math.floor(sec/60)%60, x=sec%60; return (h?h+':'+two(m):two(m))+':'+two(x); };
const sesSec=()=>(SES.ms+(SES.t0?Date.now()-SES.t0:0))/1000;
function tally(s){ if(!SES.on||kind!=='scales'||!s) return; SES.lh+=(s.lh||[]).length; SES.rh+=(s.rh||[]).length; const tot=SES.lh+SES.rh;
  if(tot>=SES.next){ const k=Math.round(SES.next/100); SES.next+=SES.next<500?100:250;
    SES.msg=k%2?"You've played "+tot.toLocaleString()+' notes so far. Keep it up!':(SES.lh&&SES.rh?"You've played "+SES.lh.toLocaleString()+' notes with your left hand and '+SES.rh.toLocaleString()+' with your right. Great work!':"Your "+(SES.lh?'left':'right')+' hand has played '+tot.toLocaleString()+' notes so far. Keep going!');
    SES.until=Date.now()+8000; watchDraw(); } }
function watchEl(){ let w=document.querySelector('#prRoom .p-watch'); if(w) return w; const row=document.querySelector('#prDisp .pd-screen')||document.querySelector('#prRoom .p-mixrow'); if(!row) return null;
  w=el('div','p-watch'+(row.closest('#prDisp')?' indisp':'')+(MQM.matches?' ph':'')); w.setAttribute('role','status'); w.dataset.mode='proj';
  w.innerHTML='<div class="p-wv p-wv-proj"><div class="p-wps"><div class="p-wp"><b>Stopwatch</b><div class="p-wd" data-w="sw">00:00</div><small>practice time</small></div><div class="p-wp"><b>Practice goal</b><div class="p-wd" data-w="cd">00:00</div><small class="p-wg"><button type="button" data-g="-5" aria-label="Shorter goal">−</button><span data-w="gl"></span><button type="button" data-g="5" aria-label="Longer goal">+</button></small></div><div class="p-wp"><b>Local time</b><div class="p-wd" data-w="clk">--:--</div><small data-w="tz"></small></div></div><div class="p-wm"><span data-w="msg"></span><span class="p-wn" data-w="n"></span></div></div>'
   +'<div class="p-wv p-wv-feed"><div class="p-fh"><b data-w="fh">Practicing now</b><button type="button" class="p-fjoin" hidden>Turn on</button></div><div class="p-flist" data-w="fl"></div></div>'
   +'<div class="p-wv p-wv-motiv"><div class="p-big" data-w="mot"></div></div>'
   +'<div class="p-wv p-wv-prompt"><div class="p-big">Ready to continue?</div><div class="p-sub" data-w="pt"></div><button type="button" class="p-go">Continue</button></div>'
   +'<div class="p-wv p-wv-count"><div class="p-cnt" data-w="cnt">5</div><div class="p-sub">Get ready…</div></div>'
   +'<div class="p-wv p-wv-recover"><div class="p-ring p-ring-l"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="p-rbg"/><circle cx="60" cy="60" r="52" class="p-rfg" data-w="rring"/></svg><div class="p-rt" data-w="rt">0:30</div></div><div class="p-bside"><div class="p-rec">Recover</div><div class="p-sub">Two minutes of playing. Shake out your hands and breathe. Practice carries on when the circle runs out.</div><div class="p-rbtns"><button type="button" class="p-add">+ Add a scale</button><button type="button" class="p-go p-rgo">Continue</button></div><div class="p-apick" hidden><select data-w="ak" aria-label="Note"></select><select data-w="at" aria-label="Scale"></select><button type="button" class="p-go p-aok">Add</button><button type="button" class="p-acx">Cancel</button></div><div class="p-rout" data-w="rout"></div></div></div>'
   +'<div class="p-wv p-wv-break"><div class="p-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="p-rbg"/><circle cx="60" cy="60" r="52" class="p-rfg" data-w="ring"/></svg><div class="p-rt" data-w="bt">1:00</div></div><div class="p-bside"><div class="p-big">Break</div><div class="p-sub">Rest your hands. Practice carries on when the circle runs out.</div><div class="p-wg"><button type="button" data-b="-30" aria-label="Shorter break">−</button><span data-w="bl"></span><button type="button" data-b="30" aria-label="Longer break">+</button><button type="button" class="p-go p-endb">End break</button></div></div></div>';
  w.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ goalMin=Math.max(5,Math.min(180,goalMin+ +b.dataset.g)); try{ localStorage.setItem('pr-goal',String(goalMin)); }catch(_){} SES.goalDone=sesSec()>=goalMin*60; watchDraw(); });
  w.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{ breakSec=Math.max(30,Math.min(900,breakSec+ +b.dataset.b)); try{ localStorage.setItem('pr-break',String(breakSec)); }catch(_){} if(PM.mode==='break') PM.end=Math.max(Date.now()+1000,PM.end+ +b.dataset.b*1000); watchDraw(); });
  w.querySelector('.p-rgo').onclick=()=>recoverEnd(); w.querySelector('.p-add').onclick=()=>addPick(w,true); w.querySelector('.p-acx').onclick=()=>addPick(w,false); w.querySelector('.p-aok').onclick=()=>addScale(w);
  w.querySelector('.p-wv-prompt .p-go').onclick=()=>resumeNow(); w.querySelector('.p-endb').onclick=()=>countIn();
  { const jb=w.querySelector('.p-fjoin'); if(jb) jb.onclick=feedDlg; } row.appendChild(w); return w; }
function watchPlace(w){ if(w.classList.contains('indisp')) return; const row=document.querySelector('#prRoom .p-mixrow'), con=document.querySelector('#prRoom .p-con'), mx=document.querySelector('#prRoom .p-mix'); if(!row||!con||!mx) return;
  const flow=false; w.classList.toggle('flow',flow); con.classList.toggle('p-hide',flow&&!w.hidden); if(flow){ w.style.left=w.style.top=w.style.width=w.style.height=''; return; }
  /* offsets, not screen rectangles: on a phone the whole page is turned sideways, which would swap a rectangle's width and height */
  const sl=mx.scrollLeft||0, C={left:con.offsetLeft,right:con.offsetLeft+con.offsetWidth,bottom:con.offsetTop+con.offsetHeight}, Mt=mx.offsetTop; let l=1e9, r=-1e9;
  mx.querySelectorAll(':scope>.p-ch:not(.p-lvl)').forEach(x=>{ if(x.offsetWidth){ l=Math.min(l,x.offsetLeft-sl); r=Math.max(r,x.offsetLeft-sl+x.offsetWidth); } });
  if(l>r){ l=C.left; r=C.right; } l=Math.max(l,C.left); r=Math.min(r,C.right); if(l-C.left<40) l=C.left;
  const lv=[...mx.querySelectorAll(':scope>.p-lvl')].map(x=>x.offsetLeft-sl+x.offsetWidth), lvR=lv.length?Math.max(...lv):0; if(!lv.length||C.right-r<40&&lvR<=r) r=C.right;
  w.style.left=l+'px'; w.style.top=(Mt-4)+'px'; w.style.width=(r-l)+'px'; w.style.height=(C.bottom-Mt+4)+'px'; }
/* who else is practising: until the real feed has students in it, the panel shows clearly marked examples */
const FEED_EX=[['James','New York','D melodic minor','both hands',88,'t',14,'US'],['Grace','Lagos','B♭ major','right hand',72,'e',9,'NG'],['Daniel','London','E harmonic minor','both hands',96,'q',22,'GB'],['Ama','Accra','G major','left hand',80,'s',6,'GH'],['Michael','Atlanta','F♯ major','both hands',100,'e',31,'US'],['Chioma','Abuja','A natural minor','both hands',84,'t',12,'NG'],['Sarah','Toronto','E♭ major','right hand',76,'q',18,'CA'],['David','Houston','C Dorian','both hands',90,'e',8,'US'],['Esther','Port Harcourt','B major','left hand',70,'free',27,'NG'],['Samuel','Nairobi','A♭ major','both hands',92,'s',15,'KE']];
const FEED_T0=Date.now(), RHYW={q:'quarter notes',e:'eighth notes',t:'triplets',s:'sixteenth notes',free:'free rhythm'};
/* the live feed: students who switch it on see who else is practising, and are seen. Until 30 students are on it, marked examples fill in. */
const FD=(()=>{ let f={}; try{ f=JSON.parse(localStorage.getItem('pr-feed')||'{}')||{}; }catch(_){} if(!f.id){ const a=new Uint8Array(12); (window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach((_,i)=>a[i]=Math.random()*256|0); f.id=[...a].map(x=>x.toString(16).padStart(2,'0')).join(''); } return f; })();
const fdSave=()=>{ try{ localStorage.setItem('pr-feed',JSON.stringify(FD)); }catch(_){} };
const nickIdea=()=>['arctic','cobalt','maple','ember','violet','echo','harbor','sable','lunar','cedar','nova','coral'][Math.random()*12|0]+(1000+(Math.random()*9000|0));
let FEED_LIVE=[], FEED_SAMP=true, feedT=0, beatT=0;   /* FEED_SAMP: beta sample entries, switched off from the server (FEED_SAMPLES=off) at launch */
const scaleLabel=()=>{ const t=((window.SCALES&&SCALES.types)||[]).find(q=>q.id===st.type); return SYMK(st.key)+' '+(st.type==='major'?'major':(t?t.l:st.type)); };
const handsLabel=()=>st.motion==='contrary'?'both hands, contrary':({rh:'right hand',lh:'left hand',both:'both hands'}[st.hand]||'');
async function feedPull(){ if(!FD.on) return; try{ const r=await fetch('/api/presence?me='+FD.id,{cache:'no-store'}); const d=await r.json(); FEED_LIVE=Array.isArray(d.list)?d.list:[]; FEED_SAMP=d.samples!==false; }catch(_){} }
function feedBeat(off){ if(!FD.on&&!off) return; try{ fetch('/api/presence',{method:'POST',headers:{'content-type':'application/json'},keepalive:true,body:JSON.stringify(off?{id:FD.id,off:true}:{id:FD.id,nick:FD.nick,scale:scaleLabel(),hands:handsLabel(),bpm:st.bpm,rhy:RHYW[st.rhy||'free'],min:sesSec()/60})}).catch(()=>{}); }catch(_){} }
function feedRun(on){ clearInterval(feedT); clearInterval(beatT); feedT=beatT=0; if(!on||!FD.on) return; feedBeat(); feedPull(); beatT=setInterval(()=>feedBeat(),25000); feedT=setInterval(feedPull,15000); }
const place=(city,cc)=>[city,cc?cname(cc):''].filter(Boolean).join(', ');
function feedItems(){ const live=FEED_LIVE.map(x=>({who:x.nick+(x.city||x.cc?' · '+place(x.city,x.cc):''),cc:x.cc||'',what:'Practicing '+x.scale+' ('+x.hands+') · tempo '+x.bpm+' · '+x.rhy,min:x.min,ex:false}));
  const ex=FEED_SAMP&&live.length<30?FEED_EX.map(x=>({who:x[0]+' · '+place(x[1],x[7]),cc:x[7],what:'Practicing '+x[2]+' ('+x[3]+') · tempo '+x[4]+' · '+RHYW[x[5]],min:x[6]+Math.floor((Date.now()-FEED_T0)/60000),ex:true})):[]; return live.concat(ex); }
function feedDlg(){ let d=document.querySelector('#prRoom .p-fdlg'); if(d){ d.remove(); return; } d=el('div','p-fdlg'); d.setAttribute('role','dialog'); d.setAttribute('aria-label','Practice feed');
  d.innerHTML='<div class="p-fbox"><h3>Practice feed</h3><p>When the feed is on, you can see what other students are practicing, and they can see what you are practicing: your nickname, your city, the scale, hands, tempo and rhythm, and how long you have been practicing.</p><p>Use a nickname or pseudonym (like <b>arctic2342</b>) if you would rather not use your name. You can switch the feed off at any time.</p><label>Nickname <input maxlength="24" autocomplete="off" spellcheck="false"></label><div class="p-ferr"></div><div class="p-fbtns"><button type="button" class="p-fon"></button><button type="button" class="p-foff"></button></div></div>';
  const inp=d.querySelector('input'), on=d.querySelector('.p-fon'), off=d.querySelector('.p-foff'), er=d.querySelector('.p-ferr'); inp.value=FD.nick||nickIdea();
  on.textContent=FD.on?'Save nickname':'Turn feed on'; off.textContent=FD.on?'Turn feed off':'Not now';
  on.onclick=()=>{ const n=inp.value.replace(/[^\p{L}\p{N} _.\-]/gu,'').trim(); if(n.length<2){ er.textContent='Choose a nickname of at least 2 letters or numbers.'; return; } FD.nick=n; FD.on=true; fdSave(); d.remove(); feedSync(); if(SES.on&&SES.t0) feedRun(true); };
  off.onclick=()=>{ if(FD.on){ FD.on=false; fdSave(); feedBeat(true); feedRun(false); FEED_LIVE=[]; } d.remove(); feedSync(); };
  d.onclick=e=>{ if(e.target===d) d.remove(); }; inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') on.click(); if(e.key==='Escape') d.remove(); };
  ov.appendChild(d); setTimeout(()=>inp.focus(),30); }
function feedSync(){ document.querySelectorAll('#prRoom .p-feedb').forEach(b=>{ b.classList.toggle('on',!!FD.on); b.title=FD.on?'Practice feed is on as '+FD.nick+'. Click to change or switch off.':'Practice feed is off. Click to see who else is practicing (and be seen).'; }); }
/* the projector turns through three screens while you play: the clocks (15 s), who else is practicing (15 s), then a word of encouragement (8 s) */
const CYC=[['proj',15],['feed',15],['motiv',8]], CYT=CYC.reduce((a,x)=>a+x[1],0);
const flag=cc=>/^[A-Z]{2}$/i.test(cc||'')?String.fromCodePoint(...[...cc.toUpperCase()].map(c=>0x1F1A5+c.charCodeAt(0))):'';
const cname=cc=>{ try{ return new Intl.DisplayNames(['en'],{type:'region'}).of(cc.toUpperCase()); }catch(_){ return cc||''; } };
function watchDraw(){ const w=document.querySelector('#prRoom .p-watch'); if(!w) return; watchPlace(w);
  if(SES.on&&SES.t0&&!PM.mode&&sesSec()>=SES.nextRec){ SES.nextRec=Math.floor(sesSec())+REC; recoverStart(); return; }
  const q=k=>w.querySelector('[data-w='+k+']'), sec=sesSec(), left=goalMin*60-sec;
  let mode=PM.mode; if(!mode){ const t=Math.floor(sec)%CYT; let a=0; mode='proj'; for(const [m,d] of CYC){ if(t<a+d){ mode=m; break; } a+=d; } if(Date.now()<SES.until) mode='proj'; }
  if(w.dataset.mode!==mode){ w.dataset.mode=mode; if(mode==='motiv'){ SES.mi++; q('mot').textContent=MOTIV[SES.mi%MOTIV.length]; } }
  q('sw').textContent=hms(sec); q('cd').textContent=hms(left); q('cd').classList.toggle('done',left<=0); q('gl').textContent=goalMin+' min';
  { const ps=new Intl.DateTimeFormat([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date()); const ap=(ps.find(x=>x.type==='dayPeriod')||{}).value||''; const c=q('clk'); c.textContent=ps.filter(x=>x.type!=='dayPeriod').map(x=>x.value).join('').trim(); if(ap){ const sm=document.createElement('span'); sm.className='p-ap'; sm.textContent=ap; c.appendChild(sm); } } q('tz').textContent=TZ;
  if(left<=0&&!SES.goalDone){ SES.goalDone=true; SES.msg='You reached your practice goal of '+goalMin+' minutes. Well done!'; SES.until=Date.now()+12000; }
  if(Date.now()>SES.until) SES.msg='Practice time '+hms(sec)+'. Keep it up!';
  q('msg').textContent=SES.msg; q('n').textContent=(st.kc?'Rep '+Math.min(st.reps,KC.rep+1)+'/'+st.reps+' · next '+(SYMK(kcNextKey(true)||st.key))+' · ':'')+'Notes '+(SES.lh+SES.rh).toLocaleString()+' · L '+SES.lh.toLocaleString()+' · R '+SES.rh.toLocaleString();
  if(mode==='feed'){ const fl=q('fl'), jb=w.querySelector('.p-fjoin'), items=FD.on?feedItems():[], live=FEED_LIVE.length; jb.hidden=!!FD.on; q('fh').textContent=FD.on?'Practicing now':'Practice feed';
    if(!FD.on){ fl.innerHTML='<div class="p-fi p-foffm">The practice feed is off. Switch it on to see who else is practicing, and to be seen.</div>'; }
    else { const n=MQM.matches?2:3, st0=Math.floor(Date.now()/5000)*n, rows=[]; for(let k=0;k<Math.min(n,items.length);k++) rows.push(items[(st0+k)%items.length]);
      fl.textContent=''; rows.forEach(f=>{ const r=el('div','p-fi'); r.innerHTML='<span class="p-ff"></span><span class="p-fw"></span><span class="p-fx"></span><span class="p-fl"></span>'; r.children[0].textContent=flag(f.cc); r.children[1].textContent=f.who; r.children[2].textContent=f.what; r.children[3].textContent=Math.round(f.min)+' min'; fl.appendChild(r); }); void live; } }
  if(mode==='prompt'){ q('pt').textContent='You have been paused for a while. Practice starts again by itself in '+Math.max(0,Math.ceil((PM.end-Date.now())/1000))+' seconds.'; }
  if(mode==='count'){ q('cnt').textContent=String(Math.max(1,Math.ceil((PM.end-Date.now())/1000))); }
  if(mode==='recover'){ const rem=Math.max(0,(PM.end-Date.now())/1000), C=2*Math.PI*52; q('rring').style.strokeDasharray=C.toFixed(1); q('rring').style.strokeDashoffset=(C*(1-rem/RECS)).toFixed(1); q('rt').textContent=hms(rem).replace(/^00:/,'0:');
    const ro=q('rout'), list=ROUT.length?ROUT:[snapNow()]; ro.textContent=''; ro.appendChild(el('b',null,'Routine')); list.forEach((x,i)=>{ const c=el('span','p-rc'+(i===RI?' cur':''+(i===(RI+1)%list.length&&list.length>1?' nx':'')),snapName(x)); ro.appendChild(c); }); }
  if(mode==='break'){ const rem=Math.max(0,(PM.end-Date.now())/1000), f=PM.total?rem/PM.total:0, C=2*Math.PI*52; q('ring').style.strokeDasharray=C.toFixed(1); q('ring').style.strokeDashoffset=(C*(1-f)).toFixed(1); q('bt').textContent=hms(rem).replace(/^00:/,'0:'); q('bl').textContent=(breakSec%60?Math.floor(breakSec/60)+':'+two(breakSec%60):breakSec/60+' min')+' default'; } }
/* while paused: after a minute it asks if you are ready; a minute later it counts 5 4 3 2 1 and carries on. Break shows a circle that unwinds over the break time. */
let breakSec=(()=>{ try{ const b=+localStorage.getItem('pr-break'); return b>=30&&b<=900?b:60; }catch(_){ return 60; } })();
const PM={mode:'',end:0,total:0,t:0};
function pmClear(){ clearTimeout(PM.t); PM.t=0; PM.mode=''; PM.end=0; PM.hold=0; PM.last=0; }
function pmTick(){ clearTimeout(PM.t); PM.t=0; if(!SES.on||!paused){ pmClear(); return; } const now=Date.now(), dt=PM.last?now-PM.last:0; PM.last=now;
  if(document.hidden&&PM.mode!=='break'){ PM.end+=dt; if(PM.hold) PM.hold=PM.hold; PM.t=setTimeout(pmTick,500); return; }
  if(document.hidden&&PM.mode==='break'&&now>=PM.end){ PM.t=setTimeout(pmTick,500); return; }
  if(PM.mode==='idle'){ if(now>=PM.end){ PM.mode='prompt'; PM.end=now+60000; watchSync(); } }
  else if(PM.mode==='prompt'||PM.mode==='break'){ if(now>=PM.end){ countIn(); return; } }
  else if(PM.mode==='recover'){ if(PM.hold) PM.end=now+PM.hold; else if(now>=PM.end){ recoverEnd(); return; } }
  else if(PM.mode==='count'){ if(now>=PM.end){ resumeNow(); return; } }
  watchDraw(); PM.t=setTimeout(pmTick,200); }
function pmIdle(){ pmClear(); PM.mode='idle'; PM.end=Date.now()+60000; PM.t=setTimeout(pmTick,200); }
function countIn(){ PM.mode='count'; PM.end=Date.now()+5000; watchSync(); clearTimeout(PM.t); PM.t=setTimeout(pmTick,100); }
function takeBreak(){ if(!SES.on||!paused) return; PM.mode='break'; PM.total=breakSec; PM.end=Date.now()+breakSec*1000; watchSync(); clearTimeout(PM.t); PM.t=setTimeout(pmTick,100); }
function resumeNow(){ pmClear(); if(playing&&paused&&pauseFn) pauseFn(); }
/* recovery: after every two minutes of playing, practice stops for 30 seconds (the circle unwinds). Press + to add another scale to the
   routine; when practice carries on it moves to the next scale in the routine. The routine lasts for this session. */
let ROUT=[], RI=0, SWITCHING=false; const REC=120, RECS=30;
function recoverStart(){ if(!SES.on||!playing||paused||waitL||!pauseFn) return; pauseFn(); clearTimeout(PM.t); PM.mode='recover'; PM.total=RECS; PM.end=Date.now()+RECS*1000; PM.hold=0; watchSync(); PM.t=setTimeout(pmTick,100); }
function recoverEnd(){ const w=document.querySelector('#prRoom .p-watch'); if(w) addPick(w,false); pmClear();
  if(ROUT.length>1){ RI=(RI+1)%ROUT.length; const snap=ROUT[RI]; SWITCHING=true; try{ clr(); BKEYS.forEach(k=>{ if(snap[k]!==undefined) st[k]=snap[k]; }); save(); render(); playAll(); } finally{ SWITCHING=false; } updPause(); return; }
  resumeNow(); }
const snapNow=()=>{ const o={}; BKEYS.forEach(k=>o[k]=st[k]); return o; };
const snapName=x=>{ const t=((window.SCALES&&SCALES.types)||[]).find(q=>q.id===x.type); return SYMK(x.key)+' '+(x.type==='major'?'major':(t?t.l:x.type)); };
function addPick(w,on){ const pk=w.querySelector('.p-apick'), ad=w.querySelector('.p-add'); if(!pk) return; if(!on){ pk.hidden=true; ad.hidden=false; if(PM.hold){ PM.end=Date.now()+PM.hold; PM.hold=0; } return; }
  if(PM.mode==='recover'&&!PM.hold){ PM.hold=Math.max(1000,PM.end-Date.now()); }   /* the countdown waits while you choose */
  const SC=window.SCALES, ts=(SC&&SC.types)||[], ks=w.querySelector('[data-w=ak]'), tsel=w.querySelector('[data-w=at]');
  tsel.textContent=''; let og=null,gl=null; ts.forEach(t=>{ if(t.g!==gl){ gl=t.g; og=document.createElement('optgroup'); og.label=(t.fam==='exotic'?'Exotic · ':'')+(t.g||''); tsel.appendChild(og); } const o=document.createElement('option'); o.value=t.id; o.textContent=t.l; og.appendChild(o); }); tsel.value=st.type;
  const fillK=()=>{ const ok=(SC&&SC.allowedKeys)?SC.allowedKeys(tsel.value):((SC&&SC.keys)||[]); const cur=ks.value; ks.textContent=''; ok.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=SYMK(k); ks.appendChild(o); });
    const pc=k=>{ const L={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[String(k)[0]]; let a=0; for(const ch of String(k).slice(1)){ if(ch==='#'||ch==='♯') a++; if(ch==='b'||ch==='♭') a--; } return ((L+a)%12+12)%12; }, want=(pc(st.key)+7)%12, nx=ok.find(k=>pc(k)===want); ks.value=ok.includes(cur)?cur:(nx||ok[0]); };   /* suggests the key a fifth up */
  tsel.onchange=fillK; ks.value=''; fillK(); pk.hidden=false; ad.hidden=true; }
function addScale(w){ const ks=w.querySelector('[data-w=ak]'), tsel=w.querySelector('[data-w=at]'); if(!ks.value) return; if(!ROUT.length){ ROUT=[snapNow()]; RI=0; }
  const t=((window.SCALES&&SCALES.types)||[]).find(q=>q.id===tsel.value)||{}; ROUT.push(Object.assign(snapNow(),{key:ks.value,type:tsel.value,family:t.fam||st.family})); addPick(w,false); watchDraw(); }
function watchSync(){ if(!ov) return; const sc=kind==='scales';
  if(playing&&sc&&!SES.on){ ROUT=[]; RI=0; KC.origin=pcOf(st.key); KC.i=0; KC.rep=0; KC.base=tonicOf(); Object.assign(SES,{nextRec:REC,on:true,ms:0,t0:0,lh:0,rh:0,next:100,msg:'',until:0,mi:Math.floor(Math.random()*MOTIV.length),goalDone:false}); clearInterval(SES.timer); SES.timer=setInterval(()=>{ if(SES.on) watchDraw(); },250); }
  if(SES.on&&(!playing||!sc)&&!SWITCHING){ pmClear(); ROUT=[]; RI=0; { const bk=$('#prBreak'); if(bk) bk.hidden=true; } if(SES.t0){ SES.ms+=Date.now()-SES.t0; SES.t0=0; } SES.on=false; clearInterval(SES.timer); feedRun(false); if(FD.on) feedBeat(true); const w=document.querySelector('#prRoom .p-watch'); if(w) w.remove(); ov.classList.remove('p-locked'); { const c=document.querySelector('#prRoom .p-con'); if(c) c.classList.remove('p-hide'); }
    const tot=SES.lh+SES.rh, m=$('#prMsg'); if(m&&tot) m.textContent='Practice session: '+hms(SES.ms/1000)+' · '+tot.toLocaleString()+' notes'+(SES.lh&&SES.rh?' (left hand '+SES.lh.toLocaleString()+', right hand '+SES.rh.toLocaleString()+')':'')+'. Well done!'; return; }
  if(!SES.on) return;
  const run=!paused, was=!!SES.t0; if(run&&!SES.t0) SES.t0=Date.now(); if(!run&&SES.t0){ SES.ms+=Date.now()-SES.t0; SES.t0=0; } if(run!==was){ if(run){ feedRun(true); pmClear(); } else { feedRun(false); if(FD.on) feedBeat(true); pmIdle(); } }
  if(SWITCHING) return; const show=run||['prompt','count','break','recover'].includes(PM.mode); const w=watchEl(); if(w){ w.hidden=!show; watchPlace(w); } ov.classList.toggle('p-locked',show); { const bk=$('#prBreak'); if(bk) bk.hidden=run||PM.mode==='break'||PM.mode==='count'||PM.mode==='recover'; } watchDraw(); if(run) meterGo(); }
const playPause=()=>{ if(!playing){ playAll(); updPause(); return; } if(waitL) return; if(pauseFn) pauseFn(); };
const killCh=()=>{ try{ chBus.forEach(b=>CLASS.clock.kill(b)); }catch(_){} chBus=[]; bassFO=null; chBeat=0; };
const clr=()=>{ curDesc=false; killCh(); timers.forEach(x=>{ if(x&&x.clear) x.clear(); else clearTimeout(x); }); timers=[]; playing=false; paused=false; waitL=false; pauseFn=null; try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(false); }catch(_){} updPause(); const lp=document.getElementById('prLearn'); if(lp) lp.hidden=true; const b=$('#prPlay'); if(b) b.textContent='▶ Play'; };

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
/* tempo: a mixer-style fader with a digital BPM readout */ #prRoom .p-tempo input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:30px;cursor:pointer} #prRoom .p-tempo input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.28) 0 1px,transparent 1px 10%) 0 100%/100% 100% no-repeat,#05070c;box-shadow:inset 0 1px 3px rgba(0,0,0,.9),0 1px 0 rgba(255,255,255,.08);border:1px solid #2b3245} #prRoom .p-tempo input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.28) 0 1px,transparent 1px 10%),#05070c;border:1px solid #2b3245} #prRoom .p-tempo input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:30px;margin-top:-12px;border-radius:3px;border:1px solid #11141c;background:linear-gradient(90deg,transparent 7px,#ffd43b 7px 9px,transparent 9px),linear-gradient(180deg,#f2f4f8,#aab1bf 45%,#7d8596 55%,#c9ced8);box-shadow:0 3px 6px rgba(0,0,0,.6)} #prRoom .p-tempo input[type=range]::-moz-range-thumb{width:16px;height:30px;border-radius:3px;border:1px solid #11141c;background:linear-gradient(90deg,transparent 7px,#ffd43b 7px 9px,transparent 9px),linear-gradient(180deg,#f2f4f8,#aab1bf 45%,#7d8596 55%,#c9ced8);box-shadow:0 3px 6px rgba(0,0,0,.6)} #prRoom .p-tempo .p-bpm{display:inline-flex;align-items:baseline;gap:4px;min-width:74px;justify-content:center;padding:4px 10px;border-radius:6px;background:#04060a;border:1px solid #2b3245;box-shadow:inset 0 0 10px rgba(0,0,0,.9);color:#ffd43b;font:700 20px/1.1 ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;letter-spacing:.04em;text-shadow:0 0 8px rgba(255,212,59,.45)} #prRoom .p-tempo .p-bpm::after{content:'BPM';font:700 9px var(--body);letter-spacing:.12em;color:#8a7a3a;text-shadow:none} #prRoom .p-tempo{color:#d9deea} html.ps-rot #prRoom .p-tempo .p-bpm{font-size:15px;min-width:58px;padding:2px 6px} #prRoom .p-rng input[type=checkbox]{width:18px;height:18px;accent-color:var(--hi,#ffd43b)}
#prRoom .e-kb .e-lbl{gap:12px;flex-wrap:wrap} #prRoom[data-kind=chords] .e-big{font-size:clamp(26px,3.4vw,44px)!important;line-height:1.05} #prRoom[data-kind=chords] .e-now{margin-bottom:6px} html.ps-rot #prRoom[data-kind=chords] .e-now>div:first-child{display:none} @media (max-height:520px) and (pointer:coarse){ #prRoom[data-kind=chords] .e-now>div:first-child{display:none} } #prRoom[data-kind=chords] .p-chips:empty{display:none} #prRoom[data-kind=chords] .e-msg:empty{display:none} #prRoom .e-top .p-motop{margin-right:10px} #prRoom .p-motop+#prHand{margin-left:0} @media (min-width:900px){ html:not(.ps-rot) #prRoom[data-kind=scales] .e-ctl .e-seg button,html:not(.ps-rot) #prRoom[data-kind=scales] .e-top .p-motop button{font-size:13px!important;padding:6px 12px!important;min-height:30px!important} html:not(.ps-rot) #prRoom[data-kind=scales] .e-ctl .e-seg,html:not(.ps-rot) #prRoom[data-kind=scales] .e-top .p-motop{padding:3px!important} html:not(.ps-rot) #prRoom[data-kind=scales] #prHand button{font-size:13px!important;padding:6px 12px!important;min-height:30px!important} html:not(.ps-rot) #prRoom[data-kind=scales] #prHand{padding:3px!important} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-sel-d select{font-size:15px!important;min-height:42px!important} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-sel-d select{text-overflow:ellipsis} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-octs select,html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-octs .e-btn{font-size:15px!important;min-height:42px!important} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0{gap:10px 8px;flex-wrap:nowrap} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-rng{font-size:12px;gap:8px} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-rng input[type=range]{width:70px} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-tempo .p-bpm{font-size:18px;min-width:62px;padding:3px 8px} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-rng{letter-spacing:.02em;gap:6px} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-octs{min-width:0;width:122px;flex:none} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r0 .p-octs select{width:100%} html:not(.ps-rot) #prRoom[data-kind=scales] #prPlay{font-size:20px!important;padding:14px 26px!important;min-height:56px!important;font-weight:800;box-shadow:0 6px 20px rgba(233,196,106,.25)} html:not(.ps-rot) #prRoom[data-kind=scales] #prPause{font-size:15px!important;padding:10px 20px!important;min-height:44px!important} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r4 .e-btn{font-size:13px!important;padding:7px 14px!important;min-height:32px!important;border-color:rgba(255,255,255,.14)!important;color:#c9c4b6!important;background:transparent!important} html:not(.ps-rot) #prRoom[data-kind=scales] .p-r4{margin-top:4px} } #prRoom[data-kind=scales] #prLbl:empty{display:none} #prRoom #prDots{display:none!important} #prRoom .p-src{display:none!important} #prRoom .p-mixrow{display:flex;align-items:center;gap:12px;flex-basis:100%;width:100%;margin-top:4px} #prRoom .p-tp{display:flex;flex-direction:column;gap:8px;align-items:stretch} #prRoom .p-con{display:flex;flex-direction:column;border-radius:12px;border:1px solid #2b3245;background:linear-gradient(180deg,#1c2130,#0d1018);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 8px 22px rgba(0,0,0,.45);min-width:0}
#prRoom .p-mix{display:flex;align-items:stretch;padding:10px 6px 10px}
#prRoom .p-con.p-hide{visibility:hidden;position:absolute} #prRoom .p-ch{position:relative;padding:0 5px;min-width:72px;outline:none;border-right:1px solid rgba(255,255,255,.07)} #prRoom .p-ch:last-child{border-right:0} #prRoom .p-ch:focus-visible{box-shadow:inset 0 0 0 2px var(--hi,#ffd43b);border-radius:8px} #prRoom .p-ch.off{opacity:.35} #prRoom .p-cht{font:800 9px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#8d97b0;margin:0 0 8px;white-space:nowrap} #prRoom .p-fz{position:relative;touch-action:none;cursor:ns-resize;min-height:44px} #prRoom .p-tr{position:absolute;left:9px;top:5px;bottom:5px;width:6px;border-radius:3px;background:#03050a;box-shadow:inset 0 1px 3px rgba(0,0,0,.9),0 0 0 1px #2b3245} #prRoom .p-tick{position:absolute;left:1px;width:22px;height:1px;background:rgba(255,255,255,.22);transform:translateY(-.5px)} #prRoom .p-cap{position:absolute;left:0;width:24px;height:14px;transform:translateY(-50%);border-radius:3px;border:1px solid #0b0d12;background:linear-gradient(180deg,transparent 6px,#ffd43b 6px 8px,transparent 8px),linear-gradient(180deg,#f3f5f9,#b2b9c6 45%,#7e8697 55%,#cdd2dc);box-shadow:0 3px 6px rgba(0,0,0,.65);transition:top .16s ease;pointer-events:none} #prRoom .p-cap.drag{box-shadow:0 4px 10px rgba(0,0,0,.8),0 0 0 2px rgba(255,212,59,.5)} #prRoom .p-opt{position:absolute;left:30px;transform:translateY(-50%);background:none;border:0;padding:2px 3px;font:600 11.5px var(--body);color:#8d97b0;white-space:nowrap;cursor:pointer;border-radius:4px} #prRoom .p-opt:hover:not(:disabled){color:#e6e9f2} #prRoom .p-opt.on,#prRoom .p-opt.on:hover{color:var(--hi,#ffd43b)!important;font-weight:800;text-shadow:0 0 8px rgba(255,212,59,.35)} #prRoom .p-opt:disabled{opacity:.4;cursor:not-allowed} #prRoom .p-r4{display:flex;gap:10px;flex-wrap:wrap;flex-basis:100%;width:100%} #prRoom .p-r0{display:flex;align-items:flex-end;gap:14px 22px;flex-wrap:wrap;flex-basis:100%;width:100%} #prRoom .p-r0 .p-rng{align-self:center;margin-bottom:4px} #prRoom .p-lvl{min-width:42px!important;padding:0 6px;text-align:left} #prRoom .p-lvl1{border-left:2px solid rgba(255,255,255,.14)} #prRoom .p-lvl .p-fz{cursor:ns-resize} #prRoom .p-lvn{margin-top:2px;width:30px;text-align:center;padding:1px 0;border-radius:4px;background:#04060a;border:1px solid #2b3245;color:#ffd43b;font:700 11px/1.3 ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums} #prRoom .p-vol span{font-size:11px} #prRoom .p-vol input[type=range]{width:64px}
#prRoom .p-mixrow{gap:8px!important} #prRoom .p-tp{width:130px;flex:none} #prRoom .p-tp .e-btn{white-space:nowrap;padding-left:8px!important;padding-right:8px!important}
#prRoom .p-bcol{display:flex;flex-direction:column;gap:5px}
#prRoom .p-key{display:flex;align-items:center;gap:5px;min-height:22px;padding:3px 7px 3px 6px;border-radius:5px;border:1px solid #070910;background:linear-gradient(180deg,#2a3042,#1a1f2c);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 2px 3px rgba(0,0,0,.55);color:#9aa3ba;font:700 11px var(--body);white-space:nowrap;cursor:pointer;text-align:left;transition:transform .05s}
#prRoom .p-key:hover:not(:disabled){color:#e6e9f2}
#prRoom .p-key:active:not(:disabled){transform:translateY(1px);box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
#prRoom .p-key:disabled{opacity:.35;cursor:not-allowed} #prRoom .p-key.p-nope{animation:pkNope .3s} @keyframes pkNope{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
#prRoom .p-led{flex:none;width:7px;height:7px;border-radius:50%;background:#123018;box-shadow:inset 0 1px 1px rgba(0,0,0,.8)}
#prRoom .p-key.on{color:#eafff0;background:linear-gradient(180deg,#323a4f,#222838)}
#prRoom .p-key.on .p-led{background:#3dff6e;box-shadow:0 0 6px 1px rgba(61,255,110,.85),0 0 14px rgba(61,255,110,.45)}
#prRoom .p-key:focus-visible{outline:2px solid var(--hi,#ffd43b);outline-offset:1px}
#prRoom .p-mix .p-cht{cursor:grab;user-select:none;touch-action:none;padding:2px 0}
#prRoom .p-mix .p-cht::before{content:'⠿ ';color:#55607a;letter-spacing:0}
#prRoom .p-ch.p-drag{opacity:.85;transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.6),0 0 0 1px rgba(255,212,59,.5);border-radius:8px;background:#1d2232;z-index:2}
#prRoom .p-ch.p-drag .p-cht{cursor:grabbing}
#prRoom .p-mixrow.ph{gap:6px!important;margin-top:2px;align-items:stretch}
#prRoom .p-mixrow.ph .p-mix{padding:5px 2px 4px;overflow-x:auto;scrollbar-width:none;min-width:0}
#prRoom .p-mixrow.ph .p-ch{padding:0 3px;min-width:0!important}
#prRoom .p-mixrow.ph .p-cht{font-size:7.5px;letter-spacing:.1em;margin:0 0 3px}
#prRoom .p-mixrow.ph .p-bcol{gap:2px} #prRoom .p-mixrow.ph .p-b2{display:grid;grid-template-columns:auto auto;grid-auto-flow:column;grid-template-rows:repeat(3,auto);gap:2px 3px}
#prRoom .p-mixrow.ph .p-key{min-height:15px;padding:1px 5px 1px 4px;gap:3px;font-size:9px;border-radius:3px}
#prRoom .p-mixrow.ph .p-led{width:5px;height:5px}
#prRoom .p-mixrow.ph .p-lvl{min-width:30px!important}
#prRoom .p-mixrow.ph .p-lvn{width:24px;font-size:9px}
#prRoom .p-mixrow.ph .p-tp{width:84px;justify-content:center;gap:5px}
#prRoom .p-mixrow.ph .p-tp{display:flex;flex-direction:column;gap:6px;width:96px;justify-content:center} #prRoom .p-mixrow.ph .p-tp #prPlay{grid-column:1/-1} #prRoom .p-mixrow.ph .p-tp .e-btn{font-size:12px!important;min-height:24px!important;padding:3px 6px!important;margin:0!important} #prRoom .p-mixrow.ph .p-tp #prPlay{font-size:14px!important;min-height:32px!important}
#prRoom .p-banks{display:inline-flex;align-items:center;gap:5px;margin-left:auto;padding:5px 8px;border-radius:9px;border:1px solid #2b3245;background:linear-gradient(180deg,#1c2130,#0d1018)}
#prRoom .p-bl{font:800 9px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#8d97b0;margin-right:3px}
#prRoom .p-bank,#prRoom .p-bsave{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:2px 9px 2px 7px;border-radius:5px;border:1px solid #070910;background:linear-gradient(180deg,#2a3042,#1a1f2c);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 2px 3px rgba(0,0,0,.55);color:#69728a;font:800 12px ui-monospace,'SF Mono',Menlo,Consolas,monospace;cursor:pointer}
#prRoom .p-bank.has{color:#e6e9f2} #prRoom .p-bank.has .p-led{background:#5a4a12;box-shadow:0 0 4px rgba(255,212,59,.5)}
#prRoom .p-bank.on .p-led{background:#3dff6e;box-shadow:0 0 6px 1px rgba(61,255,110,.85),0 0 14px rgba(61,255,110,.45)}
#prRoom .p-bank:active,#prRoom .p-bsave:active{transform:translateY(1px)}
#prRoom .p-bsave{font:800 10px var(--body);letter-spacing:.12em;text-transform:uppercase;color:#ff8a8a;margin-left:4px}
#prRoom .p-banks.arm .p-bsave{background:#c92a2a;color:#fff;animation:pbArm .7s steps(2) infinite}
#prRoom .p-banks.arm .p-bank{box-shadow:0 0 0 1px rgba(255,107,107,.6),0 2px 3px rgba(0,0,0,.55)}
@keyframes pbArm{50%{background:#5c1414}}
#prRoom .p-mixrow.ph{position:relative}
#prRoom .p-mempop{position:absolute;right:0;bottom:calc(100% + 6px);z-index:30;box-shadow:0 10px 30px rgba(0,0,0,.6)}
#prRoom .p-mempop .p-banks{margin:0}
#prRoom .p-mixrow.ph .p-tp .p-memb[aria-expanded=true]{background:var(--hi,#ffd43b)!important;color:#151b28!important}
#prRoom .p-lvl{min-width:50px!important}
#prRoom .p-mtr{position:absolute;left:30px;width:7px;display:flex;flex-direction:column;gap:2px;pointer-events:none}
#prRoom .p-mtr i{flex:1;border-radius:1.5px;background:#0c2412;box-shadow:inset 0 0 0 1px rgba(0,0,0,.5)}
#prRoom .p-mtr i.a{background:#2e2408} #prRoom .p-mtr i.r{background:#2c0b0b}
#prRoom .p-mtr i.g.lit{background:#3dff6e;box-shadow:0 0 5px rgba(61,255,110,.7)}
#prRoom .p-mtr i.a.lit{background:#ffb627;box-shadow:0 0 5px rgba(255,182,39,.7)}
#prRoom .p-mtr i.r.lit{background:#ff3b3b;box-shadow:0 0 5px rgba(255,59,59,.75)}
#prRoom .p-mixrow.ph .p-lvl{min-width:40px!important} #prRoom .p-mixrow.ph .p-mtr{left:27px;width:5px;gap:1px}
#prRoom .p-mixrow{position:relative}
#prRoom .p-watch{position:absolute;z-index:20;display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:12px;border:1px solid #3a4258;background:linear-gradient(180deg,rgba(22,27,40,.97),rgba(9,11,18,.97));box-shadow:0 12px 30px rgba(0,0,0,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:pwIn .18s ease-out}
@keyframes pwIn{from{opacity:0;transform:translateY(6px)}}
#prRoom .p-wps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;flex:1;min-height:0}
#prRoom .p-wp{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 6px;border-radius:9px;background:#04060a;border:1px solid #2b3245;box-shadow:inset 0 0 14px rgba(0,0,0,.9);min-width:0}
#prRoom .p-wp b{font:800 9px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#8d97b0}
#prRoom .p-wd{font:700 34px/1 ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;color:#ffd43b;text-shadow:0 0 10px rgba(255,212,59,.45);letter-spacing:.03em;white-space:nowrap}
#prRoom .p-wd[data-w=sw]{color:#3dff6e;text-shadow:0 0 10px rgba(61,255,110,.45)} #prRoom .p-wd[data-w=clk]{color:#7cc4ff;text-shadow:0 0 10px rgba(124,196,255,.45)} #prRoom .p-wd.done{color:#3dff6e} #prRoom .p-ap{font-size:.42em;margin-left:5px;letter-spacing:.06em}
#prRoom .p-wp small{font:600 11px var(--body);color:#8d97b0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#prRoom .p-wg{display:flex;align-items:center;gap:8px} #prRoom .p-wg button{width:22px;height:20px;padding:0;border-radius:4px;border:1px solid #2b3245;background:#1a1f2c;color:#e6e9f2;font:700 13px var(--body);cursor:pointer}
#prRoom .p-wm{display:flex;align-items:center;gap:12px;justify-content:space-between;font:600 13.5px var(--body);color:#e6e9f2}
#prRoom .p-wm [data-w=msg]{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#prRoom .p-wn{flex:none;font:700 12px ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#ffd43b}
#prRoom.p-locked .p-r0,#prRoom.p-locked .p-r1,#prRoom.p-locked .p-banks,#prRoom.p-locked .p-memb,#prRoom.p-locked #prStudio{pointer-events:none;opacity:.4}
#prRoom .p-watch.ph{padding:5px 6px;gap:4px;border-radius:9px} #prRoom .p-watch.ph .p-wps{gap:5px} #prRoom .p-watch.ph .p-wp{padding:3px;gap:2px}
#prRoom .p-watch.ph .p-wd{font-size:19px} #prRoom .p-watch.ph .p-wp b{font-size:7.5px} #prRoom .p-watch.ph .p-wp small{font-size:9px} #prRoom .p-watch.ph .p-wm{font-size:10.5px;gap:6px} #prRoom .p-watch.ph .p-wn{font-size:9.5px}
#prRoom .p-watch.ph .p-wg button{width:18px;height:16px;font-size:11px;min-height:0}
#prRoom .p-cbar{display:flex;flex-wrap:wrap;row-gap:6px;align-items:center;gap:5px;padding:7px 6px;border-top:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.18);border-radius:0 0 12px 12px}
#prRoom .p-cbar .p-banks{margin:0;padding:0;border:0;background:none;flex:0 1 auto;gap:4px} #prRoom .p-cbar .p-bank{padding:2px 7px 2px 6px} #prRoom .p-cbar .p-pow,#prRoom .p-cbar .p-ubtn{padding:2px 8px 2px 7px} #prRoom .p-cbar .p-bl{margin-right:1px}
#prRoom .p-sp{flex:1}
#prRoom .p-pow,#prRoom .p-ubtn,#prRoom .p-tapw{display:inline-flex;align-items:center;gap:6px;min-height:26px;padding:2px 10px 2px 8px;border-radius:5px;border:1px solid #070910;background:linear-gradient(180deg,#2a3042,#1a1f2c);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 2px 3px rgba(0,0,0,.55);color:#c9cfdd;font:800 10px var(--body);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;white-space:nowrap}
#prRoom .p-ubtn{letter-spacing:.04em;text-transform:none;font-size:12px;color:#e6e9f2}
#prRoom .p-ubtn:disabled{opacity:.4;cursor:not-allowed}
#prRoom .p-pow .p-led{background:#3a0d0d} #prRoom .p-pow.on .p-led{background:#3dff6e;box-shadow:0 0 6px 1px rgba(61,255,110,.85)}
#prRoom .p-pow:active,#prRoom .p-ubtn:active,#prRoom .p-tapw:active{transform:translateY(1px)}
#prRoom .p-bsave{color:#5dff8a!important} #prRoom .p-banks.arm .p-bsave{background:#1f9e46!important;color:#fff!important;animation:pbArmG .7s steps(2) infinite}
#prRoom .p-bdel{display:inline-flex;align-items:center;min-height:26px;padding:2px 9px;border-radius:5px;border:1px solid #070910;background:linear-gradient(180deg,#2a3042,#1a1f2c);box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 2px 3px rgba(0,0,0,.55);font:800 10px var(--body);letter-spacing:.12em;text-transform:uppercase;color:#ff6b6b;cursor:pointer}
#prRoom .p-banks.del .p-bdel{background:#c92a2a;color:#fff;animation:pbArm .7s steps(2) infinite} #prRoom .p-banks.del .p-bank.has{box-shadow:0 0 0 1px rgba(255,107,107,.7),0 2px 3px rgba(0,0,0,.55)}
#prRoom .p-banks.arm .p-bank{box-shadow:0 0 0 1px rgba(61,255,110,.55),0 2px 3px rgba(0,0,0,.55)!important}
@keyframes pbArmG{50%{background:#0f4a22}}
#prRoom .p-sum{display:none;padding:12px 14px;font:700 13px var(--body);color:#c9cfdd;letter-spacing:.02em}
#prRoom .p-con.off .p-mix{display:none} #prRoom .p-con.off .p-sum{display:block} #prRoom .p-con.off .p-cbar{border-top:0}
#prRoom .p-ch.p-lock .p-key{opacity:1!important;cursor:not-allowed} #prRoom .p-ch.p-lock .p-cht::after{content:' 🔒';font-size:9px}
#prRoom .p-tapw{margin-left:6px;color:#e6e9f2} #prRoom .p-tapw .p-led{background:#4a1515}
@keyframes pTap{0%{background:#ff4040;box-shadow:0 0 7px 2px rgba(255,64,64,.85)}25%,100%{background:#4a1515;box-shadow:none}}
#prRoom.p-locked .p-cbar{pointer-events:none;opacity:.4} #prRoom.p-locked .p-tapw{pointer-events:none;opacity:.4}
#prRoom.p-locked .p-lvl{z-index:21;background:linear-gradient(180deg,#1c2130,#0d1018)}
#prRoom .p-watch.flow{position:static;flex:1 1 auto;min-height:170px;min-width:0;order:1} #prRoom .p-mixrow .p-tp{order:2} #prRoom .p-r0 .p-tempo input[type=range]{width:92px!important} #prRoom .p-r0 .p-tapw{margin-left:0}
#prRoom .p-feed{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:7px;background:#04060a;border:1px solid #2b3245;font:600 12.5px var(--body);color:#c9cfdd;min-width:0;white-space:nowrap;overflow:hidden}
#prRoom .p-feed b{font:800 9px var(--body);letter-spacing:.14em;text-transform:uppercase;color:#3dff6e;flex:none} #prRoom .p-feed b::before{content:'● ';animation:pbArm 1.2s steps(2) infinite}
#prRoom .p-feed em{font:800 8.5px var(--body);font-style:normal;letter-spacing:.12em;text-transform:uppercase;color:#151b28;background:#8d97b0;border-radius:3px;padding:1px 5px;flex:none}
#prRoom .p-fw{font-weight:800;color:#fff;flex:none} #prRoom .p-fx{min-width:0;overflow:hidden;text-overflow:ellipsis} #prRoom .p-fl{margin-left:auto;flex:none;font:700 11.5px ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#ffd43b}
#prRoom .p-mixrow.ph .p-con{flex:1 1 auto;min-width:0} #prRoom .p-mixrow.ph .p-cbar{gap:4px;padding:3px 4px} #prRoom .p-mixrow.ph .p-cbar .p-bl{display:none}
#prRoom .p-mixrow.ph .p-pow,#prRoom .p-mixrow.ph .p-ubtn,#prRoom .p-mixrow.ph .p-bank,#prRoom .p-mixrow.ph .p-bsave,#prRoom .p-mixrow.ph .p-bdel{min-height:19px!important;padding:1px 5px!important;font-size:9px!important;gap:3px}
#prRoom .p-mixrow.ph .p-banks{gap:3px} #prRoom .p-watch.ph .p-feed{padding:2px 6px;font-size:10px;gap:5px} #prRoom .p-watch.ph .p-feed b{font-size:7.5px} #prRoom .p-watch.ph .p-fl{font-size:9.5px} #prRoom .p-watch.ph .p-feed em{font-size:7px}
#prRoom .p-watch.ph.flow{min-height:110px}
#prRoom .p-feedb .p-led{background:#123018} #prRoom .p-feedb.on .p-led{background:#3dff6e;box-shadow:0 0 6px 1px rgba(61,255,110,.85)}
#prRoom .p-fjoin{margin-left:auto;flex:none;padding:2px 9px;border-radius:5px;border:0;background:#1f9e46;color:#fff;font:800 10px var(--body);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
#prRoom .p-fdlg{position:fixed;inset:0;z-index:300;display:grid;place-items:center;background:rgba(3,5,10,.6)}
#prRoom .p-fbox{width:min(460px,92vw);max-height:90vh;overflow:auto;padding:22px 24px;border-radius:16px;border:1px solid #3a4258;background:#121726;color:#e6e9f2;box-shadow:0 20px 50px rgba(0,0,0,.6);font:500 14.5px/1.5 var(--body)}
#prRoom .p-fbox h3{margin:0 0 10px;font:800 20px var(--display,var(--body))} #prRoom .p-fbox p{margin:0 0 10px;color:#c9cfdd}
#prRoom .p-fbox label{display:grid;gap:5px;margin-top:6px;font:800 10px var(--body);letter-spacing:.14em;text-transform:uppercase;color:#8d97b0}
#prRoom .p-fbox input{padding:9px 12px;border-radius:9px;border:1px solid #3a4258;background:#05070c;color:#fff;font:700 16px var(--body);letter-spacing:0;text-transform:none}
#prRoom .p-ferr{min-height:18px;color:#ff8a8a;font-size:12.5px;margin-top:4px} #prRoom .p-fbtns{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
#prRoom .p-fbtns button{padding:9px 16px;border-radius:999px;border:1px solid #3a4258;background:#1a1f2c;color:#e6e9f2;font:800 14px var(--body);cursor:pointer} #prRoom .p-fbtns .p-fon{background:#1f9e46;border-color:#1f9e46;color:#fff}
#prRoom .p-pwr svg{width:13px;height:13px} #prRoom .p-pwr .p-led{background:#ff3b3b;box-shadow:0 0 6px 1px rgba(255,59,59,.8)} #prRoom .p-pwr.on .p-led{background:#3dff6e;box-shadow:0 0 6px 1px rgba(61,255,110,.85)}
#prRoom .p-con.off .p-mix{display:flex!important} #prRoom .p-con.off .p-sum{display:none!important} #prRoom .p-con.off .p-cbar{border-top:1px solid rgba(255,255,255,.07)!important}
#prRoom .p-con.off .p-mix,#prRoom .p-con.off .p-cbar>*:not(.p-pwr){pointer-events:none}
#prRoom .p-con.off .p-led,#prRoom .p-con.off .p-key.on .p-led,#prRoom .p-con.off .p-bank.has .p-led,#prRoom .p-con.off .p-mtr i.lit{background:#10141c!important;box-shadow:inset 0 1px 1px rgba(0,0,0,.8)!important}
#prRoom .p-con.off .p-pwr .p-led{background:#ff3b3b!important;box-shadow:0 0 6px 1px rgba(255,59,59,.8)!important}
#prRoom .p-con.off .p-key,#prRoom .p-con.off .p-key.on,#prRoom .p-con.off .p-bank,#prRoom .p-con.off .p-bsave,#prRoom .p-con.off .p-bdel,#prRoom .p-con.off .p-ubtn,#prRoom .p-con.off .p-feedb{color:#555e72!important;background:linear-gradient(180deg,#22283a,#171b26)!important}
#prRoom .p-con.off .p-lvn{color:#3a3f4c!important;text-shadow:none} #prRoom .p-con.off .p-cht{color:#4f586c}
#prRoom .p-wv{display:none;flex:1;min-height:0} #prRoom .p-watch[data-mode=proj] .p-wv-proj,#prRoom .p-watch[data-mode=feed] .p-wv-feed,#prRoom .p-watch[data-mode=motiv] .p-wv-motiv,#prRoom .p-watch[data-mode=prompt] .p-wv-prompt,#prRoom .p-watch[data-mode=count] .p-wv-count,#prRoom .p-watch[data-mode=break] .p-wv-break{display:flex;animation:pwIn .25s ease-out}
#prRoom .p-wv-proj{flex-direction:column;gap:8px}
#prRoom .p-wv-feed{flex-direction:column;gap:6px;justify-content:center}
#prRoom .p-fh{display:flex;align-items:center;gap:10px} #prRoom .p-fh b{font:800 10px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#3dff6e} #prRoom .p-fh b::before{content:'● ';animation:pDot 1.2s steps(2) infinite} @keyframes pDot{50%{opacity:.2}}
#prRoom .p-flist{display:flex;flex-direction:column;gap:6px}
#prRoom .p-fi{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;background:#04060a;border:1px solid #2b3245;font:600 13.5px var(--body);color:#c9cfdd;white-space:nowrap;overflow:hidden;min-width:0}
#prRoom .p-ff{font-size:20px;line-height:1;flex:none} #prRoom .p-fi .p-fw{font-weight:800;color:#fff;flex:none} #prRoom .p-fi .p-fx{min-width:0;overflow:hidden;text-overflow:ellipsis} #prRoom .p-fi .p-fl{margin-left:auto;flex:none;font:700 12px ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#ffd43b}
#prRoom .p-foffm{white-space:normal}
#prRoom .p-wv-motiv,#prRoom .p-wv-prompt,#prRoom .p-wv-count{flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center}
#prRoom .p-big{font:800 clamp(20px,2.6vw,30px)/1.2 var(--display,var(--body));color:#fff;max-width:90%}
#prRoom .p-wv-motiv .p-big{color:#ffd43b;text-shadow:0 0 18px rgba(255,212,59,.35)}
#prRoom .p-sub{font:600 13px var(--body);color:#8d97b0;max-width:90%}
#prRoom .p-go{padding:8px 20px;border-radius:999px;border:0;background:#1f9e46;color:#fff;font:800 14px var(--body);cursor:pointer}
#prRoom .p-cnt{font:800 84px/1 ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#3dff6e;text-shadow:0 0 24px rgba(61,255,110,.5);animation:pCnt 1s ease-out infinite}
@keyframes pCnt{0%{transform:scale(1.25);opacity:.4}30%{transform:scale(1);opacity:1}}
#prRoom .p-wv-break{align-items:center;justify-content:center;gap:24px}
#prRoom .p-ring{position:relative;width:132px;height:132px;flex:none} #prRoom .p-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
#prRoom .p-rbg{fill:none;stroke:#1a2030;stroke-width:8} #prRoom .p-rfg{fill:none;stroke:#3dff6e;stroke-width:8;stroke-linecap:round;filter:drop-shadow(0 0 5px rgba(61,255,110,.6));transition:stroke-dashoffset .2s linear}
#prRoom .p-rt{position:absolute;inset:0;display:grid;place-items:center;font:700 28px ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#fff}
#prRoom .p-bside{display:flex;flex-direction:column;gap:8px;align-items:flex-start;max-width:340px} #prRoom .p-bside .p-wg{gap:8px} #prRoom .p-bside .p-wg span{font:600 12px var(--body);color:#8d97b0} #prRoom .p-wg .p-endb{margin-left:8px;width:auto;height:auto;padding:5px 14px;font-size:12.5px;border-radius:999px;border:0;background:#1f9e46;white-space:nowrap}
#prRoom .p-brk{white-space:nowrap} #prRoom .p-mixrow:not(.ph) .p-tp #prPlay{font-size:19px!important}
#prRoom .p-watch.ph .p-fi{padding:3px 7px;font-size:10.5px;gap:6px} #prRoom .p-watch.ph .p-ff{font-size:14px} #prRoom .p-watch.ph .p-flist{gap:3px} #prRoom .p-watch.ph .p-fh b{font-size:8px} #prRoom .p-watch.ph .p-fi .p-fl{font-size:9.5px}
#prRoom .p-watch.ph .p-big{font-size:17px} #prRoom .p-watch.ph .p-sub{font-size:10.5px} #prRoom .p-watch.ph .p-cnt{font-size:48px} #prRoom .p-watch.ph .p-go{padding:4px 14px;font-size:12px}
#prRoom .p-watch.ph .p-wg .p-endb{padding:3px 10px!important;min-height:0!important;height:auto!important;width:auto!important;font-size:11px!important;line-height:1.3} #prRoom .p-watch.ph .p-ring{width:74px;height:74px} #prRoom .p-watch.ph .p-rt{font-size:16px} #prRoom .p-watch.ph .p-wv-break{gap:12px} #prRoom .p-watch.ph .p-bside{gap:3px}
#prRoom .p-watch.ph .p-wv-motiv,#prRoom .p-watch.ph .p-wv-prompt,#prRoom .p-watch.ph .p-wv-count{gap:4px}
#prRoom .p-watch[data-mode=recover] .p-wv-recover{display:flex;animation:pwIn .25s ease-out}
#prRoom .p-wv-recover{align-items:center;justify-content:center;gap:24px}
#prRoom .p-ring-l{width:150px;height:150px} #prRoom .p-wv-recover .p-rfg{stroke:#7cc4ff;filter:drop-shadow(0 0 6px rgba(124,196,255,.6))}
#prRoom .p-rec{font:900 30px/1 var(--display,var(--body));letter-spacing:.18em;text-transform:uppercase;color:#7cc4ff;text-shadow:0 0 16px rgba(124,196,255,.45)}
#prRoom .p-rbtns,#prRoom .p-apick{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#prRoom .p-add{padding:8px 16px;border-radius:999px;border:0;background:#ffd43b;color:#151b28;font:800 14px var(--body);cursor:pointer;animation:pAdd 1s ease-in-out infinite}
@keyframes pAdd{50%{box-shadow:0 0 0 6px rgba(255,212,59,.25),0 0 18px rgba(255,212,59,.6);filter:brightness(1.15)}}
#prRoom .p-apick select{padding:6px 8px;border-radius:8px;border:1px solid #3a4258;background:#05070c;color:#fff;font:700 13px var(--body);max-width:210px}
#prRoom .p-acx{padding:7px 12px;border-radius:999px;border:1px solid #3a4258;background:#1a1f2c;color:#e6e9f2;font:700 13px var(--body);cursor:pointer}
#prRoom .p-rout{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font:600 12px var(--body);color:#8d97b0} #prRoom .p-rout b{font:800 9px var(--body);letter-spacing:.14em;text-transform:uppercase}
#prRoom .p-rc{padding:2px 8px;border-radius:999px;border:1px solid #2b3245;background:#0b0e16} #prRoom .p-rc.cur{border-color:#7cc4ff;color:#fff} #prRoom .p-rc.nx{border-color:#ffd43b;color:#ffd43b}
#prRoom .p-watch.ph .p-ring-l{width:80px;height:80px} #prRoom .p-watch.ph .p-rec{font-size:17px} #prRoom .p-watch.ph .p-wv-recover{gap:10px} #prRoom .p-watch.ph .p-add,#prRoom .p-watch.ph .p-rgo,#prRoom .p-watch.ph .p-aok,#prRoom .p-watch.ph .p-acx{padding:3px 10px!important;font-size:11px!important;min-height:0!important}
#prRoom .p-watch.ph .p-wv-recover .p-sub{display:none} #prRoom .p-watch.ph .p-apick select{font-size:11px;padding:2px 4px;max-width:120px;min-height:0} #prRoom .p-watch.ph .p-rout{font-size:9.5px;gap:3px}
#prRoom .p-con{position:relative}
#prRoom .p-xrow{display:flex;align-items:center;gap:14px;padding:6px 10px;border-top:1px solid rgba(255,255,255,.07);flex-wrap:nowrap;white-space:nowrap}
#prRoom .p-xrow.col{flex-direction:column;align-items:flex-start;gap:6px} #prRoom .p-xrow.abs{position:absolute;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(0,0,0,.22);padding:5px 10px;justify-content:space-between;z-index:2}
#prRoom .p-reps{gap:8px;font:800 9px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#8d97b0} #prRoom .p-reps input[type=range]{width:120px!important}
#prRoom .p-reps .p-rpn{min-width:38px!important;font-size:16px!important;padding:2px 6px!important} #prRoom .p-reps .p-rpn::after{content:'×'!important;font-size:12px}
#prRoom .p-kcg{display:flex;align-items:center;gap:5px} #prRoom .p-kcg .p-bl{margin-right:2px}
#prRoom .p-con.off .p-xrow{pointer-events:none} #prRoom .p-con.off .p-xrow .p-rpn{color:#3a3f4c!important;text-shadow:none}
#prRoom.p-locked .p-xrow{opacity:.4}
#prRoom .p-mixrow.ph .p-xrow{gap:8px;padding:2px 6px} #prRoom .p-mixrow.ph .p-reps input[type=range]{width:70px!important;height:20px} #prRoom .p-mixrow.ph .p-reps .p-rpn{font-size:11px!important;min-width:26px!important;padding:0 4px!important} #prRoom .p-mixrow.ph .p-kcg .p-key{min-height:15px;font-size:9px;padding:1px 5px 1px 4px}
#prRoom.p-ph .e-top{display:none!important} #prRoom .p-bk{flex:none;width:36px;height:36px;min-height:0!important;padding:0!important;font-size:18px}
/* phone: the utility buttons sit right after the memory, set apart by a divider and their own colours */
#prRoom .p-mixrow.ph .p-sp.p-dv{flex:none;width:1px;height:18px;margin:0 3px;background:rgba(255,255,255,.18)}
#prRoom .p-feedb span{color:#7dffa1} #prRoom .p-cbar .p-ubtn.p-eart{color:#ffd43b;border-color:#5a4a12;background:linear-gradient(180deg,#2c2714,#1c1a10)} #prRoom .p-cbar .p-ubtn.p-stud{color:#ffb38a;border-color:#5c2e14;background:linear-gradient(180deg,#2e1d14,#1c120c)} #prRoom .p-cbar .p-ubtn.p-stud:disabled{opacity:.4} #prRoom .p-cbar .p-ubtn:not(.p-eart):not(.p-stud){color:#9fd0ff;border-color:#1f3a5c;background:linear-gradient(180deg,#16263a,#0f1826)}
#prRoom .p-maxb{margin-left:auto;flex:none;min-height:19px;padding:1px 9px;border-radius:5px;border:1px solid #070910;background:linear-gradient(180deg,#3a4258,#232a3a);color:#fff;font:800 12px var(--body);cursor:pointer}
#prRoom .p-mixrow.maxi .p-maxb{min-height:28px;padding:3px 16px;background:#1f9e46;border-color:#1f9e46;font-size:13px}
/* the full-screen console */
#prRoom .p-mixrow.maxi .p-con{position:fixed;inset:46px 6px 6px;z-index:2147483000;overflow:auto;justify-content:flex-start;box-shadow:0 0 0 100vmax rgba(3,5,10,.86),0 10px 30px rgba(0,0,0,.7)}
#prRoom .p-mixrow.maxi .p-mix{flex:1 0 auto;justify-content:center}
#prRoom .p-mixrow.maxi .p-cbar{flex-wrap:wrap;justify-content:center} #prRoom .p-mixrow.maxi .p-key{min-height:25px!important;padding:2px 10px 2px 8px!important} #prRoom .p-mixrow.maxi .p-bcol{gap:4px} #prRoom .p-mixrow.maxi .p-mix{padding:8px 6px 6px} #prRoom .p-mixrow.maxi .p-cbar button{min-height:26px!important}
#prRoom .p-mixrow.ph .p-key{min-height:calc(15px + var(--pe,0px));font-size:calc(9px + var(--pe,0px) * .22)}
#prRoom .p-mixrow.ph .p-cht{margin-bottom:calc(3px + var(--pe,0px) * .3)}
#prRoom .p-mixrow.ph .p-xrow .p-key{min-height:calc(15px + var(--pe,0px) * .6)}
#prRoom .p-mixrow.ph .p-pow,#prRoom .p-mixrow.ph .p-ubtn,#prRoom .p-mixrow.ph .p-bank,#prRoom .p-mixrow.ph .p-bsave,#prRoom .p-mixrow.ph .p-bdel,#prRoom .p-mixrow.ph .p-maxb{min-height:calc(19px + var(--pe,0px) * .6)!important;font-size:calc(9px + var(--pe,0px) * .2)!important}
#prDisp{background:linear-gradient(180deg,#05080d,#020305);box-shadow:inset 0 0 30px rgba(0,0,0,.9),0 0 0 1px #2b3245,0 8px 22px rgba(0,0,0,.4)} #prDisp .ep-h{color:#3dff6e}
#prRoom .ep{flex-shrink:0} #prRoom .ep-body{gap:8px} #prKbP .e-kb{margin:0!important} #prConP .ep-body{padding:10px 12px}
#prRoom .ep.max{inset:44px 10px 10px} #prKbP.max .ep-body{flex:1;justify-content:center}
html.ps-rot #prRoom .ep-h{padding:2px 8px} html.ps-rot #prRoom .ep-body{padding:4px 8px;gap:4px} html.ps-rot #prRoom .ep{border-radius:10px}
/* the practice projector now shows in the Display; the Display keeps one size so nothing below it moves */
#prKbP .e-kb>.e-lbl>span:first-child{visibility:hidden} #prDisp .ep-body{position:relative;height:clamp(190px,27vh,232px);overflow:auto;box-sizing:border-box} #prDisp.float .ep-body,#prDisp.max .ep-body{height:auto;min-height:230px;flex:1}
#prDisp .e-big{font-size:clamp(30px,4vw,56px)!important;line-height:1.04!important}
#prRoom .p-watch.indisp{position:absolute;inset:0;border-radius:0 0 16px 16px;border:0;box-shadow:none;background:linear-gradient(180deg,rgba(8,10,16,.99),rgba(4,6,10,.99))}
html.ps-rot #prDisp .ep-body{height:clamp(96px,26vh,130px)} html.ps-rot #prDisp .e-big{font-size:24px!important}
#prRoom.p-locked .p-mix>.p-ch:not(.p-lvl),#prRoom.p-locked .p-xrow{pointer-events:none;opacity:.45}
/* Display: the top controls, then the screen with Play / Stop / Break beside it */
#prDisp .ep-body{height:auto!important;overflow:visible!important;gap:10px}
#prDisp .pd-top{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end} #prDisp .pd-top>*{margin:0!important} #prDisp .pd-top .p-octs{width:150px!important;min-width:150px!important;max-width:150px!important}
#prDisp .pd-main{display:flex;gap:14px;align-items:stretch}
#prDisp .pd-screen{position:relative;flex:1;min-width:0;height:clamp(170px,24vh,220px);overflow:auto;border-radius:12px;border:1px solid #1b2232;background:#020305;padding:10px 14px;box-sizing:border-box}
#prDisp .pd-tp{display:flex;flex-direction:column;gap:10px;justify-content:center;width:170px;flex:none} #prDisp .pd-tp:empty{display:none}
#prDisp .pd-tp .p-tp{display:flex;flex-direction:column;gap:10px;width:100%!important}
#prDisp .pd-tp .e-btn{width:100%;justify-content:center;white-space:nowrap;margin:0!important}
#prDisp .pd-tp #prPlay{min-height:64px!important;font-size:22px!important;border-radius:999px}
#prDisp .pd-tp #prPause,#prDisp .pd-tp #prBreak{min-height:44px!important;font-size:16px!important}
#prRoom .p-watch.indisp{border-radius:12px}
/* Console: the mixer spreads across the full width with larger buttons */
#prConP .p-mixrow{display:block} #prConP .p-con{width:100%}
#prConP .p-mix{justify-content:space-between;padding:14px 10px 12px}
#prConP .p-mix>.p-ch{flex:1 1 auto;padding:0 10px}
#prConP .p-key{min-height:34px;font-size:14px;padding:4px 14px 4px 10px;gap:8px} #prConP .p-led{width:9px;height:9px}
#prConP .p-bcol{gap:7px} #prConP .p-cht{font-size:10px;margin-bottom:10px}
#prConP .p-lvl{flex:0 0 auto!important;min-width:64px!important} #prConP .p-lvn{width:38px;font-size:13px}
#prConP .p-cbar{padding:10px 12px;gap:8px} #prConP .p-cbar .p-bank,#prConP .p-cbar .p-bsave,#prConP .p-cbar .p-bdel,#prConP .p-cbar .p-pow,#prConP .p-cbar .p-ubtn{min-height:36px;font-size:12px;padding:4px 14px 4px 11px} #prConP .p-cbar .p-ubtn{font-size:14px}
#prConP .p-xrow .p-key{min-height:30px}
#prConP.max .p-key{min-height:48px;font-size:17px;padding:6px 18px 6px 13px} #prConP.max .p-led{width:11px;height:11px} #prConP.max .p-cht{font-size:12px} #prConP.max .p-bcol{gap:10px}
#prConP.max .p-cbar .p-bank,#prConP.max .p-cbar .p-bsave,#prConP.max .p-cbar .p-bdel,#prConP.max .p-cbar .p-pow,#prConP.max .p-cbar .p-ubtn{min-height:46px;font-size:15px}
#prConP.max .ep-body{flex:1;justify-content:center} #prConP.max .p-lvl{min-width:80px!important}
html.ps-rot #prDisp .pd-screen{height:clamp(80px,22vh,120px);padding:4px 8px} html.ps-rot #prDisp .pd-tp{width:110px;gap:5px} html.ps-rot #prDisp .pd-tp #prPlay{min-height:36px!important;font-size:15px!important} html.ps-rot #prDisp .pd-tp #prPause,html.ps-rot #prDisp .pd-tp #prBreak{min-height:28px!important;font-size:12px!important}
/* the room's title row is gone (the menu bar's back arrow does its job), and the keyboard gets the room: longer keys, no scrolling inside its panel */ #prRoom[data-kind=scales] .e-top{display:none!important} #prKbP .ep-body{overflow:visible!important} #prKbP{overflow:visible}
#prRoom .p-cdd{gap:10px;flex-wrap:wrap;align-items:flex-end} #prRoom .p-cdd .p-sel{min-width:130px} #prRoom #prChord{min-width:220px} #prRoom .p-more{position:relative;display:inline-block} #prRoom .p-more>summary{list-style:none;cursor:pointer} #prRoom .p-more>summary::-webkit-details-marker{display:none} #prRoom .p-morebox{position:absolute;right:0;top:calc(100% + 6px);z-index:30;background:#12141c;border:1px solid #3a3424;border-radius:12px;padding:12px;width:min(520px,86vw);box-shadow:0 10px 30px rgba(0,0,0,.5)} #prRoom .p-tab{position:relative;height:22px;margin:0 0 3px} #prRoom .p-tab span{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;border-radius:5px;background:#1a2340;color:#7d8bb0;font:700 11px/1 system-ui,sans-serif;letter-spacing:-.3px;white-space:nowrap;overflow:visible;transition:background .12s,color .12s} #prRoom .p-tab span.on{color:#fff;box-shadow:0 0 10px currentColor} #prRoom .p-tab span.on.l{background:${LH};color:#fff;box-shadow:0 0 12px ${LH}} #prRoom .p-tab span.on.r{background:${RH};color:#fff;box-shadow:0 0 12px ${RH}}
`; document.head.appendChild(css);

function build(){
  ov=el('div'); ov.id='prRoom'; ov.hidden=true; ov.setAttribute('role','dialog');
  ov.innerHTML='<div class="e-top"><button class="e-round" id="prX" type="button" aria-label="Back" title="Back">←</button><h1 id="prH"></h1><span class="e-sp"></span><div class="e-seg" id="prHand" role="group" aria-label="Which hand"></div><button class="e-round" id="prDots" type="button" aria-label="Whiteboard and keyboard" title="Whiteboard and keyboard">⋯</button></div>'+
    '<div class="e-cats" id="prCats"></div>'+
    '<div class="e-now"><div><div class="e-lbl" id="prLbl"></div><div class="e-big" id="prBig"></div><div class="e-sub" id="prSub"></div></div><div><div class="e-ctl" id="prCtl"></div></div></div>'+
    '<div class="p-chips" id="prChips"></div><div id="prPick"></div><div class="e-msg" id="prMsg" aria-live="polite"></div>'+
    '<div class="e-kb"><div class="e-lbl"><span>Keyboard</span><span class="p-leg"><span><i style="background:'+LH+'"></i>Left hand</span><span><i style="background:'+RH+'"></i>Right hand</span></span></div><div class="p-kbw"><div id="prKb"></div></div></div>';
  document.body.appendChild(ov); prPanels();
  $('#prX').onclick=close;
  $('#prDots').onclick=()=>{ close(); try{ if(window.CLASS) CLASS.slide(true); }catch(_){} };
  document.addEventListener('keydown',e=>{ if(ov&&!ov.hidden&&e.key==='Escape'&&!/INPUT|SELECT/.test((e.target||{}).tagName||'')) close(); });
}
let from=null;
const DEF={family:'regular',type:'major',key:'C',motion:'similar',mode:'practice',oct:1,hand:'rh',dir:'updown',sys:'letter',bpm:80,loop:true,rhy:'free',reps:5,kc:''};
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
function open(k,o){ if(!ov) build(); try{ from=(window.SUITE&&SUITE.current())||from; }catch(_){} kind=k==='chords'?'chords':'scales'; ov.dataset.kind=kind; ov.hidden=false; clr(); steps=[]; cur=-1; render(); if(kind==='scales'&&!(o&&o.resume)&&!isDef()) resumeAsk(); menuSync(); }
function close(){ clr(); if(ov) ov.hidden=true; menuSync(); try{ if(window.CLASS&&CLASS.endPractice) CLASS.endPractice(); }catch(_){} }

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
    if(seg.includes('/')&&VREG.test(seg)){ out.push('['+seg.replace(/\s*\.\s*/g,'.')+']'); return; }
    let cur=null; seg.split(/\s+/).forEach(t=>{
      const word=QW.has(t.toLowerCase())||/^\d+$/.test(t)||/^(add|sus)\d*$/i.test(t);
      if(!word&&/^[A-G]/.test(t)){ if(cur) out.push(cur.r+normDesc(cur.d)); cur={r:t,d:[]}; }
      else if(cur) cur.d.push(t); });
    if(cur) out.push(cur.r+normDesc(cur.d)); });
  return out;
}

/* ---------- keyboard ---------- */
/* Letters, Solfa or Numbers. Solfa and numbers only exist for the scales Dr. Onye has given syllables for; the numbers come from the syllables. */
const hasSol=()=>!!(window.SCALELIB&&SCALELIB.solfa[st.type]);
const sysNow=()=>(kind==='scales'&&st.sys!=='letter'&&hasSol())?st.sys:'letter';
const curS=()=>{ const s=steps[cur]; return curDesc&&s&&s.alt?s.alt:s; };
function lab(s,desc){ if(!s) return ''; const y=sysNow(); if(y==='letter') return DSP(s.name); const sy=(desc&&s.solD)||s.sol; if(!sy) return DSP(s.name); return y==='solfa'?sy:(SCALELIB.solnum[sy]||sy); }
function drawKb(){
  const wrap=$('#prKb'); if(!wrap||typeof keyboardSVG!=='function') return; const s=curS(); if(kind==='scales'||steps.arp) handPos();
  let fm=null; if(kind==='scales'&&s){ fm={}; (s.lh||[]).forEach(m=>{ if(s.lfing) fm[m]=s.lfing; }); (s.rh||[]).forEach(m=>{ if(s.fing) fm[m]=s.fing; }); }
  const V=kind==='chords'&&vis&&vis.s===s?vis:null, XL=V?Object.keys(V.extra).map(Number).filter(m=>V.extra[m].h==='l'):[], XR=V?Object.keys(V.extra).map(Number).filter(m=>V.extra[m].h==='r'):[];
  if(kind==='chords'&&s&&(s.rfm||s.lfm||V)&&typeof fingering==='function'){ fm=Object.assign(fingering(s.lh||[],s.rh||[]),s.lfm||{},s.rfm||{}); if(V){ Object.assign(fm,V.fo||{}); Object.keys(V.extra).forEach(m=>{ fm[m]=V.extra[m].f; }); } } const rng=kbRange(), kbx=ov.querySelector('#prKbP.max'), kH=kbx?120:(MQM.matches?64:96); const VO=kind==='chords'&&st.cmode==='voice'&&s&&s.vroot!=null, VSP=VO&&st.nkb?vLabels(s):null; const svg=keyboardSVG(s?[...XL,...s.lh]:[],s?[...XR,...s.rh]:[],{lo:rng[0],hi:rng[1],height:kH,labels:kind!=='scales',fingers:kind==='chords'&&!(s&&s.nofing),fmap:fm,spell:VSP?VSP:(s&&sysNow()!=='letter'&&s.sol)?(()=>{ const o={}; [...(s.lh||[]),...(s.rh||[])].forEach(m=>{ o[m]=lab(s,curDesc); }); return o; })():(s&&s.spell||null)});
  svg.addEventListener('pointerdown',e=>{ const r=e.target.closest('rect[data-m]'); if(!r) return; const m=+r.dataset.m, old=r.getAttribute('fill'); r.setAttribute('fill','#ffd43b'); if(window.CLASS) CLASS.sound(m,1.4,.85); setTimeout(()=>r.setAttribute('fill',old),260); });
  /* while a chord plays, each note lights up as it sounds and dims when it stops */
  if(V) [...(s.lh||[]),...(s.rh||[]),...XL,...XR].forEach(m=>{ const r=svg.querySelector('rect[data-m="'+m+'"]'); if(!r) return; if(V.on.has(m)){ r.setAttribute('stroke','#fff'); r.setAttribute('stroke-width','2'); } else { const w=+r.getAttribute('width')>10, f=r.getAttribute('fill'); r.setAttribute('fill',f==='#f76707'?(w?'#ffd8bd':'#7a3a12'):f==='#1c7ed6'?(w?'#c4ddf6':'#163d63'):f); r.setAttribute('data-dim','1'); } });
  wrap.replaceChildren(svg); tab(svg,s);
  if(window.PSHANDS){ if(kind==="scales"||steps.arp) PSHANDS.sync(wrap,steps.some(x=>x.fing||x.lfing),s,drawKb); else if(kind==="chords"&&s&&typeof fingering==="function") PSHANDS.sync(wrap,true,chordHands(s),drawKb); else PSHANDS.sync(null,false); }
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
  return [21,108];   /* 88 keys on every device */
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
  const all=[...(s.lh||[]),...(s.rh||[])].sort((a,b)=>a-b), V=vis&&vis.s===s?vis:null, done=V?V.on:arpN==null?null:new Set(all.slice(0,arpN));
  const F=Object.assign(fingering(s.lh||[],s.rh||[]),s.lfm||{},s.rfm||{}); const XL=[],XR=[]; if(V) Object.assign(F,V.fo||{}); if(V) Object.keys(V.extra).forEach(k=>{ const m=+k; F[m]=V.extra[k].f; (V.extra[k].h==='l'?XL:XR).push(m); }); const W=[0,2,4,5,7,9,11], isW=m=>W.includes(((m%12)+12)%12);
  const side=(notes,dir)=>{ if(!notes||!notes.length) return null; const pos={}; notes.forEach(m=>{ const f=F[m]; if(f&&pos[f]==null) pos[f]=m; });
    const have=Object.keys(pos).map(Number); if(!have.length) return null; const press=done?have.filter(f=>done.has(pos[f])):have.slice();
    for(let j=1;j<=5;j++){ if(pos[j]!=null) continue;
      /* a finger between two chord fingers sits evenly between them; one outside them steps out a white key at a time */
      const lo=have.filter(x=>x<j), hi=have.filter(x=>x>j);
      if(lo.length&&hi.length){ const a=Math.max(...lo), b=Math.min(...hi); let m=Math.round(pos[a]+(pos[b]-pos[a])*(j-a)/(b-a)); if(!isW(m)) m+=(pos[b]>pos[a]?1:-1); pos[j]=m; continue; }
      const r=have.reduce((a,b)=>Math.abs(b-j)<Math.abs(a-j)?b:a); let m=pos[r], n=Math.abs(j-r), st=Math.sign(j-r)*dir;
      while(n>0){ m+=st; while(!isW(m)) m+=st; n--; } pos[j]=m; }
    const last=done?[...press].sort((a,b)=>all.indexOf(pos[b])-all.indexOf(pos[a]))[0]:null; const f=last||(press.includes(1)?1:press.length?Math.min(...press):Math.min(...have)); return {pos,press,own:have.slice(),f,note:pos[f]}; };
  const R=side([...XR,...(s.rh||[])],1), L=side([...XL,...(s.lh||[])],-1);
  return {rh:R?[R.note]:[],fing:R?String(R.f):'',rpos:R?R.pos:null,rpress:R?R.press:null,rown:R?R.own:null,lh:L?[L.note]:[],lfing:L?String(L.f):'',lpos:L?L.pos:null,lpress:L?L.press:null,lown:L?L.own:null};
}
function names(s){ const w=/^\[/.test(s.src||'')&&!trN()?s.src:''; if(w) return /[A-G](b|♭)/.test(w)?FLAT_N:/[A-G](#|♯)/.test(w)?SHARP_N:FLAT_N;   /* written chords keep the spelling the student typed */
  return /b|♭|F(?!#)/.test(s.name)&&!/#|♯/.test(s.name)?FLAT_N:SHARP_N; }

/* ---------- steps ---------- */
function chips(){
  const box=$('#prChips'); box.textContent='';
  const mk=(s,i)=>{ const b=el('button','p-chip'); b.type='button'; b.appendChild(el('span',null,s.chip||lab(s,false)));
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
function play1(s,len,nx){ if(kind==='chords'&&steps.arp&&s){ try{ const C=CLASS.clock, d=Math.max(.3,(len||.9)*1.15), v=(s.ai||0)%3===0?.82:.64; C.ready().then(()=>{ const t=C.now()+.03; meterGo(); if(playing&&(s.ai||0)%3===0){ const bb=C.bus(); if(bb) chBus.push(bb); C.click(t,chBeat%4===0,bb); chBeat++; } (s.lh||[]).forEach(m=>C.note(m,t,d*(s.lh.length>1||s.ai%3===0?2.6:1),.7)); (s.rh||[]).forEach(m=>C.note(m,t,d,v)); }); }catch(_){} return; } if(kind==='chords'&&s&&window.CLASS&&CLASS.clock&&CLASS.clock.note){ try{ playChord(s,len,nx); }catch(e){ console.log(e); } return; } try{ if(kind==='chords'&&st.vh==='h'){ const ns=[...s.lh,...s.rh].sort((a,b)=>a-b); ns.forEach((m,i)=>CLASS.sound(m,1.1,.8,i*.5));
      arpN=0; drawKb(); ns.forEach((m,i)=>timers.push(setTimeout(()=>{ if(steps.indexOf(s)<0&&curS()!==s) return; arpN=i+1; drawKb(); },i*500+20))); timers.push(setTimeout(()=>{ arpN=null; },ns.length*500+1200)); }
    else { arpN=null; if(kind==='chords') drawKb(); CLASS.playStep(s,len||1.6); } }catch(_){} }
function show(){
  const s=steps[cur]; $('#prBig').style.fontSize='';
  if(kind==='chords') staff(s);
  if(kind==='chords'){ if(s&&s.vdesc) $('#prMsg').textContent=s.chip+': '+s.vdesc; if(s){ $('#prBig').textContent=s.name; const N=names(s), t=(typeof fingerText==='function')?fingerText(s.lh,s.rh):null; if(t&&s.rfm) t.rh=[...s.rh].sort((x,y)=>x-y).map(m=>s.rfm[m]).join('-'); if(t&&s.lfm){ const fo=vis&&vis.s===s&&vis.fo||{}; t.lh=[...s.lh].sort((x,y)=>x-y).map(m=>fo[m]||s.lfm[m]).join('-'); } $('#prSub').textContent='Left hand '+s.lh.map(m=>(s.spell&&s.spell[m]&&!trN()&&typeof s.spell[m]==='string'?DSP(s.spell[m]):N[m%12])).join(' ')+'  ·  Right hand '+s.rh.map(m=>(s.spell&&s.spell[m]&&!trN()&&typeof s.spell[m]==='string'?DSP(s.spell[m]):N[m%12])).join(' ')+(t?'  ·  Fingers: LH '+t.lh+', RH '+t.rh:''); } else { $('#prBig').textContent=steps.length?'Tap a chord':'Type chords'; $('#prSub').textContent=steps.length?'Tap a chord below, or press Play.':'Type chord names like Dm7 G7 Cmaj7, then press Show.'; } }
  drawKb();
}
/* ---------- rhythm practice (4/4): quarter notes over one octave, eighths over two, triplets over three, sixteenths over four.
   Up in even notes for seven beats, the top note held for a beat, then down from the top note again, ending on a held tonic: 16 beats. ---------- */
const RHY=[['free','Free'],['q','Quarter'],['e','Eighth'],['t','Triplet'],['s','Sixteenth']], RN={q:1,e:2,t:3,s:4};
const rhyN=()=>kind==='scales'&&st.rhy&&st.rhy!=='free'?RN[st.rhy]:0;
function seven(){ try{ const SC=window.SCALES, s=SC.build(st.key,'rh',st.type,1,'similar'); return s.length===8&&new Set(s.slice(0,7).map(x=>((x.rh[0]||x.lh[0])%12+12)%12)).size===7; }catch(_){ return false; } }
function rhyOK(k){ if(k==='free') return ''; if(!seven()) return 'Rhythm practice is for scales with seven notes';
  const SC=window.SCALES, mx=SC&&SC.maxOct?SC.maxOct(st.key,st.hand,st.motion):4; return RN[k]>mx?(st.motion==='contrary'?'In contrary motion, with the hands an octave apart, '+RN[k]+' octaves do not fit on the 88 keys in this key':RN[k]+' octaves do not fit '+(st.hand==='both'?'both hands':'this hand')+' on the keyboard in this key'):''; }
function rhyPlan(){ const n=rhyN(), L=steps.length, top=L-1, ev=[]; let b=0;
  for(let i=0;i<top;i++){ ev.push({i,b,d:1/n,desc:false}); b+=1/n; } ev.push({i:top,b,d:1,desc:false}); b+=1;
  for(let i=top;i>0;i--){ ev.push({i,b,d:1/n,desc:true}); b+=1/n; } ev.push({i:0,b,d:1,desc:true}); b+=1;
  ev.forEach(e=>{ e.b=Math.round(e.b*1000)/1000; }); return {ev,beats:Math.round(b)}; }
let rbus=null; const rkill=()=>{ try{ if(rbus&&window.CLASS&&CLASS.clock.kill) CLASS.clock.kill(rbus); }catch(_){} rbus=null; };
function playRhythm(){
  const C=window.CLASS&&CLASS.clock; if(!C){ return; } const {ev,beats}=rhyPlan(); playing=true; paused=false; waitL=false; updPause();
  C.ready().then(()=>{ if(!playing) return;
    const spb=60/st.bpm, AHEAD=0.6; rkill(); rbus=C.bus&&C.bus(); const myBus=()=>rbus;
    let base=C.now()+0.15+4*spb, k=0, cyc=0, beatK=-4, pausedAt=0, loop=null;   /* one bar of count-in */
    const at=(beat,c)=>base+(c*beats+beat)*spb, live=new Set();
    const vis=(fn,ms)=>{ const id=setTimeout(()=>{ live.delete(id); fn(); },ms); live.add(id); };
    const pump=()=>{ if(!playing||paused) return; const hz=C.now()+AHEAD, b=myBus();
      while(at(beatK,cyc)<hz&&beatK<beats){ const t=at(beatK,cyc); C.click(t,((beatK%4)+4)%4===0,b); beatK++; }
      while(k<ev.length&&at(ev[k].b,cyc)<hz){ const e=ev[k], t=at(e.b,cyc), s0=steps[e.i], s=e.desc&&s0.alt?s0.alt:s0, k0=k; C.step(s,t,Math.max(.25,e.d*spb*1.15),b);
        vis(()=>{ if(!playing||paused) return; cur=e.i; curDesc=e.desc; show(); tally(s);
          const nx=ev[k0+1]; if(nx&&window.PSHANDS&&PSHANDS.lead){ const c=curS(), n0=steps[nx.i], ns=nx.desc&&n0.alt?n0.alt:n0; if(c&&ns&&((c.lfing==='1'&&ns.lfing&&ns.lfing!=='1')||(c.fing==='1'&&ns.fing&&ns.fing!=='1'&&+ns.fing>=2))) vis(()=>{ if(playing&&!paused) PSHANDS.lead(ns); },e.d*spb*450); } },Math.max(0,(t-C.now())*1000)); k++; }
      if(k>=ev.length&&beatK>=beats){ const due=st.kc&&KC.rep+1>=(st.reps||1)&&kcNextKey(true); if(due){ if(C.now()>at(beats,cyc)-0.02){ rkill(); repDone(); } return; } if(st.loop||st.kc){ KC.rep++; cyc++; k=0; beatK=0; } else if(C.now()>at(beats,cyc)-0.02){ rkill(); clr(); show(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } };
    loop=setInterval(pump,40); timers.push(loop); timers.push({clear:()=>{ live.forEach(clearTimeout); live.clear(); rkill(); }}); pump();
    pauseFn=()=>{ if(!playing) return;
      if(!paused){ paused=true; pausedAt=C.now(); live.forEach(clearTimeout); live.clear(); rkill();   /* silence what was already scheduled */
        /* rewind to the first note and click that had not sounded yet */
        if(k===0&&beatK===0&&cyc>0&&at(beats-1,cyc-1)+spb>pausedAt){ cyc--; k=ev.length; beatK=beats; }
        while(k>0&&at(ev[k-1].b,cyc)>=pausedAt) k--; while(beatK>-4&&at(beatK-1,cyc)>=pausedAt) beatK--;
        try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(true); }catch(_){} }
      else { paused=false; C.ready().then(()=>{ if(!playing||paused) return; base+=C.now()-pausedAt+0.05; rbus=C.bus&&C.bus(); try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(false); }catch(_){} pump(); }); }
      updPause(); }; });
  pauseFn=()=>{};
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
  if(rhyN()){ playRhythm(); return; }
  const order=kind==='scales'?seq():(kind==='chords'&&st.cmode==='voice'&&!st.loop)?[cur>=0?cur:0]:[...Array(steps.length).keys()], gap0=(60/st.bpm)*(kind==='scales'?1:(steps.length>1?2:4))*1000;
  /* chords: each one lasts as many beats as the chord canvas gives it */ const gapOf=i=>kind==='chords'&&steps[i]&&steps[i].beats?steps[i].beats*60000/st.bpm:gap0;
  playing=true; let p=0, t0=0, rem=0; paused=false; waitL=false;
  const adv=()=>{ if(!playing||paused) return; p++; if(p>=order.length){ if(kind==='scales'&&repDone()) return; if(st.loop||(kind==='scales'&&st.kc)){ p=0; if(kind==='chords'&&steps.arp&&order.length>1){ const a=steps[order[0]], z=steps[order[order.length-1]]; if(a&&z&&String(a.rh)===String(z.rh)) p=1; } } else { clr(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } tick(); };
  const sched=ms=>{ rem=ms; t0=Date.now(); timers.push(setTimeout(adv,ms)); };
  const go=()=>{ if(!playing) return; cur=order[p]; curDesc=kind==='scales'&&p>0&&order[p]<order[p-1]; show(); tally(curS()); const gap=gapOf(order[p]); const nxi=order[p+1]!=null?order[p+1]:(st.loop?order[0]:null);
    play1(curS(),gap/1000*(kind==='scales'?1.6:1.0),kind==='chords'&&nxi!=null?steps[nxi]:null); sched(gap);
    /* a finger that crosses over the thumb starts moving half way through the thumb's note, so you can see it travel before the next note sounds */
    if(kind==='scales'&&window.PSHANDS&&PSHANDS.lead&&order[p+1]!=null){ const c=curS(), ni=order[p+1], nx0=steps[ni], nx=(ni<order[p]&&nx0.alt)?nx0.alt:nx0;
      if(c&&nx&&((c.lfing==='1'&&nx.lfing&&nx.lfing!=='1')||(c.fing==='1'&&nx.fing&&nx.fing!=='1')&&+nx.fing>=2)) timers.push(setTimeout(()=>{ if(playing&&!paused&&!waitL) PSHANDS.lead(nx); },gap*.45)); } };
  const tick=()=>{ if(!playing) return;
    if(kind==='scales'&&st.mode==='learn'&&p>0&&order[p]===order[p-1]+1){ const ln=learnLines(steps[order[p-1]],steps[order[p]]); if(ln.length){ waitL=true; updPause(); showLearn(ln,go); return; } }
    go(); };
  /* Pause keeps the place in the scale and freezes the hands; Resume carries on with the time that was left on the current note */
  pauseFn=()=>{ if(!playing||waitL) return;
    if(!paused){ paused=true; if(kind==='chords') killCh(); timers.forEach(clearTimeout); timers=[]; rem=Math.max(0,rem-(Date.now()-t0)); try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(true); }catch(_){} }
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
  const b=el('button','e-btn pri','▶ Play'); b.id='prPlay'; b.type='button'; b.onclick=playPause; ctl.appendChild(b);
  { const pb=el('button','e-btn','■ Stop'); pb.id='prPause'; pb.type='button'; pb.onclick=()=>{ if(!playing) return; clr(); show(); }; ctl.appendChild(pb); updPause(); }
  if(kind==='scales'){ const sb=el('button','e-btn','Practice in Studio'); sb.id='prStudio'; sb.type='button'; sb.onclick=toStudio; { const w=studioWhy(); sb.disabled=!!w; sb.title=w||'Practice this scale with a backing track in the Studio'; if(w) sb.style.opacity='.45'; } ctl.appendChild(sb); }
  const t=el('label','p-rng p-tempo'); t.innerHTML='Tempo <input type="range" min="40" max="200" step="2" aria-label="Tempo"><span class="p-bpm"></span>'; const r=t.querySelector('input'), o=t.querySelector('span'); r.value=st.bpm; o.textContent=st.bpm; const blink=()=>{ const l=tp.querySelector('.p-led'); if(!l) return; l.style.animation='none'; void l.offsetWidth; l.style.animation='pTap '+(60/st.bpm).toFixed(3)+'s steps(1) infinite'; };
  r.oninput=()=>{ st.bpm=+r.value; o.textContent=r.value; save(); blink(); }; ctl.appendChild(t);
  /* tap tempo: its light blinks at the current tempo; tap it in time (two taps or more) to set a new one */
  const tp=el('button','p-tapw'); tp.type='button'; tp.id='prTap'; tp.title='Tap tempo: tap in time to set the tempo. The light blinks at the current tempo.'; tp.innerHTML='<i class="p-led"></i>Tap'; let taps=[];
  tp.onclick=()=>{ const n=performance.now(); if(taps.length&&n-taps[taps.length-1]>2000) taps=[]; taps.push(n); taps=taps.slice(-5); if(taps.length<2) return;
    const iv=(taps[taps.length-1]-taps[0])/(taps.length-1), b=Math.max(40,Math.min(200,Math.round(60000/iv/2)*2)); st.bpm=b; r.value=b; o.textContent=b; save(); blink(); };
  t.appendChild(tp); setTimeout(blink,0);
  const l=el('label','p-rng'); l.innerHTML='<input type="checkbox"> Loop'; const c=l.querySelector('input'); c.checked=!!st.loop; c.onchange=()=>{ st.loop=c.checked; save(); }; ctl.appendChild(l);
}
/* desktop console: each setting is a channel strip of lit buttons (press one, its green light comes on and the others go off);
   drag a channel by its name to move it along the console, and the order is remembered */
function mixer(chs){
  const panel=el('div','p-mix');
  chs.forEach(([title,src,pair])=>{ if(pair){ panel.appendChild(pairStrip(title,src,pair)); return; } const opts=[...src.querySelectorAll('button')], n=opts.length; if(!n) return;
    const strip=el('div','p-ch p-bch'); strip.dataset.ch=title; strip.setAttribute('role','radiogroup'); strip.setAttribute('aria-label',title); if(src.hidden){ strip.classList.add('off'); strip.title='Not used with contrary motion'; }
    strip.appendChild(el('div','p-cht',title)); const col=el('div','p-bcol'+(n>3?' p-b2':'')); strip.appendChild(col);
    const keys=opts.map((b,i)=>{ const k=el('button','p-key'); k.type='button'; k.setAttribute('role','radio'); k.innerHTML='<i class="p-led"></i><span></span>'; k.lastChild.textContent=b.textContent; k.disabled=b.disabled||src.hidden; if(b.title) k.title=b.title; k.onclick=()=>{ if(!k.disabled&&b.getAttribute('aria-pressed')!=='true') b.click(); setTimeout(conSum,0); }; col.appendChild(k); return k; });
    const sync=()=>keys.forEach((k,i)=>{ const on=opts[i].getAttribute('aria-pressed')==='true'; k.classList.toggle('on',on); k.setAttribute('aria-checked',String(on)); k.tabIndex=on?0:-1; }); sync();
    col.addEventListener('keydown',e=>{ const d={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[e.key]; if(!d) return; e.preventDefault(); e.stopPropagation(); let i=keys.findIndex(k=>k.classList.contains('on'))+d; while(i>=0&&i<n&&keys[i].disabled) i+=d; if(i>=0&&i<n){ keys[i].click(); setTimeout(()=>{ const f=document.querySelector('#prRoom .p-ch[data-ch="'+title+'"] .p-key.on'); if(f) f.focus(); },0); } });
    new MutationObserver(sync).observe(src,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
    panel.appendChild(strip); });
  return panel;
}
/* two buttons that can each be on: one alone plays that one; both on plays both (both hands; up then down). At least one stays on. */
function pairStrip(title,src,pair){
  const strip=el('div','p-ch p-bch p-pair'); strip.dataset.ch=title; strip.setAttribute('role','group'); strip.setAttribute('aria-label',title); if(src.hidden&&!(pair.lock&&pair.lock())){ strip.classList.add('off'); strip.title='Not used with contrary motion'; }
  strip.appendChild(el('div','p-cht',title)); const col=el('div','p-bcol'); strip.appendChild(col);
  const val=()=>{ const b=src.querySelector('button[aria-pressed=true]'); return b?b.dataset.k:''; }, sb=k=>src.querySelector('button[data-k="'+k+'"]');
  const keys=pair.pair.map(([k,label],i)=>{ const b=el('button','p-key'); b.type='button'; b.innerHTML='<i class="p-led"></i><span></span>'; b.lastChild.textContent=label;
    b.onclick=()=>{ const v=val(), on=pair.pair.map(([kk])=>v===kk||v===pair.both); on[i]=!on[i]; if(!on[0]&&!on[1]){ b.classList.add('p-nope'); setTimeout(()=>b.classList.remove('p-nope'),350); return; }
      const nv=on[0]&&on[1]?pair.both:on[0]?pair.pair[0][0]:pair.pair[1][0], t=sb(nv); if(t&&!t.disabled&&nv!==v) t.click(); setTimeout(conSum,0); };
    col.appendChild(b); return b; });
  const sync=()=>{ const v=val(), lk=!!(pair.lock&&pair.lock()); strip.classList.toggle('p-lock',lk); if(lk){ strip.classList.remove('off'); strip.title=pair.lockWhy||''; }
    keys.forEach((b,i)=>{ const k=pair.pair[i][0], on=lk||v===k||v===pair.both; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); const t=sb(k); b.disabled=lk||src.hidden||!t||t.disabled; if(lk) b.title=pair.lockWhy||''; else if(t&&t.title) b.title=t.title; }); }; sync();
  new MutationObserver(sync).observe(src,{attributes:true,subtree:true,attributeFilter:['aria-pressed','disabled']});
  return strip;
}
/* the console box: channel strips on top; a bar along the bottom with the power switch, the memory banks, Studio and Ask Dr. Onye.
   Power off folds the strips away and shows a one-line summary instead. */
let MAXI=false, PHX=0; { let ft=0; const refit=()=>{ clearTimeout(ft); ft=setTimeout(()=>{ if(ov&&!ov.hidden&&kind==='scales') phoneFit(); },350); }; window.addEventListener('resize',refit); try{ new MutationObserver(refit).observe(document.documentElement,{attributes:true,attributeFilter:['class']}); }catch(_){} }
/* phone: use the free space between the console and the keyboard to make the console's buttons and faders taller */
function phoneFit(){ const row=document.querySelector('#prRoom .p-mixrow.ph'), kb=document.querySelector('#prRoom .e-kb'); if(!row||!kb||playing) return;
  const con=row.querySelector('.p-con'), tp=row.querySelector('.p-tp'); if(!con||!tp) return; const top=e=>{ let y=0; while(e&&e!==ov){ y+=e.offsetTop; e=e.offsetParent; } return y; };
  /* the gap is the space under the console beside the taller Play / Stop column; never push into the keyboard */
  void top; let bottom=0; [...ov.children].forEach(x=>{ if(x.offsetHeight) bottom=Math.max(bottom,x.offsetTop+x.offsetHeight); }); const free=ov.clientHeight-bottom-4; let want=PHX;   /* slack left at the bottom of the screen */
  if(free<0) want=PHX-Math.ceil(-free/4.5); else if(free>4) want=PHX+Math.floor(free/4.5); want=Math.max(0,Math.min(16,want));
  row.style.setProperty('--pe',PHX+'px'); const n=Date.now(); if(n-(phoneFit.t||0)>3000){ phoneFit.t=n; phoneFit.c=0; } if(want!==PHX&&phoneFit.c<6){ phoneFit.c++; PHX=want; render(); } }
const conOn=()=>{ try{ return localStorage.getItem('pr-con')!=='0'; }catch(_){ return true; } };
function conSum(){ const sm=document.querySelector('#prRoom .p-sum'); if(!sm) return; const HL={rh:'Right hand',lh:'Left hand',both:'Both hands'}, DL=(st.motion==='contrary'?CDIRS:DIRS).find(d=>d[0]===st.dir);
  sm.textContent=[st.motion==='contrary'?'Both hands':HL[st.hand],st.motion==='contrary'?'Contrary':'Similar',DL?DL[1]:'',st.family==='exotic'?'Exotic':'Regular',st.mode==='learn'?'Learning':'Practice',{letter:'Letters',solfa:'Solfa',num:'Numbers'}[st.sys]||st.sys,(RHY.find(r=>r[0]===(st.rhy||'free'))||['','Free'])[1]].filter(Boolean).join('  ·  '); }
function conBar(ask,ph){ const bar=el('div','p-cbar'), pw=el('button','p-pow'); pw.type='button'; pw.innerHTML='<i class="p-led"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg><span>Power</span>'; pw.classList.add('p-pwr');
  const ps=()=>{ const on=conOn(); pw.setAttribute('aria-pressed',String(on)); pw.title=on?'Power: on. Click to switch the console off':'Power: off. Click to switch the console on'; pw.classList.toggle('on',on); }; ps();
  pw.onclick=()=>{ const on=!conOn(); try{ localStorage.setItem('pr-con',on?'1':'0'); }catch(_){} const c=document.querySelector('#prRoom .p-con'); if(c) c.classList.toggle('off',!on); ps(); conSum(); };
  const sb=el('button','p-ubtn p-eart','Ear training'); sb.type='button'; sb.title='Scale recognition: hear this scale, then name its tones'; sb.onclick=()=>{ const k=st.key, t=st.type; close(); window.__earBack=()=>openScale(k,t); try{ if(window.EAR&&EAR.openTones) EAR.openTones(k,t); }catch(_){} };   /* replaces the Studio button */ const stb=$('#prStudio'); if(stb){ stb.hidden=false; stb.className='p-ubtn p-stud'; stb.textContent='Studio'; }   /* Practice in Studio, back beside Ear training */ if(ask){ ask.className='p-ubtn'; ask.textContent='Ask Dr. Onye'; }
  const fb=el('button','p-pow p-feedb'); fb.type='button'; fb.innerHTML='<i class="p-led"></i><span>Feed</span>'; fb.onclick=feedDlg; const sp=el('span',MQM.matches&&!MAXI?'p-sp p-dv':'p-sp'); bar.append(pw,bankBar(),sp,fb); setTimeout(feedSync,0);
  /* phone: the console can be opened full screen to set it, then closed */
  if(MQM.matches){ const mb=el('button','p-maxb'); mb.type='button'; mb.textContent=MAXI?'Done':'⤢'; mb.title=MAXI?'Close the full-screen console':'Open the console full screen'; mb.setAttribute('aria-label',mb.title); mb.onclick=()=>{ if(playing) return; MAXI=!MAXI; render(); }; setTimeout(()=>bar.appendChild(mb),0); } if(stb) bar.appendChild(stb); if(sb) bar.appendChild(sb); if(ask) bar.appendChild(ask); return bar; }
/* reps and key cycles: after the set number of reps the scale moves to the next key of the chosen cycle (pitch-class steps from the starting key) */
const KCY=[['chrom','Chromatic',[0,1,2,3,4,5,6,7,8,9,10,11]],['whole','Wholetone',[0,2,4,6,8,10]],['oct','Octatonic',[0,2,3,5,6,8,9,11]],['cyc4','Cyclical',[0,5,10,3,8,1,6,11,4,9,2,7]]];
const KC={origin:null,i:0,rep:0,base:null,place:false};
/* the pitch-class numbers say where each new tonic sits: that many half steps above the starting tonic, inside one octave.
   So the cycle never climbs away: in Cyclical, B♭ (10) goes down to E♭ (3) and A♭ (8) down to D♭ (1). Any starting key follows the same logic. */
const tonicOf=()=>{ const s0=steps[0]; if(!s0) return null; return (s0.rh&&s0.rh.length&&st.hand!=='lh')?s0.rh[0]:(s0.lh&&s0.lh.length?s0.lh[0]+(st.hand==='both'?24:0):null); };
function kcShift(x,d){ if(!x||!d) return; ['rh','lh'].forEach(k=>{ if(Array.isArray(x[k])) x[k]=x[k].map(m=>m+d); }); if(x.spell){ const o={}; Object.keys(x.spell).forEach(m=>o[+m+d]=x.spell[m]); x.spell=o; } if(x.alt) kcShift(x.alt,d); }
function kcRegister(){ if(!KC.place) return; KC.place=false; const c=KCY.find(x=>x[0]===st.kc); if(!c||KC.base==null) return; const t=tonicOf(); if(t==null) return;
  const want=KC.base+c[2][KC.i]; let d=12*Math.round((want-t)/12);
  const all=steps.flatMap(x=>[...(x.rh||[]),...(x.lh||[]),...((x.alt&&x.alt.rh)||[]),...((x.alt&&x.alt.lh)||[])]), hi=Math.max(...all), lo=Math.min(...all);
  while(hi+d>108) d-=12; while(lo+d<21) d+=12;   /* stays on the 88 keys */
  if(d) steps.forEach(x=>kcShift(x,d)); }
const pcOf=k=>{ const L={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[String(k)[0]]; let a=0; for(const ch of String(k).slice(1)){ if(ch==='#'||ch==='♯') a++; if(ch==='b'||ch==='♭') a--; } return ((L+a)%12+12)%12; };
function kcNextKey(peek){ const c=KCY.find(x=>x[0]===st.kc); if(!c) return null; const SC=window.SCALES, ok=(SC&&SC.allowedKeys)?SC.allowedKeys(st.type):((SC&&SC.keys)||[]); if(KC.origin==null) KC.origin=pcOf(st.key);
  let i=KC.i; for(let n=0;n<c[2].length;n++){ i=(i+1)%c[2].length; const pc=(KC.origin+c[2][i])%12, pref=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'][pc], k=ok.includes(pref)?pref:ok.find(x=>pcOf(x)===pc); if(k){ if(!peek) KC.i=i; return k; } } return null; }
/* called when one rep of the scale finishes; returns true when it has moved to a new key (playback restarts there) */
function repDone(){ KC.rep++; if(!st.kc||KC.rep<(st.reps||1)) return false; const nk=kcNextKey(); if(!nk) return false; KC.rep=0;
  SWITCHING=true; try{ clr(); st.key=nk; save(); KC.place=true; render(); playAll(); } finally{ SWITCHING=false; } updPause(); const m=$('#prMsg'); if(m) m.textContent='Next key: '+SYMK(nk)+'.'; return true; }
function repsRow(){ const r=el('div','p-xrow'), rl=el('label','p-rng p-tempo p-reps'); rl.innerHTML='Reps <input type="range" min="1" max="20" step="1" aria-label="Reps"><span class="p-bpm p-rpn"></span>'; const ri=rl.querySelector('input'), ro=rl.querySelector('span');
  ri.value=st.reps||5; ro.textContent=ri.value; ri.oninput=()=>{ st.reps=+ri.value; ro.textContent=ri.value; save(); }; r.appendChild(rl);
  const g=el('div','p-kcg'); g.setAttribute('role','group'); g.setAttribute('aria-label','Key cycle'); g.appendChild(el('span','p-bl','Keys'));
  KCY.forEach(([k,l])=>{ const b=el('button','p-key'); b.type='button'; b.innerHTML='<i class="p-led"></i><span></span>'; b.lastChild.textContent=l; b.title=l==='Cyclical'?'Up in perfect fourths: pitch classes 0 5 10 3 8 1 6 11 4 9 2 7':l==='Octatonic'?'Whole step, half step, until it gets back to the starting note':l==='Wholetone'?'Up a whole step each time (six keys)':'Up a half step each time (all twelve keys)';
    const sync=()=>{ b.classList.toggle('on',st.kc===k); b.setAttribute('aria-pressed',String(st.kc===k)); }; sync(); b.__s=sync;
    b.onclick=()=>{ st.kc=st.kc===k?'':k; KC.origin=pcOf(st.key); KC.i=0; KC.rep=0; KC.base=tonicOf(); save(); g.querySelectorAll('.p-key').forEach(x=>x.__s&&x.__s()); conSum(); }; g.appendChild(b); });
  r.appendChild(g); return r; }
/* the reps row sits in the empty space under the shorter channels when there is room; otherwise on its own line */
function xrowPlace(){ const con=document.querySelector('#prRoom .p-con'), mx=con&&con.querySelector('.p-mix'), xr=con&&con.querySelector('.p-xrow'); if(!xr||!mx) return;
  xr.classList.remove('abs','col'); xr.style.left=xr.style.top=xr.style.width='';
  const sl=mx.scrollLeft||0, bottom=mx.offsetTop+mx.offsetHeight-6;
  const measure=col=>{ xr.classList.toggle('col',col); xr.classList.add('abs'); xr.style.visibility='hidden'; xr.style.width='auto'; const r={w:xr.scrollWidth,h:xr.offsetHeight}; xr.classList.remove('abs','col'); xr.style.visibility=''; xr.style.width=''; return r; };
  const runFor=H=>{ const lim=bottom-H-4; let best=null, run=null;
    [...mx.children].forEach(x=>{ if(!x.offsetWidth) return; const c=x.querySelector('.p-bcol'), b=x.classList.contains('p-lvl')||!c?1e9:x.offsetTop+c.offsetTop+c.offsetHeight, L=x.offsetLeft-sl, R=L+x.offsetWidth;
      if(b<=lim){ if(!run) run={l:L,r:R}; else run.r=R; if(!best||run.r-run.l>best.r-best.l) best={l:run.l,r:run.r}; } else run=null; }); return best; };
  for(const col of [false,true]){ const m=measure(col), best=runFor(m.h); if(best&&best.r-best.l>=m.w+8){ xr.classList.add('abs'); xr.classList.toggle('col',col); xr.style.left=(best.l+4)+'px'; xr.style.top=(bottom-m.h)+'px'; xr.style.width=(best.r-best.l-8)+'px'; return; } } }
const MXO='pr-mixorder';
function mixOrder(panel){
  let ord=[]; try{ ord=JSON.parse(localStorage.getItem(MXO)||'[]'); }catch(_){}
  const strips=[...panel.children], pos=c=>{ const i=ord.indexOf(c); return i<0?999:i; };
  strips.map((x,i)=>[x,i]).sort((a,b)=>(pos(a[0].dataset.ch)-pos(b[0].dataset.ch))||(a[1]-b[1])).forEach(([x])=>panel.appendChild(x));
  const save=()=>{ try{ localStorage.setItem(MXO,JSON.stringify([...panel.children].map(x=>x.dataset.ch))); }catch(_){} };
  [...panel.children].forEach(strip=>{ const h=strip.querySelector('.p-cht'); if(!h) return; h.title='Drag to move this channel';
    h.addEventListener('pointerdown',e=>{ if(e.button) return; e.preventDefault(); const x0=lpt(panel,e).x; let moved=false;
      const mv=ev=>{ if(!moved&&Math.abs(lpt(panel,ev).x-x0)<=4) return; moved=true; strip.classList.add('p-drag');
        const sib=[...panel.children].filter(x=>x!==strip); let before=null; for(const x of sib){ if(lpt(x,ev).x<x.offsetWidth/2){ before=x; break; } }
        if(strip.nextSibling!==before) panel.insertBefore(strip,before); };
      const up=()=>{ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); document.removeEventListener('pointercancel',up); if(moved){ strip.classList.remove('p-drag'); save(); setTimeout(xrowPlace,0); } };
      document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up); }); });
}
/* memory banks: store the whole console (scale, note, octaves, tempo, loop, every channel and both volume faders) in one of six banks.
   Press SAVE, then a number, to store; press a number to recall. A lit number holds a setting; green is the one in use. */
const BKS='pr-banks', BKEYS=['family','type','key','motion','mode','oct','hand','dir','sys','bpm','loop','rhy','reps','kc'];
/* twelve memory banks in the Scale room and twelve in the Chord room (each room keeps its own) */
const NBANK=12, CKEYS=['cmode','chords','cview','invs','vh','cg','vg','bline','ckey','cpick','ctr','coct','nstaff','nkb','nlab','akey','aq','aoct','ahand','alh','adir','bpm','loop'];
const bks=()=>kind==='chords'?'pr-cbanks':BKS, bkeys=()=>kind==='chords'?CKEYS:BKEYS, bcurK=()=>kind==='chords'?'pr-cbank-cur':'pr-bank-cur';
let bankArm=false, bankDel=false;
const bcur=()=>{ try{ return +(localStorage.getItem(bcurK())??-1); }catch(_){ return -1; } }, bcurSet=i=>{ try{ localStorage.setItem(bcurK(),String(i)); }catch(_){} };
const banksGet=()=>{ try{ const b=JSON.parse(localStorage.getItem(bks())||'[]'); return Array.isArray(b)?b:[]; }catch(_){ return []; } };
const bankName=b=>{ if(!b||!b.s) return 'Empty'; const x=b.s; if(kind==='chords') return cBankName(x); const SC=window.SCALES, t=((SC&&SC.types)||[]).find(q=>q.id===x.type);
  return SYMK(x.key)+' '+(x.type==='major'?'major':(t?t.l:x.type))+' · '+({rh:'right hand',lh:'left hand',both:'both hands'}[x.hand]||'')+(x.motion==='contrary'?', contrary':'')+' · '+(x.rhy&&x.rhy!=='free'?{q:'quarter notes',e:'eighth notes',t:'triplets',s:'sixteenth notes'}[x.rhy]:(x.oct||1)+' oct')+' · '+x.bpm+' BPM'; };
function bankSync(){ const b=banksGet(); document.querySelectorAll('#prRoom .p-banks').forEach(bar=>{ bar.classList.toggle('arm',bankArm); bar.classList.toggle('del',bankDel); { const dl=bar.querySelector('.p-bdel'); if(dl) dl.setAttribute('aria-pressed',String(bankDel)); }
  bar.querySelectorAll('.p-bank').forEach((k,i)=>{ k.classList.toggle('has',!!b[i]); k.classList.toggle('on',i===bcur()&&!!b[i]); k.title=(bankDel?(b[i]?'Delete bank '+(i+1)+': '+bankName(b[i]):'Bank '+(i+1)+' is already empty'):bankArm?'Save to bank '+(i+1)+(b[i]?' (replaces: '+bankName(b[i])+')':''):b[i]?'Bank '+(i+1)+': '+bankName(b[i]):'Bank '+(i+1)+' is empty. Press SAVE, then '+(i+1)+', to store this setting'); });
  const sv=bar.querySelector('.p-bsave'); if(sv) sv.setAttribute('aria-pressed',String(bankArm)); }); }
function bankPress(i){ const b=banksGet();
  if(bankDel){ bankDel=false; const m=$('#prMsg'); if(!b[i]){ if(m) m.textContent='Bank '+(i+1)+' is already empty.'; bankSync(); return; } b[i]=null; try{ localStorage.setItem(bks(),JSON.stringify(b)); }catch(_){} if(bcur()===i) bcurSet(-1); bankSync(); if(m) m.textContent='Bank '+(i+1)+' deleted.'; return; }
  if(bankArm){ const snap={s:{},v:{}}; bkeys().forEach(k=>snap.s[k]=st[k]); if(window.CLASS&&CLASS.vol){ snap.v.keys=CLASS.vol.get('keys'); snap.v.click=CLASS.vol.get('click'); } b[i]=snap; try{ localStorage.setItem(bks(),JSON.stringify(b)); }catch(_){} bankArm=false; bcurSet(i); bankSync(); const m=$('#prMsg'); if(m) m.textContent='Saved to bank '+(i+1)+': '+bankName(snap)+'.'; return; }
  if(!b[i]){ const m=$('#prMsg'); if(m) m.textContent='Bank '+(i+1)+' is empty. Press SAVE, then '+(i+1)+', to store the console here.'; return; }
  clr(); bkeys().forEach(k=>{ if(b[i].s[k]!==undefined) st[k]=JSON.parse(JSON.stringify(b[i].s[k])); }); save(); if(b[i].v&&window.CLASS&&CLASS.vol){ if(isFinite(b[i].v.keys)) CLASS.vol.set('keys',b[i].v.keys); if(isFinite(b[i].v.click)) CLASS.vol.set('click',b[i].v.click); }
  bcurSet(i); if(kind==='scales') loadScale(); render(); try{ menuSync(); }catch(_){} const m=$('#prMsg'); if(m) m.textContent='Bank '+(i+1)+': '+bankName(b[i])+'.'; }
function bankBar(){ const bar=el('div','p-banks'); bar.setAttribute('role','group'); bar.setAttribute('aria-label','Memory banks'); bar.appendChild(el('span','p-bl','Memory'));
  for(let i=0;i<NBANK;i++){ const k=el('button','p-bank'); k.type='button'; k.innerHTML='<i class="p-led"></i>'+(i+1); k.onclick=()=>bankPress(i); bar.appendChild(k); }
  const sv=el('button','p-bsave','Save'); sv.type='button'; sv.onclick=()=>{ bankArm=!bankArm; bankDel=false; bankSync(); const m=$('#prMsg'); if(m) m.textContent=bankArm?'Now press a bank number (1 to 12) to save this console there.':''; }; bar.appendChild(sv);
  const dl=el('button','p-bdel','Delete'); dl.type='button'; dl.onclick=()=>{ bankDel=!bankDel; bankArm=false; bankSync(); const m=$('#prMsg'); if(m) m.textContent=bankDel?'Now press the bank number (1 to 12) you want to delete.':''; }; bar.appendChild(dl);
  setTimeout(bankSync,0); return bar; }
/* a pointer position in an element's own coordinates. On a phone the whole page is turned sideways (the body is rotated 90°),
   so screen up/down is the page's left/right: map through the rotation so faders and dragging follow the finger */
function lpt(el,e){ const r=el.getBoundingClientRect(); let a=1,b=0,c=0,d=1; try{ const t=getComputedStyle(document.body).transform; if(t&&t!=='none'){ const m=new DOMMatrix(t), k=Math.hypot(m.a,m.b)||1; a=Math.round(m.a/k); b=Math.round(m.b/k); c=Math.round(m.c/k); d=Math.round(m.d/k); } }catch(_){}
  const ox=(a<0||c<0)?r.right:r.left, oy=(b<0||d<0)?r.bottom:r.top, dx=e.clientX-ox, dy=e.clientY-oy; return {x:dx*a+dy*b,y:dx*c+dy*d}; }
/* practice levels: keyboard and metronome volume, as continuous mixer faders (desktop) or small sliders (phone) */
const VK=[['keys','Keys'],['click','Click']], vget=k=>(window.CLASS&&CLASS.vol)?CLASS.vol.get(k):0.87, vset=(k,v)=>{ if(window.CLASS&&CLASS.vol) CLASS.vol.set(k,v); document.querySelectorAll('#prRoom [data-vol='+k+']').forEach(x=>x.__sync&&x.__sync()); };
/* meters: 12 lights per channel (green, then amber, then red at the top), reading the level after the fader while you play */
const MSEG=12, MLO=-36, MREF={keys:6,click:-17};   /* the meter reads relative to each channel's normal level: amber at full playing level, red when pushed hot */ let mRaf=0, mLast=0; const mDisp={keys:-99,click:-99};
function meterTick(t){ mRaf=0; const dt=mLast?Math.min(.1,(t-mLast)/1000):.016; mLast=t; let live=false;
  ['keys','click'].forEach(k=>{ const lv=((window.CLASS&&CLASS.meter)?CLASS.meter(k):-99)-MREF[k]; mDisp[k]=Math.max(lv,mDisp[k]-dt*24); if(mDisp[k]>MLO-1) live=true;
    const n=Math.max(0,Math.min(MSEG,Math.ceil((mDisp[k]-MLO)/3.5)));
    document.querySelectorAll('#prRoom .p-lvl[data-vol='+k+'] .p-mtr').forEach(m=>{ const ls=m.children; for(let j=0;j<ls.length;j++){ const idx=ls.length-1-j; ls[j].classList.toggle('lit',idx<n); } }); });
  if(ov&&!ov.hidden&&(playing||live)) mRaf=requestAnimationFrame(meterTick); else mLast=0; }
const meterGo=()=>{ if(!mRaf){ mLast=0; mRaf=requestAnimationFrame(meterTick); } };
function levels(HH){
  return VK.map(([k,title],i)=>{ const H=HH||100, strip=el('div','p-ch p-lvl'); strip.tabIndex=0; strip.dataset.vol=k; strip.dataset.ch=title; strip.setAttribute('role','slider'); strip.setAttribute('aria-label',title+' volume'); strip.setAttribute('aria-valuemin','0'); strip.setAttribute('aria-valuemax','100'); strip.title=title==='Keys'?'Keyboard volume':'Metronome volume';
    strip.appendChild(el('div','p-cht',title)); const fz=el('div','p-fz'); fz.style.height=(H+18)+'px'; fz.appendChild(el('div','p-tr'));
    [0,.25,.5,.75,1].forEach(f=>fz.appendChild(Object.assign(el('i','p-tick'),{style:'top:'+(9+(1-f)*H)+'px'})));
    const cap=el('div','p-cap'); fz.appendChild(cap); const rd=el('div','p-lvn'); strip.appendChild(fz); strip.appendChild(rd); if(window.CLASS&&CLASS.ms) strip.appendChild(CLASS.ms.ui(k,{name:title}));
    { const mt=el('div','p-mtr'); mt.style.top='9px'; mt.style.height=H+'px'; for(let j=MSEG-1;j>=0;j--) mt.appendChild(el('i',j>=MSEG-2?'r':j>=MSEG-4?'a':'g')); fz.appendChild(mt); }
    const sync=()=>{ const v=vget(k); cap.style.top=(9+(1-v)*H)+'px'; rd.textContent=Math.round(v*100); strip.setAttribute('aria-valuenow',String(Math.round(v*100))); }; strip.__sync=sync; sync();
    const at=e=>1-(Math.max(9,Math.min(H+9,lpt(fz,e).y))-9)/H;
    let drag=false; fz.addEventListener('pointerdown',e=>{ drag=true; fz.setPointerCapture(e.pointerId); cap.classList.add('drag'); cap.style.transition='none'; vset(k,at(e)); e.preventDefault(); });
    fz.addEventListener('pointermove',e=>{ if(drag) vset(k,at(e)); });
    const end=()=>{ if(!drag) return; drag=false; cap.classList.remove('drag'); cap.style.transition=''; }; fz.addEventListener('pointerup',end); fz.addEventListener('pointercancel',end);
    fz.addEventListener('dblclick',()=>vset(k,(window.CLASS&&CLASS.vol&&CLASS.vol.def)||0.87));
    strip.addEventListener('keydown',e=>{ const d={ArrowUp:.05,ArrowRight:.05,ArrowDown:-.05,ArrowLeft:-.05}[e.key]; if(d){ e.preventDefault(); e.stopPropagation(); vset(k,vget(k)+d); } });
    return strip; });
}
function levelsSmall(){
  return VK.map(([k,title])=>{ const l=el('label','p-rng p-tempo p-vol'); l.dataset.vol=k; l.innerHTML='<span></span><input type="range" min="0" max="100" step="1">'; l.firstChild.textContent=title; const r=l.querySelector('input'); r.setAttribute('aria-label',title==='Keys'?'Keyboard volume':'Metronome volume');
    l.__sync=()=>{ r.value=Math.round(vget(k)*100); }; l.__sync(); if(window.CLASS&&CLASS.ms) l.appendChild(CLASS.ms.ui(k,{name:title,cls:'ms-in'})); r.oninput=()=>{ if(window.CLASS&&CLASS.vol) CLASS.vol.set(k,r.value/100); document.querySelectorAll('#prRoom .p-lvl[data-vol='+k+']').forEach(x=>x.__sync&&x.__sync()); }; return l; });
}
function seg(parent,list,val,fn,small){ parent.textContent=''; if(small) parent.classList.add('sm'); list.forEach(([k,t])=>{ const b=el('button',null,t); b.type='button'; b.dataset.k=k; b.setAttribute('aria-pressed',String(k===val)); b.onclick=()=>fn(k); parent.appendChild(b); }); }

function render(){
  { const dt=ov&&ov.querySelector('#prDisp .pd-top'), dtp=ov&&ov.querySelector('#prDisp .pd-tp'); if(dt) dt.textContent=''; if(dtp) dtp.textContent=''; }
  { const pk=$('#prPick'); if(pk) pk.hidden=false; }
  ov.querySelectorAll('.e-top .p-motop').forEach(x=>x.remove());
  clr(); const SC=window.SCALES, hand=$('#prHand'), cats=$('#prCats'), ctl=$('#prCtl'); { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); } ctl.textContent=''; cats.textContent=''; document.querySelectorAll('#prRoom .p-sels').forEach(n=>n.remove()); $('#prMsg').textContent='';
  $('#prH').textContent=kind==='scales'?'Scale practice':'Chord practice'; ov.setAttribute('aria-label',$('#prH').textContent);
  ov.classList.toggle('p-ph',kind==='scales'&&MQM.matches);   /* phone: the room's title row folds into the first row of controls, so the console has room */
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
    const mo=el('div','e-seg sm'); mo.setAttribute('role','group'); mo.setAttribute('aria-label','Motion'); seg(mo,MOTIONS,st.motion,k=>{ st.motion=k; if(k==='contrary'){ const mc=(SC&&SC.maxOct)?SC.maxOct(st.key,'both','contrary'):2; if(st.oct>mc) st.oct=mc; } save(); clr(); render(); },true); if(!isDia){ const cb=mo.querySelector('[data-k=contrary]'); if(cb){ cb.disabled=true; cb.title='Contrary motion is for the diatonic scales'; } } ctl.appendChild(mo);
    const md=el('div','e-seg sm'); md.setAttribute('role','group'); md.setAttribute('aria-label','Mode'); seg(md,[['learn','Learning'],['practice','Practice']],st.mode,k=>{ st.mode=k; save(); clr(); md.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); },true); ctl.appendChild(md);
    const fav=(SC&&SC.alts)?SC.alts(st.key,st.type):null; if(!fav&&st.fa==='alt') st.fa='main'; let fg=null;
    if(fav){ fg=el('div','e-seg sm'); fg.setAttribute('role','group'); fg.setAttribute('aria-label','Fingering'); seg(fg,[['main','Main fingering'],['alt','Alternate']],st.fa||'main',k=>{ st.fa=k; save(); fg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k))); loadScale(); },true); fg.title='Alternate fingering, from the book'; ctl.appendChild(fg); }
    const sy=el('div','e-seg sm'); sy.setAttribute('role','group'); sy.setAttribute('aria-label','Note names'); seg(sy,[['letter','Letters'],['solfa','Solfa'],['number','Numbers']],st.sys,k=>{ st.sys=k; save(); clr(); render(); },true);
    if(!hasSol()) sy.querySelectorAll('[data-k=solfa],[data-k=number]').forEach(b=>{ b.disabled=true; b.title='Solfa is not added for this scale yet'; }); ctl.appendChild(sy);
    if(st.rhy&&st.rhy!=='free'&&rhyOK(st.rhy)) st.rhy='free';
    const ry=el('div','e-seg sm'); ry.setAttribute('role','group'); ry.setAttribute('aria-label','Rhythm'); seg(ry,RHY,st.rhy||'free',k=>{ st.rhy=k; save(); clr(); loadScale(); render(); },true);
    ry.querySelectorAll('button').forEach(b=>{ const w=rhyOK(b.dataset.k); if(w){ b.disabled=true; b.title=w; } }); ctl.appendChild(ry);
    if(rhyN()) d.querySelectorAll('button').forEach(b=>{ b.disabled=true; b.title='Rhythm practice always goes up and down'; });
    const mo4=(SC&&SC.maxOct)?SC.maxOct(st.key,st.hand,st.motion):3; if(st.oct>mo4) st.oct=mo4;
    ctl.appendChild(sel('Octaves',[{v:'1',t:'One octave'},{v:'2',t:'Two octaves'}].concat(st.motion!=='contrary'||mo4>=3?[{v:'3',t:'Three octaves'}]:[]).concat(mo4>=4?[{v:'4',t:'Four octaves'}]:[]),String(st.oct||1),v=>{ if(rhyN()){ const r={1:'q',2:'e',3:'t',4:'s'}[+v]; if(r&&!rhyOK(r)){ st.rhy=r; save(); render(); return; } } st.oct=+v; save(); loadScale(); }));
    ctl.lastChild.classList.add('p-octs'); if(rhyN()){ const os=ctl.lastChild.querySelector('select'); if(os){ os.title='In rhythm practice the octaves go with the rhythm: one octave quarter notes, two eighth notes, three triplets, four sixteenth notes'; const o=[...os.options].find(x=>+x.value===rhyN()); if(o) os.value=o.value; else { const n=document.createElement('option'); n.value=String(rhyN()); n.textContent=['','One','Two','Three','Four'][rhyN()]+' octave'+(rhyN()>1?'s':''); os.appendChild(n); os.value=n.value; } } }
    transport(ctl); ctl.appendChild(d);
    const ask=el('button','e-btn','Ask Dr. Onye about this scale'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout(st.type==='major'?'Tell me about the '+st.key+' major scale. How is it built with the 3+4 method, and what should I practice with it?':'Tell me about the '+st.key+' '+((SC&&SC.types||[]).find(t=>t.id===st.type)||{l:''}).l+' scale. How is it built, and what should I practice with it?',{fresh:true}); }; ctl.appendChild(ask);
    /* desktop: Practice in Studio and Ask Dr. Onye sit together on their own line, with the memory banks */ /* (Studio and Ask Dr. Onye now live on the console's bottom bar) */
    if(MQM.matches){ /* phone: row 1 = Scale, Note, Octaves, Loop, Tempo, Ask Dr. Onye; row 2 = the toggles and Play scale; keyboard below. Desktop keeps its layout. */
      const r1=el('div','p-r1'), r2=el('div','p-r2'), rg=ctl.querySelectorAll('.p-rng'), pl=$('#prPlay'), oc=ctl.querySelector('.p-octs');
      ms.querySelectorAll('.p-sel').forEach(x=>r1.appendChild(x)); ms.remove();
      const r3=el('div','p-r3'); r1.append(oc,rg[1],rg[0]); ask.textContent='Ask Dr. Onye'; r2.append(fm,mo,md,sy,hand,d,ry); if(fg) r2.append(fg); r2.hidden=true; ctl.append(r1,r2); void r3; { const bk=el('button','e-round p-bk','←'); bk.type='button'; bk.setAttribute('aria-label','Back'); bk.onclick=()=>{ const x=$('#prX'); if(x) x.click(); }; r1.prepend(bk); }
    } else { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); /* Up / Down and Similar / Contrary sit with the hands (clear the ones from the last render first) */ top.querySelectorAll('.p-motop').forEach(x=>x.remove()); d.classList.add('p-motop'); d.style.marginLeft='auto'; mo.classList.add('p-motop'); top.insertBefore(d,hand); top.insertBefore(mo,hand); /* desktop: Scale and Note sit with the other controls */ const sl=[...ms.querySelectorAll('.p-sel')]; /* first row: Scale, Note, Tempo and Loop together */ const r0=el('div','p-r0'); sl.reverse(); /* Note first, then Scale */ sl.forEach((x,i)=>{ x.classList.add('p-sel-d'); /* fixed widths: the Scale box never grows or shrinks with the name */ x.style.minWidth=x.style.width=x.style.maxWidth=i===0?'84px':'250px'; x.style.flex='none'; if(i){ const q=x.querySelector('select'); if(q){ q.style.textOverflow='ellipsis'; q.title=q.options[q.selectedIndex]?q.options[q.selectedIndex].text:''; } } r0.appendChild(x); }); { const oc=ctl.querySelector('.p-octs'); if(oc) r0.appendChild(oc); } ctl.querySelectorAll('.p-rng').forEach(x=>r0.appendChild(x)); ctl.insertBefore(r0,ctl.firstChild); ms.remove(); }
    /* desktop: the six choices become a digital mixer, one channel strip each; the fader's stops are the options */
    { const mxi=MQM.matches&&MAXI, ph=MQM.matches&&!MAXI, chs=[['Hand',hand,{pair:[['lh','Left hand'],['rh','Right hand']],both:'both',lock:()=>st.motion==='contrary',lockWhy:'Contrary motion always uses both hands'}],['Motion',mo],['Direction',d,{pair:st.motion==='contrary'?[['up','Open'],['down','Close']]:[['up','Ascending'],['down','Descending']],both:'updown'}],['Family',fm],['Mode',md],['Names',sy],['Rhythm',ry]]; if(fg) chs.push(['Fingering',fg]);
      chs.forEach(([,x])=>x.classList.add('p-src')); const row=el('div','p-mixrow'+(ph?' ph':'')+(mxi?' maxi':'')), tp=el('div','p-tp'); { let bk=$('#prBreak'); if(!bk){ bk=el('button','e-btn p-brk','☕ Break'); bk.type='button'; bk.id='prBreak'; bk.title='Take a break: practice carries on when the timer runs out'; bk.onclick=takeBreak; } bk.hidden=!(SES.on&&paused); tp.append($('#prPlay'),bk,$('#prPause')); } const mx=mixer(chs); mx.append(...levels(ph?36+3*PHX:(ov.querySelector('#prConP.max')?220:132))); mixOrder(mx);
      const con=el('div','p-con'+(conOn()?'':' off')), sum=el('div','p-sum'); con.append(mx,sum,repsRow(),conBar(ask,ph)); if(ph) row.style.setProperty('--pe',PHX+'px'); setTimeout(()=>{ xrowPlace(); if(ph) phoneFit(); },0); row.append(con); conSum();
      /* the top controls and Play / Stop / Break live in the Display */ { const dt=$('#prDisp .pd-top'), dtp=$('#prDisp .pd-tp'); if(dt&&dtp){ const r=ctl.querySelector(ph?'.p-r1':'.p-r0'); if(r) dt.appendChild(r); dtp.appendChild(tp); } else row.append(tp); }
      const r0=ctl.querySelector(ph?'.p-r1':'.p-r0'); if(r0&&r0.nextSibling) ctl.insertBefore(row,r0.nextSibling); else ctl.appendChild(row); }
    loadScale();
  } else {
    hand.hidden=true; $('#prPick').textContent=''; $('#prPick').hidden=true;
    /* the chord console: Mode, Inversion and Technique as lit buttons; the chord canvas (or Key and Chord for voicings); then Play, Stop, tempo, Tap, Loop */
    chordDefaults(); const K=window.EAR&&EAR.kit, box=el('div','p-ccon'); ctl.appendChild(box); chordConsole(box);
    const area=el('div','p-carea'); box.appendChild(area);
    /* every part of the console is always there; each part can be used only in the modes it belongs to (greyed out otherwise):
       Chord, Octaves, Hands, Left hand, Direction (Octaves and Direction serve Inversions too); Note (Inversions, Voicings, Arpeggios) and Chord (Inversions, Voicings); the chord canvas */
    arpUI(area);
    { const md=st.cmode, r1=el('div','e-ctl p-cdd'); area.appendChild(r1);
      if(K){ if(!st.cpick) st.cpick=K.CHK[0]+':0';
        const nb=selBox('Note',K.KEYS.map(k=>({v:k,t:DSP(k)})),st.ckey,v=>{ st.ckey=v; save(); if(st.cmode==='inv') loadInv(); else if(st.cmode==='arp') loadArp(); else loadVoicings(); }); r1.appendChild(nb);
        const opts=[]; K.CHK.forEach(c=>{ if(md==='inv'&&c==='nin') return; K.CH[c][1].forEach((ch,i)=>opts.push({g:K.CH[c][0],v:c+':'+i,t:ch[0]})); });
        if(md==='inv'&&/^nin:/.test(st.cpick||'')) st.cpick='tri:0';
        const cb=selBox('Chord',opts,st.cpick||'',v=>{ st.cpick=v; save(); if(st.cmode==='inv') loadInv(); else loadVoicings(); }, 'prChord'); r1.appendChild(cb);
        if(md==='canvas'){ nb.classList.add('p-dis'); nb.querySelector('select').disabled=true; nb.title='Note is for Inversions, Voicings and Arpeggios'; }
        if(md==='canvas'||md==='arp'){ cb.classList.add('p-dis'); cb.querySelector('select').disabled=true; cb.title='Chord is for Inversions and Voicings'; } }
      r1.appendChild(el('p','p-cvhelp',md==='inv'?'One chord at a time, in every inversion that is on (Octaves and Direction carry it up and down the keyboard).':md==='voice'?'One chord at a time: tap a voicing in the Display to hear it and see it on the keys.':md==='arp'?'Arpeggios: Note, then Triad (major or minor), Octaves, Hands, Left hand and Direction above.':'Type chords in the Chord canvas below.')); }
    canvasUI(area,st.cmode!=='canvas');
    const r2=el('div','e-ctl p-ctr'); box.appendChild(r2); transport(r2);
    const bkr=el('div','e-ctl p-cbk'); box.appendChild(bkr); bkr.appendChild(bankBar());
    const ask=el('button','e-btn','Ask Dr. Onye about this chord'); ask.type='button'; ask.onclick=()=>{ const s=steps[cur>=0?cur:0]; close(); if(window.CLASS) CLASS.askAbout(s?'Tell me more about '+s.name+'. How is it built, how do I voice it, and what should I practice with it?':'Help me practice chords on the keyboard.',{fresh:true}); }; r2.appendChild(ask);
    $('#prLbl').textContent='Chord practice';
    if(st.cmode==='voice') loadVoicings(true); else if(st.cmode==='inv') loadInv(true); else if(st.cmode==='arp') loadArp(true); else if(st.chords) loadChords(st.chords,true); else { steps=[]; cur=-1; chips(); show(); $('#prMsg').textContent='Type chords in the Chord canvas.'; chordTip([]); }
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
  syncStudioBtn(); clr(); const SC=window.SCALES; if(!SC||!SC.build) return; if(st.rhy&&st.rhy!=='free'&&rhyOK(st.rhy)) st.rhy='free'; steps=SC.build(st.key,st.hand,st.type,rhyN()||st.oct,st.motion,st.fa==='alt'); kcRegister(); cur=-1; chips();
  const g=steps.map(s=>s.name), TL=(SC.types.find(t=>t.id===st.type)||{l:'Major'}).l, maj=st.type==='major'; $('#prLbl').textContent='';   /* the page title already says Scale practice */ const ocN=rhyN()||st.oct; $('#prBig').textContent=SYMK(st.key)+' '+(maj?'major':TL)+(ocN>1?' · '+ocN+' octaves':'')+(rhyN()?' · '+({q:'quarter notes',e:'eighth notes',t:'triplets',s:'sixteenth notes'})[st.rhy]:'')+(st.motion==='contrary'?' · contrary motion':'')+((st.fa==='alt'&&SC.alts&&SC.alts(st.key,st.type))?' · alternate fingering':''); { const L=steps.map(x=>lab(x,false)); let sub=(maj&&st.oct===1)?(L.slice(0,3).join(' ')+'  |  '+L.slice(3,7).join(' ')+'  |  '+L[7]):L.join(' '); const dn=steps.map(x=>lab(x.alt||x,true)); if(dn.join(' ')!==L.join(' ')&&(steps.some(x=>x.alt)||(sysNow()!=='letter'&&steps.some(x=>x.solD)))) sub+='   ·   coming down: '+dn.slice().reverse().join(' '); $('#prSub').textContent=sub; }
  const rh=steps.some(s=>s.fing), lh=steps.some(s=>s.lfing), hs=st.hand!=='lh', ls=st.hand!=='rh';
  if(st.motion==='contrary'){ $('#prMsg').textContent='Contrary motion: both hands start on '+SYMK(st.key)+', an octave apart. Open: the right hand goes up and the left hand goes down. Close: they come back together.'+((hs&&!rh)||(ls&&!lh)?' The fingering for this key is not in the lessons yet.':''); drawKb(); keyTip(); return; }
  const miss=[]; if(hs&&!rh) miss.push('right-hand'); if(ls&&!lh) miss.push('left-hand');
  $('#prMsg').textContent=miss.length?('The '+miss.join(' and ')+' fingering for '+SYMK(st.key)+(st.type==='major'?' major':' '+TL)+(st.oct>1?' in '+st.oct+' octaves':'')+' is not in the lessons yet. The notes are shown; fingering will appear once it is added.'):'Press Play to hear it.';
  drawKb(); keyTip();
}
function chordTip(list){
  let t=document.getElementById('prTip'); if(!t){ t=el('div','p-tip'); t.id='prTip'; const m=$('#prMsg'); m.parentNode.insertBefore(t,m.nextSibling); }
  t.textContent=''; t.hidden=true; const seen={};
  (list||[]).forEach(n=>{ const m=String(n).match(/^([A-G])(#|b)?(m|min|-)(?!aj|a)/); if(!m) return; let k=m[1]+(m[2]||''); if(k==='A#') k='Bb'; if(k==='Db'||k==='Gb'||k==='Ab') return; if(MCH[k]&&!seen[k==='Eb'?'D#':k]){ seen[k==='Eb'?'D#':k]=1; t.appendChild(el('p',null,MCH[k])); } });
  t.hidden=!t.children.length;
}
const INV=['Root','1st','2nd','3rd'];
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
function invert(s,iv){ const T=triad(s); if(!T||!(s.rh&&s.rh.length)) return s; s.tri=true; const inv=iv==null?(st.inv||0):iv;
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
  /* four notes: whichever of 1 2 3 5 / 1 2 4 5 / 1 3 4 5 fits the gaps (G B D E -> 1 2 4 5, C E G B -> 1 2 3 5); five notes: 1 2 3 4 5 */
  if(!o.rfm&&rh&&(rh.length===4||rh.length===5)){ let F=[1,2,3,4,5];
    /* each pair of fingers has a comfortable span (thumb to 2 reaches a fourth); the fingering that keeps every gap inside its span wins, 1 2 3 5 first (F# B C E -> 1 2 3 5) */
    if(rh.length===4){ const rg={'1,2':[1,5],'1,3':[3,7],'2,3':[1,3],'2,4':[3,5],'3,4':[1,2],'3,5':[3,5],'4,5':[1,3]}, g=[rh[1]-rh[0],rh[2]-rh[1],rh[3]-rh[2]]; let bc=1e9;
      [[1,2,3,5],[1,2,4,5],[1,3,4,5]].forEach(f=>{ let c=0; for(let k=0;k<3;k++){ const r=rg[f[k]+','+f[k+1]]; c+=g[k]<r[0]?r[0]-g[k]:g[k]>r[1]?g[k]-r[1]:0; } if(c<bc){ bc=c; F=f; } }); }
    o.rfm={}; rh.forEach((m,i)=>o.rfm[m]=F[i]); o.nofing=false; }
  /* left hand: two notes 5 1, three notes 5 3 1 (or 5 2 1 when the top two are close) */
  if(!o.lfm&&lh&&lh.length>=2&&lh.length<=3){ o.lfm={}; const L=lh.length===2?[5,1]:(lh[2]-lh[1]<=2?[5,2,1]:[5,3,1]); lh.forEach((m,i)=>o.lfm[m]=L[i]); }
  if(o.rfm) o.nofing=false; return o; }
function invBtn(){ const b=document.getElementById('prInv'); if(!b) return; const ok=steps.some(x=>x.tri), s=b.querySelector('select'); if(s) s.disabled=!ok; b.style.opacity=ok?'':'.45'; b.title=ok?'Play the triads in root position, first or second inversion':'Inversions work on triads only'; }
/* ---------- left-hand bass fingering across a progression (Dr. Onye's logic). Only where the left hand plays one bass note per chord.
   He looks ahead at the whole progression first, then fingers the bass:
   - down a fifth: 1-5. A 2-5-1 or cyclical bass (down a fifth, up a fourth): 1-5-2 or 1-5-1 (1 when the cycle carries on down another fifth).
   - up a fourth: 5-2 or 4-1. 5-2 when the next bass falls below where it started (a 2-5-1); 4-1 when the progression ends there,
     or when the next bass goes up another fourth (the thumb stretches to play it).
   - stepwise down the scale: 1 2 3 4 5, or 1 2 3 1 2 3 4 5 for a longer run. Stepwise up: 5 4 3 2 1, or 5 4 3 2 1 3 2 1.
   - half steps: the chromatic fingering (left hand, by key: C 1, D♭ 3, D 1, E♭ 3, E 2, F 1, F♯ 3, G 1, A♭ 3, A 1, B♭ 3, B 2; a run up from C starts on 4, a run down to C ends on 4).
   All of it holds on the black keys too (B♭ E♭ A♭ D♭ G♭). ---------- */
const CHRL={0:1,1:3,2:1,3:3,4:2,5:1,6:3,7:1,8:3,9:1,10:3,11:2};
function bassFing(st){
  const b=st.map(s=>s&&s.lh&&s.lh.length===1?s.lh[0]:null), n=b.length, F=new Array(n).fill(null), pc=m=>((m%12)+12)%12;
  const d=i=>(i+1<n&&b[i]!=null&&b[i+1]!=null)?b[i+1]-b[i]:null;
  /* stepwise runs (half and whole steps, one direction): with a whole step it is the scale fingering, all half steps the chromatic one */
  let i=0; while(i<n-1){ const d0=d(i); if(d0==null||Math.abs(d0)>2||d0===0){ i++; continue; } const sg=Math.sign(d0); let j=i; while(j<n-1){ const dj=d(j); if(dj==null||dj===0||Math.abs(dj)>2||Math.sign(dj)!==sg) break; j++; }
    const idx=[]; for(let k=i;k<=j;k++) idx.push(k); const chrom=idx.slice(0,-1).every(k=>Math.abs(d(k))===1);
    if(chrom){ idx.forEach(k=>{ F[k]=CHRL[pc(b[k])]; }); if(sg>0&&pc(b[i])===0) F[i]=4; if(sg<0&&pc(b[j])===0) F[j]=4; }
    else { const L=idx.length, seq=[]; if(sg<0){ let r=L; while(r>5){ seq.push(1,2,3); r-=3; } for(let q=1;q<=r;q++) seq.push(q); } else { if(L<=5) for(let q=5;q>5-L;q--) seq.push(q); else { seq.push(5,4,3,2,1); while(seq.length<L) seq.push(3,2,1); } }
      idx.forEach((k,x)=>{ F[k]=seq[x]; }); }
    i=j; }
  /* leaps of a fourth and a fifth */
  for(let k=0;k<n-1;k++){ const dk=d(k); if(dk==null) continue;
    if(dk===-7){ if(F[k]==null) F[k]=1; if(F[k+1]==null) F[k+1]=5;
      if(d(k+1)===5&&F[k+2]==null) F[k+2]=d(k+2)===-7?1:2; }
    else if(dk===5){ const dn=d(k+1), end=dn==null, below=dn!=null&&b[k+2]<b[k];
      if(F[k]!=null&&F[k+1]!=null) continue;
      if(below){ if(F[k]==null) F[k]=5; if(F[k+1]==null) F[k+1]=2; }
      else if(end||dn===5){ if(F[k]==null) F[k]=4; if(F[k+1]==null) F[k+1]=1; if(dn===5&&F[k+2]==null) F[k+2]=1; }
      else { if(F[k]==null) F[k]=5; if(F[k+1]==null) F[k+1]=2; } } }
  return st.map((s,k)=>F[k]==null?s:Object.assign({},s,{lfm:{[b[k]]:F[k]}}));
}
/* ---------- the chord room: chord canvas, voicings, inversions and techniques (Dr. Onye's) ----------
   Mode: Chord canvas (type a progression, Easy or Professional, like the Studio's chord chart) or Voicings (one chord at a time, every way he plays it).
   Inversion: Root position (default), 1st, 2nd; every one that is on is played, one after another, for each triad.
   Technique: Chords (together, the default), Broken chords (one by one) or Arpeggio; Grace notes and Bass line can be added. */
{ const c=document.createElement('style'); c.textContent=`
#prRoom .p-ccon{display:flex;flex-direction:column;gap:12px}
#prRoom .p-cmix{flex-wrap:wrap;gap:8px 0;padding:6px 0 4px;border-bottom:1px solid rgba(255,255,255,.07)} #prRoom .p-cmix .p-cht{cursor:default}
#prRoom .p-cmix{flex-wrap:wrap!important;align-items:stretch;row-gap:12px!important} #prRoom .p-cmix>.p-ch{padding:0 9px;min-width:max-content;flex:1 0 auto} #prRoom .p-cmix .p-key{min-height:28px;font-size:12.5px;padding:3px 9px 3px 7px;white-space:nowrap} #prRoom .p-lvls{display:flex;flex:none;border-left:1px solid rgba(255,255,255,.07)} #prRoom .p-lvls .p-ch{border-right:0} #prConP .ep-body>*,#prRoom .p-ccon,#prRoom .p-carea{min-width:0;max-width:100%} #prRoom .p-cmix{max-width:100%}
#prRoom .p-cmix .p-c2{display:grid;grid-template-columns:repeat(2,auto);grid-auto-flow:column;grid-template-rows:repeat(3,auto);gap:5px 8px}
#prRoom .p-cmix .p-ch.off{opacity:.4}
#prRoom .p-cv{display:flex;flex-direction:column;gap:8px} #prRoom .p-cvh{display:flex;align-items:center;gap:12px}
#prRoom .p-cvseg{display:inline-flex;border:1.5px solid #3a4a74;border-radius:999px;padding:2px} #prRoom .p-cvseg button{border:0;background:none;color:#aab4cf;font:700 13px system-ui,sans-serif;padding:5px 14px;border-radius:999px;cursor:pointer} #prRoom .p-cvseg button[aria-pressed=true]{background:#c8d0c8;color:#111}
#prRoom .p-cvta{width:100%;min-height:86px;resize:vertical;background:#0c0f17;color:#eef2ff;border:1.5px solid #3a4a74;border-radius:12px;padding:12px 14px;font:700 17px/1.45 ui-monospace,Menlo,monospace;letter-spacing:.02em;box-sizing:border-box}
#prRoom .p-cvhelp{margin:0;color:#8d97b0;font-size:12.5px;line-height:1.45}
#prRoom .p-cvgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
#prRoom .p-cvbar{display:grid;grid-template-columns:18px repeat(4,1fr);gap:4px;align-items:center;border-left:2px solid #4a5d8f;padding-left:6px}
#prRoom .p-cvn{color:#6d7894;font:700 10px system-ui,sans-serif}
#prRoom .p-cvbar input{min-width:0;width:100%;box-sizing:border-box;background:#0c0f17;color:#eef2ff;border:1.5px solid #2c3a5e;border-radius:8px;padding:7px 6px;font:700 13px system-ui,sans-serif;text-align:center} #prRoom .p-cvbar input:focus{border-color:#7aa2ff;outline:none}
#prRoom .p-cvadd{display:flex;gap:8px}
#prRoom .p-ctr{gap:10px;flex-wrap:wrap;align-items:center} #prRoom .p-cmix [data-ch=Technique] .p-c2{grid-template-rows:repeat(2,auto)} #prRoom .p-amix{flex-wrap:wrap!important} #prRoom .p-amix>.p-ch{flex:1 0 auto;min-width:max-content} #prRoom .p-trr{display:flex;align-items:center;gap:5px} #prRoom .p-trl{width:52px;color:#8d97b0;font:800 10px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}
#prRoom .p-trs .p-trb{justify-content:center;min-width:40px;font-size:18px!important;font-weight:900} #prRoom .p-trs .p-trv{justify-content:center;min-width:76px;flex:1;color:#cfd6e6} #prRoom .p-trs .p-bcol{width:100%} #prRoom .p-trs .p-trv.on{color:#ffd43b}
/* Chords and Broken chords both on: the arpeggio. Their lights flash red, blue and green */
@keyframes pArp{0%{background:#ff3b3b;box-shadow:0 0 7px 1px #ff3b3b}33%{background:#3b8bff;box-shadow:0 0 7px 1px #3b8bff}66%{background:#3dff6e;box-shadow:0 0 7px 1px #3dff6e}100%{background:#ff3b3b;box-shadow:0 0 7px 1px #ff3b3b}}
#prRoom .p-arpon .p-key.on:nth-child(-n+2) .p-led{animation:pArp .9s steps(3) infinite} #prRoom .p-arpon .p-key.on:nth-child(2) .p-led{animation-delay:-.3s} #prDisp .pd-screen.has-staff{padding-right:252px} #prDisp .p-staff{position:absolute;right:10px;top:8px;width:230px;height:200px;max-height:calc(100% - 16px);background:#f6f4ee;border-radius:10px;overflow:hidden} #prDisp .p-staff svg{display:block} #prRoom .p-cbk .p-banks{margin-left:0;flex-wrap:wrap} #prRoom .p-cbar .p-bank{min-width:0!important;padding:2px 5px 2px 5px!important} #prRoom .p-cbar .p-banks{gap:3px!important} #prRoom .p-cdd .p-dis,#prRoom .p-cv.p-dis{opacity:.4} #prRoom .p-cv.p-dis textarea,#prRoom .p-cv.p-dis input{cursor:not-allowed} #prRoom .p-cdd.p-dis{opacity:.4} #prRoom .p-cdd.p-dis select{cursor:not-allowed}
@media (max-width:700px){ #prRoom .p-cmix .p-ch{min-width:0;padding:0 6px} #prRoom .p-cmix .p-key{min-height:24px;font-size:11px} #prRoom .p-cmix .p-c2{grid-template-columns:repeat(2,auto)} #prRoom .p-cvgrid{grid-template-columns:1fr} }
`; document.head.appendChild(c); }
const VREG=/^[A-G][#b♯♭]?-?\d?(\s*\.\s*[A-G][#b♯♭]?-?\d?)*(\s+\.?\s*[A-G][#b♯♭]?-?\d?)*\s*\.?\s*\/\s*\.?\s*[A-G]/;
function chordDefaults(){ if(!['canvas','inv','voice','arp'].includes(st.cmode)) st.cmode='canvas'; if(st.nkb===undefined) st.nkb=true; st.nstaff=!!st.nstaff; if(!Array.isArray(st.nlab)||!st.nlab.length) st.nlab=['letter']; if(st.cg===undefined) st.cg=true; st.vg=!!st.vg; if(!Array.isArray(st.invs)||!st.invs.length) st.invs=[0]; if(!['v','h','a'].includes(st.vh)) st.vh='v'; if(!st.cview) st.cview='easy'; st.grace=!!st.grace; st.bline=!!st.bline; }
/* one bar's chords: commas or brackets separate chords; a written voicing (B / A D F) is one chord; "." holds the chord before it for one slot */
function barTokens(bar){ const t=[]; String(bar).split(',').forEach(piece=>{ piece.split(/(\[[^\]]*\])/).forEach(part=>{ part=part.trim(); if(!part) return;
    if(/^\[.*\]$/.test(part)){ t.push('['+part.slice(1,-1).trim().replace(/\s*\.\s*/g,'.')+']'); return; }
    if(part.includes('/')&&VREG.test(part)){ t.push('['+part.replace(/\s*\.\s*/g,'.')+']'); return; }
    let w=[]; const fl=()=>{ if(w.length){ normChords(w.join(' ')).forEach(x=>t.push(x)); w=[]; } };
    part.split(/\s+/).forEach(x=>{ if(x==='.'||x==='%'){ fl(); t.push(x); } else w.push(x); }); fl(); }); });
  return t; }
/* the canvas text: bars split with | (or one bar per line when bars are used); chords in a bar share its four beats. With no bars, every chord gets two beats. */
function canvasParse(text){ text=String(text||'').trim(); if(!text) return []; const out=[];
  if(!/\|/.test(text)){ const L=[]; text.split(/\n+/).forEach(l=>barTokens(l).forEach(x=>{ if(x!=='.'&&x!=='%') L.push(x); })); L.forEach(x=>out.push({tok:x,beats:L.length>1?2:4})); return out; }
  let prevBar=null; text.split(/[|\n]+/).map(b=>b.trim()).filter(Boolean).forEach(b=>{ let t=barTokens(b); if(t.length===1&&t[0]==='%'&&prevBar) t=prevBar.slice(); prevBar=t; const n=t.length||1;
    t.forEach(x=>{ if(x==='.'||x==='%'){ if(out.length) out[out.length-1].beats+=4/n; } else out.push({tok:x,beats:4/n}); }); });
  return out; }
/* the key of a progression: the major key that holds most of its notes (ties go to the key of the last bass, then the first) */
function progKey(list){ const w=new Array(12).fill(0); list.forEach(s=>[...(s.lh||[]),...(s.rh||[])].forEach(m=>{ w[((m%12)+12)%12]+=(s.beats||2); }));
  const D=[0,2,4,5,7,9,11], lastB=list.length?((Math.min(...list[list.length-1].lh.length?list[list.length-1].lh:list[list.length-1].rh)%12)+12)%12:0; let best=0,bs=-1;
  for(let k=0;k<12;k++){ const sc=D.reduce((a,d)=>a+w[(k+d)%12],0)+(k===lastB?.5:0); if(sc>bs){ bs=sc; best=k; } } return best; }
const DIA=[0,2,4,5,7,9,11], degOf=(m,k)=>((m-k)%12+12)%12;
/* grace notes: only with three notes in the right hand (never four); a grace note goes on a scale tone, never the 1st or 4th of the key.
   It goes on the middle or the bottom note, on beat one, and nothing more for the rest of the chord.
   B / A D F in C: on the D, from C# or from C (a half step below, or the scale tone below). */
let graceN=0;
function graceFor(s,key){ const rh=[...(s.rh||[])].sort((a,b)=>a-b); if(rh.length!==3) return null;
  for(const m of [rh[1],rh[0]]){   /* the middle note, or else the bottom note */ const d=degOf(m,key); if(!DIA.includes(d)||d===0||d===5) continue;
    const half=m-1; let sc=m-1; while(!DIA.includes(degOf(sc,key))) sc--; const g=(graceN++%2===0)?half:sc; if(rh.includes(g)||(s.lh||[]).includes(g)) continue; return {tgt:m,g}; }
  return null; }
/* the bass line: two sixteenths at the end of the chord before lead into the next bass note, from below (F F# G) or from above (A A♭ G).
   Only onto tones of the key; onto the 3rd and the 7th only from below. Not every time: now and then. */
let blLast=false;
function bassRun(s,nx,key){ if(!nx) return null; const lo=a=>a&&a.length?Math.min(...a):null; const T=lo(nx.lh)!=null?lo(nx.lh):lo(nx.rh), B=lo(s.lh)!=null?lo(s.lh):lo(s.rh); if(T==null||B==null||T===B) return null;
  const d=degOf(T,key); if(!DIA.includes(d)) return null; if(blLast||Math.random()<.45){ blLast=false; return null; } blLast=true;
  const up=(d===4||d===11)?true:Math.random()<.5; return up?[T-2,T-1]:[T+2,T+1]; }
/* arpeggio rhythm (sixteenths). Four notes in all: one by one from the left hand up. Five: the left hand's note together with one right-hand note,
   then the other three up or down. Two notes in the left hand share the bass note's sixteenth as two thirty-seconds.
   More than two notes in the left hand, or more than six in all: not arpeggiated. A bass with a two-note harmony is not arpeggiated either:
   two-note harmonies are intervallic, not chordal. A chord longer than one beat is arpeggiated once, on one of its beats. */
function arpPlan(s,t,bt){ const L=[...(s.lh||[])].sort((a,b)=>a-b), R=[...(s.rh||[])].sort((a,b)=>a-b); if(!L.length||L.length>2||L.length+R.length>6) return null;
  const s16=bt/4, s32=bt/8, ev=[]; const bass=(extra)=>{ ev.push([L[0],t]); if(L.length===2) ev.push([L[1],t+s32]); if(extra!=null) ev.push([extra,t]); };
  if(R.length===3){ bass(); R.forEach((m,i)=>ev.push([m,t+s16*(i+1)])); return ev; }
  if(R.length===4){ const k=Math.floor(Math.random()*4), x=R[k], rest=R.filter((_,i)=>i!==k); if(Math.random()<.5) rest.reverse(); bass(x); rest.forEach((m,i)=>ev.push([m,t+s16*(i+1)])); return ev; }
  return null; }
function arpBeat(beats){ const n=Math.max(1,Math.round(beats)); return n<=1?0:n===2?Math.floor(Math.random()*2):Math.floor(Math.random()*n); }
function playChord(s,len,nx){ const C=CLASS.clock; C.ready().then(()=>{ if(!ov||ov.hidden) return;
  const b=C.bus(); if(b) chBus.push(b); const bt=60/st.bpm, beats=s.beats||(len?Math.max(1,Math.round(len/bt)):2), dur=len||Math.max(1.6,beats*bt), t0=C.now()+0.05, end=t0+dur;
  /* only the chord canvas uses the techniques; grace notes and the bass line go with Chords (together). Voicings can add grace notes. */
  meterGo(); if(playing){ for(let k=0;k<Math.max(1,Math.round(beats));k++){ C.click(t0+k*bt,chBeat%4===0,b); chBeat++; } }
  const md=st.cmode, tech=md==='canvas'?st.vh:'v', gOn=md==='canvas'?(st.vh==='v'&&st.cg!==false):md==='voice'?!!st.vg:false, bOn=md==='canvas'&&st.vh==='v'&&!!st.bline;
  const key=steps.key!=null?steps.key:0, gr=gOn?graceFor(s,key):null, run=bOn&&nx&&dur>=bt*.99?bassRun(s,nx,key):null, lhEnd=run?end-bt/2:end;
  const FO={}; if(bassFO&&bassFO.step===s){ FO[bassFO.m]=bassFO.f; } bassFO=null;
  const FM=Object.assign(fingering(s.lh||[],s.rh||[]),s.lfm||{},s.rfm||{},FO); vis={s,on:new Set(),extra:{},fo:FO}; if(Object.keys(FO).length&&curS()===s) show(); const V=vis; let rq=0; const redraw=()=>{ if(rq) return; rq=requestAnimationFrame(()=>{ rq=0; if(vis===V&&curS()===s) drawKb(); }); };
  const at=(t,fn)=>{ timers.push(setTimeout(()=>{ if(vis!==V) return; fn(); redraw(); },Math.max(0,(t-C.now())*1000))); };
  const lit=(m,t,e,ex)=>{ at(t,()=>{ if(ex) V.extra[m]=ex; V.on.add(m); }); at(e,()=>{ V.on.delete(m); if(ex) delete V.extra[m]; }); };
  let gDone=false; /* the grace note comes once, on beat one, then nothing more for the rest of the chord */
  const mute=st.cmode==='voice'&&st.nkb===false;   /* Voicings: Virtual keyboard off = the keyboard is silent; the keys still light and the hands still play */
  const N=(m,t,e,v)=>{ if(e-t<.03) return; if(mute){ lit(m,t,e); return; } if(gr&&m===gr.tgt&&!gDone){ gDone=true; const gd=Math.min(.07,bt/8); C.note(gr.g,t,gd+.02,(v||.72)*.8,b); lit(gr.g,t,t+gd,{h:(s.rh||[]).includes(m)?'r':'l',f:FM[m]}); C.note(m,t+gd,e-t-gd,v,b); lit(m,t+gd,e); } else { C.note(m,t,e-t,v,b); lit(m,t,e); } };
  const isL=m=>(s.lh||[]).includes(m), endOf=m=>isL(m)?lhEnd:end;
  if(tech==='a'){ const k=arpBeat(beats), ta=t0+k*bt, plan=arpPlan(s,ta,bt);
    if(plan){ arpN=null; drawKb(); if(k>0) [...s.lh,...s.rh].forEach(m=>N(m,t0,ta-.01,isL(m)?.75:.7));   /* the arpeggio comes on a later beat: the chord is held until then */
      plan.forEach(([m,t])=>N(m,t,endOf(m),isL(m)?.75:.7)); }
    else [...s.lh,...s.rh].forEach(m=>N(m,t0,endOf(m),isL(m)?.75:.7)); }
  else if(tech==='h'){ const ns=[...s.lh,...s.rh].sort((a,b)=>a-b), gap=Math.min(.5,Math.max(.12,(dur-.3)/ns.length)); arpN=null; ns.forEach((m,i)=>N(m,t0+i*gap,endOf(m),.8)); }
  else { arpN=null; drawKb(); s.lh.forEach((m,i)=>N(m,t0+i*.012,endOf(m),.75)); s.rh.forEach((m,i)=>N(m,t0+.03+i*.018,end,.7)); }
  /* the bass line's two sixteenths show on the keys and in the left hand's fingers */
  if(run){ const s16=bt/4, FN=Object.assign(fingering(nx.lh||[],nx.rh||[]),nx.lfm||{}), T=Math.min(...(nx.lh&&nx.lh.length?nx.lh:nx.rh)), tf=FN[T]||5, up=run[0]<T;
    const fs=up?[3,2]:[1,2]; bassFO={step:nx,m:T,f:up?1:3};   /* up: 3 2 1 (the bass note on 1); down: 1 2 3 (the bass note on 3) */
    run.forEach((m,i)=>{ const t=end-(2-i)*s16; C.note(m,t,s16*.95,.7+i*.02,b); lit(m,t,t+s16*.95,{h:'l',f:fs[i]}); }); }
  redraw(); }); }
/* inversions: every one that is on, one after another (written chords: Root position plays them as written) */
function expandInv(list){ const iv=(st.invs||[0]).slice().sort(), out=[];
  list.forEach(s=>{ const T=triad(s); if(!T||(iv.length===1&&iv[0]===0&&/^\[/.test(s.src||''))){ out.push(s); return; }
    iv.forEach(k=>{ const v=(k===0&&/^\[/.test(s.src||''))?s:handFit(invert(Object.assign({},s,{rfm:null}),k)); out.push(Object.assign({},v,{lfm:s.lfm||v.lfm,beats:s.beats,chip:iv.length>1?(DSP(s.name)+' · '+(k?INV[k]:'Root')):null})); }); });
  return out; }
function loadChords(text,quiet){
  if(!RET) clr(); st.chords=String(text||'').trim(); save();
  const P=canvasParse(st.chords).slice(0,48), out=(window.CLASS&&CLASS.stepsFrom)?CLASS.stepsFrom(P.map(x=>x.tok),48,(trN()+12)%12):[];
  const base=[]; let j=0; P.forEach(x=>{ const o=out[j]; if(o&&o.src===x.tok.trim()){ o.beats=x.beats; base.push(o); j++; } });
  if(!base.length){ steps=[]; cur=-1; chips(); show(); $('#prMsg').textContent=st.chords?'I did not recognise those chords. Try names like Dm7, G7, Cmaj7, F#m7b5, or your own voicing like B / A D F.':'Type chords in the Chord canvas.'; chordTip([]); return; }
  const fitted=bassFing(base.map(x=>handFit(/^\[/.test(x.src||'')?x:invert(x,0))));
  steps=octShift(fitted); steps.key=progKey(base); steps.multi=true; cur=0; chips(); show(); invBtn(); $('#prMsg').textContent=(P.length>base.length?'Some of those were not recognised and were skipped. ':'')+'Tap a chord to hear it, or press Play.'; if(!quiet) play1(steps[0]); chordTip(P.map(x=>x.tok));
}
/* voicing labels on the keys: letter, solfa and number (the chord tone). Solfa (his): major triad do mi sol, minor triad la do mi, diminished triad ti re fa,
   dominant seventh sol ti re fa (from the Mixolydian mode); so major ninth do mi sol ti re, minor ninth la do mi sol ti, dominant ninth sol ti re fa la */
const SOLC=['do','ra','re','me','mi','fa','fi','sol','si','la','te','ti'], NUMC=['1','♭9','9','♭3','3','11','♭5','5','♯5','13','♭7','7'];
function vLabels(s){ const o={}; [...(s.lh||[]),...(s.rh||[])].forEach(m=>{ const i=((m-s.vroot)%12+12)%12, L=[];
    if(st.nlab.includes('letter')) L.push((s.spell&&s.spell[m])||SHARP_N[((m%12)+12)%12]);
    if(st.nlab.includes('solfa')) L.push(SOLC[(i+(s.voff||0))%12]);
    if(st.nlab.includes('number')) L.push(NUMC[i]); o[m]=L.length===1?L[0]:L; }); return o; }
/* the staff: the voicing as one chord on a grand staff (right hand on the treble, left hand on the bass), shown in the Display */
let stfN=0;
function staff(s){ const scr=document.querySelector('#prDisp .pd-screen'); if(!scr) return; let box=scr.querySelector('.p-staff');
  if(!(st.cmode==='voice'&&st.nstaff&&s&&s.vroot!=null)){ if(box) box.remove(); scr.classList.remove('has-staff'); return; }
  if(!box){ box=el('div','p-staff'); scr.appendChild(box); } scr.classList.add('has-staff'); const my=++stfN;
  const go=()=>{ if(my!==stfN||!window.Vex) return; try{ const VF=Vex.Flow; box.textContent=''; const R=new VF.Renderer(box,VF.Renderer.Backends.SVG); R.resize(230,200); const c=R.getContext();
      const tr=new VF.Stave(18,0,200), bs=new VF.Stave(18,95,200); tr.addClef('treble'); bs.addClef('bass'); tr.setContext(c).draw(); bs.setContext(c).draw();
      new VF.StaveConnector(tr,bs).setType('brace').setContext(c).draw(); new VF.StaveConnector(tr,bs).setType('singleLeft').setContext(c).draw();
      const key=m=>{ const lb=String((s.spell&&s.spell[m])||SHARP_N[((m%12)+12)%12]).replace('♭','b').replace('♯','#').replace('𝄫','bb').replace('𝄪','##'), L=lb[0].toLowerCase(), ac=lb.slice(1), off=(ac.match(/#/g)||[]).length-(ac.match(/b/g)||[]).length, nat={c:0,d:2,e:4,f:5,g:7,a:9,b:11}[L]; return L+ac+'/'+(Math.round((m-off-nat)/12)-1); };
      const mk=(ns,clef)=>ns.length?new VF.StaveNote({keys:ns.slice().sort((a,b)=>a-b).map(key),duration:'w',clef}):new VF.StaveNote({keys:[clef==='bass'?'d/3':'b/4'],duration:'wr',clef});
      const tn=mk(s.rh||[],'treble'), bn=mk(s.lh||[],'bass'), tv=new VF.Voice({num_beats:4,beat_value:4}).setStrict(false).addTickables([tn]), bv=new VF.Voice({num_beats:4,beat_value:4}).setStrict(false).addTickables([bn]);
      VF.Accidental.applyAccidentals([tv],'C'); VF.Accidental.applyAccidentals([bv],'C'); new VF.Formatter().joinVoices([tv]).format([tv],120); new VF.Formatter().joinVoices([bv]).format([bv],120); tv.draw(c,tr); bv.draw(c,bs); }catch(e){ console.log(e); } };
  if(window.Vex) go(); else if(typeof loadVex==='function') loadVex().then(go).catch(()=>{}); }
/* Inversions mode: the chord picked by Note and Chord (triads and seventh chords), in every inversion that is on. His right-hand fingering:
   triads: root position 1 3 5, first inversion 1 2 5, second inversion 1 2 4 (or 1 3 5, less often 1 2 5);
   seventh chords: root 1 2 3 5, first 1 2 4 5, second 1 2 3 5, third 1 2 4 5 when the root is a white note, 1 2 3 5 when it is a black note.
   The third inversion is for seventh chords. The left hand plays the root (5). */
function loadInv(quiet){ if(!RET) clr(); const K=window.EAR&&EAR.kit; if(!K) return; if(!st.cpick||/^nin:/.test(st.cpick)){ st.cpick='tri:0'; save(); } let ch=chordPick(); if(!ch){ st.cpick='tri:0'; save(); ch=chordPick(); }
  const root=K.pickRoot(ch[1],tKey(st.ckey,K.KEYS)), pc=root[2], rootN=K.spellAt(root,1,0), names=ch[1].map(([g,sm])=>K.spellAt(root,g,sm)), semis=ch[1].map(([g,sm])=>sm), n=semis.length, sev=/^sev:/.test(st.cpick);
  const nm=rootN+' '+ch[0].toLowerCase(), title=nm[0].toUpperCase()+nm.slice(1), lh=[36+pc], spBase={}; spBase[lh[0]]=rootN;
  const blackRoot=[1,3,6,8,10].includes(((pc%12)+12)%12);
  const FING=k=>n===3?[[1,3,5],[1,2,5],[1,2,4]][k]:sev?[[1,2,3,5],[1,2,4,5],[1,2,3,5],blackRoot?[1,2,3,5]:[1,2,4,5]][k]:null;
  const ok=k=>k<n&&(k<3||sev); let iv=(st.invs||[0]).slice().sort().filter(ok); const skipped=(st.invs||[]).some(k=>!ok(k)); if(!iv.length) iv=[0];
  let one=iv.map(k=>{ const rh=[...semis.slice(k).map(x=>60+pc+x),...semis.slice(0,k).map(x=>72+pc+x)], sp=Object.assign({},spBase); rh.forEach(m=>{ const j=semis.indexOf(((m-60-pc)%12+12)%12)>=0?semis.indexOf(((m-60-pc)%12+12)%12):semis.findIndex(x=>((x%12)+12)%12===((m-60-pc)%12+12)%12); sp[m]=names[j]; });
    const f=FING(k), st0={name:title+(k?' ('+INV[k]+' inversion)':''),src:rootN+' '+ch[0],lh,rh,fing:'',lfing:'',spell:sp,beats:2,chip:k?INV[k]+' inversion':'Root position',tri:n===3,lfm:{[lh[0]]:5}};
    if(f){ st0.rfm={}; rh.forEach((m,i)=>{ st0.rfm[m]=f[i]; }); st0.nofing=false; return st0; } return handFit(st0); });
  /* Octaves: the inversions again an octave higher, up to four octaves (staying on the keyboard); Direction: up, down, or up and down */
  arpDefaults(); const sh=(x,d)=>{ const n={}; Object.keys(x.rfm||{}).forEach(m=>{ n[+m+d]=x.rfm[m]; }); const sp={}; Object.keys(x.spell||{}).forEach(m=>{ sp[(x.lh.includes(+m)?+m:+m+d)]=x.spell[m]; }); return Object.assign({},x,{rh:x.rh.map(m=>m+d),rfm:n,spell:sp,chip:x.chip+(d?' +'+d/12+' oct':'')}); };
  let L=[]; for(let o=0;o<st.aoct;o++){ const d=12*o; if(Math.max(...one[one.length-1].rh)+d>103) break; one.forEach(x=>L.push(sh(x,d))); }
  if(st.adir==='down') L=L.slice().reverse(); else if(st.adir==='updown'&&L.length>1) L=L.concat(L.slice(0,-1).reverse());
  steps=octShift(L);
  steps.key=((pc%12)+12)%12; steps.multi=true; cur=0; chips(); show(); if(skipped) $('#prMsg').textContent=n===3?'The 3rd inversion is for seventh chords.':''; if(!quiet) play1(steps[0]); }
/* Voicings mode: the chord picked by Key and Chord, played every way he gives for it */
function loadVoicings(quiet){ if(!RET) clr(); const K=window.EAR&&EAR.kit, T=window.VOICE&&VOICE._t; if(!K) return; let ch=chordPick(); if(!ch){ st.cpick=K.CHK[0]+':0'; save(); ch=chordPick(); }
  const root=K.pickRoot(ch[1],tKey(st.ckey,K.KEYS)), names=ch[1].map(([g,sm])=>K.spellAt(root,g,sm)), rootN=K.spellAt(root,1,0), name=rootN+' '+ch[0].toLowerCase();
  let res=null; try{ const notes=T.readNotes(names.join(' ')); res=T.identify(notes); res.list=T.voicingsFor(res.root,res.K); }catch(_){ res=null; }
  if(!res||!res.list.length){ showPicked(ch,K,quiet); $('#prMsg').textContent='Voicings for '+name+' are not in the lessons yet. He has given them for major and minor triads and for major, minor and dominant ninth chords.'; return; }
  const kp=((root[2]%12)+12)%12;
  steps=res.list.map((v,i)=>{ const ns=v.pos[v.cur], lh=ns.filter(n=>n.hand==='lh').map(n=>n.midi), rh=ns.filter(n=>n.hand!=='lh').map(n=>n.midi), sp={}; ns.forEach(n=>{ sp[n.midi]=n.label; });
    return handFit({src:'[v'+i+']',name:name[0].toUpperCase()+name.slice(1),chip:'Voicing '+(i+1),vdesc:v.d+' ('+v.f+')',lh,rh,fing:'',lfing:'',spell:sp,beats:4,vroot:res.root.pc,voff:({maj:0,maj9:0,min:9,min9:9,dom9:7,dim:11})[res.K.k]||0}); });
  steps=octShift(steps); steps.key=kp; steps.multi=true; cur=0; chips(); show(); invBtn(); if(!quiet) play1(steps[0]); }
function chordReload(quiet){ const c=cur; if(st.cmode==='inv') loadInv(quiet); else if(st.cmode==='arp') loadArp(quiet); else if(st.cmode==='voice') loadVoicings(quiet); else loadChords(st.chords,quiet); if(c>=0&&c<steps.length){ cur=c; show(); } }
/* Arpeggios: chords played harp-like (root, third, fifth), with his fingering. One-handed: the right hand plays the arpeggio and the left hand
   the root (5), root and fifth (5-2), root and octave (5-1) or root, fifth and octave (5 2 1). Two-handed: the left hand plays the arpeggio too. */
function arpDefaults(){ if(!st.akey) st.akey='C'; if(!['arpmaj','arpmin'].includes(st.aq)) st.aq='arpmaj'; if(!(st.aoct>=1&&st.aoct<=4)) st.aoct=1; if(!['rh','both'].includes(st.ahand)) st.ahand='rh'; if(!['root','p5','oct','fill'].includes(st.alh)) st.alh='oct'; if(!['updown','up','down'].includes(st.adir)) st.adir='updown'; }
function arpUI(area){ arpDefaults(); const r=el('div','p-mix p-cmix p-amix'), re=()=>{ save(); render(); }, A=st.cmode==='arp', AI=A||st.cmode==='inv';
  r.append(cStrip('Triad',[['arpmaj','Major'],['arpmin','Minor']],()=>[st.aq],v=>{ st.aq=v; re(); },{off:()=>!A,offWhy:'For Arpeggios'}),
    cStrip('Octaves',[[1,'1 octave'],[2,'2 octaves'],[3,'3 octaves'],[4,'4 octaves']],()=>[st.aoct],v=>{ st.aoct=v; re(); },{off:()=>!AI,offWhy:'For Inversions and Arpeggios'}),
    cStrip('Hands',[['rh','One-handed'],['both','Two-handed']],()=>[st.ahand],v=>{ st.ahand=v; re(); },{off:()=>!A,offWhy:'For Arpeggios'}),
    cStrip('Left hand',[['root','Root (5)'],['p5','Root and fifth (5-2)'],['oct','Root and octave (5-1)'],['fill','Root, fifth and octave (5 2 1)']],()=>[st.alh],v=>{ st.alh=v; re(); },{off:()=>!A||st.ahand!=='rh',offWhy:'Two-handed: the left hand plays the arpeggio'}),
    cStrip('Direction',[['updown','Up and down'],['up','Up'],['down','Down']],()=>[st.adir],v=>{ st.adir=v; re(); },{off:()=>!AI,offWhy:'For Inversions and Arpeggios'}));
  area.appendChild(r); }
function loadArp(quiet){ if(!RET) clr(); arpDefaults(); const SC=window.SCALES; if(!SC||!SC.build) return; const hand=st.ahand==='both'?'both':'rh';
  const KL=SC.keys||['C'], nk=KL.includes(st.ckey)?st.ckey:(KL.find(x=>pcOf(x)===pcOf(st.ckey||'C'))||'C'), AK=tKey(nk,KL), base=SC.build(AK,hand,st.aq,st.aoct,'similar',false,st.alh), BL={root:[5],p5:[5,2],oct:[5,1],fill:[5,2,1]}[st.alh];
  const title=DSP(AK)+(st.aq==='arpmin'?' minor':' major')+' arpeggio'+(st.aoct>1?' · '+st.aoct+' octaves':'')+(hand==='both'?' · two-handed':'');
  /* eighth-note triplet feel: Tri (1) Ple (3) Let (5) Tri (octave)... each quarter note does an octave */
  const mk=x=>{ const o=Object.assign({},x,{beats:1/3,name:title,chip:DSP(x.name),rfm:{},lfm:{}}); if(x.rh[0]!=null&&x.fing) o.rfm[x.rh[0]]=+x.fing;
    if(hand==='both'){ if(x.lh[0]!=null&&x.lfing) o.lfm[x.lh[0]]=+x.lfing; } else (x.lh||[]).slice().sort((a,b)=>a-b).forEach((m,i)=>{ o.lfm[m]=BL[i]; }); return o; };
  let L=base.map(mk); if(st.adir==='down') L=L.slice().reverse(); else if(st.adir==='updown') L=L.concat(L.slice(0,-1).reverse().map(x=>Object.assign({},x)));
  L=octShift(L); L.forEach((x,i)=>{ x.ai=i; }); steps=L; steps.arp=true; steps.multi=true; cur=0; chips(); show(); $('#prMsg').textContent=hand==='both'?'Two-handed arpeggio: both hands play the arpeggio.':'One-handed arpeggio: the right hand plays the arpeggio; the left hand plays the '+({root:'root',p5:'root and fifth',oct:'root and octave',fill:'root, fifth and octave'})[st.alh]+' on every root.'; if(!quiet) play1(steps[0]); }
/* transposition (half steps, -6 to +6) and octave shift (-2 to +2): they work in every mode */
const trN=()=>Math.max(-6,Math.min(6,+st.ctr||0)), ocN=()=>Math.max(-2,Math.min(2,+st.coct||0));
function tKey(k,list){ const t=trN(); if(!t) return k; const want=((pcOf(k)+t)%12+12)%12, c=list.filter(x=>pcOf(x)===want); if(!c.length) return k; const fl=/b|♭/.test(k)||(t<0&&!/#|♯/.test(k)); return c.find(x=>fl?/b|♭/.test(x):!/b|♭/.test(x))||c[0]; }
function octShift(L){ const d=12*ocN(); if(!d) return L; const sh=o=>{ if(!o) return o; const n={}; Object.keys(o).forEach(k=>{ n[+k+d]=o[k]; }); return n; };
  const out=L.map(x=>Object.assign({},x,{lh:(x.lh||[]).map(m=>m+d),rh:(x.rh||[]).map(m=>m+d),rfm:sh(x.rfm),lfm:sh(x.lfm),spell:sh(x.spell)})); ['arp','multi','key'].forEach(k=>{ if(L[k]!==undefined) out[k]=L[k]; }); return out; }
function retune(){ const c=cur; RET=true; try{ if(st.cmode==='voice') loadVoicings(true); else if(st.cmode==='inv') loadInv(true); else if(st.cmode==='arp') loadArp(true); else loadChords(st.chords,true); } finally{ RET=false; } if(c>=0&&c<steps.length){ cur=c; show(); } }
function trStrip(){ const strip=el('div','p-ch p-bch p-trs'); strip.appendChild(el('div','p-cht','Transpose')); const col=el('div','p-bcol'); strip.appendChild(col);
  const lab=v=>v>0?'+'+v:String(v);
  const row=(name,get,set,lo,hi,txt,tip)=>{ const r=el('div','p-trr'); r.appendChild(el('span','p-trl',name)); const mk=(t,fn,cls,ti)=>{ const k=el('button','p-key '+cls); k.type='button'; k.innerHTML='<span></span>'; k.firstChild.textContent=t; k.title=ti; k.onclick=fn; r.appendChild(k); return k; };
    const val=mk('','','p-trv','Back to '+tip); const upd=()=>{ const v=get(); val.firstChild.textContent=txt(v); val.classList.toggle('on',!!v); };
    const minus=mk('−',()=>{ if(get()>lo){ set(get()-1); save(); upd(); retune(); } },'p-trb',name+' down'); r.insertBefore(minus,val);
    mk('+',()=>{ if(get()<hi){ set(get()+1); save(); upd(); retune(); } },'p-trb',name+' up');
    val.onclick=()=>{ if(get()){ set(0); save(); upd(); retune(); } }; upd(); col.appendChild(r); };
  row('Key',trN,v=>{ st.ctr=v; },-6,6,v=>v?lab(v)+' ½':'0','the original key');
  row('Octave',ocN,v=>{ st.coct=v; },-2,2,v=>v?lab(v)+' oct':'0','the written octave');
  return strip; }
const cBankName=x=>{ const M={canvas:'Chord canvas',inv:'Inversions',voice:'Voicings',arp:'Arpeggios'}[x.cmode]||'Chord canvas', K=window.EAR&&EAR.kit; let w='';
  if(x.cmode==='arp') w=DSP(x.akey||'C')+(x.aq==='arpmin'?' minor':' major')+(x.aoct>1?', '+x.aoct+' octaves':'')+(x.ahand==='both'?', two-handed':'');
  else if(x.cmode==='inv'||x.cmode==='voice'){ try{ const [c,i]=String(x.cpick||'tri:0').split(':'); w=DSP(x.ckey||'C')+' '+K.CH[c][1][+i][0].toLowerCase(); }catch(_){ w=''; } }
  else { const t=String(x.chords||'').replace(/\s+/g,' ').trim(); w=t.length>34?t.slice(0,33)+'…':t||'empty canvas'; }
  return M+': '+w+(x.ctr?' · '+(x.ctr>0?'+':'')+x.ctr+' ½':'')+' · '+(x.bpm||80)+' BPM'; };
/* a console strip of lit buttons, like the Scale room's */
function cStrip(title,opts,isOn,press,o){ o=o||{}; const strip=el('div','p-ch p-bch'); strip.dataset.ch=title; strip.appendChild(el('div','p-cht',title)); const col=el('div','p-bcol'+(o.two?' p-c2':'')); strip.appendChild(col);
  if(o.off&&o.off()){ strip.classList.add('off'); strip.title=o.offWhy||''; } if(o.cls&&o.cls()) strip.classList.add(o.cls());
  opts.forEach(([v,l,tip])=>{ const k=el('button','p-key'); k.type='button'; k.innerHTML='<i class="p-led"></i><span></span>'; k.lastChild.textContent=l; if(tip) k.title=tip; const on=isOn().includes(v); k.classList.toggle('on',on); k.setAttribute('aria-pressed',String(on)); k.disabled=!!(o.off&&o.off())||!!(o.dis&&o.dis(v)); if(o.dis&&o.dis(v)&&o.disWhy) k.title=o.disWhy;
    k.onclick=()=>{ press(v); }; col.appendChild(k); });
  return strip; }
function chordConsole(box){
  const strips=el('div','p-mix p-cmix'), cv=st.cmode==='canvas', vo=st.cmode==='voice'; box.appendChild(strips);
  strips.append(
    cStrip('Mode',[['canvas','Chord canvas','Type a progression: Dr. Onye plays it chord by chord'],['inv','Inversions','One chord at a time, in the inversions you choose'],['voice','Voicings','One chord at a time, and every way to play it'],['arp','Arpeggios','Chords played harp-like, with his fingering']],()=>[st.cmode],v=>{ if(st.cmode===v) return; st.cmode=v; save(); render(); }),
    cStrip('Inversion',[[0,'Root position'],[1,'1st inversion'],[2,'2nd inversion'],[3,'3rd inversion','For seventh chords']],()=>st.invs,v=>{ const a=new Set(st.invs); if(a.has(v)){ if(a.size===1) return; a.delete(v); } else a.add(v); st.invs=[...a].sort(); save(); render(); },{off:()=>st.cmode!=='inv',offWhy:'Turn on Inversions in Mode'}),
    /* only the chord canvas uses the techniques; grace notes and the bass line go with Chords and can each be switched off (bass line off by default). Voicings can use grace notes (off until you turn them on). */
    cStrip('Technique',[['v','Chords','All the notes together. Turn on Broken chords too for the arpeggio'],['h','Broken chords','One note at a time. Turn on Chords too for the arpeggio'],['grace','Grace notes','A grace note on the middle or bottom note when the right hand has three notes'],['bline','Bass line','Two sixteenths now and then lead into the next bass note']],
      ()=>cv?[...(st.vh==='a'?['v','h']:[st.vh]),st.cg!==false?'grace':'',st.bline?'bline':'']:vo?[st.vg?'grace':'']:[],
      v=>{ if(vo){ if(v==='grace'){ st.vg=!st.vg; save(); render(); } return; } if(v==='grace') st.cg=st.cg===false; else if(v==='bline') st.bline=!st.bline;
        else { const on={v:st.vh==='v'||st.vh==='a',h:st.vh==='h'||st.vh==='a'}; on[v]=!on[v]; if(!on.v&&!on.h) return; st.vh=on.v&&on.h?'a':on.v?'v':'h'; } save(); render(); },
      {two:true,off:()=>!cv&&!vo,offWhy:'For the chord canvas',cls:()=>cv&&st.vh==='a'?'p-arpon':'',dis:v=>vo?v!=='grace':(v==='grace'||v==='bline')&&st.vh!=='v',disWhy:vo?'Voicings can use grace notes':'Grace notes and the bass line go with Chords'}));
  /* Notation (Voicings): Staff and Virtual keyboard; with the virtual keyboard on, its labels: Letter, Solfa, Number (any or all) */
  strips.append(cStrip('Notation',[['staff','Staff','The voicing on a grand staff, in the Display'],['kb','Virtual keyboard','The virtual keyboard\'s sound (and its Letter / Solfa / Number labels)']],()=>[st.nstaff?'staff':'',st.nkb?'kb':''],v=>{ if(v==='staff') st.nstaff=!st.nstaff; else st.nkb=!st.nkb; save(); render(); },{off:()=>!vo,offWhy:'For Voicings'}),
    cStrip('Labels',[['letter','Letter'],['solfa','Solfa'],['number','Number']],()=>st.nlab,v=>{ const a=new Set(st.nlab); if(a.has(v)){ if(a.size===1) return; a.delete(v); } else a.add(v); st.nlab=['letter','solfa','number'].filter(x=>a.has(x)); save(); render(); },{off:()=>!vo||!st.nkb,offWhy:'Turn on Virtual keyboard (Voicings)'}));
  strips.append(trStrip());
  /* Keys and Click: a fader, a meter, and mute and solo, like every console in the suite; they stay together at the right-hand end */ { const lv=el('div','p-lvls'); lv.append(...levels(MQM.matches?70:(ov.querySelector('#prConP.max')?200:118))); strips.append(lv); }
}
/* the chord canvas: Easy (type the chart) or Professional (a box for every beat), like the Studio's chord chart */
function canvasUI(area,off){
  const w=el('div','p-cv'+(off?' p-dis':'')), hd=el('div','p-cvh'); hd.appendChild(el('span','p-cht','Chord canvas')); const seg=el('div','p-cvseg');
  [['easy','Easy'],['pro','Professional']].forEach(([v,l])=>{ const b=el('button',null,l); b.type='button'; b.setAttribute('aria-pressed',String(st.cview===v)); b.onclick=()=>{ st.cview=v; save(); render(); }; seg.appendChild(b); }); hd.appendChild(seg); w.appendChild(hd);
  let tm=0, last=st.chords; const upd=t=>{ clearTimeout(tm); tm=setTimeout(()=>{ if(t!==last||!steps.length){ last=t; loadChords(t,true); } },650); };
  if(st.cview==='easy'){ const ta=document.createElement('textarea'); ta.id='prIn'; ta.className='p-cvta'; ta.spellcheck=false; ta.autocomplete='off'; ta.value=st.chords||''; ta.placeholder='Dm7 G7 | Cmaj7 | B / A D F, E / G# C D G | A / G B C E'; ta.setAttribute('aria-label','Chord canvas');
    ta.oninput=()=>upd(ta.value); ta.onkeydown=e=>{ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ e.preventDefault(); loadChords(ta.value); } e.stopPropagation(); }; w.appendChild(ta);
    w.appendChild(el('p','p-cvhelp','Split bars with |. Chords in one bar share it equally; with no bars every chord gets two beats. A . holds the chord before it, % repeats the bar. Your own voicing: B / A D F is B in the left hand, A D F in the right (separate chords with commas). A dot lifts the next note an octave.')); }
  else { const g=el('div','p-cvgrid'); w.appendChild(g); const bars=gridOf(st.chords); while(bars.length<4) bars.push(['','','','']);
    const write=()=>{ const t=[...g.querySelectorAll('.p-cvbar')].map(bb=>[...bb.querySelectorAll('input')].map(i=>slotTok(i.value))); while(t.length&&t[t.length-1].every(x=>x==='.')) t.pop(); upd(t.map(b=>b.join(' ')).join(' | ')); };
    const addBar=v=>{ const bb=el('div','p-cvbar'); bb.appendChild(el('span','p-cvn',String(g.children.length+1))); (v||['','','','']).forEach((x,i)=>{ const inp=document.createElement('input'); inp.type='text'; inp.value=x; inp.placeholder=i?'·':'–'; inp.spellcheck=false; inp.autocomplete='off'; inp.setAttribute('aria-label','Bar '+(g.children.length+1)+' beat '+(i+1));
        inp.oninput=write; inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); const all=[...g.querySelectorAll('input')], k=all.indexOf(inp); if(all[k+1]) all[k+1].focus(); else { addBar(); g.lastChild.querySelector('input').focus(); } } }; bb.appendChild(inp); }); g.appendChild(bb); };
    bars.forEach(addBar); const ad=el('div','p-cvadd'); [['+ Add bar',1],['+ Add 4 bars',4]].forEach(([l,n])=>{ const b=el('button','e-btn',l); b.type='button'; b.onclick=()=>{ for(let i=0;i<n;i++) addBar(); }; ad.appendChild(b); }); w.appendChild(ad);
    w.appendChild(el('p','p-cvhelp','A box for every beat (4/4). Type a chord or your own voicing (B / A D F); an empty box holds the chord before it. Enter moves to the next box.')); }
  if(off){ w.querySelectorAll('textarea,input,button').forEach(x=>{ x.disabled=true; }); w.title='The chord canvas is for Chord canvas mode'; }
  area.appendChild(w); }
const slotTok=v=>{ v=String(v||'').trim(); if(!v) return '.'; if(v.includes('/')&&VREG.test(v)) return '['+v.replace(/\s*\.\s*/g,'.')+']'; const n=normChords(v); return n.length?n[0]:v.replace(/\s+/g,''); };
/* text to the Professional grid: four boxes a bar */
function gridOf(text){ text=String(text||'').trim(); if(!text) return []; const show=x=>x==='.'?'':x.replace(/^\[|\]$/g,'');
  if(!/\|/.test(text)){ const L=canvasParse(text).map(x=>x.tok), out=[]; for(let i=0;i<L.length;i+=2) out.push([show(L[i]),'',L[i+1]?show(L[i+1]):'','']); return out; }
  return text.split(/[|\n]+/).map(b=>b.trim()).filter(Boolean).map(b=>{ const t=barTokens(b), n=t.length, row=['','','','']; if(n===4) return t.map(show); t.forEach((x,i)=>{ const k=Math.min(3,Math.round(i*4/n)); row[k]=show(x); }); return row; }); }
/* spacebar in the practice room: caught first (capture phase) so the Studio behind never starts its backing track */
window.addEventListener('keydown',e=>{ if(!ov||ov.hidden||kind!=='scales'||e.ctrlKey||e.metaKey||e.altKey||e.code==='Space'||e.key===' ') return;
  const t=e.target, tg=t&&t.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||(t&&t.isContentEditable)||document.querySelector('dialog[open]')) return;
  const lk=ov.classList.contains('p-locked'); const f={s:()=>{ if(playing){ clr(); show(); } },l:lk?()=>{}:()=>{ const c=loopBox(); if(c) c.click(); },'=':()=>{ if(!lk) tempo(5); },'+':()=>{ if(!lk) tempo(5); },'-':()=>{ if(!lk) tempo(-5); },h:()=>{ const b=handsBtn(); if(b) b.click(); }}[e.key.toLowerCase()];
  /* every other single-key Studio shortcut is switched off while practising */ if(/^[a-z=+\-\[\]?]$/i.test(e.key)){ e.stopImmediatePropagation(); if(f){ e.preventDefault(); f(); } } },true);
window.addEventListener('keydown',e=>{ if(e.code!=='Space'&&e.key!==' ') return; if(!ov||ov.hidden) return;
  const t=e.target, tg=t&&t.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||(t&&t.isContentEditable)) return;
  e.preventDefault(); e.stopImmediatePropagation(); if(t&&t.blur&&tg==='BUTTON') t.blur(); if(kind==='scales') playPause(); },true);
/* ---------- the menu bar while Scale practice is open: its own menus, built from the room's controls ---------- */
const K=k=>{ const b=ov&&ov.querySelector('#prRoom [data-k="'+k+'"]'); if(b) b.click(); };
const ON=k=>{ const b=ov&&ov.querySelector('#prRoom [data-k="'+k+'"]'); return !!b&&b.getAttribute('aria-pressed')==='true'; };
const SELF=lab=>{ const l=[...(ov?ov.querySelectorAll('#prRoom label.p-sel'):[])].find(x=>(x.firstChild&&x.firstChild.textContent||'').trim().toLowerCase()===lab); return l&&l.querySelector('select'); };
const pickSel=(lab,v)=>{ const s=SELF(lab); if(s){ s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); } };
const focusSel=lab=>{ const s=SELF(lab); if(s){ s.focus(); try{ s.showPicker&&s.showPicker(); }catch(_){} } };
const tempo=d=>{ const r=ov&&ov.querySelector('#prRoom .p-rng input[type=range]'); if(!r) return; r.value=Math.max(+r.min||30,Math.min(+r.max||200,+r.value+d)); r.dispatchEvent(new Event('input',{bubbles:true})); r.dispatchEvent(new Event('change',{bubbles:true})); };
const loopBox=()=>ov&&ov.querySelector('#prRoom .p-rng input[type=checkbox]');
const handsBtn=()=>[...document.querySelectorAll('.p-hctl button')].find(b=>b.textContent==='Hands');
const ctr=()=>st.motion==='contrary';
function scaleMenus(){ const S0=window.PSMENU&&PSMENU.studio||[]; const brand=S0.find(m=>m.brand), win=S0.find(m=>m.label==='Window');
  return [brand,
  {label:'File',items:[
    {label:'Practice in Studio',enabled:()=>{ const b=$('#prStudio'); return !!b&&!b.disabled; },run:()=>{ const b=$('#prStudio'); if(b) b.click(); }},
    {label:'Ask Dr. Onye about this scale…',run:()=>{ const b=[...ov.querySelectorAll('#prRoom button')].find(x=>/^Ask Dr. Onye/.test(x.textContent)); if(b) b.click(); }},
    {sep:true},
    {label:'Reset to default settings',run:()=>{ clr(); Object.assign(st,JSON.parse(JSON.stringify(DEF))); save(); open('scales'); }},
    {label:'Close scale practice',run:()=>{ const b=$('#prX'); if(b) b.click(); else close(); }}]},
  {label:'Scale',items:[
    {label:'Note…',run:()=>focusSel('note')},
    {label:'Scale…',run:()=>focusSel('scale')},
    {sep:true},
    {label:'Regular scales',check:()=>ON('regular'),run:()=>K('regular')},
    {label:'Exotic scales',check:()=>ON('exotic'),run:()=>K('exotic')},
    {sep:true},
    {label:'One octave',check:()=>+st.oct===1,run:()=>pickSel('octaves','1')},
    {label:'Two octaves',check:()=>+st.oct===2,run:()=>pickSel('octaves','2')},
    {label:'Three octaves',check:()=>+st.oct===3,enabled:()=>!ctr(),run:()=>pickSel('octaves','3')}]},
  {label:'Hands',items:[
    {label:'Right hand',check:()=>ON('rh'),run:()=>K('rh')},
    {label:'Left hand',check:()=>ON('lh'),run:()=>K('lh')},
    {label:'Both hands',check:()=>ON('both'),run:()=>K('both')},
    {sep:true},
    {label:'Similar motion',check:()=>ON('similar'),run:()=>K('similar')},
    {label:'Contrary motion',check:()=>ON('contrary'),run:()=>K('contrary')},
    {sep:true},
    {label:'Show the hands',key:'H',check:()=>{ const b=handsBtn(); return !!b&&b.getAttribute('aria-pressed')==='true'; },run:()=>{ const b=handsBtn(); if(b) b.click(); }}]},
  {label:'View',items:[
    {label:'Letters',check:()=>ON('letter'),run:()=>K('letter')},
    {label:'Solfa',check:()=>ON('solfa'),run:()=>K('solfa')},
    {label:'Numbers',check:()=>ON('number'),run:()=>K('number')},
    {sep:true},
    {label:'Learning (explains each step)',check:()=>ON('learn'),run:()=>K('learn')},
    {label:'Practice',check:()=>ON('practice'),run:()=>K('practice')}]},
  {label:'Playback',items:[
    {label:()=>!playing?'Play':paused?'Resume':'Pause',key:'Space',run:playPause},
    {label:'Stop',key:'S',enabled:()=>playing,run:()=>{ clr(); show(); }},
    {sep:true},
    {label:()=>ctr()?'Open':'Up',check:()=>ON('up'),run:()=>K('up')},
    {label:()=>ctr()?'Close':'Down',check:()=>ON('down'),run:()=>K('down')},
    {label:()=>ctr()?'Open and close':'Up and down',check:()=>ON('updown'),run:()=>K('updown')},
    {sep:true},
    {label:'Rhythm: free time',check:()=>!rhyN(),run:()=>K('free')},
    {label:'Rhythm: quarter notes (1 octave)',check:()=>st.rhy==='q',enabled:()=>!rhyOK('q'),run:()=>K('q')},
    {label:'Rhythm: eighth notes (2 octaves)',check:()=>st.rhy==='e',enabled:()=>!rhyOK('e'),run:()=>K('e')},
    {label:'Rhythm: triplets (3 octaves)',check:()=>st.rhy==='t',enabled:()=>!rhyOK('t'),run:()=>K('t')},
    {label:'Rhythm: sixteenth notes (4 octaves)',check:()=>st.rhy==='s',enabled:()=>!rhyOK('s'),run:()=>K('s')},
    {sep:true},
    {label:'Loop',key:'L',check:()=>{ const c=loopBox(); return !!c&&c.checked; },run:()=>{ const c=loopBox(); if(c) c.click(); }},
    {label:'Tempo up 5 BPM',key:'=',run:()=>tempo(5)},
    {label:'Tempo down 5 BPM',key:'−',run:()=>tempo(-5)}]},
  win,
  {label:'Help',items:[
    {label:'Keyboard shortcuts',key:'?',run:()=>{ const t=[['Space','Play / Pause'],['S','Stop'],['L','Loop on/off'],['= / −','Tempo up / down 5 BPM'],['H','Show / hide the hands']]; const d=document.createElement('dialog'); d.className='info-dlg'; d.innerHTML='<h2>Scale practice shortcuts</h2><table class="keys">'+t.map(([k,v])=>'<tr><td><kbd>'+k+'</kbd></td><td>'+v+'</td></tr>').join('')+'</table>'; const c=el('button','btn pri','Close'); c.onclick=()=>{ d.close(); d.remove(); }; d.appendChild(c); document.body.appendChild(d); d.showModal(); }},
    {label:'Ask Dr. Onye…',run:()=>{ close(); if(window.SUITE) SUITE.go('class'); }}]}].filter(Boolean); }
function menuSync(){ try{ if(!window.PSMENU) return; PSMENU.set(ov&&!ov.hidden&&kind==='scales'?scaleMenus():null); }catch(_){} }
/* leaving the app (screen locked, another app, tab hidden): pause where you are; nothing carries on by itself until you come back */
function bg(){ try{ if(playing&&!paused&&!waitL&&pauseFn) pauseFn(); }catch(_){} }
function openScale(k,t){ const T=((window.SCALES&&SCALES.types)||[]).find(x=>x.id===t); if(T){ st.type=t; if(T.fam) st.family=T.fam; } if(k) st.key=k; save(); open('scales',{resume:true}); }
/* the room in three parts, in this order: Display (the scale, messages), Keyboard, Console (every control). Each one can be detached to
   float (drag it by its bar, resize from the corner) or expanded to fill the room; press the same button again to put it back. */
function prPanels(){
  const mk=(id,title)=>{ const p=el('section','ep'); p.id=id; p.innerHTML='<div class="ep-h"><span class="ep-grip">⠿</span><b></b><span class="ep-x"></span><button type="button" class="ep-b" data-a="det" title="Detach">⧉</button><button type="button" class="ep-b" data-a="max" title="Expand">⤢</button></div><div class="ep-body"></div>'; p.querySelector('b').textContent=title; return p; };
  const top=ov.querySelector('.e-top'), now=ov.querySelector('.e-now'), dp=mk('prDisp','Display'), kp=mk('prKbP','Keyboard'), cp=mk('prConP','Console');
  const ctl=$('#prCtl'), chipsE=$('#prChips'), pick=$('#prPick'), msg=$('#prMsg'), kb=ov.querySelector('.e-kb');   /* take them before moving anything: the panels are not in the room yet */
  { const b=dp.querySelector('.ep-body'), t=el('div','pd-top'), m=el('div','pd-main'), sc=el('div','pd-screen'), tpc=el('div','pd-tp'); sc.append(now,chipsE,pick,msg); m.append(sc,tpc); b.append(t,m); } kp.querySelector('.ep-body').append(kb); cp.querySelector('.ep-body').append(ctl);
  const cats=$('#prCats'); top.after(cats,dp,kp,cp);
  [dp,kp,cp].forEach(p=>{ p.querySelectorAll('.ep-b').forEach(b=>b.onclick=()=>prPanelMode(p,b.dataset.a)); const h=p.querySelector('.ep-h');
    h.addEventListener('pointerdown',e=>{ if(!p.classList.contains('float')||e.target.closest('button')) return; e.preventDefault(); const q0=lpt(document.body,e), l0=p.offsetLeft, t0=p.offsetTop;
      const mv=ev=>{ const q=lpt(document.body,ev); p.style.left=(l0+q.x-q0.x)+'px'; p.style.top=Math.max(0,t0+q.y-q0.y)+'px'; };
      const up=()=>{ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); }; document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up); }); }); }
function prPanelMode(p,a){ const was=p.classList.contains(a==='det'?'float':'max'); p.classList.remove('float','max'); p.style.left=p.style.top=p.style.width=p.style.height='';
  if(!was){ if(a==='det'){ p.classList.add('float'); const W=Math.min(ov.clientWidth-40,Math.max(380,p.offsetWidth*.75)); p.style.width=W+'px'; p.style.left=Math.round((ov.clientWidth-W)/2+ov.scrollLeft)+'px'; p.style.top=Math.round(ov.scrollTop+70)+'px'; } else p.classList.add('max'); }
  p.querySelector('[data-a=det]').classList.toggle('on',p.classList.contains('float')); const mb=p.querySelector('[data-a=max]'); mb.classList.toggle('on',p.classList.contains('max')); mb.textContent=p.classList.contains('max')?'⤡':'⤢';
  setTimeout(()=>{ window.dispatchEvent(new Event('resize')); try{ if(p.id==='prKbP') show(); if(p.id==='prConP'&&!playing&&kind==='scales') render(); xrowPlace(); }catch(_){} },40); }
window.PRACTICE={open,close,bg,openScale};
})();
