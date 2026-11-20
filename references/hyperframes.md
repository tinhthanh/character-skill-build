# Using characters in HyperFrames

[HyperFrames](https://github.com/heygen-com/hyperframes) renders an HTML composition to
video by seeking a paused GSAP timeline frame by frame in headless Chrome. The character
library is built to that contract. A complete composition is in
`examples/hyperframes/index.html`.

## The short way: a scene file

For a scene of characters who talk and act in turn, describe it and let the tool write the
composition:

```bash
python3 tools/scene.py scene.json          # → <id>/index.html next to the scene file, ready for peek / lint / render
```

```json
{
  "id": "clinic-visit",
  "characters": [
    { "name": "vet",   "id": "vet",  "x": 640,  "height": 760, "enter": "left", "faces": "boy" },
    { "name": "boy",   "id": "boy",  "x": 1380, "height": 570, "seated": "chair", "faces": "vet" },
    { "name": "bella", "species": "dog", "x": 1050, "height": 320, "faces": "vet" }
  ],
  "props": [ { "kind": "counter", "x": 250, "color": "#5f7d8c" } ],
  "script": [
    { "who": "vet", "say": "Good morning! Bella is due for her check-up today.", "audio": "line1.wav" },
    { "who": "boy", "say": "Thank you, doctor.", "dur": 2.2 },
    { "who": "vet", "say": "Then let's get started.", "shot": ["vet", "bella"] },
    { "together": [ { "who": "vet", "do": [["face", "front"], "wave"] }, { "who": "bella", "do": ["bark"] } ] }
  ]
}
```

- `characters` — `id` is a registered person, `species` a pet: any id from the Pets table in
  `actions.md` (`dog`, `cat`, `shiba`, `orange_cat`, `black_cat`, or one you registered). `name`
  is the handle the rest of the file uses (`who`, `faces`, `shot` all take a `name`, not an `id`).
  The bundled examples use `vet`, `boy`, `girl`, `receptionist`, a dog and a cat; `tools/gallery.sh`
  shows every character. `x` is where the character
  **stands** (its centre, px from the left); `height` the host height in px. `enter:
  "left" | "right" | true` walks it in from outside the frame to `x` (`true` = the nearer edge); `seated: true | "chair" |
  "stool"` starts it seated (and draws the seat); `faces` names who it looks at. `holds: "cup"`
  (or `"clipboard"`, `"phone"`, or `{ "L": "cup" }` for the left hand) gives a person that item;
  `"holdsHidden": true` keeps it put away, so it can be received mid-scene:
  `{ "together": [ { "who": "barista", "do": [["handOver", "@granny"]] }, { "who": "granny", "do": [["take", "@barista"]] } ] }`.
  `"holds": { "R": { "kind": "phone", "image": "app.png" } }` puts a picture (the app) on the
  phone's screen. A turn with `"phone": true` says its line ON THE PHONE (phone to the cheek
  before, down after; works with a recorded voice); listening is `"do": [["call", null, 2]]`.
  Exam and pets: `["listen", "@cat"]` (stethoscope), `["inject", "@cat"]` (`"holds": "syringe"`, the pet
  on that hand's side), `["carry", "@cat"]` … `"putDown"` (hold the pet in the arms); pets also do
  `"lieDown"`, `["sleep", 3]`, `"unwell"`. Put the pet on a box (`"on": "table"`) at the same `z` as
  the person, beside the table rather than inside it, within about 0.25 × the person's height.
  Phone and computer steps: `["showPhone", 1.8]` (screen to the viewer, enlarged), `["tapPhone", 1.6]`,
  `["typing", 2]` (with a laptop in front).
  Other interaction steps for `do`: `"drink"`, `"write"`, and `["stroke", "@pet"]` — in a turn
  without `say` the pet answers at the same time (a cat purrs, a dog wags its tail). A
  character that strokes or hands over walks up to the target first when it is out of reach
  (arms reach about 0.2 × the host height). Sample:
  `examples/scene-interact/scene.json`.
- `script` — turns, in order. `say` speaks: with `audio` it lip-syncs to the file (cues are
  made for you, the `<audio>` clip is added and timed), without it the mouth is estimated
  over `dur` seconds. `do` is a list of `sequence()` steps; `"@name"` inside a step refers to
  another character (`["face", "@boy"]`). `shot` overrides the camera for one turn
  (`"face"`, `"wide"`, `false`, or a list of names to frame together). `{ "together": […] }`
  runs turns at the same time.
- Characters with `enter` walk in **together**, before the script. A prop with `"front": true`
  is drawn in front of the characters — a counter someone stands behind. `shot` goes on a turn
  (also on a turn inside `together`), not on the `together` entry itself.
- **Voices from text — `"voice"`.** With the [`voice-tts`](https://github.com/tinhthanh/voice-process)
  command installed (Vietnamese text-to-speech, CPU, eight voices — `voice-tts voices`), put
  `"voice": "maichi"` on a character, or on one turn, and its lines are spoken, lip-synced
  and timed with no audio files to prepare. Each line is synthesised **once** into `voice/`
  next to the scene file and reused afterwards — TTS output differs between runs, so keep
  those files (commit them with the scene); delete one to have that line spoken again, and a
  changed text or voice makes a new file. `"voice": false` on a turn keeps it silent. Without
  `voice-tts`, a scene whose voice files already exist still builds; otherwise use `audio`
  or `dur`. Install: `uv tool install "git+https://github.com/tinhthanh/voice-process#subdirectory=tts"`
  then `voice-tts download-models` (about 860 MB).
- **Explainer videos — `"layout": "presenter"`.** The characters stand to one side and the
  other side is a content panel. A turn can carry
  `"show": { "title": "…", "bullets": ["…", "…"], "image": "file.png" }`: it appears as the
  turn starts — bullets one by one while the line is spoken — and stays until the next
  `show` (`"show": false` clears the panel). The first title is on screen from frame 0, the
  camera does not cut to close-ups (add `"camera": true` if you want them), and in a vertical
  frame the panel sits above the captions and the presenter below. The tool notes content that
  is taller than the panel. Sample: `examples/scene-presenter/scene.json`.
- **Vertical video:** set `"width": 1080, "height": 1920`. Default character heights and the
  caption size follow the frame; captions (always one line at a time) sit mid-frame, inside the area that TikTok, Reels and
  Shorts leave clear, the camera puts the speaker above them, and the floor line sits higher
  (the bottom of a vertical video is covered by the app's controls). **Spacing:** a head is
  about 0.45 × the character's host height wide, so in a 1080 px frame two default-size people
  fit at `x` ≈ 300 and 780; for three, give them smaller `height`s (about 600) or put a pet
  between two people. `examples/scene-vertical/scene.json` is a 9:16 sample.
- **Coming and going mid-scene.** `"enter": "left" | "right" | true` on a **turn** (`true`
  = the edge nearer to where it stands, so it does not cross the others) brings that
  character in then: it is off stage (invisible) until that turn, walks in to its `x`, then
  says or does the rest of the turn. `"exit"` on a turn walks it out afterwards. Order inside
  one turn: `enter` → `say` → `do` → `exit` (a `mood` without `say` comes first). The camera
  goes wide while someone walks in or out.
- **Who looks at whom.** `faces` turns a character toward another: characters present from
  the first frame are already turned; characters that walk in turn when they arrive.
- **Rooms and music.** `"background": { "preset": "clinic" | "lobby" | "home" }` draws a simple
  room. `"music": "file.mp3"` plays under the whole scene at `"musicVolume"` (0.15).
- **Camera defaults.** A line that names a pet in the scene ("Bella is very healthy") frames the
  speaker and the pet together; a close-up never leaves a neighbour half-cut at the frame edge —
  it shifts, or takes the neighbour in. `shot` on the turn overrides both.
- `"mood"` on a turn — `happy`, `sad`, `surprised`, `angry`, `thinking`, `laughing`, `worried`,
  `confused`, `tired`. With `say`, the whole line is spoken with that face; without it, it is
  an expression beat before the turn's actions.
- `background.image` (a file next to the scene file) fills the frame instead of the plain
  wall; the floor strip is then drawn only if `floor` is given too.
- `"tabletop"` on a table or counter is the height of its top in frame units (150). Someone
  **seated** behind a `front` counter needs a lower one — the tool prints a note with a value
  that leaves the chest visible.
- Also: `props` (`kind`, `x`, `color`, `height`, `front`, `tabletop`, `width`, `back`), `background` (`wall`, `wallDark`, `floor`,
  `floorHeight`), `camera` (`true` / `{ "kind": "face" }` / `false`), `captions` (one line at the bottom centre, each chunk shown when the speech reaches it; `false` = none), `seed`,
  `width`, `height`, `gap`.

The result is plain, commented HTML using the same API as the rest of this page — edit it by
hand for anything the scene file cannot say (your own background art, extra clips, effects),
or change the scene file and run the tool again. Not both: once `index.html` has been edited
by hand, the tool refuses to overwrite it (`--force` discards the edits) — from then on change
that file directly, and when your edits change the timing (longer walks, other reactions) run
`python3 tools/scene.py --retime path/to/index.html`: it re-reads the timing and fixes every
`<audio>` clip and the total duration in place. A key the tool does not know is an error, with
the nearest valid name. `examples/scene/scene.json` is a complete
scene file (`examples/scene-vertical/scene.json` a vertical one). The tool needs Chrome (it loads the result once to time the audio).

## Setup in a HyperFrames project

1. Copy `dist/character.slim.js` into the project (next to `index.html`, or under `assets/`).
   Re-copy it whenever a character or a config changes. (`character.iife.js` is the same code
   with comments, for debugging.)
2. Load GSAP, then the bundle, with plain `<script src>` tags, inside the composition root.
3. Build everything synchronously in one inline `<script>` and register the timeline.

```html
<div id="stage" data-composition-id="clinic-intro" data-start="0" data-duration="12"
     data-width="1920" data-height="1080">

  <div id="vet" class="clip" data-start="0" data-duration="12" data-track-index="2"
       style="position:absolute; right:330px; bottom:96px; height:760px"></div>
  <div id="dog" class="clip" data-start="0" data-duration="12" data-track-index="1"
       style="position:absolute; right:760px; bottom:96px; height:330px"></div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script src="character.slim.js"></script>
  <script>
    VGCharacter.seed(7);

    const vet = VGCharacter.createCharacter(document.getElementById('vet'), { id: 'vet' }).rig;
    const dog = VGCharacter.createPet(document.getElementById('dog'), { species: 'dog' }).rig;

    const vetAct = VGCharacter.sequence(vet, ['enter', 'wave', ['explain', 'Chào bạn!', 2.4], ['idle', 3]]);
    const dogAct = VGCharacter.sequence(dog, [['idle', 1.2], 'wagTail', 'sit', 'bark']);

    const tl = gsap.timeline({ paused: true });
    tl.add(vetAct.paused(false), 0);
    tl.add(dogAct.paused(false), 0.4);

    window.__timelines = window.__timelines || {};
    window.__timelines['clinic-intro'] = tl;
  </script>
</div>
```

## Rules

- **The key in `window.__timelines` must equal `data-composition-id`.**
- **No ES modules, no `fetch`, no timers.** The `runtime/*.js` sources are modules; the
  composition must use a bundle from `dist/`.
- **Tuned configs travel inside the bundle.** `tools/build.py` bakes every `configs/<id>.json`
  into the bundle, so `createCharacter(host, { id: 'surgeon' })` already returns the character
  as tuned in the studio. To override or bypass it:

  ```js
  VGCharacter.createCharacter(host, { id: 'surgeon', config: { proportions: { headSize: 1.3 }, colors: { top: '#2f9e8f' } } });
  VGCharacter.createCharacter(host, { id: 'surgeon', config: null });   // definition defaults only
  ```

  The studio's ⋯ menu has **Chép mã nhúng HyperFrames** ("copy HyperFrames embed code"), which
  produces a snippet with the current, possibly unsaved, config inlined.
- **Seed before building.** `VGCharacter.seed(n)` must run before the first action method is
  called. Change `n` to get a different (still reproducible) pattern of blinks and gestures.
- **`sequence` timelines are created paused.** Un-pause the child when adding it to the
  composition timeline — `tl.add(act.paused(false), at)` — or it will not follow the parent.
- **Budget the duration.** `sequence(...).duration()` is the length of the sequence; the
  composition's `data-duration` and the host clip's `data-duration` must cover it. Pad the end
  with `['idle', n]` so the character is not frozen while other elements finish.
- **A bad config throws.** `createCharacter` / `createPet` reject unknown groups or keys, non-numeric
  values and non-hex colours with a message listing every problem, instead of drawing a broken
  character. `hyperframes check` surfaces it as a runtime error.
- **A character's host is a normal `.clip`.** Do not tween `display` or `visibility` on it.
  To bring a character on or off, use the `enter` / `exit` actions, which animate the rig's
  own opacity.
- **Do not put a CSS `transform` on the host if GSAP also transforms it.** Position the host
  with `left/right/bottom` and size it with `height`.

## Sizing and placement

The host takes its **height** from CSS; the library sets `aspect-ratio` (400:470 for people,
400:330 for pets). Inside that box the character stands on a ground line near the bottom, so
aligning hosts by `bottom` lines up everyone's feet.

- People are about 0.9 × host height tall (chibi characters a little shorter).
- Leave about 0.45 × host height of free space on each side for arm gestures, and that much
  again in the walking direction for `walk` with a distance. The SVG has `overflow: visible`,
  so a gesture is not clipped by the host — only by an ancestor with `overflow: hidden`.
- `enter` starts outside the frame and `exit` ends there; both measure the distance from
  the host to the edge of the composition (see *Walk in from off-screen* below).
- A dog or cat beside a person looks right at roughly 0.4–0.45 × the person's host height.

## Staging recipes

**Units.** Distances passed to `walk`, and the `{ x, y }` given to `point`, are in the rig's
frame, not in pixels: `px = units × hostHeight / 470` for people, `/ 330` for pets. A 760 px
tall host therefore moves 1.62 px per unit.

**Walk in from off-screen to a mark.** Put the host where the character should end up;
`enter` ends at the centre of its host and starts outside the frame by itself:

```js
// host centred on the mark; the composition root carries data-composition-id
VGCharacter.sequence(rig, ['enter', 'wave']);              // from the left edge
VGCharacter.sequence(rig, [['enter', 'right'], 'wave']);   // from the right edge (people and pets)
```

How far it travels is measured from the host to the edge of the composition (the nearest
ancestor with `data-composition-id`, or the page), between 270 and 700 units, so the step
takes longer in a wide frame — about 1.6 s near the edge, up to about 5 s for a person
(pets break into a faster run past 380 units). Two cases need a number:

- *The mark is further than 700 units from the edge.* The character would fade in inside the
  frame. Pass the distance: `['enter', 'left', 900]`. In pixels it is
  `(distance from the edge to the mark + about 0.4 × host height) × 470 / host height`
  (`× 330` and `0.6 ×` for pets). `tools/scene.py` works this out for every entrance and exit.
- *A fixed, short entrance* (from behind a prop, or to keep old timings):
  `['enter', 'left', 270]`.

`exit` mirrors this: `'exit'`, `['exit', 'left']`, `['exit', 'right', 300]`. It starts from
wherever the character stands (also after a `walk`) and ends hidden; `enter` brings it back.

**Two characters talking.** Use `VGCharacter.conversation(turns)`: each turn is
`[rig, ...steps]`, the next turn starts when the previous one is done (a wordless turn that
begins with `enter` starts up to 1.2 s early, while the previous speaker finishes the line), and a character
waiting for its turn keeps breathing — no pauses to add up by hand:

```js
const talk = VGCharacter.conversation([
  [vet, ['enter', 'left'], ['walk', 4, 230]],
  { together: [[vet, ['face', boy]], [boy, ['face', vet]]] },      // several characters at once
  [vet, ['speakCues', window.VOICE_CUES.line1]],
  [boy, ['speakCues', window.VOICE_CUES.line2], 'nod'],
], { gap: 0.25 });                                                 // seconds between turns; an opening LINE waits `leadIn` (0.6 s)
talk.addTo(tl, 0);
```

**Automatic camera.** Pass `camera` and the conversation directs itself — it cuts to whoever
is speaking and returns to the wide shot after the last line:

```js
VGCharacter.conversation(turns, { camera: ['#wall', '#floor', '#chair', '#granny', '#barista'] });
// or { camera: { scene: […], kind: 'chest', duration: 0.6, lead: 0.25, wide: true, fill, centerY } }
```

A turn without speech (a dog barks, someone cheers) keeps the current shot when its
character is already in it, and goes back to the wide shot when it is not — so the action is
seen.

Override one turn by writing it as `{ turn: [rig, ...steps], shot }`: `shot: 'face'` (another
size), `shot: [a, b]` (both in frame), `shot: 'wide'`, or `shot: false` (leave the camera
where it is). `talk.addTo(tl)` adds the camera too; it is also at `talk.camera`.

**Captions and speech bubbles.** `VGCharacter.captions(source, element, options)` writes the
words of each spoken line into `element` while it is spoken, and returns a paused timeline:

```html
<div id="caption" class="clip" data-start="0" data-duration="21" data-track-index="6"></div>
```
```js
tl.add(VGCharacter.captions(talk, document.getElementById('caption')).paused(false), 0);
```

- `source` — a `conversation()`, a `sequence()`, or your own `[{ start, end, text, rig }]`.
- The words come from the steps themselves: `['speak', 'words', 2]`, `['explain', 'words', 2.4]`,
  and for audio `['speakCues', cues, null, { text: 'words' }]` — or make the cues with
  `python3 tools/cues.py voice.wav --js --text "words"` and they carry the text.
- Style the element yourself (it starts at opacity 0). If it contains a child with
  `data-caption-text`, the words go there and the rest is yours (a frame, a bubble tail).
- `options`: `maxChars` (off by default; e.g. 110 splits a long line into chunks of about two
  lines, shown one after another and broken at sentence ends — scenes made by `tools/scene.py`
  set it), `fade` (0.15 s), `hold` (0.3 s after the line), `speaker: true` (prefix the
  character's name), and `follow: true` for a **speech bubble** — the element is placed above
  the speaker's head with `left` / `top` (give it `position: absolute`; `offsetY` is the gap).
- Keep the caption or bubble **out of** the camera's `scene` list. A bubble follows where the
  speaker stands in the un-zoomed frame, so do not combine `follow` with camera shots — use a
  fixed caption when the camera moves.

After a spoken line the next turn starts as soon as the words end (it overlaps the speaker's
0.55 s of settling); `overlap: false` waits. One character may speak several turns in a row.

`talk.turns` lists every turn with absolute `start` / `end` and its steps (to time your own
shots, effects and audio), `talk.of(rig)` is that character's sequence. (Under the hood it is still
one `sequence()` per character.) Give each character a stance (`sitDown`,
`['face', otherRig]`) — it holds for everything after. For a character that is
**already seated (or already turned) in the first frame**, set the stance on the rig before
building its sequence: `rig.state.seat = 1; rig.state.facing = -0.55;`. Speech gestures, `point`, `wave`,
`present`, `handOver` and `take` keep the held three-quarter stance: the arms that act are
drawn at their on-screen angles; the far arm comes out from behind the shirt (and passes in
front of the head). (A speaker whose
listener-side hand holds an item gestures with the other hand and opens toward the viewer
instead, as do `thumbsUp`, `cheer`, `shrug`, `stroke`, `write`, `drink`, `worry` and `speak`,
which then return to the held facing.) Draw the chair as an
ordinary element behind the seated character. Run `tools/peek.sh`: it prints every step's
start and end, and warns about speech overlapping by more than 0.15 s (the 0.55 s settling
tail of a speaking step does not count), a character facing away
from the one it turned to, and an `enter` that starts with the head already inside the frame, and an `<audio>` clip that does
not line up with its `speakCues` step (wrong start, wrong length, or missing; clips are matched
to steps by the sound file the cues were made from). Complete example: `examples/conversation/index.html`.

**Which way pets face.** Dogs and cats stand with the head toward screen right. Place a pet to
the *left* of the person it should look toward, or expect to see its tail first.

**Pet size next to a person.** Start from 0.45–0.55 × the person's host height (a cat on a
760 px person reads well at about 400 px) and judge it in the preview.

**Preview before rendering.** From the skill folder (the picture is saved next to the
composition as `peek.png`, or `peek-mouth<N>.png` with `--mouth`, unless you name a file):

```bash
sh tools/peek.sh /path/to/project/index.html                 # frame 0 + 7 evenly spaced
sh tools/peek.sh /path/to/project/index.html 0,1.5,3,6 /tmp/peek.png
PEEK_WIDTH=960 PEEK_COLS=2 sh tools/peek.sh /path/to/project/index.html 4,9   # bigger frames, to judge details
```

It prints the composition's declared and actual duration, the start and end of every step of
every character sequence, and warnings for anything that runs past `data-duration` or for two
characters speaking at the same time; then it saves one contact-sheet image of the requested
frames. Use it to fit the script to the planned
length and to check staging, instead of rendering.

## Voice-over and lip-sync

Two ways to move the mouth:

| | Use when | Mouth follows |
|---|---|---|
| `['explain', text, dur]` / `['speak', text, dur]` | there is no audio yet, or a rough match is enough | an estimate from the syllables of `text`, spread over `dur` |
| `['speakCues', cues]` | there is a voice file | the audio itself: opens on the words, closes in the pauses, gestures on the breaks between phrases |

**With a voice file:**

1. Make the cues from the audio (nothing is uploaded; run it again whenever the audio changes):

   ```bash
   python3 tools/cues.py voice.wav --js          # → voice.cues.js, sets window.VOICE_CUES.voice
   ```

   It uses [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) when the
   `rhubarb` program is installed (on `PATH`, or its path in `$RHUBARB`) — mouth shapes then
   follow the phonemes; add `--dialog words.txt` to help it. Otherwise it uses its own
   **spectral** method: no dependency, it reads where the sound's energy is and picks open,
   spread, rounded, closed or teeth-together shapes — an acoustic guess, not speech
   recognition. `--method amplitude` is the simplest fallback (loudness only). Force one with
   `--method rhubarb|spectral|amplitude`. WAV is read directly; mp3, m4a and other formats need
   `ffmpeg`. Without `--js` it writes Rhubarb-format JSON.

2. Load the cues as a plain script (a composition cannot `fetch`) and use them as a step:

   ```html
   <audio id="voice" class="clip" src="voice.wav" data-start="5.31" data-duration="6" data-track-index="4" data-volume="1"></audio>
   <script src="voice.cues.js"></script>
   ```
   ```js
   const act = VGCharacter.sequence(rig, [['enter', 'left'], ['speakCues', window.VOICE_CUES.voice], 'wave']);
   ```

3. Set the audio clip's `data-start` to where the `speakCues` step starts and its
   `data-duration` to the file's length — `tools/peek.sh` prints both next to the step, ready
   to paste (`act.data.steps` holds the same). The step lasts the audio's
   length plus about 0.55 s of settling; the mouth is closed again when the audio ends.

**Check the lip-sync by eye.** Still frames a second apart cannot show whether a mouth follows
the words. `sh tools/peek.sh index.html "" mouth.png --mouth=2` saves a dense strip of mouth
close-ups (10 a second) for the 2nd spoken line, each labelled with its time and cue shape,
and prints the shapes in order. Pauses should show a closed mouth, stressed vowels an open one.

Several lines: one audio clip and one cue script per line (`--name line2` sets the key in
`window.VOICE_CUES`). Complete example: `examples/voiceover/index.html` (its `voice.wav` is a
synthetic placeholder hum — replace it with your recording or TTS output).

**Without audio**, give `explain(text, dur)` the text and the planned length; when the audio
arrives, switch the step to `speakCues`.

## Camera shots

`VGCharacter.shot(scene, subject, kind, options)` zooms the scene onto one or several
characters and returns a paused timeline to add to the composition's:

```js
const scene = ['#wall', '#floor', '#dog', '#vet'];            // everything that belongs to the scene
const speech = act.data.steps.find((step) => step.name === 'speakCues');
tl.add(VGCharacter.shot(scene, vet, 'chest', { time: speech.start + 1 }).paused(false), speech.start - 0.3);
tl.add(VGCharacter.shot(scene, vet, 'face',  { time: speech.start + 4 }).paused(false), speech.start + 4);
tl.add(VGCharacter.shot(scene, [vet, dog], 'full', { time: speech.start + 6 }).paused(false), speech.start + 6);
tl.add(VGCharacter.shot(scene, null, 'wide').paused(false), speech.start + speech.duration);
```

- `scene` — a selector, an element, or an array of them. Every listed element gets the same
  move and zoom, so they stay flat siblings in the composition (no wrapper). Leave out what
  must not move: captions, a logo, the audio.
- `subject` — a rig (person or pet) or an **array of rigs**; the frame then holds all of them
  (two people talking, a person and their dog). `null` for `'wide'`.
- `kind` — `'face'`, `'chest'` (top of the head to the hips), `'full'`, or `'wide'` (back to
  the whole frame). For a pet, `'chest'` and `'full'` both mean the whole animal.
- `options` — `duration` (0.6 s; `0` is a hard cut), `ease`, `fill` (0.82: how much of the
  frame the target takes), `centerY` (0.5: where the target sits vertically — about 0.36 in a
  vertical frame with captions mid-frame), and `time`: the moment of the shot, so the camera aims at where
  each subject is **by then** (after a walk, seated…). It is a time in the subject's own
  sequence — the same as the composition time when sequences are added at 0. Without `time`
  the camera aims at the subject's first frame. `sequence` overrides which sequence is used
  (default: the last one built for that rig). `avoid: [otherRigs]` keeps the frame from cutting
  a neighbour in half: it shifts, or includes the neighbour (`timeline.data.subjects` tells).
- The aim is computed once, when the timeline is built: the camera does not follow a
  character that walks during the shot.

## 3D sets — a room of planes, a camera with angles, characters still 2D

`VGCharacter.createSet(view)` builds a room out of flat CSS 3D planes inside one clip and gives
it a camera you move like anything else. The characters stay the flat SVG rigs: each frame the
set projects the spot a character stands on and places its host as an ordinary 2D element, so
it always faces the lens and stays sharp at any distance. Its shadow lies on the 3D floor under
its soles, so it flattens and turns with the camera.

**Automatic views.** `"view": "close"` on a turn (or `"medium"`, `"full"`) frames that turn's character
and cuts back to the view before it on the next turn — the easy way to show a pet's expression. `"view": {
"on": ["vet", "dog"], "size": "medium", "back": true }` frames several characters (`"cut": false` with
`"dur"` pans instead of cutting; `"yaw"` / `"pitch"` may be added). The values are worked out when the scene
is built, by `set.frameOn(subjects, size, { avoid })`: it measures the drawn figures where they stand at the
start of the turn and moves the camera so nobody else is cut in half by the frame edge. Sizes: a person
`close` = head, `medium` = from the waist, `full` = whole; a pet is always shown whole (`close` biggest).

**Light.** `"set": { "light": "day" | "evening" | "night", "lamps": [ … ] }`. Every plane of the room is
shaded by the main light, corners and the foot of the walls are darker, boxes sit on a soft shadow. A lamp
(`{ "name": "lamp", "x": -180, "y": 550, "z": -840, "color": "#ffd59a", "power": 1, "on": true, "kind": "point" }`,
`"kind": "ceiling"` for a ceiling light) has a glowing bulb, a warm pool on the floor and walls, lights the
characters near it (brighter, warmer, a rim of its colour on the side facing it) and throws long shadows away
from it. A `"lamp"` cutout is a light by itself. A back-wall panel with `"window": true` casts sunlight on
the floor in the day and the evening. `"lamp": "on"` / `"off"` on a turn switches a lamp (a lamp switched on
by the script starts off). In code: `set.light({ mood, lamps, windows })`, `tl.add(set.lamp('lamp', true), t)`.
A lamp switched on flickers once or twice before it comes up (`set.lamp(name, true, dur, { flicker: false })`
for a smooth fade). A window is a second, cool light in the day (warm in the evening): a character between it
and a lamp has a warm side and a cool side. Standing in the patch of sunlight makes a character brighter,
with a rim of sunlight and a hard shadow along the sun. A bright window right behind a character darkens
them a little and gives them a rim and a soft glow of light (backlight). Clouds pass over the sun every ~11 s
(`set.light({ clouds: false })` to keep it steady). A `"tv"` cutout (in the living room) and the screens
light the room with a flicker that changes colour in the evening and at night. Someone standing near the back
wall darkens the wall behind them. At night the window glass is dark blue.
Tables and sofas cast long shadows from the lamps and the sun too. A lens layer grades the colour for the time of
day, darkens the corners, adds a fine film grain and a glare round bright lights (`set.light({ lens: false })`).
`"sky": "night"` on a turn (`{ "to": "night", "dur": 6 }`) turns the light of the scene to another time of day
(`set.shift('night', 6)` in code; lamps switch themselves on as it gets dark); `"power": "off"` / `"on"` cuts and
restores every lamp and screen at once.
Characters are shaded too: the side toward the nearest lamp (or the main light) is lit and tinted, the other
side darker (`rig.lightShade`, done by the set each frame). A turn with only `"lamp"` makes the person reach
for the lamp's switch while it changes. Lit lamps stay in automatic shots when that costs little. Evenings
and nights have haze on the walls, a sunlit window has dust in its shaft of light, a laptop or monitor glows
blue in the dark, and `"room": { "gloss": true }` reflects lamps and windows on the floor.
The light is drawn, not rendered: layers of colour over each plane, `filter` on the characters — it costs
little (a 58 s film renders in about the same time as before).

**Scripts in plain words.** `tools/script.py kich-ban.txt` turns a plain Vietnamese script into a scene file
for a 3D set with `"camera": "auto"` and builds it; see `python3 tools/script.py --help` for the format and
every word it knows (sets, moods, actions, actions toward someone). The scene file it writes is an ordinary
one: edit it and build it with `tools/scene.py` like any other.

A script can hold a whole film: each `=== name · bối cảnh: … · ánh sáng: …` line opens a scene; the lines before
the first `===` are shared (frame, music, opening, closing, logo, cast). `script.py` writes one scene file per
scene and a `film.json`, then builds the film. `"hook": { "title", "text" }` in a scene file pops big words
over its first moments instead of an opening card.

**Vertical video** (`"width": 1080, "height": 1920`) with `"camera": "auto"`: each speaker is shown alone
at chest height (shot / reverse shot), and the opening wide shot keeps to the group around the first turn.

**Automatic direction.** `"camera": "auto"` at the top of a scene file with a `"set"`: no `"view"` needed.
The scene opens wide; each speaker is framed with the one they answer (with whoever acts with them in a
`together`); a strong mood (angry, worried, sad, surprised…) is a close shot of the speaker; a pet's
`"mood"` is a close shot of the pet; an action toward someone frames both. A shot lasts at least 2.5 s
(1.2 s before a line, so the speaker is always on screen); a change of size on the same people pans. A
turn with its own `"view"` keeps it. In code: `set.direct(tl, [{ time, end, subjects: [rig…], size,
speech }, { time, fixed: true }, …])` returns the times it cut; pass them to `captions({ cuts })` so a line
does not linger over the next shot.

**Framing.** `set.framing()` lists who the frame edge cuts through at the current frame
(`[{ name, shown, edge, pet }]`, `shown` = the part of the head and body still in the frame).
`tools/scene.py` sweeps the whole scene with it and warns when a `"view"` leaves a character half in
the frame for 2 s or more — a close-up that slices the person beside the speaker. Widen the view to
take them in, or move it so they are fully out. A person cut at the knees by the bottom edge is a
normal medium shot and is not reported; a pet cut there is. Pet expressions read only in a close
view on the pet.

**The camera stays near eye level.** The characters are drawn at eye level and stand upright;
from higher up they read as cards standing on the floor. So `pitch` is limited to −8…15° and
`yaw` to ±60° (the rigs have no back), and a camera outside those limits is an error. For a view
of the whole room use the **overview**: a very long lens from far away at a low angle, nearly
without perspective — the wide shot of a stage, not a view from above. When the camera moves round, a person
turns the other way by the same angle (their own `facing` minus the camera's `yaw` / 90°), so a
character facing right is seen more from the front as the camera moves to the right.

**The short way** — `"set"` in a scene file (`examples/scene-3d/scene.json`):

```json
{
  "set": {
    "room":   { "width": 1800, "depth": 1300, "height": 700 },
    "boxes":  [ { "name": "table", "x": 330, "z": -560, "width": 380, "depth": 200, "height": 170 } ],
    "panels": [ { "wall": "back", "at": -520, "y": 520, "width": 340, "height": 210 } ],
    "cutouts": [ { "kind": "plant", "x": -640, "z": 110, "height": 620 } ],
    "camera": { "yaw": 0, "pitch": 6, "distance": 1750, "blur": 4 }
  },
  "characters": [
    { "name": "vet", "id": "vet", "x": -210, "z": -330, "height": 560, "faces": "boy" },
    { "name": "boy", "id": "boy", "x": 190,  "z": -300, "height": 420, "faces": "vet" },
    { "name": "cat", "species": "cat", "x": 520, "z": -660, "on": "table", "height": 210 }
  ],
  "script": [
    { "who": "vet", "say": "…", "view": { "yaw": -24, "distance": 980, "dur": 2.2 } },
    { "who": "boy", "do": ["cheer"], "view": { "wide": true } }
  ]
}
```

- **Coordinates.** `x` is left–right with 0 in the middle of the room, `z` is depth with
  negative further in (the open front of the room is at `room.front`, 200 by default), and
  heights are px above the floor. One unit is one pixel at the point the camera aims at when
  `distance` equals `lens`.
- **`set.preset`** — a ready-made room: `"reception"` (counter with a laptop, wall screen, bench,
  plant), `"exam"` (exam table, cabinet, poster), `"pharmacy"` (counter, shelf, monitor, sign) or
  `"living-room"` (sofa, coffee table, window, plant; warm colours). Boxes, panels and cutouts you
  list are added after the preset's; `room` keys you give override its. `tools/scene.py` prints
  where people should stand for it.
- **`set.room`** — `width`, `depth`, `height`, `front`; `floor` and `floor2` (two colours make
  a checker of `tile` px; drop `floor2` for a plain floor), `wall`, `sideWall` (CSS colours or
  gradients). `set.sky` is what shows beyond the room.
- **`set.boxes`** — tables, counters, benches: `x`, `z` (front-left corner), `width`, `depth`,
  `height`, optional `y`, `color`, `top`, `side`, `name`. A box hides a character standing
  behind it and is hidden by one standing in front. A character with `"on": "<box name>"`
  stands on top of it.
- **`set.panels`** — windows, boards, pictures on a wall: `wall` (`back` / `left` / `right`),
  `at` (x for the back wall, z of the near edge for a side wall), `y` (height of the top
  edge), `width`, `height`, `color`, `border`, `image` (a picture file filling the panel: a TV
  or wall screen showing the app, a poster, an X-ray, the clinic's sign).
- **`set.cutouts`** — flat upright pictures that stand in the room like the characters (always
  facing the lens, sharp, stacked by depth with them): `kind` (a ready-made prop: `plant`,
  `chair`, `stool`, `table`, `counter`, `laptop`, `monitor`) or `image` (a picture file), `x`, `z`, optional `y`,
  `height`, `color`, `shadow: false`. `laptop` and `monitor` take `screen` (a picture on the
  screen) and the laptop `facing` (`"away"`, the default, or `"viewer"`); stand them on a box
  with `y` = the box's height, and leave `height` out so they keep a person's scale. A laptop
  in front of a person behind a counter hides the hands of `["typing", 2]`. Put one **close to the camera** (`z` near the open front of
  the room) for a foreground: when the camera pans it slides across the frame faster than the
  room behind — parallax, the cheapest way to make the set read as 3D.
- **Depth of field — `blur`** (a camera value, so it goes in `set.camera` or a `view`): things
  away from the point the camera aims at are blurred, `blur` px for something as far from that
  point as the camera is, at most 16 px; 0 (the default) turns it off. Blur the back of the room
  in close shots (8–10) and keep it low or off in wide ones. It also hides the softness of the
  backdrop planes in a close shot.
- **`"view"` on a turn** moves the camera when that turn starts: any of `yaw` (camera round to
  the right), `pitch` (looking down), `distance`, `lens`, `x` `y` `z` (the point it aims at),
  `zoom`, `blur`, with `dur` (1.5) and `ease`. `"cut": true` jumps instead. `"wide": true` cuts to the
  overview of the whole room (sized to fit the frame; add `yaw` or `zoom` to adjust it). The next
  `view` after a wide shot is always a cut back to the normal lens — moving from the long lens to
  the normal one in a tween would make the whole room's perspective stretch on screen.
  A view that would make a character facing someone turn past full profile is reported.
- **Walking, entering, leaving.** `walk` with a distance moves the character along the room's x
  axis (its shadow and depth go with it). `"enter"` / `"exit"` walk through a side wall — add a
  door panel there (`"wall": "left"`); a character fades out as it crosses the wall line.
  `walkForward` / `walkAway` still shrink and grow the drawing in place, as in a flat scene.
- **Seated people:** `"seated": "chair"` or `"stool"` stands the seat behind the character.
- **Vertical frames** (`"width": 1080, "height": 1920`): the camera starts closer and aims at
  62 % of the frame height; captions sit at the top of the safe area.
- Not available in a 3D set: `props` (use `set.boxes` and `set.cutouts`), `background`, the 2D
  `camera` and `"shot"` (use `"view"`), `layout: "presenter"`, and speech bubbles
  (`captions({ follow: true })` throws — use captions at a fixed place). The tool says so rather than
  ignoring them.

**By hand** — the same thing in a composition:

```html
<div id="view" class="clip" data-start="0" data-duration="16" data-track-index="0"
     style="position:absolute; inset:0; background:#dbe9ee"></div>
<script>
  const set = VGCharacter.createSet(document.getElementById('view'), { camera: { pitch: 6, distance: 1750 } });
  set.floor({ x: [-900, 900], z: [-1100, 200], style: '#b7ccd3' });
  set.wall({ from: [-900, -1100], to: [900, -1100], height: 700 });        // back wall
  const table = set.box({ x: 330, z: -560, width: 380, depth: 200, height: 170 });
  const vet = VGCharacter.createCharacter(document.createElement('div'), { id: 'vet' }).rig;
  set.place(vet, { x: -210, z: -330, height: 560 });
  const cat = VGCharacter.createPet(document.createElement('div'), { species: 'cat' }).rig;
  set.place(cat, { x: 520, z: -660, y: table.top, height: 210 });

  const tl = gsap.timeline({ paused: true, onUpdate: set.update });        // the set follows every seek
  tl.add(VGCharacter.sequence(vet, ['wave', ['explain', 'Hello!', 3]]), 0);
  tl.add(set.move({ yaw: 20, distance: 1300 }, 4), 0);                     // a tween of the camera
  tl.add(set.cut({ ...VGCharacter.OVERVIEW, y: 280, z: -450, zoom: 0.9 }), 6);   // a cut to the wide shot
  set.drive(tl);            // LAST: apply the camera on every frame, also when the renderer seeks without callbacks
</script>
```

| Call | What it does |
|---|---|
| `createSet(view, { origin, camera })` | the set; `origin` is where the aimed-at point falls in `view` (default: centre, 57% down) |
| `set.floor({ x, z, style })` · `set.wall({ from, to, height, style })` · `set.panel({ at, size, turn, style })` | the backdrop. Walls are one-sided: list the corners clockwise seen from above (back wall left → right, right wall back → front, left wall front → back) and a wall between the camera and the room disappears |
| `set.box({ x, z, width, depth, height, y, colors })` | a prop that takes part in occlusion; returns `{ top }` |
| `set.place(rig, { x, z, y, height, turn })` | stand a person or pet in the set; returns its spot `{ x, y, z }`, which you may tween to move it |
| `set.stand(element, { x, z, y, height, ground, shadow })` | stand a flat picture in the set — a `createProp(host, 'plant')` host, an `<img>`, any element; `ground` is where its base is (0…1 of its height; ready-made props find it themselves). An `<img>` needs its `width` and `height` attributes set before it is stood: the set measures the element to centre it, and an image that has not loaded yet measures 0 wide, so a frame rendered then shows it half its width off to the right (`tools/scene.py` writes them for `set.cutouts`) |
| `set.look(values)` · `set.move(values, duration, ease)` · `set.cut(values)` | the camera: `yaw`, `pitch`, `distance`, `lens`, `x`, `y`, `z`, `zoom`, `blur`. `look` sets where it starts; `move` and `cut` return a marker to `tl.add(…, at)`. Limits: `VGCharacter.CAMERA_LIMITS`; wide shot: `VGCharacter.OVERVIEW` |
| `set.camera` | the camera as last computed (read-only) |
| `set.update()` | apply the camera at the timeline's current time — pass it as the master timeline's `onUpdate`. Seek with `tl.time(t)`: GSAP's `tl.seek(t)` skips `onUpdate` |
| `set.drive(tl)` | call it once the master timeline is built: it adds an empty tween over the whole timeline whose setter schedules `set.update()` on every frame, including frames the renderer reaches with `seek(t)`, which skips `onUpdate`. Without it, a frame rendered that way keeps the camera of the frame drawn before it; HyperFrames renders frames in parallel, so during a camera move neighbouring frames alternate between two camera positions and the picture flickers. `tools/scene.py` writes it |
| `set.project(x, y, z)` | where a point of the set lands: `{ x, y, scale, depth }` |
| `set.target(from, to, part = 'head')` | aim for `from.point(…)` / `from.stroke(…)` at `to`'s head — or with `'body'` at its body, for `listen` / `inject` — from positions in the room — use it instead of passing the rig: those actions otherwise aim for the camera angle at build time. The hand reaches in `from`'s own plane only: give both the same `z` |
| `set.aimAt(from, to)` | aim for `from.shine(…)` (flashlight) at where `to`'s head really appears on the screen, depth included — a pet nearer the camera looks lower than in `from`'s plane. `tools/scene.py` uses it for `["shine", "@cat"]` |

Limits to know before you plan a shot:

- **No back view.** A rig turns from front to full profile, so the camera cannot go behind a
  character: keep `yaw` within about ±60° of where the character faces.
- **Occlusion is per object, not per pixel.** A box is in front of a character or behind it as
  a whole (by the depth of its centre); a character cannot stand between the legs of a table.
- **No view from above.** See the limits at the top of this section; the overview is the
  substitute.
- **Large swings of `yaw` are cuts, not pans.** Panning 40° or more shows the characters turning
  on the spot to keep facing the lens.
- **Keep the backdrop plain.** The planes are CSS 3D layers, and while the camera moves Chrome
  stretches the picture it first drew of each one. Flat colours and soft gradients do not show
  it; small text or fine patterns on a wall will look soft in a close shot.
- The characters are deliberately *not* inside the 3D space for that same reason — a rig put
  in a `preserve-3d` element comes out pixelated as soon as the camera gets close.
- **The camera is a function of time.** `move` and `cut` are markers on the timeline; every
  frame the set replays them from the starting camera up to the current time. GSAP's own
  `set()` tweens remember the value they replaced when they were built, and two cuts in a row
  remember each other's values — a renderer jumping to an earlier frame then gets the lens of a
  later shot.

## Validate and render

```bash
npx hyperframes lint .          # static rules
npx hyperframes check .         # lint + runtime + layout in headless Chrome
npx hyperframes render -o out.mp4 .
```

- `lint` reads the bundle's source too. It rejects `querySelector` calls with interpolated
  template literals, so keep custom drawing code free of them (the library builds selectors by
  string concatenation for this reason).
- `check` may report warnings that are not defects of the composition. Depending on the
  poses it samples, per character:
  - `off_pivot_rotation` on arm parts (`#rig1-batR`, `#rig1-cangL`) or a pet's head
    (`#thu1-dau > path`): a dial-pointer heuristic misreading a limb that rotates about its
    joint. Several can appear. (Element ids inside the SVG use the rigs' internal names.)
  - `container_overflow` or `escaped_container` on `#view > div:nth-of-type(n) inside #view` in a 3D set:
    a character standing close to the camera, its host reaching past the bottom of the frame, or a
    foreground cutout with only one edge in the frame and most of its box outside. Deliberate, like a
    close shot. (`data-layout-ignore` cannot be used on them: `check` would then stop seeing them move.)
    The set hides a character or cutout that is wholly outside the frame.
  - `rotation_pivot_drift` on a leg part (`#rig1-ongL`, the shin) or a pet's body part
    (`#thu1-gu`, the withers; `#thu1-thanE`, the trunk — any `#thuN-…` or `#rigN-…` id is a
    part of a character): the check expects a rotating element to spin about its own
    centre, but these rotate about a joint — the knee, or the pelvis when a dog sits — so their
    centre is meant to travel.
  - `film_silent` on a composition that has no audio.
  - `line_unread` on a caption that follows speech: the check wants 0.5 s + 0.3 s a word for
    on-screen text, and people speak faster than that. Captions made by `tools/scene.py` carry
    `data-layout-ignore` for this reason; add it to your own caption element too.

  `sh tools/lint-examples.sh --check` (run in CI) fails on anything outside this list.
  `check` prints a count per section ("0 error(s), 1 warning(s)"); the warning itself is the
  `⚠` line just above that count.
  - `gsap_tween_tail` on `cuoi`, `batR` / `cangR` (internal names for smile and right arm)
    inside `explain`: two of the library's own gesture tweens meet within a frame. Cosmetic.

  Errors, and warnings on your own elements, are still yours to fix.
- After rendering, scrub the first two seconds of any `enter`: the character must walk in and
  stop, not snap back. `tools/check.sh` guards this, but it is the failure worth a look.

## Things the composition has to provide

The library draws characters only. A scene usually needs:

- **A chair for `sit` / `sitDown`.** Sitting lowers the whole character by about 0.11 × host
  height (the thighs foreshorten; feet stay on the floor). `VGCharacter.createProp(host,
  'chair', { for: rig })` draws a chair whose seat is at that character's sitting height — see
  `references/actions.md` → Scene props. Any element of your own behind the host works too.
- **Seated behind a counter or desk.** Measured from the bottom of the host, a seated
  character's chin is at about 0.4–0.5 × host height and the top of the head at 0.7–0.85; the
  hem of the top is at about 0.1–0.15. So a counter in front that is taller than ~0.35 × host
  height leaves only the head showing. Either keep the counter low, or raise the character's
  host (a taller stool) until the chest clears it, and check with `tools/peek.sh`.
- **Several scenes in one film:** `python3 tools/film.py film.json` builds and renders each scene file and
  joins them with fade / slide transitions (sound kept in step; silent scenes get a silent track). It can lay
  background music under the whole film (`"music"`, looped, faded, lowered ~10 dB while someone speaks), and writes
  subtitles (`film.srt`, every spoken line at its time in the film) and a poster frame (`film.jpg`). Only the first
  scene's `"intro"` and the last scene's `"outro"` card are kept. By hand:
  render each scene at the same size and frame rate
  (`hyperframes render --fps 24 --output partN.mp4`; the default is 30 fps), then join them,
  re-encoding so sound and picture stay together:

  ```bash
  ffmpeg -i part1.mp4 -i part2.mp4 -i part3.mp4 -filter_complex \
    "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" \
    -c:v libx264 -crf 18 -r 24 -c:a aac -b:a 192k final.mp4
  ```
- **Flat siblings, not nested wrappers.** Keep the chair, counter, speech bubbles and the
  character hosts as direct children of the composition root. `hyperframes check` reports
  `nested_structure_needs_subcomposition` when timed clips are wrapped in an extra container.
- **Speech bubbles or captions.** `speak` and `explain` move the mouth; they do not show text
  by themselves — `VGCharacter.captions()` does (see Staging recipes).

## How it stays deterministic

- All randomness goes through one seeded generator.
- `sequence()` plays its actions forward once while building, records the character's state
  60 times a second, and returns a timeline with a single tween that looks the state up. A
  frame therefore depends only on its time, never on where the playhead came from.
- The rig redraws from its state object on every write, so it renders correctly whether the
  renderer seeks with `totalTime(t, false)` or with `seek(t)` (which suppresses GSAP callbacks).
  A 3D set's camera does the same through `set.drive(tl)`.
- Rig timelines use `lazy: false`. GSAP normally defers a tween's first write to the end of
  the tick; when a renderer jumps straight to a frame, a later tween would otherwise record
  its start value before an earlier one has written, and the character snaps to a stale
  position.
- `tools/check.sh` asserts these: same seed gives the same timeline; for every action placed
  mid-sequence, seeking to a time from before and from after gives the same state; frame 0 of
  a sequence that starts with `enter` has the character off-frame; and no frame-to-frame
  position jump in a sequence built on a fresh page.
