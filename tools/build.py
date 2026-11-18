#!/usr/bin/env python3
"""Build Read the Room from the two source sites.

Usage: python3 tools/build.py BEHAVIOR_OPS_DIR READ_ANYONE_DIR OUT_DIR
- Copies Behavior Ops (Profile, Body, Talk, Ask-Hughes, Watch, People) as the base.
- Ports the Read Anyone generator into say/ and its blended Ask into blend/ (renamed so the
  two Ask engines never share data).
- Adds the hub's own files from overlay/ (index.html, hub.js, hub.css, manifest, icons).
- Writes sw.js with every file pre-cached.
Every patch asserts that its target text exists, so an upstream change fails loudly.
"""
import sys, os, re, shutil, json, hashlib, subprocess
BO, RA, OUT = [os.path.abspath(p) for p in sys.argv[1:4]]
HERE = os.path.dirname(os.path.abspath(__file__))
OVER = os.path.join(os.path.dirname(HERE), 'overlay')

def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(s)
def sub(s, old, new, count=1, where=''):
    n = s.count(old)
    assert n >= 1, f'patch target missing in {where}: {old[:80]!r}'
    if count == 'all': return s.replace(old, new)
    assert n == count, f'expected {count} of {old[:60]!r} in {where}, found {n}'
    return s.replace(old, new)

# clean output (keep .git and anything starting with .)
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.startswith('.'): continue
    p = os.path.join(OUT, f)
    shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)

# ---------- 1. Behavior Ops base ----------
for d in ['figure', 'photos', 'vendor', 'watch', 'ask']:
    shutil.copytree(os.path.join(BO, d), os.path.join(OUT, d), ignore=shutil.ignore_patterns('dev.html'))
for f in ['data.js', 'style.css', 'CREDITS.md']:
    shutil.copy(os.path.join(BO, f), os.path.join(OUT, f))

a = rd(os.path.join(BO, 'app.js')); W = 'app.js'
a = sub(a, 'const KEY="bo.people.v1", CUR="bo.current.v1";', 'const KEY="rtr.people.v1", CUR="rtr.current.v1";', where=W)
# "Get a line" cross-link from the Profile card and from People
a = sub(a, "out.push(`<div class=\"blk\"><h4>Things to say</h4>${x.say.map(copyBtn).join('')}",
        "out.push(`<div class=\"blk\"><h4>Things to say</h4>${x.say.map(copyBtn).join('')}<button class=\"ghost tosay\" data-tosay=\"${n}|${P.stress>P.comfort?1:0}\">✦ More lines for them in Say</button>", where=W)
a = sub(a, '<button class="ghost" data-view="${p.id}">How to talk to them</button>',
        '<button class="ghost" data-view="${p.id}">How to talk to them</button>${P.needs[0]?`<button class="ghost" data-tosay="${P.needs[0]}|${P.stress>P.comfort?1:0}" data-who="${esc(p.name)}">✦ Lines</button>`:\'\'}', where=W)
a = sub(a, "const h=location.hash.slice(1);if(['profile','cues','talk','ask','watch','people'].includes(h))show(h);",
        "const h=location.hash.slice(1);show(['say','profile','cues','talk','ask','watch','people'].includes(h)?h:'say');\nwindow.HUB_APP={show,compute,people,dialog,toast};", where=W)
a = sub(a, "Everything works except playing Watch videos.", "Everything works except playing Watch videos.", where=W)
wr(os.path.join(OUT, 'app.js'), a)

u = rd(os.path.join(BO, 'ask/ui.js')); W = 'ask/ui.js'
u = sub(u, "const KEY='bo.ask.v1';", "const KEY='rtr.ask.hughes.v1';", where=W)
u = sub(u, "const root=$('#tab-ask');if(!root)return;", "const root=$('#askHughes');if(!root)return;", where=W)
wr(os.path.join(OUT, 'ask/ui.js'), u)

w = rd(os.path.join(BO, 'watch/ui.js')); W = 'watch/ui.js'
w = sub(w, "const KEY='bo.watch.v1';", "const KEY='rtr.watch.v1';", where=W)
w = sub(w, "function goAsk(id){tab('ask');", "function goAsk(id){tab('ask');if(window.HUB)HUB.askMode('hughes');", where=W)
wr(os.path.join(OUT, 'watch/ui.js'), w)

# ---------- 2. Read Anyone generator -> say/ ----------
for f in ['phrases.json', 'words.json']:
    shutil.copy(os.path.join(RA, f), os.path.join(OUT, 'say', f)) if os.path.isdir(os.path.join(OUT, 'say')) else (os.makedirs(os.path.join(OUT, 'say')), shutil.copy(os.path.join(RA, f), os.path.join(OUT, 'say', f)))
g = rd(os.path.join(RA, 'app.js')); W = 'say/app.js'
g = sub(g, 'const KEY = "cyrus-say-it-v1";', 'const KEY = "rtr.say.favs.v1";', where=W)
g = sub(g, 'const OLD_KEY = "cyrus-read-anyone-v1";', 'const OLD_KEY = "cyrus-say-it-v1";', where=W)
g = sub(g, 'document.getElementById("app")', 'document.getElementById("sayApp")', count=2, where=W)
g = sub(g, 'fetch("phrases.json")', 'fetch("say/phrases.json")', where=W)
g = sub(g, 'fetch("words.json")', 'fetch("say/words.json")', where=W)
g = sub(g, '\'<div><div class="kicker">Read Anyone</div><h1>Say it</h1></div>\'', '\'<div><div class="kicker">Line generator</div><h1>What do I say?</h1></div>\'', where=W)
g = sub(g, '<a href="#techniques" data-act="sources">', '<a href="#say" data-act="sources">', where=W)
g = sub(g, 'state.view = location.hash === "#techniques" ? "sources" : "gen";', 'state.view = state.view === "sources" ? "sources" : "gen";', where=W)
g = sub(g, 'if (location.hash !== "#techniques") location.hash = "techniques";\n      else render();', 'render();', where=W)
g = sub(g, 'if (location.hash) history.pushState("", document.title, location.pathname + location.search);\n', '', where=W)
g = sub(g, '    window.addEventListener("hashchange", function () {\n      setViewFromHash();\n      render();\n    });\n', '', where=W)
g = sub(g, '      navigator.serviceWorker.register("sw.js")', '      navigator.serviceWorker.getRegistration()', where=W)
api = '''
  // Hub hook: preset the chips from a Profile read or a saved person.
  window.SAY = {
    preset: function (o) {
      if (o.need) state.need = o.need;
      if (o.feeling) { state.feeling = o.feeling; if (SIMPLE_FEELINGS.indexOf(o.feeling) < 0) state.moreFeel = true; }
      if (o.sit) state.sit = o.sit;
      state.view = "gen"; state.showFavs = false;
      if (state.loaded && !state.error) { pickLine(); pickWord(); }
      render();
    },
    names: function () { return { needs: NEEDS, feelings: FEELINGS }; }
  };
})();'''
assert g.rstrip().endswith('})();'); g = g.rstrip()[:-5] + api.lstrip('\n') + '\n'
wr(os.path.join(OUT, 'say/app.js'), g)

# ---------- 3. Read Anyone Ask -> blend/ (blended Van Edwards + Hughes + Giang) ----------
def ren(s):
    s = re.sub(r'\bASK_KB\b', 'ASK_KB_BLEND', s)
    s = re.sub(r'\bASK_ENGINE\b', 'ASK_ENGINE_BLEND', s)
    s = re.sub(r'\bASK_UI\b', 'ASK_UI_BLEND', s)
    return s.replace('Read Anyone', 'Read the Room')
for f in ['kb.js', 'engine.js']:
    wr(os.path.join(OUT, 'blend', f), ren(rd(os.path.join(RA, 'ask', f))))
b = ren(rd(os.path.join(RA, 'ask/ui.js'))); W = 'blend/ui.js'
b = sub(b, 'const KEY = "read-anyone-ask-v2";', 'const KEY = "rtr.ask.blend.v1";', where=W)
b = sub(b, 'const FKEY = "read-anyone-ask-author";', 'const FKEY = "rtr.ask.blend.author";', where=W)
b = sub(b, 'add("ask/kb.js").then(function () { return add("ask/engine.js"); })', 'add("blend/kb.js").then(function () { return add("blend/engine.js"); })', where=W)
b = re.sub(r'\$\("#ask"\)', '$("#blendPane")', b)
b = re.sub(r'#ask([A-Z]\w*)', r'#bl\1', b)
b = sub(b, '    $("#app").hidden = isAsk; $("#blendPane").hidden = !isAsk;\n', '', where=W)
b = sub(b, '    document.querySelectorAll(".seg button").forEach(function (b) { const on = b.getAttribute("data-mode") === mode; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });\n    document.body.classList.toggle("asking", isAsk);\n', '', where=W)
b = sub(b, '''    if (push) {
      if (isAsk && location.hash !== "#ask") history.replaceState(null, "", "#ask");
      if (!isAsk && location.hash === "#ask") history.replaceState(null, "", location.pathname + location.search);
    }
''', '', where=W)
b = sub(b, '    if (isAsk) load();\n    window.scrollTo(0, 0);\n', '    if (isAsk) load();\n', where=W)
b = sub(b, '    document.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-mode"), true); }); });\n', '', where=W)
b = sub(b, '    window.addEventListener("hashchange", function () { setMode(location.hash === "#ask" ? "ask" : "gen", false); });\n', '', where=W)
b = sub(b, '    setMode(location.hash === "#ask" ? "ask" : "gen", false);\n', '', where=W)
assert '#ask' not in b.replace('#bl', ''), 'stray #ask id in blend/ui.js'
wr(os.path.join(OUT, 'blend/ui.js'), b)

# ---------- 4. Read Anyone styles -> say.css, scoped under .ra and recoloured to the off-white Apple look ----------
css = re.sub(r'/\*.*?\*/', '', rd(os.path.join(RA, 'styles.css')), flags=re.S)
DROP = re.compile(r'^(:root|\*|html|body|button|a|button:focus-visible|\[hidden\]|\.mode-wrap.*|\.seg.*)$')
def scope(block_css):
    out, i = [], 0
    while i < len(block_css):
        j = block_css.find('{', i)
        if j < 0: break
        sel = block_css[i:j].strip()
        if sel.startswith('@media') or sel.startswith('@supports'):
            depth, k = 1, j + 1
            while depth: depth += {'{': 1, '}': -1}.get(block_css[k], 0); k += 1
            inner = scope(block_css[j + 1:k - 1])
            if inner.strip(): out.append(f'{sel}{{\n{inner}}}\n')
            i = k; continue
        if sel.startswith('@keyframes'):
            depth, k = 1, j + 1
            while depth: depth += {'{': 1, '}': -1}.get(block_css[k], 0); k += 1
            out.append(block_css[i:k].replace('@keyframes ', '@keyframes ra-') + '\n'); i = k; continue
        k = block_css.find('}', j); body = block_css[j + 1:k].strip(); i = k + 1
        parts = [p.strip() for p in sel.split(',')]
        keep = [p for p in parts if not DROP.match(p)]
        if not keep: continue
        if set(parts) & {'*', '*::before', '*::after'}: continue
        out.append(', '.join('.ra ' + p for p in keep) + ' { ' + body + ' }\n')
    return ''.join(out)
scoped = scope(css)
for name in set(re.findall(r'@keyframes ra-([\w-]+)', scoped)):
    scoped = re.sub(r'(animation(?:-name)?\s*:[^;}]*?)\b' + re.escape(name) + r'\b', r'\1ra-' + name, scoped)
wr(os.path.join(OUT, 'say.css'), '/* Generated by tools/build.py from Read Anyone styles.css: scoped to .ra and recoloured. Edit overlay/hub.css instead. */\n' + scoped)

# ---------- 5. Hub overlay ----------
for root, dirs, files in os.walk(OVER):
    for f in files:
        src = os.path.join(root, f); dst = os.path.join(OUT, os.path.relpath(src, OVER))
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy(src, dst)

# ---------- 5b. Drop two weak photos (Cyrus, 18 Nov 2026) ----------
# Hub-owned: leave the Behavior Ops source unchanged. These cues stay in the
# Body tab (both have a 3D figure) but lose their "Real example" photo.
DROP_PHOTOS = ('contempt-one-sided-smirk', 'eyebrow-flash')

pjs_path = os.path.join(OUT, 'photos/photos.js')
pjs = rd(pjs_path)
pre, sep, rest = pjs.partition('window.BO_PHOTOS=')
assert sep, 'window.BO_PHOTOS missing from photos/photos.js'
obj_text = rest.strip()
if obj_text.endswith(';'):
    obj_text = obj_text[:-1].strip()
photos = json.loads(obj_text)
removed = []
for k in DROP_PHOTOS:
    if k not in photos:
        print('photo key already gone:', k)
        continue
    for item in photos[k]:
        removed.append(item['f'])
    del photos[k]
# Keep the existing pretty-printed style: 0-indent keys/fields, 2-space inside arrays is not required.
wr(pjs_path, pre + 'window.BO_PHOTOS=' + json.dumps(photos, ensure_ascii=False, indent=0) + ';\n')
for rel in removed:
    fp = os.path.join(OUT, rel)
    assert os.path.isfile(fp), f'photo file missing: {rel}'
    os.remove(fp)
    print('dropped', rel)

cred_path = os.path.join(OUT, 'CREDITS.md')
cred = rd(cred_path)
for title in ('Contempt (one-sided smirk)', 'Eyebrow flash'):
    cred2, n = re.subn(r'\n\*\*' + re.escape(title) + r'\*\*\n\n(?:- .+\n)+', '\n', cred, count=1)
    if n != 1:
        print('CREDITS.md section already gone:', title)
    cred = cred2
cred = re.sub(r'\n{3,}', '\n\n', cred)
wr(cred_path, cred)

# ---------- 6. Service worker: precache everything ----------
files = []
for root, dirs, fs in os.walk(OUT):
    dirs[:] = [d for d in dirs if not d.startswith('.')]
    for f in fs:
        rel = os.path.relpath(os.path.join(root, f), OUT)
        if f.startswith('.') or rel == 'sw.js' or f.endswith(('.md', '.txt', '.py')) or 'LICENSE' in f or rel.startswith('tools/'): continue
        files.append(rel)
files.sort()
h = hashlib.sha1()
for f in files: h.update(f.encode()); h.update(open(os.path.join(OUT, f), 'rb').read())
ver = 'rtr-' + h.hexdigest()[:10]
F = json.dumps(['./'] + files)
sw = f"""// Read the Room offline support: every file is saved on first visit. Generated by tools/build.py.
const C='{ver}';const T='rtr-thumbs';const F={F};
self.addEventListener('install',e=>{{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==T).map(x=>caches.delete(x)))));self.clients.claim()}});
self.addEventListener('fetch',e=>{{
 const u=new URL(e.request.url);if(e.request.method!=='GET')return;
 if(u.hostname==='i.ytimg.com'){{e.respondWith(caches.open(T).then(c=>c.match(e.request).then(m=>m||fetch(e.request).then(r=>{{c.put(e.request,r.clone());return r}}))));return}}
 if(u.origin!==location.origin)return;
 const fromCache=()=>caches.match(e.request,{{ignoreSearch:true}}).then(m=>m||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()));
 const net=fetch(e.request).then(r=>{{if(r.ok){{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}}return r}});
 // network first; after 3s on a weak signal, fall back to the saved copy
 const slow=new Promise(res=>setTimeout(()=>caches.match(e.request,{{ignoreSearch:true}}).then(m=>m&&res(m)),3000));
 e.respondWith(Promise.race([net,slow]).catch(fromCache));
}});
"""
wr(os.path.join(OUT, 'sw.js'), sw)
print(ver, len(files), 'files')
