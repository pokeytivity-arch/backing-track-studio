/* Sign-in for the whole suite. One account, one of three types: Student, Teacher, or Prefer not to say.
   Shares the sign-in token with the 90 Day Challenge (localStorage "ps-tok"). */
(function(){
'use strict';
const TK='ps-tok';
let tok=''; try{ tok=localStorage.getItem(TK)||''; }catch(_){}
let me=null;
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
async function api(method,body){
  const r=await fetch('/api/acct',{method,headers:Object.assign({'content-type':'application/json'},tok?{authorization:'Bearer '+tok}:{}),body:body?JSON.stringify(body):undefined});
  let j={}; try{ j=await r.json(); }catch(_){} j._s=r.status; return j;
}
async function post(path,body){
  const r=await fetch('/api/teach/'+path,{method:'POST',headers:Object.assign({'content-type':'application/json'},tok?{authorization:'Bearer '+tok}:{}),body:JSON.stringify(body||{})});
  let j={}; try{ j=await r.json(); }catch(_){} j._s=r.status; return j;
}
function emit(){ try{ window.dispatchEvent(new CustomEvent('ps-auth',{detail:me})); }catch(_){} }
function setMe(j){ me=j&&j.email?{name:j.name||'',email:j.email,role:j.role||'none',teachers:j.teachers||[],tcode:j.tcode||null,pending:j.pending||0}:null; emit(); }
let readyP=null;
function ready(){ if(!readyP) readyP=(async()=>{ if(!tok) return null; const j=await api('GET'); if(j._s===200) setMe(j); else if(j._s===401){ tok=''; try{ localStorage.removeItem(TK); }catch(_){} } return me; })(); return readyP; }
async function refresh(){ const j=await api('GET'); if(j._s===200) setMe(j); return me; }
async function setRole(role){ const j=await api('PUT',{role}); if(j._s===200) setMe(j); return j._s===200; }
async function signOut(){ try{ await api('POST',{action:'logout'}); }catch(_){} tok=''; try{ localStorage.removeItem(TK); }catch(_){} me=null; emit(); }

const ROLE_INFO=[['student','Student','Join a teacher with their code and send them your test results.'],['teacher','Teacher','Get a teacher code, see your students’ results and send announcements.'],['none','Prefer not to say','Use the suite on your own. No teacher links, results or announcements.']];
const ERR={bad_email:'That email does not look right.',weak_password:'Use a password with at least 6 characters.',exists:'An account with that email already exists. Sign in instead.',wrong:'Email or password is not right. If you forgot it, ask Pokey to reset it.',slow_down:'Too many tries today. Please try again tomorrow.'};
/* draws the sign-in / create-account form into a container; onDone(user) runs when signed in */
function form(box,onDone,opts){
  opts=opts||{}; let mode=opts.mode||'in', role=opts.role||'student'; 
  const draw=()=>{
    box.textContent=''; const tabs=el('div','au-tabs'); [['in','Sign in'],['up','Create account']].forEach(([k,t])=>{ const b=el('button',k===mode?'on':'',t); b.type='button'; b.onclick=()=>{ mode=k; draw(); }; tabs.appendChild(b); }); box.appendChild(tabs);
    const f={}; const field=(id,label,type,ph)=>{ const l=el('label',null,label); const i=el('input'); i.type=type; i.placeholder=ph||''; i.id='au_'+id; i.autocomplete=type==='password'?(mode==='up'?'new-password':'current-password'):type==='email'?'email':'name'; f[id]=i; box.append(l,i); return i; };
    if(mode==='up') field('name','Your name','text','Your name');
    field('email','Email','email','you@example.com'); field('pw','Password','password','At least 6 characters');
    if(mode==='up'){ box.appendChild(el('label',null,'I am a…')); const g=el('div','au-roles'); ROLE_INFO.forEach(([k,t,d])=>{ const l=el('label','au-role'); const r=el('input'); r.type='radio'; r.name='au_role'; r.value=k; r.checked=k===role; r.onchange=()=>{ role=k; }; const s=el('span'); s.append(el('b',null,t),el('small',null,d)); l.append(r,s); g.appendChild(l); }); box.appendChild(g); }
    const er=el('div','au-err'); er.setAttribute('aria-live','polite'); const go=el('button','au-go',mode==='up'?'Create account':'Sign in'); go.type='button';
    const run=async()=>{ go.disabled=true; er.textContent='';
      const j=await api('POST',{action:mode==='up'?'signup':'login',email:f.email.value,password:f.pw.value,name:mode==='up'?f.name.value:'',role:mode==='up'?role:undefined}); go.disabled=false;
      if(j.token){ tok=j.token; try{ localStorage.setItem(TK,tok); }catch(_){} readyP=Promise.resolve(null); setMe(j); readyP=Promise.resolve(me); try{ if(j.name) localStorage.setItem('ps-name',j.name); }catch(_){} if(onDone) onDone(me); return; }
      er.textContent=ERR[j.error]||'Could not reach the server. Try again.'; };
    go.onclick=run; box.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='radio') run(); }); box.append(er,go);
  }; draw();
}
const css=document.createElement('style'); css.textContent=`
.au-box{display:grid;gap:8px;max-width:440px}.au-tabs{display:flex;gap:6px;margin-bottom:4px}.au-tabs button{flex:1;min-height:44px;border-radius:999px;border:1.5px solid var(--line,#3a4a74);background:transparent;color:inherit;font:700 15px inherit;cursor:pointer}.au-tabs button.on{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);border-color:transparent}
.au-box label{font-weight:600;font-size:13px;margin-top:4px}.au-box input[type=text],.au-box input[type=email],.au-box input[type=password]{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line,#3a4a74);background:transparent;color:inherit;width:100%;box-sizing:border-box}
.au-roles{display:grid;gap:8px}.au-role{display:flex!important;gap:10px;align-items:flex-start;padding:10px 12px;border:1.5px solid var(--line,#3a4a74);border-radius:14px;cursor:pointer;margin:0!important}.au-role input{margin-top:4px}.au-role span{display:grid;gap:2px}.au-role b{font-size:15px}.au-role small{font-weight:500;font-size:13px;opacity:.75}
.au-err{color:#ff8a92;min-height:1.2em;font-size:14px}.au-go{min-height:48px;border-radius:999px;border:0;background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);font:800 16px inherit;cursor:pointer}.au-go:disabled{opacity:.5}
#auPop{position:fixed;inset:0;z-index:500000;display:grid;place-items:center;padding:16px;background:rgba(4,6,12,.75);overflow:auto}#auPop>div{width:min(480px,100%);background:var(--surface,#141a2c);color:var(--ink,#fff);border:1.5px solid var(--line,#3a4a74);border-radius:20px;padding:22px;display:grid;gap:12px;font-family:var(--body,system-ui)}#auPop h2{margin:0;font:800 22px var(--display,var(--body,system-ui))}#auPop p{margin:0;opacity:.8;font-size:15px}#auPop .au-x{justify-self:start;min-height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line,#3a4a74);background:transparent;color:inherit;font:600 14px inherit;cursor:pointer}
`; document.head.appendChild(css);
function open(opts){
  opts=opts||{}; return new Promise(res=>{ const old=document.getElementById('auPop'); if(old) old.remove();
    const pop=el('div'); pop.id='auPop'; const card=el('div'); pop.appendChild(card); card.append(el('h2',null,opts.title||'Sign in to continue')); if(opts.why) card.appendChild(el('p',null,opts.why));
    const box=el('div','au-box'); card.appendChild(box); const x=el('button','au-x','Not now'); x.type='button'; x.onclick=()=>{ pop.remove(); res(null); }; card.appendChild(x);
    form(box,u=>{ pop.remove(); res(u); },opts); document.body.appendChild(pop); const f=pop.querySelector('input'); if(f) f.focus(); });
}
window.AUTH={refresh,ready,user:()=>me,token:()=>tok,open,form,signOut,setRole,post,api,ROLE_INFO};
ready();
})();
