# Actions

Every action is a method on the rig that **returns a paused GSAP timeline** and ends back at
the rest pose (except where noted). In a composition, sequence them with
`VGCharacter.sequence(rig, steps)` rather than adding them one by one.

A step is `'name'`, `['name', ...args]`, or a number (extra pause in seconds, on top of the
0.1 s gap that separates every two steps). `sequence`
inserts a 0.1 s gap between consecutive steps by default; change it with
`sequence(rig, steps, { gap: 0 })`.

## People — `VGCharacter.createCharacter(host, { id, config }).rig`

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, blink, glance | `dur` |
| `wave` | `(hand = 'auto')` | raise a hand and wave | 2.3 |
| `thumbsUp` | `(hand = 'auto')` | fist to the chest, thumb out, small nod | 2.0 |
| `point` | `(target)` | point at a DOM element, or at `{ x, y }` in the rig's 400 × 470 frame; with no target, points right | 2.0 |
| `present` | — | open both arms to present | 2.2 |
| `nod` | — | nod twice | 1.4 |
| `shake` | — | shake the head | 1.5 |
| `shrug` | — | shrug with open palms | 1.7 |
| `cheer` | — | both arms up and two little hops, beaming — the one whole-body "happy" (seated: arms only; a hand holding an item stays down) | 1.9 |
| `speak` | `(text, dur = 2, { mood })` | mouth shapes paced to the syllable count of `text`, one gesture | `dur` + 0.55 |
| `explain` | `(text, dur = 2.4, { mood })` | like `speak` with livelier head and hand gestures | `dur` + 0.55 |
| `speakCues` | `(cues, dur, { cuChi, mood })` | lip-sync from the audio's mouth cues (made by `tools/cues.py`) instead of an estimate; gestures on the pauses. `{ cuChi: false }` keeps the hands still | audio length + 0.55 |
| `worry` | — | brows up, hands fidget | 2.1 |
| `express` | `(name = 'happy', hold = 1.2)` | a facial expression held, then released: `happy` · `sad` · `surprised` · `angry` · `thinking` · `laughing` · `worried` · `confused` · `tired` | `hold` + 0.7 |
| `turn` | `(direction = 'right', hold = 1.5, amount = 0.55)` | turn to a three-quarter view (`amount` 1 = full profile), hold, face front again | `hold` + 0.8 |
| `sit` | `(hold = 2)` | sit down as on an unseen chair, hands on the lap, stand up again | `hold` + 0.95 |
| `sitDown` | — | sit down and **stay seated** — following actions (speak, nod, wave…) play seated | 0.55 |
| `standUp` | — | stand up from `sitDown` | 0.55 |
| `face` | `(target = 'right', amount = 0.55)` | turn toward `'left'` / `'right'` and **stay turned**; `'front'` turns back. `target` may also be a DOM element or another rig — the character turns to whichever side it is on | 0.45 |
| `hideItem` `showItem` | `(side = 'R')` | put away / take out the held item of hand `'L'`, `'R'` or `'both'`; it stays that way | 0.25 |
| `march` | `(steps = 6)` | march on the spot, arms swinging | 2.7 |
| `stroll` | `(steps = 6)` | relaxed steps on the spot | 3.2 |
| `stepInPlace` | `(steps = 6)` | steps on the spot, arms still | 2.9 |
| `walkForward` | `(steps = 8)` | approach from far away (grows) | 3.5 |
| `walkAway` | `(steps = 8)` | walk into the distance and fade — **ends hidden** | 3.3 |
| `walk` | `(steps = 4, distance = 0)` | turn sideways and walk; `distance` 0 = on the spot, positive = move right, negative = move left, in frame units. With a distance, `steps` is ignored: the number of steps follows from the distance | 2.4 on the spot; about 1.9 s per 100 units, 2.9 s for 370 |
| `enter` | `(from = 'left')` | walk in from off-frame, from the `'left'` or the `'right'` | 1.6–2.15 |
| `exit` | `(to = 'right')` | walk out of frame to the `'right'` or the `'left'` — **ends hidden** | 1.6–2.05 |

**Tone of voice.** A speaking step takes `{ mood }` — any `express` name — and the whole line
is delivered with that face (brows, eyes, mouth corners) while the mouth still follows the
words: `['explain', 'Oh no, I forgot again.', 2.2, { mood: 'worried' }]`,
`['speakCues', cues, null, { mood: 'sad' }]`. Without it, lines are spoken brightly, with a
slight smile.

**Gestures.** `explain` and `speakCues` add arm gestures on the breaks between phrases. They
start from and return to the character's own rest pose, so a character with clasped hands
gestures differently from one whose arms hang; a hand holding an item stays still and the
other one gestures. `['speakCues', cues, null, { cuChi: false }]` keeps the arms still.

For `speak` / `explain`, set `dur` to the length of the voice-over clip. Syllables are
counted per vowel group, so Vietnamese and English text both pace correctly.

After `exit` or `walkAway` the character is invisible; use `enter` to bring it back.
A character keeps its horizontal position after `walk` with a distance. `sit` draws no
chair; put one in the composition behind the character if the scene needs it.

**Stance.** Sitting (`sitDown` / `standUp`) and facing (`face`) are *held*: every other action
ends in the stance it started from, not standing-facing-front. Actions that move the arms
(`wave`, `thumbsUp`, `point`, `present`, `shrug`, `worry`, `speak`, `explain`) turn the body to
at most 0.2 for their duration, because raised arms are drawn for a front view; they return
to the held facing at the end. To start a scene already seated or turned, set
`rig.state.seat = 1` / `rig.state.facing = ±0.55` before calling `sequence()`. So a conversation is

```js
VGCharacter.sequence(a, [['enter', 'left'], ['face', b], ['explain', 'Hello!', 2], ['nod']]);
VGCharacter.sequence(b, [['sitDown'], ['face', a], ['speak', 'Hi.', 1.2], ['standUp'], ['face', 'front']]);
```

`sit(hold)` and `turn(direction, hold)` remain round trips. `walk` turns side-on to step and
then returns to the held facing; `enter` always ends standing, facing front. `face(element)`
compares positions **when the timeline is built** (walked distance included), so if either
character walks past the other afterwards, add another `face` step — `tools/peek.sh` warns
when one is missing. Build
stance-dependent timelines with `sequence()` — it gives each action the state the previous one
left behind.

`wave` and `thumbsUp` use the right hand unless it holds an item and the left is free; pass
`'L'` or `'R'` to choose. With an item in **both** hands they become a greeting without arms
(head tilt, smile, two nods) of the same length. A hand holding an item stays closed around it
during every action.

**Held items** are part of the stance too: `hideItem(side)` puts one away and it stays away
until `showItem(side)`. Do not tween `rig.state.itemR` beside a `sequence()` — the sequence
owns the whole state and overwrites it.

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
400 × 330 units. A pet strolls short distances (about 80 units a second) and trots anything
over 160 units (about 155 units a second).

Exact durations for a given composition: `tools/peek.sh <index.html>` prints the start and
end of every step.

**Pet stance.** Like people, pets hold a stance: `sitDown()`, `standUp()` and
`face('left' | 'right' | element | rig)` stay in force through the actions that follow (a dog
that sat down barks and tilts its head seated; a cat that stood up stays standing). `walk`
turns toward the direction it walks and then returns to the held facing; `enter` ends in the
species' rest pose, head toward the right. A person can `face(petRig)` and a pet can
`face(personRig)`.

## Scene props — `VGCharacter.createProp(host, kind, options)`

Ready-made furniture, drawn in the **same 400 × 470 frame as a person** with the floor on the
same line. Give the prop's host the same `bottom` and `height` as the character's host; for a
chair or stool also the same `left`, and put it **before** the character in the HTML so it is
drawn behind. Tables and counters use the same `bottom` + `height` and their own `left`.

| `kind` | Options (frame units) | Notes |
|---|---|---|
| `chair` | `for`, `color`, `width = 108`, `back = 92` | seat with a backrest that shows behind the sitter |
| `stool` | `for`, `color`, `width = 84` | |
| `table` | `color`, `width = 230`, `height = 150` | thin top on two legs |
| `counter` | `color`, `width = 300`, `height = 150` | solid to the floor |

The top of a table or counter is `(12 + height) × hostHeight / 470` px above the bottom of its
host (the floor line sits 12 units above the host's bottom edge) — e.g. 262 px for the default
150-unit counter in a 760 px host. Use that to place things on it.

`for: rig` sets the seat to the height at which that person sits (`rig.seatY()`); without it a
default that fits the built-in characters is used. `color` is `#rrggbb`; the darker tone and
the line colour are derived. Returns `{ svg, kind, seatY }`. A unit is `host height / 470` px.

```html
<div id="chair"  class="clip" style="position:absolute; left:1150px; bottom:96px; height:700px" …></div>
<div id="granny" class="clip" style="position:absolute; left:1150px; bottom:96px; height:700px" …></div>
```
```js
const granny = VGCharacter.createCharacter(document.getElementById('granny'), { id: 'granny' }).rig;
VGCharacter.createProp(document.getElementById('chair'), 'chair', { for: granny, color: '#8a5a3c' });
granny.state.seat = 1;                       // already seated in the first frame
```

## Library and rig API

| Call | Use |
|---|---|
| `VGCharacter.createCharacter(host, { id, config })` | build a person; returns `{ rig, id }`. Omit `config` to use the one baked into the bundle; pass `null` to ignore it |
| `VGCharacter.createPet(host, { species, config })` | build a pet |
| `VGCharacter.createProp(host, kind, options)` | build a chair, stool, table or counter (see Scene props) |
| `VGCharacter.shot(scene, subject, kind, options)` | camera: zoom the scene onto one rig or an array of rigs (people and pets) — `'face'` / `'chest'` / `'full'` — or back to `'wide'` — see `references/hyperframes.md` → Camera shots |
| `rig.shotBox(kind)` | the box such a shot aims at, in frame units, for the rig's current state |
| `VGCharacter.captions(source, element, options)` | show the words of each spoken line while it is spoken — a fixed caption, or a bubble above the speaker with `follow: true` |
| `VGCharacter.conversation(turns, { gap, waiting, camera, leadIn })` | several characters taking turns, timed automatically; `camera` cuts to whoever speaks; returns `{ sequences, turns, duration, camera, of(rig), addTo(timeline, at) }` — see `references/hyperframes.md` → Staging recipes |
| `VGCharacter.sequence(rig, steps, { gap })` | one paused timeline from a list of actions; step timings in `.data.steps`. The result is pre-sampled, so seeking to any time, in any order, gives the same frame |
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
