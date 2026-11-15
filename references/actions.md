# Actions

Every action is a method on the rig that **returns a paused GSAP timeline** and ends back at
the rest pose (except where noted). In a composition, sequence them with
`VGCharacter.sequence(rig, steps)` rather than adding them one by one.

A step is `'name'`, `['name', ...args]`, or a number (extra pause in seconds).

## People — `VGCharacter.createCharacter(host, { id, config }).rig`

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
| `explain` | `(text, dur = 2.4)` | like `speak` with livelier head and hand gestures | `dur` + 0.6 |
| `speakCues` | `(cues, dur, opts)` | lip-sync from timed Rhubarb mouth cues instead of an estimate | cue length |
| `worry` | — | brows up, hands fidget | 2.1 |
| `express` | `(name = 'happy', hold = 1.2)` | a facial expression held, then released: `happy` · `sad` · `surprised` · `angry` · `thinking` | `hold` + 0.7 |
| `turn` | `(direction = 'right', hold = 1.5, amount = 0.55)` | turn to a three-quarter view (`amount` 1 = full profile), hold, face front again | `hold` + 0.8 |
| `sit` | `(hold = 2)` | sit down as on an unseen chair, hands on the lap, stand up again | `hold` + 0.95 |
| `march` | `(steps = 6)` | march on the spot, arms swinging | 2.7 |
| `stroll` | `(steps = 6)` | relaxed steps on the spot | 3.2 |
| `stepInPlace` | `(steps = 6)` | steps on the spot, arms still | 2.9 |
| `walkForward` | `(steps = 8)` | approach from far away (grows) | 3.5 |
| `walkAway` | `(steps = 8)` | walk into the distance and fade — **ends hidden** | 3.3 |
| `walk` | `(steps = 4, distance = 0)` | turn sideways and walk; `distance` 0 = on the spot, positive = move right, negative = move left, in frame units | 2.4 |
| `enter` | `(from = 'left')` | walk in from off-frame, from the `'left'` or the `'right'` | 1.6–2.1 |
| `exit` | `(to = 'right')` | walk out of frame to the `'right'` or the `'left'` — **ends hidden** | 1.6–2.0 |

For `speak` / `explain`, set `dur` to the length of the voice-over clip. Syllables are
counted per vowel group, so Vietnamese and English text both pace correctly.

After `exit` or `walkAway` the character is invisible; use `enter` to bring it back.
A character keeps its horizontal position after `walk` with a distance. `sit` draws no
chair; put one in the composition behind the character if the scene needs it.

## Pets — `VGCharacter.createPet(host, { species, config }).rig`

All pets stand side-on with the **head toward screen right** and the face turned to the
viewer. `walk` with a negative distance turns the animal round first.

**Dogs** (`dog`, `shiba`) rest standing:

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, blink, gentle tail wag, ear flick | `dur` |
| `wagTail` | — | fast wag, wiggling hips, tongue out | 1.9 |
| `bark` | `(times = 2)` | head jerks up, mouth snaps open | 1.4 |
| `sit` | `(hold = 1.6)` | sit, pant, stand up again | `hold` + 0.9 |
| `tiltHead` | — | tilt one way, then the other | 2.3 |
| `jump` | `(times = 2)` | happy hops | 2.0 |
| `beg` | — | up on the hind legs, front paws waving | 2.3 |
| `givePaw` | — | sit and offer a front paw | 1.9 |
| `sniff` | — | nose to the ground | 1.8 |
| `walk` | `(steps = 4, distance = 0)` | trot on the spot, or `distance` frame units | 1.4 on the spot |
| `enter` | — | run in from the left, stop at centre | 2.6 |
| `exit` | — | run out to the right — **ends hidden** | 2.4 |

**Cats** (`cat`, `orange_cat`, `black_cat`) rest **sitting**; actions that need them standing
stand them up first:

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, slow blink, tail tip sways | `dur` |
| `meow` | — | head up, mouth open, eyes squint | 1.3 |
| `purr` | — | eyes closed, smiling, body trembles, head rubs | 2.0 |
| `lickPaw` | — | raise a front paw and lick it | 2.2 |
| `stretch` | — | chest to the floor, rump up, yawn | 2.4 |
| `hiss` | — | arched back, puffed tail, flat ears, slit pupils | 2.0 |
| `tailSwish` | — | slow wide tail swish | 2.4 |
| `tiltHead` | — | tilt one way, then the other | 2.3 |
| `pounce` | — | crouch, wiggle, leap | 2.4 |
| `walk` | `(steps = 4, distance = 0)` | walk on the spot, or `distance` frame units | 1.7 on the spot |
| `enter` | — | run in from the left, stop at centre | 2.6 |
| `exit` | — | run out to the right — **ends hidden** | 2.7 |

`rig.actions` lists the actions valid for that rig. Distances for pets are in the pet frame,
400 × 330 units.

Exact durations for a given composition: `tools/peek.sh <index.html>` prints the start and
end of every step.

## Library and rig API

| Call | Use |
|---|---|
| `VGCharacter.createCharacter(host, { id, config })` | build a person; returns `{ rig, id }`. Omit `config` to use the one baked into the bundle; pass `null` to ignore it |
| `VGCharacter.createPet(host, { species, config })` | build a pet |
| `VGCharacter.sequence(rig, steps, { gap })` | one paused timeline from a list of actions; step timings in `.data.steps` |
| `VGCharacter.seed(n)` | fix all randomness; `null` restores `Math.random` |
| `VGCharacter.list()` | ids, action names, expression names, baked config ids |
| `VGCharacter.validateConfig(config, kind)` | list a config's problems (`kind`: `'person'` or `'pet'`) |
| `VGCharacter.applyConfig(rig, config)` | apply a config to an existing rig; throws on an invalid one |
| `VGCharacter.registerCharacter({ id, base, define })` | register a character at run time (what `characters/index.js` does) |
| `VGCharacter.VERSION` | library version |
| `rig.reset()` | snap to the rest pose, centre of frame |
| `rig.setColors({ top: '#…' })` | recolour; dependent shades follow |
| `rig.state` | live state by name (`rig.state.smile = 1`, `rig.state.upperArmR`, `rig.state.x`…); the picture redraws itself |
| `rig.render()` | redraw now |
| `rig.setShape({ … })` | pets only: change body shape |
