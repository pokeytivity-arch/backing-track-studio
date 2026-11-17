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
const jset=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} if(k==='ps-t-spaces3'&&window.PSSUITE) PSSUITE.push(); };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=(t,c,h)=>{ const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; };

/* ---------- the teacher's studio (on this device) ---------- */
const DEF_SPACES=[
  {id:'class',k:'class',name:'Dashboard',blurb:'Your teacher dashboard, and meet a student.',go:'class'},
  {id:'hall',k:'hall',name:'Practice Arena',blurb:'Ear training, scales and chords for your students, with the fingering and the hands.',go:'hall'},
  {id:'studio',k:'studio',name:'Studio',blurb:'The Backing Track Studio and the Transcription Studio: tracks to play along with, and recordings turned into notes.',go:'studios'},
  {id:'arena',k:'challenge',name:'Practice Plan Builder',blurb:'Practice plans for your students, including the 90 Day Challenge. Daily check-ins and certificates.',go:'challenge'}];
const spaces=()=>{ const s=jget(K.sp,null); if(Array.isArray(s)&&s.length){ s.forEach(x=>{ if(x.id==='arena'&&x.name==='Practice Arena') x.name='Practice Plan Builder'; if(x.id==='hall'&&x.name==='Practice '+'Hall') x.name='Practice Arena'; if(x.id==='class'&&x.name==='Class'){ x.name='Dashboard'; x.blurb='Your teacher dashboard, and meet a student.'; } }); return s; } return DEF_SPACES.map(x=>Object.assign({},x)); };
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
const ROOMS={chords:'Chord Practice · Practice Arena',scales:'Scale Practice · Practice Arena',ear:'Ear training · Practice Arena',hall:'Practice Arena',studio:'Backing Track Studio',plus:'Transcription Studio',challenge:'Practice Plan Builder',class:'Class'};
const DESTS={hall:['Practice Arena','Ear training, scales or chords'],studios:['Studio','Backing Track Studio or Transcription Studio'],challenge:['Practice Plan Builder','A practice plan']};

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
:is(#suiteHub,#rlDashPage) .rl-demo{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:rgba(255,212,59,.14);color:#ffd43b;font:800 10px var(--body);letter-spacing:.1em;text-transform:uppercase;vertical-align:middle}
#suiteHub .rl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
#suiteHub .rl-row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px}
#suiteHub .rl-card{border-radius:16px;background:rgba(20,27,46,.85);border:1px solid rgba(255,255,255,.12);padding:16px;display:flex;flex-direction:column;gap:10px}
#suiteHub .rl-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font:900 15px var(--body);color:#fff;flex:none}
#suiteHub .rl-chips{display:flex;flex-wrap:wrap;gap:6px} #suiteHub .rl-chip{padding:4px 10px;border-radius:999px;background:rgba(91,140,255,.16);color:#c9d6ff;font:700 12px var(--body);border:0}
#suiteHub button.rl-chip{cursor:pointer} #suiteHub button.rl-chip:hover{background:var(--hi,#ffd43b);color:#151b28}
:is(#suiteHub,#rlDashPage) .rl-btn{min-height:44px;padding:0 18px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font:800 14px var(--body);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
:is(#suiteHub,#rlDashPage) .rl-btn:hover{border-color:rgba(255,255,255,.45)} :is(#suiteHub,#rlDashPage) .rl-btn.pri{background:var(--hi,#ffd43b);color:#151b28;border-color:transparent} :is(#suiteHub,#rlDashPage) .rl-btn.ok{background:#2f9e44;border-color:transparent}
#suiteHub .rl-li{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)} #suiteHub .rl-li:first-of-type{border-top:0}
#suiteHub .rl-li .rl-t{flex:1 1 200px;min-width:0} #suiteHub .rl-li b{display:block;font-size:15px} #suiteHub .rl-li small{color:#b4bdd0;font-size:13px}
:is(#suiteHub,#rlDashPage) .rl-code{font:900 26px ui-monospace,Menlo,monospace;letter-spacing:.06em;color:var(--hi,#ffd43b)}
:is(#suiteHub,#rlDashPage) .rl-in{min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);background:rgba(4,6,12,.6);color:#fff;font:600 15px var(--body);min-width:0}
#suiteHub .rl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:22px;text-align:left}
#suiteHub .rl-stat{border-radius:16px;background:rgba(10,14,28,.78);border:1px solid rgba(255,255,255,.16);padding:14px 18px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#suiteHub .rl-stat span{display:block;font:800 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:#b4bdd0} #suiteHub .rl-stat b{display:block;font:900 32px var(--body);margin-top:4px}
#suiteHub .rl-dot{width:9px;height:9px;border-radius:50%;flex:none} #suiteHub .rl-led{background:#2f9e44;box-shadow:0 0 6px #3dff6e} #suiteHub .rl-warn{background:#ff6b6b;box-shadow:0 0 6px #ff6b6b}
#suiteHub .rl-tbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:center;margin:-10px 0 22px} #suiteHub .rl-tbar .rl-mut{color:#cfd6e6;font-size:13.5px;text-shadow:0 1px 6px rgba(0,0,0,.7)}
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
:is(#suiteHub,#rlDashPage) .rl-dash{margin-top:30px;text-align:left;color:#eef2ff}
:is(#suiteHub,#rlDashPage) .rl-dhead h2{margin:4px 0 0;font:900 30px var(--display,var(--body));letter-spacing:-.02em;color:#fff!important;text-transform:none!important}
:is(#suiteHub,#rlDashPage) .rl-kick{font:800 11.5px var(--body);letter-spacing:.14em;text-transform:uppercase;color:#aab4cf}
:is(#suiteHub,#rlDashPage) .rl-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:16px 0 18px}
:is(#suiteHub,#rlDashPage) .rl-kpi{padding:16px 18px;border-radius:16px;background:linear-gradient(180deg,rgba(22,29,49,.92),rgba(15,20,36,.92));border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
:is(#suiteHub,#rlDashPage) .rl-kpi span{display:block;font:800 11.5px var(--body);letter-spacing:.12em;text-transform:uppercase;color:#aab4cf} :is(#suiteHub,#rlDashPage) .rl-kpi b{display:block;font:900 34px var(--body);margin-top:6px} :is(#suiteHub,#rlDashPage) .rl-kpi small{color:#aab4cf;font-size:13px}
:is(#suiteHub,#rlDashPage) .rl-boards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:0 0 18px}
:is(#suiteHub,#rlDashPage) .rl-board{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;min-height:112px;padding:16px 18px;border-radius:16px;text-align:left;color:#fff;cursor:pointer;font-family:var(--body,Inter,system-ui,sans-serif);border:1px solid rgba(var(--gl),.45);background:linear-gradient(115deg,var(--g1) -45%,var(--g2) 62%);box-shadow:0 1px 0 rgba(255,255,255,.2) inset,0 14px 30px -14px rgba(0,0,0,.7);transition:transform .2s,box-shadow .2s,border-color .2s}
:is(#suiteHub,#rlDashPage) .rl-board:hover{transform:translateY(-2px);border-color:rgba(var(--gl),.85);box-shadow:0 1px 0 rgba(255,255,255,.25) inset,0 18px 36px -14px rgba(var(--gl),.45)}
:is(#suiteHub,#rlDashPage) .rl-board:focus-visible{outline:2px solid #fff;outline-offset:2px}
:is(#suiteHub,#rlDashPage) .rl-board .bimg{position:absolute;top:0;right:0;bottom:0;width:58%;background-size:cover;background-position:center;opacity:.55;-webkit-mask-image:linear-gradient(90deg,transparent,#000 70%);mask-image:linear-gradient(90deg,transparent,#000 70%);pointer-events:none}
:is(#suiteHub,#rlDashPage) .rl-board .bimg.dots{background-image:radial-gradient(circle,rgba(255,255,255,.85) 0 4px,transparent 5px);background-size:20px 20px;opacity:.35}
:is(#suiteHub,#rlDashPage) .rl-board .ic{position:relative;flex:none;width:52px;height:52px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(150deg,var(--c1),var(--c2));box-shadow:0 1px 0 rgba(255,255,255,.55) inset,0 -6px 10px rgba(0,0,0,.25) inset,0 10px 18px -6px var(--c2)}
:is(#suiteHub,#rlDashPage) .rl-board .ic svg{width:28px;height:28px}
:is(#suiteHub,#rlDashPage) .rl-board .bt{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:3px} :is(#suiteHub,#rlDashPage) .rl-board .bt b{font:900 19px var(--display,var(--body,Inter));letter-spacing:-.01em} :is(#suiteHub,#rlDashPage) .rl-board .bt small{font-size:13px;line-height:1.35;color:rgba(255,255,255,.82)}
:is(#suiteHub,#rlDashPage) .rl-board .go{position:relative;flex:none;font-style:normal;font:800 13px var(--body,Inter);padding:8px 12px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25)}
:is(#suiteHub,#rlDashPage) .rl-dcols{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start} :is(#suiteHub,#rlDashPage) .rl-dl{flex:3 1 520px;min-width:0} :is(#suiteHub,#rlDashPage) .rl-dr{flex:2 1 300px;min-width:0} :is(#suiteHub,#rlDashPage) .rl-dcol{display:flex;flex-direction:column;gap:18px}
:is(#suiteHub,#rlDashPage) .rl-dcard{border-radius:16px;background:rgba(15,20,36,.9);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:16px 18px;overflow:hidden}
:is(#suiteHub,#rlDashPage) .rl-dch{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:-2px 0 6px} :is(#suiteHub,#rlDashPage) .rl-dch h3{margin:0;font:800 18px var(--body);color:#fff}
:is(#suiteHub,#rlDashPage) .rl-lnk{border:0;background:none;color:#ffd43b;font:700 14px var(--body);cursor:pointer;min-height:36px} :is(#suiteHub,#rlDashPage) .rl-lnk:hover{text-decoration:underline}
:is(#suiteHub,#rlDashPage) .rl-drow{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)} :is(#suiteHub,#rlDashPage) .rl-dch+.rl-drow{border-top:0}
:is(#suiteHub,#rlDashPage) .rl-dt{flex:1 1 220px;min-width:0} :is(#suiteHub,#rlDashPage) .rl-dt b{display:block;font-size:15px;color:#fff} :is(#suiteHub,#rlDashPage) .rl-dt small{color:#aab4cf;font-size:13px} :is(#suiteHub,#rlDashPage) .rl-mutd{color:#aab4cf;font-weight:500;font-size:13.5px;line-height:1.45}
:is(#suiteHub,#rlDashPage) .rl-ava{width:40px;height:40px;border-radius:50%;background:#23304f;color:#cfe0ff;display:grid;place-items:center;font:800 14px var(--body);flex:none}
:is(#suiteHub,#rlDashPage) .rl-dbtns{display:flex;gap:8px}
:is(#suiteHub,#rlDashPage) .rl-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px} :is(#suiteHub,#rlDashPage) .rl-tags span{padding:3px 9px;border-radius:999px;font:700 12px var(--body)} :is(#suiteHub,#rlDashPage) .rl-tags .t1{background:#1b2440;color:#b9c8ff} :is(#suiteHub,#rlDashPage) .rl-tags .t2{background:#2a2412;color:#ffd43b} :is(#suiteHub,#rlDashPage) .rl-tags .t3{background:#182a1e;color:#8ce99a}
:is(#suiteHub,#rlDashPage) .rl-prog{flex:1 1 170px;min-width:0} :is(#suiteHub,#rlDashPage) .rl-pl{display:flex;justify-content:space-between;font-size:13px;color:#aab4cf} :is(#suiteHub,#rlDashPage) .rl-pl b{color:#fff}
:is(#suiteHub,#rlDashPage) .rl-bar{margin-top:6px;height:8px;border-radius:99px;background:#1c2336;overflow:hidden} :is(#suiteHub,#rlDashPage) .rl-bar i{display:block;height:100%;border-radius:99px;box-shadow:0 0 8px currentColor}
:is(#suiteHub,#rlDashPage) .rl-x2{width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#cfd6e6;cursor:pointer}
:is(#suiteHub,#rlDashPage) .rl-pills{display:flex;flex-wrap:wrap;gap:6px} :is(#suiteHub,#rlDashPage) .rl-pills button{min-height:34px;padding:0 12px;border-radius:999px;border:1px solid #2b3550;background:#121a2e;color:#cfd6e6;font:700 13px var(--body);cursor:pointer} :is(#suiteHub,#rlDashPage) .rl-pills button[aria-pressed=true]{background:#ffd43b;color:#111;border-color:transparent}
:is(#suiteHub,#rlDashPage) .rl-tbl{overflow-x:auto} :is(#suiteHub,#rlDashPage) .rl-tbl table{width:100%;min-width:640px;border-collapse:collapse;font-size:14px} :is(#suiteHub,#rlDashPage) .rl-tbl th{text-align:left;color:#aab4cf;font:800 11.5px var(--body);letter-spacing:.1em;text-transform:uppercase;padding:10px 8px} :is(#suiteHub,#rlDashPage) .rl-tbl td{padding:11px 8px;border-top:1px solid rgba(255,255,255,.08);color:#cfd6e6} :is(#suiteHub,#rlDashPage) .rl-tbl td b{color:#fff} :is(#suiteHub,#rlDashPage) .rl-tbl .stk{color:#ffd43b;font-weight:800} :is(#suiteHub,#rlDashPage) .rl-tbl td:last-child{width:150px}
:is(#suiteHub,#rlDashPage) .rl-inv{background:linear-gradient(165deg,rgba(17,24,48,.95),rgba(10,14,28,.95));border-color:#263152} :is(#suiteHub,#rlDashPage) .rl-inv .rl-code{margin:8px 0 6px}
:is(#suiteHub,#rlDashPage) .rl-lesson{display:flex;align-items:center;gap:12px;padding:10px;margin-top:8px;border-radius:12px;background:#141b2e;border:1px solid #222b42} :is(#suiteHub,#rlDashPage) .rl-when{width:54px;text-align:center;flex:none} :is(#suiteHub,#rlDashPage) .rl-when span{display:block;font:800 11px var(--body);letter-spacing:.1em;color:#aab4cf} :is(#suiteHub,#rlDashPage) .rl-when b{font:900 18px var(--body);color:#fff}
:is(#suiteHub,#rlDashPage) .rl-plan{display:flex;width:100%;justify-content:space-between;align-items:center;gap:10px;text-align:left;margin-top:8px;padding:12px 14px;border-radius:12px;background:#141b2e;border:1px solid #222b42;color:#fff;cursor:pointer;font-family:var(--body)} :is(#suiteHub,#rlDashPage) .rl-plan:hover{border-color:#ffd43b}
:is(#suiteHub,#rlDashPage) .rl-plan b{display:block;font-size:15px} :is(#suiteHub,#rlDashPage) .rl-plan small{color:#aab4cf;font-size:13px} :is(#suiteHub,#rlDashPage) .rl-plan em{font:800 11.5px var(--body);font-style:normal} :is(#suiteHub,#rlDashPage) .rl-plan em.live{color:#8ce99a} :is(#suiteHub,#rlDashPage) .rl-plan em.draft{color:#ffd43b}
:is(#suiteHub,#rlDashPage) .rl-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px} :is(#suiteHub,#rlDashPage) .rl-tool{display:flex;flex-direction:column;gap:4px;text-align:left;padding:12px;border-radius:12px;background:#141b2e;border:1px solid #222b42;color:#fff;cursor:pointer;font-family:var(--body)} :is(#suiteHub,#rlDashPage) .rl-tool:hover{border-color:#3dff6e}
:is(#suiteHub,#rlDashPage) .rl-tool span{display:flex;align-items:center;gap:8px;font:800 14px var(--body)} :is(#suiteHub,#rlDashPage) .rl-tool i{width:8px;height:8px;border-radius:50%;background:#3dff6e;box-shadow:0 0 6px #3dff6e} :is(#suiteHub,#rlDashPage) .rl-tool small{color:#aab4cf;font-size:12px}
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
const DASHICON='<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="7" width="15" height="19" rx="3.5" fill="#fff"/><rect x="26" y="7" width="15" height="11" rx="3.5" fill="#fff" opacity=".85"/><rect x="26" y="22" width="15" height="19" rx="3.5" fill="#fff"/><rect x="7" y="30" width="15" height="11" rx="3.5" fill="#fff" opacity=".85"/></svg>';   /* the teacher's Dashboard: tiles, not a graduation cap */
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
    if(window.PSSUITE) PSSUITE.assign(A[0]);
    endAssign(); toast('Assigned: '+(t.value.trim()||ROOMS[w.room])+'. Your students see it on their home page.'); };
  cx.onclick=endAssign; t.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') go.click(); };
  b.append(t,go,cx); document.body.appendChild(b); }
function endAssign(){ try{ sessionStorage.removeItem('ps-assign'); }catch(_){} const b=document.getElementById('rlAssign'); if(b) b.remove(); render(); }
/* Meet a student (the teacher's Class): students looking for a teacher */
const SEEK=[
  {n:'Chidi N.',lv:'Beginner',want:'Play hymns for my church in six months',when:'Evenings, Lagos time'},
  {n:'Maria L.',lv:'Intermediate',want:'Gospel chords and passing chords',when:'Weekends'},
  {n:'Daniel K.',lv:'Beginner',want:'Learn to play by ear',when:'Mornings'},
  {n:'Esther O.',lv:'Advanced',want:'Jazz reharmonization and voicings',when:'Weekday afternoons'}];
function meetStudents(){ const b=panel('Meet a student','Students looking for a teacher. Invite the ones you would like to teach, or share your code so they can find you.');
  const inv=jget('ps-t-invited',{}); const box=el('div'); b.appendChild(box);
  const draw=()=>{ box.textContent=''; const tag=el('div','rl-mut','<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(255,212,59,.14);color:#ffd43b;font:800 10px var(--body);letter-spacing:.1em;text-transform:uppercase">Sample</span>'); tag.style.margin='0 0 6px'; box.appendChild(tag);
    SEEK.forEach(p=>{ const r=el('div','rl-li'); r.appendChild(el('div','rl-t','<b>'+esc(p.n)+' · '+esc(p.lv)+'</b><small>'+esc(p.want)+' · '+esc(p.when)+'</small>'));
      const done=!!inv[p.n], bt=el('button','rl-btn'+(done?'':' pri'),done?'Invited ✓':'Invite'); bt.type='button';
      bt.onclick=()=>{ inv[p.n]=!inv[p.n]; jset('ps-t-invited',inv); if(inv[p.n]) toast('Invite sent to '+p.n+(/\.$/.test(p.n)?'':'.')+' They see it in their Class.'); draw(); }; r.appendChild(bt); box.appendChild(r); });
    const f=el('div','rl-li'); f.appendChild(el('div','rl-t','<b>Your invite code</b><small>Students type it under "Have an invite code?"</small>')); f.appendChild(el('span','rl-code',esc(code()))); f.querySelector('.rl-code').style.cssText='font:900 22px ui-monospace,Menlo,monospace;color:#ffd43b;letter-spacing:.06em';
    const cp=el('button','rl-btn','Copy invite link'); cp.type='button'; cp.onclick=()=>{ const u=location.origin+'/?join='+code(); try{ navigator.clipboard.writeText(u); }catch(_){} toast('Invite link copied: '+u); }; f.appendChild(cp); box.appendChild(f); };
  draw(); }
/* Meet a teacher (from the Class) */
function meetPanel(){ const b=panel('Meet a teacher','Subscribe to a teacher to get their class, practice arena, studio and practice plan builder, and the work they assign you.'); const box=el('div'); b.appendChild(box);
  const draw=()=>{ box.textContent=''; box.appendChild(teacherGrid(draw)); }; draw(); }
/* ---------- teacher view ---------- */
function spaceCard(sp,editing,on){ const b=el('button','dcard'); b.type='button'; b.dataset.k=sp.k;
  b.innerHTML='<div class="ph"><i class="phi"'+({class:'card-dashboard.webp',studio:'card-studio.webp',plus:'card-plus.webp',hall:'class-chords.webp'}[sp.k]?' style="background-image:url('+({class:'card-dashboard.webp',studio:'card-studio.webp',plus:'card-plus.webp',hall:'class-chords.webp'}[sp.k])+')"':'')+'></i>'+(BIG[sp.k]||'')+'</div><div class="ic"></div><div class="nm"></div><div class="bl"></div><div class="go">Open →</div>';
  b.querySelector('.ic').innerHTML=sp.k==='class'?DASHICON:(ICON[sp.k]||ICONS_SUITE(sp.k)); b.querySelector('.nm').textContent=sp.name; b.querySelector('.bl').textContent=sp.blurb;
  if(editing){ const ed=el('div','rl-ed'); const rn=el('span',null,'Rename'); rn.setAttribute('role','button'); rn.tabIndex=0; rn.onclick=e=>{ e.stopPropagation(); on.rename(sp); }; ed.appendChild(rn);
    if(!['class','hall','studio','arena'].includes(sp.id)){ const rm=el('span',null,'✕'); rm.setAttribute('role','button'); rm.setAttribute('aria-label','Remove '+sp.name); rm.tabIndex=0; rm.onclick=e=>{ e.stopPropagation(); on.remove(sp); }; ed.appendChild(rm); } b.appendChild(ed); }
  b.onclick=()=>{ if(sp.go) openRoom(sp.go); else spacePanel(sp,true); };
  return b; }
let editing=false;
function teacherView(root){ const in_=root;
  const h1=document.querySelector('#suiteHub .in h1'); if(h1) h1.textContent=studioName();
  const sub=document.querySelector('#suiteHub .in .sub'); if(sub){ const h=window.PSSUITE&&PSSUITE.mineHandle(); sub.innerHTML=h?'<span>Your suite: hearandplay.app/'+esc(h)+'</span><i>|</i><span>Your dashboard</span>':'<span>Your dashboard</span><i>|</i><span>Claim your suite link under Customize</span>'; }
  const bar=el('div','rl-tbar'); const rn=el('button','rl-btn','Rename my studio'); rn.type='button';
  rn.onclick=()=>{ const b=panel('Rename your studio'); const f=el('div','rl-f'); const l=el('label',null,'<span>Studio name</span>'), i=el('input','rl-in'); i.value=studioName(); l.appendChild(i); f.appendChild(l); b.appendChild(f); const ok=el('button','rl-btn pri','Save'); ok.type='button'; ok.onclick=()=>{ try{ localStorage.setItem(K.name,i.value.trim()||'My HearandPlay Studio'); }catch(_){} if(window.PSSUITE) PSSUITE.push(); closePanel(); render(); }; b.appendChild(ok); i.focus(); i.select(); };
  /* one Customize button: it opens editing for the spaces and the studio's name */
  const ed=el('button','rl-btn'+(editing?' pri':''),editing?'Done':'Customize'); ed.type='button'; ed.setAttribute('aria-pressed',String(editing)); ed.onclick=()=>{ editing=!editing; render(); };
  const as=el('button','rl-btn pri','+ New assignment'); as.type='button'; as.onclick=assignPanel;
  const db=el('button','rl-btn','Dashboard ↓'); db.type='button'; db.onclick=()=>{ const d=document.getElementById('rlDash'); if(d) d.scrollIntoView({behavior:'smooth',block:'start'}); };
  void as; void db; const vs=el('button','rl-btn','View my suite as a student'); vs.type='button'; vs.onclick=()=>{ if(window.PSSUITE) PSSUITE.viewAsStudent(); }; bar.append(ed,vs); if(editing){ rn.textContent='Rename my studio'; bar.append(rn); bar.appendChild(el('span','rl-mut','Your studio name, your suite link and your spaces.')); } in_.appendChild(bar);
  if(editing&&window.PSSUITE) in_.appendChild(PSSUITE.linkBox());
  /* the spaces (under Customize) */
  if(!editing){ dashboard(in_); return; }
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
  }
/* the dashboard on a page of its own (from the teacher's Class) */
function dashPage(){ closeDash(); const p=el('div'); p.id='rlDashPage'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Teacher dashboard');
  const top=el('div','rl-dptop'); const bk=el('button','rl-btn','← Back to the Class'); bk.type='button'; bk.onclick=closeDash; top.appendChild(bk);
  const hm=el('button','rl-btn','Teacher home'); hm.type='button'; hm.onclick=()=>{ closeDash(); if(window.SUITE) SUITE.home(); }; top.appendChild(hm);
  const vs=el('button','rl-btn pri','View my suite as a student'); vs.type='button'; vs.onclick=()=>{ if(window.PSSUITE) PSSUITE.viewAsStudent(); }; top.appendChild(vs); p.appendChild(top);
  const inner=el('div','rl-dpin'); p.appendChild(inner); dashboard(inner); document.body.appendChild(p); setTimeout(()=>bk.focus(),30);
  p.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); closeDash(); } }); }
function closeDash(){ const p=document.getElementById('rlDashPage'); if(p){ p.remove(); return true; } return false; }
/* ---------- the teacher's dashboard (from the design) ---------- */
const SAMPLE_DASH=[
  {n:'Ada O.',lv:'Intermediate',grp:'Intermediate',plan:'Church Pianist 90',streak:12,last:'Today',pct:72},
  {n:'Tolu K.',lv:'Beginner',grp:'Beginners',plan:'Foundations 90',streak:5,last:'Today',pct:38},
  {n:'James M.',lv:'Intermediate',grp:'Intermediate',plan:'Play by Ear 90',streak:3,last:'Yesterday',pct:51},
  {n:'Grace E.',lv:'Beginner',grp:'Beginners',plan:'Foundations 90',streak:0,last:'6 days ago',pct:14},
  {n:'Samuel A.',lv:'Advanced',grp:'Church pianists',plan:'Church Pianist 90',streak:21,last:'Today',pct:88}];
const SAMPLE_ASG=[{title:'2-5-1 in all 12 keys, with bass runs',room:'chords',due:'Fri',who:'Intermediate group',d:8,of:12},{title:'G, D, A, E, B major: the 3+4 method',room:'scales',due:'Thu',who:'Beginners',d:5,of:9},{title:'Hear the 1, 4 and 5 chords',room:'ear',due:'Sat',who:'Everyone',d:11,of:24}];
const LESSONS=[{day:'TUE',time:'18:00',t:'Group class: passing chords',w:'Intermediate group · 9 students'},{day:'WED',time:'16:30',t:'One-to-one: Grace E.',w:'Beginner · catch-up'},{day:'SAT',time:'10:00',t:'Masterclass: hymn endings',w:'Open to all students'}];
let dashGrp='All';
function dashboard(root){ const A=jget(K.asg,[]), done=jget(K.done,{}), joined=(jget(K.subs,[])||[]).includes(ME);
  const S=SAMPLE_DASH.slice(); if(joined) S.unshift({n:'You (this device)',lv:'Student',grp:'All',plan:'Your assignments',streak:1,last:'Today',pct:Math.round(100*Object.values(done).filter(Boolean).length/Math.max(1,A.length)),me:true});
  const total=S.length, hr=new Date().getHours(), hi=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const D=el('section','rl-dash'); D.setAttribute('aria-label','Teacher dashboard');
  D.id='rlDash'; D.innerHTML='<div class="rl-dhead"><div><div class="rl-kick">'+new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})+' · '+esc(studioName())+' · Dashboard</div><h2>'+hi+'. Here is your studio today.</h2></div></div>';
  /* numbers at a glance */
  const st=el('div','rl-kpis'); [['Active students',String(total),(joined?'Including you, on this device':'3 joined this week'),'#ffffff'],['To review',String(REVIEW.length),'Recordings, checks and questions','#ffd43b'],['Due this week',String(A.length+SAMPLE_ASG.length),'Assignments open','#8ce99a'],['Practised today',String(S.filter(x=>x.last==='Today').length),'of '+total+' students','#b9c8ff']]
    .forEach(([l,v,n,c])=>st.appendChild(el('div','rl-kpi','<span>'+l+'</span><b style="color:'+c+'">'+v+'</b><small>'+n+'</small>'))); D.appendChild(st);
  /* the suite's own parts, as boards the size of the numbers above (Practice Arena, Studio, Practice Plan Builder) */
  { const I=(window.SUITE&&SUITE.icons)||{}, bd=el('div','rl-boards');
    [['hall','Practice Arena','Progressions, scales and ear training for your students.','class-chords.webp','--g1:#13a48f;--g2:#06302b;--gl:80,230,200;--c1:#3dd9c4;--c2:#0f8a7a'],
     ['studio','Studio','Backing tracks your students play along with.','card-studio.webp','--g1:#e0911a;--g2:#2a1a05;--gl:255,190,70;--c1:#ffd24d;--c2:#e0911a'],
     ['challenge','Practice Plan Builder','Practice plans your students can start.','','--g1:#d6336c;--g2:#3d0a1f;--gl:255,130,170;--c1:#ff8a8a;--c2:#d6336c']].forEach(([k,t,b,img,vars])=>{
      const x=el('button','rl-board'); x.type='button'; x.style.cssText=vars; x.dataset.k=k;
      const sp=spaces().find(q=>q.go===(k==='studio'?'studios':k)), nm=sp?sp.name:t, n=(jget(SIK,{})[PART[k]]||[]).length;
      x.innerHTML='<span class="bimg'+(img?'':' dots')+'"'+(img?' style="background-image:url('+img+')"':'')+'></span><i class="ic">'+(I[k]||'')+'</i><span class="bt"><b>'+esc(nm)+'</b><small>'+(n?n+' in your suite · ':'')+b+'</small></span><em class="go">Edit →</em>';
      x.setAttribute('aria-label','Edit your suite\'s '+nm); x.onclick=()=>suiteEditor(k);
      bd.appendChild(x); });
    D.appendChild(bd); }
  const cols=el('div','rl-dcols'), L=el('div','rl-dcol rl-dl'), R=el('div','rl-dcol rl-dr'); cols.append(L,R); D.appendChild(cols);
  const card=(title,extra)=>{ const c=el('section','rl-dcard'); const h=el('div','rl-dch','<h3>'+title+'</h3>'); if(extra) h.appendChild(extra); c.appendChild(h); return c; };
  const link=(t,f)=>{ const b=el('button','rl-lnk',t); b.type='button'; b.onclick=f; return b; };
  /* waiting for your review */
  { const c=card('Waiting for your review <span class="rl-demo">Sample</span>');
    REVIEW.forEach(r=>{ const row=el('div','rl-drow'); const ini=r.n.split(/\s+/).map(x=>x[0]).join('').slice(0,2);
      row.innerHTML='<span class="rl-ava">'+esc(ini)+'</span><div class="rl-dt"><b>'+esc(r.n)+' <span class="rl-mutd">'+esc(r.w)+'</span></b><small>'+esc(r.t)+'</small></div>';
      const bx=el('div','rl-dbtns'); const ls=el('button','rl-btn','Listen'); ls.type='button'; ls.onclick=()=>toast('Plays '+r.n+'\'s recording here.'); const fb=el('button','rl-btn ok','Give feedback'); fb.type='button'; fb.onclick=()=>toast('Write or record feedback, and it goes straight to '+r.n+'.'); bx.append(ls,fb); row.appendChild(bx); c.appendChild(row); });
    L.appendChild(c); }
  /* assignments this week, with how many are done */
  { const c=card('Assignments this week',link('New assignment',assignPanel));
    const rows=A.map(a=>({title:a.title,room:a.room,due:a.due,who:'Your students',d:done[a.id]?1:0,of:total,real:a}))
      .concat(SAMPLE_ASG.map(x=>Object.assign({sample:true},x)));
    rows.forEach(a=>{ const pct=Math.round(100*a.d/Math.max(1,a.of)); const row=el('div','rl-drow rl-arow');
      row.innerHTML='<div class="rl-dt"><b>'+esc(a.title)+'</b><div class="rl-tags"><span class="t1">'+esc((ROOMS[a.room]||'').replace(/ ·.*/,''))+'</span><span class="t2">Due '+esc(a.due||'')+'</span><span class="t3">'+esc(a.who)+'</span>'+(a.sample?'<span class="rl-demo">Sample</span>':'')+'</div></div>'
        +'<div class="rl-prog"><div class="rl-pl"><span>Done</span><b>'+a.d+' of '+a.of+'</b></div><div class="rl-bar"><i style="width:'+pct+'%;background:'+(pct>=50?'#3dff6e':'#ffd43b')+'"></i></div></div>';
      if(a.real){ const rm=el('button','rl-x2','✕'); rm.type='button'; rm.setAttribute('aria-label','Remove '+a.title); rm.onclick=()=>{ const B=jget(K.asg,[]).filter(x=>x.id!==a.real.id); jset(K.asg,B); render(); }; row.appendChild(rm); }
      c.appendChild(row); });
    L.appendChild(c); }
  /* my students, with group filters */
  { const pills=el('div','rl-pills'); ['All','Beginners','Intermediate','Church pianists'].forEach(gp=>{ const b=el('button',null,gp); b.type='button'; b.setAttribute('aria-pressed',String(dashGrp===gp)); b.onclick=()=>{ dashGrp=gp; render(); }; pills.appendChild(b); });
    const c=card('My students <span class="rl-demo">Sample</span>',pills); const wrap=el('div','rl-tbl');
    const rows=S.filter(x=>dashGrp==='All'||x.grp===dashGrp||x.me);
    wrap.innerHTML='<table><thead><tr><th>Student</th><th>Level</th><th>Practice plan</th><th>Streak</th><th>Last practice</th><th>Progress</th></tr></thead><tbody>'
      +rows.map(x=>'<tr><td><b>'+esc(x.n)+'</b></td><td>'+esc(x.lv)+'</td><td>'+esc(x.plan)+'</td><td class="stk">'+x.streak+' day'+(x.streak===1?'':'s')+'</td><td style="color:'+(x.last==='Today'?'#8ce99a':/days/.test(x.last)?'#ff8787':'#cfd6e6')+'">'+esc(x.last)+'</td><td><div class="rl-bar"><i style="width:'+x.pct+'%;background:'+(x.pct<20?'#ff8787':'#3dff6e')+'"></i></div></td></tr>').join('')+'</tbody></table>';
    c.appendChild(wrap); L.appendChild(c); }
  /* invite */
  { const c=el('section','rl-dcard rl-inv'); c.innerHTML='<div class="rl-kick">Your invite code</div><div class="rl-code">'+esc(code())+'</div><p class="rl-mutd">Students enter this code, or open your link, to join your studio.</p>';
    const cp=el('button','rl-btn pri','Copy invite link'); cp.type='button'; cp.style.width='100%'; cp.onclick=()=>{ const u=location.origin+'/?join='+code(); try{ navigator.clipboard.writeText(u); }catch(_){} toast('Invite link copied: '+u); }; c.appendChild(cp);
    const f=el('div'); f.style.cssText='display:flex;gap:8px;margin-top:10px'; const em=el('input','rl-in'); em.type='email'; em.placeholder='student@email.com'; em.setAttribute('aria-label','Student email'); em.style.cssText='flex:1;min-width:0';
    const se=el('button','rl-btn','Send'); se.type='button'; se.onclick=()=>{ if(!/@/.test(em.value)){ em.focus(); return; } toast('Invite sent to '+em.value.trim()); em.value=''; }; f.append(em,se); c.appendChild(f); R.appendChild(c); }
  /* next live lessons */
  { const c=card('Next live lessons <span class="rl-demo">Sample</span>');
    LESSONS.forEach(l=>{ const row=el('div','rl-lesson'); row.innerHTML='<div class="rl-when"><span>'+l.day+'</span><b>'+l.time+'</b></div><div class="rl-dt"><b>'+esc(l.t)+'</b><small>'+esc(l.w)+'</small></div>'; const o=el('button','rl-btn','Open'); o.type='button'; o.onclick=()=>toast('Your live lesson opens here, with the Class keyboard and whiteboard.'); row.appendChild(o); c.appendChild(row); });
    R.appendChild(c); }
  /* practice plans (the Practice Plan Builder) */
  { const c=card('Practice plans',link('Build a plan',()=>{ if(window.SUITE) SUITE.go('challenge'); }));
    [['Foundations 90','Scales and chords first · 11 students','LIVE'],['Church Pianist 90','Progressions, endings and licks · 9 students','LIVE'],['Play by Ear 90','Modes and stylization · draft','DRAFT']].forEach(([t,m,stt])=>{ const row=el('button','rl-plan'); row.type='button'; row.innerHTML='<span><b>'+t+'</b><small>'+m+'</small></span><em class="'+(stt==='LIVE'?'live':'draft')+'">'+stt+'</em>'; row.onclick=()=>{ if(window.SUITE) SUITE.go('challenge'); }; c.appendChild(row); });
    R.appendChild(c); }
  /* from your tools */
  { const c=card('From your tools'); c.appendChild(el('p','rl-mutd','Anything you set up in the suite can become an assignment.'));
    const g=el('div','rl-tools'); [['hall','Practice Arena','Scales, chords, ear training'],['studios','Studio','Backing tracks, transcription'],['challenge','Practice Plan Builder','A practice plan']].forEach(([k,t,n])=>{ const b=el('button','rl-tool','<span><i></i>'+t+'</span><small>'+n+'</small>'); b.type='button';
      b.onclick=()=>{ try{ sessionStorage.setItem('ps-assign','1'); }catch(_){} if(window.SUITE){ if(k==='studios') SUITE.studios(); else SUITE.go(k); } assignBar(); }; g.appendChild(b); }); c.appendChild(g); R.appendChild(c); }
  root.appendChild(D); }

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
  const s=el('section','rl-sec'); s.innerHTML='<h2>Learn with a teacher</h2><p class="rl-mut">Subscribe to a teacher to get their class, practice arena, studio and practice plan builder, and the work they assign you. Until then, the whole suite is yours.</p>';
  s.appendChild(teacherGrid(render));
  const jf=el('div'); jf.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;align-items:center'; jf.appendChild(el('b',null,'Have an invite code?'));
  const ji=el('input','rl-in'); ji.placeholder='HP-T-XXXX'; ji.setAttribute('aria-label','Invite code'); ji.style.cssText='text-transform:uppercase;font-family:ui-monospace,Menlo,monospace;width:170px';
  const jb=el('button','rl-btn','Join'); jb.type='button'; jb.onclick=()=>joinCode(ji.value);
  jf.append(ji,jb); s.appendChild(jf); root.appendChild(s); }
function teacherGrid(after){ const subs=jget(K.subs,[])||[]; const T=[{id:ME,name:studioName(),ini:'HP',spec:'Your teacher\'s studio on this device',students:'',color:'#2f9e44'}].concat(SAMPLE);
  const g=el('div','rl-grid'); T.forEach(t=>{ const c=el('div','rl-card'); const joined=subs.includes(t.id);
    c.innerHTML='<div style="display:flex;align-items:center;gap:12px"><span class="rl-av" style="background:'+t.color+'">'+esc(t.ini)+'</span><div style="flex:1;min-width:0"><b style="font-size:17px">'+esc(t.name)+'</b>'+(t.id===ME?'':'<span class="rl-demo">Sample</span>')+'<div style="color:#b4bdd0;font-size:13px">'+esc(t.spec)+(t.students?' · '+esc(t.students):'')+'</div></div></div>';
    const ch=el('div','rl-chips'); ['Class','Practice Arena','Studio','Practice Plan Builder'].forEach(n=>ch.appendChild(el('span','rl-chip',n))); c.appendChild(ch);
    const b=el('button','rl-btn'+(joined?' ok':' pri'),joined?'Subscribed ✓':'Subscribe'); b.type='button'; b.onclick=()=>{ let S=jget(K.subs,[])||[]; if(S.includes(t.id)) S=S.filter(x=>x!==t.id); else { S.push(t.id); toast('You joined '+t.name+'.'); } jset(K.subs,S); render(); if(after&&after!==render) after(); }; c.appendChild(b); g.appendChild(c); });
  return g; }
function joinCode(v){ v=String(v||'').trim().toUpperCase(); let c=null; try{ c=localStorage.getItem(K.code); }catch(_){}
  if(c&&v===c){ const S=jget(K.subs,[])||[]; if(!S.includes(ME)) S.push(ME); jset(K.subs,S); toast('You joined '+studioName()+'.'); render(); }
  else toast(v?'That code was not found. Check it with your teacher.':'Type the code your teacher gave you.'); }

/* ---------- on the home page ---------- */
function render(){ { const dp=document.getElementById('rlDashPage'); if(dp){ const inn=dp.querySelector('.rl-dpin'); if(inn){ const y=dp.scrollTop; inn.textContent=''; dashboard(inn); dp.scrollTop=y; } } }
  const hub=document.getElementById('suiteHub'); if(!hub) return;
  if(window.PSSUITE&&PSSUITE.handle){ PSSUITE.front(hub); return; } const inn=hub.querySelector('.in'); if(!inn) return; const r=role(); hub.dataset.role=r;
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
    m.innerHTML='<img class="ph" src="card-class.webp" alt="" style="object-position:center 28%" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><circle cx="17" cy="16" r="6" fill="#fff"/><circle cx="33" cy="18" r="5" fill="#fff" opacity=".85"/><path d="M5 38c0-7 5.5-12 12-12s12 5 12 12" fill="#fff"/><path d="M27 38c0-5 3-9 7-9s9 3 9 9" fill="#fff" opacity=".85"/></svg></i><b></b><span></span></div>';
    four.appendChild(m); }
  { const T=role()==='teacher'; let d=four&&four.querySelector('[data-k=dash]');
    if(four&&T&&!d){ d=el('button','cl-box'); d.type='button'; d.dataset.k='dash'; d.style.cssText='--g1:#e0a800;--g2:#2a2104;--gl:255,212,59;--c1:#ffe066;--c2:#e0a800';
      d.innerHTML='<img class="ph" src="card-dashboard.webp" alt="" style="object-position:center 30%" decoding="async"><div class="tx"><i class="ic"><svg viewBox="0 0 48 48" fill="none"><rect x="7" y="26" width="7" height="14" rx="2" fill="#fff"/><rect x="20" y="16" width="7" height="24" rx="2" fill="#fff"/><rect x="33" y="8" width="7" height="32" rx="2" fill="#fff"/></svg></i><b>Teacher dashboard</b><span>Your students, assignments, reviews and invite code at a glance.</span><em class="go">Open →</em></div>';
      d.setAttribute('aria-label','Teacher dashboard'); d.onclick=dashPage; four.insertBefore(d,four.querySelector('[data-k=meet]')||null); }
    if(d&&!T){ d.remove(); d=null; }
    if(four) four.classList.remove('rl-3'); }   /* the teacher's Dashboard: no Consultation, so two cards */
  { const m=four&&four.querySelector('[data-k=meet]'); if(m){ const T=role()==='teacher';   /* a teacher meets students, a student meets teachers */
      m.querySelector('.tx b').textContent=T?'Meet a student':'Meet a teacher';
      m.querySelector('.tx span').textContent=T?'Students looking for a teacher. Invite them to your studio.':'Find a teacher, subscribe, and learn with them in the suite.';
      if(!m.querySelector('.tx .go')) m.querySelector('.tx').appendChild(el('em','go','Open →'));
      m.setAttribute('aria-label',T?'Meet a student':'Meet a teacher'); m.onclick=T?meetStudents:meetPanel; } }
  const br=r.querySelector('.cl-bar .cl-brand'); if(br) br.textContent=k==='hall'?'Practice Arena':(role()==='teacher'?'Dashboard':'Class Area');
  const w=r.querySelector('.cl-welcome'); if(w){ if(!w.dataset.orig) w.dataset.orig=w.innerHTML;
    w.innerHTML=k==='hall'?'Welcome to the Practice Arena. From scale and chord practice sessions to ear-training sessions, this is a very important part of the piano suite that you must <b>NOT</b> go for a day without.'
      :(role()==='teacher'?'Welcome to your dashboard today. From your teacher dashboard to meeting a student, this is':'Welcome to class today. From consultation sessions to meeting a teacher, this is')+' a very important part of the piano suite that you must <b>NOT</b> go for a day without.'; } }
const css2=el('style'); css2.textContent=`
#suiteHub .rl-cards .dcard.rl-lock .go{opacity:.85} #suiteHub .rl-cards .dcard.rl-lock .phi{filter:grayscale(.35) brightness(.8)}
#rlPrev{position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:200060;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 12px 10px 18px;border-radius:999px;background:#ffd43b;color:#151b28;font:700 14px var(--body,Inter,system-ui,sans-serif);box-shadow:0 14px 34px rgba(0,0,0,.5)}
#rlPrev button{min-height:38px;padding:0 14px;border-radius:999px;border:0;background:#151b28;color:#fff;font:800 13px var(--body,Inter);cursor:pointer}
#suiteHub .rl-link{max-width:860px;margin:0 auto 22px}
body[data-role=teacher][data-area=class] .cl-box[data-k=chat]{display:none!important}
body[data-area=class] .cl-four.rl-3{grid-template-columns:repeat(3,minmax(0,1fr))!important;max-width:1280px}
@media(max-width:900px){ body[data-area=class] .cl-four.rl-3{grid-template-columns:repeat(2,minmax(0,1fr))!important} }
body[data-area=hall] .cl-box[data-k=dash]{display:none!important}
.cl-box .rl-dph{overflow:hidden} .cl-box .rl-dph svg{width:100%;height:100%;display:block}
#rlDashPage{position:fixed;inset:0;z-index:200030;overflow:auto;background:radial-gradient(120% 80% at 50% 0%,#18213f 0%,#0a0e1c 55%,#06080f 100%);color:#eef2ff;font-family:var(--body,Inter,system-ui,sans-serif);padding:18px clamp(12px,3vw,40px) 60px}
#rlDashPage .rl-dptop{display:flex;flex-wrap:wrap;gap:10px;max-width:1280px;margin:0 auto}
#rlDashPage .rl-dpin{max-width:1280px;margin:0 auto} #rlDashPage .rl-dash{margin-top:14px}
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
/* hearandplay.app/?myprogressions : shows every chord progression saved in this browser (the chord room's canvas and its memory banks), to copy and send */
function myProgressions(){ let st={}, banks=[]; try{ st=JSON.parse(localStorage.getItem('ps-pr')||'{}'); }catch(_){} try{ banks=JSON.parse(localStorage.getItem('pr-cbanks')||'[]')||[]; }catch(_){}
  const L=['HearandPlay chord progressions saved in this browser',''];
  const info=x=>[x.cmode?'mode '+x.cmode:'',x.bpm?x.bpm+' BPM':'',x.ctr?'transpose '+x.ctr:'',x.coct?'octave '+x.coct:'',x.vh?'technique '+x.vh:'',x.bline?'bass line on':'',x.riff?'riffs on':''].filter(Boolean).join(' · ');
  banks.forEach((b,i)=>{ if(!b||!b.s) return; L.push('Bank '+(i+1)+(b.name?' · '+b.name:'')); L.push(String(b.s.chords||'(no canvas text)')); L.push('('+info(b.s)+')',''); });
  if(st.chords){ L.push('On the canvas now'); L.push(String(st.chords)); L.push('('+info(st)+')',''); }
  if(L.length<=2) L.push('No chord progressions were found in this browser. If you entered them on another computer, phone or browser, open this same link there.');
  L.push('','----- full data -----',JSON.stringify({banks,canvas:{chords:st.chords||'',cmode:st.cmode,bpm:st.bpm,ctr:st.ctr,coct:st.coct}}));
  const b=panel('Your chord progressions','Everything saved in this browser. Press Copy, then paste it into your chat with Claude.'); const t=el('textarea'); t.value=L.join('\n'); t.readOnly=true; t.style.cssText='width:100%;min-height:340px;font:600 13px/1.5 ui-monospace,Menlo,monospace'; b.appendChild(t);
  const c=el('button','rl-btn pri','Copy'); c.type='button'; c.style.marginTop='12px'; c.onclick=()=>{ t.select(); let ok=false; try{ navigator.clipboard.writeText(t.value); ok=true; }catch(_){} try{ ok=document.execCommand('copy')||ok; }catch(_){} toast(ok?'Copied. Paste it into your chat with Claude.':'Select all the text and copy it.'); }; b.appendChild(c); }
try{ if(/[?&#]myprogressions\b/.test(location.search+location.hash)) setTimeout(myProgressions,1500); }catch(_){}


/* ---------- editing the teacher's own suite: what students find in its Practice Arena, Studio and Practice Plan Builder ----------
   Nothing here changes the main HearandPlay suite: the teacher sets something up in the tools, adds it to their suite, and it shows in their suite. */
const SIK='ps-t-sitems', PART={hall:'arena',studio:'studio',challenge:'plans'}, PNAME={hall:'Practice Arena',studio:'Studio',challenge:'Practice Plan Builder'};
const sitems=()=>{ const o=jget(SIK,{}); return {arena:o.arena||[],studio:o.studio||[],plans:o.plans||[]}; };
const setItems=o=>{ jset(SIK,o); if(window.PSSUITE) PSSUITE.push(); };
const itemLine=(part,x)=>part==='arena'?(ROOMS[x.room]||'Practice').replace(/ ·.*/,'')+(x.prog?' · '+x.prog.slice(0,60):'')+(x.key?' · '+x.key+' '+(x.type||''):'')+(x.bpm?' · '+x.bpm+' BPM':''):part==='studio'?(x.chords||'').replace(/\s+/g,' ').slice(0,70)+' · '+(x.style||'')+' · '+(x.bpm||'')+' BPM':((x.week||[]).reduce((a,d)=>a+d.length,0))+' practice items a week';
function suiteEditor(k){ const part=PART[k], A=spaces(), sp=A.find(q=>q.go===(k==='studio'?'studios':k))||{name:PNAME[k],blurb:''};
  const h=window.PSSUITE&&PSSUITE.mineHandle();
  const b=panel('Your suite · '+sp.name, 'What your students find here in your suite'+(h?' (hearandplay.app/'+h+')':'')+'. This does not change the main HearandPlay suite.');
  const f=el('div','rl-f'); const l=el('label',null,'<span>Name in your suite</span>'), i=el('input','rl-in'); i.value=sp.name; l.appendChild(i); const l2=el('label',null,'<span>Description</span>'), i2=el('input','rl-in'); i2.value=sp.blurb||''; l2.appendChild(i2); f.append(l,l2); b.appendChild(f);
  const sv=el('button','rl-btn','Save name and description'); sv.type='button'; sv.onclick=()=>{ const L=spaces(), x=L.find(q=>q.id===sp.id); if(x){ x.name=i.value.trim()||x.name; x.blurb=i2.value.trim()||x.blurb; jset(K.sp,L); toast('Saved. Your suite shows it.'); render(); } }; b.appendChild(sv);
  const list=el('div'); list.style.marginTop='18px'; b.appendChild(list);
  const draw=()=>{ list.textContent=''; const o=sitems(), L=o[part];
    list.appendChild(el('h3',null,(L.length?L.length+' in your suite':'Nothing in your suite here yet'))).style.cssText='margin:0 0 4px;font:800 17px var(--body)';
    L.forEach((x,ix)=>{ const r=el('div','rl-li'); r.appendChild(el('div','rl-t','<b>'+esc(x.title||x.name)+'</b><small>'+esc(itemLine(part,x))+'</small>'));
      const up=el('button','rl-btn','↑'); up.type='button'; up.setAttribute('aria-label','Move up'); up.disabled=!ix; up.onclick=()=>{ const o2=sitems(); const M=o2[part]; [M[ix-1],M[ix]]=[M[ix],M[ix-1]]; setItems(o2); draw(); };
      const rm=el('button','rl-btn','Remove'); rm.type='button'; rm.onclick=()=>{ const o2=sitems(); o2[part].splice(ix,1); setItems(o2); draw(); render(); }; r.append(up,rm); list.appendChild(r); }); };
  draw();
  const add=el('div'); add.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:16px';
  const btn=(t,f2)=>{ const x=el('button','rl-btn pri',t); x.type='button'; x.onclick=f2; add.appendChild(x); };
  if(part==='arena'){ btn('+ Add from Chord Practice',()=>capture(k,'chords')); btn('+ Add from Scale Practice',()=>capture(k,'scales')); btn('+ Add from Ear training',()=>capture(k,'ear')); }
  if(part==='studio') btn('+ Add from the Backing Track Studio',()=>capture(k,'studio'));
  if(part==='plans') btn('+ Add from the Practice Plan Builder',()=>capture(k,'challenge'));
  b.appendChild(add); b.appendChild(el('p','rl-mut','You go there, set it up the way you want it, give it a title and press Add to my suite.')).style.marginTop='12px'; }
/* set something up in a tool, then add it to the suite */
function capture(k,room){ closePanel(); try{ sessionStorage.setItem('ps-cap',k); }catch(_){} const S=window.SUITE; if(!S) return;
  if(room==='studio') S.go('studio'); else if(room==='challenge') S.go('challenge');
  else { S.go('hall'); setTimeout(()=>{ try{ if(room==='chords') PRACTICE.open('chords'); else if(room==='scales') PRACTICE.open('scales',{resume:true}); else if(window.EAR) EAR.open(); }catch(_){} },500); }
  capBar(); }
function capBar(){ let k=null; try{ k=sessionStorage.getItem('ps-cap'); }catch(_){} if(!k) return; let b=document.getElementById('rlAssign'); if(b) b.remove(); b=el('div'); b.id='rlAssign'; b.setAttribute('role','region'); b.setAttribute('aria-label','Add to your suite');
  b.innerHTML='<b>Your suite · '+esc(PNAME[k])+'</b><span>Set it up here, then add it.</span>';
  const t=el('input'); t.type='text'; t.placeholder=k==='studio'?'Title, e.g. Sunday worship set':k==='challenge'?'Plan name (optional)':'Title, e.g. 2-5-1 in all 12 keys'; t.setAttribute('aria-label','Title');
  const go=el('button','pri','Add to my suite'), cx=el('button',null,'Cancel'); go.type='button'; cx.type='button';
  const end=()=>{ try{ sessionStorage.removeItem('ps-cap'); }catch(_){} b.remove(); };
  go.onclick=()=>{ const o=sitems(), id='i'+Date.now().toString(36), nm=t.value.trim();
    if(k==='studio'){ const n=window.STUDIO_NOW&&STUDIO_NOW(); if(!n||!n.chords.trim()){ toast('Type a chord chart in the Backing Track Studio first.'); return; } o.studio.unshift(Object.assign({id,title:nm||n.title||'Backing track'},n)); }
    else if(k==='challenge'){ const p=window.CHALLENGE&&CHALLENGE.planNow&&CHALLENGE.planNow(); if(!p||!p.week){ toast('Choose or build a plan in the Practice Plan Builder first.'); return; } o.plans.unshift({id,name:nm||p.name||'Practice plan',week:p.week}); }
    else { const w=where(); if(!['chords','scales','ear'].includes(w.room)){ toast('Open Chord Practice, Scale Practice or Ear training first.'); return; } o.arena.unshift(Object.assign({id,title:nm||(w.room==='chords'?'Chord progression':w.room==='scales'?(w.key||'')+' '+(w.type||'scale'):'Ear training')},w)); }
    setItems(o); end(); toast('Added to your suite.'); if(window.SUITE) SUITE.home(); setTimeout(()=>suiteEditor(k),500); };
  cx.onclick=end; t.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') go.click(); };
  b.append(t,go,cx); document.body.appendChild(b); }
try{ if(sessionStorage.getItem('ps-cap')&&role()==='teacher') setTimeout(capBar,900); }catch(_){}
/* a student in a teacher's suite: what the teacher put in each part */
function itemsPanel(k,items,pub){ const part=PART[k], L=(items&&items[part])||[], sp=(pub.spaces||[]).find(q=>q.go===(k==='studio'?'studios':k));
  const nm=sp?sp.name:PNAME[k]; if(!L.length){ openRoom(k==='studio'?'studios':k); return; }
  const b=panel(nm,'From '+pub.teacher+'. Open one, or go to the '+PNAME[k]+' to practise on your own.');
  L.forEach(x=>{ const r=el('div','rl-li'); r.appendChild(el('div','rl-t','<b>'+esc(x.title||x.name)+'</b><small>'+esc(itemLine(part,x))+'</small>'));
    const op=el('button','rl-btn pri',part==='plans'?'Start this plan':'Open'); op.type='button';
    op.onclick=()=>{ if(part==='arena') openRoom(x.room,x); else if(part==='studio'){ closePanel(); if(window.STUDIO_LOAD) STUDIO_LOAD(x); }
      else { const c=panel('Start '+(x.name||'this plan')+'?','It replaces the practice plan you have now in the Practice Plan Builder.'); const y=el('button','rl-btn pri','Start it'); y.type='button'; y.onclick=()=>{ closePanel(); if(window.CHALLENGE&&CHALLENGE.startWith) CHALLENGE.startWith({name:x.name,week:x.week}); }; const n=el('button','rl-btn','Not now'); n.type='button'; n.onclick=closePanel; c.append(y,n); } };
    r.appendChild(op); b.appendChild(r); });
  const fr=el('button','rl-btn','Open the '+PNAME[k]); fr.type='button'; fr.style.marginTop='12px'; fr.onclick=()=>openRoom(k==='studio'?'studios':k); b.appendChild(fr); }

/* ---------- teacher suites: hearandplay.app/<handle> ----------
   A teacher claims a handle (@name) under Customize; their studio name and spaces are saved to their suite, and their assignments go to the students
   who subscribed. The suite page shows the front to everyone; a signed-in student subscribes with a PIN of their own and enters with it.
   From the dashboard, View my suite as a student opens the page as students see it, with a bar back to the dashboard. */
const SUITE_RES=new Set('api admin www app index home suite suites teacher teachers student students dashboard settings account login signup signin logout help about class hall studio plus challenge arena practice hearandplay pokeytivity myprogressions privacy terms support'.split(' '));
const PSSUITE=(()=>{
  const m=/^\/([A-Za-z0-9]{3,30})\/?$/.exec(location.pathname), handle=m&&!SUITE_RES.has(m[1].toLowerCase())?m[1].toLowerCase():null;
  const qs=new URLSearchParams(location.search), preview=qs.get('preview')==='1';
  const A=()=>window.AUTH, tok=()=>{ try{ return A()&&A().token()||''; }catch(_){ return ''; } };
  const api=async(body,q)=>{ const r=await fetch('/api/suite'+(q||''),{method:body?'POST':'GET',headers:Object.assign({'content-type':'application/json'},tok()?{authorization:'Bearer '+tok()}:{}),body:body?JSON.stringify(body):undefined}); let j={}; try{ j=await r.json(); }catch(_){} j._s=r.status; return j; };
  let mine=null, mineP=null; try{ mine=JSON.parse(localStorage.getItem('ps-t-suite')||'null'); }catch(_){}
  const keepMine=x=>{ mine=x; try{ localStorage.setItem('ps-t-suite',JSON.stringify(x)); }catch(_){} };
  const loadMine=()=>{ if(!mineP) mineP=(async()=>{ if(!tok()) return null; const j=await api({action:'mine'}); if(j._s===200){ keepMine(j.suite); } return mine; })(); return mineP; };
  const linkOf=h=>location.origin+'/'+h;
  let pt=0; const push=()=>{ clearTimeout(pt); pt=setTimeout(async()=>{ if(!mine||!mine.handle||!tok()) return; const j=await api({action:'save',handle:mine.handle,name:studioName(),spaces:spaces(),items:sitems()}); if(j._s===200) keepMine(j.suite); },700); };
  const ERR={bad_handle:'Use 3 to 30 letters and numbers, no spaces.',taken:'That name is taken. Try another.',role:'Only a Teacher account can have a suite.',auth:'Sign in first.'};
  /* under Customize: claim or change the link */
  function linkBox(){ const s=el('section','rl-sec rl-link'); s.innerHTML='<h2>Your suite link</h2><p class="rl-mut">Students open this link to see your suite. Your studio name and spaces show there; they subscribe and enter with their own PIN.</p>';
    const body=el('div'); s.appendChild(body);
    const draw=async()=>{ body.textContent=''; const u=A()&&A().user();
      if(!u){ const b=el('button','rl-btn pri','Sign in to claim your suite link'); b.type='button'; b.onclick=async()=>{ await A().open({title:'Sign in as a teacher',why:'Your suite is saved to your account, so students can open it from any phone or computer.',role:'teacher',mode:'up'}); mineP=null; await loadMine(); draw(); }; body.appendChild(b); return; }
      if(u.role!=='teacher'){ const b=el('button','rl-btn pri','Make my account a Teacher account'); b.type='button'; b.onclick=async()=>{ await A().setRole('teacher'); draw(); }; body.appendChild(el('p','rl-mut','Signed in as '+esc(u.email)+' (a '+esc(u.role==='none'?'general':u.role)+' account).')); body.appendChild(b); return; }
      await loadMine();
      const row=el('div'); row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px';
      const at=el('span',null,'@'); at.style.cssText='font:900 22px var(--body);color:#ffd43b';
      const inp=el('input','rl-in'); inp.value=mine&&mine.handle||studioName().toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,30); inp.setAttribute('aria-label','Suite name, letters and numbers'); inp.style.cssText='flex:1 1 220px;font:800 16px ui-monospace,Menlo,monospace';
      const st=el('span','rl-mut'); st.style.margin='0';
      const save=el('button','rl-btn pri',mine&&mine.handle?'Save new name':'Claim this link'); save.type='button';
      let ct=0; const check=()=>{ clearTimeout(ct); const v=inp.value.toLowerCase().replace(/[^a-z0-9]/g,''); if(v!==inp.value) inp.value=v; if(mine&&v===mine.handle){ st.textContent='This is your link.'; st.style.color='#8ce99a'; return; }
        if(v.length<3){ st.textContent='At least 3 letters or numbers.'; st.style.color='#ffd43b'; return; }
        ct=setTimeout(async()=>{ const j=await api(null,'?check='+encodeURIComponent(v)); st.textContent=j.available?'hearandplay.app/'+v+' is available.':'Taken. Try another.'; st.style.color=j.available?'#8ce99a':'#ff8787'; },350); };
      inp.oninput=check; inp.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') save.click(); };
      save.onclick=async()=>{ save.disabled=true; const j=await api({action:'save',handle:inp.value,name:studioName(),spaces:spaces(),items:sitems()}); save.disabled=false;
        if(j._s===200){ const ch=mine&&mine.handle&&mine.handle!==j.suite.handle; keepMine(j.suite); toast(ch?'Your suite moved to hearandplay.app/'+j.suite.handle+'. The old link still sends people there.':'Your suite is live at hearandplay.app/'+j.suite.handle); draw(); }
        else { st.textContent=ERR[j.error]||'Could not save. Try again.'; st.style.color='#ff8787'; } };
      row.append(at,inp,save); body.appendChild(row); body.appendChild(st); check();
      if(mine&&mine.handle){ const l=el('div'); l.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px';
        l.innerHTML='<b style="font:800 16px ui-monospace,Menlo,monospace;color:#ffd43b">'+esc(linkOf(mine.handle).replace(/^https?:\/\//,''))+'</b>';
        const cp=el('button','rl-btn','Copy link'); cp.type='button'; cp.onclick=()=>{ try{ navigator.clipboard.writeText(linkOf(mine.handle)); }catch(_){} toast('Copied: '+linkOf(mine.handle)); };
        const vw=el('button','rl-btn','View as a student'); vw.type='button'; vw.onclick=viewAsStudent; l.append(cp,vw); body.appendChild(l); } };
    draw(); return s; }
  async function viewAsStudent(){ const u=A()&&A().user(); if(!u){ toast('Sign in and claim your suite link first: Customize on your Teacher home.'); return; }
    await loadMine(); if(!mine||!mine.handle){ toast('Claim your suite link first: Customize on your Teacher home.'); return; }
    push(); setTimeout(()=>{ location.href='/'+mine.handle+'?preview=1'; },mine?50:0); }
  async function assign(a){ if(!a) return; await loadMine(); if(!mine||!mine.handle||!tok()) return;
    try{ await A().post('acreate',{kind:'exercise',title:a.title,note:a.note||'',spec:{room:a.room,prog:a.prog||'',bpm:a.bpm||0,key:a.key||'',type:a.type||''},to:'all'}); }catch(_){} }
  /* ---------- the suite page ---------- */
  let pub=null, pubP=null, entered=null;
  try{ entered=handle?JSON.parse(sessionStorage.getItem('ps-in:'+handle)||'null'):null; }catch(_){}
  const loadPub=()=>{ if(!pubP) pubP=(async()=>{ const j=await api(null,'?h='+encodeURIComponent(handle)); pub=j._s===200?j:{missing:true}; if(pub.moved&&pub.handle){ history.replaceState(null,'','/'+pub.handle+location.search); } return pub; })(); return pubP; };
  const setIn=x=>{ entered=x; try{ if(x) sessionStorage.setItem('ps-in:'+handle,JSON.stringify(x)); else sessionStorage.removeItem('ps-in:'+handle); }catch(_){} };
  function bar(){ if(!preview||document.getElementById('rlPrev')) return; const b=el('div'); b.id='rlPrev'; b.innerHTML='<span>You are viewing <b>@'+esc(handle)+'</b> as a student</span>';
    const bk=el('button',null,'← Back to my dashboard'); bk.type='button'; bk.onclick=()=>{ try{ localStorage.setItem('ps-role','teacher'); sessionStorage.setItem('ps-open-dash','1'); }catch(_){} location.href='/'; }; b.appendChild(bk); document.body.appendChild(b); }
  async function front(hub){ const inn=hub.querySelector('.in'); if(!inn) return; hub.dataset.role='suite'; document.body.dataset.role='student';
    ['.rl-tog','#rlBox','#psStBack'].forEach(q=>{ const x=inn.querySelector(q); if(x) x.remove(); });
    const cardsMain=inn.querySelector('#psCards'); if(cardsMain) cardsMain.style.display='none';
    let tl=inn.querySelector('.rl-tagline'); if(!tl){ tl=el('div','rl-tagline','We help students and teachers succeed'); const sub=inn.querySelector('.sub'); if(sub&&sub.nextSibling) inn.insertBefore(tl,sub.nextSibling); }
    const box=el('div'); box.id='rlBox'; if(cardsMain&&cardsMain.nextSibling) inn.insertBefore(box,cardsMain.nextSibling); else inn.appendChild(box);
    box.appendChild(el('p','rl-mut','Loading the suite…'));
    await loadPub(); box.textContent=''; bar();
    const h1=inn.querySelector('h1'), sub=inn.querySelector('.sub');
    if(pub.missing){ if(h1) h1.textContent='@'+handle; if(sub) sub.innerHTML='<span>There is no suite with this name yet</span>';
      const s=el('section','rl-sec'); s.innerHTML='<h2>Suite not found</h2><p class="rl-mut">Check the link with your teacher. You can still use the whole HearandPlay Piano Suite.</p>'; const g=el('a','rl-btn pri','Go to the HearandPlay Piano Suite'); g.href='/'; s.appendChild(g); box.appendChild(s); return; }
    if(h1) h1.textContent=pub.name; if(sub) sub.innerHTML='<span>@'+esc(pub.handle)+'</span><i>|</i><span>A HearandPlay suite with '+esc(pub.teacher)+'</span>';
    const u=A()&&A().user&&A().user();
    if(preview&&u){ const j=await api({action:'enter',h:handle}); if(j._s===200) setIn({assignments:j.assignments,items:j.items,preview:true}); }
    /* the teacher's spaces */
    const cards=el('div','cards rl-cards'); (pub.spaces&&pub.spaces.length?pub.spaces:DEF_SPACES).forEach(sp=>{ const c=spaceCard(sp,false,{});
      if(sp.k==='class'){ c.querySelector('.nm').textContent=sp.name==='Dashboard'?'Class':sp.name; c.querySelector('.bl').textContent=sp.name==='Dashboard'?'Consultation with HearandPlay, and meet your teacher.':sp.blurb; const ph=c.querySelector('.phi'); if(ph) ph.style.backgroundImage='url(card-class.webp)'; c.querySelector('.ic').innerHTML=ICONS_SUITE('class')||c.querySelector('.ic').innerHTML; }
      { const STB={hall:'Ear training, scales and chords, with the fingering and the hands.',studio:'Backing tracks to play along with, and the Transcription Studio.',challenge:'Practice plans with daily check-ins and certificates.'}; const bl=c.querySelector('.bl'); if(bl&&STB[sp.k]&&(/your students|for your/i.test(sp.blurb||'')||!sp.blurb)) bl.textContent=STB[sp.k]; }
      if(entered&&['hall','studios','challenge'].includes(sp.go)){ const kk=sp.go==='studios'?'studio':sp.go; const n=((entered.items||{})[PART[kk]]||[]).length; if(n) c.querySelector('.go').textContent=n+' from '+pub.teacher+' →'; c.onclick=()=>itemsPanel(kk,entered.items||{},pub); }
      if(entered&&!sp.go) c.onclick=()=>spacePanel(sp,false);
      if(!entered){ c.classList.add('rl-lock'); c.querySelector('.go').textContent='Enter your PIN to open'; c.onclick=()=>{ const i=box.querySelector('#rlPin'); if(i){ i.focus(); i.scrollIntoView({behavior:'smooth',block:'center'}); } else toast('Sign in and subscribe to use this suite.'); }; }
      cards.appendChild(c); });
    box.appendChild(cards);
    /* subscribe / enter */
    const s=el('section','rl-sec rl-enter'); box.appendChild(s);
    if(entered){ s.innerHTML='<h2>'+(entered.preview?'Your assignments (as your students see them)':'You are in')+'</h2><p class="rl-mut">'+(entered.preview?'Students enter their PIN here to open your spaces and see these.':'Your spaces are open. Here is the work '+esc(pub.teacher)+' assigned you.')+'</p>';
      const L=entered.assignments||[]; if(!L.length) s.appendChild(el('p','rl-mut','No assignments yet.'));
      const done=jget(K.done,{});
      L.forEach(a=>{ const sp=a.spec||{}, li=el('div','rl-li'); li.appendChild(el('div','rl-t','<b>'+esc(a.title)+'</b><small>'+esc(ROOMS[sp.room]||'Practice')+(sp.bpm?' · '+sp.bpm+' BPM':'')+(a.note?' · '+esc(a.note):'')+'</small>'));
        const op=el('button','rl-btn pri','Open'); op.type='button'; op.onclick=()=>openRoom(sp.room||'hall',sp); li.appendChild(op);
        const dn=el('button','rl-btn'+(done[a.id]?' ok':''),done[a.id]?'Done ✓':'Mark done'); dn.type='button'; dn.onclick=()=>{ done[a.id]=!done[a.id]; jset(K.done,done); front(hub); }; li.appendChild(dn); s.appendChild(li); });
      if(!entered.preview){ const lv=el('button','rl-btn','Leave the suite'); lv.type='button'; lv.style.marginTop='12px'; lv.onclick=()=>{ setIn(null); front(hub); }; s.appendChild(lv); }
      return; }
    if(!u){ s.innerHTML='<h2>Enter this suite</h2><p class="rl-mut">Sign in as a student, subscribe to '+esc(pub.teacher)+'\'s suite and choose your PIN. Next time, you enter with your PIN.</p>';
      const b=el('button','rl-btn pri','Sign in to enter'); b.type='button'; b.onclick=async()=>{ const x=await A().open({title:'Sign in to enter '+pub.name,why:'Sign in as a student. Then subscribe and choose your PIN.',role:'student',mode:'up'}); if(x) front(hub); }; s.appendChild(b); return; }
    const stt=await api({action:'status',h:handle});
    if(stt.owner){ s.innerHTML='<h2>This is your suite</h2><p class="rl-mut">Open it from your dashboard with View my suite as a student.</p>'; const b=el('button','rl-btn pri','View it as a student'); b.type='button'; b.onclick=()=>{ location.href='/'+handle+'?preview=1'; }; s.appendChild(b); return; }
    const pinIn=(id,lab)=>{ const l=el('label'); l.style.cssText='display:flex;flex-direction:column;gap:6px;font:700 13px var(--body);color:#cfd6e6'; l.appendChild(el('span',null,lab)); const i=el('input','rl-in'); i.id=id; i.type='password'; i.inputMode='numeric'; i.autocomplete='off'; i.maxLength=6; i.placeholder='4 to 6 digits'; i.style.cssText='width:170px;font:900 20px ui-monospace,Menlo,monospace;letter-spacing:.3em'; i.onkeydown=e=>e.stopPropagation(); l.appendChild(i); return [l,i]; };
    const er=el('p','rl-mut'); er.style.color='#ff8787'; er.setAttribute('aria-live','polite');
    const enter=async pin=>{ const j=await api({action:'enter',h:handle,pin}); if(j._s===200){ setIn({assignments:j.assignments,items:j.items}); toast('Welcome to '+pub.name+'.'); front(hub); return true; } er.textContent=j.error==='wrong_pin'?'That PIN is not right.':j.error==='slow_down'?'Too many tries. Wait a few minutes.':'Could not enter. Try again.'; return false; };
    if(!stt.subscribed){ s.innerHTML='<h2>Subscribe to '+esc(pub.name)+'</h2><p class="rl-mut">Choose a PIN for this suite. You will enter with it every time you come in.</p>';
      const f=el('div'); f.style.cssText='display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end'; const [l1,p1]=pinIn('rlPin','Choose your PIN'), [l2,p2]=pinIn('rlPin2','Type it again');
      const go=el('button','rl-btn pri','Subscribe and enter'); go.type='button'; go.onclick=async()=>{ er.textContent=''; if(!/^\d{4,6}$/.test(p1.value)){ er.textContent='Use 4 to 6 digits.'; p1.focus(); return; } if(p1.value!==p2.value){ er.textContent='The two PINs are not the same.'; p2.focus(); return; }
        go.disabled=true; const j=await api({action:'subscribe',h:handle,pin:p1.value}); if(j._s!==200){ go.disabled=false; er.textContent='Could not subscribe. Try again.'; return; } await enter(p1.value); };
      p2.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') go.click(); };
      f.append(l1,l2,go); s.append(f,er); s.appendChild(el('p','rl-mut','Subscribing is free for now.')); return; }
    s.innerHTML='<h2>Enter '+esc(pub.name)+'</h2><p class="rl-mut">Type the PIN you chose when you subscribed.</p>';
    const f=el('div'); f.style.cssText='display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end'; const [l1,p1]=pinIn('rlPin','Your PIN'); const go=el('button','rl-btn pri','Enter'); go.type='button'; go.onclick=()=>enter(p1.value);
    p1.onkeydown=e=>{ e.stopPropagation(); if(e.key==='Enter') go.click(); }; f.append(l1,go); s.append(f,er); }
  if(handle){ window.addEventListener('ps-auth',()=>{ const hub=document.getElementById('suiteHub'); if(hub&&hub.classList.contains('on')) front(hub); }); }
  /* coming back from the preview: open the dashboard */
  try{ if(!handle&&sessionStorage.getItem('ps-open-dash')){ sessionStorage.removeItem('ps-open-dash'); setTimeout(()=>{ try{ dashPage(); }catch(_){} },1400); } }catch(_){}
  if(!handle&&role()==='teacher') setTimeout(()=>{ loadMine().then(()=>{ try{ const h=document.getElementById('suiteHub'); if(h&&h.classList.contains('on')&&!document.getElementById('rlPanel')) render(); }catch(_){} }); },1500);
  return {handle,preview,push,linkBox,viewAsStudent,assign,front,mineHandle:()=>mine&&mine.handle||null};
})();
window.PSSUITE=PSSUITE;
try{ document.body.dataset.role=role(); }catch(_){}
try{ if(role()==='teacher'&&window.SUITE&&SUITE.DEST&&SUITE.DEST.class){ SUITE.DEST.class.name='Dashboard'; SUITE.DEST.class.blurb='Your teacher dashboard, and meet a student.'; } }catch(_){}
window.PSROLE={hub:render,role,area,myProgressions,closeDash,dashIcon:DASHICON};
{ const h=document.getElementById('suiteHub'); if(h&&h.classList.contains('on')) render(); }
})();
