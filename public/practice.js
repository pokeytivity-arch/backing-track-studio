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
function watchEl(){ let w=document.querySelector('#prRoom .p-watch'); if(w) return w; const row=document.querySelector('#prRoom .p-mixrow'); if(!row) return null;
  w=el('div','p-watch'); w.setAttribute('role','status'); w.innerHTML='<div class="p-wps"><div class="p-wp"><b>Stopwatch</b><div class="p-wd" data-w="sw">00:00</div><small>practice time</small></div><div class="p-wp"><b>Practice goal</b><div class="p-wd" data-w="cd">00:00</div><small class="p-wg"><button type="button" data-g="-5" aria-label="Shorter goal">−</button><span data-w="gl"></span><button type="button" data-g="5" aria-label="Longer goal">+</button></small></div><div class="p-wp"><b>Local time</b><div class="p-wd" data-w="clk">--:--</div><small data-w="tz"></small></div></div><div class="p-wm"><span data-w="msg"></span><span class="p-wn" data-w="n"></span></div><div class="p-feed"><b>Practicing now</b><em title="An example. Real students appear here as they switch the feed on.">Example</em><span class="p-fw" data-f="who"></span><span class="p-fx" data-f="what"></span><span class="p-fl" data-f="long"></span><button type="button" class="p-fjoin" hidden>Turn on</button></div>';
  w.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ goalMin=Math.max(5,Math.min(180,goalMin+ +b.dataset.g)); try{ localStorage.setItem('pr-goal',String(goalMin)); }catch(_){} SES.goalDone=sesSec()>=goalMin*60; watchDraw(); });
  { const jb=w.querySelector('.p-fjoin'); if(jb) jb.onclick=feedDlg; } row.appendChild(w); return w; }
function watchPlace(w){ const row=document.querySelector('#prRoom .p-mixrow'), con=document.querySelector('#prRoom .p-con'), mx=document.querySelector('#prRoom .p-mix'); if(!row||!con||!mx) return;
  const flow=false; w.classList.toggle('flow',flow); con.classList.toggle('p-hide',flow&&!w.hidden); if(flow){ w.style.left=w.style.top=w.style.width=w.style.height=''; return; }
  /* offsets, not screen rectangles: on a phone the whole page is turned sideways, which would swap a rectangle's width and height */
  const sl=mx.scrollLeft||0, C={left:con.offsetLeft,right:con.offsetLeft+con.offsetWidth,bottom:con.offsetTop+con.offsetHeight}, Mt=mx.offsetTop; let l=1e9, r=-1e9;
  mx.querySelectorAll(':scope>.p-ch:not(.p-lvl)').forEach(x=>{ if(x.offsetWidth){ l=Math.min(l,x.offsetLeft-sl); r=Math.max(r,x.offsetLeft-sl+x.offsetWidth); } });
  if(l>r){ l=C.left; r=C.right; } l=Math.max(l,C.left); r=Math.min(r,C.right); if(l-C.left<40) l=C.left;
  const lv=[...mx.querySelectorAll(':scope>.p-lvl')].map(x=>x.offsetLeft-sl+x.offsetWidth), lvR=lv.length?Math.max(...lv):0; if(!lv.length||C.right-r<40&&lvR<=r) r=C.right;
  w.style.left=l+'px'; w.style.top=(Mt-4)+'px'; w.style.width=(r-l)+'px'; w.style.height=(C.bottom-Mt+4)+'px'; }
/* who else is practising: until the real feed has students in it, the panel shows clearly marked examples */
const FEED_EX=[['James','New York','D melodic minor','both hands',88,'t',14],['Grace','Lagos','B♭ major','right hand',72,'e',9],['Daniel','London','E harmonic minor','both hands',96,'q',22],['Ama','Accra','G major','left hand',80,'s',6],['Michael','Atlanta','F♯ major','both hands',100,'e',31],['Chioma','Abuja','A natural minor','both hands',84,'t',12],['Sarah','Toronto','E♭ major','right hand',76,'q',18],['David','Houston','C Dorian','both hands',90,'e',8],['Esther','Port Harcourt','B major','left hand',70,'free',27],['Samuel','Nairobi','A♭ major','both hands',92,'s',15]];
const FEED_T0=Date.now(), RHYW={q:'quarter notes',e:'eighth notes',t:'triplets',s:'sixteenth notes',free:'free rhythm'};
/* the live feed: students who switch it on see who else is practising, and are seen. Until 30 students are on it, marked examples fill in. */
const FD=(()=>{ let f={}; try{ f=JSON.parse(localStorage.getItem('pr-feed')||'{}')||{}; }catch(_){} if(!f.id){ const a=new Uint8Array(12); (window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach((_,i)=>a[i]=Math.random()*256|0); f.id=[...a].map(x=>x.toString(16).padStart(2,'0')).join(''); } return f; })();
const fdSave=()=>{ try{ localStorage.setItem('pr-feed',JSON.stringify(FD)); }catch(_){} };
const nickIdea=()=>['arctic','cobalt','maple','ember','violet','echo','harbor','sable','lunar','cedar','nova','coral'][Math.random()*12|0]+(1000+(Math.random()*9000|0));
let FEED_LIVE=[], feedT=0, beatT=0;
const scaleLabel=()=>{ const t=((window.SCALES&&SCALES.types)||[]).find(q=>q.id===st.type); return SYMK(st.key)+' '+(st.type==='major'?'major':(t?t.l:st.type)); };
const handsLabel=()=>st.motion==='contrary'?'both hands, contrary':({rh:'right hand',lh:'left hand',both:'both hands'}[st.hand]||'');
async function feedPull(){ if(!FD.on) return; try{ const r=await fetch('/api/presence?me='+FD.id,{cache:'no-store'}); const d=await r.json(); FEED_LIVE=Array.isArray(d.list)?d.list:[]; }catch(_){} }
function feedBeat(off){ if(!FD.on&&!off) return; try{ fetch('/api/presence',{method:'POST',headers:{'content-type':'application/json'},keepalive:true,body:JSON.stringify(off?{id:FD.id,off:true}:{id:FD.id,nick:FD.nick,scale:scaleLabel(),hands:handsLabel(),bpm:st.bpm,rhy:RHYW[st.rhy||'free'],min:sesSec()/60})}).catch(()=>{}); }catch(_){} }
function feedRun(on){ clearInterval(feedT); clearInterval(beatT); feedT=beatT=0; if(!on||!FD.on) return; feedBeat(); feedPull(); beatT=setInterval(()=>feedBeat(),25000); feedT=setInterval(feedPull,15000); }
function feedItems(){ const live=FEED_LIVE.map(x=>({who:x.nick+(x.city?' · '+x.city:''),what:'Practicing '+x.scale+' ('+x.hands+') · tempo '+x.bpm+' · '+x.rhy,min:x.min,ex:false}));
  const ex=live.length<30?FEED_EX.map(x=>({who:x[0]+' · '+x[1],what:'Practicing '+x[2]+' ('+x[3]+') · tempo '+x[4]+' · '+RHYW[x[5]],min:x[6]+Math.floor((Date.now()-FEED_T0)/60000),ex:true})):[]; return live.concat(ex); }
function feedDlg(){ let d=document.querySelector('#prRoom .p-fdlg'); if(d){ d.remove(); return; } d=el('div','p-fdlg'); d.setAttribute('role','dialog'); d.setAttribute('aria-label','Practice feed');
  d.innerHTML='<div class="p-fbox"><h3>Practice feed</h3><p>When the feed is on, you can see what other students are practicing, and they can see what you are practicing: your nickname, your city, the scale, hands, tempo and rhythm, and how long you have been practicing.</p><p>Use a nickname or pseudonym (like <b>arctic2342</b>) if you would rather not use your name. You can switch the feed off at any time.</p><label>Nickname <input maxlength="24" autocomplete="off" spellcheck="false"></label><div class="p-ferr"></div><div class="p-fbtns"><button type="button" class="p-fon"></button><button type="button" class="p-foff"></button></div></div>';
  const inp=d.querySelector('input'), on=d.querySelector('.p-fon'), off=d.querySelector('.p-foff'), er=d.querySelector('.p-ferr'); inp.value=FD.nick||nickIdea();
  on.textContent=FD.on?'Save nickname':'Turn feed on'; off.textContent=FD.on?'Turn feed off':'Not now';
  on.onclick=()=>{ const n=inp.value.replace(/[^\p{L}\p{N} _.\-]/gu,'').trim(); if(n.length<2){ er.textContent='Choose a nickname of at least 2 letters or numbers.'; return; } FD.nick=n; FD.on=true; fdSave(); d.remove(); feedSync(); if(SES.on&&SES.t0) feedRun(true); };
  off.onclick=()=>{ if(FD.on){ FD.on=false; fdSave(); feedBeat(true); feedRun(false); FEED_LIVE=[]; } d.remove(); feedSync(); };
  d.onclick=e=>{ if(e.target===d) d.remove(); }; inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') on.click(); if(e.key==='Escape') d.remove(); };
  ov.appendChild(d); setTimeout(()=>inp.focus(),30); }
function feedSync(){ document.querySelectorAll('#prRoom .p-feedb').forEach(b=>{ b.classList.toggle('on',!!FD.on); b.title=FD.on?'Practice feed is on as '+FD.nick+'. Click to change or switch off.':'Practice feed is off. Click to see who else is practicing (and be seen).'; }); }
function watchDraw(){ const w=document.querySelector('#prRoom .p-watch'); if(!w) return; watchPlace(w);
  { const q2=k=>w.querySelector('[data-f='+k+']'), tag=w.querySelector('.p-feed em'), jb=w.querySelector('.p-fjoin'); if(q2('who')){ const items=FD.on?feedItems():[];
      if(!FD.on){ q2('who').textContent=''; q2('what').textContent='The practice feed is off. Switch it on to see who else is practicing.'; q2('long').textContent=''; tag.hidden=true; jb.hidden=false; }
      else { const f=items[Math.floor(Date.now()/5000)%items.length]; q2('who').textContent=f.who; q2('what').textContent=f.what; q2('long').textContent=Math.round(f.min)+' min'; tag.hidden=!f.ex; jb.hidden=true; } } }
  const q=k=>w.querySelector('[data-w='+k+']'), sec=sesSec(), left=goalMin*60-sec;
  q('sw').textContent=hms(sec); q('cd').textContent=hms(left); q('cd').classList.toggle('done',left<=0); q('gl').textContent=goalMin+' min';
  { const ps=new Intl.DateTimeFormat([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date()); const ap=(ps.find(x=>x.type==='dayPeriod')||{}).value||''; const c=q('clk'); c.textContent=ps.filter(x=>x.type!=='dayPeriod').map(x=>x.value).join('').trim(); if(ap){ const sm=document.createElement('span'); sm.className='p-ap'; sm.textContent=ap; c.appendChild(sm); } } q('tz').textContent=TZ;
  if(left<=0&&!SES.goalDone){ SES.goalDone=true; SES.msg='You reached your practice goal of '+goalMin+' minutes. Well done!'; SES.until=Date.now()+12000; }
  if(Date.now()>SES.until){ const i=Math.floor(sec/12)%MOTIV.length; SES.msg=MOTIV[(i+SES.mi)%MOTIV.length]; }
  q('msg').textContent=SES.msg; q('n').textContent='Notes '+(SES.lh+SES.rh).toLocaleString()+' · L '+SES.lh.toLocaleString()+' · R '+SES.rh.toLocaleString(); }
function watchSync(){ if(!ov) return; const sc=kind==='scales';
  if(playing&&sc&&!SES.on){ Object.assign(SES,{on:true,ms:0,t0:0,lh:0,rh:0,next:100,msg:'',until:0,mi:Math.floor(Math.random()*MOTIV.length),goalDone:false}); clearInterval(SES.timer); SES.timer=setInterval(()=>{ if(SES.on) watchDraw(); },250); }
  if(SES.on&&(!playing||!sc)){ if(SES.t0){ SES.ms+=Date.now()-SES.t0; SES.t0=0; } SES.on=false; clearInterval(SES.timer); feedRun(false); if(FD.on) feedBeat(true); const w=document.querySelector('#prRoom .p-watch'); if(w) w.remove(); ov.classList.remove('p-locked'); { const c=document.querySelector('#prRoom .p-con'); if(c) c.classList.remove('p-hide'); }
    const tot=SES.lh+SES.rh, m=$('#prMsg'); if(m&&tot) m.textContent='Practice session: '+hms(SES.ms/1000)+' · '+tot.toLocaleString()+' notes'+(SES.lh&&SES.rh?' (left hand '+SES.lh.toLocaleString()+', right hand '+SES.rh.toLocaleString()+')':'')+'. Well done!'; return; }
  if(!SES.on) return;
  const run=!paused, was=!!SES.t0; if(run&&!SES.t0) SES.t0=Date.now(); if(!run&&SES.t0){ SES.ms+=Date.now()-SES.t0; SES.t0=0; } if(run!==was){ if(run) feedRun(true); else { feedRun(false); if(FD.on) feedBeat(true); } }
  const w=watchEl(); if(w){ w.hidden=!run; watchPlace(w); } ov.classList.toggle('p-locked',run); watchDraw(); if(run) meterGo(); }
const playPause=()=>{ if(!playing){ playAll(); updPause(); return; } if(waitL) return; if(pauseFn) pauseFn(); };
const clr=()=>{ curDesc=false; timers.forEach(x=>{ if(x&&x.clear) x.clear(); else clearTimeout(x); }); timers=[]; playing=false; paused=false; waitL=false; pauseFn=null; try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(false); }catch(_){} updPause(); const lp=document.getElementById('prLearn'); if(lp) lp.hidden=true; const b=$('#prPlay'); if(b) b.textContent='▶ Play'; };

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
#prRoom .p-mixrow.ph .p-watch{padding:5px 6px;gap:4px;border-radius:9px} #prRoom .p-mixrow.ph .p-wps{gap:5px} #prRoom .p-mixrow.ph .p-wp{padding:3px;gap:2px}
#prRoom .p-mixrow.ph .p-wd{font-size:19px} #prRoom .p-mixrow.ph .p-wp b{font-size:7.5px} #prRoom .p-mixrow.ph .p-wp small{font-size:9px} #prRoom .p-mixrow.ph .p-wm{font-size:10.5px;gap:6px} #prRoom .p-mixrow.ph .p-wn{font-size:9.5px}
#prRoom .p-mixrow.ph .p-wg button{width:18px;height:16px;font-size:11px;min-height:0}
#prRoom .p-cbar{display:flex;align-items:center;gap:5px;padding:7px 6px;border-top:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.18);border-radius:0 0 12px 12px}
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
#prRoom .p-mixrow.ph .p-banks{gap:3px} #prRoom .p-mixrow.ph .p-feed{padding:2px 6px;font-size:10px;gap:5px} #prRoom .p-mixrow.ph .p-feed b{font-size:7.5px} #prRoom .p-mixrow.ph .p-fl{font-size:9.5px} #prRoom .p-mixrow.ph .p-feed em{font-size:7px}
#prRoom .p-mixrow.ph .p-watch.flow{min-height:110px}
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
#prRoom .p-cdd{gap:10px;flex-wrap:wrap;align-items:flex-end} #prRoom .p-cdd .p-sel{min-width:130px} #prRoom #prChord{min-width:220px} #prRoom .p-more{position:relative;display:inline-block} #prRoom .p-more>summary{list-style:none;cursor:pointer} #prRoom .p-more>summary::-webkit-details-marker{display:none} #prRoom .p-morebox{position:absolute;right:0;top:calc(100% + 6px);z-index:30;background:#12141c;border:1px solid #3a3424;border-radius:12px;padding:12px;width:min(520px,86vw);box-shadow:0 10px 30px rgba(0,0,0,.5)} #prRoom .p-tab{position:relative;height:22px;margin:0 0 3px} #prRoom .p-tab span{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;border-radius:5px;background:#1a2340;color:#7d8bb0;font:700 11px/1 system-ui,sans-serif;letter-spacing:-.3px;white-space:nowrap;overflow:visible;transition:background .12s,color .12s} #prRoom .p-tab span.on{color:#fff;box-shadow:0 0 10px currentColor} #prRoom .p-tab span.on.l{background:${LH};color:#fff;box-shadow:0 0 12px ${LH}} #prRoom .p-tab span.on.r{background:${RH};color:#fff;box-shadow:0 0 12px ${RH}}
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
const DEF={family:'regular',type:'major',key:'C',motion:'similar',mode:'practice',oct:1,hand:'rh',dir:'updown',sys:'letter',bpm:80,loop:false,rhy:'free'};
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
/* ---------- rhythm practice (4/4): quarter notes over one octave, eighths over two, triplets over three, sixteenths over four.
   Up in even notes for seven beats, the top note held for a beat, then down from the top note again, ending on a held tonic: 16 beats. ---------- */
const RHY=[['free','Free'],['q','Quarter'],['e','Eighth'],['t','Triplet'],['s','Sixteenth']], RN={q:1,e:2,t:3,s:4};
const rhyN=()=>kind==='scales'&&st.rhy&&st.rhy!=='free'?RN[st.rhy]:0;
function seven(){ try{ const SC=window.SCALES, s=SC.build(st.key,'rh',st.type,1,'similar'); return s.length===8&&new Set(s.slice(0,7).map(x=>((x.rh[0]||x.lh[0])%12+12)%12)).size===7; }catch(_){ return false; } }
function rhyOK(k){ if(k==='free') return ''; if(st.motion==='contrary') return 'Rhythm practice is in similar motion'; if(!seven()) return 'Rhythm practice is for scales with seven notes';
  const SC=window.SCALES, mx=SC&&SC.maxOct?SC.maxOct(st.key,st.hand,st.motion):4; return RN[k]>mx?RN[k]+' octaves do not fit '+(st.hand==='both'?'both hands':'this hand')+' on the keyboard in this key':''; }
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
      if(k>=ev.length&&beatK>=beats){ if(st.loop){ cyc++; k=0; beatK=0; } else if(C.now()>at(beats,cyc)-0.02){ rkill(); clr(); show(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } };
    loop=setInterval(pump,40); timers.push(loop); timers.push({clear:()=>{ live.forEach(clearTimeout); live.clear(); rkill(); }}); pump();
    pauseFn=()=>{ if(!playing) return;
      if(!paused){ paused=true; pausedAt=C.now(); live.forEach(clearTimeout); live.clear(); rkill();   /* silence what was already scheduled */
        /* rewind to the first note and click that had not sounded yet */
        if(k===0&&beatK===0&&cyc>0&&at(beats-1,cyc-1)+spb>pausedAt){ cyc--; k=ev.length; beatK=beats; }
        while(k>0&&at(ev[k-1].b,cyc)>=pausedAt) k--; while(beatK>-4&&at(beatK-1,cyc)>=pausedAt) beatK--;
        try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(true); }catch(_){} }
      else { base+=C.now()-pausedAt+0.05; paused=false; rbus=C.bus&&C.bus(); try{ if(window.PSHANDS&&PSHANDS.pause) PSHANDS.pause(false); }catch(_){} pump(); }
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
  const order=kind==='scales'?seq():[...Array(steps.length).keys()], gap=(60/st.bpm)*(kind==='scales'?1:(steps.length>1?2:4))*1000;
  playing=true; let p=0, t0=0, rem=0; paused=false; waitL=false;
  const adv=()=>{ if(!playing||paused) return; p++; if(p>=order.length){ if(st.loop) p=0; else { clr(); try{ if(window.PSPROG) PSPROG.mark(); }catch(_){} return; } } tick(); };
  const sched=ms=>{ rem=ms; t0=Date.now(); timers.push(setTimeout(adv,ms)); };
  const go=()=>{ if(!playing) return; cur=order[p]; curDesc=kind==='scales'&&p>0&&order[p]<order[p-1]; show(); tally(curS()); play1(curS(),gap/1000*(kind==='scales'?1.6:1.05)); sched(gap);
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
/* the console box: channel strips on top; a bar along the bottom with the power switch, the memory banks, Studio and Ask Pokey.
   Power off folds the strips away and shows a one-line summary instead. */
const conOn=()=>{ try{ return localStorage.getItem('pr-con')!=='0'; }catch(_){ return true; } };
function conSum(){ const sm=document.querySelector('#prRoom .p-sum'); if(!sm) return; const HL={rh:'Right hand',lh:'Left hand',both:'Both hands'}, DL=(st.motion==='contrary'?CDIRS:DIRS).find(d=>d[0]===st.dir);
  sm.textContent=[st.motion==='contrary'?'Both hands':HL[st.hand],st.motion==='contrary'?'Contrary':'Similar',DL?DL[1]:'',st.family==='exotic'?'Exotic':'Regular',st.mode==='learn'?'Learning':'Practice',{letter:'Letters',solfa:'Solfa',num:'Numbers'}[st.sys]||st.sys,(RHY.find(r=>r[0]===(st.rhy||'free'))||['','Free'])[1]].filter(Boolean).join('  ·  '); }
function conBar(ask,ph){ const bar=el('div','p-cbar'), pw=el('button','p-pow'); pw.type='button'; pw.innerHTML='<i class="p-led"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg><span>Power</span>'; pw.classList.add('p-pwr');
  const ps=()=>{ const on=conOn(); pw.setAttribute('aria-pressed',String(on)); pw.title=on?'Power: on. Click to switch the console off':'Power: off. Click to switch the console on'; pw.classList.toggle('on',on); }; ps();
  pw.onclick=()=>{ const on=!conOn(); try{ localStorage.setItem('pr-con',on?'1':'0'); }catch(_){} const c=document.querySelector('#prRoom .p-con'); if(c) c.classList.toggle('off',!on); ps(); conSum(); };
  const sb=$('#prStudio'); if(sb){ sb.className='p-ubtn'; sb.textContent='Studio'; } if(ask){ ask.className='p-ubtn'; ask.textContent='Ask Pokey'; }
  const fb=el('button','p-pow p-feedb'); fb.type='button'; fb.innerHTML='<i class="p-led"></i><span>Feed</span>'; fb.onclick=feedDlg; const sp=el('span','p-sp'); bar.append(pw,bankBar(),sp,fb); setTimeout(feedSync,0); if(sb) bar.appendChild(sb); if(ask) bar.appendChild(ask); return bar; }
const MXO='pr-mixorder';
function mixOrder(panel){
  let ord=[]; try{ ord=JSON.parse(localStorage.getItem(MXO)||'[]'); }catch(_){}
  const strips=[...panel.children], pos=c=>{ const i=ord.indexOf(c); return i<0?999:i; };
  strips.map((x,i)=>[x,i]).sort((a,b)=>(pos(a[0].dataset.ch)-pos(b[0].dataset.ch))||(a[1]-b[1])).forEach(([x])=>panel.appendChild(x));
  const save=()=>{ try{ localStorage.setItem(MXO,JSON.stringify([...panel.children].map(x=>x.dataset.ch))); }catch(_){} };
  [...panel.children].forEach(strip=>{ const h=strip.querySelector('.p-cht'); if(!h) return; h.title='Drag to move this channel';
    h.addEventListener('pointerdown',e=>{ if(e.button) return; e.preventDefault(); const x0=e.clientX; let moved=false;
      const mv=ev=>{ if(!moved&&Math.abs(ev.clientX-x0)<=4) return; moved=true; strip.classList.add('p-drag');
        const sib=[...panel.children].filter(x=>x!==strip); let before=null; for(const x of sib){ const r=x.getBoundingClientRect(); if(ev.clientX<r.left+r.width/2){ before=x; break; } }
        if(strip.nextSibling!==before) panel.insertBefore(strip,before); };
      const up=()=>{ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); document.removeEventListener('pointercancel',up); if(moved){ strip.classList.remove('p-drag'); save(); } };
      document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up); }); });
}
/* memory banks: store the whole console (scale, note, octaves, tempo, loop, every channel and both volume faders) in one of six banks.
   Press SAVE, then a number, to store; press a number to recall. A lit number holds a setting; green is the one in use. */
const BKS='pr-banks', BKEYS=['family','type','key','motion','mode','oct','hand','dir','sys','bpm','loop','rhy'];
let bankArm=false, bankDel=false, bankCur=(()=>{ try{ return +(localStorage.getItem('pr-bank-cur')??-1); }catch(_){ return -1; } })();
const banksGet=()=>{ try{ const b=JSON.parse(localStorage.getItem(BKS)||'[]'); return Array.isArray(b)?b:[]; }catch(_){ return []; } };
const bankName=b=>{ if(!b||!b.s) return 'Empty'; const x=b.s, SC=window.SCALES, t=((SC&&SC.types)||[]).find(q=>q.id===x.type);
  return SYMK(x.key)+' '+(x.type==='major'?'major':(t?t.l:x.type))+' · '+({rh:'right hand',lh:'left hand',both:'both hands'}[x.hand]||'')+(x.motion==='contrary'?', contrary':'')+' · '+(x.rhy&&x.rhy!=='free'?{q:'quarter notes',e:'eighth notes',t:'triplets',s:'sixteenth notes'}[x.rhy]:(x.oct||1)+' oct')+' · '+x.bpm+' BPM'; };
function bankSync(){ const b=banksGet(); document.querySelectorAll('#prRoom .p-banks').forEach(bar=>{ bar.classList.toggle('arm',bankArm); bar.classList.toggle('del',bankDel); { const dl=bar.querySelector('.p-bdel'); if(dl) dl.setAttribute('aria-pressed',String(bankDel)); }
  bar.querySelectorAll('.p-bank').forEach((k,i)=>{ k.classList.toggle('has',!!b[i]); k.classList.toggle('on',i===bankCur&&!!b[i]); k.title=(bankDel?(b[i]?'Delete bank '+(i+1)+': '+bankName(b[i]):'Bank '+(i+1)+' is already empty'):bankArm?'Save to bank '+(i+1)+(b[i]?' (replaces: '+bankName(b[i])+')':''):b[i]?'Bank '+(i+1)+': '+bankName(b[i]):'Bank '+(i+1)+' is empty. Press SAVE, then '+(i+1)+', to store this setting'); });
  const sv=bar.querySelector('.p-bsave'); if(sv) sv.setAttribute('aria-pressed',String(bankArm)); }); }
function bankPress(i){ const b=banksGet();
  if(bankDel){ bankDel=false; const m=$('#prMsg'); if(!b[i]){ if(m) m.textContent='Bank '+(i+1)+' is already empty.'; bankSync(); return; } b[i]=null; try{ localStorage.setItem(BKS,JSON.stringify(b)); }catch(_){} if(bankCur===i){ bankCur=-1; try{ localStorage.setItem('pr-bank-cur','-1'); }catch(_){} } bankSync(); if(m) m.textContent='Bank '+(i+1)+' deleted.'; return; }
  if(bankArm){ const snap={s:{},v:{}}; BKEYS.forEach(k=>snap.s[k]=st[k]); if(window.CLASS&&CLASS.vol){ snap.v.keys=CLASS.vol.get('keys'); snap.v.click=CLASS.vol.get('click'); } b[i]=snap; try{ localStorage.setItem(BKS,JSON.stringify(b)); }catch(_){} bankArm=false; bankCur=i;
    try{ localStorage.setItem('pr-bank-cur',String(i)); }catch(_){} bankSync(); const m=$('#prMsg'); if(m) m.textContent='Saved to bank '+(i+1)+': '+bankName(snap)+'.'; return; }
  if(!b[i]){ const m=$('#prMsg'); if(m) m.textContent='Bank '+(i+1)+' is empty. Press SAVE, then '+(i+1)+', to store the console here.'; return; }
  clr(); BKEYS.forEach(k=>{ if(b[i].s[k]!==undefined) st[k]=b[i].s[k]; }); save(); if(b[i].v&&window.CLASS&&CLASS.vol){ if(isFinite(b[i].v.keys)) CLASS.vol.set('keys',b[i].v.keys); if(isFinite(b[i].v.click)) CLASS.vol.set('click',b[i].v.click); }
  bankCur=i; try{ localStorage.setItem('pr-bank-cur',String(i)); }catch(_){} loadScale(); render(); try{ menuSync(); }catch(_){} const m=$('#prMsg'); if(m) m.textContent='Bank '+(i+1)+': '+bankName(b[i])+'.'; }
function bankBar(){ const bar=el('div','p-banks'); bar.setAttribute('role','group'); bar.setAttribute('aria-label','Memory banks'); bar.appendChild(el('span','p-bl','Memory'));
  for(let i=0;i<6;i++){ const k=el('button','p-bank'); k.type='button'; k.innerHTML='<i class="p-led"></i>'+(i+1); k.onclick=()=>bankPress(i); bar.appendChild(k); }
  const sv=el('button','p-bsave','Save'); sv.type='button'; sv.onclick=()=>{ bankArm=!bankArm; bankDel=false; bankSync(); const m=$('#prMsg'); if(m) m.textContent=bankArm?'Now press a bank number (1 to 6) to save this console there.':''; }; bar.appendChild(sv);
  const dl=el('button','p-bdel','Delete'); dl.type='button'; dl.onclick=()=>{ bankDel=!bankDel; bankArm=false; bankSync(); const m=$('#prMsg'); if(m) m.textContent=bankDel?'Now press the bank number (1 to 6) you want to delete.':''; }; bar.appendChild(dl);
  setTimeout(bankSync,0); return bar; }
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
    const cap=el('div','p-cap'); fz.appendChild(cap); const rd=el('div','p-lvn'); strip.appendChild(fz); strip.appendChild(rd);
    { const mt=el('div','p-mtr'); mt.style.top='9px'; mt.style.height=H+'px'; for(let j=MSEG-1;j>=0;j--) mt.appendChild(el('i',j>=MSEG-2?'r':j>=MSEG-4?'a':'g')); fz.appendChild(mt); }
    const sync=()=>{ const v=vget(k); cap.style.top=(9+(1-v)*H)+'px'; rd.textContent=Math.round(v*100); strip.setAttribute('aria-valuenow',String(Math.round(v*100))); }; strip.__sync=sync; sync();
    const at=e=>1-(Math.max(9,Math.min(H+9,e.clientY-fz.getBoundingClientRect().top))-9)/H;
    let drag=false; fz.addEventListener('pointerdown',e=>{ drag=true; fz.setPointerCapture(e.pointerId); cap.classList.add('drag'); cap.style.transition='none'; vset(k,at(e)); e.preventDefault(); });
    fz.addEventListener('pointermove',e=>{ if(drag) vset(k,at(e)); });
    const end=()=>{ if(!drag) return; drag=false; cap.classList.remove('drag'); cap.style.transition=''; }; fz.addEventListener('pointerup',end); fz.addEventListener('pointercancel',end);
    fz.addEventListener('dblclick',()=>vset(k,(window.CLASS&&CLASS.vol&&CLASS.vol.def)||0.87));
    strip.addEventListener('keydown',e=>{ const d={ArrowUp:.05,ArrowRight:.05,ArrowDown:-.05,ArrowLeft:-.05}[e.key]; if(d){ e.preventDefault(); e.stopPropagation(); vset(k,vget(k)+d); } });
    return strip; });
}
function levelsSmall(){
  return VK.map(([k,title])=>{ const l=el('label','p-rng p-tempo p-vol'); l.dataset.vol=k; l.innerHTML='<span></span><input type="range" min="0" max="100" step="1">'; l.firstChild.textContent=title; const r=l.querySelector('input'); r.setAttribute('aria-label',title==='Keys'?'Keyboard volume':'Metronome volume');
    l.__sync=()=>{ r.value=Math.round(vget(k)*100); }; l.__sync(); r.oninput=()=>{ if(window.CLASS&&CLASS.vol) CLASS.vol.set(k,r.value/100); document.querySelectorAll('#prRoom .p-lvl[data-vol='+k+']').forEach(x=>x.__sync&&x.__sync()); }; return l; });
}
function seg(parent,list,val,fn,small){ parent.textContent=''; if(small) parent.classList.add('sm'); list.forEach(([k,t])=>{ const b=el('button',null,t); b.type='button'; b.dataset.k=k; b.setAttribute('aria-pressed',String(k===val)); b.onclick=()=>fn(k); parent.appendChild(b); }); }

function render(){
  { const pk=$('#prPick'); if(pk) pk.hidden=false; }
  ov.querySelectorAll('.e-top .p-motop').forEach(x=>x.remove());
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
    if(st.rhy&&st.rhy!=='free'&&rhyOK(st.rhy)) st.rhy='free';
    const ry=el('div','e-seg sm'); ry.setAttribute('role','group'); ry.setAttribute('aria-label','Rhythm'); seg(ry,RHY,st.rhy||'free',k=>{ st.rhy=k; save(); clr(); loadScale(); render(); },true);
    ry.querySelectorAll('button').forEach(b=>{ const w=rhyOK(b.dataset.k); if(w){ b.disabled=true; b.title=w; } }); ctl.appendChild(ry);
    if(rhyN()) d.querySelectorAll('button').forEach(b=>{ b.disabled=true; b.title='Rhythm practice always goes up and down'; });
    const mo4=(SC&&SC.maxOct)?SC.maxOct(st.key,st.hand,st.motion):3; if(st.oct>mo4) st.oct=mo4;
    ctl.appendChild(sel('Octaves',[{v:'1',t:'One octave'},{v:'2',t:'Two octaves'}].concat(st.motion==='contrary'?[]:[{v:'3',t:'Three octaves'}]).concat(mo4>=4?[{v:'4',t:'Four octaves'}]:[]),String(st.oct||1),v=>{ st.oct=+v; save(); loadScale(); }));
    ctl.lastChild.classList.add('p-octs'); if(rhyN()){ const os=ctl.lastChild.querySelector('select'); if(os){ os.disabled=true; os.title='The rhythm sets the octaves'; const o=[...os.options].find(x=>+x.value===rhyN()); if(o) os.value=o.value; else { const n=document.createElement('option'); n.value=String(rhyN()); n.textContent=['','One','Two','Three','Four'][rhyN()]+' octave'+(rhyN()>1?'s':''); os.appendChild(n); os.value=n.value; } } }
    transport(ctl); ctl.appendChild(d);
    const ask=el('button','e-btn','Ask Pokey about this scale'); ask.type='button'; ask.onclick=()=>{ close(); if(window.CLASS) CLASS.askAbout(st.type==='major'?'Tell me about the '+st.key+' major scale. How is it built with the 3+4 method, and what should I practice with it?':'Tell me about the '+st.key+' '+((SC&&SC.types||[]).find(t=>t.id===st.type)||{l:''}).l+' scale. How is it built, and what should I practice with it?',{fresh:true}); }; ctl.appendChild(ask);
    /* desktop: Practice in Studio and Ask Pokey sit together on their own line, with the memory banks */ /* (Studio and Ask Pokey now live on the console's bottom bar) */
    if(MQM.matches){ /* phone: row 1 = Scale, Note, Octaves, Loop, Tempo, Ask Pokey; row 2 = the toggles and Play scale; keyboard below. Desktop keeps its layout. */
      const r1=el('div','p-r1'), r2=el('div','p-r2'), rg=ctl.querySelectorAll('.p-rng'), pl=$('#prPlay'), oc=ctl.querySelector('.p-octs');
      ms.querySelectorAll('.p-sel').forEach(x=>r1.appendChild(x)); ms.remove();
      const r3=el('div','p-r3'); r1.append(oc,rg[1],rg[0]); ask.textContent='Ask Pokey'; r2.append(fm,mo,md,sy,hand,d,ry); if(fg) r2.append(fg); r2.hidden=true; ctl.append(r1,r2); void r3;
    } else { const top=$('#prRoom .e-top'); if(hand.parentNode!==top) top.insertBefore(hand,$('#prDots')); /* Up / Down and Similar / Contrary sit with the hands (clear the ones from the last render first) */ top.querySelectorAll('.p-motop').forEach(x=>x.remove()); d.classList.add('p-motop'); d.style.marginLeft='auto'; mo.classList.add('p-motop'); top.insertBefore(d,hand); top.insertBefore(mo,hand); /* desktop: Scale and Note sit with the other controls */ const sl=[...ms.querySelectorAll('.p-sel')]; /* first row: Scale, Note, Tempo and Loop together */ const r0=el('div','p-r0'); sl.reverse(); /* Note first, then Scale */ sl.forEach((x,i)=>{ x.classList.add('p-sel-d'); /* fixed widths: the Scale box never grows or shrinks with the name */ x.style.minWidth=x.style.width=x.style.maxWidth=i===0?'84px':'250px'; x.style.flex='none'; if(i){ const q=x.querySelector('select'); if(q){ q.style.textOverflow='ellipsis'; q.title=q.options[q.selectedIndex]?q.options[q.selectedIndex].text:''; } } r0.appendChild(x); }); { const oc=ctl.querySelector('.p-octs'); if(oc) r0.appendChild(oc); } ctl.querySelectorAll('.p-rng').forEach(x=>r0.appendChild(x)); ctl.insertBefore(r0,ctl.firstChild); ms.remove(); }
    /* desktop: the six choices become a digital mixer, one channel strip each; the fader's stops are the options */
    { const ph=MQM.matches, chs=[['Hand',hand,{pair:[['lh','Left hand'],['rh','Right hand']],both:'both',lock:()=>st.motion==='contrary',lockWhy:'Contrary motion always uses both hands'}],['Motion',mo],['Direction',d,{pair:st.motion==='contrary'?[['up','Open'],['down','Close']]:[['up','Ascending'],['down','Descending']],both:'updown'}],['Family',fm],['Mode',md],['Names',sy],['Rhythm',ry]]; if(fg) chs.push(['Fingering',fg]);
      chs.forEach(([,x])=>x.classList.add('p-src')); const row=el('div','p-mixrow'+(ph?' ph':'')), tp=el('div','p-tp'); tp.append($('#prPlay'),$('#prPause')); const mx=mixer(chs); mx.append(...levels(ph?36:100)); mixOrder(mx);
      const con=el('div','p-con'+(conOn()?'':' off')), sum=el('div','p-sum'); con.append(mx,sum,conBar(ask,ph)); row.append(con,tp); conSum();
      const r0=ctl.querySelector(ph?'.p-r1':'.p-r0'); if(r0&&r0.nextSibling) ctl.insertBefore(row,r0.nextSibling); else ctl.appendChild(row); }
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
  syncStudioBtn(); clr(); const SC=window.SCALES; if(!SC||!SC.build) return; if(st.rhy&&st.rhy!=='free'&&rhyOK(st.rhy)) st.rhy='free'; steps=SC.build(st.key,st.hand,st.type,rhyN()||st.oct,st.motion,st.fa==='alt'); cur=-1; chips();
  const g=steps.map(s=>s.name), TL=(SC.types.find(t=>t.id===st.type)||{l:'Major'}).l, maj=st.type==='major'; $('#prLbl').textContent='';   /* the page title already says Scale practice */ const ocN=rhyN()||st.oct; $('#prBig').textContent=SYMK(st.key)+' '+(maj?'major':TL)+(ocN>1?' · '+ocN+' octaves':'')+(rhyN()?' · '+({q:'quarter notes',e:'eighth notes',t:'triplets',s:'sixteenth notes'})[st.rhy]:'')+(st.motion==='contrary'?' · contrary motion':'')+((st.fa==='alt'&&SC.alts&&SC.alts(st.key,st.type))?' · alternate fingering':''); { const L=steps.map(x=>lab(x,false)); let sub=(maj&&st.oct===1)?(L.slice(0,3).join(' ')+'  |  '+L.slice(3,7).join(' ')+'  |  '+L[7]):L.join(' '); const dn=steps.map(x=>lab(x.alt||x,true)); if(dn.join(' ')!==L.join(' ')&&(steps.some(x=>x.alt)||(sysNow()!=='letter'&&steps.some(x=>x.solD)))) sub+='   ·   coming down: '+dn.slice().reverse().join(' '); $('#prSub').textContent=sub; }
  const rh=steps.some(s=>s.fing), lh=steps.some(s=>s.lfing), hs=st.hand!=='lh', ls=st.hand!=='rh';
  if(st.motion==='contrary'){ $('#prMsg').textContent='Contrary motion: both hands start together on the '+SYMK(st.key)+'. Open: the right hand goes up and the left hand goes down. Close: they come back together.'+((hs&&!rh)||(ls&&!lh)?' The fingering for this key is not in the lessons yet.':''); drawKb(); keyTip(); return; }
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
  steps=out.map(x=>handFit(invert(x))); steps.multi=true; cur=0; chips(); show(); invBtn(); $('#prMsg').textContent=(list.length>out.length?'Some of those were not recognised and were skipped. ':'')+'Tap a chord to hear it, or press Play.'; if(!quiet) play1(steps[0]); chordTip(list);
}
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
    {label:'Ask Pokey about this scale…',run:()=>{ const b=[...ov.querySelectorAll('#prRoom button')].find(x=>/^Ask Pokey/.test(x.textContent)); if(b) b.click(); }},
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
    {label:'Ask Pokey…',run:()=>{ close(); if(window.SUITE) SUITE.go('class'); }}]}].filter(Boolean); }
function menuSync(){ try{ if(!window.PSMENU) return; PSMENU.set(ov&&!ov.hidden&&kind==='scales'?scaleMenus():null); }catch(_){} }
window.PRACTICE={open,close};
})();
