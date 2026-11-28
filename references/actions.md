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
| `laugh` | `(hold = 1.6)` | whole-body laugh: eyes squeezed, mouth wide, head back then bent forward, shoulders shaking, a hand on the belly (unlike the face-only `express('laughing')`). Script: `[cười lớn]` / `[cười ha hả]` is this action; `(cười)` / `(cười lớn)` in round brackets stays the mood | `hold` + 0.7 |
| `wipeTears` | `(hand = 'auto')` | crying, then the back of the hand rubs under each eye (a hand holding an item: the free hand does both), a sniff, a brave small smile | ~5 s |
| `facepalm` | `(hold = 1.2)` | flat palm over the eyes and forehead, head dropped into it, a slow shake, a sigh | `hold` + 1.1 |
| `shush` | `(hold = 1.2)` | index finger upright on the lips, eyes wide, rounded "shh", a small lean forward | `hold` + 0.6 |
| `okSign` | `(hold = 1.2, { hand })` | thumb and index in a circle, other fingers up, beside the face; a wink and two nods | `hold` + 0.5 |
| `salute` | `(hold = 1.2)` | flat hand snapped up to the brow, elbow out, chin up, then snapped down | `hold` + 0.5 |
| `handshake` | `(target)` | reach the hand on `target`'s side to a point half way between the two (at waist height, shared by both, whatever their heights) and shake three times. Run it `together` with the other person's `handshake` | 1.8 |
| `listen` | `(target, hold = 1.6)` | bend to a pet (a rig, an element or `{ x, y }`) and put a stethoscope (it appears in the hand, tube up to the neck) on its body, listen with the head tilted and eyes up, move it once, nod. The pet must be within reach — on an exam table at about hand height | `hold` + 1.5 |
| `inject` | `(target)` | with a held `'syringe'`, bend to the pet, needle toward its body, press the plunger, pull back, smile. The pet must stand on the side of the hand holding the syringe (otherwise an error says so); throws without a syringe | 2.35 |
| `carry` / `putDown` | `(pet)` / — | **stance**: bend down, take the pet in both hands and hold it in front of the belly, curled up, a little enlarged (1.35×) so it reads; the following steps play while carrying, and the pet's own actions (purr, wagTail) keep playing in the arms. `putDown` puts it back where it was picked up — walking away first is refused. The pet must be within reach | 1.55 / 1.1 |
| `examine` | `(target, part = 'ears', hold = 1.4)` | bend to the pet and shine a penlight (it appears in the hand) on `part`: `'ears'`, `'eyes'` or `'teeth'` (the muzzle — run the pet's `openMouth` `together`), the head turned and bent to that spot, look closely, move the light once, nod. Close targets (a pet on the exam table right beside the person) bend the elbow so the hand stops at the target | `hold` + 1.4 |
| `giveTreat` | `(target, { kind = 'treat' })` | bend and hold out a bone-shaped treat (it appears in the hand) to the pet's mouth; it disappears as the pet takes it; smile, pull back. `kind: 'pill'` gives a pill instead. Pair with the pet's `beg`, `wagTail` or `eat` in a `together` | 1.9 |
| `weigh` | `(pet, scale = null, { reading, hold = 1.6, display })` | weigh a pet: bend and pick it up (as `carry`), kneel and set it down on the platform of a vet `scale` (centred by its paws), stand up and look down at it — a big digital display pops up over the pet with `reading` (default: the text on the scale prop, else `'4.2 kg'`) —, nod, then kneel, take it in both hands, stand up with it and put it back where it was — it never moves without a hand on it. `scale`: a `createProp(host, 'scale')` (or the element holding it), or `{ x, y }` — the middle of the platform top in the 400 × 470 frame (3D set: `set.targetPoint(rig, [x, y, z])`); none: a spot on the floor on the side away from the pet. The pet and the scale must be within reach; the pet stands on the scale in the person's own plane, so in a 3D set give the scale the person's `z`. The scale's own display reads 0 until the pet stands on it, the weight while it does, and 0 again once it is lifted off — `scale` as a prop, or `display`: the scale prop when `scale` is a point (a scene file does this). Throws without a pet, with a scale that is not a scale prop, or while already carrying a pet | 5.35 + `hold` |
| `takeTemp` | `(target, hold = 1.5, { reading = '38.5°C' })` | take a pet's temperature: bend and hold a digital thermometer (it appears in the hand) with its TIP on the pet's rear for `hold` s, focused; then straighten up, turn to it and raise it at eye level beside the face (about 0.6 of a head width out, on the pet's side, upright, 2×), eyes on it for 1.6 s — a big display pops up beside it with `reading` —, nod. In a scene file the reading turn cuts to a close shot of the person and the pet. The hand on the pet's side holds it; if that hand holds an item, the other hand reaches across. In a scene file the pet turns its tail to the person for it, and back after | `hold` + 2.7 |
| `givePill` | `(target)` | give a pet a pill by hand: turn almost side-on to it (both arms reach forward) and bend; the far hand goes under its chin (under the dropped jaw while the pet's mouth is wide open, then up to its chin when it shuts), the near hand brings a white pill with a dark outline (about a quarter of the muzzle) to the corner of its mouth (its mouth is open), pushes it in — it disappears —, the holding hand strokes the chin twice. In a 3D set the pill hand is drawn over a pet standing in front. Both hands must be free (otherwise an error says so). Pair with the pet's `openMouth` from ~0.45 s (hold 1.1), then `chew` (a scene file adds them by itself, on the beat: the mouth wide open about 1.4 s around the pill, three chews, and a close shot of the person's face and the pet's head). `giveTreat(pet, { kind: 'pill' })` is the simpler one-hand version | 3.15 |
| `clipNails` | `(target, { paw = 'front', hold = 1.8 })` | trim a pet's nails: turn almost side-on to it (both arms forward) and bend the knees; the far hand goes under its near front paw and LIFTS it (the paw rises with the hand — `RigThu` follows the person's hands), the near hand brings a small orange nail clipper (it appears in the hand) to the tip of the paw and cuts 2–3 times (`hold` / 0.62 s — the clipper closes for 0.22 s each, visibly), the holding hand squeezes with each cut; then the clipper goes, the paw is put down with the hand under it, a two-stroke pat on the back, a smile and a nod. The head turns and bends to the paw. Items in either hand are put away meanwhile. `paw`: only `'front'` (the near front paw). In a scene file the person goes to the head end of the pet first, and the turn cuts to a close shot | ≈ 3.3 + `hold` |
| `eyeDrops` | `(target, { hold = 1.2 })` | put drops in a pet's eye: turned side-on, the far hand goes under its chin and raises it (the pet's head tilts up with the hand), the near hand holds a small dropper bottle (it appears in the hand) nozzle straight down just above the near eye for `hold` s — a drop hangs at the nozzle (0.6 s), falls into the eye, the pet shuts its eyes (0.7 s), opens them and blinks again; the dropper goes, the chin comes down with the hand, which strokes it twice; smile. The head turns and bends to the eye | ≈ 3.55 + `hold` |
| `cleanEars` | `(target, { hold = 1.8 })` | clean a pet's ear: turned side-on, the far hand holds the head under the chin, the near hand wipes inside the near ear with a white cotton pad (it appears in the hand) in small circles for `hold` s; then both hands go back to the sides and the pet SHAKES its head (ears flapping, 1 s) while the person leans back laughing | ≈ 2.5 + `hold` |
| `scanChip` | `(target, { id = '900 123 456 789', hold = 1.6 })` | scan a pet's microchip: turned side-on, the far hand rests on the pet's side, the near hand passes a handheld chip scanner (it appears in the hand, head straight down) slowly over the back of the neck and the shoulders, twice — then it beeps (green sound marks) and a big card with the chip number `id` pops up over the pet's back (the readout card of `weigh` / `takeTemp`, as wide as the number; text up to 24 characters), the person looks at it for `hold` s and nods. In a 3D set the pet is drawn in front of the person while scanning — the arm passes behind its head, the two hands are drawn on top of it | ≈ 3.65 + `hold` |
| `bathPet` | `(target, { hold = 1.8 })` | bath a pet standing IN a bath tub (prop `tub`; the pet is cut below the tub's front rim — `pet.inTub42f(rim)`, sized by `pet.tubFit42f()`; scene files: `"inTub": true` on the pet adds a tub sized to it): turned side-on, the far hand on its side, the near hand holds a shower head (it appears in the hand) angled down at its back — a visible water spray, the fur turns wet (darker, flatter, a thin tail) and the pet puts its ears back; the shower is hung at the hip and BOTH hands lather its back for `hold` s — white foam builds up on the back (and on the hands); the shower again rinses the foam off; the shower is hung up, the person steps back 34 frame units and the pet SHAKES OFF water (as `shakeOff`, from `RigSVG.bathShakeAt42f(hold)` s — driven by the person, no step for the pet) while the person raises both hands, laughing. The fur stays wet until `towelDry`. In a 3D set the pet is drawn in front of the person while the hands work (as `scanChip`) | ≈ 8.3 + `hold` |
| `brushTeeth` | `(target, { hold = 2 })` | brush a pet's teeth: turned side-on, the far hand holds the muzzle under the chin and lifts the lip — the mouth opens part way (`gape` 0.42: teeth, tongue); the near hand brings a pet toothbrush (it appears in the hand) to the teeth and brushes in short strokes for `hold` s, a few foam bubbles on the brush; then the brush is put away at the hip, the hands let go and the pet licks its lips twice | ≈ 3.2 + `hold` |
| `towelDry` | `(target, { hold = 2.2 })` | towel-dry a (bathed) pet: the near hand brings a folded bath towel (it appears over the hand) to its back — the towel opens and WRAPS round its body (it leaves the hand in the same frame); both hands rub on the towel for `hold` s (the towel shifts with each rub), the fur dries and turns FLUFFY (a puffed, wavy outline, a bushier tail); the towel is lifted back into the hand and tucked at the hip; the pet looks happy (ears up, smile) | ≈ 3.7 + `hold` |
| `offerHand` | `(target, hold = 1.6)` | bend (kneel first for a pet on the floor) and hold an open hand out just in front of the pet's muzzle, at the tip of its tongue (`lickPoint`), for `hold` seconds, smiling, the hand still — for the pet's `lick` (`tools/scene.py` adds it to a pet's `["lick", "@person"]`) | `hold` + 1.1 |
| `offerCheek` | `(hold = 1.8)` | while carrying a pet: bend the head down, cheek toward it, eyes squeezed in a smile — for the pet's `lick(…, { face: true })` (`tools/scene.py` adds it) | `hold` + 0.8 |
| `shine` | `(target = null, hold = 2)` | take out a flashlight and shine it at `target` (a rig, an element, `{ x, y }`, or straight ahead), sweeping it a little, then put it away. In a 3D set the beam is a light: it lights the pet it reaches (the pet squints), and in a dark room it throws a pool of light on the floor or the wall. Script: `bà → mèo: rọi đèn` | 2.95 |
| `brush` | `(target, strokes = 4)` | bend and brush along the pet's back with a brush that appears in the hand — grooming | 1.0 + 0.42 × `strokes` |
| `leash` / `unleash` | `(pet)` / — | **stance**: clip a leash onto the pet; a line is drawn from the held leash handle (`items: { R: 'leash' }`) to the pet's collar and follows both of them — `walk` the person and the pet `together` to walk it. `unleash` removes the line. Throws without a leash in hand | 0.95 / 0.95 |
| `walkOnLeash` | `(pet, steps = 4, distance = 0)` | (wave 49 C) **walk a dog on a leash** in one step — the pet does `walkOnLeash(person, steps, distance)` at the same time (`tools/scene.py` adds it). Clips the leash on if it is not on yet (or glances down at the pet), turns side-on and walks `distance` frame units (negative = left; 0 = steps in place) like `walk`; the hand with the leash hangs relaxed, a little forward, the eyes glance down at the pet; the leash has a real length (`RigSVG.LEASH_ROPE_49C` × height) and sags with the distance between hand and collar (never below the floor). Stops together with the pet, turns back — **the leash stays on** (`unleash` next). Holds a leash handle (`items: { L: 'leash' }`, shown or hidden); without one a free hand gets one (hidden, taken out at the start). `leashPlan49c(steps, distance)` gives the timing the pet follows. Dogs and cats (harness walk); a rabbit is refused | — |
| `handOverPet` / `takePet` | `(other)` / `(giver)` | pass a carried pet from one person to another — run both `together`: the giver holds the pet out to the point half way between them, the taker reaches out, the pet passes at 0.55 s and the taker holds it (the `carry` stance). The two should stand about 0.42 × host height apart (`tools/scene.py` walks the giver closer). The taker's `putDown()` returns the pet to its own spot | 1.1 / 1.55 |
| `highFive` | `(other)` | high five: both turn slightly toward each other, raise the hand on the other's side (a wind-up) and slap palms at one point between them — just outside both heads, at head height for two adults; the point leans toward whoever has the shorter arms, so with a child it sits beside the child's head, at about the child's shoulder (a chibi child's arm is shorter than its head is wide), and the adult kneels or crouches to it. A little bounce, big smiles, palms together ~1 s, heads turned to each other. Run it `together` with the other's `highFive` (`tools/scene.py` adds it). In a 3D set the taller one is drawn in front | 2.1 |
| `hug` | `(other)` | step in (both, half the gap each), turn three-quarters to each other, both arms round the other (one at the shoulder blades, one lower, to the other's back), heads side by side cheek to cheek, turned back toward the viewer so both faces show, eyes closed, smiling; a gentle sway (two beats, 1.9 s), then let go and step back to the starting spot. The taller one kneels or crouches to a child (head just above the child's). Run it `together` with the other's `hug` | 3.6 |
| `patShoulder` | `(other)` | comfort: turn to them, put the hand on their side on the outside of their near shoulder, two slow pats, a sympathetic face (brows up, a small smile, head tilted), eyes on them. An adult kneels or crouches to a child; a child too short to reach an adult's shoulder puts the hand on the adult's arm at its own shoulder height; out of reach, a short step in (and back). The other may stand still — `tools/scene.py` makes them look at the patter (`lookAt` with `{ hold: 2.6, up: 1.5 }`). In a 3D set the patter is drawn in front of the other while patting | 3.5 |
| `whisper` / `hearWhisper` | `(other)` / `(source)` | whisper: turn to them, lean in (and step, or step back) until the mouth is just before their ear, a hand cupped beside the mouth, the mouth moving softly for 2 s with a glance aside; then back, a look and a nod. The taller of the two comes down (crouches, or kneels for a child) — the listener too, bending the ear down to a child. `hearWhisper`: lean in a little, head tilted, eyes to the speaker, brows up; then turn to them, eyes wide, smile, nod twice. Run both `together` (`tools/scene.py` adds `hearWhisper`). In a 3D set the speaker is drawn in front | 4.3 / 4.3 |
| `handOverBag` / `takeBag` | `(other)` / `(giver)` | a medicine bag (`items: { R: 'bag' }`, held by its handle) held out with BOTH hands to the point between them at chest height — the other hand under the bottom of the bag, enlarged 1.5× so the cross reads — the taker's hand takes the handle beside the giver's, their other hand under the bag too; for ~0.7 s both hold it, then it passes at 1.25 s (`RigSVG.BAG_AT`) at the same spot on screen, the giver lets go and nods, the taker brings it in and nods thanks. The taker needs a put-away bag: `items: { L: 'bag' }, itemsHidden: true` (`tools/scene.py` gives one). Run both `together` | 2.2 / 2.6 |
| `payByQR` | `(target, hold = 1.4)` | pay by QR code: hold the phone (`items: { R: 'phone' }`, enlarged, back out — a put-away phone is taken out and put away again) to the QR code of a pay stand (`createProp(host, 'paystand').qr`, `set.targetPoint(…)`, or `{ x, y }` in the 400 × 470 frame) so that the code still shows beside the phone, head bent to it, still for `hold` s while it scans, then "ting" — a green tick pops up on the phone — a nod and a smile. In scenes: a `paystand` cutout (or a `props` item) — the preset `reception` / `pharmacy` counters get one on the counter top for you, and the payer walks up to it. |
| `payByCard` | `(target, hold = 1.2)` | pay by card: tap the bank card (`items: { R: 'card' }`) on the reader of the pay stand (`.reader`), lift it off, tap again and hold `hold` s, "ting" + green tick on the card, nod, smile. |
| `giveChange` / `takeChange` | `(other)` / `(giver)` | change: the cashier (`items: { R: 'cash' }` — shown or put away) looks down at their hands and counts 4 banknotes from one hand to the other (each note appears in the receiving hand as the stack hand touches it, lips counting), squares them up, looks up and holds the notes out; both hold them ~0.6 s, they pass at `RigSVG.CHANGE_AT` s. The customer waits watching the hands, then takes them (`items: { R: 'cash' }, itemsHidden: true`). Optional `{ top }` (a point on the counter top, `set.targetPoint(…)`) lifts the hands above the counter. |
| `stampCard` / `takeCard` | `(other?, { top })` / `(giver)` | stamp a loyalty card: the card (`items: { L: 'stampcard' }`, enlarged) in front of the chest, the stamp (gadget 21) in the other hand comes down on the next empty circle, presses firmly for `RigSVG.STAMP_PRESS` s (the body dips with it), lifts — a RED MARK stays on the card (channel `ink`) —, a look at the mark, a nod. With `other`: hold the card out to them; they `takeCard` it (`items: { R: { kind: 'stampcard', stamped: true } }, itemsHidden: true`). |
| `pourDrink` | `({ top })` | pour a drink: the cup in one hand (`items: { L: 'cup' }` — any cup turns into a glass cup showing the drink while `brew` > 0), the pitcher (gadget 22) in the other tips over the cup mouth, a STREAM falls into the cup (channel `pour` = its length) and the LEVEL rises from the bottom to full (`brew` 0 → 1) over `RigSVG.POUR_SECONDS`, the pitcher is set back, the full cup is held out with a nod and a smile and stays in the hand, ready for `handOver`. |
| `wipeCounter` | `(hold = 2, target)` | wipe the counter: a cloth (gadget 20) pressed flat on the counter top (`target`: a point on it — `set.targetPoint(…)`; none: in front of the belly) wiped in wide circles for `hold` s, body leaning and head bent to it, then folded (`fold` 0 → 1, the other hand helping) and tucked at the hip. |
| `kneel` | — | **stance**: go down on the knees (thighs and shins both foreshortened toward the viewer), level with a pet on the floor; `stroke`, `examine`, `giveTreat` play kneeling. `standUp()` gets up | 0.65 |
| `sitOnFloor` | — | **stance** (đợt 42 E): kneel, then sit right down cross-legged on the floor — thighs out to the sides, shins folded across in front, hips on the floor, back upright, both hands on the knees. Speaking, nodding, `wave`, `stroke` a pet beside them and `carry` a small pet onto the lap play sitting (in a scene file the pet comes over, as to a seated person). `standUp()` gets up through a kneel | 1.5 |
| `lieDown` | `(where = 'floor', { head, sleep, lift })` | **stance** (đợt 42 E): lie down on the side — standing: kneel, sit, then lie back; sitting (floor or sofa): straight down. `'floor'`: the head rests on the lower arm; `'sofa'`: on the sofa seat (`rig.seatY()` high, or `lift` frame units above the floor — a scene file sets it to the sofa box under the person), the head on a cushion. `head` `'left'` / `'right'` (default: the facing side, else left); `sleep: true` closes the eyes. The body is drawn horizontal with its lowest point on the floor / seat, a long shadow under it, and the camera frames the lying body. A pet can `lieDown` next to them. Speaking and nodding play lying. `standUp()` rolls up to a sit (floor: then a kneel) and stands | 1.4 – 2.3 |
| `pickUp` | `(target = null, { item = 'toy', side })` | squat down to an item on the floor and pick it up: turn side-on to it, bend the knees deep (heels behind the knees, feet flat), the back straight and leaning ~30° forward, the free arm hanging in front of the knees; the hand closes on the item and it becomes the held item in that hand (`items` kind `toy` ball, `bowl`, `leash`), ready for `handOver`; stand up and turn back. Out of reach: lean further, then shuffle up to 70 units closer. `target`: none (in front), a distance in frame units, `{ x, y }`, a pet rig (its toy, by its front paws) or an element / prop (hidden once picked). The rig draws the item on the floor until the grasp; a hand with no item gets one put away (in a conversation or scene give it `items` + `itemsHidden` — a scene file does). Throws while sitting, lying, riding or carrying a pet, or with both hands full | 2.4 |
| `ride` / `getOff` | — / — | **stance**: sit astride a scooter or motorbike — turn full side-on (keeps the current side; from the front it turns right), thighs level, shins down to the footboard, back leaning a little forward, both hands gripping a handlebar in front of the chest. The rig draws no vehicle: stand the ready-made `scooter` prop (or your own picture) under it — `createProp(host, 'scooter')` gives `rideLift(rig)`, how far to raise the rider so the hips are on its seat — or, for your own picture, put its seat at `rig.rideSeatY()` (frame y, like `seatY()` for a chair). In a scene file: `"rides": "<scooter cutout>"` on the character (references/hyperframes.md → 3D sets). Speaking, nodding and looking keep both hands on the bars; raising an arm (`wave`, `point`) lets go of that side and takes it back after. `getOff` stands up, keeping the facing | 0.6 / 0.6 |
| `bandage` | `(target, wraps = 3)` | bend the knees down to the pet (on the floor: `kneel` first — `tools/scene.py` adds it) turned almost side-on to it (so both arms reach forward together, neither across the chest), the head bent to the leg, and take its near front leg in **both hands**: one holds the paw, the other carries a light-blue bandage roll round the leg `wraps` times; the bandage grows down the leg loop by loop, under the hand. Then a pat and a smile. The bandage **stays on** the pet afterwards (as `wear('bandage')`). Items in either hand are put away meanwhile and taken out after. `target`: a pet rig, or `set.target(person, pet, 'leg')` in a 3D set. The person stays drawn in front of the pet (as for the other exam actions) — `tools/scene.py` stands them by the pet's front leg, on the head side (walking round from the tail side if need be), so the arms do not cross its body. One pet per person | 0.55 × `wraps` + 1.65 |
| `putCone` | `(target)` | hold a clear recovery cone up in both hands (by its rim, in front of the body), bend to the pet, bring it round the pet's head and slip it down to the neck — only then does it pass to the pet, the same size in the same place —, both hands fasten it at the side of the neck (never back toward the tail), a nod, and only then let go. In a 3D set the pet is drawn in front of the person meanwhile, both hands on top of it. The cone **stays on** the pet (as `wear('cone')`). The cone in the hands is its own shape (`ring`, centred where the action puts it — drawn in front of the body while held up, behind it once round the pet), so it rings the head exactly; the hands are put on its rim. Held items and one-pet-per-person as for `bandage` | 3.1 |
| `restrain` | `(target, hold = 3, { head, headSide })` | hold a pet still on the exam table for someone else — run it `together` with the other person's `inject`, `examine`, `listen`, `takeTemp`, `givePill`… on the same pet. Turns almost side-on to the pet (both arms reach forward), bends the knees and leans in, and puts **both hands** on the half of the pet nearest them: standing at the **tail end**, one fist grips the hip and the other hand lies flat on the back; at the **head end**, both hands go under the head — on the chest and at the shoulder — never over its face. Holds `hold` s with a calm face, the head turned and bent to the pet's head, the hands pressing in gently with its breath; then the hand on the back strokes it twice toward the tail (0.85 s) and lets go. The pet does not move. Items in either hand are put away meanwhile. `target`: a pet rig, or in a 3D set `set.target(person, pet, 'body')` with `head: set.target(person, pet, 'head')` and `headSide` (−1 / 1: the pet's head is to the left / right of the screen while held — needed when the pet turns just before) — `tools/scene.py` writes all of it. In a scene file `["restrain", "@pet"]` inside `together`: the restrainer goes to the side of the pet **opposite** the other person (0.27 × host height from its middle; walking round if need be), and `hold` is fitted to the other person's work (their steps up to the one on the pet, minus 1 s) so the restrainer lets go just after they draw back; give `["restrain", "@pet", 2.5]` to fix it | `hold` + 1.85 |
| `washHands` | `(hold = 2)` | mime washing the hands without a tap: turn to the front, both hands together in front of the chest, the head bent to them — rub the palms up and down, interlace the fingers, rub the back of one hand then the other (`hold` split 40 / 30 / 30 %); white **soap foam** swells round both hands as soon as they meet (it is drawn in each hand, so it moves with them), then the hands drop and **shake dry** — the foam shrinks away in 0.3 s —, the head comes up with a smile. Items are put away meanwhile | `hold` + 1.55 |
| `putOnGloves` / `takeOffGloves` | — / — | **held state** (like `wear('gloves')`): turn to the front, head bent to the hands. Put on, one hand at a time: the other hand goes down to the hip and comes back with a limp blue glove held by its cuff (open end toward the bare hand), the bare hand pushes its fingers in — at that moment the glove passes to it (the hand turns blue, the rolled cuff at the middle of the hand) — and the pulling hand slides the cuff up to the wrist and snaps it (the cuff jumps past the wrist and back); then the other hand; then both gloved hands are raised and the fingers flexed twice, a nod. The gloves **stay on** through every following action (`#khep` keeps them; inside `sequence()` and when scrubbing they are a state of the timeline). Take off: the other hand pinches the cuff at the wrist and peels it down over the fingers — the hand is bare again as the glove leaves it, inside out, hanging from the pulling hand —, drops it into a bin at the hip; then the other glove. `putOnGloves` throws when both gloves are already on; `takeOffGloves` throws when no glove is on. In a scene file `"putOnGloves"`, `"takeOffGloves"` (a medium shot of the person, the hands in the frame) | ≈ 5.7 / ≈ 4 |
| `readChart` | `(hold = 2, { side, to, gaze })` | raise the held clipboard (`items: { R: 'clipboard' }`; put away with `itemsHidden` it is taken out and put back) to the chest, enlarged so it reads, the HEAD bent down to it (turned to the front while reading, even when the body is turned three-quarters) (tilted 14°, lowered) for at least 1.3 s, eyes running along the lines; the other hand turns the top page — the board enlarged further while it turns, the page stands curled over the clip for a beat, then goes over behind the board (1.1 s) —, at least 1.2 s more reading, then the head comes up (0.4 s) — turned to **`to`, the listener** (`gaze`: where to look, default `to`; a rig, `{ x, y }` or `set.target(…)`, held after the step like `lookAt`) — and nods twice, slowly and deeply, holding each nod at the bottom 0.55 s with the head really bent (`headPitch`, ~22°) (1.25 s each — still caught at one frame a second). Throws without a clipboard | 7.6 for `hold` ≤ 2.2, longer above |
| `showXray` | `(target, hold = 1.6, { to, gaze })` | turn three-quarters toward an X-ray film / screen, the head turned up to the spot (`lookAt`), and point the index finger at a spot on it, tapping twice ("here"), then turn back — to **`to`, the listener** (a rig or element: the character turns well round to its side, 0.75, holds it 1 s within the step and keeps that facing after, like `face`), or to the held facing without it; the head turns to `gaze` (default `to`) and keeps looking after the step. `target`: an element (the `[data-xray-spot]` of the ready-made `xray` prop — `createProp(host, 'xray').spot` is the same spot in the 400 × 470 frame), `{ x, y }`, or `set.targetPoint(…)`. In a scene file: `["showXray", "<xray cutout name>"]` — `tools/scene.py` adds `{ to }`: the nearest other person (or whom the character `faces`) | `hold` + 1.25 (+ 1 with `to`) |
| `throwBall` | `(direction = 'right', distance = 420)` | wind up and throw a tennis ball in an arc toward `direction` (`'right'`, `'left'`, or a dog: the way it faces); it lands `distance` units away (by default out of frame). Pair it with a dog's `fetch` | 2.15 |
| `pullToy` | `(pet, hold = 2.4)` | tug of war with a dog (the dog does `tugOfWar(person)` at the same time — `tools/scene.py` adds it): hold the other end of the rope the dog grips — a taut rope drawn from the hand to the dog's mouth — and pull against it for `hold` seconds, leaning with every tug, then let go. Stand the dog about 0.3 × your height away, facing you | `hold` + 1.4 |
| `write` | `(dur = 1.2)` | the other hand comes over to the held item (clipboard, phone) and writes a few lines, head down; with empty hands it writes on the left palm | `dur` + 0.87 |
| `call` | `(text = null, dur = 2.4, { mood, side })` | put the held phone to the cheek (its back facing out, the head tilting to it), say `text` over `dur` seconds, put it down. No `text`: listening, small nods. With empty hands it mimes the call with a fist. A chibi's short arm cannot reach the ear in a front view, so the phone goes to the cheek — the usual cartoon shorthand | `dur` + 1.05 |
| `phoneUp` / `phoneDown` | `(side = 'auto')` / — | **stance**: put the phone to the cheek and keep it there; the following steps (`explain`, `speakCues` with a recorded voice, `nod`…) play on the phone, the other hand still gestures. `phoneDown` puts it down. Needs a held phone | 0.8 / 0.5 |
| `notify` | `(text, hold = 1.8, { side })` | the held phone buzzes and a notification card pops up above it — `text` (split into two lines near 24 characters, at a colon or dash if there is one) or `[line 1, line 2]`; the character looks down at it, then up. Needs a held phone. Chain `showPhone` to show the screen too | `hold` + 1.2 |
| `showPhone` | `(hold = 1.8, { side, zoom = 2.6 })` | hold the phone up beside the face, screen to the viewer and **enlarged** so the app on it reads, smile, hold, lower it. Needs a held item | `hold` + 1.0 |
| `tapPhone` | `(dur = 1.6, { side, zoom = 2 })` | phone up in front of the chest (enlarged, screen out), head down, the other index finger taps and swipes for `dur` seconds — booking, checking a reminder. Needs a held item | `dur` + 0.95 |
| `holdSign` | `(text, hold = 2, { color, narrow })` | take out a small sign with `text` (1–3 short lines: a list or `"line 1\|line 2"`; Vietnamese marks render), hold both edges in both hands, raise it in front of the chest facing the viewer, tilt it a little, glance down at it then at the viewer, smile, lower it. The card grows with the text up to ~260 units wide (a child follows the reach of the arms; `narrow`, set by scene files in vertical frames, caps it at 170). `color`: a hex fill (white text on dark fills). A held item is put away and back. In a script: `bác sĩ: [giơ bảng: Giảm 20%]` | `hold` + 1.8 |
| `showSize` | `(size = 'medium', hold = 1.4, { narrow })` | "this big": both hands apart in front of the body, palms facing, the gap by `size` — `'small'` (44), `'medium'` (130), `'big'` (250, arms wide) or a number of frame units — limited by the reach of the arms, a small double bounce, eyes on the gap then the viewer. Scripts: `[to cỡ này]`, `[nhỏ cỡ này]`, `[ra dấu kích thước]` | `hold` + 1.1 |
| `takeSelfie` | `(hold = 1.6, { with, side })` | the held phone (`items: { R: 'phone' }`, put away is fine) goes up at arm's length beside the head, back of the phone to the viewer, enlarged; the head tilts, a big smile, the other hand makes a V sign by the face; a white **flash** at the shot (`flash` channel) — held `hold` — then it comes down. `with`: another character or pet (a rig) — the camera frames both; give the other person `joinSelfie(taker, hold)` at the same time (scene files do) or a pet `tiltHead`. Throws without a phone. Scripts: `[selfie]`, `[chụp ảnh tự sướng]`, `[chụp hình]`, `bác sĩ → bé trai: selfie` | `hold` + 1.2 |
| `joinSelfie` | `(taker, hold = 1.6)` | the other person's part of `takeSelfie`: lean and tilt the head toward the taker, look up at the phone, big smile, V sign with the outer hand. Run it `together` with the taker's step | `hold` + 1.2 |
| `yawnStretch` | `(hold = 1.3)` | a big yawn (mouth wide, eyes shut, head back) with both arms stretched up beside the head and the body on tiptoe, a little more stretch, then the arms down, mouth shut, a shake of the head and a blink. A pet's `yawn` / `stretch` are separate (`is_pet` in tools/script.py decides which one a verb means). Scripts: `[ngáp]`, `[vươn vai]` | `hold` + 2.45 |
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
| `run` | `(distance = 0, { speed = 1, steps = 6 })` | a real **run**, not a fast walk: turns side-on, leans forward, knees high, heels kicked up, elbows bent and arms pumping against the legs, a bounce each step and a **flight phase** (both feet off the floor, the shadow left on the floor) — then stops and turns back to its facing. `distance` in frame units (negative = to the left; the number of steps is chosen so that a planted foot never slides), 0 = on the spot for `steps` steps. `speed` 0.5–2 (1 = 0.3 s a step). Seated / kneeling: stands up first. A hand holding an item keeps it (no arm pump). Scene files: `["run", "@dog"]` runs up beside that character; in `sequence()` / `conversation()` pass the rig itself, `run(dog)` (wave 43, measured on screen when the step is built). `RigSVG.RUN_STEP_42D`, `RUN_CONTACT_42D` | 2.3 on the spot; about 1.3 s for 300 units |
| `jump` | `(times = 1, { height = 1 })` | **jump for joy**, facing the viewer: crouch with the arms swung down (anticipation), push off, both feet clearly off the floor with the arms up in a V and the knees tucked (the shadow stays on the floor and shrinks), land with bent knees, settle. `times` 1–6 (the landing is the next crouch), `height` 0.3–2 (1 ≈ 0.36 × the leg length: ~50 units for an adult, ~32 for a child). Unlike `cheer`'s small hops. Seated: rises into the crouch. A hand holding an item keeps it down | 1.5; +0.75 a jump |
| `dance` | `(style = 'happy', bars = 2, { bpm = 120 })` | a short cheerful **dance** on the beat, facing the viewer: a knee bounce on every beat; odd bars step-touch (a knee lifted left / right, the body leaning, both arms swinging to one side), even bars hip sway with both hands up; the last two beats a spin and a pose (one hand pointing up, the other on the hip, a wink). Feet stay planted. `bars` 1–8 of 4 beats; `style` `'happy'` or `'gentle'` (smaller, for older people). Beat n falls at `RigSVG.DANCE_LEAD_42D` (0.25 s) + n × 60 / `bpm` s from the start of the step — match a music track with `{ bpm }` (60–180, default `RigSVG.DANCE_BPM_42D`). Seated: arms and head only. A hand holding an item keeps it | 4.95 at 120 bpm, 2 bars |
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

**Looking at something** (`lookAt`, held like `face`): `lookAt(target, { head = 1, eyes = 1, dur = 0.35, hold })` turns and
bends the HEAD — not only the eyes — toward `target`: `{ x, y }` in the 400 × 470 frame, another rig (its head), `'L'` / `'R'`
(the own hand, what it holds), an element, or in a 3D set `set.target(rig, other)` / `set.targetPoint(rig, [x, y, z])`; `null`
or `'front'` looks back. The body stays; the head turns up to about three-quarters (`headTurn`, on top of the body's facing)
toward a target to one side and bends down / up toward a target below / above (`headPitch`, up to about 30°), the eyes follow.
`head` / `eyes` 0…1 scale the head and the eye part; `up` (0…1.5, default 0.6) is how far the head may tilt UP (`headPitch` −`up`, 32° each)
— a child next to an adult needs 1.5. Without `hold` it is held: inside `sequence()` the head comes back over 0.35 s
when the next action starts (except another `lookAt`, `idle`, `mark`, `mood`). With `hold` it comes back by itself. At a medium
shot the face is small and a glance of the eyes reads as "looking at the camera" — turn the head. `takeTemp`, `readChart`,
`showXray`, `givePill`, `weigh`, `bandage`, `clipNails`, `eyeDrops`, `cleanEars`, `scanChip`, `bathPet`, `brushTeeth` and `towelDry` look at what they handle. In a scene file: `["look", "@cho"]` (or `"lookAt"`), with
`{ "hold": 1.5 }` as a third item; `["look", null]` looks back. `rig.lookAngles(target)` gives the angles without acting.

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

## Combos — ready-made short scenes (`runtime/combos.js`)

A combo is one name for a chain of the actions above. Use it as a step anywhere a step goes:
`sequence(vet, [['fullCheckup', dog]])`, a scene file `"do": [["fullCheckup", "@cho"]]`, or a
Vietnamese script line (`tools/script.py`). `VGCharacter.list().combos` lists them;
`VGCharacter.COMBOS` holds the table (steps, parameters, Vietnamese words).

| Combo | Arguments | Steps | Script words (vi) |
|---|---|---|---|
| `greetCustomer` | — | `wave`, `bow`, `introduce` | chào khách, đón khách |
| `fullCheckup` | `(pet)` | `listen`, `examine` ears, `examine` teeth (the pet's `openMouth` at the same time), `takeTemp`, `readChart` | khám tổng quát, khám sức khoẻ |
| `vaccinationVisit` | `(pet, scale)` | `weigh` (on `scale`), `inject`, `hideItem`, `giveTreat`, `thumbsUp` | tiêm phòng, tiêm ngừa |
| `goodNews` | — | `relief`, `thumbsUp`, `cheer` | tin vui, báo tin vui |
| `badNews` | — | `worry`, `express('sad', 1.4)`, `nod` | tin buồn, báo tin buồn |
| `waitingImpatient` | — | `checkWatch`, `lookAround`, `crossArms(1.6)` | sốt ruột, chờ lâu |
| `dischargePet` | `(pet, owner)` | `carry`, `handOverPet(owner)`, `countFingers(3)`, `wave` | trả thú, xuất viện |
| `groomingSession` | `(pet)` | `clipNails`, `eyeDrops`, `cleanEars`, `thumbsUp` | chăm sóc tổng hợp, spa thú cưng |
| `prepForExam` | — | `washHands(2)`, `putOnGloves` (the gloves stay on) | chuẩn bị khám, rửa tay đeo găng |
| `bathTime` | `(pet)` | `bathPet`, `towelDry`, `thumbsUp` — the pet stands in a tub (`"inTub": true`, added by `tools/script.py`); the tub may stand on the floor or raised (a table): for a pet low in a floor tub the person bends the head right down and turns the face toward the viewer, so the gaze goes down into the tub | tắm cho thú, tắm cho bé cưng |
| `floorCuddle` | `(pet)` | `sitOnFloor`, `stroke` (the pet comes over), `carry` onto the lap — stays sitting with the pet | ngồi bệt ôm thú, ôm thú vào lòng |
| `napWithPet` | `(pet)` | `lieDown('sofa', { sleep: true })` with the pet's `sleep(3)` at the same time — stand the person at the sofa and the pet on the floor beside it (`tools/script.py` stages both for you, as for "nằm sofa") | ngủ trưa cùng thú, nằm nghỉ cùng thú |
| `welcomeHome` (dog) | `(pet)` | `wave`, `kneel` (the dog's `greet` at the same time), `stroke` (the dog's `wagTail` at the same time) — the dog close in front, facing the person | về nhà, chào thú khi về nhà |
| `playFetch` (dog) | `(pet)` | `throwBall(pet)` — the ball goes the way the dog faces, left or right (the dog's `fetch(260)` at the same time runs that way), `stroke`, `thumbsUp` — keep the dog within about 120 units for the stroke | chơi ném bóng, chơi đón bóng |
| `danceWithKid` | `(kid)` | both `face('front')`, both `dance('happy', 2)` at the same time, `idle(0.6)`, `highFive(kid)` | nhảy cùng bé, quẩy cùng bé |
| `tidyToys` | — | `pickUp` (a toy in front), `hideItem('both')`, `nod` — with `"camera": "auto"` the `pickUp` turn cuts to a full shot of the person in time, so the toy on the floor is in the frame | dọn đồ chơi, cất đồ chơi |
| `assistedVaccination` | `(pet, nurse)` | `washHands`, `putOnGloves`, `inject` (the nurse's `restrain` at the same time), `takeOffGloves`, `giveTreat` | tiêm có người giữ |
| `checkoutCounter` | `(customer)` | the cashier waits while the customer's `payByQR` runs, `giveChange(customer)`, `stampCard` (stamps, not handed over — a customer holding a phone has no free hand for a third item), `wave` | thanh toán tại quầy |
| `farewellOwner` | `(owner)` | `handOverBag(owner)`, `patShoulder(owner)`, `wave` | tiễn khách, dặn dò ra về |
| `celebrateWithKid` | `(kid)` | `highFive(kid)`, `cheer`, `thumbsUp` | ăn mừng cùng bé |
| `happyDog` (dog) | — | `playBow`, `wagTail`, `carryToy(120)` | chó vui |
| `cozyCat` (cat) | — | `groomFace`, `loaf`, `slowBlink` | mèo thư giãn |
| `happyBunny` (rabbit) | — | `binky`, `periscope`, `noseTwitch` | thỏ vui |
| `dispenseMedicine` | `(customer)` | `readChart` (the prescription), `countFingers(3)` (the doses), `handOverBag(customer)`, `wave`. Needs a shown bag and a put-away clipboard: `"holds": { "R": "bag", "L": "clipboard" }, "holdsHidden": ["L"]` (`tools/script.py` gives them). In the `pharmacy` preset `tools/script.py` stands the pharmacist behind the counter (x −120, z −580) and the customer in front of it (x 150, z −380); the bag passes over the counter without a jump | phát thuốc, giao thuốc, bán thuốc |
| `newPatientCheckIn` | `(pet, owner)` | `wave` (the owner's `wave` at the same time; `owner` may be left out), `bow`, `scanChip(pet)`, `readChart` | tiếp nhận thú mới, đăng ký khám |
| `dentalCare` | `(pet)` | `examine` teeth (the pet's `openMouth` at the same time), `brushTeeth`, `thumbsUp` | chăm sóc răng, vệ sinh răng |
| `comfortOwner` | `(owner)` | `express('sad', 1.6)` (the owner's `wipeTears` at the same time), `patShoulder(owner)`, `hug(owner)` | an ủi chủ, động viên chủ nuôi |
| `fullSpa` | `(pet)` | `bathPet` (the pet `"inTub": true` — `tools/script.py` sets it), `towelDry`, `brushTeeth`, `cleanEars`, `thumbsUp`. No `clipNails`: in the tub the lifted paw stays behind the rim | spa trọn gói, tắm sấy trọn gói |
| `postSurgeryCheck` | `(pet)` | `listen` (the pet's `unwell` at the same time — drowsy; a `"wears": "cone"` pet is fine), `takeTemp`, `readChart` | tái khám sau mổ, kiểm tra sau mổ |
| `zoomies` (dog) | — | `chaseTail(3)`, `jump(2)`, `pant(1.4)` | chó tăng động, chạy lung tung, chó quậy |
| `sleepyPet` (dog, cat) | — | `yawn`, `stretch`, `sleep(3)` | ngáp rồi ngủ, lăn ra ngủ, díp mắt |
| `partyTime` | — | `jump(2)`, `dance('happy', 2)`, `cheer` | ăn mừng lớn, quẩy mừng, mở tiệc |
| `lazyAfternoon` | `(pet)` | `sitOnFloor`, `stroke` (the pet comes over), `lieDown('floor', { sleep: true })` (the pet's `sleep(3)` at the same time) — they stay lying until `standUp` | nghỉ trưa với thú, chiều lười biếng |
| `rushToPet` | `(pet)` | `startle`, `run` up to the pet, `stroke`, `relief` | hốt hoảng chạy tới, chạy tới xem thú |
| `tidyUp` | `(pet, person)` | `pickUp` (the toy by the pet), `handOver(person)` — the person takes it only with the same item put away (`"holds": "toy", "holdsHidden": true`; `tools/script.py` gives it) | nhặt đồ đưa, nhặt đồ chơi đưa |
| `scaredPet` (dog, cat) | `(person)` | `tremble(1.5)`, `hide(person)` — it stays there. In a 3D set stand it ~120 further back (z) than the person | thú sợ hãi, sợ nấp sau |

What each step needs still applies: `fullCheckup` reads a held clipboard, `vaccinationVisit`
injects with a held syringe (`items: { R: 'syringe' }`, `itemsHidden: true`), `checkoutCounter` needs a cashier holding cash and a stamp card and a customer with a phone, and the pet must be
within reach. `tools/script.py` gives the items and the scale by itself.

- **In `sequence()`** a combo expands in place into its own steps. A step done together with
  another character (the pet opening its mouth for the teeth) is left out, because a sequence has
  one character.
- **`VGCharacter.combo(rig, name, ...args)`** returns the combo as `conversation()` turns, those
  steps included: `conversation([...combo(vet, 'fullCheckup', dog), [vet, ['explain', 'Bé khoẻ lắm!', 2]]])`.
- **In a scene file** every step becomes a turn of its own, so the camera, the pet's answers,
  kneeling and stepping closer work as for a hand-written turn. A `say` on the same turn is
  spoken first, as its own turn. The other keys go on the first step, and `exit` goes on the last.
  A combo inside `together` is refused.
- To add a combo, add an entry between the `BEGIN` / `END COMBOS` lines (plain JSON). The
  runtime, `tools/scene.py` and `tools/script.py` all read that one table. Its Vietnamese words
  must not already be a single action's word in `tools/script.py` (`tools/check_scene.py` refuses
  a clash, e.g. "nhảy mừng" is `jump`).
- In a scene file the person kneels and stands up by themselves for `stroke` / `giveTreat` on a pet
  on the floor, so don't put `kneel` / `standUp` steps in a combo. End on a step that leaves the
  pet's head in view: `giveTreat` hides part of it behind the hand when the pet faces the person.

## Pets — `VGCharacter.createPet(host, { species, config, wear }).rig`

All pets stand side-on with the **head toward screen right** and the face turned to the
viewer. `walk` with a negative distance turns the animal round first.

**Dogs** (`dog`, `shiba`, `corgi` — short legs, long body —, `poodle`, `husky`, `black_dog`) rest standing:

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `idle` | `(dur = 4)` | breathe, blink, gentle tail wag, ear flick | `dur` |
| `wagTail` | — | fast wag, wiggling hips, tongue out | 1.9 |
| `bark` | `(times = 2)` | a small dip, then the head tosses up, the mouth opens wide and holds a moment, and three red bark lines spring out in front of the mouth — 0.75 s a bark (a pet's own `bark` turn in a 3D scene gets a close shot) | 0.55 + 0.75 × `times` |
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
| `shiverAtVet` | `(hold = 2)` | scared on the exam table (wave 40 C; unlike `tremble`, the whole posture of fear first): crouched flat, shoulders pulled back, ears flat back, tail tucked, big wet eyes looking up, mouth whimpering, a cold-sweat drop, then a fast small shiver (0.05 s a beat) all over | `hold` + 0.8 |
| `struggle` | `(hold = 1.6, { carried })` | wriggle (wave 40 C): carried (`carry` of a person) — four legs paddle in the air, the body twists, the head turns away, the mouth cries, and the carrier's arms hold on and shake with it (the pet writes `vung`, `rig-svg.js` reads it); on the floor — a squirm with the paws planted. `tools/scene.py` passes `{ carried: true }` and frames the carrier's chest | `hold` + 0.4 |
| `groggy` | `(hold = 2.4)` | after anaesthesia (wave 40 C): lying (stays lying) or sitting, head drooping and nodding off, ears down, eyes half open with slow blinks, pupils small, a slow sway, a dizzy mark | `hold` + 1.35 (+ 0.35 to sit) |
| `pawAtCone` | `(times = 3)` | wearing the recovery cone (`wear('cone')`, `createPet({ wear: ['cone'] })`, or after a person's `putCone`; otherwise an error): paws at the cone rim `times` rounds (three strokes, then a head shake), gives up, sits with a sad face for 1.5 s | 2.95 + 1.12 × `times` |
| `eat` / `drink` | `(dur = 2)` | head down to a bowl on the floor in front (the `bowl` prop), chewing / lapping | `dur` + 0.8 |
| `cough` | `(times = 3)` | neck forward, a jolt of the chest and an open mouth for each cough | 0.8 + 0.5 × `times` |
| `openMouth` | `(hold = 1.2)` | chin up, mouth wide open — the lower jaw drops below the chin (about a third of the head), tongue and small fangs show; held the whole `hold` — for `examine(pet, 'teeth')` and `givePill` | `hold` + 0.65 |
| `shakeOff` | — | shake the whole body from head to tail, ears flapping, water drops flying off — after a bath | 1.25 |
| `sneeze` | — | breathe in with the head back, then a quick snap down, eyes shut, mouth open | 1.6 |
| `pant` | `(dur = 2)` | mouth open, tongue out, fast breathing — heat, after running | `dur` + 0.65 |
| `yawn` | — | head back, mouth wide open, eyes shut, then a smack of the lips | 2.15 |
| `rub` | `(times = 4)` | rub against the legs of the person beside it: tail up and curled, cheek and head rubbing side to side, eyes half shut | 0.7 + 0.48 × `times` |
| `greet` | `(hold = 1.4)` | rear up on the hind legs, front paws up toward the person in front, tail wagging hard, tongue out — welcoming its owner. Stand it close to the person, facing them | `hold` + 0.75 |
| `play` | `(times = 2)` | a play bow (chest down, rump up, tail wagging) then hops side to side — run it for two pets facing each other in a `together` | about 2.3 |
| `goIn` / `comeOut` | `(distance = 90)` / `(distance = 120)` | **stance**: walk `distance` units the way it faces into a pet `carrier` and lie down there; `comeOut` gets up, turns to the door and walks out. The carrier hides the pet when it is nearer the camera (3D set: a slightly larger `z`; 2D: its host after the pet's) | about 1.5 / 2.6 |
| `fetch` | `(distance = 260, { delay = 0.7 })` | after `delay` seconds run `distance` units the way it faces, pick a ball up in the mouth, run back to where it started, wag with the ball, drop it. Pair with a person's `throwBall` | about 4–7 |
| `playBow` | `(hold = 1.2)` | play bow — front legs stretched out ahead, chest on the floor, rump up, tail wagging fast, mouth open with two short barks: "come and play" | `hold` + 0.8 |
| `howl` | `(hold = 1.6)` | sit, throw the head back, muzzle up, mouth an O, eyes shut, chest heaving; wavy red sound lines (like `bark`'s, but upward and wavy) drift up from the muzzle for `hold` seconds | `hold` + 1.4 |
| `dig` | `(times = 4)` | nose down, the front paws scrape the floor fast in turns (`times` scrapes each, 0.34 s a scrape), a dark hole under the paws, clods of dirt flying back under the belly and between the hind legs, tail wagging | 0.9 + 0.34 × `times` |
| `carryToy` | `(distance = 0, { kind = 'rope', target })` | pick up a toy — `'rope'` (knotted at both ends) or `'bone'` / `'squeaky'` (a bone) — and trot `distance` units the way it faces (0: on the spot) with the head high, chest out, tail up, proud; then drop it on the floor and wag. `carryToy(person)` / `{ target: person }`: trot to them and drop it at their feet. The toy lies there about a second, then fades | about 4–7 |
| `leanOnLeg` | `(person, hold = 2)` | walk to the standing `person` and lean against their leg — all four paws stay put, the shoulders and hips lean into the shin, the chest touching it —, head up looking at them, eyes half shut, tail wagging slowly for `hold` seconds. Stays beside them. Same plane (same z) as the person | about 2.5 + `hold` + walk |
| `tugOfWar` | `(person, hold = 2.4)` | tug of war with `person` (they `pullToy(pet)` at the same time — `tools/scene.py` adds it and walks the dog a rope's length from them: snout about 0.3 × their height away): grip the end of a rope, brace the legs (paws planted), jerk back then get dragged forward every 0.45 s, head shaking, tail wagging; the rope is drawn taut from its mouth to the person's hand. Then it lets go | 1.1 + `hold` |
| `walkOnLeash` | `(person = null, steps = 4, distance = 0, { distance })` | (wave 49 C, dog and cat) walked on a leash by `person`, who does `walkOnLeash(pet, steps, distance)` at the same time with the same `steps` / `distance` (the person's frame units). Turns to the way they go, wags / looks up while the leash is clipped, then trots in step with the person and ends `LEASH_AHEAD_49C` (0.4) × their height in front of them — or `LEASH_TRAIL_49C` behind when it starts on the far side of where they turn to go (no crossing through their legs). Gains its lead early (longer strides in the first half, feet planted). A dog sniffs the ground for a moment mid-way; both glance back at the person near the end. `{ distance }`: its own distance in its frame units (`tools/scene.py` passes it); without it the distance is measured from where the person stands on screen. No person: trots in place (or `distance`). Rabbits: refused | — |
| `rollOver` | `(hold = 2.4)` | lie down and roll onto the back, belly up, all four paws curled in the air and pedalling, tail sweeping the floor, then roll back and get up (a cat sits again). The head is not upside down: it rests on the floor by the shoulder, face to the viewer | `hold` + 1.6 |
| `chaseTail` | `(turns = 3)` | run round a circle on the floor (about one and a half body lengths across) after its own tail, `turns` times (1–5) at 1.3 s a turn, steady speed — facing left and right in turn, smaller on the far side, head pulled back toward the tail curled up over the back, a trail of dust puffs drawing the circle — then stop, dizzy: swaying, eyes rolling, tongue out, a spinning `dizzy` mark; ends where it started, facing the same way | 2.4 + 1.3 × `turns` |
| `lick` | `(target, times = 5, { face })` | lick the person `target` with a long tongue (wave 40 C: 1.9× longer reach, 1.0 s a lick — reach, rest on the hand / cheek and drag it twice, pull back), lick after lick: on the floor the pet stands on all fours and licks the palm the person holds out just in front of its muzzle (their `offerHand(pet)` at the same time — `tools/scene.py` adds it, kneeling them first in a 3D set, the pet waiting until the hand is there); carried by them, it stretches up to the cheek and licks upward (`{ face: true }` — `tools/scene.py` passes it and adds the carrier's `offerCheek`). `rig.lickPoint(side)` gives the tip of the tongue | 0.75 + 1.0 × `times` |
| `hide` | `(target, { peeks = 2 })` | start (ears pinned, eyes wide, `!`), run behind `target` — a person rig, an element, or `{ x, y }` in its frame; none: where it stands, already behind furniture —, turn back, crouch and peek the head out `peeks` times, trembling; stays there. So that it is hidden: in a 3D set give the pet a z 60–120 further than the person (closer, it seems to run through their legs); in 2D put the person's host after the pet's | about 1.3 + run + 1.5 × `peeks` |
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
| `shiverAtVet` | `(hold = 2)` | scared on the exam table (wave 40 C; unlike `tremble`, the whole posture of fear first): crouched flat, shoulders pulled back, ears flat back, tail tucked, big wet eyes looking up, mouth whimpering, a cold-sweat drop, then a fast small shiver (0.05 s a beat) all over | `hold` + 0.8 |
| `struggle` | `(hold = 1.6, { carried })` | wriggle (wave 40 C): carried (`carry` of a person) — four legs paddle in the air, the body twists, the head turns away, the mouth cries, and the carrier's arms hold on and shake with it (the pet writes `vung`, `rig-svg.js` reads it); on the floor — a squirm with the paws planted. `tools/scene.py` passes `{ carried: true }` and frames the carrier's chest | `hold` + 0.4 |
| `groggy` | `(hold = 2.4)` | after anaesthesia (wave 40 C): lying (stays lying) or sitting, head drooping and nodding off, ears down, eyes half open with slow blinks, pupils small, a slow sway, a dizzy mark | `hold` + 1.35 (+ 0.35 to sit) |
| `pawAtCone` | `(times = 3)` | wearing the recovery cone (`wear('cone')`, `createPet({ wear: ['cone'] })`, or after a person's `putCone`; otherwise an error): paws at the cone rim `times` rounds (three strokes, then a head shake), gives up, sits with a sad face for 1.5 s | 2.95 + 1.12 × `times` |
| `eat` / `drink` | `(dur = 2)` | head down to a bowl on the floor in front (the `bowl` prop), chewing / lapping | `dur` + 0.8 |
| `cough` | `(times = 3)` | neck forward, a jolt of the chest and an open mouth for each cough | 0.8 + 0.5 × `times` |
| `openMouth` | `(hold = 1.2)` | chin up, mouth wide open — the lower jaw drops below the chin (about a third of the head), tongue and small fangs show; held the whole `hold` — for `examine(pet, 'teeth')` and `givePill` | `hold` + 0.65 |
| `shakeOff` | — | shake the whole body from head to tail, ears flapping, water drops flying off — after a bath | 1.25 |
| `sneeze` | — | breathe in with the head back, then a quick snap down, eyes shut, mouth open | 1.6 |
| `pant` | `(dur = 2)` | mouth open, tongue out, fast breathing — heat, after running | `dur` + 0.65 |
| `yawn` | — | head back, mouth wide open, eyes shut, then a smack of the lips | 2.15 |
| `rub` | `(times = 4)` | rub against the legs of the person beside it: tail up and curled, cheek and head rubbing side to side, eyes half shut | 0.7 + 0.48 × `times` |
| `greet` | `(hold = 1.4)` | rear up on the hind legs, front paws up toward the person in front, tail wagging hard, tongue out — welcoming its owner. Stand it close to the person, facing them | `hold` + 0.75 |
| `play` | `(times = 2)` | a play bow (chest down, rump up, tail wagging) then hops side to side — run it for two pets facing each other in a `together` | about 2.3 |
| `goIn` / `comeOut` | `(distance = 90)` / `(distance = 120)` | **stance**: walk `distance` units the way it faces into a pet `carrier` and lie down there; `comeOut` gets up, turns to the door and walks out. The carrier hides the pet when it is nearer the camera (3D set: a slightly larger `z`; 2D: its host after the pet's) | about 1.5 / 2.6 |
| `fetch` | `(distance = 260, { delay = 0.7 })` | after `delay` seconds run `distance` units the way it faces, pick a ball up in the mouth, run back to where it started, wag with the ball, drop it. Pair with a person's `throwBall` | about 4–7 |
| `rollOver` | `(hold = 2.4)` | lie down and roll onto the back, belly up, all four paws curled in the air and pedalling, tail sweeping the floor, then roll back and get up (a cat sits again). The head is not upside down: it rests on the floor by the shoulder, face to the viewer | `hold` + 1.6 |
| `knead` | `(times = 6)` | crouch, chest low, eyes shut, and knead: each front paw in turn is raised up and forward clear of the chest (a quarter of the cat's height), holds, and presses down, 0.6 s a press, purring (a fine tremble), tail up, a heart over the head — a blanket or a lap | 0.7 + 0.6 × `times` |
| `lick` | `(target, times = 5, { face })` | lick the person `target` with a long tongue (wave 40 C: 1.9× longer reach, 1.0 s a lick — reach, rest on the hand / cheek and drag it twice, pull back), lick after lick: on the floor the pet stands on all fours and licks the palm the person holds out just in front of its muzzle (their `offerHand(pet)` at the same time — `tools/scene.py` adds it, kneeling them first in a 3D set, the pet waiting until the hand is there); carried by them, it stretches up to the cheek and licks upward (`{ face: true }` — `tools/scene.py` passes it and adds the carrier's `offerCheek`). `rig.lickPoint(side)` gives the tip of the tongue | 0.75 + 1.0 × `times` |
| `groomFace` | `(times = 3)` | **cats**: sit, lick a front paw twice, then wipe it over the cheek and up to the ear `times` times (1–6), 0.9 s a stroke, head tilting into it, eyes squinting. The paw is drawn over the face (channel `gp`). Verbs: "rửa mặt", "liếm lông" | about 1.9 + 0.9 × `times` |
| `loaf` | `(hold = 2)` | **cats**: the "cat loaf" — drop to the floor, paws and tail tucked under, head sunk into the shoulders, eyes half closed, slow breathing, one compact round shape for `hold` s, then sit up. An action with a hold, not a stance. Verbs: "nằm ổ bánh mì", "nằm cuộn" | `hold` + 1.25 |
| `slowBlink` | `(times = 2)` | **cats**: look at the person and close the eyes slowly (0.8 s), hold them shut for 1 s, open slowly (0.8 s) — a sign of trust; a heart shows at the first one. Verbs: "chớp mắt chậm" | 0.5 + 2.6 × `times` |
| `batToy` | `(times = 3)` | **cats**: crouch, wiggle the rump; a ball of yarn appears in front. Each swipe of a front paw sends it bouncing and rolling one step further away (channels `toy`, `toyX`, `toyY`, `toyR`); the cat leans after it; the ball rolls out at the end. Verbs: "vờn", "vờn đồ chơi" | 1.2 + 1.15 × `times` |
| `archBack` | `(hold = 1.4)` | **cats**: the Halloween cat — a start-and-land, then the back arched high with a jagged puffed-up outline (channel `phong`; the body is visibly bigger, unlike `hiss` which is the face), stiff legs, tail straight up and bushy, ears flat, fangs. Verbs: "cong lưng", "dựng lông" | `hold` + 1.2 |
| `sitInBox` | `(hold = 2)` | **cats**: a cardboard box (drawn by the pet rig, channels `box`, `boxX`) pops up in front, the cat crouches, hops in and sits with only head and ears over the rim, half-shut eyes, purring, hearts; then hops out and the box vanishes. The cat ends where it started. Verbs: "chui hộp", "ngồi trong hộp" | `hold` + 3.4 |
| `hide` | `(target, { peeks = 2 })` | start (ears pinned, eyes wide, `!`), run behind `target` — a person rig, an element, or `{ x, y }` in its frame —, turn back, crouch and peek the head out `peeks` times, trembling; stays there. So that it is hidden: in a 3D set give the pet a z 20–40 further than the person; in 2D put the person's host after the pet's | about 1.3 + run + 1.5 × `peeks` |
| `lieDown` / `sleep` | — / `(dur = 3)` | **stance**: lie down; `sleep` lies down, head down, eyes closed, tail curled, slow breaths, and stays lying when it wakes | 0.6 / `dur` + 1.4 |
| `walk` | `(steps = 4, distance = 0)` | walk on the spot, or `distance` frame units | 1.7 on the spot |
| `enter` | `(from = 'left', distance)` | run in from outside the frame on the `'left'` or the `'right'`, stop at its own spot | 2.6 |
| `exit` | `(to = 'right', distance)` | turn that way and run out past the edge of the frame — **ends hidden** | 2.7 |

**Accessories for people.** `rig.wear('mask')` (a medical face mask under the eyes), `rig.wear('gloves')`
(exam gloves: the hands turn blue, a rolled cuff at each wrist — the same gloves `putOnGloves()` puts on and `takeOffGloves()` takes off
on the timeline), `rig.wear('cap')` (a surgical cap over the hair); `wear(kind, false)`
takes it off; `createCharacter(host, { id, wear: ['mask', 'cap'] })` and `"wears"` on a person in a scene file.
A person who is seated (`sitDown`) stays seated while carrying a pet — it lies on the lap.

**Accessories.** `rig.wear('cone')` puts on a recovery cone (an Elizabethan collar, seen as a
clear ring round the head), `rig.wear('bandage')` a bandage on the near front leg;
`rig.wear(kind, false)` takes it off. They take effect at once (not a timeline step) and stay on
through every action. To show a person putting them on, use the person's `bandage(pet)` / `putCone(pet)` — the
bandage grows round the leg, the cone opens round the head, and both stay on afterwards. `createPet(host, { species, wear: ['cone'] })` does the same at creation,
and a scene file takes `"wears": "cone"` on a pet.

**Rabbit** (`rabbit`) rests **sitting**, long ears up; it **hops** wherever a dog trots (`walk`, `enter`, `exit`), and
does the shared actions (idle, sit / stand / lie down, sleep, unwell, eat, drink, scratchItch, tremble, cough, openMouth,
shakeOff, sneeze, pant, yawn, rub, play, goIn / comeOut, `hide`, `wear`) plus:

| Action | Arguments | What it does | ≈ seconds |
|---|---|---|---|
| `hop` | `(times = 2)` | hops on the spot: a crouch, a leap with the hind legs out and the ears swept back, a landing | 0.7 + 0.66 × `times` |
| `thump` | `(times = 2)` | alert: ears straight up, eyes wide, the hind feet thump the ground | 0.85 + 0.4 × `times` |
| `eatCarrot` | `(bites = 4)` | sit up and hold a carrot (it appears) to the mouth in both front paws — whole for a second —, then nibble it `bites` times (2–8), 1.35 s a bite: two chomps, the carrot (wave 40 C: bigger, cut flat with scalloped bite marks, crumbs falling) a clear step shorter and held still until the next bite; the last stub is chewed in the paws for a second, then pushed into the mouth and swallowed; a lick of the lips | 4.1 + 1.35 × `bites` |
| `binky` | `(times = 2)` | a happy leap: crouch, high jump, a twist of the body in mid-air (it tilts and its width narrows) with the hind legs kicking out and the ears flying, then a landing; each leap twists the other way. Verbs: "nhảy vui", "binky" | 1.2 × `times` + 0.4 |
| `flop` | — | **held pose** (until `standUp`, like `lieDown`): sways, then flops over, flat on the floor, all four legs stretched out, head down on its cheek, ears splayed, eyes half shut; it then breathes slowly for 1.5 s. Other actions in between (`noseTwitch`, `tiltHead`) are done lying. Verbs: "nằm vật ra", "nằm nghiêng" | 2.5 |
| `periscope` | `(hold = 1.6)` | up on the hind legs, back upright, front paws tucked at the chest and off the floor, ears high, looking left and right. Verbs: "đứng hai chân", "ngóng" | `hold` + 1.2 |
| `noseTwitch` | `(hold = 1.6)` | the pink nose twitches fast (swelling and shrinking 8 times a second), the whiskers flick and thicken, the ears turn each its own way — in a scene it gets a CLOSE shot (the rabbit fills 95 % of the frame). Verbs: "giật mũi", "hít hít" | `hold` + 0.8 |
| `hide` | `(target, { peeks = 2 })` | start (ears pinned, eyes wide, `!`), run behind `target` — a person rig, an element, or `{ x, y }` in its frame —, turn back, crouch and peek the head out `peeks` times, trembling; stays there. So that it is hidden: in a 3D set give the pet a z 20–40 further than the person; in 2D put the person's host after the pet's | about 1.3 + run + 1.5 × `peeks` |

`chew(times = 4)`: munch what it was just given — each chew opens the jaw wide and shuts it, 0.45 s a chew, so it
reads at one frame a second — eyes half shut, then lick the lips twice (≈ 0.8 + 0.45 × `times` s). The wide-open
mouth is the pet channel `gape` (0…1; `openMouth`, `chew`, `bark`, `yawn`, `eat` use it; small mouths — `meow`,
`pant`, `cough` — still use the old `mieng`). In a scene file a turn `["giveTreat", "@dog"]` on its own adds it for the pet by itself.

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
`heart`, `zzz`, `sweat` (drop — nervous, guilty), `anger` (vein), `music` (note), `dizzy` (a spinning swirl with stars — `chaseTail` shows it). It follows the head as it
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
| `tub` | `width = 240`, `height = 40`, `color` (the wave stripe) | a pet bath tub seen from the side (`bathPet`): the opening, water, a white front wall with a thick front rim. `height` is the top of the front rim above the floor. Draw it in the PET's units — host height = pet host height × 470 / 330, floors on one line, the tub before the pet in the HTML — sized by `pet.tubFit42f()` (`{ rim, length }` → `{ width: length, height: rim }`), and call `pet.inTub42f(rim)`: the pet is cut below the rim, so its legs are inside the tub (a sitting cat stands up). Scene files: `"inTub": true` on the pet (3D sets) |
| … | | `createProp` returns `{ svg, kind, seatY, notify }` (a scooter also `rideLift`, `roll`; an `xray` viewer `spot`). **`notify(message, { hold = 2.5 })`** on a `monitor` (or a `laptop` with `facing: 'viewer'`) returns a paused timeline: a notification card pops up on the lower half of its screen and goes after `hold` s — `message` is a title, or `{ title, text }` (cut with "…" to fit). It is drawn in the prop, so in a 3D set it follows the camera with the screen |
| `tree` | `color` (the leaves), `width = 300` | a tree, taller than a person (outdoor sets: `park`, `street`) |
| `lamp` | `color` | a street lamp |
| `xray` | `spot = [0.675, 0.74]`, `image`, `color`, `width = 176` | an X-ray viewer: a lightbox on a wheeled stand, shoulder-high beside a standing person, with a ready-drawn film of a dog's skeleton (`image`: your own film instead). `spot` is where on the film to point, from its top left (0…1 each way); the drawn film has a hairline fracture there. **`prop.spot`** is that point in the 400 × 470 frame (a person host of the same size and place points at it with `rig.showXray(prop.spot)`); the film element `[data-xray-spot]` is the same point for any layout |
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
| `VGCharacter.createCharacter(host, { id, config, items, itemsHidden, wear })` | build a person; returns `{ rig, id }`. `items: { R: 'cup' }` (or `'clipboard'`, `'phone'`, `'syringe'`, `'pills'`, `'leash'`, `'bag'`, `'card'`, `'stampcard'`, `'cash'` (a medicine bag — `handOverBag`), `{ kind: 'phone', image: 'app.png' }` for a picture on the phone's screen, or a function returning SVG; `L` for the other hand) gives any character that item to hold; `itemsHidden: true` starts with it put away, ready for `take()` or `showItem()`. Omit `config` to use the one baked into the bundle; pass `null` to ignore it |
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
