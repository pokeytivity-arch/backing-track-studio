/* hands.js: two moving hands over the Scale room keyboard (never in the Studio).
   Fingers are numbered 1 (thumb) to 5 (little finger) on each hand. The hand glides so the finger in the fingering sits on the note,
   the other fingers hover, and the skin colour can be changed. Hands only appear where the lessons give a fingering. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const TONES=[
  {n:'Light',s:'#f4d6bf',d:'#d9aa88',e:'#c48f6c'},
  {n:'Light brown',s:'#e5b68e',d:'#c48d63',e:'#a8744c'},
  {n:'Tan',s:'#c98f5f',d:'#a66d42',e:'#8a5733'},
  {n:'Brown',s:'#8d5a38',d:'#6c3f22',e:'#55301a'},
  {n:'Deep brown',s:'#5b3822',d:'#41240f',e:'#2e1809'}];
let skin=1; try{ const v=+localStorage.getItem('ps-skin'); if(v>=0&&v<TONES.length) skin=v; }catch(_){}
const LMAX=[2.0,2.7,2.95,2.7,2.2];            /* finger lengths in key widths, thumb first */
const SLOT=[-2.5,-1.5,-0.5,0.5,1.5];           /* where each finger sits over the keys (right hand; the left hand is mirrored) */
const KNUCK=[-1.7,-1.275,-0.425,0.425,1.275];   /* where each finger joins the palm */
const FW=[0.9,0.8,0.82,0.8,0.7];                /* finger widths in key widths */
let host=null, svg=null, skinBox=null, raf=0, last=0, geo={kw:20,HP:56,kbH:80,W:600,xOf:()=>0,yOf:()=>0}; const H={};
const el=(p,tag,a)=>{ const e=document.createElementNS(NS,tag); for(const k in a) e.setAttribute(k,a[k]); p.appendChild(e); return e; };
const set=(e,a)=>{ for(const k in a) e.setAttribute(k,a[k]); };

function makeHand(side){
  const g=el(svg,'g',{}), h={side,g,on:false,init:false,x:0,py:0,ext:[.75,.72,.72,.72,.72],f:0,tx:0,ty:0,y:{},f_:[]};
  h.fore=el(g,'rect',{}); h.thumb=fingerNodes(g); h.palm=el(g,'path',{}); h.fing=[1,2,3,4].map(()=>fingerNodes(g));
  H[side]=h; return h;
}
function fingerNodes(g){ return {o:el(g,'line',{'stroke-linecap':'round'}),s:el(g,'line',{'stroke-linecap':'round'}),c1:el(g,'line',{'stroke-linecap':'round'}),c2:el(g,'line',{'stroke-linecap':'round'}),n:el(g,'ellipse',{}),t:el(g,'text',{'text-anchor':'middle','font-family':'Arial','font-weight':800})}; }

let on=true; try{ on=localStorage.getItem('ps-hands')!=='0'; }catch(_){}
let onChange=null, ctrl=null, btn=null, sw=null;
function mount(h0){
  if(svg) return; host=h0; host.style.position='relative';
  const wrap=document.createElement('div'); wrap.className='p-hands'; wrap.style.cssText='position:absolute;left:0;right:0;top:0;pointer-events:none;overflow:hidden;z-index:3';
  svg=document.createElementNS(NS,'svg'); svg.setAttribute('aria-hidden','true'); svg.style.cssText='display:block'; wrap.appendChild(svg); host.insertBefore(wrap,host.firstChild); host._hw=wrap;
  makeHand('lh'); makeHand('rh');
  ctrl=document.createElement('div'); ctrl.className='p-hctl'; ctrl.style.cssText='position:absolute;right:4px;top:2px;display:flex;gap:6px;align-items:center;z-index:4;pointer-events:auto';
  btn=document.createElement('button'); btn.type='button'; btn.style.cssText='min-height:24px;height:24px;padding:0 10px;border-radius:999px;border:1.5px solid #3a4a74;background:#0c1426;color:#eef2ff;font:700 12px system-ui,sans-serif;cursor:pointer';
  btn.onclick=()=>{ on=!on; try{ localStorage.setItem('ps-hands',on?'1':'0'); }catch(_){} if(onChange) onChange(); };
  sw=document.createElement('span'); sw.setAttribute('role','group'); sw.setAttribute('aria-label','Skin tone'); sw.style.cssText='display:flex;gap:5px';
  TONES.forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.title=t.n+' skin'; b.setAttribute('aria-label',t.n+' skin tone'); b.style.cssText='width:22px;height:22px;min-height:22px;padding:0;border-radius:50%;border:2px solid '+(i===skin?'#fff':'rgba(255,255,255,.25)')+';background:'+t.s+';cursor:pointer'; b.onclick=()=>{ skin=i; try{ localStorage.setItem('ps-skin',String(i)); }catch(_){} [...sw.children].forEach((x,j)=>{ x.style.borderColor=j===i?'#fff':'rgba(255,255,255,.25)'; }); if(!raf){ last=0; raf=requestAnimationFrame(tick); } }; sw.appendChild(b); });
  ctrl.append(sw,btn); host.appendChild(ctrl);
}
function layout(kb){
  const sv=kb&&kb.firstElementChild, W=(sv&&sv.clientWidth)||kb.offsetWidth, KH=(sv&&sv.clientHeight)||kb.offsetHeight; if(!W||!KH) return false;
  const kw=W*14/(36*14+2), HP=Math.round(Math.min(84,Math.max(46,kw*2.7))), band=on?HP:28;
  const wh=[0,2,4,5,7,9,11];
  geo={kw,HP,kbH:KH,W,xOf:m=>{ const pc=((m%12)+12)%12, white=wh.includes(pc); let n=0; for(let q=36;q<m;q++) if(wh.includes(((q%12)+12)%12)) n++; const u=white?1+(n+.5)*14:1+n*14; return u/(36*14+2)*W; },
        yOf:m=>wh.includes(((m%12)+12)%12)?HP+KH*0.56:HP+KH*0.24};
  host.style.paddingTop=band+'px'; set(svg,{width:W,height:HP+KH,viewBox:'0 0 '+W+' '+(HP+KH)}); host._hw.style.height=(HP+KH)+'px'; host._hw.style.display=on?'':'none';
  sw.style.display=on?'flex':'none'; btn.textContent=on?'Hands: on':'Hands: off'; btn.setAttribute('aria-pressed',String(on)); ctrl.hidden=false; return true;
}
function target(h,m,f){
  if(m==null||!f){ h.on=false; h.init=false; return; }
  const {kw,xOf,yOf}=geo, dir=h.side==='rh'?1:-1, fi=f-1;
  h.on=true; h.f=f; h.tx=xOf(m)-SLOT[fi]*dir*kw; h.ty=yOf(m)-LMAX[fi]*kw;
  if(!h.init){ h.init=true; h.x=h.tx; h.py=h.ty; h.ext=LMAX.map((_,i)=>i===fi?1:.72); }
}
/* avail: this scale has a fingering to show. s: the step being shown (or none). Hands are only ever drawn in the Scale room. */
function sync(kb,avail,s,cb){
  if(cb) onChange=cb;
  if(!avail||!kb){ if(svg){ ['rh','lh'].forEach(k=>{ H[k].on=false; H[k].init=false; set(H[k].g,{display:'none'}); }); host.style.paddingTop='0px'; ctrl.hidden=true; } return; }
  if(!host){ const w=kb.parentNode; if(!w) return; mount(w); }
  if(!layout(kb)) return;
  const hasR=s&&s.rh&&s.rh.length&&s.fing, hasL=s&&s.lh&&s.lh.length&&s.lfing;
  target(H.rh,on&&hasR?s.rh[0]:null,hasR?+s.fing:0); target(H.lh,on&&hasL?s.lh[0]:null,hasL?+s.lfing:0);
  ['rh','lh'].forEach(k=>{ if(!H[k].on) set(H[k].g,{display:'none'}); });
  if(!raf){ last=0; raf=requestAnimationFrame(tick); }
}
function tick(t){
  raf=0; if(!svg||!host||!host.isConnected) return; const dt=Math.min(.05,last?(t-last)/1000:.016); last=t;
  const k1=1-Math.exp(-dt*15), k2=1-Math.exp(-dt*22); let moving=false;
  ['lh','rh'].forEach(k=>{ const h=H[k]; if(!h.on){ set(h.g,{display:'none'}); return; }
    h.x+=(h.tx-h.x)*k1; h.py+=(h.ty-h.py)*k1; LMAX.forEach((_,i)=>{ const want=(i===h.f-1)?1:(i===0?.8:.7); h.ext[i]+=(want-h.ext[i])*k2; });
    if(Math.abs(h.tx-h.x)>.3||Math.abs(h.ty-h.py)>.3||LMAX.some((_,i)=>Math.abs(h.ext[i]-((i===h.f-1)?1:(i===0?.8:.7)))>.01)) moving=true; draw(h); });
  if(moving) raf=requestAnimationFrame(tick);
}

function capsule(n,x1,y1,x2,y2,w,col,out){ set(n.o,{x1,y1,x2,y2,stroke:out,'stroke-width':w+1.6}); set(n.s,{x1,y1,x2,y2,stroke:col,'stroke-width':w}); }
function draw(h){
  const T=TONES[skin], {kw}=geo, dir=h.side==='rh'?1:-1, g=h.g; set(g,{display:''});
  const palmH=kw*2.05, pb=h.py, pt=pb-palmH, cx=h.x;
  /* forearm and palm (palm is drawn after the thumb so the thumb tucks under it when it crosses) */
  set(h.fore,{x:cx-kw*1.25,y:pt-geo.HP,width:kw*2.5,height:geo.HP+palmH*.5,fill:T.s,stroke:T.e,'stroke-width':1.2,rx:kw*.5});
  const th=h.thumb, fi0=0, ext0=h.ext[0], baseX=cx+KNUCK[0]*dir*kw, baseY=pb-kw*.95, tipX=cx+SLOT[0]*dir*kw, tipY=baseY+ext0*(LMAX[0]*kw-kw*.95)+kw*.15;
  const midX=baseX+(tipX-baseX)*.5-dir*kw*.15, midY=baseY+(tipY-baseY)*.55;
  capsule(th,baseX,baseY,midX,midY,kw*FW[0]*1.05,T.s,T.e); /* lower thumb segment */
  const th2=h.thumb.c1; set(th2,{x1:midX,y1:midY,x2:tipX,y2:tipY,stroke:T.e,'stroke-width':kw*FW[0]+1.6}); const th3=h.thumb.c2; set(th3,{x1:midX,y1:midY,x2:tipX,y2:tipY,stroke:T.s,'stroke-width':kw*FW[0]});
  nail(h.thumb,tipX,tipY,kw,1,h.f===1,T,dir,tipX-midX,tipY-midY);
  const w=kw*1.78;
  set(h.palm,{d:'M'+(cx-w)+' '+(pt+kw*.35)+'Q'+(cx-w)+' '+pt+' '+(cx-w*.6)+' '+pt+'L'+(cx+w*.6)+' '+pt+'Q'+(cx+w)+' '+pt+' '+(cx+w)+' '+(pt+kw*.35)+'L'+(cx+w*.95)+' '+(pb-kw*.5)+'Q'+(cx+w*.9)+' '+pb+' '+(cx+w*.5)+' '+pb+'L'+(cx-w*.5)+' '+pb+'Q'+(cx-w*.9)+' '+pb+' '+(cx-w*.95)+' '+(pb-kw*.5)+'Z',fill:T.s,stroke:T.e,'stroke-width':1.2,'stroke-linejoin':'round'});
  /* fingers 2 to 5: draw the active one last so it is on top */
  const order=[1,2,3,4].filter(i=>i!==h.f-1).concat([1,2,3,4].filter(i=>i===h.f-1));
  order.forEach(i=>{ const n=h.fing[i-1], bx=cx+KNUCK[i]*dir*kw, by=pb-kw*.1, tx=cx+SLOT[i]*dir*kw, ty=by+h.ext[i]*LMAX[i]*kw-kw*.1, act=h.f===i+1;
    capsule(n,bx,by,tx,ty,kw*FW[i],act?T.d:T.s,T.e);
    const dx=tx-bx, dy=ty-by, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, px=-uy, py=ux, wv=kw*FW[i]*.32;
    [[.38,n.c1],[.68,n.c2]].forEach(([f,c])=>{ const mx=bx+dx*f, my=by+dy*f; set(c,{x1:mx-px*wv,y1:my-py*wv,x2:mx+px*wv,y2:my+py*wv,stroke:T.e,'stroke-width':.9,opacity:.55}); });
    nail(n,tx,ty,kw,i+1,act,T,dir,ux,uy); });
}
function nail(n,tx,ty,kw,num,act,T,dir,ux,uy){
  const a=Math.atan2(uy,ux)*180/Math.PI-90;
  set(n.n,{cx:tx-ux*kw*.12,cy:ty-uy*kw*.12,rx:kw*.27,ry:kw*.3,fill:act?'#ffd43b':'rgba(255,255,255,.55)',stroke:T.e,'stroke-width':.7,transform:'rotate('+a+' '+tx+' '+ty+')'});
  set(n.t,{x:tx-ux*kw*.12,y:ty-uy*kw*.12+kw*.17,'font-size':Math.max(8,Math.min(12,kw*.52)),fill:'#2a1a0d'}); n.t.textContent=String(num);
}
window.PSHANDS={sync,tones:TONES,isOn:()=>on};
})();
