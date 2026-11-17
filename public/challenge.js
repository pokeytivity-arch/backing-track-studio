/* 90 Day Challenge: practice plans, daily check-in and a certificate of consistency.
   Progress is kept in the player's account (see /api/acct in the Worker). */
(function(){
'use strict';
/* ---------- note spelling ---------- */
const LET=['C','D','E','F','G','A','B'], NAT=[0,2,4,5,7,9,11], MAJ=[0,2,4,5,7,9,11];
const KEYS=['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
function rootInfo(n){ const L=LET.indexOf(n[0]); let pc=NAT[L]; for(const c of n.slice(1)) pc+= c==='#'?1:-1; return {L,pc:((pc%12)+12)%12}; }
function spellTok(root,tok){
  const m=/^(bb|b|#)?(\d)$/.exec(tok); const acc=!m[1]?0:m[1]==='#'?1:m[1]==='b'?-1:-2, deg=+m[2], r=rootInfo(root);
  const pc=((r.pc+MAJ[(deg-1)%7]+acc)%12+12)%12, L=(r.L+deg-1)%7; let d=(((pc-NAT[L])%12)+18)%12-6;
  return LET[L]+(d>0?'♯'.repeat(d):'♭'.repeat(-d));
}
const pretty=n=>n.replace(/#/g,'♯').replace(/b(?!$)|b$/g,m=>'♭');
const prettyKey=k=>k.replace('#','♯').replace(/b$/,'♭');
function pcOf(n){ const c=n[0]; let pc=NAT[LET.indexOf(c)]; for(const ch of n.slice(1)) pc+= (ch==='♯'||ch==='#')?1:-1; return ((pc%12)+12)%12; }
const notesOf=(root,f)=>f.split(' ').map(t=>spellTok(root,t));
/* ---------- the catalogue of practice items ---------- */
const S=(id,name,f)=>({id,name,kind:'scale',f}), C=(id,name,f,sfx)=>({id,name,kind:'chord',f,sfx}), A=(id,name,q)=>({id,name,kind:'ask',q});
const P=(id,name,list,minor)=>({id,name,kind:'prog',list,minor:!!minor});
const LIBSUBS=()=>{ const out=[],seen={}; ((window.SCALELIB&&SCALELIB.list)||[]).forEach(x=>{ const nm=(x.fam==='regular'?'Regular: ':'Exotic: ')+x.grp; let g=seen[nm]; if(!g){ g=seen[nm]={name:nm,items:[]}; out.push(g); } g.items.push(S(x.id,x.name,x.deg,x.keys)); }); return out; };
const CAT=[
 {name:'Warm-Up',groups:[
  {name:'Scales',subs:[
   ...LIBSUBS(),
   {name:'Bebop scales',items:[S('sc.bbmaj','Major bebop','1 2 3 4 5 #5 6 7'),S('sc.bbdor','Dorian bebop','1 2 b3 3 4 5 6 b7'),S('sc.bbmix','Mixolydian bebop','1 2 3 4 5 6 b7 7')]}]},
  {name:'Chords',subs:[
   {name:'Triads',items:[C('ch.maj','Major triad','1 3 5',''),C('ch.min','Minor triad','1 b3 5','m'),C('ch.dim','Diminished triad','1 b3 b5','dim'),C('ch.aug','Augmented triad','1 3 #5','aug'),C('ch.sus2','Sus2 chord','1 2 5','sus2'),C('ch.sus4','Sus4 chord','1 4 5','sus4')]},
   {name:'Seventh chords',items:[C('ch.maj7','Major seventh','1 3 5 7','maj7'),C('ch.dom7','Dominant seventh','1 3 5 b7','7'),C('ch.min7','Minor seventh','1 b3 5 b7','m7'),C('ch.hd7','Half-diminished seventh','1 b3 b5 b7','m7♭5'),C('ch.dim7','Diminished seventh','1 b3 b5 bb7','dim7')]}]}]},
 {name:'Stylization',groups:[
  {name:'Voicings',items:[{id:'st.d2tri',name:'Drop-2 triads',kind:'ask',q:'Teach me drop-2 triads and how to practice them in all keys.'},{id:'st.d2sev',name:'Drop-2 seventh chords',kind:'drop2'}]},
  {name:'Techniques',items:[A('st.nbr','Neighboring chord couples','Teach me neighboring chord couples and how to practice them.')]},
  {name:'Backtracking',items:[A('st.bt1','Backtracking: 1st degree','Teach me backtracking to the 1st degree.'),A('st.bt2','Backtracking: 2nd degree','Teach me backtracking to the 2nd degree.'),A('st.bt3','Backtracking: 3rd degree','Teach me backtracking to the 3rd degree.')]},
  {name:'Cross over licks',items:[A('st.co1','Cross over lick: variation 1','Teach me cross over licks, variation 1.'),A('st.co2','Cross over lick: variation 2','Teach me cross over licks, variation 2.'),A('st.co3','Cross over lick: variation 3','Teach me cross over licks, variation 3.')]},
  {name:'Blues piano ending riff',items:[A('st.br1','Blues ending riff: variation 1','Teach me the blues piano ending riff, variation 1.'),A('st.br2','Blues ending riff: variation 2','Teach me the blues piano ending riff, variation 2.'),A('st.br3','Blues ending riff: variation 3','Teach me the blues piano ending riff, variation 3.')]}]},
 {name:'Chord progression practice',groups:[
  {name:'Primary chords',items:[A('pr.pri1','Primary chords (variation 1)','Teach me primary chords, variation 1.'),A('pr.pri2','Primary chords (variation 2)','Teach me primary chords, variation 2.')]},
  {name:'2-5-1 progressions',items:[P('pr.251maj','Major 2-5-1',[['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7'],['1','1 3 5 7','maj7']]),P('pr.251min','Minor 2-5-1',[['2','1 b3 b5 b7','m7♭5'],['5','1 3 5 b7','7'],['1','1 b3 5 b7','m7']],true)]},
  {name:'Progressions',items:[
   P('pr.251','2-5-1 progression',[['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7'],['1','1 3 5 7','maj7']]),
   P('pr.362','3-6-2 progression',[['3','1 b3 5 b7','m7'],['6','1 b3 5 b7','m7'],['2','1 b3 5 b7','m7']]),
   P('pr.s47','♯4-7-3 progression',[['#4','1 b3 b5 b7','m7♭5'],['7','1 3 5 b7','7'],['3','1 b3 5 b7','m7']]),
   P('pr.514','5-1-4 progression',[['5','1 3 5 b7','7'],['1','1 3 5 7','maj7'],['4','1 3 5 7','maj7']]),
   P('pr.625','6-2-5 progression',[['6','1 b3 5 b7','m7'],['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7']]),
   P('pr.736','7-3-6 progression',[['7','1 b3 b5 b7','m7♭5'],['3','1 3 5 b7','7'],['6','1 b3 5 b7','m7']]),
   P('pr.7362514','7-3-6-2-5-1-4 progression',[['7','1 b3 b5 b7','m7♭5'],['3','1 b3 5 b7','m7'],['6','1 b3 5 b7','m7'],['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7'],['1','1 3 5 7','maj7'],['4','1 3 5 7','maj7']]),
   P('pr.36251','3-6-2-5-1 progression',[['3','1 b3 5 b7','m7'],['6','1 b3 5 b7','m7'],['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7'],['1','1 3 5 7','maj7']]),
   P('pr.combo','7-3-6-2-5-1 + 3-6-2-5-1 progression',[['7','1 b3 b5 b7','m7♭5'],['3','1 b3 5 b7','m7'],['6','1 b3 5 b7','m7'],['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7'],['1','1 3 5 7','maj7'],['3','1 b3 5 b7','m7'],['6','1 b3 5 b7','m7'],['2','1 b3 5 b7','m7'],['5','1 3 5 b7','7'],['1','1 3 5 7','maj7']]),
   A('pr.secdom','Secondary dominant resolution','Teach me secondary dominant resolution.')]}]}
];
const ITEMS={}; (function walk(o,path){ (o.groups||o.subs||[]).forEach(g=>walk(g,path.concat(o.name))); (o.items||[]).forEach(it=>{ it.path=path.concat(o.name); ITEMS[it.id]=it; }); })({groups:CAT,name:''},[]);
CAT.forEach(c=>{ (function w(o,p){ (o.groups||o.subs||[]).forEach(g=>w(g,p.concat(g.name))); (o.items||[]).forEach(it=>{ it.cat=c.name; it.grp=p.filter(Boolean).slice(0,2).join(' › '); }); })(c,[]); });

/* ---------- the elements of a practice session: each day is a list of timed blocks ---------- */
const ELS=[
 {e:'warmup',bl:'Scales and chords from the suite',name:'Warm Up',cats:['Warm-Up'],col:'#ffa94d',ic:'🔥'},
 {e:'practice',bl:'Stylization techniques and chord progressions',name:'Practice',cats:['Stylization','Chord progression practice'],col:'#5c8dff',ic:'🎹'},
 {e:'rehearsal',bl:'A song or set you are preparing',name:'Rehearsal',ph:'What are you rehearsing? A song, a set, Sunday service…',col:'#ff6b9a',ic:'🎤'},
 {e:'breakdown',bl:'Take a song apart, part by part',name:'Song Breakdown',ph:'Which song, and which part?',col:'#c77dff',ic:'🧩'},
 {e:'break',bl:'Rest your hands and mind',name:'Break',ph:'',col:'#8ce99a',ic:'☕'},
 {e:'study',bl:'Books, lessons, theory',name:'Study',ph:'What are you studying?',col:'#4dd4ff',ic:'📖'},
 {e:'research',bl:'Look into a style, an artist or a topic',name:'Research',ph:'What are you looking into?',col:'#74c0fc',ic:'🔎'},
 {e:'listening',bl:'Listen closely to a recording',name:'Active Listening',ph:'What will you listen to? Song, artist, album…',col:'#ffd43b',ic:'🎧'},
 {e:'ear',bl:'Train your ears in the Ear Training room',name:'Ear-training',ph:'What will you train? (optional)',col:'#63e6be',ic:'👂',ear:true},
 {e:'meditation',bl:'Quiet time to reset',name:'Meditation',ph:'',col:'#b197fc',ic:'🧘'}];
const ELM={}; ELS.forEach(x=>ELM[x.e]=x);
/* the colourful board look (like the dashboard's three boards), from each element's colour */
const hexRgb=h=>{ const n=parseInt(h.slice(1),16); return [n>>16&255,n>>8&255,n&255]; };
const mixHex=(h,t,f)=>{ const a=hexRgb(h), b=hexRgb(t); return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*f).toString(16).padStart(2,'0')).join(''); };
const boardVars=E=>'--g1:'+E.col+';--g2:'+mixHex(E.col,'#0a0c16',.78)+';--gl:'+hexRgb(E.col).join(',')+';--c1:'+mixHex(E.col,'#ffffff',.35)+';--c2:'+mixHex(E.col,'#000000',.18)+';--bc:'+E.col;
/* older plans are lists of practice item ids: scales and chords become a Warm Up block, the rest a Practice block */
function normDay(d){ if(!Array.isArray(d)) return []; if(!d.some(x=>typeof x==='string')) return d.filter(x=>x&&ELM[x.e]).map(x=>({e:x.e,m:+x.m||0,items:Array.isArray(x.items)?x.items.slice():[],note:x.note||''}));
  const wu=[],pr=[],rest=[]; d.forEach(x=>{ if(typeof x==='string'){ const it=ITEMS[x]; ((it&&it.cat==='Warm-Up')?wu:pr).push(x); } else if(x&&ELM[x.e]) rest.push(x); });
  const r=[]; if(wu.length) r.push({e:'warmup',m:0,items:wu,note:''}); if(pr.length) r.push({e:'practice',m:0,items:pr,note:''}); return r.concat(rest); }
const normWeek=w=>(Array.isArray(w)?w:[]).concat([[],[],[],[],[],[],[]]).slice(0,7).map(normDay);
/* what can be ticked off: each practice item in a block, or the block itself when it has no items */
const units=bl=>{ const u=[]; bl.forEach((b,k)=>{ if(b.items&&b.items.length) b.items.forEach(i=>{ if(!u.includes(i)) u.push(i); }); else u.push('b'+k); }); return u; };
const mins=bl=>bl.reduce((a,b)=>a+(+b.m||0),0);
const fmtMin=m=>m>=60?Math.floor(m/60)+' h'+(m%60?' '+(m%60)+' min':''):m+' min';
/* ---------- account ---------- */
const TK='ps-tok';
let tok=''; try{ tok=localStorage.getItem(TK)||''; }catch(_){}
const BYPASS=false;   // for now: no sign-in needed. Progress is kept on this device until accounts are switched on (set to false).
const GK='ps-ch-guest';
let acct=null, D=null, PLANS=[], saveT=0, saving=false;
async function api(method,body){
  const r=await fetch('/api/acct',{method,headers:Object.assign({'content-type':'application/json'},tok?{authorization:'Bearer '+tok}:{}),body:body?JSON.stringify(body):undefined});
  let j={}; try{ j=await r.json(); }catch(_){} j._s=r.status; return j;
}
function emptyData(){ return {v:1,plan:null,start:null,checks:{},history:[],done:[],plans:[]}; }
async function loadAcct(){
  if(!tok) return false; const j=await api('GET'); if(j._s!==200){ if(j._s===401){ tok=''; try{ localStorage.removeItem(TK); }catch(_){} } return false; }
  acct={name:j.name,email:j.email,role:j.role}; D=Object.assign(emptyData(),j.data||{}); return true;
}
function queueSave(){ clearTimeout(saveT); saveT=setTimeout(flush,600); }
async function flush(){ if(!D) return; if(!tok){ try{ localStorage.setItem(GK,JSON.stringify({data:D,name:acct&&acct.name||''})); }catch(_){} return; } if(saving){ queueSave(); return; } saving=true; const j=await api('PUT',{data:D,name:acct&&acct.name}); saving=false; if(j._s!==200) note('Could not save just now. Check your connection.'); }
/* ---------- dates and progress ---------- */
const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const mid=s=>{ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays=(s,n)=>{ const d=mid(s); d.setDate(d.getDate()+n); return d; };
const todayStr=()=>dkey(new Date());
function dayNum(){ return Math.round((mid(todayStr())-mid(D.start))/864e5)+1; }
function dayBlocks(n){ if(!D.plan) return []; const wd=(addDays(D.start,n-1).getDay()+6)%7; return normDay(D.plan.week[wd]||[]); }
function dayItems(n){ return units(dayBlocks(n)); }
const chk=n=>D.checks[n]||(D.checks[n]={items:[],done:false});
function stats(){
  let planned=0,did=0,dp=0,dd=0;
  for(let n=1;n<=90;n++){ const it=dayItems(n); if(!it.length) continue; planned+=it.length; dp++; const c=D.checks[n]; if(c){ did+=c.items.filter(x=>it.includes(x)).length; if(c.done) dd++; } }
  const a=planned?did/planned:0, b=dp?dd/dp:0; return {pct:Math.round((a+b)/2*100),items:Math.round(a*100),days:Math.round(b*100)};
}
function missedRun(upTo){ let run=0; for(let n=1;n<=upTo;n++){ const it=dayItems(n); const ok=!it.length||(D.checks[n]&&D.checks[n].done); if(ok) run=0; else { run++; if(run>=2) return true; } } return false; }
function endAttempt(reason){ const s=stats(); D.history.unshift({plan:D.plan.name,official:!!D.plan.official,start:D.start,ended:todayStr(),reason,pct:s.pct,days:Math.min(dayNum(),90)-1}); D.plan=null; D.start=null; D.checks={}; queueSave(); }
function status(){   // 'none' | 'run' | 'complete'
  if(!D.plan||!D.start) return 'none';
  const n=dayNum(); if(n<1) return 'run';
  if(missedRun(Math.min(n-1,90))){ endAttempt('missed'); note('You missed two days in a row, so the challenge restarted. Your earlier attempt is in your history.'); return 'none'; }
  const d90=D.checks[90]&&D.checks[90].done||!dayItems(90).length&&n>=90;
  if(n>=91||(n>=90&&d90)) return 'complete';
  return 'run';
}
/* ---------- UI ---------- */
let room=null, view='home', msg='', pick=null, draft=null;
const css=document.createElement('style'); css.textContent=`
#chRoom{position:fixed;left:0;right:0;top:36px;bottom:0;z-index:150000;display:none;overflow:auto;background:var(--bg);color:var(--ink);font-family:var(--body)}
#chRoom.on{display:block}
#chRoom .w{max-width:1000px;margin:0 auto;padding:22px 18px 70px}
#chRoom h1{font:800 clamp(28px,5vw,42px)/1.05 var(--display,var(--body));margin:0 0 6px}
#chRoom h2{font:700 20px var(--display,var(--body));margin:26px 0 10px}
#chRoom .mut{color:var(--muted)}
#chRoom .box{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:12px 0}
#chRoom .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#chRoom .pgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin:14px 0}
#chRoom .pcard{position:relative;display:flex;flex-direction:column;gap:10px;min-height:470px;padding:26px 22px 22px;border-radius:26px;border:1px solid rgba(var(--gl),.45);background:linear-gradient(165deg,var(--g1) -30%,var(--g2) 62%);color:#fff;box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 3px 6px rgba(0,0,0,.5),0 26px 40px -14px rgba(0,0,0,.75);transition:box-shadow .3s,border-color .3s}
#chRoom .pcard:hover{border-color:rgba(var(--gl),.95);box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 0 0 2px rgba(var(--gl),.7),0 0 60px 4px rgba(var(--gl),.5),0 30px 50px -14px rgba(0,0,0,.8)}
#chRoom .pcard .pic{width:64px;height:64px;border-radius:19px;display:grid;place-items:center;background:linear-gradient(150deg,var(--c1),var(--c2));box-shadow:0 1px 0 rgba(255,255,255,.55) inset,0 -6px 10px rgba(0,0,0,.28) inset,0 10px 18px -4px var(--c2)}
#chRoom .pcard .pic svg{width:38px;height:38px}
#chRoom .pcard .pnm{font:800 28px/1.1 var(--display);margin-top:8px;text-shadow:0 2px 10px rgba(0,0,0,.45)}
#chRoom .pcard .pbl{margin:0;color:rgba(255,255,255,.85);font:500 16px/1.5 var(--body)}
#chRoom .pcard .pmt{margin:0;color:rgba(255,255,255,.65);font:500 14px var(--body)}
#chRoom .pcard .prow{margin-top:auto;display:flex;flex-wrap:wrap;gap:8px}
#chRoom .pcard .prow button{border-radius:999px;padding:10px 18px;font:700 14px var(--body);cursor:pointer;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff}
#chRoom .pcard .prow button.pri{background:var(--hi);color:var(--hi-ink);border-color:transparent}
@media(max-width:1100px){#chRoom .pgrid{grid-template-columns:repeat(2,minmax(0,1fr))}#chRoom .pcard{min-height:380px}}
@media(max-width:560px){#chRoom .pgrid{grid-template-columns:1fr}#chRoom .pcard{min-height:0}}
#chRoom .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
#chRoom button{font:600 14px var(--body);border-radius:999px;padding:9px 16px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
#chRoom button.pri{background:var(--accent);color:var(--accent-ink);border-color:transparent}
#chRoom button:disabled{opacity:.45;cursor:default}
#chRoom button.sm{padding:5px 11px;font-size:13px}
#chRoom input[type=text],#chRoom input[type=email],#chRoom input[type=password],#chRoom select{font:inherit;padding:10px 12px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);width:100%}
#chRoom label{display:block;font-weight:600;font-size:13px;margin:10px 0 4px}
#chRoom .msg{padding:10px 14px;border-radius:12px;background:color-mix(in srgb,var(--hi) 22%,var(--surface));border:1px solid var(--hi);margin:10px 0}
#chRoom .bar{height:12px;border-radius:99px;background:var(--line);overflow:hidden}
#chRoom .bar i{display:block;height:100%;background:var(--accent);border-radius:99px}
#chRoom .item{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--line)}
#chRoom .item:first-child{border-top:0}
#chRoom .item input{width:22px;height:22px;accent-color:var(--accent);flex:none}
#chRoom .item .nm{flex:1;font-weight:600}
#chRoom .item.done .nm{text-decoration:line-through;opacity:.6}
#chRoom .cal{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:5px}
#chRoom .cal b{aspect-ratio:1;border-radius:6px;display:grid;place-items:center;font:600 10px var(--body);background:var(--line);color:var(--muted)}
#chRoom .cal b.ok{background:var(--accent);color:var(--accent-ink)}
#chRoom .cal b.part{background:color-mix(in srgb,var(--accent) 45%,var(--line));color:var(--ink)}
#chRoom .cal b.miss{background:var(--danger);color:#fff}
#chRoom .cal b.rest{background:transparent;border:1px dashed var(--line)}
#chRoom .cal b.now{outline:2px solid var(--hi);outline-offset:1px}
#chRoom details{border:1px solid var(--line);border-radius:12px;margin:8px 0;background:var(--surface)}
#chRoom summary{cursor:pointer;padding:10px 14px;font-weight:700}
#chRoom details details{margin:6px 10px}
#chRoom .opt{display:flex;align-items:center;gap:10px;padding:7px 14px;border-top:1px solid var(--line)}
#chRoom .opt span{flex:1}
#chRoom .tabs{display:flex;gap:6px;flex-wrap:wrap}
#chRoom .tabs button.on{background:var(--accent);color:var(--accent-ink);border-color:transparent}
#chRoom .chip{display:inline-block;padding:6px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);font-weight:700;margin:3px}
#chRoom .big{font:800 38px var(--display,var(--body))}
#chRoom .blk{position:relative;background:var(--surface);border:1px solid rgba(var(--gl),.5);border-radius:16px;margin:12px 0;overflow:hidden;box-shadow:0 14px 30px -18px rgba(0,0,0,.6)}
#chRoom .blk>*:not(.bh){margin-left:14px;margin-right:14px}
#chRoom .blk>:last-child{margin-bottom:12px}
#chRoom .blk .bh{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;color:#fff;background:linear-gradient(115deg,var(--g1) -45%,var(--g2) 62%);box-shadow:0 1px 0 rgba(255,255,255,.2) inset}
#chRoom .blk .bh>*{position:relative}
#chRoom .blk .bh>.bimg{position:absolute}
#chRoom .blk .bh b{font:900 18px var(--display,var(--body));letter-spacing:-.01em;flex:1;min-width:120px}
#chRoom .blk .bh .bic{width:44px;height:44px;border-radius:13px;font-size:22px}
#chRoom .blk .bh button{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.28);color:#fff;position:relative}
#chRoom .blk .bh button:disabled{opacity:.35}
#chRoom .blk .bh .bv{position:relative;color:#fff}
#chRoom .blk .bm{position:relative;font:800 13px var(--body);padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25);color:#fff}
#chRoom .blk .bn{margin:10px 14px 0;color:var(--ink);font-weight:500}
#chRoom .blk .item{padding:9px 0;border:0;border-top:1px solid var(--line);border-radius:0;background:none;margin:0;box-shadow:none}
#chRoom .blk .bh+.item,#chRoom .blk .bn+.item{border-top:0}
#chRoom .blk .stp{display:inline-flex;align-items:center;gap:4px}
#chRoom .blk .bv{min-width:72px;text-align:center;font:800 14px var(--body);font-variant-numeric:tabular-nums}
#chRoom .blk .mv{display:inline-flex;gap:4px}
#chRoom .blk .bchips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:12px 14px 0}
#chRoom .blk .bchips .chip{margin:0;display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:13px}
#chRoom button.xs{padding:0 6px;font-size:11px;border-width:1px;line-height:18px}
#chRoom .blk .bpick{margin:10px 14px 0}
#chRoom .blk .bnote{margin:12px 14px 0;width:calc(100% - 28px)!important;max-width:620px}
#chRoom .addh{font:700 16px var(--display,var(--body));margin:20px 0 8px}
#chRoom .pal{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#chRoom .pal .pel{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;min-height:96px;padding:14px 16px;border-radius:16px;text-align:left;color:#fff;cursor:pointer;font-family:var(--body);border:1px solid rgba(var(--gl),.45);background:linear-gradient(115deg,var(--g1) -45%,var(--g2) 62%);box-shadow:0 1px 0 rgba(255,255,255,.2) inset,0 14px 30px -14px rgba(0,0,0,.7);transition:transform .2s,box-shadow .2s,border-color .2s}
#chRoom .pal .pel:hover{transform:translateY(-2px);border-color:rgba(var(--gl),.85);box-shadow:0 1px 0 rgba(255,255,255,.25) inset,0 18px 36px -14px rgba(var(--gl),.45)}
#chRoom .pal .pel:focus-visible{outline:2px solid #fff;outline-offset:2px}
#chRoom .pal .bimg,#chRoom .blk .bimg{position:absolute;top:0;right:0;bottom:0;width:58%;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.85) 0 4px,transparent 5px);background-size:20px 20px;opacity:.28;-webkit-mask-image:linear-gradient(90deg,transparent,#000 70%);mask-image:linear-gradient(90deg,transparent,#000 70%)}
#chRoom .pal .ic,#chRoom .blk .bic{position:relative;flex:none;width:52px;height:52px;border-radius:15px;display:grid;place-items:center;font-size:26px;background:linear-gradient(150deg,var(--c1),var(--c2));box-shadow:0 1px 0 rgba(255,255,255,.55) inset,0 -6px 10px rgba(0,0,0,.25) inset,0 10px 18px -6px var(--c2)}
#chRoom .pal .bt{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
#chRoom .pal .bt b{font:900 18px var(--display,var(--body));letter-spacing:-.01em}
#chRoom .pal .bt small{font-size:13px;line-height:1.35;color:rgba(255,255,255,.82)}
#chRoom .pal .go{position:relative;flex:none;font:800 13px var(--body);font-style:normal;padding:8px 12px;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25)}
#chRoom .tabs button small{font-weight:600;opacity:.75;margin-left:3px}
@media(max-width:700px){#chRoom .pal{grid-template-columns:1fr}#chRoom .pal .pel{min-height:84px}}
#chShade .tm{text-align:center;border-top:6px solid var(--bc)}
#chShade .tm .tm-top{display:flex;justify-content:space-between;align-items:center}
#chShade .tm .tm-ic{font-size:44px;margin-top:6px}
#chShade .tm h3{font:800 28px var(--display,var(--body));margin:4px 0}
#chShade .tm .tm-note{font-weight:600;margin:4px 0}
#chShade .tm .tm-t{font:800 64px/1.1 var(--display,var(--body));font-variant-numeric:tabular-nums;margin:14px 0 8px}
#chShade .tm .tm-bar{height:10px;border-radius:99px;background:var(--line);overflow:hidden;margin:0 6px 10px}
#chShade .tm .tm-bar i{display:block;height:100%;background:var(--bc);transition:width .25s linear}
#chShade .tm .tm-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:6px}
#chShade .tm .tm-done{font-size:54px}
#chShade .tm .mut{color:var(--muted)}
#chRoom .pcard .pem{font-size:34px;line-height:1}
#chRoom .pcard.on{border-color:rgba(var(--gl),1);box-shadow:0 0 0 2px rgba(var(--gl),.8),0 0 50px 2px rgba(var(--gl),.45)}
#chRoom .pcard.on:after{content:"Active";position:absolute;top:18px;right:18px;font:800 12px var(--body);letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:999px;background:var(--hi);color:var(--hi-ink)}
#chRoom button.arena{margin-top:10px;background:linear-gradient(135deg,#3dd9c4,#0f8a7a);color:#fff;border-color:transparent;font-weight:800}
#chRoom summary.gsum{display:flex;align-items:center;gap:10px}#chRoom summary.gsum>span{flex:1}#chRoom summary.gsum::before{content:'▸';font-size:12px;transition:transform .15s}#chRoom details[open]>summary.gsum::before{transform:rotate(90deg)}#chRoom summary.gsum::-webkit-details-marker{display:none}#chRoom summary.gsum{list-style:none}#chRoom summary.gsum button{flex:none}
#chShade{position:fixed;inset:0;z-index:160000;background:rgba(0,0,0,.6);display:none;place-items:center}
#chShade.on{display:grid}
#chShade .md{background:var(--surface,#fff);color:var(--ink,#111);border:1px solid var(--line);border-radius:18px;padding:20px;width:min(560px,94vw);max-height:88vh;overflow:auto;font-family:var(--body)}
#chShade button{font:600 14px var(--body);border-radius:999px;padding:8px 14px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;margin:3px 4px 3px 0}
#chShade button.pri{background:var(--accent);color:var(--accent-ink);border-color:transparent}
#chShade select{font:inherit;padding:8px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink)}
#chShade .chip{display:inline-block;padding:6px 12px;border-radius:10px;background:var(--bg);border:1px solid var(--line);font-weight:700;margin:3px}
`; document.head.appendChild(css);
const shade=document.createElement('div'); shade.id='chShade'; document.body.appendChild(shade);
shade.addEventListener('click',e=>{ if(e.target===shade) shade.classList.remove('on'); });
function el(t,c,h){ const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function note(t){ msg=t; if(room&&room.classList.contains('on')) render(); }
function mount(){ if(room) return; room=el('div'); room.id='chRoom'; document.body.appendChild(room); }
async function open(){
  mount(); room.classList.add('on'); room.innerHTML='<div class="w"><p class="mut">Loading…</p></div>';
  try{ const r=await fetch('challenge-plans.json?v=h1'); PLANS=await r.json(); }catch(_){ PLANS=[]; }
  let ok=await loadAcct();
  if(!ok&&BYPASS){ let g={}; try{ g=JSON.parse(localStorage.getItem(GK)||'{}'); }catch(_){} acct={name:g.name||(window.ACCOUNT&&ACCOUNT.name())||'',email:'guest'}; D=Object.assign(emptyData(),g.data||{}); ok=true; }
  view=ok?'home':'auth'; render();
}
function close(){ if(room) room.classList.remove('on'); shade.classList.remove('on'); try{ const c=document.querySelector('.cl-box[data-k=plan]'); if(c) setTimeout(arenaCard,50); }catch(_){} }
function render(){
  if(!room) return; room.textContent=''; const w=el('div','w'); room.appendChild(w);
  if(msg){ const m=el('div','msg',esc(msg)); w.appendChild(m); msg=''; }
  if(view==='auth'||!acct) return authView(w);
  const st=status();
  if(view==='build') return buildView(w);
  if(view==='cert') return certView(w);
  if(st==='run') return runView(w);
  if(st==='complete') return completeView(w);
  return chooseView(w);
}
function head(w,sub){
  const h=el('div','row'); h.style.justifyContent='space-between';
  const l=el('div'); l.innerHTML='<h1><button id="chBk" aria-label="Back" title="Back" style="margin-right:10px;padding:2px 12px">←</button>Practice Plan Builder</h1><div class="mut">'+esc(sub||'Practice plans to keep you going. The 90 Day Challenge is one of them.')+'</div>'; h.appendChild(l);
  l.querySelector('#chBk').onclick=()=>{ if(window.SUITE) SUITE.back(); };
  { const ar=el('button','sm arena','🎹 Practice Arena →'); ar.title='Go to the Practice Arena'; ar.onclick=()=>{ close(); if(window.SUITE) SUITE.go('hall'); }; l.appendChild(ar); }
  const r=el('div','row'); r.innerHTML='<span class="mut">'+esc(acct.name||(tok?acct.email:''))+'</span>'; const o=el('button','sm',tok?'Sign out':'Sign in'); if(!tok&&!BYPASS) o.hidden=false; o.onclick=async()=>{ if(tok) await AUTH.signOut(); tok=''; acct=null; D=null; try{ localStorage.removeItem(TK); }catch(_){} view='auth'; render(); }; if(tok) r.appendChild(o); h.appendChild(r); w.appendChild(h);
}
/* --- sign in --- */
function authView(w){
  w.innerHTML='<h1>Practice Plan Builder</h1><p class="mut">Create a free account so your plan and check-ins follow you to any phone or computer.</p>';
  const box=el('div','box au-box'); w.appendChild(box);
  AUTH.form(box,async()=>{ tok=AUTH.token(); await loadAcct();
    if(D&&!D.plan){ let g=null; try{ g=JSON.parse(localStorage.getItem(GK)||'null'); }catch(_){} if(g&&g.data&&g.data.plan){ D=Object.assign(emptyData(),g.data); flush(); } }
    view='home'; render(); });
}
/* --- choose a plan --- */
function planLen(p){ return normWeek(p.week).reduce((a,d)=>a+d.length,0); }
function planMeta(p){ const w=normWeek(p.week), n=w.reduce((a,d)=>a+d.length,0), m=w.reduce((a,d)=>a+mins(d),0); return n+' session block'+(n===1?'':'s')+' a week'+(m?' · '+fmtMin(m)+' a week':''); }
/* --- your plans: plans you build are kept as cards; activate one and it shows in the Practice Arena --- */
const newPid=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function planDesc(p){ const seen=[]; normWeek(p.week).forEach(d=>d.forEach(b=>{ const n=ELM[b.e]&&ELM[b.e].name; if(n&&!seen.includes(n)) seen.push(n); })); return seen.length?seen.join(' · '):'No elements yet.'; }
function activeId(){ return D&&D.plan&&status()==='run'?(D.plan.sid||D.plan.id):null; }
function activate(p){ const cur=activeId();
  if(cur&&cur!==p.id&&!confirm('Activate "'+p.name+'"? Your current plan, '+D.plan.name+' (Day '+Math.min(dayNum(),90)+' of 90), moves to your history.')) return;
  if(D.plan&&status()==='run'&&cur!==p.id) endAttempt('stopped');
  if(activeId()===p.id){ msg='"'+p.name+'" is already your active plan.'; render(); return; }
  startPlan({id:p.official?p.id:'mine',sid:p.id,name:p.name,official:!!p.official,week:JSON.parse(JSON.stringify(p.week))});
  msg='"'+p.name+'" is active. You will find it in the Practice Arena.'; render(); }
function plansSection(w){
  const act=activeId();
  w.appendChild(el('h2','','Your plans'));
  const g=el('div','pgrid'); w.appendChild(g);
  const mk=(p,vars,ic,blurb,meta)=>{ const c=el('div','pcard'); c.style.cssText=vars; c.innerHTML='<i class="pic">'+ic+'</i><b class="pnm"></b><p class="pbl"></p><p class="pmt"></p>'; c.querySelector('.pnm').textContent=p.name; c.querySelector('.pbl').textContent=blurb; c.querySelector('.pmt').textContent=meta; return c; };
  (D.plans||[]).forEach(p=>{ const w0=normWeek(p.week), first=w0.flat()[0], E=first?ELM[first.e]:ELS[0];
    const c=mk(p,boardVars(E),'<span class="pem">'+E.ic+'</span>',planDesc(p),planMeta(p)+'.'); if(act===p.id) c.classList.add('on');
    const r=el('div','row prow'); const a=el('button','pri',act===p.id?'Active ✓':'Activate'); a.disabled=act===p.id; a.onclick=()=>activate(p);
    const e=el('button','','Edit'); e.onclick=()=>{ draft={sid:p.id,name:p.name,official:false,week:normWeek(JSON.parse(JSON.stringify(p.week)))}; pick=0; addOpen=-1; view='build'; render(); };
    const x=el('button','','Delete'); x.onclick=()=>{ if(!confirm('Delete "'+p.name+'"?'+(act===p.id?' It stays active until you finish or stop it.':''))) return; D.plans=D.plans.filter(q=>q.id!==p.id); queueSave(); render(); };
    r.append(a,e,x); c.appendChild(r); g.appendChild(c); });
  const nb=mk({name:'Build a plan'},'--g1:#d6336c;--g2:#3d0a1f;--gl:255,130,170;--c1:#ff8a8a;--c2:#d6336c','<svg viewBox="0 0 48 48" fill="none"><path d="M24 8v32M8 24h32" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>','Build each day as a timed session: Warm Up, Practice, Rehearsal, Song Breakdown, Break, Study, Research, Active Listening, Ear-training and Meditation. It is kept here as a card; activate it and it shows in the Practice Arena.','');
  const nr=el('div','row prow'); const nbtn=el('button','pri','Open the plan builder'); nbtn.onclick=()=>{ draft={sid:null,name:'My plan',official:false,week:[[],[],[],[],[],[],[]]}; pick=0; addOpen=-1; view='build'; render(); }; nr.appendChild(nbtn); nb.appendChild(nr); g.appendChild(nb);
  w.appendChild(el('h2','','Ready-made plans'));
  const g2=el('div','pgrid'); w.appendChild(g2);
  const TONES=[['--g1:#3a62e0;--g2:#0c1650;--gl:91,140,255;--c1:#5b8cff;--c2:#2a45c9','<svg viewBox="0 0 48 48" fill="none"><path d="M6 36h5v-5h5v-5h5v-5h5v-5h5v-5h6v26H6Z" fill="#fff"/></svg>'],
    ['--g1:#e0911a;--g2:#3b2205;--gl:255,190,70;--c1:#ffd24d;--c2:#e0911a','<svg viewBox="0 0 48 48" fill="none"><rect x="5" y="9" width="38" height="30" rx="4" fill="#fff"/><path d="M14.5 9v30M24 9v30M33.5 9v30" stroke="#c9ccd6" stroke-width="1.6"/><rect x="11" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/><rect x="20.5" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/><rect x="30" y="9" width="7" height="18" rx="1.6" fill="#1b2036"/></svg>'],
    ['--g1:#8a52f0;--g2:#1c0f4a;--gl:170,120,255;--c1:#b78bff;--c2:#6a35d8','<svg viewBox="0 0 48 48" fill="none"><path d="M9 28v-4a15 15 0 0 1 30 0v4" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><rect x="5.5" y="26" width="9" height="15" rx="4" fill="#fff"/><rect x="33.5" y="26" width="9" height="15" rx="4" fill="#fff"/></svg>']];
  PLANS.forEach((p,k)=>{ const c=mk(p,TONES[k%3][0],TONES[k%3][1],p.blurb||'',planMeta(p)+'. Earns a certificate.'); if(act===p.id) c.classList.add('on');
    const r=el('div','row prow'); const st=el('button','pri',act===p.id?'Active ✓':'Activate'); st.disabled=act===p.id; st.onclick=()=>activate({id:p.id,name:p.name,official:true,week:p.week});
    const v=el('button','','Customize'); v.onclick=()=>{ draft={sid:null,name:p.name+' (my version)',official:false,week:normWeek(JSON.parse(JSON.stringify(p.week)))}; pick=0; addOpen=-1; view='build'; render(); };
    r.append(st,v); c.appendChild(r); g2.appendChild(c); });
  w.appendChild(el('p','mut','Rules: check in every day. Miss one day and you carry on. Miss two days in a row and the challenge starts again from Day 1.'));
}
function saveDraft(andActivate){ const name=(draft.name||'').trim()||'My plan', week=normWeek(draft.week); D.plans=D.plans||[];
  let p=draft.sid&&D.plans.find(q=>q.id===draft.sid); if(p){ p.name=name; p.week=week; p.at=Date.now(); } else { p={id:newPid(),name,week,at:Date.now()}; D.plans.unshift(p); }
  if(activeId()===p.id){ D.plan.name=name; D.plan.week=JSON.parse(JSON.stringify(week)); }   /* editing the active plan keeps its progress */
  queueSave(); draft=null; view='home';
  if(andActivate) activate(p); else { msg='"'+name+'" is saved in Your plans.'+(activeId()===p.id?' Your active plan is updated.':' Activate it to start.'); render(); } }
function chooseView(w){
  head(w,'Pick a plan, then check in every day for 90 days.');
  const tb=el('div'); w.appendChild(tb); teachBox(tb);
  plansSection(w);
  if(D.history.length){ w.appendChild(el('h2','','Past attempts')); const b=el('div','box'); b.innerHTML=D.history.slice(0,8).map(h=>'<div class="item"><span class="nm">'+esc(h.plan)+'</span><span class="mut">'+esc(h.start)+' · '+(h.reason==='missed'?'restarted after missed days':h.reason==='stopped'?'stopped':'completed')+' · '+h.pct+'%</span></div>').join(''); w.appendChild(b); }
}
function startPlan(p){ p.week=normWeek(p.week); D.plan=p; D.start=todayStr(); D.checks={}; queueSave(); view='home'; render(); }
/* --- running challenge --- */
function runView(w){
  const n=dayNum(), st=stats(); head(w,D.plan.name+(D.plan.official?'':' (custom plan)'));
  let streak=0; for(let k=Math.min(n,90);k>=1;k--){ const it=dayItems(k); if(!it.length||(D.checks[k]&&D.checks[k].done)) streak++; else if(k===n) continue; else break; }
  const top=el('div','box'); top.innerHTML='<div class="row" style="justify-content:space-between"><div><div class="big">Day '+Math.min(n,90)+' <span class="mut" style="font-size:20px">of 90</span></div><div class="mut">'+streak+'-day streak · dedication so far '+st.pct+'%</div></div></div><div class="bar" style="margin-top:12px"><i style="width:'+Math.round(Math.min(n,90)/90*100)+'%"></i></div>'; w.appendChild(top);
  const blocks=dayBlocks(n), items=units(blocks), c=chk(n);
  const tb=el('div','box'); tb.appendChild(el('h2','','Today'+(mins(blocks)?' <span class="mut" style="font-size:15px;font-weight:600">· '+fmtMin(mins(blocks))+' session</span>':'')));
  tb.firstChild.style.marginTop='0';
  if(!blocks.length) tb.appendChild(el('p','mut','Rest day. Nothing to check in today. Enjoy it.'));
  if(mins(blocks)&&!c.done){ const r=el('div','row'); r.style.margin='0 0 10px'; const go=el('button','pri',TMR&&TMR.day===n?'⏱ Back to my session':'▶ Start my session'); go.onclick=()=>{ if(!(TMR&&TMR.day===n)) startTimer(n); else timerView(); }; r.appendChild(go); r.appendChild(el('span','mut','A timer takes you through each block in order.')); tb.appendChild(r); }
  const tick=(key,on)=>{ if(on){ if(!c.items.includes(key)) c.items.push(key); } else c.items=c.items.filter(x=>x!==key); queueSave(); render(); };
  blocks.forEach((b,k)=>{ const E=ELM[b.e]; const bx=el('div','blk'); bx.style.cssText=boardVars(E);
    const hd=el('div','bh','<i class="bimg"></i><span class="bic">'+E.ic+'</span><b>'+esc(E.name)+'</b>'+(b.m?'<span class="bm">'+fmtMin(b.m)+'</span>':'')); bx.appendChild(hd);
    if(b.note) bx.appendChild(el('div','bn',esc(b.note)));
    if(b.items&&b.items.length) b.items.forEach(id=>{ const it=ITEMS[id]; if(!it) return; const r=el('div','item'+(c.items.includes(id)?' done':''));
      const cb=el('input'); cb.type='checkbox'; cb.checked=c.items.includes(id); cb.disabled=c.done; cb.onchange=()=>tick(id,cb.checked);
      const nm=el('span','nm',esc(it.name)+'<div class="mut" style="font-weight:400;font-size:12px">'+esc(it.grp)+'</div>'); const pb=el('button','sm','Practice'); pb.onclick=()=>sheet(it);
      r.append(cb,nm,pb); bx.appendChild(r); });
    else { const key='b'+k, r=el('div','item'+(c.items.includes(key)?' done':'')); const cb=el('input'); cb.type='checkbox'; cb.checked=c.items.includes(key); cb.disabled=c.done; cb.onchange=()=>tick(key,cb.checked);
      r.append(cb,el('span','nm','Done')); if(E.ear&&window.EAR){ const eb=el('button','sm','Open Ear Training'); eb.onclick=()=>{ close(); try{ if(window.SUITE) SUITE.go('hall'); }catch(_){} setTimeout(()=>EAR.open(),150); }; r.appendChild(eb); } bx.appendChild(r); }
    tb.appendChild(bx); });
  if(items.length){ const r=el('div','row'); r.style.marginTop='12px'; const b=el('button','pri',c.done?'Checked in for today ✓':'Check in for today'); b.disabled=c.done||!c.items.length;
    b.onclick=()=>{ c.done=true; queueSave(); note(c.items.length>=items.length?'Great work. Day '+n+' is done.':'Checked in. Day '+n+' counts, and the unfinished items lower your percentage a little.'); };
    r.appendChild(b); if(c.done){ const u=el('button','sm','Undo'); u.onclick=()=>{ c.done=false; queueSave(); render(); }; r.appendChild(u); } else r.appendChild(el('span','mut','Tick what you did, then check in.')); tb.appendChild(r); }
  w.appendChild(tb);
  w.appendChild(el('h2','','Your 90 days'));
  const cal=el('div','box'); const grid=el('div','cal'); for(let k=1;k<=90;k++){ const it=dayItems(k), cc=D.checks[k]; let cls=''; if(!it.length) cls='rest'; else if(cc&&cc.done) cls=cc.items.length>=it.length?'ok':'part'; else if(k<n) cls='miss'; const b=el('b',cls+(k===n?' now':''),String(k)); b.title='Day '+k; grid.appendChild(b); } cal.appendChild(grid);
  cal.appendChild(el('p','mut','<span style="font-size:13px">Filled = all items done · lighter = checked in with some items missed · red = missed · dashed = rest day</span>')); w.appendChild(cal);
  { const r2=el('div','row'); const sp=el('button','sm','Stop and start over'); sp.onclick=()=>{ if(confirm('Stop this challenge? It will be saved in your history and you can start again.')){ endAttempt('stopped'); render(); } }; r2.appendChild(sp); w.appendChild(r2); }
  plansSection(w);
}
/* --- the session timer: runs through the day's timed blocks in order; when a block's time is up it is ticked off --- */
let TMR=null, TMT=0;
function chime(){ try{ const AC=window.AudioContext||window.webkitAudioContext; const ac=chime.ac||(chime.ac=new AC()); if(ac.state==='suspended') ac.resume(); const t=ac.currentTime; [880,1320].forEach((f,i)=>{ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0.0001,t+i*.18); g.gain.exponentialRampToValueAtTime(.35,t+i*.18+.02); g.gain.exponentialRampToValueAtTime(.0001,t+i*.18+.9); o.connect(g); g.connect(ac.destination); o.start(t+i*.18); o.stop(t+i*.18+1); }); }catch(_){} }
function startTimer(n){ const bl=dayBlocks(n), seq=[]; bl.forEach((b,k)=>{ if(+b.m>0) seq.push(k); }); if(!seq.length) return; chime.ac||chime();
  TMR={day:n,seq,pos:0,left:bl[seq[0]].m*60,paused:false,last:Date.now(),done:false}; clearInterval(TMT); TMT=setInterval(tmTick,250); timerView(); }
function tmMark(k){ const bl=dayBlocks(TMR.day), b=bl[k], c=chk(TMR.day); if(!b||c.done) return; (b.items&&b.items.length?b.items:['b'+k]).forEach(x=>{ if(!c.items.includes(x)) c.items.push(x); }); queueSave(); }
function tmGo(d){ if(!TMR) return; const bl=dayBlocks(TMR.day); TMR.pos=Math.max(0,Math.min(TMR.seq.length,TMR.pos+d)); if(TMR.pos>=TMR.seq.length){ TMR.done=true; TMR.left=0; } else TMR.left=bl[TMR.seq[TMR.pos]].m*60; TMR.last=Date.now(); timerView(); }
function tmTick(){ if(!TMR) return; const now=Date.now(), dt=(now-TMR.last)/1000; TMR.last=now; if(TMR.paused||TMR.done){ return; }
  TMR.left-=dt; if(TMR.left<=0){ tmMark(TMR.seq[TMR.pos]); chime(); tmGo(1); if(room&&room.classList.contains('on')&&!shade.classList.contains('on')) render(); return; }
  const t=shade.querySelector('.tm-t'); if(t) t.textContent=mmss(TMR.left); const bar=shade.querySelector('.tm-bar i'); if(bar){ const b=dayBlocks(TMR.day)[TMR.seq[TMR.pos]]; bar.style.width=Math.max(0,100-TMR.left/(b.m*60)*100)+'%'; } }
const mmss=s=>{ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
function stopTimer(){ clearInterval(TMT); TMR=null; shade.classList.remove('on'); render(); }
function timerView(){ if(!TMR) return; const bl=dayBlocks(TMR.day); const m=el('div','md tm'); shade.textContent=''; shade.appendChild(m); shade.classList.add('on');
  if(TMR.done){ m.innerHTML='<div class="tm-done">🎉</div><h3>Session complete</h3><p class="mut">Every timed block is ticked off. Check in for today when you are ready.</p>'; const r=el('div','row'); const ok=el('button','pri','Back to today'); ok.onclick=()=>{ clearInterval(TMT); TMR=null; shade.classList.remove('on'); render(); }; r.appendChild(ok); m.appendChild(r); return; }
  const k=TMR.seq[TMR.pos], b=bl[k], E=ELM[b.e], nx=TMR.seq[TMR.pos+1]!=null?bl[TMR.seq[TMR.pos+1]]:null; m.style.setProperty('--bc',E.col);
  m.innerHTML='<div class="tm-top"><span class="mut">Block '+(TMR.pos+1)+' of '+TMR.seq.length+'</span><button class="sm" id="tmX">Stop session</button></div><div class="tm-ic">'+E.ic+'</div><h3>'+esc(E.name)+'</h3>'+(b.note?'<p class="tm-note">'+esc(b.note)+'</p>':'')
    +(b.items&&b.items.length?'<div class="tm-items">'+b.items.map(id=>ITEMS[id]?'<span class="chip">'+esc(ITEMS[id].name)+'</span>':'').join('')+'</div>':'')
    +'<div class="tm-t">'+mmss(TMR.left)+'</div><div class="tm-bar"><i style="width:'+Math.max(0,100-TMR.left/(b.m*60)*100)+'%"></i></div><p class="mut">'+(nx?'Next: '+ELM[nx.e].ic+' '+esc(ELM[nx.e].name)+' · '+fmtMin(nx.m):'Last block')+'</p>';
  const r=el('div','row tm-btns'); const bk=el('button','','⏮ Back'); bk.disabled=!TMR.pos; bk.onclick=()=>tmGo(-1);
  const pp=el('button','pri',TMR.paused?'▶ Resume':'❚❚ Pause'); pp.onclick=()=>{ TMR.paused=!TMR.paused; TMR.last=Date.now(); timerView(); };
  const sk=el('button','','Done, next ⏭'); sk.onclick=()=>{ tmMark(TMR.seq[TMR.pos]); tmGo(1); };
  const hide=el('button','','Hide'); hide.onclick=()=>{ shade.classList.remove('on'); render(); };
  r.append(bk,pp,sk,hide); m.appendChild(r);
  if(E.ear&&window.EAR){ const eb=el('button','sm','Open Ear Training'); eb.onclick=()=>{ shade.classList.remove('on'); close(); try{ if(window.SUITE) SUITE.go('hall'); }catch(_){} setTimeout(()=>EAR.open(),150); }; m.appendChild(eb); }
  m.querySelector('#tmX').onclick=()=>{ if(confirm('Stop this session? What is ticked off stays ticked.')) stopTimer(); }; }
/* --- complete + certificate --- */
function completeView(w){
  head(w,'You finished the 90 days.'); const st=stats(); const b=el('div','box');
  b.innerHTML='<div class="big">Dedication: '+st.pct+'%</div><p class="mut">Items completed '+st.items+'% · Days checked in '+st.days+'%</p>';
  const r=el('div','row');
  if(D.plan.official){ const c=el('button','pri','Get my certificate'); c.onclick=()=>{ view='cert'; render(); }; r.appendChild(c); }
  else b.appendChild(el('p','mut','Certificates are given for the ready-made plans. Start one to earn yours.'));
  const f=el('button','','Finish and start a new challenge'); f.onclick=()=>{ finishRun(); }; r.appendChild(f); b.appendChild(r); w.appendChild(b);
}
function makeId(){ return 'PPS-'+Math.random().toString(36).slice(2,8).toUpperCase(); }
function finishRun(){ const s=stats(); D.history.unshift({plan:D.plan.name,official:!!D.plan.official,start:D.start,ended:todayStr(),reason:'complete',pct:s.pct,days:90}); D.plan=null; D.start=null; D.checks={}; queueSave(); view='home'; render(); }
function certView(w){
  head(w,'Certificate of Consistency'); const st=stats(); D.cert=D.cert||{id:makeId()};
  const b=el('div','box'); b.innerHTML='<label>Name on the certificate</label><input type="text" id="cn" maxlength="60" value="'+esc(acct.name||'')+'">'; w.appendChild(b);
  const cv=el('canvas'); cv.width=1600; cv.height=1130; cv.style.cssText='width:100%;border-radius:12px;border:1px solid var(--line);margin-top:12px'; w.appendChild(cv);
  const draw=()=>{ const nm=b.querySelector('#cn').value.trim()||'Pianist'; certDraw(cv,nm,st.pct,D.plan.name,D.start,D.cert.id); };
  b.querySelector('#cn').oninput=()=>{ draw(); }; b.querySelector('#cn').onchange=()=>{ acct.name=b.querySelector('#cn').value.trim(); queueSave(); }; draw();
  const r=el('div','row'); r.style.marginTop='12px';
  const dl=el('button','pri','Download (PNG)'); dl.onclick=()=>{ const a=document.createElement('a'); a.href=cv.toDataURL('image/png'); a.download=(window.BRAND?BRAND.name:'HearandPlay')+'-Certificate-of-Consistency.png'; a.click(); };
  const pr=el('button','','Print'); pr.onclick=()=>{ const w2=window.open('','_blank'); if(!w2) return; w2.document.write('<title>Certificate</title><style>@page{size:landscape;margin:0}body{margin:0}img{width:100vw;display:block}</style><img src="'+cv.toDataURL('image/png')+'" onload="setTimeout(()=>print(),200)">'); w2.document.close(); };
  const bk=el('button','','Back'); bk.onclick=()=>{ view='home'; render(); }; const fin=el('button','','Finish and start a new challenge'); fin.onclick=()=>{ D.cert=null; finishRun(); };
  r.append(dl,pr,bk,fin); w.appendChild(r);
}
function certDraw(cv,name,pct,plan,start,id){
  const g=cv.getContext('2d'), W=1600, H=1130; g.clearRect(0,0,W,H);
  const bg=g.createLinearGradient(0,0,W,H); bg.addColorStop(0,'#0c1428'); bg.addColorStop(1,'#16223f'); g.fillStyle=bg; g.fillRect(0,0,W,H);
  const gold=g.createLinearGradient(0,0,W,0); gold.addColorStop(0,'#b8892a'); gold.addColorStop(.5,'#f3d77a'); gold.addColorStop(1,'#b8892a');
  g.strokeStyle=gold; g.lineWidth=10; g.strokeRect(40,40,W-80,H-80); g.lineWidth=2; g.strokeRect(64,64,W-128,H-128);
  g.textAlign='center'; g.fillStyle=gold;
  g.font='800 92px Georgia,serif'; g.fillText((window.BRAND?BRAND.name:'HearandPlay')+' Piano Suite',W/2,215);
  g.font='600 26px system-ui,sans-serif'; g.fillStyle='#c9d3ea'; g.fillText('P I A N O   ·   C H O R D S   ·   E A R   T R A I N I N G',W/2,262);
  g.fillStyle=gold; g.fillRect(W/2-120,300,240,3);
  g.fillStyle='#ffffff'; g.font='700 64px Georgia,serif'; g.fillText('Certificate of Consistency',W/2,395);
  g.fillStyle='#c9d3ea'; g.font='28px system-ui,sans-serif'; g.fillText('This certifies that',W/2,470);
  let fs=110; g.font='italic 700 '+fs+'px Georgia,serif'; while(g.measureText(name).width>W-300&&fs>50){ fs-=4; g.font='italic 700 '+fs+'px Georgia,serif'; }
  g.fillStyle=gold; g.fillText(name,W/2,585); g.fillRect(W/2-420,615,840,2);
  g.fillStyle='#c9d3ea'; g.font='28px system-ui,sans-serif'; g.fillText('completed the 90 Day Challenge with the plan',W/2,690);
  g.fillStyle='#ffffff'; g.font='700 40px Georgia,serif'; g.fillText(plan,W/2,745);
  g.fillStyle=gold; g.font='800 150px Georgia,serif'; g.fillText(pct+'%',W/2,900);
  g.fillStyle='#c9d3ea'; g.font='600 26px system-ui,sans-serif'; g.fillText('DEDICATION',W/2,942);
  const end=addDays(start,89), f=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});
  g.font='24px system-ui,sans-serif'; g.fillText(f(mid(start))+'  to  '+f(end),W/2,1000);
  g.textAlign='left'; g.font='20px system-ui,sans-serif'; g.fillStyle='#8f9bb8'; g.fillText('Certificate '+id,110,1050); g.textAlign='right'; g.fillText(window.BRAND?BRAND.site:'hearandplay.app',W-110,1050);
  g.textAlign='center'; g.fillStyle=gold; g.font='italic 40px Georgia,serif'; g.fillText(window.BRAND?BRAND.coach:'HearandPlay',W-330,1000); g.fillRect(W-470,1010,280,2);
}
/* --- plan builder: each day is a session of timed blocks --- */
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
let addOpen=-1;
function buildView(w){
  draft.week=normWeek(draft.week);
  head(w,'Plan builder'); const b=el('div','box'); b.innerHTML='<label>Plan name</label><input type="text" id="pn" maxlength="50" value="'+esc(draft.name)+'">'; w.appendChild(b);
  b.querySelector('#pn').oninput=e=>{ draft.name=e.target.value; };
  w.appendChild(el('h2','','1. Pick a day'));
  const tabs=el('div','tabs'); DAYS.forEach((d,i)=>{ const dd=draft.week[i], m=mins(dd); const t=el('button',i===pick?'on':'',d+(dd.length?' <small>'+(m?fmtMin(m):dd.length+' block'+(dd.length===1?'':'s'))+'</small>':' <small>rest</small>')); t.onclick=()=>{ pick=i; addOpen=-1; render(); }; tabs.appendChild(t); }); w.appendChild(tabs);
  const day=draft.week[pick], keepY=fn=>()=>{ const y=room.scrollTop; fn(); render(); room.scrollTop=y; };
  w.appendChild(el('h2','','2. Build '+({Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'})[DAYS[pick]]+'’s session'+(mins(day)?' <span class="mut" style="font-size:15px;font-weight:600">· '+fmtMin(mins(day))+'</span>':'')));
  const cur=el('div','blks'); w.appendChild(cur);
  if(!day.length) cur.appendChild(el('p','mut','Nothing yet, so this is a rest day. Add elements below.'));
  day.forEach((bk,k)=>{ const E=ELM[bk.e]; const bx=el('div','blk'); bx.style.cssText=boardVars(E);
    const hd=el('div','bh','<i class="bimg"></i><span class="bic">'+E.ic+'</span><b>'+esc(E.name)+'</b>'); 
    const st=el('span','stp'); const dn=el('button','sm','−'), up=el('button','sm','+'), vv=el('span','bv',bk.m?fmtMin(bk.m):'No timer');
    dn.setAttribute('aria-label','Less time'); up.setAttribute('aria-label','More time'); dn.onclick=keepY(()=>{ bk.m=Math.max(0,(+bk.m||0)-5); }); up.onclick=keepY(()=>{ bk.m=Math.min(240,(+bk.m||0)+5); }); st.append(dn,vv,up); hd.appendChild(st);
    const mv=el('span','mv'); const u=el('button','sm','↑'), d=el('button','sm','↓'), x=el('button','sm','✕'); u.title='Move up'; d.title='Move down'; x.title='Remove';
    u.disabled=!k; d.disabled=k===day.length-1; u.onclick=keepY(()=>{ [day[k-1],day[k]]=[day[k],day[k-1]]; addOpen=-1; }); d.onclick=keepY(()=>{ [day[k+1],day[k]]=[day[k],day[k+1]]; addOpen=-1; }); x.onclick=keepY(()=>{ day.splice(k,1); addOpen=-1; }); mv.append(u,d,x); hd.appendChild(mv); bx.appendChild(hd);
    if(E.cats){ const ch=el('div','bchips'); (bk.items||[]).forEach((id,i)=>{ const c=el('span','chip',esc(ITEMS[id]?ITEMS[id].name:id)+' '); const rm=el('button','xs','✕'); rm.title='Remove'; rm.onclick=keepY(()=>{ bk.items.splice(i,1); }); c.appendChild(rm); ch.appendChild(c); });
      const ad=el('button','sm',addOpen===k?'Done adding':'+ Add '+(E.e==='warmup'?'scales and chords':'techniques and progressions')); ad.onclick=keepY(()=>{ addOpen=addOpen===k?-1:k; }); ch.appendChild(ad); bx.appendChild(ch);
      if(addOpen===k){ const pickBox=el('div','bpick');
        const idsOf=o=>{ const out=[]; (o.subs||o.groups||[]).forEach(x=>out.push(...idsOf(x))); (o.items||[]).forEach(it=>out.push(it.id)); return out; };
        const redraw=()=>{ const y=room.scrollTop; const open=[...pickBox.querySelectorAll('details')].map(z=>z.open); render(); room.scrollTop=y; const pb=room.querySelector('.bpick'); if(pb) [...pb.querySelectorAll('details')].forEach((z,i)=>{ if(open[i]) z.open=true; }); };
        const groupBtn=o=>{ const ids=idsOf(o); bk.items=bk.items||[]; const all=ids.length&&ids.every(i=>bk.items.includes(i)); const bt=el('button','sm'+(all?' pri':''),all?'Added ✓':'+ Add all '+ids.length); bt.type='button'; bt.title=all?'Remove all of these':'Add all of these';
          bt.onclick=e=>{ e.preventDefault(); e.stopPropagation(); if(all) bk.items=bk.items.filter(z=>!ids.includes(z)); else ids.forEach(i=>{ if(!bk.items.includes(i)) bk.items.push(i); }); redraw(); }; return bt; }; CAT.filter(c=>E.cats.includes(c.name)).forEach(c=>{ const fill=(box,o)=>{ (o.subs||o.groups||[]).forEach(s2=>{ const dd=el('details'); const sm=el('summary','gsum','<span>'+esc(s2.name)+'</span>'); sm.appendChild(groupBtn(s2)); dd.appendChild(sm); fill(dd,s2); box.appendChild(dd); }); (o.items||[]).forEach(it=>{ const r=el('div','opt'); r.appendChild(el('span','',esc(it.name))); const on=(bk.items||[]).includes(it.id); const bt=el('button','sm'+(on?' pri':''),on?'Added ✓':'+ Add'); bt.onclick=()=>{ bk.items=bk.items||[]; const y=room.scrollTop; if(bk.items.includes(it.id)) bk.items=bk.items.filter(z=>z!==it.id); else bk.items.push(it.id); const open=[...pickBox.querySelectorAll('details')].map(z=>z.open); render(); room.scrollTop=y; const pb=room.querySelector('.bpick'); if(pb) [...pb.querySelectorAll('details')].forEach((z,i)=>{ if(open[i]) z.open=true; }); }; r.appendChild(bt); box.appendChild(r); }); };
          if(E.cats.length>1){ const dd=el('details'); dd.open=true; const sm=el('summary','gsum','<span>'+esc(c.name)+'</span>'); sm.appendChild(groupBtn(c)); dd.appendChild(sm); fill(dd,c); pickBox.appendChild(dd); } else fill(pickBox,c); }); bx.appendChild(pickBox); } }
    else { const inp=el('input'); inp.type='text'; inp.maxLength=200; inp.className='bnote'; inp.placeholder=E.ph||'Notes (optional)'; inp.value=bk.note||''; inp.oninput=()=>{ bk.note=inp.value; }; bx.appendChild(inp); }
    cur.appendChild(bx); });
  w.appendChild(el('h3','addh','Add an element'));
  const pal=el('div','pal'); ELS.forEach(E=>{ const bt=el('button','pel','<i class="bimg dots"></i><span class="ic">'+E.ic+'</span><span class="bt"><b>'+esc(E.name)+'</b><small>'+esc(E.bl)+'</small></span><em class="go">Add →</em>'); bt.type='button'; bt.style.cssText=boardVars(E); bt.onclick=keepY(()=>{ day.push({e:E.e,m:10,items:[],note:''}); addOpen=E.cats?day.length-1:-1; }); pal.appendChild(bt); }); w.appendChild(pal);
  const cp=el('div','row'); cp.style.marginTop='12px'; const all=el('button','sm','Copy this day to every day'); all.onclick=keepY(()=>{ const src=JSON.stringify(day); draft.week=draft.week.map(()=>JSON.parse(src)); }); const clr=el('button','sm','Clear this day'); clr.onclick=keepY(()=>{ draft.week[pick]=[]; addOpen=-1; }); cp.append(all,clr); w.appendChild(cp);
  const r=el('div','row'); r.style.marginTop='22px';
  const total=draft.week.reduce((a,d)=>a+d.length,0);
  const go=el('button','pri',draft.target?'Send to '+draft.target.name:'Save plan'); go.disabled=!total;
  go.onclick=draft.target?async()=>{ go.disabled=true; const j=await apiT('plset',{id:draft.target.id,name:draft.name.trim()||'Practice plan',week:draft.week}); if(j._s===200){ msg='Plan sent to '+draft.target.name+'.'; draft=null; view='home'; render(); } else { go.disabled=false; alert('Could not send the plan. Try again.'); } }:()=>saveDraft(false);
  const cn=el('button','','Cancel'); cn.onclick=()=>{ view='home'; render(); }; r.append(go);
  if(!draft.target){ const ga=el('button','',activeId()&&draft.sid===activeId()?'Save (stays active)':'Save and activate'); ga.disabled=!total; ga.onclick=()=>saveDraft(true); r.appendChild(ga); } r.appendChild(cn); w.appendChild(r);
  if(!total) w.appendChild(el('p','mut','Add at least one element to a day to save the plan.'));
  w.appendChild(el('p','mut','Plans you build or change are tracked like any other, but only the ready-made plans earn a certificate.'));
}
/* --- teachers and students: practice plans --- */
async function apiT(act,body){ const r=await fetch('/api/teach/'+act,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(body||{})}); let j={}; try{ j=await r.json(); }catch(_){} j._s=r.status; return j; }
function planStats(c){ const D0=D; D={plan:c.plan,start:c.start,checks:c.checks||{},history:[],done:[]}; try{ if(!D.plan||!D.start) return null; const st=stats(); return {pct:st.pct,items:st.items,days:st.days,day:Math.max(1,dayNum())}; } catch(_){ return null; } finally{ D=D0; } }
async function teachBox(box){
  if(!tok||!acct||!acct.role||acct.role==='none') return;
  if(acct.role==='student'){
    const j=await apiT('plmine'); if(j._s!==200||!j.teachers||!j.teachers.length) return;
    const b=el('div','box'); b.appendChild(el('h2','','From my teacher'));
    (j.plans||[]).forEach(pl=>{ const r=el('div','item'); r.innerHTML='<span class="nm">'+esc(pl.name)+' <span class="mut">from '+esc(pl.teacher)+(pl.note?' · '+esc(pl.note):'')+'</span></span>'; const g=el('button','pri sm','Start this plan'); g.onclick=()=>startPlan({id:'teacher',name:pl.name,official:false,week:pl.week}); const c=el('button','sm','Customize'); c.onclick=()=>{ draft={id:'mine',name:pl.name+' (my version)',official:false,week:pl.week.map(d=>d.slice())}; pick=0; view='build'; render(); }; r.append(g,c); b.appendChild(r); });
    if(!(j.plans||[]).length) b.appendChild(el('p','mut','Your teacher has not sent a plan yet.'));
    j.teachers.forEach(t=>{ const r=el('div','row'); const q=el('button','sm',t.asked?'Requested, waiting for '+t.name:'Ask '+t.name+' for a practice plan'); q.disabled=!!t.asked; q.onclick=async()=>{ q.disabled=true; const k=await apiT('plreq',{code:t.code}); q.textContent=k._s===200?'Requested, waiting for '+t.name:'Try again'; if(k._s!==200) q.disabled=false; }; r.appendChild(q); b.appendChild(r); });
    box.appendChild(b); return;
  }
  if(acct.role==='teacher'){
    const j=await apiT('plstudents'); if(j._s!==200) return;
    const b=el('div','box'); b.appendChild(el('h2','','My students'));
    if(!j.students.length) b.appendChild(el('p','mut','No students yet. Share your teacher code so they can join.'));
    j.students.forEach(st=>{ const r=el('div','item'); r.innerHTML='<span class="nm">'+esc(st.name||'Student')+' <span class="mut">'+(st.plan?'Plan: '+esc(st.plan):'No plan yet')+(st.request?' · asked for a plan':'')+'</span></span>';
      const m=el('button','pri sm','Make a plan'); m.onclick=()=>{ draft={id:'mine',name:'Practice plan for '+(st.name||'student'),official:false,week:[[],[],[],[],[],[],[]],target:{id:st.id,name:st.name||'student'}}; pick=0; view='build'; render(); };
      const v=el('button','sm','See progress'); v.onclick=async()=>{ v.disabled=true; const p=await apiT('plprogress',{id:st.id}); v.disabled=false; if(p._s!==200) return; const old=r.nextSibling&&r.nextSibling.className==='tprog'?r.nextSibling:null; if(old){ old.remove(); return; } const d=el('div','tprog'); const ps=planStats(p.challenge); let h='<p><b>90 Day Challenge:</b> '+(ps?esc(p.challenge.plan.name)+', day '+Math.min(ps.day,90)+' of 90. Practice items done '+ps.items+'%, days finished '+ps.days+'%.':'not started.')+'</p>';
        h+='<p><b>Practice plan you sent:</b> '+(p.sent?esc(p.sent.name)+', sent '+esc(new Date(p.sent.at).toLocaleDateString()):'none yet')+'</p>'; if(p.challenge.history&&p.challenge.history.length) h+='<p class="mut">Past attempts: '+p.challenge.history.map(x=>esc(x.plan)+' '+esc(x.pct)+'%').join('; ')+'</p>'; d.innerHTML=h; r.after(d); };
      r.append(m,v); b.appendChild(r); });
    box.appendChild(b);
  }
}
/* --- practice sheet: notes in any key, hear them, show them on the Class keyboard, ask HearandPlay --- */
let keyPick='C';
function midiOf(name,base){ let m=base+pcOf(name); return m; }
function stepsFrom(list,mode){ // list of {name,notes:[names]}
  return list.map(x=>{ const base=60, rootPc=pcOf(x.notes[0]); const mids=[]; let last=base+rootPc-(rootPc>5?12:0); x.notes.forEach((n,i)=>{ let m=base+pcOf(n)-(rootPc>5?12:0); while(i&&m<=last) m+=12; mids.push(m); last=m; });
    return mode==='chord'?{src:'challenge',name:x.name,lh:[mids[0]-24],rh:mids,fing:'',lfing:''}:{src:'challenge',name:x.name,lh:[],rh:[mids[0]],fing:'',lfing:''}; });
}
function sheet(it){
  const m=el('div','md'); shade.textContent=''; shade.appendChild(m); shade.classList.add('on');
  const draw=()=>{
    m.innerHTML='<div style="display:flex;justify-content:space-between;align-items:start"><div><div style="font:800 22px var(--display,var(--body))">'+esc(it.name)+'</div><div style="color:var(--muted);font-size:13px">'+esc(it.grp||'')+'</div></div><button id="x">Close</button></div>';
    const kind=it.kind; let list=null, mode='note';
    if(kind!=='ask'){ const row=el('div','',''); row.style.margin='12px 0'; const KS=it.keys?KEYS.filter(k=>it.keys.includes(k)):KEYS; if(!KS.includes(keyPick)) keyPick=KS[0]; row.innerHTML='Key: <select id="k">'+KS.map(k=>'<option value="'+k+'"'+(k===keyPick?' selected':'')+'>'+prettyKey(k)+(it.minor?' minor':'')+'</option>').join('')+'</select>'; m.appendChild(row); row.querySelector('#k').onchange=e=>{ keyPick=e.target.value; draw(); }; }
    const out=el('div'); m.appendChild(out);
    if(kind==='scale'){ const ns=notesOf(keyPick,it.f); out.innerHTML=ns.concat([ns[0]]).map(n=>'<span class="chip">'+n+'</span>').join('')+'<p style="color:var(--muted);font-size:13px">Formula: '+esc(it.f.replace(/b/g,'♭').replace(/#/g,'♯'))+'</p>'; list=ns.concat([ns[0]]).map(n=>({name:n,notes:[n]})); mode='note'; }
    else if(kind==='chord'){ const ns=notesOf(keyPick,it.f); out.innerHTML='<div style="font:700 20px var(--body);margin-bottom:6px">'+prettyKey(keyPick)+esc(it.sfx)+'</div>'+ns.map(n=>'<span class="chip">'+n+'</span>').join(''); list=[{name:prettyKey(keyPick)+it.sfx,notes:ns}]; mode='chord'; }
    else if(kind==='prog'){ const roots=it.list.map(x=>spellTok(keyPick,x[0])); out.innerHTML=roots.map(n=>'<span class="chip">'+n+'</span>').join('<span style="color:var(--muted)">→</span>')+'<p style="color:var(--muted);font-size:13px">The numbers of this progression as root notes in the key of '+prettyKey(keyPick)+(it.minor?' minor':'')+'. Ask HearandPlay how to play it.</p>'; list=roots.map(n=>({name:n,notes:[n]})); mode='note'; }
    else if(kind==='drop2'){ const T=[['Major seventh','1 3 5 7','maj7'],['Dominant seventh','1 3 5 b7','7'],['Minor seventh','1 b3 5 b7','m7'],['Half-diminished','1 b3 b5 b7','m7♭5'],['Diminished seventh','1 b3 b5 bb7','dim7']]; list=T.map(([n,f,s])=>{ const ns=notesOf(keyPick,f); return {name:prettyKey(keyPick)+s,notes:[ns[2],ns[0],ns[1],ns[3]]}; }); out.innerHTML='<p style="color:var(--muted);font-size:13px">Drop-2: take the close-position chord and drop its second note from the top down an octave.</p>'+list.map(c=>'<div style="margin:6px 0"><b>'+esc(c.name)+'</b> &nbsp; '+c.notes.map(n=>'<span class="chip">'+n+'</span>').join('')+'</div>').join(''); mode='chord'; }
    else { out.innerHTML='<p>This technique is taught by HearandPlay in the Class. Tap below and HearandPlay will walk you through it.</p>'; }
    const btns=el('div'); btns.style.marginTop='12px';
    if(list&&window.CLASS&&CLASS.sound){ const h=el('button','','▶ Hear it'); h.onclick=()=>{ list.forEach((x,i)=>{ const st=stepsFrom([x],mode)[0]; (st.rh||[]).forEach(mi=>CLASS.sound(mi,mode==='chord'?1.2:.5,.8,i*(mode==='chord'?1.0:0.42))); }); }; btns.appendChild(h); }
    if(list&&window.CLASS&&CLASS.loadSteps){ const k=el('button','','Show on keyboard'); k.onclick=()=>{ shade.classList.remove('on'); room.classList.remove('on'); if(window.SUITE) SUITE.go('class'); setTimeout(()=>CLASS.loadSteps(it.name+' in '+prettyKey(keyPick),stepsFrom(list,mode)),400); }; btns.appendChild(k); }
    const ask=el('button','pri','Ask HearandPlay about this'); ask.onclick=()=>{ shade.classList.remove('on'); room.classList.remove('on'); if(window.SUITE) SUITE.go('class'); setTimeout(()=>{ if(window.CLASS&&CLASS.ask) CLASS.ask(it.q||('Teach me '+it.name+' and how to practice it.')); },500); }; btns.appendChild(ask);
    m.appendChild(btns); m.querySelector('#x').onclick=()=>shade.classList.remove('on'); };
  draw();
}
window.addEventListener('pagehide',()=>{ if(D&&!tok){ try{ localStorage.setItem(GK,JSON.stringify({data:D,name:acct&&acct.name||''})); }catch(_){} } });
function back(){ if(!room||!room.classList.contains('on')) return false; if(shade.classList.contains('on')){ shade.classList.remove('on'); return true; } if(view==='build'||view==='cert'){ view='home'; render(); return true; } return false; }
/* for a teacher's suite: the plan open now, and starting a plan a teacher put in their suite */
const planNow=()=>D&&D.plan?JSON.parse(JSON.stringify(D.plan)):null;
async function startWith(p){ await open(); setTimeout(()=>{ try{ if(p&&p.week) startPlan(JSON.parse(JSON.stringify(p))); }catch(_){} },400); }
/* --- the active plan as a card in the Practice Arena (next to Ear training, Scale Practice and Chord Practice) --- */
async function peek(){ try{ if(!D||!acct){ let ok=false; try{ tok=localStorage.getItem(TK)||tok; }catch(_){} if(tok) ok=await loadAcct(); if(!ok&&BYPASS){ let g={}; try{ g=JSON.parse(localStorage.getItem(GK)||'{}'); }catch(_){} acct={name:g.name||'',email:'guest'}; D=Object.assign(emptyData(),g.data||{}); } }
  if(!D||!D.plan||!D.start) return null; const st=status(); if(st!=='run') return st==='complete'?{name:D.plan.name,complete:true}:null;
  const n=dayNum(), bl=dayBlocks(n), c=D.checks[n]; return {name:D.plan.name,day:Math.min(n,90),mins:mins(bl),blocks:bl.length,done:!!(c&&c.done)}; }catch(_){ return null; } }
let arenaBusy=false;
async function arenaCard(){ const four=document.querySelector('#clHome .cl-four'); if(!four) return;
  let c=four.querySelector('.cl-box[data-k=plan]');
  if(!c){ c=document.createElement('button'); c.type='button'; c.className='cl-box'; c.dataset.k='plan'; c.style.cssText='--g1:#12b886;--g2:#06302a;--gl:60,220,170;--c1:#63e6be;--c2:#0ca678';
    c.innerHTML='<div class="ph plan-ph"></div><div class="tx"><i class="ic">'+((window.SUITE&&SUITE.icons&&SUITE.icons.challenge)||'🏆')+'</i><b></b><span></span><em class="go">Open →</em></div>';
    c.onclick=()=>{ if(window.SUITE) SUITE.go('challenge'); }; four.appendChild(c);
    c.addEventListener('pointermove',e=>{ const r=c.getBoundingClientRect(); c.style.setProperty('--mx',(e.clientX-r.left)+'px'); c.style.setProperty('--my',(e.clientY-r.top)+'px'); }); }
  const set=(t,s,g)=>{ c.querySelector('b').textContent=t; c.querySelector('span').textContent=s; c.querySelector('.go').textContent=g; };
  if(!c.dataset.filled) set('Practice Plan Builder','Build a practice plan, then activate it here.','Open →');
  if(arenaBusy) return; arenaBusy=true; const p=await peek(); arenaBusy=false; c.dataset.filled='1';
  if(!p) set('Practice Plan Builder','Build a practice plan, then activate it to see it here every day.','Build a plan →');
  else if(p.complete) set(p.name,'All 90 days done. Collect your certificate.','Open →');
  else set(p.name,'Day '+p.day+' of 90 · '+(p.done?'Today is done ✓':p.blocks?'Today: '+(p.mins?fmtMin(p.mins)+' session':p.blocks+' block'+(p.blocks===1?'':'s')):'Rest day'),p.done?'Open →':'Start today →'); }
const arenaCss=document.createElement('style'); arenaCss.textContent=`
body:not([data-area=hall]) .cl-box[data-k=plan]{display:none!important}
body[data-area=hall] #clHome .cl-four{grid-template-columns:repeat(4,minmax(0,1fr))!important}
@media(max-width:1000px){ body[data-area=hall] #clHome .cl-four{grid-template-columns:repeat(2,minmax(0,1fr))!important} }
.cl-box .plan-ph{background:radial-gradient(circle at 70% 30%,rgba(99,230,190,.55),transparent 60%),radial-gradient(circle,rgba(255,255,255,.75) 0 4px,transparent 5px) 0 0/22px 22px;opacity:.9}
.cl-box[data-k=plan] .ic svg{width:33px;height:33px}`; document.head.appendChild(arenaCss);
{ let last=''; const chk=()=>{ const a=document.body.dataset.area||''; if(a==='hall'&&last!=='hall') arenaCard(); last=a; }; new MutationObserver(chk).observe(document.body,{attributes:true,attributeFilter:['data-area']}); window.addEventListener('ps-auth',()=>{ if(room&&room.classList.contains('on')) return; D=null; acct=null; tok=''; try{ tok=localStorage.getItem(TK)||''; }catch(_){} if(document.body.dataset.area==='hall') arenaCard(); }); setTimeout(chk,800); }
window.CHALLENGE={open,close,back,planNow,startWith,peek,arenaCard};
})();
