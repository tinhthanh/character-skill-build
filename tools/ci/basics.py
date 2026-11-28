"""Các trường hợp mở đầu: cảnh mẫu, bố cục, kịch bản sai bị từ chối, bối cảnh 3D (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('example_scene', parts=('main', 'peek'), tags=('smoke',))
def example_scene(work, problems, part):
    TAG = scratch('example_scene')
    example = os.path.join(ROOT, 'examples', 'scene', 'scene.json')
    out = os.path.join(work, 'built')
    done = build(example, out)
    if done.returncode != 0:
        problems.append('the example scene does not build: ' + (done.stderr.strip() or done.stdout.strip()))
    else:
        if part == 'main':                                 # dải cận miệng (peek.sh, Chrome) là một trường hợp riêng (đợt 47)
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
            staged_path = os.path.join(os.path.dirname(example), f'_check_{TAG}_staged.json')
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
        if part == 'peek':
            # Dải cận miệng của câu có tiếng: peek.sh --mouth in dòng khẩu hình và ghi ảnh.
            # PEEK_TIMEOUT 240 (× 3 khi chạy song song): trên runner CI 2 nhân, trang peek chạy cạnh reel48 (mỗi đợt thêm hàng catalog) — 350–390 s, sát / quá 360 s.
            peek = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(out, 'index.html'), '--mouth=1'], capture_output=True, text=True, env=dict(os.environ, PEEK_TIMEOUT='240'))
            strip = os.path.join(out, 'peek-mouth1.png')        # không chỉ định tên: ảnh nằm cạnh composition, tên riêng cho dải cận miệng
            if peek.returncode != 0 or 'mouth strip: line 1' not in peek.stdout or 'cue shapes per frame' not in peek.stdout or not os.path.isfile(strip):
                problems.append('peek.sh --mouth does not produce a mouth strip: ' + (peek.stderr.strip() or peek.stdout.strip())[-200:])
            beyond = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(out, 'index.html'), '--mouth=9'], capture_output=True, text=True)
            if beyond.returncode == 0 or 'spoken line' not in beyond.stderr: problems.append('peek.sh --mouth=9 on a scene with fewer lines does not explain itself')
        if part == 'main':
            cues = open(os.path.join(out, 'voice.cues.js'), encoding='utf-8').read()
            if 'khám định kỳ cho bé Bella' not in cues: problems.append('the spoken words were not stored in the cues (captions would be empty)')
    # Chạy lại lên bản CHƯA sửa thì ghi đè bình thường; lên bản ĐÃ sửa tay thì dừng, trừ khi --force.
    if part == 'main' and not problems:
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


@case('presenter')
def presenter(work, problems):
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


@case('interact')
def interact(work, problems):
    # Cảnh tương tác: vuốt ve một con vật trong lượt không lời → con vật đáp lại cùng lúc; `holds` tới createCharacter.
    interact = build(os.path.join(ROOT, 'examples', 'scene-interact', 'scene.json'), os.path.join(work, 'interact'))
    if interact.returncode != 0:
        problems.append('the interaction example does not build: ' + (interact.stderr.strip() or interact.stdout.strip())[:200])
    else:
        page = open(os.path.join(work, 'interact', 'index.html'), encoding='utf-8').read()
        if not re.search(r'together: \[\[vet, [^\n]*\["stroke", miu\]\], \[miu, "purr"\]\]', page): problems.append('stroking a pet in a wordless turn does not add the pet\'s reaction')
        if not re.search(r"\[vet, \['walk', 4, \d+\]\],?\s*\n\s*\{ together: \[\[vet, \[\"handOver\", ba\]\]", page): problems.append('a giver standing out of reach does not walk up to the receiver before handing over')
        if 'items: "clipboard"' not in page and 'items: {"R": "clipboard"}' not in page: problems.append('"holds": "clipboard" is not passed to createCharacter')


@case('vertical_enter')
def vertical_enter(work, problems):
    # Cảnh dọc: mèo đứng nửa phải, "enter": true → vào từ mép PHẢI (mép gần), không băng ngang qua cô bé.
    vertical = build(os.path.join(ROOT, 'examples', 'scene-vertical', 'scene.json'), os.path.join(work, 'vertical-near'))
    if vertical.returncode != 0:
        problems.append('the vertical example does not build: ' + (vertical.stderr.strip() or vertical.stdout.strip())[:200])
    else:
        page = open(os.path.join(work, 'vertical-near', 'index.html'), encoding='utf-8').read()
        if "[miu, ['enter', \"right\", " not in page: problems.append('"enter": true on a character standing on the right does not enter from the right')
        if 'maxChars' not in page: problems.append('captions are not chunked')
        if '<h2' in page or '<ul' in page: problems.append('content must be flat clips, not nested elements')


@case('bad_scenes')
def bad_scenes(work, problems):
    example = EXAMPLE
    TAG = scratch('bad_scenes')
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
        path = os.path.join(os.path.dirname(example), f'_check_{TAG}_{len(problems)}_{cases.index((label, change, needle))}.json')
        try:
            json.dump(variant(change), open(path, 'w', encoding='utf-8'))
            done = build(path, os.path.join(work, 'bad'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif 'Traceback' in done.stderr: problems.append(f'{label}: the tool crashed instead of explaining — {done.stderr.strip().splitlines()[-1][:160]}')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')


@case('set3d_example', tags=('smoke',))
def set3d_example(work, problems):
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


@case('set3d_enter_exit')
def set3d_enter_exit(work, problems):
    stage = STAGE
    TAG = scratch('set3d_enter_exit')
    # Bước vào / bước ra qua tường bên, người ngồi ghế: dựng được, và quãng đi đủ ra ngoài phòng.
    moving = json.load(open(stage, encoding='utf-8'))
    moving['characters'][0]['enter'] = 'left'; moving['characters'][1]['seated'] = 'chair'
    moving['script'].append({'who': 'vet', 'exit': 'right'})
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_moving.json')
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


@case('set3d_approach')
def set3d_approach(work, problems):
    stage = STAGE
    TAG = scratch('set3d_approach')
    # Lượt "bước lại gần" (đưa đồ) không được dời chỗ đặt ban đầu của nhân vật.
    closer = json.load(open(stage, encoding='utf-8'))
    closer['characters'][0]['holds'] = 'cup'; closer['characters'][1]['holds'] = 'cup'; closer['characters'][1]['holdsHidden'] = True
    closer['script'].insert(0, {'who': 'vet', 'do': [['handOver', '@boy']]})
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_closer.json')
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


@case('set3d_aiming')
def set3d_aiming(work, problems):
    stage = STAGE
    TAG = scratch('set3d_aiming')
    # Chỉ tay / vuốt ve trong bối cảnh 3D nhắm bằng set.target; con vật lệch độ sâu thì có lời nhắc.
    aiming = json.load(open(stage, encoding='utf-8'))
    aiming['characters'][2] = {'name': 'cat', 'species': 'cat', 'x': 20, 'z': -200, 'height': 200}
    aiming['script'].append({'who': 'vet', 'do': [['point', '@cat']]}); aiming['script'].append({'who': 'vet', 'do': [['stroke', '@cat']]})
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_aiming.json')
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


@case('set3d_devices')
def set3d_devices(work, problems):
    stage = STAGE
    TAG = scratch('set3d_devices')
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
    path = os.path.join(folder3d, f'_check_{TAG}_devices.json')
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


@case('set3d_exam')
def set3d_exam(work, problems):
    stage = STAGE
    TAG = scratch('set3d_exam')
    # Khám bệnh và bế thú: nghe / tiêm nhắm vào THÂN con vật (set.target …, 'body'), bế / đặt xuống, thú nằm / ngủ / mệt.
    exam = json.load(open(stage, encoding='utf-8'))
    exam['characters'][0]['holds'] = 'syringe'
    exam['characters'][2] = {'name': 'cat', 'species': 'cat', 'x': 40, 'z': -300, 'height': 200}
    exam['script'].append({'who': 'vet', 'do': [['listen', '@cat', 1.5], ['inject', '@cat']]})
    exam['script'].append({'who': 'cat', 'do': ['lieDown', ['sleep', 2], 'unwell', 'standUp']})
    exam['script'].append({'who': 'boy', 'do': [['carry', '@cat'], 'nod', 'putDown']})
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_exam.json')
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


@case('set3d_preset')
def set3d_preset(work, problems):
    stage = STAGE
    TAG = scratch('set3d_preset')
    # Bối cảnh dựng sẵn: đồ của preset đi trước, đồ khai thêm cộng vào sau; có gợi ý chỗ đứng; biểu cảm và cử chỉ mới.
    preset = json.load(open(stage, encoding='utf-8'))
    preset['set'] = {'preset': 'reception', 'boxes': [{'name': 'extra', 'x': 600, 'z': -300, 'width': 100, 'depth': 100, 'height': 80}]}
    for who in preset['characters']: who.pop('on', None)
    preset['script'].append({'who': 'vet', 'do': ['clap', ['countFingers', 3], 'checkWatch', 'wai', 'bow', ['handshake', '@boy']], 'mood': 'embarrassed'})
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_preset.json')
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
