# Actions

Every action is a method on the rig that **returns a paused GSAP timeline** and ends back at
the rest pose (except where noted). In a composition, sequence them with
`VGCharacter.kichBan(rig, steps)` rather than adding them one by one.

A step is `'name'`, `['name', ...args]`, or a number (extra pause in seconds).

## People — `VGCharacter.taoNhanVat(host, { khoa, config }).rig`

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, blink, glance | `dur` |
| `wave` | — | raise the right hand and wave | 2.3 |
| `thumbsUp` | — | fist to the chest, thumb out, small nod | 2.0 |
| `point` | `(target)` | point at a DOM element, or at `{ x, y }` in the rig's 400 × 470 frame; with no target, points right | 2.0 |
| `present` | — | open both arms to present | 2.2 |
| `nod` | — | nod twice | 1.4 |
| `shake` | — | shake the head | 1.5 |
| `shrug` | — | shrug with open palms | 1.7 |
| `speak` | `(text, dur = 2)` | mouth shapes paced to the syllable count of `text`, one gesture | `dur` + 0.5 |
| `giaiThich` | `(text, dur = 2.4)` | "explain": like `speak` with livelier head and hand gestures | `dur` + 0.6 |
| `loLang` | — | "worried": brows up, hands fidget | 2.1 |
| `march` | `(steps = 6)` | march on the spot, arms swinging | 2.7 |
| `stroll` | `(steps = 6)` | relaxed steps on the spot | 3.2 |
| `stepInPlace` | `(steps = 6)` | steps on the spot, arms still | 2.9 |
| `walkForward` | `(steps = 8)` | approach from far away (grows) | 3.5 |
| `walkAway` | `(steps = 8)` | walk into the distance and fade — **ends hidden** | 3.3 |
| `walk` | `(steps = 4, distance = 0)` | turn sideways and walk; `distance` 0 = on the spot, positive = move right, negative = move left, in frame units | 2.4 |
| `enter` | `(from = 'trai')` | walk in from off-frame; `'trai'` left, `'phai'` right | 1.6–2.1 |
| `exit` | `(to = 'phai')` | walk out of frame — **ends hidden** | 1.6–2.0 |

For `speak` / `giaiThich`, set `dur` to the length of the voice-over clip. Syllables are
counted per vowel group, so Vietnamese and English text both pace correctly.
`noiTheoCue(cue, dur, opts)` drives the mouth from timed viseme cues instead of an estimate;
read its doc comment in `runtime/rig-svg.js` before using it.

After `exit` or `walkAway` the character is invisible; use `enter` to bring it back.
A character keeps its horizontal position after `walk` with a distance.

## Dog — `VGCharacter.taoThuCung(host, { loai: 'cho' }).rig`

`idle(dur)` · `wagTail` · `bark(times = 2)` · `sit(hold = 1.6)` (sits, pants, stands) ·
`tiltHead` · `jump(times = 2)` · `beg` (up on hind legs, paws waving) · `givePaw` ·
`sniff` · `walk(steps, distance)` · `enter` · `exit`

## Cat — `VGCharacter.taoThuCung(host, { loai: 'meo' }).rig`

`idle(dur)` · `meow` · `purr` · `lickPaw` · `stretch` · `hiss` (arched back, puffed tail) ·
`tailSwish` · `tiltHead` · `pounce` · `walk(steps, distance)` · `enter` · `exit`

The cat rests **sitting**; actions that need it standing stand it up first.
`rig.DONG_TAC` lists the actions valid for that animal.

## Other rig methods

| Method | Use |
|---|---|
| `rig.datNghi()` | snap to the rest pose, centre of frame |
| `rig.doiMau({ ao: '#…' })` | recolour; dependent shades follow |
| `VGCharacter.napBoSo(rig, config)` | apply a studio config object |
| `VGCharacter.danhSach()` | list character ids and action names |
| `rig.s` | the live state object (joint angles etc.) for custom tweens; call `rig.apDung()` after writing to it outside a rig timeline |
