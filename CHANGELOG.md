# Changelog

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
