# character-skill-build

An agent skill for **building custom 2D characters** and **reusing them in
[HyperFrames](https://github.com/heygen-com/hyperframes) videos**.

![Thirteen people and five pets built with the rig](docs/characters.png)

Characters are 100% SVG, animated with GSAP. A character is a small JavaScript definition
on top of a shared skeleton, so every new character can already wave, talk, point, sit,
react, walk in, walk out and a dozen other things. Dogs and cats come with their own
actions (wag, bark, beg; meow, stretch, hiss…), five breeds and adjustable body shape.

What a definition can say, beyond face, hair and colours:

- **Clothes** — ready-made outfits (`scrubs`, `pawTunic`, `coat`, `plainCoat`, `tee`, `shirt`,
  `dress`, `hoodie`, `suit`), a `skirt` or apron that follows the legs, glasses, beards, wrinkles.
- **Hair and build without drawing** — eleven ready-made hairstyles (`kit.hair.bob()`,
  `ponytail`, `curly`, `spiky`…) and body presets (`kit.bodies.child`, `teen`, `tall`, `stocky`).
- **Things in the hand** — `heldItemL` / `heldItemR` (cup, clipboard, phone, or your own SVG);
  the hand keeps its grip and one-handed gestures switch to the free hand.
- **Posture** — `stoop` for a bent back, `torsoWidth` for a stocky build, `backHair` for bald
  heads, one-armed rest poses.

And what a scene can do with them:

- **Hold a stance** — `sitDown`, `standUp`, `face(otherCharacter)`: a character speaks,
  nods and waves while seated or turned toward someone. Pets do the same.
- **Furniture** — `createProp(host, 'chair' | 'stool' | 'table' | 'counter', { for: rig })`
  draws props that line up with a seated character.
- **Conversations** — `conversation([[rig, ...steps], …], { camera })` chains turns, times them
  and cuts to whoever speaks; `captions(talk, element)` shows the words;
  `examples/conversation/` is a complete two-person scene.
- **Combos** — one step for a whole short scene: `greetCustomer`, `fullCheckup(pet)`, `vaccinationVisit(pet, scale)`,
  `goodNews`, `badNews`, `waitingImpatient`, `dischargePet(pet, owner)`; in scripts as "khám tổng quát", "tiêm phòng", "trả thú"…
- **Tone of voice** — a line can be spoken worried, sad, angry, laughing… (`{ mood }` on the
  speaking step); nine expressions in all, and a whole-body `cheer`.
- **Voice and camera** — `tools/cues.py voice.wav` turns a voice file into mouth cues for
  `speakCues` (Rhubarb when installed, a built-in spectral method otherwise); `shot(scene, rig,
  'face')` pushes the camera in on one character or frames several. `examples/voiceover/` shows both.

- **`SKILL.md`** — instructions an AI agent follows to create a character from a brief,
  verify it, and place it in a composition.
- **`runtime/`** — the library (ES modules) with an English API. The two rigs keep only their core in
  `rig-svg.js` (people) and `rig-thu.js` (pets): building the SVG, drawing (`apDung`), colours, shape, rest pose and
  the action lists. The actions live in one file per group — `runtime/person/` (`basic`, `gestures`, `counter`,
  `presenter`, `motion`, `care`, `treatment`, `look-carry`, `pairs`, `floor`, `stance`, `speech`, `cage`, `grooming`, `shop50b`, `feed50c`) and `runtime/pet/`
  (`poses`, `play`, `basic`, `species`, `tricks`, `mood`, `grooming`) — each one `export default (Rig) => mix(Rig, class { … })`,
  installed onto the rig class; module-level constants and helpers are in `person/shared.js` / `pet/shared.js`.
  A new action goes in the group file it belongs to (or a new group file added to the install list at the end of the
  rig file); `mix` refuses a name that is already defined.
  Drawing a person (`apDung`) runs one method per step, in order — `_drawRoot`, `_drawLegs`, `_layerArms`,
  `_drawHeadTurn`, `_drawThighs`, `_drawTorso`, `_poseArms`, `_drawHeldItems`, `_drawHands`, `_drawFace` — and what a
  step works out for a later one (turn, far arm, shoulder lift, arm angles) travels in the frame object `f`.
- **`dist/character.slim.js`** — the same library as one plain-script file for HyperFrames,
  with the tuned configs baked in.
- **`studio/`** — a visual editor: presets, sliders, colour palettes, undo, per-character save.
- **`tools/`** — dev server, bundler, automated check, pose-sheet and composition previews.

## Install as a skill

```bash
git clone https://github.com/tinhthanh/character-skill-build ~/.claude/skills/character-build
```

Any agent that reads `SKILL.md`-style skills can use it the same way; the skill is just this
folder.

## Try it

```bash
python3 tools/serve.py                          # http://127.0.0.1:8300/studio/
sh tools/check.sh                               # everything (cues, scenes, every character × every action) → PASS / FAIL
sh tools/check.sh --changed                     # fast loop: only the scene cases your change touches (see below)
sh tools/shot.sh receptionist /tmp/sheet.png    # pose sheet for one character
sh tools/peek.sh examples/conversation/index.html  # timings + contact sheet of a composition
sh tools/gallery.sh /tmp/all.png                # every registered character in one picture
sh tools/lint-examples.sh --check               # hyperframes lint + check on every example (needs Node)
```

### The check: fast loop, full run, adding a case

`sh tools/check.sh` rebuilds `dist/`, runs the cue self-test, the scene self-test
(`tools/check_scene.py`) and `tools/check.html` (every character × every action in headless Chrome).
The scene self-test is split into independent cases under `tools/ci/` (one module per wave of work,
`basics.py` for the opening checks); each case gets its own temp dir and they run in parallel.

```bash
sh tools/check.sh --changed          # cases the change vs main touches (+ a smoke set); prints why each was picked
sh tools/check.sh --only pharm44a,w43  # cases by name, glob, module or group of a split case (combo41)
sh tools/check.sh --failed           # only what failed last time (.cache/ci-failed.txt)
python3 tools/check_scene.py --list  # every case with its tags and `uses`
```

`--changed` picks a case when its own code changed, when a word of the changed hunks (an action,
preset, character id, or a tool: `script`, `acting_check`, `page_eval`, `camera`…) is in its `uses`,
or when it is tagged `smoke`. It is a fast loop, not a proof: a change to a shared engine
(`runtime/set3d.js` camera, `runtime/rig-svg.js` skeleton or `runtime/person/shared.js`, `tools/scene.py`) can break scenes that
never name the changed words.

**`--scope`: what CI runs on a pull request.** `tools/scope.py` splits the change by folder.

- **Core changed → everything.** Core is the two rigs, `runtime/index.js`, the shared helpers, the 3D set, shading, the
  drawing kits, the scene builder, the check tools themselves, `configs/`, `vendor/` and the workflow. A file the
  script does not know counts as core.
- **Otherwise, only what the change reaches:**
  - an action method in `runtime/person/<group>.js` or `runtime/pet/<group>.js` → that action. A private helper or the
    file's module code → every action of the file.
  - a combo entry → that combo.
  - a character → it and the characters built on it.
  - catalog rows → their actions.
  - an example → that example.
  - docs → nothing.
- **What then runs:**
  - The scene cases `--changed` picks, with those names as extra words.
  - Only the check-page units that test those names: the action sweeps of every character limited to those actions
    (`?only=` / `?actions=`), the sequence-vs-direct rows, and the page blocks whose code names them.
  - Only the examples that name them are linted.

```bash
python3 tools/scope.py             # what a change vs main needs, and why
sh tools/check.sh --scope          # run just that (one action changed: about 1 min instead of 5)
```

A push to `main` always runs the whole check, so something a scoped run missed is still caught after the merge.
**Before a release, or after changing the core, run the full `sh tools/check.sh` (no arguments).**

`tools/check.html` runs at the same time as the scene cases (both only need the fresh `dist/`), split
into shards — one headless Chrome each, `CHECK_PAGE_SHARDS=n` (default 3, `1` = one unsharded run).
Its result is printed after the scene step's. With no arguments it always runs; with `--changed` only
when the change touches `runtime/`, `configs/`, `tools/check.html` or the files that run it; with
`--only` / `--failed` / `--list` it is skipped. `--page` / `--no-page` force it on or off.

```bash
sh tools/check.sh --only w44 --page              # some scene cases and the whole check page
sh tools/check.sh --changed --no-page            # scene cases only
# one shard, or one character's action sweep, by hand (python3 tools/serve.py 8300 first):
#   http://127.0.0.1:8300/tools/check.html?shard=2/3
#   http://127.0.0.1:8300/tools/check.html?characters=vet,dog
```

Each block of the page is a unit of work opened with `if (chay('name'))`; the sweep of one character
is one unit (`person:vet`, `pet:dog`). Shard `i/n` runs every n-th unit. Every shard meets all units in
the same order, and `tools/check_report.py shard1.html shard2.html …` merges the shards and fails if a
unit ran in no shard or in two (`--times` also prints the slowest units). A new block of checks needs
its own `if (chay('…'))` (names must be unique); a block without one runs in every shard.

`tools/acting_check.py` (used by most scene cases) opens one headless Chrome per scene and reloads
the page for each pass (probe, pets in view, stroke tracks, 2× re-measure, people behind counters), so
every pass still starts from a freshly loaded page: what a moment renders can depend on the seeks made
before it. Its pixel measures capture only the region they read, with Chrome drawing only that region
(software compositing of a full 3D set frame took 1–3 s a shot), and compare pixels with Pillow.

**Adding checks for a new wave:** create `tools/ci/wNN.py` (do not edit other waves' modules):

```python
from .common import *

@case('clinic45a')                       # unique name; tags=('smoke',) only for a few representative cases
def clinic45a(work, problems):           # `work` is a fresh temp dir for this case alone
    done = build(os.path.join(ROOT, 'examples', 'scene-3d', 'scene.json'), os.path.join(work, 'clinic45a'))
    if done.returncode != 0: problems.append('clinic45a: the scene does not build: ' + done.stderr.strip()[:300])
```

**One case per scene.** A case that builds several independent scenes (each with its own
`acting_check`, a Chrome run of 20–60 s) is split into parts, so no single case holds up the run:

```python
@case('combo41', parts=('groom41', 'vacc41', 'words'))
def combo41(work, problems, part):       # each part runs as its own case: combo41:groom41, combo41:words…
    scenes = {'groom41': (...), 'vacc41': (...)}
    for name, spec in scenes.items():
        if name != part: continue        # build + needles + acting_check of this scene only
        ...
    if part == 'words':                  # the script-word check
        ...
```

`--only combo41` still runs all its parts, `--only 'combo41:*'` / `--only combo41:groom41` some of them.
A part's own code (the dict entry keyed by its name, a `({'id': name, …}, …)` tuple or its
`if part == …:` block) gives its `uses` and its lines for `--changed`; the rest of the function is shared.

`uses` is derived from the case's string literals and from what it built on its last passing run; pass
`uses=(...)` only for words its source cannot show. Scene files written next to an example (so relative
assets resolve) must carry `scratch(name)` in their file name so parallel cases do not collide.
Cases run longest-first (times of the last run in `.cache/ci-times.json`; a part not yet timed gets
its group's old time ÷ its number of parts, else a guess from the Chrome runs in its source). Cases
tagged `calm` (pixel-exact screenshot comparisons: `seek46`, which misses paints when ten Chromes
draw at once) start only after the main queue is empty and at most two other cases still run. With `-j` > 1 every
`tools/chrome_run.py` wait is tripled (`CHROME_RUN_TIMEOUT_SCALE`) because many Chromes share the CPU.

## A character in a dozen lines

```js
// characters/pharmacist.js — then add it to characters/index.js
export default {
  id: 'pharmacist',
  base: 'surgeon',                                   // his head and proportions
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,                        // long-sleeved coat (no stethoscope) instead of scrubs
    name: 'Pharmacist',
    hat: () => '',                                   // drop the inherited surgical cap
    faceExtras: (p, c) => kit.parts.roundGlasses(c),
    beard: (p, c) => kit.parts.shortBeard(c),
    colors: { ...base.colors, hair: '#8d9199', top: '#f6f7f9', topShadow: '#c9d0d9', innerShirt: '#2f9e8f' },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.9 },
  }),
};
```

`references/slots.md` documents every key, coordinate system and required element id.

## In a HyperFrames composition

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/gsap.min.js"></script>
<script src="character.slim.js"></script>
<script>
  VGCharacter.seed(7);
  const rig = VGCharacter.createCharacter(document.getElementById('presenter'), { id: 'pharmacist' }).rig;
  const act = VGCharacter.sequence(rig, ['enter', 'wave', ['explain', 'Xin chào!', 2.4], ['express', 'happy']]);
  const tl = gsap.timeline({ paused: true });
  tl.add(act.paused(false), 0);
  window.__timelines = { ...(window.__timelines || {}), 'my-composition': tl };
</script>
```

## A scene from a script

```bash
python3 tools/scene.py examples/scene/scene.json     # → examples/scene/clinic-visit/index.html
sh tools/peek.sh examples/scene/clinic-visit/index.html
```

A scene file lists the characters (who, where, seated or walking in), the furniture, and the
script — who says what (optionally with a voice file) and who does what, in order. The tool
writes a complete HyperFrames composition: turns timed automatically, the camera on whoever
speaks, captions, lip-sync cues and timed audio clips. With
[`voice-tts`](https://github.com/tinhthanh/voice-process) installed, `"voice": "maichi"` on a
character speaks its lines in Vietnamese — text in, talking video out. Horizontal or vertical (9:16) frames;
an explainer layout (`"layout": "presenter"`) puts titles, bullet points and pictures beside
the presenter as they speak;
`tools/peek.sh … --mouth` shows a line's lip-sync frame by frame.

## Requirements

Python 3 for the tools. Chrome or Chromium for `check.sh` / `shot.sh` / `peek.sh`. GSAP 3 is
loaded from a CDN by the pages here and by HyperFrames compositions. No Node and no bundler
are needed to build or check characters; only `tools/lint-examples.sh` (and HyperFrames
itself) uses Node.

## Notes

- The public API, the definition and config schemas are English. The two rig files keep
  Vietnamese internal names and comments, and the studio UI is in Vietnamese;
  `runtime/schema.js` is the dictionary between the two.
- Verified with the HyperFrames CLI 0.9.52: all examples pass `hyperframes lint` and
  `hyperframes check` (run in CI on every push) and render to 1920 × 1080 MP4s — `examples/hyperframes` 17 s,
  `examples/conversation` 19 s.
- See `CHANGELOG.md` for what changed between versions.
- Licensed under the MIT License (`LICENSE`). GSAP is loaded from a CDN and is not part of this
  repository; it has its own licence.

---

## Tiếng Việt

Skill hướng dẫn AI agent **tạo nhân vật 2D tuỳ chỉnh** (SVG thuần, GSAP điều khiển) và
**dùng lại nhân vật trong video HyperFrames**. Mỗi nhân vật là một tệp định nghĩa nhỏ trong
`characters/`, thừa hưởng bộ xương, 28 động tác và 5 động tác thế đứng có sẵn. Kèm chó, mèo (năm giống) với bộ
động tác riêng và hình dáng chỉnh được.

Nhân vật mặc được váy / tạp dề, cầm đồ vật (cốc, bìa hồ sơ, điện thoại), có dáng còng; trong
cảnh thì ngồi xuống, quay về phía nhau và nói chuyện luân phiên (`sitDown`, `face`), có sẵn
ghế, bàn, quầy (`createProp`). Ví dụ hai người nói chuyện: `examples/conversation/`.

```bash
python3 tools/serve.py        # mở studio: http://127.0.0.1:8300/studio/
sh tools/check.sh             # kiểm mọi nhân vật × mọi động tác
python3 tools/build.py        # dựng lại dist/ cho HyperFrames (nướng luôn configs/)
```

Quy trình tạo nhân vật nằm trong `SKILL.md`; bảng khoá và toạ độ ở `references/slots.md`.
