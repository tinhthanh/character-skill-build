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
        if len(audio) != 1 or float(audio[0][0]) < 2 or abs(float(audio[0][1]) - 6.0) > 0.05: problems.append(f'the audio clip is not timed (found {audio})')
        total = re.search(r'data-composition-id="clinic-visit" data-start="0" data-duration="([\d.]+)"', html)
        if not total or float(total.group(1)) < 12: problems.append('the composition duration was not filled in')
        if 'VGCharacter.conversation(' not in html or 'VGCharacter.captions(' not in html or 'camera:' not in html: problems.append('the composition lacks the conversation, captions or camera')
        # Hai người cùng `enter` thì vào CÙNG LÚC; đạo cụ "front" nằm sau nhân vật trong HTML (tức vẽ đè lên họ).
        staged = json.load(open(example, encoding='utf-8'))
        staged['id'] = 'staged'
        staged['characters'][1].update({'enter': 'right', 'seated': False})
        staged['props'][0]['front'] = True
        staged['script'][-1]['together'][0]['shot'] = ['vet', 'boy', 'bella']
        staged_path = os.path.join(os.path.dirname(example), '_check_staged.json')
        try:
            json.dump(staged, open(staged_path, 'w', encoding='utf-8'))
            built = build(staged_path, os.path.join(work, 'staged'))
        finally:
            os.remove(staged_path)
        if built.returncode != 0:
            problems.append('a scene with two entrances, a front prop and a shot inside together does not build: ' + built.stderr.strip()[:200])
        else:
            page = open(os.path.join(work, 'staged', 'index.html'), encoding='utf-8').read()
            if not re.search(r"together: \[\[vet, \['enter', \"left\"\][^\n]*\[boy, \['enter', \"right\"\]", page): problems.append('two entering characters do not enter together')
            if page.index('id="prop-1-counter"') < page.index('id="vet" class="clip"'): problems.append('a "front" prop is not placed after the characters')
            if 'shot: [vet, boy, bella]' not in page: problems.append('a shot on a turn inside together is not written')
            # Sửa tay làm lệch giờ → --retime đưa <audio> và tổng thời lượng về đúng.
            index = os.path.join(work, 'staged', 'index.html')
            before = re.search(r'src="voice.wav" data-start="([\d.]+)"', page).group(1)
            open(index, 'w', encoding='utf-8').write(page.replace('[bella, "wagTail"]', '[bella, "wagTail", "wagTail"]'))
            fixed = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), '--retime', index], capture_output=True, text=True)
            after = re.search(r'src="voice.wav" data-start="([\d.]+)"', open(index, encoding='utf-8').read()).group(1)
            if fixed.returncode != 0 or float(after) < float(before) + 1: problems.append(f'--retime did not move the audio clip after a hand edit ({before} → {after}): {fixed.stderr.strip()[:160]}')
        # Dải cận miệng của câu có tiếng: peek.sh --mouth in dòng khẩu hình và ghi ảnh.
        strip = os.path.join(work, 'mouth.png')
        peek = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(out, 'index.html'), '', strip, '--mouth=1'], capture_output=True, text=True)
        if peek.returncode != 0 or 'mouth strip: line 1' not in peek.stdout or 'cue shapes per frame' not in peek.stdout or not os.path.isfile(strip):
            problems.append('peek.sh --mouth does not produce a mouth strip: ' + (peek.stderr.strip() or peek.stdout.strip())[-200:])
        beyond = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(out, 'index.html'), '', strip, '--mouth=9'], capture_output=True, text=True)
        if beyond.returncode == 0 or 'spoken line' not in beyond.stderr: problems.append('peek.sh --mouth=9 on a scene with fewer lines does not explain itself')
        cues = open(os.path.join(out, 'voice.cues.js'), encoding='utf-8').read()
        if 'Bella is due for her check-up' not in cues: problems.append('the spoken words were not stored in the cues (captions would be empty)')
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
    # Kịch bản sai phải bị từ chối, và thông báo phải gọi đúng tên chỗ sai.
    base = json.load(open(example, encoding='utf-8'))
    def variant(change):
        scene = json.loads(json.dumps(base)); change(scene); return scene
    cases = [
        ('an unknown speaker', lambda s: s['script'].append({'who': 'nobody', 'do': ['wave']}), 'nobody'),
        ('a pet that speaks', lambda s: s['script'].append({'who': 'bella', 'say': 'woof'}), 'pet'),
        ('a missing audio file', lambda s: s['script'].append({'who': 'vet', 'say': 'hi', 'audio': 'nope.wav'}), 'nope.wav'),
        ('an @reference to nobody', lambda s: s['script'].append({'who': 'vet', 'do': [['face', '@ghost']]}), '@ghost'),
        ('two characters with one name', lambda s: s['characters'].append({'name': 'vet', 'id': 'nurse', 'x': 100}), 'vet'),
        ('a character without a position', lambda s: s['characters'].append({'name': 'extra', 'id': 'nurse'}), '"x"'),
        ('a misspelt character key', lambda s: s['characters'][1].update({'seat': 'chair'}), 'seated'),
        ('a misspelt turn key', lambda s: s['script'][1].update({'duration': 3}), 'dur'),
        ('a misspelt top-level key', lambda s: s.update({'captons': False}), 'captions'),
        ('an unknown prop key', lambda s: s['props'][0].update({'colour': '#fff'}), 'color'),
        ('an unknown background key', lambda s: s['background'].update({'sky': '#fff'}), 'sky'),
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
