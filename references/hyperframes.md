# Using characters in HyperFrames

[HyperFrames](https://github.com/heygen-com/hyperframes) renders an HTML composition to
video by seeking a paused GSAP timeline frame by frame in headless Chrome. The character
library is built to that contract. A complete composition is in
`examples/hyperframes/index.html`.

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
- `enter` starts about 0.57 × host height to the left of centre (270 of 470 frame units);
  make sure that is off-screen or behind something if the entrance should be hidden.
- A dog or cat beside a person looks right at roughly 0.4–0.45 × the person's host height.

## Staging recipes

**Units.** Distances passed to `walk`, and the `{ x, y }` given to `point`, are in the rig's
frame, not in pixels: `px = units × hostHeight / 470` for people, `/ 330` for pets. A 760 px
tall host therefore moves 1.62 px per unit.

**Walk in from off-screen to a mark.** `enter` always ends at the centre of its host and
starts 270 units to the left of it. Two ways to use that:

- *Host at the mark.* Put the host where the character should end up. The entrance is only
  hidden if the mark is within about 0.4 × host height of the left edge (270 units to the
  character's centre, minus half the width of the head, which is the widest part), or
  something covers the start. `tools/peek.sh` warns when the head starts inside the frame.
- *Host at the edge, then walk.* Put the host so its centre is near the left edge, and follow
  `enter` with a walk to the mark:

  ```js
  // host: left:-60px; height:760px → centre ≈ 263 px. Mark at 670 px → 407 px → 251 units.
  VGCharacter.sequence(rig, ['enter', ['walk', 4, 250], 'wave']);
  ```

  A character keeps the position it walked to, so everything after the walk happens at the mark.

**Enter from the right:** `['enter', 'right']` (people). Mirror the layout above.

**Two characters talking.** One sequence per character, speaking steps taking turns; a bare
number in a sequence is a pause that waits for the other's line. Start each with a stance
(`sitDown`, `['face', otherRig]`) — it holds for everything after. For a character that is
**already seated (or already turned) in the first frame**, set the stance on the rig before
building its sequence: `rig.state.seat = 1; rig.state.facing = -0.55;`. Hand gestures open
the body toward the viewer for their duration (arms are drawn for a front view), then return
to the held facing. Draw the chair as an
ordinary element behind the seated character. Run `tools/peek.sh`: it prints every step's
start and end, and warns about speech overlapping by more than 0.15 s, a character facing away
from the one it turned to, and an `enter` that starts with the head already inside the frame. Complete example: `examples/conversation/index.html`.

**Which way pets face.** Dogs and cats stand with the head toward screen right. Place a pet to
the *left* of the person it should look toward, or expect to see its tail first.

**Pet size next to a person.** Start from 0.45–0.55 × the person's host height (a cat on a
760 px person reads well at about 400 px) and judge it in the preview.

**Preview before rendering.** From the skill folder:

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

## Lip-sync to a voice-over

Put the audio in its own `<audio>` clip and give `explain(text, dur)` the same `text` and
the clip's duration. Start both at the same time:

```js
const act = VGCharacter.sequence(rig, ['enter', 1.0, ['explain', 'Chào bạn, mình là bác sĩ Lan.', 3.1]]);
```

`sequence` places the speech after `enter` and the 1 s pause. Read where it landed from
`act.data.steps` — `[{ name, start, duration }, …]`, times relative to the start of `act` — or
from the `tools/peek.sh` printout, and set the audio clip's `data-start` to match.

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
  - `rotation_pivot_drift` on a leg part (`#rig1-ongL`, the shin) or a pet's body part
    (`#thu1-gu`, the withers): the check expects a rotating element to spin about its own
    centre, but these rotate about a joint — the knee, or the pelvis when a dog sits — so their
    centre is meant to travel.
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
- **Flat siblings, not nested wrappers.** Keep the chair, counter, speech bubbles and the
  character hosts as direct children of the composition root. `hyperframes check` reports
  `nested_structure_needs_subcomposition` when timed clips are wrapped in an extra container.
- **Speech bubbles or captions.** `speak` and `explain` move the mouth; they do not show text.

## How it stays deterministic

- All randomness goes through one seeded generator.
- `sequence()` plays its actions forward once while building, records the character's state
  60 times a second, and returns a timeline with a single tween that looks the state up. A
  frame therefore depends only on its time, never on where the playhead came from.
- The rig redraws from its state object on every write, so it renders correctly whether the
  renderer seeks with `totalTime(t, false)` or with `seek(t)` (which suppresses GSAP callbacks).
- Rig timelines use `lazy: false`. GSAP normally defers a tween's first write to the end of
  the tick; when a renderer jumps straight to a frame, a later tween would otherwise record
  its start value before an earlier one has written, and the character snaps to a stale
  position.
- `tools/check.sh` asserts these: same seed gives the same timeline; for every action placed
  mid-sequence, seeking to a time from before and from after gives the same state; frame 0 of
  a sequence that starts with `enter` has the character off-frame; and no frame-to-frame
  position jump in a sequence built on a fresh page.
