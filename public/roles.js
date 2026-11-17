/* roles.js: Teacher and Student on the suite's home page (pitch demo; everything is kept on this device).
   A switch at the top of the home page: Student | Teacher. Switching saves the choice and refreshes the page.
   Teacher: your studio. Its spaces (Class, Studio, Training Center, Workshop Room, Practice Plan Builder, and any you add),
            invite students, students, assignments and what is waiting for review.
   Student: the suite's Class, Studio, Studio+ and Practice Plan Builder, plus teachers to subscribe to. Once you join a teacher,
            their studio and their assignments show here, and an assignment opens straight into the right room.
   "We help both students and teachers succeed." */
(function(){
'use strict';
const RK='ps-role', K={sp:'ps-t-spaces3',name:'ps-t-name',code:'ps-t-code',asg:'ps-t-asg',items:'ps-t-items',subs:'ps-s-subs',done:'ps-s-done'};
const role=()=>{ try{ return localStorage.getItem(RK)==='teacher'?'teacher':'student'; }catch(_){ return 'student'; } };
const jget=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(_){ return d; } };
const jset=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=(t,c,h)=>{ const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; };

/* ---------- the teacher's studio (on this device) ---------- */
const DEF_SPACES=[
  {id:'class',k:'class',name:'Class',blurb:'Consultation with HearandPlay beside you, and meet your students. Send them practice tracks.',go:'class'},
  {id:'hall',k:'hall',name:'Practice Hall',blurb:'Ear training, scales and chords for your students, with the fingering and the hands.',go:'hall'},
  {id:'studio',k:'studio',name:'Studio',blurb:'The Backing Track Studio and the Transcription Studio: tracks to play along with, and recordings turned into notes.',go:'studios'},
  {id:'arena',k:'challenge',name:'Practice Plan Builder',blurb:'Practice plans for your students, including the 90 Day Challenge. Daily check-ins and certificates.',go:'challenge'}];
const spaces=()=>{ const s=jget(K.sp,null); if(Array.isArray(s)&&s.length){ s.forEach(x=>{ if(x.id==='arena'&&x.name==='Practice Arena') x.name='Practice Plan Builder'; }); return s; } return DEF_SPACES.map(x=>Object.assign({},x)); };
const studioName=()=>{ try{ return localStorage.getItem(K.name)||'My HearandPlay Studio'; }catch(_){ return 'My HearandPlay Studio'; } };
const code=()=>{ let c=null; try{ c=localStorage.getItem(K.code); }catch(_){} if(!c){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c='HP-T-'; for(let i=0;i<4;i++) c+=A[Math.floor(Math.random()*A.length)]; try{ localStorage.setItem(K.code,c); }catch(_){} } return c; };
const ME='me';   /* the studio made on this device, as a teacher students can join */

/* sample teachers for the demo */
const SAMPLE=[
  {id:'s1',name:'Grace A.',ini:'GA',spec:'Gospel and worship piano',students:'48 students',color:'#d6336c'},
  {id:'s2',name:'Marcus B.',ini:'MB',spec:'Jazz harmony and reharmonization',students:'31 students',color:'#3a62e0'},
  {id:'s3',name:'Lina P.',ini:'LP',spec:'Beginner piano for adults',students:'64 students',color:'#e0911a'}];
const SAMPLE_STUDENTS=[
  {n:'Ada O.',lv:'Intermediate',st:'12-day streak',last:'Today',ok:true},
  {n:'Tolu K.',lv:'Beginner',st:'5-day streak',last:'Today',ok:true},
  {n:'James M.',lv:'Intermediate',st:'3-day streak',last:'Yesterday',ok:true},
  {n:'Grace E.',lv:'Beginner',st:'No streak',last:'6 days ago',ok:false}];
const REVIEW=[{n:'Ada O.',w:'sent a recording',t:'2-5-1 in all keys · Chords'},{n:'Tolu K.',w:'passed a playing check',t:'G major, 3+4 method · Scales'},{n:'James M.',w:'asked a question',t:'Hymn endings · Class'}];
const ROOMS={chords:'Chords · Practice Hall',scales:'Scales · Practice Hall',ear:'Ear training · Practice Hall',hall:'Practice Hall',studio:'Backing Track Studio',plus:'Transcription Studio',challenge:'Practice Plan Builder',class:'Class'};
const DESTS={hall:['Practice Hall','Ear training, scales or chords'],studios:['Studio','Backing Track Studio or Transcription Studio'],challenge:['Practice Plan Builder','A practice plan']};

/* ---------- styles ---------- */
const css=el('style'); css.textContent=`
#suiteHub .rl-tog{display:inline-flex;gap:0;padding:4px;border-radius:999px;background:rgba(8,12,24,.72);border:1px solid rgba(255,255,255,.22);margin:0 auto 14px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 10px 30px -10px rgba(0,0,0,.7)}
#suiteHub .rl-tog button{min-height:40px;min-width:120px;padding:0 22px;border:0;border-radius:999px;background:transparent;color:#cfd6e6;font:800 15px var(--body);letter-spacing:.02em;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
#suiteHub .rl-tog button i{width:8px;height:8px;border-radius:50%;background:#3a4560}
#suiteHub .rl-tog button[aria-checked=true]{background:var(--hi,#ffd43b);color:#151b28} #suiteHub .rl-tog button[aria-checked=true] i{background:#2f9e44;box-shadow:0 0 6px #3dff6e}
#suiteHub .rl-tog button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#suiteHub .rl-tagline{margin:-18px auto 26px;font:700 14px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--hi,#ffd43b);text-shadow:0 2px 10px rgba(0,0,0,.6)}
#suiteHub .rl-sec{margin-top:26px;text-align:left;border-radius:20px;background:rgba(10,14,28,.78);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:20px 22px}
#suiteHub .rl-sec h2{margin:0 0 4px;font:800 21px var(--display,var(--body));color:#fff!important;text-transform:none!important;letter-spacing:-.01em!important;opacity:1!important} #suiteHub .rl-sec .rl-mut{color:#b4bdd0;font-size:14px;line-height:1.5;margin:0 0 14px}
#suiteHub .rl-demo{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:rgba(255,212,59,.14);color:#ffd43b;font:800 10px var(--body);letter-spacing:.1em;text-transform:uppercase;vertical-align:middle}
#suiteHub .rl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
#suiteHub .rl-row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px}
#suiteHub .rl-card{border-radius:16px;background:rgba(20,27,46,.85);border:1px solid rgba(255,255,255,.12);padding:16px;display:flex;flex-direction:column;gap:10px}
#suiteHub .rl-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:900 15px var(--body);color:#fff;flex:none}
#suiteHub .rl-chips{display:flex;flex-wrap:wrap;gap:6px} #suiteHub .rl-chip{padding:4px 10px;border-radius:999px;background:rgba(91,140,255,.16);color:#c9d6ff;font:700 12px var(--body);border:0}
#suiteHub button.rl-chip{cursor:pointer} #suiteHub button.rl-chip:hover{background:var(--hi,#ffd43b);color:#151b28}
#suiteHub .rl-btn{min-height:44px;padding:0 18px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:800 14px var(--body);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
#suiteHub .rl-btn:hover{border-color:rgba(255,255,255,.45)} #suiteHub .rl-btn.pri{background:var(--hi,#ffd43b);color:#151b28;border-color:transparent} #suiteHub .rl-btn.ok{background:#2f9e44;border-color:transparent}
#suiteHub .rl-li{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)} #suiteHub .rl-li:first-of-type{border-top:0}
#suiteHub .rl-li .rl-t{flex:1 1 200px;min-width:0} #suiteHub .rl-li b{display:block;font-size:15px} #suiteHub .rl-li small{color:#b4bdd0;font-size:13px}
#suiteHub .rl-code{font:900 26px ui-monospace,Menlo,monospace;letter-spacing:.06em;color:var(--hi,#ffd43b)}
#suiteHub .rl-in{min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);background:rgba(4,6,12,.6);color:#fff;font:600 15px var(--body);min-width:0}
#suiteHub .rl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:22px;text-align:left}
#suiteHub .rl-stat{border-radius:16px;background:rgba(10,14,28,.78);border:1px solid rgba(255,255,255,.16);padding:14px 18px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#suiteHub .rl-stat span{display:block;font:800 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:#b4bdd0} #suiteHub .rl-stat b{display:block;font:900 32px var(--body);margin-top:4px}
#suiteHub .rl-dot{width:9px;height:9px;border-radius:50%;flex:none} #suiteHub .rl-led{background:#2f9e44;box-shadow:0 0 6px #3dff6e} #suiteHub .rl-warn{background:#ff6b6b;box-shadow:0 0 6px #ff6b6b}
#suiteHub .rl-tbar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:-10px 0 22px}
#suiteHub[data-role=teacher]:not([data-view=studios]) #psCards{display:none}
#suiteHub .rl-cards .dcard{min-height:330px}
#suiteHub .rl-cards .dcard[data-k=hall]{--c1:#3dd9c4;--c2:#0f8a7a;--g1:#13a48f;--g2:#06302b;--gl:80,230,200;--pp:center 40%}
#suiteHub .dcard[data-k=training]{--c1:#3dd9c4;--c2:#0f8a7a;--g1:#13a48f;--g2:#06302b;--gl:80,230,200}
#suiteHub .dcard[data-k=workshop]{--c1:#ff9f5a;--c2:#d9480f;--g1:#e8590c;--g2:#3b1404;--gl:255,160,90}
#suiteHub .dcard[data-k=custom]{--c1:#9aa4bf;--c2:#4a5577;--g1:#5c6b94;--g2:#141a2c;--gl:180,190,220}
#suiteHub .dcard[data-k=add]{--g1:#2a3350;--g2:#0b0f1c;--gl:255,255,255;border-style:dashed!important;align-items:center;justify-content:center;text-align:center;padding-top:26px!important}
#suiteHub .dcard[data-k=add] .nm{font-size:22px} #suiteHub .dcard[data-k=add] .plus{font:300 64px/1 var(--body);color:var(--hi,#ffd43b)}
#suiteHub .rl-cards .dcard .ph svg.big{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:120px;height:120px;opacity:.9;filter:drop-shadow(0 8px 24px rgba(0,0,0,.4))}
#suiteHub .dcard[data-k=training] .phi{background:radial-gradient(circle at 70% 25%,rgba(255,255,255,.18),transparent 55%),linear-gradient(160deg,#0f7d6f,#04221e)!important}
#suiteHub .dcard[data-k=workshop] .phi{background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.18),transparent 55%),linear-gradient(160deg,#a8400c,#2a0d02)!important}
#suiteHub .dcard[data-k=custom] .phi{background:radial-gradient(circle at 50% 25%,rgba(255,255,255,.14),transparent 55%),linear-gradient(160deg,#3b4668,#0e1220)!important}
#suiteHub .rl-cards .dcard .rl-ed{position:absolute;top:12px;right:12px;display:flex;gap:6px;transform:translateZ(40px)}
#suiteHub .rl-cards .dcard .rl-ed span{min-width:34px;height:34px;padding:0 10px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.3);color:#fff;font:800 12px var(--body);display:grid;place-items:center;cursor:pointer}
#suiteHub .rl-cards .dcard .rl-ed span:hover{background:var(--hi,#ffd43b);color:#151b28}
#rlPanel{position:fixed;inset:0;z-index:200050;display:flex;align-items:flex-start;justify-content:center;overflow:auto;background:rgba(3,5,10,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:6vh 16px;color:#e6eaf2;font-family:var(--body)}
#rlPanel .rl-box{width:min(760px,100%);border-radius:22px;background:linear-gradient(165deg,#1a2238,#0b0f1c 70%);border:1px solid rgba(255,255,255,.18);box-shadow:0 40px 80px -20px rgba(0,0,0,.8);padding:24px 26px;text-align:left}
#rlPanel h2{margin:0 0 4px;font:800 28px var(--display,var(--body));color:#fff!important;text-transform:none!important;letter-spacing:-.01em!important;opacity:1!important} #rlPanel .rl-mut{color:#b4bdd0;font-size:14.5px;line-height:1.5;margin:0 0 16px}
#rlPanel .rl-x{float:right;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:800 18px var(--body);cursor:pointer}
#rlPanel label{display:flex;flex-direction:column;gap:6px;font:700 13px var(--body);color:#cfd6e6;flex:1 1 200px;min-width:0}
#rlPanel .rl-in,#rlPanel select,#rlPanel textarea{min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);background:rgba(4,6,12,.6);color:#fff;font:600 15px var(--body);box-sizing:border-box;width:100%}
#rlPanel textarea{padding:10px 14px;min-height:70px;resize:vertical} #rlPanel textarea.mono{font:700 16px/1.45 ui-monospace,Menlo,monospace}
#rlPanel .rl-f{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}
#rlPanel .rl-btn{min-height:44px;padding:0 18px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:800 14px var(--body);cursor:pointer}
#rlPanel .rl-btn.pri{background:var(--hi,#ffd43b);color:#151b28;border-color:transparent}
#rlPanel .rl-li{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)} #rlPanel .rl-li .rl-t{flex:1 1 200px} #rlPanel .rl-li b{display:block} #rlPanel .rl-li small{color:#b4bdd0}
#rlToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:200100;background:#ffd43b;color:#151b28;font:800 14px var(--body);padding:12px 18px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.5)}
@media (max-width:700px){ #suiteHub .rl-tog button{min-width:100px;padding:0 14px} }
`; document.head.appendChild(css);
const toast=m=>{ let t=document.getElementById('rlToast'); if(t) t.remove(); t=el('div',null); t.id='rlToast'; t.setAttribute('role','status'); t.textContent=m; document.body.appendChild(t); setTimeout(()=>{ t.remove(); },2600); };

/* ---------- icons for the new spaces ---------- */
const BIG={
 training:'<svg class="big" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 12c6-3 11-3 16 1 5-4 10-4 16-1v24c-6-3-11-3-16 1-5-4-10-4-16-1V12Z" fill="#fff" opacity=".92"/><path d="M24 13v24" stroke="#0f7d6f" stroke-width="2"/></svg>',
 workshop:'<svg class="big" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="15" r="6" fill="#fff"/><circle cx="11" cy="20" r="4.5" fill="#fff" opacity=".85"/><circle cx="37" cy="20" r="4.5" fill="#fff" opacity=".85"/><path d="M13 38c0-6.5 5-11 11-11s11 4.5 11 11" fill="#fff"/><path d="M3 36c0-5 3.5-8 8-8M45 36c0-5-3.5-8-8-8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>',
 custom:'<svg class="big" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="3" fill="#fff"/><rect x="26" y="8" width="14" height="14" rx="3" fill="#fff" opacity=".7"/><rect x="8" y="26" width="14" height="14" rx="3" fill="#fff" opacity=".7"/><path d="M33 27v12M27 33h12" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>'};
const ICON={
 training:'<svg viewBox="0 0 48 48" fill="none"><path d="M8 12c6-3 11-3 16 1 5-4 10-4 16-1v24c-6-3-11-3-16 1-5-4-10-4-16-1V12Z" fill="#fff"/></svg>',
 workshop:'<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="16" r="6" fill="#fff"/><path d="M12 38c0-6.5 5-11 12-11s12 4.5 12 11" fill="#fff"/></svg>',
 custom:'<svg viewBox="0 0 48 48" fill="none"><path d="M24 10v28M10 24h28" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>'};
const ICONS_SUITE=k=>{ const c=document.querySelector('#psCards .dcard[data-k="'+k+'"] .ic'); return c?c.innerHTML:''; };

/* ---------- the switch ---------- */
function toggle(){ const w=el('div','rl-tog'); w.setAttribute('role','radiogroup'); w.setAttribute('aria-label','View the suite as');
  [['student','Student'],['teacher','Teacher']].forEach(([v,t])=>{ const b=el('button',null,'<i></i>'+t); b.type='button'; b.setAttribute('role','radio'); b.setAttribute('aria-checked',String(role()===v));
    b.onclick=()=>{ if(role()===v) return; try{ localStorage.setItem(RK,v); sessionStorage.setItem('ps-role-sw','1'); }catch(_){} location.reload(); }; w.appendChild(b); });
  return w; }

/* ---------- opening a room (from a space or an assignment) ---------- */
function openRoom(r,a){ const S=window.SUITE; if(!S) return; closePanel();
  if(r==='studios'){ S.studios(); return; }
  if(['studio','class','challenge','plus','hall'].includes(r)){ S.go(r); return; }
  S.go('hall');
  setTimeout(()=>{ try{
    if(r==='chords'){ if(window.PRACTICE&&PRACTICE.openChords) PRACTICE.openChords(a&&a.prog||'',a&&+a.bpm||0); else if(window.PRACTICE) PRACTICE.open('chords'); }
    else if(r==='scales'){ if(window.PRACTICE&&PRACTICE.openScale&&a&&a.key) PRACTICE.openScale(a.key,a.type); else if(window.PRACTICE) PRACTICE.open('scales',{resume:true}); }
    else if(r==='ear'){ if(window.EAR) EAR.open(); }
  }catch(_){} },500); }

/* ---------- the panel for a space, an assignment or the invite ---------- */
function closePanel(){ const p=document.getElementById('rlPanel'); if(p) p.remove(); }
function panel(title,sub){ closePanel(); const p=el('div'); p.id='rlPanel'; p.setAttribute('role','dialog'); p.setAttribute('aria-label',title);
  const b=el('div','rl-box'); const x=el('button','rl-x','✕'); x.type='button'; x.setAttribute('aria-label','Close'); x.onclick=closePanel; b.appendChild(x);
  b.appendChild(el('h2',null,esc(title))); if(sub) b.appendChild(el('p','rl-mut',esc(sub))); p.appendChild(b);
  p.addEventListener('click',e=>{ if(e.target===p) closePanel(); }); p.addEventListener('keydown',e=>{ if(e.key==='Escape') closePanel(); });
  document.body.appendChild(p); setTimeout(()=>x.focus(),30); return b; }
const START_ITEMS={
  training:[{t:'Foundations 90',s:'Scales and chords first, then your first progressions'},{t:'Church Pianist 90',s:'Warm-ups, progressions, endings and licks'},{t:'Play by Ear 90',s:'Modes, progressions and stylization'}],
  workshop:[{t:'Group class: passing chords',s:'Tuesday 18:00 · Intermediate group'},{t:'Masterclass: hymn endings',s:'Saturday 10:00 · Open to all students'}]};
function spacePanel(sp,teacher){ const items=jget(K.items,{}), list=items[sp.id]||(START_ITEMS[sp.k]||[]).map(x=>Object.assign({},x));
  const what=sp.k==='training'?['course','Courses and lessons in order. Students work through them step by step.','Course title','What it covers']:sp.k==='workshop'?['session','Live group sessions and masterclasses.','Session title','Day, time and who it is for']:['item',sp.blurb||'Your own space. Add anything your students need.','Title','Details or a link'];
  const b=panel(sp.name,what[1]); const L=el('div'); b.appendChild(L);
  const draw=()=>{ L.textContent=''; if(!list.length) L.appendChild(el('p','rl-mut','Nothing here yet.'));
    list.forEach((it,i)=>{ const r=el('div','rl-li'); r.appendChild(el('div','rl-t','<b>'+esc(it.t)+'</b><small>'+esc(it.s||'')+'</small>'));
      if(sp.k==='workshop'){ const g=el('button','rl-btn pri',teacher?'Go live':'Join'); g.type='button'; g.onclick=()=>toast(teacher?'Live sessions start here: your students get a notice and join in one tap.':'You will join here when your teacher goes live.'); r.appendChild(g); }
      else { const g=el('button','rl-btn',teacher?'Edit':'Open'); g.type='button'; g.onclick=()=>toast(teacher?'Build the lessons: videos, chord charts, Studio tracks and practice tasks.':'Your teacher\'s lessons open here, one step at a time.'); r.appendChild(g); }
      if(teacher){ const d=el('button','rl-btn','Remove'); d.type='button'; d.onclick=()=>{ list.splice(i,1); items[sp.id]=list; jset(K.items,items); draw(); }; r.appendChild(d); }
      L.appendChild(r); }); };
  draw();
  if(teacher){ const f=el('div','rl-f'); f.style.marginTop='16px'; const a=el('label',null,'<span>'+what[2]+'</span>'), ai=el('input','rl-in'); a.appendChild(ai); const s=el('label',null,'<span>'+what[3]+'</span>'), si=el('input','rl-in'); s.appendChild(si);
    const add=el('button','rl-btn pri','Add '+what[0]); add.type='button'; add.style.alignSelf='flex-end';
    add.onclick=()=>{ const t=ai.value.trim(); if(!t){ ai.focus(); return; } list.push({t,s:si.value.trim()}); items[sp.id]=list; jset(K.items,items); ai.value=''; si.value=''; draw(); };
    f.append(a,s,add); b.appendChild(f); } }
function assignPanel(){ const b=panel('New assignment','Where will your students practise? You go there, set it up the way you want it, then press Assign.');
  const g=el('div'); g.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px';
  Object.keys(DESTS).forEach(k=>{ const c=el('button','rl-btn'); c.type='button'; c.style.cssText='min-height:84px;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;text-align:left;padding:12px 16px';
    c.innerHTML='<span style="font-size:17px">'+DESTS[k][0]+'</span><span style="font:600 13px var(--body);color:#b4bdd0">'+DESTS[k][1]+'</span>';
    c.onclick=()=>{ try{ sessionStorage.setItem('ps-assign','1'); }catch(_){} closePanel(); if(window.SUITE){ if(k==='studios') SUITE.studios(); else SUITE.go(k); } assignBar(); }; g.appendChild(c); });
  b.appendChild(g); }
/* while a teacher sets up an assignment: a bar to name it and assign it from wherever they are */
function where(){ const vis=id=>{ const e=document.getElementById(id); return !!(e&&!e.hidden&&e.offsetWidth); };
  if(vis('prRoom')&&window.PRACTICE&&PRACTICE._t){ const st=PRACTICE._t.st(), kd=document.getElementById('prRoom').dataset.kind; if(kd==='chords') return {room:'chords',prog:st.cmode==='canvas'?st.chords:'',bpm:st.bpm}; return {room:'scales',key:st.key,type:st.type,bpm:st.bpm}; }
  if(vis('earRoom')) return {room:'ear'};
  const c=window.SUITE&&SUITE.current(); return {room:c&&ROOMS[c]?c:'hall'}; }
function assignBar(){ let b=document.getElementById('rlAssign'); if(b) b.remove(); b=el('div'); b.id='rlAssign'; b.setAttribute('role','region'); b.setAttribute('aria-label','New assignment');
  b.innerHTML='<b>New assignment</b><span>Set it up here, then assign it.</span>';
  const t=el('input'); t.type='text'; t.placeholder='Title, e.g. 2-5-1 in all 12 keys'; t.setAttribute('aria-label','Assignment title');
  const go=el('button','pri','Assign to my students'); go.type='button'; const cx=el('button',null,'Cancel'); cx.type='button';
  go.onclick=()=>{ const w=where(); const A=jget(K.asg,[]); const d=new Date(Date.now()+4*864e5);
    A.unshift(Object.assign({id:'a'+Date.now(),title:t.value.trim()||(ROOMS[w.room]||'Practice'),due:d.toISOString().slice(0,10),note:''},w)); jset(K.asg,A);
    endAssign(); toast('Assigned: '+(t.value.trim()||ROOMS[w.room])+'. Your students see it on their home page.'); };
  cx.onclick=endAssign; t.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') go.click(); };
  b.append(t,go,cx); document.body.appendChild(b); }
function endAssign(){ try{ sessionStorage.removeItem('ps-assign'); }catch(_){} const b=document.getElementById('rlAssign'); if(b) b.remove(); render(); }
/* Meet a teacher (from the Class) */
function meetPanel(){ const b=panel('Meet a teacher','Subscribe to a teacher to get their class, practice hall, studio and practice plan builder, and the work they assign you.'); const box=el('div'); b.appendChild(box);
  const draw=()=>{ box.textContent=''; box.appendChild(teacherGrid(draw)); }; draw(); }
/* ---------- teacher view ---------- */
function spaceCard(sp,editing,on){ const b=el('button','dcard'); b.type='button'; b.dataset.k=sp.k;
  b.innerHTML='<div class="ph"><i class="phi"'+({class:'card-class.webp',studio:'card-studio.webp',plus:'card-plus.webp',hall:'class-chords.webp'}[sp.k]?' style="background-image:url('+({class:'card-class.webp',studio:'card-studio.webp',plus:'card-plus.webp',hall:'class-chords.webp'}[sp.k])+')"':'')+'></i>'+(BIG[sp.k]||'')+'</div><div class="ic"></div><div class="nm"></div><div class="bl"></div><div class="go">Open →</div>';
  b.querySelector('.ic').innerHTML=ICON[sp.k]||ICONS_SUITE(sp.k); b.querySelector('.nm').textContent=sp.name; b.querySelector('.bl').textContent=sp.blurb;
  if(editing){ const ed=el('div','rl-ed'); const rn=el('span',null,'Rename'); rn.setAttribute('role','button'); rn.tabIndex=0; rn.onclick=e=>{ e.stopPropagation(); on.rename(sp); }; ed.appendChild(rn);
    if(!['class','hall','studio','arena'].includes(sp.id)){ const rm=el('span',null,'✕'); rm.setAttribute('role','button'); rm.setAttribute('aria-label','Remove '+sp.name); rm.tabIndex=0; rm.onclick=e=>{ e.stopPropagation(); on.remove(sp); }; ed.appendChild(rm); } b.appendChild(ed); }
  b.onclick=()=>{ if(sp.go) openRoom(sp.go); else spacePanel(sp,true); };
  return b; }
let editing=false;
function teacherView(root){ const in_=root;
  const h1=document.querySelector('#suiteHub .in h1'); if(h1) h1.textContent=studioName();
  const sub=document.querySelector('#suiteHub .in .sub'); if(sub){ sub.innerHTML='<span>All your teaching spaces in one place</span><i>|</i><span>Invite your students</span><i>|</i><span>Assign work and follow their progress</span>'; }
  const bar=el('div','rl-tbar'); const rn=el('button','rl-btn','Rename my studio'); rn.type='button';
  rn.onclick=()=>{ const b=panel('Rename your studio'); const f=el('div','rl-f'); const l=el('label',null,'<span>Studio name</span>'), i=el('input','rl-in'); i.value=studioName(); l.appendChild(i); f.appendChild(l); b.appendChild(f); const ok=el('button','rl-btn pri','Save'); ok.type='button'; ok.onclick=()=>{ try{ localStorage.setItem(K.name,i.value.trim()||'My HearandPlay Studio'); }catch(_){} closePanel(); render(); }; b.appendChild(ok); i.focus(); i.select(); };
  const ed=el('button','rl-btn'+(editing?' pri':''),editing?'Done customizing':'Customize spaces'); ed.type='button'; ed.onclick=()=>{ editing=!editing; render(); };
  const as=el('button','rl-btn pri','+ New assignment'); as.type='button'; as.onclick=assignPanel;
  bar.append(as,ed,rn); in_.appendChild(bar);
  /* the spaces */
  const S=spaces(), cards=el('div','cards rl-cards');
  const on={ rename(sp){ const b=panel('Rename '+sp.name); const f=el('div','rl-f'); const l=el('label',null,'<span>Name</span>'), i=el('input','rl-in'); i.value=sp.name; l.appendChild(i); const l2=el('label',null,'<span>Description</span>'), i2=el('input','rl-in'); i2.value=sp.blurb; l2.appendChild(i2); f.append(l,l2); b.appendChild(f);
      const ok=el('button','rl-btn pri','Save'); ok.type='button'; ok.onclick=()=>{ const A=spaces(); const x=A.find(q=>q.id===sp.id); if(x){ x.name=i.value.trim()||x.name; x.blurb=i2.value.trim()||x.blurb; } jset(K.sp,A); closePanel(); render(); }; b.appendChild(ok); i.focus(); },
    remove(sp){ jset(K.sp,spaces().filter(q=>q.id!==sp.id)); render(); } };
  S.forEach(sp=>cards.appendChild(spaceCard(sp,editing,on)));
  { const a=el('button','dcard'); a.type='button'; a.dataset.k='add'; a.innerHTML='<div class="plus">+</div><div class="nm">Add a space</div><div class="bl">A listening room, a repertoire library, a theory corner: whatever your students need.</div>';
    a.onclick=()=>{ const b=panel('Add a space','Name it and describe it. It appears in your studio for your students.'); const f=el('div','rl-f'); const l=el('label',null,'<span>Name</span>'), i=el('input','rl-in'); i.placeholder='Repertoire Library'; l.appendChild(i); const l2=el('label',null,'<span>Description</span>'), i2=el('input','rl-in'); i2.placeholder='Songs and hymns we are learning this term'; l2.appendChild(i2); f.append(l,l2); b.appendChild(f);
      const ok=el('button','rl-btn pri','Add space'); ok.type='button'; ok.onclick=()=>{ const n=i.value.trim(); if(!n){ i.focus(); return; } const A=spaces(); A.push({id:'c'+Date.now(),k:'custom',name:n,blurb:i2.value.trim()||'Your own space.'}); jset(K.sp,A); closePanel(); render(); }; b.appendChild(ok); i.focus(); };
    cards.appendChild(a); }
  in_.appendChild(cards);
  /* numbers */
  const A=jget(K.asg,[]), done=jget(K.done,{}), joined=(jget(K.subs,[])||[]).includes(ME);
  const stats=el('div','rl-stats'); [['Students',String(SAMPLE_STUDENTS.length+(joined?1:0))],['Waiting for review',String(REVIEW.length)],['Assignments',String(A.length)],['Practised today','3']].forEach(([l,v])=>stats.appendChild(el('div','rl-stat','<span>'+l+'</span><b>'+v+'</b>'))); in_.appendChild(stats);
  const row=el('div','rl-row2');
  /* invite */
  { const s=el('section','rl-sec'); s.innerHTML='<h2>Invite students</h2><p class="rl-mut">Students join your studio with your code or link, and subscribe to use your spaces.</p>';
    const c=el('div','rl-code',esc(code())); s.appendChild(c);
    const f=el('div'); f.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:12px';
    const cp=el('button','rl-btn pri','Copy invite link'); cp.type='button'; cp.onclick=()=>{ const u=location.origin+'/?join='+code(); try{ navigator.clipboard.writeText(u); }catch(_){} toast('Invite link copied: '+u); };
    const em=el('input','rl-in'); em.type='email'; em.placeholder='student@email.com'; em.setAttribute('aria-label','Student email'); em.style.flex='1 1 180px';
    const se=el('button','rl-btn','Send invite'); se.type='button'; se.onclick=()=>{ if(!/@/.test(em.value)){ em.focus(); return; } toast('Invite sent to '+em.value.trim()); em.value=''; };
    f.append(cp,em,se); s.appendChild(f); row.appendChild(s); }
  /* waiting for review */
  { const s=el('section','rl-sec'); s.innerHTML='<h2>Waiting for your review<span class="rl-demo">Sample</span></h2>';
    REVIEW.forEach(r=>{ const li=el('div','rl-li'); li.appendChild(el('div','rl-t','<b>'+esc(r.n)+' '+esc(r.w)+'</b><small>'+esc(r.t)+'</small>')); const g=el('button','rl-btn','Give feedback'); g.type='button'; g.onclick=()=>toast('Listen, write or record feedback, and it goes straight to '+r.n+'.'); li.appendChild(g); s.appendChild(li); });
    row.appendChild(s); }
  /* assignments */
  { const s=el('section','rl-sec'); s.innerHTML='<h2>Assignments</h2>';
    if(!A.length) s.appendChild(el('p','rl-mut','No assignments yet. Press New assignment to send your students something to practise.'));
    A.forEach((a,i)=>{ const li=el('div','rl-li'); li.appendChild(el('div','rl-t','<b>'+esc(a.title)+'</b><small>'+esc(ROOMS[a.room]||'')+(a.due?' · due '+esc(a.due):'')+(done[a.id]?' · <span style="color:#8ce99a">done by a student ✓</span>':'')+'</small>'));
      const rm=el('button','rl-btn','Remove'); rm.type='button'; rm.onclick=()=>{ A.splice(i,1); jset(K.asg,A); render(); }; li.appendChild(rm); s.appendChild(li); });
    const nb=el('button','rl-btn pri','+ New assignment'); nb.type='button'; nb.style.marginTop='10px'; nb.onclick=assignPanel; s.appendChild(nb); row.appendChild(s); }
  /* students */
  { const s=el('section','rl-sec'); s.innerHTML='<h2>My students<span class="rl-demo">Sample</span></h2>';
    const L=SAMPLE_STUDENTS.slice(); if(joined) L.unshift({n:'You (this device)',lv:'Student',st:'Just joined',last:'Today',ok:true});
    L.forEach(p=>{ const li=el('div','rl-li'); li.appendChild(el('span','rl-dot '+(p.ok?'rl-led':'rl-warn'))); li.appendChild(el('div','rl-t','<b>'+esc(p.n)+'</b><small>'+esc(p.lv)+' · '+esc(p.st)+' · last practice '+esc(p.last)+'</small>')); s.appendChild(li); });
    row.appendChild(s); }
  in_.appendChild(row); }

/* ---------- student view ---------- */
function studentView(root){
  const subs=jget(K.subs,[])||[], A=jget(K.asg,[]), done=jget(K.done,{});
  const T=[{id:ME,name:studioName(),ini:'HP',spec:'Your teacher\'s studio on this device',students:'',color:'#2f9e44'}].concat(SAMPLE);
  const mine=T.filter(t=>subs.includes(t.id));
  if(mine.length){ const s=el('section','rl-sec'); s.innerHTML='<h2>My teachers</h2><p class="rl-mut">Their spaces and the work they send you.</p>';
    mine.forEach(t=>{ const c=el('div','rl-card'); c.innerHTML='<div style="display:flex;align-items:center;gap:12px"><span class="rl-av" style="background:'+t.color+'">'+esc(t.ini)+'</span><div style="flex:1"><b style="font-size:17px">'+esc(t.name)+'</b><div style="color:#b4bdd0;font-size:13px">'+esc(t.spec)+'</div></div></div>';
      const ch=el('div','rl-chips'); (t.id===ME?spaces():DEF_SPACES).forEach(sp=>{ const b=el('button','rl-chip',esc(sp.name)); b.type='button'; b.onclick=()=>{ if(sp.go) openRoom(sp.go); else spacePanel(sp,false); }; ch.appendChild(b); }); c.appendChild(ch);
      if(t.id===ME){ if(!A.length) c.appendChild(el('div','rl-mut','No assignments yet.'));
        A.forEach(a=>{ const li=el('div','rl-li'); li.appendChild(el('div','rl-t','<b>'+esc(a.title)+'</b><small>'+esc(ROOMS[a.room]||'')+(a.bpm?' · '+a.bpm+' BPM':'')+(a.due?' · due '+esc(a.due):'')+(a.note?' · '+esc(a.note):'')+'</small>'));
          const op=el('button','rl-btn pri','Open'); op.type='button'; op.onclick=()=>openRoom(a.room==='class'?'class':a.room,a); li.appendChild(op);
          const dn=el('button','rl-btn'+(done[a.id]?' ok':''),done[a.id]?'Done ✓':'Mark done'); dn.type='button'; dn.onclick=()=>{ done[a.id]=!done[a.id]; jset(K.done,done); render(); }; li.appendChild(dn); c.appendChild(li); }); }
      const un=el('button','rl-btn','Unsubscribe'); un.type='button'; un.style.alignSelf='flex-start'; un.onclick=()=>{ jset(K.subs,subs.filter(x=>x!==t.id)); render(); }; c.appendChild(un);
      s.appendChild(c); });
    root.appendChild(s); }
  const s=el('section','rl-sec'); s.innerHTML='<h2>Learn with a teacher</h2><p class="rl-mut">Subscribe to a teacher to get their class, practice hall, studio and practice plan builder, and the work they assign you. Until then, the whole suite is yours.</p>';
  s.appendChild(teacherGrid(render));
  const jf=el('div'); jf.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;align-items:center'; jf.appendChild(el('b',null,'Have an invite code?'));
  const ji=el('input','rl-in'); ji.placeholder='HP-T-XXXX'; ji.setAttribute('aria-label','Invite code'); ji.style.cssText='text-transform:uppercase;font-family:ui-monospace,Menlo,monospace;width:170px';
  const jb=el('button','rl-btn','Join'); jb.type='button'; jb.onclick=()=>joinCode(ji.value);
  jf.append(ji,jb); s.appendChild(jf); root.appendChild(s); }
function teacherGrid(after){ const subs=jget(K.subs,[])||[]; const T=[{id:ME,name:studioName(),ini:'HP',spec:'Your teacher\'s studio on this device',students:'',color:'#2f9e44'}].concat(SAMPLE);
  const g=el('div','rl-grid'); T.forEach(t=>{ const c=el('div','rl-card'); const joined=subs.includes(t.id);
    c.innerHTML='<div style="display:flex;align-items:center;gap:12px"><span class="rl-av" style="background:'+t.color+'">'+esc(t.ini)+'</span><div style="flex:1;min-width:0"><b style="font-size:17px">'+esc(t.name)+'</b>'+(t.id===ME?'':'<span class="rl-demo">Sample</span>')+'<div style="color:#b4bdd0;font-size:13px">'+esc(t.spec)+(t.students?' · '+esc(t.students):'')+'</div></div></div>';
    const ch=el('div','rl-chips'); ['Class','Practice Hall','Studio','Practice Plan Builder'].forEach(n=>ch.appendChild(el('span','rl-chip',n))); c.appendChild(ch);
    const b=el('button','rl-btn'+(joined?' ok':' pri'),joined?'Subscribed ✓':'Subscribe'); b.type='button'; b.onclick=()=>{ let S=jget(K.subs,[])||[]; if(S.includes(t.id)) S=S.filter(x=>x!==t.id); else { S.push(t.id); toast('You joined '+t.name+'.'); } jset(K.subs,S); render(); if(after&&after!==render) after(); }; c.appendChild(b); g.appendChild(c); });
  return g; }
function joinCode(v){ v=String(v||'').trim().toUpperCase(); let c=null; try{ c=localStorage.getItem(K.code); }catch(_){}
  if(c&&v===c){ const S=jget(K.subs,[])||[]; if(!S.includes(ME)) S.push(ME); jset(K.subs,S); toast('You joined '+studioName()+'.'); render(); }
  else toast(v?'That code was not found. Check it with your teacher.':'Type the code your teacher gave you.'); }

/* ---------- on the home page ---------- */
function render(){ const hub=document.getElementById('suiteHub'); if(!hub) return; const inn=hub.querySelector('.in'); if(!inn) return; const r=role(); hub.dataset.role=r;
  if(hub.dataset.view==='studios'){ const bx=inn.querySelector('#rlBox'); if(bx) bx.remove(); const tg=inn.querySelector('.rl-tog'); if(tg) tg.remove(); inn.insertBefore(toggle(),inn.firstChild); return; }
  let tg=inn.querySelector('.rl-tog'); if(tg) tg.remove(); inn.insertBefore(toggle(),inn.firstChild);
  let tl=inn.querySelector('.rl-tagline'); if(!tl){ tl=el('div','rl-tagline','We help students and teachers succeed'); const sub=inn.querySelector('.sub'); if(sub&&sub.nextSibling) inn.insertBefore(tl,sub.nextSibling); else inn.appendChild(tl); }
  let box=inn.querySelector('#rlBox'); if(box) box.remove(); box=el('div'); box.id='rlBox';
  const cards=inn.querySelector('#psCards'); if(cards&&cards.nextSibling) inn.insertBefore(box,cards.nextSibling); else inn.appendChild(box);
  if(r==='teacher') teacherView(box); else studentView(box); }
/* a join link: ?join=HP-T-XXXX */
try{ const q=new URLSearchParams(location.search).get('join'); if(q){ localStorage.setItem(RK,'student'); setTimeout(()=>joinCode(q),1200); history.replaceState(null,'',location.pathname); } }catch(_){}
function area(k){ const r=document.getElementById('clRoot'); if(!r) return; const four=r.querySelector('.cl-four');
  if(four&&!four.querySelector('[data-k=meet]')){ const m=el('button','cl-box'); m.type='button'; m.dataset.go='meet'; m.dataset.k='meet'; m.style.cssText='--g1:#13a48f;--g2:#06302b;--gl:80,230,200;--c1:#3dd9c4;--c2:#0f8a7a';
    m.innerHTML='<img class="ph" src="card-class.webp" alt="" style="object-position:center 28%" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><circle cx="17" cy="16" r="6" fill="#fff"/><circle cx="33" cy="18" r="5" fill="#fff" opacity=".85"/><path d="M5 38c0-7 5.5-12 12-12s12 5 12 12" fill="#fff"/><path d="M27 38c0-5 3-9 7-9s9 3 9 9" fill="#fff" opacity=".85"/></svg></i><b>Meet a teacher</b><span>Find a teacher, subscribe, and learn with them in the suite.</span></div>';
    m.onclick=meetPanel; four.appendChild(m); }
  const br=r.querySelector('.cl-bar .cl-brand'); if(br) br.textContent=k==='hall'?'Practice Hall':'Class Area';
  const w=r.querySelector('.cl-welcome'); if(w){ if(!w.dataset.orig) w.dataset.orig=w.innerHTML;
    w.innerHTML=k==='hall'?'Welcome to the Practice Hall. From scale and chord practice sessions to ear-training sessions, this is a very important part of the piano suite that you must <b>NOT</b> go for a day without.'
      :'Welcome to class today. From consultation sessions to meeting a teacher, this is a very important part of the piano suite that you must <b>NOT</b> go for a day without.'; } }
const css2=el('style'); css2.textContent=`
body[data-area=hall] .cl-box[data-k=chat],body[data-area=hall] .cl-box[data-k=meet]{display:none!important}
body[data-area=class] .cl-box[data-k=ear],body[data-area=class] .cl-box[data-k=scales],body[data-area=class] .cl-box[data-k=chords]{display:none!important}
body[data-area=class] .cl-four{grid-template-columns:repeat(2,minmax(0,1fr))!important;max-width:880px;margin-left:auto;margin-right:auto}
body[data-area=hall] .cl-four{grid-template-columns:repeat(3,minmax(0,1fr))!important}
@media(max-width:760px){ body[data-area=hall] .cl-four{grid-template-columns:repeat(2,minmax(0,1fr))!important} }
#rlAssign{position:fixed;right:18px;bottom:18px;z-index:200040;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;max-width:min(560px,calc(100vw - 36px));padding:12px 14px;border-radius:16px;background:linear-gradient(165deg,#2a2412,#14110a);border:1.5px solid #ffd43b;box-shadow:0 18px 40px rgba(0,0,0,.6);color:#fff;font-family:var(--body)}
#rlAssign b{font:900 15px var(--body);color:#ffd43b} #rlAssign span{font:600 13px var(--body);color:#e6dcb8;flex:1 1 160px}
#rlAssign input{flex:1 1 220px;min-height:42px;padding:0 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.25);background:rgba(0,0,0,.45);color:#fff;font:600 14px var(--body)}
#rlAssign button{min-height:42px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:800 13px var(--body);cursor:pointer}
#rlAssign button.pri{background:#ffd43b;color:#151b28;border-color:transparent}
`; document.head.appendChild(css2);
try{ if(sessionStorage.getItem('ps-assign')&&role()==='teacher') setTimeout(assignBar,800); }catch(_){}
window.PSROLE={hub:render,role,area};
{ const h=document.getElementById('suiteHub'); if(h&&h.classList.contains('on')) render(); }
})();
