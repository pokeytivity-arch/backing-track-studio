/* assign.js: notes typed by a teacher (left hand / right hand) shown on a keyboard, and the student's Teachers & assignments panel.
   Typing: C  C#  Cb  C##  Cbb  (x also means double sharp). An octave number is optional: C4 is middle C.
   With no number the first note of a hand starts in a default octave (left hand 3, right hand 4) and each next note goes up from the one before it. */
(function(){
'use strict';
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const LH='#1c7ed6', RH='#f76707';
const BASE={C:0,D:2,E:4,F:5,G:7,A:9,B:11}, PCW=[0,2,4,5,7,9,11], WHITE_PC=new Set(PCW);
const SYM={'#':'♯','##':'𝄪','x':'𝄪','b':'♭','bb':'𝄫'};
function parse(text,hand){
  const out=[], bad=[]; let prev=null;
  String(text||'').replace(/[♯]/g,'#').replace(/[♭]/g,'b').replace(/𝄪/g,'x').replace(/𝄫/g,'bb').split(/[\s,;|]+/).filter(Boolean).forEach(tok=>{
    /* a dot between notes lifts the next note one octave: C.E is a tenth, C.A a thirteenth, C..E a seventeenth */
    const parts=tok.split(/(\.+)/).filter(x=>x!==''); let up=0;
    parts.forEach(part=>{
      if(/^\.+$/.test(part)){ up+=part.length; return; }
      const m=/^([A-Ga-g])(##|bb|x|X|#|b)?(-?\d)?$/.exec(part);
      if(!m){ bad.push(tok); return; }
      const L=m[1].toUpperCase(), acc=m[2]?m[2].toLowerCase():'', d=acc==='#'?1:acc==='##'||acc==='x'?2:acc==='b'?-1:acc==='bb'?-2:0;
      let midi;
      if(m[3]!=null) midi=12*(+m[3]+1)+BASE[L]+d;
      else if(prev==null) midi=12*((hand==='lh'?3:4)+1)+BASE[L]+d+12*up;
      else { midi=BASE[L]+d+12*Math.floor(prev/12); while(midi<=prev) midi+=12; while(midi-12>prev) midi-=12; midi+=12*up; }
      up=0;
      if(midi<21||midi>108){ bad.push(tok); return; }
      prev=midi; out.push({midi,label:L+(SYM[acc]||''),hand});
    });
  });
  return {notes:out,bad};
}
/* steps: [{label,lh,rh}] -> [{label,notes:[...],bad:[...]}] */
function build(steps){
  return (steps||[]).map(s=>{ const a=parse(s.lh,'lh'), b=parse(s.rh,'rh'); return {label:s.label||'',notes:a.notes.concat(b.notes),bad:a.bad.concat(b.bad)}; });
}
const isBlack=m=>!WHITE_PC.has(((m%12)+12)%12);
function keyboard(steps,cur,w,range){
  const all=[]; steps.forEach(s=>s.notes.forEach(n=>all.push(n.midi)));
  let lo=all.length?Math.min.apply(null,all):48, hi=all.length?Math.max.apply(null,all):72;
  lo=Math.floor((lo-2)/12)*12; hi=Math.ceil((hi+3)/12)*12-1; if(hi-lo<23) hi=lo+23; lo=Math.max(24,lo); hi=Math.min(108,hi); if(range){ lo=range[0]; hi=range[1]; }
  const whites=[]; for(let m=lo;m<=hi;m++) if(!isBlack(m)) whites.push(m);
  const W=w||760, kw=W/whites.length, H=Math.max(110,Math.min(170,kw*5)), BH=H*.62, bw=kw*.6;
  const pos={}; whites.forEach((m,i)=>pos[m]=i*kw);
  const lit={}; (steps[cur]?steps[cur].notes:[]).forEach(n=>lit[n.midi]=n);
  const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox','0 0 '+W+' '+(H+4)); svg.setAttribute('width','100%'); svg.style.maxWidth=W+'px'; svg.style.display='block';
  const add=(tag,at,txt)=>{ const e=document.createElementNS(NS,tag); for(const k in at) e.setAttribute(k,at[k]); if(txt!=null) e.textContent=txt; svg.appendChild(e); return e; };
  whites.forEach(m=>{ const n=lit[m]; add('rect',{x:pos[m]+.5,y:1,width:kw-1,height:H,rx:3,fill:n?(n.hand==='lh'?LH:RH):'#f4f1e8',stroke:'#222','stroke-width':1}); if(n) add('text',{x:pos[m]+kw/2,y:H-8,'text-anchor':'middle','font-size':Math.max(10,Math.min(15,kw*.5)),'font-weight':800,fill:'#fff','font-family':'system-ui,sans-serif'},n.label); else if(m%12===0) add('text',{x:pos[m]+kw/2,y:H-6,'text-anchor':'middle','font-size':Math.max(8,Math.min(11,kw*.36)),fill:'#777','font-family':'system-ui,sans-serif'},'C'+(m/12-1)); });
  for(let m=lo;m<=hi;m++) if(isBlack(m)){ const wl=pos[m-1]; if(wl==null) continue; const n=lit[m], x=wl+kw-bw/2; add('rect',{x,y:1,width:bw,height:BH,rx:2,fill:n?(n.hand==='lh'?LH:RH):'#15181f',stroke:'#000'}); if(n) add('text',{x:x+bw/2,y:BH-8,'text-anchor':'middle','font-size':Math.max(8,Math.min(12,bw*.55)),'font-weight':800,fill:'#fff','font-family':'system-ui,sans-serif'},n.label); }
  return svg;
}
/* a chart viewer: step chips, keyboard, optional sound. Returns a DOM node. */
function chartView(steps){
  const wrap=el('div','as-chart'), data=build(steps); let cur=0;
  const chips=el('div','as-chips'), kb=el('div'), row=el('div','as-row');
  const draw=()=>{ kb.textContent=''; kb.appendChild(keyboard(data,cur)); [...chips.children].forEach((c,i)=>c.classList.toggle('on',i===cur)); };
  data.forEach((s,i)=>{ const b=el('button','as-chip'); b.type='button'; b.onclick=()=>{ cur=i; draw(); play(); }; const t=el('span',null,s.label||('Step '+(i+1))); b.appendChild(t);
    const l=data[i].notes.filter(n=>n.hand==='lh').map(n=>n.label).join(' '), r=data[i].notes.filter(n=>n.hand==='rh').map(n=>n.label).join(' ');
    if(l) b.appendChild(el('small','as-l','LH '+l)); if(r) b.appendChild(el('small','as-r','RH '+r)); chips.appendChild(b); });
  const play=()=>{ if(!(window.CLASS&&CLASS.sound)) return; (data[cur]?data[cur].notes:[]).forEach((n,j)=>CLASS.sound(n.midi,1.4,.8,j*.02)); };
  const pb=el('button','as-btn','▶ Hear this step'); pb.type='button'; pb.onclick=play;
  const lg=el('span','as-leg'); lg.innerHTML='<i style="background:'+LH+'"></i> Left hand <i style="background:'+RH+'"></i> Right hand';
  if(window.CLASS&&CLASS.sound) row.appendChild(pb); row.appendChild(lg);
  wrap.append(chips,kb,row); draw(); wrap.setCur=i=>{ cur=i; draw(); }; return wrap;
}
const css=el('style'); css.textContent=`
.as-chips{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.as-chip{display:grid;gap:2px;text-align:left;padding:8px 12px;border-radius:12px;border:1.5px solid var(--line,#3a4a74);background:transparent;color:inherit;font:700 14px system-ui,sans-serif;cursor:pointer;min-width:84px}.as-chip.on{border-color:var(--hi,#ffd43b);background:rgba(255,212,59,.12)}.as-chip small{font:600 12px ui-monospace,Menlo,monospace}.as-l{color:#6db3ff}.as-r{color:#ff9a4a}
.as-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px;font-size:13px}.as-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin:0 4px 0 8px}
.as-btn{min-height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line,#3a4a74);background:transparent;color:inherit;font:700 14px system-ui,sans-serif;cursor:pointer}.as-btn.pri{background:var(--hi,#ffd43b);color:var(--hi-ink,#151b28);border:0}
.as-box{display:grid;gap:12px}.as-card{border:1.5px solid var(--line,#3a4a74);border-radius:16px;padding:14px;display:grid;gap:8px}.as-card h3{margin:0;font:800 17px system-ui,sans-serif}.as-mut{color:var(--muted,#9aa6c0);font-size:14px}.as-tag{font:700 11px system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#9aa6c0)}
.as-in{font:600 16px system-ui,sans-serif;padding:11px 12px;border-radius:12px;border:1.5px solid var(--line,#3a4a74);background:transparent;color:inherit;width:min(260px,100%)}
#asPop{position:fixed;inset:0;z-index:500000;display:grid;place-items:center;padding:14px;background:rgba(4,6,12,.78);overflow:auto}#asPop>div{width:min(820px,100%);max-height:92vh;overflow:auto;background:var(--surface,#141a2c);color:var(--ink,#fff);border:1.5px solid var(--line,#3a4a74);border-radius:20px;padding:20px}
`; document.head.appendChild(css);

/* ---------- the student's panel: teachers (with requests) and assignments ---------- */
function mount(host){
  host.textContent=''; const A=window.AUTH; if(!A){ host.textContent='Not available right now.'; return; }
  const u=A.user(); const box=el('div','as-box'); host.appendChild(box);
  if(!u){ box.appendChild(el('p','as-mut','Sign in with a Student account to join a teacher and see assignments.')); return; }
  if(u.role==='teacher'){ box.appendChild(el('p','as-mut','You have a Teacher account. Your students, requests and assignments are on the teacher page.')); const b=el('button','as-btn pri','Open teacher page'); b.type='button'; b.onclick=()=>window.open('teacher.html','_blank','noopener'); box.appendChild(b); if(u.pending){ box.appendChild(el('p',null,u.pending+' student'+(u.pending===1?' is':'s are')+' waiting for you to accept.')); } return; }
  if(u.role!=='student'){ box.appendChild(el('p','as-mut','Teachers and assignments are for Student accounts. Change your account type to Student to use them.')); return; }
  const tt=el('div','as-card'); tt.appendChild(el('h3',null,'Your teachers')); box.appendChild(tt);
  const list=u.teachers||[];
  if(!list.length) tt.appendChild(el('p','as-mut','You have not added a teacher yet. Ask your teacher for their code.'));
  list.forEach(t=>{ const r=el('div','as-row'); r.appendChild(el('b',null,t.name)); r.appendChild(el('span','as-mut',t.status==='active'?'Connected':'Waiting for '+t.name+' to accept')); const x=el('button','as-btn',t.status==='active'?'Remove':'Cancel request'); x.type='button'; x.onclick=async()=>{ await A.post('leave',{code:t.code}); await A.refresh(); mount(host); }; r.appendChild(x); tt.appendChild(r); });
  const add=el('div','as-row'), code=el('input','as-in'); code.placeholder='Teacher code'; code.setAttribute('aria-label','Teacher code'); code.autocapitalize='characters'; code.autocomplete='off'; code.maxLength=12;
  const go=el('button','as-btn pri','Add teacher'); go.type='button'; const msg=el('div','as-mut'); msg.setAttribute('aria-live','polite');
  go.onclick=async()=>{ if(!code.value.trim()){ msg.textContent='Enter the code.'; return; } go.disabled=true; msg.textContent='Sending request…'; const j=await A.post('join',{code:code.value}); go.disabled=false;
    if(j.ok){ await A.refresh(); mount(host); return; } msg.textContent=j.error==='no_code'?'That code was not found. Check it with your teacher.':j.error==='already'?'You already added this teacher.':'Could not send the request. Try again.'; };
  code.onkeydown=e=>{ if(e.key==='Enter') go.onclick(); }; add.append(code,go); tt.append(add,msg);
  tt.appendChild(el('p','as-mut','A teacher has to accept your request before you see their assignments or they see your results.'));
  const as=el('div','as-card'); as.appendChild(el('h3',null,'Assignments')); box.appendChild(as);
  if(!list.some(t=>t.status==='active')){ as.appendChild(el('p','as-mut','Assignments appear here once a teacher accepts you.')); return; }
  as.appendChild(el('p','as-mut','Loading…'));
  A.post('mine').then(j=>{ as.textContent=''; as.appendChild(el('h3',null,'Assignments'));
    if(!j.items){ as.appendChild(el('p','as-mut','Could not load assignments. Check your connection.')); return; }
    if(!j.items.length){ as.appendChild(el('p','as-mut','Nothing assigned yet.')); return; }
    j.items.forEach(it=>{ const c=el('div','as-card'); c.appendChild(el('div','as-tag',(it.kind==='chart'?'Chord chart':it.kind==='ear'?'Ear training':'Exercise')+' · from '+it.teacher+' · '+new Date(it.at).toLocaleDateString())); c.appendChild(el('h3',null,it.title)); if(it.note) c.appendChild(el('p',null,it.note));
      const sp=it.spec||{};
      if(it.kind==='chart') c.appendChild(chartView(sp.steps));
      else if(it.kind==='ear'){ const bits=[sp.area&&('Area: '+sp.area),sp.mode&&('Mode: '+sp.mode)].filter(Boolean).join(' · '); if(bits) c.appendChild(el('p','as-mut',bits)); const b=el('button','as-btn pri','Open Ear training'); b.type='button'; b.onclick=()=>{ close(); if(window.SUITE) SUITE.go('class'); setTimeout(()=>{ if(window.EAR) EAR.open(); },200); }; c.appendChild(b); }
      else { const room=sp.room==='chords'?'chords':'scales'; const b=el('button','as-btn pri',room==='chords'?'Open Chord practice':'Open Scale practice'); b.type='button'; b.onclick=()=>{ close(); if(window.SUITE) SUITE.go('class'); setTimeout(()=>{ if(window.PRACTICE) PRACTICE.open(room); },200); }; c.appendChild(b); }
      as.appendChild(c); }); });
}
function close(){ const p=document.getElementById('asPop'); if(p) p.remove(); }
function open(){ close(); if(window.AUTH&&!AUTH.user()){ AUTH.open({title:'Sign in to add a teacher',why:'A free Student account lets you join a teacher, get assignments and send them your results.',role:'student',mode:'up'}).then(x=>{ if(x) open(); }); return; }
  const pop=el('div'); pop.id='asPop'; const card=el('div'); pop.appendChild(card); const h=el('div','as-row'); h.appendChild(el('h2',null,'Teachers & assignments')); h.firstChild.style.margin='0'; const x=el('button','as-btn','Close'); x.type='button'; x.style.marginLeft='auto'; x.onclick=close; h.appendChild(x); card.appendChild(h);
  const host=el('div'); host.style.marginTop='12px'; card.appendChild(host); pop.onclick=e=>{ if(e.target===pop) close(); }; document.body.appendChild(pop); (window.AUTH?AUTH.refresh():Promise.resolve()).then(()=>mount(host)); }
window.ASSIGN={parse,build,keyboard,chartView,mount,open,close,LH,RH};
})();
