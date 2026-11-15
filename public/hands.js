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
const LMAX=[1.6,2.0,2.2,2.0,1.55];       /* reach from the knuckle to the fingertip, in key widths, when the finger is playing (a resting finger is curled, so it looks shorter from above) */
const KY=[0,-.08,.08,-.08,-.3];                 /* knuckle arch: the middle knuckle sits furthest forward, the little finger's furthest back */            /* finger lengths in key widths, thumb first */
const SLOT=[-2.5,-1.5,-0.5,0.5,1.5];           /* where each finger sits over the keys (right hand; the left hand is mirrored) */
const KNUCK=[-1.7,-1.4,-0.47,0.47,1.4];   /* where each finger joins the palm */
const FW=[0.95,0.78,0.8,0.77,0.68];
const PALMH=1.8;                                /* the back of the hand is as long as it is wide; the arm runs off the bottom edge */                /* finger widths in key widths */
let ro=null, lastA=null, defs=null, gp=null, gs=[], host=null, svg=null, skinBox=null, raf=0, last=0, geo={kw:20,HP:56,kbH:80,W:600,xOf:()=>0,yOf:()=>0}; const H={};
const el=(p,tag,a)=>{ const e=document.createElementNS(NS,tag); for(const k in a) e.setAttribute(k,a[k]); p.appendChild(e); return e; };
const set=(e,a)=>{ for(const k in a) e.setAttribute(k,a[k]); };

function makeHand(side){
  const g=el(svg,'g',{}), h={side,g,on:false,init:false,x:0,py:0,f:0,tx:0,ty:0,c:0,cT:0,k:3,pm:null,pf:0,cm:null,cf:0,zf:0,
    fx:[0,0,0,0,0],fy:[0,0,0,0,0],ftx:[0,0,0,0,0],fty:[0,0,0,0,0]};
  h.fore=el(g,'path',{}); h.sl=el(g,'path',{}); h.cu=el(g,'path',{}); h.cb=el(g,'circle',{}); h.ac=el(g,'g',{}); h.m1=el(g,'path',{}); h.thumb=fingerNodes(g,2); h.m2=el(g,'path',{}); h.fing=[1,2,3,4].map(()=>fingerNodes(g,3));
  h.palm=el(g,'path',{}); h.pout=el(g,'path',{fill:'none','stroke-linejoin':'round'});
  H[side]=h; return h;
}
function fingerNodes(g,ns){ const gg=el(g,'g',{}); const o={g:gg,seg:[],hl:null};
  for(let i=0;i<ns;i++) o.seg.push(el(gg,'path',{'stroke-linejoin':'round'}));
  o.hl=el(gg,'path',{fill:'none','stroke-linecap':'round'}); o.n=el(gg,'ellipse',{}); o.t=el(gg,'text',{'text-anchor':'middle','font-family':'Arial','font-weight':800}); return o; }

let on=true; try{ on=localStorage.getItem('ps-hands')!=='0'; }catch(_){}
let onChange=null, ctrl=null, btn=null, sw=null;
function mount(h0){
  if(svg) return; host=h0; host.style.position='relative';
  const wrap=document.createElement('div'); wrap.className='p-hands'; wrap.style.cssText='position:absolute;left:0;right:0;bottom:-12px;pointer-events:none;overflow:visible;z-index:3';
  svg=document.createElementNS(NS,'svg'); svg.setAttribute('aria-hidden','true'); svg.style.cssText='display:block;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))'; wrap.appendChild(svg); host.insertBefore(wrap,host.firstChild); host._hw=wrap;
  defs=el(svg,'defs',{}); gp=el(defs,'linearGradient',{id:'psgp',x1:0,x2:1,y1:0,y2:0}); gs=[0,1,2,3].map(()=>el(gp,'stop',{})); makeHand('lh'); makeHand('rh');
  ctrl=document.createElement('div'); ctrl.className='p-hctl'; ctrl.style.cssText='position:absolute;right:4px;bottom:2px;display:flex;gap:6px;align-items:center;z-index:4;pointer-events:auto';
  btn=document.createElement('button'); btn.type='button'; btn.style.cssText='min-height:20px;height:20px;padding:0 9px;border-radius:999px;border:1.5px solid #3a4a74;background:#0c1426;color:#eef2ff;font:700 12px system-ui,sans-serif;cursor:pointer';
  btn.onclick=()=>{ on=!on; try{ localStorage.setItem('ps-hands',on?'1':'0'); }catch(_){} if(onChange) onChange(); };
  sw=document.createElement('span'); sw.setAttribute('role','group'); sw.setAttribute('aria-label','Skin tone'); sw.style.cssText='display:flex;gap:5px';
  TONES.forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.title=t.n+' skin'; b.setAttribute('aria-label',t.n+' skin tone'); b.style.cssText='width:18px;height:18px;min-height:18px;padding:0;border-radius:50%;border:2px solid '+(i===skin?'#fff':'rgba(255,255,255,.25)')+';background:'+t.s+';cursor:pointer'; b.onclick=()=>{ skin=i; try{ localStorage.setItem('ps-skin',String(i)); }catch(_){} [...sw.children].forEach((x,j)=>{ x.style.borderColor=j===i?'#fff':'rgba(255,255,255,.25)'; }); if(!raf){ last=0; raf=requestAnimationFrame(tick); } }; sw.appendChild(b); });
  ctrl.append(sw,btn); host.appendChild(ctrl);
}
function layout(kb){
  const sv=kb&&kb.firstElementChild, W=(sv&&sv.clientWidth)||kb.offsetWidth, KH=(sv&&sv.clientHeight)||kb.offsetHeight; if(!W||!KH) return false;
  const kw=W*14/(36*14+2), HP=36, lk=kw*Math.min(1,KH/(4.25*kw)), wh=[0,2,4,5,7,9,11];
  /* y runs up from the bottom of the overlay (the arm runs off that edge); the whole group is flipped so the hands come in from the player's side and point away.
     Fingertips rest on the keys and every finger segment stays within the keyboard; only the back of the hand reaches below it. */
  geo={kw,lk,HP,kbH:KH,W,xOf:m=>{ const pc=((m%12)+12)%12, white=wh.includes(pc); let n=0; for(let q=36;q<m;q++) if(wh.includes(((q%12)+12)%12)) n++; const u=white?1+(n+.5)*14:1+n*14; return u/(36*14+2)*W; },
        yOf:m=>wh.includes(((m%12)+12)%12)?HP+KH*0.34:HP+KH*0.48};
  host.style.paddingTop=''; host.style.paddingBottom='24px'; set(svg,{width:W,height:HP+KH,viewBox:'0 0 '+W+' '+(HP+KH)}); host._hw.style.height=(HP+KH)+'px'; host._hw.style.display=on?'':'none';
  sw.style.display=on?'flex':'none'; btn.textContent=on?'Hands: on':'Hands: off'; btn.setAttribute('aria-pressed',String(on)); ctrl.hidden=false; return true;
}
/* Crossing pose. Phase one (thumb under): after finger k (2 to 4) the thumb travels under the palm and lands between finger k and the next one
   (for 3 that is between the middle and ring fingers) while finger k stays where it is. Phase two (fingers over the thumb or the hand moving on):
   the thumb stays on its key and the palm slides past it so the next finger sits right beside the thumb. Descending right hand and ascending left hand
   do the same thing in reverse: finger k crosses over the thumb. sx() gives where each finger sits in the crossing pose (thumb 0). */
const sx=(k,i)=>i===0?(SLOT[k-1]+SLOT[k])/2:SLOT[i];   /* in the crossing pose the fingers keep their shape; only the thumb moves, to sit between finger k and the next */
function target(h,m,f){
  if(m==null||!f){ h.on=false; h.init=false; h.cm=null; h.cf=0; h.pm=null; h.pf=0; return; }
  const {kw,lk,xOf,yOf}=geo, dir=h.side==='rh'?1:-1, fi=f-1;
  const chg=(h.cm!==m||h.cf!==f);
  if(chg){ h.pm=h.cm; h.pf=h.cf; h.cm=m; h.cf=f; }
  let k=0;
  if(h.init&&h.pm!=null&&m!==h.pm&&Math.abs(m-h.pm)<=3){ const d=Math.sign(m-h.pm)*dir;
    if(d>0&&f===1&&h.pf>=2&&h.pf<=4) k=h.pf;            /* thumb goes under */
    else if(d<0&&h.pf===1&&f>=2&&f<=4) k=f; }            /* finger goes over the thumb */
  if(k) h.k=k; h.cT=k?1:0;
  const slot=k?sx(k,fi):SLOT[fi], fullX=xOf(m)-slot*dir*kw, fullY=yOf(m)-1.95*lk*.94+kw*.15;
  /* the hand keeps its shape: the back of the hand carries every finger over its own key and moves as one piece */
  if(h.init&&Math.abs(fullX-h.tx)>kw*4.2) h.init=false;   /* a big jump (restart, or a far tap) moves the hand straight there instead of dragging it across the keys */
  h.tx=fullX; h.ty=fullY;
  h.on=true; h.f=f;
  const by=h.ty-kw*.15, phase2=h.pf===1&&f!==1&&!k&&h.init;
  for(let i=0;i<5;i++){
    if(i===fi){ h.ftx[i]=xOf(m)+(i===0?dir*kw*.38:0); h.fty[i]=i===0?yOf(m)-lk*1.1:yOf(m)-kw*.1; }   /* thumb plays on its side, fingers on their tips */
    else if(i===0){ if(!phase2||!h.init) h.ftx[0]=h.tx+(k?sx(h.k,0):SLOT[0])*dir*kw; h.fty[0]=h.ty+.3*lk; }
    else { h.ftx[i]=h.tx+(SLOT[i]+(sx(h.k,i)-SLOT[i])*h.cT)*dir*kw; h.fty[i]=by+KY[i]*lk+.8*LMAX[i]*lk-kw*.1; }
  }
  if(!h.init){ h.init=true; h.x=h.tx; h.py=h.ty; h.c=h.cT; for(let i=0;i<5;i++){ h.fx[i]=h.ftx[i]; h.fy[i]=h.fty[i]; } }
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
function tick(t){
  raf=0; if(!svg||!host||!host.isConnected) return; const dt=Math.min(.05,last?(t-last)/1000:.016); last=t;
  const k1=1-Math.exp(-dt*13), k2=1-Math.exp(-dt*22); let moving=false;
  ['lh','rh'].forEach(k=>{ const h=H[k]; if(!h.on){ set(h.g,{display:'none'}); return; }
    h.x+=(h.tx-h.x)*k1*.8; h.py+=(h.ty-h.py)*k1*.8; h.c+=(h.cT-h.c)*k1;
    let mv=Math.abs(h.tx-h.x)>.3||Math.abs(h.ty-h.py)>.3||Math.abs(h.cT-h.c)>.01;
    for(let i=0;i<5;i++){ const kk=i===0?k1:k2, far=i===0&&Math.abs(h.ftx[0]-h.fx[0])>geo.kw*.6, ty=far&&h.f!==1?h.fty[0]-geo.kw*.7:(far?h.fty[0]-geo.kw*.9:h.fty[i]);
      h.fx[i]+=(h.ftx[i]-h.fx[i])*kk; h.fy[i]+=(ty-h.fy[i])*kk; if(Math.abs(h.ftx[i]-h.fx[i])>.3||Math.abs(ty-h.fy[i])>.3) mv=true; }
    if(mv) moving=true; draw(h); });
  if(moving) raf=requestAnimationFrame(tick);
}

const mix=(a,b,t)=>{ const f=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16)), A=f(a),B=f(b); return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'; };
/* a finger is built from segments (three for a finger, two for the thumb), each a tapered piece with its own outline so the joints show */
function segP(ax,ay,bx,by,wa,wb,cap){
  const dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, px=-uy, py=ux, r=wb/2, ex=cap?bx-ux*r:bx, ey=cap?by-uy*r:by;
  const P=(x,y,w,sd)=>(x+px*w/2*sd).toFixed(1)+' '+(y+py*w/2*sd).toFixed(1);
  return 'M'+P(ax,ay,wa,1)+'L'+P(ex,ey,wb,1)+(cap?'A'+r.toFixed(1)+' '+r.toFixed(1)+' 0 0 0 '+P(ex,ey,wb,-1):'L'+P(ex,ey,wb,-1))+'L'+P(ax,ay,wa,-1)+'Z';
}
function finger(n,bx,by,tx,ty,wb,T,act,num,kw,tp,fr,curl){
  curl=curl||0; const ns=n.seg.length, F=fr||(ns===3?[.46+.07*curl,.76+.06*curl,1]:[.55,1]), dx=tx-bx, dy=ty-by, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, px=-uy, py=ux;
  const wt=wb*(tp||.8), W=[wb]; for(let i=1;i<=ns;i++) W.push(wb+(wt-wb)*(i/ns));
  let ax=bx, ay=by;
  for(let i=0;i<ns;i++){ const q=F[i], qx=bx+dx*q, qy=by+dy*q, last=i===ns-1;
    set(n.seg[i],{d:segP(ax,ay,qx,qy,W[i],W[i+1],last),fill:(last&&ns===3)?mix(T.s,T.d,.45*curl):T.s,stroke:T.e,'stroke-width':1}); ax=qx-ux*kw*.05; ay=qy-uy*kw*.05; }
  const o=wb*.22; set(n.hl,{d:'M'+(bx+ux*kw*.3-px*o).toFixed(1)+' '+(by+uy*kw*.3-py*o).toFixed(1)+'L'+(tx-ux*kw*.35-px*o*.8).toFixed(1)+' '+(ty-uy*kw*.35-py*o*.8).toFixed(1),stroke:mix('#ffffff',T.s,.5),'stroke-width':wb*.18,opacity:.45});
  nail(n,tx,ty,kw,num,act,T,ux,uy,wt);
}
function draw(h){
  const T=TONES[skin], {kw,lk}=geo, dir=h.side==='rh'?1:-1, g=h.g, c=h.c, lerp=(a,b)=>a+(b-a)*c; set(g,{display:'',transform:'translate(0 '+(geo.HP+geo.kbH)+') scale(1 -1)'});
  const palmH=lk*PALMH, pb=h.py, pt=pb-palmH, cx=h.x;
  [[0,T.d],[.3,T.s],[.62,mix(T.s,'#ffffff',.14)],[1,T.d]].forEach(([o,col],i)=>set(gs[i],{offset:o,'stop-color':col}));
  set(h.fore,{d:'M'+(cx-kw*1.1)+' '+(pt+kw*.1)+'L'+(cx-kw*1.3)+' '+(pt-kw*2.2)+'L'+(cx+kw*1.3)+' '+(pt-kw*2.2)+'L'+(cx+kw*1.1)+' '+(pt+kw*.1)+'Z',fill:'url(#psgp)',stroke:T.e,'stroke-width':1});

  /* dressed wrist: bare wrist with the watch (left hand) or bracelet (right hand), a white shirt cuff, then a black suit sleeve running off the bottom */
  { const Wy=d=>(pt-d*kw).toFixed(1), Wx=d=>(cx+d*kw).toFixed(1);
    set(h.sl,{d:'M'+Wx(-1.75)+' '+Wy(1.85)+'L'+Wx(1.75)+' '+Wy(1.85)+'L'+Wx(1.95)+' '+Wy(3.4)+'L'+Wx(-1.95)+' '+Wy(3.4)+'Z',fill:'#2a2d37',stroke:'#4b4f5e','stroke-width':1,'stroke-linejoin':'round'});
    set(h.cu,{d:'M'+Wx(-1.45)+' '+Wy(1.25)+'L'+Wx(1.45)+' '+Wy(1.25)+'L'+Wx(1.5)+' '+Wy(2.05)+'L'+Wx(-1.5)+' '+Wy(2.05)+'Z',fill:'#fbfbf8',stroke:'#c9c9c2','stroke-width':1,'stroke-linejoin':'round'});
    set(h.cb,{cx:Wx(dir*.95),cy:Wy(1.65),r:(kw*.13).toFixed(1),fill:'#e4e4de',stroke:'#b9b9b0','stroke-width':.8});
    const A=h.ac; set(A,{transform:'translate(0 '+(-kw*.3).toFixed(1)+')'}); while(A.firstChild) A.removeChild(A.firstChild);
    if(h.side==='lh'){
      el(A,'path',{d:'M'+Wx(-1.2)+' '+Wy(.12)+'L'+Wx(1.2)+' '+Wy(.12)+'L'+Wx(1.2)+' '+Wy(.9)+'L'+Wx(-1.2)+' '+Wy(.9)+'Z',fill:'#241a12',stroke:'#0c0805','stroke-width':1});
      el(A,'rect',{x:Wx(-.78),y:Wy(.98),width:(kw*1.56).toFixed(1),height:(kw*.98).toFixed(1),rx:(kw*.3).toFixed(1),fill:'#d9b25a',stroke:'#8a6a1f','stroke-width':1});
      el(A,'rect',{x:Wx(-.64),y:Wy(.84),width:(kw*1.28).toFixed(1),height:(kw*.7).toFixed(1),rx:(kw*.22).toFixed(1),fill:'#0f1b33',stroke:'#f3e3b0','stroke-width':.8});
      el(A,'path',{d:'M'+Wx(0)+' '+Wy(.49)+'L'+Wx(0)+' '+Wy(.7)+'M'+Wx(0)+' '+Wy(.49)+'L'+Wx(.3)+' '+Wy(.4),stroke:'#f3e3b0','stroke-width':1,'stroke-linecap':'round'});
      el(A,'rect',{x:Wx(.78),y:Wy(.62),width:(kw*.12).toFixed(1),height:(kw*.24).toFixed(1),rx:1,fill:'#d9b25a'});
    } else {
      el(A,'path',{d:'M'+Wx(-1.2)+' '+Wy(.18)+'L'+Wx(1.2)+' '+Wy(.18)+'L'+Wx(1.2)+' '+Wy(.55)+'L'+Wx(-1.2)+' '+Wy(.55)+'Z',fill:'#d9b25a',stroke:'#8a6a1f','stroke-width':1});
      for(let i=-4;i<=4;i++) el(A,'circle',{cx:Wx(i*.27),cy:Wy(.37),r:(kw*.1).toFixed(1),fill:'#f6e3a2',stroke:'#8a6a1f','stroke-width':.6});
      el(A,'path',{d:'M'+Wx(-1.2)+' '+Wy(.64)+'L'+Wx(1.2)+' '+Wy(.64)+'L'+Wx(1.2)+' '+Wy(.78)+'L'+Wx(-1.2)+' '+Wy(.78)+'Z',fill:'#c9a24a',stroke:'#8a6a1f','stroke-width':.8});
    } }
  /* thumb (two segments) is behind the palm so it passes under it; it plays on its side, so the contact edge is the outer one */
  const baseX=cx+lerp(-1.45,-.1)*dir*kw, baseY=pb-lk*1.2; let ty0=Math.min(h.fy[0],baseY+lk*3.4);
  const X=d=>(cx+dir*d*kw).toFixed(1), Y=d=>(pb-d*kw).toFixed(1);
  const mound='M'+X(-1.2)+' '+Y(-.2)+'C'+X(-2.1)+' '+Y(-.2)+' '+X(-2.4)+' '+Y(1.5)+' '+X(-1.85)+' '+Y(2.7)+'Q'+X(-1.5)+' '+Y(3.3)+' '+X(-1.0)+' '+Y(3.2)+'Z';
  set(h.m1,{d:mound,fill:T.s,stroke:T.e,'stroke-width':1,'stroke-linejoin':'round'});
  let ttx=h.fx[0]; { const dx=ttx-baseX, dy=ty0-baseY, dl=Math.hypot(dx,dy), mxl=lk*2.7+kw*.6; if(dl>mxl){ ttx=baseX+dx*mxl/dl; ty0=baseY+dy*mxl/dl; } }
  finger(h.thumb,baseX,baseY,ttx,ty0,kw*1.4,T,h.f===1,1,kw,.6,[.55,1]);
  set(h.m2,{d:mound,fill:T.s,stroke:'none'});
  /* fingers 2 to 5: each reaches from its knuckle to its own tip position; the one playing goes on top */
  const order=[1,2,3,4].filter(i=>i!==h.f-1).concat([1,2,3,4].filter(i=>i===h.f-1));
  if(h.zf!==h.f){ h.zf=h.f; order.forEach(i=>{ g.insertBefore(h.fing[i-1].g,h.palm); }); }
  order.forEach(i=>{ const bx=cx+KNUCK[i]*dir*kw, by=pb-kw*.15+KY[i]*lk; let tx=h.fx[i], ty=h.fy[i]; const L=Math.hypot(tx-bx,ty-by), mx=LMAX[i]*lk*1.2; if(L>mx){ tx=bx+(tx-bx)*mx/L; ty=by+(ty-by)*mx/L; }
    finger(h.fing[i-1],bx,by,tx,ty,kw*FW[i],T,h.f===i+1,i+1,kw,.84,null,Math.max(0,Math.min(1,(1-Math.hypot(tx-bx,ty-by)/(LMAX[i]*lk*1.05))*3))); });
  /* back of the hand */
  const w1=kw*1.1, w2=kw*1.7;
  set(h.palm,{d:'M'+(cx-w1)+' '+pt+'C'+(cx-w1*1.25)+' '+(pt+palmH*.35)+' '+(cx-w2)+' '+(pt+palmH*.4)+' '+(cx-w2)+' '+(pb-kw*.55)+'Q'+(cx-w2)+' '+(pb+kw*.1)+' '+(cx-kw*1.35)+' '+(pb+kw*.05)+'Q'+(cx-kw*.45)+' '+(pb+kw*.22)+' '+cx+' '+(pb+kw*.2)+'Q'+(cx+kw*.45)+' '+(pb+kw*.22)+' '+(cx+kw*1.35)+' '+(pb+kw*.05)+'Q'+(cx+w2)+' '+(pb+kw*.1)+' '+(cx+w2)+' '+(pb-kw*.55)+'C'+(cx+w2)+' '+(pt+palmH*.4)+' '+(cx+w1*1.25)+' '+(pt+palmH*.35)+' '+(cx+w1)+' '+pt+'Z',fill:'url(#psgp)',stroke:'none'});
  const Z=d=>(cx+dir*d*kw).toFixed(1), pH=palmH/kw;
  set(h.pout,{d:'M'+Z(-1.35)+' '+(pb+kw*.05).toFixed(1)+'Q'+Z(-.45)+' '+(pb+kw*.22).toFixed(1)+' '+Z(0)+' '+(pb+kw*.2).toFixed(1)+'Q'+Z(.45)+' '+(pb+kw*.22).toFixed(1)+' '+Z(1.35)+' '+(pb+kw*.05).toFixed(1)+'Q'+Z(1.7)+' '+(pb+kw*.1).toFixed(1)+' '+Z(1.7)+' '+(pb-kw*.55).toFixed(1)+'C'+Z(1.7)+' '+(pt+palmH*.4).toFixed(1)+' '+Z(1.1*1.25)+' '+(pt+palmH*.35).toFixed(1)+' '+Z(1.1)+' '+pt.toFixed(1)+'M'+Z(-1.1)+' '+pt.toFixed(1)+'C'+Z(-1.1*1.25)+' '+(pt+palmH*.35).toFixed(1)+' '+Z(-1.7)+' '+(pt+palmH*.4).toFixed(1)+' '+Z(-1.7)+' '+(pt+palmH*.62).toFixed(1),stroke:T.e,'stroke-width':1});
}
function nail(n,tx,ty,kw,num,act,T,ux,uy,wt){
  /* a small numbered badge on the fingertip (yellow on the finger that is playing) */
  const bx=tx-ux*kw*.28, by=ty-uy*kw*.28, r=kw*.33;
  set(n.n,{cx:bx,cy:by,rx:r,ry:r,fill:act?'#ffd43b':'rgba(18,26,48,.82)',stroke:act?'#b8860b':'rgba(255,255,255,.7)','stroke-width':1,transform:''});
  const y2=by-kw*.15; set(n.t,{x:bx,y:y2,'font-size':Math.max(9,Math.min(13,kw*.55)),fill:act?'#2a1a0d':'#fff',transform:'translate('+bx+' '+y2+') scale(1 -1) translate('+(-bx)+' '+(-y2)+')'}); n.t.textContent=String(num);
}
window.PSHANDS={sync,tones:TONES,isOn:()=>on};
})();
