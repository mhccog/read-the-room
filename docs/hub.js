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
function defaultFrom(){sayFrom('')}
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
    if(id)setTimeout(()=>{const el=document.getElementById(id);if(!el)return;if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'})},160);
  }
});
defaultFrom();

/* ---- The six needs guide (Profile), from BO.needs ---- */
(function renderNeedsGuide(){
  const root=$('#needsCards');
  if(!root||!window.BO||!BO.needs)return;
  root.innerHTML=Object.entries(BO.needs).map(([k,x])=>`<details class="need-card" id="need-${k}">
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



/* ---- Compact six needs: hidden until the Needs button at the top of Say is pressed ---- */
const SAY_NEEDS = [
  {k:'sig', lean:'significance', emoji:'👑', name:'Significance', is:'Wants to feel they matter and make an impact.', how:'Approach by noticing their impact out loud, and asking their view first.'},
  {k:'app', lean:'approval', emoji:'🤝', name:'Approval', is:'Wants to know they’re doing OK.', how:'Approach with reassurance, praise the effort, and make yes and no equally safe.'},
  {k:'acc', lean:'acceptance', emoji:'🫂', name:'Acceptance', is:'Wants to belong.', how:'Approach by including them and bringing them into the group.'},
  {k:'int', lean:'intelligence', emoji:'🧠', name:'Intelligence', is:'Wants to be seen as smart.', how:'Approach by asking them to explain, staying curious, and letting them reach the conclusion.'},
  {k:'pit', lean:'pity', emoji:'🌧️', name:'Pity (hardship)', is:'Wants someone to see how hard it’s been.', how:'Approach by acknowledging it, then pausing so they feel heard, without rushing to fix it.'},
  {k:'str', lean:'power', emoji:'🦁', name:'Strength / Power', is:'Wants to be seen as strong and in control.', how:'Approach with calm respect, and give them the choice.'}
];
(function setupSayNeeds(){
  const btn=$('#needsBtn'), panel=$('#sayNeedsPanel'), body=$('#sayNeedsBody'), close=$('#needsClose');
  if(!btn||!panel||!body)return;
  body.innerHTML=SAY_NEEDS.map(n=>`<div class="say-need">
    <button type="button" class="say-need-name" data-goto="profile" data-scroll="need-${n.k}">${n.emoji} ${esc(n.name)}</button>
    <p class="say-need-is">${esc(n.is)}</p>
    <p class="say-need-how">${esc(n.how)}</p>
  </div>`).join('')+'<p class="say-needs-note">Hunches to listen for, never labels.</p>';
  function setOpen(open){
    panel.hidden=!open;
    btn.classList.toggle('is-on', open);
    btn.setAttribute('aria-expanded', open?'true':'false');
  }
  setOpen(false);
  btn.addEventListener('click', ()=>setOpen(panel.hidden));
  if(close)close.addEventListener('click', ()=>setOpen(false));
})();

/* ---- Selected lean(s) in the Say line card, after "How to say it." Same SAY_NEEDS text. ---- */
function selectedLeans(){
  return $$('#sayApp [data-act="need"].is-on').map(b=>b.getAttribute('data-val')).filter(v=>v&&v!=='any');
}
function mountLineNeed(){
  const card=document.querySelector('#sayApp article.result');
  if(!card)return;
  const items=selectedLeans().map(id=>SAY_NEEDS.find(n=>n.lean===id)).filter(Boolean);
  const key=items.map(n=>n.k).join(',');
  const existing=card.querySelector('.line-needs');
  if(existing&&existing.dataset.needs===key)return;
  if(existing)existing.remove();
  if(!items.length)return;
  const html=`<div class="line-needs" data-needs="${esc(key)}">${items.map(n=>`<div class="line-need">
    <p class="line-need-name">${n.emoji} <b>${esc(n.name)}</b></p>
    <p class="line-need-is">${esc(n.is)}</p>
    <p class="line-need-how">${esc(n.how)}</p>
  </div>`).join('')}</div>`;
  const tip=card.querySelector('.tip');
  const actions=card.querySelector('.actions');
  if(tip)tip.insertAdjacentHTML('afterend', html);
  else if(actions)actions.insertAdjacentHTML('beforebegin', html);
  else card.insertAdjacentHTML('beforeend', html);
}
const sayRoot=$('#sayApp');
if(sayRoot){
  mountLineNeed();
  new MutationObserver(mountLineNeed).observe(sayRoot,{childList:true,subtree:true});
}

/* ---- About ---- */
const info=$('#infoBtn');
if(info)info.onclick=()=>APP.dialog(`<h3 style="margin-top:0">About Read the Room</h3>
<p><b>Say</b> gives you a word to start with and a line you can actually say. Pick a lean, a vibe and a moment. Lines draw on Vanessa Van Edwards, Chase Hughes and Vinh Giang, each tagged with its technique, why it works and how to deliver it.</p>
<p><b>Profile, Body, Talk, Watch and People</b> are a study aid for <b>Chase Hughes, <i>The Behavior Ops Manual</i></b>, summarised in my own words with page references. All credit for the frameworks goes to Hughes. Buy the book for the full depth.</p>
<p><b>Ask</b> has two separate modes. <b>Hughes only</b> answers strictly from Hughes’ own book, videos and site. <b>Blend</b> mixes all three teachers into one answer. The two never share notes.</p>
<p><b>Ethics:</b> use this to understand people and connect better, not to manipulate them. Covert-coercion material (interrogation, false-memory and “enhanced” tactics, covert hypnosis, embedded commands) is deliberately left out, or covered only as how to spot it. Needs are listening prompts, not labels. No single cue proves a lie: always baseline, look for clusters, and consider context. Only say what you mean.</p>
<p class="caveat">Your saved people, lines and chats stay in this browser only. Nothing is sent anywhere. Works offline once opened.</p>`);
/* ---- Service worker: pick up new versions on an installed / cached app ---- */
(function setupSW(){
  if(!('serviceWorker' in navigator))return;
  const opts={updateViaCache:'none'};
  let hadController=!!navigator.serviceWorker.controller;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    // First install shouldn't reload; an update should reload once.
    if(!hadController){hadController=true;return}
    if(reloading)return;
    try{if(sessionStorage.getItem('rtr.sw.reloading'))return;sessionStorage.setItem('rtr.sw.reloading','1')}catch(e){}
    reloading=true;
    location.reload();
  });
  try{if(hadController)sessionStorage.removeItem('rtr.sw.reloading')}catch(e){}
  function check(reg){try{reg.update()}catch(e){}}
  navigator.serviceWorker.register('sw.js', opts).then(reg=>{
    check(reg);
    document.addEventListener('visibilitychange', ()=>{if(document.visibilityState==='visible')check(reg)});
    addEventListener('focus', ()=>check(reg));
  }).catch(()=>{});
})();

window.HUB={askMode};
})();

