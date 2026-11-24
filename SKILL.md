---
name: character-build
description: Create custom 2D SVG characters (people, plus dogs and cats) on a shared GSAP rig, and build HyperFrames video scenes with them — characters that walk in, sit, talk in turn with lip-sync, captions and camera shots. Use when the user asks to create, design, restyle or customise a character, mascot, avatar or presenter ("tạo nhân vật", "thêm nhân vật", "đổi trang phục", "nhân vật cho video"); to give a character a new outfit, hair, beard, glasses, colours, proportions or rest pose; to make characters act or hold a conversation in a HyperFrames composition ("dựng cảnh", "hội thoại", "video có nhân vật"); or to add a dog or cat to a scene.
---

# Character build

A library of **100% SVG characters driven by GSAP** and the tools to put them in a
[HyperFrames](https://github.com/heygen-com/hyperframes) video. A character is a small JS
definition on a shared skeleton, so every character can already wave, talk, walk, sit,
cheer, drink, write, stroke a pet, hand an item to someone, talk on the phone, show an app on
the phone, type on a laptop, examine a pet with a stethoscope, give an injection, pick a pet up,
clap, count on fingers, check the time, bow, greet with a wai, shake hands, ponder, fold the arms, call out,
startle, hurry, give a thumbs-down, a stop sign, a finger heart or a V sign, shine a penlight in a pet's ears
or mouth, give it a treat or a pill, hold out a hand for it to lick, brush it, bandage its leg, put a recovery cone on it, walk it on a leash, kneel to it,
hand it to someone, throw it a ball, weigh it on a scale, take its temperature, give it a pill by hand (one hand on its chin),
read a patient chart (flipping a page), point at an X-ray film, trim its nails (holding the paw up), put drops in its eye,
clean its ear with a cotton pad, scan its microchip (the number shows on a card),
hold a pet still while someone else examines or injects it, wash the hands (soap foam), put exam gloves on and take them off,
get a notification on the phone (93 person actions in all — `VGCharacter.list().personActions`) and hold a stance (sit down, face someone, look at something — `lookAt` turns the head, put an item
away, keep the phone at the cheek, carry a pet, hold a leash). Pets can also lie down, sleep, look unwell, scratch an
itch, limp, tremble with fear, eat and drink from a bowl, cough, sneeze, pant, yawn, shake off water, open the
mouth for an exam, rub against a leg, fetch a ball, greet their owner, play, go into a carrier, roll over belly up, chase
the tail (dogs), knead (cats), lick a held-out hand or the face of whoever carries them, run and hide behind someone, nibble a
carrot (the rabbit), and wear a recovery cone or a leg bandage; people can wear a mask, exam gloves and a surgical cap. 3D sets include outdoor places (`park`,
`street`). Pets: dogs `dog`, `shiba`, `corgi`, `poodle`, `husky`, `black_dog`; cats `cat`, `orange_cat`, `black_cat`,
`white_cat`, `calico`; and a `rabbit` that hops.

There are two jobs. Do the one you were asked for; most videos need both.

- **[Make a character](#make-a-character)** — a definition file, checked and looked at.
- **[Make a scene](#make-a-scene)** — a HyperFrames composition where characters act and talk.

Everything you read and write is English: definitions, scene files, API, errors, tool
output. (The two rig source files and the studio's UI are Vietnamese; you need neither.)

## What exists already

| Kind | Built in | Customisable |
|---|---|---|
| People | `default`, `vet`, `surgeon`, `nurse`, `doctor`; samples `receptionist`, `barista`, `granny`, `grandpa`, `clerk`, `girl`, `boy`, `manager` | everything: face, hair, hat, beard, glasses, outfit, accessories, colours, proportions, rest pose |
| Pets | `dog`, `shiba`, `cat`, `orange_cat`, `black_cat` | body shape (seven dials) and colours |

`docs/characters.png` shows them all; `sh tools/gallery.sh out.png` regenerates it.

## Make a character

Steps 4 and 5 are not optional: a character that renders at rest can still break
mid-action, and some failures are silent (see [Pitfalls](#pitfalls)).

1. **Pin down the brief.** Role, age feel, outfit, colours, signature accessory, rest pose.
   Ask only for what you cannot infer.
2. **Pick the closest base** — the new character inherits everything it does not override.

   | Base | Gives you |
   |---|---|
   | `vet` | woman, hair bun, long-sleeve zip jacket, stethoscope, hands clasped |
   | `surgeon` | man, short hair + surgical cap, boxy V-neck scrubs, arms down |
   | `nurse` | young woman, ponytail, round-neck tunic with flared sleeves |
   | `doctor` | woman with glasses, long-sleeved white coat with lapels |
   | `default` | plain adult proportions, T-shirt, no outline |

3. **Write the definition.** `cp characters/_template.js characters/<id>.js`, edit, add it to
   `characters/index.js`. **Assemble from the kit before drawing anything:**

   | Want | Use |
   |---|---|
   | clothes | `...kit.outfits.<name>` — `scrubs`, `pawTunic`, `coat`, `plainCoat`, `tee`, `shirt`, `dress`, `hoodie`, `suit` |
   | hair | `hair: kit.hair.<style>()` — `crop`, `sidePart`, `bob`, `long`, `ponytail`, `bun`, `pigtails`, `curly`, `spiky`, `tufts`, `bald` |
   | build | `...kit.bodies.<preset>` — `child`, `teen`, `adult`, `tall`, `stocky`; or `torsoWidth`, `stoop` |
   | glasses, beard, wrinkles | `kit.parts.roundGlasses(c)`, `shortBeard(c)`, `moustache(c)`, `wrinkles(c)` |
   | skirt or apron | `skirt: { kind: 'skirt' \| 'apron', length }` (+ `kit.parts.apronBib(c)`) — never a decal in `accessories` |
   | something in the hand | `heldItemL` / `heldItemR: (p, c) => kit.parts.cup(c)` (`clipboard`, `phone`) |
   | a part of another character | `kit.partsOf('doctor').faceExtras` |

   Draw your own SVG only for what the kit lacks, and read
   [references/slots.md](references/slots.md) first: coordinate systems, required element
   ids, what each base carries and how to remove it. `sh tools/describe.sh <id>` prints a
   character's current numbers. `characters/girl.js`, `boy.js`, `manager.js` are built from
   kit pieces alone; `receptionist.js`, `barista.js`, `granny.js`, `grandpa.js`, `clerk.js`
   show custom drawing, aprons, age cues and held items.
4. **Run the check.** `sh tools/check.sh` rebuilds the bundle and runs every action of every
   character in headless Chrome. It must print `PASS`.
5. **Look at it.** `sh tools/shot.sh <id> out.png`, then open the PNG — a pose sheet: rest,
   close-ups, turns, sixteen mid-action frames, two held stances. Check that nothing is
   covered that should show, that the outfit reads when arms move and when the character
   turns, and that hands land where the rest pose intends. Fix and repeat from step 4.
6. **Optional: tune numbers in the studio.** `python3 tools/serve.py`, open
   `http://127.0.0.1:8300/studio/?nv=<id>`, adjust, press **Lưu** (Save). That writes
   `configs/<id>.json`, which the next build bakes into the bundle.

```js
// characters/pharmacist.js — then add it to characters/index.js
export default {
  id: 'pharmacist',
  base: 'surgeon',                                     // his head and proportions
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,                          // long-sleeved coat instead of scrubs
    name: 'Pharmacist',
    hat: () => '',                                     // drop the inherited surgical cap
    hair: kit.hair.sidePart(),
    faceExtras: (p, c) => kit.parts.roundGlasses(c),
    colors: { ...base.colors, hair: '#8d9199', top: '#f6f7f9', topShadow: '#c9d0d9', innerShirt: '#2f9e8f' },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.9 },
  }),
};
```

## Make a scene

**Start from a scene file** unless you have a reason not to. You describe who is there and
who says or does what; the tool writes the whole composition — hosts, furniture, turns timed
automatically, the camera on whoever speaks, captions, lip-sync cues and timed `<audio>`
clips for every voice file.

1. **Write `scene.json`** (full key list: `references/hyperframes.md` → The short way;
   samples: `examples/scene/scene.json`, `examples/scene-vertical/scene.json`):

   ```json
   {
     "id": "clinic-visit",
     "characters": [
       { "name": "vet",   "id": "vet",  "x": 640,  "enter": "left", "faces": "boy" },
       { "name": "boy",   "id": "boy",  "x": 1380, "height": 570, "seated": "chair", "faces": "vet" },
       { "name": "bella", "species": "dog", "x": 1050, "faces": "vet" }
     ],
     "props": [ { "kind": "counter", "x": 250 } ],
     "script": [
       { "who": "vet", "say": "Good morning! Bella is due for her check-up.", "audio": "line1.wav" },
       { "who": "boy", "say": "Is it going to hurt her?", "mood": "worried", "dur": 2.2 },
       { "who": "vet", "say": "Not at all.", "shot": ["vet", "bella"] },
       { "together": [ { "who": "bella", "do": ["bark"] }, { "who": "boy", "do": ["cheer"] } ] }
     ]
   }
   ```

   `say` + `audio` lip-syncs to the file; `say` + `dur` estimates the mouth; with the
   `voice-tts` command installed, `"voice": "maichi"` on a character speaks its lines for you
   (Vietnamese; made once into `voice/` and reused). `mood` is the
   tone of the line (`happy`, `sad`, `surprised`, `angry`, `thinking`, `laughing`, `worried`,
   `confused`, `tired`); on a pet's turn it is the pet's face (`happy`, `excited`, `sad`, `scared`, `angry`,
   `curious`, `guilty`, `pain`, `sleepy`), held through that turn's `do` — give it a close `"view"`. `do` takes any action step; `"enter"` / `"exit"` on a turn bring a
   character in or out mid-scene; `"background": { "preset": "clinic" }` (`lobby`, `home`)
   draws a room. Vertical video: `"width": 1080,
   "height": 1920`. **Opening and closing cards:** `"intro"` / `"outro"` (title, text, a call-to-action button, a logo).
   **A whole film from plain words:** the same script with `=== tên cảnh · bối cảnh: …` lines — one scene each,
   built and joined into one film (`mở đầu: hook | …` for a hook opening, `thông báo: … | …` for an app notification).

**A scene from plain words:** `python3 tools/script.py kich-ban.txt` — a header (`bối cảnh: phòng khám · máy: tự
   động · khung: dọc`), the cast (`bác sĩ (vet) · chó (corgi, trên bàn)`), then `bác sĩ (vui): lời`, `chó: [sợ]`,
   `bác sĩ → chó: cho thuốc`, `cùng lúc: … | …` — written to a `.scene.json` and built (`--help` for every word).

**Several scenes into one film:** `python3 tools/film.py film.json` (transitions, sound in step, background
   music that dips under speech, an `.srt` of every spoken line, a poster frame).
   **Phone call between two places:** `"layout": "split"` (two halves, each its own background; a
   `"side"` on every character), and `"toast"` on a turn for an app notification card. **Explainer with one presenter:** `"layout": "presenter"` and
   `"show": { "title", "bullets", "image" }` on a turn put titles, bullet points and pictures
   beside the character as they speak (`examples/scene-presenter/scene.json`).
   For a room with depth and a camera that changes angle (pan, push in, wide shot), add
   `"set"` and put `"view"` on turns (`examples/scene-3d/scene.json`; `references/hyperframes.md` → 3D sets).
   Someone arriving on a scooter: a `scooter` cutout with `"drive"` and `"rides"` on the person
   (`examples/scene-ride/scene.json`).
   Clinic care: `["bandage", "@pet"]`, `["putCone", "@pet"]` (both stay on the pet), `["readChart", 2]` (with
   `"holds": "clipboard"`), `["showXray", "<name>"]` at an `"xray"` viewer cutout standing beside the person.
   Hands on the pet: `["clipNails", "@pet"]`, `["eyeDrops", "@pet"]`, `["cleanEars", "@pet"]`, `["scanChip", "@pet", { "id": "900 123 456 789" }]`
   — the person goes to the pet's head end and the turn cuts to a close shot; the pet's paw / chin / eyes / head follow the hands
   by themselves (nothing to add for the pet). Scripts: "cắt móng", "nhỏ mắt", "vệ sinh tai" / "lau tai", "quét chip <số>".
   Two people together: `["highFive", "@boy"]`, `["hug", "@owner"]`, `["patShoulder", "@owner"]` (comfort), `["whisper", "@nurse"]`,
   `["handOverBag", "@owner"]` (with `"holds": "bag"` — a medicine bag held out in both hands; the owner gets a put-away bag to take it).
   Cashier / café (đợt 39 A): `["payByQR"]` / `["payByCard"]` (phone / bank card to a pay stand on the counter — added for you on the `reception` / `pharmacy` presets),
   `["giveChange", "@customer"]` (counts notes, hands them over), `["stampCard"]` / `["stampCard", "@customer"]`, `["pourDrink"]`, `["wipeCounter", 2]`.
   The other person's part is added at the same time and the two step to the right distance; an adult kneels or crouches to a child.
   Script words: "đập tay", "ôm", "vỗ vai" / "an ủi", "thì thầm" / "nói nhỏ", "đưa túi thuốc" / "đưa thuốc".
   `scene.py` warns when a view leaves someone half out of the frame — frame them in or leave them out.
   Light: `"set": { "light": "night", "lamps": [ … ] }` (`day`, `evening`, `night`), `"window": true` on a
   back-wall panel, `"lamp": "on"` on a turn — lamps glow (and flicker when switched on), light the room and the
   characters, cast shadows; windows light the characters too (backlight, sunlight patch, passing clouds); a
   `"tv"` cutout flickers in the evening / at night; furniture casts long shadows; a lens layer grades the
   frame (`"grain": false` in `"set"` drops the film grain — about 20 % faster to render, for drafts). `"sky": "night"` on a turn darkens the scene gradually; `"power": "off"` / `"on"` is a power cut;
   `["shine", "@cat"]` shines a flashlight that lights the room in a power cut (all of the light, with pictures and
   ready-to-run scripts: `references/lighting.md`, `examples/lighting/`). Long shadows climb the walls
   they reach; a lit floor reflects its colour onto legs and bellies.
   Easiest: `"camera": "auto"` at the top — the camera chooses every shot (speaker with listener, close on
   a pet's expression, never cutting faster than every 2.5 s). Or per turn: `"view": "close"` (a close shot of that turn's character, then back) or `{ "on": ["vet", "dog"],
   "size": "medium" }` — worked out for you. `"mark": "?"` puts a comic mark over a head; `"sounds": { "bark":
   "bark.wav" }` plays a sound each time an action plays.
   **Look at the moves first.** Before you write the script, see what each action looks like on the
   characters you cast: `sh tools/actions.sh <id> [--turned]` saves a review sheet (one row per
   action, six moments through it, run through `sequence()` exactly as the scene will), and
   `python3 tools/reel.py <id> [--turned] [--render | --clips]` builds a reel in which the
   character performs every action with its name on screen (and, with `--clips`, one mp4 per
   action). Both read `tools/action-catalog.json`; add an entry there for a new action.
2. **Build it.** `python3 tools/scene.py scene.json` → `<id>/index.html` next to the scene
   file, with the bundle, cues and audio beside it. Read its notes (lines starting `!`).
3. **Preview and look.** `sh tools/peek.sh <id>/index.html` prints every step's timing and
   every warning, and saves a contact sheet (`peek.png` next to the composition) — open it. Fix warnings; they say what to change.
   For details use bigger frames (`PEEK_WIDTH=960 PEEK_COLS=2 … 4,9`); for lip-sync use
   `--mouth=N` (a dense strip of mouth close-ups of the Nth spoken line).
   Lighting of a 3D scene: `python3 tools/light_audit.py <id> -o audit/` captures the moments that matter for
   the light (`moments.json`: power cut, sky turning, flashlight…) and writes yes / no questions in
   `audit/prompt.txt` — answer them from the frames (or hand both to a reviewer), then `--score answers.json`.
   The same moments carry the acting (hands reaching the pet or the other person, feet on the floor), and
   `python3 tools/acting_check.py <id>` measures it without anyone looking: palm-to-target distance and
   feet-to-floor offset as a share of the character's height, a carried pet held against the body, a seated person's
   seat on the sofa / bench, a pet put down next to the feet of whoever put it down, no furniture cut by the frame edge
   at any moment, a touched pet in view (≥ 70 %, head ≥ 60 %, measured from the pixels) with the touching hand in view
   (≥ 70 %) and on it, a seated person leaning no more than 25° to reach it, every automatic medium shot narrower than 85 % of the
   full shot, exit code 1 when a hand misses or a foot floats. `python3 tools/light_side.py <id>` measures
   from the pixels whether the half of each character facing the main light is brighter than the other half.
4. **Change what the scene file cannot say** by editing `index.html` — it is plain,
   commented HTML. Finish with the scene file first: after a hand edit the tool will not
   overwrite `index.html` (`--force` would discard your edit); if your edit moved the timing,
   run `python3 tools/scene.py --retime <id>/index.html` to fix the audio clips.
5. **Validate and render** with HyperFrames (`hyperframes lint`, `check`, `render`) —
   `references/hyperframes.md` → Validate and render.

**Writing a composition by hand** uses the same API the tool emits — setup, rules and
recipes are in [references/hyperframes.md](references/hyperframes.md); complete examples in
`examples/hyperframes/`, `conversation/`, `voiceover/`. Four rules that are easy to get wrong:

- **Classic `<script>`, synchronous, no fetch.** Load `dist/character.slim.js`, not the ES modules.
- **Seed first:** `VGCharacter.seed(n)` before any timeline, or two renders differ.
- **One `sequence()` (or `conversation()`) per character, never one `tl.add()` per action.**
- **Give a host a height, not a width.** Arms reach about 0.45 × height to each side.

### Where things are

| To… | Use | Details |
|---|---|---|
| chain one character's actions | `VGCharacter.sequence(rig, steps)` | `references/actions.md` |
| play a ready-made short scene (check-up, vaccination, greeting, sending a pet home) | a combo step: `['fullCheckup', pet]` | `references/actions.md` → Combos |
| have characters take turns | `VGCharacter.conversation(turns, { camera })` | `hyperframes.md` → Staging recipes |
| speak without audio / with audio | `['explain', text, dur]` / `['speakCues', cues]` + `tools/cues.py voice.wav --js` | `hyperframes.md` → Voice-over |
| set the tone of a line | `{ mood }` on the speaking step | `actions.md` → Tone of voice |
| show the words | `VGCharacter.captions(talk, element)` | `hyperframes.md` → Staging recipes |
| cut or push the camera | `VGCharacter.shot(scene, subject, 'face' \| 'chest' \| 'full' \| 'wide')` | `hyperframes.md` → Camera shots |
| keep someone seated or turned | `sitDown`, `standUp`, `['face', otherRig]`; `rig.state.seat = 1` to start seated | `actions.md` → Stance |
| add a chair, table, counter | `VGCharacter.createProp(host, kind, { for: rig })` | `actions.md` → Scene props |
| know every action and its length | — | `references/actions.md` |

## Pitfalls

The library throws on a duplicate id, an invalid config, non-hex colours and malformed
definition keys. These still go wrong without an error:

- **Missing required ids.** `hair` must contain `<g id="${p}-hair-front">`; `eye` must
  contain `<g id="${p}-eye-${side}">` wrapping `<g id="${p}-pupil-${side}">`; `accessories`
  must wrap everything in `<g id="${p}-accessories">`; `shoes` must have
  `id="${p}-shoe-${side}"`. `tools/check.sh` reports missing ones. (`kit.hair` and
  `kit.outfits` already satisfy this.)
- **Hats go in `hat`, not `hair`** — otherwise a dark wedge is painted across the hat when
  the head turns.
- **You inherit more than you see.** A base may carry a hat, glasses or a stethoscope:
  `references/slots.md` lists what each base sets and how to remove it.
- **Things draped over the shoulders go in `shoulderAccessories` as well as `accessories`**,
  or the sleeves cover them.
- **Always spread the base palette:** `colors: { ...base.colors, top: '#…' }`.
- **Long sleeves need `longSleeves: true`**, or the forearm is skin-coloured.
- **A bald head needs `backHair: 'low'` or `'none'`.**
- **`L` / `R` are screen sides**, not the character's own left and right.
- **A stale bundle.** Compositions load a copy of `dist/character.slim.js`. After changing a
  character, rebuild (`tools/check.sh` does) and re-copy it — or re-run `tools/scene.py`.
- **Do not overlap two actions on one character.** They tween the same joints.

## Files

```
SKILL.md        this file
references/     slots.md (definition keys, kit) · actions.md (actions, stance, props, API) ·
                hyperframes.md (scene files, composing, voice, camera, validate)
characters/     _template.js · samples · index.js (registry)
configs/        tuned numbers written by the studio, baked into dist/
dist/           character.slim.js (use this) · character.iife.js (same, commented) — generated
runtime/        the library sources (ES modules)
studio/         visual editor (Vietnamese UI)
examples/       hyperframes/ · conversation/ · voiceover/ · scene/ · scene-vertical/ · scene-presenter/ · scene-interact/
tools/          check.sh (everything, must PASS) · shot.sh (pose sheet) · describe.sh · gallery.sh ·
                scene.py (scene file → composition; --retime) · cues.py (mouth cues from audio) ·
                peek.sh (preview; --mouth) · lint-examples.sh (hyperframes lint / check; needs Node) ·
                build.py · serve.py · chrome_run.py
```

Requirements: Python 3; Chrome or Chromium for the tools that render (`CHROME=` if it is not
in a standard place); network access to load GSAP from the CDN. Node only for HyperFrames
itself and `lint-examples.sh`; `ffmpeg` only for non-WAV audio.
