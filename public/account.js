/* Account page and profile photo button (top right). Photo and name are kept on this device. */
(function(){
'use strict';
const PK='ps-avatar', NK='ps-name';
const get=k=>{ try{ return localStorage.getItem(k)||''; }catch(_){ return ''; } };
const set=(k,v)=>{ try{ if(v) localStorage.setItem(k,v); else localStorage.removeItem(k); }catch(_){ } };
const initials=()=>{ const n=get(NK).trim(); return n?n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase():'🙂'; };
function paint(el){ const p=get(PK); el.style.backgroundImage=p?'url('+p+')':''; el.textContent=p?'':initials(); el.classList.toggle('ph',!!p); }
function avatar(){ const b=document.createElement('button'); b.type='button'; b.className='ac-av'; b.title='Your account'; b.setAttribute('aria-label','Your account'); paint(b); b.onclick=()=>{ if(window.SUITE) SUITE.go('account'); }; return b; }
function refresh(){ document.querySelectorAll('.ac-av').forEach(paint); }
const css=document.createElement('style'); css.textContent=`
.ac-av{width:34px;height:34px;border-radius:50%;border:2px solid var(--hi,#e8c25a);background:var(--surface,#222) center/cover no-repeat;color:var(--ink,#fff);font:700 13px system-ui,sans-serif;cursor:pointer;padding:0;display:grid;place-items:center;flex:none}
.ac-av:hover{box-shadow:0 0 0 3px color-mix(in srgb,var(--hi,#e8c25a) 40%,transparent)}
.menubar .ac-av{width:26px;height:26px;font-size:11px;margin:0 4px 0 6px;border-width:1.5px}
#acRoom{position:fixed;left:0;right:0;top:36px;bottom:0;z-index:150000;display:none;overflow:auto;background:var(--bg);color:var(--ink);font-family:var(--body)}
#acRoom.on{display:block}
#acRoom .w{max-width:820px;margin:0 auto;padding:22px 18px 70px}
#acRoom h1{font:800 clamp(26px,5vw,38px)/1.05 var(--display,var(--body));margin:0}
#acRoom h2{font:700 18px var(--display,var(--body));margin:26px 0 10px}
#acRoom .top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
#acRoom .bk{font:700 20px var(--body);border-radius:999px;padding:4px 14px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
#acRoom .box{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px;margin:12px 0}
#acRoom .prof{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
#acRoom .big{width:104px;height:104px;font-size:34px;border-width:3px}
#acRoom label{display:block;font-weight:600;font-size:13px;margin:0 0 4px}
#acRoom input[type=text]{font:inherit;padding:10px 12px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);width:min(340px,100%)}
#acRoom .btn{font:600 14px var(--body);border-radius:999px;padding:9px 16px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;margin:4px 6px 0 0}
#acRoom .btn.pri{background:var(--accent);color:var(--accent-ink);border-color:transparent}
#acRoom .mut{color:var(--muted);font-size:14px}
#acProg{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;margin:0}
#acProg .pp-st,#acProg .pp-dr{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 16px;color:var(--ink);display:grid;gap:2px;text-align:left;font-family:inherit;flex:1 1 200px}
#acProg b{font-size:17px}#acProg span{font-size:13px;color:var(--muted)}
#acProg .pp-dr{cursor:pointer;border-color:var(--hi,#e8c25a)}#acProg .pp-dr i{font-style:normal;font-weight:700;color:var(--accent)}
`; document.head.appendChild(css);
let room=null;
function render(){
  room.textContent=''; const w=document.createElement('div'); w.className='w'; room.appendChild(w);
  w.innerHTML='<div class="top"><button class="bk" id="acBack" aria-label="Back" title="Back">←</button><h1>Your account</h1></div>'
   +'<div class="box prof"><div id="acBig"></div><div><label for="acName">Your name</label><input type="text" id="acName" maxlength="60" placeholder="Your name"><div style="margin-top:8px"><button class="btn" id="acPick">Change photo</button><button class="btn" id="acDel">Remove photo</button><input type="file" id="acFile" accept="image/*" hidden></div><p class="mut" style="margin:6px 0 0">Your photo and name are saved on this device.</p></div></div>'
   +'<h2>Your progress</h2><div id="acProg"></div>'
   +'<h2>Keep going</h2><div class="box"><button class="btn pri" id="acPro">⭐ Get a professional practice plan</button><button class="btn" id="acCh">90 Day Challenge</button></div>';
  const big=avatar(); big.classList.add('big'); big.onclick=()=>w.querySelector('#acFile').click(); w.querySelector('#acBig').appendChild(big);
  const nm=w.querySelector('#acName'); nm.value=get(NK); nm.oninput=()=>{ set(NK,nm.value.trim()); refresh(); };
  w.querySelector('#acPick').onclick=()=>w.querySelector('#acFile').click();
  w.querySelector('#acDel').onclick=()=>{ set(PK,''); refresh(); };
  w.querySelector('#acFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const im=new Image(); const u=URL.createObjectURL(f);
    im.onload=()=>{ const c=document.createElement('canvas'),n=256; c.width=c.height=n; const x=c.getContext('2d'),m=Math.min(im.width,im.height); x.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,n,n); set(PK,c.toDataURL('image/jpeg',.86)); URL.revokeObjectURL(u); refresh(); }; im.src=u; };
  w.querySelector('#acBack').onclick=()=>{ if(window.SUITE) SUITE.back(); };
  w.querySelector('#acPro').onclick=()=>{ if(window.SUITE) SUITE.go('challenge'); };
  w.querySelector('#acCh').onclick=()=>{ if(window.SUITE) SUITE.go('challenge'); };
  try{ if(window.PSPROG) PSPROG.hub(); }catch(_){}
}
function open(){ if(!room){ room=document.createElement('div'); room.id='acRoom'; document.body.appendChild(room); } render(); room.classList.add('on'); }
function close(){ if(room) room.classList.remove('on'); }
window.ACCOUNT={open,close,avatar,refresh,back:()=>false,name:()=>get(NK)};
/* the top-right buttons on the home screen */
let n=0; (function wait(){ const top=document.getElementById('hubTop'); if(top&&!top.querySelector('.ac-av')) top.appendChild(avatar()); const mb=document.querySelector('.menubar'); if(mb&&!mb.querySelector('.ac-av')) mb.appendChild(avatar()); if((!top||!mb||!top.querySelector('.ac-av')||!mb.querySelector('.ac-av'))&&n++<100) setTimeout(wait,100); })();
})();
