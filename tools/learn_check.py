"""Learn tab check for Read the Room. Usage: venv/bin/python learn_check.py <base_url> [--shots]"""
import sys, json, re
from playwright.sync_api import sync_playwright
BASE = sys.argv[1].rstrip('/') + '/'
SHOTS = '--shots' in sys.argv
R = {'errors': []}
def err(m): R['errors'].append(m)

def overflow(p):
    return p.evaluate("()=>{const d=document.documentElement;return Math.max(d.scrollWidth,document.body.scrollWidth)-innerWidth}")

def run(pw, w, h, tag):
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=(w < 500), is_mobile=(w < 500), device_scale_factor=2 if w < 500 else 1)
    p = ctx.new_page(); cons = []
    p.on('console', lambda m: cons.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: cons.append(str(e)))
    out = R[tag] = {}
    p.goto(BASE, wait_until='networkidle')
    p.evaluate("localStorage.removeItem('rtr.learn.v1')")
    # nav: Learn button exists in tab bar, visible, bar fits
    btn = p.locator('.tabs button[data-tab=learn]')
    out['nav_button_visible'] = btn.is_visible()
    out['tabbar_buttons'] = p.locator('.tabs button').count()
    out['tabbar_overflow'] = p.evaluate("()=>{const t=document.querySelector('.tabs');return t.scrollWidth-t.clientWidth}")
    btn.click(); p.wait_for_selector('#lxCard', timeout=15000)
    out['hash'] = p.evaluate('location.hash')
    out['tab_active'] = p.evaluate("document.querySelector('#tab-learn').classList.contains('active')")
    out['total'] = p.evaluate("window.LEARN_DATA.cards.length")
    if out['total'] < 250: err(f'{tag}: too few cards')
    # teacher filters
    tf = {}
    for t in ['ch', 'vve', 'vg', 'all']:
        p.click(f'[data-teacher={t}]')
        txt = p.locator('.lx-deckbar .lx-count').inner_text()
        tf[t] = txt
        if t != 'all':
            cls = p.get_attribute('#lxCard', 'class')
            if f't-{t}' not in cls: err(f'{tag}: teacher filter {t} shows {cls}')
            # all cards in pool are that teacher
            n = int(re.search(r'of (\d+)', txt).group(1))
            exp = p.evaluate(f"LEARN_DATA.cards.filter(c=>c.t=='{t}').length")
            if n != exp: err(f'{tag}: filter {t} count {n} != {exp}')
    out['teacher_filters'] = tf
    # Next / Prev / keys
    first = p.get_attribute('#lxCard', 'data-id')
    p.click('[data-act=next]'); p.wait_for_timeout(150); second = p.get_attribute('#lxCard', 'data-id')
    p.click('[data-act=prev]'); p.wait_for_timeout(150); back = p.get_attribute('#lxCard', 'data-id')
    p.keyboard.press('ArrowRight'); p.wait_for_timeout(150); kr = p.get_attribute('#lxCard', 'data-id')
    out['next_prev_keys'] = [first, second, back, kr]
    if not (first != second and back == first and kr == second): err(f'{tag}: next/prev/arrow failed')
    # swipe (mobile)
    if w < 500:
        bb = p.locator('#lxCard .lx-title').bounding_box()
        before = p.get_attribute('#lxCard', 'data-id')
        p.evaluate("""([x,y])=>{const el=document.querySelector('#lxCard');const T=(type,cx)=>{const t=new Touch({identifier:1,target:el,clientX:cx,clientY:y});el.dispatchEvent(new TouchEvent(type,{touches:type==='touchend'?[]:[t],changedTouches:[t],bubbles:true}))};T('touchstart',x+120);T('touchmove',x);T('touchmove',x-100);T('touchend',x-100)}""", [bb['x'] + bb['width'] / 2, bb['y'] + 5])
        p.wait_for_timeout(200); out['swipe'] = [before, p.get_attribute('#lxCard', 'data-id')]
        if out['swipe'][0] == out['swipe'][1]: err(f'{tag}: swipe did not advance')
    # shuffle
    ids = set()
    for _ in range(3):
        p.click('[data-act=shuffle]'); p.wait_for_timeout(120); ids.add(p.get_attribute('#lxCard', 'data-id'))
    out['shuffle_distinct'] = len(ids)
    if len(ids) < 2: err(f'{tag}: shuffle not changing cards')
    # quick check
    hidden0 = p.locator('#lxCard .lx-check .a').is_hidden()
    p.click('#lxCard [data-act=reveal]'); vis = p.locator('#lxCard .lx-check .a').is_visible()
    out['quick_check'] = {'hidden_before': hidden0, 'visible_after': vis, 'answer': p.locator('#lxCard .lx-check .a').inner_text()[:80]}
    if not (hidden0 and vis): err(f'{tag}: quick check reveal')
    # got it + save, persist across reload
    cid = p.get_attribute('#lxCard', 'data-id')
    p.click('#lxCard [data-act=learn]'); p.click('#lxCard [data-act=save]')
    p.reload(wait_until='networkidle'); p.wait_for_selector('#lxCard', timeout=15000)
    st = p.evaluate("JSON.parse(localStorage.getItem('rtr.learn.v1'))")
    out['persist'] = {'card': cid, 'learned': cid in st['learned'], 'saved': cid in st['saved'], 'header': p.locator('.lx-progtxt').inner_text()}
    if not (cid in st['learned'] and cid in st['saved']): err(f'{tag}: got it/save did not persist')
    p.click('[data-flag=saved]'); sid = p.get_attribute('#lxCard', 'data-id')
    out['saved_filter_shows'] = sid
    if sid != cid: err(f'{tag}: saved filter wrong')
    lbl = p.locator('#lxCard [data-act=learn]').inner_text()
    if 'Learned' not in lbl: err(f'{tag}: learned state not shown after reload')
    p.click('[data-flag=saved]')
    p.click('[data-flag=versions]'); out['has_versions_count'] = p.locator('.lx-deckbar .lx-count').inner_text(); p.click('[data-flag=versions]')
    # sprint
    p.click('[data-act=sprint]'); out['sprint'] = p.locator('.lx-deckbar .lx-count').inner_text()
    if 'of 5' not in out['sprint']: err(f'{tag}: sprint')
    p.click('[data-act=endsprint]')
    p.evaluate('scrollTo(0,0)')
    out['deck_overflow'] = overflow(p)
    if SHOTS and w < 500: p.screenshot(path='/workspace/rc-hub/shots/learn-mobile-deck.png')
    # Deep sheet from deck
    p.click('#lxCard [data-act=deep]'); p.wait_for_selector('#lxSheet.open .lx-sheet', timeout=5000); p.wait_for_timeout(400)
    sh = {'title': p.locator('#lxSheetTitle').inner_text(), 'sections': p.locator('#lxSheet .lx-sheet-body h4').all_inner_texts()}
    sh['locked'] = p.evaluate("document.documentElement.classList.contains('lx-lock')")
    sh['overflow'] = overflow(p)
    out['deep'] = sh
    p.keyboard.press('Escape'); p.wait_for_timeout(400)
    sh['closed_by_esc'] = not p.evaluate("!!document.querySelector('#lxSheet.open')")
    # open a card with versions for the screenshot
    vid = p.evaluate("LEARN_DATA.cards.find(c=>c.id=='need-heard'||c.vers&&c.t=='vve').id")
    p.evaluate(f"LEARN.open('{vid}')"); p.wait_for_selector('#lxSheet.open', timeout=5000); p.wait_for_timeout(450)
    sh['versions_block'] = p.locator('#lxSheet .lx-ver').count()
    if SHOTS and w < 500: p.screenshot(path='/workspace/rc-hub/shots/learn-mobile-deep.png')
    p.click('#lxSheet [data-act=close]'); p.wait_for_timeout(400)
    sh['closed_by_x'] = not p.evaluate("!!document.querySelector('#lxSheet.open')") and not p.evaluate("document.documentElement.classList.contains('lx-lock')")
    if not (sh['closed_by_esc'] and sh['closed_by_x'] and sh['locked'] and sh['versions_block']): err(f'{tag}: deep sheet {sh}')
    # Browse
    p.click('[data-mode=browse]'); p.wait_for_selector('#lxSearch')
    b0 = p.locator('#lxBrowseCount').inner_text()
    p.fill('#lxSearch', 'name'); p.wait_for_timeout(200)
    b1 = p.locator('#lxBrowseCount').inner_text()
    p.fill('#lxSearch', 'zzqqxx'); p.wait_for_timeout(200); b2 = p.locator('#lxBrowseCount').inner_text()
    p.fill('#lxSearch', ''); p.wait_for_timeout(150)
    p.click('[data-teacher=vg]'); b3 = p.locator('#lxBrowseCount').inner_text()
    minis = set(p.evaluate("[...document.querySelectorAll('.lx-mini')].map(m=>[...m.classList].find(c=>c.startsWith('t-')))"))
    p.click('[data-teacher=all]')
    p.locator('[data-topic]').nth(1).click(); b4 = p.locator('#lxBrowseCount').inner_text()
    p.click('[data-topic=all]')
    out['browse'] = {'all': b0, 'search_name': b1, 'search_none': b2, 'vinh_only': b3, 'vinh_mini_classes': sorted(minis), 'first_topic': b4,
                     'groups': p.locator('.lx-group h3, .lx-group-h').count()}
    if not (int(b1.split()[0]) > 0 and b2.startswith('0') and minis == {'t-vg'}): err(f'{tag}: browse/search')
    p.locator('.lx-mini').first.click(); p.wait_for_selector('#lxSheet.open'); p.keyboard.press('Escape'); p.wait_for_timeout(350)
    p.evaluate('scrollTo(0,0)')
    out['browse_overflow'] = overflow(p)
    if SHOTS and w < 500: p.screenshot(path='/workspace/rc-hub/shots/learn-mobile-browse.png')
    p.click('[data-mode=deck]')
    if SHOTS and w >= 1000: p.evaluate('scrollTo(0,0)'); p.screenshot(path='/workspace/rc-hub/shots/learn-desktop.png')
    for k in ('deck_overflow', 'browse_overflow'):
        if out[k] > 0: err(f'{tag}: horizontal overflow {k}={out[k]}')
    if out['tabbar_overflow'] > 0: err(f'{tag}: tab bar scrolls by {out["tabbar_overflow"]}px')
    # other tabs still work
    tabs = p.evaluate("[...document.querySelectorAll('.tabs button')].map(b=>b.dataset.tab)")
    ok = {}
    for t in tabs:
        p.click(f'.tabs button[data-tab={t}]'); p.wait_for_timeout(150)
        ok[t] = p.evaluate(f"document.querySelector('#tab-{t}').classList.contains('active')")
    out['all_tabs_switch'] = ok
    if not all(ok.values()): err(f'{tag}: tab switching {ok}')
    # offline reload of Learn
    p.goto(BASE + '#learn', wait_until='networkidle'); p.reload(wait_until='networkidle'); p.wait_for_selector('#lxCard')
    p.evaluate("navigator.serviceWorker.ready.then(()=>1)"); p.wait_for_timeout(1500)
    ctx.set_offline(True)
    p.reload(wait_until='load'); p.wait_for_selector('#lxCard', timeout=15000)
    out['offline'] = {'card': p.get_attribute('#lxCard', 'data-id'), 'cards': p.evaluate('LEARN_DATA.cards.length'),
                      'css_applied': p.evaluate("getComputedStyle(document.querySelector('#lxCard')).borderRadius")}
    ctx.set_offline(False)
    out['console_errors'] = cons
    if cons: err(f'{tag}: console errors {cons[:3]}')
    b.close()

with sync_playwright() as pw:
    run(pw, 390, 844, 'mobile_390')
    run(pw, 1280, 860, 'desktop_1280')
print(json.dumps(R, indent=1, ensure_ascii=False))
