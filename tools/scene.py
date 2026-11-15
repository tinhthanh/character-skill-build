#!/usr/bin/env python3
"""Build a complete HyperFrames composition from a short SCENE DESCRIPTION (JSON).

    python3 tools/scene.py scene.json            → <folder of scene.json>/<id>/index.html (+ bundle, cues, audio)
    python3 tools/scene.py scene.json -o out/

You describe who is in the scene, where they stand, and who says or does what, in order.
The tool writes the composition: hosts and clips, furniture, a `conversation()` with the
camera and captions, mouth cues for every voice file, and `<audio>` clips with the right
`data-start` (it loads the result once in headless Chrome to read the timing).
The output is ordinary, commented HTML — edit it by hand afterwards if you want something else.

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
               `height` is the host height in px (default 760 for people, 330 for pets).
               `enter`: "left" | "right" — walks in from outside the frame to `x` before the script.
               `seated`: true, or "chair" / "stool" to also draw that seat. `faces`: another character's name.
  script       one entry per turn, played in order. `say` (+ `audio`, or `dur` seconds) speaks;
               `do` is a list of steps as in `sequence()` — "wave", ["walk", 4, 120], ["face", "@boy"]
               ("@name" refers to another character). `shot`: "face" | "wide" | false | ["vet", "bella"]
               overrides the camera for that turn. `{ "together": [ … ] }` runs turns at the same time.
  audio        paths are relative to the scene file; WAV is read directly, other formats need ffmpeg.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PERSON, PET = (400, 470), (400, 330)          # khung của rig người / thú (đơn vị)


def fail(message):
    print(f'scene: {message}', file=sys.stderr)
    sys.exit(1)


def slug(text):
    value = re.sub(r'[^a-z0-9]+', '-', str(text).lower()).strip('-')
    return value or 'x'


def js(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description='Build a HyperFrames composition from a scene description.')
    parser.add_argument('scene')
    parser.add_argument('-o', '--output', help='output folder (default: <scene folder>/<id>)')
    parser.add_argument('--cues', default='auto', choices=['auto', 'rhubarb', 'spectral', 'amplitude'], help='lip-sync method for voice files')
    args = parser.parse_args()
    if not os.path.isfile(args.scene): fail(f'no such file: {args.scene}')
    try:
        scene = json.load(open(args.scene, encoding='utf-8'))
    except json.JSONDecodeError as error:
        fail(f'{args.scene} is not valid JSON: {error}')
    base = os.path.dirname(os.path.abspath(args.scene))
    scene_id = slug(scene.get('id') or os.path.splitext(os.path.basename(args.scene))[0])
    width, height = int(scene.get('width', 1920)), int(scene.get('height', 1080))
    out = os.path.abspath(args.output or os.path.join(base, scene_id))

    # ── nhân vật ──
    cast = scene.get('characters')
    if not isinstance(cast, list) or not cast: fail('"characters" must be a non-empty list')
    names = {}
    for who in cast:
        if not isinstance(who, dict) or not who.get('name'): fail('every character needs a "name"')
        name = who['name']
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
        host_height = float(who.get('height', 330 if pet else 760))
        host_width = host_height * frame[0] / frame[1]
        unit = host_height / frame[1]
        stand = float(who['x'])
        centre = stand
        if who.get('enter') == 'left': centre = min(stand, (0.36 if not pet else 0.3) * host_height)      # bắt đầu ngoài mép trái
        if who.get('enter') == 'right': centre = max(stand, width - 0.36 * host_height)
        names[name] = dict(who, pet=pet, host_height=host_height, host_width=host_width, unit=unit, left=centre - host_width / 2,
                           walk=round((stand - centre) / unit), element=f'{slug(name)}')
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
        who = names[turn['who']]
        steps = []
        if 'say' in turn:
            if who['pet']: fail(f'{where}: "{who["name"]}" is a pet and cannot "say" — use "do": ["bark"]')
            words = str(turn['say']).strip()
            if turn.get('audio'):
                source = os.path.join(base, turn['audio'])
                if not os.path.isfile(source): fail(f'{where}: audio file not found: {turn["audio"]} (looked in {base})')
                key = slug(os.path.splitext(os.path.basename(turn['audio']))[0]).replace('-', '_')
                if any(voice['key'] == key for voice in voices): key = f'{key}_{len(voices) + 1}'      # cùng một tệp dùng hai lần
                voices.append({'key': key, 'file': os.path.basename(turn['audio']), 'source': source, 'text': words, 'who': who['name']})
                steps.append(f"['speakCues', window.VOICE_CUES[{js(key)}]]")
            else:
                seconds = float(turn.get('dur') or round(0.6 + 0.36 * len(words.split()), 1))
                steps.append(f"['explain', {js(words)}, {seconds}]")
        for step in turn.get('do', []):
            steps.append(step_code(step, where))
        if not steps: fail(f'{where}: a turn needs "say" or "do"')
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
    for who in entering:
        steps = [f"['enter', {js(who['enter'])}]"] if not who['pet'] else ["'enter'"]
        if abs(who['walk']) >= 5: steps.append(f"['walk', 4, {who['walk']}]")
        turns.append(('  // ' + who['name'] + ' walks in from outside the frame to its mark', f"[{who['name']}, " + ', '.join(steps) + ']'))
    facing = [f"[{who['name']}, ['face', {who['faces']}]]" for who in names.values() if who.get('faces')]
    if facing: turns.append(('  // everyone turns toward the one they look at', '{ together: [' + ', '.join(facing) + '] }' if len(facing) > 1 else facing[0]))
    for index, entry in enumerate(script):
        where = f'script[{index}]'
        if isinstance(entry, dict) and 'together' in entry:
            if not isinstance(entry['together'], list) or not entry['together']: fail(f'{where}: "together" must be a non-empty list of turns')
            turns.append((None, '{ together: [' + ', '.join(turn_code(turn, f'{where}.together[{n}]') for n, turn in enumerate(entry['together'])) + '] }'))
        else:
            turns.append((None, turn_code(entry, where)))

    # ── đạo cụ ──
    props = []
    for index, prop in enumerate(scene.get('props', [])):
        if not isinstance(prop, dict) or prop.get('kind') not in ('chair', 'stool', 'table', 'counter') or 'x' not in prop: fail(f'props[{index}] needs "kind" (chair, stool, table, counter) and "x"')
        host_height = float(prop.get('height', 760))
        props.append({'element': f'prop-{index + 1}-{prop["kind"]}', 'kind': prop['kind'], 'left': float(prop['x']) - host_height * PERSON[0] / PERSON[1] / 2, 'host_height': host_height,
                      'options': {key: prop[key] for key in ('color', 'width', 'height_units', 'back') if key in prop}})
    for who in names.values():                              # ghế của người ngồi: cùng chỗ, cùng cỡ với người ấy
        if who.get('seated') in ('chair', 'stool'):
            who['seat'] = {'element': f'{who["element"]}-{who["seated"]}', 'kind': who['seated'], 'left': who['left'] + (who['walk'] * who['unit']), 'host_height': who['host_height']}

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

    background = dict({'wall': '#1f4a5c', 'wallDark': '#0c1c26', 'floor': '#0f2a38', 'floorHeight': 190}, **scene.get('background', {}))
    ground = round(background['floorHeight'] * 0.5)         # bàn chân đứng ở giữa dải sàn
    layers, style, body, setup = [], [], [], []
    track = [0]

    def clip(element, css, tag='div', extra=''):
        style.append(f'  #{element} {{ {css} }}')
        body.append(f'  <{tag} id="{element}" class="clip" data-start="0" data-duration="__TOTAL__" data-track-index="{track[0]}"{extra}></{tag}>')
        track[0] += 1

    clip('wall', f'position: absolute; inset: 0; background: linear-gradient(165deg, {background["wall"]} 0%, {background["wallDark"]} 72%);'); layers.append('#wall')
    clip('floor', f'position: absolute; left: 0; right: 0; bottom: 0; height: {background["floorHeight"]}px; background: {background["floor"]};'); layers.append('#floor')
    for prop in props:
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
    for who in names.values():
        if who.get('seat'):
            seat = who['seat']
            clip(seat['element'], f'position: absolute; left: {seat["left"]:.0f}px; bottom: {ground}px; height: {seat["host_height"]:.0f}px;'); layers.append('#' + seat['element'])
        clip(who['element'], f'position: absolute; left: {who["left"]:.0f}px; bottom: {ground}px; height: {who["host_height"]:.0f}px;'); layers.append('#' + who['element'])
    captions = scene.get('captions', True) and '"say"' in json.dumps(script)        # không ai nói thì không cần phụ đề
    if captions:
        clip('caption', f'position: absolute; left: 50%; bottom: {round(height * 0.065)}px; transform: translateX(-50%); max-width: {round(width * 0.7)}px; padding: 18px 34px; border-radius: 18px; '
             f'background: rgba(8, 12, 16, 0.78); color: #f5f8fa; font: 600 {round(height * 0.041)}px/1.25 system-ui, sans-serif; text-align: center; opacity: 0;')
    for voice in voices:
        body.append(f'  <audio id="voice-{voice["key"].replace("_", "-")}" class="clip" src="{voice["file"]}" data-start="__START_{voice["key"]}__" data-duration="{voice["length"]:.2f}" data-track-index="{track[0]}" data-volume="1"></audio>')
        track[0] += 1

    for who in names.values():
        make = f"VGCharacter.createPet($('{who['element']}'), {{ species: {js(who['species'])} }})" if who['pet'] else f"VGCharacter.createCharacter($('{who['element']}'), {{ id: {js(who['id'])} }})"
        setup.append(f"    const {who['name']} = {make}.rig;")
    for prop in props:
        options = {'color': prop['options'].get('color'), 'width': prop['options'].get('width'), 'height': prop['options'].get('height_units'), 'back': prop['options'].get('back')}
        setup.append(f"    VGCharacter.createProp($('{prop['element']}'), {js(prop['kind'])}, {js({k: v for k, v in options.items() if v is not None})});")
    for who in names.values():
        if who.get('seat'): setup.append(f"    VGCharacter.createProp($('{who['seat']['element']}'), {js(who['seat']['kind'])}, {{ for: {who['name']} }});")
        if who.get('seated') and not who['pet']:
            setup.append(f"    {who['name']}.state.seat = 1;                 // already seated in the first frame")
    camera = scene.get('camera', True)
    camera_code = ''
    if camera:
        kind = camera.get('kind', 'chest') if isinstance(camera, dict) else 'chest'
        camera_code = f"camera: {{ scene: {js(layers)}, kind: {js(kind)} }}, "
    seated_pets = [f"[{who['name']}, 'sitDown']" for who in names.values() if who['pet'] and who.get('seated')]
    lines = []
    for comment, code in ([('  // pets that start seated', '{ together: [' + ', '.join(seated_pets) + '] }' if len(seated_pets) > 1 else seated_pets[0])] if seated_pets else []) + turns:
        if comment: lines.append('    ' + comment)
        lines.append(f'      {code},')
    caption_code = "    tl.add(VGCharacter.captions(talk, $('caption')).paused(false), 0);     // the words of each line, while it is spoken" if captions else ''
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
    window.__sceneTimings = {{ duration: tl.duration(), speech: talk.turns.flatMap((turn) => turn.steps.filter((step) => step.name === 'speakCues').map((step) => step.start)) }};
  </script>
</div>
</body>
</html>
'''
    target = os.path.join(out, 'index.html')
    open(target, 'w', encoding='utf-8').write(html.replace('__TOTAL__', '60'))

    # ── nạp một lần trong Chrome để đọc giờ: tổng thời lượng và lúc từng câu có tiếng bắt đầu ──
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    if not chrome: fail('no Chrome found (tools/chrome.sh) — it is needed to time the audio clips')
    port = 8500 + os.getpid() % 400
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={out}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT)
    try:
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        with tempfile.TemporaryDirectory() as work:
            log = os.path.join(work, 'log')
            probe = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings || window.__sceneFailed', '--timeout', '60',
                                    '--eval', 'window.__sceneTimings', '--log', log], capture_output=True, text=True)
            errors = open(log, encoding='utf-8').read().strip() if os.path.exists(log) else ''
        if probe.returncode != 0 or not probe.stdout.strip() or probe.stdout.strip() == 'null':
            fail('the generated composition did not build:\n  ' + (errors or probe.stderr.strip() or 'no error message').replace('\n', '\n  ') + f'\n  (left in {target} for inspection)')
        timings = json.loads(probe.stdout)
    finally:
        server.terminate()
    total = max(1.0, round(timings['duration'] + 0.6, 1))
    final = html.replace('__TOTAL__', f'{total:g}')
    if len(timings['speech']) != len(voices): fail(f'expected {len(voices)} lip-synced lines but the composition has {len(timings["speech"])}')
    for voice, start in zip(voices, timings['speech']):
        final = final.replace(f'__START_{voice["key"]}__', f'{start:.2f}')
    open(target, 'w', encoding='utf-8').write(final)
    print(f'{target}')
    print(f'  {len(names)} characters · {len(script)} script entries · {len(voices)} voice lines · {total:g} s')
    for voice, start in zip(voices, timings['speech']):
        print(f'  {voice["file"]}: {voice["who"]} at {start:.2f} s ({voice["length"]:.2f} s)')
    print(f'next: sh tools/peek.sh {os.path.relpath(target)}      # timings, warnings and a contact sheet')


if __name__ == '__main__':
    main()
