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
const LMAX=[2.1,2.4,2.6,2.4,2.0];            /* finger lengths in key widths, thumb first */
const SLOT=[-2.5,-1.5,-0.5,0.5,1.5];           /* where each finger sits over the keys (right hand; the left hand is mirrored) */
const KNUCK=[-1.7,-1.4,-0.47,0.47,1.4];   /* where each finger joins the palm */
const FW=[1.0,0.92,0.94,0.9,0.8];
const PALMH=3.4;                                /* the back of the hand is as long as it is wide; the arm runs off the bottom edge */                /* finger widths in key widths */
let ro=null, lastA=null, defs=null, gp=null, gs=[], host=null, svg=null, skinBox=null, raf=0, last=0, geo={kw:20,HP:56,kbH:80,W:600,xOf:()=>0,yOf:()=>0}; const H={};
const el=(p,tag,a)=>{ const e=document.createElementNS(NS,tag); for(const k in a) e.setAttribute(k,a[k]); p.appendChild(e); return e; };
const set=(e,a)=>{ for(const k in a) e.setAttribute(k,a[k]); };

function makeHand(side){
  const g=el(svg,'g',{}), h={side,g,on:false,init:false,x:0,py:0,ext:[.75,.72,.72,.72,.72],f:0,tx:0,ty:0,c:0,cT:0,k:3,thx:0,thT:0,pm:null,pf:0,cm:null,cf:0,zf:0};
  h.fore=el(g,'path',{}); h.thumb=fingerNodes(g); h.fing=[1,2,3,4].map(()=>fingerNodes(g));
  h.palm=el(g,'path',{}); h.sheen=el(g,'path',{}); h.tend=[0,1,2,3].map(()=>el(g,'path',{fill:'none','stroke-linecap':'round'})); h.kn=[0,1,2,3].map(()=>el(g,'path',{fill:'none','stroke-linecap':'round'}));
  H[side]=h; return h;
}
function fingerNodes(g){ const gg=el(g,'g',{}); return {g:gg,b:el(gg,'path',{'stroke-linejoin':'round'}),hl:el(gg,'path',{fill:'none','stroke-linecap':'round'}),sh:el(gg,'path',{fill:'none','stroke-linecap':'round'}),c1:el(gg,'path',{fill:'none','stroke-linecap':'round'}),c2:el(gg,'path',{fill:'none','stroke-linecap':'round'}),n:el(gg,'ellipse',{}),ns:el(gg,'ellipse',{}),t:el(gg,'text',{'text-anchor':'middle','font-family':'Arial','font-weight':800})}; }

let on=true; try{ on=localStorage.getItem('ps-hands')!=='0'; }catch(_){}
let onChange=null, ctrl=null, btn=null, sw=null;
function mount(h0){
  if(svg) return; host=h0; host.style.position='relative';
  const wrap=document.createElement('div'); wrap.className='p-hands'; wrap.style.cssText='position:absolute;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;z-index:3';
  svg=document.createElementNS(NS,'svg'); svg.setAttribute('aria-hidden','true'); svg.style.cssText='display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))'; wrap.appendChild(svg); host.insertBefore(wrap,host.firstChild); host._hw=wrap;
  defs=el(svg,'defs',{}); gp=el(defs,'linearGradient',{id:'psgp',x1:0,x2:1,y1:0,y2:0}); gs=[0,1,2,3].map(()=>el(gp,'stop',{})); makeHand('lh'); makeHand('rh');
  ctrl=document.createElement('div'); ctrl.className='p-hctl'; ctrl.style.cssText='position:absolute;right:4px;bottom:2px;display:flex;gap:6px;align-items:center;z-index:4;pointer-events:auto';
  btn=document.createElement('button'); btn.type='button'; btn.style.cssText='min-height:24px;height:24px;padding:0 10px;border-radius:999px;border:1.5px solid #3a4a74;background:#0c1426;color:#eef2ff;font:700 12px system-ui,sans-serif;cursor:pointer';
  btn.onclick=()=>{ on=!on; try{ localStorage.setItem('ps-hands',on?'1':'0'); }catch(_){} if(onChange) onChange(); };
  sw=document.createElement('span'); sw.setAttribute('role','group'); sw.setAttribute('aria-label','Skin tone'); sw.style.cssText='display:flex;gap:5px';
  TONES.forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.title=t.n+' skin'; b.setAttribute('aria-label',t.n+' skin tone'); b.style.cssText='width:22px;height:22px;min-height:22px;padding:0;border-radius:50%;border:2px solid '+(i===skin?'#fff':'rgba(255,255,255,.25)')+';background:'+t.s+';cursor:pointer'; b.onclick=()=>{ skin=i; try{ localStorage.setItem('ps-skin',String(i)); }catch(_){} [...sw.children].forEach((x,j)=>{ x.style.borderColor=j===i?'#fff':'rgba(255,255,255,.25)'; }); if(!raf){ last=0; raf=requestAnimationFrame(tick); } }; sw.appendChild(b); });
  ctrl.append(sw,btn); host.appendChild(ctrl);
}
function layout(kb){
  const sv=kb&&kb.firstElementChild, W=(sv&&sv.clientWidth)||kb.offsetWidth, KH=(sv&&sv.clientHeight)||kb.offsetHeight; if(!W||!KH) return false;
  const kw=W*14/(36*14+2), HP=Math.round(Math.min(150,Math.max(44,Math.max(...LMAX)*kw-KH*.3+kw*1.5))), band=on?HP:28, wh=[0,2,4,5,7,9,11];
  /* y runs from the forearm end (0) towards the keys; the whole group is then flipped so the hands come in from the player's side and point away */
  geo={kw,HP,kbH:KH,W,xOf:m=>{ const pc=((m%12)+12)%12, white=wh.includes(pc); let n=0; for(let q=36;q<m;q++) if(wh.includes(((q%12)+12)%12)) n++; const u=white?1+(n+.5)*14:1+n*14; return u/(36*14+2)*W; },
        yOf:m=>wh.includes(((m%12)+12)%12)?HP+KH*0.3:HP+KH*0.6};
  host.style.paddingTop=''; host.style.paddingBottom=band+'px'; set(svg,{width:W,height:HP+KH,viewBox:'0 0 '+W+' '+(HP+KH)}); host._hw.style.height=(HP+KH)+'px'; host._hw.style.display=on?'':'none';
  sw.style.display=on?'flex':'none'; btn.textContent=on?'Hands: on':'Hands: off'; btn.setAttribute('aria-pressed',String(on)); ctrl.hidden=false; return true;
}
/* Crossing pose. Phase one (thumb under): after finger k (2 to 4) the thumb travels under the palm and lands between finger k and the next one
   (for 3 that is between the middle and ring fingers) while finger k stays where it is. Phase two (fingers over the thumb or the hand moving on):
   the thumb stays on its key and the palm slides past it so the next finger sits right beside the thumb. Descending right hand and ascending left hand
   do the same thing in reverse: finger k crosses over the thumb. sx() gives where each finger sits in the crossing pose (thumb 0). */
const sx=(k,i)=>{ if(i===0) return 0; const j=i+1; return j<=k?-(k-j+1):(j-k); };
function target(h,m,f){
  if(m==null||!f){ h.on=false; h.init=false; h.cm=null; h.cf=0; h.pm=null; h.pf=0; return; }
  const {kw,xOf,yOf}=geo, dir=h.side==='rh'?1:-1, fi=f-1;
  if(h.cm!==m||h.cf!==f){ h.pm=h.cm; h.pf=h.cf; h.cm=m; h.cf=f; }
  let k=0;
  if(h.init&&h.pm!=null&&m!==h.pm&&Math.abs(m-h.pm)<=3){ const d=Math.sign(m-h.pm)*dir;
    if(d>0&&f===1&&h.pf>=2&&h.pf<=4) k=h.pf;            /* thumb goes under */
    else if(d<0&&h.pf===1&&f>=2&&f<=4) k=f; }            /* finger goes over the thumb */
  if(k) h.k=k; h.cT=k?1:0;
  const slot=k?sx(k,fi):SLOT[fi];
  h.on=true; h.f=f; h.tx=xOf(m)-slot*dir*kw; h.ty=yOf(m)-LMAX[fi]*kw; h.thT=h.tx+(k?0:SLOT[0])*dir*kw;
  if(!h.init){ h.init=true; h.x=h.tx; h.py=h.ty; h.c=h.cT; h.thx=h.thT; h.ext=LMAX.map((_,i)=>i===fi?1:.72); }
}
/* avail: this scale has a fingering to show. s: the step being shown (or none). Hands are only ever drawn in the Scale room. */
function sync(kb,avail,s,cb){
  if(cb) onChange=cb; lastA=[kb,avail,s,cb];
  if(!avail||!kb){ if(svg){ ['rh','lh'].forEach(k=>{ H[k].on=false; H[k].init=false; set(H[k].g,{display:'none'}); }); host.style.paddingTop=''; host.style.paddingBottom='0px'; ctrl.hidden=true; } return; }
  if(!host){ const w=kb.parentNode; if(!w) return; mount(w); }
  if(!layout(kb)) return;
  if(!ro&&window.ResizeObserver){ ro=new ResizeObserver(()=>{ if(lastA&&lastA[0]&&lastA[0].isConnected&&host) sync(...lastA); }); }
  if(ro&&ro.__t!==kb){ ro.disconnect(); ro.observe(kb); ro.__t=kb; }
  const hasR=s&&s.rh&&s.rh.length&&s.fing, hasL=s&&s.lh&&s.lh.length&&s.lfing;
  target(H.rh,on&&hasR?s.rh[0]:null,hasR?+s.fing:0); target(H.lh,on&&hasL?s.lh[0]:null,hasL?+s.lfing:0);
  ['rh','lh'].forEach(k=>{ if(!H[k].on) set(H[k].g,{display:'none'}); });
  if(!raf){ last=0; raf=requestAnimationFrame(tick); }
}
function wantExt(h,i){ if(i===0){ if(Math.abs(h.thx-h.thT)>geo.kw*.6) return .42; return h.f===1?1:.8; } return i===h.f-1?1:.86; }
function tick(t){
  raf=0; if(!svg||!host||!host.isConnected) return; const dt=Math.min(.05,last?(t-last)/1000:.016); last=t;
  const k1=1-Math.exp(-dt*13), k2=1-Math.exp(-dt*22); let moving=false;
  ['lh','rh'].forEach(k=>{ const h=H[k]; if(!h.on){ set(h.g,{display:'none'}); return; }
    h.x+=(h.tx-h.x)*k1; h.py+=(h.ty-h.py)*k1; h.c+=(h.cT-h.c)*k1; h.thx+=(h.thT-h.thx)*k1;
    let ex=false; LMAX.forEach((_,i)=>{ const w=wantExt(h,i); h.ext[i]+=(w-h.ext[i])*k2; if(Math.abs(w-h.ext[i])>.01) ex=true; });
    if(ex||Math.abs(h.tx-h.x)>.3||Math.abs(h.ty-h.py)>.3||Math.abs(h.cT-h.c)>.01||Math.abs(h.thT-h.thx)>.3) moving=true; draw(h); });
  if(moving) raf=requestAnimationFrame(tick);
}

const mix=(a,b,t)=>{ const f=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16)), A=f(a),B=f(b); return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'; };
/* a tapered finger from base (bx,by) to tip (tx,ty), with a soft highlight, a shaded side and two joint creases */
function finger(n,bx,by,tx,ty,wb,T,act,num,kw,tp){
  const dx=tx-bx, dy=ty-by, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, px=-uy, py=ux, wt=wb*(tp||.8), r=wt/2, ex=tx-ux*r, ey=ty-uy*r, mx=bx+(ex-bx)*.5, my=by+(ey-by)*.5, wm=wb*.88;
  const P=(x,y,w,sd)=>(x+px*w/2*sd).toFixed(1)+' '+(y+py*w/2*sd).toFixed(1);
  set(n.b,{d:'M'+P(bx,by,wb,1)+'L'+P(mx,my,wm,1)+'L'+P(ex,ey,wt,1)+'A'+r.toFixed(1)+' '+r.toFixed(1)+' 0 0 0 '+P(ex,ey,wt,-1)+'L'+P(mx,my,wm,-1)+'L'+P(bx,by,wb,-1)+'Z',fill:T.s,stroke:T.e,'stroke-width':1});
  set(n.hl,{d:'M'+P(bx+ux*kw*.3,by+uy*kw*.3,wb,-.38)+'L'+P(ex-ux*kw*.1,ey-uy*kw*.1,wt,-.3),stroke:mix('#ffffff',T.s,.55),'stroke-width':wb*.2,opacity:.55});
  set(n.sh,{d:'M'+P(bx+ux*kw*.3,by+uy*kw*.3,wb,.5)+'L'+P(ex-ux*kw*.2,ey-uy*kw*.2,wt,.45),stroke:T.d,'stroke-width':wb*.16,opacity:.5});
  set(n.c1,{d:'M0 0'}); set(n.c2,{d:'M0 0'});
  nail(n,tx,ty,kw,num,act,T,ux,uy,wt);
}
function draw(h){
  const T=TONES[skin], {kw}=geo, dir=h.side==='rh'?1:-1, g=h.g, c=h.c, lerp=(a,b)=>a+(b-a)*c; set(g,{display:'',transform:'translate(0 '+(geo.HP+geo.kbH)+') scale(1 -1)'});
  const palmH=kw*PALMH, pb=h.py, pt=pb-palmH, cx=h.x;
  [[0,T.d],[.3,T.s],[.62,mix(T.s,'#ffffff',.14)],[1,T.d]].forEach(([o,col],i)=>set(gs[i],{offset:o,'stop-color':col}));
  /* forearm and wrist, tapering into the back of the hand */
  set(h.fore,{d:'M'+(cx-kw*1.25)+' '+(pt+kw*.1)+'L'+(cx-kw*1.45)+' -6L'+(cx+kw*1.45)+' -6L'+(cx+kw*1.25)+' '+(pt+kw*.1)+'Z',fill:'url(#psgp)',stroke:T.e,'stroke-width':1});
  /* thumb first, so it passes under the palm and the fingers; its tip is its own point so it can stay put while the palm slides over it */
  const baseX=cx+lerp(-1.25,-.1)*dir*kw, baseY=pb-kw*1.9, tipX=h.thx, tipY=pb+h.ext[0]*LMAX[0]*kw-kw*.2;
  const midX=baseX+(tipX-baseX)*.5-dir*kw*.12*(1-c), midY=baseY+(tipY-baseY)*.5;
  finger(h.thumb,baseX,baseY,tipX,tipY,kw*1.3,T,h.f===1,1,kw,.66);
  /* fingers 2 to 5 (the one that is playing goes on top) */
  const order=[1,2,3,4].filter(i=>i!==h.f-1).concat([1,2,3,4].filter(i=>i===h.f-1));
  if(h.zf!==h.f){ h.zf=h.f; order.forEach(i=>{ g.insertBefore(h.fing[i-1].g,h.palm); }); }
  order.forEach(i=>{ const slot=lerp(SLOT[i],sx(h.k,i)), bx=cx+KNUCK[i]*dir*kw, by=pb-kw*.15, tx=cx+slot*dir*kw, ty=by+h.ext[i]*LMAX[i]*kw-kw*.1;
    finger(h.fing[i-1],bx,by,tx,ty,kw*FW[i],T,h.f===i+1,i+1,kw); });
  /* back of the hand: wrist narrows, knuckle line curves over the finger roots */
  const w1=kw*1.3, w2=kw*1.9, kl=[-1.78,-1.35,-.45,.45,1.35,1.78];
  set(h.palm,{d:'M'+(cx-w1)+' '+pt+'C'+(cx-w1*1.25)+' '+(pt+palmH*.35)+' '+(cx-w2)+' '+(pt+palmH*.4)+' '+(cx-w2)+' '+(pb-kw*.55)+'Q'+(cx-w2)+' '+(pb+kw*.1)+' '+(cx-kw*1.35)+' '+(pb+kw*.05)+'Q'+(cx-kw*.45)+' '+(pb+kw*.22)+' '+cx+' '+(pb+kw*.2)+'Q'+(cx+kw*.45)+' '+(pb+kw*.22)+' '+(cx+kw*1.35)+' '+(pb+kw*.05)+'Q'+(cx+w2)+' '+(pb+kw*.1)+' '+(cx+w2)+' '+(pb-kw*.55)+'C'+(cx+w2)+' '+(pt+palmH*.4)+' '+(cx+w1*1.25)+' '+(pt+palmH*.35)+' '+(cx+w1)+' '+pt+'Z',fill:'url(#psgp)',stroke:T.e,'stroke-width':1,'stroke-linejoin':'round'});
  set(h.sheen,{d:'M0 0',stroke:'none'});
  h.tend.forEach(e=>set(e,{d:'M0 0'})); h.kn.forEach(e=>set(e,{d:'M0 0'}));
}
function nail(n,tx,ty,kw,num,act,T,ux,uy,wt){
  /* a small numbered badge on the fingertip (yellow on the finger that is playing) */
  const bx=tx-ux*kw*.28, by=ty-uy*kw*.28, r=kw*.33;
  set(n.n,{cx:bx,cy:by,rx:r,ry:r,fill:act?'#ffd43b':'rgba(18,26,48,.82)',stroke:act?'#b8860b':'rgba(255,255,255,.7)','stroke-width':1,transform:''});
  set(n.ns,{rx:0,ry:0});
  const y2=by-kw*.15; set(n.t,{x:bx,y:y2,'font-size':Math.max(9,Math.min(13,kw*.55)),fill:act?'#2a1a0d':'#fff',transform:'translate('+bx+' '+y2+') scale(1 -1) translate('+(-bx)+' '+(-y2)+')'}); n.t.textContent=String(num);
}
window.PSHANDS={sync,tones:TONES,isOn:()=>on};
})();
