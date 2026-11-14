# Using characters in HyperFrames

[HyperFrames](https://github.com/heygen-com/hyperframes) renders an HTML composition to
video by seeking a paused GSAP timeline frame by frame in headless Chrome. The character
library is built to that contract. A complete composition is in
`examples/hyperframes/index.html`.

## Setup in a HyperFrames project

1. Copy `dist/character.iife.js` into the project (next to `index.html`, or under `assets/`).
   Re-copy it whenever a character changes.
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
  <script src="character.iife.js"></script>
  <script>
    VGCharacter.gieo(7);

    const vet = VGCharacter.taoNhanVat(document.getElementById('vet'), { khoa: 'bac_si_thu_y' }).rig;
    const dog = VGCharacter.taoThuCung(document.getElementById('dog'), { loai: 'cho' }).rig;

    const vetAct = VGCharacter.kichBan(vet, ['enter', 'wave', ['giaiThich', 'Chào bạn!', 2.4], ['idle', 3]]);
    const dogAct = VGCharacter.kichBan(dog, [['idle', 1.2], 'wagTail', 'sit', 'bark']);

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
  composition must use the IIFE bundle. A config tuned in the studio goes in as an object:

  ```js
  const config = { than: { coDau: 1.3 }, mau: { ao: '#2f9e8f' } };   // contents of configs/<id>.json
  VGCharacter.taoNhanVat(host, { khoa: 'bs_nam', config });
  ```

  The studio's ⋯ menu has **Chép mã nhúng HyperFrames** ("copy HyperFrames embed code"),
  which produces this snippet with the current config inlined.
- **Seed before building.** `VGCharacter.gieo(n)` must run before the first action method is
  called. Change `n` to get a different (still reproducible) pattern of blinks and gestures.
- **`kichBan` timelines are created paused.** Un-pause the child when adding it to the
  composition timeline — `tl.add(act.paused(false), at)` — or it will not follow the parent.
- **Budget the duration.** `kichBan(...).duration()` is the length of the sequence; the
  composition's `data-duration` and the host clip's `data-duration` must cover it. Pad the end
  with `['idle', n]` so the character is not frozen while other elements finish.
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

## Lip-sync to a voice-over

Put the audio in its own `<audio>` clip and give `giaiThich(text, dur)` the same `text` and
the clip's duration. Start both at the same time:

```js
const act = VGCharacter.kichBan(rig, ['enter', 1.0, ['giaiThich', 'Chào bạn, mình là bác sĩ Lan.', 3.1]]);
```

`kichBan` places the speech after `enter` and the 1 s pause; read the start time back with
`act.getChildren(false, false, true)[1].startTime()` to set the audio clip's `data-start`.

## How it stays deterministic

- All randomness goes through one seeded generator.
- State is a function of timeline time: walking is driven by a tweened phase with a property
  setter, not by callbacks, so seeking backwards restores position and pose.
- The rig redraws from its state object on every write, so it renders correctly whether the
  renderer seeks with `totalTime(t, false)` or with `seek(t)` (which suppresses GSAP callbacks).
- `tools/check.sh` asserts these: same seed gives the same timeline, seeking to one time by
  two different paths gives the same state, and frame 0 of a sequence that starts with
  `enter` has the character off-frame.
