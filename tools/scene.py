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
               Walk a dog (đợt 49 C): ["walkOnLeash", "@dog", 4, 300] — its own turn, first step; clips the leash on if needed (a leash
               handle is given if "holds" is empty), the dog walks with the person (added for you), trots ahead (behind when it starts on the
               far side), sniffs, looks back; both "x" move; the leash stays on ("unleash" later). Cats too (harness); rabbits refused.
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
               PROPS BY NAME (wave 49 A): a step can name a 3D-set cutout as "@<its name>", like a character — the tool resolves it,
               walks the person to stand beside it first, and refuses an unknown name, a character's name or a prop of the wrong kind.
               Boarding: a set.cutouts { "kind": "cage", "name": "chuong", "x": -280, "z": -600, "size": [170, 140], "door": "left" }
               (a cage on the floor: its inside drawn behind a pet in it, the front frame with a barred door in front; "size" in its
               400 × 470 person-sized frame, "door" = the hinge side — left out, the side away from whoever opens it first).
               ["putInCage", "@meo", "@chuong", { "hold": 0.5 }] — picks the pet up first if not carrying it (a "carry" turn is added),
               steps beside the cage on the latch side, kneels, opens the door with one hand (the other arm holds the pet), lowers it
               inside, closes the door. ["takeOutOfCage", "@meo", "@chuong"] — opens, lifts it out, closes, stands holding it (then
               "putDown" sets it by the feet, away from the cage, or "handOverPet"). A pet can start inside: "inCage": "chuong" on it
               (no x / z). The person must stand just in front of the cage: z 12–60 more than the cage's. Dogs, cats and rabbits; a pet
               too big for the door opening is refused (give a bigger "size").
               Pet shop (wave 50 B): ["takeFromShelf", "@ke_hang", { "item": "foodBag" | "treatBox" | "can", "level": "high" | "middle" | "low" }]
               — "@ke_hang" names a set.cutouts picture of the sets repo (gondola_shelf: rows middle / low, pet_food_shelf: high / middle /
               low, medicine_wall_shelf: high / middle) with a "name"; the person walks beside its nearer edge (stand z 10–160 in front of
               it), reaches the row (tiptoe / reach / squat), takes the product, turns it to read the label and keeps it (put away in that
               hand from the start). Without a shelf (["takeFromShelf", { … }] or "left" / "right") it is mimed beside the person.
               ["scanBarcode", "@khach", { "hold": 1.2, "put": "down" | "keep" | "bag", "price": "125.000đ" }] — the cashier takes the
               product the customer holds (they hand it over at the same time, added for you), aims a hand-held scanner at it: red scan
               line, bíp, a price card; then sets it down / keeps it (for "handOver" back) / drops it into a put-away "bag" held in the
               scanner hand. ["scanBarcode"] alone scans the product already in the other hand. Combo ["shopCheckout", "@khach"]:
               scan (kept) → the customer pays by QR (needs a "paystand") → hand it back → wave.
               Grooming 2 (wave 49 B): ["blowDry", "@pet", { "hold": 2.4 }] (dryer nozzle aimed at its back, a visible air stream, the
               fur blown about, ears back, eyes squinting — the fur turns dry and fluffy), ["trimFur", "@pet", { "tool": "scissors" |
               "clipper", "hold": 2.4 }] (tufts fall as the tool passes along the back; the coat ends neater). A sitting pet stands up.
               Exam room (wave 50 A): ["palpate", "@pet", { "part": "belly" | "flank", "hold": 2 }] (both hands on its belly / flanks,
               pressing gently), ["useUltrasound", "@pet", "@<cart>", { "hold": 2.6 }] (the pet lies on its side on the table, gel, a probe
               on its belly, a generic scan picture; "@<cart>" — a picture cutout of the set with a "name", optional: the person glances at
               its screen), ["lookMicroscope", "@<microscope>", { "hold": 2 }] (walks up beside a microscope picture cutout, eye to the
               eyepiece, turns the knob; without a name: the set's only microscope picture, or mimed). The pet turns its tail to the person
               first (hands never cross its face). Pet pose: "lieOnSide".
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
import argparse, os, sys

if os.path.dirname(os.path.abspath(__file__)) not in sys.path: sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))     # scenelib/ sits next to this file
# The build, phase by phase (scenelib/load.py … output.py). Also importable from here: COMBOS, expand_combos, fail, framing_notes, html_text, js, read_timings, slug (tools/reel.py, tools/script.py, tools/ci).
from scenelib.cast import place_cast  # noqa: E402
from scenelib.expand import COMBOS, expand_combos  # noqa: E402
from scenelib.layers import build_layers, place_props  # noqa: E402
from scenelib.load import load_scene  # noqa: E402
from scenelib.notes import framing_notes  # noqa: E402
from scenelib.output import copy_runtime, finish, write_page  # noqa: E402
from scenelib.script_turns import write_turns  # noqa: E402
from scenelib.state import State  # noqa: E402
from scenelib.timeline import cards_and_camera, pose_characters  # noqa: E402
from scenelib.timing import read_timings, retime  # noqa: E402
from scenelib.turns import prepare_turns  # noqa: E402
from scenelib.util import fail, html_text, js, slug  # noqa: E402


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
    st = State(args=args)
    load_scene(st)
    place_cast(st)
    prepare_turns(st)
    write_turns(st)
    place_props(st)
    copy_runtime(st)
    build_layers(st)
    pose_characters(st)
    cards_and_camera(st)
    write_page(st)
    finish(st)


if __name__ == '__main__':
    main()
