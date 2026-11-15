# Changelog

## 0.8.0

Added
- `kit.hair`: eleven ready-made hairstyles — `crop`, `sidePart`, `bob`, `long`, `ponytail`,
  `bun`, `pigtails`, `curly`, `spiky`, `tufts`, `bald` — used as `hair: kit.hair.bob()`.
- `kit.outfits.dress`, `hoodie` and `suit` (`colors.tie`, `colors.drawstrings`).
- `kit.bodies`: proportion presets `child`, `teen`, `adult`, `tall`, `stocky`, each with a
  suggested `hostScale` for scenes shared with adults.
- Sample characters `girl`, `boy` and `manager`, built from kit presets with no SVG.
- `tools/check.sh` tries every hairstyle, outfit and body preset on every built-in base.

Fixed
- Spreading `kit.outfits.scrubs` on a character without a hat colour threw "backSkullColor
  names a colour that is not in colors"; a valid colour name the character does not define now
  falls back to the hair colour.
- Outfits on `base: 'default'` produced `fill="undefined"`: the accent and hair-highlight
  colours are now derived when a character does not define them.
- The back hair of `backHair: 'low'` had a pointed, star-like front edge when turned.

## 0.7.1

Fixed
- The last frame of a `sequence()` stopped a fraction short of the final state (a pet ending
  a walk faced 0.998 instead of 1). The end of a sequence is now exact.

Added
- `tools/lint-examples.sh` runs `hyperframes lint` on every example; CI runs it on each push.
- `tools/describe.sh` reports a character's `skirt` and whether it holds items.
- README and `characters/_template.js` cover skirts, posture, held items, stance and props.

## 0.7.0

Added
- Scene props: `VGCharacter.createProp(host, 'chair' | 'stool' | 'table' | 'counter', options)`,
  drawn in the person frame so they line up with a character that shares `bottom` and
  `height`; `for: rig` puts the seat at that character's sitting height (`rig.seatY()`).
- Pets hold a stance: `sitDown()`, `standUp()`, `face(direction | element | rig)`; `walk`
  returns to the held facing. People and pets can `face` each other.
- Config group `posture`: `stoop`, `skirtLength`, `skirtFlare`.
- Studio: a **Dáng & váy** group (stoop, skirt length and flare) and stance buttons in the
  bottom bar (sit, face left / right, put the held item away) that stay in force while
  actions play.
- `tools/peek.sh`: `PEEK_WIDTH` and `PEEK_COLS` for bigger frames.
- `examples/conversation` uses the chair and table props.

Changed
- Pet actions now end in the `seated` / `facing` they started with (as people do since 0.5.0).
  Nothing changes for compositions that never sit a dog down or turn a pet.

## 0.6.0

An independent agent trial of 0.5.2 produced most of the fixes and documentation changes below.

Added
- A hand that holds an item keeps its grip: actions that would open or point that hand
  (`present`, `shrug`, `explain`…) leave it closed around the item instead of showing the item
  stuck to an open palm.
- `wave(hand)` and `thumbsUp(hand)` take `'L'`, `'R'` or `'auto'` (default): the right hand,
  unless it holds an item and the left does not.
- `rig.centerX()`: the character's centre on screen in px, including the distance walked.
- `examples/conversation/`: two characters taking turns — one seated from the first frame,
  each facing the other.
- Docs: starting a scene already seated or turned; seated heights for counters; L / R are
  screen sides; every option of `kit.parts.*`; adding to an outfit's `accessories`.
- `tools/peek.sh` warns when a character that did `face(other)` later has `other` on the
  opposite side (someone walked past).
- `tools/peek.sh` also warns when an `enter` starts with the head already inside the frame,
  and its default frames now include 0 s.

Fixed
- Hand gestures while turned (`face` then `wave`, `present`, `explain`…) drew the raised arm as
  a flat spike. Arm actions now open the body to at most 0.2 for their duration and return to
  the held facing.
- Both examples started with the entering character already visible mid-frame; they now enter
  from outside the frame and walk to their mark. `examples/hyperframes` is 17 s.
- `face(rig)` / `face(element)` ignored the distance a character had walked and could turn it
  the wrong way after `walk` with a distance.

## 0.5.2

Fixed
- A config with rest arm angles (`arms.restUpperArm` / `restForearm`, written by the studio)
  set both arms to the same angle, flattening characters whose arms rest differently
  (`barista`, `clerk`). The numbers are now the right arm's; the left arm keeps the offset the
  character defines. Symmetric characters are unchanged.

Added
- `registerCharacter` rejects wrong values instead of drawing something else: `skirt` that is
  not `{ kind: 'skirt' | 'apron', length, flare }` (strings, unknown or misspelt keys, values
  out of range), `stoop` outside 0…1, and drawing keys (`hair`, `accessories`, `heldItemR`, …)
  that are not functions or do not return a string.
- `tools/check.sh` loads the pose sheet and the gallery and counts their panels, so a broken
  review tool fails the check (0.5.0 shipped a pose sheet with no action panels).

## 0.5.1

Added
- Sample characters in `characters/`, each showing a different part of the vocabulary:
  `barista` (T-shirt, apron, cup), `granny` (grey hair, wrinkles, stoop, long skirt),
  `grandpa` (bald crown, moustache, glasses, cardigan), `clerk` (shirt, clipboard). They are
  registered, so they can be used as `id` or as a `base`.
- `tools/gallery.sh`: one picture of every registered character (`docs/characters.png`).

Fixed
- The pose sheet (`tools/shot.sh`) lost its action panels in 0.5.0; they are back, and the
  picture is tall enough to show the two stance panels.

## 0.5.0

Added
- Held stance: `sitDown()`, `standUp()` and `face(target, amount)` change how the character
  stands and keep it — actions that follow (speak, nod, wave…) play seated or turned. `face`
  takes `'left'`, `'right'`, `'front'`, a DOM element or another rig.
- `skirt: { kind: 'skirt' | 'apron', length, flare }`: a lower garment generated over the legs
  that follows the walk, the seat and the turn. Colour `colors.skirt`.
- `heldItemL` / `heldItemR` drawing keys (wrist space) with state keys `itemL` / `itemR` and the actions
  `hideItem(side)` / `showItem(side)`;
  ready-made `kit.parts.cup`, `clipboard`, `phone`.
- `stoop` (0…1): bent-back posture.
- Everyday outfits `kit.outfits.tee` and `kit.outfits.shirt` (`colors.buttons`); parts
  `kit.parts.wrinkles` and `kit.parts.apronBib`.
- The pose sheet shows "sitDown → explain" and "face left → wave".

Fixed
- `registerCharacter` with `base: 'default'` threw "backSkullColor names a colour that is not in
  colors" (the default base has an empty palette).

Changed
- Every action now ends in the `seat`, `facing` and held-item visibility it started with rather
  than resetting them. Nothing changes for compositions that never set them; `enter` still ends standing and
  facing front.

## 0.4.1

Fixed
- `tools/check.sh`, `shot.sh`, `describe.sh` and `peek.sh` exited with status 143 even on
  success: the cleanup added in 0.4.0 let the stopped dev server's status become the script's
  own. Exit codes are now 0 on success and 1 on failure, under `sh`, `bash` and `dash`. (This
  is what the first CI run caught.)

## 0.4.0

Fixed
- `restPose.headTilt` and `restPose.handL` / `handR` are honoured: `idle` no longer returns the
  head to upright and actions return hands to the character's own rest shape.
- `sit` keeps the ground shadow under the feet.
- `sequence()` returns a pre-sampled timeline. Seeking to a time from before and from after
  now gives the same state for every action (previously `enter`, `walkForward` and `walkAway`
  placed mid-sequence could differ in position and opacity).
- `tools/shot.sh` applies `configs/<id>.json` (`--no-config` to skip it).

Added
- `backHair: 'full' | 'low' | 'none'` for bald or balding heads.
- `tools/describe.sh <id>`: a character's current definition in the public schema, as JSON.
- `tools/peek.sh` warns when two characters speak at the same time.
- A GitHub Actions workflow that runs `tools/check.sh`.

Changed
- Error messages, tool output, pose-sheet labels and the character template are in English;
  check failures name keys by their public names. `list()` returns English display names.
- Pose-sheet expression panels are labelled with the expression.
- `tools/doc-kq.py` is now `tools/check_report.py`; tools take `PORT=` instead of `CONG=`.

## 0.3.0

**Breaking: the public API, the definition schema and the config schema are now English.**

| Before | Now |
|---|---|
| `taoNhanVat(host, { khoa, config })` | `createCharacter(host, { id, config })` |
| `taoThuCung(host, { loai })` | `createPet(host, { species })` |
| `kichBan(rig, steps)` | `sequence(rig, steps)` |
| `gieo(n)` · `danhSach()` · `napBoSo(rig, c)` | `seed(n)` · `list()` · `applyConfig(rig, c)` |
| `dangKyTuyChinh({ id, dua, dinhNghia })` | `registerCharacter({ id, base, define })` |
| ids `bac_si_thu_y` `bs_nam` `dieu_duong` `bs_kinh` `le_tan` `mac_dinh` | `vet` `surgeon` `nurse` `doctor` `receptionist` `default` |
| species `cho` `meo` | `dog` `cat` |
| actions `giaiThich` `loLang` `noiTheoCue` | `explain` `worry` `speakCues` |
| `enter('trai' / 'phai')`, `exit('phai' / 'trai')` | `enter('left' / 'right')`, `exit('right' / 'left')` |
| definition keys `toc`, `mu`, `mau`, `nghi`, `coDau`, … | `hair`, `hat`, `colors`, `restPose`, `headSize`, … (full table: `references/slots.md`) |
| required ids `-tocTruoc`, `-mat${ben}`, `-nguoi${ben}`, `-phuKien`, `-ban${ben}` | `-hair-front`, `-eye-${side}`, `-pupil-${side}`, `-accessories`, `-shoe-${side}` |
| config groups `than`, `tay`, `khuon`, `mau`, … | `proportions`, `arms`, `faceShape`, `colors`, … |
| `kit.boDo.doMo / aoDauChan / aoBlouse` | `kit.outfits.scrubs / pawTunic / coat` |

The rigs' internals keep their Vietnamese names; `runtime/schema.js` translates.

Added
- `beard` slot, drawn between glasses and mouth.
- `kit.partsOf(id)` to borrow any part from another character; `kit.parts.roundGlasses`,
  `shortBeard`, `moustache`.
- Actions `express(name, hold)` (happy, sad, surprised, angry, thinking), `turn(direction,
  hold, amount)` and `sit(hold)`.
- Pets: breeds `shiba`, `orange_cat`, `black_cat`; seven-dial body shape via
  `config.shape` / `rig.setShape()`; shape panel in the studio.
- Configs in `configs/` are baked into the bundle; `createCharacter(host, { id })` returns the
  tuned character with no inline config.
- `dist/character.slim.js`: the bundle without comment lines (about 40% smaller).
- `rig.state` (named live state), `rig.setColors()`, `rig.reset()`, `rig.render()`,
  `rig.actions`, `VERSION`.

Changed
- Config files written by the studio use the English schema. Configs saved by 0.2.0 must be
  re-saved.
- Comments no longer point at files that are not in this repository.
- The repository is now under the MIT License.

## 0.2.0

- Invalid configs, non-hex colours and duplicate character ids throw instead of rendering a
  broken character.
- `tools/peek.sh`: preview a HyperFrames composition without rendering.
- Sequences carry their step timings in `.data`.
- Fixed: characters snapping back after `enter` when rendered by a frame-seeking renderer;
  the back of the head keeping a removed hat's colour.

## 0.1.0

- First release: people rig, pet rig, studio, single-file bundle, HyperFrames example.
