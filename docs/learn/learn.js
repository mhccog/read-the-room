/* Read the Room · Learn: bite-sized cards from Chase Hughes, Vanessa Van Edwards and Vinh Giang.
   Data: learn/cards.js (built by tools/learn_build.py). Progress lives only on this device (localStorage rtr.learn.v1). */
(function () {
  'use strict';
  const KEY = 'rtr.learn.v1', GOAL = 5;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const TEACH = [['all', 'All'], ['ch', 'Chase Hughes'], ['vve', 'Vanessa Van Edwards'], ['vg', 'Vinh Giang']];
  let S = load(), D = null, byId = {}, root = null, loading = null, revealed = false, sheetId = null;

  function load() {
    let s = {}; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    return Object.assign({ learned: {}, saved: {}, day: { d: today(), n: 0 }, mode: 'deck', teacher: 'all', topic: 'all',
      flt: { unlearned: false, saved: false, versions: false }, q: '', pos: 0, order: null, sprint: null }, s);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function ensureData() {
    if (window.LEARN_DATA) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'learn/cards.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    return loading;
  }
  function init() {
    D = window.LEARN_DATA; D.cards.forEach(c => { byId[c.id] = c; });
    D.topicById = {}; D.topics.forEach(t => { D.topicById[t.id] = t; });
    if (S.day.d !== today()) S.day = { d: today(), n: 0 };
  }
  const topicName = id => (D.topicById[id] || { name: id }).name;
  const topicEmoji = id => (D.topicById[id] || { emoji: '' }).emoji;

  /* ---------- filtering ---------- */
  function pool(ignoreFlags) {
    const q = (S.mode === 'browse' ? S.q : '').trim().toLowerCase();
    return D.cards.filter(c => {
      if (S.teacher !== 'all' && c.t !== S.teacher) return false;
      if (S.topic !== 'all' && c.tp !== S.topic) return false;
      if (!ignoreFlags && S.mode === 'deck') {
        if (S.flt.unlearned && S.learned[c.id]) return false;
        if (S.flt.saved && !S.saved[c.id]) return false;
        if (S.flt.versions && !c.vers) return false;
      }
      if (q) {
        const hay = (c.ti + ' ' + c.mv + ' ' + c.tr + ' ' + c.w + ' ' + (c.d.how || []).join(' ') + ' ' + (c.d.lines || []).map(l => l.say).join(' ') + ' ' + topicName(c.tp) + ' ' + D.teachers[c.t]).toLowerCase();
        if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });
  }
  function deckList() {
    if (S.sprint) return S.sprint.ids.map(id => byId[id]).filter(Boolean);
    const p = pool(); const ids = new Set(p.map(c => c.id));
    if (S.order) { const o = S.order.filter(id => ids.has(id)); if (o.length === p.length) return o.map(id => byId[id]); }
    return p;
  }

  /* ---------- rendering ---------- */
  function pills(c, big) {
    return `<div class="lx-pills"><span class="lx-pill lx-t t-${c.t}"><i></i>${esc(D.teachers[c.t])}</span>` +
      `<span class="lx-pill lx-tp">${topicEmoji(c.tp)} ${esc(topicName(c.tp))}</span>` +
      (c.vb ? `<span class="lx-pill lx-v" title="Has earlier and updated versions">⟲ ${esc(c.vb)}</span>` : '') + `</div>`;
  }
  function head() {
    const total = D.cards.length, n = Object.keys(S.learned).filter(id => byId[id]).length, pct = Math.round(n / total * 100);
    const r = 20, circ = 2 * Math.PI * r, goal = Math.min(S.day.n, GOAL);
    return `<div class="lx-head"><div><div class="lx-kicker">Learn</div><h2>Bite-sized people skills</h2>
      <p class="lx-sub">${total} cards from three teachers. Five seconds out and about, or tap in to go deeper.</p></div>
      <div class="lx-ring" aria-label="${n} of ${total} learned"><svg viewBox="0 0 48 48" width="56" height="56"><circle cx="24" cy="24" r="${r}" class="bg"/><circle cx="24" cy="24" r="${r}" class="fg" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - n / total)}"/></svg><b>${n && pct < 1 ? "<1" : pct}%</b></div></div>
      <div class="lx-prog"><div class="lx-bar"><i style="width:${n / total * 100}%"></i></div>
      <div class="lx-progtxt"><span><b id="lxLearned">${n}</b> / ${total} learned</span><span class="lx-goal ${goal >= GOAL ? 'done' : ''}">Today ${goal}/${GOAL}${goal >= GOAL ? ' ✓' : ''}</span></div></div>
      <div class="lx-seg" role="tablist"><button role="tab" data-mode="deck" class="${S.mode === 'deck' ? 'on' : ''}" aria-selected="${S.mode === 'deck'}">Deck</button><button role="tab" data-mode="browse" class="${S.mode === 'browse' ? 'on' : ''}" aria-selected="${S.mode === 'browse'}">Browse</button><i class="${S.mode === 'browse' ? 'r' : ''}"></i></div>
      <div class="lx-teachers" role="group" aria-label="Teacher">${TEACH.map(([id, nm]) => `<button data-teacher="${id}" class="t-${id} ${S.teacher === id ? 'on' : ''}" aria-pressed="${S.teacher === id}"><i></i>${nm}</button>`).join('')}</div>`;
  }
  function topicSelect() {
    const counts = {}; D.cards.forEach(c => { if (S.teacher === 'all' || c.t === S.teacher) counts[c.tp] = (counts[c.tp] || 0) + 1; });
    return `<label class="lx-select"><span class="sr">Topic</span><select data-topic-select>` +
      `<option value="all">All topics</option>` + D.topics.filter(t => counts[t.id]).map(t => `<option value="${t.id}" ${S.topic === t.id ? 'selected' : ''}>${t.emoji} ${esc(t.name)} (${counts[t.id]})</option>`).join('') + `</select></label>`;
  }
  function deck() {
    const list = deckList(); if (S.pos >= list.length) S.pos = 0;
    const c = list[S.pos];
    const sprint = S.sprint;
    let h = `<div class="lx-filters">${topicSelect()}<div class="lx-flags">` +
      [['unlearned', 'Unlearned'], ['saved', 'Saved'], ['versions', 'Has versions']].map(([k, l]) => `<button data-flag="${k}" class="lx-chip ${S.flt[k] ? 'on' : ''}" aria-pressed="${!!S.flt[k]}">${l}</button>`).join('') +
      `</div></div>`;
    h += `<div class="lx-deckbar"><span class="lx-count">${sprint ? `Sprint · ${Math.min(S.pos + 1, list.length)} of ${list.length}` : (list.length ? `Card ${S.pos + 1} of ${list.length}` : 'No cards')}</span>` +
      (sprint ? `<button class="lx-link" data-act="endsprint">End sprint</button>` : `<button class="lx-sprint" data-act="sprint">⚡ 5-card sprint</button>`) + `</div>`;
    if (sprint && sprint.done) {
      h += `<article class="lx-card lx-done"><div class="lx-emoji">🎉</div><h3>Sprint done</h3><p>You marked ${sprint.ids.filter(id => S.learned[id]).length} of ${sprint.ids.length} as learned. Nice work.</p>
        <div class="lx-actions"><button class="lx-btn primary" data-act="sprint">Another sprint</button><button class="lx-btn" data-act="endsprint">Back to the deck</button></div></article>`;
    } else if (!c) {
      h += `<article class="lx-card lx-empty"><div class="lx-emoji">🗂️</div><h3>Nothing here yet</h3><p>${S.flt.saved ? 'Save cards with ☆ to build a quick review stack.' : 'Try another teacher or topic, or clear a filter.'}</p><button class="lx-btn" data-act="clearflt">Clear filters</button></article>`;
    } else {
      h += card(c);
      h += `<div class="lx-nav"><button class="lx-navbtn" data-act="prev" aria-label="Previous card">‹ Prev</button><button class="lx-navbtn" data-act="shuffle" aria-label="Shuffle">⤮ Shuffle</button><button class="lx-navbtn primary" data-act="next" aria-label="Next card">Next ›</button></div>
        <p class="lx-hint">Swipe the card, or use ← → on a keyboard.</p>`;
    }
    return h;
  }
  function card(c) {
    const learned = !!S.learned[c.id], saved = !!S.saved[c.id];
    return `<article class="lx-card t-${c.t}" data-id="${c.id}" id="lxCard">${pills(c, true)}
      <h3 class="lx-title">${esc(c.ti)}</h3>
      <p class="lx-move"><span class="lx-lbl">The move</span>${esc(c.mv)}</p>
      <div class="lx-try"><span class="lx-lbl">Try it now</span><p>${esc(c.tr)}</p></div>
      <div class="lx-watch"><span class="lx-lbl">${esc(c.wl)}</span><p>${esc(c.w)}</p></div>
      <div class="lx-check ${revealed ? 'open' : ''}"><button data-act="reveal" aria-expanded="${revealed}"><span class="lx-lbl">Quick check</span><span class="q">${esc(c.q)}</span><span class="tap">${revealed ? 'Hide' : 'Tap to reveal'}</span></button>
        <div class="a" ${revealed ? '' : 'hidden'}>${esc(c.a)}</div></div>
      <div class="lx-actions"><button class="lx-btn primary" data-act="deep" data-id="${c.id}">Go deeper</button>
        <button class="lx-btn ${learned ? 'on' : ''}" data-act="learn" data-id="${c.id}" aria-pressed="${learned}">${learned ? '✓ Learned' : 'Got it'}</button>
        <button class="lx-btn icon ${saved ? 'on' : ''}" data-act="save" data-id="${c.id}" aria-pressed="${saved}" aria-label="${saved ? 'Saved' : 'Save'}">${saved ? '★' : '☆'}<span>${saved ? 'Saved' : 'Save'}</span></button></div>
    </article>`;
  }
  function browse() {
    const list = pool();
    const counts = {}; pool(true).forEach(c => { counts[c.tp] = (counts[c.tp] || 0) + 1; });
    let h = `<div class="lx-search"><input type="search" id="lxSearch" placeholder="Search ${D.cards.length} cards…" value="${esc(S.q)}" aria-label="Search cards" autocomplete="off"></div>
      <div class="lx-topics" role="group" aria-label="Topic"><button data-topic="all" class="lx-chip ${S.topic === 'all' ? 'on' : ''}">All topics</button>` +
      D.topics.map(t => `<button data-topic="${t.id}" class="lx-chip ${S.topic === t.id ? 'on' : ''}">${t.emoji} ${esc(t.name)}</button>`).join('') + `</div>
      <p class="lx-count" id="lxBrowseCount">${list.length} card${list.length === 1 ? '' : 's'}</p>`;
    D.topics.forEach(t => {
      const cs = list.filter(c => c.tp === t.id); if (!cs.length) return;
      h += `<section class="lx-group"><h3><span>${t.emoji}</span>${esc(t.name)}<small>${cs.length}</small></h3><div class="lx-grid">` +
        cs.map(c => `<button class="lx-mini t-${c.t}" data-act="deep" data-id="${c.id}"><span class="lx-mini-top"><span class="lx-t t-${c.t}"><i></i>${esc(D.teachers[c.t])}</span><span class="lx-badges">${c.vers ? '<b class="v" title="Versions">⟲</b>' : ''}${S.saved[c.id] ? '<b class="s" title="Saved">★</b>' : ''}${S.learned[c.id] ? '<b class="l" title="Learned">✓</b>' : ''}</span></span>
          <strong>${esc(c.ti)}</strong><span class="mv">${esc(c.mv)}</span></button>`).join('') + `</div></section>`;
    });
    if (!list.length) h += `<div class="lx-card lx-empty"><div class="lx-emoji">🔍</div><h3>No matches</h3><p>Try fewer words, or switch teacher or topic.</p></div>`;
    return h;
  }
  function render(keepFocus) {
    if (!root || !D) return;
    const y = window.scrollY;
    root.innerHTML = head() + `<div class="lx-body">${S.mode === 'deck' ? deck() : browse()}</div>`;
    if (keepFocus) { const i = $('#lxSearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } window.scrollTo(0, y); }
    bindSwipe();
  }
  /* ---------- deep research sheet ---------- */
  function sec(title, inner) { return inner ? `<section class="lx-sec"><h4>${title}</h4>${inner}</section>` : ''; }
  function sheetHTML(c) {
    const d = c.d, learned = !!S.learned[c.id], saved = !!S.saved[c.id];
    const lines = (d.lines || []).map(l => `<div class="lx-line"><p class="say">“${esc(l.say)}”</p>${l.how ? `<p class="how"><span>How to say it</span>${esc(l.how)}</p>` : ''}${l.why ? `<p class="why">${esc(l.why)}</p>` : ''}</div>`).join('');
    const traps = [c.w].concat(d.traps || []).filter((x, i, a) => x && a.indexOf(x) === i);
    const vers = (c.vers || []).map(v => `<div class="lx-ver"><p class="vt">${esc(v.title)}</p><p class="vn">${esc(v.note)}</p><ol class="lx-time">` +
      v.chain.map(s => `<li class="${s.card === c.id ? 'me' : ''}"><span class="vl">${esc(s.label)}</span><span class="vw">${esc(s.when)}</span><p>${esc(s.text)}</p>${s.card && s.card !== c.id && byId[s.card] ? `<button class="lx-link" data-open="${s.card}">Open “${esc(byId[s.card].ti)}” →</button>` : ''}</li>`).join('') + `</ol></div>`).join('');
    const rel = (d.rel || []).filter(id => byId[id]).map(id => `<button class="lx-chip" data-open="${id}">${esc(byId[id].ti)}</button>`).join('');
    const go = (d.go || []).map(g => `<button class="lx-chip go" data-go="${g.tab}" ${g.need ? `data-need="${g.need}"` : ''}>${esc(g.label)} →</button>`).join('');
    return `<div class="lx-sheet t-${c.t}" role="dialog" aria-modal="true" aria-labelledby="lxSheetTitle">
      <div class="lx-sheet-top"><span class="lx-grab" aria-hidden="true"></span><button class="lx-x" data-act="close" aria-label="Close">×</button>${pills(c)}</div>
      <div class="lx-sheet-body">
        <h3 id="lxSheetTitle">${esc(c.ti)}</h3>
        <p class="lx-move big"><span class="lx-lbl">The move</span>${esc(c.mv)}</p>
        ${d.q ? `<div class="lx-quiet"><span class="lx-lbl">The quiet question</span>“${esc(d.q)}”</div>` : ''}
        ${sec('How &amp; why it works', (d.how || []).map(p => `<p>${esc(p)}</p>`).join(''))}
        ${sec('Step by step', d.steps ? `<ol class="lx-steps">${d.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '')}
        ${sec('What you might notice', d.signs ? `<ul>${d.signs.map(s => `<li>${esc(s)}</li>`).join('')}</ul><p class="lx-note">Hunches to test by listening, never labels.</p>` : '')}
        ${sec('Try saying', lines)}
        ${sec('Try it now', `<p>${esc(c.tr)}</p>`)}
        ${sec('Examples', d.ex ? `<ul>${d.ex.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '')}
        ${sec('Traps to avoid', `<ul class="lx-traps">${traps.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`)}
        ${sec('Versions · earlier and updated', vers)}
        ${sec('Where it comes from', `<p class="lx-src"><span class="lx-t t-${c.t}"><i></i>${esc(D.teachers[c.t])}</span>${c.ev ? ` · Evidence: ${esc(c.ev)}` : ''}</p>${(d.src || []).length ? `<ul class="lx-srcs">${d.src.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}<p class="lx-note">Paraphrased study notes in our own words. No book text.</p>`)}
        ${sec('Related cards', rel ? `<div class="lx-chips">${rel}</div>` : '')}
        ${sec('Jump to', go ? `<div class="lx-chips">${go}</div>` : '')}
      </div>
      <div class="lx-sheet-foot"><button class="lx-btn ${learned ? 'on' : ''}" data-act="learn" data-id="${c.id}" aria-pressed="${learned}">${learned ? '✓ Learned' : 'Got it'}</button>
        <button class="lx-btn icon ${saved ? 'on' : ''}" data-act="save" data-id="${c.id}" aria-pressed="${saved}">${saved ? '★' : '☆'}<span>${saved ? 'Saved' : 'Save'}</span></button>
        <button class="lx-btn primary" data-act="close">Done</button></div>
    </div>`;
  }
  let wrap = null, lastFocus = null;
  function openSheet(id) {
    const c = byId[id]; if (!c) return;
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'lx-sheet-wrap'; wrap.id = 'lxSheet'; document.body.appendChild(wrap);
      wrap.addEventListener('click', e => { if (e.target === wrap) closeSheet(); else onClick(e); }); }
    if (!sheetId) lastFocus = document.activeElement;
    sheetId = id; wrap.innerHTML = sheetHTML(c); wrap.hidden = false;
    document.documentElement.classList.add('lx-lock');
    requestAnimationFrame(() => { wrap.classList.add('open'); const b = wrap.querySelector('.lx-sheet-body'); if (b) b.scrollTop = 0; const x = wrap.querySelector('.lx-x'); x && x.focus({ preventScroll: true }); });
  }
  function closeSheet() {
    if (!wrap || !sheetId) return; sheetId = null; wrap.classList.remove('open');
    document.documentElement.classList.remove('lx-lock');
    setTimeout(() => { if (!sheetId) { wrap.hidden = true; wrap.innerHTML = ''; } }, 260);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---------- actions ---------- */
  function toggleLearned(id) {
    if (S.learned[id]) delete S.learned[id]; else { S.learned[id] = Date.now(); if (S.day.d !== today()) S.day = { d: today(), n: 0 }; S.day.n++; }
    save();
  }
  function step(dir) {
    const list = deckList(); if (!list.length) return;
    if (S.sprint) {
      if (dir > 0 && S.pos >= list.length - 1) { S.sprint.done = true; save(); revealed = false; render(); return; }
      S.pos = Math.max(0, Math.min(list.length - 1, S.pos + dir));
    } else S.pos = (S.pos + dir + list.length) % list.length;
    revealed = false; save(); animate(dir);
  }
  function animate(dir) {
    render();
    const el = $('#lxCard'); if (!el || !dir) return;
    el.style.transition = 'none'; el.style.transform = `translateX(${dir * 40}px)`; el.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; }));
  }
  function shuffle() {
    const ids = pool().map(c => c.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    S.order = ids; S.pos = 0; revealed = false; save(); animate(1);
  }
  function sprint() {
    let p = pool(true).filter(c => !S.learned[c.id]); if (p.length < 5) p = pool(true);
    const ids = p.map(c => c.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    S.sprint = { ids: ids.slice(0, 5), done: false }; S.pos = 0; revealed = false; save(); render();
  }
  function go(tab, need) {
    closeSheet();
    const A = window.HUB_APP || {};
    if (tab === 'say' && need && window.SAY && window.SAY.preset) window.SAY.preset({ need: need });
    if (A.show) A.show(tab);
  }
  function onClick(e) {
    const t = e.target.closest('button,[data-act]'); if (!t) return;
    if (t.dataset.mode) { S.mode = t.dataset.mode; save(); render(); return; }
    if (t.dataset.teacher) { S.teacher = t.dataset.teacher; S.pos = 0; S.order = null; S.sprint = null; revealed = false; save(); render(); return; }
    if (t.dataset.flag) { S.flt[t.dataset.flag] = !S.flt[t.dataset.flag]; S.pos = 0; S.sprint = null; revealed = false; save(); render(); return; }
    if (t.dataset.topic) { S.topic = t.dataset.topic; save(); render(); return; }
    if (t.dataset.open) { openSheet(t.dataset.open); return; }
    if (t.dataset.go) { go(t.dataset.go, t.dataset.need); return; }
    const a = t.dataset.act; if (!a) return;
    if (a === 'deep') openSheet(t.dataset.id);
    else if (a === 'close') closeSheet();
    else if (a === 'learn' || a === 'save') {
      const id = t.dataset.id;
      if (a === 'learn') toggleLearned(id); else { if (S.saved[id]) delete S.saved[id]; else S.saved[id] = Date.now(); save(); }
      if (sheetId) openSheet(sheetId);
      const keep = S.mode === 'deck' && a === 'learn' && S.flt.unlearned ? false : true;
      if (!keep) { const l = deckList(); if (S.pos >= l.length) S.pos = 0; }
      render();
      if (a === 'learn' && S.learned[id] && window.HUB_APP && HUB_APP.toast) HUB_APP.toast(S.day.n === GOAL ? 'Daily goal hit 🎉' : 'Marked as learned');
    }
    else if (a === 'reveal') { revealed = !revealed; const box = t.closest('.lx-check'); box.classList.toggle('open', revealed); box.querySelector('.a').hidden = !revealed; t.setAttribute('aria-expanded', revealed); t.querySelector('.tap').textContent = revealed ? 'Hide' : 'Tap to reveal'; }
    else if (a === 'next') step(1);
    else if (a === 'prev') step(-1);
    else if (a === 'shuffle') shuffle();
    else if (a === 'sprint') sprint();
    else if (a === 'endsprint') { S.sprint = null; S.pos = 0; save(); render(); }
    else if (a === 'clearflt') { S.flt = { unlearned: false, saved: false, versions: false }; S.topic = 'all'; S.teacher = 'all'; S.pos = 0; save(); render(); }
  }
  function bindSwipe() {
    const el = $('#lxCard'); if (!el) return;
    let x0 = null, y0 = 0, dx = 0, id = null;
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; });
    el.addEventListener('pointermove', e => { if (x0 == null || e.pointerId !== id) return; dx = e.clientX - x0; if (Math.abs(dx) > Math.abs(e.clientY - y0) && Math.abs(dx) > 8) { el.style.transition = 'none'; el.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`; } });
    const end = () => { if (x0 == null) return; x0 = null; el.style.transition = ''; if (Math.abs(dx) > 70) step(dx < 0 ? 1 : -1); else el.style.transform = ''; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    // touch fallback for browsers without pointer events on touch
    el.addEventListener('touchstart', e => { if (e.target.closest('button')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; id = 'touch'; }, { passive: true });
    el.addEventListener('touchmove', e => { if (x0 == null || id !== 'touch') return; dx = e.touches[0].clientX - x0; }, { passive: true });
    el.addEventListener('touchend', () => { if (id === 'touch') end(); });
  }
  function isActive() { const s = $('#tab-learn'); return s && s.classList.contains('active'); }
  function show() {
    root = $('#learnApp'); if (!root) return;
    if (!D) { root.innerHTML = '<p class="lx-loading">Loading cards…</p>'; ensureData().then(() => { init(); render(); }).catch(() => { root.innerHTML = '<p class="lx-loading">Couldn’t load the cards. Check your connection and reopen Learn.</p>'; }); }
    else render();
  }
  document.addEventListener('click', e => { if (root && root.contains(e.target)) onClick(e); });
  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'lxSearch') { S.q = e.target.value; save(); const b = root.querySelector('.lx-body'); const v = S.q; b.innerHTML = browse(); const i = $('#lxSearch'); i.value = v; i.focus(); i.setSelectionRange(v.length, v.length); }
  });
  document.addEventListener('change', e => { if (e.target && e.target.matches('[data-topic-select]')) { S.topic = e.target.value; S.pos = 0; S.sprint = null; revealed = false; save(); render(); } });
  document.addEventListener('keydown', e => {
    if (sheetId && e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (!isActive() || sheetId || S.mode !== 'deck' || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  document.addEventListener('tabshow', e => { if (e.detail === 'learn') show(); else closeSheet(); });
  if (isActive()) show();
  window.LEARN = { open: id => ensureData().then(() => { if (!D) init(); openSheet(id); }), state: () => S };
})();
