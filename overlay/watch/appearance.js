/* Watch > Appearance & movement: a third view on the Watch tab.
   Cards reuse the Watch card markup, so ui.js plays the YouTube ones. Data: watch/appearance-data.js. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TOPICS=[['all','All'],['talks','Talks'],['clothes','Clothes'],['hair','Hair & grooming'],['shoes','Shoes'],['posture','Posture'],['walk','Walk'],['gaze','Gaze']];
const HEAD={talks:'Talks',clothes:'Clothes',hair:'Hair & grooming',shoes:'Shoes',posture:'Posture',walk:'Walk',gaze:'Gaze'};
const WHO={hughes:'Chase Hughes',vve:'Vanessa Van Edwards',vg:'Vinh Giang'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TEACH_ORDER={hughes:0,vve:1,vg:2};
let topic='all',kind='any',ready=false,loading=null;
function load(){
  if(ready)return Promise.resolve();if(loading)return loading;
  loading=new Promise((res,rej)=>{if(window.WATCH_AP)return res();const s=document.createElement('script');s.src='watch/appearance-data.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})
    .then(()=>{ready=true;render()}).catch(()=>{loading=null;$('#apList').innerHTML='<p class="caveat">Couldn’t load this list. Check your connection and reopen this tab.</p>'});
  return loading;
}
function items(){return (window.WATCH_AP&&window.WATCH_AP.items)||[]}
// teachers first (Hughes, then Vanessa, then Vinh), then outside sources; original order kept inside each group
function rank(v){return v.teacher?TEACH_ORDER[v.teacher]:3}
function sorted(a){return a.map((v,i)=>[v,i]).sort((x,y)=>rank(x[0])-rank(y[0])||x[1]-y[1]).map(x=>x[0])}
function pass(v){
  if(kind==='teachers'&&!v.teacher)return false;
  if(kind==='outside'&&v.teacher)return false;
  if(kind==='practitioner'&&v.type!=='practitioner')return false;
  if(kind==='research'&&v.type!=='research')return false;
  return true;
}
function badges(v){
  const who=v.teacher?`<span class="ap-b ap-teach">Teacher · ${esc(WHO[v.teacher])}</span>`:'<span class="ap-b ap-out">Outside source</span>';
  const t=`<span class="ap-b ap-${v.type}">${v.type==='research'?'Research':'Practitioner'}</span>`;
  const k=v.kind==='interactive'?'<span class="ap-b ap-int">Interactive</span>':v.kind==='web'?'<span class="ap-b ap-int">Web page</span>':'';
  return `<div class="vtags ap-tags">${who}${t}${k}</div>`;
}
function meta(v){
  const bits=[v.who,v.outlet];if(v.date){const [y,m]=v.date.split('-');bits.push(MON[+m-1]+' '+y)}
  return bits.join(' · ');
}
function card(v){
  const href=v.kind==='yt'?'https://www.youtube.com/watch?v='+v.id:v.url;
  let media;
  if(v.kind==='yt'){
    media=`<div class="vframe" data-yt="${esc(v.id)}">
      <img loading="lazy" decoding="async" src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="Thumbnail: ${esc(v.title)}" onerror="this.parentNode.classList.add('noimg');this.remove()">
      <button class="vplay" data-seek="0" aria-label="Play ${esc(v.title)}"><span>▶</span></button>
      <span class="vdur">${esc(v.dur)}</span></div>`;
  }else{
    media=`<a class="ap-web" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Open ${esc(v.title)} on ${esc(v.host)}"><span class="ap-webic">${v.kind==='interactive'?'◉':'↗'}</span><span class="ap-webt">${v.kind==='interactive'?'Try it':'Opens on '+esc(v.host)}</span></a>`;
  }
  return `<article class="vcard ap-card" id="ap-${esc(v.id)}">${media}
    <div class="vbody">
      <div class="vsrc">${esc(meta(v))}</div>
      <h3>${esc(v.title)}</h3>
      <p class="vsum">${esc(v.get)}</p>
      ${v.note?`<p class="ap-warn">⚠︎ ${esc(v.note)}</p>`:''}
      ${badges(v)}
      <a class="vext" href="${esc(href)}" target="_blank" rel="noopener">${v.kind==='yt'?'Open on YouTube ↗':v.kind==='interactive'?'Open the interactive ↗':'Open on '+esc(v.host)+' ↗'}</a>
    </div></article>`;
}
function render(){
  if(!ready)return;
  const all=items();
  $('#apTopics').innerHTML=TOPICS.map(([k,l])=>{const n=k==='all'?all.filter(pass).length:all.filter(v=>pass(v)&&v.topics.includes(k)).length;return `<button class="${k===topic?'on':''}" data-ap-t="${k}">${l} <span class="apn">${n}</span></button>`}).join('');
  $('#apKind').value=kind;
  const body=[];let total=0;
  if(topic==='all'){
    Object.keys(HEAD).forEach(k=>{const vs=sorted(all.filter(v=>v.primary===k&&pass(v)));if(!vs.length)return;total+=vs.length;
      body.push(`<h3 class="ap-h">${HEAD[k]} <span class="count">${vs.length}</span></h3>`+vs.map(card).join(''))});
  }else{
    const vs=sorted(all.filter(v=>v.topics.includes(topic)&&pass(v)));total=vs.length;body.push(vs.map(card).join(''));
  }
  $('#apCount').textContent=total+(total===1?' video':' videos');
  $('#apList').innerHTML=total?body.join(''):'<p class="caveat">Nothing matches that filter.</p>';
  const off=$('#apOffline');if(off)off.hidden=navigator.onLine!==false;
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
    if(b.dataset.apT){topic=b.dataset.apT;render();return}
  });
  $('#apKind').addEventListener('change',e=>{kind=e.target.value;render()});
  window.addEventListener('online',render);window.addEventListener('offline',render);
}
window.WATCH_AP_UI={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
