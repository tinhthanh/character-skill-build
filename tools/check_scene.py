#!/usr/bin/env python3
"""Self-test for tools/scene.py (run by tools/check.sh): build the example scene, then make sure
bad scene files are rejected with a message that names the problem."""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
problems = []


def build(scene_path, out):
    return subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), scene_path, '-o', out], capture_output=True, text=True)


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
        if '// counter' not in html or '// extra' not in html or html.index('// counter') > html.index('// extra'): problems.append('set.preset: the preset counter is missing, or the extra box does not come after it')
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

for problem in problems: print(f'  ✗ scene: {problem}')
print('scene: PASS' if not problems else f'scene: FAIL ({len(problems)} problems)')
sys.exit(1 if problems else 0)
