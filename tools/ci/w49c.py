"""Đợt 49 C — dắt chó đi dạo: `["walkOnLeash", "@cho", 4, 300]` (người) — con vật bước cùng lúc, quai dây tự giao, chỗ đứng mới ghi lại,
nhịp máy quay là góc toàn có cả hai; từ tiếng Việt "dắt đi dạo"; thỏ / đặt sai bị từ chối rõ."""
from .common import *  # noqa: F401,F403


def _build(work, TAG, key, scene):
    path = os.path.join(os.path.dirname(STAGE), f'_check_{TAG}_{key}.json')
    try:
        json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        return build(path, os.path.join(work, key))
    finally:
        if os.path.exists(path): os.remove(path)


@case('leash49c', parts=('park', 'street', 'refuse'), uses=('walkOnLeash', 'unleash', 'acting_check', 'script'))
def leash49c(work, problems, part):
    TAG = scratch('leash49c')
    if part == 'park':
        # Công viên: con chó đứng cạnh bác sĩ (không cầm gì) — dắt đi 300 sang phải, con chó vẫy đuôi, rồi dắt quay lại 200 (con chó theo sau, không băng
        # qua chân người), rồi tháo dây. acting_check đo dây nối tay với vòng cổ, con vật trong tầm dây, cả hai đi, cả hai trong khung.
        scene = {'id': 'leash49c', 'camera': 'auto', 'set': {'preset': 'park'},
                 'characters': [{'name': 'vet', 'id': 'vet', 'x': -300, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -150, 'z': -500}],
                 'script': [{'who': 'vet', 'say': 'Đi dạo nào!', 'dur': 1.4}, {'who': 'vet', 'do': [['walkOnLeash', '@cho', 4, 300]]}, {'who': 'cho', 'do': ['wagTail']},
                            {'who': 'vet', 'do': [['walkOnLeash', '@cho', 4, -200]]}, {'who': 'vet', 'do': ['unleash']}]}
        done = _build(work, TAG, 'park', scene)
        if done.returncode != 0: problems.append('leash49c:park: the scene does not build: ' + done.stderr.strip()[:300]); return
        html = open(os.path.join(work, 'park', 'index.html'), encoding='utf-8').read()
        if '"L": "leash"' not in html or 'itemsHidden: true' not in html: problems.append('leash49c:park: the walker was not given a (hidden) leash handle in the near hand')
        if len(re.findall(r"\[cho, \['walkOnLeash', vet, 4, -?\d+, \{ distance: -?[\d.]+ \}\]\]", html)) != 2: problems.append('leash49c:park: the dog does not walk with the person (its walkOnLeash part is missing)')
        if 'comes up beside' in html: problems.append('leash49c:park: the dog beside the person was walked up first (it is within reach)')
        own = [float(v) for v in re.findall(r"\[cho, \['walkOnLeash', vet, 4, -?\d+, \{ distance: (-?[\d.]+) \}\]\]", html)]
        if len(own) == 2 and not (own[0] > 0 and -own[0] < own[1] < 0): problems.append(f'leash49c:park: the dog\'s distances {own} — expected ahead on the way out, then a shorter way back (it follows behind)')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'park')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('leash49c:park: ' + (done.stdout.strip() or done.stderr.strip())[-700:])
        for needle in ('vet walks cho on a leash — leash drawn every frame', 'vet walks cho on a leash — the leash ends at the collar', 'vet walks cho on a leash — the leash starts in the hand',
                       'vet walks cho on a leash — the pet stays within the leash', 'vet walks cho on a leash — both walk', 'vet walks cho on a leash — both in the frame'):
            if done.stdout.count(needle) != 2: problems.append(f'leash49c:park: acting_check did not measure {needle!r} for both walks')
    elif part == 'street':
        # Kịch bản tiếng Việt: "dắt đi dạo", "dắt chó đi dạo sang trái 150", "[tháo dây]"; con mèo đi dây yếm (được); con chó xa người đi tới cạnh người trước.
        text = os.path.join(work, 'leash49c.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: đường phố\nbé trai (boy) · chó (corgi) · mèo (cat)\n'
                                                'bé trai: Đi dạo thôi!\nbé trai → chó: dắt đi dạo\nbé trai → chó: dắt chó đi dạo sang trái 150\nbé trai: [tháo dây]\nbé trai → mèo: dắt đi\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append('leash49c:street: script.py: ' + (done.stderr or done.stdout).strip()[-300:]); return
        made = json.load(open(os.path.join(work, 'leash49c.scene.json'), encoding='utf-8'))
        steps = [step for entry in made['script'] for turn in (entry.get('together') or [entry]) for step in turn.get('do', [])]
        if steps != [['walkOnLeash', '@cho', 4, 300], ['walkOnLeash', '@cho', 4, -150], 'unleash', ['walkOnLeash', '@meo', 4, 300]]:
            problems.append(f'leash49c:street: script.py gave {steps}')
        for who in made['characters']:
            if who['name'] == 'cho': who['x'] = float(who.get('x', 0)) + 400          # xa người: con chó tự đi tới cạnh người trước khi móc dây
        json.dump(made, open(os.path.join(work, 'leash49c.scene.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(os.path.join(work, 'leash49c.scene.json'), os.path.join(work, 'street'))
        if done.returncode != 0: problems.append('leash49c:street: the scene does not build: ' + done.stderr.strip()[:300]); return
        html = open(os.path.join(work, 'street', 'index.html'), encoding='utf-8').read()
        if 'cho comes up beside be_trai' not in html: problems.append('leash49c:street: the dog far from the person was not walked up beside them first')
        if "[meo, ['walkOnLeash', be_trai" not in html: problems.append('leash49c:street: the cat does not walk with the person')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'street')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('leash49c:street: ' + (done.stdout.strip() or done.stderr.strip())[-700:])
        elif done.stdout.count('walks cho on a leash — the leash ends at the collar') != 2 or 'walks meo on a leash — both walk' not in done.stdout:
            problems.append('leash49c:street: acting_check did not measure the walks:\n' + done.stdout[-400:])
    else:
        # Bị từ chối, lỗi rõ ràng.
        base = {'id': 'bad49c', 'characters': [{'name': 'be', 'id': 'boy', 'x': 0}, {'name': 'tho', 'species': 'rabbit', 'x': 150}, {'name': 'cho', 'species': 'dog', 'x': -150}, {'name': 'me', 'id': 'granny', 'x': 300}]}
        for label, script, word in (('rabbit', [{'who': 'be', 'do': [['walkOnLeash', '@tho', 4, 200]]}], 'rabbit'),
                                    ('not first', [{'who': 'be', 'do': ['nod', ['walkOnLeash', '@cho', 4, 200]]}], 'starts a turn of its own'),
                                    ('on the pet', [{'who': 'cho', 'do': [['walkOnLeash', '@be', 4, 200]]}], 'written on the person'),
                                    ('a person', [{'who': 'be', 'do': [['walkOnLeash', '@me', 4, 200]]}], 'is a person'),
                                    ('bad distance', [{'who': 'be', 'do': [['walkOnLeash', '@cho', 4, 'far']]}], 'distance is a number')):
            done = _build(work, TAG, 'bad', dict(base, script=script))
            if done.returncode == 0 or word not in done.stderr: problems.append(f'leash49c:refuse: {label} is not refused clearly — {done.stderr.strip()[:200]}')
        text = os.path.join(work, 'bad49c.txt')
        open(text, 'w', encoding='utf-8').write('chó (dog) · bé (boy)\n\nchó → bé: dắt đi dạo\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode == 0 or 'người cầm dây' not in (done.stderr + done.stdout): problems.append('leash49c:refuse: script.py "chó → bé: dắt đi dạo" is not refused clearly')
