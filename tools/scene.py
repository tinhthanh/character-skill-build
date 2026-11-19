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
                      bowl ("fill": "food" | "water" | "empty"), scale ("reading": "4.2 kg"), carrier ("door": "right" | "left"), tree, lamp
           panels also take "image": "dash.png" (a TV / wall screen, a poster, an X-ray)
           "preset": "reception" | "exam" | "pharmacy" | "living-room" | "park" | "street" — a ready-made room or an
           outdoor place (your boxes etc. are added). A person "seated": true with "on": "<box>" sits on that box's front edge
           "camera": { "yaw": 0, "pitch": 6, "distance": 1750, "blur": 4 } }   blur: depth of field, 0 = off
  characters take "x" (0 = middle of the room), "z" (negative = further in) and optionally "on": "<box name>";
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
               `holds`: "cup" | "clipboard" | "phone" | "syringe" | "pills" | "leash" (right hand), { "L": "cup" }, or
               { "R": { "kind": "phone", "image": "app.png" } } (a picture on the screen) — gives a person that item
               to hold. `"holdsHidden": true` keeps it put away, ready to be received with ["take", "@giver"].
  script       one entry per turn, played in order. `say` (+ `audio`, or `dur` seconds) speaks;
               `do` is a list of steps as in `sequence()` — "wave", ["walk", 4, 120], ["face", "@boy"]
               ("@name" refers to another character). Interaction steps: "drink", "write", ["stroke", "@pet"]
               (in a turn without `say` the pet answers at the same time: a cat purrs, a dog wags), exam steps
               ["listen", "@pet"] (stethoscope), ["inject", "@pet"] (needs "holds": "syringe", pet on that hand's side),
               ["carry", "@pet"] … "putDown" (pick the pet up and hold it; pets: "lieDown", ["sleep", 3], "unwell"), phone and
               computer steps ["showPhone", 1.8], ["tapPhone", 1.6], ["typing", 2], ["call", null, 2] (listening), and
               ["handOver", "@other"] together with the other's ["take", "@giver"]. A character that strokes
               or hands over walks up to the target first if it stands out of reach. `shot`: "face" | "wide" | false | ["vet", "bella"]
               overrides the camera for that turn. `{ "together": [ … ] }` runs turns at the same time.
  script       `"mood"` on a turn: happy, sad, surprised, angry, thinking, laughing, worried, confused, tired,
               crying, embarrassed, sleepy. Gestures: "clap", ["countFingers", 3], "checkWatch", "scratchHead",
               "headInHands", "bow", "wai", ["handshake", "@other"] (with the other's ["handshake", "@you"] in "together").
               "ponder", "crossArms", "handsOnHips", "introduce", "callOut", "relief", "startle", "lookAround",
               ["hurry", 6, 200]. Vet care: ["examine", "@pet", "teeth"] (with the pet's "openMouth" in "together"),
               ["giveTreat", "@pet"], ["leash", "@pet"] … "unleash" (needs "holds": "leash"; then walk both "together").
               Pets: "scratchItch", ["limp", 4, 120], ["tremble", 2], ["eat", 2], ["drink", 2], "cough", "openMouth",
               "shakeOff", "sneeze", ["pant", 2], "yawn". Do / don't: "thumbsDown", "stopSign", "fingerWag", "beckon",
               "fingerHeart", "vSign"; grooming ["brush", "@pet"]; a pill ["giveTreat", "@pet", {"kind": "pill"}].
               A pet's `"wears": "cone"` (or "bandage", or both in a list) keeps it on for the whole scene; a person's
               "wears": "mask" | "gloves" | "cap" (or a list). Pets: "greet", "play", ["goIn", 90] … ["comeOut", 90].
               "kneel" … "standUp" (down at a pet on the floor); ["handOverPet", "@vet"] together with the vet's
               ["takePet", "@owner"] (a carried pet passes from one person's arms to the other's); ["throwBall", "right"]
               together with a dog's ["fetch", 260]; a pet's "rub" (against the legs of the person beside it).
               A cutout or prop "carrier" (pet carrier, "door": "right" | "left") — stand a pet behind it to put it inside.
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
import argparse, difflib, hashlib, json, math, os, re, shutil, socket, subprocess, sys, tempfile, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PERSON, PET = (400, 470), (400, 330)          # khung của rig người / thú (đơn vị)


def fail(message):
    print(f'scene: {message}', file=sys.stderr)
    sys.exit(1)


def slug(text):
    value = re.sub(r'[^a-z0-9]+', '-', str(text).lower()).strip('-')
    return value or 'x'


def known(where, given, allowed):
    """Reject keys the tool does not know — a misspelt key would otherwise be ignored in silence."""
    for key in given:
        if key in allowed: continue
        close = difflib.get_close_matches(key, allowed, n=1, cutoff=0.6)
        hint = f' — did you mean "{close[0]}"?' if close else f' (allowed: {", ".join(sorted(allowed))})'
        fail(f'{where}: unknown key "{key}"{hint}')


TOP_KEYS = ('id', 'width', 'height', 'seed', 'gap', 'background', 'characters', 'props', 'script', 'camera', 'captions', 'layout', 'music', 'musicVolume', 'set', 'sides')
CHARACTER_KEYS = ('name', 'id', 'species', 'x', 'height', 'enter', 'seated', 'faces', 'voice', 'holds', 'holdsHidden', 'z', 'on', 'wears', 'side')
WEARABLES = ('cone', 'bandage')                          # phụ kiện thú đeo suốt cảnh (rig.wear)
PERSON_WEARABLES = ('mask', 'gloves', 'cap')              # phụ kiện người: khẩu trang, găng tay, mũ phẫu thuật
PROP_KEYS = ('kind', 'x', 'height', 'color', 'width', 'tabletop', 'back', 'front', 'fill', 'reading', 'door')
TURN_KEYS = ('who', 'say', 'audio', 'dur', 'do', 'shot', 'mood', 'show', 'voice', 'enter', 'exit', 'view', 'phone', 'toast')
SHOW_KEYS = ('title', 'bullets', 'image')
MOODS = ('happy', 'sad', 'surprised', 'angry', 'thinking', 'laughing', 'worried', 'confused', 'tired', 'crying', 'embarrassed', 'sleepy')
BACKGROUND_KEYS = ('wall', 'wallDark', 'floor', 'floorHeight', 'image', 'preset')
# BỐI CẢNH 3D ("set"): phòng dựng bằng mặt phẳng, máy quay đổi góc theo từng lượt ("view"). Xem runtime/set3d.js.
SET_KEYS = ('sky', 'room', 'boxes', 'panels', 'cutouts', 'camera', 'origin', 'preset')
# BỐI CẢNH DỰNG SẴN (`"set": { "preset": "reception" }`): đồ đạc của một căn phòng quen thuộc, đặt theo phòng mặc định
# (rộng 1800, sâu 1300). Hộp / tấm / tấm hình người viết khai thêm thì CỘNG vào sau. Nhân vật vẫn tự đặt (gợi ý chỗ đứng
# ghi ở `spots`, in ra khi dựng). Toạ độ chọn để người đứng ở `spots` không đứng lọt vào lòng hộp.
SET_PRESETS = {
    'reception': {
        'boxes': [{'name': 'counter', 'x': -520, 'z': -430, 'width': 440, 'depth': 140, 'height': 190, 'color': '#c9ad8c', 'top': '#e7d7c2', 'side': '#b89a78'},
                  {'name': 'bench', 'x': 330, 'z': -820, 'width': 360, 'depth': 120, 'height': 90, 'color': '#9fc3cf', 'top': '#d8e9ef', 'side': '#86aebb'}],
        'panels': [{'wall': 'back', 'at': -480, 'y': 560, 'width': 360, 'height': 210, 'color': '#2b2f36', 'border': '10px solid #2b2f36'},
                   {'wall': 'back', 'at': 300, 'y': 580, 'width': 260, 'height': 160, 'color': '#e9f3f6', 'border': '10px solid #ffffff'}],
        'cutouts': [{'kind': 'laptop', 'x': -300, 'z': -470, 'y': 190}, {'kind': 'plant', 'x': 780, 'z': 60, 'height': 600}],
        'spots': 'receptionist behind the counter: x -300, z -620 · visitors: x 150…400, z -380',
    },
    'exam': {
        'boxes': [{'name': 'table', 'x': 100, 'z': -480, 'width': 200, 'depth': 160, 'height': 170, 'color': '#9fc3cf', 'top': '#eef5f7', 'side': '#86aebb'},
                  {'name': 'cabinet', 'x': -780, 'z': -1050, 'width': 260, 'depth': 120, 'height': 330, 'color': '#e9eef1', 'top': '#ffffff', 'side': '#ccd6dc'}],
        'panels': [{'wall': 'back', 'at': -380, 'y': 560, 'width': 260, 'height': 190, 'color': '#ffffff', 'border': '10px solid #dfe9ec'},
                   {'wall': 'back', 'at': 380, 'y': 600, 'width': 180, 'height': 240, 'color': '#d6ecf3', 'border': '8px solid #ffffff'}],
        'cutouts': [{'kind': 'plant', 'x': 760, 'z': 80, 'height': 600}],
        'spots': 'pet on the table: "on": "table", x 200, z -560 · vet: x 40, z -560 · owner: x 360, z -560',
    },
    'pharmacy': {
        'boxes': [{'name': 'counter', 'x': -260, 'z': -420, 'width': 520, 'depth': 130, 'height': 180, 'color': '#f2f4f7', 'top': '#ffffff', 'side': '#d6dbe2'},
                  {'name': 'shelf', 'x': -700, 'z': -1100, 'width': 1400, 'depth': 120, 'height': 420, 'color': '#c9ad8c', 'top': '#e7d7c2', 'side': '#b89a78'}],
        'panels': [{'wall': 'back', 'at': -120, 'y': 640, 'width': 240, 'height': 90, 'color': '#1f8a70', 'border': '6px solid #ffffff'}],
        'cutouts': [{'kind': 'monitor', 'x': 120, 'z': -460, 'y': 180}],
        'spots': 'pharmacist behind the counter: x 0, z -620 · customer: x 0…250, z -300',
    },
    # NGOÀI TRỜI: tường sau là bầu trời + đồi xa (vẽ bằng dải màu), hai tường bên cùng màu trời để không thành vách phòng.
    'park': {
        'room': {'width': 2200, 'depth': 1500, 'floor': '#8cc46d', 'floor2': '#84bb66', 'tile': 260,
                 'wall': 'linear-gradient(#a9d8f2 0%, #dff1fa 58%, #a7d48a 58%, #8fc571 100%)', 'sideWall': 'linear-gradient(#b9e0f4 0%, #dff1fa 58%, #a7d48a 58%, #8fc571 100%)'},
        'boxes': [{'name': 'bench', 'x': 220, 'z': -880, 'width': 340, 'depth': 110, 'height': 85, 'color': '#a47551', 'top': '#c08f66', 'side': '#8c6243'}],
        'cutouts': [{'kind': 'tree', 'x': -720, 'z': -1100}, {'kind': 'tree', 'x': 780, 'z': -1000, 'color': '#5f9a68'}, {'kind': 'lamp', 'x': -260, 'z': -1150},
                    {'kind': 'plant', 'x': 900, 'z': 60, 'height': 560, 'color': '#a47551'}],
        'spots': 'walk the dog along x -600…600, z -500 · on the bench: "on": "bench", x 380, "seated": true (sits in front of it)',
    },
    'street': {
        'room': {'width': 2200, 'depth': 1300, 'floor': '#cfcfc8', 'floor2': '#c2c2bb', 'tile': 150,
                 'wall': 'linear-gradient(#e9d8c2 0%, #e9d8c2 82%, #b9a58c 82%)', 'sideWall': 'linear-gradient(#bfe0f2, #e3f2f9)'},
        'panels': [{'wall': 'back', 'at': -700, 'y': 460, 'width': 420, 'height': 300, 'color': '#a9d6ec', 'border': '14px solid #6b4f3a'},
                   {'wall': 'back', 'at': -200, 'y': 400, 'width': 170, 'height': 300, 'color': '#6b4f3a', 'border': '8px solid #4a3627'},
                   {'wall': 'back', 'at': 120, 'y': 460, 'width': 420, 'height': 300, 'color': '#a9d6ec', 'border': '14px solid #6b4f3a'},
                   {'wall': 'back', 'at': -720, 'y': 610, 'width': 1300, 'height': 90, 'color': '#2f9e8f', 'border': '6px solid #ffffff'}],
        'cutouts': [{'kind': 'lamp', 'x': -900, 'z': -700}, {'kind': 'tree', 'x': 820, 'z': -750}, {'kind': 'lamp', 'x': 500, 'z': -700}],
        'spots': 'pedestrians along x -700…700, z -400 · a shop door at x -115 on the back wall',
    },
    'living-room': {
        'room': {'floor': '#d9c4a8', 'floor2': '#cdb596', 'wall': '#f3ead9', 'sideWall': '#eadfcb'},
        'boxes': [{'name': 'sofa', 'x': -560, 'z': -860, 'width': 520, 'depth': 180, 'height': 150, 'color': '#7a9e9f', 'top': '#8fb3b4', 'side': '#68898a'},
                  {'name': 'coffee-table', 'x': -420, 'z': -560, 'width': 240, 'depth': 120, 'height': 80, 'color': '#a47551', 'top': '#b88a63', 'side': '#8c6243'}],
        'panels': [{'wall': 'back', 'at': 120, 'y': 560, 'width': 380, 'height': 260, 'color': '#bfe0f0', 'border': '14px solid #ffffff'}],
        'cutouts': [{'kind': 'plant', 'x': 700, 'z': -300, 'height': 640}],
        'spots': 'owner on the sofa: "on": "sofa", x -300, z -820, "seated": true · pet on the floor: x 0, z -500',
    },
}
ROOM_KEYS = ('width', 'depth', 'height', 'front', 'floor', 'floor2', 'tile', 'wall', 'sideWall')
BOX_KEYS = ('name', 'x', 'z', 'width', 'depth', 'height', 'y', 'color', 'top', 'side')
PANEL_KEYS = ('wall', 'at', 'y', 'width', 'height', 'color', 'border', 'image')
CUTOUT_KEYS = ('kind', 'image', 'x', 'z', 'y', 'height', 'color', 'shadow', 'screen', 'facing', 'fill', 'reading', 'door')
CUTOUT_KINDS = ('plant', 'chair', 'stool', 'table', 'counter', 'laptop', 'monitor', 'bowl', 'scale', 'carrier', 'tree', 'lamp')
SCREEN_KINDS = ('laptop', 'monitor')                     # đạo cụ có màn hình: nhận `screen` (ảnh) — laptop thêm `facing`
FLOOR_KINDS = ('bowl', 'scale', 'carrier', 'tree', 'lamp')                           # đồ thú y đặt trên sàn: bát (`fill`), cân (`reading`)
ITEM_KINDS = ('cup', 'clipboard', 'phone', 'syringe', 'pills', 'leash')
CAMERA_KEYS = ('yaw', 'pitch', 'distance', 'lens', 'x', 'y', 'z', 'zoom', 'blur')
# Tốc độ lia dễ chịu (mỗi giây) — vượt quá thì hình dời quá xa mỗi khung, ở 30 khung/giây mắt thấy giật cục.
CAMERA_SPEED = {'x': 220, 'y': 160, 'z': 220, 'yaw': 18, 'pitch': 8, 'distance': 420, 'zoom': 0.4}
CAMERA_START = {'yaw': 0, 'pitch': 6, 'distance': 1700, 'x': 0, 'y': 300, 'z': -350, 'zoom': 1}   # máy mặc định của createSet (runtime/set3d.js, `base`)
VIEW_KEYS = CAMERA_KEYS + ('dur', 'ease', 'cut', 'wide')
# Giới hạn máy quay — giống LIMITS trong runtime/set3d.js: chúc cao hơn thì nhân vật lộ là tấm bìa dựng trên sàn,
# vòng xa hơn thì không có mặt sau để xoay tới.
PITCH_LIMITS, YAW_LIMIT, NORMAL_LENS = (-8, 15), 60, 1700
ROOM_DEFAULTS = {'width': 1800, 'depth': 1300, 'height': 700, 'front': 200, 'floor': '#b7ccd3', 'floor2': '#a9c1c9', 'tile': 200,
                 'wall': 'linear-gradient(#d9e8ec, #c3d8de)', 'sideWall': 'linear-gradient(#cfdfe4, #b8ced5)'}


def check_camera(values, where):
    if 'pitch' in values and not PITCH_LIMITS[0] <= values['pitch'] <= PITCH_LIMITS[1]:
        fail(f'{where}: pitch {values["pitch"]} is outside {PITCH_LIMITS[0]}…{PITCH_LIMITS[1]}° — from higher up the characters read as cards standing on the floor. For a view of the whole room use "wide": true')
    if 'yaw' in values and abs(values['yaw']) > YAW_LIMIT:
        fail(f'{where}: yaw {values["yaw"]} is beyond ±{YAW_LIMIT}° — the characters have no back to show')
    if 'lens' in values and values['lens'] < 400: fail(f'{where}: lens {values["lens"]} is too short (at least 400)')
    if 'blur' in values and not 0 <= values['blur'] <= 30: fail(f'{where}: blur {values["blur"]} must be within 0…30')


def fingerprint(html):
    """Short hash of a generated page, ignoring the line that stores the hash itself."""
    return hashlib.sha256(re.sub(r'<!-- scene\.py:[0-9a-f]{16} -->\n?', '', html).encode('utf-8')).hexdigest()[:16]


def read_timings(folder, target):
    """Load the composition once in headless Chrome and return its window.__sceneTimings."""
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    if not chrome: fail('no Chrome found (tools/chrome.sh) — it is needed to time the audio clips')
    with socket.socket() as probe_socket:                   # một cổng trống do hệ điều hành cấp
        probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={folder}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT)
    try:
        url = f'http://127.0.0.1:{port}/__project/{os.path.basename(target)}'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        with tempfile.TemporaryDirectory() as work:
            log = os.path.join(work, 'log')
            probe = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '45', '--fail-on-error',
                                    '--eval', 'window.__sceneTimings', '--log', log], capture_output=True, text=True)
            errors = open(log, encoding='utf-8').read().strip() if os.path.exists(log) else ''
        if probe.returncode != 0 or not probe.stdout.strip() or probe.stdout.strip() == 'null':
            fail('the composition did not build:\n  ' + (errors or probe.stderr.strip() or 'no error message').replace('\n', '\n  ') + f'\n  (see {target})')
        return json.loads(probe.stdout)
    finally:
        server.terminate()


def retime(target):
    """Re-read the timing of a (possibly hand-edited) generated composition and write it back:
    every <audio> clip's data-start / data-duration, and the total data-duration of the clips."""
    if not os.path.isfile(target): fail(f'no such file: {target}')
    html = open(target, encoding='utf-8').read()
    if '__sceneTimings' not in html: fail(f'{target} was not written by tools/scene.py (it has no window.__sceneTimings) — time it from the tools/peek.sh printout instead')
    timings = read_timings(os.path.dirname(os.path.abspath(target)), target)
    stage = re.search(r'data-composition-id="[^"]*"[^>]*data-duration="([\d.]+)"', html)
    if not stage: fail('could not find the composition root (data-composition-id … data-duration)')
    old_total, new_total = stage.group(1), f"{max(1.0, round(timings['duration'] + 0.6, 1)):g}"
    changed = []
    for line in timings['speech']:
        if not line.get('sound'): continue
        pattern = re.compile(r'(<audio\b[^>]*\bsrc="(?:[^"]*/)?' + re.escape(line['sound']) + r'"[^>]*>)')
        found = pattern.search(html)
        if not found: print(f'  ! no <audio src="{line["sound"]}"> clip for the line lip-synced at {line["start"]:.2f} s'); continue
        tag = re.sub(r'data-start="[^"]*"', f'data-start="{line["start"]:.2f}"', found.group(1))
        tag = re.sub(r'data-duration="[^"]*"', f'data-duration="{line["length"]:.2f}"', tag)
        if tag != found.group(1): changed.append(f'{line["sound"]} → {line["start"]:.2f} s')
        html = html[:found.start()] + tag + html[found.end():]
    if new_total != old_total:
        html = html.replace(f'data-start="0" data-duration="{old_total}"', f'data-start="0" data-duration="{new_total}"')
        changed.append(f'total {old_total} → {new_total} s')
    html = place_shows(html, timings, float(new_total))
    html = place_toasts(html, timings, float(new_total))
    open(target, 'w', encoding='utf-8').write(html)
    print(target)
    print('  ' + ('; '.join(changed) if changed else 'already in time — nothing changed'))


def html_text(text):
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def place_shows(html, timings, total):
    """Fill in data-start / data-duration of every content clip (title, bullet, image) from the turn timings."""
    turns = timings.get('turns')
    if not turns: return html
    def fix(match):
        tag = match.group(0)
        turn = int(re.search(r'data-show-turn="(\d+)"', tag).group(1))
        part = float(re.search(r'data-show-part="([\d.]+)"', tag).group(1))
        until = re.search(r'data-show-until="(\w+)"', tag).group(1)
        begin, finish = turns[turn]
        start = begin + part * max(0.0, finish - begin - 0.6) * 0.85               # các ý hiện dần trong lúc câu ấy được nói
        if turn == 0 and part == 0: start = 0.0                                    # nội dung đầu tiên có mặt từ khung 0 — khung ấy là ảnh bìa của video
        end = total if until == 'end' else turns[int(until)][0]
        tag = re.sub(r'data-start="[^"]*"', f'data-start="{start:.2f}"', tag, count=1)
        return re.sub(r'data-duration="[^"]*"', f'data-duration="{max(0.2, end - start):.2f}"', tag, count=1)
    return re.sub(r'<(?:div|img)\b[^>]*\bdata-show-turn="\d+"[^>]*>', fix, html)


def place_toasts(html, timings, total):
    """Fill in data-start / data-duration of every notification card (`"toast"`) from the turn timings: it slides in
    0.2 s into its turn and stays for the turn (2.5–4 s)."""
    turns = timings.get('turns')
    if not turns: return html
    def fix(match):
        tag = match.group(0)
        turn = int(re.search(r'data-toast-turn="(\d+)"', tag).group(1))
        begin, finish = turns[min(turn, len(turns) - 1)]
        start = begin + 0.2
        length = min(4.0, max(2.5, finish - begin), max(0.5, total - start))
        tag = re.sub(r'data-start="[^"]*"', f'data-start="{start:.2f}"', tag, count=1)
        return re.sub(r'data-duration="[^"]*"', f'data-duration="{length:.2f}"', tag, count=1)
    return re.sub(r'<div\b[^>]*\bdata-toast-turn="\d+"[^>]*>', fix, html)


def speak_line(base, who, voice, words, where):
    """Make (once) the voice file of one spoken line with the `voice-tts` command and return its path
    relative to the scene file. The file name carries a hash of the voice and the words, so a line is
    synthesised again only when either changes — TTS output differs from run to run, and a voice that
    changed under a finished scene would move every lip-sync cue and every start time."""
    digest = hashlib.sha256(f'{voice}\n{words}'.encode('utf-8')).hexdigest()[:8]
    relative = os.path.join('voice', f'{slug(who)}-{digest}.wav')
    target = os.path.join(base, relative)
    if os.path.isfile(target): return relative
    program = os.environ.get('VOICE_TTS') or shutil.which('voice-tts') or (os.path.expanduser('~/.local/bin/voice-tts') if os.path.isfile(os.path.expanduser('~/.local/bin/voice-tts')) else None)
    if not program:
        fail(f'{where}: "voice" needs the voice-tts command (Vietnamese text-to-speech), which is not installed.\n'
             '  Install:  uv tool install "git+https://github.com/tinhthanh/voice-process#subdirectory=tts"  &&  voice-tts download-models\n'
             '  Or give the line an "audio" file of your own, or drop "voice" to estimate the mouth from the text.')
    os.makedirs(os.path.dirname(target), exist_ok=True)
    done = subprocess.run([program, 'say', words, '-v', voice, '-o', target, '--sample-rate', '24000'], capture_output=True, text=True)
    if done.returncode != 0 or not os.path.isfile(target):
        fail(f'{where}: voice-tts could not speak this line with voice "{voice}":\n  ' + (done.stderr.strip() or done.stdout.strip() or 'no message').splitlines()[-1] + '\n  (voices: run `voice-tts voices`)')
    print(f'  voice: {relative}  ({voice})')
    return relative


# ── PHÔNG NỀN dựng sẵn: mỗi phông là một ảnh SVG 1920 × 1080 đặt làm nền của MỘT phần tử (#wall) — HyperFrames
# không nhận clip lồng phần tử con — cùng màu sàn đi kèm. Vẽ phẳng, ít chi tiết, để nhân vật vẫn là thứ nổi nhất.
def _svg(body):
    return "data:image/svg+xml," + urllib.parse.quote(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">{body}</svg>', safe="/:=' ")


PRESETS = {
    # Phòng khám: tường xanh ngọc nhạt, cửa sổ, tủ thuốc có chữ thập, bảng đo thị lực.
    'clinic': {'floor': '#b9cfd2', 'wallDark': '#9fbfc4', 'svg': '''
        <rect width="1920" height="1080" fill="#d6ebec"/><rect y="760" width="1920" height="320" fill="#c4dfe1"/>
        <rect x="1180" y="150" width="420" height="330" rx="10" fill="#f4fbfc"/><rect x="1196" y="166" width="388" height="298" fill="#bfe3f2"/>
        <path d="M 1390 166 V 464 M 1196 315 H 1584" stroke="#f4fbfc" stroke-width="14"/><path d="M 1196 380 Q 1300 330 1400 372 T 1584 350 V 464 H 1196 Z" fill="#9ed0a8" opacity=".7"/>
        <rect x="250" y="180" width="300" height="360" rx="12" fill="#f6fbfb" stroke="#a9c9cc" stroke-width="6"/><path d="M 400 180 V 540" stroke="#a9c9cc" stroke-width="5"/>
        <path d="M 318 300 h 34 v -34 h 28 v 34 h 34 v 28 h -34 v 34 h -28 v -34 h -34 z" fill="#e2574c"/>
        <rect x="760" y="210" width="210" height="270" rx="8" fill="#ffffff" stroke="#b7cfd2" stroke-width="5"/>
        <path d="M 800 262 h 130 M 815 312 h 100 M 828 356 h 74 M 840 394 h 50 M 850 428 h 30" stroke="#7d989c" stroke-width="12" stroke-linecap="round"/>
        <rect y="742" width="1920" height="20" fill="#a9c9cc"/>'''},
    # Sảnh lễ tân: tường ấm, dải gỗ, biển chữ thập xanh, chậu cây, hai khung ảnh.
    'lobby': {'floor': '#c9b79f', 'wallDark': '#d9c7ae', 'svg': '''
        <rect width="1920" height="1080" fill="#f1e6d3"/><rect y="560" width="1920" height="210" fill="#e3d2b6"/><rect y="548" width="1920" height="14" fill="#c9b08a"/>
        <rect x="150" y="150" width="240" height="180" rx="8" fill="#ffffff" stroke="#b9a078" stroke-width="8"/><circle cx="270" cy="232" r="46" fill="#f2b56b"/><path d="M 170 312 L 240 250 L 300 300 L 340 270 L 372 312 Z" fill="#8fbf8a"/>
        <rect x="460" y="170" width="170" height="150" rx="8" fill="#ffffff" stroke="#b9a078" stroke-width="8"/><path d="M 508 262 q -16 -34 14 -40 q 8 -30 34 -8 q 30 -2 20 28 q 14 30 -22 30 z" fill="#e58b8b"/>
        <circle cx="1560" cy="250" r="96" fill="#3f9a8c"/><path d="M 1532 222 h 0 M 1538 180 h 44 v 48 h 48 v 44 h -48 v 48 h -44 v -48 h -48 v -44 h 48 z" fill="#ffffff"/>
        <path d="M 1120 760 h 110 l -14 -120 h -82 z" fill="#b97a4e"/><path d="M 1175 640 q -70 -90 -30 -210 q 30 80 30 210 M 1175 640 q 80 -70 70 -190 q -60 70 -70 190 M 1175 640 q -110 -40 -130 -130 q 90 20 130 130" fill="#5fa46a"/>
        <rect y="752" width="1920" height="18" fill="#b9a078"/>'''},
    # Phòng ở nhà: tường vàng kem, cửa sổ rèm, kệ sách, đèn cây.
    'home': {'floor': '#b98f6a', 'wallDark': '#e2cfa6', 'svg': '''
        <rect width="1920" height="1080" fill="#f3e7c6"/>
        <rect x="220" y="140" width="460" height="360" rx="10" fill="#fffaf0"/><rect x="238" y="158" width="424" height="324" fill="#bfe0f0"/><path d="M 450 158 V 482" stroke="#fffaf0" stroke-width="14"/>
        <path d="M 200 130 h 150 q -20 190 -90 380 h -60 z M 700 130 h -150 q 20 190 90 380 h 60 z" fill="#e59f8a"/><rect x="180" y="116" width="540" height="22" rx="8" fill="#9a6a4a"/>
        <rect x="1250" y="200" width="430" height="380" fill="#c99a6c"/><path d="M 1250 326 H 1680 M 1250 452 H 1680" stroke="#9a6a4a" stroke-width="12"/>
        <path d="M 1280 220 h 34 v 96 h -34 z M 1322 240 h 30 v 76 h -30 z M 1362 226 h 40 v 90 h -40 z M 1430 250 h 28 v 66 h -28 z M 1290 350 h 44 v 92 h -44 z M 1350 366 h 30 v 76 h -30 z M 1540 346 h 36 v 96 h -36 z M 1300 476 h 60 v 94 h -60 z M 1480 490 h 34 v 80 h -34 z" fill="#7fa7c9"/>
        <path d="M 1326 240 h 22 M 1434 250 h 20 M 1354 366 h 22" stroke="#e8c15a" stroke-width="8"/>
        <path d="M 960 770 V 420" stroke="#6e5a48" stroke-width="12"/><path d="M 900 420 h 120 l -24 -110 h -72 z" fill="#f2c86b"/><ellipse cx="960" cy="772" rx="60" ry="12" fill="#6e5a48"/>
        <rect y="752" width="1920" height="18" fill="#d9c08e"/>'''},
}


def image_size(path):
    """(width, height) in px read from the file's header — PNG, JPEG, GIF or WebP; None for anything else."""
    with open(path, 'rb') as fh: head = fh.read(64 * 1024)
    if head[:8] == b'\x89PNG\r\n\x1a\n': return int.from_bytes(head[16:20], 'big'), int.from_bytes(head[20:24], 'big')
    if head[:6] in (b'GIF87a', b'GIF89a'): return int.from_bytes(head[6:8], 'little'), int.from_bytes(head[8:10], 'little')
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        kind = head[12:16]
        if kind == b'VP8X': return 1 + int.from_bytes(head[24:27], 'little'), 1 + int.from_bytes(head[27:30], 'little')
        if kind == b'VP8 ': return int.from_bytes(head[26:28], 'little') & 0x3FFF, int.from_bytes(head[28:30], 'little') & 0x3FFF
        if kind == b'VP8L':
            bits = int.from_bytes(head[21:25], 'little'); return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if head[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(head):
            if head[i] != 0xFF: i += 1; continue
            marker, length = head[i + 1], int.from_bytes(head[i + 2:i + 4], 'big')
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                return int.from_bytes(head[i + 7:i + 9], 'big'), int.from_bytes(head[i + 5:i + 7], 'big')
            i += 2 + length
    return None


def copy_asset(base, out, rel, copied):
    """Copy a picture the scene names into the output folder and return the name to use for it.
    Two different files with the same name (props/a/sprite.png, props/b/sprite.png) get distinct names
    (sprite.png, sprite-2.png) instead of overwriting each other; the same file named twice is copied once."""
    source = os.path.abspath(os.path.join(base, rel))
    if source in copied: return copied[source]
    stem, ext = os.path.splitext(os.path.basename(rel)); name, n = stem + ext, 1
    while name in copied.values(): n += 1; name = f'{stem}-{n}{ext}'
    copied[source] = name
    if source != os.path.abspath(os.path.join(out, name)): shutil.copy(source, os.path.join(out, name))
    return name


def js(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)     # --help in đủ định dạng tệp kịch bản
    parser.add_argument('scene', nargs='?')
    parser.add_argument('--retime', metavar='INDEX_HTML', help='re-time a generated composition after hand edits: fix every <audio> clip and the total duration in place')
    parser.add_argument('-o', '--output', help='output folder (default: <scene folder>/<id>)')
    parser.add_argument('--force', action='store_true', help='overwrite index.html even if it was edited by hand since the tool wrote it')
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
    known('scene', scene, TOP_KEYS)
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
            for key in ('boxes', 'panels', 'cutouts'): merged[key] = [dict(item) for item in preset.get(key, [])] + list(stage_set.get(key, []))
            if 'room' in preset: merged['room'] = dict(preset['room'], **stage_set.get('room', {}))
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
            if ('screen' in item or 'facing' in item) and item.get('kind') not in SCREEN_KINDS: fail(f'set.cutouts[{n}]: "screen" and "facing" are for "laptop" and "monitor" only')
            if 'facing' in item and (item.get('kind') != 'laptop' or item['facing'] not in ('away', 'viewer')): fail(f'set.cutouts[{n}].facing must be "away" or "viewer" (laptop only)')
            if item.get('screen') and not os.path.isfile(os.path.join(folder, item['screen'])): fail(f'set.cutouts[{n}].screen not found: {item["screen"]} (looked in {folder})')
            if 'fill' in item and (item.get('kind') != 'bowl' or item['fill'] not in ('food', 'water', 'empty')): fail(f'set.cutouts[{n}].fill must be "food", "water" or "empty" (bowl only)')
            if 'door' in item and (item.get('kind') != 'carrier' or item['door'] not in ('left', 'right')): fail(f'set.cutouts[{n}].door must be "left" or "right" (carrier only)')
            if 'reading' in item and (item.get('kind') != 'scale' or not isinstance(item['reading'], str)): fail(f'set.cutouts[{n}].reading is the text on a scale\'s display, such as "4.2 kg" (scale only)')
        for n, item in enumerate(stage_set.get('panels', [])):
            if item.get('wall', 'back') not in ('back', 'left', 'right'): fail(f'set.panels[{n}].wall must be "back", "left" or "right"')
            for key in ('at', 'y', 'width', 'height'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.panels[{n}] needs a number "{key}"')
            if item.get('image') and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['image'])): fail(f'set.panels[{n}].image not found: {item["image"]}')
        # Những thứ của cảnh PHẲNG không có nghĩa trong bối cảnh 3D — báo rõ thay vì lặng lẽ bỏ qua.
        for key, why in (('props', 'use set.boxes'), ('background', 'use set.sky and set.room'), ('camera', 'put "view" on the turns instead')):
            if scene.get(key): fail(f'"{key}" cannot be combined with "set" — {why}')
        if scene.get('layout', 'stage') != 'stage': fail('"layout": "presenter" cannot be combined with "set"')
    base = os.path.dirname(os.path.abspath(args.scene))
    scene_id = slug(scene.get('id') or os.path.splitext(os.path.basename(args.scene))[0])
    width, height = int(scene.get('width', 1920)), int(scene.get('height', 1080))
    out = os.path.abspath(args.output or os.path.join(base, scene_id))
    copied = {}                                             # ảnh đã chép: nguồn → tên trong thư mục ra
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
        if 'x' not in who: fail(f'character "{name}" needs "x" (where it stands, px from the left)')
        if who.get('enter') not in (None, False, True, 'left', 'right'): fail(f'character "{name}": "enter" must be "left", "right" or true (the nearer edge)')
        # `true` = mép GẦN chỗ đứng hơn: đi vào từ mép xa là băng ngang qua những nhân vật đứng giữa đường.
        nearer = 'left' if float(who['x']) < (0 if stage_set is not None else width / 2) else 'right'          # bối cảnh 3D: x = 0 là giữa phòng
        if who.get('enter') is True: who['enter'] = nearer
        if not who.get('enter'): who.pop('enter', None)
        if late.get(name) is True: late[name] = nearer
        if pet and who.get('voice'): fail(f'character "{name}": a pet cannot have a "voice"')
        if stage_set is None and ('z' in who or 'on' in who): fail(f'character "{name}": "z" and "on" place a character in a 3D set — add "set" at the top of the scene file')
        if stage_set is not None:
            if 'on' in who and who['on'] not in [box.get('name') for box in stage_set.get('boxes', [])]: fail(f'character "{name}": "on" must name one of set.boxes (got {js(who["on"])})')
        # `holds`: tên món đồ (cầm tay phải) hoặc { "L" | "R": tên }.
        if 'holds' in who or 'holdsHidden' in who:
            if pet: fail(f'character "{name}": a pet cannot hold an item')
            held = who.get('holds')
            if isinstance(held, str): held = {'R': held}
            # Một món đồ: tên, hoặc { "kind": "phone", "image": "app.png" } (ảnh trên màn hình điện thoại).
            def item_ok(item):
                if isinstance(item, dict): return item.get('kind') in ITEM_KINDS and set(item) <= {'kind', 'image'} and (not item.get('image') or item['kind'] == 'phone')
                return item in ITEM_KINDS
            if not isinstance(held, dict) or not held or any(side not in ('L', 'R') or not item_ok(item) for side, item in held.items()):
                fail(f'character "{name}": "holds" must be one of {", ".join(ITEM_KINDS)}, an object such as {{"L": "cup"}}, or {{"R": {{"kind": "phone", "image": "app.png"}}}} — got {js(who.get("holds"))}')
            for item in held.values():
                if isinstance(item, dict) and item.get('image') and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['image'])): fail(f'character "{name}": holds image not found: {item["image"]}')
            if who.get('holdsHidden') not in (None, False, True): fail(f'character "{name}": "holdsHidden" must be true or false')
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
    voices = []                                             # { key, file, text }

    def step_code(step, where, actor=None):
        if isinstance(step, (int, float)): return js(step)
        if isinstance(step, str): return js(step)
        if not isinstance(step, list) or not step or not isinstance(step[0], str): fail(f'{where}: a step is "name", ["name", args…] or a number — got {js(step)}')
        parts = []
        for item in step:
            if isinstance(item, str) and item.startswith('@'):
                if item[1:] not in names: fail(f'{where}: "{item}" refers to a character that is not in the scene')
                # Bối cảnh 3D: chỉ tay / vuốt ve nhắm theo vị trí TRONG PHÒNG (set.target), không theo màn hình lúc dựng —
                # máy quay còn đổi góc sau đó.
                if stage_set is not None and actor and step[0] in ('point', 'stroke', 'examine', 'giveTreat'): parts.append(f"set.target({actor}, {item[1:]})")
                elif stage_set is not None and actor and step[0] in ('listen', 'inject', 'brush'): parts.append(f"set.target({actor}, {item[1:]}, 'body')")
                else: parts.append(item[1:])
            else:
                parts.append(js(item))
        return '[' + ', '.join(parts) + ']'

    def turn_code(turn, where):
        if not isinstance(turn, dict) or turn.get('who') not in names: fail(f'{where}: "who" must name a character in the scene (got {js(turn.get("who") if isinstance(turn, dict) else turn)})')
        known(where, turn, TURN_KEYS)
        who = names[turn['who']]
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
            if mood not in MOODS: fail(f'{where}: "mood" must be one of {", ".join(MOODS)} — got {js(mood)}')
            if who['_pet']: fail(f'{where}: "{who["name"]}" is a pet — pets have no "mood"; use an action such as "wagTail" or "hiss"')
            if 'say' not in turn: steps.append(f"['express', {js(mood)}, 0.9]")
        # Tuỳ chọn của bước NÓI: nét mặt giữ suốt câu, và — ở bố cục người dẫn khung ngang — tay diễn là tay phía BẢNG
        # NỘI DUNG (bảng nằm bên kia khung hình so với người dẫn). Không thì người dẫn mở tay ra ngoài, quay lưng với nội dung.
        options = []
        if mood and 'say' in turn: options.append(f'mood: {js(mood)}')
        if scene.get('layout') == 'presenter' and width >= height and not who['_pet']: options.append(f"hand: {js('L' if float(who['x']) > width / 2 else 'R')}")
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
        if stage_set is not None and turn.get('do') and 'say' not in turn and isinstance(view, dict) and not view.get('cut') and not view.get('wide'):
            steps.append(f"{float(view.get('dur', 1.5)):g}")
        for step in turn.get('do', []):
            steps.append(step_code(step, where, who['name']))
        if turn.get('exit'):
            # Quãng đi ra tính sẵn như `enter`: tới mép khung cộng phần đầu / thân, để nhân vật khuất hẳn rồi mới ẩn.
            leaving = (float(who['x']) if turn['exit'] == 'left' else width - float(who['x'])) + (0.39 if not who['_pet'] else 0.6) * who['_host_height']
            if stage_set is not None:
                half = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))['width'] / 2
                leaving = (float(who['x']) + half if turn['exit'] == 'left' else half - float(who['x'])) + 0.55 * who['_host_width']
            steps.append(f"['exit', {js(turn['exit'])}, {round(leaving / who['_unit'])}]")
        if not steps: fail(f'{where}: a turn needs "say", "do", "mood", "enter" or "exit"')
        body = f"[{who['name']}, " + ', '.join(steps) + ']'
        # Câu nói NHẮC TÊN một con vật trong cảnh ("Bella rất khoẻ mạnh") mà không khai `shot`: đưa cả con vật vào khung.
        if 'shot' not in turn and 'say' in turn:
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
    if layout not in ('stage', 'presenter', 'split'): fail(f'"layout" must be "stage", "presenter" or "split", got {js(layout)}')
    if 'sides' in scene and layout != 'split': fail('"sides" (a background for each half) needs "layout": "split"')
    speakers = []                                           # màn hình chia đôi: (chỉ số lượt, nửa của người nói) — nửa kia tối đi
    # Chỉ số "phẳng" của từng lượt trong talk.turns: các lượt mở đầu (thú ngồi sẵn, bước vào, quay mặt) đứng trước kịch bản.
    flat = sum(1 for who in names.values() if who['_pet'] and who.get('seated')) + len(arrivals)
    shows = []                                              # { turn: chỉ số phẳng, title, bullets, image } hoặc { turn, clear: True }
    toasts = []                                             # { turn: chỉ số lượt trong conversation, title, text } — thẻ thông báo trên khung
    # GÓC MÁY của bối cảnh 3D: `"view"` trên một lượt đổi máy quay đúng lúc lượt ấy bắt đầu. `emitted` đếm số lượt THẬT SỰ
    # đã phát ra trong talk.turns (kể cả lượt "bước lại gần" chèn thêm), để biết lượt ấy mang chỉ số nào.
    views, emitted, reach_notes, pace_notes = [], [flat], [], []
    # Máy quay HIỆN TẠI (để tính quãng lia của mỗi "view"): góc máy đầu cảnh, cộng dồn qua từng view.
    camera_now = {key: float(value) for key, value in dict(CAMERA_START, **(stage_set.get('camera', {}) if stage_set is not None else {})).items() if key in CAMERA_SPEED}
    def view_of(turn, where):
        view = turn.get('view')
        if view is None: return
        if stage_set is None: fail(f'{where}: "view" moves the camera of a 3D set — add "set" at the top of the scene file')
        if not isinstance(view, dict) or not view: fail(f'{where}: "view" must be an object such as {{ "yaw": 20, "distance": 1200, "dur": 2 }}')
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
    for index, entry in enumerate(script):
        where = f'script[{index}]'
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
        flat += len(entry['together']) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else 1
        # LẠI GẦN trước khi vuốt ve / đưa đồ: tay nhân vật ngắn (với tới chừng 0,2 × chiều cao host). Đích đứng xa hơn tầm
        # ấy thì chèn một lượt bước tới trước — người vuốt ve dừng cách con vật 0,24 × chiều cao, người đưa đồ dừng cách
        # người nhận 0,45 × chiều cao (hai cánh tay cùng vươn). Chỗ đứng mới được ghi lại cho các lượt sau.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or turn.get('who') not in names: continue
            who = names[turn['who']]
            if who['_pet'] or who.get('seated'): continue
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] in ('stroke', 'handOver', 'listen', 'inject', 'carry', 'handshake', 'examine', 'giveTreat', 'brush', 'handOverPet') and isinstance(step[1], str) and step[1][1:] in names): continue
                if stage_set is not None and abs(float(names[step[1][1:]].get('z', -300)) - float(who.get('z', -300))) > 60:
                    # Rig 2D chỉ vươn tay trong MẶT PHẲNG của chính nó: con vật / người nhận đứng gần máy hơn (hay xa hơn) thì
                    # trên màn hình nó thấp hơn (cao hơn) chỗ bàn tay với tới. Bước lại gần chỉ đi theo trục x.
                    reach_notes.append(f'{where}: "{who["name"]}" reaches for "{step[1][1:]}" ({step[0]}), which stands at z {float(names[step[1][1:]].get("z", -300)):g} — {abs(float(names[step[1][1:]].get("z", -300)) - float(who.get("z", -300))):g} units nearer or further than "{who["name"]}" (z {float(who.get("z", -300)):g}). A hand only reaches in its own plane: give them the same z (within 60)')
                gap = float(names[step[1][1:]]['x']) - float(who['x'])
                # Đưa đồ: hai cánh tay cùng vươn (0,45); bắt tay: bàn tay gặp nhau ở giữa, đứng gần hơn (0,38); chạm tới con vật: gần như vuốt ve.
                # Soi đèn / đưa bánh thưởng tới ĐẦU con vật (cao hơn thân, xa vai hơn): đứng sát hơn nữa (0,16), không thì tay
                # chibi chỉ chĩa về phía đầu mà không tới — đèn soi rọi vào thành bàn.
                wanted = {'handOver': 0.45, 'handOverPet': 0.42, 'handshake': 0.38, 'examine': 0.16, 'giveTreat': 0.16}.get(step[0], 0.24) * who['_host_height']
                if abs(gap) <= wanted + 0.05 * who['_host_height']: continue
                move = (abs(gap) - wanted) * (1 if gap > 0 else -1)
                turns.append((f'  // {who["name"]} steps closer to {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                emitted[0] += 1
                who['x'] = float(who['x']) + move
        if layout == 'split':
            talker = next((turn for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]) if isinstance(turn, dict) and turn.get('say') and turn.get('who') in names), None)
            speakers.append((emitted[0], names[talker['who']]['side'] if talker else None))      # lượt không lời: cả hai nửa sáng
        # THẺ THÔNG BÁO trên khung (`"toast"`): gắn với lượt của chính mục này (sau các bước lại gần vừa chèn).
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'toast' not in turn: continue
            note = turn['toast'] if isinstance(turn['toast'], dict) else {'title': turn['toast']}
            if not isinstance(note, dict) or not isinstance(note.get('title', ''), str) or not isinstance(note.get('text', ''), str) or set(note) - {'title', 'text'} or not (note.get('title') or note.get('text')):
                fail(f'{where}: "toast" is a string, or {{ "title": "…", "text": "…" }} — got {js(turn["toast"])}')
            toasts.append({'turn': emitted[0], 'title': note.get('title', ''), 'text': note.get('text', '')})
        if isinstance(entry, dict) and 'together' in entry:
            if 'shot' in entry: fail(f'{where}: "shot" cannot sit on a "together" entry — put it on one of the turns inside it')
            known(where, entry, ('together',))
            if not isinstance(entry['together'], list) or not entry['together']: fail(f'{where}: "together" must be a non-empty list of turns')
            if any(isinstance(turn, dict) and 'view' in turn for turn in entry['together']): fail(f'{where}: "view" cannot sit inside "together" — put it on a turn of its own, before or after')
            emitted[0] += len(entry['together'])
            turns.append((None, '{ together: [' + ', '.join(turn_code(turn, f'{where}.together[{n}]') for n, turn in enumerate(entry['together'])) + '] }'))
        else:
            code = turn_code(entry, where)
            view_of(entry, where)
            if stage_set is not None and 'shot' in entry: fail(f'{where}: "shot" frames the 2D camera — in a 3D set move the camera with "view" instead')
            # Lượt KHÔNG LỜI có `["stroke", "@con vật"]`: con vật đáp lại cùng lúc — mèo gừ gừ, chó vẫy đuôi. Muốn khác thì
            # tự viết `together`.
            stroked = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'stroke' and isinstance(step[1], str) and step[1].startswith('@')]
            pets = [name for name in stroked if name in names and names[name]['_pet']]
            if pets and 'say' not in entry and code.startswith('['):
                pet = names[pets[0]]
                code = '{ together: [' + code + f", [{pet['name']}, {js('purr' if 'cat' in pet['species'] else 'wagTail')}]] }}"
                emitted[0] += 1
            turns.append((None, code))
            emitted[0] += 1

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
        if not isinstance(prop, dict) or prop.get('kind') not in ('chair', 'stool', 'table', 'counter') + FLOOR_KINDS or 'x' not in prop: fail(f'props[{index}] needs "kind" (chair, stool, table, counter, bowl, scale, carrier) and "x"')
        if 'fill' in prop and (prop['kind'] != 'bowl' or prop['fill'] not in ('food', 'water', 'empty')): fail(f'props[{index}].fill must be "food", "water" or "empty" (bowl only)')
        if 'reading' in prop and (prop['kind'] != 'scale' or not isinstance(prop['reading'], str)): fail(f'props[{index}].reading is the text on a scale\'s display, such as "4.2 kg" (scale only)')
        known(f'props[{index}]', prop, PROP_KEYS)
        host_height = float(prop.get('height', person_default))
        props.append({'element': f'prop-{index + 1}-{prop["kind"]}', 'kind': prop['kind'], 'left': float(prop['x']) - host_height * PERSON[0] / PERSON[1] / 2, 'host_height': host_height,
                      'front': bool(prop.get('front')), 'options': {key: prop[key] for key in ('color', 'width', 'tabletop', 'back', 'fill', 'reading', 'door') if key in prop}})
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
        # Sàn kéo dài thêm 1500 đơn vị về phía máy quay (ra ngoài mép trước của phòng): ở cảnh toàn, nhất là khung dọc, máy
        # quay lùi xa và nhìn thấy cả khoảng trước phòng — không có sàn ở đó là một dải trống dưới đáy khung.
        setup.append(f"    set.floor({{ x: [{-half:g}, {half:g}], z: [{back:g}, {front + 1500:g}], style: {js('background:' + floor)} }});")
        setup.append(f"    set.wall({{ from: [{-half:g}, {back:g}], to: [{half:g}, {back:g}], height: {room['height']:g}, style: {js('background:' + room['wall'])} }});")
        setup.append(f"    set.wall({{ from: [{-half:g}, {front:g}], to: [{-half:g}, {back:g}], height: {room['height']:g}, style: {js('background:' + room['sideWall'])} }});")
        setup.append(f"    set.wall({{ from: [{half:g}, {back:g}], to: [{half:g}, {front:g}], height: {room['height']:g}, style: {js('background:' + room['sideWall'])} }});")
        for item in stage_set.get('panels', []):
            side = item.get('wall', 'back')
            look = f"background:{item.get('color', '#9fd0e6')};border:{item.get('border', '12px solid #f4f7f8')};box-sizing:border-box"
            if item.get('image'):
                # Ảnh trên tấm (màn hình TV, poster, phim X-quang, biển tên): lấp đầy tấm, cắt phần thừa.
                name = copy_asset(base, out, item['image'], copied)
                look += f";background-image:url('{name}');background-size:cover;background-position:center"
            at, turn = (([item['at'], item['y'], back + 1], 0) if side == 'back' else ([-half + 1, item['y'], item['at']], 90) if side == 'left' else ([half - 1, item['y'], item['at'] - item['width']], -90))
            setup.append(f"    set.panel({{ at: {js(at)}, size: [{item['width']:g}, {item['height']:g}], turn: {turn}, style: {js(look)} }});")
        for n, item in enumerate(stage_set.get('boxes', [])):
            colour = item.get('color', '#8fb3bf')
            tone = {'top': item.get('top', '#f1f4f5'), 'front': colour, 'side': item.get('side', colour)}
            numbers = ', '.join(f"{key}: {item[key]:g}" for key in ('x', 'z', 'width', 'depth', 'height', 'y') if key in item)
            setup.append(f"    const box{n + 1} = set.box({{ {numbers}, colors: {js(tone)} }});" + (f"          // {item['name']}" if item.get('name') else ''))
        for n, item in enumerate(stage_set.get('cutouts', [])):
            # Tấm hình phẳng đứng trong phòng (đạo cụ vẽ sẵn hay ảnh) — đặt sát máy quay là có tiền cảnh.
            # Máy tính vẽ trong CÙNG khung với người (400 × 470): mặc định cao bằng người, để nó cùng tỉ lệ với nhân vật.
            tall = float(item.get('height', round(person_default * (1 if item.get('kind') in SCREEN_KINDS + FLOOR_KINDS else 0.74))))
            where_ = ', '.join(f"{key}: {float(item[key]):g}" for key in ('x', 'z', 'y') if key in item) + f", height: {tall:g}" + (", shadow: false" if item.get('shadow') is False else '')
            if item.get('kind'):
                options = {'color': item.get('color')}
                if item['kind'] in SCREEN_KINDS:
                    # Đứng trên mặt hộp (`y`) hay trên sàn: đạo cụ tự đặt ở sàn khung của nó (on: 0), cutout lo phần nâng.
                    options['on'] = 0
                    if item.get('facing'): options['facing'] = item['facing']
                    if item.get('screen'):
                        name = copy_asset(base, out, item['screen'], copied)
                        options['image'] = name
                for key in ('fill', 'reading', 'door'):
                    if key in item: options[key] = item[key]
                options = {key: value for key, value in options.items() if value is not None}
                look = f", {js(options)}" if options else ''
                setup.append(f"    const cutout{n + 1} = document.createElement('div'); VGCharacter.createProp(cutout{n + 1}, {js(item['kind'])}{look}); set.stand(cutout{n + 1}, {{ {where_} }});")
            else:
                name = copy_asset(base, out, item['image'], copied)
                # Kích thước ảnh ghi sẵn: set.stand đo phần tử để căn giữa và đặt chân — ảnh chưa tải xong thì rộng 0, nên khung
                # hình chụp lúc ấy lệch nửa bề ngang (trình render chụp ngay, không đợi khung sau).
                size = image_size(os.path.join(out, name))
                dims = f" cutout{n + 1}.width = {size[0]}; cutout{n + 1}.height = {size[1]};" if size else ''
                if not size: notes.append(f'set.cutouts[{n}]: could not read the size of {name} — give it a PNG, JPEG, GIF or WebP, or it may be placed off by half its width until it loads')
                setup.append(f"    const cutout{n + 1} = document.createElement('img'); cutout{n + 1}.src = {js(name)}; cutout{n + 1}.alt = '';{dims} set.stand(cutout{n + 1}, {{ {where_} }});")
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
        caption_top = round(height * (0.4 if scene.get('layout') == 'presenter' else 0.15 if stage_set is not None else 0.52))
        if width >= height:
            clip('caption', f'position: absolute; left: 50%; bottom: {round(height * 0.03)}px; transform: translateX(-50%); ' + look, extra=' data-layout-ignore=\"\"')
        else:
            # Khung DỌC: chữ phải nằm trong vùng mà giao diện TikTok / Reels / Shorts không che — theo bảng của
            # HyperFrames là từ 15% tới 65% chiều cao, và ở nửa dưới của vùng ấy thì lùi khỏi cột nút bên phải
            # (11%–72% bề ngang). Neo bằng `top` để ba dòng chữ vẫn nằm trọn trong vùng.
            clip('caption', f'position: absolute; left: {round(width * 0.115)}px; width: {round(width * 0.6)}px; top: {caption_top}px; overflow: hidden; ' + look, extra=' data-layout-ignore=\"\"')
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
    for who in names.values():
        mount = "document.createElement('div')" if stage_set is not None else f"$('{who['_element']}')"
        held = {}
        for side, item in (who.get('holds') or {}).items():
            # Ảnh trên màn hình điện thoại đi theo bản dựng như mọi ảnh khác: chép vào thư mục ra, gọi bằng tên tệp.
            if isinstance(item, dict) and item.get('image'):
                name = copy_asset(base, out, item['image'], copied)
                item = dict(item, image=name)
            held[side] = item
        make = f"VGCharacter.createPet({mount}, {{ species: {js(who['species'])}" + (f", wear: {js(who['wears'])}" if who.get('wears') else '') + " })" if who['_pet'] else f"VGCharacter.createCharacter({mount}, {{ id: {js(who['id'])}" + (f", items: {js(held)}" + (', itemsHidden: true' if who.get('holdsHidden') else '') if who.get('holds') else '') + (f", wear: {js(who['wears'])}" if who.get('wears') else '') + " })"
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
            setup.append(f"    set.place({who['name']}, {{ x: {who['_x0']:g}, z: {depth_z:g}{lift}, height: {who['_host_height']:g} }});")
    for prop in props:
        options = {'color': prop['options'].get('color'), 'width': prop['options'].get('width'), 'height': prop['options'].get('tabletop'), 'back': prop['options'].get('back'),
                   'fill': prop['options'].get('fill'), 'reading': prop['options'].get('reading'), 'door': prop['options'].get('door')}
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
        if who.get('faces') and not who.get('enter') and not who['_late']:
            toward = -1 if names[who['faces']]['_x0'] < who['_x0'] else 1          # chỗ đứng LÚC ĐẦU, không phải sau các lượt bước lại gần
            setup.append(f"    {who['name']}.state.facing = {toward if who['_pet'] else toward * 0.55};            // already turned toward {who['faces']}")
        if who['_late']:
            setup.append(f"    {who['name']}.state.opacity = 0;              // off stage until its turn with \"enter\"")
    # ── THẺ THÔNG BÁO (`"toast"` trên một lượt): một thẻ kiểu thông báo ứng dụng ở góc trên khung — biểu tượng chuông,
    # tiêu đề đậm, một dòng nội dung. Mỗi thẻ là một clip phẳng; giờ hiện điền sau khi đo thời gian (`place_toasts`).
    if toasts:
        unit = min(width, height)
        card_w = round(width * (0.36 if width >= height else 0.82))
        style.append(f'  .toast {{ position: absolute; top: {round(height * 0.05)}px; {"right" if width >= height else "left"}: {round(width * 0.04) if width >= height else round((width - card_w) / 2)}px; width: {card_w}px; box-sizing: border-box; '
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
    caption_code = f"    tl.add(VGCharacter.captions(talk, $('caption'), {{ maxChars: {caption_chars}, avoid: false }}).paused(false), 0);     // the words of each line, one line at a time, each chunk when the speech reaches it" if captions else ''
    if speakers:
        moves = ' '.join(f"tl.to('#dim-left', {{ opacity: {0 if side in ('left', None) else 0.32}, duration: 0.3 }}, talk.turns[{turn}].start); tl.to('#dim-right', {{ opacity: {0 if side in ('right', None) else 0.32}, duration: 0.3 }}, talk.turns[{turn}].start);" for turn, side in speakers)
        caption_code += "\n    // Split screen: the half that is not speaking dims a little.\n    " + moves
    if toasts: caption_code += "\n    // Notification cards slide in at their data-start and out before their clip ends (tools/scene.py fills both in).\n    document.querySelectorAll('.toast').forEach((element) => { const start = +element.dataset.start, end = start + +element.dataset.duration; tl.from(element, { opacity: 0, y: -30, duration: 0.4, ease: 'back.out(1.6)' }, start); tl.to(element, { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, end - 0.3); });"
    if shows: caption_code += "\n    // Content clips (title, bullets, image) fade in at their data-start, which tools/scene.py fills in.\n    document.querySelectorAll('.show').forEach((element) => { if (+element.dataset.start > 0) tl.from(element, { opacity: 0, y: 24, duration: 0.45, ease: 'power2.out' }, +element.dataset.start); });"
    # Bối cảnh 3D: máy quay áp sau mỗi lần timeline cập nhật; mỗi "view" là một tween (hoặc một lần cắt) đặt đúng lúc lượt ấy bắt đầu.
    timeline_hook, view_code, drive_code = '', '', ''
    if stage_set is not None:
        timeline_hook = ', onUpdate: set.update'
        # Máy quay áp ở MỌI khung kể cả khi bộ dựng tua bằng seek() (tắt onUpdate) — không có thì hình chớp lúc máy lia.
        drive_code = "\n    set.drive(tl);       // the camera is applied on every frame, also when the renderer seeks without callbacks"
        moves = []
        for view in views:
            values = ', '.join(f'{key}: {value:g}' for key, value in view['values'].items())
            call = f"set.cut({{ {values} }})" if view['cut'] else f"set.move({{ {values} }}, {view['dur']:g}, {js(view['ease'])})"
            moves.append(f"    tl.add({call}, talk.turns[{view['turn']}].start);")
        if moves: view_code = '\n    // Camera: each "view" in the scene file starts with its turn.\n' + '\n'.join(moves)
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

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
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
    talk.addTo(tl, 0);
{caption_code}{view_code}{drive_code}
    window.__timelines = window.__timelines || {{}};
    window.__timelines[{js(scene_id)}] = tl;
    // Read by tools/scene.py to fill in the audio clips' data-start; harmless in a render.
    window.__sceneTimings = {{ duration: tl.duration(), turns: talk.turns.map((turn) => [turn.start, turn.end]), speech: talk.turns.flatMap((turn) => turn.steps.filter((step) => step.name === 'speakCues').map((step) => ({{ start: step.start, sound: step.sound, length: step.speech }}))) }};
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
    # Dấu vân tay của nội dung vừa sinh: lần chạy sau biết tệp có bị sửa tay hay chưa.
    final = final.replace('</html>\n', f'</html>\n<!-- scene.py:{fingerprint(final)} -->\n')
    open(target, 'w', encoding='utf-8').write(final)
    print(f'{target}')
    print(f'  {len(names)} characters · {len(script)} script entries · {len(voices)} voice lines · {total:g} s')
    for voice, line in zip(voices, timings['speech']):
        print(f'  {voice["file"]}: {voice["who"]} at {line["start"]:.2f} s ({voice["length"]:.2f} s)')
    for note in notes: print(f'  ! {note}')
    if preset_note: print(f'  · {preset_note}')
    print(f'next: sh tools/peek.sh {os.path.relpath(target)}      # timings, warnings and a contact sheet')


if __name__ == '__main__':
    main()
