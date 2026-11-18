# Read the Room

**Live:** https://mhccog.github.io/read-the-room/

One phone-first app that combines two earlier sites (both still live and unchanged):

- **Read Anyone** (https://mhccog.github.io/read-anyone/): the line generator and the blended Ask (Vanessa Van Edwards, Chase Hughes, Vinh Giang).
- **Read & Connect** (https://mhccog.github.io/behavior-ops/): the Chase Hughes field guide (Profile, Body with 3D figures and real photos, Talk, Hughes-only Ask, Watch, People).

## Tabs
| Tab | What it does | Comes from |
|---|---|---|
| **Say** (home) | Pick Lean, Vibe, Moment, Teacher → a "Say first" word plus a line with technique, why and how to say it. Copy, Another, Saved. | Read Anyone |
| **Profile** | The six-minute read: tap what you notice, and a live card builds their need, decision style, values and senses. **✦ More lines for them** opens Say with a matching lean and vibe. | Read & Connect |
| **Body** | 90 cues, 69 with a 3D figure, 26 with real photos. Baseline, clusters, context. | Read & Connect |
| **Talk** | Playbooks by goal, need, decision style, value and conflict style. | Read & Connect |
| **Ask** | A switch with two separate knowledge bases: **Hughes only** (strictly his book, videos and site) and **Blend · 3 teachers**. They never share notes. | Both |
| **Watch** | Real-life profiling videos, Hughes first, with a switch for other analysts. | Read & Connect |
| **People** | Saved reads (this device only), export and import. **✦ Lines** opens Say tuned for that person. | Read & Connect |

## How it's built
The site is *generated* from the two source repos so it stays in step with them:

```
overlay/        the hub's own files: index.html, hub.js, hub.css, migrate.js, manifest, icons
tools/build.py  copies Behavior Ops, ports the generator to say/ and the blended Ask to blend/,
                scopes Read Anyone's styles to .ra (say.css), adds overlay/, writes sw.js
docs/           the built site (GitHub Pages serves this folder)
```

### Update after either source site changes
```
gh repo clone mhccog/behavior-ops /tmp/bo
gh repo clone mhccog/read-anyone /tmp/ra
python3 tools/build.py /tmp/bo /tmp/ra docs
git add -A && git commit -m "Sync from sources" && git push
```
Every patch in build.py checks its target text exists, so if an upstream file changed shape the build stops with a clear message instead of shipping something broken. The service worker version changes automatically whenever a file changes.

## Saved data
Stored in the browser (localStorage) under new `rtr.*` keys. On first open, `migrate.js` copies anything saved in the two older sites (same github.io address) without deleting it: people, the current read, both Ask chat histories, the Watch switch and saved lines.

## Ethics and rules
Understanding and rapport, not manipulation. Coercive material from the book (sections 07–09: interrogation, false memory, covert hypnosis, recruitment formulas) has no how-to anywhere; the Hughes Ask covers it only as how to spot it. Excluded generator techniques (H44–H83, V91) stay out. Needs are listening prompts, not labels. No book PDF or long quotes are in this repo. All frameworks belong to their authors; see `docs/CREDITS.md`.
