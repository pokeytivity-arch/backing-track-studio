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
const CAT=[
 {name:'Warm-Up',groups:[
  {name:'Scales',subs:[
   {name:'Traditional scales',items:[S('sc.major','Natural major scale','1 2 3 4 5 6 7'),S('sc.nminor','Natural minor scale','1 2 b3 4 5 b6 b7'),S('sc.mmin','Melodic minor scale','1 2 b3 4 5 6 7'),S('sc.hmin','Harmonic minor scale','1 2 b3 4 5 b6 7')]},
   {name:'Pentatonic scales',items:[S('sc.pmaj','Major pentatonic','1 2 3 5 6'),S('sc.pmin','Minor pentatonic','1 b3 4 5 b7'),S('sc.pmajb','Major pentatonic blues','1 2 b3 3 5 6'),S('sc.pminb','Minor pentatonic blues','1 b3 4 b5 5 b7')]},
   {name:'Hexatonic scales',items:[A('sc.hex1','Hexatonic scale (first version)','Teach me the hexatonic scale, first version.'),A('sc.hex2','Hexatonic scale (second version)','Teach me the hexatonic scale, second version.')]},
   {name:'Octatonic scale',items:[S('sc.oct1','Octatonic whole-half','1 2 b3 4 b5 b6 6 7'),S('sc.oct2','Octatonic half-whole','1 b2 b3 3 #4 5 6 b7')]},
   {name:'Authentic modes',items:[S('sc.ion','Ionian','1 2 3 4 5 6 7'),S('sc.dor','Dorian','1 2 b3 4 5 6 b7'),S('sc.phr','Phrygian','1 b2 b3 4 5 b6 b7'),S('sc.lyd','Lydian','1 2 3 #4 5 6 7'),S('sc.mix','Mixolydian','1 2 3 4 5 6 b7'),S('sc.aeo','Aeolian','1 2 b3 4 5 b6 b7'),S('sc.loc','Locrian','1 b2 b3 4 b5 b6 b7')]},
   {name:'Synthetic modes',items:[S('sc.ukd','Ukrainian Dorian','1 2 b3 #4 5 6 b7'),S('sc.sph','Spanish Phrygian','1 b2 3 4 5 b6 b7'),S('sc.lyd7','Lydian dominant','1 2 3 #4 5 6 b7'),S('sc.mixb6','Mixolydian ♭6','1 2 3 4 5 b6 b7'),S('sc.sloc','Super Locrian','1 b2 b3 b4 b5 b6 b7')]},
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

/* ---------- account ---------- */
const TK='ps-tok';
let tok=''; try{ tok=localStorage.getItem(TK)||''; }catch(_){}
let acct=null, D=null, PLANS=[], saveT=0, saving=false;
async function api(method,body){
  const r=await fetch('/api/acct',{method,headers:Object.assign({'content-type':'application/json'},tok?{authorization:'Bearer '+tok}:{}),body:body?JSON.stringify(body):undefined});
  let j={}; try{ j=await r.json(); }catch(_){} j._s=r.status; return j;
}
function emptyData(){ return {v:1,plan:null,start:null,checks:{},history:[],done:[]}; }
async function loadAcct(){
  if(!tok) return false; const j=await api('GET'); if(j._s!==200){ if(j._s===401){ tok=''; try{ localStorage.removeItem(TK); }catch(_){} } return false; }
  acct={name:j.name,email:j.email}; D=Object.assign(emptyData(),j.data||{}); return true;
}
function queueSave(){ clearTimeout(saveT); saveT=setTimeout(flush,600); }
async function flush(){ if(!tok||!D) return; if(saving){ queueSave(); return; } saving=true; const j=await api('PUT',{data:D,name:acct&&acct.name}); saving=false; if(j._s!==200) note('Could not save just now. Check your connection.'); }
/* ---------- dates and progress ---------- */
const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const mid=s=>{ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays=(s,n)=>{ const d=mid(s); d.setDate(d.getDate()+n); return d; };
const todayStr=()=>dkey(new Date());
function dayNum(){ return Math.round((mid(todayStr())-mid(D.start))/864e5)+1; }
function dayItems(n){ if(!D.plan) return []; const wd=(addDays(D.start,n-1).getDay()+6)%7; return D.plan.week[wd]||[]; }
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
  try{ const r=await fetch('challenge-plans.json'); PLANS=await r.json(); }catch(_){ PLANS=[]; }
  const ok=await loadAcct(); view=ok?'home':'auth'; render();
}
function close(){ if(room) room.classList.remove('on'); shade.classList.remove('on'); }
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
  const l=el('div'); l.innerHTML='<h1>90 Day Challenge</h1><div class="mut">'+esc(sub||'Practice a little every day. Stay consistent.')+'</div>'; h.appendChild(l);
  const r=el('div','row'); r.innerHTML='<span class="mut">'+esc(acct.name||acct.email)+'</span>'; const o=el('button','sm','Sign out'); o.onclick=async()=>{ await api('POST',{action:'logout'}); tok=''; acct=null; D=null; try{ localStorage.removeItem(TK); }catch(_){} view='auth'; render(); }; r.appendChild(o); h.appendChild(r); w.appendChild(h);
}
/* --- sign in --- */
function authView(w){
  w.innerHTML='<h1>90 Day Challenge</h1><p class="mut">Create a free account so your plan and check-ins follow you to any phone or computer.</p>';
  let mode='in'; const box=el('div','box'); box.style.maxWidth='440px'; w.appendChild(box);
  const draw=()=>{ box.innerHTML='<div class="tabs"><button class="'+(mode==='in'?'on':'')+'" id="a1">Sign in</button><button class="'+(mode==='up'?'on':'')+'" id="a2">Create account</button></div>'+(mode==='up'?'<label>Your name (shown on your certificate)</label><input type="text" id="an" maxlength="60" autocomplete="name">':'')+'<label>Email</label><input type="email" id="ae" autocomplete="email"><label>Password (6 or more characters)</label><input type="password" id="ap" autocomplete="'+(mode==='up'?'new-password':'current-password')+'"><p id="aerr" class="mut" style="color:var(--danger)"></p><button class="pri" id="ago">'+(mode==='up'?'Create account':'Sign in')+'</button><p class="mut" style="font-size:13px">Forgot your password? Ask Pokey\'s team to reset it for you.</p>';
    box.querySelector('#a1').onclick=()=>{ mode='in'; draw(); }; box.querySelector('#a2').onclick=()=>{ mode='up'; draw(); };
    const go=async()=>{ const b=box.querySelector('#ago'), er=box.querySelector('#aerr'); b.disabled=true; er.textContent='';
      const j=await api('POST',{action:mode==='up'?'signup':'login',email:box.querySelector('#ae').value,password:box.querySelector('#ap').value,name:mode==='up'?box.querySelector('#an').value:''}); b.disabled=false;
      if(j.token){ tok=j.token; try{ localStorage.setItem(TK,tok); }catch(_){} acct={name:j.name,email:j.email}; D=Object.assign(emptyData(),j.data||{}); view='home'; render(); return; }
      const T={bad_email:'That email does not look right.',weak_password:'Use a password with at least 6 characters.',exists:'An account with that email already exists. Sign in instead.',wrong:'Email or password is not right.',slow_down:'Too many tries today. Please try again tomorrow.'}; er.textContent=T[j.error]||'Something went wrong. Please try again.'; };
    box.querySelector('#ago').onclick=go; box.querySelector('#ap').onkeydown=e=>{ if(e.key==='Enter') go(); }; };
  draw();
}
/* --- choose a plan --- */
function planLen(p){ return p.week.reduce((a,d)=>a+d.length,0); }
function chooseView(w){
  head(w,'Pick a plan, then check in every day for 90 days.');
  w.appendChild(el('h2','','Ready-made plans'));
  const g=el('div','grid'); w.appendChild(g);
  PLANS.forEach(p=>{
    const c=el('div','box'); c.innerHTML='<div style="font-weight:800;font-size:18px">'+esc(p.name)+'</div><p class="mut">'+esc(p.blurb||'')+'</p><p class="mut" style="font-size:13px">'+planLen(p)+' practice items a week. Earns a certificate.</p>';
    const r=el('div','row'); const s=el('button','pri','Start this plan'); s.onclick=()=>startPlan({id:p.id,name:p.name,official:true,week:p.week});
    const v=el('button','','Customize'); v.onclick=()=>{ draft={id:'mine',name:p.name+' (my version)',official:false,week:p.week.map(d=>d.slice())}; pick=0; view='build'; render(); };
    r.append(s,v); c.appendChild(r); g.appendChild(c); });
  const mine=el('div','box'); mine.innerHTML='<div style="font-weight:800;font-size:18px">Build my own plan</div><p class="mut">Choose your own warm-ups, techniques and progressions for each day of the week. Your progress is tracked, but certificates are for the ready-made plans.</p>';
  const mb=el('button','','Open the plan builder'); mb.onclick=()=>{ draft={id:'mine',name:'My plan',official:false,week:[[],[],[],[],[],[],[]]}; pick=0; view='build'; render(); }; mine.appendChild(mb); g.appendChild(mine);
  const note2=el('p','mut','Rules: check in every day. Miss one day and you carry on. Miss two days in a row and the challenge starts again from Day 1.'); w.appendChild(note2);
  if(D.history.length){ w.appendChild(el('h2','','Past attempts')); const b=el('div','box'); b.innerHTML=D.history.slice(0,8).map(h=>'<div class="item"><span class="nm">'+esc(h.plan)+'</span><span class="mut">'+esc(h.start)+' · '+(h.reason==='missed'?'restarted after missed days':h.reason==='stopped'?'stopped':'completed')+' · '+h.pct+'%</span></div>').join(''); w.appendChild(b); }
}
function startPlan(p){ D.plan=p; D.start=todayStr(); D.checks={}; queueSave(); view='home'; render(); }
/* --- running challenge --- */
function runView(w){
  const n=dayNum(), st=stats(); head(w,D.plan.name+(D.plan.official?'':' (custom plan)'));
  let streak=0; for(let k=Math.min(n,90);k>=1;k--){ const it=dayItems(k); if(!it.length||(D.checks[k]&&D.checks[k].done)) streak++; else if(k===n) continue; else break; }
  const top=el('div','box'); top.innerHTML='<div class="row" style="justify-content:space-between"><div><div class="big">Day '+Math.min(n,90)+' <span class="mut" style="font-size:20px">of 90</span></div><div class="mut">'+streak+'-day streak · dedication so far '+st.pct+'%</div></div></div><div class="bar" style="margin-top:12px"><i style="width:'+Math.round(Math.min(n,90)/90*100)+'%"></i></div>'; w.appendChild(top);
  const items=dayItems(n), c=chk(n);
  const tb=el('div','box'); tb.appendChild(el('h2','','Today'));
  tb.firstChild.style.marginTop='0';
  if(!items.length) tb.appendChild(el('p','mut','Rest day. Nothing to check in today. Enjoy it.'));
  items.forEach(id=>{ const it=ITEMS[id]; if(!it) return; const r=el('div','item'+(c.items.includes(id)?' done':''));
    const cb=el('input'); cb.type='checkbox'; cb.checked=c.items.includes(id); cb.disabled=c.done; cb.onchange=()=>{ if(cb.checked){ if(!c.items.includes(id)) c.items.push(id); } else c.items=c.items.filter(x=>x!==id); queueSave(); render(); };
    const nm=el('span','nm',esc(it.name)+'<div class="mut" style="font-weight:400;font-size:12px">'+esc(it.grp)+'</div>'); const pb=el('button','sm','Practice'); pb.onclick=()=>sheet(it);
    r.append(cb,nm,pb); tb.appendChild(r); });
  if(items.length){ const r=el('div','row'); r.style.marginTop='12px'; const b=el('button','pri',c.done?'Checked in for today ✓':'Check in for today'); b.disabled=c.done||!c.items.length;
    b.onclick=()=>{ c.done=true; queueSave(); note(c.items.length===items.length?'Great work. Day '+n+' is done.':'Checked in. Day '+n+' counts, and the unfinished items lower your percentage a little.'); };
    r.appendChild(b); if(c.done){ const u=el('button','sm','Undo'); u.onclick=()=>{ c.done=false; queueSave(); render(); }; r.appendChild(u); } else r.appendChild(el('span','mut','Tick what you practiced, then check in.')); tb.appendChild(r); }
  w.appendChild(tb);
  w.appendChild(el('h2','','Your 90 days'));
  const cal=el('div','box'); const grid=el('div','cal'); for(let k=1;k<=90;k++){ const it=dayItems(k), cc=D.checks[k]; let cls=''; if(!it.length) cls='rest'; else if(cc&&cc.done) cls=cc.items.length>=it.length?'ok':'part'; else if(k<n) cls='miss'; const b=el('b',cls+(k===n?' now':''),String(k)); b.title='Day '+k; grid.appendChild(b); } cal.appendChild(grid);
  cal.appendChild(el('p','mut','<span style="font-size:13px">Filled = all items done · lighter = checked in with some items missed · red = missed · dashed = rest day</span>')); w.appendChild(cal);
  const r2=el('div','row'); const sp=el('button','sm','Stop and start over'); sp.onclick=()=>{ if(confirm('Stop this challenge? It will be saved in your history and you can start again.')){ endAttempt('stopped'); render(); } }; r2.appendChild(sp); w.appendChild(r2);
}
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
  const dl=el('button','pri','Download (PNG)'); dl.onclick=()=>{ const a=document.createElement('a'); a.href=cv.toDataURL('image/png'); a.download='Pokeytivity-Certificate-of-Consistency.png'; a.click(); };
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
  g.font='800 92px Georgia,serif'; g.fillText('Pokeytivity Piano Suite',W/2,215);
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
  g.textAlign='left'; g.font='20px system-ui,sans-serif'; g.fillStyle='#8f9bb8'; g.fillText('Certificate '+id,110,1050); g.textAlign='right'; g.fillText('app.pokeytivity.com',W-110,1050);
  g.textAlign='center'; g.fillStyle=gold; g.font='italic 40px Georgia,serif'; g.fillText('Pokey',W-330,1000); g.fillRect(W-470,1010,280,2);
}
/* --- plan builder --- */
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function buildView(w){
  head(w,'Plan builder'); const b=el('div','box'); b.innerHTML='<label>Plan name</label><input type="text" id="pn" maxlength="50" value="'+esc(draft.name)+'">'; w.appendChild(b);
  b.querySelector('#pn').oninput=e=>{ draft.name=e.target.value; };
  w.appendChild(el('h2','','1. Pick a day, then add items'));
  const tabs=el('div','tabs'); DAYS.forEach((d,i)=>{ const t=el('button',i===pick?'on':'',d+' ('+draft.week[i].length+')'); t.onclick=()=>{ pick=i; render(); }; tabs.appendChild(t); }); w.appendChild(tabs);
  const cur=el('div','box'); cur.appendChild(el('div','','<b>'+DAYS[pick]+'</b> practice list'));
  if(!draft.week[pick].length) cur.appendChild(el('p','mut','Nothing yet. This will be a rest day. Add items from the list below.'));
  draft.week[pick].forEach((id,k)=>{ const r=el('div','item'); r.appendChild(el('span','nm',esc(ITEMS[id]?ITEMS[id].name:id))); const up=el('button','sm','↑'); up.onclick=()=>{ if(k){ const a=draft.week[pick]; [a[k-1],a[k]]=[a[k],a[k-1]]; render(); } }; const rm=el('button','sm','Remove'); rm.onclick=()=>{ draft.week[pick].splice(k,1); render(); }; r.append(up,rm); cur.appendChild(r); });
  const cp=el('div','row'); cp.style.marginTop='8px'; const all=el('button','sm','Copy this day to every day'); all.onclick=()=>{ draft.week=draft.week.map(()=>draft.week[pick].slice()); render(); }; const clr=el('button','sm','Clear this day'); clr.onclick=()=>{ draft.week[pick]=[]; render(); }; cp.append(all,clr); cur.appendChild(cp); w.appendChild(cur);
  w.appendChild(el('h2','','Practice items'));
  const addBtn=it=>{ const bt=el('button','sm','+ Add'); bt.onclick=()=>{ if(!draft.week[pick].includes(it.id)) draft.week[pick].push(it.id); const y=room.scrollTop; render(); room.scrollTop=y; }; return bt; };
  CAT.forEach(c=>{ const d=el('details'); d.appendChild(el('summary','',esc(c.name))); const fill=(box,o)=>{ (o.subs||o.groups||[]).forEach(s=>{ const dd=el('details'); dd.appendChild(el('summary','',esc(s.name))); fill(dd,s); box.appendChild(dd); }); (o.items||[]).forEach(it=>{ const r=el('div','opt'); r.appendChild(el('span','',esc(it.name))); r.appendChild(addBtn(it)); box.appendChild(r); }); }; fill(d,c); w.appendChild(d); });
  const r=el('div','row'); r.style.marginTop='18px';
  const total=draft.week.reduce((a,d)=>a+d.length,0);
  const go=el('button','pri','Start my 90 days'); go.disabled=!total; go.onclick=()=>{ startPlan({id:'mine',name:draft.name.trim()||'My plan',official:false,week:draft.week}); };
  const cn=el('button','','Cancel'); cn.onclick=()=>{ view='home'; render(); }; r.append(go,cn); w.appendChild(r);
  if(!total) w.appendChild(el('p','mut','Add at least one practice item to start.'));
  w.appendChild(el('p','mut','Plans you build or change are tracked like any other, but only the ready-made plans earn a certificate.'));
}
/* --- practice sheet: notes in any key, hear them, show them on the Class keyboard, ask Pokey --- */
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
    if(kind!=='ask'){ const row=el('div','',''); row.style.margin='12px 0'; row.innerHTML='Key: <select id="k">'+KEYS.map(k=>'<option value="'+k+'"'+(k===keyPick?' selected':'')+'>'+prettyKey(k)+(it.minor?' minor':'')+'</option>').join('')+'</select>'; m.appendChild(row); row.querySelector('#k').onchange=e=>{ keyPick=e.target.value; draw(); }; }
    const out=el('div'); m.appendChild(out);
    if(kind==='scale'){ const ns=notesOf(keyPick,it.f); out.innerHTML=ns.concat([ns[0]]).map(n=>'<span class="chip">'+n+'</span>').join('')+'<p style="color:var(--muted);font-size:13px">Formula: '+esc(it.f.replace(/b/g,'♭').replace(/#/g,'♯'))+'</p>'; list=ns.concat([ns[0]]).map(n=>({name:n,notes:[n]})); mode='note'; }
    else if(kind==='chord'){ const ns=notesOf(keyPick,it.f); out.innerHTML='<div style="font:700 20px var(--body);margin-bottom:6px">'+prettyKey(keyPick)+esc(it.sfx)+'</div>'+ns.map(n=>'<span class="chip">'+n+'</span>').join(''); list=[{name:prettyKey(keyPick)+it.sfx,notes:ns}]; mode='chord'; }
    else if(kind==='prog'){ const roots=it.list.map(x=>spellTok(keyPick,x[0])); out.innerHTML=roots.map(n=>'<span class="chip">'+n+'</span>').join('<span style="color:var(--muted)">→</span>')+'<p style="color:var(--muted);font-size:13px">The numbers of this progression as root notes in the key of '+prettyKey(keyPick)+(it.minor?' minor':'')+'. Ask Pokey how to play it.</p>'; list=roots.map(n=>({name:n,notes:[n]})); mode='note'; }
    else if(kind==='drop2'){ const T=[['Major seventh','1 3 5 7','maj7'],['Dominant seventh','1 3 5 b7','7'],['Minor seventh','1 b3 5 b7','m7'],['Half-diminished','1 b3 b5 b7','m7♭5'],['Diminished seventh','1 b3 b5 bb7','dim7']]; list=T.map(([n,f,s])=>{ const ns=notesOf(keyPick,f); return {name:prettyKey(keyPick)+s,notes:[ns[2],ns[0],ns[1],ns[3]]}; }); out.innerHTML='<p style="color:var(--muted);font-size:13px">Drop-2: take the close-position chord and drop its second note from the top down an octave.</p>'+list.map(c=>'<div style="margin:6px 0"><b>'+esc(c.name)+'</b> &nbsp; '+c.notes.map(n=>'<span class="chip">'+n+'</span>').join('')+'</div>').join(''); mode='chord'; }
    else { out.innerHTML='<p>This technique is taught by Pokey in the Class. Tap below and Pokey will walk you through it.</p>'; }
    const btns=el('div'); btns.style.marginTop='12px';
    if(list&&window.CLASS&&CLASS.sound){ const h=el('button','','▶ Hear it'); h.onclick=()=>{ list.forEach((x,i)=>{ const st=stepsFrom([x],mode)[0]; (st.rh||[]).forEach(mi=>CLASS.sound(mi,mode==='chord'?1.2:.5,.8,i*(mode==='chord'?1.0:0.42))); }); }; btns.appendChild(h); }
    if(list&&window.CLASS&&CLASS.loadSteps){ const k=el('button','','Show on keyboard'); k.onclick=()=>{ shade.classList.remove('on'); room.classList.remove('on'); if(window.SUITE) SUITE.go('class'); setTimeout(()=>CLASS.loadSteps(it.name+' in '+prettyKey(keyPick),stepsFrom(list,mode)),400); }; btns.appendChild(k); }
    const ask=el('button','pri','Ask Pokey about this'); ask.onclick=()=>{ shade.classList.remove('on'); room.classList.remove('on'); if(window.SUITE) SUITE.go('class'); setTimeout(()=>{ if(window.CLASS&&CLASS.ask) CLASS.ask(it.q||('Teach me '+it.name+' and how to practice it.')); },500); }; btns.appendChild(ask);
    m.appendChild(btns); m.querySelector('#x').onclick=()=>shade.classList.remove('on'); };
  draw();
}
window.CHALLENGE={open,close};
})();
