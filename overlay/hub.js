/* Read the Room: glue between the line generator (Say), the Hughes field guide and the two Ask modes. */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APP=window.HUB_APP||{};

/* ---- Ask: Hughes only vs Blend (kept fully separate) ---- */
const AMK='rtr.ask.mode';
let mode='hughes';try{if(localStorage.getItem(AMK)==='blend')mode='blend'}catch(e){}
function askMode(m){
  mode=m==='blend'?'blend':'hughes';try{localStorage.setItem(AMK,mode)}catch(e){}
  $('#askHughes').hidden=mode!=='hughes';$('#blendPane').hidden=mode!=='blend';
  $$('#askSeg button').forEach(b=>{const on=b.dataset.am===mode;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  $('#askSeg').classList.toggle('right',mode==='blend');
  if(mode==='blend'&&window.ASK_UI_BLEND)window.ASK_UI_BLEND.load();
  if(mode==='hughes'&&window.ASK_UI&&$('#tab-ask').classList.contains('active'))window.ASK_UI.load();
}
$$('#askSeg button').forEach(b=>b.onclick=()=>askMode(b.dataset.am));
document.addEventListener('tabshow',e=>{document.body.dataset.tab=e.detail;if(e.detail==='ask')askMode(mode)});
askMode(mode);
document.body.dataset.tab=(location.hash.slice(1)||'say');

/* ---- Profile / People -> Say ---- */
const NEED={sig:'significance',app:'approval',acc:'acceptance',int:'intelligence',pit:'pity',str:'power'};
const FEEL={sig:'important',app:'appreciated',acc:'included',int:'smart',pit:'understood',str:'control'};
const NEEDNAME={significance:'Significance',approval:'Approval',acceptance:'Acceptance',intelligence:'Intelligence',pity:'Hardship',power:'Power'};
function sayFrom(html){$('#sayFrom').innerHTML=html}
function defaultFrom(){sayFrom(`<button class="link" data-goto="profile" data-scroll="needsGuide">Not sure which lean fits? See <b>The six needs</b> on Profile →</button>`)}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tosay]');
  if(t){
    const [k,stress]=t.dataset.tosay.split('|');const need=NEED[k];if(!need)return;
    const feeling=stress==='1'?'reassured':FEEL[k];
    const d=$('#dlg');if(d&&d.open)d.close();
    if(window.SAY)SAY.preset({need,feeling});
    const who=t.dataset.who;
    sayFrom(`<div class="from-card"><span>Tuned ${who?'for <b>'+esc(who)+'</b>':'from your <b>Profile</b> read'}: lean <b>${esc(NEEDNAME[need])}</b>${stress==='1'?', they seem stressed so vibe <b>Reassured</b>':''}. A listening prompt, not a label.</span><button class="link" data-reset-say>Reset</button></div>`);
    APP.show&&APP.show('say');
    setTimeout(()=>{const r=document.querySelector('#sayApp .say-first')||document.querySelector('#sayApp .result');if(r)window.scrollTo({top:r.getBoundingClientRect().top+scrollY-74,behavior:'smooth'})},120);return;
  }
  if(e.target.closest('[data-reset-say]')){if(window.SAY)SAY.preset({need:'any',feeling:'heard',sit:'all'});defaultFrom();return}
  const g=e.target.closest('[data-goto]');
  if(g&&APP.show){
    APP.show(g.dataset.goto);
    const id=g.dataset.scroll;
    if(id)setTimeout(()=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},160);
  }
});
defaultFrom();

/* ---- The six needs guide (Profile), from BO.needs ---- */
(function renderNeedsGuide(){
  const root=$('#needsCards');
  if(!root||!window.BO||!BO.needs)return;
  root.innerHTML=Object.values(BO.needs).map(x=>`<details class="need-card">
    <summary><span class="need-emoji" aria-hidden="true">${x.emoji}</span><div>
      <h3>${esc(x.name)}</h3>
      <p class="need-q">${esc(x.q)}</p>
    </div></summary>
    <div class="need-body">
      <div class="need-block"><h4>Notice</h4><ul>${x.signs.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
      <div class="need-block"><h4>Approach</h4><p>${esc(x.give)}</p><div class="need-lines">${x.say.slice(0,2).map(s=>`<p class="need-line">${esc(s)}</p>`).join('')}</div></div>
      <div class="need-block"><h4>Avoid</h4><ul>${x.avoid.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
    </div>
  </details>`).join('');
})();


/* ---- About ---- */
const info=$('#infoBtn');
if(info)info.onclick=()=>APP.dialog(`<h3 style="margin-top:0">About Read the Room</h3>
<p><b>Say</b> gives you a word to start with and a line you can actually say. Pick a lean, a vibe and a moment. Lines draw on Vanessa Van Edwards, Chase Hughes and Vinh Giang, each tagged with its technique, why it works and how to deliver it.</p>
<p><b>Profile, Body, Talk, Watch and People</b> are a study aid for <b>Chase Hughes, <i>The Behavior Ops Manual</i></b>, summarised in my own words with page references. All credit for the frameworks goes to Hughes. Buy the book for the full depth.</p>
<p><b>Ask</b> has two separate modes. <b>Hughes only</b> answers strictly from Hughes’ own book, videos and site. <b>Blend</b> mixes all three teachers into one answer. The two never share notes.</p>
<p><b>Ethics:</b> use this to understand people and connect better, not to manipulate them. Covert-coercion material (interrogation, false-memory and “enhanced” tactics, covert hypnosis, embedded commands) is deliberately left out, or covered only as how to spot it. Needs are listening prompts, not labels. No single cue proves a lie: always baseline, look for clusters, and consider context. Only say what you mean.</p>
<p class="caveat">Your saved people, lines and chats stay in this browser only. Nothing is sent anywhere. Works offline once opened.</p>`);
window.HUB={askMode};
})();
