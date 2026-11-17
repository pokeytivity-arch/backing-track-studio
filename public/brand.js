/* Two names, one suite: app.pokeytivity.com is the Pokeytivity Piano Suite with the coach Pokey;
   hearandplay.app stays the HearandPlay Piano Suite with the coach HearandPlay. Loaded first, in <head>. */
(function(){
var pk=/(^|\.)pokeytivity\.com$/i.test(location.hostname);
var R=[[/HearandPlay Piano Suite/g,'Pokeytivity Piano Suite'],[/HearandPlay (Suite|Studio|suite|studio|chord progressions)/g,'Pokeytivity $1'],[/HearandPlay-Certificate/g,'Pokeytivity-Certificate'],[/hearandplay\.app/g,'app.pokeytivity.com'],[/(Who visited |· )HearandPlay/g,'$1Pokeytivity'],[/HearandPlay/g,'Pokey']];
window.BRAND={pk:pk,coach:pk?'Pokey':'HearandPlay',name:pk?'Pokeytivity':'HearandPlay',site:pk?'app.pokeytivity.com':'hearandplay.app'};
window.BR=function(s){ if(!pk||s==null) return s; s=String(s); if(s.indexOf('HearandPlay')<0&&s.indexOf('hearandplay.app')<0) return s; for(var i=0;i<R.length;i++) s=s.replace(R[i][0],R[i][1]); return s; };
if(!pk) return;
document.documentElement.classList.add('pk');
var ATTR=['title','aria-label','placeholder','alt'];
var has=function(s){ return s&&(s.indexOf('HearandPlay')>=0||s.indexOf('hearandplay.app')>=0); };
function fixEl(e){ if(e.nodeType!==1) return; var t=e.tagName; if(t==='SCRIPT'||t==='STYLE') return;
  for(var i=0;i<ATTR.length;i++){ var v=e.getAttribute(ATTR[i]); if(has(v)) e.setAttribute(ATTR[i],BR(v)); }
  if(t==='LINK'){ var h=e.getAttribute('href')||''; if(/hp-fav-(\d+)\.png/.test(h)) e.setAttribute('href',h.replace(/hp-fav-/,'pk-fav-')); else if(/hp-apple-180\.png/.test(h)) e.setAttribute('href','pk-apple-180.png'); else if(e.rel==='manifest') e.setAttribute('href','manifest-pk.webmanifest'); }
  if(t==='INPUT'&&(e.type==='button'||e.type==='submit')&&has(e.value)) e.value=BR(e.value); }
function fix(n){ if(!n) return;
  if(n.nodeType===3){ if(has(n.nodeValue)){ var p=n.parentNode; if(!p||p.nodeName!=='TEXTAREA'&&p.nodeName!=='SCRIPT'&&p.nodeName!=='STYLE') n.nodeValue=BR(n.nodeValue); } return; }
  if(n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11) return;
  if(n.nodeType===1){ fixEl(n); if(n.tagName==='SCRIPT'||n.tagName==='STYLE'||n.tagName==='TEXTAREA') return; }
  var w=document.createTreeWalker(n,5,null), x; while((x=w.nextNode())){ if(x.nodeType===1) fixEl(x); else if(has(x.nodeValue)){ var pp=x.parentNode; if(pp&&pp.nodeName!=='TEXTAREA'&&pp.nodeName!=='SCRIPT'&&pp.nodeName!=='STYLE') x.nodeValue=BR(x.nodeValue); } } }
var mo=new MutationObserver(function(list){ for(var i=0;i<list.length;i++){ var m=list[i];
  if(m.type==='characterData') fix(m.target);
  else if(m.type==='attributes') fixEl(m.target);
  else for(var j=0;j<m.addedNodes.length;j++) fix(m.addedNodes[j]); }
  if(has(document.title)) document.title=BR(document.title); });
mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
fix(document.documentElement); if(has(document.title)) document.title=BR(document.title);
document.addEventListener('DOMContentLoaded',function(){ fix(document.documentElement); });
var st=document.createElement('style'); st.textContent='html.pk #psIntro .lg{display:none!important}'; (document.head||document.documentElement).appendChild(st);
})();
