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
        cues = open(os.path.join(out, 'voice.cues.js'), encoding='utf-8').read()
        if 'Bella is due for her check-up' not in cues: problems.append('the spoken words were not stored in the cues (captions would be empty)')
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
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')

for problem in problems: print(f'  ✗ scene: {problem}')
print('scene: PASS' if not problems else f'scene: FAIL ({len(problems)} problems)')
sys.exit(1 if problems else 0)
