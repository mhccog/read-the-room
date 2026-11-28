/* Watch > Appearance & movement: a third view on the Watch tab.
   Video cards reuse the Watch card markup, so ui.js plays them. Data: watch/appearance-data.js (generated). */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TOPICS=[['all','All'],['talks','Talks'],['clothes','Clothes'],['hair','Hair & grooming'],['shoes','Shoes'],['posture','Posture'],['walk','Walk'],['gaze','Gaze'],['smell','Smell'],['colour','Colour'],['impressions','First impressions'],['face','Face reading']];
const HEAD=Object.fromEntries(TOPICS.filter(t=>t[0]!=='all'));
const WHO={hughes:'Chase Hughes',vve:'Vanessa Van Edwards',vg:'Vinh Giang'};
const TYPE={research:'Research',practitioner:'Practitioner',health:'Health guidance',media:'News & explainer',tool:'Tool or data'};
const FMT={video:'Video',written:'Written',interactive:'Interactive',code:'Code & data',point:'Evidence point'};
const FRANK={point:0,video:1,written:2,interactive:3,code:4};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TEACH={hughes:0,vve:1,vg:2};
const PER=6;
let topic='all',stream='both',fmt='any',kind='any',q='',ready=false,loading=null;
function load(){
  if(ready)return Promise.resolve();if(loading)return loading;
  loading=new Promise((res,rej)=>{if(window.WATCH_AP)return res();const s=document.createElement('script');s.src='watch/appearance-data.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})
    .then(()=>{ready=true;render()}).catch(()=>{loading=null;$('#apList').innerHTML='<p class="caveat">Couldn’t load this list. Check your connection and reopen this tab.</p>'});
  return loading;
}
const items=()=>(window.WATCH_AP&&window.WATCH_AP.items)||[];
// Hughes first, then Vanessa, then Vinh, then everyone else; evidence points before videos, then written, interactive, code
function rank(v){return [v.teacher?0:1,v.teacher?TEACH[v.teacher]:0,v.teacher?0:FRANK[v.fmt]]}
function sorted(a){return a.map((v,i)=>[v,i,rank(v)]).sort((x,y)=>{for(let k=0;k<3;k++){if(x[2][k]!==y[2][k])return x[2][k]-y[2][k]}return x[1]-y[1]}).map(x=>x[0])}
function pass(v){
  if(stream!=='both'&&v.stream!==stream)return false;
  if(fmt!=='any'&&v.fmt!==fmt)return false;
  if(kind==='teachers'&&!v.teacher)return false;
  if(kind==='outside'&&v.teacher)return false;
  if(kind==='research'&&v.type!=='research')return false;
  if(kind==='practitioner'&&v.type!=='practitioner')return false;
  if(kind==='health'&&!v.care&&v.type!=='health')return false;
  if(q){const t=(v.title+' '+(v.get||'')+' '+(v.who||'')+' '+(v.outlet||'')).toLowerCase();if(!q.split(/\s+/).every(w=>t.includes(w)))return false}
  return true;
}
function badges(v){
  const b=[];
  b.push(v.stream==='main'?'<span class="ap-b ap-main">Mainstream</span>':'<span class="ap-b ap-non">Non-mainstream</span>');
  if(v.fmt==='point'&&v.strength)b.push(`<span class="ap-b ap-s-${esc(v.strength)}">${esc(v.strength[0].toUpperCase()+v.strength.slice(1))}</span>`);
  if(v.fmt==='point'&&!v.strength)b.push('<span class="ap-b ap-s-none">Not rated</span>');
  if(v.fmt!=='point')b.push(v.teacher?`<span class="ap-b ap-teach">Teacher · ${esc(WHO[v.teacher])}</span>`:'<span class="ap-b ap-out">Outside source</span>');
  if(v.type&&v.fmt!=='point')b.push(`<span class="ap-b ap-type">${esc(TYPE[v.type]||v.type)}</span>`);
  if(v.fmt!=='video'&&v.fmt!=='point')b.push(`<span class="ap-b ap-type">${esc(FMT[v.fmt])}</span>`);
  if(v.care)b.push('<span class="ap-b ap-care">When to suggest a GP / be concerned</span>');
  return `<div class="vtags ap-tags">${b.join('')}</div>`;
}
function meta(v){
  const bits=[];
  if(v.fmt!=='video'&&v.fmt!=='point')bits.push(FMT[v.fmt]);
  if(v.who)bits.push(v.who);if(v.outlet)bits.push(v.outlet);
  if(v.date){const [y,m]=v.date.split('-');bits.push(m?MON[+m-1]+' '+y:y)}
  return bits.join(' · ');
}
const warn=v=>v.note?`<p class="ap-warn${v.care?' ap-care-note':''}">${v.care?'':'⚠︎ '}${esc(v.note)}</p>`:'';
function card(v){
  if(v.fmt==='point'){
    const src=v.sources.map(s=>`<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)} ↗</a>`).join('');
    return `<article class="vcard ap-card ap-point${v.care?' is-care':''}" id="ap-${esc(v.id)}"><div class="vbody">
      <div class="vsrc">${v.care?'When to suggest a GP / be concerned':'If you see…'}</div>
      <h3>${esc(v.title)}</h3><p class="vsum">${esc(v.get)}</p>${warn(v)}
      ${badges(v)}<div class="ap-src">${src}</div></div></article>`;
  }
  const href=v.kind==='yt'?'https://www.youtube.com/watch?v='+v.id:v.url;
  let media='';
  if(v.kind==='yt'){
    media=`<div class="vframe" data-yt="${esc(v.id)}">
      <img loading="lazy" decoding="async" src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="Thumbnail: ${esc(v.title)}" onerror="this.parentNode.classList.add('noimg');this.remove()">
      <button class="vplay" data-seek="0" aria-label="Play ${esc(v.title)}"><span>▶</span></button>
      <span class="vdur">${esc(v.dur)}</span></div>`;
  }else if(v.id==='bbc'||v.id==='cnn'){
    media=`<a class="ap-web" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(v.title)} on ${esc(v.host)}"><span class="ap-webic">↗</span><span class="ap-webt">Opens on ${esc(v.host)}</span></a>`;
  }else if(v.fmt==='interactive'&&(v.id==='bml'||v.id==='mather'||v.id==='i-bach')){
    media=`<a class="ap-web" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(v.title)}"><span class="ap-webic">◉</span><span class="ap-webt">Try it</span></a>`;
  }
  const label=v.kind==='yt'?'Open on YouTube ↗':v.fmt==='interactive'?'Open the interactive ↗':v.fmt==='code'||v.fmt==='video'?'Open on '+esc(v.host)+' ↗':'Read on '+esc(v.host)+' ↗';
  return `<article class="vcard ap-card${media?'':' ap-text'}" id="ap-${esc(v.id)}">${media}
    <div class="vbody">
      <div class="vsrc">${esc(meta(v))}</div>
      <h3>${esc(v.title)}</h3>
      <p class="vsum">${esc(v.get)}</p>${warn(v)}
      ${badges(v)}
      <a class="vext" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>
    </div></article>`;
}
function render(){
  if(!ready)return;
  const all=items(),shown=all.filter(pass);
  $('#apTopics').innerHTML=TOPICS.map(([k,l])=>{const n=k==='all'?shown.length:shown.filter(v=>v.topics.includes(k)).length;return `<button class="${k===topic?'on':''}" data-ap-t="${k}" ${n?'':'data-empty="1"'}>${l} <span class="apn">${n}</span></button>`}).join('');
  const body=[];let total=0;
  if(topic==='all'){
    Object.keys(HEAD).forEach(k=>{const vs=sorted(shown.filter(v=>v.primary===k));if(!vs.length)return;total+=vs.length;
      body.push(`<h3 class="ap-h">${HEAD[k]} <span class="count">${vs.length}</span></h3>`+vs.slice(0,PER).map(card).join('')+(vs.length>PER?`<button class="ghost ap-more" data-ap-t="${k}">Show all ${vs.length} in ${HEAD[k]}</button>`:''));
    });
  }else{
    const vs=sorted(shown.filter(v=>v.topics.includes(topic)));total=vs.length;body.push(vs.map(card).join(''));
  }
  $('#apCount').textContent=total+(total===1?' item':' items');
  $('#apList').innerHTML=total?body.join(''):'<p class="caveat">Nothing matches those filters. Try “Both” for mainstream and non-mainstream, or clear the search.</p>';
  const off=$('#apOffline');if(off)off.hidden=navigator.onLine!==false;
  const g=$('#apGaps');if(g&&window.WATCH_AP&&window.WATCH_AP.gaps)g.innerHTML='<summary>Gaps in the evidence <span class="count">'+window.WATCH_AP.gaps.length+'</span></summary><ul>'+window.WATCH_AP.gaps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
}
function setOn(on){
  const root=$('#tab-watch'),seg=$('#watchSeg');if(!root||!seg)return;
  root.classList.toggle('ap-on',on);seg.classList.toggle('ap',on);
  const b=seg.querySelector('[data-ap]');b.classList.toggle('on',on);b.setAttribute('aria-selected',on);
  if(on){seg.querySelectorAll('[data-g]').forEach(x=>x.setAttribute('aria-selected','false'));load()}
}
function init(){
  const root=$('#tab-watch');if(!root||!$('#apPane'))return;
  root.addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.ap!=null){setOn(true);return}
    if(b.dataset.g){setOn(false);return}          // ui.js handles the Hughes / Other analysts switch itself
    if(b.dataset.apT){topic=b.dataset.apT;render();if(b.classList.contains('ap-more'))$('#apTopics').scrollIntoView({block:'nearest'});return}
  });
  const sel=(id,f)=>$(id).addEventListener('change',e=>{f(e.target.value);render()});
  sel('#apStream',v=>stream=v);sel('#apFmt',v=>fmt=v);sel('#apKind',v=>kind=v);
  $('#apSearch').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();render()});
  window.addEventListener('online',render);window.addEventListener('offline',render);
}
window.WATCH_AP_UI={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
