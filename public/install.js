/* Install-as-an-app helper: shows a banner on phones, and a how-to with steps for iPhone, Android and computers. */
(function(){
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; refresh(); });
  window.addEventListener('appinstalled',()=>{ deferred=null; close(); try{ localStorage.setItem('ps-installed','1'); }catch(_){} const b=document.getElementById('psInstBar'); if(b) b.remove(); });
  const ua=navigator.userAgent, ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1), android=/Android/i.test(ua);
  const which=ios?'ios':android?'android':'desktop';
  const css=`
#psInst{position:fixed;inset:0;z-index:250000;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(6,10,22,.72)}
#psInst.on{display:flex}
#psInst .pi{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;color:#16203a;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.45);padding:20px 22px 18px;font:500 15px/1.45 var(--body,system-ui)}
#psInst h2{margin:0 0 4px;font:800 22px var(--display,system-ui);display:flex;gap:10px;align-items:center}
#psInst h2 img{width:36px;height:36px;border-radius:9px}
#psInst .pi-sub{margin:0 0 12px;color:#55648a}
#psInst .pi-tabs{display:flex;gap:6px;margin:0 0 12px}
#psInst .pi-tabs button{flex:1;padding:8px 6px;border-radius:999px;border:1.5px solid #cfd8ee;background:#f3f6fd;font:700 13px var(--display,system-ui);color:#41507a;cursor:pointer}
#psInst .pi-tabs button[aria-pressed=true]{background:#2540d9;border-color:#2540d9;color:#fff}
#psInst ol{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:10px}
#psInst li{counter-increment:s;display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:#f3f6fd}
#psInst li:before{content:counter(s);flex:none;width:26px;height:26px;border-radius:50%;background:#ffd84d;color:#16203a;font:800 14px/26px var(--display,system-ui);text-align:center}
#psInst li svg{width:22px;height:22px;vertical-align:-5px;margin:0 2px;stroke:#2540d9;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#psInst .pi-go{width:100%;margin:0 0 12px;padding:13px;border:0;border-radius:12px;background:#2540d9;color:#fff;font:800 17px var(--display,system-ui);cursor:pointer}
#psInst .pi-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:#55648a;font-size:13px}
#psInst .pi-x{padding:9px 16px;border-radius:999px;border:1.5px solid #cfd8ee;background:#fff;font:700 14px var(--display,system-ui);cursor:pointer}
#psInstBar{position:fixed;left:10px;right:10px;bottom:10px;z-index:240000;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:16px;background:#16203a;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.4);font:600 14px/1.3 var(--body,system-ui)}
#psInstBar img{width:38px;height:38px;border-radius:9px;flex:none}
#psInstBar span{flex:1}
#psInstBar button{border:0;border-radius:999px;padding:9px 14px;font:800 14px var(--display,system-ui);cursor:pointer}
#psInstBar .go{background:#ffd84d;color:#16203a}
#psInstBar .no{background:transparent;color:#9fb0d8;padding:9px 8px}
@media (min-width:900px){ #psInstBar{display:none} }`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const I={
    share:'<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
    dots:'<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>',
    mon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 8v5M9.5 11l2.5 2.5 2.5-2.5M8 20h8"/></svg>'};
  const STEPS={
    ios:[ 'Open this page in <b>Safari</b>. Other browsers on iPhone can\'t add apps.', 'Tap the <b>Share</b> button '+I.share+' (bottom of the screen on iPhone, top on iPad).', 'Scroll down and tap <b>Add to Home Screen</b> '+I.plus+'.', 'Tap <b>Add</b>. The Piano Suite icon now sits on your home screen and opens full screen, like an app.' ],
    android:[ 'Open this page in <b>Chrome</b>.', 'Tap the menu '+I.dots+' at the top right.', 'Tap <b>Install app</b> (or <b>Add to Home screen</b>).', 'Tap <b>Install</b>. Find Piano Suite with your other apps.' ],
    desktop:[ 'Use <b>Chrome</b> or <b>Edge</b>.', 'Click the install icon '+I.mon+' at the right end of the address bar. (Or open the browser menu and choose <b>Install</b>.)', 'Click <b>Install</b>. It opens in its own window and shows up in your apps.', '<b>Safari on Mac:</b> File → <b>Add to Dock</b>.' ]};
  const TAB={ios:'iPhone / iPad',android:'Android',desktop:'Computer'};
  let cur=which, box=null;
  function build(){
    box=document.createElement('div'); box.id='psInst'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Install Pokeytivity Piano Suite');
    box.innerHTML='<div class="pi"><h2><img src="icon-192.png" alt="">Install Pokeytivity Piano Suite</h2><p class="pi-sub">Open it from your home screen like any app: full screen, no browser bars, and it loads faster.</p><div id="piGo"></div><div class="pi-tabs" id="piTabs"></div><ol id="piSteps"></ol><div class="pi-foot"><span>Your saved work stays on this device.</span><button class="pi-x" type="button">Close</button></div></div>';
    document.body.appendChild(box);
    box.querySelector('.pi-x').onclick=close; box.addEventListener('click',e=>{ if(e.target===box) close(); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&box.classList.contains('on')) close(); });
  }
  function refresh(){
    if(!box) return;
    box.querySelector('#piGo').innerHTML=(deferred?'<button class="pi-go" type="button" id="piNow">Install now</button>':'');
    const n=box.querySelector('#piNow'); if(n) n.onclick=async()=>{ try{ deferred.prompt(); await deferred.userChoice; }catch(_){} deferred=null; refresh(); };
    box.querySelector('#piTabs').innerHTML=Object.keys(TAB).map(k=>'<button type="button" data-k="'+k+'" aria-pressed="'+(k===cur)+'">'+TAB[k]+'</button>').join('');
    box.querySelectorAll('#piTabs button').forEach(b=>b.onclick=()=>{ cur=b.dataset.k; refresh(); });
    box.querySelector('#piSteps').innerHTML=STEPS[cur].map(s=>'<li><span>'+s+'</span></li>').join('');
  }
  function open(){ if(!box) build(); cur=which; refresh(); box.classList.add('on'); }
  function close(){ if(box) box.classList.remove('on'); }
  function banner(){
    if(standalone()||document.getElementById('psInstBar')) return;
    try{ if(localStorage.getItem('ps-installed')||+localStorage.getItem('ps-inst-no')>Date.now()) return; }catch(_){}
    if(matchMedia('(min-width:900px)').matches) return;
    const b=document.createElement('div'); b.id='psInstBar';
    b.innerHTML='<img src="icon-192.png" alt=""><span>Install Pokeytivity Piano Suite on your '+(ios?'iPhone':'phone')+' for the full-screen app.</span><button class="go" type="button">Show me how</button><button class="no" type="button" aria-label="Not now">✕</button>';
    b.querySelector('.go').onclick=()=>{ open(); };
    b.querySelector('.no').onclick=()=>{ b.remove(); try{ localStorage.setItem('ps-inst-no',String(Date.now()+14*864e5)); }catch(_){} };
    document.body.appendChild(b);
  }
  window.PSINSTALL={open,close};
  window.addEventListener('load',()=>setTimeout(banner,4000));
})();
