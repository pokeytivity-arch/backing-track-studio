/* Piano Suite: one home with three destinations.
   Class = the coach with whiteboard, keyboard and chat
   Studio            = backing tracks
   Studio+           = transcription
   Remembers the last destination, and the Window menu switches between them. */
(function(){
'use strict';
const KEY='ps-dest';
const DEST={
  class:{name:'Class',icon:'🎓',blurb:'Learn with Pokey. Ask anything about chords, scales, hymns and ear training, and get practice tracks to load into the Studio.',panel:'teacher'},
  studio:{name:'Studio',icon:'🎹',blurb:'Type a chord chart, pick a style and play along with a full band. Slow it down, change the key, loop a section.',panel:null},
  plus:{name:'Studio+',icon:'🎧',blurb:'Transcription. Turn any recording into notes you can see and practice on the keyboard.',panel:'transcribe'},
  account:{name:'Account',icon:'👤',blurb:'',panel:null},
  challenge:{name:'90 Day Challenge',icon:'🏆',blurb:'Build a practice plan, check in every day for 90 days, and earn your certificate of consistency.',panel:null}
};
const ORDER=['class','studio','plus','challenge'];
const get=()=>{ try{ const v=localStorage.getItem(KEY); return DEST[v]?v:null; }catch(_){ return null; } };
const put=v=>{ try{ localStorage.setItem(KEY,v); }catch(_){} };
let cur=null;

const css=document.createElement('style'); css.textContent=`
#suiteHub{position:fixed;inset:0;z-index:200000;display:none;overflow:auto;background:linear-gradient(180deg,rgba(5,5,5,.80),rgba(5,5,5,.58) 45%,rgba(5,5,5,.28)),url(hub-bg.webp) center/cover no-repeat #0a0e17;color:#e6eaf2;font-family:var(--body)}
#suiteHub.on{display:block}
#suiteHub .in{max-width:1280px;margin:0 auto;padding:7vh 20px 40px;text-align:center}
#suiteHub h1{font:800 clamp(34px,6vw,56px)/1.05 var(--display,var(--body));margin:0 0 10px;letter-spacing:-.02em}
#suiteHub .sub{font-size:clamp(15px,2vw,18px);color:#b4bdd0;margin:0 auto 34px;max-width:620px}
#suiteHub .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:18px;text-align:left}
#suiteHub .dcard{position:relative;display:flex;flex-direction:column;gap:10px;padding:26px 24px 22px;border-radius:20px;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,28,.58);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:inherit;font:inherit;cursor:pointer;text-align:left;transition:transform .15s,background .15s,border-color .15s}
#suiteHub .dcard:hover,#suiteHub .dcard:focus-visible{transform:translateY(-3px);background:rgba(20,26,48,.7);border-color:rgba(255,255,255,.35);outline:none}
#suiteHub .dcard .ic{font-size:38px;line-height:1}
#suiteHub .dcard .nm{font:700 24px var(--display,var(--body))}
#suiteHub .dcard .bl{font-size:14.5px;line-height:1.5;color:#d0d7e6;flex:1}
#suiteHub .dcard .go{font-weight:700;color:var(--hi,var(--ke8c25a,#ffd43b))}
#suiteHub .dcard.last{border-color:var(--hi,var(--ke8c25a,#ffd43b));background:rgba(40,34,12,.62)}
#suiteHub .badge{position:absolute;top:14px;right:14px;font:700 11px var(--body);letter-spacing:.04em;text-transform:uppercase;background:var(--hi,var(--ke8c25a,#ffd43b));color:#151b28;padding:4px 9px;border-radius:999px}
#suiteHub .foot{margin-top:30px;font-size:13px;color:#b4bdd0}
#suiteHub .back{margin-top:18px;background:transparent;border:1px solid rgba(255,255,255,.25);color:#e6eaf2;font:600 14px var(--body);padding:9px 16px;border-radius:999px;cursor:pointer}
.ps-chip{border:1px solid color-mix(in srgb,var(--accent) 45%,transparent)!important;background:color-mix(in srgb,var(--accent) 12%,transparent)!important;color:var(--accent)!important;font-weight:700!important;border-radius:999px!important;padding:3px 12px!important;margin-left:6px}
/* Class with Coach and Studio+ use the Studio's dark stage look: same fonts, colours, pill buttons */
body[data-dest="class"],body[data-dest="studio"],body[data-dest="plus"]{background-color:#0a0e17;background-repeat:no-repeat;background-position:center;background-size:cover;background-attachment:fixed}
body[data-dest="class"]{background-image:linear-gradient(180deg,rgba(5,5,5,.72),rgba(5,5,5,.55)),url(card-class.webp)}
body[data-dest="studio"]{background-image:linear-gradient(180deg,rgba(5,5,5,.72),rgba(5,5,5,.55)),url(card-studio.webp)}
body[data-dest="plus"]{background-image:linear-gradient(180deg,rgba(5,5,5,.72),rgba(5,5,5,.55)),url(card-plus.webp)}
body[data-dest="class"] header.top,body[data-dest="class"] #stage,body[data-dest="plus"] header.top,body[data-dest="plus"] #stage{display:none}
body[data-dest="class"] .card[data-panel="teacher"].panel-active,
body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{position:fixed!important;left:max(12px,calc(50% - 590px))!important;top:48px!important;width:min(1180px,calc(100vw - 24px))!important;height:calc(100vh - 60px)!important;resize:none!important;border-radius:18px;background:var(--stage)!important;color:var(--stage-ink);border:0;padding:clamp(16px,3vw,28px)!important;overflow:auto;box-shadow:none;display:flex;flex-direction:column;gap:12px}
body[data-dest="class"] .card[data-panel="teacher"] .panel-bar,body[data-dest="plus"] .card[data-panel="transcribe"] .panel-bar,
body[data-dest="class"] .card[data-panel="teacher"] .card-h,body[data-dest="plus"] .card[data-panel="transcribe"] .card-h{display:none}
.ps-head{display:none}
body[data-dest="class"] .card[data-panel="teacher"] .ps-head,body[data-dest="plus"] .card[data-panel="transcribe"] .ps-head{display:block}
.ps-head .lbl{display:block;margin-bottom:2px}
.ps-head h1{font:800 clamp(30px,5vw,52px)/1 var(--display);letter-spacing:-.02em;margin:0;color:var(--stage-ink)}
.ps-head p{margin:6px 0 0;color:var(--stage-muted);font-size:14px}
body[data-dest="class"] .teacher,body[data-dest="plus"] .tx{--ink:var(--stage-ink);--muted:var(--stage-muted);--line:var(--k6b5826,#34446c);--bg:var(--stage-2);--surface:var(--stage-2)}
body[data-dest="class"] .teacher .help,body[data-dest="plus"] .tx .help{color:var(--stage-muted)}
/* buttons: the Studio's outlined pills, yellow for the main action */
body[data-dest="class"] .teacher .btn,body[data-dest="plus"] .tx .btn,body[data-dest="class"] .t-chips .chip{background:transparent;border:1.5px solid var(--k6b5826,#3a4a74);color:var(--stage-ink);border-radius:999px;padding:8px 14px;font-weight:500;font-size:14px;box-shadow:none}
body[data-dest="class"] .teacher .btn:hover,body[data-dest="plus"] .tx .btn:hover:not(:disabled),body[data-dest="class"] .t-chips .chip:hover{background:var(--stage-2);border-color:var(--hi);color:var(--hi)}
body[data-dest="class"] .teacher .btn.pri,body[data-dest="plus"] .tx .btn.pri{background:var(--hi);color:var(--hi-ink);border:0;font:800 16px var(--display);padding:11px 22px}
body[data-dest="class"] .teacher .btn.pri:hover,body[data-dest="plus"] .tx .btn.pri:hover:not(:disabled){background:var(--hi);color:var(--hi-ink);filter:brightness(1.06)}
body[data-dest="plus"] .tx .btn:disabled{opacity:.4}
body[data-dest="plus"] .tx .btn.rec{border-color:#ff5a64;color:#ff8a92}
body[data-dest="plus"] .tx .btn.on{background:#ff5a64;color:#fff;border-color:#ff5a64}
/* fields */
body[data-dest="class"] .teacher select,body[data-dest="class"] .teacher textarea,body[data-dest="plus"] .tx select,body[data-dest="plus"] .tx input[type=number]{background:var(--stage-2);color:var(--stage-ink);border:1.5px solid var(--k6b5826,#34446c);border-radius:8px;padding:7px 10px}
body[data-dest="class"] .teacher textarea{font-family:var(--body);font-size:16px}
body[data-dest="class"] .teacher textarea::placeholder{color:var(--stage-muted)}
body[data-dest="class"] .t-opts label,body[data-dest="class"] .t-chk,body[data-dest="plus"] .tx .txrow label{font:700 12px var(--body);color:var(--stage-muted);text-transform:uppercase;letter-spacing:.08em}
body[data-dest="plus"] .tx .txrow label.check,body[data-dest="class"] .t-chk{text-transform:none;letter-spacing:0;font-weight:500;font-size:14px;color:var(--stage-ink)}
body[data-dest="plus"] .tx input[type=range],body[data-dest="plus"] .tx #txSeek{accent-color:var(--hi)}
/* the conversation */
body[data-dest="class"] .t-log{flex:1}
body[data-dest="class"] .t-msg{font-size:16px;line-height:1.55}
body[data-dest="class"] .t-msg.bot{background:var(--stage-2);border:0;color:var(--stage-ink)}
body[data-dest="class"] .t-msg.user{background:var(--hi);color:var(--hi-ink);font-weight:500}
body[data-dest="class"] .t-msg.err{border-color:#ff6f79;color:#ff8a92}
body[data-dest="class"] .t-load{background:var(--hi);color:var(--hi-ink);border-radius:999px;font-family:var(--display);font-weight:800;padding:8px 16px}
body[data-dest="class"] .t-copy{color:var(--stage-muted);border-color:var(--k6b5826,#34446c)}
body[data-dest="class"] .t-form{margin-top:auto}
body[data-dest="plus"] .tx #txTitle{font:700 14px var(--display);color:var(--stage-ink)}
body[data-dest="plus"] .tx canvas{height:clamp(320px,56vh,640px);border-radius:12px}
body[data-dest="plus"] .tx .txitem{border-top-color:var(--k6b5826,#34446c);color:var(--stage-ink)}
body[data-dest="plus"] .tx h3{color:var(--stage-muted);text-transform:uppercase;letter-spacing:.12em;font:600 12px var(--body)!important}
body[data-dest="plus"] .tx .help{color:var(--stage-muted)}
#psMini{position:fixed;right:28px;bottom:22px;z-index:120;display:none;gap:8px;align-items:center;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:6px 8px 6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.28);font:600 13px var(--body)}
body[data-dest="class"] #psMini{display:flex}
#psMini button{border:1px solid var(--line);background:var(--bg);color:var(--ink);font:600 13px var(--body);padding:6px 12px;border-radius:999px;cursor:pointer}
#psMini button.pri{background:var(--hi,var(--ke8c25a,#ffd43b));color:#151b28;border-color:transparent}
@media(max-width:700px){body[data-dest="class"] .card[data-panel="teacher"].panel-active,body[data-dest="plus"] .card[data-panel="transcribe"].panel-active{left:0!important;top:40px!important;width:100vw!important;height:calc(100vh - 40px)!important;border-radius:0}#psMini{right:10px;bottom:10px}}

#suiteHub .cards{perspective:1200px;gap:24px}
#suiteHub .dcard{--rx:0deg;--ry:0deg;--mx:50%;--my:0%;overflow:visible;padding:30px 28px 26px;border-radius:26px;border:1px solid rgba(255,255,255,.16);
 background:linear-gradient(160deg,rgba(40,50,84,.78),rgba(11,16,32,.86) 62%);
 box-shadow:0 1px 0 rgba(255,255,255,.22) inset,0 -1px 0 rgba(0,0,0,.4) inset,0 2px 4px rgba(0,0,0,.35),0 18px 36px -8px rgba(0,0,0,.55),0 44px 70px -24px rgba(0,0,0,.6);
 transform-style:preserve-3d;transform:perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry));transition:transform .18s ease-out,box-shadow .25s,border-color .25s}
#suiteHub .dcard:before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(420px circle at var(--mx) var(--my),rgba(255,255,255,.16),transparent 55%);opacity:0;transition:opacity .25s}
#suiteHub .dcard:hover{transform:perspective(1000px) rotateX(var(--rx)) rotateY(var(--ry)) translateY(-6px);background:linear-gradient(160deg,rgba(52,64,104,.86),rgba(14,20,40,.9) 62%);border-color:rgba(255,255,255,.4);box-shadow:0 1px 0 rgba(255,255,255,.3) inset,0 -1px 0 rgba(0,0,0,.4) inset,0 4px 8px rgba(0,0,0,.35),0 30px 50px -10px rgba(0,0,0,.6),0 60px 90px -26px rgba(0,0,0,.65)}
#suiteHub .dcard:hover:before,#suiteHub .dcard:focus-visible:before{opacity:1}
#suiteHub .dcard.last{border-color:rgba(255,212,59,.75);background:linear-gradient(160deg,rgba(74,60,20,.78),rgba(16,16,28,.88) 62%)}
#suiteHub .dcard .ic{width:68px;height:68px;border-radius:20px;display:grid;place-items:center;margin-bottom:6px;font-size:0;transform:translateZ(46px);
 background:linear-gradient(150deg,var(--c1),var(--c2));
 box-shadow:0 1px 0 rgba(255,255,255,.55) inset,0 -6px 10px rgba(0,0,0,.28) inset,0 10px 18px -4px var(--c2),0 18px 26px -10px rgba(0,0,0,.6)}
#suiteHub .dcard .ic svg{width:40px;height:40px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
#suiteHub .dcard[data-k=class]{--c1:#5b8cff;--c2:#2a45c9}
#suiteHub .dcard[data-k=studio]{--c1:#ffd24d;--c2:#e0911a}
#suiteHub .dcard[data-k=plus]{--c1:#b78bff;--c2:#6a35d8}
#suiteHub .dcard[data-k=challenge]{--c1:#ff8a8a;--c2:#d6336c}
#suiteHub .dcard .nm{font-size:27px;letter-spacing:-.01em;transform:translateZ(28px);text-shadow:0 2px 10px rgba(0,0,0,.45)}
#suiteHub .dcard .bl{transform:translateZ(14px)}
#suiteHub .dcard .go{align-self:flex-start;margin-top:4px;padding:9px 16px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:14px;transform:translateZ(30px);transition:background .2s,color .2s,border-color .2s}
#suiteHub .dcard:hover .go{background:var(--hi,var(--ke8c25a,#ffd43b));color:#151b28;border-color:transparent}
#suiteHub .badge{transform:translateZ(40px);box-shadow:0 6px 14px -4px rgba(0,0,0,.5)}
@media (prefers-reduced-motion:reduce),(hover:none){#suiteHub .dcard,#suiteHub .dcard:hover{transform:none}}

#suiteHub .dcard{padding-top:176px}
#suiteHub .dcard .ph{position:absolute;left:0;right:0;top:0;height:200px;border-radius:25px 25px 0 0;overflow:hidden;pointer-events:none;
 -webkit-mask-image:linear-gradient(#000 52%,transparent);mask-image:linear-gradient(#000 52%,transparent);transition:transform .5s ease,filter .3s;filter:saturate(1.05) brightness(.92)}
#suiteHub .dcard .phi{position:absolute;inset:0;background-size:cover;background-position:var(--pp,center 30%);transform:scale(1.02);transform-origin:50% 40%;will-change:transform}
#suiteHub .dcard .phv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .45s;pointer-events:none}
#suiteHub .dcard.vid .phv{opacity:1}
#suiteHub .dcard.vid:hover .phi{animation:none}
#suiteHub .dcard:hover .phi{animation:kbClass 9s ease-in-out infinite alternate}
#suiteHub .dcard[data-k="studio"]:hover .phi{animation-name:kbStudio;animation-duration:11s}
#suiteHub .dcard[data-k="plus"]:hover .phi{animation-name:kbPlus;animation-duration:8s}
#suiteHub .dcard[data-k="plus"] .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(150,200,255,.28) 50%,transparent 65%);transform:translateX(-120%);opacity:0}
#suiteHub .dcard[data-k="plus"]:hover .ph::after{opacity:1;animation:scanPlus 2.8s ease-in-out infinite}
@keyframes kbClass{from{transform:scale(1.04) translate(-1.5%,0)}to{transform:scale(1.2) translate(2%,-2.5%)}}
@keyframes kbStudio{from{transform:scale(1.18) translate(3%,1%)}to{transform:scale(1.18) translate(-3%,-1%)}}
@keyframes kbPlus{from{transform:scale(1.05) translate(0,1%)}to{transform:scale(1.22) translate(-2%,-1.5%)}}
@keyframes scanPlus{from{transform:translateX(-120%)}to{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){#suiteHub .dcard:hover .phi,#suiteHub .dcard:hover .ph::after{animation:none!important}}
#suiteHub .dcard:hover .ph,#suiteHub .dcard:focus-visible .ph{filter:saturate(1.12) brightness(1.02)}
#suiteHub .dcard[data-k=class]{--pp:center 28%}
#suiteHub .dcard[data-k=studio]{--pp:center 55%}
#suiteHub .dcard[data-k=plus]{--pp:35% 30%}
#suiteHub .dcard .ic{margin-top:-6px}

#suiteHub .sub{width:min(1240px,94vw);max-width:none;position:relative;left:50%;transform:translateX(-50%);font-size:clamp(14px,1.45vw,17px);display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;color:#d0d7e6;text-shadow:0 2px 10px rgba(0,0,0,.5)}
#suiteHub .sub i{font-style:normal;color:var(--hi,var(--ke8c25a,#ffd43b));opacity:.9}
@media (max-width:1060px){#suiteHub .sub{width:auto;left:0;transform:none;flex-direction:column;align-items:center;gap:4px}#suiteHub .sub i{display:none}}

/* bold colour + spotlight */
#suiteHub .dcard[data-k=class]{--g1:#3a62e0;--g2:#0c1650;--gl:91,140,255}
#suiteHub .dcard[data-k=studio]{--g1:#e0911a;--g2:#3b2205;--gl:255,190,70}
#suiteHub .dcard[data-k=plus]{--g1:#8a52f0;--g2:#1c0f4a;--gl:170,120,255}
#suiteHub .dcard[data-k=challenge]{--g1:#d6336c;--g2:#3d0a1f;--gl:255,130,170}
#suiteHub .dcard[data-k=challenge] .phi{background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.18),transparent 55%),linear-gradient(160deg,#7a1238,#2a0613)!important}
#suiteHub .dcard[data-k=challenge] .phi:after{content:'90';position:absolute;inset:0;display:grid;place-items:center;font:900 112px/1 var(--display,var(--body));color:rgba(255,255,255,.9);text-shadow:0 8px 30px rgba(0,0,0,.4)}
#suiteHub .dcard,#suiteHub .dcard.last{background:linear-gradient(165deg,var(--g1) -30%,var(--g2) 62%);border-color:rgba(var(--gl),.45);
 box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 -2px 0 rgba(0,0,0,.45) inset,0 3px 6px rgba(0,0,0,.5),0 26px 40px -10px rgba(0,0,0,.75),0 60px 80px -28px rgba(0,0,0,.8)}
#suiteHub .dcard.last{border-color:rgba(255,212,59,.9)}
#suiteHub .dcard:after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:rgba(4,6,16,.62);opacity:0;transition:opacity .35s ease}
#suiteHub .cards:has(.dcard:hover) .dcard:not(:hover):after{opacity:1}
#suiteHub .cards:has(.dcard:hover) .dcard:not(:hover) .ph{filter:saturate(.6) brightness(.7)}
#suiteHub .dcard:hover{background:linear-gradient(165deg,var(--g1) -20%,var(--g2) 68%);border-color:rgba(var(--gl),.95);
 box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 -2px 0 rgba(0,0,0,.4) inset,0 0 0 1px rgba(var(--gl),.55),0 0 46px 2px rgba(var(--gl),.55),0 0 120px 10px rgba(var(--gl),.28),0 40px 60px -12px rgba(0,0,0,.8),0 80px 110px -30px rgba(0,0,0,.85)}
#suiteHub .dcard:hover .ph{filter:saturate(1.2) brightness(1.12)}
#suiteHub .dcard:hover .ic{box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 -6px 10px rgba(0,0,0,.25) inset,0 0 28px 4px rgba(var(--gl),.8),0 18px 26px -10px rgba(0,0,0,.6)}
#suiteHub .dcard:hover:before,#suiteHub .dcard:focus-visible:before{background:radial-gradient(520px circle at var(--mx) var(--my),rgba(255,255,255,.26),transparent 58%)}
#suiteHub .dcard[data-k]:focus-visible:not(:hover){background:linear-gradient(165deg,var(--g1) -30%,var(--g2) 62%);border-color:rgba(var(--gl),.8);outline:2px solid rgba(var(--gl),.55);outline-offset:3px}
@media (hover:none){#suiteHub .dcard:after{display:none}}
`; css.textContent+=`
#psNav{position:fixed;z-index:300000;min-width:250px;padding:8px;border-radius:16px;background:var(--surface,#14171f);color:var(--ink,#fff);border:1px solid var(--line,rgba(255,255,255,.18));box-shadow:0 18px 44px rgba(0,0,0,.5)}
#psNav button{display:flex;align-items:center;gap:12px;width:100%;padding:8px 10px;border:0;border-radius:11px;background:transparent;color:inherit;font:600 15px var(--body,system-ui);cursor:pointer;text-align:left}
#psNav button:hover,#psNav button.cur{background:color-mix(in srgb,var(--ink,#fff) 10%,transparent)}
#psNav i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none;box-shadow:0 1px 0 rgba(255,255,255,.4) inset}
#psNav i svg{width:22px;height:22px}
#psNav span{flex:1}#psNav em{font-style:normal;color:var(--hi,#e8c25a)}
`;
document.head.appendChild(css);

/* ---------- the home screen ---------- */
const hub=document.createElement('div'); hub.id='suiteHub'; hub.setAttribute('role','dialog'); hub.setAttribute('aria-label','Piano Suite home');
hub.innerHTML='<div id="hubTop"></div><div class="in"><h1>Pokeytivity Piano Suite</h1><p class="sub"><span>Consult Pokey, the world\'s leading music AI coach</span><i>|</i><span>Practice in the studio with a backing track</span><i>|</i><span>Transcribe other musicians</span><i>|</i><span class="subpro" id="psPro" role="link" tabindex="0">Get a professional practice plan</span></p><div class="cards" id="psCards"></div><div class="foot" id="psFoot"></div><button class="back" id="psBack" hidden>Back to where I was</button></div>';
document.body.appendChild(hub);

const ICONS={
 class:'<svg viewBox="0 0 48 48" fill="none"><path d="M24 8 3 19l21 11 21-11L24 8Z" fill="#fff"/><path d="M12 25v8c0 3 5.4 6 12 6s12-3 12-6v-8l-12 6-12-6Z" fill="#dfe7ff"/><path d="M42 20v12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="42" cy="35" r="2.6" fill="#ffe08a"/></svg>',
 studio:'<svg viewBox="0 0 48 48" fill="none"><rect x="5" y="9" width="38" height="30" rx="4" fill="#fff"/><path d="M14.5 9v30M24 9v30M33.5 9v30" stroke="#c9ccd6" stroke-width="1.6"/><rect x="11" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/><rect x="20.5" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/><rect x="30" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/></svg>',
 challenge:'<svg viewBox="0 0 48 48" fill="none"><path d="M15 8h18v10a9 9 0 0 1-18 0V8Z" fill="#fff"/><path d="M15 11H8c0 7 3 10 8 10M33 11h7c0 7-3 10-8 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M24 27v7" stroke="#fff" stroke-width="3.4"/><rect x="15" y="34" width="18" height="6" rx="2" fill="#fff"/></svg>',
 plus:'<svg viewBox="0 0 48 48" fill="none"><path d="M9 28v-4a15 15 0 0 1 30 0v4" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><rect x="5.5" y="26" width="9" height="15" rx="4" fill="#fff"/><rect x="33.5" y="26" width="9" height="15" rx="4" fill="#fff"/><path d="M20 30v7M24 26v15M28 31v6" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".9"/></svg>'};
function renderHub(){
  const last=get(), box=document.getElementById('psCards'); box.textContent='';
  ORDER.forEach(k=>{ const d=DEST[k], b=document.createElement('button'); b.type='button'; b.className='dcard'+(k===last?' last':'');
    b.innerHTML=(k===last?'<span class="badge">Continue where you left off</span>':'')+'<div class="ic"></div><div class="nm"></div><div class="bl"></div><div class="go"></div>';
    b.dataset.k=k; { const p=document.createElement('div'); p.className='ph'; { const im=document.createElement('i'); im.className='phi'; im.style.backgroundImage='url(card-'+k+'.webp)'; p.appendChild(im); const v=document.createElement('video'); v.className='phv'; v.muted=true; v.loop=true; v.playsInline=true; v.preload='none'; v.setAttribute('aria-hidden','true'); p.appendChild(v);
      let has=null; b.addEventListener('pointerenter',async()=>{ if(has===null){ try{ const r=await fetch('card-'+k+'.mp4',{method:'HEAD'}); has=r.ok&&/video/.test(r.headers.get('content-type')||''); }catch(_){ has=false; } if(has) v.src='card-'+k+'.mp4'; } if(has){ try{ v.currentTime=0; }catch(_){} v.play().catch(()=>{}); b.classList.add('vid'); } });
      b.addEventListener('pointerleave',()=>{ v.pause(); b.classList.remove('vid'); }); } b.insertBefore(p,b.firstChild); } b.querySelector('.ic').innerHTML=ICONS[k]||d.icon; b.querySelector('.nm').textContent=d.name; b.querySelector('.bl').textContent=d.blurb; b.querySelector('.go').textContent=(k===last?'Continue':'Open')+' →';
    b.onclick=()=>go(k); box.appendChild(b); });

  if(!matchMedia('(hover:none)').matches) box.querySelectorAll('.dcard').forEach(c=>{
    c.addEventListener('pointermove',e=>{ const r=c.getBoundingClientRect(); c.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); c.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); });
  });
  { const pr=document.getElementById('psPro'); pr.onclick=()=>go('challenge'); pr.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go('challenge'); } }; }
  document.getElementById('psFoot').textContent=last?'Your last place is saved on this device.':'You can switch any time from the Window menu.';
  const back=document.getElementById('psBack'); back.hidden=!cur; back.onclick=()=>go(cur);
  try{ if(window.PSPROG) PSPROG.hub(); }catch(_){}
}
function showHub(){ if(!hub.classList.contains('on')&&!navBack&&cur&&HIST[HIST.length-1]!==cur) HIST.push(cur); renderHub(); hub.classList.add('on'); document.body.style.overflow='hidden'; const f=hub.querySelector('.dcard.last')||hub.querySelector('.dcard'); if(f) f.focus({preventScroll:true}); }
function hideHub(){ hub.classList.remove('on'); document.body.style.overflow=''; }

/* ---------- moving between destinations ---------- */
function stopEverything(){ try{ if(typeof playing!=='undefined'&&(playing||paused)&&typeof stop==='function') stop(); }catch(_){} try{ if(window.TX&&TX.S&&TX.S.playing) document.getElementById('txPlay').click(); }catch(_){} }
const HIST=[]; let navBack=false;
const place=()=>hub.classList.contains('on')?'hub':cur;
function go(k){
  if(!DEST[k]) return; const prev=cur; { const from=place(); if(!navBack&&from&&from!==k&&HIST[HIST.length-1]!==from) HIST.push(from); } hideHub(); if(prev&&prev!==k) stopEverything();
  cur=k; if(k!=='account') put(k); document.body.dataset.dest=k;
  if(window.ACCOUNT&&k!=='account') ACCOUNT.close();
  ['teacher','transcribe'].forEach(p=>{ try{ closePanel(p); }catch(_){} });
  if(window.CHALLENGE&&k!=='challenge') CHALLENGE.close();
  if(k==='class'){ openPanel('teacher'); setTimeout(()=>{ try{ if(window.CLASS&&CLASS.welcome) CLASS.welcome(); }catch(_){} },120); }
  else if(k==='plus'){ openPanel('transcribe'); if(window.TX&&TX.restoreLast) TX.restoreLast(); }
  else if(k==='account'){ try{ closePanel(); }catch(_){} window.scrollTo(0,0); if(window.ACCOUNT) ACCOUNT.open(); }
  else if(k==='challenge'){ try{ closePanel(); }catch(_){} window.scrollTo(0,0); if(window.CHALLENGE) CHALLENGE.open(); }
  else { try{ closePanel(); }catch(_){} window.scrollTo(0,0); }
  chip(); window.dispatchEvent(new Event('resize'));
}
function chip(){ const c=document.getElementById('psChip'); if(c) c.textContent=DEST[cur]?DEST[cur].name+' ▾':'Piano Suite ▾'; }
const NAVC={class:['#5b8cff','#2a45c9'],studio:['#ffd24d','#e0911a'],plus:['#b78bff','#6a35d8'],challenge:['#ff8a8a','#d6336c']};
const HOMEI='<svg viewBox="0 0 48 48" fill="none"><path d="M6 23 24 8l18 15" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 21v18h10V28h6v11h10V21L24 11 11 21Z" fill="#fff"/></svg>';
function navMenu(anchor){
  let m=document.getElementById('psNav');
  if(m){ m.remove(); return; }
  m=document.createElement('div'); m.id='psNav'; m.setAttribute('role','menu');
  const rows=[['home','Home',HOMEI,['#6b7a99','#2f3a52']]].concat(['class','studio','plus','challenge'].map(k=>[k,DEST[k].name,ICONS[k],NAVC[k]]));
  rows.forEach(([k,label,svg,c])=>{ const b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem'); const on=k==='home'?hub.classList.contains('on'):(!hub.classList.contains('on')&&cur===k); if(on) b.className='cur';
    b.innerHTML='<i style="background:linear-gradient(150deg,'+c[0]+','+c[1]+')">'+svg+'</i><span></span>'+(on?'<em>✓</em>':''); b.querySelector('span').textContent=label==='Studio+'?'Studio+ (Transcription)':label;
    b.onclick=()=>{ m.remove(); if(k==='home') showHub(); else go(k); }; m.appendChild(b); });
  document.body.appendChild(m); const r=anchor.getBoundingClientRect(); m.style.top=(r.bottom+6)+'px'; m.style.left=Math.max(8,Math.min(r.left,innerWidth-280))+'px';
  const off=e=>{ if(!m.contains(e.target)){ m.remove(); document.removeEventListener('click',off,true); } }; setTimeout(()=>document.addEventListener('click',off,true),0);
  document.addEventListener('keydown',function k(e){ if(e.key==='Escape'){ m.remove(); document.removeEventListener('keydown',k); } });
}
function addChip(){
  const mb=document.querySelector('.menubar'); if(!mb||document.getElementById('psChip')) return;
  const c=document.createElement('button'); c.id='psChip'; c.type='button'; c.className='menu-btn ps-chip'; c.title='Go to…'; c.setAttribute('aria-haspopup','menu'); c.onclick=e=>{ e.stopPropagation(); navMenu(c); };
  const br=mb.querySelector('.brand'); if(br&&br.nextSibling) mb.insertBefore(c,br.nextSibling); else mb.appendChild(c); chip();
}
function mini(){
  const m=document.createElement('div'); m.id='psMini'; m.innerHTML='<span>Practice track</span><button class="pri" id="psMPlay">▶ Play</button><button id="psMStop">■ Stop</button><button id="psMOpen">Open in Studio</button>'; document.body.appendChild(m);
  const play=document.getElementById('playBtn'), stopb=document.getElementById('stopBtn');
  document.getElementById('psMPlay').onclick=()=>play&&play.click(); document.getElementById('psMStop').onclick=()=>{ if(stopb&&!stopb.disabled) stopb.click(); }; document.getElementById('psMOpen').onclick=()=>go('studio');
  setInterval(()=>{ const t=document.getElementById('playTxt'); const b=document.getElementById('psMPlay'); if(t&&b) b.textContent=(/pause/i.test(t.textContent)?'❚❚ ':'▶ ')+t.textContent; },400);
}

function heads(){
  [['teacher','Class','Class','Ask anything. Learn by ear and by understanding.']].forEach(([p,lbl,t,sub])=>{
    const c=document.querySelector('[data-panel="'+p+'"]'); if(!c||c.querySelector('.ps-head')) return;
    const d=document.createElement('div'); d.className='ps-head'; d.innerHTML='<span class="lbl"></span><h1></h1><p></p>'; d.querySelector('.lbl').textContent=lbl; d.querySelector('h1').textContent=t; d.querySelector('p').textContent=sub;
    const bar=c.querySelector('.panel-bar'); if(bar) bar.after(d); else c.prepend(d); });
}
function back(){
  if(!hub.classList.contains('on')){ const h={class:()=>window.CLASS&&CLASS.back&&CLASS.back(),challenge:()=>window.CHALLENGE&&CHALLENGE.back&&CHALLENGE.back(),account:()=>window.ACCOUNT&&ACCOUNT.back&&ACCOUNT.back(),plus:()=>window.TXMENU&&TXMENU.close()}[cur]; try{ if(h&&h()) return; }catch(_){} }
  let t=HIST.pop(); if(t===place()) t=HIST.pop();
  navBack=true; try{ if(t==='hub'||!t) { if(!hub.classList.contains('on')) showHub(); } else go(t); } finally{ navBack=false; }
}
function addBackBtn(){
  const mb=document.querySelector('.menubar'); if(!mb||document.getElementById('psBackBtn')) return;
  const b=document.createElement('button'); b.id='psBackBtn'; b.type='button'; b.className='menu-btn'; b.textContent='←'; b.title='Back'; b.setAttribute('aria-label','Back'); b.style.cssText='font-size:18px;padding:0 10px'; b.onclick=back; mb.insertBefore(b,mb.firstChild);
}
window.SUITE={go,home:showHub,current:()=>cur,DEST,ORDER,back};


/* ---------- clear buttons + clear after an hour away ---------- */
const HOUR=3600e3, ACT='ps-active';
function busyPlaying(){ try{ return (typeof playing!=='undefined'&&playing)||(window.TX&&TX.S&&TX.S.playing); }catch(_){ return false; } }
function clearRoom(k,auto){
  try{
    if(k==='class'){ if(window.CLASS) CLASS.clearAll(auto); }
    else if(k==='plus'){ if(window.TX){ if(auto||!(TX.S.notes||[]).length||confirm('Clear the keyboard? Your saved transcriptions stay in the list below.')) TX.clear(); } }
    else if(k==='challenge'){}
    else if(typeof newTrack==='function') newTrack(auto?true:undefined);
  }catch(e){ console.log('clear',e); }
}
function clearEverything(){ ['class','plus','studio'].forEach(k=>clearRoom(k,true)); }
function idleCheck(){
  let last=0; try{ last=+localStorage.getItem(ACT)||0; }catch(_){}
  if(last&&Date.now()-last>HOUR&&!busyPlaying()){ clearEverything(); try{ localStorage.setItem(ACT,String(Date.now())); }catch(_){} }
}
function touchActive(){ try{ localStorage.setItem(ACT,String(Date.now())); }catch(_){} }
function addClear(){
  const mb=document.querySelector('.menubar'); if(!mb||document.getElementById('psClear')) return;
  const b=document.createElement('button'); b.id='psClear'; b.type='button'; b.className='menu-btn ps-clear'; b.textContent='Clear'; b.title='Clear this room (Class: board, keyboard and chat)';
  b.onclick=()=>clearRoom(cur||'studio',false); const chipEl=document.getElementById('psChip'); if(chipEl) chipEl.after(b); else mb.appendChild(b);
}

function boot(){
  addBackBtn(); addChip(); addClear(); mini(); heads();
  const first=()=>setTimeout(()=>{ idleCheck(); touchActive(); },400); if(document.readyState==='complete') first(); else window.addEventListener('load',first);
  let lt=0; ['pointerdown','keydown','touchstart','input'].forEach(ev=>document.addEventListener(ev,()=>{ const n=Date.now(); if(n-lt>20000){ lt=n; touchActive(); } },true));
  setInterval(()=>{ if(busyPlaying()) touchActive(); else idleCheck(); },60000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) idleCheck(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&hub.classList.contains('on')&&cur){ e.preventDefault(); go(cur); } },true);
  const last=get(); if(last){ cur=null; document.body.dataset.dest=last; }
  showHub();
}
// the menu bar is built by the main script on load; wait for it
function ready(n){ if(document.querySelector('.menubar')&&typeof openPanel==='function'&&document.querySelector('[data-panel="teacher"]')) boot(); else if(n<80) setTimeout(()=>ready(n+1),50); else boot(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>ready(0)); else ready(0);
})();
