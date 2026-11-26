"""Đợt 43 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('combo43a')
def combo43a(work, problems):
    stage = STAGE
    TAG = scratch('combo43a')
    # ĐỢT 43 A — COMBO Ở NHÀ VỚI THÚ: home43a (phòng khách): mẹ ngồi bệt ôm mèo vào lòng, bé ngủ trưa trên sofa cùng con chó; play43a: mẹ nhảy cùng
    # bé gái rồi đập tay, bé chơi ném bóng với con corgi (chó chạy nhặt bóng cùng lúc), dọn đồ chơi. Mỗi cảnh phải qua acting_check, composition không
    # còn tên combo; chữ: "tắm cho thú", "về nhà", "dọn đồ chơi"… ra đúng bước (bước "with" thành "together" của con vật / bé).
    combo43a = {
        'home43a': ([dict(name='me', id='mother', x=200, z=-560, faces='meo'), dict(name='be', id='boy', x=-520, z=-848, faces='cho'),
                     dict(name='cho', species='dog', x=-200, z=-720, faces='be'), dict(name='meo', species='cat', x=480, z=-560, faces='me')],
                    [{'who': 'me', 'say': 'Mèo ơi, lại đây với mẹ nào.', 'do': [['floorCuddle', '@meo']]}, {'who': 'be', 'say': 'Con ngủ trưa với Lu nhé.', 'do': [['napWithPet', '@cho']]}],
                    ('"sitOnFloor"', '["carry", meo', "['lieDown', 'sofa', {", '[cho, ["sleep", 3')),
        'play43a': ([dict(name='me', id='mother', x=-100, z=-560, faces='em'), dict(name='em', id='girl', x=40, z=-560, faces='me'), dict(name='cho', species='corgi', x=160, z=-560)],
                    [{'who': 'me', 'say': 'Nhảy cùng mẹ nào!', 'do': [['danceWithKid', '@em']]}, {'who': 'em', 'do': [['playFetch', '@cho']]}, {'who': 'em', 'do': ['standUp']},
                     {'who': 'em', 'do': ['tidyToys'], 'view': {'on': ['em'], 'size': 'full'}}],
                    ('[em, ["dance", "happy", 2', '["highFive", em', '[cho, ["fetch", 260', '"pickUp"', '["hideItem", "both"'))}
    for name43a, (cast43a, turns43a, needles43a) in combo43a.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name43a}.json')
        try:
            json.dump({'id': name43a, 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': cast43a, 'script': turns43a}, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name43a))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name43a}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name43a, 'index.html'), encoding='utf-8').read()
        for needle in needles43a:
            if needle not in html: problems.append(f'{name43a}: {needle} is not in the composition')
        for combo_name in ('floorCuddle', 'napWithPet', 'danceWithKid', 'playFetch', 'tidyToys'):
            if combo_name in html: problems.append(f'{name43a}: combo name {combo_name} was left in the composition instead of its steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name43a)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name43a}: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
    text = os.path.join(work, 'combo43a.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khách\nmẹ (mother) · bé (girl) · chó (corgi)\n\nmẹ → chó: tắm cho bé cưng\nmẹ → chó: về nhà\nbé → chó: chơi ném bóng\n'
                                            'mẹ → bé: quẩy cùng bé\nbé: [dọn đồ chơi]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py combos 43 A: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'combo43a.scene.json'), encoding='utf-8'))
        steps = [[(t['who'], t['do'][0]) for t in (e['together'] if 'together' in e else [e])] for e in made['script'] if isinstance(e, dict) and (e.get('do') or e.get('together'))]
        want = [[('me', ['bathPet', '@cho'])], [('me', ['towelDry', '@cho'])], [('me', 'thumbsUp')], [('me', 'wave')], [('me', 'kneel'), ('cho', ['greet', 1.4])],
                [('me', ['stroke', '@cho']), ('cho', 'wagTail')], [('be', ['throwBall', '@cho']), ('cho', ['fetch', 260])], [('be', ['stroke', '@cho'])], [('be', 'thumbsUp')],
                [('me', ['face', 'front']), ('be', ['face', 'front'])], [('me', ['dance', 'happy', 2]), ('be', ['dance', 'happy', 2])], [('me', ['idle', 0.6])], [('me', ['highFive', '@be'])],
                [('be', 'pickUp')], [('be', ['hideItem', 'both'])], [('be', 'nod')]]
        if steps != want: problems.append(f'script.py combos 43 A: steps {steps}, want {want}')
        if not any(c.get('name') == 'cho' and c.get('inTub') for c in made['characters']): problems.append('script.py combos 43 A: "tắm cho bé cưng" did not put the dog in a tub ("inTub")')


@case('combo43b')
def combo43b(work, problems):
    stage = STAGE
    TAG = scratch('combo43b')
    # ĐỢT 43 B — COMBO PHÒNG KHÁM, NHÀ THUỐC, THÚ: tiếp nhận thú mới + chăm sóc răng + tái khám sau mổ (clinic43b); an ủi chủ + chó tăng động
    # + ngáp rồi ngủ (home43b); phát thuốc (pharm43b — túi đang cầm, bìa đơn thuốc cất ở tay trái). Mỗi cảnh qua acting_check, composition
    # không còn tên combo; chữ: các từ mới ra đúng bước, túi + bìa hồ sơ và chậu tắm tự có.
    combo_43b = {
        'clinic43b': ({'preset': 'exam'}, [dict(name='bac_si', id='vet', x=40, z=-560, faces='cho', holds='clipboard', holdsHidden=True), dict(name='cho', species='dog', on='table', x=200, z=-560, faces='bac_si'),
                                           dict(name='chu', id='granny', x=-420, z=-560, faces='bac_si')],
                      [{'who': 'bac_si', 'do': [['newPatientCheckIn', '@cho', '@chu']]}, {'who': 'bac_si', 'do': [['dentalCare', '@cho']]}, {'who': 'bac_si', 'do': [['postSurgeryCheck', '@cho']]}],
                      ('[chu, "wave"]', '"scanChip"', '"brushTeeth"', '[cho, ["openMouth", 2.2]', '"unwell"', '"takeTemp"', "['readChart'")),
        'home43b': ({'preset': 'living-room'}, [dict(name='bac_si', id='vet', x=-150, z=-560, faces='me'), dict(name='me', id='granny', x=100, z=-560, faces='bac_si'),
                                                dict(name='cho', species='corgi', x=380, z=-560), dict(name='meo', species='cat', x=-480, z=-560)],
                    [{'who': 'bac_si', 'do': [['comfortOwner', '@me']]}, {'who': 'meo', 'do': ['sleepyPet']}, {'who': 'cho', 'do': ['zoomies']}],
                    ('"wipeTears"', '"patShoulder"', '"hug"', '"chaseTail"', '"pant"', '"yawn"', '"sleep"')),
        'pharm43b': ({'preset': 'pharmacy'}, [dict(name='duoc_si', id='pharmacist', x=-150, z=-380, faces='khach', holds={'R': 'bag', 'L': 'clipboard'}, holdsHidden=['L']),
                                              dict(name='khach', id='granny', x=60, z=-380, faces='duoc_si')],
                     [{'who': 'duoc_si', 'do': [['dispenseMedicine', '@khach']]}], ("['readChart'", '"countFingers"', '"handOverBag"', '"takeBag"'))}
    for name, (stage_set, cast, turns, needles) in combo_43b.items():
        scene_43b = {'id': name, 'camera': 'auto', 'set': stage_set, 'characters': cast, 'script': turns}
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name}.json')
        try:
            json.dump(scene_43b, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in needles:
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        for combo_name in ('dispenseMedicine', 'newPatientCheckIn', 'dentalCare', 'comfortOwner', 'fullSpa', 'postSurgeryCheck', 'zoomies', 'sleepyPet'):
            if combo_name in html: problems.append(f'{name}: combo name {combo_name} was left in the composition instead of its steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
    text = os.path.join(work, 'combo43b.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · chó (corgi, trên bàn) · bà (granny)\n\nbác sĩ → chó: spa trọn gói\nbác sĩ → chó → bà: tiếp nhận thú mới\n'
                                            'bác sĩ → bà: phát thuốc\nbác sĩ → bà: an ủi chủ\nbác sĩ → chó: chăm sóc răng\nbác sĩ → chó: tái khám sau mổ\nchó: [chó tăng động]\nchó: [ngáp rồi ngủ]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py combos 43b: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'combo43b.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [['bathPet', '@cho'], ['towelDry', '@cho'], ['brushTeeth', '@cho'], ['cleanEars', '@cho'], 'thumbsUp', 'bow', ['scanChip', '@cho'], 'readChart', 'readChart', ['countFingers', 3],
                ['handOverBag', '@ba'], 'wave', ['patShoulder', '@ba'], ['hug', '@ba'], ['brushTeeth', '@cho'], 'thumbsUp', ['takeTemp', '@cho'], 'readChart', ['chaseTail', 3], ['jump', 2], ['pant', 1.4],
                'yawn', 'stretch', ['sleep', 3]]
        if steps != want: problems.append(f'script.py combos 43b: steps {steps}, want {want}')
        cast = {c['name']: c for c in made['characters']}
        if cast.get('bac_si', {}).get('holds') != {'R': 'bag', 'L': 'clipboard'} or cast['bac_si'].get('holdsHidden') != ['L']: problems.append(f'script.py combos 43b: the vet should hold a shown bag and a put-away clipboard, got {cast.get("bac_si")}')
        if not cast.get('cho', {}).get('inTub'): problems.append('script.py combos 43b: the dog of "spa trọn gói" does not stand in a tub')
