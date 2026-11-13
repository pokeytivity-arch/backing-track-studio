/* progress.js: practice streak, topics explored, and Pokey's drill of the day.
   Everything is stored on this device (localStorage). */
(function(){
'use strict';
const KEY='ps-prog';
const DRILLS=[
 {t:'Neighborhood: 1, 5, 4, 3, 6',q:'Give me today\'s drill: the neighborhood method in C. Thumb on G of the G C E chord, then go 1, 5, 4, 3, 6 and back home each time. Load it on the keyboard and open it in the Studio so I can play along.'},
 {t:'3+4 scales: C and G',q:'Give me today\'s drill: the 3+4 method with the pair C and G (if I know my C I know my G). Load both scales on the keyboard and open a track in the Studio.'},
 {t:'5-1-4 in three keys',q:'Give me today\'s drill: the 5-1-4 progression in C, then F, then B-flat, bass note in the left hand and the voicing in the right. Load it on the keyboard and open it in the Studio.'},
 {t:'3+4 scales: D and A',q:'Give me today\'s drill: the 3+4 method with the pair D and A (if I know my D I know my A). Load both scales on the keyboard and open a track in the Studio.'},
 {t:'The full 7-3-6-2-5-1-4-3-6-2-5-1 run',q:'Give me today\'s drill: the full 7-3-6-2-5-1-4-3-6-2-5-1 run in C with my voicings. Load it on the keyboard and open it in the Studio.'},
 {t:'Phraseology on a hymn',q:'Give me today\'s drill: pick a simple hymn and take me through the phraseology: antecedent, consequent, the four phrases, and what to play on each phrase. Load the chords on the keyboard and open them in the Studio.'},
 {t:'2-5-1 in three keys',q:'Give me today\'s drill: the 2-5-1 progression in C, then F, then B-flat. Load it on the keyboard and open it in the Studio.'},
 {t:'3+4 scales: E and B',q:'Give me today\'s drill: the 3+4 method with the pair E and B (if I know my E I know my B). Load both scales on the keyboard and open a track in the Studio.'},
 {t:'Bass a third below the melody',q:'Give me today\'s drill on the bass note under a melody: the bass a third below the melody, checked against the chord and the next note. Give me a short melody to practice with and load it on the keyboard.'},
 {t:'Cadences: perfect, plagal, deceptive',q:'Give me today\'s drill: play a perfect cadence, a plagal cadence and a deceptive cadence in C. Load them on the keyboard and open them in the Studio.'},
 {t:'Finding the melody',q:'Give me today\'s drill on melody determination: starting on stable tones, direction and motion, and beat strength. Give me a short melody to work out and load it on the keyboard.'},
 {t:'Chromatic bass for color',q:'Give me today\'s drill on chromatic bass notes for color, for example the C-sharp under C. Load it on the keyboard and open it in the Studio.'}
];
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>iso(new Date());
function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||'{}'); v.days=Array.isArray(v.days)?v.days:[]; v.topics=v.topics||{}; v.drills=v.drills||{}; return v; }catch(_){ return {days:[],topics:{},drills:{}}; } }
function save(v){ try{ v.days=v.days.slice(-400); localStorage.setItem(KEY,JSON.stringify(v)); }catch(_){} }
function streak(v){ const set=new Set(v.days); let d=new Date(); if(!set.has(iso(d))) d.setDate(d.getDate()-1); let n=0; while(set.has(iso(d))){ n++; d.setDate(d.getDate()-1); } return n; }
function dayIndex(){ const d=new Date(); return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000); }
function todays(){ return DRILLS[dayIndex()%DRILLS.length]; }
function mark(){ const v=load(), t=today(); if(!v.days.includes(t)){ v.days.push(t); save(v); } }
function topic(id){ const v=load(); v.topics[id]=Date.now(); save(v); mark(); }
function startDrill(){ const v=load(); v.drills[today()]=1; save(v); mark(); const d=todays(); if(window.CLASS) CLASS.askAbout(d.q,{fresh:true}); }
function hub(){
  const foot=document.getElementById('psFoot'); if(!foot) return; let el=document.getElementById('psProg'); if(!el){ el=document.createElement('div'); el.id='psProg'; foot.parentNode.insertBefore(el,foot); }
  const v=load(), s=streak(v), d=todays(), done=!!v.drills[today()], n=Object.keys(v.topics).length;
  el.innerHTML='<div class="pp-st"><b>'+(s>0?'🔥 '+s+'-day streak':'Start your streak today')+'</b><span>'+(v.days.includes(today())?'You practiced today':'Practice today to '+(s>0?'keep it going':'begin'))+'</span></div>'
   +'<div class="pp-st"><b>'+n+' topic'+(n===1?'':'s')+' explored</b><span>Open Hot Topics in Class to add more</span></div>'
   +'<button type="button" class="pp-dr"><span>Pokey\'s drill of the day</span><b></b><i>'+(done?'Done today ✓ · Do it again':'Start →')+'</i></button>';
  el.querySelector('.pp-dr b').textContent=d.t; el.querySelector('.pp-dr').onclick=startDrill;
}
const css=document.createElement('style'); css.textContent='#psProg{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:stretch;margin:14px auto 0;width:min(1240px,94vw)}#psProg .pp-st,#psProg .pp-dr{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(6px);border-radius:14px;padding:10px 16px;color:#fff;display:grid;gap:2px;text-align:left;font-family:inherit}#psProg .pp-st b,#psProg .pp-dr b{font-size:16px}#psProg .pp-st span,#psProg .pp-dr span{font-size:12px;color:#c4d0e6}#psProg .pp-dr{cursor:pointer;border-color:#e8c25a;background:rgba(255,213,74,.14)}#psProg .pp-dr:hover{background:rgba(255,213,74,.26)}#psProg .pp-dr i{font-style:normal;font-size:12px;color:#e8c25a;font-weight:700}';
document.head.appendChild(css);
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('#playBtn')) mark(); },true);
window.PSPROG={mark,topic,hub,streak:()=>streak(load()),todays,DRILLS};
if(window.SUITE&&document.getElementById('psFoot')) hub();
})();
