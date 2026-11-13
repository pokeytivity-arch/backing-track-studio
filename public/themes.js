/* Theme picker: five looks. The choice is kept on this device. Default is Blue and white. */
(function(){
const LIST=[
 ['blue','Blue and white','linear-gradient(90deg,#ffffff 50%,#2445d4 50%)','#edf0f5'],
 ['gold','Gold and black','linear-gradient(90deg,#070707 50%,#d4af37 50%)','#070707'],
 ['green','Green and ash','linear-gradient(90deg,#141917 50%,#86b494 50%)','#0b0e0d'],
 ['burgundy','Burgundy and ivory','linear-gradient(90deg,#4b1420 50%,#f2e6d0 50%)','#12080b'],
 ['navy','Midnight and copper','linear-gradient(90deg,#0f1626 50%,#d08c5c 50%)','#070b14']];
const KEY='ps-theme';
function get(){ try{ const t=localStorage.getItem(KEY); if(LIST.some(x=>x[0]===t)) return t; }catch(_){} return 'blue'; }
function apply(t){
  const h=document.documentElement; if(t==='blue') h.removeAttribute('data-theme'); else h.setAttribute('data-theme',t);
  const m=document.querySelector('meta[name=theme-color]'); const row=LIST.find(x=>x[0]===t); if(m&&row) m.setAttribute('content',row[3]);
  document.querySelectorAll('#thPop button,#thRow button').forEach(b=>b.classList.toggle('cur',b.dataset.t===t));
}
function set(t){ try{ localStorage.setItem(KEY,t); }catch(_){} apply(t); const p=document.getElementById('thPop'); if(p) p.classList.remove('on'); }
function sw(x){ const s=document.createElement('span'); s.className='thsw'; s.style.background=x[2]; return s; }
function mkBtn(x,withName){ const b=document.createElement('button'); b.type='button'; b.dataset.t=x[0]; b.appendChild(sw(x)); b.appendChild(document.createTextNode(x[1])); b.onclick=()=>set(x[0]); return b; }
function build(){
  const mb=document.querySelector('.menubar');
  if(mb&&!document.getElementById('thBtn')){
    const b=document.createElement('button'); b.id='thBtn'; b.type='button'; b.className='menu-btn'; b.textContent='Theme'; b.title='Change the colours';
    const pop=document.createElement('div'); pop.id='thPop'; LIST.forEach(x=>pop.appendChild(mkBtn(x))); document.body.appendChild(pop);
    b.onclick=e=>{ e.stopPropagation(); const r=b.getBoundingClientRect(); pop.style.top=(r.bottom+6)+'px'; pop.style.left=Math.max(8,Math.min(r.left,innerWidth-250))+'px'; pop.classList.toggle('on'); };
    document.addEventListener('click',e=>{ if(!pop.contains(e.target)) pop.classList.remove('on'); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') pop.classList.remove('on'); });
    const help=[...mb.querySelectorAll('.menu-btn')].find(x=>/^help$/i.test(x.textContent.trim()));
    if(help) help.before(b); else mb.appendChild(b);
  }
  const foot=document.getElementById('psFoot');
  if(foot&&!document.getElementById('thRow')){
    const row=document.createElement('div'); row.id='thRow'; const l=document.createElement('span'); l.textContent='Theme'; row.appendChild(l); LIST.forEach(x=>row.appendChild(mkBtn(x))); foot.before(row);
  }
  apply(get());
}
window.THEMES={set,get,list:LIST};
apply(get());
let n=0; (function wait(){ build(); if((!document.getElementById('thBtn')||!document.getElementById('thRow'))&&n++<100) setTimeout(wait,100); })();
})();
