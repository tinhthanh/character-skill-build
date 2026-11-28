"""Wave 49 A: script steps that name a 3D-set prop ("@<cutout name>") — the boarding cage: putInCage / takeOutOfCage.

A "cage" cutout is two hosts (inside behind the pet, front frame with the barred door in front of it). The person walks up beside the
cage on its latch side, opens the door (one arm still holding the pet), lowers it inside, closes the door — or takes it out and keeps
holding it. acting_check measures the hand on the door, the pet inside the opening and drawn behind the front, the door closed after,
and the pet in the arms after taking it out."""
from .common import *


def _build49a(spec, work):
    path = os.path.join(os.path.dirname(STAGE), f'_check_{scratch("cage49a")}_{spec["id"]}.json')
    try:
        json.dump(spec, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        return build(path, os.path.join(work, spec['id']))
    finally:
        if os.path.exists(path): os.remove(path)


KENNEL49A = {'kind': 'cage', 'name': 'chuong', 'x': -280, 'z': -600}


@case('cage49a', parts=('in49a', 'out49a', 'rabbit49a', 'bad49a'))
def cage49a(work, problems, part):
    # Gửi mèo: y tá bước tới bế con mèo dưới sàn, sang cạnh chuồng, mở cửa, đặt vào, đóng cửa; rồi bế ra, đặt xuống.
    in49a = {'id': 'in49a', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [dict(KENNEL49A)]},
             'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 120, 'z': -570}, {'name': 'meo', 'species': 'cat', 'x': 230, 'z': -570}],
             'script': [{'who': 'y_ta', 'do': [['putInCage', '@meo', '@chuong']]}, {'who': 'y_ta', 'say': 'Bé ngủ ngon nhé, mai mẹ tới đón.', 'dur': 2.4},
                        {'who': 'y_ta', 'do': [['takeOutOfCage', '@meo', '@chuong']]}, {'who': 'y_ta', 'do': ['putDown']}]}
    # Trả chó lưu trú: con chó ở trong chuồng từ đầu ("inCage"), bác sĩ bế ra rồi trao cho chủ.
    out49a = {'id': 'out49a', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [dict(KENNEL49A, x=-300)]},
              'characters': [{'name': 'bac_si', 'id': 'vet', 'x': -60, 'z': -570}, {'name': 'chu', 'id': 'granny', 'x': 300, 'z': -570, 'faces': 'bac_si'},
                             {'name': 'cho', 'species': 'dog', 'inCage': 'chuong'}],
              'script': [{'who': 'bac_si', 'do': [['takeOutOfCage', '@cho', '@chuong']]}, {'who': 'bac_si', 'do': [['handOverPet', '@chu']]},
                         {'who': 'chu', 'say': 'Cảm ơn bác sĩ nhiều!', 'dur': 2}]}
    # Thỏ, chuồng bản lề bên phải (người đứng bên trái).
    rabbit49a = {'id': 'rabbit49a', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [dict(KENNEL49A, x=280, door='right')]},
                 'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': -40, 'z': -570}, {'name': 'tho', 'species': 'rabbit', 'x': -150, 'z': -570}],
                 'script': [{'who': 'y_ta', 'do': [['putInCage', '@tho', '@chuong', {'hold': 0.8}]]}]}
    needles = {'in49a': ('putInCage meo — a hand opens the cage door', 'putInCage meo — it is inside the cage, behind the bars', 'putInCage meo — the door is closed again',
                         'takeOutOfCage meo — a hand reaches it in the cage', 'takeOutOfCage meo — it is in the arms'),
               'out49a': ('takeOutOfCage cho — it is inside the cage, behind the bars', 'takeOutOfCage cho — it is in the arms'),
               'rabbit49a': ('putInCage tho — it is inside the cage, behind the bars', 'putInCage tho — a hand opens the cage door')}
    for spec in (in49a, out49a, rabbit49a):
        if spec['id'] != part: continue
        done = _build49a(spec, work)
        if done.returncode != 0: problems.append(f'{part}: the scene does not build: ' + done.stderr.strip()[-400:]); return
        html = open(os.path.join(work, part, 'index.html'), encoding='utf-8').read()
        for needle in ("'cageFront'", 'Front }', 'set.depth('):
            if needle not in html: problems.append(f'{part}: {needle} is not in the composition')
        if 'steps up beside chuong' not in html and part != 'out49a': problems.append(f'{part}: the person does not walk up beside the cage')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, part)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{part}: ' + (done.stdout.strip() or done.stderr.strip())[-800:])
        for needle in needles[part]:
            if needle not in done.stdout: problems.append(f'{part}: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    if part == 'bad49a':
        base = json.loads(json.dumps(in49a))
        for label, change, needle in (
                ('unknown prop', lambda s: s['script'][0]['do'][0].__setitem__(2, '@kho'), 'no set.cutouts item has "name": "kho"'),
                ('a character as the prop', lambda s: s['script'][0]['do'][0].__setitem__(2, '@meo'), '"@meo" is a character'),
                ('a prop of the wrong kind', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 300, 'z': -570}) or s['script'][0]['do'][0].__setitem__(2, '@can'), 'is a "scale" cutout'),
                ('no prop at all', lambda s: s['script'][0]['do'][0].pop(2), 'takes ["putInCage", "@pet", "@<cage>"'),
                ('standing behind the cage', lambda s: [c.__setitem__('z', -700) for c in s['characters']], 'must stand just in front of the cage'),
                ('taken out of the wrong cage', lambda s: s['script'].__setitem__(0, {'who': 'y_ta', 'do': [['takeOutOfCage', '@meo', '@chuong']]}), 'is not in the cage "chuong"'),
                ('a person in a cage', lambda s: s['characters'][0].__setitem__('inCage', 'chuong'), '"inCage" is for a pet'),
                ('too small a cage', lambda s: s['set']['cutouts'][0].__setitem__('size', [90, 80]), 'is too big for the cage'),
                ('a cage in the air', lambda s: s['set']['cutouts'][0].__setitem__('y', 80), 'stands on the floor')):
            spec = json.loads(json.dumps(base)); spec['id'] = 'bad49a'
            change(spec)
            done = _build49a(spec, work)
            if done.returncode == 0 or needle not in done.stderr: problems.append(f'bad49a ({label}): should be refused with "{needle}" — got: ' + (done.stderr.strip()[-240:] or 'no error'))
