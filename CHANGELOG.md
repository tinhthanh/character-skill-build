# Changelog

## 0.59.0

Added — light that lives in the room
- **Two lights on a character**: a window is a light too (cool sky in the day, sunlight in the evening). A
  character between a window and a lamp gets a warm side and a cool side: the shading on the body ends in
  the second light's colour (`rig.lightShade(…, fill, fillAmount)`), with a thin rim of it.
- **Backlight**: a bright window right behind a character darkens them a little, with a rim on both sides
  and a soft glow of light round the hair and shoulders. A lamp behind them gives only a thin rim, and no
  longer lights the front of the body (light from behind does not reach the face we see).
- **Standing in the sunlight**: inside the patch of sun from a window a character is brighter and warmer,
  has a rim of sunlight and a hard shadow along the sun, in the day as well as the evening.
- **Clouds** pass over the sun every ~11 s: the sun patch, the shaft, the dust and the light on the
  characters dim and come back (`set.light({ clouds: false })` to turn them off).
- **Lamps flicker when switched on** (at least 0.9 s) before they come up (`set.lamp(…, { flicker: false })`
  for a smooth fade).
- **TV** prop (`"kind": "tv"`, in the living room): in the evening and at night it and the screens light the
  room and the characters with a flicker that changes colour every couple of seconds, on the walls and the
  floor too.
- **Shadow on the wall behind**: a character standing near the back wall darkens a soft patch of it, offset
  away from the light.
- At night the window glass is dark blue; the lamps in the room no longer lighten it.

Fixed — after a Gemini review of the lighting
- The warm tint of the evening made the characters grey: the tint now keeps their colours (less sepia, more
  saturation).
- The glow of a lamp right behind a person showed as a dirty orange outline round the head: only windows
  give that glow now.

## 0.58.0

Added — a whole film from one script
- **`tools/script.py`, scenes**: each line `=== name · bối cảnh: … · ánh sáng: … · máy: …` opens a scene. The
  part before the first `===` is shared — frame, music (for the whole film), opening (first scene), closing
  (last scene), logo, cast (a scene keeps only who appears in it; a cast line inside a scene adds or changes
  people for it, e.g. the cat "on the table" only in the clinic). It writes `kich-ban-1.scene.json`, …,
  `kich-ban.film.json` and builds the film with `tools/film.py` (fades, music ducked under speech, `.srt`,
  poster).
- **Hook opening**: `"hook": { "title", "text", "dur" }` in a scene file (`mở đầu: hook | … | …` in a script) —
  big words pop over the first moments of the scene, which starts at once, instead of a static card.
- **App notifications in a script**: `thông báo: Tiêu đề | nội dung` slides a notification card in on the
  next turn.
- `"set": { "shading": false }` turns the shading on the characters off.
- **Floor lamp** prop (`"kind": "floorlamp"`, in the living room): a real light source beside the sofa.

Fixed — after a Gemini review of a 3-scene vertical film
- **Auto camera, examine / give a pill** in a vertical frame: one medium shot of the person with the pet for
  the whole action (`mid` beats), measured at the times it covers only, instead of a close shot of the pet
  with half a face at the edge.
- **Close shots**: a person beside the subject who cannot be pushed out of the frame is taken in up to the
  head, never cut through the face; a medium two-shot (`tight`) takes in a third person when that widens it
  by 30 % at most.
- **Where people stand (script)**: whoever examines or treats the pet stands nearest it, so they never walk
  across the owner; people stand farther apart.
- In a vertical frame the notification card sits at 27 % of the height, clear of the captions.
- Pets: stronger shading and a wider rim of light.

Not done
- Reflections of the characters on a shiny floor: `-webkit-box-reflect` does not render in the capture
  path; dropped.

Measured
- The shading on the characters (0.57.0) costs about 3 % of the render time (a 29.5 s film: 39.0 s with it,
  37.8 s without); the slower figure reported for 0.57.0 was the machine being busy.

## 0.57.0

Added — characters in the light, the air of the room
- **Shading on the characters**: in a lit 3D set every person and pet is lit from the side of the nearest lamp
  (or of the main light / evening sun) and darker on the other side, cut exactly to the drawing
  (`runtime/shading.js`: a gradient masked by the figure itself; `rig.lightShade()`); the lamp's colour
  tints the lit side.
- **Switching a lamp by hand**: a turn with only `"lamp"` makes the person reach for the switch on the lamp
  (`set.targetPoint`, `set.lampPoint`) and the light changes as the hand gets there; `"camera": "auto"`
  frames the person with the lamp for that turn.
- **The light source stays in the shot**: `set.frameOn` takes a lit lamp's bulb into the frame when that
  widens the shot only a little (up to 30 %, 60 % for a full shot).
- **Haze** on the walls in the evening and at night; **dust** sparkling in a shaft of sunlight (it follows
  the timeline, so seeking is exact); **screens** (laptop, monitor) give a soft blue light in the evening
  and at night (`"kind": "screen"` lamps).
- **Shiny floors** (`"room": { "gloss": true }`, on in the exam room and the pharmacy): lamps and windows are
  reflected as a soft streak on the floor.

## 0.56.0

Added — light in 3D sets
- **`"set": { "light": "day" | "evening" | "night" }`** (`set.light({ mood, lamps, windows })`): walls, floor
  and boxes are shaded by the direction of the main light, room corners and the foot of the walls are
  darker (ambient occlusion), boxes sit on a soft contact shadow; evening is orange with long shadows,
  night is dark and blue.
- **Lamps**: `"lamps": [{ "name", "x", "y", "z", "color", "power", "on", "kind": "point" | "ceiling" }]`, and every
  `"lamp"` cutout (street lamp, the living room's standing lamp) is a light by itself. A lamp has a
  glowing bulb (a ceiling light also a faint cone of light), a warm pool on the floor and the walls that
  fades with distance, makes people and pets near it brighter and warmer (each frame, as they walk), gives
  them a rim of its colour on the side facing it, and throws long shadows away from it.
- **Windows**: a back-wall panel with `"window": true` glows and casts a patch of sunlight on the floor,
  with a faint shaft of light through the air (day and evening).
- **Switching lamps**: `"lamp": "on"` / `"off"` / `{ "name", "on", "dur" }` on a turn (`set.lamp(name, on)` in
  code). A lamp the script switches on starts off.
- Presets: the exam room's window is a window; the living room has a standing lamp by the sofa (and a lower
  sofa, so a seated person fits it); the park's street lamp lights up in the evening.
- `tools/script.py`: `ánh sáng: ngày | chiều | tối` in the header, `[bật đèn]` / `[tắt đèn]` in a turn.

## 0.55.0

Added — scripts in plain words, vertical video
- **`tools/script.py kich-ban.txt`**: write the scene as plain Vietnamese text — a header (`bối cảnh: phòng
  khám · máy: tự động · khung: dọc`, opening / closing cards, logo, music), one line naming the cast
  (`bác sĩ (vet) · chó (corgi, trên bàn, đeo loa)`), then one line per turn: `bác sĩ (vui): lời`,
  `chó: [sợ, run]`, `bác sĩ → chó: cho thuốc`, `cùng lúc: … | …`. It places everyone for the set (a pet
  "on the table" on it, the first person beside it, the rest along the room), writes `kich-ban.scene.json`
  (still editable by hand) and builds it. Errors name the line, in Vietnamese. Actions and moods are
  written in Vietnamese or by their own names.
- **Vertical video with `"camera": "auto"`** (1080 × 1920): a speaker is shown alone at chest height —
  shot / reverse shot instead of two small people side by side — and the opening wide shot takes only the
  group around the first turn.

Fixed (Gemini review of the vertical trial film)
- Vertical captions sat at the very top, under the app's tabs, and were cut into one-line scraps: they now
  sit at 17 % of the height above the characters' heads (the camera places people lower in a vertical
  frame to leave that space), on up to two lines.
- In a vertical frame, examining / giving a pill / stroking a pet is a close shot of the pet (the hand
  comes in), not two small people far away; a pet's shot leaves room for its emotion mark.
- Vertical shots of people are smaller (a medium shot was one big head filling the frame); a vertical wide
  shot uses more of the width, so less empty wall above.
- Hyphens do not break across lines in cards and captions ("sô-cô-la").

Changed
- `set.frameOn`, close shots: when someone standing right beside the subject cannot be moved out of the
  frame, the shot stays close (they are cut at the edge) instead of widening into a small two-shot.

## 0.54.0

Added — automatic direction
- **`"camera": "auto"`** in a 3D set: the camera chooses every shot. The scene opens on a wide shot; a speaker
  is framed with the one they answer (or with whoever acts with them in a `together`); a strong mood is a
  close shot of the speaker; a pet's expression is a close shot of the pet; an action toward someone frames
  both. A shot lasts at least 2.5 s (1.2 s before someone speaks — the speaker is always shown), turns that
  want the same shot share it, and a change of size on the same people pans instead of cutting. Turns with
  their own `"view"` keep it. Runs as `set.direct(tl, beats)` when the scene is built.
- **`chew`** for pets (munch, then lick the lips). A turn `["giveTreat", "@dog"]` on its own makes the pet
  chew what it was given, at the moment it leaves the hand.
- `captions({ cuts })`: the extra time a caption stays on screen for reading ends at the next camera cut —
  `tools/scene.py` passes every cut, so a line no longer lingers over the next shot.

Fixed (Gemini review of the trial scene)
- A person who walks up to a pet (to give a pill) and back stays in the shot: the steps closer and back
  belong to that turn's shot, and the shot is measured at its start and its end (`frameOn(…, { at, seek })`).
- The listener of a line is whoever the speaker just acted with (the dog just given a pill), else the
  last other speaker, else whoever just acted (the vet calming the frightened dog).
- A pet's `chew` opens the mouth wider and bobs the head, so it reads in a medium shot.

Changed
- `set.frameOn` also keeps others from peeking in at the bottom of the frame (a dog's ears under a close
  shot of the vet): it raises the frame, moves sideways, or tightens the shot. `set.lastFrame` holds the
  measurements of the last call.

## 0.53.0

Added — automatic camera, emotion marks, sounds on actions
- **Automatic views** in a 3D set: `"view": "close"` (or `"medium"`, `"full"`) on a turn frames that turn's
  character and cuts back to the previous view on the next turn; `"view": { "on": ["vet", "dog"], "size":
  "medium" }` frames several. The camera is worked out when the scene is built, from the drawn figures where
  they stand at that moment (`set.frameOn(subjects, size)`), and moves so that nobody else is cut in half by
  the frame edge (fully out, or taken in).
- **Emotion marks** over the head, for people and pets: `!`, `?`, heart, `zzz`, sweat drop, anger vein, music
  note — readable in a wide shot where a face is too small. `rig.mark(kind)` / `rig.mark(null)`; `"mark"` on
  a turn holds it through that turn. A pet's expression brings its own mark (scared `!`, curious `?`, sleepy
  `zzz`, happy heart, angry vein, guilty / pain sweat); `"marks": false` in the scene file turns that off.
- **Sounds on actions**: `"sounds": { "bark": "bark.wav", "cat.meow": { "file": "meow.wav", "volume": 0.8,
  "at": 0.1 } }` places the sound each time that step plays (of anyone, or of that character), at its start.
- `pet.mood(name, { mark })` holds a mark with the face.

Fixed (Gemini review of the trial scene)
- In a 3D set a mark is drawn on top of everything: a person standing in front of a pet no longer hides the
  pet's `!` or heart.
- `mood(null)` always takes the mood's mark away (a heart stayed over a dog for ten seconds: `sequence()`
  builds every step twice, and a flag flipped in the draft).
- A blink returns to the held face: a sleepy cat no longer opens its eyes wide under its `zzz`.
- A sad or guilty pet's mouth turns down instead of still curving like a smile.
- A pet's expression keeps its mark until the expression ends.
- `"sounds"` no longer plays when `mood` / `mark` ends (`mood(null)`).

## 0.52.0

Added — pet expressions
- **`pet.express(name, hold)`**: nine faces for every species and breed — happy, excited, sad, scared,
  angry, curious, guilty, pain, sleepy. Ears, eyes, pupils, mouth, head and tail act together (a dog wags
  when happy, bares its fangs when angry; a cat arches and hisses; a rabbit's ears spread out when sad).
- **`pet.mood(name)`** holds a face through the actions that follow; `mood(null)` ends it.
- Three new face channels: `lanh` (wet, shining "puppy eyes"), `nhan` (eyes squeezed shut, > <) and
  `nanh` (bared fangs).
- Scene files: `"mood"` on a pet's turn — one beat alone, or held through that turn's `"do"`.
- The action catalog (`tools/actions.sh`, `tools/reel.py`) has a row for each pet expression.

Changed
- `tools/scene.py`: a person who **sits** (bench, waiting-room chair) no longer stays out of reach of a pet
  they carry or stroke — the pet walks over first (it used to jump into their arms in 0.6 s).
- After `examine` / `giveTreat`, for which a person steps right up to the pet, they step back to where
  they stood — standing that close they hid the pet's face for the rest of the scene.
- `tools/scene.py` warns about long stretches with nothing said or shown (more than 8 s without a line, a
  toast or a popup).
- Framing check: measures the head and body that are drawn (not the whole 400 × 470 frame, nor a leash
  or a held item); a person cut at the knees by the bottom edge is a normal medium shot, a pet cut there
  is not.

Fixed
- A rabbit's long ears crossed over each other when they drooped (`unwell`, `tremble`); they now spread
  out to the sides.

## 0.51.0

Added — finishing a film
- **`tools/film.py`:** `"music"` (+ `"musicVolume"`) lays background music under the whole film —
  looped to length, faded in and out, lowered about 10 dB while someone speaks (side-chain ducking on
  the film's own sound); `"subtitles"` (default on) writes `film.srt` with every spoken line at its time
  in the film; `"poster"` (default 1.0 s) writes `film.jpg`.
- `tools/scene.py` writes `timings.json` next to each composition (length and spoken lines).
- `tools/film.py` keeps only the first scene's `"intro"` card and the last scene's `"outro"` card — a
  "download the app" card no longer cuts into the middle of the film — and says so when that leaves the
  film without one. It builds every scene before rendering any, so a broken scene fails at once.
- `tools/scene.py --no-intro / --no-outro` leave a scene's cards out.

Added — framing check (3D sets)
- `set.framing()` (runtime/set3d.js): who the frame edge is cutting through right now, with how much of
  them shows and which edge.
- `tools/scene.py` sweeps the whole scene every 0.25 s and warns when a "view" leaves a character half in
  the frame for 2 s or more, e.g. `14.2–27.8 s: the left edge of the frame cuts through "boy" (about 61 %
  shows)`. Passing through the edge during a pan is not reported.

## 0.50.0

Added — more pets, opening and closing cards, films
- **Breeds:** dogs `corgi` (short legs, long body), `poodle`, `husky`, `black_dog`; cats `white_cat`,
  `calico` (with black and orange patches — a new pet colour `patches`). A breed may now carry its
  own default `shape`.
- **Rabbit** (`rabbit`): a new species — long ears, round body, big hind legs, a cotton tail; rests
  sitting; **hops** wherever a dog trots (`walk`, `enter`, `exit`); `hop`, `thump`, and the shared
  actions (eat, sleep, unwell, scratchItch, play, carrier …).
- **`"intro"` / `"outro"`** in scene files: a full-frame opening card (the scene starts after it) and
  a closing card after the last turn — brand colour, logo, title, a line of text, a call-to-action
  button. Every turn-based time (camera, captions, toasts, popups, sound) is shifted by the opening.
- **`tools/film.py film.json`** — builds and renders several scene files and joins them into one film
  with `fade`, `slide` or `cut` transitions, sound in step (a silent scene gets a silent track).

## 0.49.0

Added — notifications on screens in a set
- **`prop.notify(message, { hold })`** — `createProp` returns it for a `monitor` and a `laptop` facing
  the viewer: a timeline that pops a notification card (icon, title, a line of text, cut with "…" to fit)
  up on the screen. It is drawn inside the prop, so in a 3D set it stays on the screen as the camera
  moves. A laptop facing away refuses with a clear message.
- **`"popup"`** on a turn in a scene file with a 3D set: `{ "on": "<cutout name>", "title", "text",
  "hold" }`; cutouts take a `"name"`.

## 0.48.0

Added — waiting room, outdoors, accessories for people
- **People's accessories:** `rig.wear('mask' | 'gloves' | 'cap')` — a medical mask (below the eyes,
  over the mouth, follows the face as it turns), exam gloves (the hands turn blue), a surgical cap over
  the hair. `createCharacter(host, { wear })` and `"wears"` on a person in a scene file.
- **Carry while seated:** a seated person stays seated while picking a pet up — it lies on the lap.
- **Pets:** **`greet`** (rear up toward the owner, tail wagging), **`play`** (a play bow, then hops —
  two pets `together`), **`goIn` / `comeOut`** (into a pet carrier and lie down; out again).
- **Outdoor 3D sets:** `set.preset` **`park`** (sky, hills, grass, a bench, trees, a lamp) and
  **`street`** (shop fronts, a sidewalk, lamps, a tree); new props **`tree`** and **`lamp`**.

Fixed
- **A person "seated" "on" a box sat on top of it like squatting.** `tools/scene.py` put their feet on
  the box top; a seated person now has the feet on the floor at the box's front edge, the hips at its
  top, and a note says when the box height does not match the character's seat height.

## 0.47.0

Added — phone calls on a split screen, notifications
- **`"layout": "split"`** in scene files: a phone call between two places. The frame splits in two
  halves with their own backgrounds (`"sides"`: a preset or wall / floor colours), a divider between
  them; every character has `"side"` and an `x` within its half. The half that is not speaking dims.
- **`"toast"`** on a turn: an app notification card (icon, bold title, a line of text) slides in at
  the top of the frame as the turn starts and stays 2.5–4 s.
- **`notify(text)`** for a person holding a phone: the phone buzzes and a notification card with the
  text pops up above it.

## 0.46.0

Added — passing a pet, kneeling, play
- **`handOverPet(other)` / `takePet(giver)`** — pass a carried pet from one person's arms to
  another's, run `together`: the giver holds it out to the point half way between them, the taker
  reaches, takes it and holds it (the `carry` stance). A new state channel `omGive`.
- **`kneel`** — a stance: down on the knees, level with a pet on the floor (a new `kneel` channel
  foreshortens the shins as `seat` does the thighs); `standUp` gets up.
- **`throwBall(direction, distance)`** with a dog's **`fetch(distance)`**: a ball flies in an arc; the
  dog runs out, brings it back in its mouth, wags.
- **`rub`** for pets — rubbing against the legs of the person beside it.
- **Prop `carrier`** (pet carrier, door left or right), also as a cutout and a scene prop.

Fixed
- **A pet's "home" could be recorded as someone's arms.** `carry` read where the pet's SVG was at
  build time; with two people carrying the same pet, the draft of one could leave it in the other's
  arms, and the pet then showed in that person's arms for the whole scene. `carry` now uses the pet's
  own host (`pet.host`, `pet.homeAttrs`) and measures it at home.
- `throwBall` and the generic action sweeps: a hand holding an item throws with the other hand.
- CI: the check page yields during its long catalog loop, and `tools/chrome_run.py` waits up to
  300 s for a reply (the runner timed out reading the page title).

## 0.45.0

Added — do / don't gestures, aftercare and grooming
- **Gestures:** **`thumbsDown`** (new hand shape: thumb pointing down), **`stopSign`** (palm held
  up), **`fingerWag`** ("no, no"), **`beckon`** ("come here"), **`fingerHeart`** (new hand shape
  with a red heart that pops up and beats), **`vSign`**.
- **Pet accessories:** `rig.wear('cone' | 'bandage')` — a recovery cone round the head, a bandage
  on the near front leg; on at once and through every action. `createPet(host, { wear })`, and
  `"wears"` on a pet in a scene file.
- **Grooming and medicine:** **`brush(pet)`** (a brush appears in the hand), **`giveTreat(pet,
  { kind: 'pill' })`**.
- **Pets:** **`shakeOff`** (with water drops), **`sneeze`**, **`pant`**, **`yawn`**.
- The action catalog (review sheet, reel) takes `wear` on an entry.

Fixed
- **3D sets flickered during camera moves.** The camera was applied only from the master
  timeline's `onUpdate`, which GSAP skips when a renderer seeks with `seek(t)`; such a frame kept
  the camera of the frame drawn before it, and with frames rendered in parallel, neighbouring frames
  alternated between two camera positions (a character jumping back and forth while the camera
  pans). New **`set.drive(tl)`** applies the camera on every frame however it is reached;
  `tools/scene.py` writes it. Re-run `tools/scene.py` on 3D scenes built with an earlier version.
- **3D sets: a pet popped in front of the person beside it during a camera move.** A person and a
  pet standing side by side at the same depth were stacked by their distance to the camera, which
  changes as the camera turns — mid-pan the order swapped in one frame (the dog on the exam table
  jumping over the vet's hand). They are now stacked by where they stand in the room: the person
  stays in front at every camera angle.
- **3D sets: a table jumped in front of and behind the person beside it.** A box was stacked by the
  camera distance of its centre; a person standing beside an exam table, level with the middle of its
  depth, is at the same distance, so every camera move or small step swapped them. Near a box (overlapping
  it across the room), "behind" now goes by position in the room — behind its front face is behind the
  box, at any camera angle. A character standing on the box, and a person tending it, are always above
  the box.
- **Camera moves in a scene file were too fast to look smooth.** A `"view"` without `"dur"` took 1.5 s
  however far the camera went; a long move then swept 40+ px a frame and juddered at 30 fps.
  `tools/scene.py` now gives each move time for its distance (at most 220 units, 18° of yaw, 420 of
  distance a second; 1.5–4 s) and notes a `"dur"` that is too short.
- **A short walk turned the whole body sideways and back.** `walk(steps, d)` with `d` up to 70 units
  (the step closer `tools/scene.py` inserts before `examine` / `giveTreat`) now steps sideways
  without turning (`RigSVG.SIDESTEP`).

## 0.44.0

Added — symptoms, care and gestures
- **Pet symptoms and care** (dogs and cats): **`scratchItch`** (sit, scratch the neck with a hind
  paw), **`limp`** (a front paw held up, the head dipping each step; walks a distance like
  `walk`), **`tremble`** (crouched, ears pinned, tail tucked, shaking), **`eat`** / **`drink`**
  (head down to a bowl on the floor, chewing / lapping), **`cough`**, **`openMouth`** (for a
  dental exam).
- **People with pets:** **`examine(pet, 'ears' | 'eyes' | 'teeth')`** with a penlight that
  appears in the hand; **`giveTreat(pet)`** (a bone treat, gone when the pet takes it);
  **`leash(pet)` / `unleash()`** — a stance: a leash line from the held handle (new item
  **`'leash'`**) to the pet's collar, following both while they `walk` together.
- **Gestures:** **`ponder`** (hand to the chin), **`crossArms`**, **`handsOnHips`**,
  **`introduce`** (hand on the chest), **`callOut`** (a hand raised high, calling out),
  **`relief`** (a long breath out), **`startle`**, **`lookAround`**, and **`hurry`** — a walk with
  quicker steps.
- **Props `bowl`** (`fill`: food, water, empty) and **`scale`** (`reading`: '4.2 kg'), also as
  cutouts in a 3D set and as `props` in a scene file.
- `tools/actions.sh --zoom 2` for bigger cells.

Fixed
- **A hand reaching for something closer than the arm's length overshot it**: `stroke`,
  `listen`, `inject` and the new actions straightened the arm toward the target, so the hand
  ended below a pet's head standing on the exam table right beside the person. The elbow now
  bends (two-link reach) so the hand stops at the target.
- **3D sets:** a person and a pet at the same depth (within 12 units — a pet on the exam table
  beside the vet) draw the person in front, so the hand that examines, injects or gives a treat
  is not hidden behind the pet.
- `tools/scene.py` walks a person to 0.16 × its height from a pet before `examine` /
  `giveTreat` (pet's head, higher and further than its body).

## 0.43.0

Added — gestures, greetings and moods
- **`clap`**, **`countFingers(n)`** (new hand shapes `mot` / `hai` / `ba`: one, two, three fingers,
  drawn upright like the thumbs-up, the hand enlarged 1.7× and each count held 0.8 s so they read), **`checkWatch`** (a big
  watch appears on the wrist, raised to the chest), **`scratchHead`** (elbow up by the head, the
  hand behind it — the arm is drawn behind the head, and on the way down the forearm folds in
  and the hand relaxes, so no fist flashes beside the head), **`headInHands`** (elbows down, both hands on
  the cheeks, head sunk — a chibi's arms do not reach the top of the head), **`bow`**, **`wai`**
  (Thai greeting). The two-handed and "show" gestures turn the character to face the viewer for
  their length (turned three-quarter, the far hand is hidden behind the body) and back.
- Two new arm channels for gestures that need one exact pose: `ovL/R` + `ovBatL/R`, `ovCangL/R`
  (screen angles applied last, after the elbow rules), and `sauDauL/R` (draw the arm behind the
  head); `handZoomL/R` enlarges the upright hand shapes.
- **`handshake(other)`** — both people reach to ONE shared point half way between them at waist
  height, so an adult and a child of different heights still meet; run it `together`.
  `tools/scene.py` walks the person close enough first.
- **Expressions `crying`** (tears that run down the cheeks, sobbing shoulders), **`embarrassed`**
  (deeper blush, a big sweat drop, looking away) and **`sleepy`** (a yawn held open about a
  second, drooping eyes, nodding off). New face
  state channels: `khoc` / `khocY` (tears), `moHoi` (sweat drop), `doMa` (blush).
- **`set.preset`** in scene files: `reception`, `exam`, `pharmacy`, `living-room` — a furnished
  room in one key; your own boxes, panels and cutouts are added after it.

Added — look at every action before it goes into a scene
- **`tools/actions.sh <id> [--turned] [--only labels]`** — a review sheet: one row per action, six
  moments through it, each action run through `sequence()` exactly as `tools/scene.py` runs it
  (with the item in hand or the pet within reach it needs). A row whose action throws is red and
  listed on the terminal; the run then exits 1.
- **`python3 tools/reel.py <id> [--turned] [--render] [--clips]`** — a HyperFrames composition in
  which the character performs every action in turn, its name on screen; `--render` makes the mp4,
  `--clips` also cuts one mp4 per action (`clips/NN-name.mp4`).
- Both read **`tools/action-catalog.json`**: every action as a ready demo (steps, items, a pet).

Fixed
- **Inside `sequence()` an action's first instant was lost**: a hand shape or pose set at the
  very start of a step (`thumbsUp`'s fist, `point`, `cheer`, `march`, `walkForward`,
  `countFingers`, `checkWatch`, `stroke`, `listen`) was not drawn for its first part — the hand
  stayed open until the next change. `sequence()` measured each step by playing it to the end
  and back, which made GSAP treat those zero-time sets as already drawn; it now measures a draft
  and adds the real step untouched. `tools/check.html` now runs every single-step catalog action
  through `sequence()` and compares it, key by key and frame by frame, with a direct call.
- With `seed()`, `sequence()` now gives the same random choices (blinks, gestures, mouth shapes)
  as calling the action directly; building its draft no longer draws from the random sequence.
  Seeded scenes therefore blink and gesture differently than in 0.42.

Not added
- A high five was tried and left out: standing close, the big chibi heads sit exactly where the
  two hands would meet; standing further apart, the arms do not reach.
## 0.42.1

Fixed
- **Pictures in a 3D set rendered in the wrong place.** `tools/scene.py` stood every `set.cutouts`
  image as an `<img>` without a size; until the picture loaded it measured 0 wide, `set.update()`
  centred it on that, and HyperFrames captured those frames with the picture half its width off to
  the right (in a close shot, a bench at the back of the room landed across a person in front).
  The tool now reads each picture's size from the file (PNG, JPEG, GIF, WebP) and writes `width` /
  `height` on the element; a file it cannot read gets a note. `references/hyperframes.md` says to do
  the same in a composition written by hand.
- **Two pictures with the same file name overwrote each other.** Pictures are copied next to the
  composition by file name, so `props/table/sprite.png` and `props/bench/sprite.png` became one
  picture shown twice. A second file with a name already taken is now copied as `sprite-2.png`
  (cutouts, panels, screens, phone screens and `show` images alike); the same file used twice is
  still copied once.

## 0.42.0

Added — the vet's work and pets in the clinic
- **`listen(pet, hold)`** — bend to the pet and put a stethoscope on its body (it appears in the
  hand, tube up to the neck), listen with the head tilted, move it once, nod.
- **`inject(pet)`** with a new held item **`'syringe'`**: needle toward the pet's body, the plunger
  goes down (a `plunger` state channel), pull back, smile. The pet must be on the side of the
  syringe hand; otherwise a clear error. New item **`'pills'`** (a medicine bottle).
- **`carry(pet)` / `putDown()`** — a held stance: bend down, take the pet in both hands and hold it
  in front of the chest, its head between the arms, front paws tucked, slightly enlarged (1.15×)
  so it reads, both hands closed around it; the carrier turns to face the viewer while carrying
  (a three-quarter hug put the far arm across the pet's face) and back on `putDown`. Speech and other steps
  play while carrying, and the pet keeps doing its own actions in the arms. The pet's SVG moves
  into a slot of the person's SVG between the torso and the arms (the hands hug it), as a function
  of the state, so any frame renders the same. `putDown` returns it to where it was picked up;
  putting it down after walking away is refused. In a 3D set the carried pet's floor shadow hides.
- **Pets: `lieDown()`** (a held stance, like `sitDown`), **`sleep(dur)`** (lies down, head down,
  eyes closed, slow breathing; stays lying when it wakes) and **`unwell(hold)`** (ears down, sleepy
  eyes, head low, tail drooping, a sigh).
- `set.target(from, to, 'body')` aims at the pet's body instead of its face; `tools/scene.py`
  uses it for `listen` and `inject`, and walks the person up to the pet first for `listen`,
  `inject` and `carry`, as for `stroke`.

Fixed
- **Reaching down to a pet while turned three-quarter toward it** (stroke, listen, inject, carry):
  the arm angles were blended with the turn, so the arm came out short and low — at an exam table
  the hand stopped at the table's edge, 80 px short of the cat. The reaching arm now uses screen
  angles (`aim`), like pointing and handing over.
- A tilted held item is only lifted in the palm if it is a cup (to bring its rim to the lips); a
  tilted syringe floated away from the hand.

## 0.41.0

Added — phones and computers, for videos about software
- **`call(text, dur)`** — put the held phone to the cheek and say a line (or listen, nodding,
  with no text). The phone turns its back to the viewer and the head tilts to it. A chibi's
  short arm cannot reach the ear from the front, so the phone goes to the cheek. With empty
  hands it mimes the call. The upper arm goes out to the side (100°), the elbow at chin level
  outside the face, the forearm back up to the cheek, and the head tilts 15° to meet the phone.
  With the elbow raised (two earlier tries), the upper arm ran under the jaw and the big head hid
  the shoulder: the granny seemed to have lost her right arm.
- **`phoneUp()` / `phoneDown()`** — the same, as a held stance: the steps in between (`explain`,
  `speakCues` with a recorded voice, `nod`) play on the phone while the other hand gestures.
  In a scene file, `"phone": true` on a turn with `say` wraps its line this way.
- **A far arm no longer gestures with its upper arm hidden.** Turned three-quarter, the free hand
  that gestures while speaking is the far one when the near one is busy (holding a phone at the
  cheek). One of its poses folds the forearm in across the chest, and a far arm folded in hides
  its upper arm (so the sleeve does not lie on the chest): only a forearm across the belly was
  left, coming out of the side of the top. A far leading arm now only opens out toward the
  listener. Applies to every spoken line, not only phone calls.
- **`showPhone(hold)`** — hold the phone up beside the face with the screen to the viewer,
  enlarged (2.6×) so an app on it reads. **`tapPhone(dur)`** — phone up in front of the chest,
  the other index finger tapping and swiping.
- **A picture on the phone's screen**: `items: { R: { kind: 'phone', image: 'app.png' } }`
  (`"holds": { "R": { "kind": "phone", "image": "app.png" } }` in a scene file).
- **`typing(dur)`** and two props: **`laptop`** (on a table or counter top; facing away, its lid
  hides the typing hands, or facing the viewer with `image` on the screen) and **`monitor`**
  (a desktop screen showing `image`). Both are also 3D-set cutouts (`"screen"`, `"facing"`).
- **Pictures on 3D-set panels**: `"image"` fills a panel — a TV or wall screen with the app,
  a poster, an X-ray, a sign.
- After a Gemini audit of the first test video: `typing` and `tapPhone` bow the head and look
  down at the screen (head down 14, pupils at the bottom of the eye, lids half down — a chibi's
  big eyes need the lowered lids to read as looking down; the first version read as staring at
  the lens, "frozen"), `typing` bobs the shoulders with the keystrokes, and the laptop lid is
  lower. `tapPhone` followed by `showPhone` in a sequence keeps the phone up and enlarged, so it
  goes straight from the chest to the face instead of shrinking back in between.
  `tools/scene.py`: in a 3D set, a turn without a line whose camera pans in waits for the camera
  before its hand action (the person was half out of the frame while tapping) — and
  `conversation()` now starts a turn that opens with a pause at its scheduled time, so the
  camera move tied to that turn is not delayed along with the action — and a
  `"phone": true` line keeps the phone at the cheek until its caption is gone.
- Held items got two state channels: `itemZoomL/R` (scale about the palm) and `itemBackL/R`
  (show the item's `data-back` side, hide its `data-front` side).

Fixed
- **A box near the camera lost a piece of its front face when depth blur was on.** Chrome draws
  a 3D plane with a CSS filter with pieces missing when it spills out of the frame: the front of
  a reception counter vanished from the middle on, and the receptionist behind it showed her
  legs as if she stood in front of it. Faces of a box that spill out of the frame are no longer
  blurred (a sharp foreground box instead of a broken one). Present since 0.39.0.

## 0.40.0

Added — 3D sets, after an audit of 0.39.0
- **Characters walk, enter and leave in a 3D set.** A rig's walk moved its drawing inside its
  own frame, so in a 3D set its shadow stayed behind, its depth and stacking did not change,
  and it could not leave the room. The set now turns the rig's walking offset into movement
  along the room's x axis; the shadow, the depth order and the depth blur follow. `"enter"` and
  `"exit"` in a scene file walk through a side wall (put a door panel there); a character
  outside the room fades out over a quarter of its width either side of the wall.
- **Seated people in a 3D set.** `"seated": "chair"` or `"stool"` stands the ready-made seat
  right behind the character.
- **Vertical frames in a 3D set.** The camera starts closer, aims lower in the frame (62 %),
  and captions go to the top of the safe area, above the characters' heads — they covered the
  faces. The wide shot in a vertical frame crops the sides of the room instead of shrinking it
  to a strip, and the generated floor reaches 1500 units in front of the room so a camera far
  back does not see an empty band under it.

Fixed
- `"shot"` on a turn of a 3D scene was accepted and did nothing; it is now an error pointing
  to `"view"`.
- **A character that steps closer (to hand over or stroke) no longer starts where it ends.**
  `tools/scene.py` placed the character at the spot it reaches after the approach walk, then
  walked it further — it ended up standing on the other person. The initial facing toward
  `"faces"` used the same final spots; both now use the starting spot.
- **A character is in place as soon as it is placed** (`set.place`, `set.stand`), not only once
  the timeline runs: a preview of frame 0 (`tools/peek.sh`) showed the hosts piled in the top
  left corner. Sizes are measured before the walking offset is applied, so the first frame
  rendered no longer depends on which frame a renderer seeks to first.
- **`point()` at a character or pet works.** It accepted only an element, a DOMRect or a frame
  point; given a rig (as `tools/scene.py` passes for `["point", "@cat"]`) every arm angle
  became NaN and the whole figure shrank and twisted for the length of the gesture — in flat
  scenes as well as 3D. A rig now means its head; anything else unusable is an error.
- **Handing over with the far arm in a three-quarter stance no longer pops.** The arm held out
  stayed in the layer in front of the body while it held the item and moved to the masked far-arm
  layer the frame the item left the hand, so the upper arm vanished behind the jacket for an
  instant. An outstretched far arm now keeps the masked layer, item or not. And the hand fades in
  as the held item (with the fingers drawn on it) fades out: they switched at half way, which left
  a ghost cup floating next to an open hand for a few frames. Applies to flat scenes too.
- **The free near arm hangs while the far hand carries something in a three-quarter stance.** A
  character that rests with folded hands (the vet) kept its near arm folded across the chest
  with nothing to fold into — the sleeve lay diagonally over the jacket, the hand floated at the
  chest above the cup. The same after handing the item over, when the far arm rests hanging. The
  near arm now blends to hanging as the body turns (only while it is at rest); with both hands
  empty the folded hands stay as they were.
- **Walking sideways with a cup, the cup arm comes from the shoulder.** The upper arm hung straight
  down behind the torso, so the elbow was hidden and only a level stub of forearm stuck out of the
  middle of the chest. Near full profile the upper arm now goes forward about 26° (the forearm folds
  less, the cup stays at belly height); in a three-quarter stance it is unchanged, where a forward
  upper arm would put the elbow out on the hip. The near arm's hang (above) also lets go
  gradually over 10–60° instead of 10–20°, so the first steps of a walk no longer bend it across
  the belly for a frame.
- **The shoulder joins the jacket.** On an outlined character with long sleeves (the vet and
  the other `tayDai` characters) the outline filter sat on the whole arm group, so the sleeve cap carried a closed
  black ring wherever it lay over the jacket. Walking sideways, the near arm (in front of the
  middle of the torso) looked like a paper cut-out pasted on, with a knob at the shoulder pivot.
  The arm outline is now a separate copy under the arm, masked out over the shoulder cap where
  it overlaps the jacket and fading in down the upper arm from the armpit; where the cap sticks
  out past the jacket it keeps its outline, so the shoulder contour stays closed. The same idea
  as a weighted-mesh shoulder in skeletal editors, done with a mask. Front views change by a few
  pixels at the shoulders (`docs/characters.png` re-rendered).
- **The far arm carrying an item in a three-quarter stance no longer runs down the chest.** The
  whole arm was drawn in front of the torso so the item would not hide behind the body: the
  sleeve ran straight down over the jacket and covered half the name badge (2 s into the
  hand-over scene). Now only the hand and the item are in front; the upper arm and forearm are in
  the masked far-arm layer and show only where they stick out past the jacket. The hand is placed
  with the arm's and forearm's transforms, so it stays on the end of the forearm. This holds while
  the arm starts to reach out (aim already past half, forearm still folded), where a single frame
  used to drop the whole arm back over the chest. Side-on (walking)
  is unchanged: the whole arm behind the body.
- **`set.target(from, to)`** — an aim point for `point` / `stroke` taken from positions in the
  room instead of the screen, and computed when the action reads it (after earlier walks).
  Those actions aimed from screen positions at build time, i.e. for the first camera angle; a
  camera that turns later (even on that turn) left the hand reaching for empty floor.
  `tools/scene.py` uses it for `point` and `stroke` in a 3D set, and notes when the target
  stands at another depth (z): a hand only reaches in the character's own plane.
- `captions({ follow: true })` throws a clear error for a character in a 3D set: the bubble is
  placed once per line from the page layout, and in a set the camera moves the speakers.

## 0.39.0

Added
- **3D sets.** `VGCharacter.createSet(view)` builds a room out of flat CSS 3D planes (floor,
  walls, panels, boxes) with a camera you move — `yaw`, `pitch`, `distance`, `lens`, aim point,
  `zoom` — while the characters stay the 2D rigs and always face the lens. A person turns to
  compensate for the camera's angle; each character's shadow lies on the 3D floor under its
  soles. In a scene file: `"set"` (room, boxes, panels, camera), `"z"` and `"on"` on characters,
  `"view"` on turns, `"wide": true` for an overview of the whole room
  (`examples/scene-3d/scene.json`; `references/hyperframes.md` → 3D sets).
- **Foregrounds and depth of field in 3D sets.** `set.stand(element)` stands a flat picture in
  the room like a character — a ready-made prop, an image — and `"cutouts"` in a scene file
  does the same; placed near the camera it slides past faster than the room when the camera
  pans. A `blur` camera value blurs whatever lies away from the point the camera aims at (the
  floor is built in strips so that it blurs with depth). New ready-made prop: `plant`.
- **The camera stays near eye level.** `pitch` is limited to −8…15° and `yaw` to ±60°
  (`VGCharacter.CAMERA_LIMITS`); a camera outside them is an error. A trial isometric view
  (looking down 35°) showed the characters as cards standing on the floor. The wide shot is
  `VGCharacter.OVERVIEW` instead: a very long lens at a low angle.

How it is put together, and why
- A rig placed inside a `preserve-3d` element is drawn once and then only stretched while the
  camera moves, so it comes out pixelated in a close shot — nothing a page can do makes Chrome
  redraw it. The set therefore projects each character's spot itself and places the host as a
  plain 2D element, and gets occlusion by stacking copies of the 3D world between the
  characters, each holding the boxes that lie at that depth.
- The camera is a function of time: `move` and `cut` are markers on the timeline, replayed from
  the starting camera every frame. Built as GSAP `set()` tweens, two cuts in a row recorded each
  other's values, and HyperFrames rendered the frame at 3 s with the long lens of a shot at 10 s.
- Limits: no view from behind a character, occlusion per box rather than per pixel, and the
  backdrop should stay plain.

## 0.38.7

Fixed — two regressions from 0.38.2, found by auditing 0.38.2–0.38.6
- **Chest details no longer vanish for a character created while its host is hidden.** The
  width of the shirt, used to cut chest details at the edge of a turned body, was measured
  once; inside a `display: none` host it measured 0, and from then on every pocket, zip and
  stethoscope was cut away whenever the character turned. It is now measured only when it
  can be, and again after the character is rebuilt. (A HyperFrames clip that starts late
  was not affected.)
- **`point`, `wave` and `cheer` no longer snap at the elbow.** The minimum bend of a raised
  arm jumped from −9° to +9° as the forearm passed through a slight reverse bend: the largest
  step between two frames at 60 fps went from 5.9° to 20.4° for `point`, 4.2° to 18.4° for
  `wave` and 8.7° to 12.6° for `cheer`. The added bend is now a continuous function of the
  bend already there, and the steps are back under 9°, 9° and 11°.

Changed
- `speak`: a character resting with folded hands takes 0.5 s instead of 0.35 s to open its
  forearm (it travels more than 100°).

## 0.38.6

Fixed
- **`stroke`: the hand on the pet is a hand.** It was the relaxed, side-on hand, and it
  flipped over with every stroke, passing through zero width — a spike at the end of the arm.
  The stroking hand is now the open hand and keeps its width.
- **Open hands no longer thin out at arm angles gestures hold.** The thumb changes side
  between 20° and 30° from a hanging arm (0.38.2 put it at 34–46°, where an arm held out
  diagonally sits), and the far hand no longer narrows while the body is only partly turned.
- **`speak` no longer reads as a hand on the hip.** Every character opens the forearm out to
  the side with an open hand; turned toward someone, it gestures with the arm on the
  listener's side and keeps its stance (0.38.5 did this only for characters that rest with
  folded hands). If the listener-side hand holds an item, the other hand gestures.
- **`point()` with no target is level with the character's own shoulder.** The default
  target sat at an adult's shoulder height, so children pointed upward, hand over the face.
- **`speakCues`: the first gesture comes with the first words.** Gestures were anchored only
  to pauses inside the line, so every line began with the arms at rest — 1.5 s on a 7.5 s
  line. Lines longer than 2.4 s now also gesture on their opening.

## 0.38.5

Fixed
- **Lip-sync: the mouth no longer trails the voice.** Measured on three spoken lines (two
  Vietnamese, one English, cues from `tools/cues.py`): the mouth opening matched the
  loudness of the voice best when shifted 67 ms earlier — the mouth was about two frames
  late. `speakCues` now starts every mouth shape 60 ms before its cue; the same three lines
  now match best at 0–17 ms.
- **`speak` in a turned stance gestures toward the listener.** A character that rests with
  folded hands opened its near hand, which points away from the person it is talking to.
  It now keeps its three-quarter stance and gestures with the arm on the listener's side,
  like `explain`. (If that hand holds an item, it opens toward the viewer as before.)

## 0.38.4

Fixed
- **The hand on a cup has a thumb.** It shows above the index finger, pointing toward the
  lid; four fingers alone read as four pills stuck on the cup.
- **The legs turn with the body.** In a three-quarter stance the zip moved toward the facing
  side but the gap between the trouser legs stayed in the middle. Both hips now shift the
  same way, by less than the chest.

## 0.38.3

Fixed
- **Clipboard and phone are gripped too.** A thumb lies over the front of the item, coming
  from the cuff; the phone also shows three fingertips at its far edge. The fist behind the
  item is hidden, as for the cup (`grip: false` leaves the thumb out).
- **An item in the left hand is no longer covered by the right hand.** A character that rests
  with folded hands kept its free right hand at the belly, on top of the cup. That hand now
  hangs at the side. (With the item in the right hand the left hand lies behind it and reads
  as a supporting hand — unchanged.)
- **`speak` for characters that rest with folded hands.** The gesture moved the forearm to
  where it already was, so only the elbow swung out and the pose read as a hand on the hip.
  These characters now open the forearm out to the side, hand open — a small `explain`.

## 0.38.2

Fixed
- **`thumbsUp` shows a thumb pointing up.** The thumb was drawn along the forearm, so with
  the forearm across the chest it pointed sideways and read as "pointing at the pocket". The
  fist is redrawn (four curled fingers as bands, thumb rising from its top edge) and is kept
  upright whatever the angle of the arm.
- **Open hand while speaking: the thumb is on top.** With the forearm held out level, the
  thumb pointed at the floor and the hand read as a lumpy fist; on the left hand it was
  already on top, so the two hands did not match. The side of the thumb now follows the real
  on-screen angle of the forearm, the same for both hands.
- **A held cup is gripped.** The whole hand was drawn under the cup, so only fingertips
  showed at one edge and the cup read as stuck to the belly, or to the end of the wrist when
  handed over. `kit.parts.cup` now draws four fingers across the front of the cup, starting
  at the cuff on the side the arm comes from; the fist behind the cup is hidden
  (`grip: false` leaves the fingers out). Custom items get the same with a
  `<g data-grip="1">` group.
- **Hands redrawn.** Open hand: a narrower palm, fingers of different lengths that fan out
  slightly, and a thumb that stands clear of them — it was a square palm with four short
  equal fingers. Relaxed hand: one tapered shape instead of a blob with scalloped tips.
  Pointing finger: thicker and shorter.
- **`vet` wears light closed shoes with a dark sole.** The skin-coloured flats with a bare
  instep read as bare feet.
- **The chest turns with the body.** In a three-quarter stance the zip, pockets, badge and
  stethoscope only got narrower with the shirt, so the torso read as a frontal torso squeezed
  flat. They now move toward the side the character faces (the collar follows by half as
  much) and are cut off at the far edge of the body. Applies to every character.
- **A raised arm is never ruler-straight.** Pointing, handing over and presenting put the
  forearm exactly in line with the upper arm. An arm raised more than 40° now keeps at least
  9° of bend at the elbow; the upper arm gives back part of it so the hand stays close to
  where it was. Hanging arms and rest poses are untouched.
- **No flap of cloth under a raised arm.** The gusset left at the armpit when an arm goes up
  ended in a point below the shoulder; it is now a small rounded shape.

## 0.38.1

Fixed
- **The near arm no longer lies over the chest in a three-quarter stance.** The near shoulder
  moved toward the middle of the body in a straight line with the turn, so at three-quarter
  the whole near arm covered the chest pocket and, facing left, half of the stethoscope. It
  now follows the cosine of the turn and stays at the edge of the body. Applies to every
  character.
- **Folded hands, far arm:** more of the far sleeve shows beyond the edge of the body, and
  the far hand lies under the near hand at the middle of the belly, its cuff visible.
- **`vet` jacket:** the hem is wider than the hips (the trousers showed as a ridge beside
  the hem when the body turned); the wrist joint of long sleeves is smaller.

## 0.38.0

Changed
- **`vet` wears a new long-sleeve zip jacket.** The wrap scrubs are gone: their short, flared
  sleeves turned into two flaps of cloth with thin bare arms when the arms spread, and into
  blocks over the cheeks when they were raised. The whole arm is now cloth with an outline
  (`longSleeves: true`); round ribbed collar, front zip, rounded chest pocket with the badge
  text, slanted hip pockets, hem band. Grey, purple stitching and the stethoscope stay.
  Characters built on other outfits are unchanged.
- **`vet` rests with its hands at the belly** (upper arm 14°, forearm −82°; was 19°, −97°).
  In a three-quarter stance the hands used to ride up against the chest pocket.
- **Folded hands in a three-quarter stance show the whole far arm.** The far arm is drawn in
  two layers: the upper arm behind the body, its sleeve showing beyond the far edge with the
  elbow at waist height, and the forearm and hand in front of the body under the near hand.
  0.37 hid the upper arm and drew a short forearm stub, which read as a missing arm. The far
  forearm is shaded like its upper arm, so the two hands do not merge.

## 0.37.2

Fixed
- **One-arm speech gestures in a three-quarter stance.** When only the listener-side arm
  opened and the other stayed folded, its forearm lay level at the height of the folded
  forearm: the two lined up and read as one long arm through the body. That arm now reaches
  diagonally down toward the listener, the open hand at hip height.

## 0.37.1

Fixed
- **The far hand of folded hands faded while the character spoke.** In a three-quarter
  stance the far hand was almost transparent during speech: the resting arm moves a few
  degrees with every stress beat, and the fade meant for leaving the pose started at the
  first degree. The hand is now solid within ten degrees of the rest pose.

## 0.37.0

Changed
- **Folded hands in a three-quarter stance.** A character that rests with its hands folded
  and is turned toward someone used to lose its far arm behind the body. Now the far upper
  arm is hidden behind the body and the forearm comes forward across the belly
  (foreshortened), its hand under the near hand.
- **Chest-level gestures use the near hand when turned.** `thumbsUp`, `worry` and `speak`
  bring a hand up in front of the chest; while the character faces left or right they now
  use the hand nearer the viewer (the far one would be hidden behind the body). Pass
  `thumbsUp('L' | 'R')` to choose the hand yourself.

Fixed
- Since 0.36.3 a far arm in any folded pose, not only the rest pose, was tucked behind the
  body in a turned stance. Only a resting arm, or one leaving the rest pose for a gesture, is
  tucked now.
- The far leg keeps its shading while the far arm gestures.

## 0.36.5

Fixed
- **The hidden far arm in a three-quarter stance.** Its hand showed below the hem beside the
  thigh; the arm is now shortened while it is tucked behind the body. And when the arm left
  that pose for a gesture the forearm was pulled back before it opened (the hand dropped,
  rose and dropped again within three frames); it now unfolds in one sweep.

## 0.36.4

Fixed
- **The first frames of a far-arm gesture in a three-quarter stance.** The hand of the far
  arm was nearly edge-on for the first frames (it turned gradually as the gesture began), and
  the upper arm showed beside the waist again for a few frames before the forearm opened.
  The hand now switches to its full shape at once, and the arm stays behind the body until
  the forearm has opened.

## 0.36.3

Fixed
- **No arm stump at the waist in a three-quarter stance.** A character that rests with its
  hands folded and is turned by about 0.3–0.45 showed the far upper arm sticking out beyond
  the shirt while the forearm was hidden behind the body. The resting far arm now hangs
  straight, tucked behind the body and legs (a far arm that carries an item is unchanged).

## 0.36.2

Fixed
- **The far arm no longer lies on the chest.** Since 0.36.0 a far arm that gestured in a
  three-quarter stance was drawn in front of the body: its sleeve covered the chest, the
  stethoscope and the name badge. It now sits in a layer above the head that is masked by
  the shirt, so the arm comes out from behind the edge of the body. A hand laid on the chest
  still passes in front.
- **Caption chunks break at punctuation.** `captions({ maxChars })` cuts at the last full stop
  or comma that fits the line, also when that makes a short chunk; without punctuation in
  reach it splits the clause evenly instead of filling the line and leaving a few words over.

## 0.36.1

Changed
- **Scene files: captions are one line.** `tools/scene.py` puts the caption at the bottom
  centre of a landscape frame (mid-frame in a vertical one, as before), one line at a time;
  a long sentence is cut into chunks that fit the line, each shown when the speech reaches
  it. The caption no longer moves to avoid heads. A two- or three-line box covered short
  characters and their gestures. `"captions": false` still removes it.

## 0.36.0

Changed
- **Gestures keep the three-quarter stance.** A character turned toward someone (`face`) used
  to swing back toward the viewer for every hand gesture. `point`, `wave`, `present`,
  `handOver`, `take` and the gestures of `explain` / `speakCues` now keep the body turned and
  draw the acting arms at their on-screen angles; the far arm comes in front of the body,
  undimmed, with a full hand. A speaker whose listener-side hand holds an item still opens
  toward the viewer (its free hand would otherwise gesture behind its back).
- `wave` in a three-quarter stance moves the elbow outward so the hand stays beside the head.

Fixed
- `point` aims from the character's own shoulder height. Short characters (the boy) pointed
  about ten degrees below the target.

## 0.35.0

Added
- **Scene files: walk up before reaching.** A character that strokes a pet or hands an item
  over (`["stroke", "@pet"]`, `["handOver", "@other"]`) first walks up to the target if it
  stands out of reach — arms reach only about 0.2 × the host height. Seated characters and
  pets do not move. `examples/scene-interact` now shows it.

Changed
- The camera goes back to the wide shot when a character walks to another spot (`walk`),
  as it already did for `enter` and `exit`; a close-up used to stay on the place it left.

## 0.34.1

Fixed
- **An item in the far hand vanished in a three-quarter stance.** Since 0.33.0 the far arm
  carrying an item is drawn behind the body, which is right when walking side-on but hid the
  item when the character merely faces someone. The arm goes behind only when the character
  is turned nearly side-on.
- **`stroke` with the far arm.** When the hand on the pet's side holds an item, the other arm
  now folds across the body toward the pet instead of hanging down.

## 0.34.0

Added
- **`write(dur)`** — the free hand comes over to the held clipboard or phone and writes a few
  lines.
- **A pet answers when it is stroked.** In a scene file, a turn without `say` that has
  `["stroke", "@pet"]` runs the pet's reaction at the same time: a cat purrs, a dog wags.
- **`examples/scene-interact`** — a clinic visit with voices that uses `stroke`, `write`,
  `handOver` and `take`, and a character created holding an item.

Changed
- The camera goes back to the wide shot for `write`, and for a reach (`handOver`, `take`,
  `stroke`) that follows speech in the same turn — a close-up hides the hands.
- When checking whether a bystander is cut by the edge of a close-up, the camera allows for
  hair that sticks out beyond the face (a ponytail used to show at the edge).

Fixed
- **A put-away item reappeared on `enter`.** A character created with `itemsHidden` walked in
  holding the item, so it could not `take()` it afterwards.

## 0.33.0

Added
- **Interaction actions for people.**
  - `drink()` — raise the held cup to the mouth, tilt it, lower it. A turned character faces
    the viewer for the sip.
  - `stroke(target)` — lean toward a pet and stroke it with the hand on that side.
  - `handOver(target)` and `take(source)` — pass a held item from one character to another;
    run them `together`.
- **Any character can hold an item.** `createCharacter(host, { id, items: { R: 'cup' } })`
  (`'cup'`, `'clipboard'`, `'phone'`, or your own drawing), with `itemsHidden: true` to start
  with it put away. Scene files: `"holds": "cup"` and `"holdsHidden": true` on a character.
  On a rig: `rig.setItem(side, draw, { shown })`.

Changed
- **`hideItem` / `showItem` are a move, not a fade.** The hand goes down to the hip, the item
  disappears or appears there, then the arm relaxes or takes its carrying pose. **Timing:**
  0.74 s instead of 0.25 s.
- In `conversation()` the camera goes back to the wide shot for a wordless turn that reaches
  for someone (`handOver`, `take`, `stroke`).

Fixed
- **A carrying arm drawn across the chest.** Walking sideways with the item in the far hand,
  the whole arm was drawn in front of the body (since 0.24.0), so the forearm seemed to grow
  out of the chest. The far arm is behind the body again; the hand and the item show in front
  of it.
- **A moved caption jumped sideways.** Since 0.31.0 a caption moved off a head lost its own
  CSS `transform` (usually the horizontal centring). It is now moved with the separate
  `translate` property.

## 0.32.0

Changed
- **A wordless entrance no longer waits for silence.** In `conversation()` (and scene files)
  a turn with no speech that begins with `enter` — a pet running in, someone walking in
  before doing something — starts up to 1.2 s before the previous speaker's line ends,
  instead of after it. Other wordless turns (a bark, a nod) still wait for the line to end.
  Scenes with such a turn get slightly shorter.

Added
- `tools/scene.py` notes when a pet stands inside the width of a table or counter, which
  will overlap it, and says where to move it.

## 0.31.2

From a first-time-user trial (a fresh agent building a new scene from the docs alone).

Changed
- Scene files, horizontal frame with captions: the speaker sits a little higher in a close-up
  (`centerY: 0.45`), so the chin clears the caption box.
- Captions sample the start of each line every 0.08 s while the camera is still moving in,
  instead of at one moment, and appear once nothing is in the way.

Docs
- `references/hyperframes.md`: any id from the Pets table is a valid `species`; `who`, `faces`
  and `shot` take a character's `name`, not its `id`; which characters the examples use; and
  `rotation_pivot_drift` on any `#thuN-…` / `#rigN-…` part is a known false positive.

## 0.31.1

Fixed
- **A caption covered the speaker's face while the camera was still moving in.** Captions
  now also check where the heads are at the moment the caption appears, before the camera
  has reached the speaker. If no place is free for the whole line but the overlap is only at
  the start, the caption appears a little later (up to one second), once the camera has
  arrived. In a vertical frame a caption is only moved within 12–78% of the height, clear of
  the area that video apps cover with their own controls.

## 0.31.0

Added
- **Captions keep off the characters' heads.** With a `conversation()` as the source,
  `captions()` measures where every visible head is during each line (camera included) and
  moves the caption up or down to the nearest free place inside the safe area. If there is
  none it stays where it is. `captions(talk, element, { avoid: false })` turns this off.

Changed
- **The camera keeps a real close-up when a pet stands beside the speaker.** Since 0.30.0 a
  pet cut by the bottom edge of a chest shot was brought into the frame, which turned the
  close-up into a group shot. The camera now first tries a tighter face shot, which leaves
  the pet below the frame, and widens only if that does not work.

## 0.30.0

Fixed
- **The camera stayed on an empty close-up after the speaker walked out.** In a
  `conversation()` turn that speaks and then exits, the camera now goes back to the wide
  shot when the character starts walking. It used to do so only if it was already on a
  close-up before that turn.
- **A pet beside the speaker was cut by the edge of a close-up.** A bystander cut by the
  bottom or top edge is now brought into the frame (only the left and right edges were
  handled), and after widening a shot to include a bystander the remaining characters are
  checked again against the new frame.

## 0.29.0

Changed
- **Scene files: one walk from the edge to the mark.** `tools/scene.py` used to put an
  entering character's host at the edge of the frame and chain `enter` with a `walk` to its
  `x`. The host now sits at `x` and `enter` gets the exact distance, so the character walks
  in one go and arrives sooner. Exits get an exact distance too, so a character far from the
  edge leaves the frame completely instead of fading out after 700 units. Regenerate a scene
  (`tools/scene.py scene.json --force`) to pick this up; timings shift slightly.
- `references/hyperframes.md` describes entrances and exits as they work since 0.26.0 (the
  270-unit recipes are gone).

## 0.28.0

Added
- **Scene files: enter and exit by the nearer edge.** `"enter": true` (on a character or a
  turn) and `"exit": true` pick the edge closer to where the character stands, so it no
  longer crosses the other characters on its way. Pets can now enter from the right and
  exit to the left in scene files, like people.
- **`hand` for spoken gestures.** `explain(text, dur, { hand: 'L' })` and
  `speakCues(cues, dur, { hand })` choose the arm that leads the gestures.

Changed
- In the `presenter` layout (horizontal frame) the presenter gestures with the arm on the
  side of the content panel; it used to open its right arm away from the content.
- `examples/scene-vertical`: the cat stands on the right and now runs in from the right
  (`"enter": true`) instead of running through the girl from the left.

## 0.27.0

Changed
- **Pets cross a wide frame faster.** Since 0.26.0 a pet runs in from the real edge of the
  frame, which took over five seconds on a wide stage. Runs longer than 380 units now use a
  longer, quicker stride (about three seconds for the longest run); shorter runs keep their
  timing.
- **`present`** raises the forearms with the palms up; it used to hold both arms out and
  down, palms turned in. A hand holding an item now stays put and the other arm presents.
- A dog's **`bark`** dips, then tosses the head higher, and the mouth opens over three frames
  instead of one. A cat's **`hiss`** pins the ears back, narrows the eyes and curls the tail.

## 0.26.0

Changed
- **`enter` and `exit` reach the real edge of the frame.** They used to travel a fixed
  270–300 units, so in a wide scene a character faded out halfway across the stage and
  walked in from the middle. The distance is now measured to the edge of the composition
  (`data-composition-id`), between 270 and 700 units, for people and pets. **Timing
  changes:** in a wide scene these steps now take longer (up to about 5 s). Pass a distance
  to keep the old behaviour: `['exit', 'right', 300]`, `['enter', 'left', 270]`.
- While gesturing, a character facing left or right opens up less toward the audience (to
  0.3 instead of 0.2 of a turn) and more slowly, so it reads less as turning away and back.

Fixed
- `exit` started from the centre of the character's box even after a `walk`; it starts from
  where the character stands.

## 0.25.0

Fixed
- **A worried or angry character smiled every time it opened its mouth.** While speaking
  with a `mood`, wide mouth shapes pulled the corners of the mouth up to level, and an open
  mouth with level corners reads as a smile. The corners now stay close to the mood for the
  whole line.
- **A cup held in the right hand was upside down** (lid pointing down) — the item drawing
  for the right hand is not mirrored, and the upright reference introduced in 0.22.0 kept
  that orientation. Items now stand lid-up in either hand.
- **The cup dropped to the hip when the character turned sideways.** A carrying arm keeps
  its forearm folded in front of the body in side view, so the item stays at belly height.

Changed
- `express('laughing')` shakes the shoulders and head visibly (and bobs the body when
  standing); it moved about one pixel in a 720p full-body shot before.

## 0.24.0

Added
- **Sequences breathe.** `sequence()` (and so `conversation()` and scene files) lays slow
  breathing and a very slight sway over every frame, so a character holding a pose for a
  second or two is no longer a statue. It fades in and out over 0.6 s, so sequences still
  start and end on the exact rest state. `sequence(rig, steps, { breathe: false })` turns it
  off.

Changed
- `nod` and `shake` are large enough to read in a full-body shot (head dips 15 units instead
  of 8, with the shoulders and body; head swings ±16 instead of ±9).
- A dog's `wagTail` and a cat's `tailSwish` swing wider.

Fixed
- **The cup vanished while walking across.** When the carrying arm was the far arm it went
  behind the body with the item. An arm carrying a shown item now stays in front.

## 0.23.0

Fixed
- **A sliver of skin between the thighs.** Turned three-quarters, the far arm was drawn behind
  the torso but in front of the legs, so its hand showed between the thighs. The far arm is
  now behind both legs.
- **Pets squashed to a line when turning round.** `face` (and walking the other way) scaled
  the pet through zero width. It now narrows to 30% and swaps sides.

Changed
- `express('happy')` hops high enough to be seen in a full-body shot (15 units, then a small
  second bounce and a head sway when the hold is long enough).
- Seated knees splay less (12° instead of 22°): without a chair the wider pose read as a
  squat. A seat still needs a `createProp('chair')` under it to read well.

## 0.22.0

From a second outside review of the 80-action film.

Fixed
- **A cat ran in sitting.** Pets that rest seated slid into the frame in their sitting pose
  (hidden until 0.21.0, when `enter` after `exit` became visible). They stand to run.
- **Speech gestures stopped halfway through the line.** The last gesture of a line was
  dropped when there was no room for it to return to rest, so a four-second `explain` moved
  its hands for a second and a half and then stood still. The last gesture now holds to the
  end of the line and the closing move brings the arm home.
- **Held items stay upright.** A cup followed the forearm: tilted about 30° at rest for some
  characters and lying sideways when the character turned or walked across the frame. Items
  are now kept upright on screen, turning about the palm.

## 0.21.0

More from the outside review of all 80 actions.

Fixed
- **`enter` after `exit` walked in invisible.** A character that had left the frame came back
  unseen and popped up at centre at the end of the walk (people and pets). It is now visible
  for the whole walk, with a 0.2 s fade-in at the start.

Changed
- **Sitting reads as sitting.** Seated, the thighs splay and the shins stay upright, so there
  is a bend at the knee; before, the legs only got shorter.
- **`march`, `stroll` and `stepInPlace` differ from the front.** `march` pumps the forearms in
  front of the chest; `stroll` is slower with low steps and loosely swaying arms (3.2 s →
  3.65 s for six steps); `stepInPlace` keeps the arms still. A hand holding an item stays put.
- **Expressions move the body**, not only the face: `happy` hops (not when seated),
  `surprised` flings the arms out, `thinking` raises a hand to the chest, `angry` makes
  fists, `tired` sighs, `laughing` shakes more.

## 0.20.0

From an outside review of a film chaining all 80 actions.

Fixed
- **`explain` could show no gesture at all.** A character resting with clasped hands could
  draw the "hand on chest" pose, 15° away from its rest pose, and a 4–5 s line had room for
  only that one gesture. Poses too close to the rest pose are skipped, and gestures are now
  placed from every syllable instead of every fifth.
- **Pets ran out backwards.** After `face('left')`, `exit` still ran right, tail first. Pets
  now turn toward the way they run, start from where they stand, and accept
  `exit('left')` / `enter('right')`.
- **Gestures behind the back.** Facing left, `wave`, `thumbsUp` and speech gestures used the
  right arm — opening away from the person faced. They use the arm on the facing side.
- **Held items.** The arm holding an item no longer swings while walking (the cup rocked like
  a pendulum). After `hideItem` the arm relaxes instead of gripping thin air; `showItem`
  brings the holding pose back.

## 0.19.0

Added
- **Stress beats.** While speaking, the free arm gives a small beat on stressed syllables —
  from the cues with audio (the widest mouth shapes and the first syllable after a pause),
  every third syllable with `explain` — on top of the big gestures at phrase breaks. Beats
  only land where the arm is free (during a hold, or at rest between gestures).

Changed
- `wave` is softer: it starts from the character's rest pose (from clasped hands the old
  wind-up whipped the forearm at about 1,800°/s), raises without overshoot, swings with a
  shrinking amplitude while the upper arm sways behind the forearm, and raises the arm to
  128° so a short-armed character's hand is not hidden behind its head. Same length (2.25 s).

## 0.18.0

Arm gestures while speaking (`speakCues`, `explain`) were rebuilt after an audit of the film.

Fixed
- The arms snapped into a generic "hands at the belly" pose in a single frame when a line
  started (a boy with his arms down jumped 60° in one frame).
- The "open hand" gesture raised the elbow sideways with the forearm hanging down — it read
  as a chicken wing. Gestures now open the forearm outward so the hand faces the listener.
- Arms froze for up to 1.4 s while a gesture was held. The forearm now drifts a few degrees
  and the upper arm breathes during the hold.
- Gestures overlapped when cues were close together, making an arm jump mid-gesture
  (`explain` moved a joint 57° in one frame). Gestures are spaced so their phases never overlap.

Changed
- Gestures start from and return to the character's own rest pose (clasped hands, arms down,
  one arm carrying an item…) instead of one pose for everyone.
- A hand holding an item does not gesture; the other hand does. With both hands full only the
  head and torso move.
- The stroke takes longer the further the arm travels, without overshoot; torso, shoulders
  and head lean into the gesture.

## 0.17.0

From a 2 min 41 s film made by an agent from a 25-beat script (three scenes, four voices).

Added
- `tools/scene.py`: `"enter"` / `"exit"` on a turn — a character comes in or leaves mid-scene
  (off stage until then); room presets `"background": { "preset": "clinic" | "lobby" | "home" }`;
  `"music"` / `"musicVolume"`; a line that names a pet frames the speaker with the pet;
  on presets and images the content panel gets a light card and dark text.
- `shot(…, { avoid })`: a close-up no longer leaves a neighbour half-cut at the frame edge.
- Automatic camera: goes wide while a character walks in or out.
- Docs: order inside a turn, joining scenes with ffmpeg, the render frame rate.

Changed
- `conversation()`: after a spoken line the next turn starts when the words end, overlapping
  the speaker's 0.55 s of settling (`overlap: false` for the old timing); a character may
  speak several turns in a row.
- `tools/scene.py`: characters present from the first frame are already turned toward the
  one they `faces` (no opening "everyone turns" beat); landscape close-ups are looser.
- Speaking with a mood keeps the eyes mostly open (a "happy" line looked like a smirk).

## 0.16.0

Added
- **Voices from text.** `tools/scene.py`: `"voice"` on a character or a turn speaks the line
  with the `voice-tts` command ([voice-process](https://github.com/tinhthanh/voice-process),
  Vietnamese, CPU). Each line is synthesised once into `voice/` beside the scene file and
  reused, so a scene keeps its timing; a scene whose voice files exist builds without
  `voice-tts`.
- The examples now speak: `examples/voiceover/voice.wav` is real speech (it was a synthetic
  hum), and the `scene` and `scene-presenter` samples carry generated voice lines.

Changed
- `tools/cues.py` writes accented text unescaped, and analyses audio at up to 12 kHz.

## 0.15.0

Added
- **Explainer layout.** `tools/scene.py`: `"layout": "presenter"` keeps the characters to one
  side and gives the other side to a content panel; `"show": { "title", "bullets", "image" }`
  on a turn puts a title, bullet points (one by one while the line is spoken) and a picture
  there. Works in horizontal and vertical frames. `examples/scene-presenter/scene.json`.
- `captions(…, { maxChars })` splits a long line into chunks shown one after another, broken
  at sentence ends; scenes made by `tools/scene.py` use it.
- `tools/scene.py --retime` also re-times the content clips.

## 0.14.1

Changed
- `SKILL.md` is rewritten around two jobs — make a character, make a scene — with the scene
  file as the starting point for scenes and a "where things are" table; README and
  `_template.js` follow. Both code samples in it are run as written.

From a fourth independent agent trial (Sonnet; a vertical clinic scene rendered to MP4):

Fixed
- Automatic camera: a turn without speech by a character outside the current close-up
  (a dog barking during someone's close-up) was not shown. The camera now returns to the wide
  shot for it, and stays put when the character is already in frame.
- Vertical scenes from `tools/scene.py`: close-ups were as tight as face shots and the wide
  shot left the characters at the very bottom. Close-ups are looser and the floor sits higher.
- `tools/peek.sh` always wrote `peek.png` in the current folder, so one preview overwrote the
  last. Without a file name it now saves next to the composition, as `peek.png` or
  `peek-mouth<N>.png`.
- `tools/scene.py --help` prints the scene-file format.

Added
- Docs: spacing in a vertical frame; how silent turns are framed; where `check` shows the
  warning it counts.

## 0.14.0

Added
- **Tone of voice.** `speak`, `explain` and `speakCues` take `{ mood }`: the whole line is
  delivered with that expression — brows, eyes and mouth corners — while the mouth still
  follows the words. Until now every line was spoken with a smile.
- Four expressions: `laughing`, `worried`, `confused`, `tired` (nine in all).
- `tools/scene.py`: `"mood"` on a turn with `say` applies to the line itself (it used to be a
  1.6 s beat before the line); on a turn without `say` it is still a beat.

## 0.13.0

Changed
- **Mouths open wider when speaking.** The two shapes that fill most of a spoken line were
  barely open (checked with `tools/peek.sh --mouth` on lines with and without audio). In the
  cue table "teeth" goes from 0.22 to 0.36 and "open" from 0.48 to 0.66; in the estimated
  table (`speak` / `explain`) the mid vowel goes from 0.46 to 0.64 and the consonant from 0.15
  to 0.26. This changes how every spoken line looks, with Rhubarb cues too.
- `tools/scene.py`: the prop key `height_units` is now `tabletop`.

Added
- `tools/scene.py`: `"mood"` on a turn (an expression beat before the line or actions);
  `background.image`; a note when a seated character would be hidden behind a tall `front`
  counter, with a `tabletop` value that fits.

## 0.12.3

Added
- `tools/peek.sh … --mouth[=N]`: a dense strip of mouth close-ups (10 a second) for the Nth
  spoken line, labelled with time and cue shape — a way to judge lip-sync without rendering.
- `conversation(…, { leadIn })`: when the first turn opens with a line, it starts after 0.6 s
  instead of on the first frame (the camera has time to arrive). `leadIn: 0` restores the old
  timing. Scenes made by `tools/scene.py` get it too.

Changed
- `tools/cues.py --method spectral` opens the mouth more: loudness is judged against the
  phrase it belongs to, not only the loudest moment of the file, and the closed-lips shape is
  kept for near-silence. On three test lines the share of open shapes rose modestly; the
  timing of pauses is unchanged.

## 0.12.2

Fixed
- Inside `conversation()`, `face(otherRig)` looked at where the other character **started**,
  not where it stood by then — a character that had walked past was faced the wrong way.
  Targets are now resolved to the other character's position at that turn.
- A pet walking a long distance took close to ten seconds to cross the frame; beyond 160 units
  it now trots.
- `tools/scene.py` in a vertical frame: captions were sized from the frame height (four lines
  over the speaker) and default character heights ignored the frame. Both follow the frame now;
  vertical captions sit inside the platforms' safe area (`hyperframes check` flags text in the
  bottom third) and the camera frames the speaker above them (`shot(…, { centerY })`).
- `tools/scene.py`, `shot.sh` and `gallery.sh` waited out a 45 s timeout when the page threw
  an error; they stop at once (`chrome_run.py --fail-on-error`). `tools/check.sh` is back to
  about 15 s from 60 s.

Added
- `examples/scene-vertical/scene.json`: a 9:16 scene (a girl and a cat, Vietnamese captions).

## 0.12.1

Fixed
- `tools/scene.py` crashed with a traceback when a scene file used the key `seat` (a likely
  misspelling of `seated`): the tool kept its own data next to the user's keys.
- `tools/scene.py` ignored keys it did not know, so a misspelt `faces`, `dur` or `captions`
  silently did nothing. Unknown keys are now errors that suggest the nearest valid name.
- Running `tools/scene.py` again silently overwrote an `index.html` that had been edited by
  hand. It now stores a fingerprint of what it wrote and refuses to overwrite an edited (or
  foreign) file unless `--force` is given.
- `tools/chrome_run.py` could fail with "Directory not empty" on Linux while removing its
  temporary Chrome profile.

From a third independent agent trial (a baker, a three-person scene with three voice lines):

Fixed
- Tools used fixed ports, so two runs at once (or another program on the port) produced
  unrelated failures. Each tool now takes a free port; `PORT=` still overrides.
- `tools/shot.sh` left the previous PNG in place when the sheet failed to render; it now
  removes it first, prints the page error and exits non-zero.
- `tools/peek.sh` paired `<audio>` clips with lip-sync steps by nearest time, so after a hand
  edit it could tell you to move one speaker's audio onto another's line. Clips are matched by
  the sound file their cues were made from.
- `tools/scene.py`: characters with `enter` walked in one after another, the later ones
  standing in frame while they waited — they now enter together; hosts are placed far enough
  out that the head starts off-frame; `shot` on a `together` entry is an error instead of
  being dropped, and works on a turn inside it.
- `kit.bodies.stocky` did not look stocky (the torso outline stayed narrow); it now sets
  `torsoWidth`.
- `top` given as a string, or returning nothing (`kit.outlines.stocky`), failed late with an
  internal name; it is now a clear registration error.
- `kit.parts.apronBib`: the straps stay attached when `width` changes.

Added
- `torsoWidth`: the width of the torso relative to its height (shoulders, belly and arms; the
  head keeps its shape).
- `cheer`: both arms up with two hops — a whole-body "happy".
- `tools/scene.py`: `"front": true` on a prop (a counter someone stands behind), and
  `--retime index.html` to fix the audio clips and total duration after hand edits.
- Docs: what `kit.outlines` holds, `apronBib` options, the height of a counter top in px.

## 0.12.0

Added
- `tools/scene.py scene.json`: a complete HyperFrames composition from a short scene
  description — characters and where they stand, furniture, and a script of who says or does
  what. It writes hosts and clips, a `conversation()` with the automatic camera and captions,
  mouth cues for every voice file, and `<audio>` clips timed by loading the result once in
  headless Chrome. `examples/scene/scene.json` is a sample; `tools/check.sh` runs its
  self-test and `tools/lint-examples.sh` builds, lints and checks the sample.
- `captions(…, { readable })`: each line stays long enough to read (0.5 s + 0.3 s per word, the
  film's last line at least 3 s) even when the speech is shorter. On by default.
- `tools/chrome_run.py --wait-js` / `--eval`.

Changed
- Docs: "22 actions" now reads "22 actions and 5 stance actions".

## 0.11.0

Added
- `VGCharacter.captions(source, element, options)`: the words of each spoken line shown while
  it is spoken — a fixed caption, or a speech bubble above the speaker (`follow: true`). The
  words come from the `speak` / `explain` steps, from `['speakCues', cues, null, { text }]`,
  or from cues made with `tools/cues.py --text`.
- `conversation(turns, { camera })`: an automatic camera that cuts to whoever speaks and
  returns to the wide shot; `{ turn: […], shot }` overrides one turn.
- Sequence steps that speak carry `text` and `speech` (the audible length).
- `tools/lint-examples.sh --check` also runs `hyperframes check` and fails on errors and on
  warnings outside the documented false positives; CI runs it.
- `examples/conversation` uses the automatic camera and captions.

Fixed
- Camera shots made `hyperframes check` warn `panel_out_of_canvas` on the zoomed scene
  elements; `shot()` now marks them `data-layout-allow-overflow`.

## 0.10.0

Added
- `VGCharacter.conversation(turns, { gap, waiting })`: turns of several characters chained
  and timed automatically (`{ together: […] }` for simultaneous turns); waiting characters
  idle instead of freezing. Returns `{ sequences, turns, duration, of, addTo }`.
- `shot()` frames several subjects at once and accepts pets: `shot(scene, [vet, dog], 'full')`.
  `time` alone is enough to aim at where a subject will be (the rig remembers its sequence).
- `tools/cues.py --method spectral`: a dependency-free lip-sync that picks mouth shapes from
  where the sound's energy lies (open, spread, rounded, closed, teeth). It is the default when
  Rhubarb is not installed; `amplitude` remains available.
- `tools/peek.sh` checks audio against lip-sync: an `<audio>` clip that starts early or late,
  has the wrong length, or is missing for a `speakCues` step — and audio nobody lip-syncs to.
- `examples/conversation` is rewritten with `conversation()` and a two-person shot;
  `examples/voiceover` adds a vet-and-dog shot.

Changed
- `shot(scene, rig, …)`: the second argument may now be an array; person boxes for `'chest'`
  and `'full'` are narrower than tall (they were square), so two-person frames sit tighter.

## 0.9.1

From a second independent agent trial (two characters, two voice lines, camera shots).

Fixed
- `tools/peek.sh` could capture tiles that had not been seeked yet — a contact sheet with the
  right time labels over frame-0 pictures, no warning — and sometimes failed with "returned
  nothing" on unchanged input. Chrome was stopped after a fixed virtual-time budget whether
  or not the page was ready. All tools (`check`, `shot`, `gallery`, `describe`, `peek`) now run
  through `tools/chrome_run.py`, which drives Chrome over the DevTools protocol and waits for
  the page's own "finished" signal. A failed preview no longer leaves the previous PNG behind.
- `kit.hair.curly({ volume })` below 1 left highlight strokes floating above the hair.
- The overlapping-speech warning counted the 0.55 s settling tail of a speaking step.

Added
- `tools/peek.sh` prints a ready-to-paste `<audio data-start data-duration>` next to every
  `speakCues` step.
- Docs: ranges and defaults of the hair options; `hostScale` is read as
  `VGCharacter.kit.bodies.<preset>.hostScale`.

## 0.9.0

Added
- `tools/cues.py <audio>`: mouth cues for `speakCues` from a voice file — Rhubarb Lip Sync when
  installed, a dependency-free loudness method otherwise; `--js` writes a script that sets
  `window.VOICE_CUES`. `tools/check.sh` runs its self-test.
- `VGCharacter.shot(scene, rig, 'face' | 'chest' | 'full' | 'wide', options)`: camera pushes
  and cuts. It moves flat scene elements together (no wrapper) and can aim at where the
  character will be at a given time of its sequence. `rig.shotBox(kind)`.
- `examples/voiceover/`: lip-sync to an audio clip with three camera shots (its `voice.wav` is
  a synthetic placeholder).
- Docs: "Voice-over and lip-sync" and "Camera shots" in `references/hyperframes.md`.

Fixed
- `speakCues` shifted the character's weight around the middle of its host, so a character
  that had walked slid back to the centre when it started to speak, and stayed there.
- `speakCues` could end slightly off the rest pose (position, head tilt) when a sway or drift
  beat outlasted the line.
- The vet's chest-badge text made `hyperframes check` report `text_occluded`,
  `text_below_floor` and `line_unread`; it is now marked as texture.

Changed
- `tools/lint-examples.sh` copies each example's whole folder (audio, cue scripts).

## 0.8.1

Fixed
- The far arm and far leg lost their cartoon outline when the character turned (the darkening
  filter replaced the outline filter).
- At a three-quarter turn the far arm showed as a thin sliver beside the torso; it now tucks
  behind the body.
- `wave` and `thumbsUp` with an item in both hands waved the item. They are now a head
  gesture of the same length; `wave('L')` / `wave('R')` still force a hand.

Changed
- Pose sheet: the "chest close-up" panel is now "torso close-up" — chin to below the hips, so
  collar, pockets, held items and the top of a skirt or apron are all in view.
- `references/hyperframes.md` lists `rotation_pivot_drift` on the shin and on a pet's withers
  as a known false positive of `hyperframes check` (both rotate about a joint by design).

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
