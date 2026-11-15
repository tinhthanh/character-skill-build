---
name: character-build
description: Create custom 2D SVG characters (people, plus dogs and cats) on a shared GSAP rig, verify them, and reuse them in HyperFrames video compositions. Use when the user asks to create, design, restyle or customise a character, mascot, avatar or presenter ("tạo nhân vật", "thêm nhân vật", "đổi trang phục", "nhân vật cho video"); to give a character a new outfit, hair, beard, glasses, colours, proportions or rest pose; to make a character wave, talk, walk, point, sit, react or otherwise act in a HyperFrames composition; or to add a dog or cat to a scene.
---

# Character build

A library of **100% SVG characters driven by GSAP**, a studio to tune them, and a
single-file build that drops into a [HyperFrames](https://github.com/heygen-com/hyperframes)
composition. A character is a small JS definition on top of a shared skeleton, so a new
character gets all 22 actions (wave, talk, walk, sit, react…) for free.

Everything you write and read while using the skill is English: definitions, configs, API
calls, error messages and tool output. Two things are not, and you should not need either:
the two rig files keep Vietnamese internal names and comments, and the studio's UI is
Vietnamese.

## What you can build

| Kind | Built in | Customisable |
|---|---|---|
| People | `default`, `vet`, `surgeon`, `nurse`, `doctor`; samples `receptionist`, `barista`, `granny`, `grandpa`, `clerk` | everything: face, hair, hat, beard, glasses, outfit, accessories, colours, proportions, rest pose |
| Pets | `dog`, `shiba`, `cat`, `orange_cat`, `black_cat` | body shape (seven dials) and colours |

To see them: `python3 tools/serve.py` then open `http://127.0.0.1:8300/studio/`.

## Workflow: create a custom character

Do these in order. Steps 4 and 5 are not optional: a character that renders at rest can
still break mid-action, and some failures are silent (see [Pitfalls](#pitfalls)).

1. **Pin down the brief.** Role, gender presentation, age feel, outfit, colours, signature
   accessory, rest pose (hands clasped, arms down…). Ask only for what you cannot infer.
2. **Pick the closest base.** The new character inherits everything it does not override.

   | Base | Gives you |
   |---|---|
   | `vet` | woman, hair bun, wrap scrubs, stethoscope, hands clasped |
   | `surgeon` | man, short hair + surgical cap, boxy V-neck scrubs, arms down, less chibi |
   | `nurse` | young woman, ponytail, round-neck tunic with flared sleeves |
   | `doctor` | woman with glasses, long-sleeved white coat with lapels |
   | `default` | plain adult proportions, T-shirt, no outline |

   No base has to match exactly: take the head you want as `base`, spread an outfit from
   `kit.outfits`, and borrow single parts from other characters with `kit.partsOf(id)`.
3. **Write the definition.** `cp characters/_template.js characters/<id>.js`, edit, then add
   it to the array in `characters/index.js`. Override only what changes. Read
   [references/slots.md](references/slots.md) **before** drawing any SVG: it has the
   coordinate systems, the element ids the rig requires, what each base already carries and
   how to remove it. `sh tools/describe.sh <base>` prints a base's current numbers and
   colours. `characters/receptionist.js` is a complete worked example; `barista.js`, `granny.js`,
   `grandpa.js` and `clerk.js` show aprons, skirts, age cues and held items.
4. **Run the automated check.** `sh tools/check.sh` rebuilds the bundle and runs every
   action of every character in headless Chrome. It must print `PASS`. It catches thrown
   errors, `NaN` attributes, duplicate ids, missing required elements, actions that do not
   return to rest, invalid files in `configs/`, and a stale bundle.
5. **Look at it.** `sh tools/shot.sh <id> out.png`, then open the PNG. It is a pose sheet:
   rest, close-ups, half and full turn, and fifteen labelled mid-action frames including
   sitting and four expressions. It applies `configs/<id>.json` when there is one
   (`--no-config` shows the bare definition). Check that nothing is covered that should be visible, that the outfit
   still reads when the arms move and when the character turns sideways, and that the hands
   land where the rest pose intends. Fix and repeat from step 4.
6. **Fine-tune numbers in the studio (optional).** Open
   `http://127.0.0.1:8300/studio/?nv=<id>`, adjust sliders and colours, press **Lưu** (Save).
   The **Dáng & váy** group tunes `stoop` and the skirt; the **Ngồi · ← · → · Đồ vật** buttons
   in the bottom bar hold a stance so every action can be reviewed seated, turned, or with
   the held item put away.
   That writes `configs/<id>.json`, and the next build bakes it into the bundle, so
   `createCharacter(host, { id })` returns the tuned character. The studio's ⋯ menu can also
   copy the values as definition lines if they should become the character's defaults.
7. **Rebuild.** `python3 tools/build.py` (`tools/check.sh` already does this).

A minimal definition:

```js
// characters/pharmacist.js — then add it to characters/index.js
export default {
  id: 'pharmacist',
  base: 'surgeon',                                     // his head and proportions
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,                          // long-sleeved coat (no stethoscope) instead of scrubs
    name: 'Pharmacist',
    hat: () => '',                                     // drop the inherited surgical cap
    faceExtras: (p, c) => kit.parts.roundGlasses(c),
    beard: (p, c) => kit.parts.shortBeard(c),
    colors: { ...base.colors, hair: '#8d9199', top: '#f6f7f9', topShadow: '#c9d0d9', innerShirt: '#2f9e8f' },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.9 },
  }),
};
```

## Use a character in HyperFrames

Full rules, staging recipes and a runnable example:
[references/hyperframes.md](references/hyperframes.md), `examples/hyperframes/index.html` and, for two characters talking,
`examples/conversation/index.html`.

```html
<!-- inside the root: <div data-composition-id="my-composition" data-start="0" data-duration="10" data-width="1920" data-height="1080"> -->
<div id="presenter" class="clip" data-start="0" data-duration="10" data-track-index="2"
     style="position:absolute; right:300px; bottom:90px; height:760px"></div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="character.slim.js"></script>   <!-- copy dist/character.slim.js into the project -->
<script>
  VGCharacter.seed(7);                       // seed BEFORE building any timeline
  const rig = VGCharacter.createCharacter(document.getElementById('presenter'), { id: 'receptionist' }).rig;
  const act = VGCharacter.sequence(rig, ['enter', 'wave', ['explain', 'Xin chào!', 2.4], ['express', 'happy'], ['idle', 2]]);

  const tl = gsap.timeline({ paused: true });
  tl.add(act.paused(false), 0);
  window.__timelines = window.__timelines || {};
  window.__timelines['my-composition'] = tl;
</script>
```

Four rules that are easy to get wrong:

- **Classic `<script>`, synchronous, no fetch.** Use a bundle from `dist/`, not the ES modules.
- **Seed first.** Blinks, mouth shapes and gestures use random numbers. Without
  `VGCharacter.seed(n)` two renders of the same composition differ.
- **One `sequence()` per character, not one `tl.add()` per action.** Some actions read the
  character's position when they are *built*, and actions that start with a `set` render
  wrong at frame 0 when added directly. `sequence` handles both.
- **Give the host a height, not a width.** The library sets `aspect-ratio`; the character
  fills the host's height. Leave room: arms reach about 0.45 × height to each side.

Action names, arguments and durations: [references/actions.md](references/actions.md).

**Preview without rendering:** `sh tools/peek.sh path/to/index.html [t1,t2,…] [out.png]`
prints the timing of every step of every character and saves a contact sheet of frames. Do
this before `hyperframes render`: it is how you find out that the script overruns
`data-duration` or that an entrance starts in view.

## Pitfalls

The library throws on a duplicate character id, an invalid config (unknown key, wrong type)
and non-hex colours. These still fail without an error:

- **Missing required ids.** `hair` must contain `<g id="${p}-hair-front">`; `eye` must
  contain `<g id="${p}-eye-${side}">` wrapping `<g id="${p}-pupil-${side}">`; `accessories`
  must wrap everything in `<g id="${p}-accessories">`; `shoes` must have
  `id="${p}-shoe-${side}"`. Without them blinking, gaze, head turn or body scaling silently
  stop working for that part. `tools/check.sh` reports the missing ones.
- **Hats go in `hat`, not `hair`.** The rig draws a generated hair patch after `hair` when
  the head turns; a hat inside `hair` gets a dark wedge painted across it.
- **You inherit more than you see.** A base may carry a hat, glasses or a stethoscope you do
  not want. `references/slots.md` lists what each base sets and how to remove it.
- **Things draped over the shoulders go in `shoulderAccessories` as well as `accessories`.**
  Sleeves are drawn after the torso and would cover a stethoscope or lanyard.
- **Everyday characters:** spread `kit.outfits.tee` or `kit.outfits.shirt` instead of a medical
  outfit; add `skirt: { kind: 'skirt' | 'apron', length }` for a skirt or apron that moves with
  the legs (do not draw one as a decal in `accessories` — it will not follow the legs or the
  turn), `stoop` for an elderly posture, `heldItemL` / `heldItemR` for a cup, clipboard or phone.
- **Furniture:** `VGCharacter.createProp(host, 'chair' | 'stool' | 'table' | 'counter', { for: rig })`
  draws props in the character's own frame, so a chair with the same `left` / `bottom` /
  `height` as its sitter lines up by itself. See `references/actions.md` → Scene props.
- **Conversations:** `sitDown`, `standUp` and `face(target)` change the stance and *keep* it, so
  a character can speak while seated or while turned to another character. See
  `references/actions.md` → Stance.
- **A bald head needs `backHair`.** The rig generates hair behind the skull when the head
  turns; `backHair: 'low'` or `'none'` turns it down or off.
- **Always spread the base palette:** `colors: { ...base.colors, top: '#…' }`. A bare
  `colors: { top }` drops skin, hair and every other colour.
- **Long sleeves need `longSleeves: true`.** Otherwise the forearm is drawn in skin colour.
- **A stale bundle.** HyperFrames loads a file from `dist/`, not the sources. Edit a
  character and forget `tools/build.py`, and the composition keeps the old one — and a copy
  of the bundle inside a video project is not covered by `check.sh`. Re-copy it.
- **Do not overlap two actions on one character.** They tween the same joints. Sequence them
  in one `sequence()`; put a different character on its own.

## Files

```
SKILL.md              this file
runtime/              the library (ES modules): index.js (public API), schema.js (public ↔ internal
                      names), parts.js, characters.js, rig-svg.js (people), rig-thu.js (pets)
characters/           custom characters: _template.js, samples (receptionist, barista, granny, grandpa, clerk), index.js (registry)
configs/              per-character tuned numbers written by the studio (<id>.json), baked into dist
dist/                 character.iife.js (commented) · character.slim.js (use this one) — generated
studio/               visual editor (Vietnamese UI)
tools/                serve.py · build.py · check.sh (all characters) · shot.sh (pose sheet) ·
                      describe.sh (a character's current values) · peek.sh (composition preview) · gallery.sh (all characters in one picture) ·
                      lint-examples.sh (hyperframes lint on the examples; needs Node)
examples/            hyperframes/ (a vet and a dog) · conversation/ (two people talking, one seated)
references/           slots.md · actions.md · hyperframes.md
```

Requirements: Python 3, a Chrome or Chromium for `check.sh` / `shot.sh` / `peek.sh` (set
`CHROME=` if it is not in a standard place), and network access to load GSAP from the CDN.
