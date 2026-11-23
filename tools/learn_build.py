#!/usr/bin/env python3
"""Build the Learn cards (docs/learn/cards.js) from the two source repos + overlay/learn-src/.

Usage: python3 tools/learn_build.py BEHAVIOR_OPS_DIR READ_ANYONE_DIR OUT_DIR
(build.py calls build() directly.)

Sources, all paraphrased study notes already written for the two sites (no book text):
- Read Anyone research/techniques-inventory.md   -> one card per kept technique (V1-V90, G1-G44, H1-H43)
- Read Anyone research/ask-kb/{vve,vg,ch,all}.txt -> the deeper notes for those cards (+ a few stand-alone notes)
- Read Anyone phrases.json                         -> "Try saying" lines + "How to say it" cues (teacher-pure only)
- Behavior Ops data.js (needs, Talk playbooks)     -> six need cards and playbook cards (Hughes)
- Behavior Ops ask/kb.js                           -> extra Hughes detail + an explicit allow-list of stand-alone cards
- overlay/hub.js SAY_NEEDS / SAY_NEEDS_DEEP         -> the Read the Room wording of the needs (Hughes parts only)
- overlay/learn-src/                               -> curation: mappings, versions, overrides, v1 needs snapshot
Ethics filters (sections 07-09, H44-H83, V91, lie-spotting, other-teacher mentions on a card) run on every sentence;
tools/learn_audit.py re-checks the built file independently.
"""
import sys, os, re, json, subprocess, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
OVER = os.path.join(os.path.dirname(HERE), 'overlay')
SRC = os.path.join(OVER, 'learn-src')

TEACHERS = {'ch': 'Chase Hughes', 'vve': 'Vanessa Van Edwards', 'vg': 'Vinh Giang'}
PREFIX = {'H': 'ch', 'V': 'vve', 'G': 'vg'}
# Pages of The Behavior Ops Manual that hold the excluded material (H44-H83 and sections 07-09).
EXCL_PAGES = [(16, 31), (33, 37), (40, 61), (90, 90), (205, 446), (455, 457), (484, 497), (499, 796), (806, 823), (836, 936)]
# Words that mark excluded or manipulative material. A sentence containing one is dropped.
BLOCK = re.compile(r"hypno|trance|embedded command|double.bind|elicit|provocative statement|bracketing|feign|naivety|hourglass|"
                   r"\bPCP\b|six.axis|\bFATE\b|frame control|warning shot|those types|confusion|scarcity|interrogat|confess|\bcults?\b|cult recruit|"
                   r"\bAVERY\b|KAPTOR|LILAC|SIGMA|brainwash|entrainment|social vacuum|compliance|suggestib|presupposition|brain pharmacist|"
                   r"neuropeptide|identity hack|pre-?commit|\blie\b|\blies\b|\blying\b|\bliars?\b|decepti|six.minute|\b6MX\b|x-ray|behavio(u)?r compass|"
                   r"table of elements|\bBTE\b|\bDRS\b|decision map|persuasion script|sensory.preference|positive side|eye.accessing|quadrant|harvesting|"
                   r"dissociat|regression|false memor|amnesia|sleep depriv|covert|manipulat|coerc|camera (shift|angle)|grief (process|model)|"
                   r"kelly method|fractionation|ten-minute recipe|obama|free coffee|free anything|love.bomb|recruiter|\bjury\b|trial science|"
                   r"technique creation|\bHBI\b|development triangle|\bI bet\b|informational altruism|physical contact|timed touch|"
                   r"\bH(4[4-9]|[5-7]\d|8[0-3])\b|\bV91\b|left out|leaves out|is excluded|are excluded|\bexcluded\b", re.I)
OTHERS = {'ch': re.compile(r"Vanessa|Van Edwards|Vinh|Giang", re.I),
          'vve': re.compile(r"Hughes|Chase|Vinh|Giang", re.I),
          'vg': re.compile(r"Hughes|Chase|Vanessa|Van Edwards", re.I)}
RA_FIX = [(r"Read Anyone uses (this|them|it) only to", r"Use \1 only to"), (r"Read Anyone keeps only", "Keep only"),
          (r"On Read Anyone,? ", ""), (r"\(see Profile\)", "")]

def rd(p): return open(p, encoding='utf-8').read()

def node_json(js_path, expr, prelude=''):
    code = ("const vm=require('vm');const fs=require('fs');globalThis.window=globalThis;globalThis.self=globalThis;"
            + prelude + f"vm.runInThisContext(fs.readFileSync({json.dumps(js_path)},'utf8'));"
            f"process.stdout.write(JSON.stringify({expr}));")
    return json.loads(subprocess.check_output(['node', '-e', code]))

def sentences(t):
    t = re.sub(r'\s+', ' ', t or '').strip()
    if not t: return []
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z"“(])', t) if s.strip()]

def clean(t, teacher):
    if not t: return ''
    for a, b in RA_FIX: t = re.sub(a, b, t)
    keep = [s for s in sentences(t) if not BLOCK.search(s) and not OTHERS[teacher].search(s) and 'Read Anyone' not in s and 'Read & Connect' not in s]
    return ' '.join(keep)

def ok(t, teacher):
    return bool(t) and not BLOCK.search(t) and not OTHERS[teacher].search(t) and 'Read Anyone' not in t

def pages(s):
    out = []
    for a, b in re.findall(r'(\d+)(?:\s*[–-]\s*(\d+))?', s or ''):
        a = int(a); b = int(b) if b else a
        if b < a: b = a
        out.extend([a, b])
    return out

def bad_page(p): return any(a <= p <= b for a, b in EXCL_PAGES)

def strip_md(s): return re.sub(r'\*\*|\*', '', s).strip()

def first_sents(t, n=2, limit=230):
    ss = sentences(t); out = ''
    for s in ss[:n]:
        if out and len(out) + len(s) > limit: break
        out = (out + ' ' + s).strip()
    return out

SPOT = {'openers': 'Spot it in the first minute, or the moment a chat starts running dry.',
        'deeper': 'Spot it when their answers get longer and warmer: they are ready for a bit more.',
        'listening': 'Spot it when you catch yourself planning your reply instead of hearing theirs.',
        'warmth': 'Spot it when you genuinely feel it but haven\'t said it out loud yet.',
        'groups': 'Spot it when someone is hovering on the edge of the circle.',
        'presence': 'Spot it when your shoulders rise, your pace speeds up, or you start over-explaining.',
        'voice': 'Spot it when you hear yourself rush, trail off, or go flat.',
        'body': 'Spot it when what they say and what their body shows don\'t quite match. Ask, don\'t assume.',
        'stories': 'Spot it when eyes start drifting while you\'re talking.',
        'tough': 'Spot it when voices rise, or someone suddenly goes quiet.',
        'ideas': 'Spot it when someone\'s behaviour puzzles you. There is usually a reason.',
        'brain': 'Spot it when a reaction seems bigger than the moment, in them or in you.',
        'practice': 'Spot it when you\'ve read about something but haven\'t tried it with a real person yet.',
        'teachers': 'Treat it as a coach\'s view: test it in real life and keep what works.',
        'needs': 'Listen first. A need is a hunch to test, never a label.'}
NEG = re.compile(r"\b(don'?t|never|avoid|only when|only if|only with|instead of|backfire|careful|skip|not a|rather than|no one|nobody|stop)\b", re.I)
def find_watch(*texts):
    for t in texts:
        for s in sentences(t):
            if NEG.search(s) and 25 < len(s) < 200: return s
    return ''

def steps_from(move, title):
    m = re.search(r'\(([^)]*(?:·|→)[^)]*)\)', title)
    src = m.group(1) if m else move
    for sep in ['→', ' · ', '; ']:
        parts = [p.strip(' .') for p in src.split(sep) if p.strip(' .')]
        if len(parts) >= 3 and all(len(p) < 90 for p in parts): return parts
    return []

def parse_inventory(RA):
    rows = []
    for l in rd(os.path.join(RA, 'research/techniques-inventory.md')).split('\n'):
        m = re.match(r'\| ([VGH]\d+) \| (.*)', l)
        if not m: continue
        cells = [c.strip() for c in l.strip().strip('|').split('|')]
        code = cells[0]; c = cells[1:]
        if len(c) == 4: c = [c[0], c[1], c[2], '', c[3]]   # Hughes rows have no evidence column in 3b/3c
        rows.append({'code': code, 'title': c[0], 'what': c[1], 'src': c[2], 'ev': c[3], 'status': c[4] if len(c) > 4 else ''})
    return rows

def parse_notes(RA):
    out = {}
    for f in ['vve', 'vg', 'ch', 'all']:
        for blk in re.split(r'\n(?=## )', rd(os.path.join(RA, f'research/ask-kb/{f}.txt'))):
            if not blk.startswith('## '): continue
            ls = blk.strip().split('\n'); h = [x.strip() for x in ls[0][3:].split('|')]
            n = {'id': h[0], 'who': h[1], 'cat': h[2], 'title': h[3]}
            for l in ls[1:]:
                mm = re.match(r'^([a-z]+): (.*)', l)
                if mm: n[mm.group(1)] = mm.group(2)
            out[n['id']] = n
    return out

ABBR = [(r'\bBOM\b', 'The Behavior Ops Manual'), (r'\bCAP\b', 'Captivate'), (r'\bCUES\b', 'Cues'), (r'\bCONV\b', 'Conversation'),
        (r'\bBWF\b', 'Before We Forget How to Connect'), (r'\bDOAC\b', 'The Diary of a CEO'), (r'\*', '')]
def norm_srcs(lst):
    out, seen = [], set()
    for s in lst:
        for part in re.split(r';\s*', s):
            for a, b in ABBR: part = re.sub(a, b, part)
            part = re.sub(r'https?://\S+', '', part).strip(' ·,')
            if 'Behavior Ops Manual' in part and re.search(r'\d', part):
                head, _, refs = part.partition('Manual'); toks = [t.strip() for t in re.sub(r'^\s*pp?\.\s*', '', refs).split(',') if t.strip()]
                toks = [t for t in toks if not any(587 <= q <= 796 for q in pages(t))]   # never cite sections 07-09
                if not toks: continue
                part = head + 'Manual ' + ('pp. ' if len(toks) > 1 or re.search(r'[–-]', toks[0]) else 'p. ') + ', '.join(toks)
            key = re.sub(r'\W', '', part.lower())
            if part and key not in seen and not any(key in k for k in seen):
                seen = {k for k in seen if k not in key}; seen.add(key)
                out = [o for o in out if re.sub(r'\W', '', o.lower()) not in key]; out.append(part)
    return out

def kb_src_labels(e):
    out = []
    for s in e.get('src', []):
        if s.get('p'):
            ps = [p for p in pages(s['p']) if not bad_page(p)]
            if ps: out.append('The Behavior Ops Manual p. ' + s['p'])
        elif s.get('l'):
            lab = s['l']
            if ok(lab, 'ch'): out.append(lab + (' @' + s['ts'] if s.get('ts') else ''))
    return out

def build(BO, RA, OUT):
    C = json.load(open(os.path.join(SRC, 'curation.json'), encoding='utf-8'))
    v1 = json.load(open(os.path.join(SRC, 'v1-needs.json'), encoding='utf-8'))['needs']
    inv = parse_inventory(RA); notes = parse_notes(RA)
    phrases = json.load(open(os.path.join(RA, 'phrases.json'), encoding='utf-8'))
    kb = {e['i']: e for e in node_json(os.path.join(BO, 'ask/kb.js'), 'ASK_KB.entries')}
    bo = node_json(os.path.join(BO, 'data.js'), '{needs:BO.needs,goals:BO.goals}')
    hub = rd(os.path.join(OVER, 'hub.js'))
    def obj(name):
        i = hub.index('const ' + name + ' ='); j = hub.index('=', i) + 1
        while hub[j] == ' ': j += 1
        op, cl = hub[j], {'[': ']', '{': '}'}[hub[j]]; d = 0
        for k in range(j, len(hub)):
            d += (hub[k] == op) - (hub[k] == cl)
            if d == 0: break
        return json.loads(subprocess.check_output(['node', '-e', 'process.stdout.write(JSON.stringify(' + hub[j:k + 1] + '))']))
    SAY_NEEDS = obj('SAY_NEEDS'); SAY_DEEP = obj('SAY_NEEDS_DEEP')
    TOPICS = {t[0]: t for t in C['topics']}
    cards = {}; order = []; dropped = []

    def teacher_of_src(s):
        if re.match(r'(CONV|CAP|CUES|V2[46]|VVE|VTK|VX|VVC|VIG)', s): return 'vve'
        if re.match(r'(BWF|VG|GTK|GIG)', s): return 'vg'
        if re.match(r'(BOM|C2[46]|NCI|CS)', s): return 'ch'
        return '?'
    lines_by_code = {}
    for x in phrases:
        code = C['tech_map'].get(x.get('technique') or '')
        if not code or 'supersededBy' in x: continue
        T = PREFIX[code[0]]
        if {teacher_of_src(s) for s in x['sources']} != {T}: continue          # teacher-pure lines only
        how = x.get('delivery', '') if not OTHERS[T].search(x.get('deliveryBy', '') + x.get('delivery', '')) else ''
        lines_by_code.setdefault(code, []).append({'say': x['text'], 'how': how, 'why': clean(x.get('why', ''), T)})

    def add(c):
        T = c['t']
        for k, v in C['overrides'].get(c['id'], {}).items(): c[k] = v
        c['d']['src'] = norm_srcs(c['d'].get('src', []))
        for k in ('ti', 'mv', 'tr', 'w'):
            if c.get(k) and not ok(c[k], T): c[k] = clean(c[k], T)
        if not c.get('mv') or not c.get('ti'): dropped.append(c['id']); return
        cards[c['id']] = c; order.append(c['id'])

    def finish(c, how, extra_watch=()):
        T = c['t']
        c['d']['how'] = [p for p in (clean(h, T) for h in how) if p]
        if not c.get('w'):
            c['w'] = find_watch(*extra_watch, *c['d']['how'])
            if not c['w']:
                c['w'] = SPOT.get(c['tp'], SPOT['ideas'])
        c['wl'] = 'Spot it' if re.match(r'(notice|look|listen|watch|spot)', c['w'], re.I) else 'Watch out'
        if not c.get('tr'):
            c['tr'] = (c['d'].get('lines') or [{}])[0].get('say') or (c['d']['steps'][0] if c['d'].get('steps') else '') or c['mv']

    # ---------- 1. Inventory techniques ----------
    used_notes = set()
    for r in inv:
        code = r['code']; L = code[0]; n = int(code[1:])
        if code == 'V91' or (L == 'H' and n > 43) or 'EXCLUDED' in r['status']: continue
        T = PREFIX[L]; o = C['overrides'].get(code, {})
        nid = C['note_map'].get(code)
        if not nid:
            cands = [k for k, v in notes.items() if v['who'].split(',')[0] == T and strip_md(v['title']).lower().replace('"', '') == strip_md(r['title']).lower().replace('"', '')]
            nid = cands[0] if cands else None
        if not nid:
            import difflib
            pool = [v for v in notes.values() if v['who'].split(',')[0] == T and v['cat'] != 'leftout']
            cl = lambda s: re.sub(r"[*\"“”'‘’!?…:()]", '', s).lower()
            nid = max(pool, key=lambda v: difflib.SequenceMatcher(None, cl(r['title']), cl(v['title'])).ratio())['id']
        note = notes.get(nid, {}); used_notes.add(nid)
        extra = [notes[x] for x in C['note_extra_merge'].get(code, []) if x in notes]; used_notes.update(x['id'] for x in extra)
        title = strip_md(r['title'])
        topic = C['code_topic'].get(code) or C['note_cat_topic'].get(note.get('cat', ''), 'ideas')
        move = o.get('move') or r['what']
        how = [note.get('s', ''), note.get('d', '')] + [x.get('s', '') + ' ' + x.get('d', '') for x in extra]
        for kid in C['kb_merge'].get(code, []):
            e = kb.get(kid)
            if e: how.append(e['s'] + ' ' + e['d'])
        srcs = [s.strip() for s in ([r['src']] + note.get('src', '').split('||')) if s.strip()]
        srcs = [re.sub(r'https?://\S+', '', s).strip(' ·') for s in srcs]
        lines = lines_by_code.get(code, [])[:6]
        steps = steps_from(move, r['title'])
        if code in C.get('playbook_merge', {}):
            g = next(g for g in bo['goals'] if g['id'] == C['playbook_merge'][code])
            steps = [s for s in g['steps'] if ok(s, T)]
        c = {'id': code.lower(), 't': T, 'tp': topic, 'ti': o.get('title') or title, 'mv': move,
             'tr': o.get('try') or (note.get('u') if note.get('u') and ok(note.get('u'), T) else ''), 'w': o.get('watch', ''),
             'ev': r['ev'], 'code': code,
             'd': {'steps': steps, 'lines': lines, 'src': [s for s in srcs if ok(s, T)],
                   'rel': [x for x in note.get('r', '').replace(' ', '').split(',') if x], 'status': r['status']}}
        cav = [r['what']] + ([r['status']] if 'never' in r['status'].lower() or 'only' in r['status'].lower() else [])
        finish(c, how, extra_watch=cav if not o.get('watch') else ())
        add(c)

    # ---------- 2. Stand-alone notes ----------
    for nid, topic in C['extra_notes'].items():
        note = notes[nid]; T = note['who'].split(',')[0]
        if T not in TEACHERS: continue
        how = [note.get('s', ''), note.get('d', '')]
        for kid in C['kb_merge'].get(nid, []):
            if kid in kb: how.append(kb[kid]['s'] + ' ' + kb[kid]['d'])
        c = {'id': 'n-' + nid, 't': T, 'tp': topic, 'ti': note['title'], 'mv': first_sents(clean(note.get('s', ''), T)),
             'tr': note.get('u', '') if ok(note.get('u', ''), T) else '', 'w': '', 'ev': '',
             'd': {'steps': [], 'lines': [], 'src': [re.sub(r'https?://\S+', '', s).strip() for s in note.get('src', '').split('||') if s.strip() and ok(s, T)],
                   'rel': [x for x in note.get('r', '').replace(' ', '').split(',') if x]}}
        finish(c, how); add(c)

    # ---------- 3. The six needs (Hughes) ----------
    K2LEAN = {'sig': 'significance', 'app': 'approval', 'acc': 'acceptance', 'int': 'intelligence', 'pit': 'pity', 'str': 'power'}
    BO2K = {'sig': 'sig', 'app': 'app', 'acc': 'acc', 'int': 'int', 'pity': 'pit', 'pit': 'pit', 'str': 'str'}
    v1by = {n['id']: n for n in v1}
    for bk, nd in bo['needs'].items():
        k = BO2K.get(bk, bk); lean = K2LEAN[k]
        short = next(s for s in SAY_NEEDS if s['k'] == k); deep = SAY_DEEP[k]; old = v1by[lean]
        title = f"{nd['emoji']} {short['name']}"
        c = {'id': 'need-' + k, 't': 'ch', 'tp': 'needs', 'ti': title, 'mv': short['is'] + ' ' + short['how'],
             'tr': deep['lines'][0], 'w': 'Avoid: ' + deep['avoid'][0] + '. It hits their quiet fear — ' + deep['fear'][0].lower() + deep['fear'][1:],
             'ev': "Coach's view", 'need': lean,
             'd': {'q': nd['q'], 'signs': deep['signs'], 'steps': [], 'lines': [{'say': s, 'how': '', 'why': ''} for s in (deep['lines'] + [x for x in nd['say'] if x not in deep['lines']])],
                   'traps': deep['avoid'], 'src': ['The Behavior Ops Manual p. ' + nd['p'], 'Read the Room six needs guide'],
                   'rel': ['h15'] + ['need-' + x for x in K2LEAN if x != k][:2],
                   'go': [{'tab': 'profile', 'label': 'Open the six needs guide'}, {'tab': 'say', 'need': lean, 'label': 'Lines for this need in Say'}]},
             'ver': [{'label': 'Earlier', 'when': 'Read Anyone v1 · 10 Nov 2026', 'text': f"{old['name']}: {old['lean']}. Listen for: {old['listen']} Do: {old['do']}"},
                     {'label': 'Updated', 'when': 'Read & Connect field guide', 'text': f"{nd['name']} — the quiet question: \"{nd['q']}\" {nd['give']}"},
                     {'label': 'Latest', 'when': 'Read the Room · 18 Nov 2026', 'text': short['is'] + ' ' + short['how']}],
             'vnote': 'Same need, three wordings. The latest keeps the listening-prompt framing and drops anything that could steer.'}
        c['d']['how'] = [p for p in (clean(x, 'ch') for x in [f"The quiet question behind it: \"{nd['q']}\"", deep['meet'], 'What hurts most: ' + deep['fear']]) if p]
        c['wl'] = 'Watch out'
        add(c)

    # ---------- 4. Talk playbooks (Hughes) ----------
    for gid, meta in C['playbooks'].items():
        g = next(g for g in bo['goals'] if g['id'] == gid)
        st = [s for s in g['steps'] if ok(s, 'ch')]
        c = {'id': 'play-' + gid, 't': 'ch', 'tp': meta['topic'], 'ti': meta['title'], 'mv': st[0] + ' ' + st[1] if len(st) > 1 else st[0],
             'tr': meta['try'], 'w': '', 'ev': "Coach's view",
             'd': {'steps': st, 'lines': [], 'src': ['The Behavior Ops Manual pp. ' + g['p'] + ' (Talk tab playbook)'], 'rel': [], 'go': [{'tab': 'talk', 'label': 'Open the Talk playbooks'}]}}
        finish(c, [' '.join(st)]); add(c)

    # ---------- 5. Behavior Ops Ask entries (Hughes, allow-list) ----------
    for kid, topic in C['kb_keep'].items():
        e = kb.get(kid)
        if not e: dropped.append('k-' + kid); continue
        ps = [p for s in e['src'] if s.get('p') for p in pages(s['p'])]
        if any(bad_page(p) for p in ps): dropped.append('k-' + kid + ' (page)'); continue
        if BLOCK.search(e['s'][:200]) : dropped.append('k-' + kid + ' (summary)'); continue
        s = clean(e['s'], 'ch')
        c = {'id': 'k-' + kid, 't': 'ch', 'tp': topic, 'ti': C['kb_retitle'].get(kid, e['t']), 'mv': first_sents(s),
             'tr': e['u'] if ok(e['u'], 'ch') else '', 'w': '', 'ev': "Coach's view",
             'd': {'steps': [], 'lines': [], 'ex': [clean(x, 'ch') for x in e.get('e', []) if clean(x, 'ch')], 'src': kb_src_labels(e), 'rel': e.get('r', [])}}
        finish(c, [e['s'], e['d']]); add(c)

    # ---------- 6. Versions ----------
    def step_text(st):
        if st.get('text'): return st['text']
        if st.get('card'):
            cid = st['card'].lower() if re.match(r'^[VGH]\d+$', st['card']) else st['card']
            return cards[cid]['mv']
        e = kb[st['kb']]; return first_sents(clean(e['s'], 'ch'), 2)
    for v in C['versions']:
        chain = [{'label': s['label'], 'when': s['when'], 'text': step_text(s),
                  'card': (s['card'].lower() if s.get('card') and re.match(r'^[VGH]\d+$', s['card']) else s.get('card'))} for s in v['steps']]
        att = v.get('attach') or [s['card'] for s in v['steps'] if s.get('card')]
        for a in att:
            cid = a.lower() if re.match(r'^[VGH]\d+$', a) else a
            if cid not in cards: raise SystemExit('version target missing: ' + cid)
            if cards[cid]['t'] != v['teacher']: raise SystemExit('version teacher mismatch: ' + cid)
            cards[cid].setdefault('vers', []).append({'title': v['title'], 'note': v['note'], 'chain': chain})
    for c in cards.values():
        if c.get('ver'):  # need cards: built-in chain
            c['vers'] = [{'title': 'How this need has been worded', 'note': c.pop('vnote'), 'chain': c.pop('ver')}]
        if c.get('vers'):
            yrs = [int(y) for ch in c['vers'] for s in ch['chain'] for y in re.findall(r'(20\d\d)', s['when'])]
            c['vb'] = f"{min(yrs)} → {max(yrs)}" if yrs and min(yrs) != max(yrs) else f"{max(len(ch['chain']) for ch in c['vers'])} versions"

    # ---------- 7. Related links, cross-links, quick checks ----------
    note2card = {}
    for cid, c in cards.items():
        if cid.startswith('n-'): note2card[cid[2:]] = cid
    for r in inv:
        nid = C['note_map'].get(r['code'])
        if nid: note2card.setdefault(nid, r['code'].lower())
    for cid, c in cards.items():
        if c.get('code'):
            for k, v in notes.items():
                pass
    # map note ids to card ids by the note each card was built from
    for r in inv:
        code = r['code'].lower()
        if code in cards:
            for k, v in notes.items():
                if strip_md(v['title']).lower() == cards[code]['ti'].lower(): note2card.setdefault(k, code)
    for cid, c in cards.items():
        rel = []
        for x in c['d'].get('rel', []):
            y = note2card.get(x) or ('k-' + x if 'k-' + x in cards else None) or (x if x in cards else None)
            if y and y != cid and y in cards and cards[y]['t'] == c['t'] and y not in rel: rel.append(y)
        c['d']['rel'] = rel[:5]
        go = c['d'].setdefault('go', [])
        if c['tp'] == 'body' and not any(g['tab'] == 'cues' for g in go): go.append({'tab': 'cues', 'label': 'See real body cues in Body'})
        if c['tp'] in ('openers', 'warmth', 'deeper', 'listening') and c['d'].get('lines') and not go: go.append({'tab': 'say', 'label': 'Get more lines in Say'})
        if cid == 'h15': go.append({'tab': 'profile', 'label': 'Open the six needs guide'})
        if c['t'] == 'ch' and c['tp'] == 'teachers': go.append({'tab': 'watch', 'label': 'Watch Hughes read real people'})
    for i, cid in enumerate(order):
        c = cards[cid]
        q = re.search(r'[“"]([^”"]{12,90}[?!.…]?)[”"]', c['ti'] + ' ' + c['mv'])
        steps = c['d'].get('steps') or []
        if q and len(q.group(1).split()) >= 4:
            words = q.group(1).split(); cut = max(2, len(words) // 3)
            c['q'] = 'Finish the line: “' + ' '.join(words[:-cut]) + ' …”'; c['a'] = '“' + q.group(1) + '”'
        elif len(steps) >= 3 and i % 2 == 0:
            c['q'] = f'Name the {len(steps)} steps of “{c["ti"]}”.'; c['a'] = ' → '.join(s.split(':')[0][:60] for s in steps)
        elif c['tp'] == 'needs' and c['d'].get('q'):
            c['q'] = f'What quiet question is someone with this need asking?'; c['a'] = '“' + c['d']['q'] + '”'
        elif i % 3 == 1 and c['w'] not in SPOT.values():
            c['q'] = f'What’s the trap with “{c["ti"]}”?'; c['a'] = c['w']
        elif i % 3 == 2 and c.get('tr') and c['tr'] != c['mv']:
            c['q'] = f'You’ve got 5 seconds: how do you use “{c["ti"]}”?'; c['a'] = c['tr']
        else:
            c['q'] = f'In one breath: what’s the move in “{c["ti"]}”?'; c['a'] = c['mv']

    out = [cards[i] for i in order]
    for c in out:
        c['d'] = {k: v for k, v in c['d'].items() if v}
    stats = {'total': len(out), 'by_teacher': {}, 'by_topic': {}, 'with_versions': {}, 'dropped': dropped}
    for c in out:
        stats['by_teacher'][c['t']] = stats['by_teacher'].get(c['t'], 0) + 1
        stats['by_topic'][c['tp']] = stats['by_topic'].get(c['tp'], 0) + 1
        if c.get('vers'): stats['with_versions'][c['t']] = stats['with_versions'].get(c['t'], 0) + 1
    data = {'teachers': TEACHERS, 'topics': [{'id': t[0], 'name': t[1], 'emoji': t[2]} for t in C['topics'] if t[0] in stats['by_topic']],
            'cards': out}
    for c in data['cards']:   # don't repeat the same 'why' under every line
        prev = None
        for l in c['d'].get('lines', []):
            if l.get('why') and l['why'] == prev: l['why'] = ''
            else: prev = l.get('why') or prev
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    for a, b in C.get('text_fix', {}).items(): blob = blob.replace(json.dumps(a, ensure_ascii=False)[1:-1], json.dumps(b, ensure_ascii=False)[1:-1])
    os.makedirs(os.path.join(OUT, 'learn'), exist_ok=True)
    open(os.path.join(OUT, 'learn/cards.js'), 'w', encoding='utf-8').write(
        '/* Read the Room · Learn cards. Generated by tools/learn_build.py from paraphrased study notes. Do not edit by hand. */\n'
        'window.LEARN_DATA=' + blob + ';\n')
    return stats

if __name__ == '__main__':
    BO, RA, OUT = [os.path.abspath(p) for p in sys.argv[1:4]]
    print(json.dumps(build(BO, RA, OUT), indent=1))
