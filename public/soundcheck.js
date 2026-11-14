/* Sound check: a small button under the top bar that tests the browser's audio and says what it found. */
(function(){
'use strict';
const st=document.getElementById('status'); if(!st) return;
const b=document.createElement('button'); b.type='button'; b.textContent='🔊 Test sound'; b.setAttribute('aria-label','Test sound');
b.style.cssText='margin-left:10px;padding:3px 10px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;font:600 12px inherit;cursor:pointer';
st.appendChild(b);
b.onclick=async e=>{
  e.stopPropagation(); const out=[]; let shown=false;
  try{
    await ensureCtx(); const c=ctx; out.push('Audio: '+c.state+' at '+c.sampleRate+' Hz');
    const o=c.createOscillator(), g=c.createGain(); o.frequency.value=440; g.gain.value=.15; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+.5);
    out.push('Beep sent: you should hear a plain tone now.');
    setTimeout(async()=>{ try{ await loadBank(c); out.push('Piano sounds: '+(BANK.ready?'loaded':'not loaded')); E.note(c.currentTime+.05,60,1.2,.8,'piano','keys'); }catch(err){ out.push('Piano error: '+err.message); } show(); },800);
  }catch(err){ out.push('Audio blocked: '+err.message); show(); }
  function show(){ alert(out.join('\n')+'\n\nBeep but no piano: the piano sounds are the problem. No beep: the browser or device output is the problem.'); }
};
})();
