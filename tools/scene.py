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
    "captions": true           show the words at the bottom of the frame
  }

  characters   `id` = a registered person (see `VGCharacter.list()`), or `species` = a pet.
               `x` is where the character STANDS: the centre, in px from the left of the frame.
               `height` is the host height in px (default: 0.7 × the frame height for people — 760 at
               1920×1080 — capped at 0.75 × the frame width in a vertical frame; pets 0.43 × that).
               `enter`: "left" | "right" — walks in from outside the frame to `x` before the script.
               `seated`: true, or "chair" / "stool" to also draw that seat. `faces`: another character's name.
  script       one entry per turn, played in order. `say` (+ `audio`, or `dur` seconds) speaks;
               `do` is a list of steps as in `sequence()` — "wave", ["walk", 4, 120], ["face", "@boy"]
               ("@name" refers to another character). `shot`: "face" | "wide" | false | ["vet", "bella"]
               overrides the camera for that turn. `{ "together": [ … ] }` runs turns at the same time.
  script       `"mood"` on a turn: happy, sad, surprised, angry, thinking, laughing, worried, confused, tired.
               With `say`, the whole line is spoken with that face; without it, it is an expression beat
               before the turn's actions.
  layout       `"layout": "presenter"` is for explainer videos: the characters stand to one side and the other
               side is a CONTENT PANEL. A turn can then carry `"show": { "title": "…", "bullets": ["…"], "image":
               "file.png" }` — it appears as the turn starts (bullets one by one while the line is spoken) and
               stays until the next `show` (`"show": false` clears the panel). No close-up camera in this layout.
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
import argparse, difflib, hashlib, json, os, re, shutil, socket, subprocess, sys, tempfile, time

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


TOP_KEYS = ('id', 'width', 'height', 'seed', 'gap', 'background', 'characters', 'props', 'script', 'camera', 'captions', 'layout')
CHARACTER_KEYS = ('name', 'id', 'species', 'x', 'height', 'enter', 'seated', 'faces')
PROP_KEYS = ('kind', 'x', 'height', 'color', 'width', 'tabletop', 'back', 'front')
TURN_KEYS = ('who', 'say', 'audio', 'dur', 'do', 'shot', 'mood', 'show')
SHOW_KEYS = ('title', 'bullets', 'image')
MOODS = ('happy', 'sad', 'surprised', 'angry', 'thinking', 'laughing', 'worried', 'confused', 'tired')
BACKGROUND_KEYS = ('wall', 'wallDark', 'floor', 'floorHeight', 'image')


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
    base = os.path.dirname(os.path.abspath(args.scene))
    scene_id = slug(scene.get('id') or os.path.splitext(os.path.basename(args.scene))[0])
    width, height = int(scene.get('width', 1920)), int(scene.get('height', 1080))
    out = os.path.abspath(args.output or os.path.join(base, scene_id))
    # Cỡ mặc định theo KHUNG HÌNH: người cao 0,7 khung ngang (760 px ở 1920×1080), nhưng không rộng quá
    # ba phần tư bề ngang của khung dọc; thú bằng 0,43 người.
    person_default = round(min(0.7 * height, 0.75 * width))
    pet_default = round(person_default * 0.43)

    # ── nhân vật ──
    cast = scene.get('characters')
    if not isinstance(cast, list) or not cast: fail('"characters" must be a non-empty list')
    names = {}
    for who in cast:
        if not isinstance(who, dict) or not who.get('name'): fail('every character needs a "name"')
        name = who['name']
        known(f'character "{name}"', who, CHARACTER_KEYS)
        if name in names: fail(f'two characters are named "{name}"')
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', name): fail(f'character name "{name}" must be a plain identifier (letters, digits, underscore)')
        if bool(who.get('id')) == bool(who.get('species')): fail(f'character "{name}" needs either "id" (a person) or "species" (a pet)')
        pet = bool(who.get('species'))
        if 'x' not in who: fail(f'character "{name}" needs "x" (where it stands, px from the left)')
        if who.get('enter') not in (None, 'left', 'right'): fail(f'character "{name}": "enter" must be "left" or "right"')
        if pet and who.get('enter') == 'right': fail(f'character "{name}": pets can only enter from the left')
        if pet and who.get('seated') not in (None, False, True): fail(f'character "{name}": a pet has no chair — use "seated": true')
        if who.get('seated') not in (None, False, True, 'chair', 'stool'): fail(f'character "{name}": "seated" must be true, "chair" or "stool"')
        frame = PET if pet else PERSON
        host_height = float(who.get('height', pet_default if pet else person_default))
        host_width = host_height * frame[0] / frame[1]
        unit = host_height / frame[1]
        stand = float(who['x'])
        centre = stand
        # Điểm xuất phát của `enter` cách tâm host 0,57 × chiều cao; đầu + tóc rộng tới 0,3 × chiều cao về mỗi
        # phía. Đặt tâm host cách mép 0,18 × chiều cao thì cả cái đầu nằm ngoài khung lúc bắt đầu.
        if who.get('enter') == 'left': centre = min(stand, (0.18 if not pet else 0.3) * host_height)
        if who.get('enter') == 'right': centre = max(stand, width - 0.18 * host_height)
        # Số tính ra cất dưới khoá có gạch dưới ở đầu — khoá của người viết kịch bản không bao giờ trùng được.
        names[name] = dict(who, _pet=pet, _host_height=host_height, _host_width=host_width, _unit=unit, _left=centre - host_width / 2,
                           _walk=round((stand - centre) / unit), _element=f'{slug(name)}')
    for who in names.values():
        if who.get('faces') and who['faces'] not in names: fail(f'character "{who["name"]}" faces "{who["faces"]}", who is not in the scene')

    # ── kịch bản ──
    script = scene.get('script')
    if not isinstance(script, list) or not script: fail('"script" must be a non-empty list of turns')
    voices = []                                             # { key, file, text }

    def step_code(step, where):
        if isinstance(step, (int, float)): return js(step)
        if isinstance(step, str): return js(step)
        if not isinstance(step, list) or not step or not isinstance(step[0], str): fail(f'{where}: a step is "name", ["name", args…] or a number — got {js(step)}')
        parts = []
        for item in step:
            if isinstance(item, str) and item.startswith('@'):
                if item[1:] not in names: fail(f'{where}: "{item}" refers to a character that is not in the scene')
                parts.append(item[1:])
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
        mood = turn.get('mood')
        if 'mood' in turn:
            if mood not in MOODS: fail(f'{where}: "mood" must be one of {", ".join(MOODS)} — got {js(mood)}')
            if who['_pet']: fail(f'{where}: "{who["name"]}" is a pet — pets have no "mood"; use an action such as "wagTail" or "hiss"')
            if 'say' not in turn: steps.append(f"['express', {js(mood)}, 0.9]")
        spoken_mood = f', {{ mood: {js(mood)} }}' if mood and 'say' in turn else ''
        if 'say' in turn:
            if who['_pet']: fail(f'{where}: "{who["name"]}" is a pet and cannot "say" — use "do": ["bark"]')
            words = str(turn['say']).strip()
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
        for step in turn.get('do', []):
            steps.append(step_code(step, where))
        if not steps: fail(f'{where}: a turn needs "say", "do" or "mood"')
        body = f"[{who['name']}, " + ', '.join(steps) + ']'
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
        steps = [f"['enter', {js(who['enter'])}]"] if not who['_pet'] else ["'enter'"]
        if abs(who['_walk']) >= 5: steps.append(f"['walk', 4, {who['_walk']}]")
        arrivals.append(f"[{who['name']}, " + ', '.join(steps) + ']')
    # Mọi người bước vào CÙNG LÚC: vào lần lượt thì người vào sau đứng sẵn trong khung chờ tới lượt
    # rồi mới "bước vào" — và cảnh mất thêm vài giây trước câu nói đầu tiên.
    if arrivals: turns.append(('  // ' + ', '.join(who['name'] for who in entering) + (' walk' if len(entering) > 1 else ' walks') + ' in from outside the frame to the mark',
                               '{ together: [' + ', '.join(arrivals) + '] }' if len(arrivals) > 1 else arrivals[0]))
    facing = [f"[{who['name']}, ['face', {who['faces']}]]" for who in names.values() if who.get('faces')]
    if facing: turns.append(('  // everyone turns toward the one they look at', '{ together: [' + ', '.join(facing) + '] }' if len(facing) > 1 else facing[0]))
    layout = scene.get('layout', 'stage')
    if layout not in ('stage', 'presenter'): fail(f'"layout" must be "stage" or "presenter", got {js(layout)}')
    # Chỉ số "phẳng" của từng lượt trong talk.turns: các lượt mở đầu (thú ngồi sẵn, bước vào, quay mặt) đứng trước kịch bản.
    flat = sum(1 for who in names.values() if who['_pet'] and who.get('seated')) + len(arrivals) + len(facing)
    shows = []                                              # { turn: chỉ số phẳng, title, bullets, image } hoặc { turn, clear: True }
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
        if isinstance(entry, dict) and 'together' in entry:
            if 'shot' in entry: fail(f'{where}: "shot" cannot sit on a "together" entry — put it on one of the turns inside it')
            known(where, entry, ('together',))
            if not isinstance(entry['together'], list) or not entry['together']: fail(f'{where}: "together" must be a non-empty list of turns')
            turns.append((None, '{ together: [' + ', '.join(turn_code(turn, f'{where}.together[{n}]') for n, turn in enumerate(entry['together'])) + '] }'))
        else:
            turns.append((None, turn_code(entry, where)))

    # ── đạo cụ ──
    props = []
    for index, prop in enumerate(scene.get('props', [])):
        if not isinstance(prop, dict) or prop.get('kind') not in ('chair', 'stool', 'table', 'counter') or 'x' not in prop: fail(f'props[{index}] needs "kind" (chair, stool, table, counter) and "x"')
        known(f'props[{index}]', prop, PROP_KEYS)
        host_height = float(prop.get('height', person_default))
        props.append({'element': f'prop-{index + 1}-{prop["kind"]}', 'kind': prop['kind'], 'left': float(prop['x']) - host_height * PERSON[0] / PERSON[1] / 2, 'host_height': host_height,
                      'front': bool(prop.get('front')), 'options': {key: prop[key] for key in ('color', 'width', 'tabletop', 'back') if key in prop}})
    for who in names.values():                              # ghế của người ngồi: cùng chỗ, cùng cỡ với người ấy
        if who.get('seated') in ('chair', 'stool'):
            who['_seat'] = {'element': f'{who["_element"]}-{who["seated"]}', 'kind': who['seated'], 'left': who['_left'] + (who['_walk'] * who['_unit']), 'host_height': who['_host_height']}

    # ── người NGỒI sau một đạo cụ "front" cao quá ngực thì chỉ còn thấy cái đầu: báo trước ──
    notes = []
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
    if picture:
        source = os.path.join(base, picture)
        if not os.path.isfile(source): fail(f'background.image not found: {picture} (looked in {base})')
        if os.path.abspath(source) != os.path.abspath(os.path.join(out, os.path.basename(picture))): shutil.copy(source, os.path.join(out, os.path.basename(picture)))
        clip('wall', f'position: absolute; inset: 0; background: {background["wallDark"]} url("{os.path.basename(picture)}") center / cover no-repeat;'); layers.append('#wall')
    else:
        clip('wall', f'position: absolute; inset: 0; background: linear-gradient(165deg, {background["wall"]} 0%, {background["wallDark"]} 72%);'); layers.append('#wall')
    if not picture or 'floor' in scene.get('background', {}):
        clip('floor', f'position: absolute; left: 0; right: 0; bottom: 0; height: {background["floorHeight"]}px; background: {background["floor"]};'); layers.append('#floor')
    for prop in [item for item in props if not item['front']]:
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
    for who in names.values():
        if who.get('_seat'):
            seat = who['_seat']
            clip(seat['element'], f'position: absolute; left: {seat["left"]:.0f}px; bottom: {ground}px; height: {seat["host_height"]:.0f}px;'); layers.append('#' + seat['element'])
        clip(who['_element'], f'position: absolute; left: {who["_left"]:.0f}px; bottom: {ground}px; height: {who["_host_height"]:.0f}px;'); layers.append('#' + who['_element'])
    for prop in [item for item in props if item['front']]:           # "front": true — vẽ SAU nhân vật, tức che phía trước họ (đứng sau quầy)
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
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
        style.append(f'  .show {{ position: absolute; left: {panel_x}px; width: {panel_w}px; margin: 0; color: #f5f8fa; font-family: system-ui, sans-serif; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45); }}')
        style.append(f'  .show-title {{ font-weight: 800; font-size: {title_px}px; line-height: 1.15; }}')
        style.append(f'  .show-bullet {{ font-weight: 600; font-size: {bullet_px}px; line-height: 1.3; padding-left: 1.1em; text-indent: -1.1em; box-sizing: border-box; }}')
        style.append('  .show-image { object-fit: contain; object-position: left top; border-radius: 14px; }')
        visible = [show for show in shows if not show.get('clear')]
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
                name = os.path.basename(show['image'])
                if os.path.abspath(os.path.join(base, show['image'])) != os.path.abspath(os.path.join(out, name)): shutil.copy(os.path.join(base, show['image']), os.path.join(out, name))
                room = max(round(height * 0.14), panel_bottom - y)
                piece('img', 'image', 0, name, y, f' height: {round(room)}px;')
                y += room
            if y > panel_bottom + 4: notes.append(f'the content shown at script turn {show["turn"]} is about {round(y - panel_bottom)}px taller than the panel — shorten it or split it over two turns')

    # Phụ đề: khung ngang thì sát đáy; khung DỌC thì nhấc lên 20% — một phần năm dưới cùng của video dọc
    # bị giao diện của TikTok / Reels / Shorts che (HyperFrames `check` gọi đó là vùng an toàn).
    captions = scene.get('captions', True) and '"say"' in json.dumps(script)        # không ai nói thì không cần phụ đề
    if captions:
        look = f'padding: 18px 34px; border-radius: 18px; box-sizing: border-box; background: rgba(8, 12, 16, 0.78); color: #f5f8fa; font: 600 {round(min(width, height) * 0.041)}px/1.25 system-ui, sans-serif; text-align: center; opacity: 0;'
        caption_top = round(height * (0.4 if scene.get('layout') == 'presenter' else 0.52))
        if width >= height:
            clip('caption', f'position: absolute; left: 50%; bottom: {round(height * 0.065)}px; transform: translateX(-50%); max-width: {round(width * 0.7)}px; ' + look)
        else:
            # Khung DỌC: chữ phải nằm trong vùng mà giao diện TikTok / Reels / Shorts không che — theo bảng của
            # HyperFrames là từ 15% tới 65% chiều cao, và ở nửa dưới của vùng ấy thì lùi khỏi cột nút bên phải
            # (11%–72% bề ngang). Neo bằng `top` để ba dòng chữ vẫn nằm trọn trong vùng.
            clip('caption', f'position: absolute; left: {round(width * 0.115)}px; width: {round(width * 0.6)}px; top: {caption_top}px; ' + look)
    for voice in voices:
        body.append(f'  <audio id="voice-{voice["key"].replace("_", "-")}" class="clip" src="{voice["file"]}" data-start="__START_{voice["key"]}__" data-duration="{voice["length"]:.2f}" data-track-index="{track[0]}" data-volume="1"></audio>')
        track[0] += 1

    for who in names.values():
        make = f"VGCharacter.createPet($('{who['_element']}'), {{ species: {js(who['species'])} }})" if who['_pet'] else f"VGCharacter.createCharacter($('{who['_element']}'), {{ id: {js(who['id'])} }})"
        setup.append(f"    const {who['name']} = {make}.rig;")
    for prop in props:
        options = {'color': prop['options'].get('color'), 'width': prop['options'].get('width'), 'height': prop['options'].get('tabletop'), 'back': prop['options'].get('back')}
        setup.append(f"    VGCharacter.createProp($('{prop['element']}'), {js(prop['kind'])}, {js({k: v for k, v in options.items() if v is not None})});")
    for who in names.values():
        if who.get('_seat'): setup.append(f"    VGCharacter.createProp($('{who['_seat']['element']}'), {js(who['_seat']['kind'])}, {{ for: {who['name']} }});")
        if who.get('seated') and not who['_pet']:
            setup.append(f"    {who['name']}.state.seat = 1;                 // already seated in the first frame")
    camera = scene.get('camera', layout != 'presenter')        # người dẫn đứng cạnh nội dung: máy quay không cắt cận, trừ khi kịch bản yêu cầu
    camera_code = ''
    if camera:
        kind = camera.get('kind', 'chest') if isinstance(camera, dict) else 'chest'
        # Khung dọc: phụ đề nằm giữa khung (vùng an toàn), nên người nói được đặt ở PHẦN TRÊN và nhỏ lại
        # một chút — không thì chữ đè lên miệng.
        portrait = '' if width >= height else ', fill: 0.46, centerY: 0.34'
        camera_code = f"camera: {{ scene: {js(layers)}, kind: {js(kind)}{portrait} }}, "
    seated_pets = [f"[{who['name']}, 'sitDown']" for who in names.values() if who['_pet'] and who.get('seated')]
    lines = []
    for comment, code in ([('  // pets that start seated', '{ together: [' + ', '.join(seated_pets) + '] }' if len(seated_pets) > 1 else seated_pets[0])] if seated_pets else []) + turns:
        if comment: lines.append('    ' + comment)
        lines.append(f'      {code},')
    caption_chars = round((width * 0.7 if landscape else width * 0.6) / (min(width, height) * 0.041 * 0.5) * 1.9)     # khoảng hai dòng chữ
    caption_code = f"    tl.add(VGCharacter.captions(talk, $('caption'), {{ maxChars: {caption_chars} }}).paused(false), 0);     // the words of each line, in chunks of about two lines" if captions else ''
    if shows: caption_code += "\n    // Content clips (title, bullets, image) fade in at their data-start, which tools/scene.py fills in.\n    document.querySelectorAll('.show').forEach((element) => { if (+element.dataset.start > 0) tl.from(element, { opacity: 0, y: 24, duration: 0.45, ease: 'power2.out' }, +element.dataset.start); });"
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

    const tl = gsap.timeline({{ paused: true }});
    talk.addTo(tl, 0);
{caption_code}
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
    # Dấu vân tay của nội dung vừa sinh: lần chạy sau biết tệp có bị sửa tay hay chưa.
    final = final.replace('</html>\n', f'</html>\n<!-- scene.py:{fingerprint(final)} -->\n')
    open(target, 'w', encoding='utf-8').write(final)
    print(f'{target}')
    print(f'  {len(names)} characters · {len(script)} script entries · {len(voices)} voice lines · {total:g} s')
    for voice, line in zip(voices, timings['speech']):
        print(f'  {voice["file"]}: {voice["who"]} at {line["start"]:.2f} s ({voice["length"]:.2f} s)')
    for note in notes: print(f'  ! {note}')
    print(f'next: sh tools/peek.sh {os.path.relpath(target)}      # timings, warnings and a contact sheet')


if __name__ == '__main__':
    main()
