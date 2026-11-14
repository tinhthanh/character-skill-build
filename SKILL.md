---
name: character-build
description: Create custom 2D SVG characters (people, plus a dog and a cat) on a shared GSAP rig, verify them, and reuse them in HyperFrames video compositions. Use when the user asks to create, design, restyle or customise a character, mascot, avatar or presenter ("tạo nhân vật", "thêm nhân vật", "đổi trang phục", "nhân vật cho video"); to give a character a new outfit, hair, colours, proportions or rest pose; to make a character wave, talk, walk, point or otherwise act in a HyperFrames composition; or to add a dog or cat to a scene.
---

# Character build

A library of **100% SVG characters driven by GSAP**, a studio to tune them, and a
single-file build that drops into a [HyperFrames](https://github.com/heygen-com/hyperframes)
composition. A character is a small JS definition on top of a shared skeleton, so a new
character gets all 19 actions (wave, talk, walk, point…) for free.

The code and its comments are written in **Vietnamese**. You do not need to read the
comments to use the skill; the identifiers you will touch are in the
[glossary](#glossary).

## What you can build

| Kind | Rig | Built in | Customisable |
|---|---|---|---|
| People | `runtime/rig-svg.js` | `mac_dinh`, `bac_si_thu_y`, `bs_nam`, `dieu_duong`, `bs_kinh`, `le_tan` | everything: face, hair, hat, outfit, accessories, colours, proportions, rest pose |
| Pets | `runtime/rig-thu.js` | `cho` (dog), `meo` (cat) | colours only |

To see them: `python3 tools/serve.py` then open `http://127.0.0.1:8300/studio/`.

## Workflow: create a custom character

Do these in order. Steps 4 and 5 are not optional: a character that renders at rest can
still break mid-action, and several failure modes are **silent** (see [Pitfalls](#pitfalls)).

1. **Pin down the brief.** Role, gender presentation, age feel, outfit, colours, signature
   accessory, rest pose (hands clasped, arms down…). Ask only for what you cannot infer.
2. **Pick the closest base** (`dua`). The new character inherits everything it does not
   override, so the right base saves most of the work:

   | Base | Gives you |
   |---|---|
   | `bac_si_thu_y` | woman, hair bun, wrap scrubs, stethoscope, hands clasped |
   | `bs_nam` | man, short hair + surgical cap, boxy V-neck scrubs, arms down, less chibi |
   | `dieu_duong` | young woman, ponytail, round-neck tunic with flared sleeves |
   | `bs_kinh` | woman with glasses, long-sleeved white coat with lapels |
   | `mac_dinh` | plain adult proportions, T-shirt, no outline |

3. **Write the definition.** `cp characters/_mau.js characters/<id>.js`, edit, then add it to
   the array in `characters/index.js`. Override only what changes. Read
   [references/slots.md](references/slots.md) **before** drawing any SVG: it has the
   coordinate systems and the element ids the rig requires. `characters/le_tan.js` is a
   complete worked example (new hair, blazer from the white-coat outfit, bow tie, name tag).
4. **Run the automated check.** `sh tools/check.sh` rebuilds the bundle and runs every
   action of every character in headless Chrome. It must print `PASS`. It catches thrown
   errors, `NaN` attributes, duplicate ids, missing required elements, actions that do not
   return to rest, and a stale bundle.
5. **Look at it.** `sh tools/shot.sh <id> /tmp/<id>.png`, then open the PNG. It is a pose
   sheet: rest, close-ups, half and full turn, and ten mid-action frames. Check that nothing
   is covered that should be visible (accessories under sleeves, hair over a hat), that the
   outfit still reads when the arms move and when the character turns sideways, and that
   the hands land where the rest pose intends. Fix and repeat from step 4.
6. **Fine-tune numbers in the studio (optional).** Open
   `http://127.0.0.1:8300/studio/?nv=<id>`, adjust sliders and colours, press **Lưu**
   (Save). That writes `configs/<id>.json`. If a tuned value should be the character's
   default, copy it into `characters/<id>.js` instead — definitions travel with the
   bundle, configs must be passed in by the composition.
7. **Rebuild.** `python3 tools/build.py` regenerates `dist/character.iife.js`
   (`tools/check.sh` already does this).

## Use a character in HyperFrames

Full rules and a runnable example: [references/hyperframes.md](references/hyperframes.md)
and `examples/hyperframes/index.html`. The short version:

```html
<div id="presenter" class="clip" data-start="0" data-duration="10" data-track-index="2"
     style="position:absolute; right:300px; bottom:90px; height:760px"></div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="character.iife.js"></script>   <!-- copy dist/character.iife.js into the project -->
<script>
  VGCharacter.gieo(7);                       // seed BEFORE building any timeline
  const rig = VGCharacter.taoNhanVat(document.getElementById('presenter'), { khoa: 'le_tan' }).rig;
  const act = VGCharacter.kichBan(rig, ['enter', 'wave', ['giaiThich', 'Xin chào!', 2.4], ['idle', 2]]);

  const tl = gsap.timeline({ paused: true });
  tl.add(act.paused(false), 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['my-composition'] = tl;
</script>
```

Four rules that are easy to get wrong:

- **Classic `<script>`, synchronous, no fetch.** Use the IIFE bundle, not the ES modules.
  Pass a tuned config as an inline object: `taoNhanVat(host, { khoa, config: {…} })`.
- **Seed first.** Blinks, mouth shapes and gestures use random numbers. Without
  `VGCharacter.gieo(n)` two renders of the same composition differ.
- **One `kichBan()` per character, not one `tl.add()` per action.** Some actions read the
  character's position when they are *built*, and actions that start with a `set` render
  wrong at frame 0 when added directly. `kichBan` handles both.
- **Give the host a height, not a width.** The library sets `aspect-ratio`; the character
  fills the host's height. Leave room: arms reach about 0.45 × height to each side.

Action names and signatures: [references/actions.md](references/actions.md).

## Pitfalls

Each of these has bitten this codebase; all but the last fail without an error.

- **Missing required ids.** `toc()` must contain `<g id="${p}-tocTruoc">`; `mat()` must
  contain `<g id="${p}-mat${ben}">` and `<g id="${p}-nguoi${ben}">`; `phuKien()` must wrap
  everything in `<g id="${p}-phuKien">`; `giay()` must have `id="${p}-ban${ben}"`. Without
  them blinking, gaze, head turn or body scaling silently stop working for that part.
- **Hats go in `mu()`, not `toc()`.** The rig draws a generated hair patch after `toc()`
  when the head turns; a hat inside `toc()` gets a dark wedge painted across it.
- **Things draped over the shoulders go in `phuKienTren()` as well as `phuKien()`.**
  Sleeves are drawn after the torso and would cover a stethoscope or lanyard.
- **Always spread the base palette:** `mau: { ...goc.mau, ao: '#…' }`. A bare
  `mau: { ao }` drops skin, hair and every other colour.
- **Long sleeves need `tayDai: true`.** Otherwise the forearm is drawn in skin colour.
- **A stale bundle.** HyperFrames loads `dist/character.iife.js`, not the sources. Edit a
  character and forget `tools/build.py`, and the composition keeps the old one.
  `tools/check.sh` fails on this.
- **Do not overlap two actions on one character.** They tween the same joints. Sequence
  them in `kichBan`; put a different character on its own `kichBan`.

## Files

```
SKILL.md              this file
runtime/              the library (ES modules): rig-svg.js, rig-thu.js, characters.js, index.js
characters/           custom characters: _mau.js (template), le_tan.js (example), index.js (registry)
configs/              per-character tuned numbers written by the studio (<id>.json)
dist/character.iife.js  single-file build for <script src> — generated, do not edit
studio/               visual editor (Vietnamese UI)
tools/                serve.py · build.py · check.sh · shot.sh · check.html · sheet.html
examples/hyperframes/ a complete composition with a vet and a dog
references/           slots.md · actions.md · hyperframes.md
```

Requirements: Python 3, a Chrome or Chromium for `check.sh` / `shot.sh` (set `CHROME=` if
it is not in a standard place), and network access to load GSAP from the CDN.

## Glossary

| Vietnamese | Meaning | Vietnamese | Meaning |
|---|---|---|---|
| `nhân vật` / `nv` | character | `khoa` | character id (key) |
| `dua` | "based on" (base id) | `dinhNghia` | definition |
| `đầu` / `dau` | head | `thân` / `than` | torso |
| `tóc` / `toc` | hair | `mũ` / `mu` | hat |
| `mắt` / `mat` | eye | `mày` / `may` | eyebrow |
| `mũi` / `mui` | nose | `miệng` / `mieng` | mouth |
| `khuôn` / `khuon` | face outline | `áo` / `ao` | shirt / top |
| `cổ áo` / `coAo` | collar | `tay áo` / `tayAo` | sleeve |
| `phụ kiện` / `phuKien` | accessories | `quần` / `quan` | trousers |
| `giày` / `giay` | shoes | `tay` | arm / hand |
| `chân` / `chan` | leg | `màu` / `mau` | colour(s) |
| `da` | skin | `nghỉ` / `nghi` | rest pose |
| `động tác` / `dongTac` | action | `kịch bản` / `kichBan` | script (action sequence) |
| `gieo` | seed (the RNG) | `tạo` / `tao` | create |
| `chó` / `cho` | dog | `mèo` / `meo` | cat |
| `apDung` | apply state to the SVG | `datNghi` | reset to rest |
| `doiMau` | change colours | `napBoSo` | load a config |
