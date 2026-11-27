#!/usr/bin/env python3
"""Build a complete HyperFrames composition from a short SCENE DESCRIPTION (JSON).

    python3 tools/scene.py scene.json            → <folder of scene.json>/<id>/index.html (+ bundle, cues, audio)
    python3 tools/scene.py scene.json -o out/

You describe who is in the scene, where they stand, and who says or does what, in order.
The tool writes the composition: hosts and clips, furniture, a `conversation()` with the
camera and captions, mouth cues for every voice file, and `<audio>` clips with the right
`data-start` (it loads the result once in headless Chrome to read the timing).
The output is ordinary, commented HTML — edit it by hand afterwards if you want something else.
Once you have, the tool will not overwrite it (it stores a fingerprint of what it wrote); pass
--force to discard your edits and regenerate. Unknown keys in the scene file are errors.

Scene file (every key except `characters` and `script` is optional):

  {
    "id": "clinic-visit",                         composition id and output folder name
    "width": 1920, "height": 1080, "seed": 7,
    "background": { "wall": "#1f4a5c", "wallDark": "#0c1c26", "floor": "#0f2a38", "floorHeight": 190 },
    "characters": [
      { "name": "vet",  "id": "vet",  "x": 620,  "height": 760, "enter": "left", "faces": "boy" },
      { "name": "boy",  "id": "boy",  "x": 1320, "height": 570, "seated": "chair", "faces": "vet" },
      { "name": "bella", "species": "dog", "x": 1010, "height": 320, "faces": "vet" }
    ],
    "props": [ { "kind": "counter", "x": 300, "height": 760, "color": "#5f7d8c" } ],
    "script": [
      { "who": "vet", "say": "Good morning!", "audio": "line1.wav" },        lip-synced to the file
      { "who": "boy", "say": "Thank you, doctor.", "dur": 2.2 },             no audio: estimated mouth
      { "who": "bella", "do": ["bark"] },
      { "together": [ { "who": "vet", "do": ["wave"] }, { "who": "boy", "do": ["standUp"] } ] }
    ],
    "camera": true,            cut to whoever speaks (or { "kind": "face" }); false = static wide shot
    "captions": true           show the words, one line at a time, at the bottom centre of the frame (false = none)
  }

A 3D SET — a room with depth and a camera that changes angle; the characters stay 2D and face the lens
(sample: examples/scene-3d/scene.json; reference: references/hyperframes.md, "3D sets"):

  "set": { "room": { "width": 1800, "depth": 1300, "height": 700 },
           "boxes": [ { "name": "table", "x": 330, "z": -560, "width": 380, "depth": 200, "height": 170 } ],
           "panels": [ { "wall": "back", "at": -520, "y": 520, "width": 340, "height": 210 } ],
           "cutouts": [ { "kind": "plant", "x": -640, "z": 110 } ],        flat props or pictures; near the camera = a foreground
                      kinds: plant, chair, stool, table, counter, laptop, monitor ("screen": "app.png", laptop "facing"),
                      bowl ("fill": "food" | "water" | "empty"), scale ("reading": "4.2 kg"), carrier ("door": "right" | "left"), tree, lamp,
                      scooter ("facing": "right" | "left"), xray (an X-ray viewer, "spot", "screen"), paystand (QR stand + card reader — "y" is the counter height); any cutout may "drive": { "from": -1500, "dur": 3.2, "ease" } in
                      at the start (the conversation waits until it stops; a scooter's wheels turn)
           panels also take "image": "dash.png" (a TV / wall screen, a poster, an X-ray)
           "preset": "reception" | "exam" | "pharmacy" | "living-room" | "park" | "street" — a ready-made room or an
           outdoor place (your boxes etc. are added). A person "seated": true with "on": "<box>" sits on that box's front edge
           "camera": { "yaw": 0, "pitch": 6, "distance": 1750, "blur": 4 } }   blur: depth of field, 0 = off
           "light": "day" | "evening" | "night",  "lamps": [ { "name", "x", "y", "z", "color", "power", "on",
           "kind": "point" | "ceiling" } ] — a "lamp" cutout is a light too; a back-wall panel "window": true casts
           sunlight. "lamp": "on" / "off" / { "name", "on", "dur" } on a turn switches a lamp.
  characters take "x" (0 = middle of the room), "z" (negative = further in) and optionally "on": "<box name>",
  or "rides": "<scooter cutout name>" (sits on it, moves with it; "getOff" steps down);
  a turn takes "view": { "yaw": -24, "distance": 980, "dur": 2 } or { "wide": true } (the whole room, long lens).
  The camera stays near eye level: pitch −8…15°, yaw within ±60°.
  Not combined with "props", "background", "camera", "layout": "presenter" or "shot". "enter" / "exit" walk through a side wall.

  characters   `id` = a registered person (see `VGCharacter.list()`), or `species` = a pet.
               `x` is where the character STANDS: the centre, in px from the left of the frame.
               `height` is the host height in px (default: 0.7 × the frame height for people — 760 at
               1920×1080 — capped at 0.75 × the frame width in a vertical frame; pets 0.43 × that).
               `enter`: "left" | "right" | true — walks in from outside the frame to `x` before the script;
               true picks the NEARER edge, so the character does not cross the others on its way in.
               `seated`: true, or "chair" / "stool" to also draw that seat. `faces`: another character's name.
               `holds`: "cup" | "clipboard" | "phone" | "syringe" | "pills" | "leash" | "bag" | "card" | "stampcard" | "cash" (right hand), { "L": "cup" }, or
               { "R": { "kind": "phone", "image": "app.png" } } (a picture on the screen) — gives a person that item
               to hold. `"holdsHidden": true` keeps it put away, ready to be received with ["take", "@giver"]; `["L"]` keeps just that hand's item away.
  script       one entry per turn, played in order. `say` (+ `audio`, or `dur` seconds) speaks;
               `do` is a list of steps as in `sequence()` — "wave", ["walk", 4, 120], ["face", "@boy"]
               ("@name" refers to another character). Interaction steps: "drink", "write", ["stroke", "@pet"]
               (in a turn without `say` the pet answers at the same time: a cat purrs, a dog wags), exam steps
               ["listen", "@pet"] (stethoscope), ["inject", "@pet"] (needs "holds": "syringe", pet on that hand's side),
               ["carry", "@pet"] … "putDown" (pick the pet up and hold it; pets: "lieDown", ["sleep", 3], "unwell"), phone and
               computer steps ["showPhone", 1.8], ["tapPhone", 1.6], ["typing", 2], ["call", null, 2] (listening), and
               ["handOver", "@other"] (the other takes it at the same time if they have the item put away — "holds" +
               "holdsHidden"; a single "holds" item sits in the hand on the side of whoever it is handed to / taken from).
               A character that strokes or hands over walks up to the target first if it stands out of reach; a pet
               walks over to a SEATED person (give the pet the same z). `shot`: "face" | "wide" | false | ["vet", "bella"]
               overrides the camera for that turn. `{ "together": [ … ] }` runs turns at the same time; a "view" on the
               "together" entry itself points the camera for the whole group — a voice-over: `{ "together": [ { "who": "mom",
               "say": "…" }, { "who": "cat", "do": ["sitInBox"] } ], "view": { "on": ["cat"], "size": "close", "alone": true } }`.
               A NARRATOR who is only a voice (wave 42): `{ "name": "loi_dan", "narrator": true, "voice": "baotrang" }` in "characters" —
               no "id" / "species" / "x": it has no body on screen and the camera never frames it; its turns carry only "say" (+ "audio",
               "dur", "voice"), alone or inside "together" with a "view" on whoever acts. Captions and lip timing work as for anyone.
  script       `"mood"` on a turn: happy, sad, surprised, angry, thinking, laughing, worried, confused, tired,
               crying, embarrassed, sleepy. A PET's "mood": happy, excited, sad, scared, angry, curious, guilty,
               pain, sleepy — alone it is one beat of that face; with "do" the pet keeps the face through those
               actions (`{ "who": "dog", "mood": "pain", "do": [["limp", 4, 120]] }`) with its mark over the head
               (scared "!", curious "?", sleepy "zzz", happy heart…; `"marks": false` at the top: none).
               `"mark"` on a turn: "!", "?", "heart", "zzz", "sweat", "anger" or "music" over the head for the turn.
               In a 3D set `"camera": "auto"` at the top lets the camera choose every shot (turns with a "view" keep
               theirs); `"view": "close"` (or "medium", "full") frames the turn's character and cuts back after;
               `"view": { "on": ["vet", "dog"], "size": "medium" }` frames several. `"sounds"` at the top:
               `{ "bark": "bark.wav", "cat.meow": { "file": "meow.wav", "volume": 0.8, "at": 0.1 } }` — a sound each
               time that step plays (`mood` / `mark` only when they start, not when they end). Gestures: "clap", ["countFingers", 3], "checkWatch", "scratchHead",
               "headInHands", "bow", "wai", ["handshake", "@other"] (with the other's ["handshake", "@you"] in "together").
               "ponder", "crossArms", "handsOnHips", "introduce", "callOut", "relief", "startle", "lookAround",
               ["hurry", 6, 200]. Whole body (đợt 42 D): ["run", 300] / ["run", "@dog"] (runs up beside it; flight phase,
               { "speed": 0.5…2 }), ["jump", 2, { "height": 1 }] (jump for joy), ["dance", "happy", 2, { "bpm": 120 }]
               ("gentle" for older people) — their turns get a full shot (feet in the frame, the head kept in at the top of a jump). Vet care: ["examine", "@pet", "teeth"] (with the pet's "openMouth" in "together"),
               ["giveTreat", "@pet"], ["leash", "@pet"] … "unleash" (needs "holds": "leash"; then walk both "together").
               Pets: "scratchItch", ["limp", 4, 120], ["tremble", 2], ["eat", 2], ["drink", 2], "cough", "openMouth",
               "shakeOff", "sneeze", ["pant", 2], "yawn". Do / don't: "thumbsDown", "stopSign", "fingerWag", "beckon",
               "fingerHeart", "vSign", everyday gestures "laugh", "wipeTears", "facepalm", "shush", "okSign", "salute"; grooming ["brush", "@pet"]; a pill ["giveTreat", "@pet", {"kind": "pill"}].
               Combos (runtime/combos.js — each step becomes a turn of its own; a "say" on that turn comes first):
               "greetCustomer", ["fullCheckup", "@pet"], ["vaccinationVisit", "@pet", "<scale>"], "goodNews", "badNews",
               "waitingImpatient", ["dischargePet", "@pet", "@owner"].
               Exam room: ["weigh", "@pet", "<scale cutout name>"] (picks the pet up, sets it on a set.cutouts "scale" with a
               "name" — stand it beside the person, same z ±60 — reads the number, a big display pops up with the scale's
               "reading", the scale's own display reads 0 until the pet is on it; puts the pet back; optional 4th
               { "reading": "4.2 kg", "hold": 1.6 }); ["takeTemp", "@pet"] (a
               thermometer to the pet's rear, held 1.5 s, then read: { "reading": "38.5°C" } as 3rd argument after the hold,
               e.g. ["takeTemp", "@pet", 1.5, { "reading": "39.2°C" }]); ["givePill", "@pet"] (one hand holds the head, the
               other puts a pill in its mouth — the pet opens its mouth and chews by itself; both hands must be free).
               A pet's `"wears": "cone"` (or "bandage", or both in a list) keeps it on for the whole scene; a person's
               "wears": "mask" | "gloves" | "cap" (or a list). Pets: "greet", "play", ["goIn", 90] … ["comeOut", 90].
               "kneel" … "standUp" (down at a pet on the floor); "sitOnFloor" … "standUp" (cross-legged on the floor: a pet
               comes over to be stroked / carried onto the lap); ["lieDown", "floor" | "sofa", { "sleep": true }] … "standUp" (the
               sofa: stand or sit the person at it — the seat height is the sofa box's); ["pickUp", "@dog"] (the toy by the dog —
               the person steps up to it and gets a put-away toy; then ["handOver", "@mom"]); ["handOverPet", "@vet"] (the vet's ["takePet", "@owner"]
               is added at the same time; a carried pet passes from one person's arms to the other's); ["throwBall", "right"]
               (or "left", or "@dog": the way the dog faces) together with a dog's ["fetch", 260]; a pet's "rub" (against the legs of the person beside it).
               "ride" … "getOff": a person astride a scooter, side-on, hands on the bars. In a 3D set the easy way is
               "rides": "<scooter cutout name>" on the character — seated on it from the first frame, "getOff" in
               one of its turns steps it down beside the scooter (examples/scene-ride/scene.json).
               A cutout or prop "carrier" (pet carrier, "door": "right" | "left") — stand a pet behind it to put it inside.
               Clinic care: ["bandage", "@pet"] (wraps the near front leg; the bandage stays on), ["putCone", "@pet"] (a
               recovery cone that stays on), ["readChart", 2] (needs "holds": "clipboard": reads, flips a page, looks up,
               nods), ["showXray", "<xray cutout name>"] (turns to an "xray" viewer cutout — a lightbox on a stand,
               "spot": [0.675, 0.74] on the film, "screen": "film.png" for your own film — points at the spot, turns back).
               A person on the floor with the pet kneels for "bandage" / "putCone" as for "stroke".
               Hands on the pet: ["clipNails", "@pet"] (lifts a front paw, cuts its nails with a small clipper; optional
               { "hold": 1.8 }), ["eyeDrops", "@pet"] (raises the chin, a drop falls from a dropper into the eye, the pet shuts
               its eyes; { "hold": 1.2 }), ["cleanEars", "@pet"] (wipes inside the ear with a cotton pad, then the pet shakes its
               head; { "hold": 1.8 }), ["scanChip", "@pet", { "id": "900 123 456 789" }] (passes a chip scanner over the neck,
               a card shows the number). The person goes to the pet's head end; the pet follows the hands by itself.
               Grooming (wave 42 F): ["bathPet", "@pet", { "hold": 1.8 }] on a pet with "inTub": true (it stands in a bath tub sized to
               it, on its box or the floor — 3D sets): shower spray on its back, foam lathered in with both hands, rinsed; the person
               steps back and the pet shakes off water. ["towelDry", "@pet"] (wraps a towel round it, rubs — the fur turns fluffy),
               ["brushTeeth", "@pet"] (holds the muzzle, the mouth opens, short brush strokes, then it licks its lips).
               Teamwork (wave 38): ["restrain", "@pet"] inside "together" with another person's ["inject", "@pet"] (or "examine",
               "listen", "takeTemp"…): the restrainer stands on the other side of the pet, both hands on it, for as long as the other
               works. Preparation: ["washHands", 2] (soap foam, shaken dry), "putOnGloves" … "takeOffGloves" (the gloves stay on between).
               Pets at play: "rollOver" (dogs, cats: on its back, paws in the air), ["chaseTail", 3] (dogs; then dizzy),
               ["knead", 6] (cats), ["lick", "@boy"] (dogs, cats: the boy kneels and holds out a hand at the same time — added for you;
               a pet the boy carries licks his face — he bends his cheek to it, "offerCheek"), ["hide", "@vet"] (runs behind the vet and peeks out, scared — give the pet
               a z 60–120 further than the vet's so it runs behind the vet, not through the legs), ["eatCarrot", 4] (the rabbit).
               Dog actions (wave 40): "playBow" (play bow, rump up), ["howl", 1.6] (sits, head back, wavy sound lines), ["dig", 4] (paws scrape, dirt flies back),
               ["carryToy", 120, { "kind": "rope" | "bone" }] (trots with a toy in its mouth; no distance = on the spot) or ["carryToy", "@boy", { "kind": "bone" }]
               (trots to him and drops it at his feet), ["leanOnLeg", "@boy"] (walks up and leans against his leg), ["tugOfWar", "@boy", 2.4] (the dog is walked a rope's length
               from him and the boy pulls the other end of the rope at the same time — his ["pullToy", "@dog"], added for you). Give the dog and the person the same z.
               Wave 40 — cats: ["groomFace", 3] (licks a paw and wipes it over ear and face), ["loaf", 2] (lies tucked like a loaf of bread, then
               sits up), ["slowBlink", 2] (eyes close slowly, a sign of trust), ["batToy", 3] (swipes at a ball of yarn that rolls away),
               ["archBack", 1.4] (Halloween cat: arched back, puffed fur, bushy tail), ["sitInBox", 2] (a cardboard box appears, the cat hops
               in, only head and ears out, then hops out). Rabbits: ["binky", 2] (happy leap with a mid-air twist and kick), "flop" (flops
               on its side, legs out — held until "standUp", like "lieDown"), ["periscope", 1.6] (up on the hind legs, looking around),
               ["noseTwitch", 1.6] (close shot: nose and whiskers twitch). Another species is refused, naming the right one. All ten cut to a close shot like the above.
               In a 3D set a pet's own turn with rollOver, chaseTail, knead, eatCarrot, lick or bark (and no "view") cuts to a close
               shot of the pet for that turn — the pet ≥ 35 % of the frame height, others may be cropped — then back.
               Two people together: ["highFive", "@boy"] (both slap raised hands between them), ["hug", "@owner"] (step in, arms
               round each other, heads side by side, sway, step back), ["patShoulder", "@owner"] (a hand on their shoulder, two slow
               pats — they look back at you), ["whisper", "@nurse"] (lean to the ear, hand cupped by the mouth — they lean in,
               then react and nod), ["handOverBag", "@owner"] (needs "holds": "bag": a medicine bag held out in both hands, they
               take it). The other person's part is added at the same time (alone in the turn, no "say"), and the two step to
               the right distance first; an adult kneels or crouches to a child. The receiver of the bag gets a put-away bag.
               Cashier / café (items "phone", "card", "cash", "stampcard", "cup" — {"kind": "cup", "open": true}; put-away items are taken out by the action):
               ["payByQR"] / ["payByCard"] (hold a phone / bank card to the QR code / reader of a "paystand" cutout — on a "reception" / "pharmacy" preset
               one is put on the counter top for you — then a green tick; the payer walks up to it), ["giveChange", "@customer"] (counts banknotes hand to
               hand, hands them over; the customer gets put-away notes), ["stampCard"] / ["stampCard", "@customer"] (stamp pressed, a red mark stays;
               with a customer the card is handed over), ["pourDrink"] (stream into the cup, level rises, the full cup stays in hand — then "handOver"),
               ["wipeCounter", 2]. The counter of the set is used when there is one (hands above it; the cloth on its top).
               Presenter actions (a person): ["holdSign", "Giảm 20%", 2, { "color": "#2f9e8f" }] (a small sign with 1–3 short lines — a
               list or "line 1|line 2" — raised in both hands in front of the chest, tilted a little, then lowered; the text is
               kept big enough to read), ["showSize", "big" | "medium" | "small" | number, 1.4] ("this big": both hands apart,
               palms facing, a small bounce), ["takeSelfie", 1.6, { "with": "@boy" }] (needs "holds": "phone", put away is fine:
               the phone high at arm's length, a V sign, a flash; with "with" the other person (leans in, V sign) or pet (tilts its
               head) does their part at the same time and steps up beside the taker), ["yawnStretch"] (a wide yawn, both arms up, a shake
               of the head). In a vertical frame the sign and the gap come out narrower so the hands stay in the frame.
  script       `"phone": true` on a turn with `say`: the line is spoken on the phone (needs "holds": "phone").
               With `say`, the whole line is spoken with that face; without it, it is an expression beat
               before the turn's actions.
  layout       `"layout": "presenter"` is for explainer videos: the characters stand to one side and the other
               side is a CONTENT PANEL. A turn can then carry `"show": { "title": "…", "bullets": ["…"], "image":
               "file.png" }` — it appears as the turn starts (bullets one by one while the line is spoken) and
               stays until the next `show` (`"show": false` clears the panel). No close-up camera in this layout.
               `"layout": "split"` is a PHONE CALL between two places: the frame splits in two halves, each with its own
               background (`"sides": { "left": { "preset": "home" }, "right": { "wall": "#…", "floor": "#…" } }`), every
               character has `"side": "left" | "right"` and an `x` within its half (default: the middle of it). The half
               that is not speaking dims a little; no close-up camera. Use `"phone": true` turns for the call.
  toast        `"toast": "Appointment moved"` or `{ "title": "VetGo", "text": "Bella: Saturday 9:00" }` on a turn: an
               app notification card slides in at the top of the frame as the turn starts and stays 2.5–4 s.
               A person holding a phone can also get one ON the phone: ["notify", "Reminder: Saturday 9:00"].
  intro/outro  `"intro": { "title": "…", "text": "…", "cta": "…", "logo": "logo.png", "dur": 2.6, "color": "#2f9e8f" }`
               opens the video with a full-frame card (the scene starts after it); `"outro"` closes it with one after the
               last turn (the call to action: "cta"). Join several scene files into one film with tools/film.py.
  popup        3D sets: `"popup": { "on": "screen", "title": "New appointment", "text": "Milo, 15:00", "hold": 2.5 }` on a
               turn pops a notification card up ON the screen of a set.cutouts "monitor" (or a "laptop" with "facing":
               "viewer") given that "name" — it follows the camera with the screen.
  voice        `"voice": "maichi"` on a character (or on one turn) speaks its lines with the `voice-tts` command
               (Vietnamese; `voice-tts voices` lists them). Each line is synthesised ONCE into voice/ next to the
               scene file and reused — delete a file to have it spoken again. `"voice": false` on a turn keeps
               that line silent. Without voice-tts installed, use "audio" or "dur".
  enter/exit   `"enter": "left" | "right" | true` on a TURN brings that character in mid-scene: it is off stage until
               then, walks in to its `x`, then says / does the rest of the turn. `"exit": "left" | "right" | true`
               walks it out after the turn. true means the nearer edge. People and pets can use either side. Order inside one turn: enter → say → do → exit (a `mood` without `say` comes first).
  background   `"preset": "clinic" | "lobby" | "home"` draws a simple room (and sets the floor colour).
  music        `"music": "file.mp3"` plays under the whole scene at `"musicVolume"` (0.15).
  props        `"front": true` draws a prop IN FRONT of the characters — a counter someone stands behind.
               `"tabletop"` is the height of a table or counter top in frame units (150; lower it for
               someone seated behind it — the tool tells you when a seated character would be hidden).
  background   `"image": "room.jpg"` (relative to the scene file) fills the frame instead of the plain wall;
               the floor strip is then drawn only if you also give `"floor"`.
  audio        paths are relative to the scene file; WAV is read directly, other formats need ffmpeg.

After editing the generated index.html by hand (longer walks, other reactions…), the audio
clips and the total duration are out of date. Fix them in place with:

    python3 tools/scene.py --retime path/to/index.html
"""
import argparse, json, math, os, re, shutil, subprocess, sys

if os.path.dirname(os.path.abspath(__file__)) not in sys.path: sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))     # scenelib/ sits next to this file
from scenelib.actions import (BATH_BACK_42F, CARE_35, CARE_38, CARE_38_GAP, CARE_38_HEAD, CARE_38_HOLD, CARE_38_OPTIONS, CARE_42F, CARE_ACTIONS,
    CHART_ACTIONS, CONE_BACK, DESK_39, DESK_ITEM, DESK_NOUN, DESK_OPTIONS, DESK_PAY, FLOOR_42E, FLOOR_GAP_43, FLOOR_GAP_KID_43, GESTURES, KID_IDS_43,
    LICK_BEAT_40, MOTION_42D, PAIR_38, PAIR_GAP, PAIR_PARTS, PAY_REACH, PET_ACTS, PET_CLOSE, PET_CLOSE_FILL, PET_FILL_40, PET_MOOD_MARKS,
    PICK_GAP_42E, PILL_HEAD, PREP_ACTIONS, REACH_ACTIONS, RESTRAIN, RESTRAIN_GAP, RESTRAIN_PAIRS, RUN_GAP_42D, RUN_TO_42D, SIZE_39, TALK_39,
    TUG_SNOUT, TUG_STAND)
from scenelib.assets import PRESETS, _svg, copy_asset, image_size
from scenelib.audio import place_sounds, speak_line
from scenelib.camera import CAMERA_SPEED, CAMERA_START, NORMAL_LENS, YAW_LIMIT, check_camera, pet_fill_42a
from scenelib.expand import COMBOS, expand_combos, narrator_split_42a, pair_restrain
from scenelib.floor import floor_step_42e, floor_turn_42e, restore_42e
from scenelib.lighting import light_moments
from scenelib.notes import fingerprint, framing_notes, quiet_notes, shot_notes
from scenelib.page import place_shows, place_toasts
from scenelib.schema import (BACKGROUND_KEYS, BOX_KEYS, CAMERA_KEYS, CARD_KEYS, CAT_BREEDS, CAT_SPECIES, CHARACTER_KEYS, CUTOUT_KEYS, CUTOUT_KINDS,
    DRIVE_KEYS, FLOOR_KINDS, GSAP_FILE, ITEM_KINDS, LAMP_KEYS, LIGHT_MOODS, MARKS, MOODS, NARRATOR_KEYS_42A, NARRATOR_RIG_42A, PANEL_KEYS,
    PERSON_WEARABLES, PET_MOODS, PROP_KEYS, ROOM_KEYS, SCREEN_KINDS, SET_KEYS, SHOW_KEYS, TOP_KEYS, TURN_KEYS, VIEW_KEYS, VIEW_SIZES, WEARABLES)
from scenelib.sets import ROOM_DEFAULTS, SET_PRESETS
from scenelib.timing import read_timings, retime
from scenelib.util import HERE, PERSON, PET, ROOT, fail, html_text, js, known, slug  # noqa: E402,F401 — also re-exported for tools/reel.py, tools/script.py, tools/ci


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)     # --help in đủ định dạng tệp kịch bản
    parser.add_argument('scene', nargs='?')
    parser.add_argument('--retime', metavar='INDEX_HTML', help='re-time a generated composition after hand edits: fix every <audio> clip and the total duration in place')
    parser.add_argument('-o', '--output', help='output folder (default: <scene folder>/<id>)')
    parser.add_argument('--force', action='store_true', help='overwrite index.html even if it was edited by hand since the tool wrote it')
    parser.add_argument('--no-intro', action='store_true', help='leave out the scene\'s "intro" card (tools/film.py: only the first scene of a film opens with one)')
    parser.add_argument('--no-outro', action='store_true', help='leave out the scene\'s "outro" card (tools/film.py: only the last scene of a film closes with one)')
    parser.add_argument('--no-grain', action='store_true', help='leave the film grain out of a 3D set (tools/film.py adds grain when it joins the parts: cheaper to render, much smaller files)')
    parser.add_argument('--cues', default='auto', choices=['auto', 'rhubarb', 'spectral', 'amplitude'], help='lip-sync method for voice files')
    args = parser.parse_args()
    if args.retime: return retime(args.retime)
    if not args.scene: parser.error('give a scene file, or --retime path/to/index.html')
    if not os.path.isfile(args.scene): fail(f'no such file: {args.scene}')
    try:
        scene = json.load(open(args.scene, encoding='utf-8'))
    except json.JSONDecodeError as error:
        fail(f'{args.scene} is not valid JSON: {error}')
    if not isinstance(scene, dict): fail('the scene file must be a JSON object')
    if args.no_intro: scene.pop('intro', None)
    if args.no_outro: scene.pop('outro', None)
    if args.no_grain and isinstance(scene.get('set'), dict): scene['set']['grain'] = False
    known('scene', scene, TOP_KEYS)
    scene['script'] = expand_combos(scene.get('script'))
    scene['script'] = pair_restrain(scene['script'])                    # đợt 38 B: giữ con vật vừa khít phần việc người kia
    # ĐỢT 42 A — NGƯỜI DẪN KHÔNG HIỆN HÌNH: `{ "name": "loi_dan", "narrator": true, "voice": "baotrang" }` trong "characters". Chỉ nói (giọng + phụ đề),
    # không có thân trên màn hình, máy quay không bao giờ chiếu vào. Rút khỏi dàn nhân vật thật ở đây; lượt của họ đi riêng (`_narr42a`).
    narrators_42a = {}
    if isinstance(scene.get('characters'), list):
        for who in scene['characters']:
            if not isinstance(who, dict) or not who.get('narrator'): continue
            known(f'narrator "{who.get("name")}"', who, NARRATOR_KEYS_42A)
            if who['narrator'] is not True or not isinstance(who.get('name'), str) or not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', who['name']): fail(f'a narrator is {{ "name": "<identifier>", "narrator": true, "voice": "baotrang" }} — got {js(who)}')
            if who.get('voice') is not None and not isinstance(who['voice'], str): fail(f'narrator "{who["name"]}": "voice" must be a voice name (see `voice-tts voices`)')
            if who['name'] in narrators_42a or any(c is not who and isinstance(c, dict) and c.get('name') == who['name'] for c in scene['characters']): fail(f'two characters are named "{who["name"]}"')
            narrators_42a[who['name']] = {'name': who['name'], 'voice': who.get('voice'), '_pet': False, 'x': 0, 'id': NARRATOR_RIG_42A}
        if narrators_42a:
            scene['script'] = narrator_split_42a(scene['script'], narrators_42a)
            scene['characters'] = [c for c in scene['characters'] if not (isinstance(c, dict) and c.get('narrator'))]
    if isinstance(scene.get('background'), dict): known('background', scene['background'], BACKGROUND_KEYS)
    if isinstance(scene.get('camera'), dict): known('camera', scene['camera'], ('kind',))
    stage_set = scene.get('set')
    preset_note = None
    if stage_set is not None:
        if not isinstance(stage_set, dict): fail('"set" must be an object: { "room": {…}, "boxes": […], "camera": {…} }')
        known('set', stage_set, SET_KEYS)
        if 'preset' in stage_set:
            preset = SET_PRESETS.get(stage_set['preset'])
            if not preset: fail(f'set.preset must be one of {", ".join(SET_PRESETS)} — got {js(stage_set["preset"])}')
            # Đồ của bối cảnh dựng sẵn ĐI TRƯỚC, đồ người viết khai thêm cộng vào sau; `room` gộp từng khoá (khai thêm thì đè).
            merged = {key: value for key, value in stage_set.items() if key != 'preset'}
            for key in ('boxes', 'panels', 'cutouts', 'lamps'): merged[key] = [dict(item) for item in preset.get(key, [])] + list(stage_set.get(key, []))
            if not merged['lamps']: del merged['lamps']
            if 'room' in preset: merged['room'] = dict(preset['room'], **stage_set.get('room', {}))
            # Cách bày riêng cho KHUNG DỌC (đồ của preset, không đụng đồ người viết khai thêm).
            if int(scene.get('height', 1080)) > int(scene.get('width', 1920)) * 1.2:
                # Đồ cắt (cutouts) nhận theo `kind`, khối (boxes) theo `name`.
                for key, by in (('cutouts', 'kind'), ('boxes', 'name')):
                    for item in merged[key][:len(preset.get(key, []))]: item.update(preset.get('vertical', {}).get(key, {}).get(item.get(by), {}))
            stage_set = scene['set'] = merged
            preset_note = f'set.preset: where people stand — {preset["spots"]}'
        for key, allowed in (('room', ROOM_KEYS), ('camera', CAMERA_KEYS)):
            if key in stage_set and not isinstance(stage_set[key], dict): fail(f'set.{key} must be an object')
            known(f'set.{key}', stage_set.get(key, {}), allowed)
        if any(not isinstance(value, (int, float)) for value in stage_set.get('camera', {}).values()): fail('set.camera: every value must be a number')
        check_camera(stage_set.get('camera', {}), 'set.camera')
        for key, allowed in (('boxes', BOX_KEYS), ('panels', PANEL_KEYS), ('cutouts', CUTOUT_KEYS)):
            if not isinstance(stage_set.get(key, []), list): fail(f'set.{key} must be a list')
            for n, item in enumerate(stage_set.get(key, [])):
                if not isinstance(item, dict): fail(f'set.{key}[{n}] must be an object')
                known(f'set.{key}[{n}]', item, allowed)
        for n, item in enumerate(stage_set.get('boxes', [])):
            for key in ('x', 'z', 'width', 'depth', 'height'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.boxes[{n}] needs a number "{key}"')
        for n, item in enumerate(stage_set.get('cutouts', [])):
            if bool(item.get('kind')) == bool(item.get('image')): fail(f'set.cutouts[{n}] needs either "kind" ({", ".join(CUTOUT_KINDS)}) or "image" (a picture file)')
            if item.get('kind') and item['kind'] not in CUTOUT_KINDS: fail(f'set.cutouts[{n}].kind must be one of {", ".join(CUTOUT_KINDS)} — got {js(item["kind"])}')
            folder = os.path.dirname(os.path.abspath(args.scene))
            if item.get('image') and not os.path.isfile(os.path.join(folder, item['image'])): fail(f'set.cutouts[{n}].image not found: {item["image"]} (looked in {folder})')
            for key in ('x', 'z'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.cutouts[{n}] needs a number "{key}"')
            if 'screen' in item and item.get('kind') not in SCREEN_KINDS + ('xray',): fail(f'set.cutouts[{n}]: "screen" is for "laptop", "monitor" and "xray" (the film) only')
            if 'screen' in item and item.get('kind') == 'xray' and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['screen'])): fail(f'set.cutouts[{n}].screen not found: {item["screen"]}')
            if 'spot' in item and not (item.get('kind') == 'xray' and isinstance(item['spot'], list) and len(item['spot']) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in item['spot'])):
                fail(f'set.cutouts[{n}].spot is for an "xray" viewer: [x, y], both between 0 and 1 (a point on the film from its top left) — got {js(item["spot"])}')
            if 'facing' in item and item.get('kind') == 'scooter':
                if item['facing'] not in ('right', 'left'): fail(f'set.cutouts[{n}].facing must be "right" or "left" (the way the scooter points)')
            elif 'facing' in item and (item.get('kind') != 'laptop' or item['facing'] not in ('away', 'viewer')): fail(f'set.cutouts[{n}].facing must be "away" or "viewer" (laptop) or "right" / "left" (scooter)')
            if 'drive' in item:
                drive = item['drive']
                if not isinstance(drive, dict): fail(f'set.cutouts[{n}].drive must be {{ "from": <x>, "dur": <seconds>, "ease" }} — got {js(drive)}')
                known(f'set.cutouts[{n}].drive', drive, DRIVE_KEYS)
                if not isinstance(drive.get('from'), (int, float)): fail(f'set.cutouts[{n}].drive needs a number "from" (the x it starts at, e.g. -1300 — outside the left wall)')
                if not isinstance(drive.get('dur', 3), (int, float)) or not 0.5 <= drive.get('dur', 3) <= 12: fail(f'set.cutouts[{n}].drive.dur must be 0.5…12 seconds')
                if not isinstance(drive.get('ease', 'power2.out'), str): fail(f'set.cutouts[{n}].drive.ease must be a GSAP ease name such as "power2.out"')
                if drive['from'] == item['x']: fail(f'set.cutouts[{n}].drive.from is its own x — nothing to drive')
            if item.get('screen') and not os.path.isfile(os.path.join(folder, item['screen'])): fail(f'set.cutouts[{n}].screen not found: {item["screen"]} (looked in {folder})')
            if 'fill' in item and (item.get('kind') != 'bowl' or item['fill'] not in ('food', 'water', 'empty')): fail(f'set.cutouts[{n}].fill must be "food", "water" or "empty" (bowl only)')
            if 'on' in item and (item.get('kind') not in ('lamp', 'floorlamp') or item['on'] not in (True, False)): fail(f'set.cutouts[{n}].on is for a "lamp": true (lit) or false (off until a turn switches it on with "lamp")')
            if 'door' in item and (item.get('kind') != 'carrier' or item['door'] not in ('left', 'right')): fail(f'set.cutouts[{n}].door must be "left" or "right" (carrier only)')
            if 'reading' in item and (item.get('kind') != 'scale' or not isinstance(item['reading'], str)): fail(f'set.cutouts[{n}].reading is the text on a scale\'s display, such as "4.2 kg" (scale only)')
        # ÁNH SÁNG: "light" (giờ trong ngày), "lamps" (đèn), panel "window": true (cửa sổ hắt nắng).
        if stage_set.get('light', 'day') not in LIGHT_MOODS: fail(f'set.light must be one of {", ".join(LIGHT_MOODS)} — got {js(stage_set.get("light"))}')
        if not isinstance(stage_set.get('lamps', []), list): fail('set.lamps must be a list of { "x", "y", "z", "color", "power", "on", "kind", "name" }')
        for n, item in enumerate(stage_set.get('lamps', [])):
            if not isinstance(item, dict): fail(f'set.lamps[{n}] must be an object')
            known(f'set.lamps[{n}]', item, LAMP_KEYS)
            for key in ('x', 'y', 'z', 'power', 'range'):
                if key in item and not isinstance(item[key], (int, float)): fail(f'set.lamps[{n}].{key} must be a number')
            if item.get('kind', 'point') not in ('point', 'ceiling', 'screen'): fail(f'set.lamps[{n}].kind must be "point" (a lamp) or "ceiling" (a ceiling light) — got {js(item.get("kind"))}')
            if 'on' in item and item['on'] not in (True, False): fail(f'set.lamps[{n}].on must be true or false')
            if 'color' in item and not re.match(r'^#[0-9a-fA-F]{6}$', str(item['color'])): fail(f'set.lamps[{n}].color must be a colour such as "#ffd59a"')
        for n, item in enumerate(stage_set.get('panels', [])):
            if item.get('wall', 'back') not in ('back', 'left', 'right'): fail(f'set.panels[{n}].wall must be "back", "left" or "right"')
            for key in ('at', 'y', 'width', 'height'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.panels[{n}] needs a number "{key}"')
            if item.get('image') and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['image'])): fail(f'set.panels[{n}].image not found: {item["image"]}')
        # Những thứ của cảnh PHẲNG không có nghĩa trong bối cảnh 3D — báo rõ thay vì lặng lẽ bỏ qua.
        for key, why in (('props', 'use set.boxes'), ('background', 'use set.sky and set.room'), ('camera', 'put "view" on the turns instead')):
            if scene.get(key) and not (key == 'camera' and scene[key] == 'auto'): fail(f'"{key}" cannot be combined with "set" — {why}' + (' — or "camera": "auto" to let the camera choose every shot' if key == 'camera' else ''))
        if scene.get('layout', 'stage') != 'stage': fail('"layout": "presenter" cannot be combined with "set"')
    base = os.path.dirname(os.path.abspath(args.scene))
    scene_id = slug(scene.get('id') or os.path.splitext(os.path.basename(args.scene))[0])
    width, height = int(scene.get('width', 1920)), int(scene.get('height', 1080))
    out = os.path.abspath(args.output or os.path.join(base, scene_id))
    copied = {}                                             # ảnh đã chép: nguồn → tên trong thư mục ra
    drives = []                                             # cutout chạy vào đầu cảnh (`drive`) — hội thoại chờ chúng dừng
    # Cỡ mặc định theo KHUNG HÌNH: người cao 0,7 khung ngang (760 px ở 1920×1080), nhưng không rộng quá
    # ba phần tư bề ngang của khung dọc; thú bằng 0,43 người.
    person_default = round(min(0.7 * height, 0.75 * width))
    pet_default = round(person_default * 0.43)

    # ── nhân vật ──
    cast = scene.get('characters')
    if not isinstance(cast, list) or not cast: fail('"characters" must be a non-empty list')
    # Ai bước vào GIỮA cảnh (một lượt có "enter")? Phải biết trước khi đặt host: người ấy xuất phát ngoài mép khung
    # như người bước vào từ đầu, và ẩn cho tới lượt của mình.
    late = {}
    for entry in (scene.get('script') if isinstance(scene.get('script'), list) else []):
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if isinstance(turn, dict) and turn.get('enter') and turn.get('who') not in late: late[turn.get('who')] = turn['enter']
    names = {}
    split = scene.get('layout') == 'split'
    if split and stage_set is not None: fail('"layout": "split" is a 2D layout — it cannot be combined with "set"')
    for who in cast:
        if not isinstance(who, dict) or not who.get('name'): fail('every character needs a "name"')
        name = who['name']
        # MÀN HÌNH CHIA ĐÔI: mỗi nhân vật thuộc một nửa khung (`side`), `x` tính trong nửa ấy (mặc định giữa nửa).
        if split:
            if who.get('side') not in ('left', 'right'): fail(f'character "{name}": in a "split" layout every character needs "side": "left" or "right"')
            who['x'] = (0 if who['side'] == 'left' else width / 2) + float(who.get('x', width / 4))
        elif 'side' in who: fail(f'character "{name}": "side" is for "layout": "split"')
        known(f'character "{name}"', who, CHARACTER_KEYS)
        if name in names: fail(f'two characters are named "{name}"')
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', name): fail(f'character name "{name}" must be a plain identifier (letters, digits, underscore)')
        if bool(who.get('id')) == bool(who.get('species')): fail(f'character "{name}" needs either "id" (a person) or "species" (a pet)')
        pet = bool(who.get('species'))
        if 'rides' in who:                                   # người cầm lái đứng theo xe (kiểm tra kỹ ở dưới)
            ridden = next((item for item in (stage_set or {}).get('cutouts', []) if isinstance(item, dict) and item.get('name') == who['rides'] and isinstance(item.get('x'), (int, float))), None)
            if ridden: who['x'] = ridden['x']
        if 'x' not in who: fail(f'character "{name}" needs "x" (where it stands, px from the left)' + (' — or "rides" must name a scooter cutout' if 'rides' in who else ''))
        if who.get('enter') not in (None, False, True, 'left', 'right'): fail(f'character "{name}": "enter" must be "left", "right" or true (the nearer edge)')
        # `true` = mép GẦN chỗ đứng hơn: đi vào từ mép xa là băng ngang qua những nhân vật đứng giữa đường.
        nearer = 'left' if float(who['x']) < (0 if stage_set is not None else width / 2) else 'right'          # bối cảnh 3D: x = 0 là giữa phòng
        if who.get('enter') is True: who['enter'] = nearer
        if not who.get('enter'): who.pop('enter', None)
        if late.get(name) is True: late[name] = nearer
        if pet and who.get('voice'): fail(f'character "{name}": a pet cannot have a "voice"')
        # NGƯỜI CẦM LÁI (`rides`: tên một cutout xe máy): ngồi trên yên từ khung đầu, đi cùng xe; "getOff" trong lượt của mình
        # thì bước xuống cạnh xe. Chỗ đứng (x, z) lấy theo xe — không cần ghi.
        if 'rides' in who:
            scooters = {item.get('name'): item for item in (stage_set or {}).get('cutouts', []) if item.get('kind') == 'scooter' and item.get('name')}
            if stage_set is None: fail(f'character "{name}": "rides" needs a 3D set ("set") with a scooter cutout')
            if pet: fail(f'character "{name}": a pet cannot ride — only people have the "ride" stance')
            if who['rides'] not in scooters: fail(f'character "{name}": "rides" must name a set.cutouts item with "kind": "scooter" and a "name" (scooters here: {", ".join(scooters) or "none"}) — got {js(who["rides"])}')
            for key in ('enter', 'on', 'seated'):
                if who.get(key): fail(f'character "{name}": "rides" cannot be combined with "{key}"')
            if name in late: fail(f'character "{name}" rides in — it cannot also "enter" on a turn')
            if [w.get('name') for w in cast if w.get('rides') == who['rides']].index(name): fail(f'scooter "{who["rides"]}" has two riders — one per scooter')
            who['x'], who['z'] = scooters[who['rides']]['x'], float(scooters[who['rides']]['z']) - 15
        if stage_set is None and ('z' in who or 'on' in who): fail(f'character "{name}": "z" and "on" place a character in a 3D set — add "set" at the top of the scene file')
        if stage_set is not None:
            if 'on' in who and who['on'] not in [box.get('name') for box in stage_set.get('boxes', [])]: fail(f'character "{name}": "on" must name one of set.boxes (got {js(who["on"])})')
        if 'inTub' in who:          # đợt 42 F
            if who['inTub'] is not True and who['inTub'] is not False: fail(f'character "{name}": "inTub" must be true (stands in a bath tub) or false — got {js(who["inTub"])}')
            if who['inTub'] and not pet: fail(f'character "{name}": "inTub" is for a pet (it stands in a bath tub) — "{name}" is a person')
            if who['inTub'] and stage_set is None: fail(f'character "{name}": "inTub" needs a 3D set ("set") — the tub stands on the floor or on the box the pet is "on"')
            if who['inTub'] and (who.get('enter') or name in late): fail(f'character "{name}": a pet in a tub cannot "enter" — it is in the tub from the start')
        # NHẬN TÚI THUỐC (đợt 38 C): người được ai đó `["handOverBag", "@người này"]` mà không cầm gì thì có sẵn một túi ĐANG CẤT — `takeBag`
        # nhận vào đó (cùng chỗ trên màn hình với túi trong tay người đưa).
        bag_turns = [t for entry in (scene.get('script') or []) for t in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry])]
        if not pet and 'holds' not in who and any(isinstance(t, dict) and isinstance(t.get('do'), list) and any(isinstance(step, list) and len(step) > 1 and step[0] == 'handOverBag' and step[1] == '@' + name for step in t['do']) for t in bag_turns):
            who['holds'], who['holdsHidden'] = 'bag', True
        # ĐỢT 39 A: người được `["giveChange", "@người này"]` / `["stampCard", "@người này"]` mà không cầm gì thì có sẵn xấp tiền / thẻ tích điểm ĐANG CẤT.
        for kind, item in (('giveChange', 'cash'), ('stampCard', {'kind': 'stampcard', 'stamped': True})):
            if not pet and any(isinstance(t, dict) and isinstance(t.get('do'), list) and any(isinstance(step, list) and len(step) > 1 and step[0] == kind and step[1] == '@' + name for step in t['do']) for t in bag_turns):
                if 'holds' not in who: who['holds'], who['holdsHidden'] = {'R': item}, True
                elif not who.get('holdsHidden') and (isinstance(who['holds'], str) or isinstance(who['holds'], dict) and len(who['holds']) == 1 and not set(who['holds']) - {'L', 'R'}):
                    # Đang cầm một món khác (điện thoại): xấp tiền / thẻ nhận được đặt ở TAY KIA, đang cất (`holdsHidden: ["L"]`).
                    mine = {'R': who['holds']} if isinstance(who['holds'], str) else dict(who['holds'])
                    free = 'L' if 'R' in mine else 'R'
                    who['holds'] = dict(mine, **{free: item}); who['holdsHidden'] = [free]
        # ĐỢT 42 E: người NHẶT đồ (`["pickUp", …, { "item": "bowl" }]`) mà không cầm gì: có sẵn món ấy ĐANG CẤT — `pickUp` lấy nó ra khi tay nắm
        # lấy món đồ dưới sàn. (Rig tự cho món đồ khi gọi một mình; trong cả cảnh, trạng thái đầu cảnh phải biết trước là món đồ đang cất.)
        picks_42e = [step for t in bag_turns if isinstance(t, dict) and t.get('who') == name and isinstance(t.get('do'), list) for step in t['do'] if step == 'pickUp' or (isinstance(step, list) and step and step[0] == 'pickUp')]
        if not pet and picks_42e and 'holds' not in who:
            options_42e = next((a for a in (picks_42e[0][1:] if isinstance(picks_42e[0], list) else []) if isinstance(a, dict)), {})
            who['holds'], who['holdsHidden'] = options_42e.get('item', 'toy'), True
        # `holds`: tên món đồ (cầm tay phải) hoặc { "L" | "R": tên }.
        if 'holds' in who or 'holdsHidden' in who:
            if pet: fail(f'character "{name}": a pet cannot hold an item')
            held = who.get('holds')
            if isinstance(held, str):
                # Một món đồ, không nói tay nào: cầm ở tay PHÍA NGƯỜI SẼ NHẬN / ĐƯA (lượt `handOver` / `take` đầu tiên của người
                # này). Tay phải mặc định mà người kia đứng bên trái thì cánh tay phải vắt ngang bụng, bàn tay không ra khỏi thân
                # (cảnh thử đợt 29: bác sĩ đưa thuốc, tay cách tay bà 20 % chiều cao).
                side = 'R'
                spots = {c.get('name'): float(c.get('x', 0)) for c in cast if isinstance(c, dict) and isinstance(c.get('x'), (int, float))}
                turns_of = [t for entry in (scene.get('script') or []) for t in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry])]
                # Người nhận đứng một mình trong kịch bản (`take` do công cụ thêm vào lượt `handOver` của người kia): tính theo người đưa.
                swap = next((step[1][1:] if t.get('who') == name else t.get('who') for t in turns_of if isinstance(t, dict) and isinstance(t.get('do'), list)
                             for step in t['do'] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str)
                             and ((t.get('who') == name and step[0] in ('handOver', 'take', 'handOverBag', 'takeBag') and step[1][1:] in spots)
                                  or (step[0] in ('handOver', 'handOverBag') and step[1] == '@' + name and t.get('who') in spots and who.get('holdsHidden')))), None)
                if swap and name in spots and spots[swap] < spots[name]: side = 'L'
                held = {side: held}
            # Một món đồ: tên, hoặc { "kind": "phone", "image": "app.png" } (ảnh trên màn hình điện thoại).
            def item_ok(item):
                if isinstance(item, dict): return item.get('kind') in ITEM_KINDS and set(item) <= {'kind', 'image'} | DESK_OPTIONS and (not item.get('image') or item['kind'] == 'phone')
                return item in ITEM_KINDS
            if not isinstance(held, dict) or not held or any(side not in ('L', 'R') or not item_ok(item) for side, item in held.items()):
                fail(f'character "{name}": "holds" must be one of {", ".join(ITEM_KINDS)}, an object such as {{"L": "cup"}}, or {{"R": {{"kind": "phone", "image": "app.png"}}}} — got {js(who.get("holds"))}')
            for item in held.values():
                if isinstance(item, dict) and item.get('image') and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['image'])): fail(f'character "{name}": holds image not found: {item["image"]}')
            if who.get('holdsHidden') not in (None, False, True) and not (isinstance(who['holdsHidden'], list) and who['holdsHidden'] and set(who['holdsHidden']) <= {'L', 'R'}): fail(f'character "{name}": "holdsHidden" must be true, false or a list of hands such as ["L"]')
            who['holds'] = held
        # `wears`: phụ kiện của thú — "cone" (loa chống liếm), "bandage" (băng chân), hay một danh sách.
        if 'wears' in who:
            allowed = WEARABLES if pet else PERSON_WEARABLES
            worn = who['wears'] if isinstance(who['wears'], list) else [who['wears']]
            if not worn or any(item not in allowed for item in worn): fail(f'character "{name}": "wears" must be {" or ".join(allowed)}{" (a pet)" if pet else " (a person)"}, or a list of them — got {js(who["wears"])}')
            who['wears'] = worn
        if pet and who.get('seated') not in (None, False, True): fail(f'character "{name}": a pet has no chair — use "seated": true')
        if who.get('seated') not in (None, False, True, 'chair', 'stool'): fail(f'character "{name}": "seated" must be true, "chair" or "stool"')
        frame = PET if pet else PERSON
        host_height = float(who.get('height', (pet_default if pet else person_default) * (0.74 if stage_set is not None else 1)))
        host_width = host_height * frame[0] / frame[1]
        unit = host_height / frame[1]
        stand = float(who['x'])
        centre = stand
        if who.get('enter') and name in late: fail(f'character "{name}" has "enter" both on the character (enters at the start) and on a turn (enters later) — keep one')
        if late.get(name) not in (None, 'left', 'right'): fail(f'a turn of "{name}" has "enter": {js(late.get(name))} — it must be "left", "right" or true')
        coming = who.get('enter') or late.get(name)
        # Host nằm ngay TẠI chỗ đứng; `enter` nhận quãng đi tính sẵn, đủ để xuất phát ngoài hẳn mép khung: tới mép,
        # cộng 0,39 × chiều cao host cho cái đầu và tóc (thú: 0,6 × — thân nằm ngang, dài hơn). Trước bản 0.29 host
        # được đặt sát mép rồi nối thêm một bước `walk` tới chỗ đứng — hai động tác cho một việc.
        reach = (stand if coming == 'left' else width - stand) + (0.39 if not pet else 0.6) * host_height if coming else 0
        if stage_set is not None and coming:
            # Bối cảnh 3D: bước vào qua TƯỜNG BÊN (gắn một tấm "panel" làm cửa ở đó cho dễ đọc). Xuất phát từ ngoài
            # tường hẳn một nửa bề ngang người; set3d mờ dần nhân vật khi nó còn ở ngoài phòng.
            half = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))['width'] / 2
            reach = (stand + half if coming == 'left' else half - stand) + 0.55 * host_width
        # Số tính ra cất dưới khoá có gạch dưới ở đầu — khoá của người viết kịch bản không bao giờ trùng được.
        names[name] = dict(who, _x0=float(who['x']), _pet=pet, _host_height=host_height, _host_width=host_width, _unit=unit, _left=centre - host_width / 2,
                           _walk=0, _enter_distance=round(reach / unit), _element=f'{slug(name)}', _late=late.get(name), _nearer=nearer)
    for who in names.values():
        if who.get('faces') and who['faces'] not in names: fail(f'character "{who["name"]}" faces "{who["faces"]}", who is not in the scene')

    # ── kịch bản ──
    script = scene.get('script')
    if not isinstance(script, list) or not script: fail('"script" must be a non-empty list of turns')
    # ĐỢT 39 A — QUẦY THU NGÂN: lượt quét QR / quẹt thẻ cần một đế thanh toán (`paystand`: mã QR + máy quẹt thẻ). Bối cảnh 3D chưa có thì tự đặt một cái lên
    # MẶT QUẦY (hộp tên "counter" — cảnh dựng sẵn "reception" / "pharmacy") ở đầu quầy gần người trả tiền nhất, sát mép TRƯỚC (phía khách đứng — khách vẽ ĐÈ lên đế, thấy điện thoại trên mã QR).
    def desk_steps():
        for entry in script:
            for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
                if not isinstance(turn, dict): continue
                for step in (turn.get('do') or []) if isinstance(turn.get('do'), list) else []:
                    name = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
                    if name in DESK_39: yield turn, step, name
    payers = [turn.get('who') for turn, step, name in desk_steps() if name in DESK_PAY]
    if payers and stage_set is not None and payers[0] in names and not any(item.get('kind') == 'paystand' for item in stage_set.get('cutouts', [])):
        counters = [box for box in stage_set.get('boxes', []) if 'counter' in str(box.get('name', ''))]
        if not counters: fail('"payByQR" / "payByCard" need a pay stand on a counter: add a cutout { "kind": "paystand", "x": …, "z": …, "y": <counter height> } to "set", or use "preset": "reception" / "pharmacy" (they have a counter — the stand is added for you)')
        payer = names[payers[0]]
        box = min(counters, key=lambda b: abs(float(b['x']) + float(b['width']) / 2 - float(payer['x'])))
        right = float(payer['x']) >= float(box['x']) + float(box['width']) / 2
        stage_set.setdefault('cutouts', []).append({'kind': 'paystand', 'name': 'paystand', 'x': round(float(box['x']) + float(box['width']) - 70) if right else round(float(box['x']) + 70),
                                                    'z': round(float(box['z']) - 24), 'y': float(box['height'])})
    # AI CÓ CON VẬT NẤP SAU LƯNG (đợt 35, lượt bốn): người ấy nói thì múa tay phía KIA — tay phía con vật vẽ đè lên cái đầu nó đang ló ra.
    hiders = {}
    for entry in script:
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            for step in (turn.get('do') or []) if isinstance(turn, dict) else []:
                if isinstance(step, list) and len(step) > 1 and step[0] == 'hide' and isinstance(step[1], str) and step[1].startswith('@'):
                    hiders[step[1][1:]] = turn.get('who')
    voices = []                                             # { key, file, text }

    # ĐỢT 35 — CÂN, ĐO NHIỆT ĐỘ, CHO UỐNG THUỐC: kiểm tra đối số, rồi viết bước. Cân: tên một cutout "scale" (có "name") — trong
    # bối cảnh 3D thành `set.targetPoint(người, [x, mặt bệ, z])`; số cân lấy từ "reading" của cutout ấy nếu bước không tự cho.
    def care_code(step, where, actor):
        name = step[0]
        if actor not in names or names[actor]['_pet']: fail(f'{where}: "{name}" is done by a person, not a pet')
        if len(step) < 2 or not (isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
            fail(f'{where}: "{name}" needs the pet as its second item, e.g. ["{name}", "@dog"' + (', "scale"]' if name == 'weigh' else ']') + f' — got {js(step)}')
        pet = step[1][1:]
        if name == 'weigh':
            if stage_set is None: fail(f'{where}: "weigh" needs a 3D set ("set") with a "scale" cutout that has a "name"')
            scales = {item.get('name'): item for item in stage_set.get('cutouts', []) if item.get('kind') == 'scale' and item.get('name')}
            if len(step) < 3 or step[2] not in scales:
                fail(f'{where}: "weigh" needs the scale as its third item — the "name" of a set.cutouts item with "kind": "scale" (scales here: {", ".join(scales) or "none"}) — got {js(step)}')
            options = step[3] if len(step) > 3 else {}
            if len(step) > 4 or not isinstance(options, dict) or set(options) - {'reading', 'hold'}: fail(f'{where}: "weigh" takes ["weigh", "@pet", "<scale>", {{ "reading": "4.2 kg", "hold": 1.6 }}] — got {js(step)}')
            if 'reading' in options and not isinstance(options['reading'], str): fail(f'{where}: "weigh" reading is the text on the display, such as "4.2 kg"')
            if 'hold' in options and not (isinstance(options['hold'], (int, float)) and 0.5 <= options['hold'] <= 6): fail(f'{where}: "weigh" hold must be 0.5…6 seconds')
            scale = scales[step[2]]
            if abs(float(scale['z']) - float(names[actor].get('z', -300))) > 60:
                fail(f'{where}: the scale "{step[2]}" stands at z {float(scale["z"]):g}, "{actor}" at z {float(names[actor].get("z", -300)):g} — the pet is set down in the person\'s own plane: give the scale the same z (within 60)')
            tall = float(scale.get('height', round(person_default)))
            reading = options.get('reading', scale.get('reading')) or '4.2 kg'
            extra = {key: value for key, value in (('reading', reading), ('hold', options.get('hold'))) if value is not None}
            point = f"set.targetPoint({actor}, [{float(scale['x']):g}, {float(scale.get('y', 0)) + tall * 17 / 470:.1f}, {float(scale['z']):g}])"
            # MÀN HÌNH CÂN (đợt 35, lượt ba): cái cân dựng với số 0, rig ghi số cân lên nó đúng lúc con vật đứng trên bệ (`display`).
            scale['_weighed'] = reading if not scale.get('_weighed') else scale['_weighed']
            prop = f"cutout{stage_set['cutouts'].index(scale) + 1}Prop"
            return f"['weigh', {pet}, {point}, {{ {', '.join(f'{key}: {js(value)}' for key, value in extra.items())}, display: {prop} }}]"
        if name == 'takeTemp':
            if len(step) > 4 or (len(step) > 2 and not (isinstance(step[2], (int, float)) and 0.5 <= step[2] <= 5)) or (len(step) > 3 and not (isinstance(step[3], dict) and set(step[3]) <= {'reading'} and isinstance(step[3].get('reading', ''), str))):
                fail(f'{where}: "takeTemp" takes ["takeTemp", "@pet", hold (0.5…5 s), {{ "reading": "38.5°C" }}] — got {js(step)}')
        if name == 'givePill' and len(step) > 2: fail(f'{where}: "givePill" takes just the pet: ["givePill", "@pet"] — got {js(step)}')
        if name in CARE_42F:          # đợt 42 F: ["bathPet", "@pet", { "hold": 1.8 }], ["brushTeeth", "@pet", { "hold": 2 }], ["towelDry", "@pet", { "hold": 2.2 }]
            options = step[2] if len(step) > 2 else {}
            lo, hi, d = CARE_38_HOLD[name]
            if len(step) > 3 or not isinstance(options, dict) or set(options) - {'hold'}: fail(f'{where}: "{name}" takes ["{name}", "@pet", {{ "hold": {d:g} }}] — got {js(step)}')
            if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and lo <= options['hold'] <= hi): fail(f'{where}: "{name}" hold must be {lo:g}…{hi:g} seconds — got {js(options["hold"])}')
            if name == 'bathPet' and not names[step[1][1:]].get('inTub'): reach_notes.append(f'{where}: "{step[1][1:]}" is bathed but does not stand in a tub — add "inTub": true to it (a tub sized to it is added)')
        elif name in CARE_38:
            # ĐỢT 38 A: ["clipNails", "@pet", { "hold": 1.8 }], ["eyeDrops", "@pet"], ["cleanEars", "@pet"], ["scanChip", "@pet", { "id": "900 …" }].
            options = step[2] if len(step) > 2 else {}
            lo, hi, _ = CARE_38_HOLD[name]
            usage = {'clipNails': '{ "hold": 1.8 }', 'eyeDrops': '{ "hold": 1.2 }', 'cleanEars': '{ "hold": 1.8 }', 'scanChip': '{ "id": "900 123 456 789", "hold": 1.6 }'}[name]
            if len(step) > 3 or not isinstance(options, dict) or set(options) - CARE_38_OPTIONS[name]: fail(f'{where}: "{name}" takes ["{name}", "@pet", {usage}] — got {js(step)}')
            if 'hold' in options and not (isinstance(options['hold'], (int, float)) and lo <= options['hold'] <= hi): fail(f'{where}: "{name}" hold must be {lo:g}…{hi:g} seconds — got {js(options["hold"])}')
            if 'paw' in options and options['paw'] != 'front': fail(f'{where}: "clipNails" paw must be "front" (the near front paw) — got {js(options["paw"])}')
            if 'id' in options and not (isinstance(options['id'], str) and options['id'].strip() and len(options['id']) <= 24): fail(f'{where}: "scanChip" id is the chip number as text of up to 24 characters, such as "900 123 456 789" — got {js(options["id"])}')
        other = names[pet]
        walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
        at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
        aim = f"set.target({actor}, {pet}, {js('rear' if name == 'takeTemp' else 'lips')}{at})" if stage_set is not None else pet
        if name in CARE_38 and stage_set is not None: aim = f"set.target({actor}, {pet}, 'head'{at})"      # đợt 38 A: giữa mặt con vật — rig đo các chỗ khác trên hình nó
        return '[' + ', '.join([js(name), aim] + [js(item) for item in step[2:]]) + ']'

    def showxray_listener(actor):
        """Người nghe của `showXray` (đợt 35): người (không phải con vật) gần `actor` nhất theo x, hay người `actor` "faces"."""
        me = names.get(actor) or {}
        if me.get('faces') in names and not names[me['faces']]['_pet']: return me['faces']
        others = [w for w in names.values() if w['name'] != actor and not w['_pet']]
        return min(others, key=lambda w: abs(float(w.get('x', 0)) - float(me.get('x', 0))))['name'] if others else None

    # ĐỢT 39 A — QUẦY THU NGÂN & QUẦY CÀ PHÊ: kiểm tra đối số, viết bước. Quét QR / quẹt thẻ: đích là mã QR / máy quẹt thẻ của đế `paystand` (bối cảnh 3D: cutout
    # — `set.targetPoint`; cảnh 2D: đạo cụ "paystand" trong "props"); lau quầy: một điểm trên mặt quầy gần người lau; rót nước, đóng dấu: không cần đích.
    def desk_holds(actor, kind):
        holds = names[actor].get('holds')
        # Món đồ đang CẤT cũng được (xấp tiền, thẻ tích điểm…): rig tự lấy ra lúc làm (`#heldWith`) và cất lại sau — như `readChart`.
        return any((item if isinstance(item, str) else (item or {}).get('kind')) == kind for item in (holds.values() if isinstance(holds, dict) else [holds]))

    def desk_stand(who, label):
        """(x trong phòng, mã bộ phận, hàm điểm) của đế thanh toán gần người `who` nhất; None nếu không có."""
        if stage_set is not None:
            stands = [(n, c) for n, c in enumerate(stage_set.get('cutouts', [])) if c.get('kind') == 'paystand' and (label is None or c.get('name') == label)]
            if not stands: return None
            n, c = min(stands, key=lambda it: abs(float(it[1]['x']) - float(who['x'])))
            unit = float(c.get('height', round(person_default * 0.74))) / 470
            return float(c['x']), lambda part: f"set.targetPoint({who['name']}, [{float(c['x']):g} + (cutout{n + 1}Prop.{part}.x - 200) * {unit:.5f}, {float(c.get('y', 0)):g} + (458 - cutout{n + 1}Prop.{part}.y) * {unit:.5f}, {float(c['z']):g}])"
        stands = [prop for prop in scene.get('props', []) if isinstance(prop, dict) and prop.get('kind') == 'paystand' and (label is None or prop.get('name') == label) and 'x' in prop]
        if not stands: return None
        prop = min(stands, key=lambda it: abs(float(it['x']) - float(who['x'])))
        top = 458 - float(prop.get('tabletop', 150)); unit_prop = float(prop.get('height', person_default)) / 470
        at = {'qr': (175, top - 33), 'reader': (226, top - 47)}
        return float(prop['x']), lambda part: f"{{ x: {200 + (float(prop['x']) + (at[part][0] - 200) * unit_prop - float(who['x'])) / who['_unit']:.1f}, y: {at[part][1]:.1f} }}"

    def desk_counter(who):
        """Hộp quầy (3D) / đạo cụ quầy (2D) gần người `who` nhất: điểm trên MẶT quầy, phía người ấy đứng; None nếu không có."""
        if stage_set is not None:
            boxes = [box for box in stage_set.get('boxes', []) if 'counter' in str(box.get('name', ''))]
            if not boxes: return None
            box = min(boxes, key=lambda b: max(0, float(b['x']) - float(who['x']), float(who['x']) - float(b['x']) - float(b['width'])))
            x = min(max(float(who['x']), float(box['x']) + 40), float(box['x']) + float(box['width']) - 40)
            behind = float(who.get('z', -300)) < float(box['z']) - float(box['depth']) / 2
            z = float(box['z']) - float(box['depth']) + 34 if behind else float(box['z']) - 34
            return x, (box, f"set.targetPoint({who['name']}, [{x:g}, {float(box['height']):g}, {z:g}])")
        counters = [prop for prop in scene.get('props', []) if isinstance(prop, dict) and prop.get('kind') == 'counter' and 'x' in prop]
        if not counters: return None
        prop = min(counters, key=lambda it: abs(float(it['x']) - float(who['x'])))
        x = float(prop['x'])
        return x, (prop, f"{{ x: {200 + (min(max(float(who['x']), x - float(prop.get('width', 300)) / 2 + 30), x + float(prop.get('width', 300)) / 2 - 30) - float(who['x'])) / who['_unit']:.1f}, y: {458 - float(prop.get('tabletop', 150)):.1f} }}")

    def desk_code(step, name, where, actor):
        who = names[actor]
        if who['_pet']: fail(f'{where}: "{name}" is done by a person, not a pet')
        args = list(step[1:]) if isinstance(step, list) else []
        need = DESK_ITEM.get(name)
        if need and not desk_holds(actor, need):
            fail(f'{where}: "{name}" needs {DESK_NOUN[need]} in hand — give "{actor}" "holds": {js(need)} (script lines get it for you)')
        hold = args.pop() if args and isinstance(args[-1], (int, float)) and not isinstance(args[-1], bool) else None
        label = args.pop(0) if args and isinstance(args[0], str) and not args[0].startswith('@') else None
        if args: fail(f'{where}: "{name}" takes ' + {'payByQR': '["payByQR", "<paystand name>", seconds]', 'payByCard': '["payByCard", "<paystand name>", seconds]', 'wipeCounter': '["wipeCounter", seconds]'}.get(name, f'just "{name}"') + f' — got {js(step)}')
        if hold is not None and not (name in DESK_PAY + ('wipeCounter',) and 0.5 <= hold <= 12): fail(f'{where}: "{name}" seconds must be 0.5…12 (quét / lau only) — got {js(step)}')
        if name in ('pourDrink', 'stampCard', 'giveChange'):
            counter = desk_counter(who)
            return js(name) if not counter else f"['pourDrink', {{ top: {counter[1][1]} }}]" if name == 'pourDrink' else f"['stampCard', null, {{ top: {counter[1][1]} }}]"
        if name in DESK_PAY:
            found = desk_stand(who, label)
            if found is None: fail(f'{where}: "{name}" needs a pay stand — a set.cutouts item {{ "kind": "paystand", "x": …, "z": …, "y": <counter height> }} (3D), or a props item {{ "kind": "paystand", "x": … }} (2D)' + (f' named "{label}"' if label else ''))
            return '[' + ', '.join([js(name), found[1]('qr' if name == 'payByQR' else 'reader')] + ([js(hold)] if hold is not None else [])) + ']'
        counter = desk_counter(who)
        return '[' + ', '.join(["'wipeCounter'", js(hold if hold is not None else 2)] + ([counter[1][1]] if counter else [])) + ']'

    def step_code(step, where, actor=None):
        if isinstance(step, (int, float)): return js(step)
        # NHÌN THEO (đợt 36): "look" là tên gọn của "lookAt" — ["look", "@cho"], ["lookAt", "@be", { "hold": 1.5 }], ["look", null].
        if step == 'look': step = 'lookAt'
        if isinstance(step, list) and step and step[0] == 'look': step = ['lookAt'] + step[1:]
        # GIỮ CON VẬT (đợt 38 B): con vật phải có trong cảnh; bối cảnh 3D — đích giữa thân, kèm đầu nó (`head`) để biết người đứng phía
        # đầu hay phía đuôi.
        if isinstance(step, list) and step and step[0] == RESTRAIN and actor in names:
            if names[actor]['_pet']: fail(f'{where}: "restrain" is done by a person (a nurse, the vet) — a pet cannot restrain')
            pet = step[1][1:] if len(step) > 1 and isinstance(step[1], str) else ''
            if pet not in names or not names[pet]['_pet']: fail(f'{where}: "restrain" needs a pet of the scene: ["restrain", "@<pet name>"] — got {js(step)}')
            if stage_set is None: return '[' + ', '.join([js(RESTRAIN), pet] + [js(item) for item in step[2:]]) + ']'
            other = names[pet]
            walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
            at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
            # ĐẦU CON VẬT QUAY VỀ ĐÂU lúc giữ (lúc dựng, hình nó có thể còn ở hướng cũ — vừa quay đuôi cho người đo nhiệt độ): đo nhiệt
            # độ → đầu quay ra xa người đo; không thì về phía người nó "faces".
            partner, kind = RESTRAIN_PAIRS.get(id(step), (None, None))
            pet_x = float(other['x']) + other.get('_drop', 0)
            if partner in names and kind == 'takeTemp': toward = 1 if pet_x >= float(names[partner]['x']) else -1
            elif other.get('faces') in names: toward = 1 if float(names[other['faces']]['x']) >= pet_x else -1
            else: toward = 0
            side = f", headSide: {toward}" if toward else ''
            return f"['restrain', set.target({actor}, {pet}, 'body'{at}), {js(step[2] if len(step) > 2 else 3)}, {{ head: set.target({actor}, {pet}, 'head'{at}){side} }}]"
        if isinstance(step, list) and step and step[0] == 'lookAt':
            if len(step) > 1 and not (step[1] is None or step[1] in ('front', 'L', 'R') or (isinstance(step[1], str) and step[1].startswith('@')) or (isinstance(step[1], dict) and set(step[1]) <= {'x', 'y'} and all(isinstance(step[1].get(k), (int, float)) for k in ('x', 'y')))):
                fail(f'{where}: ["lookAt", target] — target is "@<name>", {{ "x": …, "y": … }} in the 400 × 470 frame, "L" / "R" (own hand), "front" or null; got {js(step[1])}')
            if len(step) > 2 and not (isinstance(step[2], dict) and set(step[2]) <= {'head', 'eyes', 'dur', 'hold'}): fail(f'{where}: ["lookAt", target, {{ "hold": seconds, "head": 0…1, "eyes": 0…1, "dur": seconds }}] — got {js(step[2])}')
        # ĐỌC BỆNH ÁN (đợt 36): xong thì ngẩng lên nhìn NGƯỜI NGHE (người gần nhất / người mình "faces") — bối cảnh 3D nhắm đầu họ trong phòng.
        if (step == 'readChart' or (isinstance(step, list) and step and step[0] == 'readChart' and len(step) < 3)) and actor in names and not names[actor]['_pet']:
            listener = showxray_listener(actor)
            if listener:
                hold = step[1] if isinstance(step, list) and len(step) > 1 else 2
                if not (isinstance(hold, (int, float)) and hold > 0): fail(f'{where}: ["readChart", seconds] — seconds is a number > 0, got {js(hold)}')
                if not any((item if isinstance(item, str) else (item or {}).get('kind')) == 'clipboard' for item in (names[actor].get('holds') or {}).values()):
                    fail(f'{where}: "readChart" needs a clipboard in hand — give "{actor}" "holds": "clipboard" (or "holdsHidden": true to keep it put away until then)')
                gaze = f", gaze: set.target({actor}, {listener}, 'head')" if stage_set is not None else ''
                return f"['readChart', {js(hold)}, {{ to: {listener}{gaze} }}]"
        # ĐỢT 39 C — NGƯỜI DẪN: kiểm tra đối số ngay ở đây; khung DỌC: bảng hẹp / khe hẹp (`{ narrow: true }`, như reo); chụp ảnh tự sướng
        # cần điện thoại trong tay (đang cất cũng được) và nhận `{ "with": "@người / con vật" }`.
        talk = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
        if talk in TALK_39 and actor in names:
            if names[actor]['_pet']: fail(f'{where}: "{talk}" is done by a person — a pet cannot {talk}')
            args = list(step[1:]) if isinstance(step, list) else []
            if talk == 'holdSign':
                if not args or not (isinstance(args[0], str) and args[0].strip() or isinstance(args[0], list) and 1 <= len(args[0]) <= 3 and all(isinstance(line, str) and line.strip() for line in args[0])):
                    fail(f'{where}: "holdSign" needs the text of the sign: ["holdSign", "Giảm 20%", seconds, {{ "color": "#2f9e8f" }}] — 1–3 short lines (a list of strings, or "line 1|line 2"); got {js(step)}')
                if len(args) > 1 and not (isinstance(args[1], (int, float)) and args[1] > 0): fail(f'{where}: ["holdSign", text, seconds] — seconds is a number > 0, got {js(args[1])}')
                if len(args) > 2 and not (isinstance(args[2], dict) and set(args[2]) <= {'color', 'narrow'}): fail(f'{where}: ["holdSign", text, seconds, {{ "color": "#hex" }}] — got {js(args[2])}')
            if talk == 'showSize':
                if args and not (args[0] in SIZE_39 or (isinstance(args[0], (int, float)) and not isinstance(args[0], bool) and args[0] > 0)): fail(f'{where}: ["showSize", size] — size is "small", "medium", "big" or a number > 0, got {js(args[0])}')
                if len(args) > 1 and not (isinstance(args[1], (int, float)) and args[1] > 0): fail(f'{where}: ["showSize", size, seconds] — seconds is a number > 0, got {js(args[1])}')
            if talk == 'yawnStretch' and args and not (isinstance(args[0], (int, float)) and args[0] > 0): fail(f'{where}: ["yawnStretch", seconds] — seconds is a number > 0, got {js(args[0])}')
            if talk == 'takeSelfie':
                if not any((item if isinstance(item, str) else (item or {}).get('kind')) == 'phone' for item in (names[actor].get('holds') or {'R': names[actor].get('holds')}).values()):
                    fail(f'{where}: "takeSelfie" needs a phone — give "{actor}" "holds": "phone" (or "holdsHidden": true to keep it put away until then)')
                if args and not (isinstance(args[0], (int, float)) and args[0] > 0): fail(f'{where}: ["takeSelfie", seconds, {{ "with": "@name" }}] — seconds is a number > 0, got {js(args[0])}')
                if len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'with'} and isinstance(args[1].get('with'), str) and args[1]['with'].startswith('@') and args[1]['with'][1:] in names and args[1]['with'][1:] != actor):
                    fail(f'{where}: ["takeSelfie", seconds, {{ "with": "@<another character or pet of the scene>" }}] — got {js(step)}')
            narrow = height > width * 1.2 and talk in ('holdSign', 'showSize')
            if talk == 'takeSelfie' and len(args) > 1:
                return f"['takeSelfie', {js(args[0])}, {{ with: {args[1]['with'][1:]} }}]"
            if narrow:
                args = args + [None] * (3 - len(args)) if talk == 'holdSign' else args + [None] * (2 - len(args))
                defaults = {'holdSign': [None, 2, {}], 'showSize': ['medium', 1.4]}[talk]
                args = [d if a is None else a for a, d in zip(args, defaults)]
                if isinstance(args[-1], dict) or talk == 'holdSign': args[-1] = {**(args[-1] if isinstance(args[-1], dict) else {}), 'narrow': True}
                else: args.append({'narrow': True})
                return '[' + ', '.join([js(talk)] + [js(a) for a in args]) + ']'
        # REO trong KHUNG DỌC (đợt 34): chữ V dang rộng cần ~1,02 × bề rộng góc toàn — không góc trung nào giữ được cả hai tay,
        # máy phải cắt sang góc toàn giữa chuỗi góc trung. Người (không phải con vật) reo ở khung dọc thì reo hẹp
        # (`cheer({ narrow: true })`: nắm tay giơ cạnh vai). Người viết tự cho tham số thì giữ của họ.
        # ĐỢT 42 D — chạy / nhảy lên / nhảy múa: kiểm tra đối số ngay ở đây (lỗi rõ ràng thay cho lỗi của trình duyệt lúc dựng).
        motion = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
        if motion in ('run', 'dance') and actor in names and names[actor]['_pet']: fail(f'{where}: "{motion}" is a person\'s action — for a pet use "walk", "jump" or "play"')
        if motion in MOTION_42D and actor in names and not names[actor]['_pet']:          # "jump" của thú là động tác của rig thú
            args = list(step[1:]) if isinstance(step, list) else []
            num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
            if motion == 'run' and (len(args) > 2 or (args and not num(args[0])) or (len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'speed', 'steps'}))):
                fail(f'{where}: ["run", distance, {{ "speed": 0.5…2, "steps": n }}] — distance in frame units (negative = to the left), or ["run", "@<name>"] to run up to someone; got {js(step)}')
            if motion == 'jump' and (len(args) > 2 or (args and not (isinstance(args[0], int) and not isinstance(args[0], bool) and 1 <= args[0] <= 6)) or (len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'height'}))):
                fail(f'{where}: ["jump", times 1…6, {{ "height": 0.3…2 }}] — got {js(step)}')
            if motion == 'dance' and (len(args) > 3 or (args and args[0] not in ('happy', 'gentle')) or (len(args) > 1 and not (isinstance(args[1], int) and not isinstance(args[1], bool) and 1 <= args[1] <= 8))
                                      or (len(args) > 2 and not (isinstance(args[2], dict) and set(args[2]) <= {'bpm'}))):
                fail(f'{where}: ["dance", "happy" | "gentle", bars 1…8, {{ "bpm": 60…180 }}] — got {js(step)}')
        if step in ('cheer', ['cheer']) and height > width * 1.2 and actor in names and not names[actor]['_pet']: return "['cheer', { narrow: true }]"
        # ĐỢT 35 — dụng cụ & hồ sơ: kiểm tra đối số ngay ở đây (lỗi rõ ràng thay cho lỗi của trình duyệt lúc dựng).
        care = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
        if care in CARE_ACTIONS + CHART_ACTIONS and actor in names:
            if names[actor]['_pet']: fail(f'{where}: "{care}" is done by a person (the vet) — a pet cannot {care}')
            if care in CARE_ACTIONS and not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
                fail(f'{where}: "{care}" needs the pet: ["{care}", "@<pet name>"] — got {js(step)}')
            if care == 'bandage' and len(step) > 2 and not (isinstance(step[2], (int, float)) and step[2] >= 1): fail(f'{where}: ["bandage", "@pet", wraps] — wraps is a number ≥ 1, got {js(step[2])}')
            if care == 'readChart':
                if not any((item if isinstance(item, str) else (item or {}).get('kind')) == 'clipboard' for item in (names[actor].get('holds') or {}).values()):
                    fail(f'{where}: "readChart" needs a clipboard in hand — give "{actor}" "holds": "clipboard" (or "holdsHidden": true to keep it put away until then)')
                if isinstance(step, list) and len(step) > 1 and not (isinstance(step[1], (int, float)) and step[1] > 0): fail(f'{where}: ["readChart", seconds] — seconds is a number > 0, got {js(step[1])}')
            if care == 'showXray' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str):
                if stage_set is None: fail(f'{where}: ["showXray", "{step[1]}"] names an "xray" cutout of a 3D set — in a 2D scene give a point in the frame: ["showXray", {{"x": 380, "y": 150}}]')
                cutouts = stage_set.get('cutouts', [])
                index = next((n for n, item in enumerate(cutouts) if item.get('name') == step[1]), None)
                if index is None: fail(f'{where}: ["showXray", "{step[1]}"] — no set.cutouts entry has "name": "{step[1]}" (add {{ "kind": "xray", "name": "{step[1]}", "x": …, "z": … }} beside the person)')
                viewer = cutouts[index]
                if viewer.get('kind') != 'xray': fail(f'{where}: ["showXray", "{step[1]}"] — "{step[1]}" is a "{viewer.get("kind") or "picture"}" cutout; it must be an "xray" viewer')
                if len(step) > 2 and not (isinstance(step[2], (int, float)) and step[2] > 0): fail(f'{where}: ["showXray", "{step[1]}", seconds] — seconds is a number > 0, got {js(step[2])}')
                # Điểm chỉ trên phim (`prop.spot`, khung 400 × 470 của đạo cụ, sàn khung ở 458) đổi ra toạ độ phòng; tay vươn trong mặt
                # phẳng của người — đặt đèn đọc phim cùng chiều sâu (z) với người chỉ.
                unit = float(viewer.get('height', round(person_default * 0.74))) / 470
                if abs(float(viewer['z']) - float(names[actor].get('z', -300))) > 120: reach_notes.append(f'{where}: "{actor}" points at the X-ray viewer "{step[1]}", which stands {abs(float(viewer["z"]) - float(names[actor].get("z", -300))):g} units nearer or further — the hand points in its own plane: give it about the same z')
                spot = f"set.targetPoint({actor}, [{float(viewer['x']):g} + (cutout{index + 1}Prop.spot.x - 200) * {unit:.5f}, {float(viewer.get('y', 0)):g} + (458 - cutout{index + 1}Prop.spot.y) * {unit:.5f}, {float(viewer['z']):g}])"
                # NGƯỜI NGHE (đợt 35, lượt hai): chỉ xong thì quay về phía người khác gần nhất trong cảnh, không quay ra máy quay
                # (Gemini: "xong quay ra nhìn máy quay thay vì quay về phía bà"). Người viết tự cho { "to": … } thì giữ của họ.
                listener = showxray_listener(actor)
                extra = [js(item) for item in step[2:3]] or (['1.6'] if listener else [])
                if listener and not (len(step) > 3 and isinstance(step[3], dict) and 'to' in step[3]): extra.append(f"{{ to: {listener}, gaze: set.target({actor}, {listener}, 'head') }}")
                elif len(step) > 3: extra.append(js(step[3]).replace('"@', '').replace('"', '') if isinstance(step[3], dict) and str(step[3].get('to', '')).startswith('@') else js(step[3]))
                return '[' + ', '.join(["'showXray'", spot] + extra) + ']'
        # ĐỢT 39 A — quầy thu ngân: bước một mình (quét QR, quẹt thẻ, rót nước, đóng dấu, lau quầy); thối tiền / đóng dấu với đích là người kia: người đưa phải cầm đồ.
        desk = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
        if desk in DESK_39 and actor in names and not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')): return desk_code(step, desk, where, actor)
        if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and not desk_holds(actor, DESK_ITEM[desk]):
            fail(f'{where}: "{desk}" needs {"banknotes" if desk == "giveChange" else "a stamp card"} in hand — give "{actor}" "holds": {js(DESK_ITEM[desk])}')
        if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']:
            fail(f'{where}: "{desk}" needs the other person: ["{desk}", "@<person name>"] — a pet cannot take {"banknotes" if desk == "giveChange" else "a card"}; got {js(step)}')
        if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and len(step) == 2 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and not names[step[1][1:]]['_pet']:
            got, hidden = names[step[1][1:]].get('holds'), names[step[1][1:]].get('holdsHidden')
            if not any((item if isinstance(item, str) else (item or {}).get('kind')) == DESK_ITEM[desk] and (hidden is True or (isinstance(hidden, list) and side in hidden)) for side, item in (got.items() if isinstance(got, dict) else [('R', got)])):
                fail(f'{where}: "{step[1][1:]}" has no free hand to receive the {"banknotes" if desk == "giveChange" else "stamp card"} from "{actor}" (two hands: they already hold other things) — give them "holds": {{"L": {js(DESK_ITEM[desk])}}} with "holdsHidden": ["L"], or let them put the other item away first')
        if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and len(step) == 2 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and desk_counter(names[actor]):
            return f"[{js(desk)}, {step[1][1:]}, {{ top: {desk_counter(names[actor])[1][1]} }}]"      # mặt quầy: tay và đồ vật nằm trên quầy, không khuất sau nó
        # HAI NGƯỜI (đợt 38 C): đích là một NGƯỜI khác ("@tên"); đưa túi thuốc cần túi trong tay, nhận túi cần túi đang cất.
        if care in tuple(PAIR_38) + PAIR_PARTS and actor in names and step != 'stampCard':
            if names[actor]['_pet']: fail(f'{where}: "{care}" is done by a person — a pet cannot {care}')
            if not (isinstance(step, list) and len(step) == 2 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and not names[step[1][1:]]['_pet'] and step[1][1:] != actor):
                fail(f'{where}: "{care}" needs the other person: ["{care}", "@<person name>"] — got {js(step)}')
            holds = names[actor].get('holds')
            held = [item if isinstance(item, str) else (item or {}).get('kind') for item in holds.values()] if isinstance(holds, dict) else [holds]
            # Đợt 43 B: túi đang cầm, món kia cất (`"holdsHidden": ["L"]` — phát thuốc: bìa đơn thuốc cất ở tay trái) cũng được.
            hidden = names[actor].get('holdsHidden')
            bag_hands = [k for k, item in holds.items() if (item if isinstance(item, str) else (item or {}).get('kind')) == 'bag'] if isinstance(holds, dict) else ['R']
            if care == 'handOverBag' and ('bag' not in held or hidden is True or (isinstance(hidden, list) and all(k in hidden for k in bag_hands))):
                fail(f'{where}: "handOverBag" needs a medicine bag in hand — give "{actor}" "holds": "bag" (shown, not "holdsHidden")')
            if care == 'takeBag' and ('bag' not in held or not names[actor].get('holdsHidden')):
                fail(f'{where}: "takeBag" needs a put-away medicine bag — give "{actor}" "holds": "bag" and "holdsHidden": true (["handOverBag", "@{actor}"] alone in a turn does it for you)')
        # ĐỢT 42 E — SÁT SÀN: kiểm tra đối số; nằm SOFA trong bối cảnh 3D: mặt nằm cao đúng bằng mặt hộp dưới người (`lift`, đơn vị khung).
        floor = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
        if floor in FLOOR_42E and actor in names:
            code = floor_step_42e(step, where, names[actor], stage_set, fail)
            if code: return code
        if isinstance(step, str): return js(step)
        if not isinstance(step, list) or not step or not isinstance(step[0], str): fail(f'{where}: a step is "name", ["name", args…] or a number — got {js(step)}')
        if step[0] in CARE_35: return care_code(step, where, actor)
        parts = []
        for item in step:
            if isinstance(item, str) and item.startswith('@'):
                if item[1:] not in names: fail(f'{where}: "{item}" refers to a character that is not in the scene')
                # Bối cảnh 3D: chỉ tay / vuốt ve nhắm theo vị trí TRONG PHÒNG (set.target), không theo màn hình lúc dựng —
                # máy quay còn đổi góc sau đó.
                # Đích ĐÃ ĐI khỏi chỗ đầu cảnh (con chó đi tới ông ngồi ghế đá): lúc dựng, trạng thái của nó còn ở chỗ cũ — báo cho
                # set.target chỗ nó đứng ở lượt này, tính bằng đơn vị khung của nó (đợt 29: tay ông chìa ra chỗ con chó lúc đầu).
                other = names[item[1:]]
                walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
                at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
                if stage_set is not None and actor and step[0] == 'shine': parts.append(f"set.aimAt({actor}, {item[1:]})")
                elif stage_set is not None and actor and step[0] == 'stroke' and other.get('_front') is not None and other['_front'] is names.get(actor): parts.append(f"set.target({actor}, {item[1:]}, 'crown'{at})")
                elif stage_set is not None and actor and step[0] == 'stroke' and other.get('_back') is not None and other['_back'] is names.get(actor): parts.append(f"set.target({actor}, {item[1:]}, 'top'{at})")
                elif stage_set is not None and actor and step[0] == 'offerHand': parts.append(f"set.target({actor}, {item[1:]}, 'tongue'{at})")
                elif stage_set is not None and actor and step[0] in ('point', 'stroke', 'examine', 'giveTreat', 'putCone', 'lookAt'): parts.append(f"set.target({actor}, {item[1:]}" + (f", 'head'{at})" if at else ")"))
                elif stage_set is not None and actor and step[0] == 'bandage': parts.append(f"set.target({actor}, {item[1:]}, 'leg'{at})")
                elif stage_set is not None and actor and step[0] == 'takeTemp': parts.append(f"set.target({actor}, {item[1:]}, 'rear'{at})")
                elif stage_set is not None and actor and step[0] == 'givePill': parts.append(f"set.target({actor}, {item[1:]}" + (f", 'head'{at})" if at else ")"))
                elif stage_set is not None and actor and step[0] in ('listen', 'inject', 'brush', 'hide'): parts.append(f"set.target({actor}, {item[1:]}, 'body'{at})")
                else: parts.append(item[1:])
            else:
                parts.append(js(item))
        return '[' + ', '.join(parts) + ']'

    def turn_code(turn, where):
        if isinstance(turn, dict) and turn.get('who') in narrators_42a: names_42a = narrators_42a
        else: names_42a = names
        if not isinstance(turn, dict) or turn.get('who') not in names_42a: fail(f'{where}: "who" must name a character in the scene (got {js(turn.get("who") if isinstance(turn, dict) else turn)})')
        known(where, turn, TURN_KEYS)
        who = names_42a[turn['who']]
        steps = []
        # `mood`: lượt CÓ lời thì cả câu được nói bằng nét mặt ấy; lượt không lời thì là một nhịp nét mặt
        # trước các động tác của lượt.
        # Thứ tự trong MỘT lượt: enter → (mood, nếu không có lời) → say → do → exit.
        if 'enter' in turn:
            if turn['enter'] is True: turn['enter'] = who['_nearer']
            if who['_late'] != turn['enter'] or getattr(turn_code, 'entered', set()) & {who['name']}: fail(f'{where}: "{who["name"]}" can enter only once per scene')
            turn_code.entered = getattr(turn_code, 'entered', set()) | {who['name']}
            steps.append(f"['enter', {js(turn['enter'])}, {who['_enter_distance']}]")
            if who.get('faces'): steps.append(f"['face', {who['faces']}]")
        if turn.get('exit') not in (None, False, True, 'left', 'right'): fail(f'{where}: "exit" must be "left", "right" or true (the nearer edge)')
        if turn.get('exit') is True: turn['exit'] = who['_nearer']
        mood = turn.get('mood')
        if 'mood' in turn:
            if who['_pet']:
                # Thú cưng: nét mặt của con vật (tai, mắt, đuôi). Lượt có động tác thì GIỮ nét mặt suốt các động tác ấy
                # (`mood`, thôi giữ ở cuối lượt); lượt chỉ có mood thì là một nhịp biểu cảm.
                if mood not in PET_MOODS: fail(f'{where}: "mood" of a pet must be one of {", ".join(PET_MOODS)} — got {js(mood)}')
                if not turn.get('do'): steps.append(f"['express', {js(mood)}, 1.4" + ("]" if marks_on else ", { mark: false }]"))
                else:
                    # Nét mặt GIỮ qua các động tác; dấu cảm xúc của nét mặt ấy cũng giữ suốt lượt (trừ khi lượt tự cho "mark")
                    # — cùng một bước với `mood`, không thêm thời gian.
                    held_mark = PET_MOOD_MARKS.get(mood) if marks_on and 'mark' not in turn else None
                    steps.append(f"['mood', {js(mood)}" + (f", {{ mark: {js(held_mark)} }}]" if held_mark else "]"))
            else:
                if mood not in MOODS: fail(f'{where}: "mood" must be one of {", ".join(MOODS)} — got {js(mood)}')
                if 'say' not in turn: steps.append(f"['express', {js(mood)}, 0.9]")
        # Tuỳ chọn của bước NÓI: nét mặt giữ suốt câu, và — ở bố cục người dẫn khung ngang — tay diễn là tay phía BẢNG
        # NỘI DUNG (bảng nằm bên kia khung hình so với người dẫn). Không thì người dẫn mở tay ra ngoài, quay lưng với nội dung.
        options = []
        if mood and 'say' in turn: options.append(f'mood: {js(mood)}')
        if scene.get('layout') == 'presenter' and width >= height and not who['_pet']: options.append(f"hand: {js('L' if float(who['x']) > width / 2 else 'R')}")
        elif not who['_pet'] and who['name'] in hiders and hiders[who['name']] in names:
            pet = names[hiders[who['name']]]
            options.append(f"hand: {js('L' if float(pet['_x0']) > float(who['x']) else 'R')}")
        spoken_mood = (', { ' + ', '.join(options) + ' }') if options and 'say' in turn else ''
        # `"phone": true` — câu nói của lượt này nói QUA ĐIỆN THOẠI: nhấc máy áp lên má trước, đặt xuống sau lượt.
        phone = turn.get('phone')
        if phone not in (None, False, True): fail(f'{where}: "phone" must be true or false')
        if phone:
            if who['_pet']: fail(f'{where}: a pet cannot talk on the phone')
            if 'say' not in turn: fail(f'{where}: "phone": true needs a "say" line (for listening use "do": [["call", null, 2]])')
            if not any((item if isinstance(item, str) else item.get('kind')) == 'phone' for item in (who.get('holds') or {}).values()):
                fail(f'{where}: "phone": true needs "{who["name"]}" to hold a phone — "holds": "phone"')
            steps.append("['phoneUp']")
        if 'say' in turn:
            if who['_pet']: fail(f'{where}: "{who["name"]}" is a pet and cannot "say" — use "do": ["bark"]')
            words = str(turn['say']).strip()
            # Giọng đọc: lượt (hoặc nhân vật) khai `voice` mà chưa có tệp tiếng thì tạo tệp bằng voice-tts — một lần.
            voice = turn.get('voice', who.get('voice'))
            if voice is not None and voice is not False and not isinstance(voice, str): fail(f'{where}: "voice" must be a voice name (see `voice-tts voices`) or false')
            if voice and not turn.get('audio'):
                turn = dict(turn, audio=speak_line(base, who['name'], voice, words, where))
            if turn.get('audio'):
                source = os.path.join(base, turn['audio'])
                if not os.path.isfile(source): fail(f'{where}: audio file not found: {turn["audio"]} (looked in {base})')
                key = slug(os.path.splitext(os.path.basename(turn['audio']))[0]).replace('-', '_')
                if any(voice['key'] == key for voice in voices): key = f'{key}_{len(voices) + 1}'      # cùng một tệp dùng hai lần
                voices.append({'key': key, 'file': os.path.basename(turn['audio']), 'source': source, 'text': words, 'who': who['name']})
                steps.append(f"['speakCues', window.VOICE_CUES[{js(key)}]" + (f', null{spoken_mood}' if spoken_mood else '') + ']')
            else:
                seconds = float(turn.get('dur') or round(0.6 + 0.36 * len(words.split()), 1))
                steps.append(f"['explain', {js(words)}, {seconds}{spoken_mood}]")
        if phone:
            # Phụ đề ở lại tối thiểu 0,5 s + 0,3 s mỗi từ (+0,3 s giữ chữ) — câu ngắn mà nhiều chữ thì chữ còn trên màn hình
            # sau khi tiếng đã dứt. Giữ máy trên má cho tới lúc ấy: đặt máy xuống mà phụ đề vẫn chạy là lệch hình với lời.
            if not turn.get('audio'):
                seconds = float(turn.get('dur') or round(0.6 + 0.36 * len(str(turn['say']).split()), 1))
                linger = 0.5 + 0.3 * len(str(turn['say']).split()) + 0.3 - (seconds + 0.55)
                if linger > 0.05: steps.append(f"{linger:.2f}")
            steps.append("['phoneDown']")
        # Lượt KHÔNG LỜI có máy quay LIA tới (không cắt): động tác tay đợi máy dừng rồi mới bắt đầu. Bắt đầu cùng lúc thì
        # người diễn còn nằm ở mép khung khi động tác đang diễn (bản thử quầy lễ tân: bà cụ bấm điện thoại bị cắt nửa người).
        view = turn.get('view')
        if stage_set is not None and turn.get('do') and 'say' not in turn and isinstance(view, dict) and 'on' not in view and not view.get('cut') and not view.get('wide'):
            steps.append(f"{float(view.get('dur', 1.5)):g}")
        for step in turn.get('do', []):
            steps.append(step_code(step, where, who['name']))
        if who['_pet'] and mood and turn.get('do'): steps.append("['mood', null]")
        if 'mark' in turn:
            # DẤU CẢM XÚC trên đầu suốt lượt: bật lên trước lời / động tác, tắt ở cuối lượt. Lượt chỉ có dấu: giữ 1,4 s.
            if turn['mark'] not in MARKS: fail(f'{where}: "mark" must be one of {", ".join(MARKS)} — got {js(turn["mark"])}')
            steps.insert(1 if 'enter' in turn else 0, f"['mark', {js(turn['mark'])}]")
            if len(steps) == 1: steps.append('1.4')
            steps.append("['mark', null]")
        if turn.get('exit'):
            # Quãng đi ra tính sẵn như `enter`: tới mép khung cộng phần đầu / thân, để nhân vật khuất hẳn rồi mới ẩn.
            leaving = (float(who['x']) if turn['exit'] == 'left' else width - float(who['x'])) + (0.39 if not who['_pet'] else 0.6) * who['_host_height']
            if stage_set is not None:
                half = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))['width'] / 2
                leaving = (float(who['x']) + half if turn['exit'] == 'left' else half - float(who['x'])) + 0.55 * who['_host_width']
            steps.append(f"['exit', {js(turn['exit'])}, {round(leaving / who['_unit'])}]")
        if not steps and ('power' in turn or 'sky' in turn):
            steps.append("['idle', 1.2]")                   # mất điện / trời chuyển: một nhịp đứng yên cho thấy căn phòng đổi sáng
        if not steps and 'lamp' in turn:
            # Lượt chỉ bật / tắt đèn: NGƯỜI với tay tới công tắc trên thân cây đèn (đèn sáng đúng lúc tay tới — xem lamp_ops);
            # thú thì một nhịp đứng yên.
            lamp_name = turn['lamp'].get('name') if isinstance(turn['lamp'], dict) else None
            steps.append("['idle', 0.9]" if who['_pet'] else f"['point', set.targetPoint({who['name']}, set.lampPoint({js(lamp_name)}))]")
        if not steps: fail(f'{where}: a turn needs "say", "do", "mood", "enter" or "exit"')
        body = f"[{who['name']}, " + ', '.join(steps) + ']'
        # Câu nói NHẮC TÊN một con vật trong cảnh ("Bella rất khoẻ mạnh") mà không khai `shot`: đưa cả con vật vào khung.
        if 'shot' not in turn and 'say' in turn and who['name'] not in narrators_42a:
            mentioned = [other['name'] for other in names.values() if other['_pet'] and re.search(r'(?<!\w)' + re.escape(other['name']) + r'(?!\w)', str(turn['say']), re.IGNORECASE)]
            if mentioned: turn = dict(turn, shot=[who['name']] + mentioned)
        if 'shot' in turn:
            shot = turn['shot']
            if isinstance(shot, list):
                for item in shot:
                    if item not in names: fail(f'{where}: "shot" names "{item}", who is not in the scene')
                shot_code = '[' + ', '.join(shot) + ']'
            elif shot is False or shot in ('face', 'chest', 'full', 'wide'): shot_code = js(shot)
            else: fail(f'{where}: "shot" must be "face", "chest", "full", "wide", false, or a list of character names')
            return f'{{ turn: {body}, shot: {shot_code} }}'
        return body

    turns = []
    # Mở đầu: ai `enter` thì bước vào (và đi tới chỗ đứng); xong thì mọi người quay về phía người mình nhìn.
    entering = [who for who in names.values() if who.get('enter')]
    arrivals = []
    for who in entering:
        steps = [f"['enter', {js(who['enter'])}, {who['_enter_distance']}]"]
        if who.get('faces'): steps.append(f"['face', {who['faces']}]")
        arrivals.append(f"[{who['name']}, " + ', '.join(steps) + ']')
    # Mọi người bước vào CÙNG LÚC: vào lần lượt thì người vào sau đứng sẵn trong khung chờ tới lượt
    # rồi mới "bước vào" — và cảnh mất thêm vài giây trước câu nói đầu tiên.
    if arrivals: turns.append(('  // ' + ', '.join(who['name'] for who in entering) + (' walk' if len(entering) > 1 else ' walks') + ' in from outside the frame to the mark',
                               '{ together: [' + ', '.join(arrivals) + '] }' if len(arrivals) > 1 else arrivals[0]))
    layout = scene.get('layout', 'stage')
    if scene.get('marks', True) not in (True, False): fail('"marks" must be true or false (false: no automatic marks over a pet\'s head for its "mood")')
    marks_on = scene.get('marks', True)
    # ÂM THANH THEO ĐỘNG TÁC: `"sounds": { "bark": "gau.wav", "cat.meow": { "file": "meo.wav", "volume": 0.8, "at": 0.1 } }` —
    # mỗi lần động tác ấy diễn (của mọi nhân vật, hay chỉ của "cat"), một đoạn tiếng đặt đúng lúc nó bắt đầu (+ "at" giây).
    sounds = scene.get('sounds', {})
    if not isinstance(sounds, dict): fail('"sounds" must be an object: { "bark": "bark.wav", "dog.bark": { "file": "…", "volume": 0.8, "at": 0.1 } }')
    for key, value in list(sounds.items()):
        spec = {'file': value} if isinstance(value, str) else value
        if not isinstance(spec, dict) or not isinstance(spec.get('file'), str) or set(spec) - {'file', 'volume', 'at'}: fail(f'sounds["{key}"] must be a file name or {{ "file": "…", "volume": 0.8, "at": 0.1 }} — got {js(value)}')
        if not os.path.isfile(os.path.join(base, spec['file'])): fail(f'sounds["{key}"]: file not found: {spec["file"]} (looked in {base})')
        if not all(isinstance(spec.get(k, 0), (int, float)) for k in ('volume', 'at')): fail(f'sounds["{key}"]: "volume" and "at" must be numbers')
        if '.' in key and key.split('.', 1)[0] not in [c.get('name') for c in scene.get('characters', [])]: fail(f'sounds["{key}"]: "{key.split(".", 1)[0]}" is not a character in the scene ("who.action", or just "action")')
        sounds[key] = spec
    sound_actions = sorted({key.split('.', 1)[-1] for key in sounds})
    if layout not in ('stage', 'presenter', 'split'): fail(f'"layout" must be "stage", "presenter" or "split", got {js(layout)}')
    if 'sides' in scene and layout != 'split': fail('"sides" (a background for each half) needs "layout": "split"')
    speakers = []                                           # màn hình chia đôi: (chỉ số lượt, nửa của người nói) — nửa kia tối đi
    # Chỉ số "phẳng" của từng lượt trong talk.turns: các lượt mở đầu (thú ngồi sẵn, bước vào, quay mặt) đứng trước kịch bản.
    flat = sum(1 for who in names.values() if who['_pet'] and who.get('seated')) + len(arrivals)
    shows = []                                              # { turn: chỉ số phẳng, title, bullets, image } hoặc { turn, clear: True }
    toasts = []                                             # { turn: chỉ số lượt trong conversation, title, text } — thẻ thông báo trên khung
    lamp_ops = []                                           # { turn, name, on, dur } — bật / tắt đèn của bối cảnh 3D
    power_ops, sky_ops = [], []                             # mất điện / có điện · trời chuyển giờ
    box_names = [box.get('name') for box in (stage_set or {}).get('boxes', [])]

    def plane_of(person):
        """Chiều sâu (z) mà bàn tay người này vươn trong đó: người ngồi trên một hộp ngồi ngay trước mặt hộp (+12)."""
        if person.get('on') and person.get('seated') and person['on'] in box_names:
            return float(stage_set['boxes'][box_names.index(person['on'])]['z']) + 12
        return float(person.get('z', -300))
    gear_ops = []                                           # đèn trong tay (rọi đèn pin, soi đèn khám) — cho moments.json
    holding = {}                                            # ai đang bế con vật nào (bế, trao) — để đo lúc `putDown` (đợt 30)
    arms = {}                                               # ai đang bế con vật nào — để `takePet` biết con vật ĐANG ở đâu (đợt 30)
    popups = []                                             # { turn, cutout: số thứ tự, title, text, hold } — thông báo trên màn hình đạo cụ 3D
    # GÓC MÁY của bối cảnh 3D: `"view"` trên một lượt đổi máy quay đúng lúc lượt ấy bắt đầu. `emitted` đếm số lượt THẬT SỰ
    # đã phát ra trong talk.turns (kể cả lượt "bước lại gần" chèn thêm), để biết lượt ấy mang chỉ số nào.
    views, emitted, reach_notes, pace_notes = [], [flat], [], []
    # Máy quay HIỆN TẠI (để tính quãng lia của mỗi "view"): góc máy đầu cảnh, cộng dồn qua từng view.
    camera_now = {key: float(value) for key, value in dict(CAMERA_START, **(stage_set.get('camera', {}) if stage_set is not None else {})).items() if key in CAMERA_SPEED}
    def pets_only_view_42c(turn, subjects, view):
        """Đợt 42 C: view có CON VẬT đang làm động tác cùng người chỉ đứng đó / nói (lời dẫn) → chỉ lấy con vật làm chủ thể (người vẫn được
        tránh mép khung): con vật ≥ 35 % khung. Có `fill` riêng, hay người cũng làm động tác (`do`) → giữ nguyên."""
        if 'fill' in view or view.get('size', 'medium') == 'full' or any(name not in names for name in subjects): return subjects
        turns = turn['together'] if isinstance(turn.get('together'), list) else [turn]
        acts = {t.get('who'): bool(t.get('do')) for t in turns if isinstance(t, dict)}
        pets = [name for name in subjects if names[name].get('_pet')]
        if not pets or len(pets) == len(subjects) or not any(acts.get(name) for name in pets): return subjects
        if any(acts.get(name) for name in subjects if name not in pets): return subjects
        return pets
    def view_of(turn, where):
        view = turn.get('view')
        if view is None: return
        if stage_set is None: fail(f'{where}: "view" moves the camera of a 3D set — add "set" at the top of the scene file')
        # GÓC MÁY TỰ ĐỘNG: `"view": "close"` (cận vào chính người / con vật của lượt, rồi trở lại góc trước ở lượt sau),
        # hay `{ "on": "dog" | ["vet", "dog"], "size": "close" | "medium" | "full", "back": true }`. Máy tính lúc dựng, trong
        # trình duyệt (set.frameOn): đo hình vẽ thật của từng nhân vật, dời để không ai bị mép khung cắt đôi.
        if isinstance(view, str):
            if view not in VIEW_SIZES: fail(f'{where}: "view" as a word must be {", ".join(VIEW_SIZES)} (a close / medium / full shot of "{turn.get("who")}") — got {js(view)}')
            view = {'on': turn.get('who'), 'size': view, 'back': True}
        if isinstance(view, dict) and 'on' in view:
            known(f'{where}.view', view, VIEW_KEYS)
            subjects = view['on'] if isinstance(view['on'], list) else [view['on']]
            subjects = pets_only_view_42c(turn, subjects, view)
            if not subjects or any(name not in names for name in subjects): fail(f'{where}: "view.on" must name characters in the scene — got {js(view["on"])}')
            if view.get('size', 'medium') not in VIEW_SIZES: fail(f'{where}: "view.size" must be {", ".join(VIEW_SIZES)} — got {js(view.get("size"))}')
            extra = {key: view[key] for key in ('yaw', 'pitch') if key in view}
            if any(not isinstance(value, (int, float)) for value in extra.values()): fail(f'{where}: every camera value in "view" must be a number')
            check_camera(extra, f'{where}.view')
            if 'fill' in view and not (isinstance(view['fill'], (int, float)) and 0.1 <= view['fill'] <= 0.95): fail(f'{where}: "view.fill" is the share of the frame height the subjects take, 0.1–0.95 — got {js(view["fill"])}')
            views.append({'turn': emitted[0], 'auto': {'on': subjects, 'size': view.get('size', 'medium'), 'alone': bool(view.get('alone')), 'fill': view.get('fill')}, 'values': extra, 'wide': False,
                          'cut': view.get('cut', True) is not False, 'dur': float(view.get('dur', 1.5)), 'ease': view.get('ease', 'sine.inOut'), 'where': where, 'back': bool(view.get('back'))})
            camera_now.clear(); camera_now.update({key: float(value) for key, value in extra.items()})       # giá trị thật chỉ biết lúc dựng
            return
        if not isinstance(view, dict) or not view: fail(f'{where}: "view" must be an object such as {{ "yaw": 20, "distance": 1200, "dur": 2 }}, or "close" / "medium" / "full"')
        known(f'{where}.view', view, VIEW_KEYS)
        values = {key: view[key] for key in CAMERA_KEYS if key in view}
        if any(not isinstance(value, (int, float)) for value in values.values()): fail(f'{where}: every camera value in "view" must be a number')
        if view.get('wide') not in (None, True, False): fail(f'{where}: "wide" must be true')
        if not values and not view.get('wide'): fail(f'{where}: "view" changes nothing — give at least one of {", ".join(CAMERA_KEYS)}, or "wide": true')
        check_camera(values, f'{where}.view')
        wide = bool(view.get('wide'))
        if wide:
            # TOÀN CẢNH: ống kính dài ở góc thấp (OVERVIEW của runtime), ngắm giữa phòng, zoom vừa khung. Phần nào kịch bản
            # tự cho (yaw, zoom…) thì giữ.
            room = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))
            yaw, pitch = float(values.get('yaw', 0)), float(values.get('pitch', 14))
            across = room['width'] * math.cos(math.radians(yaw)) + room['depth'] * math.sin(math.radians(abs(yaw)))
            tall = room['height'] * math.cos(math.radians(pitch)) + room['depth'] * math.sin(math.radians(pitch))
            values = dict({'yaw': yaw, 'pitch': pitch, 'lens': 5000, 'distance': 5000, 'x': 0, 'y': round(room['height'] * (0.15 if width < height else 0.4)),
                           'z': round(room['front'] - room['depth'] / 2),
                           # Khung dọc hẹp ngang: vừa cả bề ngang phòng thì nó chỉ còn một dải nhỏ giữa khung — cắt bớt hai bên.
                           'zoom': round(min(0.95 * width / across * (1.5 if width < height else 1), (0.45 if width < height else 0.82) * height / tall), 3)}, **values)
        # Rời một cảnh toàn (ống kính dài) là một lần CẮT về ống kính thường: lia từ ống kính 5000 về 1700 thì phối cảnh
        # của cả phòng co giãn trước mắt người xem (hiệu ứng "vertigo").
        leaving = bool(views) and views[-1]['wide'] and not wide
        if leaving:
            values = dict({'lens': NORMAL_LENS, 'distance': float(stage_set.get('camera', {}).get('distance', 1750)), 'zoom': float(stage_set.get('camera', {}).get('zoom', 1))}, **values)
        cut = bool(view.get('cut')) or wide or leaving
        # THỜI LƯỢNG LIA mặc định theo QUÃNG ĐƯỜNG: 1,5 s cho mọi cú lia thì cú lia dài thành cú quét — ở 30 khung/giây
        # hình dời 40+ px mỗi khung, mắt thấy giật cục dù từng khung đều đúng (cảnh thử đợt 5, giây 19). Giữ tốc độ dưới
        # các ngưỡng CAMERA_SPEED (mỗi giây), tối đa 4 s. Tự cho `dur` thì giữ nguyên, chỉ nhắc nếu quá nhanh.
        need = max([abs(float(values[key]) - float(camera_now[key])) / CAMERA_SPEED[key] for key in CAMERA_SPEED if key in values and key in camera_now] + [0])
        if 'dur' in view:
            seconds = float(view['dur'])
            if not cut and need > seconds * 1.25: pace_notes.append(f'{where}: the camera covers this move in {seconds:g} s — a pan that fast judders at 30 fps; about {min(4.0, need):.1f} s reads smoothly (or leave out "dur")')
        else: seconds = 1.5 if cut else round(min(4.0, max(1.5, need)), 2)
        camera_now.update({key: float(value) for key, value in values.items()})
        views.append({'turn': emitted[0], 'values': values, 'wide': wide, 'cut': cut,
                      'dur': seconds, 'ease': view.get('ease', 'sine.inOut'), 'where': where})
    # ĐẠO DIỄN TỰ ĐỘNG (`"camera": "auto"`, bối cảnh 3D): mỗi mục của kịch bản là một NHỊP với góc máy mong muốn;
    # set.direct() (lúc dựng, trong trình duyệt) giữ mỗi góc ≥ 2,5 s, bỏ những lần đổi góc quá dày, lia khi chỉ đổi cỡ cảnh.
    director = stage_set is not None and scene.get('camera') == 'auto'
    beats, spoken = [], []
    STRONG = ('angry', 'crying', 'surprised', 'worried', 'sad', 'laughing', 'embarrassed')
    def beat_of(entry, first, last):
        span = {'first': first, 'last': last}
        if isinstance(entry, dict) and 'view' in entry: return dict(span, fixed=True)
        group = entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
        group = [turn for turn in group if isinstance(turn, dict) and turn.get('who') in names]
        if not group: return dict(span, fixed=True)
        if len(group) == 1 and ('power' in group[0] or 'sky' in group[0]) and not group[0].get('do'):
            # MẤT ĐIỆN, TRỜI CHUYỂN: góc toàn có cả đèn — kể cả khi người ấy đang nói: cận người nói thì không thấy căn phòng tối
            # đi (Gemini đợt 20). Trời chuyển: máy lùi chậm ra suốt lúc ấy (`drift`).
            sky = group[0].get('sky')
            drift = float(sky.get('dur', 6)) if isinstance(sky, dict) else 6.0 if sky else 0
            if group[0].get('say'): spoken.append(names[group[0]['who']]['name'])
            # Cả căn phòng đổi sáng: lấy MỌI nhân vật vào khung (con mèo trước bà bị cắt chân ở góc chỉ có bà — cảnh thử đợt 21).
            everyone = [names[group[0]['who']]['name']] + [who['name'] for who in names.values() if who['name'] != names[group[0]['who']]['name']]
            return dict(span, subjects=everyone, size='full', lamp=True, **({'drift': drift} if drift else {}), **({'speech': True} if group[0].get('say') else {}))
        talker = next((turn for turn in group if turn.get('say')), None)
        if talker:
            who = names[talker['who']]
            # NGƯỜI NGHE: (1) người nói vừa làm gì với ai ở nhịp trước (đưa thuốc cho con chó) — người ấy; (2) không thì người
            # nói gần nhất; (3) chưa ai nói thì ai vừa diễn ở nhịp trước (bác sĩ trấn an con chó vừa run sợ).
            before = next((beat for beat in reversed(beats) if beat.get('subjects')), None) if len(beats) > 1 else None
            others = [name for name in (before['subjects'] if before else []) if name != who['name']]
            listener = (others[0] if before and who['name'] in before['subjects'] and others else None) \
                or next((name for name in reversed(spoken) if name != who['name']), None) or (others[0] if others else None)
            spoken.append(who['name'])
            # Lượt `together` có lời: người nói cùng những ai diễn với họ trong lượt ấy (bác sĩ khen — con chó vẫy đuôi).
            company = [names[turn['who']]['name'] for turn in group if turn is not talker]
            # KHUNG DỌC (9:16) hẹp ngang: hai người cạnh nhau là hai hình nhỏ xíu — quay NGƯỜI NÓI một mình (góc đơn), câu
            # đáp của người kia sẽ là góc đơn của họ: kiểu "người nói / người nghe" quen thuộc của video dọc.
            if height > width * 1.2 and talker.get('mood') not in STRONG: return dict(span, subjects=[who['name']], size='medium', speech=True)
            if company: return dict(span, subjects=[who['name']] + company, size='medium', speech=True)
            if talker.get('mood') in STRONG or not listener: return dict(span, subjects=[who['name']], size='close' if talker.get('mood') in STRONG else 'medium', speech=True)
            return dict(span, subjects=[who['name'], listener], size='medium', speech=True)
        if len(group) == 1 and 'lamp' in group[0] and not group[0].get('do') and not group[0].get('say'):
            # Bật / tắt đèn: cả người lẫn cây đèn trong khung (frameOn tự lấy bóng đèn đang sáng vào) — thấy căn phòng đổi sáng.
            return dict(span, subjects=[names[group[0]['who']]['name']], size='full', lamp=True)
        if len(group) == 1:
            turn, who = group[0], names[group[0]['who']]
            if who['_pet']: return dict(span, subjects=[who['name']], size='close')
            targets = [step[1][1:] for step in turn.get('do', []) if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names]
            # Khung dọc: khám / cho thuốc / vuốt ve con vật — cận vào CON VẬT (tay người lấn vào khung). Hai người cạnh nhau
            # trong khung dọc là hai hình nhỏ: không thấy đèn khám, viên thuốc (Gemini soát phim dọc đợt 15).
            # → người + con vật ở cỡ trung, đo lúc GIỮA nhịp (đang khám, hai bên đứng sát nhau) — cận riêng con vật thì lẹm nửa
            # mặt người đứng sát nó (Gemini, đợt 18).
            if height > width * 1.2 and targets and names[targets[0]]['_pet']: return dict(span, subjects=[who['name'], names[targets[0]]['name']], size='medium', mid=True)
            # Bắt tay / đưa đồ giữa hai người: hai bàn tay gặp nhau ngang hông — cỡ trung cắt ngang đúng chỗ ấy (đợt 28).
            # Cân (đợt 35): con vật đặt lên cân dưới SÀN — góc toàn (thấy chân người, bệ cân).
            low_hands = any(isinstance(step, list) and step and step[0] in ('handshake', 'handOver', 'handOverPet', 'weigh', 'giveChange', 'stampCard') for step in turn.get('do', []))
            # Cho thuốc / đo nhiệt độ (đợt 35, lượt ba): GÓC CẬN người + con vật — viên thuốc, miệng con vật, mặt người nhìn nhiệt kế chỉ
            # vài pixel ở góc trung hai người (Gemini đọc ~1 khung / giây).
            if any(isinstance(step, list) and step and step[0] in ('givePill', 'takeTemp') + CARE_38 for step in turn.get('do', [])) and targets and names[targets[0]]['_pet']:
                return dict(span, subjects=[who['name'], names[targets[0]]['name']], size='close')
            # ĐỢT 39 A: quầy thu ngân / cà phê một mình — góc trung (tờ tiền, thẻ, con dấu, bình rót, khăn chỉ vài pixel ở góc toàn).
            if not targets and any((step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in DESK_39 for step in turn.get('do', [])):
                return dict(span, subjects=[who['name']], size='full' if any((step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in DESK_PAY + ('wipeCounter',) for step in turn.get('do', [])) else 'medium')
            # Rửa tay, đeo / tháo găng (đợt 38 B): góc trung một mình người ấy — bọt, găng ở hai bàn tay trước ngực chỉ vài pixel ở góc toàn.
            if not targets and any((step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in PREP_ACTIONS for step in turn.get('do', [])):
                return dict(span, subjects=[who['name']], size='medium')
            return dict(span, subjects=[who['name']] + [name for name in targets if name != who['name']][:1], size='full' if low_hands or not targets else 'medium')
        moods = [turn for turn in group if names[turn['who']]['_pet'] and turn.get('mood')]
        subjects = list(dict.fromkeys(names[turn['who']]['name'] for turn in group))
        return dict(span, subjects=subjects, size='medium' if not moods else 'full')
    if director:
        # Mở cảnh: toàn cảnh mọi người (giữ ≥ 2,5 s rồi mới vào nhịp đầu).
        beats.append({'first': 0, 'last': 0, 'subjects': [who['name'] for who in names.values()], 'size': 'full', 'lamp': True})       # toàn cảnh mở đầu: có cả cây đèn
    for index, entry in enumerate(script):
        where = f'script[{index}]'
        # TRỞ LẠI góc máy trước (view có "back"): cắt về đúng nó ở lượt đầu tiên của mục sau — trừ khi mục ấy tự có "view".
        if views and views[-1].get('back') and not views[-1].get('back_done'):
            views[-1]['back_done'] = True
            if not (isinstance(entry, dict) and 'view' in entry):
                before = views[-2] if len(views) > 1 else None
                views.append(dict(before, turn=emitted[0], cut=True, back=False, back_done=True, returned=True) if before else {'turn': emitted[0], 'start': True, 'values': {}, 'wide': False, 'cut': True, 'dur': 1.5, 'ease': 'sine.inOut', 'where': where, 'back': False})
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'show' not in turn: continue
            show = turn['show']
            if layout != 'presenter': fail(f'{where}: "show" needs "layout": "presenter" at the top of the scene file')
            if show is False or show is None: shows.append({'turn': flat, 'clear': True}); continue
            if not isinstance(show, dict) or not show: fail(f'{where}: "show" must be an object with "title", "bullets" and / or "image", or false to clear the panel')
            known(f'{where}.show', show, SHOW_KEYS)
            if 'bullets' in show and (not isinstance(show['bullets'], list) or not all(isinstance(item, str) for item in show['bullets'])): fail(f'{where}: "show.bullets" must be a list of strings')
            if 'image' in show and not os.path.isfile(os.path.join(base, show['image'])): fail(f'{where}: show.image not found: {show["image"]} (looked in {base})')
            shows.append(dict(show, turn=flat))
        flat += len(entry['together']) + len(entry.get('_narr42a', [])) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else 1
        backs = []                                          # (người, quãng) — lùi lại sau lượt này
        turned_back = []                                    # (con vật, người) — con vật quay lại nhìn người ấy sau lượt này (takeTemp)
        first_turn = emitted[0]                             # nhịp của đạo diễn tự động: gồm cả các bước lại gần / lùi lại
        # LẠI GẦN trước khi vuốt ve / đưa đồ: tay nhân vật ngắn (với tới chừng 0,2 × chiều cao host). Đích đứng xa hơn tầm
        # ấy thì chèn một lượt bước tới trước — người vuốt ve dừng cách con vật 0,24 × chiều cao, người đưa đồ dừng cách
        # người nhận 0,45 × chiều cao (hai cánh tay cùng vươn). Chỗ đứng mới được ghi lại cho các lượt sau.
        # ĐỢT 40 A — KÉO CO: con chó đi tới cách người một sợi dây (mõm cách giữa người `TUG_STAND` × chiều cao) rồi mới ngậm dây; đứng sai chỗ thì dây
        # quá dài hay con chó chồm lên chân người.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or turn.get('who') not in names or not names[turn['who']]['_pet'] or not isinstance(turn.get('do'), list): continue
            for step in turn['do']:
                # Động tác TỰ đi của con chó (dựa chân, tha đồ chơi tới người / đi một quãng): ghi lại chỗ nó đứng sau đó, cho lượt kéo co sau nó tính đúng.
                if isinstance(step, list) and step and step[0] in ('leanOnLeg', 'carryToy'):
                    pet, aim = names[turn['who']], (names.get(step[1][1:]) if len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None)
                    if aim and not aim['_pet']:
                        px = float(aim['x']) + aim.get('_drop', 0)
                        side = 1 if px >= float(pet['x']) + pet.get('_drop', 0) else -1
                        pet['x'] = px - side * (0.085 * 0.96 * aim['_host_height'] + 78 * pet['_unit']) if step[0] == 'leanOnLeg' else px - side * (0.13 * 0.96 * aim['_host_height'] + 88 * pet['_unit'])
                    elif step[0] == 'carryToy' and len(step) > 1 and isinstance(step[1], (int, float)) and not isinstance(step[1], bool):
                        face = names.get(pet.get('faces')) if pet.get('faces') else None
                        pet['x'] = float(pet['x']) + (1 if not face or float(face['x']) >= float(pet['x']) else -1) * float(step[1]) * pet['_unit']
                if not (isinstance(step, list) and len(step) > 1 and step[0] == 'tugOfWar' and isinstance(step[1], str) and step[1][1:] in names): continue
                pet, person = names[turn['who']], names[step[1][1:]]
                if person['_pet']: fail(f'{where}: "tugOfWar" is with a person who holds the other end of the rope — "{step[1]}" is a pet')
                px = float(person['x']) + person.get('_drop', 0)
                side = 1 if px >= float(pet['x']) + pet.get('_drop', 0) else -1
                want = px - side * TUG_STAND * 0.96 * person['_host_height'] - side * TUG_SNOUT * pet['_unit']
                move = want - (float(pet['x']) + pet.get('_drop', 0))
                if abs(move) > 0.03 * person['_host_height']:
                    turns.append((f'  // {pet["name"]} goes a rope\'s length from {person["name"]} for the "tugOfWar"', f"[{pet['name']}, ['walk', 4, {round(move / pet['_unit'])}]]"))
                    emitted[0] += 1
                    pet['x'] = float(pet['x']) + move
        undo_42e = []
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            restore_42e(undo_42e)
            if not isinstance(turn, dict) or turn.get('who') not in names: continue
            who = names[turn['who']]
            if who['_pet']: continue
            floor_turn_42e(who, turn, undo_42e)          # ĐỢT 42 E: đang ngồi bệt / nằm — như người ngồi (con vật đi tới, không tự quỳ)
            # QUỲ XUỐNG với con vật dưới SÀN (vuốt ve, cho ăn, khám, chải lông): người đứng thẳng thì tay chỉ tới lưng gần đuôi
            # con chó, không tới đầu — người thật sẽ ngồi xuống (đợt 28: tay cách đầu chó 12 % chiều cao người, đo bằng
            # tools/acting_check.py). Người đang ngồi, hay đã tự quỳ trong lượt ấy, thì thôi.
            steps = turn.get('do') if isinstance(turn.get('do'), list) else []
            low = [step for step in steps if isinstance(step, list) and len(step) > 1 and step[0] in ('stroke', 'giveTreat', 'examine', 'brush', 'takeTemp', 'givePill', RESTRAIN) + CARE_ACTIONS + CARE_38
                   and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet'] and not names[step[1][1:]].get('on')]
            if stage_set is not None and low and not who.get('seated') and 'kneel' not in steps and not any(isinstance(step, list) and step and step[0] == 'kneel' for step in steps):
                turn['do'] = ['kneel'] + steps + ['standUp']
            # ĐỢT 39 A: quét QR / quẹt thẻ — đứng cách đế thanh toán `PAY_REACH` × chiều cao (phía mình đang đứng); lau quầy — đứng trước mặt quầy (trong bề ngang của nó).
            for step in (turn.get('do') or []) if isinstance(turn.get('do'), list) else []:
                nm = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
                if nm not in DESK_PAY + ('wipeCounter',) or who.get('seated') or (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')): continue
                if nm in DESK_PAY:
                    found = desk_stand(who, step[1] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) else None)
                    if not found: continue
                    wanted_x = found[0] + (1 if float(who['x']) >= found[0] else -1) * PAY_REACH * who['_host_height']
                else:
                    counter = desk_counter(who)
                    if not counter: continue
                    wanted_x = counter[0]
                move = wanted_x - float(who['x'])
                if abs(move) > 0.04 * who['_host_height']:
                    turns.append((f'  // {who["name"]} steps up to the {"pay stand" if nm in DESK_PAY else "counter"} for "{nm}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + move
            # ĐỢT 42 E: NHẶT đồ chơi cạnh một con vật (`["pickUp", "@cho"]`): bước lại cho món đồ (cạnh chân trước nó, phía người) vào tầm tay lúc ngồi
            # xổm — giữa người cách giữa con vật `PICK_GAP_42E` × chiều cao người, ở phía đang đứng.
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] == 'pickUp' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
                pet = names[step[1][1:]]
                px = float(pet['x']) + pet.get('_drop', 0)
                move = px + (1 if float(who['x']) >= px else -1) * PICK_GAP_42E * who['_host_height'] - float(who['x'])
                if abs(move) > 0.04 * who['_host_height']:
                    turns.append((f'  // {who["name"]} steps up to {step[1][1:]} to "pickUp" the toy by it', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + move
            # ĐỢT 39 C: chụp ảnh tự sướng cùng ai (`["takeSelfie", 1.6, { "with": "@boy" }]`): người kia bước lại sát người chụp (cùng phía họ
            # đang đứng, cách 0,3 × chiều cao trung bình) để cả hai vào một khung hình — máy chụp ở trên cao giữa hai đầu.
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if isinstance(step, list) and step and step[0] == 'takeSelfie' and len(step) > 2 and isinstance(step[2], dict) and isinstance(step[2].get('with'), str) and step[2]['with'][1:] in names:
                    mate = names[step[2]['with'][1:]]
                    side = 1 if float(mate['x']) >= float(who['x']) else -1
                    move = float(who['x']) + side * 0.3 * (who['_host_height'] + mate['_host_height']) / 2 - float(mate['x']) - mate.get('_drop', 0)
                    if abs(move) > 0.05 * who['_host_height'] and not mate.get('seated') and not mate.get('on'):
                        turns.append((f'  // {mate["name"]} steps up beside {who["name"]} for the "takeSelfie"', f"[{mate['name']}, ['walk', 4, {round(move / mate['_unit'])}]]"))
                        emitted[0] += 1
                        mate['x'] = float(mate['x']) + move
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] in ('stroke', 'handOver', 'listen', 'inject', 'carry', 'handshake', 'examine', 'giveTreat', 'brush', 'handOverPet', RESTRAIN) + CARE_35 + CARE_ACTIONS + tuple(PAIR_38) and isinstance(step[1], str) and step[1][1:] in names): continue
                names[step[1][1:]].setdefault('_reachers', set()).add(who['name'])      # ai với tay tới nó (đặt chiều sâu con vật, đợt 32)
                # CON VẬT TỰ ĐI SANG MẶT PHẲNG NGƯỜI KẾ (đợt 34): người trước với tới nó ở chiều sâu khác (> 5 đơn vị) — nó sẽ dời chiều
                # sâu trước lượt này (`set.depth`, xem `pet_depths`). Không có lần cắt cảnh nào ở giữa thì nó TRƯỢT 0,45 s trên hình
                # (đứng yên mà trôi về phía máy). Chèn một bước đi ngắn của chính nó về phía người kế: `settleDepths` trải lần dời
                # theo bước đi ấy. Người kế ngồi thì nó vốn đi tới họ ("comes over") — chỉ ép bước ấy có, dù quãng ngắn.
                hop_pet = names[step[1][1:]]
                hop = None
                if stage_set is not None and hop_pet['_pet'] and not hop_pet.get('on') and step[0] in ('stroke', 'examine', 'giveTreat', 'brush', 'listen', 'inject', 'carry', RESTRAIN) + CARE_35 + CARE_ACTIONS:
                    plane = plane_of(who)
                    if hop_pet.get('_plane') is not None and abs(plane - hop_pet['_plane']) > 5: hop = hop_pet
                    hop_pet['_plane'] = plane
                if hop is not None and not who.get('seated'):
                    toward = 1 if float(who['x']) >= float(hop['x']) + hop.get('_drop', 0) else -1
                    turns.append((f'  // {hop["name"]} walks over into {who["name"]}\'s plane for "{step[0]}" (it changes depth on the way)', f"[{hop['name']}, ['walk', 4, {toward * 40}]]"))
                    emitted[0] += 1
                    hop['x'] = float(hop['x']) + toward * 40 * hop['_unit']
                # Người đang NGỒI (ghế đá, ghế phòng chờ) không đứng dậy đi tới: con vật ĐI TỚI người (bế, vuốt ve…). Đích là
                # người thì thôi — người ngồi chỉ với tới chỗ mình.
                if who.get('seated') and not names[step[1][1:]]['_pet']: continue
                if stage_set is not None and abs(float(names[step[1][1:]].get('z', -300)) - float(who.get('z', -300))) > 60:
                    # Rig 2D chỉ vươn tay trong MẶT PHẲNG của chính nó: con vật / người nhận đứng gần máy hơn (hay xa hơn) thì
                    # trên màn hình nó thấp hơn (cao hơn) chỗ bàn tay với tới. Bước lại gần chỉ đi theo trục x.
                    reach_notes.append(f'{where}: "{who["name"]}" reaches for "{step[1][1:]}" ({step[0]}), which stands at z {float(names[step[1][1:]].get("z", -300)):g} — {abs(float(names[step[1][1:]].get("z", -300)) - float(who.get("z", -300))):g} units nearer or further than "{who["name"]}" (z {float(who.get("z", -300)):g}). A hand only reaches in its own plane: give them the same z (within 60)')
                # Con vật người NHẬN đã đặt xuống (`takePet` … `putDown`) đứng cạnh chân người ấy, không ở chỗ được bế lần đầu:
                # `_drop` (đơn vị phòng) — `x` chỉ là quãng nó tự đi (`s.x`, cho `at` / `petAt`) (đợt 30).
                gap = float(names[step[1][1:]]['x']) + names[step[1][1:]].get('_drop', 0) - float(who['x'])
                # GIỮ CON VẬT (đợt 38 B): đứng ở phía BÊN KIA con vật so với người làm cùng lúc (người tiêm / khám) — mỗi người một nửa thân
                # nó, tay không chồng lên tay, không ai đứng che đầu nó; không có người làm thì ở phía mình. Đi vòng sang nếu đang cùng phía.
                if step[0] == RESTRAIN and names[step[1][1:]]['_pet'] and not who.get('seated'):
                    pet = names[step[1][1:]]
                    pet_x = float(pet['x']) + pet.get('_drop', 0)
                    partner = next((names[other['who']] for other in (entry.get('together') or [] if isinstance(entry, dict) else []) if isinstance(other, dict) and other is not turn
                                    and other.get('who') in names and not names[other['who']]['_pet'] and any(isinstance(item, list) and len(item) > 1 and item[1] == step[1] for item in other.get('do') or [])), None)
                    side = (-1 if float(partner['x']) > pet_x else 1) if partner else (1 if float(who['x']) >= pet_x else -1)
                    if partner and abs(float(partner['x']) - pet_x) < 0.02 * who['_host_height']: side = 1 if float(who['x']) >= pet_x else -1
                    move = pet_x + side * RESTRAIN_GAP * who['_host_height'] - float(who['x'])
                    if abs(move) > 0.04 * who['_host_height']:
                        how = 'goes round to the other side of' if (float(who['x']) - pet_x) * side < 0 else 'steps up to'
                        turns.append((f'  // {who["name"]} {how} {step[1][1:]} to "restrain" it', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                        emitted[0] += 1
                        who['x'] = float(who['x']) + move
                    continue
                # Đưa đồ: hai bàn tay gặp nhau ở giữa như bắt tay (0,28 — đợt 29: 0,45 để tay cách tay 20 % chiều cao); trao con vật
                # đang bế: 0,34 (0,42: 7,8 %); bắt tay: 0,22; chạm tới con vật: gần như vuốt ve.
                # Soi đèn / đưa bánh thưởng tới ĐẦU con vật (cao hơn thân, xa vai hơn): đứng sát hơn nữa (0,16), không thì tay
                # chibi chỉ chĩa về phía đầu mà không tới — đèn soi rọi vào thành bàn.
                # Bắt tay 0,22: mỗi cánh tay chibi chỉ vươn ~0,09 chiều cao — đứng 0,38 thì hai bàn tay cách nhau 24 % chiều cao
                # (đo bằng tools/acting_check.py, đợt 28).
                wanted = {'handOver': 0.28, 'handOverPet': 0.34, 'handshake': 0.22, 'examine': 0.2, 'giveTreat': 0.16, 'givePill': 0.18, 'takeTemp': 0.19, 'bandage': 0.16, 'putCone': 0.24}.get(step[0], 0.24) * who['_host_height']
                target = names[step[1][1:]]
                # HAI NGƯỜI (đợt 38 C): khoảng cách theo chiều cao trung bình hai người; đập tay theo người THẤP hơn (trẻ con tay ngắn, đứng sát hơn).
                if step[0] in PAIR_GAP and not target['_pet']: wanted = PAIR_GAP[step[0]] * (min(who['_host_height'], target['_host_height']) if step[0] == 'highFive' else (who['_host_height'] + target['_host_height']) / 2)
                # CHO UỐNG THUỐC con chó / thỏ (đợt 36 — Gemini: "chỉ một tay gần mõm, không thấy viên thuốc" ở cảnh corgi): thân dài, ĐẦU
                # nằm ở đầu gần người (nó quay mặt về người) — đứng 0,18 tính từ GIỮA thân là đứng đè lên đầu nó, hai bàn tay chồng lên
                # nhau trước ngực người. Cộng thêm quãng từ giữa thân tới đầu (~0,15 chiều cao host của nó); mèo ngồi thì đầu trên ngực.
                if step[0] == 'givePill' and target['_pet'] and str(target.get('species', '')) not in CAT_SPECIES and not who.get('seated'):
                    wanted += PILL_HEAD * target['_host_height']
                # BĂNG CHÂN (đợt 35, lượt hai): đứng ngang CHÂN TRƯỚC con vật (về phía đầu nó, ~0,2 × chiều cao host của nó), không ngang
                # giữa thân — tay phía xa của người chibi không với tới chân trước, bàn tay giữ dừng ở bụng con chó (đo trên ảnh).
                # ĐỢT 38 A: cắt móng / nhỏ mắt / lau tai / quét chip — đứng ở PHÍA ĐẦU con vật (như băng chân), sát đầu nó: hai tay cùng tới
                # chân trước, cằm, tai, gáy mà không vắt qua thân nó.
                if step[0] in CARE_38 and target['_pet'] and not who.get('seated'):
                    head = -1 if target.get('faces') in names and float(names[target['faces']]['x']) < float(target['x']) else 1
                    reach_x = float(target['x']) + target.get('_drop', 0) + head * (0.08 if str(target.get('species', '')) in CAT_SPECIES else CARE_38_HEAD) * target['_host_height']
                    move = reach_x + head * CARE_38_GAP[step[0]] * (1 if target.get('on') else 0.6) * who['_host_height'] - float(who['x'])      # quỳ với con vật dưới sàn: vai thấp, tay ngắn — sát hơn
                    if abs(move) > 0.03 * who['_host_height']:
                        turns.append((f'  // {who["name"]} goes to the head end of {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                        emitted[0] += 1
                        who['x'] = float(who['x']) + move
                    continue
                if step[0] == 'bandage' and target['_pet'] and not who.get('seated'):
                    # Lượt ba: đứng ở PHÍA ĐẦU con vật (sang bên ấy nếu đang ở phía đuôi) — từ phía đuôi hai cánh tay vắt qua thân nó (người
                    # vẽ trước con vật): con chó chỉ thấy 57 % (cảnh CI `care`); lượt hai đưa con vật lên trước thì tay "lồng ra sau nó".
                    head = -1 if target.get('faces') in names and float(names[target['faces']]['x']) < float(target['x']) else 1
                    leg = float(target['x']) + target.get('_drop', 0) + head * 0.2 * target['_host_height']
                    move = leg + head * wanted - float(who['x'])
                    if abs(move) > 0.05 * who['_host_height']:
                        turns.append((f'  // {who["name"]} goes round to the head end of {step[1][1:]} for "bandage"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                        emitted[0] += 1
                        who['x'] = float(who['x']) + move
                    continue
                # Vuốt / chải con vật TRÊN BÀN (đợt 31): đứng sát như khám (0,16) — 0,24 thì bé chỉ với tới mép bàn cạnh đuôi con
                # mèo (tay cách hình nó, không chạm — acting_check đo tiếp xúc bằng pixel).
                if step[0] in ('stroke', 'brush') and target['_pet'] and target.get('on') and not who.get('seated'): wanted = 0.16 * who['_host_height']
                # Người NGỒI quay 3/4 về phía con vật (xem `state.facing` của người ngồi): đầu gối chìa ra phía ấy — con vật dừng xa
                # hơn một chút, không thì nó đứng khuất sau hai đầu gối (đợt 29: con mèo tới cạnh bà trên sofa).
                # Con vật dưới sàn tới người NGỒI (đợt 31): đứng TRƯỚC ống chân người ấy (lớp vẽ trên, `over` — xem `_front`),
                # sát đầu gối (0,22). Đợt 29–30 nó dừng xa hơn (0,3) mà vẫn sau hai ống chân, cùng lớp với người: bà trên sofa phải
                # cúi 40° qua đầu gối, con mèo khuất 34 % sau ống chân và bàn tay; tay ông ghế đá khuất hẳn sau mặt con chó.
                if who.get('seated') and target['_pet'] and stage_set is not None and not target.get('on'):
                    wanted = ((FLOOR_GAP_KID_43 if who.get('id') in KID_IDS_43 else FLOOR_GAP_43) if who.get('_floor42e') else 0.22) * who['_host_height']
                    # BÊN NÀO (đợt 31): bên con vật đi tới — không vòng qua trước hai ống chân người ngồi. Phía ĐẦU GỐI: nó vẽ TRÊN người
                    # (`over`, không khuất sau ống chân), tay đặt lên đỉnh đầu ('crown'). Phía HÔNG (không có chân che): người vẽ trước
                    # như thường, tay đặt lên đỉnh đầu ('top', 15 % xuống) — nhắm giữa mặt thì bàn tay che mất mặt nó (đo: đầu mèo lộ 57 %),
                    # nhắm lưng thì người ngồi cúi 25° vẫn không tới lưng con chó thấp.
                    knees = (1 if float(names[who['faces']]['_x0']) > float(who['_x0']) else -1) if who.get('faces') else (1 if float(who['_x0']) < 0 else -1)
                    side = 1 if float(target['x']) + target.get('_drop', 0) >= float(who['x']) else -1
                    if side == knees: target['_front'] = who
                    else: target['_back'] = who
                    pet = target
                    move = float(pet['x']) + pet.get('_drop', 0) - (float(who['x']) + side * wanted)
                    if abs(move) > 0.05 * who['_host_height'] or hop is pet:
                        turns.append((f'  // {pet["name"]} comes over to {who["name"]} (seated) for "{step[0]}"', f"[{pet['name']}, ['walk', 4, {round(-move / pet['_unit'])}]]"))
                        emitted[0] += 1
                        pet['x'] = float(pet['x']) - move
                    continue
                if not target['_pet'] and not who.get('seated') and not target.get('seated') and abs(gap) < wanted - (0.04 if step[0] in PAIR_GAP else 0.12) * who['_host_height']:      # hai người (đợt 38 C): đầu chibi to — sát hơn 4 % là hai đầu chồng nhau
                    # QUÁ SÁT người kia (bắt tay, đưa đồ): hai người chồng lên nhau, tay khuất sau thân (cảnh thử đợt 28: bé vừa
                    # vuốt mèo xong đứng đè lên bác sĩ, bắt tay mà không thấy tay) — lùi ra cho đủ tầm hai cánh tay.
                    away = (wanted - abs(gap)) * (-1 if gap > 0 else 1)
                    turns.append((f'  // {who["name"]} steps back from {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(away / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + away
                    continue
                if step[0] == 'givePill' and target['_pet'] and not who.get('seated') and abs(gap) < wanted - 0.04 * who['_host_height']:
                    # Đợt 36: QUÁ SÁT đầu con vật để cho thuốc — lùi ra cho đủ chỗ hai bàn tay (cằm / môi) thấy riêng từng cái.
                    away = (wanted - abs(gap)) * (-1 if gap > 0 else 1)
                    turns.append((f'  // {who["name"]} steps back from {step[1][1:]} for "givePill"', f"[{who['name']}, ['walk', 4, {round(away / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + away
                    continue
                if abs(gap) <= wanted + 0.05 * who['_host_height']: continue
                move = (abs(gap) - wanted) * (1 if gap > 0 else -1)
                if target['_pet'] and not who.get('seated'):
                    # NHƯỜNG CHỖ: một người khác (đứng, cùng độ sâu) đang ở đúng chỗ sắp tới bên con vật — người ấy lùi ra trước,
                    # không thì hai người đứng đè lên nhau, tay người mới chỉ chạm mép bàn (cảnh thử đợt 28: bé vuốt mèo trên bàn
                    # khám đứng lẫn vào bác sĩ).
                    spot = float(who['x']) + move
                    for other in names.values():
                        if other is who or other['_pet'] or other.get('seated') or abs(float(other.get('z', -300)) - float(who.get('z', -300))) > 60: continue
                        if abs(float(other['x']) - spot) >= 0.3 * who['_host_height']: continue
                        # Lùi về phía xa con vật hơn — sang hẳn bên kia chỗ đứng mới, chừa khoảng cho hai thân người.
                        side = -1 if float(target['x']) + target.get('_drop', 0) > spot else 1
                        aside = spot + side * 0.4 * max(who['_host_height'], other['_host_height']) - float(other['x'])
                        turns.append((f'  // {other["name"]} makes room for {who["name"]} by {step[1][1:]}', f"[{other['name']}, ['walk', 4, {round(aside / other['_unit'])}]]"))
                        emitted[0] += 1
                        other['x'] = float(other['x']) + aside
                if who.get('seated'):
                    # Con vật đi tới người ngồi (cảnh thử đợt 11: bà cụ trên ghế đá bế con mèo đứng sau ghế — con mèo
                    # "nhảy" vào lòng trong 0,6 s vì nó ở ngoài tầm tay).
                    pet = names[step[1][1:]]
                    turns.append((f'  // {pet["name"]} comes over to {who["name"]} (seated) for "{step[0]}"', f"[{pet['name']}, ['walk', 4, {round(-move / pet['_unit'])}]]"))
                    emitted[0] += 1
                    pet['x'] = float(pet['x']) - move
                    continue
                turns.append((f'  // {who["name"]} steps closer to {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                emitted[0] += 1
                who['x'] = float(who['x']) + move
                # Soi đèn / đưa bánh: người đứng SÁT con vật (0,16) — xong thì LÙI về chỗ cũ, không thì người (vẽ trước con
                # vật đứng cạnh mình) che mất mặt nó suốt phần sau của cảnh (cảnh thử đợt 12: góc cận chó chỉ thấy tay bác sĩ).
                # Cho thuốc (đợt 35, lượt bốn): KHÔNG lùi — bước lùi nằm trong nhịp máy của lượt ấy, góc cận phải chứa người ở cả hai chỗ
                # đứng thành gần góc toàn (mặt con mèo 13 % khung).
                # Băng chân / đeo loa (đợt 35, lượt hai): KHÔNG lùi lại — người làm ở lại cạnh con vật nói tiếp; bước lùi giữa góc trung
                # đưa người ra khỏi mép khung (Gemini: bác sĩ lẹm mép trái lúc đi ra, 00:42).
                if step[0] in ('examine', 'giveTreat'): backs.append((who, -move))
            # ĐO NHIỆT ĐỘ (đợt 35): con vật QUAY ĐUÔI về phía người đo trước lượt ấy (nhiệt kế vào thân sau), quay lại sau lượt.
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] == 'takeTemp' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
                pet = names[step[1][1:]]
                away = 'right' if float(pet['x']) + pet.get('_drop', 0) >= float(who['x']) else 'left'
                turns.append((f'  // {pet["name"]} turns its tail to {who["name"]} for "takeTemp"', f"[{pet['name']}, ['face', {js(away)}]]"))
                emitted[0] += 1
                turned_back.append((pet, who))
        restore_42e(undo_42e)
        if layout == 'split':
            talker = next((turn for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]) if isinstance(turn, dict) and turn.get('say') and turn.get('who') in names), None)
            speakers.append((emitted[0], names[talker['who']]['side'] if talker else None))      # lượt không lời: cả hai nửa sáng
        # THÔNG BÁO TRÊN MÀN HÌNH đạo cụ (`"popup"`): màn hình để bàn / laptop quay ra người xem trong bối cảnh 3D, gọi theo tên.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'popup' not in turn: continue
            pop = turn['popup']
            if stage_set is None: fail(f'{where}: "popup" shows a notification on a screen in a 3D set — add "set" with a named "monitor" or "laptop" cutout')
            if not isinstance(pop, dict) or set(pop) - {'on', 'title', 'text', 'hold'} or not pop.get('on') or not (pop.get('title') or pop.get('text')):
                fail(f'{where}: "popup" is {{ "on": "<cutout name>", "title": "…", "text": "…", "hold": 2.5 }} — got {js(pop)}')
            cutouts = stage_set.get('cutouts', [])
            index = next((i for i, item in enumerate(cutouts) if item.get('name') == pop['on']), None)
            if index is None: fail(f'{where}: "popup" names "{pop["on"]}", but no set.cutouts entry has "name": "{pop["on"]}"')
            screen_item = cutouts[index]
            if screen_item.get('kind') not in SCREEN_KINDS or (screen_item['kind'] == 'laptop' and screen_item.get('facing') != 'viewer'):
                fail(f'{where}: "popup" needs a screen the viewer sees — "{pop["on"]}" must be a "monitor", or a "laptop" with "facing": "viewer"')
            popups.append({'turn': emitted[0], 'cutout': index + 1, 'title': pop.get('title', ''), 'text': pop.get('text', ''), 'hold': float(pop.get('hold', 2.5))})
        # BẬT / TẮT ĐÈN (`"lamp"`): "on" / "off" (đèn đầu tiên), hay { "name": "…", "on": true, "dur": 0.6 } — đúng lúc lượt này bắt đầu.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'lamp' not in turn: continue
            if stage_set is None: fail(f'{where}: "lamp" switches a lamp of a 3D set — add "set" with "lamps" (or a "lamp" cutout)')
            spec = turn['lamp'] if isinstance(turn['lamp'], dict) else {'on': turn['lamp']}
            if spec.get('on') in ('on', 'off'): spec = dict(spec, on=spec['on'] == 'on')
            if not isinstance(spec, dict) or set(spec) - {'name', 'on', 'dur'} or spec.get('on') not in (True, False): fail(f'{where}: "lamp" is "on", "off" or {{ "name": "…", "on": true, "dur": 0.6 }} — got {js(turn["lamp"])}')
            # Người bật đèn bằng tay (lượt không lời, không động tác): đèn đổi đúng lúc tay chạm tới công tắc (~0,75 s).
            reach = turn['who'] in names and not names[turn['who']]['_pet'] and not turn.get('say') and not turn.get('do')
            lamp_ops.append({'turn': emitted[0], 'name': spec.get('name'), 'on': spec['on'], 'dur': float(spec.get('dur', 0.35 if reach else 0.6)), 'where': where, 'delay': 0.85 if reach else 0})
        # MẤT ĐIỆN / CÓ ĐIỆN (`"power": "off" | "on"`): mọi đèn và màn hình tắt phụt / bật lại (chớp) cùng lúc.
        # TRỜI CHUYỂN (`"sky": "night"` hay { "to": "night", "dur": 6 }): nắng tắt dần, phòng tối dần, tới giờ lên đèn thì đèn tự bật.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict): continue
            if 'power' in turn:
                if stage_set is None: fail(f'{where}: "power" switches every lamp of a 3D set — add "set"')
                if turn['power'] not in ('on', 'off'): fail(f'{where}: "power" is "on" or "off" — got {js(turn["power"])}')
                power_ops.append({'turn': emitted[0], 'on': turn['power'] == 'on', 'where': where})
            if 'sky' in turn:
                if stage_set is None: fail(f'{where}: "sky" changes the light of a 3D set — add "set"')
                spec = turn['sky'] if isinstance(turn['sky'], dict) else {'to': turn['sky']}
                if not isinstance(spec, dict) or set(spec) - {'to', 'dur'} or spec.get('to') not in ('day', 'evening', 'night'): fail(f'{where}: "sky" is "day", "evening", "night" or {{ "to": "night", "dur": 6 }} — got {js(turn["sky"])}')
                sky_ops.append({'turn': emitted[0], 'to': spec['to'], 'dur': float(spec.get('dur', 6))})
        # Đèn trong tay: ghi lại lượt nào rọi / soi, để moments.json hỏi đúng lúc ấy (tools/light_audit.py).
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            # PHẢN ỨNG CỦA CON VẬT (đợt 33): lượt của con vật (có `mood` hay `do`) — moments.json đo nó trong khung, và góc chèn nó ngay
            # trước đó kéo tới hết lượt này.
            if isinstance(turn, dict) and turn.get('who') in names and names[turn['who']]['_pet'] and (turn.get('mood') or turn.get('do')) and not turn.get('say'):
                gear_ops.append({'turn': emitted[0], 'kind': 'reaction', 'who': turn['who'], 'target': None})
            if not isinstance(turn, dict) or not isinstance(turn.get('do'), list): continue
            for step in turn['do']:
                # Động tác CHẠM (tay tới con vật / tới tay người kia): cho moments.json — đo bằng máy (tools/acting_check.py) và hỏi người chấm.
                if isinstance(step, list) and len(step) > 1 and step[0] in REACH_ACTIONS and step[0] != 'examine' and isinstance(step[1], str) and step[1].startswith('@'):      # khám: ghi ở dưới
                    gear_ops.append({'turn': emitted[0], 'kind': step[0], 'who': turn.get('who'), 'target': step[1][1:], **({'hold': step[2]} if step[0] in ('takeTemp', RESTRAIN) and len(step) > 2 else {}),
                                     **({'hold': step[2].get('hold', CARE_38_HOLD[step[0]][2]), 'id': step[2].get('id')} if step[0] in CARE_38 and len(step) > 2 and isinstance(step[2], dict) else {}),
                                      **({'partner': next((other.get('who') for other in (entry.get('together') or []) if isinstance(other, dict) and other is not turn and other.get('who') in names
                                                           and not names[other['who']]['_pet'] and any(isinstance(item, list) and len(item) > 1 and item[1] == step[1] for item in other.get('do') or [])), None)}
                                         if step[0] == RESTRAIN and isinstance(entry, dict) else {})})
                # HAI NGƯỜI (đợt 38 C): moments.json đo tay gặp tay, tay ôm qua người kia, tay trên vai, miệng sát tai, túi sang tay.
                if isinstance(step, list) and len(step) > 1 and step[0] in PAIR_38 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names:
                    gear_ops.append({'turn': emitted[0], 'kind': 'pair', 'name': step[0], 'who': turn.get('who'), 'target': step[1][1:]})
                # ĐẶT XUỐNG (đợt 30): con vật nào, ai đặt — người nhận đặt xuống thì nó trượt về chỗ được bế lần đầu.
                if isinstance(step, list) and len(step) > 1 and step[0] == 'carry' and isinstance(step[1], str): holding[turn.get('who')] = step[1][1:]
                # CÂN (đợt 35): con vật đứng trên bệ cân lúc đọc số; tay tới nó lúc bế lên.
                if isinstance(step, list) and len(step) > 2 and step[0] == 'weigh' and isinstance(step[1], str) and step[1].startswith('@'):
                    scale_item = next((item for item in (stage_set or {}).get('cutouts', []) if item.get('kind') == 'scale' and item.get('name') == step[2]), {})
                    options_ = step[3] if len(step) > 3 and isinstance(step[3], dict) else {}
                    gear_ops.append({'turn': emitted[0], 'kind': 'weigh', 'who': turn.get('who'), 'target': step[1][1:], 'scale': step[2], 'hold': options_.get('hold', 1.6),
                                     'reading': options_.get('reading', scale_item.get('reading')) or '4.2 kg'})
                if isinstance(step, list) and len(step) > 1 and step[0] == 'handOverPet' and isinstance(step[1], str) and turn.get('who') in holding: holding[step[1][1:]] = holding.pop(turn.get('who'))
                # ĐỘNG TÁC TAY của người (đợt 33): moments.json đo bàn tay trong khung ở lúc được hỏi.
                name = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
                if name in GESTURES and name not in TALK_39 and turn.get('who') in names and not names[turn['who']]['_pet']:      # đợt 39 C: bốn động tác người dẫn đo riêng (`talk39`)
                    gear_ops.append({'turn': emitted[0], 'kind': 'gesture', 'name': name, 'who': turn.get('who'), 'target': None})
                # NGƯỜI DẪN (đợt 39 C): giơ bảng, ra dấu kích thước, tự sướng, ngáp vươn vai — acting_check đo bảng / khe hai tay / điện thoại / tay qua đầu.
                if name in TALK_39 and turn.get('who') in names and not names[turn['who']]['_pet']:
                    args_ = step[1:] if isinstance(step, list) else []
                    gear_ops.append({'turn': emitted[0], 'kind': 'talk39', 'name': name, 'who': turn.get('who'), 'target': None,
                                     'hold': next((a for a in args_[1:2] if isinstance(a, (int, float))), None) if name in ('holdSign', 'showSize') else next((a for a in args_[:1] if isinstance(a, (int, float))), None),
                                     'size': (args_[0] if args_ else 'medium') if name == 'showSize' else None,
                                     'text': (' / '.join(args_[0]) if isinstance(args_[0], list) else str(args_[0]).replace('|', ' / ')) if name == 'holdSign' and args_ else None,
                                     'with': next((a['with'][1:] for a in args_[1:2] if isinstance(a, dict) and isinstance(a.get('with'), str)), None) if name == 'takeSelfie' else None})
                # ĐỢT 42 E — SÁT SÀN: ngồi bệt, nằm, nhặt đồ — acting_check đo mông / thân trên mặt sàn, tay tới món đồ, món đồ trong tay (`floor42e`).
                if name in FLOOR_42E and turn.get('who') in names and not names[turn['who']]['_pet']:
                    args_ = step[1:] if isinstance(step, list) else []
                    gear_ops.append({'turn': emitted[0], 'kind': 'floor42e', 'name': name, 'who': turn.get('who'), 'target': args_[0][1:] if args_ and isinstance(args_[0], str) and args_[0].startswith('@') else None,
                                     'sofa': name == 'lieDown' and bool(args_) and args_[0] == 'sofa', 'sleep': name == 'lieDown' and len(args_) > 1 and isinstance(args_[1], dict) and bool(args_[1].get('sleep')),
                                     'item': next((a.get('item') for a in args_ if isinstance(a, dict) and a.get('item')), 'toy') if name == 'pickUp' else None})
                # RỬA TAY, ĐEO / THÁO GĂNG (đợt 38 B): bọt quanh hai tay lúc xoa, găng hiện / mất đúng lúc tay kia kéo nó (acting_check `prep`).
                if name in PREP_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:
                    gear_ops.append({'turn': emitted[0], 'kind': 'prep', 'name': name, 'who': turn.get('who'), 'target': None,
                                     'hold': float(step[1]) if name == 'washHands' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], (int, float)) else 2.0})
                # ĐỢT 39 A: quầy thu ngân / cà phê một mình — moments.json đo tick / dấu đỏ / dòng nước / khăn (acting_check `desk39`).
                if name in DESK_39 and turn.get('who') in names and not names[turn['who']]['_pet'] and not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')):
                    nums = [item for item in (step[1:] if isinstance(step, list) else []) if isinstance(item, (int, float)) and not isinstance(item, bool)]
                    gear_ops.append({'turn': emitted[0], 'kind': 'desk39', 'name': name, 'who': turn.get('who'), 'target': None, 'hold': float(nums[-1]) if nums else None})
                # ĐỌC BỆNH ÁN / CHỈ PHIM (đợt 35): bìa hồ sơ trước ngực, trong khung; tay chỉ trúng điểm trên phim (acting_check).
                if name in CHART_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:
                    gear_ops.append({'turn': emitted[0], 'kind': name, 'name': name, 'who': turn.get('who'), 'target': step[1] if name == 'showXray' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) else None,
                                     'hold': float(step[1]) if name == 'readChart' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], (int, float)) else 2.0,
                                     'listener': showxray_listener(turn.get('who')) if stage_set is not None else None})
                # ĐỘNG TÁC THÚ (đợt 35): moments.json đo con vật lúc làm — trong khung, chân / lưng trên sàn, nấp, liếm.
                if name in PET_ACTS and turn.get('who') in names and names[turn['who']]['_pet']:
                    aim = step[1][1:] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None
                    gear_ops.append({'turn': emitted[0], 'kind': 'petAct', 'name': name, 'who': turn.get('who'), 'target': aim, 'carried': bool(aim and arms.get(aim) == turn.get('who')) or (name == 'struggle' and turn.get('who') in arms.values())})      # đợt 40 C: struggle trong tay người bế
                    if name == 'hide' and aim in names and stage_set is not None and float(names[aim].get('z', -300)) - float(names[turn['who']].get('z', -300)) < 60:
                        reach_notes.append(f'{where}: "{turn["who"]}" hides behind "{aim}", but stands at z {float(names[turn["who"]].get("z", -300)):g}, less than 60 further than "{aim}" (z {float(names[aim].get("z", -300)):g}) — it is drawn in front, or seems to run through the legs; give it a z 60–120 smaller')
                if step == 'putDown' and turn.get('who') in holding: gear_ops.append({'turn': emitted[0], 'kind': 'putDown', 'who': turn.get('who'), 'target': holding.pop(turn.get('who'))})
                if isinstance(step, list) and len(step) > 2 and step[0] == 'walk' and isinstance(step[1], (int, float)):
                    # Bước `walk` tường minh: ghi lại chỗ đứng mới — không thì lượt "lại gần để vuốt ve" sau đó tính từ chỗ cũ, người
                    # đứng cách con vật cả khung hình (đợt 28: tay cách con chó 29 % chiều cao người).
                    mover = names.get(turn.get('who'))
                    if mover and isinstance(step[2], (int, float)): mover['x'] = float(mover['x']) + float(step[2]) * mover['_unit']
                    gear_ops.append({'turn': emitted[0], 'kind': 'walk', 'who': turn.get('who'), 'target': None, 'dur': float(step[1])})
                # ĐỢT 42 D: chạy / nhảy / múa — chạy dời chỗ đứng (như `walk`); `["run", "@tên"]` thành quãng tới đứng cạnh người / con vật ấy.
                motion = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
                if motion in MOTION_42D and turn.get('who') in names and not names[turn['who']]['_pet']:
                    mover, aim = names[turn['who']], None
                    if motion == 'run' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str):
                        aim = step[1][1:] if step[1].startswith('@') else None
                        if aim not in names or aim == turn['who']: fail(f'{where}: ["run", "@<name>"] runs up to another character or pet of the scene — got {js(step)}')
                        other = names[aim]
                        ox = float(other['x']) + other.get('_drop', 0)
                        side = 1 if ox >= float(mover['x']) else -1
                        half = 0.12 * other['_host_height'] if other['_pet'] else 0.1 * other['_host_height']        # nửa bề ngang thân nó, chừng
                        goal = ox - side * (half + RUN_GAP_42D * 0.5 * mover['_host_height'])
                        step[1] = round((goal - float(mover['x'])) / mover['_unit'])
                        RUN_TO_42D[id(step)] = aim
                    if motion == 'run' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], (int, float)) and not isinstance(step[1], bool):
                        mover['x'] = float(mover['x']) + float(step[1]) * mover['_unit']
                    gear_ops.append({'turn': emitted[0], 'kind': 'motion42d', 'name': motion, 'who': turn.get('who'), 'target': aim})
                if isinstance(step, list) and step and step[0] in ('shine', 'examine'):
                    target = step[1][1:] if len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None
                    gear_ops.append({'turn': emitted[0], 'kind': step[0], 'who': turn.get('who'), 'target': target})
        # THẺ THÔNG BÁO trên khung (`"toast"`): gắn với lượt của chính mục này (sau các bước lại gần vừa chèn).
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'toast' not in turn: continue
            note = turn['toast'] if isinstance(turn['toast'], dict) else {'title': turn['toast']}
            if not isinstance(note, dict) or not isinstance(note.get('title', ''), str) or not isinstance(note.get('text', ''), str) or set(note) - {'title', 'text'} or not (note.get('title') or note.get('text')):
                fail(f'{where}: "toast" is a string, or {{ "title": "…", "text": "…" }} — got {js(turn["toast"])}')
            toasts.append({'turn': emitted[0], 'title': note.get('title', ''), 'text': note.get('text', '')})
        if isinstance(entry, dict) and 'together' in entry:
            if 'shot' in entry: fail(f'{where}: "shot" cannot sit on a "together" entry — put it on one of the turns inside it')
            known(where, entry, ('together', 'view', '_narr42a'))
            if not isinstance(entry['together'], list) or not (entry['together'] or entry.get('_narr42a')): fail(f'{where}: "together" must be a non-empty list of turns')
            if any(isinstance(turn, dict) and 'view' in turn for turn in entry['together']): fail(f'{where}: "view" cannot sit inside "together" — put it on the "together" entry itself (one camera for the whole group), or on a turn of its own')
            # ĐỢT 42: GÓC MÁY CHO CẢ NHÓM — lời dẫn đè lên hình (voice-over): `{ "together": [ { người nói }, { con vật diễn } ], "view": { "on": ["meo"], "size": "close" } }`
            # — máy quay vào động tác trong lúc người kia nói, không cắt sang người nói. Chỉ dạng đối tượng (không có "who" chung để hiểu "close").
            # ĐỢT 42 A: góc cận MỘT con thú, một mình, chưa khai `fill` — choán khung theo động tác nó làm trong nhóm (như góc tự động của lượt riêng): thỏ nhảy vui / chó chổng mông 0,9; mèo chui hộp 0,62…
            if isinstance(entry.get('view'), dict) and 'fill' not in entry['view'] and entry['view'].get('alone') and entry['view'].get('size') == 'close' and isinstance(entry['view'].get('on'), list) and len(entry['view']['on']) == 1:
                fill_42a = pet_fill_42a(entry)
                if fill_42a: entry['view'] = dict(entry['view'], fill=fill_42a)
            if 'view' in entry:
                if not isinstance(entry['view'], dict): fail(f'{where}: "view" on a "together" entry must be an object — {{ "on": [names], "size": "close" | "medium" | "full" }} or camera values')
                view_of(entry, where)
            emitted[0] += len(entry['together']) + len(entry.get('_narr42a', []))
            # Lời của người dẫn (đợt 42 A) chạy CÙNG LÚC với nhóm, xếp sau cùng; một mình thì là một lượt thường.
            parts_42a = [turn_code(turn, f'{where}.together[{n}]') for n, turn in enumerate(entry['together'])] + [turn_code(turn, f'{where}.narrator') for turn in entry.get('_narr42a', [])]
            turns.append((None, '{ together: [' + ', '.join(parts_42a) + '] }' if len(parts_42a) > 1 else parts_42a[0]))
        else:
            code = turn_code(entry, where)
            # GÓC CẬN CON VẬT tự động (đợt 35, lượt ba): lượt riêng của con vật làm một động tác của nó (lăn ngửa, đuổi đuôi, nhào, gặm,
            # liếm) mà kịch bản không cho "view": cắt sang góc cận nó suốt lượt rồi trở lại. Liếm mặt người đang bế: góc cận người ấy.
            acts = [step if isinstance(step, str) else step[0] for step in entry.get('do') or [] if isinstance(step, (str, list)) and step]
            # ĐỢT 42 E: lượt NGỒI BỆT / NẰM XUỐNG của một người mà kịch bản không cho "view": góc toàn người ấy suốt lượt — góc trung đặt theo dáng
            # đứng lúc đầu lượt thì người vừa ngồi / nằm xuống tụt ra mép dưới khung (chỉ còn cái đầu).
            if stage_set is not None and 'view' not in entry and not names[entry['who']]['_pet'] and any(name in ('sitOnFloor', 'lieDown') for name in acts):
                entry['view'] = {'on': [entry['who']], 'size': 'full'}
            if stage_set is not None and 'view' not in entry and names[entry['who']]['_pet'] and any(name in PET_CLOSE for name in acts):
                carrier_40 = next((who for who, held in arms.items() if held == entry['who']), None) if 'struggle' in acts else None          # đợt 40 C: vùng vẫy trong tay — máy đặt tay vào ngực người bế (con vật nằm trong vòng tay: `on` con vật không dựng được góc), thấy cả hai tay đang giữ
                licked_face = [step for step in entry.get('do') if isinstance(step, list) and step[0] == 'lick' and len(step) > 1 and isinstance(step[1], str) and arms.get(step[1][1:]) == entry['who']]
                entry['view'] = ({'x': round(float(names[carrier_40]['x'])), 'y': round(170 * names[carrier_40]['_unit']), 'z': round(float(names[carrier_40].get('z', -300))), 'zoom': 1.9, 'dur': 0.3} if carrier_40 else {'on': [licked_face[0][1][1:]], 'size': 'medium', 'alone': True, 'back': True} if licked_face
                                 else {'on': [entry['who']], 'size': 'close', 'alone': True, 'fill': PET_FILL_40.get(next((name for name in acts if name in PET_FILL_40), ''), 0.94 if 'leanOnLeg' in acts else 0.88 if ('tugOfWar' in acts or 'leanOnLeg' in acts or ('carryToy' in acts and any(isinstance(st, list) and st and st[0] == 'carryToy' and len(st) > 1 and isinstance(st[1], str) for st in entry.get('do') or []))) else 0.9 if ('playBow' in acts or 'dig' in acts or 'carryToy' in acts) else 0.74 if 'rollOver' in acts else 0.7 if ('chaseTail' in acts or 'bark' in acts) else 0.66 if 'lick' in acts else PET_CLOSE_FILL), 'back': True})      # nằm ngửa: thấp, chặt hơn
            view_of(entry, where)
            if stage_set is not None and 'shot' in entry: fail(f'{where}: "shot" frames the 2D camera — in a 3D set move the camera with "view" instead')
            # Lượt KHÔNG LỜI có `["stroke", "@con vật"]`: con vật đáp lại cùng lúc — mèo gừ gừ, chó vẫy đuôi. Muốn khác thì
            # tự viết `together`.
            stroked = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'stroke' and isinstance(step[1], str) and step[1].startswith('@')]
            pets = [name for name in stroked if name in names and names[name]['_pet']]
            if pets and 'say' not in entry and code.startswith('['):
                pet = names[pets[0]]
                # Mèo: mọi giống mèo (calico không có chữ "cat" — đợt 28: mèo tam thể vẫy đuôi như chó).
                code = '{ together: [' + code + f", [{pet['name']}, {js('purr' if 'cat' in pet['species'] or pet['species'] in CAT_BREEDS else 'wagTail')}]] }}"
                emitted[0] += 1
            # `["handshake", "@người kia"]` một mình: người kia BẮT TAY LẠI cùng lúc — rig chỉ tính điểm gặp khi cả hai cùng
            # đưa tay; một bên đưa thì tay chỉ tới bụng, tay người kia buông thõng (đợt 28: hai bàn tay cách 26 % chiều cao).
            shaken = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'handshake' and isinstance(step[1], str) and step[1].startswith('@')]
            shaken = [name for name in shaken if name in names and not names[name]['_pet'] and name != entry.get('who')]
            if shaken and not pets and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
                code = '{ together: [' + code + f", [{names[shaken[0]]['name']}, [\"handshake\", {names[entry['who']]['name']}]]] }}"
                emitted[0] += 1
            # `["handOver", "@người kia"]` / `["handOverPet", "@người kia"]` một mình: người kia NHẬN cùng lúc (`take` — nếu họ có
            # món đồ đang cất, `"holdsHidden": true` —, `takePet`). Không thì món đồ / con vật trôi vào khoảng không: `handOverPet`
            # một mình làm hỏng cả cảnh (`putDown` sau đó báo "không bế con vật nào") (đợt 29).
            given = [(step[0], step[1][1:]) for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] in ('handOver', 'handOverPet') and isinstance(step[1], str) and step[1].startswith('@')]
            given = [(kind, name) for kind, name in given if name in names and not names[name]['_pet'] and name != entry.get('who') and (kind == 'handOverPet' or (names[name].get('holds') and names[name].get('holdsHidden')))]
            for step in entry.get('do', []):
                if isinstance(step, list) and len(step) > 1 and step[0] == 'carry' and isinstance(step[1], str) and step[1][1:] in names: arms[entry['who']] = step[1][1:]
                if step == 'putDown': arms.pop(entry['who'], None)          # đặt xuống rồi: không còn bế (đợt 35 — liếm mặt / liếm tay)
            if given and not pets and not shaken and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
                kind, name = given[0]
                # NHẬN CON VẬT: báo chỗ nó đứng lúc được bế (đơn vị khung của nó, như `set.target(…, { at })`) — lúc dựng, trạng thái
                # con vật đã về khung 0, mà người nhận đặt nó xuống cạnh chân mình tính từ chỗ ấy (đợt 30: con chó đã đi tới ông ngồi
                # ghế đá thì bị đặt ra ngoài khung).
                held = arms.pop(entry['who'], None) if kind == 'handOverPet' else None
                extra = ''
                if held:
                    arms[name] = held
                    pet = names[held]
                    walked = (float(pet['x']) - float(pet['_x0'])) / pet['_unit'] if pet.get('_unit') and pet.get('_x0') is not None else 0
                    extra = f", {{ petAt: {round(walked, 1):g} }}"
                    # CHỖ NGƯỜI NHẬN SẼ ĐẶT NÓ XUỐNG — tính đúng như rig (`takePet`): cạnh chân người nhận, phía không có người trao,
                    # cách 60 đơn vị khung người + 1/4 bề ngang khung con vật. Lượt sau với tới / đi tới con vật tính từ chỗ ấy
                    # (đợt 30: tính từ chỗ cũ thì bé bước sang tận ghế đá để vuốt con chó đang nằm cạnh chân mình).
                    giver, taker = names[entry['who']], names[name]
                    side = -1 if float(giver['x']) > float(taker['x']) else 1
                    pet['_drop'] = float(taker['x']) + side * (60 * taker['_unit'] + 100 * pet['_unit']) - float(pet['x'])
                code = '{ together: [' + code + f", [{names[name]['name']}, [{js('take' if kind == 'handOver' else 'takePet')}, {names[entry['who']]['name']}{extra}]]] }}"
                emitted[0] += 1
            # HAI NGƯỜI (đợt 38 C): `["highFive" | "hug" | "patShoulder" | "whisper" | "handOverBag", "@người kia"]` một mình — người kia làm
            # phần của mình CÙNG LÚC (đập tay lại, ôm lại, nhìn lại người vỗ vai, nghiêng tai nghe, nhận túi). Một bên làm thì tay vươn vào
            # khoảng không — như bắt tay (đợt 28).
            paired = [(step[0], step[1][1:]) for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] in PAIR_38 and isinstance(step[1], str) and step[1].startswith('@')]
            paired = [(kind, name) for kind, name in paired if name in names and not names[name]['_pet'] and name != entry.get('who')]
            if paired and not pets and not shaken and not given and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
                kind, name = paired[0]
                me = names[entry['who']]['name']
                if PAIR_38[kind] == 'lookAt':
                    look = f"set.target({name}, {me}, 'head')" if stage_set is not None else me
                    part = f"['lookAt', {look}, {{ hold: 2.6, up: 1.5 }}]"
                else: part = f"[{js(PAIR_38[kind])}, {me}]"
                code = '{ together: [' + code + f", [{names[name]['name']}, {part}]] }}"
                emitted[0] += 1
            # ĐỢT 39 C: `["takeSelfie", hold, { "with": "@người / con vật" }]` một mình: người kia làm phần của mình CÙNG LÚC — người: `joinSelfie`
            # (nghiêng đầu về phía máy, cười, chữ V); con vật: nghiêng đầu tò mò (`tiltHead`).
            selfie = [step for step in entry.get('do', []) if isinstance(step, list) and step and step[0] == 'takeSelfie' and len(step) > 2 and isinstance(step[2], dict) and isinstance(step[2].get('with'), str)]
            if selfie and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1 and selfie[0][2]['with'][1:] in names:
                mate, me = names[selfie[0][2]['with'][1:]], names[entry['who']]['name']
                if mate['_pet']:
                    part = "['tiltHead']"
                else: part = f"['joinSelfie', {me}, {js(selfie[0][1] if isinstance(selfie[0][1], (int, float)) else 1.6)}]"
                code = '{ together: [' + code + f", [{mate['name']}, {part}]] }}"
                emitted[0] += 1
            # `["giveTreat", "@con vật"]` một mình: con vật NHAI miếng bánh / viên thuốc vừa đớp — đúng lúc nó biến khỏi tay
            # người (~1 s sau khi bước bắt đầu). Không thì bánh biến mất mà không ai ăn (Gemini soát cảnh thử đợt 13).
            fed = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'giveTreat' and isinstance(step[1], str) and step[1].startswith('@')]
            fed = [name for name in fed if name in names and names[name]['_pet']]
            if fed and not pets and 'say' not in entry and code.startswith('['):
                lead = sum(1 for step in entry.get('do', []) if not (isinstance(step, list) and step and step[0] == 'giveTreat'))
                if lead == 0:
                    code = '{ together: [' + code + f", [{names[fed[0]]['name']}, 0.95, ['chew', 3]]] }}"
                    emitted[0] += 1
            # `["givePill", "@con vật"]` một mình (đợt 35): con vật HÁ MIỆNG từ ~0,45 s (há hẳn ~0,75 s, giữ tới ~1,85 s — ≥ 0,8 s quanh lúc
            # viên thuốc vào môi 1,0 s, mất 1,15 s), rồi NHAI 3 nhịp. Đợt 36, lượt hai: tay đỡ của người nâng lên cằm thật lúc miệng khép
            # (`RigSVG.PILL_SHUT` = 1,6 s của bước người).
            pilled = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'givePill' and isinstance(step[1], str) and step[1].startswith('@')]
            pilled = [name for name in pilled if name in names and names[name]['_pet']]
            if pilled and not fed and not pets and 'say' not in entry and code.startswith('[') and all(isinstance(step, list) and step and step[0] == 'givePill' for step in entry.get('do', [])):
                code = '{ together: [' + code + f", [{names[pilled[0]]['name']}, 0.35, ['openMouth', 1.1], ['chew', 3]]] }}"
                emitted[0] += 1
            # ĐỢT 42 F — `["bathPet", "@con vật"]`: người đứng lùi ra `BATH_BACK_42F` đơn vị khung sau bước ấy (con vật rũ nước theo kênh của người — không ghép bước).
            bathed = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'bathPet' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']]
            if bathed and not names[entry['who']]['_pet']:
                bather, tub_pet = names[entry['who']], names[bathed[0][1][1:]]
                bather['x'] = float(bather['x']) - (1 if float(tub_pet['x']) + tub_pet.get('_drop', 0) >= float(bather['x']) else -1) * BATH_BACK_42F * bather['_unit']
            # `["lick", "@người"]` một mình (đợt 35): người ấy CHÌA TAY ra trước mõm cùng lúc (`offerHand`) — không thì con vật liếm
            # không khí. Đang bế con vật thì thôi: nó liếm mặt người bế. Bối cảnh 3D, người đứng, con vật dưới sàn: quỳ xuống trước.
            # đợt 40 C — `struggle` khi đang được bế: báo cho rig ({ carried: true }) — lúc dựng bước, hình con vật có thể chưa nằm trong tay.
            if names[entry['who']]['_pet'] and any(step == 'struggle' or (isinstance(step, list) and step and step[0] == 'struggle' and len(step) < 3) for step in entry.get('do', [])) and entry['who'] in arms.values():
                for step in entry['do']:
                    if step == 'struggle' or (isinstance(step, list) and step and step[0] == 'struggle' and len(step) < 3):
                        code = code.replace(step_code(step, where, entry['who']), step_code(['struggle', step[1] if isinstance(step, list) and len(step) > 1 else 1.6, {'carried': True}], where, entry['who']), 1)
            licked = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'lick' and isinstance(step[1], str) and step[1].startswith('@')]
            if licked and names[entry['who']]['_pet']:
                person = names.get(licked[0][1][1:])
                if not person or person['_pet']: fail(f'{where}: "lick" licks a person — "{licked[0][1]}" is not a person in the scene')
            if licked and names[entry['who']]['_pet'] and arms.get(licked[0][1][1:]) == entry['who'] and len(licked[0]) < 4:
                # Trong vòng tay người ấy: liếm MẶT — báo cho rig (lúc dựng bước, hình con vật có thể chưa nằm trong tay).
                times = licked[0][2] if len(licked[0]) > 2 else 5          # đợt 40 C: 4 → 5 cái liếm
                code = code.replace(step_code(licked[0], where, entry['who']), step_code(licked[0][:2] + [times, {'face': True}], where, entry['who']), 1)
                # Người bế GHÉ MÁ xuống cho nó liếm cùng lúc (đợt 35, lượt hai: mèo trong tay rướn cổ mà không tới mặt).
                if 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
                    code = '{ together: [' + code + f", [{names[licked[0][1][1:]]['name']}, ['offerCheek', {round(0.6 + times * LICK_BEAT_40, 2)}]]] }}"
                    emitted[0] += 1
            if licked and names[entry['who']]['_pet'] and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
                person = names.get(licked[0][1][1:])
                if arms.get(person['name']) != entry['who']:
                    times = licked[0][2] if len(licked[0]) > 2 and isinstance(licked[0][2], (int, float)) else 5
                    low = stage_set is not None and not person.get('seated') and not names[entry['who']].get('on')      # lượt bốn: quỳ xuống ngang mõm con vật (chồm lên thì lơ lửng)
                    hand = step_code(['offerHand', '@' + entry['who'], round(0.9 + times * LICK_BEAT_40, 2)], where, person['name'])
                    lead = 0.65 if low else 0.6          # lượt bốn: bàn tay tới trước mõm rồi con vật mới liếm (tay không bật ra giữa lúc liếm)
                    pet_code = code if not lead else code.replace(f"[{names[entry['who']]['name']}, ", f"[{names[entry['who']]['name']}, {lead}, ", 1)
                    code = '{ together: [' + pet_code + f", [{person['name']}, " + ("'kneel', " if low else '') + hand + (", 'standUp'" if low else '') + ']] }'
                    gear_ops.append({'turn': emitted[0] + 1, 'kind': 'offerHand', 'who': person['name'], 'target': entry['who']})
                    emitted[0] += 1
            # ĐỢT 40 A — `["tugOfWar", "@người"]` một mình: người ấy giữ đầu kia sợi dây cùng lúc (`pullToy`); lỗi rõ khi đích không phải người.
            tugged = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] in ('tugOfWar', 'leanOnLeg') and isinstance(step[1], str)] if isinstance(entry, dict) and isinstance(entry.get('do'), list) else []
            for step in tugged:
                if not names[entry['who']]['_pet']: fail(f'{where}: "{step[0]}" is a dog\'s action — "{entry["who"]}" is a person')
                person = names.get(step[1][1:]) if step[1].startswith('@') else None
                if not person or person['_pet']: fail(f'{where}: "{step[0]}" needs a person: ["{step[0]}", "@<person name>"] — got {js(step)}')
                if stage_set is not None and abs(float(person.get('z', -300)) - float(names[entry['who']].get('z', -300))) > 60:
                    reach_notes.append(f'{where}: "{entry["who"]}" does "{step[0]}" with "{step[1][1:]}", which stands at z {float(person.get("z", -300)):g} — {abs(float(person.get("z", -300)) - float(names[entry["who"]].get("z", -300))):g} units nearer or further than the dog (z {float(names[entry["who"]].get("z", -300)):g}); the dog and the person are drawn in separate planes: give them the same z (within 60)')
            if tugged and tugged[0][0] == 'tugOfWar' and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
                person = names[tugged[0][1][1:]]
                hold = tugged[0][2] if len(tugged[0]) > 2 and isinstance(tugged[0][2], (int, float)) and not isinstance(tugged[0][2], bool) else 2.4
                code = '{ together: [' + code + f", [{person['name']}, ['pullToy', {names[entry['who']]['name']}, {js(hold)}]]] }}"
                emitted[0] += 1
            turns.append((None, code))
            emitted[0] += 1
        for pet, who in turned_back:
            turns.append((f'  // {pet["name"]} turns back to {who["name"]}', f"[{pet['name']}, ['face', {who['name']}]]"))
            emitted[0] += 1
        # ĐEO LOA XONG (đợt 36 — Gemini: "đầu / tay bác sĩ che nửa con mèo và cái vòng" sau khi đeo): lùi ra một bước nhỏ khỏi con vật,
        # tay ở dáng nghỉ không còn vắt qua nó và cái loa thấy trọn.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or turn.get('who') not in names or names[turn['who']]['_pet'] or names[turn['who']].get('seated'): continue
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if isinstance(step, list) and len(step) > 1 and step[0] == 'putCone' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']:
                    who, pet = names[turn['who']], names[step[1][1:]]
                    backs.append((who, (1 if float(who['x']) >= float(pet['x']) else -1) * CONE_BACK * who['_host_height']))
        for who, move in backs:
            turns.append((f'  // {who["name"]} steps back after reaching close', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move
        if director:
            beat = beat_of(entry, first_turn, emitted[0] - 1)
            # Nhịp có người ĐI (walk): đổi góc sớm như nhịp có lời — giữ góc cũ đủ 2,5 s thì người đi ra khỏi khung, còn nửa cái
            # đầu ở mép (cảnh thử đợt 24).
            group = entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
            if any(isinstance(step, list) and step and step[0] == 'walk' for turn in group if isinstance(turn, dict) for step in (turn.get('do') or [])): beat['move'] = True
            # ĐỢT 42 D: chạy / nhảy / múa — góc TOÀN (cả người, bàn chân), đo cả ở đỉnh cú nhảy; chạy là nhịp có người đi, chạy tới ai thì lấy cả người ấy.
            moving = [(turn, step) for turn in group if isinstance(turn, dict) and turn.get('who') in names and not names[turn['who']]['_pet']
                      for step in (turn.get('do') or []) if (step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in MOTION_42D]
            if moving and beat.get('subjects') and not beat.get('fixed'):
                beat['size'] = 'full'; beat['body42d'] = True
                beat.pop('mid', None)
                beat['move'] = True             # như nhịp có người đi: đổi góc sau 1 s (không giữ góc cũ 2,5 s — cú nhảy đầu tiên lọt ra ngoài góc cận trước)
                for turn, step in moving:
                    for name in [names[turn['who']]['name']] + ([names[RUN_TO_42D[id(step)]]['name']] if isinstance(step, list) and id(step) in RUN_TO_42D else []):
                        if name not in beat['subjects']: beat['subjects'].append(name)
            # ĐỢT 44 B: NHẶT ĐỒ dưới sàn (`pickUp` không nhắm con vật — món đồ chơi): góc TOÀN người ấy, đổi góc sau 1 s và CẮT thẳng (không lia)
            # — góc trung của câu nói trước còn giữ lúc cúi nhặt thì món đồ ở ngoài đáy khung (`tidyToys` phải tự cho "view" góc toàn).
            picks_44b = [turn for turn in group if isinstance(turn, dict) and turn.get('who') in names and not names[turn['who']]['_pet']
                         and any(step == 'pickUp' or (isinstance(step, list) and step and step[0] == 'pickUp' and not (len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@'))) for step in (turn.get('do') or []))]
            if picks_44b and beat.get('subjects') and not beat.get('fixed'):
                beat['size'] = 'full'; beat['floor44b'] = True
                beat.pop('mid', None)
            beats.append(beat)

    camera_notes = []
    # Máy quay vòng tới đâu thì người nhìn sang ngang được tới đó, không xa hơn: rig xoay tới nghiêng hẳn là hết (không
    # có mặt sau). Báo những góc máy làm một nhân vật đang nhìn người kia bị đẩy quá dáng nghiêng.
    if stage_set is not None:
        yaw = float(stage_set.get('camera', {}).get('yaw', 0))
        for view in views:
            yaw = float(view['values'].get('yaw', yaw))
            for who in names.values():
                if who['_pet'] or not who.get('faces'): continue
                toward = -0.55 if float(names[who['faces']]['x']) < float(who['x']) else 0.55
                if abs(toward - yaw / 90) > 1.0 + 1e-6:
                    low, high = max(-YAW_LIMIT, round(90 * (toward - 1))), min(YAW_LIMIT, round(90 * (toward + 1)))
                    camera_notes.append(f'{view["where"]}: with the camera at yaw {yaw:g}°, "{who["name"]}" (facing {who["faces"]}) would have to turn past full profile — it stops at profile. Keep yaw between {low} and {high}° for this shot, or cut to the other side')

    # ── đạo cụ ──
    props = []
    for index, prop in enumerate(scene.get('props', [])):
        if not isinstance(prop, dict) or prop.get('kind') not in ('chair', 'stool', 'table', 'counter', 'paystand') + FLOOR_KINDS or 'x' not in prop: fail(f'props[{index}] needs "kind" (chair, stool, table, counter, bowl, scale, carrier, tree, lamp, scooter) and "x"')
        if 'facing' in prop and (prop['kind'] != 'scooter' or prop['facing'] not in ('right', 'left')): fail(f'props[{index}].facing must be "right" or "left" (scooter only)')
        if 'fill' in prop and (prop['kind'] != 'bowl' or prop['fill'] not in ('food', 'water', 'empty')): fail(f'props[{index}].fill must be "food", "water" or "empty" (bowl only)')
        if 'reading' in prop and (prop['kind'] != 'scale' or not isinstance(prop['reading'], str)): fail(f'props[{index}].reading is the text on a scale\'s display, such as "4.2 kg" (scale only)')
        known(f'props[{index}]', prop, PROP_KEYS)
        host_height = float(prop.get('height', person_default))
        props.append({'element': f'prop-{index + 1}-{prop["kind"]}', 'kind': prop['kind'], 'left': float(prop['x']) - host_height * PERSON[0] / PERSON[1] / 2, 'host_height': host_height,
                      'front': bool(prop.get('front')), 'options': {key: prop[key] for key in ('color', 'width', 'tabletop', 'back', 'fill', 'reading', 'door', 'facing') if key in prop}})
    for who in names.values():                              # ghế của người ngồi: cùng chỗ, cùng cỡ với người ấy
        if who.get('seated') in ('chair', 'stool'):
            who['_seat'] = {'element': f'{who["_element"]}-{who["seated"]}', 'kind': who['seated'], 'left': who['_left'] + (who['_walk'] * who['_unit']), 'host_height': who['_host_height']}

    # ── người NGỒI sau một đạo cụ "front" cao quá ngực thì chỉ còn thấy cái đầu: báo trước ──
    notes = list(camera_notes) + reach_notes + pace_notes
    for prop in props:
        if not prop['front'] or prop['kind'] not in ('counter', 'table'): continue
        unit = prop['host_height'] / PERSON[1]
        top = (12 + float(prop['options'].get('tabletop', 150))) * unit                                   # mặt quầy cao bao nhiêu px so với sàn
        centre = prop['left'] + prop['host_height'] * PERSON[0] / PERSON[1] / 2
        half = float(prop['options'].get('width', 300 if prop['kind'] == 'counter' else 230)) * unit / 2
        for who in names.values():
            if who['_pet'] or not who.get('seated') or abs(float(who['x']) - centre) > half: continue
            if top > 0.33 * who['_host_height']:
                fits = max(40, round(0.28 * who['_host_height'] / unit - 12))
                notes.append(f'"{who["name"]}" sits behind the {prop["kind"]} at x {centre:.0f}, which is taller than their chest — only the head will show. Lower it with "tabletop": {fits} (now {prop["options"].get("tabletop", 150)}), or let them stand.')

    # Con vật đứng TRONG bề ngang của bàn / quầy: nó nằm dưới gầm bàn, chân bàn (hoặc cả cái quầy) che mất một phần.
    for prop in props:
        if prop['kind'] not in ('counter', 'table'): continue
        unit = prop['host_height'] / PERSON[1]
        centre = prop['left'] + prop['host_height'] * PERSON[0] / PERSON[1] / 2
        half = float(prop['options'].get('width', 300 if prop['kind'] == 'counter' else 230)) * unit / 2
        for who in names.values():
            if not who['_pet']: continue
            body = 0.3 * who['_host_height']                                                               # nửa bề ngang thân con vật
            if abs(float(who['x']) - centre) >= half + body: continue
            side = 'left' if float(who['x']) < centre else 'right'
            clear = round(centre - half - body - 20) if side == 'left' else round(centre + half + body + 20)
            notes.append(f'"{who["name"]}" stands at x {float(who["x"]):.0f}, inside the {prop["kind"]} (x {centre - half:.0f}–{centre + half:.0f}) — the {prop["kind"]} will overlap it. Move it to x {clear} or further {side}.')

    # ── không ghi đè bản đã SỬA TAY ──
    target = os.path.join(out, 'index.html')
    if os.path.exists(target) and not args.force:
        existing = open(target, encoding='utf-8').read()
        mark = re.search(r'<!-- scene\.py:([0-9a-f]{16}) -->', existing)
        if not mark:
            fail(f'{target} exists and was not written by this tool — choose another folder with -o, or pass --force to replace it')
        if fingerprint(existing) != mark.group(1):
            fail(f'{target} has been edited by hand since this tool wrote it; running again would discard those edits.\n'
                 '  Keep the edits: change that file directly from now on.  Discard them: run again with --force.')

    # ── ghi tệp ──
    os.makedirs(out, exist_ok=True)
    bundle = os.path.join(ROOT, 'dist', 'character.slim.js')
    if not os.path.isfile(bundle): fail('dist/character.slim.js is missing — run python3 tools/build.py first')
    shutil.copy(bundle, os.path.join(out, 'character.slim.js'))
    # GSAP GHIM PHIÊN BẢN, chép cạnh composition (vendor/): nạp từ CDN `gsap@3` thì CI đỏ khi mạng chập chờn (đợt 26) và
    # GSAP lên bản mới là cùng một cảnh render ra khác. Render được cả khi không có mạng.
    shutil.copy(os.path.join(ROOT, 'vendor', GSAP_FILE), os.path.join(out, 'gsap.min.js'))
    for voice in voices:
        if os.path.abspath(voice['source']) != os.path.abspath(os.path.join(out, voice['file'])): shutil.copy(voice['source'], os.path.join(out, voice['file']))
        done = subprocess.run([sys.executable, os.path.join(HERE, 'cues.py'), os.path.join(out, voice['file']), '--js', '--name', voice['key'], '--text', voice['text'],
                               '--method', args.cues, '-o', os.path.join(out, voice['key'] + '.cues.js')], capture_output=True, text=True)
        if done.returncode != 0: fail(f'could not make mouth cues for {voice["file"]}: {done.stderr.strip()}')
        voice['length'] = float(re.search(r'([\d.]+) s,', done.stdout).group(1))

    preset = scene.get('background', {}).get('preset')
    if preset is not None and preset not in PRESETS: fail(f'background.preset must be one of {", ".join(PRESETS)} — got {js(preset)}')
    if preset and scene.get('background', {}).get('image'): fail('background: give "preset" or "image", not both')
    background = dict({'wall': '#1f4a5c', 'wallDark': '#0c1c26', 'floor': '#0f2a38', 'floorHeight': round(height * (0.176 if width >= height else 0.26 if scene.get('layout') == 'presenter' else 0.34))}, **scene.get('background', {}))        # khung dọc: nền đứng cao hơn, vì phần đáy bị giao diện ứng dụng che
    ground = round(background['floorHeight'] * 0.5)         # bàn chân đứng ở giữa dải sàn
    layers, style, body, setup = [], [], [], []
    track = [0]

    def clip(element, css, tag='div', extra=''):
        style.append(f'  #{element} {{ {css} }}')
        body.append(f'  <{tag} id="{element}" class="clip" data-start="0" data-duration="__TOTAL__" data-track-index="{track[0]}"{extra}></{tag}>')
        track[0] += 1

    # Nền: một ẢNH phủ kín khung (thì không vẽ dải sàn đè lên, trừ khi kịch bản khai màu sàn), hoặc tường + sàn màu trơn.
    picture = scene.get('background', {}).get('image')
    if stage_set is not None:
        # BỐI CẢNH 3D: một clip `view` phủ kín khung; phòng, đồ vật và host của nhân vật do `createSet` dựng bên trong nó.
        clip('view', f'position: absolute; inset: 0; background: {stage_set.get("sky", "linear-gradient(#cfe3ea, #e9f1f3)")};')
        room = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))
        half, front, back = room['width'] / 2, room['front'], room['front'] - room['depth']
        floor = (f"conic-gradient({room['floor']} 25%, {room['floor2']} 0 50%, {room['floor']} 0 75%, {room['floor2']} 0) 0 0 / {room['tile']}px {room['tile']}px"
                 if room.get('tile') and room.get('floor2') else room['floor'])
        # Khung DỌC: hẹp ngang, nên máy quay vào gần hơn (người cao ~45% khung) và điểm ngắm hạ xuống 62% chiều cao — phụ
        # đề nằm ở mép trên vùng an toàn, phía trên đầu nhân vật.
        portrait = width < height
        start = dict({'yaw': 0, 'pitch': 6, 'distance': 1300 if portrait else 1750, 'x': 0, 'y': round(room['height'] * 0.43), 'z': round((front + back) / 2 + room['depth'] * 0.08)}, **stage_set.get('camera', {}))
        origin = f", origin: {js(stage_set['origin'])}" if stage_set.get('origin') else (f", origin: [{width // 2}, {round(height * 0.62)}]" if portrait else '')
        setup.append(f"    // The 3D set: a room of flat planes; the characters stay 2D and always face the lens (references/hyperframes.md, \"3D sets\").")
        setup.append(f"    const set = VGCharacter.createSet($('view'), {{ camera: {js(start)}{origin} }});")
        setup.append("    window.__set = set;                                   // tools/acting_check.py đo diễn xuất qua set.actingProbe()")
        # Sàn kéo dài thêm 1500 đơn vị về phía máy quay (ra ngoài mép trước của phòng): ở cảnh toàn, nhất là khung dọc, máy
        # quay lùi xa và nhìn thấy cả khoảng trước phòng — không có sàn ở đó là một dải trống dưới đáy khung.
        setup.append(f"    set.floor({{ x: [{-half:g}, {half:g}], z: [{back:g}, {front + 1500:g}], style: {js('background:' + floor)} }});")
        setup.append(f"    set.wall({{ from: [{-half:g}, {back:g}], to: [{half:g}, {back:g}], height: {room['height']:g}, style: {js('background:' + room['wall'])} }});")
        setup.append(f"    set.wall({{ from: [{-half:g}, {front:g}], to: [{-half:g}, {back:g}], height: {room['height']:g}, style: {js('background:' + room['sideWall'])} }});")
        setup.append(f"    set.wall({{ from: [{half:g}, {back:g}], to: [{half:g}, {front:g}], height: {room['height']:g}, style: {js('background:' + room['sideWall'])} }});")
        windows = []                                        # ô cửa trên tường sau — hắt nắng (set.light)
        for item in stage_set.get('panels', []):
            side = item.get('wall', 'back')
            look = f"background:{item.get('color', '#9fd0e6')};border:{item.get('border', '12px solid #f4f7f8')};box-sizing:border-box"
            # Cửa sổ: ô kính SÁNG (nguồn của vệt nắng) — sáng hơn tường, quầng sáng tràn ra mép.
            if item.get('window'): look += ";box-shadow:0 0 60px 10px rgba(255,250,232,.55), inset 0 0 40px rgba(255,255,255,.7)"
            if item.get('image'):
                # Ảnh trên tấm (màn hình TV, poster, phim X-quang, biển tên): lấp đầy tấm, cắt phần thừa.
                name = copy_asset(base, out, item['image'], copied)
                look += f";background-image:url('{name}');background-size:cover;background-position:center"
            at, turn = (([item['at'], item['y'], back + 1], 0) if side == 'back' else ([-half + 1, item['y'], item['at']], 90) if side == 'left' else ([half - 1, item['y'], item['at'] - item['width']], -90))
            if item.get('window'):
                if side != 'back': fail('set.panels: "window": true works on the back wall (the sunlight falls into the room toward the camera)')
                windows.append({'x': item['at'], 'y': item['y'], 'width': item['width'], 'height': item['height'], 'z': back + 1})
            setup.append(f"    set.panel({{ at: {js(at)}, size: [{item['width']:g}, {item['height']:g}], turn: {turn}, style: {js(look)} }});")
        for n, item in enumerate(stage_set.get('boxes', [])):
            colour = item.get('color', '#8fb3bf')
            tone = {'top': item.get('top', '#f1f4f5'), 'front': colour, 'side': item.get('side', colour)}
            numbers = ', '.join(f"{key}: {item[key]:g}" for key in ('x', 'z', 'width', 'depth', 'height', 'y') if key in item)
            setup.append(f"    const box{n + 1} = set.box({{ {numbers}, colors: {js(tone)}" + (f", name: {js(item['name'])}" if item.get('name') else '') + " });")
        riders = {who['rides']: who for who in names.values() if who.get('rides')}
        for n, item in enumerate(stage_set.get('cutouts', [])):
            # Tấm hình phẳng đứng trong phòng (đạo cụ vẽ sẵn hay ảnh) — đặt sát máy quay là có tiền cảnh.
            # Máy tính vẽ trong CÙNG khung với người (400 × 470): mặc định cao bằng người, để nó cùng tỉ lệ với nhân vật.
            tall = float(item.get('height', round(person_default * (1 if item.get('kind') in SCREEN_KINDS + FLOOR_KINDS else 0.74))))
            rider = riders.get(item.get('name')) if item.get('kind') == 'scooter' else None
            if item.get('kind') == 'scooter' and 'height' not in item:
                # Xe máy vẽ trong khung người: cùng chiều cao host với người lái (cùng đơn vị), không có người lái thì bằng
                # người mặc định của bối cảnh 3D.
                tall = rider['_host_height'] if rider else round(person_default * 0.74)
            if item.get('drive'):
                item['drive'] = dict({'dur': 3, 'ease': 'power2.out'}, **item['drive'])
                item['_n'], item['_tall'] = n + 1, tall
                if item.get('kind') == 'scooter' and 'facing' not in item: item['facing'] = 'right' if item['drive']['from'] < item['x'] else 'left'
                drives.append(item)
            if rider: rider['_scooter'] = dict(item, _n=n + 1, _tall=tall)
            start_x = dict(item, x=item['drive']['from']) if item.get('drive') else item
            where_ = ', '.join(f"{key}: {float(start_x[key]):g}" for key in ('x', 'z', 'y') if key in item) + f", height: {tall:g}" + (", shadow: false" if item.get('shadow') is False else '')
            spot = f"const cutout{n + 1}Spot = " if item.get('drive') or rider else ''
            if item.get('kind'):
                options = {'color': item.get('color')}
                if item['kind'] == 'paystand': options['on'] = 0            # đợt 39 A: đứng trên mặt quầy (`y` của cutout), không trên sàn khung
                if item['kind'] in SCREEN_KINDS:
                    # Đứng trên mặt hộp (`y`) hay trên sàn: đạo cụ tự đặt ở sàn khung của nó (on: 0), cutout lo phần nâng.
                    options['on'] = 0
                    if item.get('facing'): options['facing'] = item['facing']
                    if item.get('screen'):
                        name = copy_asset(base, out, item['screen'], copied)
                        options['image'] = name
                for key in ('fill', 'reading', 'door', 'spot'):
                    if key in item: options[key] = item[key]
                # Cân có người cân con vật trên nó: số 0 cho tới lúc con vật đứng lên (rig `weigh` ghi số — đợt 35, lượt ba).
                if item.get('_weighed'): options['reading'] = re.sub(r'\d+(?:([.,])\d+)?', lambda m: '0' + m.group(1) + '0' if m.group(1) else '0', str(item['_weighed']), count=1)
                if item['kind'] == 'xray' and item.get('screen'): options['image'] = copy_asset(base, out, item['screen'], copied)
                if item['kind'] == 'scooter' and item.get('facing'): options['facing'] = item['facing']
                options = {key: value for key, value in options.items() if value is not None}
                look = f", {js(options)}" if options else ''
                setup.append(f"    const cutout{n + 1} = document.createElement('div'), cutout{n + 1}Prop = VGCharacter.createProp(cutout{n + 1}, {js(item['kind'])}{look}); {spot}set.stand(cutout{n + 1}, {{ {where_} }});" + (f"          // {item['name']}" if item.get('name') else ''))
            else:
                name = copy_asset(base, out, item['image'], copied)
                # Kích thước ảnh ghi sẵn: set.stand đo phần tử để căn giữa và đặt chân — ảnh chưa tải xong thì rộng 0, nên khung
                # hình chụp lúc ấy lệch nửa bề ngang (trình render chụp ngay, không đợi khung sau).
                size = image_size(os.path.join(out, name))
                dims = f" cutout{n + 1}.width = {size[0]}; cutout{n + 1}.height = {size[1]};" if size else ''
                if not size: notes.append(f'set.cutouts[{n}]: could not read the size of {name} — give it a PNG, JPEG, GIF, WebP or an SVG with width / height or a viewBox, or it may be placed off by half its width until it loads')
                setup.append(f"    const cutout{n + 1} = document.createElement('img'); cutout{n + 1}.src = {js(name)}; cutout{n + 1}.alt = '';{dims} {spot}set.stand(cutout{n + 1}, {{ {where_} }});")
        # ÁNH SÁNG: giờ trong ngày + đèn. Cây đèn đường / đèn cây có trong bối cảnh (cutout "lamp") tự là một nguồn sáng ở
        # chỗ bóng đèn của nó (554 / 470 chiều cao khung); "lamps" thêm đèn tuỳ ý (đèn trần: "kind": "ceiling").
        lamps = [dict(item) for item in stage_set.get('lamps', [])]
        for n, item in enumerate(stage_set.get('cutouts', [])):
            if item.get('kind') not in ('lamp', 'floorlamp'): continue
            tall = float(item.get('height', round(person_default * 1)))
            # Bóng đèn: đèn đường ở 554 / 470 chiều cao khung, đèn cây (trong chụp) ở 340 / 470.
            bulb = 554 if item['kind'] == 'lamp' else 340
            lamps.append(dict({'name': item.get('name', f'cutout{n + 1}'), 'x': item['x'], 'z': float(item['z']) + 1, 'y': round(float(item.get('y', 0)) + tall * bulb / 470), 'power': 0.9},
                              **({'on': item['on']} if 'on' in item else {})))
        # Đèn mà kịch bản BẬT ở một lượt (và chưa ghi "on") thì lúc đầu tắt — đèn sáng sẵn rồi lượt "bật đèn" làm nó tắt
        # phụt rồi sáng lại. Đèn bị TẮT ở một lượt thì lúc đầu sáng.
        for n, lamp in enumerate(lamps):
            name = lamp.get('name', f'lamp{n + 1}')
            first = next((op for op in lamp_ops if (op['name'] if op['name'] is not None else (lamps[0].get('name', 'lamp1'))) == name), None)
            if first and 'on' not in lamp: lamp['on'] = not first['on']
        # TRỜI TỐI DẦN trong cảnh (`sky`): lúc đầu còn nắng thì đèn chưa bật — trời tối được hơn nửa, set.shift tự bật chúng
        # (Gemini đợt 21: đèn cây sáng trưng giữa nắng chiều làm mất cảm giác chạng vạng).
        if any(op['to'] == 'night' for op in sky_ops) and stage_set.get('light', 'day') != 'night':
            for lamp in lamps:
                if 'on' not in lamp and lamp.get('kind') != 'screen': lamp['on'] = False
        # MÀN HÌNH (laptop, máy tính) lúc chiều / tối: một nguồn sáng xanh nhạt ở mặt màn hình (không có quầng bóng đèn).
        if stage_set.get('light', 'day') != 'day':
            for n, item in enumerate(stage_set.get('cutouts', [])):
                if item.get('kind') not in SCREEN_KINDS + ('tv',): continue
                tall = float(item.get('height', round(person_default * 1)))
                # TV to hơn màn hình laptop: sáng xa hơn (tới sofa bên kia phòng), nhấp nháy đổi màu theo "cảnh" đang chiếu.
                tv = item['kind'] == 'tv'
                lamps.append({'name': f'screen{n + 1}', 'kind': 'screen', 'x': item['x'], 'z': float(item['z']) + 30, 'y': round(float(item.get('y', 0)) + tall * (0.25 if tv else 0.3)), 'color': '#a8d8ff', 'power': 0.9 if tv else 0.5, 'range': 1300 if tv else 420, 'on': True})
        light = {'mood': stage_set.get('light', 'day')}
        if room.get('gloss'): light['gloss'] = True
        if room.get('skyline'): light['skyline'] = float(room['skyline'])
        if stage_set.get('shading') is False: light['shading'] = False        # không đổ bóng trên thân nhân vật: render nhanh hơn
        if stage_set.get('lens') is False: light['lens'] = False              # không chỉnh màu / tối góc / hạt phim
        if stage_set.get('grain') is False: light['grain'] = False            # bỏ riêng hạt phim (~20 % thời gian render): bản nháp
        if lamps: light['lamps'] = lamps
        if windows: light['windows'] = windows
        lamp_names = [lamp.get('name', f'lamp{n + 1}') for n, lamp in enumerate(lamps)]
        setup.append(f"    // Light: time of day, lamps (glow, pools of light, long shadows), sunlight through the windows.\n    set.light({js(light)});")
    elif layout == 'split':
        # MÀN HÌNH CHIA ĐÔI: mỗi nửa một nền riêng (`sides.left` / `sides.right`: màu tường, sàn, hoặc một phông dựng sẵn).
        sides = scene.get('sides', {})
        if not isinstance(sides, dict) or set(sides) - {'left', 'right'}: fail('"sides" is { "left": { … }, "right": { … } }')
        for side in ('left', 'right'):
            look = sides.get(side, {})
            if not isinstance(look, dict) or set(look) - {'wall', 'wallDark', 'floor', 'preset'}: fail(f'sides.{side} takes "wall", "wallDark", "floor" or "preset" — got {js(look)}')
            if look.get('preset') and look['preset'] not in PRESETS: fail(f'sides.{side}.preset must be one of {", ".join(PRESETS)}')
            left = '0' if side == 'left' else '50%'
            if look.get('preset'):
                art = PRESETS[look['preset']]
                clip(f'wall-{side}', f'position: absolute; left: {left}; top: 0; width: 50%; height: 100%; background: {art["wallDark"]} url("{_svg(" ".join(art["svg"].split()))}") center bottom / cover no-repeat;')
                floor_colour = look.get('floor', art['floor'])
            else:
                wall, dark = look.get('wall', '#1f4a5c' if side == 'left' else '#5c3b1f'), look.get('wallDark', '#0c1c26' if side == 'left' else '#26170c')
                clip(f'wall-{side}', f'position: absolute; left: {left}; top: 0; width: 50%; height: 100%; background: linear-gradient(165deg, {wall} 0%, {dark} 72%);')
                floor_colour = look.get('floor', '#0f2a38' if side == 'left' else '#38220f')
            clip(f'floor-{side}', f'position: absolute; left: {left}; bottom: 0; width: 50%; height: {background["floorHeight"]}px; background: {floor_colour};')
            layers.append(f'#wall-{side}'); layers.append(f'#floor-{side}')
        picture = None
    elif picture:
        source = os.path.join(base, picture)
        if not os.path.isfile(source): fail(f'background.image not found: {picture} (looked in {base})')
        if os.path.abspath(source) != os.path.abspath(os.path.join(out, os.path.basename(picture))): shutil.copy(source, os.path.join(out, os.path.basename(picture)))
        clip('wall', f'position: absolute; inset: 0; background: {background["wallDark"]} url("{os.path.basename(picture)}") center / cover no-repeat;'); layers.append('#wall')
    elif preset:
        clip('wall', f'position: absolute; inset: 0; background: {PRESETS[preset]["wallDark"]} url("{_svg(" ".join(PRESETS[preset]["svg"].split()))}") center bottom / cover no-repeat;'); layers.append('#wall')
    else:
        clip('wall', f'position: absolute; inset: 0; background: linear-gradient(165deg, {background["wall"]} 0%, {background["wallDark"]} 72%);'); layers.append('#wall')
    if preset:
        background['floor'] = scene.get('background', {}).get('floor', PRESETS[preset]['floor'])
    if stage_set is None and layout != 'split' and (not picture or 'floor' in scene.get('background', {})):
        clip('floor', f'position: absolute; left: 0; right: 0; bottom: 0; height: {background["floorHeight"]}px; background: {background["floor"]};'); layers.append('#floor')
    for prop in [item for item in props if not item['front']]:
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
    for who in names.values():
        if who.get('_seat') and stage_set is None:
            seat = who['_seat']
            clip(seat['element'], f'position: absolute; left: {seat["left"]:.0f}px; bottom: {ground}px; height: {seat["host_height"]:.0f}px;'); layers.append('#' + seat['element'])
        if stage_set is not None: continue                 # host của nhân vật do set.place tạo và đặt
        clip(who['_element'], f'position: absolute; left: {who["_left"]:.0f}px; bottom: {ground}px; height: {who["_host_height"]:.0f}px;'); layers.append('#' + who['_element'])
    for prop in [item for item in props if item['front']]:           # "front": true — vẽ SAU nhân vật, tức che phía trước họ (đứng sau quầy)
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
    if layout == 'split':
        # Nửa KHÔNG nói tối đi một chút (lớp phủ), và một vạch trắng ngăn hai nửa — vẽ sau nhân vật nên đè lên họ.
        for side in ('left', 'right'):
            clip(f'dim-{side}', f'position: absolute; left: {"0" if side == "left" else "50%"}; top: 0; width: 50%; height: 100%; background: #000; opacity: 0; pointer-events: none;', extra=' data-layout-ignore=""')
        clip('divider', f'position: absolute; left: calc(50% - {max(3, round(width * 0.003))}px); top: 0; width: {max(6, round(width * 0.006))}px; height: 100%; background: #f4f7f8; box-shadow: 0 0 18px rgba(0, 0, 0, 0.35);', extra=' data-layout-ignore=""')
        for who in names.values():
            half = (0, width / 2) if who['side'] == 'left' else (width / 2, width)
            if who['_left'] < half[0] - 2 or who['_left'] + who['_host_width'] > half[1] + 2:
                notes.append(f'character "{who["name"]}" stands across the middle of the split frame (its host reaches past its half) — move its "x" toward the middle of the {who["side"]} half')
    # ── VÙNG NỘI DUNG của bố cục "presenter": tiêu đề, các ý, ảnh — mỗi thứ là MỘT clip phẳng (HyperFrames
    # không nhận clip lồng phần tử con), vị trí tính sẵn. Vùng nằm ở phía đối diện với nhân vật.
    landscape = width >= height
    if shows:
        people_x = sum(float(who['x']) for who in names.values()) / len(names)
        if landscape:
            panel_w, panel_x, panel_y, panel_bottom = round(width * 0.5), (round(width * 0.06) if people_x > width / 2 else round(width * 0.44)), round(height * 0.11), round(height * 0.76)
        else:
            # Khung dọc: nội dung ở trên (16%–38%), phụ đề ngay dưới nó (40%), người dẫn đứng thấp hơn — ba thứ không đè nhau.
            panel_w, panel_x, panel_y, panel_bottom = round(width * 0.8), round(width * 0.1), round(height * 0.16), round(height * 0.385)
        title_px, bullet_px = round(min(width, height) * 0.066), round(min(width, height) * 0.05)
        # Ước lượng số dòng khi chữ tự xuống hàng: một ký tự rộng chừng 0,5 cỡ chữ ở tiêu đề (đậm), 0,46 ở các ý.
        lines_of = lambda text, px: max(1, -(-len(text) * px * (0.5 if px == title_px else 0.43) // panel_w))
        # Chữ của vùng nội dung: sáng trên nền tối (tường màu trơn mặc định, ảnh nền), TỐI trên các phông dựng sẵn
        # (đều là tường sáng) — `hyperframes check` đo độ tương phản và đòi ít nhất 3:1.
        ink = 'color: #16303a;' if preset or picture else 'color: #f5f8fa; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);'
        style.append(f'  .show {{ position: absolute; left: {panel_x}px; width: {panel_w}px; margin: 0; {ink} font-family: system-ui, sans-serif; }}')
        style.append(f'  .show-title {{ font-weight: 800; font-size: {title_px}px; line-height: 1.15; }}')
        style.append(f'  .show-bullet {{ font-weight: 600; font-size: {bullet_px}px; line-height: 1.3; padding-left: 1.1em; text-indent: -1.1em; box-sizing: border-box; }}')
        style.append('  .show-image { object-fit: contain; object-position: left top; border-radius: 14px; }')
        # Trên phông dựng sẵn hoặc ảnh nền, chữ nằm trên một TẤM THẺ sáng mờ — không thì chữ đè lên tranh treo tường,
        # cửa sổ… của phông. Thẻ là một clip phẳng riêng, có mặt suốt cảnh.
        if preset or picture:
            pad = round(min(width, height) * 0.035)
            clip('panel', f'position: absolute; left: {panel_x - pad}px; top: {panel_y - pad}px; width: {panel_w + 2 * pad}px; height: {panel_bottom - panel_y + 2 * pad}px; '
                          'border-radius: 22px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);')
        for number, show in enumerate(shows):
            if show.get('clear'): continue
            later = [other['turn'] for other in shows if other['turn'] > show['turn']]
            until = str(later[0]) if later else 'end'
            y = panel_y
            def piece(tag, kind, part, content, top, extra=''):
                element = f'show-{number + 1}-{kind}'
                body.append(f'  <{tag} id="{element}" class="clip show show-{kind.rstrip("0123456789")}" style="top: {round(top)}px;{extra}" data-start="0" data-duration="1" data-track-index="{track[0]}" '
                            f'data-show-turn="{show["turn"]}" data-show-part="{part:.3f}" data-show-until="{until}"' + (f' src="{content}" alt="">' if tag == 'img' else f'>{html_text(content)}</{tag}>'))
                track[0] += 1
            if show.get('title'):
                piece('div', 'title', 0, show['title'], y)
                y += lines_of(show['title'], title_px) * title_px * 1.15 + title_px * 0.55
            bullets = show.get('bullets', [])
            for i, text in enumerate(bullets):
                piece('div', f'bullet{i + 1}', (i + (1 if show.get('title') else 0)) / (len(bullets) + (1 if show.get('title') else 0)), '• ' + text, y)
                y += lines_of('• ' + text, bullet_px) * bullet_px * 1.3 + bullet_px * 0.5
            if show.get('image'):
                name = copy_asset(base, out, show['image'], copied)
                room = max(round(height * 0.14), panel_bottom - y)
                piece('img', 'image', 0, name, y, f' height: {round(room)}px;')
                y += room
            if y > panel_bottom + 4: notes.append(f'the content shown at script turn {show["turn"]} is about {round(y - panel_bottom)}px taller than the panel — shorten it or split it over two turns')

    # Phụ đề: khung ngang thì sát đáy; khung DỌC thì nhấc lên 20% — một phần năm dưới cùng của video dọc
    # bị giao diện của TikTok / Reels / Shorts che (HyperFrames `check` gọi đó là vùng an toàn).
    captions = scene.get('captions', True) and '"say"' in json.dumps(script)        # không ai nói thì không cần phụ đề
    if captions:
        look = f'padding: 10px 30px; border-radius: 14px; box-sizing: border-box; white-space: nowrap; background: rgba(8, 12, 16, 0.78); color: #f5f8fa; font: 600 {round(min(width, height) * 0.041)}px/1.25 system-ui, sans-serif; text-align: center; opacity: 0;'
        # `data-layout-ignore`: phụ đề đi theo LỜI NÓI, mà người nói nhanh hơn tốc độ đọc mà `hyperframes check` đòi cho
        # chữ trên màn hình (0,5 s + 0,3 s mỗi từ) — khán giả nghe câu ấy chứ không chỉ đọc. Vị trí phụ đề do công cụ tính.
        # Bối cảnh 3D, khung dọc: 17 % chiều cao — trong vùng an toàn (15–65 %), dưới thanh tab của ứng dụng (~10 %) và TRÊN
        # đầu nhân vật: máy quay (set.frameOn) đặt nhân vật thấp để chừa khoảng tường cho chữ. Phụ đề ở giữa khung thì đè lên
        # mặt — đầu chibi chiếm nửa thân (Gemini soát phim dọc đợt 15).
        caption_top = round(height * (0.4 if scene.get('layout') == 'presenter' else 0.17 if stage_set is not None else 0.52))
        if width >= height:
            clip('caption', f'position: absolute; left: 50%; bottom: {round(height * 0.03)}px; transform: translateX(-50%); ' + look, extra=' data-layout-ignore=\"\"')
        else:
            # Khung DỌC: chữ phải nằm trong vùng mà giao diện TikTok / Reels / Shorts không che — theo bảng của
            # HyperFrames là từ 15% tới 65% chiều cao, và ở nửa dưới của vùng ấy thì lùi khỏi cột nút bên phải
            # (11%–72% bề ngang). Neo bằng `top` để ba dòng chữ vẫn nằm trọn trong vùng.
            # Bối cảnh 3D: HAI dòng (xuống dòng tự nhiên) — một dòng 24 chữ thì câu bị cắt thành ba bốn mảnh vụn.
            two = stage_set is not None
            clip('caption', f'position: absolute; left: {round(width * 0.115)}px; width: {round(width * 0.6)}px; top: {caption_top}px; overflow: hidden; ' + (look.replace('white-space: nowrap', 'white-space: normal') if two else look), extra=' data-layout-ignore=\"\"')
    for voice in voices:
        body.append(f'  <audio id="voice-{voice["key"].replace("_", "-")}" class="clip" src="{voice["file"]}" data-start="__START_{voice["key"]}__" data-duration="{voice["length"]:.2f}" data-track-index="{track[0]}" data-volume="1"></audio>')
        track[0] += 1

    music = scene.get('music')
    if music:
        if not os.path.isfile(os.path.join(base, music)): fail(f'music file not found: {music} (looked in {base})')
        if os.path.abspath(os.path.join(base, music)) != os.path.abspath(os.path.join(out, os.path.basename(music))): shutil.copy(os.path.join(base, music), os.path.join(out, os.path.basename(music)))
        # Nhạc nền: một clip tiếng chạy suốt cảnh, nhỏ hơn giọng nói. data-role để tools/peek.sh không coi nó là giọng thiếu người nhép.
        body.append(f'  <audio id="music" class="clip" src="{os.path.basename(music)}" data-role="music" data-start="0" data-duration="__TOTAL__" data-track-index="{track[0]}" data-volume="{float(scene.get("musicVolume", 0.15)):g}"></audio>')
        track[0] += 1
    # Bối cảnh 3D: host của nhân vật do createSet đặt — mang tên trong kịch bản (data-name) để `set.framing()` nhắc đúng người.
    if stage_set is not None: setup.append("    const host = (name) => { const element = document.createElement('div'); element.dataset.name = name; return element; };")
    # Con vật dưới sàn mà NHIỀU NGƯỜI ở các chiều sâu khác nhau với tới (đợt 33): [(lượt, z của người với tới)], chỉ giữ chỗ đổi.
    pet_depths = {}
    if stage_set is not None:
        for op in gear_ops:
            if op['kind'] not in ('stroke', 'examine', 'giveTreat', 'brush', 'listen', 'inject', 'carry') + CARE_35 + CARE_ACTIONS: continue
            pet, person = names.get(op.get('target') or ''), names.get(op.get('who') or '')
            if not pet or not person or not pet['_pet'] or person['_pet'] or pet.get('on'): continue
            pet_depths.setdefault(pet['name'], []).append((op['turn'], plane_of(person)))
        for name, hops in list(pet_depths.items()):
            # (lượt, z, lượt với tới ngay trước) — con vật dời được từ lúc lượt trước xong tới lúc lượt này bắt đầu.
            kept = [(hops[0][0], hops[0][1], None)]
            for n, (turn, z) in enumerate(hops[1:], 1):
                if abs(z - kept[-1][1]) > 5: kept.append((turn, z, hops[n - 1][0]))
            if len(kept) > 1: pet_depths[name] = kept
            else: del pet_depths[name]
    for narrator in narrators_42a.values():
        # Người dẫn (đợt 42 A): một rig có miệng để căn giờ lời + phụ đề, gắn vào một thẻ div RỜI — không `set.place`, không clip, không vào `framing()`.
        setup.append(f"    const {narrator['name']} = VGCharacter.createCharacter(document.createElement('div'), {{ id: {js(narrator['id'])} }}).rig;      // narrator: a voice, no body on screen")
    for who in names.values():
        mount = f"host({js(who['name'])})" if stage_set is not None else f"$('{who['_element']}')"
        held = {}
        for side, item in (who.get('holds') or {}).items():
            # Ảnh trên màn hình điện thoại đi theo bản dựng như mọi ảnh khác: chép vào thư mục ra, gọi bằng tên tệp.
            if isinstance(item, dict) and item.get('image'):
                name = copy_asset(base, out, item['image'], copied)
                item = dict(item, image=name)
            held[side] = item
        make = f"VGCharacter.createPet({mount}, {{ species: {js(who['species'])}" + (f", wear: {js(who['wears'])}" if who.get('wears') else '') + " })" if who['_pet'] else f"VGCharacter.createCharacter({mount}, {{ id: {js(who['id'])}" + (f", items: {js(held)}" + (f", itemsHidden: {js(who['holdsHidden'])}" if who.get('holdsHidden') else '') if who.get('holds') else '') + (f", wear: {js(who['wears'])}" if who.get('wears') else '') + " })"
        setup.append(f"    const {who['name']} = {make}.rig;")
        if stage_set is not None:
            boxes = [box.get('name') for box in stage_set.get('boxes', [])]
            lift = f", y: box{boxes.index(who['on']) + 1}.top" if who.get('on') else ''
            # NGỒI trên một hộp (ghế đá, sofa): chân CHẠM SÀN, hông ở mặt hộp — đặt chân lên mặt hộp thì người ngồi trông như
            # ngồi xổm trên ghế (cảnh thử đợt 8). Đứng trong bề sâu của hộp: mặt trước hộp che cẳng chân, đúng dáng ngồi trên nó.
            depth_z = float(who.get('z', -300))
            if who.get('on') and who.get('seated') and not who['_pet']:
                box = stage_set['boxes'][boxes.index(who['on'])]
                lift = ''
                # Ngồi NGAY TRƯỚC mặt trước của hộp: đầu gối, cẳng chân hiện ra trước ghế; người lùi vào trong bề sâu hộp thì
                # mặt trước ghế che tới ngang hông — trông như đứng sau một cái quầy.
                depth_z = float(box['z']) + 12
                seat_height = 86 * who['_host_height'] / PERSON[1]            # mặt ghế của rig: ~86 đơn vị khung trên sàn (rig.seatY)
                if abs(float(box['height']) - seat_height) > 30: notes.append(f'character "{who["name"]}" sits on "{who["on"]}", which is {float(box["height"]):g} high — the seat of a character this size is about {seat_height:.0f}; make the box about that high, or the character floats above it / sinks into it')
            # Chỗ đứng LÚC ĐẦU (`_x0`): `who['x']` đã bị các lượt "bước lại gần" trong kịch bản cập nhật thành chỗ đứng sau
            # cùng — đặt nhân vật ở đó rồi cho nó bước thêm là nó đi quá, đứng chồng lên người kia.
            if who.get('_scooter'):
                # Ngồi trên yên: đặt ở chỗ xe XUẤT PHÁT, nâng lên `rideLift` (đơn vị khung → px), thế cầm lái từ khung đầu,
                # quay theo hướng xe chạy — trước khi dựng hội thoại (các lượt của nó bắt đầu từ thế ấy).
                ride = who['_scooter']; start = ride['drive']['from'] if ride.get('drive') else float(ride['x'])
                setup.append(f"    const {who['name']}Spot = set.place({who['name']}, {{ x: {start:g}, z: {depth_z:g}, height: {who['_host_height']:g} }});")
                setup.append(f"    {who['name']}Spot.y = cutout{ride['_n']}Prop.rideLift({who['name']}) * {who['_host_height']:g} / {PERSON[1]};   // on the seat of {ride['name']}")
                setup.append(f"    {who['name']}.state.ride = 1; {who['name']}.state.facing = {-1 if ride.get('facing') == 'left' else 1};      // riding")
            else:
                # Con vật một người NGỒI vuốt / bế (đợt 31): vẽ TRÊN người ấy (`over`) — đứng trước hai ống chân, không khuất sau chúng;
                # bàn tay nhắm ĐỈNH ĐẦU nó ('crown'). Giữ nguyên z: dời nó lại gần máy thì người khác (bé quỳ vuốt nó) với tay trong mặt
                # phẳng của mình, lơ lửng trên đầu nó.
                over = f", over: {who['_front']['name']}" if who.get('_front') is not None else ''
                # CÙNG CHIỀU SÂU với người ngồi vuốt nó (đợt 32) — khi chỉ người ấy với tay tới nó: thứ tự lớp đã do `over` lo, còn đứng
                # gần máy hơn 28–48 đơn vị thì ở góc trung đầu nó hiện thấp hơn / lệch ngang 4–6 đơn vị khung so với chỗ bàn tay (rig 2D
                # vươn trong mặt phẳng của mình): bàn tay vuốt hở trên đầu nó.
                front = who.get('_front')
                if front is not None and who.get('_reachers', set()) <= {front['name']}:
                    depth_z = plane_of(front)
                # HAI NGƯỜI ở hai chiều sâu cùng với tới con vật (đợt 33): nó đứng ở mặt phẳng của người đang với tới — lúc đầu là người
                # thứ nhất, rồi dời sang mặt phẳng người kế ngay trước lượt của họ (`set.depth`, xem `depth_code`). Giữ z riêng thì ở góc
                # trung đầu nó lệch 4–6 đơn vị khung so với bàn tay (bà ngồi sofa vuốt mèo, rồi bé quỳ cho ăn: 0 % tay chạm đầu mèo).
                hops = pet_depths.get(who['name']) if who['_pet'] else None
                if hops: depth_z = hops[0][1]
                setup.append(f"    set.place({who['name']}, {{ x: {who['_x0']:g}, z: {depth_z:g}{lift}, height: {who['_host_height']:g}{over} }});")
                if who['_pet'] and who.get('inTub'):
                    # ĐỢT 42 F: CHẬU TẮM vừa con vật, cùng đơn vị với nó (host cao bằng host con vật × 470 / 330), ngay sau nó (z − 6) — nó cắt dưới vành chậu.
                    tub = f"tub42f_{who['name']}"
                    setup.append(f"    const {tub} = document.createElement('div'), {tub}Fit = {who['name']}.tubFit42f(); VGCharacter.createProp({tub}, 'tub', {{ width: {tub}Fit.length, height: {tub}Fit.rim }}); "
                                 f"set.stand({tub}, {{ x: {who['_x0']:g}, z: {depth_z - 6:g}{lift}, height: {who['_host_height'] * 470 / 330:.1f} }}); {who['name']}.inTub42f({tub}Fit.rim);          // {who['name']} stands in a bath tub")
    for prop in props:
        options = {'color': prop['options'].get('color'), 'width': prop['options'].get('width'), 'height': prop['options'].get('tabletop'), 'back': prop['options'].get('back'),
                   'fill': prop['options'].get('fill'), 'reading': prop['options'].get('reading'), 'door': prop['options'].get('door'),
                   'facing': prop['options'].get('facing')}
        if prop['kind'] == 'paystand' and options.get('height') is not None: options['on'] = options.pop('height')            # đợt 39 A: mặt quầy cao `tabletop`
        setup.append(f"    VGCharacter.createProp($('{prop['element']}'), {js(prop['kind'])}, {js({k: v for k, v in options.items() if v is not None})});")
    for who in names.values():
        if who.get('_seat') and stage_set is not None:
            # Ghế trong bối cảnh 3D: một tấm đạo cụ đứng ngay SAU người ngồi (lùi 2 đơn vị), cùng cỡ host.
            seat = f"seat_{who['name']}"
            setup.append(f"    const {seat} = document.createElement('div'); VGCharacter.createProp({seat}, {js(who['_seat']['kind'])}, {{ for: {who['name']} }}); set.stand({seat}, {{ x: {who['_x0']:g}, z: {float(who.get('z', -300)) - 2:g}, height: {who['_host_height']:g}, shadow: false }});")
        elif who.get('_seat'): setup.append(f"    VGCharacter.createProp($('{who['_seat']['element']}'), {js(who['_seat']['kind'])}, {{ for: {who['name']} }});")
        if who.get('seated') and not who['_pet']:
            setup.append(f"    {who['name']}.state.seat = 1;                 // already seated in the first frame")
        # Người có mặt từ đầu thì ĐÃ quay về phía người mình nhìn ngay ở khung 0 — không tốn một nhịp quay mặt đầu cảnh.
        if who.get('faces') and not who.get('enter') and not who['_late'] and not who.get('rides'):
            toward = -1 if names[who['faces']]['_x0'] < who['_x0'] else 1          # chỗ đứng LÚC ĐẦU, không phải sau các lượt bước lại gần
            setup.append(f"    {who['name']}.state.facing = {toward if who['_pet'] else toward * 0.55};            // already turned toward {who['faces']}")
        elif who.get('seated') and not who['_pet'] and stage_set is not None and not who['_late']:
            # Người NGỒI trên ghế, không nói nhìn ai: quay 3/4 vào giữa phòng — dáng 3/4 mới vẽ được đùi nằm ngang trên mặt ghế,
            # nhìn thẳng thì trông như đứng trước ghế (đợt 29).
            toward = 1 if who['_x0'] < 0 else -1
            setup.append(f"    {who['name']}.state.facing = {toward * 0.55};            // seated: a three-quarter turn into the room, thighs on the seat")
        if who['_late']:
            setup.append(f"    {who['name']}.state.opacity = 0;              // off stage until its turn with \"enter\"")
    # ── THẺ THÔNG BÁO (`"toast"` trên một lượt): một thẻ kiểu thông báo ứng dụng ở góc trên khung — biểu tượng chuông,
    # tiêu đề đậm, một dòng nội dung. Mỗi thẻ là một clip phẳng; giờ hiện điền sau khi đo thời gian (`place_toasts`).
    if toasts:
        unit = min(width, height)
        card_w = round(width * (0.36 if width >= height else 0.82))
        # Khung dọc: thẻ thông báo ở 27 % chiều cao — dưới phụ đề (17 %), trong vùng an toàn; sát đỉnh khung là chỗ thanh tab
        # của TikTok che mất (Gemini soát phim đợt 18). Khung ngang: góc trên phải như cũ.
        style.append(f'  .toast {{ position: absolute; top: {round(height * (0.05 if width >= height else 0.27))}px; {"right" if width >= height else "left"}: {round(width * 0.04) if width >= height else round((width - card_w) / 2)}px; width: {card_w}px; box-sizing: border-box; '
                     f'padding: {round(unit * 0.018)}px {round(unit * 0.022)}px {round(unit * 0.018)}px {round(unit * 0.085)}px; border-radius: {round(unit * 0.022)}px; background: rgba(255, 255, 255, 0.97); '
                     f'box-shadow: 0 {round(unit * 0.01)}px {round(unit * 0.03)}px rgba(0, 0, 0, 0.22); font-family: system-ui, sans-serif; color: #16303a; }}')
        bell = _svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 4c-3 0-5 2.2-5 5.2v3.6L5.6 15h12.8L17 12.8V9.2C17 6.2 15 4 12 4zm-2 12.5a2 2 0 004 0' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'/></svg>")
        style.append(f'  .toast::before {{ content: ""; position: absolute; left: {round(unit * 0.022)}px; top: 50%; width: {round(unit * 0.046)}px; height: {round(unit * 0.046)}px; margin-top: {-round(unit * 0.023)}px; '
                     f'border-radius: {round(unit * 0.012)}px; background: #2f9e8f url("{bell}") center / 70% no-repeat; }}')
        # MỘT phần tử cho mỗi thẻ (HyperFrames không nhận clip có phần tử con): tiêu đề là chữ của chính nó, dòng nội dung
        # là `::after` lấy từ `data-text`, biểu tượng là `::before`.
        style.append(f'  .toast {{ font-weight: 800; font-size: {round(unit * 0.03)}px; line-height: 1.2; z-index: 30; }}')
        style.append(f'  .toast::after {{ content: attr(data-text); display: block; font-weight: 400; font-size: {round(unit * 0.026)}px; line-height: 1.25; color: #3b5560; margin-top: {round(unit * 0.004)}px; }}')
        for number, note in enumerate(toasts):
            text = html_text(note['text']).replace('"', '&quot;')
            body.append(f'  <div id="toast-{number + 1}" class="clip toast" data-text="{text}" data-start="0" data-duration="1" data-track-index="{track[0]}" data-toast-turn="{note["turn"]}" data-layout-ignore="">{html_text(note["title"])}</div>')
            track[0] += 1
    # ── THẺ MỞ ĐẦU / KẾT THÚC (`"intro"`, `"outro"`): một khung toàn màn hình — nền màu thương hiệu, logo, tiêu đề, một dòng
    # chữ, một nút kêu gọi. Mỗi thứ là một clip phẳng. Thẻ mở đầu chiếm `dur` giây đầu (hội thoại bắt đầu sau nó, `T0`);
    # thẻ kết thúc nối sau lượt cuối (giờ bắt đầu điền sau khi đo, `__OUTRO_START__`).
    intro, outro = scene.get('intro'), scene.get('outro')
    intro_dur, card_lines = 0.0, []
    for which, card in (('intro', intro), ('outro', outro)):
        if card is None: continue
        if not isinstance(card, dict) or set(card) - set(CARD_KEYS) or not (card.get('title') or card.get('text')): fail(f'"{which}" is {{ "title", "text", "cta", "logo", "dur", "color" }} with at least a title or a text — got {js(card)}')
        dur = float(card.get('dur', 2.6 if which == 'intro' else 3.2))
        if not 1 <= dur <= 10: fail(f'{which}.dur must be 1…10 seconds')
        colour = card.get('color', '#2f9e8f')
        if not re.match(r'^#[0-9a-fA-F]{6}$', colour): fail(f'{which}.color must be #rrggbb')
        card_start, card_length = ('0', f'{dur:g}') if which == 'intro' else ('__OUTRO_START__', '__OUTRO_DUR__')      # đợt 42: không dùng tên `start` — nó là góc máy khởi đầu (cảnh 3D), máy quay về góc ấy đọc lại nó
        unit = min(width, height)
        def card_clip(kind, css, tag='div', content='', extra=''):
            style.append(f'  #{which}-{kind} {{ {css} z-index: 50; }}')
            body.append(f'  <{tag} id="{which}-{kind}" class="clip card-{which}" data-start="{card_start}" data-duration="{card_length}" data-track-index="{track[0]}" data-layout-ignore=""{extra}>{content}</{tag}>' if tag != 'img'
                        else f'  <img id="{which}-{kind}" class="clip card-{which}" data-start="{card_start}" data-duration="{card_length}" data-track-index="{track[0]}" data-layout-ignore=""{extra}>')
            track[0] += 1
        card_clip('bg', f'position: absolute; inset: 0; background: radial-gradient(circle at 30% 25%, #ffffff33, transparent 55%), linear-gradient(150deg, {colour}, #0f2a38);')
        top = 0.3
        if card.get('logo'):
            if not os.path.isfile(os.path.join(base, card['logo'])): fail(f'{which}.logo not found: {card["logo"]} (looked in {base})')
            name = copy_asset(base, out, card['logo'], copied)
            card_clip('logo', f'position: absolute; left: 50%; top: {round(height * 0.16)}px; height: {round(unit * 0.16)}px; transform: translateX(-50%);', tag='img', extra=f' src="{name}" alt=""')
            top = 0.38
        if card.get('title'):
            card_clip('title', f'position: absolute; left: 8%; right: 8%; top: {round(height * top)}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 800; font-size: {round(unit * 0.085)}px; line-height: 1.12; color: #ffffff; text-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);', content=html_text(str(card['title']).replace('-', '\u2011')))
        if card.get('text'):
            card_clip('text', f'position: absolute; left: 12%; right: 12%; top: {round(height * (top + 0.2))}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 500; font-size: {round(unit * 0.042)}px; line-height: 1.3; color: #e6f4f1;', content=html_text(card['text']))
        if card.get('cta'):
            card_clip('cta', f'position: absolute; left: 50%; top: {round(height * (top + 0.36))}px; transform: translateX(-50%); padding: {round(unit * 0.018)}px {round(unit * 0.05)}px; border-radius: 999px; background: #ffffff; color: {colour}; font-family: system-ui, sans-serif; font-weight: 800; font-size: {round(unit * 0.04)}px; white-space: nowrap; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);', content=html_text(card['cta']))
        if which == 'intro':
            intro_dur = dur
            card_lines.append(f"    // Opening card: the words come in, then the whole card fades into the scene.\n    gsap.utils.toArray('.card-intro:not(#intro-bg)').forEach((el, n) => tl.from(el, {{ opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' }}, 0.15 + n * 0.15));\n    tl.to('.card-intro', {{ opacity: 0, duration: 0.45, ease: 'power1.in' }}, TI - 0.45);")
        else:
            card_lines.append(f"    // Closing card after the last turn: it fades in over the scene, then the words come in.\n    tl.from('#outro-bg', {{ opacity: 0, duration: 0.5 }}, T1); gsap.utils.toArray('.card-outro:not(#outro-bg)').forEach((el, n) => tl.from(el, {{ opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' }}, T1 + 0.3 + n * 0.15));\n    tl.to({{}}, {{ duration: {dur:g} }}, T1);")
    # MỞ ĐẦU KIỂU "HOOK" (`"hook": { "title", "text", "dur" }`): chữ lớn BẬT lên đè trên cảnh đầu đang diễn rồi tắt — video
    # ngắn không mở bằng một thẻ tĩnh (Gemini chê ba giây đầu chậm). Cảnh không đợi: lượt đầu bắt đầu ngay từ giây 0.
    hook = scene.get('hook')
    if hook is not None:
        if not isinstance(hook, dict) or set(hook) - {'title', 'text', 'dur'} or not hook.get('title'): fail('"hook" is { "title": "…", "text": "…", "dur": 2.2 } — big words over the first moments of the scene')
        hook_dur = float(hook.get('dur', 2.2))
        if not 1 <= hook_dur <= 5: fail('hook.dur must be 1…5 seconds')
        unit = min(width, height)
        hook_top = 0.2 if width < height else 0.16
        def hook_clip(kind, css, content=''):
            style.append(f'  #hook-{kind} {{ {css} z-index: 45; }}')
            body.append(f'  <div id="hook-{kind}" class="clip card-hook" data-start="0" data-duration="{hook_dur:g}" data-track-index="{track[0]}" data-layout-ignore="">{content}</div>')
            track[0] += 1
        hook_clip('shade', 'position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, rgba(8,14,22,.55), rgba(8,14,22,.15) 60%, rgba(8,14,22,0));')
        hook_clip('title', f'position: absolute; left: 6%; right: 6%; top: {round(height * hook_top)}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 900; font-size: {round(unit * 0.095)}px; line-height: 1.08; color: #ffffff; -webkit-text-stroke: {max(2, round(unit * 0.004))}px #0f2a38; paint-order: stroke fill; text-shadow: 0 6px 24px rgba(0,0,0,.45);',
                  html_text(str(hook['title']).replace('-', '\u2011')))
        if hook.get('text'):
            hook_clip('text', f'position: absolute; left: 10%; right: 10%; top: {round(height * (hook_top + (0.2 if width < height else 0.24)))}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 700; font-size: {round(unit * 0.048)}px; line-height: 1.25; color: #ffe08a; text-shadow: 0 3px 14px rgba(0,0,0,.5);', html_text(str(hook['text'])))
        card_lines.append(f"    // Hook: big words pop over the opening moments, then fade — the scene itself starts at once.\n"
                          f"    tl.from('#hook-shade', {{ opacity: 0, duration: 0.25 }}, 0); tl.from('#hook-title', {{ opacity: 0, scale: 0.55, duration: 0.45, ease: 'back.out(2.4)' }}, 0.05);\n"
                          f"    if (document.getElementById('hook-text')) tl.from('#hook-text', {{ opacity: 0, y: 24, duration: 0.4, ease: 'power2.out' }}, 0.45);\n"
                          f"    tl.to('.card-hook', {{ opacity: 0, duration: 0.35, ease: 'power1.in' }}, {hook_dur - 0.35:g});")
    card_code = "\n    const T1 = tl.duration();                 // the closing card (if any) starts here\n" + "\n".join(card_lines) if card_lines else "\n    const T1 = tl.duration();"
    camera = False if stage_set is not None or layout == 'split' else scene.get('camera', layout != 'presenter')        # người dẫn đứng cạnh nội dung: máy quay không cắt cận, trừ khi kịch bản yêu cầu
    camera_code = ''
    if camera:
        kind = camera.get('kind', 'chest') if isinstance(camera, dict) else 'chest'
        # Khung dọc: phụ đề nằm giữa khung (vùng an toàn), nên người nói được đặt ở PHẦN TRÊN và nhỏ lại
        # một chút — không thì chữ đè lên miệng.
        # Khung ngang: cảnh cận lấp 66% chiều cao (mặc định 82% của thư viện làm cái đầu chiếm nửa khung hình).
        # Khung ngang có phụ đề ở dưới: đặt người nói cao hơn giữa khung một chút (centerY 0,45) để cằm không chạm
        # hộp chữ — nhân vật đầu to, cận ngực là cái đầu đã cao quá nửa khung.
        portrait = (', fill: 0.66' + (', centerY: 0.45' if captions else '')) if width >= height else ', fill: 0.46, centerY: 0.34'
        camera_code = f"camera: {{ scene: {js(layers)}, kind: {js(kind)}{portrait} }}, "
    seated_pets = [f"[{who['name']}, 'sitDown']" for who in names.values() if who['_pet'] and who.get('seated')]
    lines = []
    for comment, code in ([('  // pets that start seated', '{ together: [' + ', '.join(seated_pets) + '] }' if len(seated_pets) > 1 else seated_pets[0])] if seated_pets else []) + turns:
        if comment: lines.append('    ' + comment)
        lines.append(f'      {code},')
    # MỘT DÒNG, cố định một chỗ (khung ngang: sát đáy, giữa khung): câu dài được chia thành các cụm vừa một dòng, cụm
    # nào hiện đúng lúc lời nói tới cụm ấy. Hộp chữ hai ba dòng che mất nhân vật thấp và cử chỉ tay. Bề ngang một chữ
    # ≈ 0,55 cỡ chữ; trừ lề trong 60px.
    caption_chars = int(((width * 0.7 if landscape else width * 0.6) - 60) / (min(width, height) * 0.041 * 0.55))
    if not landscape and stage_set is not None: caption_chars *= 2                 # khung dọc trong bối cảnh 3D: phụ đề hai dòng
    caption_code = f"    tl.add(VGCharacter.captions(talk, $('caption'), {{ maxChars: {caption_chars}, avoid: false, cuts: (typeof CUTS === 'undefined' ? [] : CUTS.map((time) => time - T0)) }}).paused(false), T0);     // the words of each line, one line at a time, each chunk when the speech reaches it" if captions else ''
    if popups:
        caption_code += "\n    // Notifications on the screens of props in the set (they follow the camera with the prop)."
        for pop in popups:
            caption_code += f"\n    tl.add(cutout{pop['cutout']}Prop.notify({js({'title': pop['title'], 'text': pop['text']})}, {{ hold: {pop['hold']:g} }}).paused(false), T0 + talk.turns[{pop['turn']}].start + 0.3);"
    if speakers:
        moves = ' '.join(f"tl.to('#dim-left', {{ opacity: {0 if side in ('left', None) else 0.32}, duration: 0.3 }}, T0 + talk.turns[{turn}].start); tl.to('#dim-right', {{ opacity: {0 if side in ('right', None) else 0.32}, duration: 0.3 }}, T0 + talk.turns[{turn}].start);" for turn, side in speakers)
        caption_code += "\n    // Split screen: the half that is not speaking dims a little.\n    " + moves
    if toasts: caption_code += "\n    // Notification cards slide in at their data-start and out before their clip ends (tools/scene.py fills both in).\n    document.querySelectorAll('.toast').forEach((element) => { const start = +element.dataset.start, end = start + +element.dataset.duration; tl.from(element, { opacity: 0, y: -30, duration: 0.4, ease: 'back.out(1.6)' }, start); tl.to(element, { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, end - 0.3); });"
    if shows: caption_code += "\n    // Content clips (title, bullets, image) fade in at their data-start, which tools/scene.py fills in.\n    document.querySelectorAll('.show').forEach((element) => { if (+element.dataset.start > 0) tl.from(element, { opacity: 0, y: 24, duration: 0.45, ease: 'power2.out' }, +element.dataset.start); });"
    # Bối cảnh 3D: máy quay áp sau mỗi lần timeline cập nhật; mỗi "view" là một tween (hoặc một lần cắt) đặt đúng lúc lượt ấy bắt đầu.
    # ── XE CHẠY VÀO (`drive` trên một cutout) và NGƯỜI CẦM LÁI (`rides`) ── xe trượt từ `from` tới chỗ của nó (giảm tốc như
    # phanh), bánh xe máy quay theo quãng đường; người lái ngồi trên yên đi cùng. Hội thoại bắt đầu khi mọi xe đã dừng
    # (T0 = thẻ mở đầu + lâu nhất + 0,3 s). "getOff" của người lái — ở lượt nào cũng được — là lúc người ấy bước xuống
    # đất cạnh xe: hạ người đúng lúc động tác ấy chạy (hạ trước thì có lúc người ngồi bệt dưới đất).
    drive_wait = max([item['drive']['dur'] for item in drives], default=-0.3) + 0.3
    ride_lines = []
    for item in drives:
        n, d = item['_n'], item['drive']
        ride_lines.append(f"    tl.fromTo(cutout{n}Spot, {{ x: {d['from']:g} }}, {{ x: {float(item['x']):g}, duration: {d['dur']:g}, ease: {js(d['ease'])} }}, TI);" + (f"          // {item['name']} drives in" if item.get('name') else ''))
        if item.get('kind') == 'scooter':
            ahead = (float(item['x']) - d['from']) * (-1 if item.get('facing') == 'left' else 1)
            ride_lines.append(f"    tl.add(cutout{n}Prop.roll({ahead / (item['_tall'] / PERSON[1]):.1f}, {d['dur']:g}, {js(d['ease'])}), TI);          // its wheels turn")
    for who in names.values():
        ride = who.get('_scooter')
        if not ride: continue
        d, end = ride.get('drive'), float(ride['x'])
        if d: ride_lines.append(f"    tl.fromTo({who['name']}Spot, {{ x: {d['from']:g} }}, {{ x: {end:g}, duration: {d['dur']:g}, ease: {js(d['ease'])} }}, TI);          // {who['name']} rides with it")
        side, step = (-1 if ride.get('facing') == 'left' else 1), 0.42 * who['_host_height']
        ride_lines.append(f"    {{ const off = talk.turns.filter((turn) => turn.rig === {who['name']}).flatMap((turn) => turn.steps).find((step) => step.name === 'getOff');          // {who['name']} gets off: down beside the scooter\n"
                          f"      if (off) tl.to({who['name']}Spot, {{ x: {end + side * step:.0f}, y: 0, z: {float(ride['z']) + 70:g}, duration: 0.55, ease: 'power1.inOut' }}, T0 + off.start); }}")
    ride_code = ("\n    // Vehicles drive in after the opening card; riders sit on them and get off with \"getOff\".\n" + "\n".join(ride_lines)) if ride_lines else ''
    t0_code = (f"    const TI = {intro_dur:g}, T0 = TI + {drive_wait:g};       // the opening card (0 = none), then vehicles drive in; the conversation starts at T0" if drives
               else f"    const T0 = {intro_dur:g};                 // the conversation starts after the opening card (0 = none)\n    const TI = T0;")

    timeline_hook, view_code, drive_code = '', '', ''
    # CHIỀU SÂU CON VẬT THEO LƯỢT (đợt 33): dời nó sang mặt phẳng người kế với tới — thêm TRƯỚC khi máy quay tự đặt góc (`direct` tua
    # timeline để đo khung), tạm là 0,45 s ngay trước lượt ấy; sau `direct`, `settleDepths` dời nó vào lần CẮT CẢNH muộn nhất từ lúc
    # lượt với tới trước xong tới lúc lượt này bắt đầu, hay vào bước đi của chính nó (lượt hai: trượt 0,45 s thấy trên hình).
    depth_lines = [f"    tl.add(set.depth({name}, {z:g}, 0.45, 'sine.inOut', {{ between: [T0 + talk.turns[{prev}].end, T0 + talk.turns[{turn}].start] }}), Math.max(0, T0 + talk.turns[{turn}].start - 0.45));"
                   for name, hops in pet_depths.items() for turn, z, prev in hops[1:]]
    depth_code = ('\n    // A pet two people at different depths reach for stands in the plane of whoever reaches for it now (a hand only reaches in its own plane).\n'
                  + '\n'.join(depth_lines) + '\n') if depth_lines else ''
    settle_code = ("\n    // The pet changes depth on a cut (or during its own walk), never sliding while it stands still in view.\n"
                   "    set.settleDepths(typeof CUTS === 'undefined' ? [] : CUTS, (rig) => talk.turns.filter((turn) => turn.rig === rig).flatMap((turn) => turn.steps.filter((step) => step.name === 'walk').map((step) => [T0 + step.start, T0 + step.start + step.duration])));\n") if depth_lines else ''
    if stage_set is not None:
        timeline_hook = ', onUpdate: set.update'
        # Máy quay áp ở MỌI khung kể cả khi bộ dựng tua bằng seek() (tắt onUpdate) — không có thì hình chớp lúc máy lia.
        drive_code = "\n    set.drive(tl);       // the camera is applied on every frame, also when the renderer seeks without callbacks"
        moves, autos = [], False
        for view in views:
            values = ', '.join(f'{key}: {value:g}' for key, value in view['values'].items())
            if view.get('start'): aim = js(start)
            elif view.get('auto'):
                # Góc tự động: tính lúc dựng, ở đúng lúc lượt (gốc) của nó bắt đầu — vị trí của mọi người lúc ấy.
                autos = True
                first = next(v for v in views if v.get('auto') is view['auto'] and not v.get('returned')) if view.get('returned') else view
                auto = view['auto']
                # `alone` (đợt 35, lượt ba): góc cận riêng chủ thể — không né người khác (`avoid: []`), đo suốt lượt (con chó chạy vòng).
                opts = (f", {{ avoid: [], span: [T0 + talk.turns[{first['turn']}].start, T0 + talk.turns[{first['turn']}].end]" + (f", fill: {auto['fill']:g}" if auto.get('fill') else '') + ' }') if auto.get('alone') else (f", {{ fill: {auto['fill']:g} }}" if auto.get('fill') else '')
                aim = f"{{ ...frameAt(T0 + talk.turns[{first['turn']}].start, [{', '.join(auto['on'])}], {js(auto['size'])}{opts})" + (f", {values}" if values else '') + ' }'
            else: aim = f'{{ {values} }}'
            call = f"set.cut({aim})" if view['cut'] else f"set.move({aim}, {view['dur']:g}, {js(view['ease'])})"
            # ĐỢT 44 B: góc cận TỰ ĐỘNG của con vật (`alone`) ở lượt ĐẦU cảnh (chó đuổi đuôi mở cảnh): giữ góc toàn mở đầu của đạo diễn tự động
            # 1,6 s (≤ nửa lượt) rồi mới cắt vào — không thì góc mở đầu là góc cận ấy, sofa / TV lẹm ở mép (người chấm hỏi về đồ đạc ở đó).
            if director and view['turn'] == 0 and isinstance(view.get('auto'), dict) and view['auto'].get('alone') and view['cut']:
                moves.append(f"    tl.add({call}, Math.min(T0 + talk.turns[0].start + 1.6, T0 + (talk.turns[0].start + talk.turns[0].end) / 2));      // after the opening shot")
                continue
            moves.append(f"    tl.add({call}, T0 + talk.turns[{view['turn']}].start);")
        for op in lamp_ops:
            if not lamp_names: fail(f'{op["where"]}: "lamp" — the set has no lamps (add set.lamps, or a "lamp" cutout)')
            name = op['name'] if op['name'] is not None else lamp_names[0]
            if name not in lamp_names: fail(f'{op["where"]}: "lamp" names {js(name)}, but the lamps are {", ".join(lamp_names)}')
            moves.append(f"    tl.add(set.lamp({js(name)}, {js(op['on'])}, {op['dur']:g}), T0 + talk.turns[{op['turn']}].start + {op['delay']:g});      // lamp {'on' if op['on'] else 'off'}")
        for op in power_ops:
            # Mất điện: tắt phụt (0,12 s, không chớp); có điện: các đèn bật lại lần lượt, mỗi cái chớp một nhịp.
            for n, name in enumerate(lamp_names):
                call = f"set.lamp({js(name)}, false, 0.12)" if not op['on'] else f"set.lamp({js(name)}, true, 0.9)"
                moves.append(f"    tl.add({call}, T0 + talk.turns[{op['turn']}].start + {0.2 + (0.3 * n if op['on'] else 0):g});      // power {'on' if op['on'] else 'off'}")
        for op in sky_ops:
            moves.append(f"    tl.add(set.shift({js(op['to'])}, {op['dur']:g}), T0 + talk.turns[{op['turn']}].start);      // the sky turns {op['to']}")
        # Các lần CẮT CẢNH của kịch bản (và của đạo diễn tự động): phụ đề không sót qua chúng.
        moves.append('    const CUTS = [' + ', '.join(f'T0 + talk.turns[{view["turn"]}].start' for view in views if view['cut']) + '];')
        if director and height > width * 1.2 and len(beats) > 1:
            # Khung dọc: toàn cảnh mở đầu chỉ lấy CỤM nhân vật quanh nhịp đầu tiên — bốn người dàn ngang trong khung hẹp là
            # bốn hình tí hon.
            lead = next((beat for beat in beats[1:] if beat.get('subjects')), None)
            if lead:
                centre = sum(float(names[name]['x']) for name in lead['subjects']) / len(lead['subjects'])
                near = [who['name'] for who in names.values() if abs(float(who['_x0']) - centre) <= 700]
                beats[0]['subjects'] = near or lead['subjects']
        if director:
            items, hold = [], None
            gestured = any(op['kind'] in ('gesture', 'talk39') for op in gear_ops)
            for beat in beats:
                time, end = f"T0 + talk.turns[{beat['first']}].start", f"T0 + talk.turns[{beat['last']}].end"
                # Sau lượt TRỜI CHUYỂN: giữ góc toàn tới khi trời chuyển được 75 % (đèn đã tự bật) — cắt sang góc cận sớm thì không
                # ai thấy đèn sáng lên (đợt 24: đầu đèn đường ngoài khung lúc trời tối xong).
                if hold and not beat.get('drift') and not beat.get('fixed'): time = f"Math.max({time}, {hold})"
                if beat.get('drift'): hold = f"T0 + talk.turns[{beat['first']}].start + {beat['drift'] * 0.75:g}"
                items.append(f"{{ time: {time}, fixed: true }}" if beat.get('fixed') else f"{{ time: {time}, end: {end}, subjects: [{', '.join(beat['subjects'])}], size: {js(beat['size'])}" + (', speech: true' if beat.get('speech') else '') + (', move: true' if beat.get('move') else '') + (', floor44b: true' if beat.get('floor44b') else '') + (', lamp: true' if beat.get('lamp') else '') + (', mid: true' if beat.get('mid') else '') + (f", drift: {beat['drift']:g}" if beat.get('drift') else '')
                         + (f", hands: handTimes({beat['first']}, {beat['last']}, [{', '.join(beat['subjects'])}])" if beat['size'] != 'full' and gestured else '')
                         + (f", peaks42d: bodyTimes42d({beat['first']}, {beat['last']}, [{', '.join(beat['subjects'])}])" if beat.get('body42d') else '') + ' }')
            # ĐỘNG TÁC TAY trong nhịp (đợt 33): các lúc (40 / 55 / 70 % bước) người trong chủ thể vẫy / chỉ / giơ ngón — `direct` lấy cả
            # hai bàn tay vào góc trung / cận ở các lúc ấy.
            hand_code = ("    const handTimes = (a, b, rigs) => talk.turns.slice(a, b + 1).filter((turn) => rigs.includes(turn.rig)).flatMap((turn) => turn.steps.filter((step) => "
                         + js(list(GESTURES)) + ".includes(step.name)).flatMap((step) => [0.4, 0.55, 0.7].map((f) => T0 + step.start + step.duration * f)));\n") if gestured else ''
            # ĐỢT 42 D: các lúc (mỗi 10 % bước) người trong chủ thể chạy / nhảy / múa — khung lấy cả người ở đỉnh cú nhảy, lúc tay giơ cao.
            hand_code += ("    const bodyTimes42d = (a, b, rigs) => talk.turns.slice(a, b + 1).filter((turn) => rigs.includes(turn.rig)).flatMap((turn) => turn.steps.filter((step) => "
                          + js(list(MOTION_42D)) + ".includes(step.name)).flatMap((step) => [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((f) => T0 + step.start + step.duration * f)));\n") if any(b.get('body42d') for b in beats) else ''
            moves.append("    // \"camera\": \"auto\" — the camera chooses every shot (a shot lasts at least 2.5 s; turns with their own \"view\" keep it).\n" + hand_code +
                         "    CUTS.push(...set.direct(tl, [\n      " + ',\n      '.join(items) + "\n    ]));")
        if autos:
            moves.insert(0, "    // Automatic views (\"view\": \"close\", { \"on\": … }): measured at build time, at the moment of their turn.\n"
                            "    const frameAt = (time, subjects, size, { span, ...opts } = {}) => { tl.seek(time, false); set.update();\n"
                            "      opts = { view42c: true, ...opts };\n"
                            "      return set.frameOn(subjects, size, span ? { ...opts, at: [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => span[0] + (span[1] - span[0]) * f), seek: (t) => { tl.seek(t, false); set.update(); } } : opts); };")
            moves.append("    tl.seek(0, false); set.update();")
        if moves: view_code = '\n    // Camera: each "view" in the scene file starts with its turn.\n' + '\n'.join(moves)
    # SOÁT GÓC MÁY (bối cảnh 3D): tua cả cảnh, mỗi 0,25 s hỏi set.framing() ai đang bị mép khung cắt dở. tools/scene.py gọi
    # hàm này một lần khi dựng (read_timings) rồi nhắc; lúc render không ai gọi nó.
    framing_code = ''
    if stage_set is not None:
        framing_code = ("    // Read by tools/scene.py: who the frame edge cuts through, every 0.25 s (not called in a render).\n"
                        "    window.__framing = () => { const cut = []; for (let t = T0; t < (T1 || tl.duration()); t += 0.25) { tl.seek(t, false); set.update(); "
                        "set.framing().forEach((c) => cut.push(Object.assign({ t: +t.toFixed(2) }, c))); } tl.seek(0, false); set.update(); return cut; };\n")
    cast_list = ', '.join(names)                             # { vet, dog, … } — tên nhân vật của mỗi lượt (âm thanh theo động tác)
    cue_scripts = ''.join(f'\n  <script src="{voice["key"]}.cues.js"></script>' for voice in voices)
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{scene_id}</title>
<!-- Generated by tools/scene.py from {os.path.basename(args.scene)}. Plain HTML: edit freely, or change the scene file and run the tool again. -->
<style>
  html, body {{ margin: 0; background: #0b1218; }}
  #stage {{ position: relative; width: {width}px; height: {height}px; overflow: hidden; }}
{chr(10).join(style)}
</style>
</head>
<body>
<div id="stage" data-composition-id="{scene_id}" data-start="0" data-duration="__TOTAL__" data-width="{width}" data-height="{height}">
{chr(10).join(body)}

  <script src="gsap.min.js"></script>
  <script src="character.slim.js"></script>{cue_scripts}
  <script>
    VGCharacter.seed({int(scene.get('seed', 7))});
    const $ = (id) => document.getElementById(id);
{chr(10).join(setup)}

    // Turns play in order; the next starts when the previous is done. The camera cuts to whoever speaks.
    const talk = VGCharacter.conversation([
{chr(10).join(lines)}
    ], {{ {camera_code}gap: {float(scene.get('gap', 0.25))} }});

    const tl = gsap.timeline({{ paused: true{timeline_hook} }});
{t0_code}
    talk.addTo(tl, T0);{ride_code}
{depth_code}{view_code}{settle_code}{caption_code}{card_code}{drive_code}
{framing_code}    window.__timelines = window.__timelines || {{}};
    window.__timelines[{js(scene_id)}] = tl;
    // Read by tools/scene.py to fill in the audio clips' data-start; harmless in a render.
    window.__sceneTimings = {{ duration: tl.duration(), outro: T1, turns: talk.turns.map((turn) => [T0 + turn.start, T0 + turn.end]), speech: talk.turns.flatMap((turn) => turn.steps.filter((step) => step.name === 'speakCues').map((step) => ({{ start: T0 + step.start, sound: step.sound, length: step.speech }}))),
      lines: talk.turns.flatMap((turn) => turn.steps.filter((step) => step.text).map((step) => ({{ start: T0 + step.start, end: T0 + step.start + (step.speech || step.duration), text: step.text }}))),
      actions: talk.turns.flatMap((turn) => turn.steps.filter((step) => !step.off && {js(sound_actions)}.includes(step.name)).map((step) => ({{ who: (Object.entries({{ {cast_list} }}).find(([, rig]) => rig === turn.rig) || [''])[0], name: step.name, start: T0 + step.start }}))),
      // Giờ THẬT của các động tác chạm, theo từng lượt — moments.json đo / hỏi trong chính động tác, không theo cả lượt (lượt có
      // quãng chờ máy quay lia trước khi tay đưa ra; con vật chỉ nằm trong vòng tay ở cuối bước `carry` — đợt 29).
      reaches: talk.turns.map((turn) => turn.steps.filter((step) => {js(sorted(set(REACH_ACTIONS) | {'putDown', 'weigh'} | set(GESTURES) | set(CHART_ACTIONS) | set(PET_ACTS) | set(PREP_ACTIONS) | set(PAIR_38) | set(MOTION_42D) | set(FLOOR_42E)))}.includes(step.name)).map((step) => ({{ name: step.name, start: T0 + step.start, duration: step.duration }}))) }};
  </script>
</div>
</body>
</html>
'''
    open(target, 'w', encoding='utf-8').write(html.replace('__TOTAL__', '60'))

    timings = read_timings(out, target)
    total = max(1.0, round(timings['duration'] + 0.6, 1))
    final = html.replace('__TOTAL__', f'{total:g}')
    if len(timings['speech']) != len(voices): fail(f'expected {len(voices)} lip-synced lines but the composition has {len(timings["speech"])}')
    for voice, line in zip(voices, timings['speech']):
        final = final.replace(f'__START_{voice["key"]}__', f'{line["start"]:.2f}')
    final = place_shows(final, timings, total)
    final = place_toasts(final, timings, total)
    final, sound_count = place_sounds(final, timings, sounds, base, out, copied)
    # Thời gian của cảnh cho tools/film.py (phụ đề .srt của cả phim): tổng độ dài và từng câu thoại.
    json.dump({'duration': total, 'lines': timings.get('lines', [])}, open(os.path.join(out, 'timings.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if stage_set is not None:
        json.dump(light_moments(timings, stage_set, power_ops, sky_ops, lamp_ops, gear_ops, names), open(os.path.join(out, 'moments.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if outro: final = final.replace('__OUTRO_START__', f'{timings["outro"]:.2f}').replace('__OUTRO_DUR__', f'{max(0.5, total - timings["outro"]):.2f}')
    # Dấu vân tay của nội dung vừa sinh: lần chạy sau biết tệp có bị sửa tay hay chưa.
    final = final.replace('</html>\n', f'</html>\n<!-- scene.py:{fingerprint(final)} -->\n')
    open(target, 'w', encoding='utf-8').write(final)
    print(f'{target}')
    print(f'  {len(names)} characters · {len(script)} script entries · {len(voices)} voice lines · {total:g} s')
    for voice, line in zip(voices, timings['speech']):
        print(f'  {voice["file"]}: {voice["who"]} at {line["start"]:.2f} s ({voice["length"]:.2f} s)')
    notes += framing_notes(timings.get('framing', []))
    notes += shot_notes(timings.get('shots', []))
    notes += quiet_notes(timings, [note['turn'] for note in toasts] + [pop['turn'] for pop in popups])
    for note in notes: print(f'  ! {note}')
    if preset_note: print(f'  · {preset_note}')
    print(f'next: sh tools/peek.sh {os.path.relpath(target)}      # timings, warnings and a contact sheet')


if __name__ == '__main__':
    main()
