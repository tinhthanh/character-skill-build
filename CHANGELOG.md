# Changelog

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
