# Actions

Every action is a method on the rig that **returns a paused GSAP timeline** and ends back at
the rest pose (except where noted). In a composition, sequence them with
`VGCharacter.sequence(rig, steps)` rather than adding them one by one.

A step is `'name'`, `['name', ...args]`, or a number (extra pause in seconds, on top of the
0.1 s gap that separates every two steps). `sequence`
inserts a 0.1 s gap between consecutive steps by default; change it with
`sequence(rig, steps, { gap: 0 })`.

To SEE the actions on a given character before using them: `sh tools/actions.sh <id> [--turned]`
(a still review sheet, six moments per action) or `python3 tools/reel.py <id> [--render | --clips]`
(a video reel, optionally one clip per action). Both run each action through `sequence()` and read
the demo steps from `tools/action-catalog.json`.

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
| `cheer` | `{ narrow }` | both arms up and two little hops, beaming — the one whole-body "happy" (seated: arms only; a hand holding an item stays down). `{ narrow: true }`: two fists pumped beside the shoulders instead of the wide V — about as wide as the head, for vertical frames (`tools/scene.py` uses it there) | 1.9 |
| `drink` | `(side = 'auto')` | raise the held item (a cup) to the mouth, tilt it, eyes closed, then lower it with a smile; a turned character faces the viewer to drink. With empty hands it mimes the sip | 1.85 |
| `clap` | `(times = 4)` | both hands clap in front of the chest, beaming | 0.8 + 0.32 × `times` |
| `countFingers` | `(count = 3, { hand })` | raise a hand beside the chest and count one, two, three fingers, a beat each — listing benefits | 0.9 + 0.8 × `count` |
| `checkWatch` | — | a watch appears on the wrist; raise it to the chest, look down at it, look up impatient — waiting, running late | 2.4 |
| `scratchHead` | `(hand = 'auto')` | hand up by the head, a few scratches, sheepish smile — embarrassed, forgot something | 1.65 |
| `headInHands` | `(hold = 1.4)` | both hands to the face, head sunk, eyes shut, a shake of the head — overwhelmed (a chibi's short arms reach the cheeks, not the top of the head) | `hold` + 0.95 |
| `bow` | `(depth = 1)` | head and shoulders bow, eyes closed, back up smiling — thanks, sorry, welcome | 1.8 |
| `wai` | — | Thai greeting: palms pressed together in front of the chest, a small bow | 2.05 |
| `ponder` | `(hold = 1.8, { hand })` | hand to the chin, the other forearm across the belly, eyes up to one side, a tap on the chin — thinking it over | `hold` + 0.9 |
| `crossArms` | `(hold = 2)` | arms folded across the chest, head tilted, one brow raised — doubtful, waiting | `hold` + 0.85 |
| `handsOnHips` | `(hold = 2)` | both hands on the hips, elbows out, chest up, a confident smile | `hold` + 0.85 |
| `introduce` | `(hand = 'auto')` | an open hand on the chest, a small nod and smile — "I am…", "thank you" | 1.95 |
| `callOut` | `(hold = 1.2, { hand })` | one hand raised high and waving, head up, mouth wide open twice — calling someone from afar ("Milo, your turn!") | `hold` + 0.85 |
| `relief` | `(hand = 'auto')` | hand on the chest, eyes closed, a long breath out with the shoulders dropping, then a relieved smile | 2.35 |
| `startle` | — | a jolt back, both open hands thrown up by the shoulders, round eyes, mouth in an O, then calm again | 1.45 |
| `lookAround` | — | turn the head (and a little of the body) left, then right, then back — searching for someone, a lost pet | 2.45 |
| `thumbsDown` | `(hand = 'auto')` | thumb pointing down in front of the chest, a frown, a shake of the head — "don't", "wrong". The pair of `thumbsUp` | 1.75 |
| `stopSign` | `(hold = 1.2, { hand })` | the open palm held up before the chest, a firm push, a serious face — "stop!", a warning | `hold` + 0.75 |
| `fingerWag` | `(times = 3, { hand })` | the index finger raised by the shoulder, wagging side to side with the head — "no, no" | 0.8 + 0.3 × `times` |
| `beckon` | `(times = 3, { hand })` | an open hand held out by the hip, fingers curling in — "come here" (a pet, a customer) | 0.8 + 0.36 × `times` |
| `fingerHeart` | `(hold = 1.4, { hand })` | thumb and index crossed before the chest, a red heart pops up and beats twice, a wink — the finger heart | `hold` + 0.85 |
| `vSign` | `(hold = 1.4, { hand })` | two fingers in a V beside the face, head tilted, a big smile and a wink — a photo pose, a sign-off | `hold` + 0.75 |
| `handshake` | `(target)` | reach the hand on `target`'s side to a point half way between the two (at waist height, shared by both, whatever their heights) and shake three times. Run it `together` with the other person's `handshake` | 1.8 |
| `listen` | `(target, hold = 1.6)` | bend to a pet (a rig, an element or `{ x, y }`) and put a stethoscope (it appears in the hand, tube up to the neck) on its body, listen with the head tilted and eyes up, move it once, nod. The pet must be within reach — on an exam table at about hand height | `hold` + 1.5 |
| `inject` | `(target)` | with a held `'syringe'`, bend to the pet, needle toward its body, press the plunger, pull back, smile. The pet must stand on the side of the hand holding the syringe (otherwise an error says so); throws without a syringe | 2.35 |
| `carry` / `putDown` | `(pet)` / — | **stance**: bend down, take the pet in both hands and hold it in front of the belly, curled up, a little enlarged (1.35×) so it reads; the following steps play while carrying, and the pet's own actions (purr, wagTail) keep playing in the arms. `putDown` puts it back where it was picked up — walking away first is refused. The pet must be within reach | 1.55 / 1.1 |
| `examine` | `(target, part = 'ears', hold = 1.4)` | bend to the pet and shine a penlight (it appears in the hand) on `part`: `'ears'`, `'eyes'` or `'teeth'` (the muzzle — run the pet's `openMouth` `together`), look closely, move the light once, nod. Close targets (a pet on the exam table right beside the person) bend the elbow so the hand stops at the target | `hold` + 1.4 |
| `giveTreat` | `(target, { kind = 'treat' })` | bend and hold out a bone-shaped treat (it appears in the hand) to the pet's mouth; it disappears as the pet takes it; smile, pull back. `kind: 'pill'` gives a pill instead. Pair with the pet's `beg`, `wagTail` or `eat` in a `together` | 1.9 |
| `weigh` | `(pet, scale = null, { reading, hold = 1.6 })` | weigh a pet: bend and pick it up (as `carry`), set it down on the platform of a vet `scale`, straighten up and look down at it — a big digital display pops up over the pet with `reading` (default: the text on the scale prop, else `'4.2 kg'`) —, nod, then pick it up again and put it back where it was. `scale`: a `createProp(host, 'scale')` (or the element holding it), or `{ x, y }` — the middle of the platform top in the 400 × 470 frame (3D set: `set.targetPoint(rig, [x, y, z])`); none: a spot on the floor on the side away from the pet. The pet and the scale must be within reach; the pet stands on the scale in the person's own plane, so in a 3D set give the scale the person's `z`. Throws without a pet, with a scale that is not a scale prop, or while already carrying a pet | 4.85 + `hold` |
| `takeTemp` | `(target, hold = 1.5, { reading = '38.5°C' })` | take a pet's temperature: bend and hold a digital thermometer (it appears in the hand) to the pet's rear for `hold` s, focused; then straighten up, raise it beside the shoulder and look at it — a big display pops up beside it with `reading` —, nod. The hand on the pet's side holds it; if that hand holds an item, the other hand reaches across. In a scene file the pet turns its tail to the person for it, and back after | `hold` + 2.4 |
| `givePill` | `(target)` | give a pet a pill by hand: bend; the far hand comes across to hold the pet's chin, the near hand (a pill appears in it) puts the pill into its mouth — it disappears —, the holding hand strokes the chin twice, smile. Both hands must be free (otherwise an error says so). Pair with the pet's `openMouth` then `chew` (a scene file adds them by itself). `giveTreat(pet, { kind: 'pill' })` is the simpler one-hand version | 2.5 |
| `shine` | `(target = null, hold = 2)` | take out a flashlight and shine it at `target` (a rig, an element, `{ x, y }`, or straight ahead), sweeping it a little, then put it away. In a 3D set the beam is a light: it lights the pet it reaches (the pet squints), and in a dark room it throws a pool of light on the floor or the wall. Script: `bà → mèo: rọi đèn` | 2.95 |
| `brush` | `(target, strokes = 4)` | bend and brush along the pet's back with a brush that appears in the hand — grooming | 1.0 + 0.42 × `strokes` |
| `leash` / `unleash` | `(pet)` / — | **stance**: clip a leash onto the pet; a line is drawn from the held leash handle (`items: { R: 'leash' }`) to the pet's collar and follows both of them — `walk` the person and the pet `together` to walk it. `unleash` removes the line. Throws without a leash in hand | 0.95 / 0.95 |
| `handOverPet` / `takePet` | `(other)` / `(giver)` | pass a carried pet from one person to another — run both `together`: the giver holds the pet out to the point half way between them, the taker reaches out, the pet passes at 0.55 s and the taker holds it (the `carry` stance). The two should stand about 0.42 × host height apart (`tools/scene.py` walks the giver closer). The taker's `putDown()` returns the pet to its own spot | 1.1 / 1.55 |
| `kneel` | — | **stance**: go down on the knees (thighs and shins both foreshortened toward the viewer), level with a pet on the floor; `stroke`, `examine`, `giveTreat` play kneeling. `standUp()` gets up | 0.65 |
| `ride` / `getOff` | — / — | **stance**: sit astride a scooter or motorbike — turn full side-on (keeps the current side; from the front it turns right), thighs level, shins down to the footboard, back leaning a little forward, both hands gripping a handlebar in front of the chest. The rig draws no vehicle: stand the ready-made `scooter` prop (or your own picture) under it — `createProp(host, 'scooter')` gives `rideLift(rig)`, how far to raise the rider so the hips are on its seat — or, for your own picture, put its seat at `rig.rideSeatY()` (frame y, like `seatY()` for a chair). In a scene file: `"rides": "<scooter cutout>"` on the character (references/hyperframes.md → 3D sets). Speaking, nodding and looking keep both hands on the bars; raising an arm (`wave`, `point`) lets go of that side and takes it back after. `getOff` stands up, keeping the facing | 0.6 / 0.6 |
| `throwBall` | `(direction = 'right', distance = 420)` | wind up and throw a tennis ball in an arc toward `direction`; it lands `distance` units away (by default out of frame). Pair it with a dog's `fetch` | 2.15 |
| `write` | `(dur = 1.2)` | the other hand comes over to the held item (clipboard, phone) and writes a few lines, head down; with empty hands it writes on the left palm | `dur` + 0.87 |
| `call` | `(text = null, dur = 2.4, { mood, side })` | put the held phone to the cheek (its back facing out, the head tilting to it), say `text` over `dur` seconds, put it down. No `text`: listening, small nods. With empty hands it mimes the call with a fist. A chibi's short arm cannot reach the ear in a front view, so the phone goes to the cheek — the usual cartoon shorthand | `dur` + 1.05 |
| `phoneUp` / `phoneDown` | `(side = 'auto')` / — | **stance**: put the phone to the cheek and keep it there; the following steps (`explain`, `speakCues` with a recorded voice, `nod`…) play on the phone, the other hand still gestures. `phoneDown` puts it down. Needs a held phone | 0.8 / 0.5 |
| `notify` | `(text, hold = 1.8, { side })` | the held phone buzzes and a notification card pops up above it — `text` (split into two lines near 24 characters, at a colon or dash if there is one) or `[line 1, line 2]`; the character looks down at it, then up. Needs a held phone. Chain `showPhone` to show the screen too | `hold` + 1.2 |
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
| `express` | `(name = 'happy', hold = 1.2)` | a facial expression held, then released: `happy` · `sad` · `surprised` · `angry` · `thinking` · `laughing` · `worried` · `confused` · `tired` · `crying` (tears running down, sobbing shoulders) · `embarrassed` (deeper blush, a sweat drop, looking away) · `sleepy` (a yawn, then drooping eyes and nodding off). The body joins in: a hop when `happy`, arms flung out when `surprised`, a hand raised to the chest when `thinking`, fists when `angry`, a sigh when `tired` | `hold` + 0.7 |
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
| `hurry` | `(steps = 6, distance = 0)` | like `walk` but quicker steps (0.3 s each instead of 0.46), mouth open, brows up — in a rush, an emergency | 2.3 on the spot |
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

## Pets — `VGCharacter.createPet(host, { species, config, wear }).rig`

All pets stand side-on with the **head toward screen right** and the face turned to the
viewer. `walk` with a negative distance turns the animal round first.

**Dogs** (`dog`, `shiba`, `corgi` — short legs, long body —, `poodle`, `husky`, `black_dog`) rest standing:

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
| `unwell` | `(hold = 2.5)` | ears down, sleepy eyes, head low, tail drooping, a sigh — standing or lying | `hold` + 1.2 |
| `scratchItch` | `(times = 8)` | sit and scratch the neck fast with the near hind paw, head tilted to it, eyes half shut — itchy skin, fleas | 0.9 + 0.14 × `times` |
| `limp` | `(steps = 4, distance = 0)` | walk holding one front paw up, head and chest dipping at each step, ears down — a sore leg | about 2 on the spot |
| `tremble` | `(hold = 2)` | crouch low, ears pinned, tail tucked, eyes wide, shaking all over — scared of the vet, of fireworks | `hold` + 0.75 |
| `eat` / `drink` | `(dur = 2)` | head down to a bowl on the floor in front (the `bowl` prop), chewing / lapping | `dur` + 0.8 |
| `cough` | `(times = 3)` | neck forward, a jolt of the chest and an open mouth for each cough | 0.8 + 0.5 × `times` |
| `openMouth` | `(hold = 1.2)` | chin up, mouth wide open — for `examine(pet, 'teeth')` | `hold` + 0.65 |
| `shakeOff` | — | shake the whole body from head to tail, ears flapping, water drops flying off — after a bath | 1.25 |
| `sneeze` | — | breathe in with the head back, then a quick snap down, eyes shut, mouth open | 1.6 |
| `pant` | `(dur = 2)` | mouth open, tongue out, fast breathing — heat, after running | `dur` + 0.65 |
| `yawn` | — | head back, mouth wide open, eyes shut, then a smack of the lips | 2.15 |
| `rub` | `(times = 4)` | rub against the legs of the person beside it: tail up and curled, cheek and head rubbing side to side, eyes half shut | 0.7 + 0.48 × `times` |
| `greet` | `(hold = 1.4)` | rear up on the hind legs, front paws up toward the person in front, tail wagging hard, tongue out — welcoming its owner. Stand it close to the person, facing them | `hold` + 0.75 |
| `play` | `(times = 2)` | a play bow (chest down, rump up, tail wagging) then hops side to side — run it for two pets facing each other in a `together` | about 2.3 |
| `goIn` / `comeOut` | `(distance = 90)` / `(distance = 120)` | **stance**: walk `distance` units the way it faces into a pet `carrier` and lie down there; `comeOut` gets up, turns to the door and walks out. The carrier hides the pet when it is nearer the camera (3D set: a slightly larger `z`; 2D: its host after the pet's) | about 1.5 / 2.6 |
| `fetch` | `(distance = 260, { delay = 0.7 })` | after `delay` seconds run `distance` units the way it faces, pick a ball up in the mouth, run back to where it started, wag with the ball, drop it. Pair with a person's `throwBall` | about 4–7 |
| `lieDown` / `sleep` | — / `(dur = 3)` | **stance**: lie down (front legs out); `sleep` lies down, head down, eyes closed, slow deep breaths, and stays lying when it wakes | 0.6 / `dur` + 1.4 |
| `walk` | `(steps = 4, distance = 0)` | trot on the spot, or `distance` frame units | 1.4 on the spot |
| `enter` | `(from = 'left', distance)` | run in from outside the frame on the `'left'` or the `'right'`, stop at its own spot | 2.6 |
| `exit` | `(to = 'right', distance)` | turn that way and run out past the edge of the frame — **ends hidden** | 2.4 |

**Cats** (`cat`, `orange_cat`, `black_cat`, `white_cat`, `calico`) rest **sitting**; actions that need them standing
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
| `unwell` | `(hold = 2.5)` | ears down, sleepy eyes, head low, tail drooping, a sigh — standing or lying | `hold` + 1.2 |
| `scratchItch` | `(times = 8)` | sit and scratch the neck fast with the near hind paw, head tilted to it, eyes half shut — itchy skin, fleas | 0.9 + 0.14 × `times` |
| `limp` | `(steps = 4, distance = 0)` | walk holding one front paw up, head and chest dipping at each step, ears down — a sore leg | about 2 on the spot |
| `tremble` | `(hold = 2)` | crouch low, ears pinned, tail tucked, eyes wide, shaking all over — scared of the vet, of fireworks | `hold` + 0.75 |
| `eat` / `drink` | `(dur = 2)` | head down to a bowl on the floor in front (the `bowl` prop), chewing / lapping | `dur` + 0.8 |
| `cough` | `(times = 3)` | neck forward, a jolt of the chest and an open mouth for each cough | 0.8 + 0.5 × `times` |
| `openMouth` | `(hold = 1.2)` | chin up, mouth wide open — for `examine(pet, 'teeth')` | `hold` + 0.65 |
| `shakeOff` | — | shake the whole body from head to tail, ears flapping, water drops flying off — after a bath | 1.25 |
| `sneeze` | — | breathe in with the head back, then a quick snap down, eyes shut, mouth open | 1.6 |
| `pant` | `(dur = 2)` | mouth open, tongue out, fast breathing — heat, after running | `dur` + 0.65 |
| `yawn` | — | head back, mouth wide open, eyes shut, then a smack of the lips | 2.15 |
| `rub` | `(times = 4)` | rub against the legs of the person beside it: tail up and curled, cheek and head rubbing side to side, eyes half shut | 0.7 + 0.48 × `times` |
| `greet` | `(hold = 1.4)` | rear up on the hind legs, front paws up toward the person in front, tail wagging hard, tongue out — welcoming its owner. Stand it close to the person, facing them | `hold` + 0.75 |
| `play` | `(times = 2)` | a play bow (chest down, rump up, tail wagging) then hops side to side — run it for two pets facing each other in a `together` | about 2.3 |
| `goIn` / `comeOut` | `(distance = 90)` / `(distance = 120)` | **stance**: walk `distance` units the way it faces into a pet `carrier` and lie down there; `comeOut` gets up, turns to the door and walks out. The carrier hides the pet when it is nearer the camera (3D set: a slightly larger `z`; 2D: its host after the pet's) | about 1.5 / 2.6 |
| `fetch` | `(distance = 260, { delay = 0.7 })` | after `delay` seconds run `distance` units the way it faces, pick a ball up in the mouth, run back to where it started, wag with the ball, drop it. Pair with a person's `throwBall` | about 4–7 |
| `lieDown` / `sleep` | — / `(dur = 3)` | **stance**: lie down; `sleep` lies down, head down, eyes closed, tail curled, slow breaths, and stays lying when it wakes | 0.6 / `dur` + 1.4 |
| `walk` | `(steps = 4, distance = 0)` | walk on the spot, or `distance` frame units | 1.7 on the spot |
| `enter` | `(from = 'left', distance)` | run in from outside the frame on the `'left'` or the `'right'`, stop at its own spot | 2.6 |
| `exit` | `(to = 'right', distance)` | turn that way and run out past the edge of the frame — **ends hidden** | 2.7 |

**Accessories for people.** `rig.wear('mask')` (a medical face mask under the eyes), `rig.wear('gloves')`
(exam gloves: the hands turn blue), `rig.wear('cap')` (a surgical cap over the hair); `wear(kind, false)`
takes it off; `createCharacter(host, { id, wear: ['mask', 'cap'] })` and `"wears"` on a person in a scene file.
A person who is seated (`sitDown`) stays seated while carrying a pet — it lies on the lap.

**Accessories.** `rig.wear('cone')` puts on a recovery cone (an Elizabethan collar, seen as a
clear ring round the head), `rig.wear('bandage')` a bandage on the near front leg;
`rig.wear(kind, false)` takes it off. They take effect at once (not a timeline step) and stay on
through every action. `createPet(host, { species, wear: ['cone'] })` does the same at creation,
and a scene file takes `"wears": "cone"` on a pet.

**Rabbit** (`rabbit`) rests **sitting**, long ears up; it **hops** wherever a dog trots (`walk`, `enter`, `exit`), and
does the shared actions (idle, sit / stand / lie down, sleep, unwell, eat, drink, scratchItch, tremble, cough, openMouth,
shakeOff, sneeze, pant, yawn, rub, play, goIn / comeOut, `wear`) plus:

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `hop` | `(times = 2)` | hops on the spot: a crouch, a leap with the hind legs out and the ears swept back, a landing | 0.7 + 0.66 × `times` |
| `thump` | `(times = 2)` | alert: ears straight up, eyes wide, the hind feet thump the ground | 0.85 + 0.4 × `times` |

`chew(times = 4)`: munch what it was just given, eyes half shut, then lick the lips twice (≈ 0.8 + 0.24 ×
`times` s). In a scene file a turn `["giveTreat", "@dog"]` on its own adds it for the pet by itself.

**Pet expressions** (every species and breed). A pet has no eyebrows, so its feelings are in
the ears, eyes, pupils, mouth, head and tail:

| Name | What you see |
|---|---|
| `happy` | ears up, eyes half shut, tongue out; a dog wags, a cat raises its tail |
| `excited` | as happy, bouncing on the spot, tail going fast |
| `sad` | ears down, head low, wet eyes looking up ("puppy eyes"), tail low, a sigh |
| `scared` | ears pinned back, crouching, tail tucked, pupils wide, shaking |
| `angry` | a dog lowers its head and bares its fangs with a growl; a cat arches, puffs its fur and tail and hisses |
| `curious` | head tilted one way then the other, one ear up, big pupils |
| `guilty` | head down, eyes glancing up, ears back, wet eyes; a dog wags low |
| `pain` | eyes squeezed shut (> <), ears down, mouth trembling |
| `sleepy` | drooping eyes, head nodding off, a yawn when there is time |

- `express(name, hold = 1.4)`: one beat of that face, then back (≈ `hold` + 0.8 s).
- `mood(name)`: hold the face through the actions that follow (`mood('pain')`, then `limp(4, 120)`);
  every action comes back to that face instead of the rest face. `mood(null)` ends it.
  Only the face, ears and tail are held; the body still does each action.
- In a scene file, `"mood"` on a pet's turn: alone it is one beat of the face; with `"do"` the pet
  keeps the face through those actions (`{ "who": "dog", "mood": "pain", "do": [["limp", 4, 120]] }`).
- Pet faces are small in a wide shot: give the turn a close `"view"` on the pet.

New face channels on `rig.s` (0…1): `lanh` (wet, shining eyes), `nhan` (eyes squeezed shut > <) and
`nanh` (bared fangs).

**Emotion marks** (people and pets): `rig.mark(kind)` shows a comic mark over the head and keeps it
through the actions that follow; `rig.mark(null)` takes it away. Kinds: `!` (alarm), `?` (puzzled),
`heart`, `zzz`, `sweat` (drop — nervous, guilty), `anger` (vein), `music` (note). It follows the head as it
tilts or droops. A pet's `express` shows a matching mark by itself (scared `!`, curious `?`, sleepy `zzz`,
happy / excited heart, angry vein, guilty / pain sweat) — `express(name, hold, { mark: false })` or
`RigThu.AUTO_MARKS = false` to leave it out, `{ mark: '?' }` to choose another. In a scene file: `"mark"`
on a turn (held through it), and `"marks": false` at the top for no automatic marks.

`rig.actions` lists the actions valid for that rig. Distances for pets are in the pet frame,
400 × 330 units. A pet strolls short distances (about 80 units a second) and trots anything
over 160 units (about 155 units a second).

Exact durations for a given composition: `tools/peek.sh <index.html>` prints the start and
end of every step.

**Pet stance.** Like people, pets hold a stance: `sitDown()`, `standUp()`, `lieDown()` (and `sleep()`, which ends lying) and
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
| `bowl` | `fill = 'food'` (`'water'`, `'empty'`), `color`, `width = 46` | a pet bowl on the floor. For `eat` / `drink`, give its host the pet's `bottom` and `height` and put it just in front of the muzzle: about 0.15 × the pet's host height toward the side its head is on |
| … | | `createProp` returns `{ svg, kind, seatY, notify }` (a scooter also `rideLift`, `roll`). **`notify(message, { hold = 2.5 })`** on a `monitor` (or a `laptop` with `facing: 'viewer'`) returns a paused timeline: a notification card pops up on the lower half of its screen and goes after `hold` s — `message` is a title, or `{ title, text }` (cut with "…" to fit). It is drawn in the prop, so in a 3D set it follows the camera with the screen |
| `tree` | `color` (the leaves), `width = 300` | a tree, taller than a person (outdoor sets: `park`, `street`) |
| `lamp` | `color` | a street lamp |
| `scooter` | `color` (the body, teal), `facing = 'right'` (`'left'`) | a scooter seen from the side at life size next to a person (seat top at `seatY`, about half a standing person's height). Its rider uses the `ride` stance, raised by **`rideLift(rig)`** frame units (× host height / 470 for px) so the hips sit on the seat and the feet on the footboard; give the scooter's host the rider's `left`-centre, `bottom` and `height`, and put it **after** the rider (in front) so the bodywork hides the legs. **`roll(distance, duration, ease = 'power2.out')`** returns a timeline turning both wheels (each a `[data-wheel]` group with spokes) as the scooter goes `distance` frame units forward — add it beside the tween that moves the scooter |
| `carrier` | `door = 'right'` (`'left'`), `color`, `width = 150` | a pet carrier seen from the side, a barred door on one end. Put its host **after** the pet's (in front): a pet standing behind it is "inside", seen through the door |
| `scale` | `reading` (e.g. `'4.2 kg'`), `color`, `width = 210` | a low vet scale with a digital display. Stand the pet on it: raise the pet's host by the platform (about 0.03 × the host height) |

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
| `VGCharacter.createCharacter(host, { id, config, items, itemsHidden, wear })` | build a person; returns `{ rig, id }`. `items: { R: 'cup' }` (or `'clipboard'`, `'phone'`, `'syringe'`, `'pills'`, `'leash'`, `{ kind: 'phone', image: 'app.png' }` for a picture on the phone's screen, or a function returning SVG; `L` for the other hand) gives any character that item to hold; `itemsHidden: true` starts with it put away, ready for `take()` or `showItem()`. Omit `config` to use the one baked into the bundle; pass `null` to ignore it |
| `VGCharacter.createPet(host, { species, config, wear })` | build a pet; `wear: ['cone']` (or `'bandage'`, or both) puts accessories on from the start — see `rig.wear` |
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
