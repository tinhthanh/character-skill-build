# Character slots (people)

A definition is a plain object. `dinhNghia(goc, kit)` returns `{ ...goc, …overrides }`,
where `goc` is the base character's definition and `kit` is the toolkit exported from
`runtime/characters.js`. Every slot you leave out comes from the base.

In the drawing functions, `p` is the rig's id prefix (use it for every `id`), `m` is the
resolved palette, and `ben` is `'L'` or `'R'` (screen left / right).

## Coordinate systems

Two, both with **y pointing down**.

**Head space** — origin at the centre of the head. Used by `toc`, `mu`, `mat`, `mui`, `net`.

| Landmark | Position |
|---|---|
| skull | x −50…50, top y ≈ −56, chin y ≈ +56 (set by `khuon`) |
| eyes | (±`matX`, `matY`), about (±20, 2) |
| eyebrows | y = `mayY`, about −18 |
| mouth | y = `miengY`, about 30 |
| ears | (±`taiX`, 4), about ±51 |

**Torso space** — origin at the **hip**, y negative is up. Used by `ao`, `suon`, `coAo`,
`phuKien`, `phuKienTren`.

| Landmark | Position |
|---|---|
| shoulders | (±35, −88); arm pivots at (±33, −90) |
| base of neck | (±13, −103); neck skin spans y −130…−96 |
| chest | y ≈ −60, half-width ≈ 26 |
| waist | y ≈ −30 |
| hem of a normal top | y ≈ +20 (a coat can go to +40; it is drawn over the thighs) |
| sleeve cap | covers \|x\| > 21 from y −100 down to the sleeve hem |

Frame (`viewBox`) is 400 × 470; the ground is at y = 428 and the character is centred on x = 200.

## What each base already sets

Know what you inherit before you override. "—" means the default (none / off).

| Base | Hair | Hat (`mu`) | Face extras (`net`) | Top | `tayDai` | Over the shoulders (`phuKienTren`) | Rest pose | Extra palette keys |
|---|---|---|---|---|---|---|---|---|
| `mac_dinh` | short | — | — | T-shirt, no outline (`mau.vien: null`) | — | — | arms down | — |
| `bac_si_thu_y` | bun (`tocBui`) | — | — | wrap scrubs, chest pocket badge (`huyHieu`) | — | stethoscope | hands clasped | — |
| `bs_nam` | short | surgical cap, `mauSoSau: 'mu'` | — | boxy V-neck scrubs, mask at the neck | — | — | arms down | `mu`, `muSang` |
| `dieu_duong` | ponytail, tie in `mau.phuKien` | — | — | paw-print tunic, flared sleeves | — | — | arms slightly out | — |
| `bs_kinh` | side parting | — | glasses, frame in `mau.phuKien` | long coat with lapels | `true` | stethoscope | hands clasped | `aoTrong`, `ongNghe` |
| `le_tan` | bob | — | — | blazer (coat outline), bow tie | `true` | — | hands clasped | `aoTrong` |

## Removing or replacing an inherited part

You cannot delete a slot, only override it. To drop something the base has:

| To remove | Override |
|---|---|
| a hat | `mu: () => ''` — the back of the head falls back to the hair colour by itself |
| glasses or other face extras | `net: () => ''` |
| a stethoscope / lanyard | `phuKienTren: () => ''` **and** a `phuKien` that does not draw it. For `kit.boDo.aoBlouse` that means writing your own `phuKien` (copy the one in `characters/le_tan.js`); the outfit's own one includes the stethoscope |
| the chest-pocket text of `bac_si_thu_y` | `huyHieu: ''` (shows a paw mark instead) |
| the cartoon outline | `mau: { ...goc.mau, vien: null }` |
| long sleeves | `tayDai: false` |

Parts live in the base they were written for; there is no way to take, say, the glasses of
`bs_kinh` onto a `bs_nam` head other than drawing them again in your own `net`. Round
glasses are about ten lines: two `<circle r="11">` at (±20, 2), a bridge path, two temple
lines out to x = ±48.

## Draw order on the head

Back to front. Later items cover earlier ones.

1. back-of-skull hair mass — generated; hair colour, or the `mauSoSau` colour when there is a hat
2. face skin (`khuon`)
3. `toc()` — your hair
4. nape hair — generated when the head turns, clipped to the face outline
5. ears
6. `mu()` — hat
7. cheek blush
8. eyes (`mat()`), eyebrows, nose (`mui()`)
9. `net()` — glasses, freckles, **facial hair**
10. mouth — always on top

All of 8–10 shift and narrow together when the head turns.

**Beards and moustaches go in `net()`**, in head space (same origin as hair: centre of the
head). The mouth is drawn after it, so a beard shape can simply cover the chin and upper lip
area and the mouth stays visible. A short beard: a path hugging the jaw from about (−40, 14)
down through the chin at y ≈ 52 and back up to (40, 14), with a notch around the mouth at
y ≈ 30.

`net()` is **not** attached to the pupils. "Follows the eyes" means: when a config moves or
resizes the eyes (`matX`, `matY`, `matCo`), `net()` is shifted and scaled by the same amount so
glasses stay on the eyes. It does not move when the character looks around or blinks. Set
`netTheoMat: false` to switch even that off (use it for a beard-only `net`, so retuning the
eyes does not stretch the beard).

## Drawing slots

| Slot | Signature | Notes |
|---|---|---|
| `toc` | `(p, m) => svg` | Hair. **Must** contain `<g id="${p}-tocTruoc">` holding every hair shape visible from the front. An optional `<g id="${p}-tocBui">` inside it (bun, ponytail) is pushed toward the back of the head when the character turns. Hair behind the skull is generated by the rig. |
| `mu` | `(p, m) => svg` | Hat or cap, drawn above all hair layers. Set `mauSoSau: '<palette key>'` so the back of the head takes the hat colour when turned; it is ignored while `mu` draws nothing. The key must exist in `mau`. |
| `mat` | `(p, ben, m) => svg` | One eye, drawn around (0,0). **Must** contain `<g id="${p}-mat${ben}">` (scaled to blink) wrapping `<g id="${p}-nguoi${ben}">` (moved to look around). |
| `mui` | `(m) => svg` | Nose. |
| `net` | `(p, m) => svg` | Extra face detail in **head space**: glasses, freckles, beard. Drawn above eyes and nose, below the mouth. See *Draw order on the head*. |
| `ao` | `() => pathData` | Outline of the torso garment (a path `d` string). |
| `suon` | `pathData` | Side shading, must lie inside `ao`. Build it with `kit.suonTu([[x, y], …])` from the right-hand edge points of `ao`. Opacity is `damSuon`. |
| `coAo` | `(p, m) => svg` | Collar, drawn over the neck. Start with `kit.vaiCo(m)` to cover the flare at the base of the neck. |
| `phuKien` | `(p, m, nv) => svg` | Everything on the torso: pockets, buttons, badges, stitching. **Must** be wrapped in `<g id="${p}-phuKien">`. |
| `phuKienTren` | `(p, m, nv) => svg` | A second copy of whatever hangs over the shoulders (stethoscope, lanyard, scarf). Drawn above the sleeves, clipped to the shoulder area. Return `''` if nothing does. |
| `giay` | `(p, ben, m, ong) => svg` | Front-view shoe; `ong` is the ankle's y. **Must** carry `id="${p}-ban${ben}"`. `kit.giayKin(stripeColour or null)` gives a closed shoe. |

## Numbers

| Group | Keys | Meaning |
|---|---|---|
| proportions | `coDau` `dauLech` `coThan` `coChan` | head size, how far the head sinks onto the neck (bigger = shorter neck), torso scale, leg scale |
| arms | `daiCanhTay` `daiCangTay` `dayTay` `coBanTay` | upper-arm length, forearm length, thickness, hand size |
| legs | `daiDui` `daiOng` `dayChan` `cachChan` `coBanChan` | thigh, shin, thickness, half-gap between legs, foot size |
| sleeves | `daiTayAo` `xeoTayAo` `rongTayAo` `vienGau` `boGocTayAo` `mauGau` `netGau` `lechGau` | length, hem slant, flare, hem stroke width, inner-corner rounding, hem colour, hem dash pattern, hem inset |
| long sleeves | `tayDai` | `true` paints the whole arm in the top's colour with a cuff |
| face outline | `khuon: { rong, cao, cam, yRong, tranVuong, hamVuong, rongTran, rongCam }` | half-width, crown height, chin length, height of the widest point, forehead / jaw squareness (−1 pointed … +1 square), forehead / chin width factors |
| eyebrows | `may: { dai, day, cong, thon, xech }`, `mayX`, `mayY` | half-length, thickness, arch, taper (0–1), slant in degrees (+ = tail up), spacing, height |
| face layout | `matX` `matY` `matCo` `muiY` `muiCo` `miengY` `miengRong` `moiRong` `maX` `maY` `maRong` `taiX` | eye spacing / height / size, nose offset / size, mouth height / width, lip stroke, cheek blush x / y / radius, ear x |
| turning | `netLech` `tocLech` `buiLech` | how far face features, fringe and bun shift when the head turns |
| outline | `mau.vien` (colour or `null`), `vienRong` | cartoon outline around clothing; `null` = flat style |
| rest pose | `nghi: { batL, batR, cangL, cangR, cuoi, mieng, chum, mayL, mayR, … }` | any state key; see below |

Rest-pose angles are in degrees: `bat*` raises the upper arm away from the body, `cang*` bends
the forearm (negative = folds inward across the body). Arms down ≈ `bat 10, cang −13`; hands
clasped at the belly ≈ `bat 17…19, cang −92…−97` (shorter forearms need a deeper fold).
`cuoi` −1…1 is the smile, `mieng` 0…1 opens the mouth.

## Palette (`mau`)

`da` skin · `daToi` skin shadow · `toc` hair · `tocSang` hair highlight · `ao` top ·
`aoToi` top shadow · `quan` trousers · `giay` shoes · `mat` iris · `mieng` lips ·
`ma` cheek blush · `phuKien` accent · `vien` outline · `vienNet` stroke colour for drawn lines.

Every value must be a hex colour (`#rgb` or `#rrggbb`); `vien` may also be `null`. CSS colour
names are rejected — shades are derived arithmetically from the hex value.

Add your own keys freely (`mu`, `aoTrong`, `ongNghe`…) and read them as `m.<key>` in the
drawing slots. Derived automatically when you do not set them: `may` (from `toc`),
`miengToi` and `luoi` (from `mieng`), `vienNet` (from `ao`).

## Toolkit (`kit`)

| Member | Use |
|---|---|
| `kit.boDo.doMo` | boxy V-neck scrubs with chest pocket and name tag (spread into the definition) |
| `kit.boDo.aoDauChan` | round-neck tunic with paw prints, flared trimmed sleeves, two pockets, fob watch |
| `kit.boDo.aoBlouse` | long-sleeved coat with lapels, buttons, pockets, stethoscope; inner shirt colour is `mau.aoTrong`, stethoscope `mau.ongNghe` |
| `kit.AO.<same keys>` | the bare torso outlines, if you only want the shape |
| `kit.suonTu(points)` | side shading from an outline's edge points |
| `kit.vaiCo(m)` | the two shoulder wedges every collar needs |
| `kit.giayKin(stripe)` | closed-toe shoe slot |
| `kit.theTen(x, y, bandColour, stroke)` | a name tag |
| `kit.dauChan(x, y, scale, rotate)` | a paw print (wrap several in a `<g fill>`) |
| `kit.ongNgheVatCo(tube, stroke)` | a stethoscope round the neck |

Spreading an outfit overrides the base's `ao`, `suon`, `coAo`, `phuKien`, `phuKienTren`,
`giay`, the sleeve numbers and `tayDai`. Put your own overrides **after** the spread.

## Pets

Dogs and cats use a separate rig and are not defined through slots. Colours only, via the
palette keys `long` fur · `longSang` light fur (muzzle, chest, paws) · `longToi` far legs and
ears (derived from `long`) · `dom` stripes (cat) · `mat` · `mui` nose · `vongCo` collar ·
`the` tag. A new breed means adding an entry to `LOAI` in `runtime/rig-thu.js` with its own
head-drawing function.
