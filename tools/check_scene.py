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
            if not re.search(r"together: \[\[vet, \['enter', \"left\"\][^\n]*\[boy, \['enter', \"right\"\]", page): problems.append('two entering characters do not enter together')
            if page.index('id="prop-1-counter"') < page.index('id="vet" class="clip"'): problems.append('a "front" prop is not placed after the characters')
            if 'shot: [vet, boy, bella]' not in page: problems.append('a shot on a turn inside together is not written')
            if 'late.state.opacity = 0' not in page: problems.append('a character that enters mid-scene is not hidden at the start')
            if not re.search(r"\[late, \['enter', \"right\"\], \['walk', 4, -?\d+\], \['face', vet\], \['explain'[^\n]*\['exit', \"right\"\]\]", page): problems.append('a turn with enter / say / exit is not written in that order')
            if 'bella.state.facing = -1' not in page or "[bella, ['face'" in page: problems.append('a character present from the start is not turned toward its target up front')
            if 'data-role="music"' not in page or 'data-volume="0.15"' not in page: problems.append('"music" does not add a quiet music clip')
            if not re.search(r'\{ turn: \[vet, \[.speakCues.[^\n]*shot: \[vet, bella\] \}', page): problems.append('a line that names a pet does not frame the pet with the speaker')
            if '{ mood: "surprised" }]' not in page or "['express', \"surprised\"" in page: problems.append('"mood" on a spoken turn is not passed to the line itself')
            if 'url("_check_room.png")' not in page or not os.path.isfile(os.path.join(work, 'staged', '_check_room.png')): problems.append('background.image is not used or not copied')
            if 'id="floor"' in page: problems.append('the floor strip is drawn over a background image although no floor colour was given')
            if '"clerk" sits behind the counter' not in built.stdout or '"tabletop"' not in built.stdout: problems.append('no note about a seated character hidden behind a tall front counter')
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
    # Cảnh dọc: mèo đứng nửa phải, "enter": true → vào từ mép PHẢI (mép gần), không băng ngang qua cô bé.
    vertical = build(os.path.join(ROOT, 'examples', 'scene-vertical', 'scene.json'), os.path.join(work, 'vertical-near'))
    if vertical.returncode != 0:
        problems.append('the vertical example does not build: ' + (vertical.stderr.strip() or vertical.stdout.strip())[:200])
    else:
        page = open(os.path.join(work, 'vertical-near', 'index.html'), encoding='utf-8').read()
        if "[miu, ['enter', \"right\"]" not in page: problems.append('"enter": true on a character standing on the right does not enter from the right')
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
        ('a mood on a pet', lambda s: s['script'][0].update({'mood': 'happy'}), 'pet'),
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

for problem in problems: print(f'  ✗ scene: {problem}')
print('scene: PASS' if not problems else f'scene: FAIL ({len(problems)} problems)')
sys.exit(1 if problems else 0)
