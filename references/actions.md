# Actions

Every action is a method on the rig that **returns a paused GSAP timeline** and ends back at
the rest pose (except where noted). In a composition, sequence them with
`VGCharacter.sequence(rig, steps)` rather than adding them one by one.

A step is `'name'`, `['name', ...args]`, or a number (extra pause in seconds, on top of the
0.1 s gap that separates every two steps). `sequence`
inserts a 0.1 s gap between consecutive steps by default; change it with
`sequence(rig, steps, { gap: 0 })`.

## People — `VGCharacter.createCharacter(host, { id, config, items, itemsHidden }).rig`

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, blink, glance | `dur` |
| `wave` | `(hand = 'auto')` | raise a hand and wave | 2.3 |
| `thumbsUp` | `(hand = 'auto')` | fist to the chest, thumb out, small nod | 2.0 |
| `point` | `(target)` | point at a DOM element, or at `{ x, y }` in the rig's 400 × 470 frame; with no target, points right | 2.0 |
| `present` | — | open both arms, forearms raised and palms up, to present (a hand holding an item stays put) | 2.2 |
| `nod` | — | nod twice | 1.4 |
| `shake` | — | shake the head | 1.5 |
| `shrug` | — | shrug with open palms | 1.7 |
| `cheer` | — | both arms up and two little hops, beaming — the one whole-body "happy" (seated: arms only; a hand holding an item stays down) | 1.9 |
| `drink` | `(side = 'auto')` | raise the held item (a cup) to the mouth, tilt it, eyes closed, then lower it with a smile; a turned character faces the viewer to drink. With empty hands it mimes the sip | 1.85 |
| `write` | `(dur = 1.2)` | the other hand comes over to the held item (clipboard, phone) and writes a few lines, head down; with empty hands it writes on the left palm | `dur` + 0.87 |
| `call` | `(text = null, dur = 2.4, { mood, side })` | put the held phone to the cheek (its back facing out, the head tilting to it), say `text` over `dur` seconds, put it down. No `text`: listening, small nods. With empty hands it mimes the call with a fist. A chibi's short arm cannot reach the ear in a front view, so the phone goes to the cheek — the usual cartoon shorthand | `dur` + 1.05 |
| `phoneUp` / `phoneDown` | `(side = 'auto')` / — | **stance**: put the phone to the cheek and keep it there; the following steps (`explain`, `speakCues` with a recorded voice, `nod`…) play on the phone, the other hand still gestures. `phoneDown` puts it down. Needs a held phone | 0.8 / 0.5 |
| `showPhone` | `(hold = 1.8, { side, zoom = 2.6 })` | hold the phone up beside the face, screen to the viewer and **enlarged** so the app on it reads, smile, hold, lower it. Needs a held item | `hold` + 1.0 |
| `tapPhone` | `(dur = 1.6, { side, zoom = 2 })` | phone up in front of the chest (enlarged, screen out), head down, the other index finger taps and swipes for `dur` seconds — booking, checking a reminder. Needs a held item | `dur` + 0.95 |
| `typing` | `(dur = 2)` | both hands forward on a keyboard, fingers going, head down at the screen, a glance up half-way. Pair it with a `laptop` prop on the table or counter in front: its lid hides the hands | `dur` + 0.9 |
| `stroke` | `(target)` | lean toward a pet (a rig, an element, or `{ x, y }`) and stroke it three times with the hand on that side; crouches if the target is below the hips. Keep the pet within about 0.25 × host height of the person, arms are short | 2.2 |
| `handOver` | `(target, side = 'auto')` | reach the held item toward `target` (a rig, `'left'`, `'right'`); it leaves the hand, which relaxes. Throws if nothing is held | 1.33 |
| `take` | `(source, side = 'auto')` | reach toward `source` and receive an item into the hand: the character must already have it put away (`items` + `itemsHidden`, below). Run it `together` with the giver's `handOver` | 1.33 |
| `speak` | `(text, dur = 2, { mood })` | mouth shapes paced to the syllable count of `text`, one gesture | `dur` + 0.55 |
| `explain` | `(text, dur = 2.4, { mood, hand })` | like `speak` with livelier head and hand gestures; `hand: 'L'` or `'R'` picks the arm that leads them (e.g. the one on the side of the content the character is presenting) | `dur` + 0.55 |
| `speakCues` | `(cues, dur, { cuChi, mood, hand })` | lip-sync from the audio's mouth cues (made by `tools/cues.py`) instead of an estimate; gestures on the pauses. `{ cuChi: false }` keeps the hands still | audio length + 0.55 |
| `worry` | — | brows up, hands fidget | 2.1 |
| `express` | `(name = 'happy', hold = 1.2)` | a facial expression held, then released: `happy` · `sad` · `surprised` · `angry` · `thinking` · `laughing` · `worried` · `confused` · `tired`. The body joins in: a hop when `happy`, arms flung out when `surprised`, a hand raised to the chest when `thinking`, fists when `angry`, a sigh when `tired` | `hold` + 0.7 |
| `turn` | `(direction = 'right', hold = 1.5, amount = 0.55)` | turn to a three-quarter view (`amount` 1 = full profile), hold, face front again | `hold` + 0.8 |
| `sit` | `(hold = 2)` | sit down as on an unseen chair (knees slightly apart, shins upright), hands on the lap, stand up again — put a `createProp('chair')` behind it, a seat with nothing under it still reads oddly | `hold` + 0.95 |
| `sitDown` | — | sit down and **stay seated** — following actions (speak, nod, wave…) play seated | 0.55 |
| `standUp` | — | stand up from `sitDown` | 0.55 |
| `face` | `(target = 'right', amount = 0.55)` | turn toward `'left'` / `'right'` and **stay turned**; `'front'` turns back. `target` may also be a DOM element or another rig — the character turns to whichever side it is on | 0.45 |
| `hideItem` `showItem` | `(side = 'R')` | put away / take out the held item of hand `'L'`, `'R'` or `'both'`: the hand goes down to the hip, the item disappears (or appears) there, and the arm relaxes (or takes its carrying pose); it stays that way | 0.74 |
| `march` | `(steps = 6)` | march on the spot, fists pumping in front of the chest | 2.7 |
| `stroll` | `(steps = 6)` | slow, low steps on the spot, arms swaying loosely | 3.65 |
| `stepInPlace` | `(steps = 6)` | steps on the spot, arms still | 2.9 |
| `walkForward` | `(steps = 8)` | approach from far away (grows) | 3.5 |
| `walkAway` | `(steps = 8)` | walk into the distance and fade — **ends hidden** | 3.3 |
| `walk` | `(steps = 4, distance = 0)` | turn sideways and walk; `distance` 0 = on the spot, positive = move right, negative = move left, in frame units. With a distance, `steps` is ignored: the number of steps follows from the distance | 2.4 on the spot; about 1.9 s per 100 units, 2.9 s for 370 |
| `enter` | `(from = 'left', distance)` | walk in from outside the frame, from the `'left'` or the `'right'`, to the character's own spot. The distance is worked out from the composition's edge (270–700 units); pass `distance` to fix it | 1.6–5.2 |
| `exit` | `(to = 'right', distance)` | walk out past the edge of the frame to the `'right'` or the `'left'`, from wherever the character stands — **ends hidden**. `distance` as for `enter` | 1.6–5.2 |

**Tone of voice.** A speaking step takes `{ mood }` — any `express` name — and the whole line
is delivered with that face (brows, eyes, mouth corners) while the mouth still follows the
words: `['explain', 'Oh no, I forgot again.', 2.2, { mood: 'worried' }]`,
`['speakCues', cues, null, { mood: 'sad' }]`. Without it, lines are spoken brightly, with a
slight smile.

**Gestures.** `explain` and `speakCues` add arm gestures on the breaks between phrases. They
start from and return to the character's own rest pose, so a character with clasped hands
gestures differently from one whose arms hang; a hand holding an item stays still and the
other one gestures. Between the big gestures the free arm gives small beats on stressed
syllables. `['speakCues', cues, null, { cuChi: false }]` keeps the arms still.

For `speak` / `explain`, set `dur` to the length of the voice-over clip. Syllables are
counted per vowel group, so Vietnamese and English text both pace correctly.

After `exit` or `walkAway` the character is invisible; use `enter` to bring it back.
A character keeps its horizontal position after `walk` with a distance. `sit` draws no
chair; put one in the composition behind the character if the scene needs it.

**Stance.** Sitting (`sitDown` / `standUp`) and facing (`face`) are *held*: every other action
ends in the stance it started from, not standing-facing-front. `point`, `wave`,
`present`, `handOver`, `take` and the gestures of `explain` / `speakCues` keep the held facing
and draw the acting arms at their on-screen angles. The other arm actions (`thumbsUp`, `shrug`,
`cheer`, `worry`, `speak`, `stroke`, `write`) — and a speaker whose listener-side hand holds
an item — turn the body to at most 0.3 for their duration and return to the held facing at
the end; of these, `thumbsUp`, `worry` and `speak` use the hand nearer the viewer while the
character is turned. To start a scene already seated or turned, set
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

While the character faces left or right, one-handed actions (`wave`, `thumbsUp`) and speech
gestures use the arm on that side, so the hand goes toward whoever it is facing.

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
| `bark` | `(times = 2)` | a small dip, then the head tosses up and the mouth opens | 1.4 |
| `sit` | `(hold = 1.6)` | sit, pant, stand up again | `hold` + 0.9 |
| `tiltHead` | — | tilt one way, then the other | 2.3 |
| `jump` | `(times = 2)` | happy hops | 2.0 |
| `beg` | — | up on the hind legs, front paws waving | 2.3 |
| `givePaw` | — | sit and offer a front paw | 1.9 |
| `sniff` | — | nose to the ground | 1.8 |
| `walk` | `(steps = 4, distance = 0)` | trot on the spot, or `distance` frame units | 1.4 on the spot |
| `enter` | `(from = 'left', distance)` | run in from outside the frame on the `'left'` or the `'right'`, stop at its own spot | 2.6 |
| `exit` | `(to = 'right', distance)` | turn that way and run out past the edge of the frame — **ends hidden** | 2.4 |

**Cats** (`cat`, `orange_cat`, `black_cat`) rest **sitting**; actions that need them standing
stand them up first:

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, slow blink, tail tip sways | `dur` |
| `meow` | — | head up, mouth open, eyes squint | 1.3 |
| `purr` | — | eyes closed, smiling, body trembles, head rubs | 2.0 |
| `lickPaw` | — | raise a front paw and lick it | 2.2 |
| `stretch` | — | chest to the floor, rump up, yawn | 2.4 |
| `hiss` | — | arched back, curled puffed tail, ears pinned back, narrowed eyes with slit pupils | 2.0 |
| `tailSwish` | — | slow wide tail swish | 2.4 |
| `tiltHead` | — | tilt one way, then the other | 2.3 |
| `pounce` | — | crouch, wiggle, leap | 2.4 |
| `walk` | `(steps = 4, distance = 0)` | walk on the spot, or `distance` frame units | 1.7 on the spot |
| `enter` | `(from = 'left', distance)` | run in from outside the frame on the `'left'` or the `'right'`, stop at its own spot | 2.6 |
| `exit` | `(to = 'right', distance)` | turn that way and run out past the edge of the frame — **ends hidden** | 2.7 |

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
| `plant` | `color` (the pot), `width = 120` | a potted plant; in a 3D set, a foreground cutout (`set.stand`, `set.cutouts`) |
| `laptop` | `on = 150`, `facing = 'away'`, `image`, `color`, `width = 96` | a laptop on a surface `on` units above the floor (150 = the default table or counter top). `'away'`: the lid faces the viewer — the machine of someone behind the desk; put its host **after** the person's (in front) so the lid hides the typing hands. `'viewer'`: the screen faces out and shows `image` |
| `monitor` | `on = 150`, `image`, `color`, `width = 150` | a desktop screen on a stand, facing the viewer, showing `image` (the app, a lab result, an X-ray) |

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
| `VGCharacter.createCharacter(host, { id, config, items, itemsHidden })` | build a person; returns `{ rig, id }`. `items: { R: 'cup' }` (or `'clipboard'`, `'phone'`, `{ kind: 'phone', image: 'app.png' }` for a picture on the phone's screen, or a function returning SVG; `L` for the other hand) gives any character that item to hold; `itemsHidden: true` starts with it put away, ready for `take()` or `showItem()`. Omit `config` to use the one baked into the bundle; pass `null` to ignore it |
| `VGCharacter.createPet(host, { species, config })` | build a pet |
| `VGCharacter.createProp(host, kind, options)` | build a chair, stool, table or counter (see Scene props) |
| `VGCharacter.shot(scene, subject, kind, options)` | camera: zoom the scene onto one rig or an array of rigs (people and pets) — `'face'` / `'chest'` / `'full'` — or back to `'wide'` — see `references/hyperframes.md` → Camera shots |
| `rig.shotBox(kind)` | the box such a shot aims at, in frame units, for the rig's current state |
| `VGCharacter.captions(source, element, options)` | show the words of each spoken line while it is spoken — a fixed caption, or a bubble above the speaker with `follow: true`. With a `conversation()` as the source a fixed caption moves up or down off any visible head (`avoid: false` keeps it still) |
| `VGCharacter.conversation(turns, { gap, waiting, camera, leadIn })` | several characters taking turns, timed automatically; `camera` cuts to whoever speaks; returns `{ sequences, turns, duration, camera, of(rig), addTo(timeline, at) }` — see `references/hyperframes.md` → Staging recipes |
| `VGCharacter.sequence(rig, steps, { gap, breathe })` | one paused timeline from a list of actions; step timings in `.data.steps`. The character keeps breathing and swaying very slightly through the whole sequence, so held poses are not frozen (`breathe: false` turns it off). The result is pre-sampled, so seeking to any time, in any order, gives the same frame |
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
