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
const SKINM=[ '1.06 0 0 0 .03  0 1.09 0 0 .04  0 0 1.12 0 .05  0 0 0 1 0', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0', '.84 0 0 0 0  0 .74 0 0 0  0 0 .64 0 0  0 0 0 1 0', '.6 0 0 0 0  0 .47 0 0 0  0 0 .38 0 0  0 0 0 1 0', '.4 0 0 0 0  0 .3 0 0 0  0 0 .24 0 0  0 0 0 1 0' ]; let skinM=null;
let skin=1; try{ const r=localStorage.getItem('ps-skin'), v=r===null?-1:+r; if(v>=0&&v<TONES.length) skin=v; }catch(_){}
const LMAX=[1.6,2.0,2.2,2.0,1.55];       /* reach from the knuckle to the fingertip, in key widths, when the finger is playing (a resting finger is curled, so it looks shorter from above) */
const KY=[0,-.08,.08,-.08,-.3];                 /* knuckle arch: the middle knuckle sits furthest forward, the little finger's furthest back */            /* finger lengths in key widths, thumb first */
const SLOT=[-2.5,-1.5,-0.5,0.5,1.5];           /* where each finger sits over the keys (right hand; the left hand is mirrored) */
const KNUCK=[-1.7,-1.4,-0.47,0.47,1.4];   /* where each finger joins the palm */
const FW=[0.95,0.78,0.8,0.77,0.68];
const PALMH=1.8;                                /* the back of the hand is as long as it is wide; the arm runs off the bottom edge */                /* finger widths in key widths */
let PH={ready:false,meta:null,lmeta:null}; const kick=()=>{ if(!raf&&svg){ last=0; raf=requestAnimationFrame(tick); } };
try{ fetch('hands/meta.json?v=4').then(r=>r.json()).then(m=>{ PH.meta=m; PH.ready=true; kick(); }).catch(()=>{});
  /* a separate photo of the left hand, when there is one (built flipped, so it is placed like the right hand and mirrored back) */
  fetch('hands/lh/meta.json?v=4').then(r=>r.ok?r.json():null).then(m=>{ if(!m) return; PH.lmeta=m; const h=H.lh; if(h&&h.pi) Object.keys(h.pi).forEach(n=>h.pi[n].setAttribute('href','hands/lh/'+n+'.webp?v=4')); kick(); }).catch(()=>{}); }catch(_){}
let mode='3d';   /* only the 3D hands are offered now; the photo and drawn hands stay in the code */
let real=mode!=='drawn';
/* 3D hands (hand3d.js): loaded only when chosen */
let P3=null, p3skin=null;
function g3(){ return {W:geo.W,kw:geo.kw,KH:geo.kbH,HP:geo.HP}; }
function load3d(){ if(P3||!host) return; import('./hand3d.js?v=25').then(m=>m.init(host._hw).then(()=>{ P3=m; m.resize(g3()); m.show(mode==='3d'); window.addEventListener('ps3d-tex',()=>{ last=0; if(!raf) raf=requestAnimationFrame(tick); }); last=0; if(!raf) raf=requestAnimationFrame(tick); })).catch(e=>{ console.warn('3D hands unavailable',e); if(mode==='3d'){ mode='real'; real=true; } }); }
/* chords: a hand of its own, separate from the scale hand. Every chord finger lands on its key (black keys near their front end, and when
   the chord uses black keys the white-key fingers play further in, between them), the fingers the chord doesn't use wait just above
   their keys, the knuckles sit across the chord and the hand sits back just far enough that every finger reaches down onto its key. */
function pose3c(h){
  const {kw,kbH}=geo, s=kw/0.0235, dir=h.side==='rh'?1:-1, pos=h.pos||{}, pr=h.press||[], own=(h.own&&h.own.length?h.own:pr);
  if(p3skin!==skin){ P3.setSkin(skin); p3skin=skin; }
  /* the hand is placed from the whole chord (every finger that has a chord note), so it stays still while the notes are played one by one;
     the fingers press as their notes sound and lift (over their own keys) when they stop. Fingers with no note in the chord rest in the hand's natural shape. */
  const isW=q=>[0,2,4,5,7,9,11].includes(((q%12)+12)%12), deep=own.some(f=>pos[f]!=null&&!isW(pos[f])), tb=own.includes(1)&&pos[1]!=null&&!isW(pos[1]);
  /* a thumb on a black key brings the whole hand in: the other fingers play their white keys far in, between the black keys */
  const dep=(f,m)=>{ const w=isW(m); if(f===1) return w?(deep?kbH*.74:kbH*.84):kbH*.5; return w?(tb?kbH*.56:deep?kbH*.66:kbH*.8):kbH*.5; };
  const KN=[-2.3,-1.28,-.43,.43,1.2];
  const cf=[1,2,3,4].filter(i=>own.includes(i+1)&&pos[i+1]!=null), cd=cf.map(i=>dep(i+1,pos[i+1])), avg=cd.length?cd.reduce((a,b)=>a+b,0)/cd.length:kbH*.8;
  /* across the keys: from the chord fingers' keys (the thumb, if it is in the chord, pulls the hand towards it) */
  let ax; if(cf.length){ ax=0; cf.forEach(i=>{ ax+=h.fx[i]-KN[i]*dir*kw; }); ax/=cf.length; } else { ax=0; for(let i=1;i<5;i++) ax+=h.fx[i]-KN[i]*dir*kw; ax/=4; }
  /* the thumb spreads away from the fingers by up to an augmented fourth (C to F#, F# to C) from the next chord finger: within that the hand stays over the fingers
     and the thumb reaches; past it the hand is drawn towards the thumb */
  if(own.includes(1)&&pos[1]!=null){ const tx=h.fx[0]+2.2*dir*kw; const nf=[2,3,4,5].find(f=>own.includes(f)&&pos[f]!=null), gap=nf?Math.abs(pos[nf]-pos[1]):99;
    if(!cf.length) ax=tx; else if(gap>6&&(ax-tx)*dir>0) ax=tb?ax*.3+tx*.7:ax*.55+tx*.45; }
  /* how far back the knuckles sit: every chord finger keeps room to curve down onto its key; the thumb draws the hand in only as far as that allows */
  const mx=cd.length?Math.max(...cd):avg, mn=cd.length?Math.min(...cd):avg, lo=mx+(tb?.026:.032)*s;
  let az=Math.max(lo,Math.min(mx+.046*s,mn+.066*s)); if(own.includes(1)&&pos[1]!=null) az=Math.max(lo,Math.min(az,dep(1,pos[1])+.036*s));
  if(!h.cd) h.cd=[0,0,0,0,0]; let moving=false; const want=[], xs=[];
  for(let i=0;i<5;i++){ const inC=own.includes(i+1)&&pos[i+1]!=null;
    if(inC){ want.push(dep(i+1,pos[i+1])); xs.push(h.fx[i]); }
    else { const kx=ax+KN[i]*dir*kw, below=[0,1,2,3,4].some(j=>j<i&&own.includes(j+1)&&pos[j+1]!=null), above=[0,1,2,3,4].some(j=>j>i&&own.includes(j+1)&&pos[j+1]!=null);
      /* a finger with no note, between two chord fingers, rests over its own key between theirs, so it never crosses the finger next to it */
      xs.push(i>0&&below&&above?h.fx[i]:kx+(h.fx[i]-kx)*.3); want.push(i===0?Math.min(kbH*.9,avg+kw*.6):Math.min(az-.04*s,avg+kw*.2)); } }
  for(let i=0;i<5;i++){ if(!h.cinit) h.cd[i]=want[i]; else { h.cd[i]+=(want[i]-h.cd[i])*.3; if(Math.abs(want[i]-h.cd[i])>.4) moving=true; } }
  h.cinit=true;
  const tips=[], yl=[0]; for(let i=0;i<5;i++){ const m=pos[i+1], play=pr.includes(i+1), inC=own.includes(i+1), blk=m!=null&&!isW(m)&&inC;
    tips.push([xs[i],h.cd[i],(blk?.011*s:0)+(play?0:inC?(i===0?.016*s:.014*s):(i===0?.02*s:.018*s))]); if(i) yl.push(inC?.9:.3); }
  h.caz=h.caz==null?az:h.caz+(az-h.caz)*.25; if(Math.abs(az-h.caz)>.4) moving=true; az=h.caz;
  h.cax=h.cax==null?ax:h.cax+(ax-h.cax)*.35; if(Math.abs(ax-h.cax)>.4) moving=true; ax=h.cax;
  if(moving){ last=0; if(!raf) raf=requestAnimationFrame(tick); }
  P3.pose({side:h.side,open:true,on:true,f:0,thr:null,threst:false,thx:null,ax,ay:.028*s,az,th:0,tips,yl});
}
function pose3(h){
  if(h.press) return pose3c(h);
  const {kw,HP,kbH}=geo, s=kw/0.0235, dir=h.side==='rh'?1:-1, SY=y=>HP+kbH-y, hf=+h.f||0;
  if(p3skin!==skin){ P3.setSkin(skin); p3skin=skin; }
  const tips=[]; for(let i=0;i<5;i++){ const sy=SY(h.fy[i]), play=h.press?h.press.includes(i+1):i===hf-1, blk=sy<kbH*.6;
    tips.push([h.fx[i],sy,(blk?.011*s:0)+(play?0:.008*s)]); }
  const chord=!!h.press; let az=0; for(let i=1;i<5;i++) az+=tips[i][1]; az/=4; az+=(chord?.05:.062)*s;
  /* the thumb hangs free, out to its side and a little lifted, unless it is playing or passing under */
  /* a thumb that isn't playing: in a hand position it rests over its own key, lifted a little and straight; with no position it hangs out to its side */
  if(hf!==1&&h.c<.3&&!(h.press&&h.press.includes(1))){ if(h.pos&&h.pos[1]!=null) tips[0]=[h.fx[0],Math.min(kbH-kw*.2,tips[0][1]),.014*s]; else tips[0]=[tips[1][0]-dir*kw*1.25,az-.034*s,.02*s]; }
  else { tips[0][1]=Math.min(kbH-kw*.2,tips[0][1]); tips[0][2]=hf===1?0:.006*s; }
  /* the thumb is shorter than the fingers: when it plays the whole hand leans in so it can reach its key, then eases back */
  const thP=h.press?h.press.includes(1):hf===1; let want=thP&&chord?Math.min(az,tips[0][1]+.024*s):az;
  /* but never so far back that a pressed finger can't reach its key (a black key sits further in): the hand comes forward just enough, so the fingers stretch out onto their keys */
  if(chord){ let far=-1e9; h.press.forEach(f=>{ if(f>1&&tips[f-1]) far=Math.max(far,tips[f-1][1]); }); if(far>-1e9) want=Math.max(want,far-.048*s); } h.az3=h.az3==null?want:h.az3+(want-h.az3)*.18; if(Math.abs(want-h.az3)>.5){ last=0; if(!raf) raf=requestAnimationFrame(tick); } az=h.az3;
  /* when the thumb plays, the hand moves a little towards the little finger so the thumb is clear of the index finger */
  const wx=(hf===1||(h.pos&&h.pos[1]!=null&&h.c<.3))&&!h.press?dir*kw*.6:0; h.ax3=h.ax3==null?wx:h.ax3+(wx-h.ax3)*.2; if(Math.abs(wx-h.ax3)>.3){ last=0; if(!raf) raf=requestAnimationFrame(tick); }
  /* in a chord the hand sits across the whole chord, thumb to little finger, so it opens evenly */
  /* in a chord the hand opens to its span: it sits across the whole chord, a little towards the thumb when the thumb has far to reach */
  let axc=h.x+h.ax3; if(chord){ const span=Math.abs(tips[4][0]-tips[0][0])/kw; axc=(tips[0][0]+tips[4][0])/2+dir*kw*(span>6?.1:.45); }
  const thRest=hf!==1&&h.c<.3&&!(h.press&&h.press.includes(1))&&!!(h.pos&&h.pos[1]!=null);
  P3.pose({side:h.side,open:chord,on:true,f:hf,thr:[kbH*.66,kbH-kw*.25],threst:thRest,thx:h.pos&&h.pos[1]!=null?h.fx[0]:null,ax:axc,ay:.03*s,az,th:-dir*.25*h.c,tips});
}
let paused=false, ro=null, lastA=null, defs=null, gp=null, gs=[], host=null, svg=null, skinBox=null, raf=0, last=0, geo={kw:20,HP:56,kbH:80,W:600,xOf:()=>0,yOf:()=>0}; const H={};
const el=(p,tag,a)=>{ const e=document.createElementNS(NS,tag); for(const k in a) e.setAttribute(k,a[k]); p.appendChild(e); return e; };
const set=(e,a)=>{ for(const k in a) e.setAttribute(k,a[k]); };

function makeHand(side){
  const g=el(svg,'g',{}), h={side,g,on:false,init:false,x:0,py:0,f:0,tx:0,ty:0,c:0,cT:0,k:3,pm:null,pf:0,cm:null,cf:0,zf:0,over:-1,
    fx:[0,0,0,0,0],fy:[0,0,0,0,0],ftx:[0,0,0,0,0],fty:[0,0,0,0,0]};
  h.fore=el(g,'path',{}); h.sl=el(g,'path',{}); h.cu=el(g,'path',{}); h.cb=el(g,'circle',{}); h.ac=el(g,'g',{}); h.m1=el(g,'path',{}); h.thumb=fingerNodes(g,2); h.m2=el(g,'path',{}); h.fing=[1,2,3,4].map(()=>fingerNodes(g,3));
  h.palm=el(g,'path',{}); h.pout=el(g,'path',{fill:'none','stroke-linejoin':'round'}); h.pl=el(g,'ellipse',{}); h.td=el(g,'path',{fill:'none','stroke-linecap':'round'}); h.top=el(g,'g',{}); h.pg=el(g,'g',{filter:'url(#psskin)',display:'none'}); h.pi={}; const pre=(side==='lh'&&PH.lmeta)?'hands/lh/':'hands/', vq='?v=4'; ['thumb','index','middle','ring','pinky','palm'].forEach(n=>{ h.pi[n]=el(h.pg,'image',Object.assign({href:pre+n+'.webp'+vq,preserveAspectRatio:'none'},n==='palm'?{mask:'url(#pswm)'}:{})); }); g.insertBefore(h.pg,h.sl); [h.sl,h.cu,h.cb,h.ac].forEach(x=>g.insertBefore(x,h.top));
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
  defs=el(svg,'defs',{}); gp=el(defs,'linearGradient',{id:'psgp',x1:0,x2:1,y1:0,y2:0}); gs=[0,1,2,3].map(()=>el(gp,'stop',{})); { const lg=(id,st)=>{ const g=el(defs,'linearGradient',{id,x1:0,x2:1,y1:0,y2:0}); st.forEach(([o,c])=>el(g,'stop',{offset:o,'stop-color':c})); };
    lg('pssl',[[0,'#13151b'],[.5,'#32353f'],[1,'#13151b']]); lg('pscu',[[0,'#dedfd7'],[.5,'#ffffff'],[1,'#dedfd7']]);
    const fg=el(defs,'linearGradient',{id:'psfd',x1:0,x2:0,y1:0,y2:1}); el(fg,'stop',{offset:0,'stop-color':'#000'}); el(fg,'stop',{offset:.65,'stop-color':'#fff'});
    { const lg=el(defs,'linearGradient',{id:'pswg',x1:0,y1:0,x2:0,y2:1}); [[0,'#fff'],[.72,'#fff'],[1,'#000']].forEach(([o,c])=>el(lg,'stop',{offset:o,'stop-color':c}));
      const mw=el(defs,'mask',{id:'pswm',maskContentUnits:'objectBoundingBox',x:0,y:0,width:1,height:1}); el(mw,'rect',{x:0,y:0,width:1,height:1,fill:'url(#pswg)'});  const lg2=el(defs,'linearGradient',{id:'pswg2',x1:0,y1:0,x2:0,y2:1}); [[0,'#000'],[.45,'#fff'],[1,'#fff']].forEach(([o,c])=>el(lg2,'stop',{offset:o,'stop-color':c}));
      const mf=el(defs,'mask',{id:'pswf',maskContentUnits:'objectBoundingBox',x:0,y:0,width:1,height:1}); el(mf,'rect',{x:0,y:0,width:1,height:1,fill:'url(#pswg2)'}); }
    const mk=el(defs,'mask',{id:'psmk',maskContentUnits:'objectBoundingBox',x:-.1,y:0,width:1.2,height:1}); el(mk,'rect',{x:-.1,y:0,width:1.2,height:1,fill:'url(#psfd)'}); }
  { const f=el(defs,'filter',{id:'psskin',x:'-5%',y:'-5%',width:'110%',height:'110%','color-interpolation-filters':'sRGB'}); skinM=el(f,'feColorMatrix',{type:'matrix',values:SKINM[skin]}); }
  makeHand('lh'); makeHand('rh');
  ctrl=document.createElement('div'); ctrl.className='p-hctl'; ctrl.style.cssText='position:absolute;right:4px;bottom:2px;display:flex;gap:6px;align-items:center;z-index:4;pointer-events:auto';
  btn=document.createElement('button'); btn.type='button'; btn.style.cssText='min-height:20px;height:20px;padding:0 9px;border-radius:999px;border:1.5px solid #3a4a74;background:#0c1426;color:#eef2ff;font:700 12px system-ui,sans-serif;cursor:pointer';
  btn.onclick=()=>{ on=!on; try{ localStorage.setItem('ps-hands',on?'1':'0'); }catch(_){} if(onChange) onChange(); };
  sw=document.createElement('span'); sw.setAttribute('role','group'); sw.setAttribute('aria-label','Skin tone'); sw.style.cssText='display:flex;gap:5px';
  TONES.forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.title=t.n+' skin'; b.setAttribute('aria-label',t.n+' skin tone'); b.style.cssText='width:18px;height:18px;min-height:18px;padding:0;border-radius:50%;border:2px solid '+(i===skin?'#fff':'rgba(255,255,255,.25)')+';background:'+t.s+';cursor:pointer'; b.onclick=()=>{ skin=i; try{ localStorage.setItem('ps-skin',String(i)); }catch(_){} [...sw.children].forEach((x,j)=>{ x.style.borderColor=j===i?'#fff':'rgba(255,255,255,.25)'; }); if(!raf){ last=0; raf=requestAnimationFrame(tick); } }; sw.appendChild(b); });
  const rb=document.createElement('button'); rb.type='button'; rb.style.cssText=btn.style.cssText; const LBL={real:'Realistic','3d':'3D',drawn:'Drawn'}, NX={real:'3d','3d':'drawn',drawn:'real'}; const rl=()=>{ rb.textContent=LBL[mode]; rb.title='Switch to '+LBL[NX[mode]]+' hands'; }; rl();
  rb.onclick=()=>{ mode=NX[mode]; real=mode!=='drawn'; if(mode==='3d') load3d(); try{ localStorage.setItem('ps-hmode',mode); localStorage.setItem('ps-hreal',real?'1':'0'); }catch(_){} rl(); kick(); };
  ctrl.append(sw,btn); void rb; host.appendChild(ctrl);
}
function layout(kb){
  const sv=kb&&kb.firstElementChild, W=(sv&&sv.clientWidth)||kb.offsetWidth, KH=(sv&&sv.clientHeight)||kb.offsetHeight; if(!W||!KH) return false;
  /* the keyboard may show any range (the phone shows only the octaves in use): read it from the drawing */
  const vb=sv&&sv.viewBox&&sv.viewBox.baseVal, Wv=(vb&&vb.width)||(36*14+2); let lo=36; if(sv){ const ms=[...sv.querySelectorAll('rect[data-m]')].map(r=>+r.dataset.m); if(ms.length) lo=Math.min(...ms); }
  const kw=W*14/Wv, HP=36, lk=kw*Math.min(1,KH/(4.25*kw)), wh=[0,2,4,5,7,9,11];
  /* y runs up from the bottom of the overlay (the arm runs off that edge); the whole group is flipped so the hands come in from the player's side and point away.
     Fingertips rest on the keys and every finger segment stays within the keyboard; only the back of the hand reaches below it. */
  geo={kw,lk,HP,kbH:KH,W,xOf:m=>{ const pc=((m%12)+12)%12, white=wh.includes(pc); let n=0; if(m>=lo){ for(let q=lo;q<m;q++) if(wh.includes(((q%12)+12)%12)) n++; } else { for(let q=m;q<lo;q++) if(wh.includes(((q%12)+12)%12)) n--; } const u=white?1+(n+.5)*14:1+n*14; return u/Wv*W; },
        yOf:m=>wh.includes(((m%12)+12)%12)?HP+KH*0.22:HP+KH*0.62};  /* white notes are played low on the wide part, leaving room for the key labels above */
  host.style.paddingTop=''; host.style.paddingBottom='24px'; set(svg,{width:W,height:HP+KH,viewBox:'0 0 '+W+' '+(HP+KH)}); host._hw.style.height=(HP+KH)+'px'; host._hw.style.display=on?'':'none';
  sw.style.display=on?'flex':'none'; btn.textContent='Hands'; btn.title=on?'Hide the hands':'Show the hands'; btn.setAttribute('aria-pressed',String(on)); btn.style.background=on?'#e9c46a':''; btn.style.color=on?'#1b1405':''; btn.style.borderColor=on?'#e9c46a':''; ctrl.hidden=false; if(P3) P3.resize(g3()); return true;
}
/* Crossing pose. Phase one (thumb under): after finger k (2 to 4) the thumb travels under the palm and lands between finger k and the next one
   (for 3 that is between the middle and ring fingers) while finger k stays where it is. Phase two (fingers over the thumb or the hand moving on):
   the thumb stays on its key and the palm slides past it so the next finger sits right beside the thumb. Descending right hand and ascending left hand
   do the same thing in reverse: finger k crosses over the thumb. sx() gives where each finger sits in the crossing pose (thumb 0). */
const sx=(k,i)=>i===0?(SLOT[k-1]+SLOT[k])/2:SLOT[i];   /* in the crossing pose the fingers keep their shape; only the thumb moves, to sit between finger k and the next */
function target(h,m,f,pos){
  if(pos===undefined) pos=h.pos; h.pos=pos||null;
  if(m==null||!f){ h.on=false; h.init=false; h.cm=null; h.cf=0; h.pm=null; h.pf=0; return; }
  const {kw,lk,xOf,yOf}=geo, dir=h.side==='rh'?1:-1, fi=f-1;
  const chg=(h.cm!==m||h.cf!==f);
  if(chg){ h.pm=h.cm; h.pf=h.cf; h.cm=m; h.cf=f; }
  let k=0; if(chg) h.rel=false;
  if(!h.rel&&h.init&&h.pm!=null&&m!==h.pm&&Math.abs(m-h.pm)<=3){ const d=Math.sign(m-h.pm)*dir;
    if(d>0&&f===1&&h.pf>=2&&h.pf<=4) k=h.pf;            /* thumb goes under */
    else if(d<0&&h.pf===1&&f>=2&&f<=4) k=f; }            /* finger goes over the thumb */
  const over=!!k&&h.init&&h.pm!=null&&h.pf===1&&f>=2&&k===f; h.over=over?fi:-1;   /* the thumb stays on its key while this finger passes over it */
  if(k) h.k=k; h.cT=k?1:0;
  h.fast=h.side==='rh'&&!!k;   /* right hand crossing: the thumb goes under and the fingers move over as fast as they can */
  /* in a black-key position (two or more of fingers 2-5 on black keys) the hand moves forward and white notes are played further in, between the black keys */
  const isW=q=>[0,2,4,5,7,9,11].includes(((q%12)+12)%12), deep=!!pos&&[2,3,4,5].filter(q=>pos[q]!=null&&!isW(pos[q])).length>=2, yF=q=>h.press&&!isW(q)?geo.HP+geo.kbH*.47:deep&&isW(q)?geo.HP+geo.kbH*.45:yOf(q);   /* chords only: black keys are played near their front end */
  const slot=k?sx(k,fi):SLOT[fi]; let fullX=xOf(m)-slot*dir*kw; let fullY=yF(m)-1.95*lk*.94+kw*.15;
  /* in a hand position the hand sits over its keys: placed from where fingers 2 to 5 belong */
  if(pos&&!k){ let a=0,n=0,yy=0; for(let q=2;q<=5;q++) if(pos[q]!=null){ a+=xOf(pos[q])-SLOT[q-1]*dir*kw; yy+=yF(pos[q]); n++; } if(n){ fullX=a/n; fullY=yy/n-1.95*lk*.94+kw*.15; } }
  /* the hand keeps its shape: the back of the hand carries every finger over its own key and moves as one piece */
  if(h.init&&Math.abs(fullX-h.tx)>kw*4.2) h.init=false;   /* a big jump (restart, or a far tap) moves the hand straight there instead of dragging it across the keys */
  h.tx=fullX; h.ty=fullY;
  h.on=true; h.f=f;
  const by=h.ty-kw*.15, phase2=h.pf===1&&f!==1&&!k&&h.init; if(h.side==='rh'&&phase2) h.fast=true;
  for(let i=0;i<5;i++){
    if(i!==fi&&pos&&h.press&&h.press.includes(i+1)&&pos[i+1]!=null){ const p=pos[i+1]; h.ftx[i]=xOf(p)+(i===0?dir*kw*.38:0); h.fty[i]=i===0?Math.max(geo.HP+kw*.3,yF(p)-kw*.45):yF(p)-kw*.1; continue; }
    if(i===fi){ h.ftx[i]=xOf(m)+(i===0?dir*kw*.38:0); h.fty[i]=i===0?Math.max(geo.HP+kw*.3,yF(m)-kw*.45):yF(m)-kw*.1; }   /* thumb plays on its side, fingers on their tips */
    else if(i===0){ if(!over||!h.init){ if(!phase2||!h.init) h.ftx[0]=h.tx+(k?sx(h.k,0):SLOT[0])*dir*kw; h.fty[0]=h.ty+.3*lk; } }
    else { h.ftx[i]=h.tx+(SLOT[i]+(sx(h.k,i)-SLOT[i])*h.cT)*dir*kw; h.fty[i]=by+KY[i]*lk+.8*LMAX[i]*lk-kw*.1; }
    /* in a hand position every other finger waits just above its own key */
    if(pos&&!k&&i!==fi&&pos[i+1]!=null&&!(h.press&&h.press.includes(i+1))){ const p=pos[i+1]; h.ftx[i]=xOf(p)+(i===0?dir*kw*.38:0); h.fty[i]=(i===0?Math.max(geo.HP+kw*.3,yF(p)-kw*.45):yF(p)-kw*.1)-kw*.12; }
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
  H.rh.press=s&&s.rpress||null; H.lh.press=s&&s.lpress||null; H.rh.own=s&&s.rown||null; H.lh.own=s&&s.lown||null;
  target(H.rh,on&&hasR?s.rh[0]:null,hasR?+s.fing:0,s&&s.rpos||null); target(H.lh,on&&hasL?s.lh[0]:null,hasL?+s.lfing:0,s&&s.lpos||null);
  ['rh','lh'].forEach(k=>{ if(!H[k].on) set(H[k].g,{display:'none'}); });
  if(!raf&&!paused){ last=0; raf=requestAnimationFrame(tick); }
}
function lead(s){ if(lastA&&!paused) sync(lastA[0],lastA[1],s,lastA[3]); }   /* the hands get ready for the next note a little early */
function pause(b){ paused=!!b; if(paused){ if(raf){ cancelAnimationFrame(raf); raf=0; } } else if(!raf){ last=0; raf=requestAnimationFrame(tick); } }
let lastR=0;
function tick(t){
  raf=0; if(!svg||!host||!host.isConnected) return; const dt=Math.min(.05,last?(t-last)/1000:.016); last=t;
  let moving=false; const dl=[];
  ['lh','rh'].forEach(k=>{ const h=H[k]; if(!h.on){ set(h.g,{display:'none'}); if(P3) P3.pose({side:k,on:false}); return; }
    const sp=h.fast?5:1, k1=1-Math.exp(-dt*13*sp), k2=1-Math.exp(-dt*22*sp);
    h.x+=(h.tx-h.x)*k1*.8; h.py+=(h.ty-h.py)*k1*.8; h.c+=(h.cT-h.c)*k1;
    let mv=Math.abs(h.tx-h.x)>.3||Math.abs(h.ty-h.py)>.3||Math.abs(h.cT-h.c)>.01;
    for(let i=0;i<5;i++){ const ov=i===h.over, kk=i===0?k1:(ov?1-Math.exp(-dt*8):k2), far=i===0&&Math.abs(h.ftx[0]-h.fx[0])>geo.kw*.6, ty=ov&&Math.abs(h.ftx[i]-h.fx[i])>geo.kw*.5?h.fty[i]-geo.kw*.9:far&&h.f!==1?h.fty[0]-geo.kw*.7:(far?h.fty[0]-geo.kw*.9:h.fty[i]);
      h.fx[i]+=(h.ftx[i]-h.fx[i])*kk; h.fy[i]+=(ty-h.fy[i])*kk; if(Math.abs(h.ftx[i]-h.fx[i])>.3||Math.abs(ty-h.fy[i])>.3) mv=true; }
    if(h.cT===1&&!h.rel&&h.f){ const i=h.f-1; if(Math.abs(h.ftx[i]-h.fx[i])<geo.kw*.12&&Math.abs(h.fty[i]-h.fy[i])<geo.kw*.3){ h.rel=true; target(h,h.cm,h.cf); mv=true; } }
    if(mv) moving=true; dl.push(h); });
  /* the 3D hands are posed and drawn at most about 30 times a second while moving, so fast passages leave the page time to keep the music steady */
  const skip=P3&&mode==='3d'&&moving&&lastR&&t-lastR<30;
  if(!skip){ dl.forEach(draw); if(P3&&mode==='3d'){ P3.show(true); P3.render(); } lastR=t; }
  if(moving) raf=requestAnimationFrame(tick);
}

const mix=(a,b,t)=>{ const f=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16)), A=f(a),B=f(b); return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')'; };
/* a finger is built from segments (three for a finger, two for the thumb), each a tapered piece with its own outline so the joints show */
function segP(ax,ay,bx,by,wa,wb,cap){
  const dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, px=-uy, py=ux, r=wb/2, ex=cap?bx-ux*r:bx, ey=cap?by-uy*r:by;
  const P=(x,y,w,sd)=>(x+px*w/2*sd).toFixed(1)+' '+(y+py*w/2*sd).toFixed(1);
  return 'M'+P(ax,ay,wa,1)+'L'+P(ex,ey,wb,1)+(cap?'A'+r.toFixed(1)+' '+r.toFixed(1)+' 0 0 0 '+P(ex,ey,wb,-1):'L'+P(ex,ey,wb,-1))+'L'+P(ax,ay,wa,-1)+'Z';
}
/* one soft closed shape through its points (curves run through the midpoints, so there are no hard corners) */
function smooth(P){ const n=P.length, m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2], f=v=>v[0].toFixed(1)+' '+v[1].toFixed(1); let d='M'+f(m(P[n-1],P[0]));
  for(let i=0;i<n;i++){ const a=P[i], c=P[(i+1)%n]; d+='Q'+f(a)+' '+f(m(a,c)); } return d+'Z'; }
function finger(n,bx,by,tx,ty,wb,T,act,num,kw,tp,fr,curl){
  curl=curl||0; const ns=n.seg.length, dx=tx-bx, dy=ty-by, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, px=-uy, py=ux, wt=wb*(tp||.8), bow=L*.03;
  const wAt=t=>(wb+(wt-wb)*t)*(1+.07*Math.exp(-Math.pow((t-.46)/.1,2))+.05*Math.exp(-Math.pow((t-.77)/.08,2)));
  const ax=t=>[bx+dx*t+px*bow*Math.sin(Math.PI*t), by+dy*t+py*bow*Math.sin(Math.PI*t)];
  const side=(t,s)=>{ const c=ax(t), w=wAt(t)/2; return [c[0]+px*w*s,c[1]+py*w*s]; };
  const r=wt/2, tc=1-r/L, C=ax(tc), P=[];
  [0,.2,.4,.58,.74,.88].forEach(t=>P.push(side(t,1)));
  [.3,.62,.9].forEach(k=>{ const a=k*Math.PI; P.push([C[0]+(px*Math.cos(a)+ux*Math.sin(a))*r*1.02, C[1]+(py*Math.cos(a)+uy*Math.sin(a))*r*1.02]); });
  [.88,.74,.58,.4,.2,0].forEach(t=>P.push(side(t,-1)));
  const soft=mix(T.e,T.s,.45);
  set(n.seg[0],{d:smooth(P),fill:T.s,stroke:'none'});
  const sh=ns===3?n.seg[1]:null, cr=ns===3?n.seg[2]:n.seg[1], q=(t,o)=>{ const c=ax(t), w=wAt(t); return [c[0]+px*w*o,c[1]+py*w*o]; };
  if(sh){ const A=q(.12,.27), B=q(.9,.22); set(sh,{d:'M'+A[0].toFixed(1)+' '+A[1].toFixed(1)+'L'+B[0].toFixed(1)+' '+B[1].toFixed(1),fill:'none',stroke:T.d,'stroke-width':(wb*.3).toFixed(1),'stroke-linecap':'round',opacity:.3}); }
  let cd=''; (ns===3?[.46+.07*curl,.76+.06*curl]:[.56]).forEach(t=>{ const c=ax(t), w=wAt(t)*.36, bulge=kw*.05; cd+='M'+(c[0]-px*w).toFixed(1)+' '+(c[1]-py*w).toFixed(1)+'Q'+(c[0]+ux*bulge).toFixed(1)+' '+(c[1]+uy*bulge).toFixed(1)+' '+(c[0]+px*w).toFixed(1)+' '+(c[1]+py*w).toFixed(1); });
  set(cr,{d:cd,fill:'none',stroke:T.e,'stroke-width':.8,'stroke-linecap':'round',opacity:.2});
  const o=wb*.2; set(n.hl,{d:'M'+(bx+ux*kw*.3-px*o).toFixed(1)+' '+(by+uy*kw*.3-py*o).toFixed(1)+'L'+(tx-ux*kw*.4-px*o*.8).toFixed(1)+' '+(ty-uy*kw*.4-py*o*.8).toFixed(1),stroke:mix('#ffffff',T.s,.55),'stroke-width':wb*.2,opacity:.4});
  nail(n,tx,ty,kw,num,act,T,ux,uy,wt);
}
function draw(h){
  const T=TONES[skin], {kw,lk}=geo, dir=h.side==='rh'?1:-1, g=h.g, c=h.c, lerp=(a,b)=>a+(b-a)*c; set(g,{display:'',transform:'translate(0 '+(geo.HP+geo.kbH)+') scale(1 -1)'});
  const palmH=lk*PALMH, pb=h.py, pt=pb-palmH, cx=h.x;
  [[0,mix(T.s,T.d,.55)],[.3,T.s],[.62,mix(T.s,'#ffffff',.08)],[1,mix(T.s,T.d,.55)]].forEach(([o,col],i)=>set(gs[i],{offset:o,'stop-color':col}));
  set(h.fore,{d:'M'+(cx-kw*1.1)+' '+(pt+kw*.1)+'L'+(cx-kw*1.3)+' '+(pt-kw*2.2)+'L'+(cx+kw*1.3)+' '+(pt-kw*2.2)+'L'+(cx+kw*1.1)+' '+(pt+kw*.1)+'Z',fill:'url(#psgp)',stroke:T.e,'stroke-width':0,mask:'url(#pswf)'});

  /* dressed wrist: bare wrist with the watch (left hand) or bracelet (right hand), a white shirt cuff, then a black suit sleeve running off the bottom */
  { const Wy=d=>(pt-d*kw).toFixed(1), Wx=d=>(cx+d*kw).toFixed(1);
    set(h.sl,{d:'M'+Wx(-2.4)+' '+Wy(1.8)+'L'+Wx(2.4)+' '+Wy(1.8)+'C'+Wx(2.55)+' '+Wy(2.3)+' '+Wx(2.85)+' '+Wy(2.9)+' '+Wx(2.95)+' '+Wy(3.9)+'L'+Wx(-2.95)+' '+Wy(3.9)+'C'+Wx(-2.85)+' '+Wy(2.9)+' '+Wx(-2.55)+' '+Wy(2.3)+' '+Wx(-2.4)+' '+Wy(1.8)+'Z',fill:'url(#pssl)',stroke:'#3d404c','stroke-width':.8,'stroke-linejoin':'round',mask:'url(#psmk)'});
    set(h.cu,{d:'M'+Wx(-2.45)+' '+Wy(1.25)+'Q'+Wx(0)+' '+Wy(1.12)+' '+Wx(2.45)+' '+Wy(1.25)+'L'+Wx(2.55)+' '+Wy(2.0)+'Q'+Wx(0)+' '+Wy(2.14)+' '+Wx(-2.55)+' '+Wy(2.0)+'Z',fill:'url(#pscu)',stroke:'#c4c4bc','stroke-width':.8,'stroke-linejoin':'round'});
    set(h.cb,{cx:Wx(dir*1.9),cy:Wy(1.65),r:(kw*.13).toFixed(1),fill:'#e4e4de',stroke:'#b9b9b0','stroke-width':.8});
    const WL=dir>0?2.3:1.7, WR=dir>0?1.7:2.3, A=h.ac; set(A,{transform:'translate(0 '+(-kw*.3).toFixed(1)+')'}); while(A.firstChild) A.removeChild(A.firstChild);
    if(h.side==='lh'){
      el(A,'path',{d:'M'+Wx(-WL)+' '+Wy(.12)+'L'+Wx(WR)+' '+Wy(.12)+'L'+Wx(WR)+' '+Wy(.9)+'L'+Wx(-WL)+' '+Wy(.9)+'Z',fill:'#241a12',stroke:'#0c0805','stroke-width':1});
      el(A,'rect',{x:Wx(-.78),y:Wy(.98),width:(kw*1.56).toFixed(1),height:(kw*.98).toFixed(1),rx:(kw*.3).toFixed(1),fill:'#d9b25a',stroke:'#8a6a1f','stroke-width':1});
      el(A,'rect',{x:Wx(-.64),y:Wy(.84),width:(kw*1.28).toFixed(1),height:(kw*.7).toFixed(1),rx:(kw*.22).toFixed(1),fill:'#0f1b33',stroke:'#f3e3b0','stroke-width':.8});
      el(A,'path',{d:'M'+Wx(0)+' '+Wy(.49)+'L'+Wx(0)+' '+Wy(.7)+'M'+Wx(0)+' '+Wy(.49)+'L'+Wx(.3)+' '+Wy(.4),stroke:'#f3e3b0','stroke-width':1,'stroke-linecap':'round'});
      el(A,'rect',{x:Wx(.78),y:Wy(.62),width:(kw*.12).toFixed(1),height:(kw*.24).toFixed(1),rx:1,fill:'#d9b25a'});
    } else {
      el(A,'path',{d:'M'+Wx(-WL)+' '+Wy(.18)+'L'+Wx(WR)+' '+Wy(.18)+'L'+Wx(WR)+' '+Wy(.55)+'L'+Wx(-WL)+' '+Wy(.55)+'Z',fill:'#d9b25a',stroke:'#8a6a1f','stroke-width':1});
      for(let i=-9;i<=9;i++) if(i*.27>-WL+.12&&i*.27<WR-.12) el(A,'circle',{cx:Wx(i*.27),cy:Wy(.37),r:(kw*.1).toFixed(1),fill:'#f6e3a2',stroke:'#8a6a1f','stroke-width':.6});
      el(A,'path',{d:'M'+Wx(-WL)+' '+Wy(.64)+'L'+Wx(WR)+' '+Wy(.64)+'L'+Wx(WR)+' '+Wy(.78)+'L'+Wx(-WL)+' '+Wy(.78)+'Z',fill:'#c9a24a',stroke:'#8a6a1f','stroke-width':.8});
    } }
  if(mode==='3d'){ if(P3){ set(g,{display:'none'}); pose3(h); return; } load3d(); }
  if(P3&&mode!=='3d') P3.show(false);
  if(real&&PH.ready&&h.pg){ drawPhoto(h,T,kw,lk,dir,pb,pt,cx,palmH); return; }
  if(h.pg) set(h.pg,{display:'none'}); [h.sl,h.cu,h.cb,h.ac].forEach(x=>set(x,{display:'none'})); ['fore','m1','m2','palm','pout','pl','td'].forEach(n=>set(h[n],{display:''}));
  /* thumb (two segments) is behind the palm so it passes under it; it plays on its side, so the contact edge is the outer one */
  const baseX=cx+lerp(-1.45,-.1)*dir*kw, baseY=pb-lk*1.2; let ty0=Math.min(h.fy[0],baseY+lk*3.4);
  const X=d=>(cx+dir*d*kw).toFixed(1), Y=d=>(pb-d*kw).toFixed(1);
  const mound='M'+X(-1.2)+' '+Y(-.2)+'C'+X(-2.1)+' '+Y(-.2)+' '+X(-2.4)+' '+Y(1.5)+' '+X(-1.85)+' '+Y(2.7)+'Q'+X(-1.5)+' '+Y(3.3)+' '+X(-1.0)+' '+Y(3.2)+'Z';
  set(h.m1,{d:mound,fill:T.s,stroke:'none'});
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
  set(h.palm,{d:'M'+(cx-w1)+' '+pt+'C'+(cx-w1*1.25)+' '+(pt+palmH*.35)+' '+(cx-w2)+' '+(pt+palmH*.4)+' '+(cx-w2)+' '+(pb-kw*.55)+'Q'+(cx-w2)+' '+(pb+kw*.1)+' '+(cx-kw*1.35)+' '+(pb+kw*.05)+'Q'+(cx-kw*.45)+' '+(pb+kw*.22)+' '+cx+' '+(pb+kw*.2)+'Q'+(cx+kw*.45)+' '+(pb+kw*.22)+' '+(cx+kw*1.35)+' '+(pb+kw*.05)+'Q'+(cx+w2)+' '+(pb+kw*.1)+' '+(cx+w2)+' '+(pb-kw*.55)+'C'+(cx+w2)+' '+(pt+palmH*.4)+' '+(cx+w1*1.25)+' '+(pt+palmH*.35)+' '+(cx+w1)+' '+pt+'Q'+cx+' '+(pt-kw*.55)+' '+(cx-w1)+' '+pt+'Z',fill:'url(#psgp)',stroke:'none'});
  const Z=d=>(cx+dir*d*kw).toFixed(1), pH=palmH/kw;
  set(h.pout,{d:'M'+Z(-1.35)+' '+(pb+kw*.05).toFixed(1)+'Q'+Z(-.45)+' '+(pb+kw*.22).toFixed(1)+' '+Z(0)+' '+(pb+kw*.2).toFixed(1)+'Q'+Z(.45)+' '+(pb+kw*.22).toFixed(1)+' '+Z(1.35)+' '+(pb+kw*.05).toFixed(1)+'Q'+Z(1.7)+' '+(pb+kw*.1).toFixed(1)+' '+Z(1.7)+' '+(pb-kw*.55).toFixed(1)+'C'+Z(1.7)+' '+(pt+palmH*.4).toFixed(1)+' '+Z(1.1*1.25)+' '+(pt+palmH*.35).toFixed(1)+' '+Z(1.1)+' '+pt.toFixed(1)+'M'+Z(-1.1)+' '+pt.toFixed(1)+'C'+Z(-1.1*1.25)+' '+(pt+palmH*.35).toFixed(1)+' '+Z(-1.7)+' '+(pt+palmH*.4).toFixed(1)+' '+Z(-1.7)+' '+(pt+palmH*.62).toFixed(1),stroke:'none','stroke-width':0});
  set(h.pl,{cx:cx,cy:pt+palmH*.56,rx:kw*.85,ry:palmH*.3,fill:'#ffffff',opacity:.1});
  { let d=''; for(let i=1;i<=4;i++){ const kx=cx+KNUCK[i]*dir*kw, ex=cx+(kx-cx)*.5; d+='M'+kx.toFixed(1)+' '+(pb-kw*.42).toFixed(1)+'Q'+((kx+ex)/2).toFixed(1)+' '+(pt+palmH*.55).toFixed(1)+' '+ex.toFixed(1)+' '+(pt+palmH*.14).toFixed(1); d+='M'+(kx-kw*.24).toFixed(1)+' '+(pb-kw*.66).toFixed(1)+'Q'+kx.toFixed(1)+' '+(pb-kw*.84).toFixed(1)+' '+(kx+kw*.24).toFixed(1)+' '+(pb-kw*.66).toFixed(1); }
    set(h.td,{d:d,stroke:T.e,'stroke-width':.8,opacity:.13}); }
  /* the finger that is playing always shows its number on top; a neighbour's number that would sit on it is hidden, so you can always tell which finger is used */
  { const nodes=[h.thumb].concat(h.fing), A=nodes[h.f-1];
    nodes.forEach((nd,i)=>{ const a=i===h.f-1, tgt=a?h.top:nd.g; [nd.n,nd.t].forEach(x=>{ if(x.parentNode!==tgt) tgt.appendChild(x); });
      const hide=!a&&A&&Math.hypot(nd.bx-A.bx,nd.by-A.by)<kw*.85; [nd.n,nd.t].forEach(x=>x.setAttribute('opacity',hide?0:(a?1:.9))); }); }
}

/* The hands are cut from a real photo: a back-of-hand piece, a thumb and four fingers. Each finger is turned and stretched from its own base so its tip lands where the lessons say. */
function drawPhoto(h,T,kw,lk,dir,pb,pt,cx,palmH){
  const M=(h.side==='lh'&&PH.lmeta)||PH.meta, SCp=M.scale, k=kw/((M.unit||155)*SCp), wy=geo.HP+geo.kbH*.22, set2=set;
  /* short keys (phone): the hand is drawn flatter to match, as if the keyboard were seen at an angle. Work in the unflattened space, then squash it about the fingertip line */
  const ry=Math.max(.55,Math.min(1,geo.kbH/(4.4*kw))), Y=y=>wy+(y-wy)/ry, ay0=Y(pb+1.95*lk*.94-kw*.15)-.74*k*M.middle.len;
  set(h.pg,{transform:ry<.999?'translate(0 '+wy.toFixed(1)+') scale(1 '+ry.toFixed(3)+') translate(0 '+(-wy).toFixed(1)+')':''});
  if(skinM) skinM.setAttribute('values',SKINM[skin]);
  set(h.pg,{display:''}); [h.sl,h.cu,h.cb,h.ac].forEach(x=>set(x,{display:'none'})); ['fore','m1','m2','palm','pout','pl','td'].forEach(n=>set(h[n],{display:'none'}));
  h.thumb.seg.concat(h.fing.flatMap(f=>f.seg)).concat([h.thumb.hl]).concat(h.fing.map(f=>f.hl)).forEach(e=>e.setAttribute('d',''));
  const mat=(a,b,c,d,e,f)=>'matrix('+[a,b,c,d,e,f].map(v=>v.toFixed(3)).join(' ')+')';
  /* while the thumb passes under (or a finger crosses over it) the hand turns at the wrist: the right wrist swings right, the left wrist swings left */
  const th=dir*.3*Math.max(0,Math.min(1,h.c)), cs=Math.cos(th), sn=Math.sin(th), Rt=p=>[cx+(p[0]-cx)*cs-(p[1]-ay0)*sn, ay0+(p[0]-cx)*sn+(p[1]-ay0)*cs];
  const pm=M.palm, P=(px,py)=>Rt([cx+dir*k*(px-pm.ax), ay0+k*(pm.ay-py)]);
  set(h.pi.palm,{width:pm.w,height:pm.h,transform:'rotate('+(th*180/Math.PI).toFixed(2)+' '+cx.toFixed(1)+' '+ay0.toFixed(1)+') '+mat(dir*k,0,0,-k,cx-dir*k*pm.ax,ay0+k*pm.ay)});
  /* one sprite from its base to a target tip. */
  const place=(img,m,B,tx,ty,smin,smax,wscale)=>{ let dx=tx-B[0], dy=ty-B[1], L=Math.hypot(dx,dy)||1, ln=k*m.len, sy=Math.max(smin,Math.min(smax,L/ln)); const Ax=dx/L, Ay=dy/L, sx=(wscale||1);
    const a=k*sx*dir*Ay, b=-k*sx*dir*Ax, c=-k*sy*Ax, d=-k*sy*Ay, e=B[0]-a*m.bx-c*m.by, f=B[1]-b*m.bx-d*m.by;
    set(img,{width:m.w,height:m.h,transform:mat(a,b,c,d,e,f)}); return [B[0]+Ax*ln*sy,B[1]+Ay*ln*sy,Ax,Ay]; };
  const names=['index','middle','ring','pinky'], tips=[];
  /* thumb: its base glides from the side of the hand to under the palm while it crosses */
  { const m=M.thumb, bs=P(pm.ax+m.base[0],pm.ay+m.base[1]), mb=Rt([cx+(-1.45+1.35*h.c)*dir*kw,Y(pb-lk*1.2)]), B=[bs[0]+(mb[0]-bs[0])*h.c*.6, bs[1]+(mb[1]-bs[1])*h.c*.6];
    let tx=h.fx[0], ty=Y(h.fy[0]); if(h.f!==1){ const ln=k*m.len, nx=B[0]-dir*.5*ln*.9, ny=B[1]+.866*ln*.9, c=h.c; tx=nx+(tx-nx)*c; ty=ny+(ty-ny)*c; }
    const t=place(h.pi.thumb,m,B,tx,ty,.7,1.9,1); tips[0]=t;
    const under=h.c>.35&&!(h.f===1&&Math.hypot(h.fx[0]-h.ftx[0],h.fy[0]-h.fty[0])<kw*.6); if(under!==h.tu||h.pi.thumb.parentNode!==h.pg){ h.tu=under; if(under) h.pg.insertBefore(h.pi.thumb,h.pg.firstChild); else h.pg.appendChild(h.pi.thumb); } }
  const order=[1,2,3,4].filter(i=>i!==h.f-1).concat([1,2,3,4].filter(i=>i===h.f-1));
  names.forEach((n,j)=>{ const i=j+1, m=M[n], B=P(pm.ax+m.base[0],pm.ay+m.base[1]); let tx=h.fx[i], ty=Y(h.fy[i]), playing=h.f===i+1;
    const W=P(pm.ax,pm.ay+300), nx0=B[0]-W[0], ny0=B[1]-W[1], nl=Math.hypot(nx0,ny0)||1;
    if(!playing&&!h.pos){ let dx=tx-B[0], dy=ty-B[1], L=Math.hypot(dx,dy)||1; dx=dx/L*.6+nx0/nl*.4; dy=dy/L*.6+ny0/nl*.4; L=Math.hypot(dx,dy)||1; const ln=k*m.len; tx=B[0]+dx/L*ln*.8; ty=B[1]+dy/L*ln*.8; if(ty>wy+kw*.3){ const f=(wy+kw*.3-B[1])/(ty-B[1]); tx=B[0]+(tx-B[0])*f; ty=wy+kw*.3; } }
    tips[i]=place(h.pi[n],m,B,tx,ty,.5,1.3,1); });
  if(h.zf!==h.f){ h.zf=h.f; order.forEach(i=>{ h.pg.insertBefore(h.pi[names[i-1]],h.pi.palm); }); }
  if(!h.tu&&h.pg.lastChild!==h.pi.thumb) h.pg.appendChild(h.pi.thumb);
  /* numbers on the tips; every number sits on the top layer */
  { const nodes=[h.thumb].concat(h.fing), A=nodes[h.f-1];
    nodes.forEach((nd,i)=>{ const t=tips[i]; nail(nd,t[0],t[1],kw,i+1,i===h.f-1,T,t[2],t[3],kw*.8); [nd.n,nd.t].forEach(x=>{ if(x.parentNode!==h.top) h.top.appendChild(x); }); });
    nodes.forEach((nd,i)=>{ const a=i===h.f-1, hide=!a&&A&&Math.hypot(nd.bx-A.bx,nd.by-A.by)<kw*.85; [nd.n,nd.t].forEach(x=>x.setAttribute('opacity',hide?0:(a?1:.9))); }); }
}
function nail(n,tx,ty,kw,num,act,T,ux,uy,wt){
  /* a small numbered badge on the fingertip (yellow on the finger that is playing) */
  const bx=tx-ux*kw*.28, by=ty-uy*kw*.28, r=kw*(act?.38:.33); n.bx=bx; n.by=by;
  set(n.n,{cx:bx,cy:by,rx:r,ry:r,fill:act?'#ffd43b':'rgba(18,26,48,.82)',stroke:act?'#b8860b':'rgba(255,255,255,.7)','stroke-width':1,transform:''});
  const y2=by-kw*.15; set(n.t,{x:bx,y:y2,'font-size':Math.max(9,Math.min(13,kw*.55)),fill:act?'#2a1a0d':'#fff',transform:'translate('+bx+' '+y2+') scale(1 -1) translate('+(-bx)+' '+(-y2)+')'}); n.t.textContent=String(num); set(n.n,{display:'none'}); set(n.t,{display:'none'});
}
/* a thumbs up from each hand on the keys, for a moment, after a practice finishes */
function thumbsUp(ms){ if(mode!=='3d'||!P3) return; const end=performance.now()+(ms||2400); window.__thumbsUp=end; const loop=()=>{ last=0; if(!raf) raf=requestAnimationFrame(tick); if(performance.now()<end+150) setTimeout(loop,90); }; loop(); }
/* on Pause: both hands lace their fingers and crack their knuckles */
function crack(){ if(mode!=='3d'||!P3) return; const t0=performance.now(); window.__crack=t0; const loop=()=>{ last=0; if(!raf) raf=requestAnimationFrame(tick); if(performance.now()<t0+2550) setTimeout(loop,30); }; loop(); }
window.PSHANDS={lead,pause,sync,thumbsUp,crack,tones:TONES,isOn:()=>on,dbg:()=>P3&&P3.dbg&&P3.dbg()};
})();
