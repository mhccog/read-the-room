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
const SAY_NEEDS_DEEP = {
  sig: {
    fear: "Being ignored, made to feel small, ridiculed or left behind.",
    signs: ["Talks about achievements, titles, who they know","Status brands, cars, watches, latest tech","Wants to lead or decide first","Steers talk back to themselves"],
    meet: "Call out a specific impact they actually had, and ask for their view before you give yours. The aim is to make them feel interesting — not to impress them.",
    lines: ["I'd value your take on this before anyone else's.","What you built there is genuinely rare."],
    avoid: ["Talking over them or one-upping their story","Treating them as 'just another' person in the room","Correcting them in front of others"],
    ask: "If you genuinely want their lead or their view first, ask for it that way.",
    extra: [{by:"Van Edwards", note:"If you are genuinely impressed, say so — she calls this being easily awed. Asking for their advice also works, but only when you really want it."}]
  },
  app: {
    fear: "Disapproval, dismissal, contempt, or being left out.",
    signs: ["Self put-downs ('I'm rubbish at this')","Asks permission when they don't need to","Shifts their view if you disagree","Lots of compliments; rarely complains"],
    meet: "Reassure them, and notice the care they put in, not only the result. Make it safe to say yes, and equally safe to say no. Don't leave a self-put-down hanging in silence.",
    lines: ["You've clearly put real care into this.","There's no wrong answer here — I'd just love your honest view."],
    avoid: ["Sarcasm or teasing","Silence after they put themselves down","Pushing them to decide on the spot"],
    ask: "Give clear permission, and make it safe to say yes or no.",
    extra: [{by:"Van Edwards", note:"In a high-stakes moment, start with a real appreciation and make it safe to be honest — including saying no."}]
  },
  acc: {
    fear: "Gossip, social criticism, or not fitting in with their people.",
    signs: ["Clubs, teams, groups, 'we' and 'us'","Helping or caring roles, volunteering, pets","Team shirts, memberships, community talk","Returns every smile and eyebrow flash"],
    meet: "Include them in the 'we'. If you can do it honestly, introduce them to your people so they feel they belong. Hughes' habit here is to meet people and make introductions.",
    lines: ["Want me to introduce you to a few people here?","It's people like you that make a group actually work."],
    avoid: ["Singling them out in front of others","Anything that could embarrass them with their group","'Nobody else does it this way'"],
    ask: "If it's true, show who else is already in, and how this keeps them connected to their people.",
    extra: [{by:"Van Edwards", note:"When you notice a genuine overlap, say so — a 'same here' on a feeling or a fact. And introduce them by something you actually admire."}]
  },
  int: {
    fear: "Looking stupid, being questioned, or being called out.",
    signs: ["Mentions education, books, research, technical detail","Says 'actually…', corrects or explains","Calls others idiots or incompetent","Asks if you know things they know you don't"],
    meet: "Ask how they would approach it, then stay curious long enough to hear the answer. A sincere 'teach me' — only when you want to learn — lets them show their reasoning.",
    lines: ["I'd love to hear how you'd approach it.","I'll be honest, I know next to nothing about this — how does it actually work?"],
    avoid: ["Over-simplifying or lecturing them","Catching them out in public","Vague claims with no reasoning"],
    ask: "Lay out the reasoning, and let them reach the conclusion themselves.",
    extra: [
      {by:"Van Edwards", note:"'Tell me more?' is enough, when you mean it."},
      {by:"Giang", note:"Treat listening as the bigger half. After they explain, ask yourself what seemed to matter most."}
    ]
  },
  pit: {
    fear: "Being dismissed, disbelieved, or misunderstood.",
    signs: ["Complaints about traffic, weather, health or workload","Bad-luck stories, or being treated unfairly","A stressed or hunched look","Reacts strongly to small pains"],
    meet: "Confirm that it has been hard, then pause so they feel heard. Don't rush to fix it or bright-side it. Reflect a word they used, and ask a little more before you talk about yourself.",
    lines: ["That sounds genuinely exhausting… (pause)","You've had a lot more on your plate than people realise."],
    avoid: ["'Look on the bright side' or 'could be worse'","Rushing to fix it","Topping their story with yours"],
    ask: "Only if it's true, show how this takes something off their plate or makes the day easier.",
    extra: [{by:"Giang", note:"Watch the listening traps — especially advising, one-upping, and rushing to fix. Reflect their words, pause, and ask a couple of follow-ups before you bring in your own story."}]
  },
  str: {
    fear: "Being disrespected, challenged, or ignored.",
    signs: ["Loud voice, big posture, a crushing handshake","Stories of toughness, or getting one over on people","Status and pecking order matter to them","Bristles when challenged; can be sharp with staff"],
    meet: "Stay calm and respectful, and put the choice in their hands. Don't make it a contest. Offer clear options and let them decide.",
    lines: ["Your call — how would you want to play it?","I'd rather have you on my side of this."],
    avoid: ["Dominance contests or 'putting them in their place'","Embarrassing them in front of others","Ultimatums"],
    ask: "Give them the decision and a few clear options, and let them choose.",
    extra: [{by:"Giang", note:"Watch the one-upping trap. Keep your own status stories out of it, and don't turn the moment into a contest."}]
  }
};
function needDeepHTML(n){
  const d=SAY_NEEDS_DEEP[n.k];
  if(!d)return '';
  const extras=(d.extra||[]).map(x=>`<p class="need-from"><b>From ${esc(x.by)}.</b> ${esc(x.note)}</p>`).join('');
  return `<p class="say-need-how">${esc(n.how)}</p>
    <div class="need-deep">
      <h4>What they fear</h4><p>${esc(d.fear)}</p>
      <h4>Signs to listen for</h4><ul>${d.signs.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
      <h4>How to meet it</h4><p>${esc(d.meet)}</p>
      <h4>Lines to try</h4><div class="need-lines">${d.lines.map(s=>`<p class="need-try">“${esc(s)}”</p>`).join('')}</div>
      <h4>What to avoid</h4><ul>${d.avoid.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
      <h4>When you ask for something</h4><p>${esc(d.ask)}</p>
      ${extras}
      <button type="button" class="need-profile" data-goto="profile" data-scroll="need-${n.k}">Full card on Profile →</button>
    </div>`;
}
(function setupSayNeeds(){
  const btn=$('#needsBtn'), panel=$('#sayNeedsPanel'), body=$('#sayNeedsBody'), close=$('#needsClose');
  if(!btn||!panel||!body)return;
  body.innerHTML='<p class="say-needs-note">Hunches to listen for, never labels.</p>'+
    SAY_NEEDS.map(n=>`<details class="say-need">
      <summary><span class="need-emoji" aria-hidden="true">${n.emoji}</span><div>
        <h3>${esc(n.name)}</h3>
        <p class="say-need-is">${esc(n.is)}</p>
      </div></summary>
      <div class="say-need-more">${needDeepHTML(n)}</div>
    </details>`).join('');
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
<p><b>Learn</b> turns all three teachers into bite-sized cards: a quick Deck for out and about, Browse to search, and a Go deeper sheet with steps, lines, traps and earlier vs updated versions. Every card is tagged with one teacher, and the teacher filter keeps Hughes on his own.</p>
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

