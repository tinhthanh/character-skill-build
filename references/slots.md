# Character definitions (people)

A definition is a plain object returned by `define(base, kit)`:

```js
export default { id: 'my_character', base: 'vet', define: (base, kit) => ({ ...base, /* overrides */ }) };
```

`base` is the base character's definition, `kit` is the toolkit described at the end. Every
key you leave out comes from the base.

In the drawing functions, `p` is the rig's id prefix (use it for every `id`), `c` is the
resolved palette (`c.hair`, `c.top`, …) and `side` is `'L'` or `'R'` (screen left / right).

## What each base already sets

Know what you inherit before you override. "—" means none / off. For the exact numbers,
colours and rest pose a base carries right now, run `sh tools/describe.sh <id>`: it prints the
definition in this schema as JSON, including which optional parts (hat, face extras, beard,
shoulder accessories) the base actually draws.

| Base | Hair | `hat` | `faceExtras` | Top | `longSleeves` | `shoulderAccessories` | Rest pose | Extra colours |
|---|---|---|---|---|---|---|---|---|
| `default` | short | — | — | T-shirt, no outline (`colors.outline: null`) | — | — | arms down | — |
| `vet` | bun | — | — | wrap scrubs, chest-pocket text (`badgeText`) | — | stethoscope | hands clasped | — |
| `surgeon` | short | surgical cap, `backSkullColor: 'hat'` | — | boxy V-neck scrubs, mask at the neck | — | — | arms down | `hat`, `hatHighlight` |
| `nurse` | ponytail, tie in `colors.accent` | — | — | paw-print tunic, flared sleeves | — | — | arms slightly out | — |
| `doctor` | side parting | — | glasses, frame in `colors.accent` | long coat with lapels | `true` | stethoscope | hands clasped | `innerShirt`, `stethoscope` |
| `receptionist` | bob | — | — | blazer (coat outline), bow tie | `true` | — | hands clasped | `innerShirt` |

## Removing, replacing or borrowing a part

You cannot delete a key, only override it.

| To remove | Override |
|---|---|
| a hat | `hat: () => ''` — the back of the head falls back to the hair colour by itself |
| hair behind the head | `backHair: 'low'` (bald on top, hair from the ears down) or `'none'` (bald). Without it, a bald-on-top `hair` drawing still grows a full head of hair when the character turns |
| glasses or other face extras | `faceExtras: () => ''` |
| a beard | `beard: () => ''` |
| a stethoscope / lanyard | `shoulderAccessories: () => ''` **and** an `accessories` that does not draw it. For the coat, spread `kit.outfits.plainCoat` instead of `kit.outfits.coat` — same coat, no stethoscope |
| the chest-pocket text of `vet` | `badgeText: ''` (shows a paw mark instead) |
| the cartoon outline | `colors: { ...base.colors, outline: null }` |
| long sleeves | `longSleeves: false` |

To **borrow** a part from another character, read it from `kit.partsOf(id)`:

```js
faceExtras: kit.partsOf('doctor').faceExtras,     // her glasses, on any head
hair: kit.partsOf('nurse').hair,                  // the ponytail
hat: kit.partsOf('surgeon').hat, backSkullColor: 'hat',
colors: { ...base.colors, hat: '#237a6e', hatHighlight: '#4fb8a9' },   // a borrowed part needs its colours too
```

A borrowed drawing reads its colours from *your* palette, so add any extra colour keys it
uses (see the last column of the table above).

## Coordinate systems

Two, both with **y pointing down**.

**Head space** — origin at the centre of the head. Used by `hair`, `hat`, `eye`, `nose`,
`faceExtras`, `beard`.

| Landmark | Position |
|---|---|
| skull | x −50…50, top y ≈ −56, chin y ≈ +56 (set by `faceShape`) |
| eyes | (±`eyeSpacing`, `eyeY`), about (±20, 2) |
| eyebrows | y = `browY`, about −18 |
| mouth | y = `mouthY`, about 30 |
| ears | (±`earX`, 4), about ±51 |

**Torso space** — origin at the **hip**, y negative is up. Used by `top`, `sideShading`,
`collar`, `accessories`, `shoulderAccessories`.

| Landmark | Position |
|---|---|
| shoulders | (±35, −88); arm pivots at (±33, −90) |
| base of neck | (±13, −103); neck skin spans y −130…−96 |
| chest | y ≈ −60, half-width ≈ 26 |
| waist | y ≈ −30 |
| hem of a normal top | y ≈ +20 (a coat can go to +40; it is drawn over the thighs) |
| sleeve cap | covers \|x\| > 21 from y −100 down to the sleeve hem |

The frame (`viewBox`) is 400 × 470; the ground is at y = 428 and the character is centred on x = 200.

## Draw order on the head

Back to front. Later items cover earlier ones.

1. back-of-skull hair mass — generated according to `backHair`; hair colour, or the `backSkullColor` colour while a hat is drawn
2. face skin (`faceShape`)
3. `hair`
4. nape hair — generated when the head turns (according to `backHair`), clipped to the face outline
5. ears
6. `hat`
7. cheek blush
8. eyes (`eye`), eyebrows, `nose`
9. `faceExtras` — glasses, freckles
10. `beard` — beard, moustache
11. mouth — always on top

Items 8–11 shift and narrow together when the head turns.

`faceExtras` is **not** attached to the pupils. When a config moves or resizes the eyes
(`eyeSpacing`, `eyeY`, `eyeSize`), `faceExtras` is shifted and scaled by the same amount so
glasses stay on the eyes; it does not move when the character looks around or blinks. Set
`extrasFollowEyes: false` to switch that off. `beard` never follows the eyes.

## Drawing keys

| Key | Signature | Notes |
|---|---|---|
| `hair` | `(p, c) => svg` | **Must** contain `<g id="${p}-hair-front">` holding every hair shape visible from the front. An optional `<g id="${p}-hair-bun">` inside it (bun, ponytail) is pushed toward the back of the head when the character turns. |
| `hat` | `(p, c) => svg` | Hat or cap, above all hair layers. Set `backSkullColor: '<colour key>'` (e.g. `'hat'`) so the back of the head takes the hat colour when turned; the key must exist in `colors`. |
| `eye` | `(p, side, c) => svg` | One eye, drawn around (0,0). **Must** contain `<g id="${p}-eye-${side}">` (scaled to blink) wrapping `<g id="${p}-pupil-${side}">` (moved to look around). |
| `nose` | `(c) => svg` | |
| `faceExtras` | `(p, c) => svg` | Glasses, freckles. Head space. `kit.parts.roundGlasses(c)` is ready-made. |
| `beard` | `(p, c) => svg` | Beard and moustache. Head space. `kit.parts.shortBeard(c)`, `kit.parts.moustache(c)`. |
| `top` | `() => pathData` | Outline of the torso garment (a path `d` string), torso space. A plain straight top, drawn clockwise from the left hem: `'M -30 20 Q 0 26 30 20 L 29 -40 Q 29.5 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105 Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -29.5 -70 -29 -40 Z'`. Keep the shoulder part (from `35 -88` round to `-35 -88`) as it is so sleeves and neck meet it; change the sides and the hem. |
| `sideShading` | `pathData` | Side shading, must lie inside `top`. Build it with `kit.sideShading([[x, y], …])` from the right-hand edge points of `top`. Opacity is `sideShadingOpacity`. |
| `collar` | `(p, c) => svg` | Drawn over the neck. Start with `kit.shoulderPatches(c)` to cover the flare at the base of the neck. |
| `accessories` | `(p, c, def) => svg` | Everything on the torso: pockets, buttons, badges. **Must** be wrapped in `<g id="${p}-accessories">`. |
| `shoulderAccessories` | `(p, c, def) => svg` | A second copy of whatever hangs over the shoulders (stethoscope, lanyard, scarf). Drawn above the sleeves, clipped to the shoulder area. |
| `shoes` | `(p, side, c, ankleY) => svg` | Front-view shoe, in **shin space**: x = 0 is the middle of the leg, y grows downward, the ankle is at y = `ankleY` and the sole at about `ankleY + 12`; the leg is 22 units wide. A shoe spans roughly x −12…12, y `ankleY − 6`…`ankleY + 12`; start higher (say `ankleY − 26`) for a boot. **Must** carry `id="${p}-shoe-${side}"`. `kit.closedShoes(stripeColour or null)` returns a ready-made one. |

## Number keys

| Group | Keys | Meaning |
|---|---|---|
| proportions | `headSize` `neckDrop` `torsoScale` `legScale` | head scale, how far the head sinks onto the neck (bigger = shorter neck), torso scale, leg scale |
| arms | `upperArmLength` `forearmLength` `armThickness` `handSize` | multipliers, 1 = adult default |
| legs | `thighLength` `shinLength` `legThickness` `legGap` `footSize` | multipliers; `legGap` is the half-distance between the legs in units |
| sleeves | `sleeveLength` `sleeveSlant` `sleeveFlare` `sleeveHemWidth` `sleeveCornerRadius` `sleeveHemColor` `sleeveHemDash` `sleeveHemInset` | length, hem slant, flare, hem stroke width, inner-corner rounding, hem colour, hem dash pattern, hem inset |
| long sleeves | `longSleeves` | `true` paints the whole arm in the top's colour with a cuff |
| face outline | `faceShape: { halfWidth, crownHeight, chinLength, widestY, foreheadSquareness, jawSquareness, foreheadWidth, chinWidth }` | squareness runs −1 pointed … +1 square; the two widths are factors |
| eyebrows | `brows: { halfLength, thickness, arch, taper, slant }`, `browSpacing`, `browY` | `taper` 0–1; `slant` in degrees, + = tail up |
| face layout | `eyeSpacing` `eyeY` `eyeSize` `noseOffsetY` `noseSize` `mouthY` `mouthWidth` `lipWidth` `cheekX` `cheekY` `cheekRadius` `earX` | positions in head space, sizes as factors |
| turning | `featureTurnShift` `hairTurnShift` `bunTurnShift` | how far face features, fringe and bun shift when the head turns |
| outline | `colors.outline` (colour or `null`), `outlineWidth` | cartoon outline around clothing; `null` = flat style |

## Rest pose

`restPose` takes any state key. Every action returns to it, so a tilted head or a fist set
here survives a wave or a walk. The common ones:

| Key | Meaning |
|---|---|
| `upperArmL` `upperArmR` | degrees the upper arm is raised away from the body |
| `forearmL` `forearmR` | degrees the forearm bends; negative folds inward across the body |
| `smile` | −1 … 1 |
| `mouthOpen` `pucker` | 0 … 1 |
| `browL` `browR` | −1 (lowered, frowning) … 1 (raised) |
| `headTilt` | degrees |
| `handL` `handR` | `'relaxed'` · `'fist'` · `'thumb'` · `'point'` |

| `lean` | degrees the torso leans **sideways** (not forward; there is no forward stoop) |

Arms down ≈ `upperArm 10, forearm −13`; hands clasped at the belly ≈ `upperArm 17…19,
forearm −92…−97` (shorter forearms need a deeper fold); a hand on the hip ≈ `upperArm 34,
forearm −78` with `hand: 'fist'` (elbow out, fist at the waist).

## Palette (`colors`)

`skin` · `skinShadow` · `hair` · `hairHighlight` · `top` · `topShadow` · `trousers` ·
`shoes` · `iris` · `lips` · `cheeks` · `accent` · `outline` · `lineStroke` (colour for
drawn lines such as pocket edges).

Every value must be a hex colour (`#rgb` or `#rrggbb`); `outline` may also be `null`. CSS
colour names are rejected — shades are derived arithmetically from the hex value.

Add your own keys freely (`hat`, `innerShirt`, `scarf`…) and read them as `c.<key>` in the
drawing functions. Derived automatically when you do not set them: `brows` (from `hair`),
`mouthInside` and `tongue` (from `lips`), `lineStroke` (from `top`).

## Toolkit (`kit`)

| Member | Use |
|---|---|
| `kit.outfits.scrubs` | boxy V-neck scrubs with chest pocket and name tag |
| `kit.outfits.pawTunic` | round-neck tunic with paw prints, flared trimmed sleeves, two pockets, fob watch |
| `kit.outfits.coat` | long-sleeved coat with lapels, buttons, pockets, stethoscope; inner shirt colour is `colors.innerShirt` (falls back to `topShadow`), stethoscope `colors.stethoscope` (falls back to `accent`) |
| `kit.outfits.plainCoat` | the same coat without the stethoscope |
| `kit.outlines.<same names>` | the bare torso outlines, if you only want the shape |
| `kit.partsOf(id)` | another character's definition, to borrow parts from |
| `kit.parts.roundGlasses(c, { x, y, r, color })` | round glasses for `faceExtras` |
| `kit.parts.shortBeard(c, { color, chin, mouthY })` | short beard for `beard`; lower `chin` for a short face |
| `kit.parts.moustache(c, { color, mouthY })` | moustache for `beard` |
| `kit.sideShading(points)` | side shading from an outline's edge points |
| `kit.shoulderPatches(c)` | the two shoulder wedges every collar needs |
| `kit.closedShoes(stripe)` | closed-toe shoe |
| `kit.nameTag(x, y, bandColour, stroke)` | a name tag |
| `kit.pawPrint(x, y, scale, rotate)` | a paw print (wrap several in a `<g fill>`) |
| `kit.stethoscope(tubeColour, stroke)` | a stethoscope round the neck |

Spreading an outfit sets `top`, `sideShading`, `collar`, `accessories`,
`shoulderAccessories`, `shoes`, the sleeve numbers and `longSleeves`. Put your own overrides
**after** the spread.

## Configs

A config is the same numbers grouped for the studio, stored as `configs/<id>.json` and baked
into the bundle. Values are **absolute replacements** for the definition's values, not
multipliers of them: `{ "proportions": { "headSize": 1.4 } }` sets the head size to 1.4
whatever the definition says. Only the keys present are changed. `tools/describe.sh <id>`
shows the values a config would be replacing, and `tools/shot.sh <id>` renders the character
with its config applied (`--no-config` for the bare definition). Groups for people: `proportions`, `arms` (plus `restUpperArm`,
`restForearm`), `sleeves`, `legs`, `faceShape`, `brows`, `browPosition`, `features`
(`eyeSpacing`, `eyeY`, `eyeSize`, `noseOffsetY`, `noseSize`, `mouthY`, `mouthWidth`),
`restPose`, `colors`. `VGCharacter.validateConfig(config)` lists what is wrong with one.

## Pets

Dogs and cats use a separate rig; they are configured, not defined through drawing keys.

| Species | Notes |
|---|---|
| `dog` | golden puppy, floppy ears |
| `shiba` | pointed ears, curled tail |
| `cat` | grey tabby |
| `orange_cat` | orange tabby |
| `black_cat` | plain black, yellow eyes |

Config: `{ shape: { … }, colors: { … } }`.

- `shape` — `headSize`, `bodyLength`, `bodyThickness`, `legLength`, `tailLength`, `earSize`
  (multipliers, 1 = the breed's own) and `tailCurl` (−1…1, added to the curl). Values are
  clamped to sane ranges. `rig.setShape({ legLength: 0.7 })` changes it live.
- `colors` — `fur` · `furLight` (muzzle, chest, paws) · `furDark` (far legs and ears, derived
  from `fur`) · `stripes` (cats) · `iris` · `nose` · `collar` · `tag` · `earInner`.

A new breed is an entry added to the species table in `runtime/rig-thu.js`.
