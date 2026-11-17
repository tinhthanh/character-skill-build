# Changelog

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
