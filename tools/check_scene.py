#!/usr/bin/env python3
"""Self-test for tools/scene.py (run by tools/check.sh): build the example scene, then make sure
bad scene files are rejected with a message that names the problem."""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
problems = []


def build(scene_path, out):
    return subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), scene_path, '-o', out], capture_output=True, text=True)


def page_eval(folder, script):
    """Mở cảnh đã dựng trong Chrome (tools/chrome_run.py) và trả về giá trị JSON của `script` — None nếu không chạy được."""
    import socket, time
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    if not chrome: return None
    with socket.socket() as probe_socket:
        probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={folder}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
        size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--eval', script], capture_output=True, text=True)
        try: return json.loads(done.stdout)
        except ValueError: return None
    finally:
        server.terminate()


with tempfile.TemporaryDirectory() as work:
    example = os.path.join(ROOT, 'examples', 'scene', 'scene.json')
    out = os.path.join(work, 'built')
    done = build(example, out)
    if done.returncode != 0:
        problems.append('the example scene does not build: ' + (done.stderr.strip() or done.stdout.strip()))
    else:
        html = open(os.path.join(out, 'index.html'), encoding='utf-8').read()
        for name in ('character.slim.js', 'voice.wav', 'voice.cues.js'):
            if not os.path.isfile(os.path.join(out, name)): problems.append(f'{name} was not written next to index.html')
        if '__TOTAL__' in html or '__START_' in html: problems.append('index.html still contains unfilled placeholders')
        audio = re.findall(r'<audio[^>]*data-start="([\d.]+)" data-duration="([\d.]+)"', html)
        import wave
        with wave.open(os.path.join(ROOT, 'examples', 'voiceover', 'voice.wav')) as clip: length = clip.getnframes() / clip.getframerate()
        # Ba câu có tiếng: một tệp dùng chung với ví dụ voiceover, hai tệp trong examples/scene/voice/ (đã tạo sẵn
        # bằng voice-tts và commit — dựng lại KHÔNG cần voice-tts).
        if len(audio) != 3 or float(audio[0][0]) < 2 or abs(float(audio[0][1]) - length) > 0.05 or not all(float(a[0]) < float(b[0]) for a, b in zip(audio, audio[1:])): problems.append(f'the audio clips are not timed (found {audio})')
        total = re.search(r'data-composition-id="clinic-visit" data-start="0" data-duration="([\d.]+)"', html)
        if not total or float(total.group(1)) < 12: problems.append('the composition duration was not filled in')
        if 'VGCharacter.conversation(' not in html or 'VGCharacter.captions(' not in html or 'camera:' not in html: problems.append('the composition lacks the conversation, captions or camera')
        # Hai người cùng `enter` thì vào CÙNG LÚC; đạo cụ "front" nằm sau nhân vật trong HTML (tức vẽ đè lên họ).
        staged = json.load(open(example, encoding='utf-8'))
        staged['id'] = 'staged'
        staged['characters'][1].update({'enter': 'right', 'seated': False})
        staged['props'][0]['front'] = True
        staged['script'][-1]['together'][0]['shot'] = ['vet', 'boy', 'bella']
        # mood trên một lượt, nền là ảnh, và một người NGỒI sau quầy cao (phải có lời nhắc kèm số gợi ý).
        staged['script'][2]['mood'] = 'surprised'
        staged['characters'].append({'name': 'clerk', 'id': 'clerk', 'x': 250, 'seated': True})
        import struct, zlib
        def chunk(kind, data): return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 2, 2, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\x00\x20\x40\x50\x20\x40\x50' * 2)) + chunk(b'IEND', b'')
        picture = os.path.join(os.path.dirname(example), '_check_room.png')
        open(picture, 'wb').write(png)
        staged['background'] = {'image': '_check_room.png'}
        # Người bước vào GIỮA cảnh rồi nói, và bước ra; một câu nhắc tên con vật.
        staged['characters'].append({'name': 'late', 'id': 'nurse', 'x': 1700, 'faces': 'vet'})
        staged['script'].insert(3, {'who': 'late', 'enter': 'right', 'say': 'Xin lỗi, tôi đến muộn.', 'dur': 1.6, 'exit': 'right'})
        staged['music'] = '../voiceover/voice.wav'
        # Nhân vật được cho cầm một món đồ đang cất (để nhận từ người khác).
        staged['characters'][0].update({'holds': {'L': 'clipboard'}, 'holdsHidden': True})
        # Một cái bàn đặt đúng chỗ con chó đứng: phải có lời nhắc là cái bàn sẽ che nó.
        staged['props'].append({'kind': 'table', 'x': next(who['x'] for who in staged['characters'] if who.get('species'))})
        staged_path = os.path.join(os.path.dirname(example), '_check_staged.json')
        try:
            json.dump(staged, open(staged_path, 'w', encoding='utf-8'))
            built = build(staged_path, os.path.join(work, 'staged'))
        finally:
            os.remove(staged_path); os.remove(picture)
        if built.returncode != 0:
            problems.append('a scene with two entrances, a front prop and a shot inside together does not build: ' + built.stderr.strip()[:200])
        else:
            page = open(os.path.join(work, 'staged', 'index.html'), encoding='utf-8').read()
            if not re.search(r"together: \[\[vet, \['enter', \"left\", \d+\][^\n]*\[boy, \['enter', \"right\", \d+\]", page): problems.append('two entering characters do not enter together')
            if page.index('id="prop-1-counter"') < page.index('id="vet" class="clip"'): problems.append('a "front" prop is not placed after the characters')
            if 'shot: [vet, boy, bella]' not in page: problems.append('a shot on a turn inside together is not written')
            if 'late.state.opacity = 0' not in page: problems.append('a character that enters mid-scene is not hidden at the start')
            if not re.search(r"\[late, \['enter', \"right\", \d+\], \['face', vet\], \['explain'[^\n]*\['exit', \"right\", \d+\]\]", page): problems.append('a turn with enter / say / exit is not written in that order')
            if 'bella.state.facing = -1' not in page or "[bella, ['face'" in page: problems.append('a character present from the start is not turned toward its target up front')
            if 'data-role="music"' not in page or 'data-volume="0.15"' not in page: problems.append('"music" does not add a quiet music clip')
            if not re.search(r'\{ turn: \[vet, \[.speakCues.[^\n]*shot: \[vet, bella\] \}', page): problems.append('a line that names a pet does not frame the pet with the speaker')
            if '{ mood: "surprised" }]' not in page or "['express', \"surprised\"" in page: problems.append('"mood" on a spoken turn is not passed to the line itself')
            if 'url("_check_room.png")' not in page or not os.path.isfile(os.path.join(work, 'staged', '_check_room.png')): problems.append('background.image is not used or not copied')
            if 'id="floor"' in page: problems.append('the floor strip is drawn over a background image although no floor colour was given')
            if '"clerk" sits behind the counter' not in built.stdout or '"tabletop"' not in built.stdout: problems.append('no note about a seated character hidden behind a tall front counter')
            if 'items: {"L": "clipboard"}, itemsHidden: true' not in page: problems.append('"holds" / "holdsHidden" are not passed to createCharacter')
            if '"bella" stands at x' not in built.stdout or 'inside the table' not in built.stdout: problems.append('no note about a pet standing inside a table')
            # Sửa tay làm lệch giờ → --retime đưa <audio> và tổng thời lượng về đúng.
            index = os.path.join(work, 'staged', 'index.html')
            before = re.search(r'src="voice.wav" data-start="([\d.]+)"', page).group(1)
            open(index, 'w', encoding='utf-8').write(page.replace('[bella, "wagTail"]', '[bella, "wagTail", "wagTail"]'))
            fixed = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), '--retime', index], capture_output=True, text=True)
            after = re.search(r'src="voice.wav" data-start="([\d.]+)"', open(index, encoding='utf-8').read()).group(1)
            if fixed.returncode != 0 or float(after) < float(before) + 1: problems.append(f'--retime did not move the audio clip after a hand edit ({before} → {after}): {fixed.stderr.strip()[:160]}')
        # Dải cận miệng của câu có tiếng: peek.sh --mouth in dòng khẩu hình và ghi ảnh.
        peek = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(out, 'index.html'), '--mouth=1'], capture_output=True, text=True)
        strip = os.path.join(out, 'peek-mouth1.png')        # không chỉ định tên: ảnh nằm cạnh composition, tên riêng cho dải cận miệng
        if peek.returncode != 0 or 'mouth strip: line 1' not in peek.stdout or 'cue shapes per frame' not in peek.stdout or not os.path.isfile(strip):
            problems.append('peek.sh --mouth does not produce a mouth strip: ' + (peek.stderr.strip() or peek.stdout.strip())[-200:])
        beyond = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(out, 'index.html'), '--mouth=9'], capture_output=True, text=True)
        if beyond.returncode == 0 or 'spoken line' not in beyond.stderr: problems.append('peek.sh --mouth=9 on a scene with fewer lines does not explain itself')
        cues = open(os.path.join(out, 'voice.cues.js'), encoding='utf-8').read()
        if 'khám định kỳ cho bé Bella' not in cues: problems.append('the spoken words were not stored in the cues (captions would be empty)')
    # Chạy lại lên bản CHƯA sửa thì ghi đè bình thường; lên bản ĐÃ sửa tay thì dừng, trừ khi --force.
    if not problems:
        again = build(example, out)
        if again.returncode != 0: problems.append('running the tool again over its own untouched output fails: ' + again.stderr.strip()[:200])
        target = os.path.join(out, 'index.html')
        open(target, 'a', encoding='utf-8').write('<!-- my own edit -->\n')
        guarded = build(example, out)
        if guarded.returncode == 0 or 'edited by hand' not in guarded.stderr: problems.append('a hand-edited index.html was overwritten without --force')
        if 'my own edit' not in open(target, encoding='utf-8').read(): problems.append('the hand edit is gone after a refused run')
        forced = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), example, '-o', out, '--force'], capture_output=True, text=True)
        if forced.returncode != 0 or 'my own edit' in open(target, encoding='utf-8').read(): problems.append('--force does not replace an edited index.html')
        foreign = os.path.join(work, 'foreign'); os.makedirs(foreign); open(os.path.join(foreign, 'index.html'), 'w').write('<html>mine</html>')
        refused = build(example, foreign)
        if refused.returncode == 0 or 'not written by this tool' not in refused.stderr: problems.append('an index.html the tool did not write was overwritten')
    # Bố cục "presenter": vùng nội dung có tiêu đề, các ý hiện lần lượt và ảnh, đều được căn giờ; phụ đề chia cụm.
    presenter = os.path.join(ROOT, 'examples', 'scene-presenter', 'scene.json')
    shown = build(presenter, os.path.join(work, 'presenter'))
    if shown.returncode != 0:
        problems.append('the presenter example does not build: ' + (shown.stderr.strip() or shown.stdout.strip())[:200])
    else:
        page = open(os.path.join(work, 'presenter', 'index.html'), encoding='utf-8').read()
        starts = {name: float(start) for name, start in re.findall(r'id="(show-[\w-]+)"[^>]*data-start="([\d.]+)"', page)}
        if len(starts) != 7: problems.append(f'expected 7 content clips in the presenter example, found {len(starts)}')
        elif not (starts['show-1-title'] == 0 and starts['show-2-title'] < starts['show-2-bullet1'] < starts['show-2-bullet2'] < starts['show-2-bullet3'] < starts['show-3-title']):
            problems.append(f'content clips are not timed in order: {starts}')
        if 'data-show-turn' in page and 'data-duration="1" data-track-index' in page.split('id="show-1-title"')[1][:200]: problems.append('content clips still carry the placeholder duration')
        if not os.path.isfile(os.path.join(work, 'presenter', 'characters.png')): problems.append('show.image was not copied next to index.html')
        if 'camera:' in page: problems.append('the presenter layout must not add the close-up camera by default')
        # Người dẫn đứng bên phải, bảng nội dung bên trái: tay diễn phải là tay phía bảng (trái).
        if 'hand: "L"' not in page or 'hand: "R"' in page: problems.append('the presenter does not gesture with the arm on the content side')
    # Cảnh tương tác: vuốt ve một con vật trong lượt không lời → con vật đáp lại cùng lúc; `holds` tới createCharacter.
    interact = build(os.path.join(ROOT, 'examples', 'scene-interact', 'scene.json'), os.path.join(work, 'interact'))
    if interact.returncode != 0:
        problems.append('the interaction example does not build: ' + (interact.stderr.strip() or interact.stdout.strip())[:200])
    else:
        page = open(os.path.join(work, 'interact', 'index.html'), encoding='utf-8').read()
        if not re.search(r'together: \[\[vet, [^\n]*\["stroke", miu\]\], \[miu, "purr"\]\]', page): problems.append('stroking a pet in a wordless turn does not add the pet\'s reaction')
        if not re.search(r"\[vet, \['walk', 4, \d+\]\],?\s*\n\s*\{ together: \[\[vet, \[\"handOver\", ba\]\]", page): problems.append('a giver standing out of reach does not walk up to the receiver before handing over')
        if 'items: "clipboard"' not in page and 'items: {"R": "clipboard"}' not in page: problems.append('"holds": "clipboard" is not passed to createCharacter')
    # Cảnh dọc: mèo đứng nửa phải, "enter": true → vào từ mép PHẢI (mép gần), không băng ngang qua cô bé.
    vertical = build(os.path.join(ROOT, 'examples', 'scene-vertical', 'scene.json'), os.path.join(work, 'vertical-near'))
    if vertical.returncode != 0:
        problems.append('the vertical example does not build: ' + (vertical.stderr.strip() or vertical.stdout.strip())[:200])
    else:
        page = open(os.path.join(work, 'vertical-near', 'index.html'), encoding='utf-8').read()
        if "[miu, ['enter', \"right\", " not in page: problems.append('"enter": true on a character standing on the right does not enter from the right')
        if 'maxChars' not in page: problems.append('captions are not chunked')
        if '<h2' in page or '<ul' in page: problems.append('content must be flat clips, not nested elements')
    # Kịch bản sai phải bị từ chối, và thông báo phải gọi đúng tên chỗ sai.
    base = json.load(open(example, encoding='utf-8'))
    def variant(change):
        scene = json.loads(json.dumps(base)); change(scene); return scene
    cases = [
        ('an unknown speaker', lambda s: s['script'].append({'who': 'nobody', 'do': ['wave']}), 'nobody'),
        ('a pet that speaks', lambda s: s['script'].append({'who': 'bella', 'say': 'woof'}), 'pet'),
        ('a voice on a pet', lambda s: s['characters'][2].update({'voice': 'maichi'}), 'pet'),
        ('a voice that is not a name', lambda s: s['script'][2].update({'voice': 3}), 'voice'),
        ('a missing audio file', lambda s: s['script'].append({'who': 'vet', 'say': 'hi', 'audio': 'nope.wav'}), 'nope.wav'),
        ('an @reference to nobody', lambda s: s['script'].append({'who': 'vet', 'do': [['face', '@ghost']]}), '@ghost'),
        ('a lookAt target that is a number', lambda s: s['script'].append({'who': 'vet', 'do': [['look', 5]]}), 'lookAt'),
        ('two characters with one name', lambda s: s['characters'].append({'name': 'vet', 'id': 'nurse', 'x': 100}), 'vet'),
        ('a character without a position', lambda s: s['characters'].append({'name': 'extra', 'id': 'nurse'}), '"x"'),
        ('a misspelt character key', lambda s: s['characters'][1].update({'seat': 'chair'}), 'seated'),
        ('a misspelt turn key', lambda s: s['script'][1].update({'duration': 3}), 'dur'),
        ('a misspelt top-level key', lambda s: s.update({'captons': False}), 'captions'),
        ('an unknown prop key', lambda s: s['props'][0].update({'colour': '#fff'}), 'color'),
        ('an unknown background key', lambda s: s['background'].update({'sky': '#fff'}), 'sky'),
        ('show without the presenter layout', lambda s: s['script'][1].update({'show': {'title': 'x'}}), 'presenter'),
        ('an unknown background preset', lambda s: s['background'].update({'preset': 'castle'}), 'preset'),
        ('enter on the character and on a turn', lambda s: s['script'][1].update({'enter': 'left'}), 'enter'),
        ('a missing music file', lambda s: s.update({'music': 'nope.mp3'}), 'nope.mp3'),
        ('an unknown mood', lambda s: s['script'][1].update({'mood': 'joyful'}), 'mood'),
        ('a person\'s mood on a pet', lambda s: s['script'][0].update({'mood': 'surprised'}), 'of a pet'),
        ('a missing background image', lambda s: s['background'].update({'image': 'nope.jpg'}), 'nope.jpg'),
        ('the old prop key', lambda s: s['props'][0].update({'height_units': 100}), 'height_units'),
        ('shot on a together entry', lambda s: s['script'][-1].update({'shot': 'wide'}), 'together'),
        ('a character that is not registered', lambda s: s['characters'].append({'name': 'extra', 'id': 'no_such_character', 'x': 900}), 'no_such_character'),
    ]
    for label, change, needle in cases:
        path = os.path.join(os.path.dirname(example), f'_check_{len(problems)}_{cases.index((label, change, needle))}.json')
        try:
            json.dump(variant(change), open(path, 'w', encoding='utf-8'))
            done = build(path, os.path.join(work, 'bad'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif 'Traceback' in done.stderr: problems.append(f'{label}: the tool crashed instead of explaining — {done.stderr.strip().splitlines()[-1][:160]}')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')

    # ── BỐI CẢNH 3D ("set"): ví dụ dựng được, sinh đúng các lời gọi; kịch bản sai bị từ chối kèm lời giải thích.
    stage = os.path.join(ROOT, 'examples', 'scene-3d', 'scene.json')
    done = build(stage, os.path.join(work, 'built3d'))
    if done.returncode != 0:
        problems.append('the 3D example scene does not build: ' + (done.stderr.strip() or done.stdout.strip())[:300])
    else:
        html = open(os.path.join(work, 'built3d', 'index.html'), encoding='utf-8').read()
        for needle, count in (('VGCharacter.createSet(', 1), ('set.place(', 3), ('set.box(', 2), ('set.panel(', 2), ('set.wall(', 3), ('onUpdate: set.update', 1), ('set.move(', 3), ('set.cut(', 2), ('y: box1.top', 1), ('lens: 5000', 1), ('lens: 1700', 1), ('set.stand(', 2), ("createProp(cutout1, \"plant\"", 1), ('blur: 9', 1)):
            if html.count(needle) != count: problems.append(f'3D example: expected {count} × {needle!r} in index.html, found {html.count(needle)}')
        if 'id="wall"' in html or 'id="floor"' in html: problems.append('3D example: the flat wall / floor clips are still written')
        if re.search(r'id="(vet|boy|cat)" class="clip"', html): problems.append('3D example: character hosts are written as clips — set.place() makes them')
    # Bước vào / bước ra qua tường bên, người ngồi ghế: dựng được, và quãng đi đủ ra ngoài phòng.
    moving = json.load(open(stage, encoding='utf-8'))
    moving['characters'][0]['enter'] = 'left'; moving['characters'][1]['seated'] = 'chair'
    moving['script'].append({'who': 'vet', 'exit': 'right'})
    path = os.path.join(os.path.dirname(stage), '_check_moving.json')
    try:
        json.dump(moving, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'moving3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a 3D scene with enter / exit / seated does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'moving3d', 'index.html'), encoding='utf-8').read()
        unit = 560 / 470
        enter = re.search(r"\['enter', \"left\", (\d+)\]", html); leave = re.search(r"\['exit', \"right\", (\d+)\]", html)
        if not enter or float(enter.group(1)) * unit < -210 + 900: problems.append(f'3D enter: the walk-in distance does not start outside the room ({enter and enter.group(1)})')
        if not leave or float(leave.group(1)) * unit < 900 + 210: problems.append(f'3D exit: the walk-out distance does not end outside the room ({leave and leave.group(1)})')
        if 'createProp(seat_boy, "chair", { for: boy })' not in html or 'boy.state.seat = 1' not in html: problems.append('3D seated: no chair stood behind the seated boy, or he does not start seated')
        if 'id="boy-chair"' in html: problems.append('3D seated: a flat chair clip is still written')
    # Lượt "bước lại gần" (đưa đồ) không được dời chỗ đặt ban đầu của nhân vật.
    closer = json.load(open(stage, encoding='utf-8'))
    closer['characters'][0]['holds'] = 'cup'; closer['characters'][1]['holds'] = 'cup'; closer['characters'][1]['holdsHidden'] = True
    closer['script'].insert(0, {'who': 'vet', 'do': [['handOver', '@boy']]})
    path = os.path.join(os.path.dirname(stage), '_check_closer.json')
    try:
        json.dump(closer, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'closer3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a 3D scene with an approach walk does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'closer3d', 'index.html'), encoding='utf-8').read()
        x0 = closer['characters'][0]['x']
        if f'set.place(vet, {{ x: {x0:g},' not in html: problems.append(f'3D approach walk: vet is placed at {re.search(r"set.place[(]vet, [{] x: ([-0-9.]+)", html).group(1)} instead of its starting x {x0}')
        if not re.search(r"\[vet, \['walk', 4, \d+\]\]", html): problems.append('3D approach walk: the walk toward the boy is missing')
    # Chỉ tay / vuốt ve trong bối cảnh 3D nhắm bằng set.target; con vật lệch độ sâu thì có lời nhắc.
    aiming = json.load(open(stage, encoding='utf-8'))
    aiming['characters'][2] = {'name': 'cat', 'species': 'cat', 'x': 20, 'z': -200, 'height': 200}
    aiming['script'].append({'who': 'vet', 'do': [['point', '@cat']]}); aiming['script'].append({'who': 'vet', 'do': [['stroke', '@cat']]})
    path = os.path.join(os.path.dirname(stage), '_check_aiming.json')
    try:
        json.dump(aiming, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'aiming3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a 3D scene with point / stroke does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'aiming3d', 'index.html'), encoding='utf-8').read()
        if html.count('set.target(vet, cat)') != 2: problems.append(f'3D point / stroke: expected set.target(vet, cat) twice, found {html.count("set.target(vet, cat)")}')
        if 'same z' not in done.stdout: problems.append('3D stroke of a cat at another depth: no note that a hand only reaches in its own plane')

    # Điện thoại / máy tính: ảnh trên tấm phẳng, laptop đặt trên hộp có màn hình, điện thoại có ảnh, lượt nói qua điện thoại.
    folder3d = os.path.dirname(stage)
    picture = os.path.join(folder3d, '_check_screen.png')
    devices = json.load(open(stage, encoding='utf-8'))
    devices['set']['panels'].append({'wall': 'back', 'at': 100, 'y': 500, 'width': 300, 'height': 180, 'image': '_check_screen.png'})
    devices['set']['cutouts'].append({'kind': 'monitor', 'x': 100, 'z': -500, 'y': 170, 'screen': '_check_screen.png'})
    devices['set']['cutouts'].append({'kind': 'laptop', 'x': -100, 'z': -500})
    devices['characters'][0]['holds'] = {'R': {'kind': 'phone', 'image': '_check_screen.png'}}
    devices['script'].insert(0, {'who': 'vet', 'say': 'Alo, phòng khám xin nghe.', 'dur': 1.8, 'phone': True})
    devices['script'].insert(1, {'who': 'vet', 'do': [['tapPhone', 1.2], ['showPhone', 1.2], ['typing', 1]], 'view': {'yaw': 10, 'distance': 900}})
    devices['script'].insert(2, {'who': 'vet', 'say': 'Dạ chiều nay ba giờ được không ạ, cô cho em xin tên bé mèo nhé?', 'dur': 2, 'phone': True})
    path = os.path.join(folder3d, '_check_devices.json')
    try:
        open(picture, 'wb').write(open(os.path.join(ROOT, 'docs', 'characters.png'), 'rb').read())
        json.dump(devices, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'devices3d'))
    finally:
        for leftover in (path, picture):
            if os.path.exists(leftover): os.remove(leftover)
    if done.returncode != 0: problems.append('a 3D scene with screens and a phone call does not build: ' + done.stderr.strip()[:300])
    else:
        out3d = os.path.join(work, 'devices3d')
        html = open(os.path.join(out3d, 'index.html'), encoding='utf-8').read()
        if "url('_check_screen.png')" not in html: problems.append('panel image: the picture is not put on the panel')
        if not re.search(r'createProp\(cutout\d+, "monitor", \{[^}]*"image": "_check_screen.png"', html): problems.append('monitor cutout: the screen picture is not passed to the prop')
        if not re.search(r'createProp\(cutout\d+, "laptop", \{[^}]*"on": 0', html): problems.append('laptop cutout: it is not drawn at the foot of its own frame (on: 0)')
        if not re.search(r'createCharacter\([^\n]*"kind": "phone", "image": "_check_screen.png"', html): problems.append('phone with a picture: the image is not passed to createCharacter')
        if not os.path.isfile(os.path.join(out3d, '_check_screen.png')): problems.append('the screen picture is not copied next to index.html')
        if not re.search(r"\['phoneUp'\],\s*\['explain', \"Alo, phòng khám xin nghe.\", 1.8\],\s*(?:[0-9.]+,\s*)?\['phoneDown'\]", html): problems.append('"phone": true does not wrap the line in phoneUp / phoneDown')
        if not re.search(r"\['explain', \"Dạ chiều nay ba giờ được không ạ, cô cho em xin tên bé mèo nhé\?\", 2(?:\.0)?\],\s*([0-9.]+),\s*\['phoneDown'\]", html): problems.append('a long phone line with a short "dur": the phone is put down before its caption is gone (no pause before phoneDown)')
        if not re.search(r'1\.5, \["tapPhone", 1\.2\]', html): problems.append('a turn without a line whose camera pans in: the hand action does not wait for the camera (expected a 1.5 s pause before tapPhone)')

    # Khám bệnh và bế thú: nghe / tiêm nhắm vào THÂN con vật (set.target …, 'body'), bế / đặt xuống, thú nằm / ngủ / mệt.
    exam = json.load(open(stage, encoding='utf-8'))
    exam['characters'][0]['holds'] = 'syringe'
    exam['characters'][2] = {'name': 'cat', 'species': 'cat', 'x': 40, 'z': -300, 'height': 200}
    exam['script'].append({'who': 'vet', 'do': [['listen', '@cat', 1.5], ['inject', '@cat']]})
    exam['script'].append({'who': 'cat', 'do': ['lieDown', ['sleep', 2], 'unwell', 'standUp']})
    exam['script'].append({'who': 'boy', 'do': [['carry', '@cat'], 'nod', 'putDown']})
    path = os.path.join(os.path.dirname(stage), '_check_exam.json')
    try:
        json.dump(exam, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'exam3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a 3D scene with an exam and a carried pet does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'exam3d', 'index.html'), encoding='utf-8').read()
        for needle in ('["listen", set.target(vet, cat, \'body\'), 1.5]', '["inject", set.target(vet, cat, \'body\')]', '["carry", cat]', '"putDown"', '["sleep", 2]'):
            if needle not in html: problems.append(f'exam / carry steps: {needle} is not in the composition')

    # Bối cảnh dựng sẵn: đồ của preset đi trước, đồ khai thêm cộng vào sau; có gợi ý chỗ đứng; biểu cảm và cử chỉ mới.
    preset = json.load(open(stage, encoding='utf-8'))
    preset['set'] = {'preset': 'reception', 'boxes': [{'name': 'extra', 'x': 600, 'z': -300, 'width': 100, 'depth': 100, 'height': 80}]}
    for who in preset['characters']: who.pop('on', None)
    preset['script'].append({'who': 'vet', 'do': ['clap', ['countFingers', 3], 'checkWatch', 'wai', 'bow', ['handshake', '@boy']], 'mood': 'embarrassed'})
    path = os.path.join(os.path.dirname(stage), '_check_preset.json')
    try:
        json.dump(preset, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'preset3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a scene with set.preset does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'preset3d', 'index.html'), encoding='utf-8').read()
        if 'name: "counter"' not in html or 'name: "extra"' not in html or html.index('name: "counter"') > html.index('name: "extra"'): problems.append('set.preset: the preset counter is missing, or the extra box does not come after it')
        if 'where people stand' not in done.stdout: problems.append('set.preset: no hint about where people stand')
        if '"handshake", boy' not in html.replace("'", '"') and '["handshake", boy]' not in html: problems.append('handshake @boy is not in the composition')

    # Đợt 4: bát, cân, dây dắt, khám bằng đèn soi, bánh thưởng — người bước lại sát con vật trước khi soi.
    care = json.load(open(stage, encoding='utf-8'))
    care['set'].setdefault('cutouts', []).extend([{'kind': 'bowl', 'x': -300, 'z': -500, 'fill': 'water'}, {'kind': 'scale', 'x': 500, 'z': -600, 'reading': '4.2 kg'}, {'kind': 'carrier', 'x': 300, 'z': -500, 'door': 'left'}])
    boy = next(who for who in care['characters'] if who.get('id') == 'boy'); boy['holds'] = 'leash'
    next(who for who in care['characters'] if who.get('species') == 'cat')['wears'] = ['cone', 'bandage']
    next(who for who in care['characters'] if who.get('id') == 'vet')['wears'] = ['mask', 'gloves', 'cap']
    care['script'] += [{'who': 'vet', 'do': [['examine', '@cat', 'teeth'], ['giveTreat', '@cat'], ['shine', '@cat'], 'ponder', 'callOut', ['brush', '@cat'], 'fingerHeart', 'thumbsDown']},
                       {'who': 'boy', 'do': [['leash', '@cat'], 'unleash']},
                       {'who': 'boy', 'do': [['carry', '@cat']]},
                       {'together': [{'who': 'boy', 'do': [['handOverPet', '@vet']]}, {'who': 'vet', 'do': [['takePet', '@boy']]}]},
                       {'who': 'vet', 'do': ['putDown', 'kneel', 'standUp', ['throwBall', 'right']]}, {'who': 'cat', 'do': ['scratchItch', ['limp', 4], 'openMouth']}]
    path = os.path.join(os.path.dirname(stage), '_check_care.json')
    try:
        json.dump(care, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'care3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a scene with vet-care steps does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care3d', 'index.html'), encoding='utf-8').read().replace("'", '"')
        for needle in ('"bowl", {"fill": "water"}', '"reading": "4.2 kg"', '"examine", set.target(vet, cat), "teeth"', '"giveTreat", set.target(vet, cat)', '"shine", set.aimAt(vet, cat)', '["leash", cat]', 'steps closer to cat for "examine"', 'items: {"R": "leash"}', 'wear: ["cone", "bandage"]', '"brush", set.target(vet, cat, "body")', '"door": "left"', '["handOverPet", vet]', '["takePet", boy]', 'wear: ["mask", "gloves", "cap"]'):
            if needle not in html: problems.append(f'vet care: {needle} is not in the composition')

    # Đợt 7: màn hình chia đôi khi gọi điện, thẻ thông báo trên khung.
    call = {'id': 'call', 'layout': 'split', 'sides': {'left': {'preset': 'home'}, 'right': {'wall': '#2a4d5c'}},
            'characters': [{'name': 'granny', 'id': 'granny', 'side': 'left', 'holds': 'phone'}, {'name': 'rec', 'id': 'receptionist', 'side': 'right', 'holds': 'phone'}],
            'script': [{'who': 'granny', 'do': [['notify', 'Nhắc lịch: Thứ Bảy']], 'toast': {'title': 'VetGo', 'text': 'Lịch tái khám'}},
                       {'who': 'granny', 'say': 'Alo', 'dur': 1.2, 'phone': True}, {'who': 'rec', 'say': 'Dạ', 'dur': 1.0, 'phone': True, 'toast': 'Đã đổi lịch'}]}
    path = os.path.join(os.path.dirname(stage), '_check_call.json')
    try:
        json.dump(call, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'call'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a split-screen call does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'call', 'index.html'), encoding='utf-8').read()
        for needle in ('id="wall-left"', 'id="wall-right"', 'id="divider"', 'id="dim-right"', "tl.to('#dim-left', { opacity: 0.32", 'id="toast-1"', 'id="toast-2"', 'data-text="Lịch tái khám"', '["notify", "Nhắc lịch: Thứ Bảy"]'):
            if needle not in html: problems.append(f'split call: {needle} is not in the composition')
        starts = [float(value) for value in re.findall(r'id="toast-\d"[^>]*data-start="([\d.]+)"', html)]
        if len(starts) != 2 or not (0 < starts[0] < starts[1]): problems.append(f'split call: the notification cards are not timed to their turns (data-start {starts})')
    for label, change, needle in [
        ('a split character without a side', lambda s: s['characters'][0].pop('side'), '"side"'),
        ('"sides" without the split layout', lambda s: s.pop('layout'), 'split'),
        ('a toast with an unknown key', lambda s: s['script'][0].update({'toast': {'title': 'a', 'icon': 'x'}}), 'toast'),
    ]:
        variant = json.loads(json.dumps(call)); change(variant)
        path = os.path.join(os.path.dirname(stage), '_check_callbad.json')
        try:
            json.dump(variant, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'callbad'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')

    # Đợt 9: thông báo trên màn hình đạo cụ trong bối cảnh 3D, gọi theo tên.
    screens = {'id': 'screens', 'set': {'preset': 'reception', 'cutouts': [{'kind': 'monitor', 'name': 'screen', 'x': -120, 'z': -460, 'y': 190}, {'kind': 'plant', 'name': 'fern', 'x': 600, 'z': 0}]},
               'characters': [{'name': 'rec', 'id': 'receptionist', 'x': -300, 'z': -620}],
               'script': [{'who': 'rec', 'do': ['nod'], 'popup': {'on': 'screen', 'title': 'Lịch hẹn mới', 'text': 'Milo 15:00'}}]}
    def screen_scene(change):
        scene = json.loads(json.dumps(screens)); change(scene)
        path = os.path.join(os.path.dirname(stage), '_check_screens.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            return build(path, os.path.join(work, 'screens'))
        finally:
            if os.path.exists(path): os.remove(path)
    done = screen_scene(lambda s: None)
    if done.returncode != 0: problems.append('a popup on a monitor does not build: ' + done.stderr.strip()[:300])
    elif not re.search(r'cutout\d+Prop\.notify\(\{"title": "Lịch hẹn mới", "text": "Milo 15:00"\}, \{ hold: 2\.5 \}\)', open(os.path.join(work, 'screens', 'index.html'), encoding='utf-8').read()): problems.append('popup: the notification call is not in the composition')
    for label, change, needle in [
        ('a popup on a screen that does not exist', lambda s: s['script'][0]['popup'].update({'on': 'tv'}), '"tv"'),
        ('a popup on a plant', lambda s: s['script'][0]['popup'].update({'on': 'fern'}), 'monitor'),
        ('a popup without text', lambda s: s['script'][0].update({'popup': {'on': 'screen'}}), 'popup'),
    ]:
        done = screen_scene(change)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')

    # Đợt 10: thẻ mở đầu / kết thúc; tools/film.py từ chối khoá lạ (ghép thật cần render — không chạy ở đây).
    cards = json.loads(json.dumps(call))
    cards['intro'] = {'title': 'Đặt lịch trong 30 giây', 'text': 'VetGo'}
    cards['outro'] = {'title': 'VetGo', 'cta': 'Tải app ngay', 'dur': 2.5}
    path = os.path.join(os.path.dirname(stage), '_check_cards.json')
    try:
        json.dump(cards, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'cards'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a scene with intro / outro cards does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'cards', 'index.html'), encoding='utf-8').read()
        for needle in ('id="intro-bg"', 'id="intro-title"', 'id="outro-cta"', 'const T0 = 2.6;', 'talk.addTo(tl, T0);'):
            if needle not in html: problems.append(f'cards: {needle} is not in the composition')
        if '__OUTRO_' in html: problems.append('cards: the closing card was not timed (placeholder left in the composition)')
        starts = re.findall(r'id="outro-bg"[^>]*data-start="([\d.]+)"', html)
        toast = re.findall(r'id="toast-1"[^>]*data-start="([\d.]+)"', html)
        if not starts or not toast or not float(toast[0]) > 2.6: problems.append(f'cards: the turns are not shifted after the opening card (toast at {toast})')
    # Đợt 11: tools/film.py bỏ thẻ của các cảnh giữa phim (--no-intro / --no-outro).
    try:
        json.dump(cards, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), path, '-o', os.path.join(work, 'nocards'), '--no-intro', '--no-outro'], capture_output=True, text=True)
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('--no-intro / --no-outro: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'nocards', 'index.html'), encoding='utf-8').read()
        if 'id="intro-bg"' in html or 'id="outro-bg"' in html or 'const T0 = 0;' not in html: problems.append('--no-intro / --no-outro: the cards are still in the composition')
    bad_film = os.path.join(work, 'bad-film.json')
    json.dump({'scenes': ['x.json'], 'soundtrack': 'a.mp3'}, open(bad_film, 'w'))
    done = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'film.py'), bad_film], capture_output=True, text=True)
    if done.returncode == 0 or 'soundtrack' not in done.stderr: problems.append('film.py: an unknown key in film.json is not refused clearly — ' + done.stderr.strip()[:160])
    # Đợt 27: hạt phim ở bước ghép phim — "grain" lạ bị từ chối; scene.py --no-grain tắt lớp hạt trong trang.
    json.dump({'scenes': ['x.json'], 'grain': 'heavy'}, open(bad_film, 'w'))
    done = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'film.py'), bad_film], capture_output=True, text=True)
    if done.returncode == 0 or '"grain"' not in done.stderr: problems.append('film.py: a bad "grain" is not refused clearly — ' + done.stderr.strip()[:160])
    grained = json.load(open(stage, encoding='utf-8'))
    path = os.path.join(os.path.dirname(stage), '_check_grain.json')
    try:
        json.dump(grained, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), path, '-o', os.path.join(work, 'nograin'), '--no-grain'], capture_output=True, text=True)
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('--no-grain: the scene does not build: ' + done.stderr.strip()[:300])
    elif '"grain": false' not in open(os.path.join(work, 'nograin', 'index.html'), encoding='utf-8').read(): problems.append('--no-grain: the grain layer is still on')
    if not os.path.isfile(os.path.join(work, 'nograin', 'gsap.min.js')): problems.append('the pinned GSAP (vendor/) is not copied next to the composition')

    for outdoor in ('park', 'street'):
        scene = {'id': outdoor, 'set': {'preset': outdoor}, 'characters': [{'name': 'boy', 'id': 'boy', 'x': -200, 'z': -500, 'holds': 'leash'}, {'name': 'dog', 'species': 'dog', 'x': 0, 'z': -500}],
                 'script': [{'who': 'boy', 'do': [['leash', '@dog']]}, {'together': [{'who': 'boy', 'do': [['walk', 4, 200]]}, {'who': 'dog', 'do': [['walk', 4, 300]]}]},
                           {'together': [{'who': 'dog', 'do': ['greet']}, {'who': 'boy', 'do': ['unleash']}]}]}
        path = os.path.join(os.path.dirname(stage), f'_check_{outdoor}.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'))
            done = build(path, os.path.join(work, outdoor))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'set.preset "{outdoor}" does not build: ' + done.stderr.strip()[:300])
        elif '"tree"' not in open(os.path.join(work, outdoor, 'index.html'), encoding='utf-8').read(): problems.append(f'set.preset "{outdoor}": no tree cutout')
        elif 'window.__framing' not in open(os.path.join(work, outdoor, 'index.html'), encoding='utf-8').read(): problems.append(f'set.preset "{outdoor}": no framing sweep (window.__framing)')

    # Đợt 11: nhắc góc máy cắt dở nhân vật — chỉ đoạn đủ dài (≥ 2 s), chỉ khi còn 5…85 % hình trong khung.
    import importlib.util
    spec = importlib.util.spec_from_file_location('scene_tool', os.path.join(HERE, 'scene.py')); scene_tool = importlib.util.module_from_spec(spec); spec.loader.exec_module(scene_tool)
    samples = [{'t': 1 + n * 0.25, 'name': 'boy', 'shown': 0.5, 'edge': 'left'} for n in range(12)]           # 3 s bị cắt đôi
    samples += [{'t': 6 + n * 0.25, 'name': 'cat', 'shown': 0.4, 'edge': 'bottom'} for n in range(4)]         # 1 s: máy lia qua
    samples += [{'t': 9 + n * 0.25, 'name': 'vet', 'shown': 0.95, 'edge': 'top'} for n in range(20)]          # chỉ sượt tóc
    notes = scene_tool.framing_notes(samples)
    if len(notes) != 1 or '"boy"' not in notes[0] or 'left edge' not in notes[0]: problems.append(f'framing notes: expected one note about "boy" at the left edge — got {notes}')

    # Đợt 13: góc máy tự động ("view": "close" / { "on": … }), dấu cảm xúc ("mark"), âm thanh theo động tác ("sounds").
    auto = json.load(open(stage, encoding='utf-8'))
    auto['script'][1]['view'] = 'close'
    auto['script'][2]['view'] = {'on': ['vet', 'boy'], 'size': 'medium'}
    auto['script'][2]['mark'] = '?'
    auto['script'].append({'who': 'cat', 'mood': 'scared', 'do': [['idle', 1]]})
    auto['sounds'] = {'thumbsUp': '../voiceover/voice.wav', 'cat.mood': {'file': '../voiceover/voice.wav', 'volume': 0.5}}
    path = os.path.join(os.path.dirname(stage), '_check_auto.json')
    try:
        json.dump(auto, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'auto'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('automatic views / marks / sounds: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'auto', 'index.html'), encoding='utf-8').read()
        for needle in ('frameAt(', '"close")', '"medium")', "['mark', \"?\"]", "{ mark: \"!\" }", 'id="sound-1"', 'data-volume="0.5"'):
            if needle not in html: problems.append(f'automatic views / marks / sounds: {needle} is not in the composition')

    # Đợt 14: đạo diễn tự động ("camera": "auto"), phụ đề dừng ở lần cắt cảnh, con vật nhai khi được cho ăn.
    directed = json.load(open(stage, encoding='utf-8'))
    directed['camera'] = 'auto'
    for turn in directed['script']:
        if isinstance(turn, dict): turn.pop('view', None)
    directed['script'].append({'who': 'vet', 'do': [['giveTreat', '@cat']]})
    path = os.path.join(os.path.dirname(stage), '_check_directed.json')
    try:
        json.dump(directed, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'directed'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('"camera": "auto": the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'directed', 'index.html'), encoding='utf-8').read()
        for needle in ('set.direct(tl,', 'speech: true', 'const CUTS = [', 'cuts: (typeof CUTS', "0.95, ['chew', 3]"):
            if needle not in html: problems.append(f'"camera": "auto": {needle} is not in the composition')

    # Đợt 15: kịch bản chữ thường (tools/script.py) → tệp cảnh; khung dọc.
    script_tool = os.path.join(HERE, 'script.py')
    good = os.path.join(work, 'kich-ban.txt')
    open(good, 'w', encoding='utf-8').write('bối cảnh: phòng khám · máy: tự động · khung: dọc\nkết thúc: VetGo | Phòng khám thú y\n'
                                            'bác sĩ (vet) · bé trai (boy) · chó (corgi, trên bàn, đeo loa)\n\n# ghi chú\nchó: [sợ]\nbác sĩ: Đừng sợ nhé!\n'
                                            'bé trai (lo lắng): Bé có sao không ạ?\nbác sĩ → chó: cho thuốc\ncùng lúc: bác sĩ: [gật đầu] | chó: [vui, vẫy đuôi]\n')
    done = subprocess.run([sys.executable, script_tool, good], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py: a good script does not build: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'kich-ban.scene.json'), encoding='utf-8'))
        dog = next((c for c in made['characters'] if c.get('species') == 'corgi'), {})
        checks = [(made.get('width'), 1080), (made.get('camera'), 'auto'), (made['set'].get('preset'), 'exam'), (dog.get('on'), 'table'), (dog.get('wears'), ['cone']),
                  (made['script'][0], {'who': 'cho', 'mood': 'scared'}), (made['script'][2].get('mood'), 'worried'),
                  (made['script'][3]['do'], [['giveTreat', '@cho', {'kind': 'pill'}]]), (made['script'][4]['together'][1], {'who': 'cho', 'mood': 'happy', 'do': ['wagTail']})]
        for got, want in checks:
            if got != want: problems.append(f'script.py: expected {want!r} in the scene file — got {got!r}')
        if not os.path.isfile(os.path.join(work, 'kich-ban', 'index.html')): problems.append('script.py: the composition was not built')
    for text, needle in [('bác sĩ (vet)\nbác sĩ: [nhảy múa]\n', 'dòng 2'), ('bác sĩ (vet) · chó (dog)\nchó: Gâu!\n', 'thú'),
                         ('bối cảnh: sao hoả\nbác sĩ (vet)\nbác sĩ: Chào\n', 'sao hoả'), ('bác sĩ (vet)\nmèo: [vui]\n', '"mèo"'),
                         ('bối cảnh: công viên\nchó (dog, trên bàn)\nchó: [vui]\n', 'bàn')]:
        bad = os.path.join(work, 'bad-script.txt')
        open(bad, 'w', encoding='utf-8').write(text)
        done = subprocess.run([sys.executable, script_tool, bad, '--no-build'], capture_output=True, text=True)
        if done.returncode == 0 or 'Traceback' in done.stderr or needle not in done.stderr: problems.append(f'script.py: {text!r} is not refused clearly (wanted {needle!r}) — {done.stderr.strip()[:200]}')

    # Đợt 16: ánh sáng — giờ trong ngày, đèn (bật / tắt theo lượt), cửa sổ hắt nắng.
    lit = json.load(open(stage, encoding='utf-8'))
    lit['set']['light'] = 'night'
    lit['set']['lamps'] = [{'name': 'tran', 'x': 0, 'y': 650, 'z': -500, 'kind': 'ceiling', 'color': '#ffe2b0'}]
    lit['set'].setdefault('panels', []).append({'wall': 'back', 'at': -200, 'y': 560, 'width': 300, 'height': 220, 'window': True})
    lit['script'][1]['lamp'] = 'on'
    lit['script'].append({'who': 'vet', 'lamp': {'name': 'tran', 'on': False, 'dur': 1}})
    lit['script'].append({'who': 'vet', 'power': 'off'})                             # đợt 20: mất điện, trời chuyển, tắt ống kính
    lit['script'].append({'who': 'vet', 'power': 'on', 'sky': {'to': 'day', 'dur': 4}})
    lit['set']['lens'] = False
    lit['set']['grain'] = False                                                      # đợt 24: bỏ riêng hạt phim
    path = os.path.join(os.path.dirname(stage), '_check_light.json')
    try:
        json.dump(lit, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'lit'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('light: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'lit', 'index.html'), encoding='utf-8').read()
        for needle in ('set.light({"mood": "night"', '"kind": "ceiling"', '"on": false', '"windows": [', 'set.lamp("tran", true, 0.6)', 'set.lamp("tran", false, 1)',
                       "['point', set.targetPoint(vet, set.lampPoint(\"tran\"))]", '.start + 0.85', 'set.lamp("tran", false, 0.12)', 'set.lamp("tran", true, 0.9)',
                       'set.shift("day", 4)', '"lens": false', '"grain": false'):
            if needle not in html: problems.append(f'light: {needle} is not in the composition')
        # Đợt 22: moments.json — các khoảnh khắc ánh sáng (mất điện, có điện, trời chuyển, bật / tắt đèn) kèm câu hỏi có / không.
        moments_path = os.path.join(work, 'lit', 'moments.json')
        if not os.path.isfile(moments_path): problems.append('light: moments.json is not written next to the composition')
        else:
            moments = json.load(open(moments_path, encoding='utf-8'))
            whats = [m['what'] for m in moments]
            for wanted in ('opening', 'power cut', 'power back on', 'sky turning to day — end', 'lamp on', 'lamp off'):
                if wanted not in whats: problems.append(f'light: moments.json has no "{wanted}" moment (has {whats})')
            if any(not m['ask'] or not isinstance(m['t'], (int, float)) for m in moments) or [m['t'] for m in moments] != sorted(m['t'] for m in moments):
                problems.append('light: moments.json moments need a time, questions, and to be in time order')

    # Đợt 28: diễn xuất — tay tới đích, chân chạm sàn. Bé quỳ xuống vuốt con chó dưới sàn; bác sĩ nhường chỗ cho bé vuốt con
    # mèo trên bàn khám; bắt tay một chiều thì bé bắt tay lại. Đo bằng tools/acting_check.py (Chrome).
    acting = {'id': 'acting', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [
        {'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': -30}, {'name': 'be', 'id': 'boy', 'z': -560, 'x': -430},
        {'name': 'meo', 'species': 'calico', 'z': -560, 'on': 'table', 'x': 200}, {'name': 'cho', 'species': 'corgi', 'z': -560, 'x': -700}],
        'script': [{'who': 'be', 'do': [['stroke', '@cho']]}, {'who': 'bac_si', 'do': [['listen', '@meo']]}, {'who': 'be', 'do': [['stroke', '@meo']]},
                   {'who': 'bac_si', 'do': [['handshake', '@be']]}]}
    path = os.path.join(os.path.dirname(stage), '_check_acting.json')
    try:
        json.dump(acting, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'acting'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('acting: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'acting', 'index.html'), encoding='utf-8').read()
        for needle in ('[be, "kneel"', '// bac_si makes room for be by meo', '[be, ["handshake", bac_si]]', '[meo, "purr"]', 'window.__set = set'):
            if needle not in html: problems.append(f'acting: {needle} is not in the composition')
        checks = [m['check'] for m in json.load(open(os.path.join(work, 'acting', 'moments.json'), encoding='utf-8')) if m.get('check')]
        if sorted((c['who'], c['kind'], c['target'], c['to']) for c in checks) != [('bac_si', 'handshake', 'be', 'hands'), ('bac_si', 'listen', 'meo', 'body'), ('be', 'stroke', 'cho', 'body'), ('be', 'stroke', 'meo', 'body')] \
                or any(len(c['times']) != 3 for c in checks):
            problems.append(f'acting: moments.json checks are {checks}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'acting')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('acting: ' + (done.stdout.strip() or done.stderr.strip())[-600:])

    # Đợt 35: dụng cụ & hồ sơ ở phòng khám — bác sĩ (cầm bìa hồ sơ, cất sẵn) đọc bệnh án, chỉ phim trên đèn đọc phim X-quang, băng
    # chân con chó trên bàn khám (cất bìa ở tay phía con chó trong lúc băng), đeo loa cho con mèo; băng và loa CÒN LẠI trên chúng.
    # Đo bằng tools/acting_check.py: tay tới chân / đầu, con vật thấy được, đồ đeo còn lại, bìa trước ngực, tay chỉ trúng điểm phim.
    care = {'id': 'care', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'kind': 'xray', 'name': 'phim', 'x': -330, 'z': -560}]}, 'characters': [
        {'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': -120, 'holds': 'clipboard', 'holdsHidden': True}, {'name': 'cho', 'species': 'corgi', 'z': -560, 'on': 'table', 'x': 200}],
        'script': [{'who': 'bac_si', 'do': [['readChart', 1.6]], 'view': 'medium'}, {'who': 'bac_si', 'do': [['showXray', 'phim', 1.4]], 'view': 'medium'},
                   {'who': 'bac_si', 'do': [['bandage', '@cho']]}, {'who': 'bac_si', 'do': [['putCone', '@cho']]}, {'who': 'cho', 'do': ['wagTail']}]}
    path = os.path.join(os.path.dirname(stage), '_check_care.json')
    try:
        json.dump(care, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'care'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('care: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care', 'index.html'), encoding='utf-8').read()
        for needle in ('VGCharacter.createProp(cutout', '"xray"', "['showXray', set.targetPoint(bac_si, [", 'cutout2Prop.spot.x', "set.target(bac_si, cho, 'leg')", '["putCone", set.target(bac_si, cho'):
            if needle not in html: problems.append(f'care: {needle!r} is not in the composition')
        checks = [m['check'] for m in json.load(open(os.path.join(work, 'care', 'moments.json'), encoding='utf-8')) if m.get('check')]
        kinds = sorted({(c['kind'], c.get('item', '')) for c in checks if c['kind'] in ('bandage', 'putCone', 'worn', 'readChart', 'showXray')})
        if kinds != [('bandage', ''), ('putCone', ''), ('readChart', ''), ('showXray', ''), ('worn', 'bandage'), ('worn', 'cone')]: problems.append(f'care: moments.json checks are {kinds}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'care')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('care: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        for needle in ('cho still wears the bandage', 'cho still wears the cone', 'readChart — clipboard up', 'showXray — points at the spot', 'bac_si bandage cho — hand reaches', 'bac_si putCone cho — hand reaches'):
            if needle not in done.stdout: problems.append(f'care: acting_check did not measure {needle!r}')

    # Đợt 29: đưa / nhận / bế, người ngồi, sáng một bên. Bé đưa cốc cho ông ngồi ghế đá (ông tự nhận, cốc ở tay phía bé); con
    # chó đi tới ông (set.target biết chỗ nó đứng ở lượt ấy), ông vuốt, bế nó lên lòng rồi trao cho bé. Đo bằng
    # tools/acting_check.py (tay tới tay, con vật trong vòng tay, mông trên mặt ghế) và tools/light_side.py (ban ngày: nửa phía
    # nắng sáng hơn nửa kia).
    handover = {'id': 'handover', 'camera': 'auto', 'set': {'preset': 'park'}, 'characters': [
        {'name': 'ong', 'id': 'grandpa', 'z': -880, 'x': 380, 'on': 'bench', 'seated': True, 'holds': 'cup', 'holdsHidden': True},
        {'name': 'be', 'id': 'boy', 'z': -880, 'x': -200, 'holds': 'cup'}, {'name': 'cho', 'species': 'corgi', 'z': -880, 'x': 820}],
        'script': [{'who': 'be', 'do': [['handOver', '@ong']]}, {'who': 'ong', 'do': [['stroke', '@cho']]}, {'who': 'ong', 'do': [['carry', '@cho']]},
                   {'who': 'ong', 'do': [['handOverPet', '@be']]}, {'who': 'be', 'do': ['putDown']},
                   # Đợt 30: bé vuốt con chó vừa đặt xuống cạnh chân mình — scene.py phải biết nó ở đó, không ở cạnh ghế đá.
                   {'who': 'be', 'do': [['stroke', '@cho']]}]}
    path = os.path.join(os.path.dirname(stage), '_check_handover.json')
    try:
        json.dump(handover, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'handover'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('handover: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'handover', 'index.html'), encoding='utf-8').read()
        for needle in ('items: {"L": "cup"}, itemsHidden: true', '[ong, ["take", be]]', '[be, ["takePet", ong, { petAt: ', '// cho comes over to ong (seated) for "stroke"', "set.target(ong, cho, 'top', { at: "):      # con chó tới từ phía HÔNG ông (đợt 31): người vẽ trước, tay trên đỉnh đầu
            if needle not in html: problems.append(f'handover: {needle} is not in the composition')
        if '// be steps closer to cho' in html: problems.append('handover: the boy walks to where the dog was picked up, not to where he put it down')
        checks = [m['check'] for m in json.load(open(os.path.join(work, 'handover', 'moments.json'), encoding='utf-8')) if m.get('check')]
        if sorted((c['who'], c['kind'], c['to']) for c in checks) != [('be', 'handOver', 'hands'), ('be', 'putDown', 'floor'), ('be', 'stroke', 'body'), ('ong', 'carry', 'body'), ('ong', 'handOverPet', 'hands'), ('ong', 'stroke', 'body')]:
            problems.append(f'handover: moments.json checks are {checks}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'handover')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('handover: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'in the arms' not in done.stdout or 'seated on the seat' not in done.stdout: problems.append('handover: acting_check did not measure the carried pet and the seated person:\n' + done.stdout[-400:])
        # Đợt 30: bé NHẬN con chó rồi đặt xuống — nó nằm cạnh chân bé, không trượt về cạnh ghế đá (chỗ ông bế nó lên).
        elif 'be stroke cho — hand reaches' not in done.stdout: problems.append('handover: acting_check did not measure the boy stroking the dog he put down:\n' + done.stdout[-400:])
        elif 'be puts cho down — next to the feet' not in done.stdout or 'stays put' not in done.stdout: problems.append('handover: acting_check did not measure the put-down:\n' + done.stdout[-400:])
        # Đợt 31: tay ông vuốt con chó thấy được (0.70.0: khuất hẳn sau mặt nó, 1 %), ông cúi ≤ 25°.
        elif "ong's hand on cho in view" not in done.stdout or "ong's hand rests on cho" not in done.stdout or 'ong stroke cho — leans no more than' not in done.stdout: problems.append('handover: acting_check did not measure the hand in view or the lean:\n' + done.stdout[-400:])
        done = subprocess.run([sys.executable, os.path.join(HERE, 'light_side.py'), os.path.join(work, 'handover')], capture_output=True, text=True)
        if done.returncode != 0 or ' pass' not in done.stdout or '0/0' in done.stdout: problems.append('handover light: ' + (done.stdout.strip() or done.stderr.strip())[-600:])

    # Đợt 30: bà ngồi sofa vuốt con mèo đi tới rồi bế nó (phòng khách khung ngang). acting_check đo tay tới ĐẦU / THÂN THẤY ĐƯỢC
    # của con mèo (không tới khung chụp — tay đặt trên gối mình vẫn "chạm") và tay không nằm trên đùi / gối của bà; và đồ đạc
    # (TV, bàn nước, sofa) không bị mép khung cắt ở mọi khoảnh khắc của moments.json (TV lộ nửa ở mép phải góc mở đầu).
    sofa = {'id': 'sofa', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [
        {'name': 'ba', 'id': 'granny', 'z': -820, 'x': -300, 'on': 'sofa', 'seated': True}, {'name': 'meo', 'species': 'cat', 'z': -820, 'x': 200}],
        'script': [{'who': 'ba', 'do': [['stroke', '@meo']]}, {'who': 'ba', 'do': [['carry', '@meo']]}]}
    path = os.path.join(os.path.dirname(stage), '_check_sofa.json')
    try:
        json.dump(sofa, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'sofa'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('sofa: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'sofa', 'index.html'), encoding='utf-8').read()
        if 'set.box({ x: -560' not in html or 'name: "sofa"' not in html: problems.append('sofa: the boxes are not named (set.propFraming reports them by name)')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'sofa')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('sofa: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'ba stroke meo — hand reaches' not in done.stdout or 'furniture inside the frame at 1 s (opening)' not in done.stdout:
            problems.append('sofa: acting_check did not measure the stroke or the furniture at the edges:\n' + done.stdout[-400:])
        # Đợt 31: con mèo đứng TRƯỚC ống chân bà (0.70.0: thấy 66 %, bà cúi 40°), tay bà trên đỉnh đầu nó; góc trung hẹp hơn 85 %
        # góc toàn (0.70.0: 99 % — máy lùi lấy trọn bàn nước).
        elif 'meo in view at' not in done.stdout or "ba's hand on meo in view" not in done.stdout or "ba's hand rests on meo" not in done.stdout or 'ba stroke meo — leans no more than' not in done.stdout or 'medium shot of' not in done.stdout:
            problems.append('sofa: acting_check did not measure the cat in view, the hand in view, the lean or the medium shot:\n' + done.stdout[-400:])
        if "set.target(ba, meo, 'crown'" not in html: problems.append("sofa: granny does not aim at the top of the cat's head (set.target(ba, meo, 'crown'))")
        # Đợt 32: tay bà áp và trượt trên đầu con mèo SUỐT lúc vuốt — đo mỗi 0,1 s (0.71.0: 4 / 13 mốc tay nhấc khỏi đầu, có lúc
        # 64 % bàn tay lún sau viền đầu mèo).
        if 'ba strokes meo — hand on it throughout' not in done.stdout or 'ba strokes meo — hand not sunk past its outline' not in done.stdout:
            problems.append('sofa: acting_check did not follow the hand through the strokes:\n' + done.stdout[-400:])

    # Đợt 32: KHUNG DỌC, phòng khách tối, bà ngồi sofa — mất điện, nói một câu (góc trung một người ngồi: đầu gối chìa ngang
    # làm góc trung = 100 % góc toàn), rọi đèn pin sang con mèo đứng giữa phòng (hai chủ thể xa nhau: góc hai người lẹm TV —
    # góc đơn của bà, luồng đèn vẫn chĩa về phía con mèo ngoài khung). 0.71.0: hai góc trung bị giữ thành góc toàn.
    portrait = {'id': 'portrait', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'living-room', 'light': 'night'}, 'characters': [
        {'name': 'ba', 'id': 'granny', 'z': -950, 'on': 'sofa', 'seated': True, 'x': -300}, {'name': 'meo', 'species': 'calico', 'z': -560, 'x': 150}],
        'script': [{'who': 'ba', 'power': 'off'}, {'who': 'ba', 'say': 'Mèo ơi, con đâu rồi?'}, {'who': 'ba', 'do': [['shine', '@meo']]},
                   {'who': 'meo', 'mood': 'scared'}, {'who': 'ba', 'say': 'Đừng sợ, bà đây mà.'}]}
    path = os.path.join(os.path.dirname(stage), '_check_portrait.json')
    try:
        json.dump(portrait, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'portrait'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('portrait: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        if 'no medium shot of' in done.stdout: problems.append('portrait: scene.py says a medium shot was kept as the full shot:\n' + done.stdout[-400:])
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'portrait')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('portrait: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif '0 medium shots kept as the full shot' not in done.stdout or 'medium shot of ba at' not in done.stdout:
            problems.append('portrait: acting_check did not count the medium shots kept as full shots:\n' + done.stdout[-400:])
        # Luồng đèn pin chĩa SANG PHẢI (phía con mèo), không lên trần: đầu đèn ở bên phải tay cầm, không cao hơn nó nhiều.
        aim = page_eval(os.path.join(work, 'portrait'), """(() => { const tl = Object.values(window.__timelines)[0], log = window.__set.shotLog.find((s) => s.how === 'single');
            if (!log) return { single: false }; tl.seek((log.t + (log.then ? log.then.t : log.end)) / 2, false); window.__set.update();
            const ba = document.querySelector('[data-set3d][data-name="ba"]'), lens = ba && ba.querySelector('[data-lens]'), tip = ba && ba.querySelector('[data-tip]');
            if (!lens || !tip) return { single: true, torch: false };
            const at = (el) => new DOMPoint(+el.getAttribute('cx'), +el.getAttribute('cy')).matrixTransform(el.getScreenCTM());
            const a = at(lens), b = at(tip); return { single: true, torch: true, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI }; })()""")
        if not aim or not aim.get('single'): problems.append(f'portrait: the shine is not framed as a single shot of granny ({aim})')
        elif aim.get('torch') and not -60 <= aim['angle'] <= 60: problems.append(f'portrait: the torch beam points {aim["angle"]:.0f}° (screen), not towards the cat on the right')
        # Đợt 32, lượt hai: góc đơn của bà rồi CẮT SANG CON MÈO trong cùng lượt — người chấm thấy cả hai (lượt đầu: con mèo không
        # có mặt trong lượt ấy).
        then = page_eval(os.path.join(work, 'portrait'), """(() => { const tl = Object.values(window.__timelines)[0], log = window.__set.shotLog.find((s) => s.how === 'single');
            if (!log || !log.then) return { then: null }; tl.seek((log.then.t + log.end) / 2, false); window.__set.update();
            const cat = window.__set.actingProbe().find((a) => a.name === 'meo'), W = window.innerWidth, H = window.innerHeight, parts = cat && cat.parts ? Object.values(cat.parts) : [];
            return { then: log.then, inside: parts.length > 0 && parts.every((r) => r.x0 >= -2 && r.x1 <= W + 2 && r.y1 <= H + 2 && r.y0 >= -2) }; })()""")
        if not then or not then.get('then') or then['then'].get('subjects') != ['meo']: problems.append(f'portrait: the single shot of granny does not cut to the cat within the turn ({then})')
        elif not then.get('inside'): problems.append(f'portrait: the cut to the cat after the single shot does not frame the whole cat ({then})')
        # Đợt 33: con mèo SỢ ở lượt sau — góc chèn con mèo giữ tới hết lượt ấy (0.72.0: cắt sang góc cận con mèo ngay lúc nó bắt đầu
        # sợ — phản ứng rơi vào góc kế).
        elif not then['then'].get('until') or 'meo reacts within the insert of meo' not in done.stdout or 'meo reacts in the frame' not in done.stdout:
            problems.append(f'portrait: the insert of the cat does not hold through its reaction on the next turn ({then}):\n' + done.stdout[-400:])

    # Đợt 33: HAI NGƯỜI Ở HAI CHIỀU SÂU cùng với tới một con vật — bà ngồi sofa vuốt con mèo, rồi bé (đứng gần máy hơn) quỳ cho nó
    # ăn. Con mèo đứng ở mặt phẳng của người đang với tới nó, lượt nào người nấy (`set.depth`). 0.72.0: con mèo giữ z riêng, tay
    # bà hở trên đầu nó 13 / 13 mốc (0 % chạm).
    pair = {'id': 'pair', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [
        {'name': 'ba', 'id': 'granny', 'z': -820, 'x': -300, 'on': 'sofa', 'seated': True}, {'name': 'be', 'id': 'boy', 'z': -780, 'x': 520},
        {'name': 'meo', 'species': 'cat', 'z': -790, 'x': 200}],
        'script': [{'who': 'ba', 'do': [['stroke', '@meo']]}, {'who': 'be', 'do': [['giveTreat', '@meo']]}]}
    path = os.path.join(os.path.dirname(stage), '_check_pair.json')
    try:
        json.dump(pair, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'pair'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('pair: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'pair', 'index.html'), encoding='utf-8').read()
        if 'set.depth(meo, -780' not in html: problems.append('pair: the cat does not move into the boy\'s plane before he feeds it (set.depth(meo, -780, …))')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'pair')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('pair: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'ba strokes meo — hand on it throughout' not in done.stdout or 'be giveTreat meo — hand reaches' not in done.stdout:
            problems.append('pair: acting_check did not follow granny\'s stroke or the boy\'s treat:\n' + done.stdout[-400:])
        # Lượt hai: con mèo dời chiều sâu lúc cắt cảnh (hay trong bước đi của nó), không trượt 0,45 s trên hình khi đứng yên (0.73.0
        # lượt đầu: 13 khung).
        elif 'meo moves to depth -780 unseen' not in done.stdout:
            problems.append('pair: acting_check did not measure the cat changing depth:\n' + done.stdout[-400:])

    # Đợt 34: cùng cảnh ấy với MÁY ĐỨNG YÊN (không có lần cắt nào): con mèo tự ĐI một đoạn ngắn sang mặt phẳng của bé, chiều sâu đổi
    # theo bước chân của nó (0.73.0: không cắt, không đi — trượt 0,45 s trên hình, 13 khung).
    still = dict(pair, id='still', camera=False)
    path = os.path.join(os.path.dirname(stage), '_check_still.json')
    try:
        json.dump(still, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'still'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('still: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'still', 'index.html'), encoding='utf-8').read()
        if "[meo, ['walk'" not in html: problems.append('still: the cat does not walk into the boy\'s plane before he feeds it')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'still')], capture_output=True, text=True)
        line = next((row for row in done.stdout.splitlines() if 'meo moves to depth -780' in row), '')
        if 'during its own walk' not in line or '✓' not in line: problems.append('still: the cat does not change depth during its own walk:\n' + (line or done.stdout[-400:]))
        # Đợt 34, lượt hai: góc rất rộng, tay bà chỉ ~450 px — acting_check đo lại ở 2× (ở 1× viền răng cưa thành 12 % "lún").
        elif done.returncode != 0: problems.append('still: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'measured at 2×' not in done.stdout: problems.append('still: acting_check did not measure the small stroking hand at 2×:\n' + done.stdout[-400:])

    # Đợt 35: PHÒNG KHÁM — bác sĩ cân con chó (đặt lên cái cân "can" rồi bế về), đo nhiệt độ (con chó quay đuôi lại), cho uống thuốc
    # (con chó há miệng rồi nhai). acting_check: con chó đứng trên bệ cân lúc đọc số, tay tới nó lúc bế, lúc đo nhiệt, lúc đưa thuốc.
    care = {'id': 'care35', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'kind': 'scale', 'name': 'can', 'x': -120, 'z': -560, 'reading': '9.6 kg'}]},
            'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho'}, {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}],
            'script': [{'who': 'bac_si', 'do': [['weigh', '@cho', 'can']]}, {'who': 'bac_si', 'do': [['takeTemp', '@cho', 1.5, {'reading': '39.4°C'}]]},
                       {'who': 'bac_si', 'do': [['givePill', '@cho']]}, {'who': 'bac_si', 'do': [['look', '@cho'], ['idle', 1.2]]}]}
    path = os.path.join(os.path.dirname(stage), '_check_care35.json')
    try:
        json.dump(care, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'care35'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('care35: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care35', 'index.html'), encoding='utf-8').read()
        for needle in ('[\'weigh\', cho, set.targetPoint(bac_si, [-120, 27.3, -560]), { reading: "9.6 kg", display: cutout2Prop }]', '"scale", {"reading": "0.0 kg"}', 'set.target(bac_si, cho, "rear")', "[cho, ['face', \"right\"]]",
                       "['openMouth', 1.1], ['chew', 3]", 'set.target(bac_si, cho, "lips")', '["lookAt", set.target(bac_si, cho)]'):
            if needle not in html: problems.append(f'care35: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'care35')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('care35: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            # Lượt hai (đợt 35): con vật không tự nhảy chỗ suốt bước cân, mắt nhìn nhiệt kế lúc đọc, viên thuốc ở môi lúc miệng con vật há.
            for needle in ('bac_si weighs cho — cho on the scale', 'bac_si carry cho — hand reaches', 'bac_si takeTemp cho — hand reaches', 'bac_si givePill cho — hand reaches', 'cho in view at',
                           'bac_si weighs cho — cho never jumps', 'bac_si looks at the thermometer', 'bac_si givePill cho — pill at the mouth', 'bac_si givePill cho — mouth open for the pill',
                           # lượt ba: màn hình cân đồng bộ, đọc nhiệt kế ở góc cận (mặt quay, cúi, nhiệt kế sát mặt), viên thuốc / mặt / miệng đủ to trên khung
                           'the scale shows the weight only while cho is on it', 'bac_si turns to the thermometer held by the face', 'bac_si givePill cho — big enough on screen',
                           # lượt bốn: đầu đo chạm thân sau; hai tay trên đầu con vật
                           'bac_si takeTemp cho — the thermometer touches it', 'bac_si givePill cho — both hands on its head',
                           # đợt 36: HƯỚNG ĐẦU tới đích (`lookAt`) — nhiệt kế lúc đọc, mõm lúc cho thuốc, con vật trên cân
                           'bac_si look — head turned to the thermometer', 'bac_si pill — head turned to cho', 'bac_si weigh — head turned to the weight shown over the scale'):
                if needle not in done.stdout: problems.append(f'care35: acting_check did not measure "{needle}":\n' + done.stdout[-400:])

    # ĐỢT 38 A: cắt móng, nhỏ mắt, vệ sinh tai, quét chip — bác sĩ với con corgi trên bàn khám, cậu bé đứng xem (người thứ ba trong phòng).
    # acting_check: kìm tới bàn chân đang được nhấc, khép / mở; giọt thuốc rơi vào mắt, mắt nhắm; bông ở gốc tai, con vật lắc đầu khi
    # đã buông tay; máy quét rà trên gáy, thẻ mã chip đọc được, không che đầu con vật hay mặt người; đầu người hướng về chỗ tay làm.
    care38 = {'id': 'care38', 'camera': 'auto', 'set': {'preset': 'exam'},
              'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho', 'holds': 'clipboard', 'holdsHidden': True},
                             {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'be', 'id': 'boy', 'x': -260, 'z': -560, 'faces': 'bac_si'}],
              'script': [{'who': 'bac_si', 'do': [['clipNails', '@cho']]}, {'who': 'bac_si', 'do': [['eyeDrops', '@cho']]}, {'who': 'bac_si', 'do': [['cleanEars', '@cho']]},
                         {'who': 'bac_si', 'do': [['scanChip', '@cho', {'id': '704 000 111 222'}]]}, {'who': 'be', 'say': 'Cảm ơn bác sĩ ạ.', 'do': ['nod']}]}
    path = os.path.join(os.path.dirname(stage), '_check_care38.json')
    try:
        json.dump(care38, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'care38'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('care38: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care38', 'index.html'), encoding='utf-8').read()
        for needle in ('["clipNails", set.target(bac_si, cho, \'head\')]', '["eyeDrops", set.target(bac_si, cho, \'head\')]', '["cleanEars", set.target(bac_si, cho, \'head\')]',
                       '["scanChip", set.target(bac_si, cho, \'head\'), {"id": "704 000 111 222"}]', 'goes to the head end of cho for "clipNails"', 'subjects: [bac_si, cho], size: "close"'):
            if needle not in html: problems.append(f'care38: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'care38')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('care38: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('bac_si clipNails cho — the clipper at the paw', 'bac_si clipNails cho — the clipper closes and opens', 'bac_si clipNails cho — the paw is held up while cut',
                           'bac_si clipNails cho — the other hand holds the paw', 'bac_si clipNails — head turned to the nail clipper',
                           'bac_si eyeDrops cho — the dropper right above the eye', 'bac_si eyeDrops cho — a drop hangs at the tip, then falls into the eye', 'bac_si eyeDrops cho — the eyes shut after the drop',
                           'bac_si eyeDrops cho — the chin held up by the other hand', 'bac_si cleanEars cho — the cotton pad wipes at the ear', 'bac_si cleanEars cho — then it shakes its head, hands off',
                           'bac_si scanChip cho — the scanner passes over the neck and shoulders', 'bac_si scanChip cho — the chip number shown on a big card', 'bac_si scanChip — head turned to the chip number shown',
                           'bac_si eyeDrops cho — hand reaches', 'cho in view at'):
                if needle not in done.stdout: problems.append(f'care38: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    # Kịch bản chữ (đợt 38 A): "cắt móng", "nhỏ mắt", "lau tai", "quét chip <mã>".
    text = os.path.join(work, 'care38.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · mèo (cat, trên bàn)\n\nbác sĩ → mèo: cắt móng\nbác sĩ → mèo: nhỏ thuốc mắt\n'
                                            'bác sĩ → mèo: lau tai\nbác sĩ → mèo: quét chip 704 000 111 222\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py care38: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'care38.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [['clipNails', '@meo'], ['eyeDrops', '@meo'], ['cleanEars', '@meo'], ['scanChip', '@meo', {'id': '704 000 111 222'}]]
        if steps != want: problems.append(f'script.py care38: steps {steps}, want {want}')

    # Đợt 33: ĐỘNG TÁC TAY trong khung dọc — bé vẫy rồi chỉ tay ra xa (góc trung theo đầu + thân áo: tay chỉ ra ngoài mép phải 60 %
    # bàn tay ở 0.72.0). Góc trung nới theo bàn tay ở lượt có động tác tay, vẫn hẹp hơn 85 % góc toàn.
    gesture = {'id': 'gesture', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'street'}, 'characters': [{'name': 'be', 'id': 'boy', 'z': -400, 'x': 0}],
               'script': [{'who': 'be', 'say': 'Chào mọi người, mình là Bin.', 'do': ['wave']}, {'who': 'be', 'say': 'Nhà mình ở đằng kia kìa.', 'do': ['point']}]}
    path = os.path.join(os.path.dirname(stage), '_check_gesture.json')
    try:
        json.dump(gesture, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'gesture'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('gesture: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'gesture')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('gesture: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'be wave — hands in the frame' not in done.stdout or 'be point — hands in the frame' not in done.stdout or '0 medium shots kept as the full shot' not in done.stdout:
            problems.append('gesture: acting_check did not measure the hands of the wave and the point:\n' + done.stdout[-400:])

    # Đợt 39 B: sáu cử chỉ thường ngày (cười lớn, lau nước mắt, ôm trán, suỵt, ra dấu OK, chào) — bàn tay trong khung, ngón ở môi, tay ở
    # mắt / chân mày, vòng OK cạnh mặt, đầu + vai chuyển động (acting_check `check_gesture39`). Viết bằng kịch bản tiếng Việt.
    g39 = os.path.join(work, 'g39.txt')
    open(g39, 'w', encoding='utf-8').write('bối cảnh: đường phố\nbác sĩ (vet)\nbé (boy)\nbác sĩ: [cười lớn]\nbé: [lau nước mắt]\nbác sĩ: [ôm trán]\nbé: [suỵt]\nbác sĩ: [ra dấu ok]\nbé: [giơ tay chào]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), g39, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('gesture39: script.py: ' + (done.stderr.strip() or done.stdout.strip())[-300:])
    else:
        want = ['laugh', 'wipeTears', 'facepalm', 'shush', 'okSign', 'salute']
        got = [step for turn in json.load(open(os.path.join(work, 'g39.scene.json'), encoding='utf-8'))['script'] for step in turn.get('do', [])]
        if got != want or any('mood' in turn for turn in json.load(open(os.path.join(work, 'g39.scene.json'), encoding='utf-8'))['script']): problems.append(f'gesture39: script.py gave {got}, want {want} and no mood')
        else:
            done = build(os.path.join(work, 'g39.scene.json'), os.path.join(work, 'g39'))
            if done.returncode != 0: problems.append('gesture39: the scene does not build: ' + done.stderr.strip()[:300])
            else:
                done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'g39')], capture_output=True, text=True)
                if done.returncode != 0: problems.append('gesture39: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
                elif not all(text in done.stdout for text in ('the index finger at the lips', 'the palm over the eyes', 'the flat hand at the brow', 'the OK circle beside the face', 'the hand at the eye', 'head and shoulders move with the laugh')):
                    problems.append('gesture39: acting_check did not measure the six gestures:\n' + done.stdout[-400:])

    # Đợt 33, lượt hai: bác sĩ vẫy, bé REO HAI TAY, bác sĩ chỉ tay — khung dọc công viên. Bé reo chữ V cần ~1,02 góc toàn: góc trung
    # 80 % để tay trái lẹm 34 % (0.73.0 lượt đầu) — nay lượt ấy là góc toàn có cả hai tay; mọi bàn tay cách mép ≥ 5 % bề rộng tay.
    cheer = {'id': 'cheer', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'park'}, 'characters': [
        {'name': 'vet', 'id': 'vet', 'z': -560, 'x': -150}, {'name': 'be', 'id': 'boy', 'z': -560, 'x': 250}],
        'script': [{'who': 'vet', 'say': 'Chào cháu, hôm nay đẹp trời quá.', 'do': ['wave']}, {'who': 'be', 'say': 'Dạ chào bác sĩ ạ!', 'do': ['cheer']},
                   {'who': 'vet', 'say': 'Cháu nhìn con chim trên cây kìa.', 'do': ['point']}]}
    path = os.path.join(os.path.dirname(stage), '_check_cheer.json')
    try:
        json.dump(cheer, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'cheer'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('cheer: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'cheer')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('cheer: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'be cheer — hands in the frame' not in done.stdout or 'vet point — hands in the frame' not in done.stdout:
            problems.append('cheer: acting_check did not measure the hands of the cheer and the point:\n' + done.stdout[-400:])
        # Đợt 34: khung dọc thì bé REO HẸP (hai nắm tay cạnh vai) — lượt reo giữ GÓC TRUNG, không cắt sang góc toàn giữa chuỗi góc
        # trung (0.73.0: `how: 'gesture'`, góc toàn 116 %).
        else:
            got = page_eval(os.path.join(work, 'cheer'), "(() => window.__set.shotLog.map((s) => ({ subjects: s.subjects, size: s.size, how: s.how || null, ratio: s.ratio })))()")
            html = open(os.path.join(work, 'cheer', 'index.html'), encoding='utf-8').read()
            if "['cheer', { narrow: true }]" not in html: problems.append('cheer: the boy\'s cheer in a vertical frame is not the narrow one (cheer({ narrow: true }))')
            elif not got or any(shot.get('how') == 'gesture' for shot in got): problems.append(f'cheer: the cheer still cuts to the full shot in the middle of the medium shots ({got})')

    # Đợt 32, lượt hai: GÓC MỞ ĐẦU KHUNG DỌC một người đứng giữ cỡ 80 % chiều cao (lượt đầu đợt 32: 66 % cho mọi góc toàn dọc —
    # thừa sàn, thừa tường); góc trung của người ấy vẫn hẹp hơn 85 % góc toàn (bề ngang theo lõi khi hai tay múa chìa ngang).
    # (0.72.0 lượt đầu: người cao 0,86 khung — nay 1,03; góc trung 0,71 góc toàn.)
    opening = {'id': 'opening', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'street'}, 'characters': [{'name': 'be', 'id': 'boy', 'z': -400, 'x': 0}],
               'script': [{'who': 'be', 'say': 'Chào mọi người, mình là Bin.'}, {'who': 'be', 'say': 'Hôm nay mình đi dạo nhé.'}]}
    path = os.path.join(os.path.dirname(stage), '_check_opening.json')
    try:
        json.dump(opening, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'opening'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('opening: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        got = page_eval(os.path.join(work, 'opening'), """(() => { const tl = Object.values(window.__timelines)[0]; tl.seek(window.__sceneTimings.turns[0][0] + 0.3, false); window.__set.update();
            const boy = window.__set.actingProbe().find((a) => a.name === 'be');
            return { tall: boy ? boy.tall / window.innerHeight : null, shots: window.__set.shotLog.map((s) => [s.how, s.ratio]) }; })()""")
        if not got or got.get('tall') is None or got['tall'] < 0.95: problems.append(f'opening: the vertical opening shot of one standing person is wider than the 80 % full shot ({got})')
        elif not got.get('shots') or any(how == 'full' or ratio is None or ratio >= 0.85 for how, ratio in got['shots']): problems.append(f'opening: a medium shot is not narrower than 85 % of the full shot ({got})')

    # Đợt 32: CON VẬT Ở MÉP DƯỚI — bác sĩ nói giọng ngạc nhiên (góc cận) cạnh con husky trên một cái bệ cao: góc cận cắt ngang
    # chân, thân con chó. Luật (0.71.0) nới khung lấy trọn nó; không có luật thì khung thân nó lòi 16 % dưới mép (1134 > 1080 px).
    stand = {'id': 'stand', 'camera': 'auto', 'set': {'preset': 'exam', 'boxes': [{'name': 'stand', 'x': 160, 'z': -480, 'width': 200, 'depth': 140, 'height': 200}]},
             'characters': [{'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': 40}, {'name': 'cho', 'species': 'husky', 'z': -560, 'on': 'stand', 'x': 260}],
             'script': [{'who': 'bac_si', 'mood': 'surprised', 'say': 'Ồ, bé hôm nay ngoan quá!'}, {'who': 'bac_si', 'mood': 'worried', 'say': 'Để cô xem tai bé nào.'}]}
    path = os.path.join(os.path.dirname(stage), '_check_stand.json')
    try:
        json.dump(stand, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'stand'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('stand: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        got = page_eval(os.path.join(work, 'stand'), """(() => { const tl = Object.values(window.__timelines)[0]; tl.seek(3, false); window.__set.update();
            const dog = window.__set.actingProbe().find((a) => a.name === 'cho'); return { rules: window.__set.ruleLog, bottom: dog && dog.body ? dog.body.y1 : null, height: window.innerHeight }; })()""")
        if not got or not any(r.get('rule') == 'petBottom' for r in got.get('rules') or []): problems.append(f'stand: the bottom-edge rule for pets was not reached ({got})')
        elif got.get('bottom') is None or got['bottom'] > 1080 + 2: problems.append(f'stand: the husky is cut by the bottom edge of the close shot (its box ends at {got.get("bottom")} px of 1080)')

    # Đợt 26: mẫu phim ánh sáng trong examples/lighting/ — kịch bản chữ phải đọc được (không dựng: CI đã đủ dài).
    import glob, shutil
    for sample in sorted(glob.glob(os.path.join(os.path.dirname(HERE), 'examples', 'lighting', '*.txt'))):
        copy = os.path.join(work, os.path.basename(sample)); shutil.copy(sample, copy)
        done = subprocess.run([sys.executable, script_tool, copy, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'examples/lighting/{os.path.basename(sample)} does not parse: {done.stderr.strip()[:200]}')

    # Đợt 18: kịch bản nhiều cảnh → film.json; mở đầu "hook"; thông báo trong kịch bản chữ.
    multi = os.path.join(work, 'phim.txt')
    open(multi, 'w', encoding='utf-8').write('khung: dọc · nhạc: nen.mp3\nmở đầu: hook | Mèo bỏ ăn? | Gọi VetGo\nkết thúc: VetGo | Tải app\n'
                                             'bà (granny) · mèo (calico) · bác sĩ (vet)\n\n=== nhà · bối cảnh: phòng khách · ánh sáng: tối\nbà (granny, ngồi)\n'
                                             'mèo: [buồn ngủ]\nbà: [bật đèn]\nthông báo: VetGo | Đặt lịch 8:00\nbà: Mai mình đi khám nhé.\n'
                                             '=== khám · bối cảnh: phòng khám\nmèo (calico, trên bàn)\nbác sĩ → mèo: khám\n')
    done = subprocess.run([sys.executable, script_tool, multi, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py: a script with scenes is refused: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        one, two = (json.load(open(os.path.join(work, f'phim-{n}.scene.json'), encoding='utf-8')) for n in (1, 2))
        film = json.load(open(os.path.join(work, 'phim.film.json'), encoding='utf-8'))
        for got, want in [(one.get('hook'), {'title': 'Mèo bỏ ăn?', 'text': 'Gọi VetGo'}), ('outro' in one, False), (two.get('outro', {}).get('title'), 'VetGo'),
                          (one['set'], {'preset': 'living-room', 'light': 'night'}), (sorted(c['name'] for c in one['characters']), ['ba', 'meo']),
                          (next(c for c in one['characters'] if c['name'] == 'ba').get('seated'), True), (next(c for c in two['characters'] if c['name'] == 'meo').get('on'), 'table'),
                          (one['script'][2].get('toast'), {'title': 'VetGo', 'text': 'Đặt lịch 8:00'}), (one['script'][1].get('lamp'), 'on'),
                          (film.get('scenes'), ['phim-1.scene.json', 'phim-2.scene.json']), (film.get('music'), 'nen.mp3'), ('music' in one, False)]:
            if got != want: problems.append(f'script.py (scenes): expected {want!r} — got {got!r}')
    # Đợt 20: mất điện / có điện, trời chuyển giờ trong kịch bản chữ.
    sky = os.path.join(work, 'troi.txt')
    open(sky, 'w', encoding='utf-8').write('bối cảnh: phòng khách · ánh sáng: chiều → tối\nbà (granny)\nbà: Chiều rồi.\nbà: [mất điện]\nbà: [có điện]\nbà: [trời sáng]\n')
    done = subprocess.run([sys.executable, script_tool, sky, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py: power / sky words are refused: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        got = json.load(open(os.path.join(work, 'troi.scene.json'), encoding='utf-8'))
        steps = [{k: v for k, v in turn.items() if k in ('power', 'sky')} for turn in got['script']]
        # "chiều → tối": trời chuyển ở lượt giữa cảnh (lượt thứ 3 trong 4).
        if got['set'].get('light') != 'evening' or steps != [{}, {'power': 'off'}, {'power': 'on', 'sky': {'to': 'night', 'dur': 6}}, {'sky': 'day'}]:
            problems.append(f'script.py (power / sky): got light {got["set"].get("light")!r}, turns {steps!r}')
    hooked = json.loads(json.dumps(call)); hooked['hook'] = {'title': 'Bé ăn nhầm sô-cô-la?', 'text': 'Gọi VetGo'}
    path = os.path.join(os.path.dirname(stage), '_check_hook.json')
    try:
        json.dump(hooked, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'hook'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('hook: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'hook', 'index.html'), encoding='utf-8').read()
        for needle in ('id="hook-title"', 'id="hook-text"', "tl.from('#hook-title'", 'const T0 = 0;'):
            if needle not in html: problems.append(f'hook: {needle} is not in the composition')

    def variant3d(change):
        scene = json.load(open(stage, encoding='utf-8')); change(scene); return scene
    for label, change, needle in [
        ('flat props in a 3D set', lambda s: s.update({'props': [{'kind': 'table', 'x': 300}]}), 'set.boxes'),
        ('a flat background in a 3D set', lambda s: s.update({'background': {'wall': '#fff'}}), 'set.room'),
        ('the 2D camera in a 3D set', lambda s: s.update({'camera': True}), 'view'),
        ('the 2D camera shot in a 3D set', lambda s: s['script'][0].update({'shot': 'face'}), 'view'),
        ('seated without a chair kind', lambda s: s['characters'][0].update({'seated': 'sofa'}), 'seated'),
        ('standing on a box that does not exist', lambda s: s['characters'][2].update({'on': 'shelf'}), 'shelf'),
        ('an unknown camera key in a view', lambda s: s['script'][0]['view'].update({'roll': 5}), 'roll'),
        ('a view that changes nothing', lambda s: s['script'][0].update({'view': {'dur': 2}}), 'changes nothing'),
        ('an unknown set key', lambda s: s['set'].update({'lights': []}), 'lights'),
        ('a camera looking down from too high', lambda s: s['script'][0]['view'].update({'pitch': 30}), 'pitch'),
        ('a camera swung round too far', lambda s: s['script'][0]['view'].update({'yaw': 75}), 'yaw'),
        ('the old isometric view', lambda s: s['script'][3].update({'view': {'isometric': True}}), 'wide'),
        ('too high a starting camera', lambda s: s['set'].update({'camera': {'pitch': 25}}), 'pitch'),
        ('a cutout of an unknown kind', lambda s: s['set']['cutouts'].append({'kind': 'fountain', 'x': 0, 'z': 0}), 'fountain'),
        ('a cutout with a missing picture', lambda s: s['set']['cutouts'].append({'image': 'nope.png', 'x': 0, 'z': 0}), 'nope.png'),
        ('a cutout without a position', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'x': 0}), '"z"'),
        ('too much blur', lambda s: s['script'][0]['view'].update({'blur': 50}), 'blur'),
        ('an unknown set preset', lambda s: s['set'].update({'preset': 'spa'}), 'reception'),
        ('a phone line for someone without a phone', lambda s: s['script'].insert(0, {'who': 'vet', 'say': 'Alo', 'phone': True}), 'holds'),
        ('a phone turn without a line', lambda s: s['characters'][0].update({'holds': 'phone'}) or s['script'].insert(0, {'who': 'vet', 'do': ['nod'], 'phone': True}), '"say"'),
        ('a screen on a plant', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'x': 0, 'z': 0, 'screen': 'a.png'}), 'laptop'),
        ('a reading on a bowl', lambda s: s['set']['cutouts'].append({'kind': 'bowl', 'x': 0, 'z': 0, 'reading': '1 kg'}), 'scale only'),
        ('a person wearing a cone', lambda s: s['characters'][0].update({'wears': 'cone'}), 'a person'),
        ('a pet wearing a hat', lambda s: next(w for w in s['characters'] if w.get('species')).update({'wears': 'hat'}), 'cone or bandage'),
        ('a bowl full of soup', lambda s: s['set']['cutouts'].append({'kind': 'bowl', 'x': 0, 'z': 0, 'fill': 'soup'}), 'fill'),
        ('a laptop facing up', lambda s: s['set']['cutouts'].append({'kind': 'laptop', 'x': 0, 'z': 0, 'facing': 'up'}), 'facing'),
        ('a picture on a cup', lambda s: s['characters'][0].update({'holds': {'R': {'kind': 'cup', 'image': 'a.png'}}}), 'holds'),
        ('a panel picture that is missing', lambda s: s['set']['panels'].append({'wall': 'back', 'at': 0, 'y': 400, 'width': 100, 'height': 100, 'image': 'nope.png'}), 'nope.png'),
        ('a box without a size', lambda s: s['set']['boxes'].append({'x': 0, 'z': 0}), 'width'),
        ('a view inside together', lambda s: s['script'].append({'together': [{'who': 'vet', 'do': ['nod'], 'view': {'yaw': 5}}, {'who': 'boy', 'do': ['nod']}]}), 'together'),
        ('z without a set', lambda s: s.pop('set') and [turn.pop('view', None) for turn in s['script']] and s['characters'][2].pop('on'), '"set"'),
        ('a view without a set', lambda s: s.pop('set') and [who.pop('z', None) or who.pop('on', None) for who in s['characters']], '"set"'),
        ('a view word that is not a size', lambda s: s['script'][1].update({'view': 'tight'}), 'medium'),
        ('an automatic view on nobody', lambda s: s['script'][1].update({'view': {'on': 'ghost'}}), 'view.on'),
        ('an automatic view of a wrong size', lambda s: s['script'][1].update({'view': {'on': 'vet', 'size': 'huge'}}), 'view.size'),
        ('an unknown mark', lambda s: s['script'][1].update({'mark': 'star'}), '"mark"'),
        ('"marks" that is not true / false', lambda s: s.update({'marks': 'no'}), '"marks"'),
        ('a missing sound file', lambda s: s.update({'sounds': {'wave': 'nope.wav'}}), 'nope.wav'),
        ('a camera other than "auto" in a set', lambda s: s.update({'camera': 'close'}), '"auto"'),
        ('an unknown time of day', lambda s: s['set'].update({'light': 'dusk'}), 'set.light'),
        ('a lamp of an unknown kind', lambda s: s['set'].update({'lamps': [{'x': 0, 'y': 600, 'z': -500, 'kind': 'neon'}]}), 'ceiling'),
        ('a lamp switched where there is none', lambda s: s['script'][1].update({'lamp': 'on'}), 'no lamps'),
        ('an unknown sky', lambda s: s['script'][1].update({'sky': 'dusk'}), '"sky"'),
        ('a power word that is not on / off', lambda s: s['script'][1].update({'power': 'cut'}), '"power"'),
        ('a window on a side wall', lambda s: s['set'].setdefault('panels', []).append({'wall': 'left', 'at': -300, 'y': 500, 'width': 200, 'height': 200, 'window': True}), 'back wall'),
        ('riding something that is not a scooter', lambda s: s['characters'][0].update({'rides': 'table'}), 'scooter'),
        ('a pet that bandages', lambda s: s['script'].append({'who': s['characters'][2]['name'], 'do': [['bandage', '@' + s['characters'][0]['name']]]}), 'a pet cannot'),
        ('a bandage without a pet', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': ['bandage']}), 'needs the pet'),
        ('a cone put on a person', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': [['putCone', '@' + s['characters'][1]['name']]]}), 'needs the pet'),
        ('reading a chart without a clipboard', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': [['readChart', 2]]}), 'clipboard'),
        ('an X-ray viewer that is not there', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': [['showXray', 'nope']]}), 'no set.cutouts'),
        ('an X-ray on a plant', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'name': 'pl', 'x': 0, 'z': -300}) or s['script'].append({'who': s['characters'][0]['name'], 'do': [['showXray', 'pl']]}), '"xray" viewer'),
        ('a film spot on a plant', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'x': 0, 'z': -300, 'spot': [0.5, 0.5]}), 'spot'),
        ('a film spot off the film', lambda s: s['set']['cutouts'].append({'kind': 'xray', 'x': 0, 'z': -300, 'spot': [1.5, 0.5]}), 'spot'),
        ('a drive without "from"', lambda s: s['set']['cutouts'].append({'kind': 'scooter', 'name': 'moto', 'x': 0, 'z': -300, 'drive': {'dur': 3}}), '"from"'),
        ('a pet that rides', lambda s: s['set']['cutouts'].append({'kind': 'scooter', 'name': 'moto', 'x': 0, 'z': -300}) or s['characters'][2].update({'rides': 'moto'}), 'cannot ride'),
        ('a scooter facing up', lambda s: s['set']['cutouts'].append({'kind': 'scooter', 'x': 0, 'z': -300, 'facing': 'up'}), 'facing'),
        # Đợt 35: cân, đo nhiệt độ, cho uống thuốc.
        ('weighing on a scale that is not there', lambda s: s['script'].append({'who': 'vet', 'do': [['weigh', '@cat', 'nope']]}), '"kind": "scale"'),
        ('weighing a person', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -330}) or s['script'].append({'who': 'vet', 'do': [['weigh', '@boy', 'can']]}), 'the pet'),
        ('a scale far behind the person', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -900}) or s['script'].append({'who': 'vet', 'do': [['weigh', '@cat', 'can']]}), 'same z'),
        ('a pet that weighs', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -330}) or s['script'].append({'who': 'cat', 'do': [['weigh', '@cat', 'can']]}), 'by a person'),
        ('a temperature held for a minute', lambda s: s['script'].append({'who': 'vet', 'do': [['takeTemp', '@cat', 60]]}), 'hold'),
        ('a pill with extra words', lambda s: s['script'].append({'who': 'vet', 'do': [['givePill', '@cat', 'twice']]}), 'just the pet'),
        ('a pet licking a pet', lambda s: s['script'].append({'who': 'cat', 'do': [['lick', '@cat']]}), 'licks a person'),
        ('a cat chasing its tail', lambda s: s['script'].append({'who': 'cat', 'do': [['chaseTail', 2]]}), 'is for dogs'),
        # Đợt 38 A: cắt móng, nhỏ mắt, vệ sinh tai, quét chip.
        ('nails cut on a back paw', lambda s: s['script'].append({'who': 'vet', 'do': [['clipNails', '@cat', {'paw': 'back'}]]}), '"front"'),
        ('eye drops held for a minute', lambda s: s['script'].append({'who': 'vet', 'do': [['eyeDrops', '@cat', {'hold': 60}]]}), 'hold must be'),
        ('a chip number that is not text', lambda s: s['script'].append({'who': 'vet', 'do': [['scanChip', '@cat', {'id': 900123}]]}), 'chip number'),
        ('ears cleaned on a person', lambda s: s['script'].append({'who': 'vet', 'do': [['cleanEars', '@boy']]}), 'needs the pet'),
        ('a pet that scans a chip', lambda s: s['script'].append({'who': 'cat', 'do': [['scanChip', '@cat']]}), 'done by a person'),
        ('a clipper with extra words', lambda s: s['script'].append({'who': 'vet', 'do': [['clipNails', '@cat', 'quickly']]}), '"clipNails" takes'),
    ]:
        path = os.path.join(os.path.dirname(stage), f'_check_{abs(hash(label)) % 100000}.json')
        try:
            json.dump(variant3d(change), open(path, 'w', encoding='utf-8'))
            done = build(path, os.path.join(work, 'bad3d'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif 'Traceback' in done.stderr: problems.append(f'{label}: the tool crashed instead of explaining — {done.stderr.strip().splitlines()[-1][:160]}')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')

    # Đợt 35: thú chơi đùa trong phòng khách — chó lăn ngửa, đuổi đuôi, liếm tay bé (bé tự chìa tay, quỳ xuống), mèo được bế liếm mặt bé,
    # mèo nhào, thỏ gặm cà rốt, chó chạy nấp sau bé. acting_check đo từng động tác: trong khung, chân / lưng trên sàn, chân chổng
    # trời khi lăn, mõm tới tay / mặt, đầu ló ra mà thân khuất một phần.
    pets = {'id': 'pets35', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'be', 'id': 'boy', 'x': -150, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -300, 'z': -500, 'faces': 'be'}, {'name': 'meo', 'species': 'cat', 'x': -70, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': 30, 'z': -600}], 'script': [{'who': 'cho', 'do': ['rollOver']}, {'who': 'cho', 'do': [['chaseTail', 2]]}, {'who': 'cho', 'do': [['lick', '@be', 4]]}, {'who': 'be', 'say': 'Mèo ơi lên đây.', 'do': [['carry', '@meo']], 'view': {'on': ['be', 'meo'], 'size': 'full'}}, {'who': 'meo', 'do': [['lick', '@be', 3]]}, {'who': 'tho', 'do': [['eatCarrot', 4]]}, {'who': 'tho', 'do': [['hide', '@be']], 'view': {'on': ['tho', 'be'], 'size': 'full'}}, {'who': 'be', 'say': 'Xuống chơi nhé.', 'do': ['putDown'], 'view': {'on': ['be', 'meo'], 'size': 'full'}}, {'who': 'meo', 'do': [['knead', 4]]}]}
    path = os.path.join(os.path.dirname(stage), '_check_pets35.json')
    try:
        json.dump(pets, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'pets35'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('pets35: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'pets35', 'index.html'), encoding='utf-8').read()
        if '"offerHand", set.target(be, cho, \'tongue\')' not in html: problems.append('pets35: the boy does not hold out a hand to the dog\'s tongue')
        if '{"face": true}' not in html or "['offerCheek'," not in html: problems.append('pets35: the carried cat is not told to lick the face, or the boy does not bend his cheek to it')
        if 'avoid: [], span:' not in html: problems.append('pets35: the pet actions are not given their own close-up (frameAt … avoid: [], span)')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'pets35')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('pets35: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('cho rollOver — back on the floor, paws up', 'cho chaseTail — paws on the floor', 'cho lick be — muzzle at the hand', 'meo lick be — muzzle at the face',
                           'meo knead — paws on the floor', 'tho eatCarrot — paws on the floor', 'tho hide — hides, head peeking out', 'be offerHand cho — hand reaches',
                           # đợt 35, lượt hai: vòng chạy đuổi đuôi, biên độ nhào, lưỡi chạm tay / má nhiều nhịp, người đứng chìa tay, không chạy xuyên chân
                           'cho chaseTail — runs round, turn after turn', 'meo knead — both front paws press up and down', 'cho lick be — tongue reaches the hand, lick after lick',
                           'meo lick be — tongue reaches the face, lick after lick', 'be kneels to hold out a hand — knees on the floor', 'cho lick — stands on all fours', 'be\'s hand stays off cho\'s face', 'tho hide — goes behind, not through, anyone',
                           # đợt 35, lượt ba: góc cận con vật ≥ 35 % khung, con vật trong khung suốt lúc bế / đặt xuống
                           'cho rollOver — big enough in the frame', 'cho chaseTail — big enough in the frame', 'meo knead — big enough in the frame',
                           'tho eatCarrot — big enough in the frame', 'tho eatCarrot — the carrot gets shorter bite by bite', 'be carry meo — the pet stays in the frame', 'be putDown meo — the pet stays in the frame'):
                if needle not in done.stdout: problems.append(f'pets35: acting_check did not measure {needle!r}')

    # ── XE MÁY CHẠY VÀO, NGƯỜI CẦM LÁI (examples/scene-ride): xe trượt vào và quay bánh, người lái ngồi trên yên từ khung
    # đầu, hội thoại chờ xe dừng (T0), "getOff" hạ người xuống đất đúng lúc nó chạy.
    ride = os.path.join(ROOT, 'examples', 'scene-ride', 'scene.json')
    done = build(ride, os.path.join(work, 'ride'))
    if done.returncode != 0: problems.append('the riding example does not build: ' + (done.stderr.strip() or done.stdout.strip())[:300])
    else:
        html = open(os.path.join(work, 'ride', 'index.html'), encoding='utf-8').read()
        for needle in ('createProp(cutout4, "scooter", {"facing": "right"}); const cutout4Spot = set.stand(cutout4, { x: -1500',
                       'const vetSpot = set.place(vet, { x: -1500', 'cutout4Prop.rideLift(vet)', 'vet.state.ride = 1', 'T0 = TI + 3.5',
                       'tl.fromTo(cutout4Spot, { x: -1500 }, { x: -380, duration: 3.2', 'tl.add(cutout4Prop.roll(', 'tl.fromTo(vetSpot',
                       "step.name === 'getOff'", '"getOff"'):
            if needle not in html: problems.append(f'riding example: {needle!r} not in index.html')
        if 'vet.state.facing = 0.55' in html or 'vet.state.facing = -0.55' in html: problems.append('riding example: the rider is also turned toward someone at the start (it should face the way it rides)')

    # ĐỢT 37 — COMBO (runtime/combos.js): mỗi bước của combo thành một lượt riêng; lời của lượt nói trước combo; bước có "with" chạy
    # `together` với con vật; trả thú cho chủ sau khi cân (mỗi lần bế một `omSlot` — trước đây lần bế sau ghi đè lần cân).
    combo = {'id': 'combo37', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'kind': 'scale', 'name': 'can', 'x': -120, 'z': -560, 'reading': '9.6 kg'}]},
             'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho', 'holds': 'syringe', 'holdsHidden': True},
                            {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'be', 'id': 'boy', 'x': -480, 'z': -560, 'faces': 'bac_si'}],
             'script': [{'who': 'be', 'do': ['waitingImpatient']}, {'who': 'bac_si', 'do': ['greetCustomer']},
                        {'who': 'bac_si', 'say': 'Mình tiêm phòng cho bé nhé.', 'do': [['vaccinationVisit', '@cho', 'can']]},
                        {'who': 'be', 'do': ['goodNews']}, {'who': 'bac_si', 'do': [['dischargePet', '@cho', '@be']]}, {'who': 'be', 'do': ['badNews']}]}
    path = os.path.join(os.path.dirname(stage), '_check_combo37.json')
    try:
        json.dump(combo, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'combo37'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('combo37: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'combo37', 'index.html'), encoding='utf-8').read()
        for needle in ('[be, "checkWatch"]', '[be, "lookAround"]', '[be, ["crossArms", 1.6]]', '[bac_si, "wave"]', '[bac_si, "bow"]', '[bac_si, "introduce"]',
                       "[bac_si, ['explain', \"Mình tiêm phòng cho bé nhé.\"", "['weigh', cho, set.targetPoint(bac_si, [-120", '[bac_si, ["inject", set.target(bac_si, cho, \'body\')]]',
                       '[bac_si, "hideItem"]', '[bac_si, ["giveTreat", set.target(bac_si, cho)]]', '[bac_si, "thumbsUp"]', '[be, "relief"]', '[be, "cheer"]',
                       '[bac_si, ["carry", cho]]', '{ together: [[bac_si, ["handOverPet", be]], [be, ["takePet", bac_si', '[bac_si, ["countFingers", 3]]', '[be, "worry"]'):
            if needle not in html: problems.append(f'combo37: {needle} is not in the composition')
        if 'vaccinationVisit' in html or 'dischargePet' in html: problems.append('combo37: a combo name was left in the composition instead of its steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'combo37')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('combo37: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('bac_si weighs cho — cho on the scale', 'bac_si weighs cho — cho never jumps', 'bac_si inject cho — hand reaches', 'bac_si carry cho — hand reaches'):
                if needle not in done.stdout: problems.append(f'combo37: acting_check did not measure "{needle}"')
    # Khám tổng quát: soi răng chạy `together` với con vật há miệng; bìa hồ sơ đọc cuối.
    # Lượt hai: có người thứ ba (cậu bé nghe), bác sĩ đứng nghiêng về con chó — đọc bệnh án phải cúi nhìn tấm bìa (trước: tia lệch 59 %),
    # gật rõ với người nghe thấp (trước: giữa hai lần gật vẫn cúi 12°), soi tai / răng không che đầu con chó (trước: 54–59 %) và đầu cúi về nó.
    checkup = {'id': 'checkup37', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho', 'holds': 'clipboard', 'holdsHidden': True},
               {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'be', 'id': 'boy', 'x': -260, 'z': -560, 'faces': 'bac_si'}],
               'script': [{'who': 'bac_si', 'say': 'Mình khám tổng quát cho bé nhé.', 'do': [['fullCheckup', '@cho'], 'nod'], 'exit': 'left'}]}
    path = os.path.join(os.path.dirname(stage), '_check_checkup37.json')
    try:
        json.dump(checkup, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'checkup37'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('checkup37: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'checkup37', 'index.html'), encoding='utf-8').read()
        for needle in ('[bac_si, ["listen", set.target(bac_si, cho, \'body\')]]', '[bac_si, ["examine", set.target(bac_si, cho), "ears"]]',
                       '{ together: [[bac_si, ["examine", set.target(bac_si, cho), "teeth"]], [cho, ["openMouth", 2.2]]] }', 'set.target(bac_si, cho, "rear")',
                       "[bac_si, ['readChart'", '[bac_si, "nod", [\'exit\''):
            if needle not in html: problems.append(f'checkup37: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'checkup37')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('checkup37: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('bac_si examine — head turned to cho\'s head', 'bac_si readChart — head turned to the clipboard', 'bac_si looks up from the chart, then nods twice',
                           'bac_si takeTemp cho — hand reaches', 'cho in view at'):
                if needle not in done.stdout: problems.append(f'checkup37: acting_check did not measure "{needle}"')
    # Combo sai chỗ / thiếu đích: bị từ chối với một câu nói rõ.
    for name, script, needle in [('in together', [{'together': [{'who': 'bac_si', 'do': ['greetCustomer']}, {'who': 'cho', 'do': ['wagTail']}]}], 'cannot be inside "together"'),
                                 ('no pet', [{'who': 'bac_si', 'do': ['fullCheckup']}], 'needs pet'),
                                 ('too many', [{'who': 'bac_si', 'do': [['goodNews', '@cho']]}], 'takes 0 argument')]:
        bad = dict(checkup, id='bad37', script=script)
        path = os.path.join(os.path.dirname(stage), '_check_bad37.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad37'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'combo ({name}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "khám tổng quát", "tiêm phòng" (tự có ống tiêm + cái cân), "trả thú" với hai đích, "[chào khách]".
    text = os.path.join(work, 'combo37.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · bé trai (boy) · chó (corgi, trên bàn)\n\nbác sĩ: [chào khách]\nbác sĩ → chó: tiêm phòng\n'
                                            'bé trai: [tin vui]\nbác sĩ → chó → bé trai: trả thú\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py combos: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'combo37.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        vet = next((c for c in made['characters'] if c.get('id') == 'vet'), {})
        want = ['wave', 'bow', 'introduce', ['weigh', '@cho', 'can'], ['inject', '@cho'], 'hideItem', ['giveTreat', '@cho'], 'thumbsUp', 'relief', 'thumbsUp', 'cheer',
                ['carry', '@cho'], ['handOverPet', '@be_trai'], ['countFingers', 3], 'wave']
        if steps != want: problems.append(f'script.py combos: steps {steps}, want {want}')
        if vet.get('holds') != 'syringe' or not any(c.get('kind') == 'scale' for c in made['set'].get('cutouts', [])): problems.append('script.py combos: "tiêm phòng" did not give the vet a syringe and a scale')

    # ĐỢT 38 B — PHỐI HỢP VÀ CHUẨN BỊ: bác sĩ rửa tay, đeo găng; y tá GIỮ con chó cho bác sĩ tiêm (y tá phía đuôi), rồi giữ cho bác sĩ đo
    # nhiệt độ (con chó quay đuôi về bác sĩ — y tá thành phía đầu, hai tay dưới đầu nó); bác sĩ tháo găng. acting_check: hai tay y tá
    # trên con chó suốt lúc giữ, không che tay bác sĩ, không che mặt con chó, con chó không tự dời; bọt quanh hai tay; găng hiện / mất dưới
    # bàn tay kia, đủ / hết găng sau bước.
    team = {'id': 'team38', 'camera': 'auto', 'set': {'preset': 'exam'},
            'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 40, 'z': -560, 'faces': 'cho'}, {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'},
                           {'name': 'bac_si', 'id': 'vet', 'x': 380, 'z': -560, 'faces': 'cho', 'holds': {'L': 'syringe'}, 'holdsHidden': True}],
            'script': [{'who': 'bac_si', 'say': 'Chị rửa tay rồi đeo găng nhé.', 'dur': 1.8}, {'who': 'bac_si', 'do': [['washHands', 2]]}, {'who': 'bac_si', 'do': ['putOnGloves']},
                       {'who': 'bac_si', 'say': 'Em giữ bé giúp chị.', 'dur': 1.4},
                       {'together': [{'who': 'y_ta', 'do': [['restrain', '@cho']]}, {'who': 'bac_si', 'do': [['inject', '@cho']]}]},
                       {'together': [{'who': 'y_ta', 'do': [['restrain', '@cho']]}, {'who': 'bac_si', 'do': [['takeTemp', '@cho', 1.5]]}]},
                       {'who': 'bac_si', 'do': ['takeOffGloves']}]}
    path = os.path.join(os.path.dirname(stage), '_check_team38.json')
    try:
        json.dump(team, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'team38'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('team38: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'team38', 'index.html'), encoding='utf-8').read()
        # Giữ vừa khít phần việc người kia (tiêm 2,35 s → giữ 1,35 s; đo nhiệt 4,2 s → 3,2 s); đầu con chó về phía bác sĩ / phía y tá.
        for needle in ("[y_ta, ['restrain', set.target(y_ta, cho, 'body'), 1.35, { head: set.target(y_ta, cho, 'head'), headSide: 1 }]]",
                       "[y_ta, ['restrain', set.target(y_ta, cho, 'body'), 3.2, { head: set.target(y_ta, cho, 'head'), headSide: -1 }]]",
                       '[bac_si, ["washHands", 2]]', '[bac_si, "putOnGloves"]', '[bac_si, "takeOffGloves"]'):
            if needle not in html: problems.append(f'team38: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'team38')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('team38: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('y_ta restrains cho — both hands on it throughout', "y_ta restrains cho — bac_si's hands not covered", 'y_ta restrains cho — hands off its face',
                           'y_ta restrains cho — cho never jumps', "y_ta restrain — head turned to cho's head", 'y_ta holds cho — hand on it throughout',
                           'bac_si washHands — foam round both hands', 'bac_si washHands — foam gone after shaking dry', 'bac_si washHands — head turned to the hands',
                           'bac_si putOnGloves — each glove goes on under the other hand', 'bac_si putOnGloves — both gloves on after the step',
                           'bac_si takeOffGloves — each glove comes off under the other hand', 'bac_si takeOffGloves — no gloves left after the step'):
                if needle not in done.stdout: problems.append(f'team38: acting_check did not measure "{needle}"')
    # Giữ con vật sai cách: bị từ chối với một câu nói rõ.
    for name, script, needle in [('no pet', [{'who': 'y_ta', 'do': ['restrain']}], 'needs the pet'),
                                 ('a person', [{'who': 'y_ta', 'do': [['restrain', '@bac_si']]}], 'needs a pet of the scene'),
                                 ('bad hold', [{'who': 'y_ta', 'do': [['restrain', '@cho', 'long']]}], 'hold (0.5…12 s)'),
                                 ('pet restrains', [{'who': 'cho', 'do': [['restrain', '@cho']]}], 'done by a person')]:
        bad = dict(team, id='bad38', script=script)
        path = os.path.join(os.path.dirname(stage), '_check_bad38.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad38'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'restrain ({name}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "cùng lúc: y tá → chó: giữ | bác sĩ → chó: tiêm", "[rửa tay, đeo găng]", "[tháo găng tay]".
    text = os.path.join(work, 'team38.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · y tá (nurse) · chó (corgi, trên bàn)\n\nbác sĩ: [rửa tay, đeo găng]\n'
                                            'cùng lúc: y tá → chó: giữ | bác sĩ → chó: tiêm\ny tá → chó: giữ chặt\nbác sĩ: [tháo găng tay]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py restrain / gloves: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'team38.scene.json'), encoding='utf-8'))
        flat = [step for entry in made['script'] for turn in (entry.get('together') or [entry]) for step in (turn.get('do') or [])]
        for want in ('washHands', 'putOnGloves', ['restrain', '@cho'], ['inject', '@cho'], 'takeOffGloves'):
            if want not in flat: problems.append(f'script.py restrain / gloves: {want} missing from {flat}')
        if not any('together' in entry and any(['restrain', '@cho'] in (t.get('do') or []) for t in entry['together']) for entry in made['script']):
            problems.append('script.py restrain / gloves: "cùng lúc: y tá → chó: giữ | …" did not make a together turn')

    # ĐỢT 38 C — HAI NGƯỜI VỚI NHAU. pairs38 (quầy lễ tân, cùng độ sâu): bác sĩ đưa túi thuốc cho bà (bà tự có túi đang cất), vỗ vai bà (bà
    # quay lại nhìn), đập tay bé trai (bác sĩ quỳ xuống — tay trẻ con chibi chỉ tới ngang vai), bé ôm bác sĩ, bác sĩ thì thầm với bé.
    # exam38 (phòng khám, hai độ sâu −560 / −580, một bé gái nhỏ hơn): y tá thì thầm với chủ nuôi, chủ nuôi ôm y tá, y tá đưa túi thuốc rồi
    # đi ra; chủ nuôi vỗ vai bé gái (quỳ xuống), đập tay bé, bé thì thầm với chủ nuôi (chủ nuôi hạ người xuống nghe).
    pair_scenes = {
        'pairs38': {'id': 'pairs38', 'camera': 'auto', 'set': {'preset': 'reception'}, 'characters': [
            {'name': 'vet', 'id': 'vet', 'x': -150, 'z': -380, 'holds': 'bag', 'faces': 'granny'}, {'name': 'granny', 'id': 'granny', 'x': 150, 'z': -380, 'faces': 'vet'},
            {'name': 'boy', 'id': 'boy', 'x': 640, 'z': -380, 'faces': 'vet'}],
            'script': [{'who': 'vet', 'say': 'Here is the medicine for Bella.', 'dur': 1.8}, {'who': 'vet', 'do': [['handOverBag', '@granny']]},
                       {'who': 'granny', 'say': 'Thank you, doctor.', 'dur': 1.5}, {'who': 'vet', 'do': [['patShoulder', '@granny']]},
                       {'who': 'vet', 'do': [['highFive', '@boy']]}, {'who': 'boy', 'do': [['hug', '@vet']]}, {'who': 'vet', 'do': [['whisper', '@boy']]}]},
        'exam38': {'id': 'exam38', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [
            {'name': 'nurse', 'id': 'nurse', 'x': -150, 'z': -560, 'holds': 'bag', 'faces': 'owner'}, {'name': 'owner', 'id': 'manager', 'x': 260, 'z': -580, 'faces': 'nurse'},
            {'name': 'girl', 'id': 'girl', 'x': 650, 'z': -580, 'height': 420, 'faces': 'owner'}],
            'script': [{'who': 'nurse', 'do': [['whisper', '@owner']]}, {'who': 'owner', 'say': 'Really? She is all better?', 'mood': 'surprised', 'dur': 1.8},
                       {'who': 'owner', 'do': [['hug', '@nurse']]}, {'who': 'nurse', 'do': [['handOverBag', '@owner']]},
                       {'who': 'nurse', 'say': 'Twice a day, after meals.', 'dur': 1.8, 'exit': 'left'}, {'who': 'owner', 'do': [['patShoulder', '@girl']]},
                       {'who': 'owner', 'do': [['highFive', '@girl']]}, {'who': 'girl', 'do': [['whisper', '@owner']]}]}}
    pair_needles = {'pairs38': ('{ together: [[vet, ["handOverBag", granny]], [granny, ["takeBag", vet]]] }', 'items: {"L": "bag"}, itemsHidden: true',
                                "[granny, ['lookAt', set.target(granny, vet, 'head'), { hold: 2.6, up: 1.5 }]]", '{ together: [[vet, ["highFive", boy]], [boy, ["highFive", vet]]] }',
                                '{ together: [[boy, ["hug", vet]], [vet, ["hug", boy]]] }', '{ together: [[vet, ["whisper", boy]], [boy, ["hearWhisper", vet]]] }'),
                    'exam38': ('[owner, ["hearWhisper", nurse]]', '[owner, ["takeBag", nurse]]', "[girl, ['lookAt', set.target(girl, owner, 'head'), { hold: 2.6, up: 1.5 }]]")}
    pair_measures = ('handOverBag granny — both hold the bag', 'handOverBag granny — the bag passes hand to hand', 'patShoulder granny — hand on the shoulder',
                     'granny looks back (patShoulder) — head turned', 'highFive boy — the hands meet, raised', 'boy hug vet — arms round each other',
                     'vet whisper boy — mouth at the ear', 'boy looks back (whisper)', 'vet handOverBag — head turned to granny')
    for name, scene in pair_scenes.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{name}.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in pair_needles[name]:
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        elif name == 'pairs38':
            for needle in pair_measures:
                if needle not in done.stdout: problems.append(f'pairs38: acting_check did not measure "{needle}"')
    # Hai người sai cách: bị từ chối với một câu nói rõ.
    base38 = pair_scenes['pairs38']
    for label, change, needle in [('bag without a bag', lambda sc: sc['characters'][0].pop('holds'), 'needs a medicine bag in hand'),
                                  ('high five at a pet', lambda sc: (sc['characters'].append({'name': 'cat', 'species': 'cat', 'x': 400, 'z': -380}), sc.__setitem__('script', [{'who': 'vet', 'do': [['highFive', '@cat']]}])), 'needs the other person'),
                                  ('whisper to nobody', lambda sc: sc.__setitem__('script', [{'who': 'vet', 'do': ['whisper']}]), 'needs the other person'),
                                  ('take a bag never put away', lambda sc: sc.__setitem__('script', [{'together': [{'who': 'boy', 'do': [['takeBag', '@vet']]}, {'who': 'vet', 'do': ['nod']}]}]), 'put-away medicine bag')]:
        bad = json.loads(json.dumps(base38)); bad['id'] = 'bad38'; change(bad)
        path = os.path.join(os.path.dirname(stage), '_check_bad38.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad38'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'two people ({label}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "đưa túi thuốc" (bác sĩ tự có túi), "an ủi", "đập tay", "ôm", "thì thầm".
    text = os.path.join(work, 'pairs38.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: lễ tân\nbác sĩ (vet) · bà (granny) · bé trai (boy)\n\nbác sĩ → bà: đưa túi thuốc\nbác sĩ → bà: an ủi\n'
                                            'bác sĩ → bé trai: đập tay\nbé trai → bác sĩ: ôm\nbác sĩ → bé trai: thì thầm\nbà → bác sĩ: vỗ vai\nbé trai → bà: nói nhỏ\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py two people: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'pairs38.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [['handOverBag', '@ba'], ['patShoulder', '@ba'], ['highFive', '@be_trai'], ['hug', '@bac_si'], ['whisper', '@be_trai'], ['patShoulder', '@bac_si'], ['whisper', '@ba']]
        if steps != want: problems.append(f'script.py two people: steps {steps}, want {want}')
        vet = next((c for c in made['characters'] if c.get('id') == 'vet'), {})
        if vet.get('holds') != 'bag' or vet.get('holdsHidden'): problems.append('script.py two people: "đưa túi thuốc" did not give the vet a medicine bag in hand')

for problem in problems: print(f'  ✗ scene: {problem}')
print('scene: PASS' if not problems else f'scene: FAIL ({len(problems)} problems)')
sys.exit(1 if problems else 0)
