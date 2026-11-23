#!/usr/bin/env python3
"""Independent audit of the built Learn section. Exits non-zero on any rule break.

Usage: python3 tools/learn_audit.py DOCS_DIR BEHAVIOR_OPS_DIR [BOOK_TEXT ...]
Checks: coverage counts; every card complete and tagged with one teacher; zero excluded material
(sections 07-09, H44-H83, V91, lie-spotting and other manipulative terms); teacher purity; no long quotes;
no 10-word overlap with the private book texts (if given); the two Ask modes untouched and separate;
no PDFs; no chatbox/API keys; no Notion 'Who I'm Becoming'; every Learn file pre-cached in sw.js.
"""
import sys, os, re, json, glob, subprocess, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from learn_build import BLOCK, OTHERS, TEACHERS, pages
DOCS, BO = sys.argv[1], sys.argv[2]; BOOKS = sys.argv[3:]
fail = []; R = {}
def chk(name, cond, detail=''):
    R[name] = 'PASS' if cond else 'FAIL ' + str(detail)[:400]
    if not cond: fail.append(name)

data = json.loads(subprocess.check_output(['node', '-e', "globalThis.window=globalThis;require(process.argv[1]);process.stdout.write(JSON.stringify(window.LEARN_DATA))", os.path.abspath(os.path.join(DOCS, 'learn/cards.js'))]))
cards = data['cards']
def strings(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for v in o.values(): yield from strings(v)
    elif isinstance(o, list):
        for v in o: yield from strings(v)
def card_text(c): return ' \n '.join(s for k, v in c.items() if k not in ('id', 't', 'tp', 'code', 'need') for s in strings(v))

# coverage
by_t, by_tp, ver = {}, {}, {}
for c in cards:
    by_t[c['t']] = by_t.get(c['t'], 0) + 1
    key = c['tp']; by_tp.setdefault(key, {}).setdefault(c['t'], 0); by_tp[key][c['t']] += 1
    if c.get('vers'): ver[c['t']] = ver.get(c['t'], 0) + 1
R['counts'] = {'total': len(cards), 'by_teacher': {TEACHERS[k]: v for k, v in by_t.items()}, 'with_versions': {TEACHERS[k]: v for k, v in ver.items()},
               'by_topic': {t['name']: by_tp.get(t['id'], {}) for t in data['topics']}}
codes = {c.get('code') for c in cards if c.get('code')}
want = {f'V{i}' for i in range(1, 91)} | {f'G{i}' for i in range(1, 45)} | {f'H{i}' for i in range(1, 44)}
chk('every kept technique (V1-V90, G1-G44, H1-H43) has a card', want <= codes, sorted(want - codes))
chk('ids unique', len({c['id'] for c in cards}) == len(cards))
chk('every card complete (teacher, topic, title, move, try, watch, quick check)', all(c.get(k) for c in cards for k in ('t', 'tp', 'ti', 'mv', 'tr', 'w', 'q', 'a')),
    [c['id'] for c in cards if not all(c.get(k) for k in ('t', 'tp', 'ti', 'mv', 'tr', 'w', 'q', 'a'))])
chk('every card tagged with exactly one of the three teachers', all(c['t'] in TEACHERS for c in cards))
ids = {c['id'] for c in cards}
chk('related links resolve and stay within the same teacher', all(r in ids and next(x for x in cards if x['id'] == r)['t'] == c['t'] for c in cards for r in c['d'].get('rel', [])))
chk('version chains stay within one teacher', all(next(x for x in cards if x['id'] == s['card'])['t'] == c['t'] for c in cards for v in c.get('vers', []) for s in v['chain'] if s.get('card')))

# exclusions
hits = [(c['id'], m.group(0)) for c in cards for m in [BLOCK.search(card_text(c))] if m]
chk('zero excluded/manipulative terms in Learn data', not hits, hits)
bad_codes = {c.get('code') for c in cards} & ({f'H{i}' for i in range(44, 84)} | {'V91'})
chk('zero H44-H83 or V91 cards', not bad_codes, bad_codes)
code_mentions = re.findall(r'\b(H(?:4[4-9]|[5-7]\d|8[0-3])|V91)\b', json.dumps(data))
chk('zero H44-H83 / V91 mentions anywhere in Learn data', not code_mentions, code_mentions)
s0709 = []
for c in cards:
    for s in c['d'].get('src', []):
        if 'Behavior Ops Manual' in s and any(587 <= p <= 796 for p in pages(s.split('Manual', 1)[1])): s0709.append((c['id'], s))
chk('zero sources from book sections 07-09 (pp. 587-796)', not s0709, s0709)
chk('zero coercive section words (interrogation, AVERY, KAPTOR, cult, hypnosis)', not re.search(r'interrogat|AVERY|KAPTOR|\bcults?\b|hypno', json.dumps(data), re.I))

# teacher purity
mix = [(c['id'], OTHERS[c['t']].search(card_text(c)).group(0)) for c in cards if OTHERS[c['t']].search(card_text(c))]
chk('teacher purity: no card mentions another teacher (Hughes cards are Hughes-only)', not mix, mix)

# quotes / book text
longq = [(c['id'], q[:60]) for c in cards for q in re.findall(r'[“"]([^”"]+)[”"]', card_text(c)) if len(q.split()) > 20]
chk('zero long quotes (no quoted passage over 20 words)', not longq, longq)
if BOOKS:
    norm = lambda t: re.findall(r"[a-z0-9']+", t.lower())
    N = 10; books = []
    for b in BOOKS:
        w = norm(open(b, encoding='utf-8', errors='ignore').read()); books.append(set(' '.join(w[i:i + N]) for i in range(len(w) - N + 1)))
    runs = []
    for c in cards:
        for s in set(strings(c)):
            w = norm(s); i = 0
            while i <= len(w) - N:
                G = next((G for G in books if ' '.join(w[i:i + N]) in G), None)
                if not G: i += 1; continue
                j = i
                while j + 1 <= len(w) - N and ' '.join(w[j + 1:j + 1 + N]) in G: j += 1
                runs.append((c['id'], j - i + N, ' '.join(w[i:j + N]))); i = j + N
    longest = max([r[1] for r in runs] or [0])
    chk(f'zero book passages: no run of 20+ words shared with the private book texts ({len(BOOKS)} files)', longest < 20, [r for r in runs if r[1] >= 20][:5])
    R['short_shared_phrases'] = {'count': len(runs), 'longest_words': longest, 'note': 'short maxims, power questions and chapter titles (10-16 words); allowed as short quotes',
                                 'examples': sorted({r[2] for r in runs})[:8]}

# Ask modes untouched and separate
same = lambda a, b: hashlib.sha1(open(a, 'rb').read()).hexdigest() == hashlib.sha1(open(b, 'rb').read()).hexdigest()
chk('Hughes Ask KB byte-identical to Behavior Ops source', same(os.path.join(DOCS, 'ask/kb.js'), os.path.join(BO, 'ask/kb.js')))
hk = open(os.path.join(DOCS, 'ask/kb.js'), encoding='utf-8').read(); bk = open(os.path.join(DOCS, 'blend/kb.js'), encoding='utf-8').read()
chk('Ask modes separate: Hughes KB defines only ASK_KB, Blend only ASK_KB_BLEND', 'ASK_KB_BLEND' not in hk and re.search(r'\bASK_KB\b(?!_)', bk) is None)
learn_js = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(DOCS, 'learn/*.js')))
chk('Learn never touches either Ask knowledge base', not re.search(r'ASK_KB|ASK_ENGINE|ASK_UI', learn_js))

# files and rules
pdfs = [p for p in glob.glob(os.path.join(DOCS, '..', '**', '*.pdf'), recursive=True) if '/.git/' not in p]
chk('no PDFs in the repo', not pdfs, pdfs)
chk('no book text files in the repo', not [p for p in glob.glob(os.path.join(DOCS, '..', '**', '*.txt'), recursive=True) if 'book' in p.lower() and '/.git/' not in p])
chk('no AI chatbox or API keys in Learn', not re.search(r'openai|anthropic|api[_-]?key|chat/completions|x\.ai/v1', learn_js, re.I))
site = ''.join(open(f, encoding='utf-8', errors='ignore').read() for f in glob.glob(os.path.join(DOCS, '**', '*.*'), recursive=True) if f.endswith(('.js', '.html', '.json', '.css')))
chk("no Notion 'Who I'm Becoming' content", "who i'm becoming" not in site.lower() and 'who i’m becoming' not in site.lower())
sw = open(os.path.join(DOCS, 'sw.js'), encoding='utf-8').read()
F = json.loads(re.search(r'const F=(\[.*?\]);', sw).group(1))
lf = sorted(os.path.relpath(p, DOCS) for p in glob.glob(os.path.join(DOCS, 'learn', '*')))
chk('every Learn file is pre-cached by the service worker', lf and all(f in F for f in lf), [f for f in lf if f not in F])
R['sw_cache'] = re.search(r"const C='([^']+)'", sw).group(1); R['learn_files'] = lf
print(json.dumps(R, indent=1, ensure_ascii=False))
print('AUDIT', 'FAILED: ' + ', '.join(fail) if fail else 'PASSED')
sys.exit(1 if fail else 0)
