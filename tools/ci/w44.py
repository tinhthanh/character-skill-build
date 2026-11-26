"""Đợt 44 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('framing44b')
def framing44b(work, problems):
    stage = STAGE
    TAG = scratch('framing44b')
    # ĐỢT 44 B (khung hình): (1) góc CHỈ CÓ CON VẬT của đạo diễn tự động (nhóm toàn thú, không "view") — con vật ≥ 35 % khung (trước: 15–24 %);
    # (2) view con vật 42 C có người đứng sát — không còn cái THÂN KHÔNG ĐẦU (`--torso44b`); (3) người SAU QUẦY thấy mặt / ngực (đo bằng pixel — nhà
    # thuốc: màn hình che 33 % đầu dược sĩ); (4) `pickUp` tự động: người và món đồ dưới sàn trong khung lúc nhặt; (5) đồ đạc không lẹm mép — góc vẫy tay
    # của `welcomeHome` (TV lẹm 38 % giữa lúc lia), góc mở đầu khi lượt đầu là chó đuổi đuôi (sofa 31 %, TV 67 %), góc cận con vật ở nhà thuốc (quầy lẹm);
    # (6) phòng khám bốn người — góc cận đo nhiệt mặt bác sĩ ≥ 36 % khung (trước: 33 %, thành góc trung ba người).
    shots44b = (
        ({'id': 'auto44b', 'camera': 'auto', 'set': {'preset': 'living-room'},
          'characters': [{'name': 'be', 'id': 'boy', 'x': -600, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -60, 'z': -560}, {'name': 'tho', 'species': 'rabbit', 'x': 110, 'z': -600}],
          'script': [{'who': 'be', 'say': 'Nhìn hai bé kìa.', 'dur': 3.5}, {'together': [{'who': 'cho', 'do': [['bark']]}, {'who': 'tho', 'do': [['binky']]}]}, {'who': 'be', 'say': 'Dễ thương quá.', 'dur': 1.8}]},
         ('cho bark — big enough in the frame', 'tho binky — big enough in the frame'), (), False),
        ({'id': 'torso44b', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'me', 'id': 'granny', 'x': -150, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': 30, 'z': -600}, {'name': 'cho', 'species': 'dog', 'x': -300, 'z': -500}],
          'script': [{'who': 'me', 'say': 'Xin chào cả nhà.', 'dur': 2}, {'together': [{'who': 'me', 'say': 'Nhìn thỏ kìa.', 'dur': 2.5}, {'who': 'tho', 'do': [['binky']]}], 'view': {'on': ['tho', 'me'], 'size': 'medium'}}]},
         ('tho binky — big enough in the frame', 'no headless body at'), (), True),
        ({'id': 'desk44b', 'camera': 'auto', 'set': {'preset': 'pharmacy'},
          'characters': [{'name': 'duoc_si', 'id': 'pharmacist', 'x': 0, 'z': -620, 'faces': 'khach'}, {'name': 'khach', 'id': 'owner_woman', 'x': 330, 'z': -300, 'faces': 'duoc_si'}],
          'script': [{'who': 'duoc_si', 'say': 'Chào chị, chị cần gì ạ?', 'dur': 2}, {'who': 'duoc_si', 'do': ['wave']}, {'who': 'khach', 'say': 'Cho tôi thuốc nhỏ mắt.', 'dur': 2}]},
         ('duoc_si behind the counter — face and chest seen', 'furniture inside the frame'), (), False),
        ({'id': 'rec44b', 'camera': 'auto', 'set': {'preset': 'reception'},
          'characters': [{'name': 'le_tan', 'id': 'clerk', 'x': -300, 'z': -620, 'faces': 'be'}, {'name': 'be', 'id': 'boy', 'x': 250, 'z': -380, 'faces': 'le_tan'}],
          'script': [{'who': 'le_tan', 'say': 'Chào em.', 'dur': 2}, {'who': 'le_tan', 'do': ['wave']}]},
         ('le_tan behind the counter — face and chest seen',), (), False),
        ({'id': 'pick44b', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'be', 'id': 'boy', 'x': 0, 'z': -560}],
          'script': [{'who': 'be', 'say': 'Con dọn đồ chơi đây.', 'do': ['tidyToys']}]},
         ('be pickUp — the item and the person in the frame at the grasp', 'furniture inside the frame'), (), False),
        ({'id': 'edge44b', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'bo', 'id': 'owner_man', 'z': -560, 'x': -150}, {'name': 'cho', 'species': 'shiba', 'z': -560, 'x': 150}],
          'script': [{'who': 'bo', 'say': 'Bố về rồi đây!'}, {'who': 'bo', 'do': ['wave']}, {'together': [{'who': 'bo', 'do': ['kneel']}, {'who': 'cho', 'do': [['greet', 1.4]]}]}, {'together': [{'who': 'bo', 'do': [['stroke', '@cho']]}, {'who': 'cho', 'do': ['wagTail']}]}]},
         ('furniture inside the frame at',), (), False),
        ({'id': 'open44b', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'cho', 'species': 'corgi', 'x': 150, 'z': -560}, {'name': 'meo', 'species': 'cat', 'x': -250, 'z': -560}],
          'script': [{'who': 'cho', 'do': [['chaseTail']]}, {'who': 'meo', 'do': [['loaf', 3]]}, {'who': 'cho', 'do': [['bark']]}]},
         ('furniture inside the frame at 1 s (opening)', 'cho chaseTail — big enough in the frame'), (), False),
        ({'id': 'pharm44b', 'camera': 'auto', 'set': {'preset': 'pharmacy'},
          'characters': [{'name': 'duoc_si', 'id': 'pharmacist', 'x': 0, 'z': -620}, {'name': 'khach', 'id': 'owner_woman', 'x': 150, 'z': -300, 'faces': 'duoc_si'}, {'name': 'cho', 'species': 'dog', 'x': 330, 'z': -300}, {'name': 'meo', 'species': 'cat', 'x': -150, 'z': -300}],
          'script': [{'who': 'khach', 'say': 'Chào chị.', 'dur': 1.5}, {'who': 'cho', 'do': [['bark']]}, {'who': 'meo', 'do': [['groomFace']]}]},
         ('cho bark — big enough in the frame', 'meo groomFace — big enough in the frame'), ('(allowed: counter',), False),
        ({'id': 'exam44b', 'camera': 'auto', 'set': {'preset': 'exam'},
          'characters': [{'name': 'le_tan', 'id': 'receptionist', 'x': -120, 'z': -560, 'faces': 'chu'}, {'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho'},
                         {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'chu', 'id': 'granny', 'x': -420, 'z': -560, 'faces': 'le_tan'}],
          'script': [{'who': 'le_tan', 'say': 'Mời bác sĩ.', 'dur': 1.5}, {'who': 'bac_si', 'do': [['takeTemp', '@cho', 1.5, {'reading': '38.5°C'}]]}, {'who': 'bac_si', 'do': [['givePill', '@cho']]}]},
         ('bac_si turns to the thermometer held by the face', 'bac_si givePill cho — big enough on screen', 'people inside the frame'), (), False))
    for scene44b, needles44b, banned44b, torso44b in shots44b:
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_' + scene44b['id'] + '.json')
        try:
            json.dump(scene44b, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, scene44b['id']))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f"{scene44b['id']}: the scene does not build: " + done.stderr.strip()[:300]); continue
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, scene44b['id'])] + (['--torso44b'] if torso44b else []), capture_output=True, text=True)
        if done.returncode != 0: problems.append(f"{scene44b['id']}: " + (done.stdout.strip() or done.stderr.strip())[-700:])
        else:
            for needle in needles44b:
                if needle not in done.stdout: problems.append(f"{scene44b['id']}: acting_check did not measure {needle!r}")
            for needle in banned44b:
                if needle in done.stdout: problems.append(f"{scene44b['id']}: acting_check still reports {needle!r}:\n" + '\n'.join(line for line in done.stdout.splitlines() if needle in line)[:500])


@case('acting44a')
def acting44a(work, problems):
    stage = STAGE
    TAG = scratch('acting44a')
    # ĐỢT 44 A — SỬA LỖI ĐÃ BIẾT (0.82 / 0.83): pair44a / mom44a — vỗ vai, ôm với owner_woman, owner_man, mother (trước: tay cách vai ~7 %, vai
    # người kia tính ở hướng nhìn thẳng; ôm owner_woman: tóc dài làm khung đầu dài xuống ngực); bag44a — dược sĩ đưa túi cho owner_woman cách 270
    # (trước: túi nhảy 3,0–3,1 % một khung — tay tính với độ dài tay chưa co theo `coThan`); bath44a — tắm trong chậu DƯỚI SÀN (trước: hướng
    # nhìn 60–64 %); fetch44a — chó quay TRÁI, bóng bay sang trái. Chữ: nhà thuốc (dược sĩ sau quầy, khách trước quầy), "nằm sofa" / "ngủ trưa
    # cùng thú" (đứng sẵn ở sofa). Mục thú `zoomies`, `sleepyPet` trong action-catalog.json.
    scenes44a = {
        'pair44a': ({'preset': 'reception'}, [dict(name='vet', id='vet', x=-140, z=-380, faces='o'), dict(name='o', id='owner_woman', x=140, z=-380, faces='vet')],
                    [{'who': 'vet', 'do': [['patShoulder', '@o']]}, {'who': 'o', 'do': [['patShoulder', '@vet']]}, {'who': 'o', 'do': [['hug', '@vet']]}],
                    ('vet patShoulder o — hand on the shoulder', 'o patShoulder vet — hand on the shoulder', 'o hug vet — arms round each other')),
        'mom44a': ({'preset': 'reception'}, [dict(name='bo', id='owner_man', x=-140, z=-380, faces='me'), dict(name='me', id='mother', x=140, z=-380, faces='bo')],
                   [{'who': 'bo', 'do': [['patShoulder', '@me']]}, {'who': 'me', 'do': [['patShoulder', '@bo']]}, {'who': 'me', 'do': [['hug', '@bo']]}],
                   ('bo patShoulder me — hand on the shoulder', 'me patShoulder bo — hand on the shoulder', 'me hug bo — arms round each other')),
        'bag44a': ({'preset': 'reception'}, [dict(name='ph', id='pharmacist', x=-150, z=-380, holds='bag', faces='o'), dict(name='o', id='owner_woman', x=120, z=-380, faces='ph')],
                   [{'who': 'ph', 'do': [['handOverBag', '@o']]}], ('ph handOverBag o — the bag passes hand to hand',)),
        'bath44a': ({'preset': 'living-room'}, [dict(name='me', id='mother', x=40, z=-560, faces='cho'), dict(name='cho', species='corgi', x=220, z=-560, faces='me', inTub=True)],
                    [{'who': 'me', 'say': 'Tắm cho Mochi nào!', 'do': [['bathTime', '@cho']]}], ('me bathPet — head turned to cho', 'me towelDry — head turned to cho')),
        'fetch44a': ({'preset': 'living-room'}, [dict(name='me', id='mother', x=-420, z=-560), dict(name='em', id='girl', x=160, z=-560, faces='cho'), dict(name='cho', species='corgi', x=40, z=-560, faces='me')],
                     [{'who': 'em', 'say': 'Lu ơi, bắt bóng nè!', 'do': [['playFetch', '@cho']]}], ('em throwBall',))}
    for name44a, (set44a, cast44a, turns44a, measures44a) in scenes44a.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name44a}.json')
        try:
            json.dump({'id': name44a, 'camera': 'auto', 'set': set44a, 'characters': cast44a, 'script': turns44a}, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name44a))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name44a}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name44a)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name44a}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        for needle in measures44a:
            if needle not in done.stdout: problems.append(f'{name44a}: acting_check did not measure "{needle}"')
    if os.path.isdir(os.path.join(work, 'fetch44a')):
        html = open(os.path.join(work, 'fetch44a', 'index.html'), encoding='utf-8').read()
        if '[em, ["throwBall", cho]]' not in html: problems.append('fetch44a: playFetch did not throw toward the dog (["throwBall", cho])')
        # Quả bóng rơi BÊN TRÁI người ném (con chó quay trái): chỗ cuối cùng còn thấy quả bóng, so với giữa khung của bé.
        landed = page_eval(os.path.join(work, 'fetch44a'), "(() => { const tl = Object.values(window.__timelines)[0], host = document.querySelector('[data-name=\"em\"]'), ball = host && host.querySelector('[id$=\"-ball\"]'); if (!ball) return null; const svg = host.querySelector('svg'); let last = null; for (let t = 0; t < tl.duration(); t += 0.1) { tl.seek(t, false); window.__set.update(); const r = ball.getBoundingClientRect(); if (r.width > 0 && getComputedStyle(ball).display !== 'none' && +(ball.getAttribute('opacity') ?? 1) > 0) { const s = svg.getBoundingClientRect(); last = r.left + r.width / 2 - (s.left + s.width / 2); } } return last; })()")
        if not isinstance(landed, (int, float)) or landed >= 0: problems.append(f'fetch44a: the ball should land to the left of the girl (the dog faces left) — got {landed!r} px from her centre')


@case('pharm44a', tags=('smoke',))
def pharm44a(work, problems):
    # Chữ — NHÀ THUỐC: dược sĩ sau quầy (z sau mép sau −550), khách trước quầy (z trước mép trước −420); cảnh dựng được và qua acting_check.
    text = os.path.join(work, 'pharm44a.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: nhà thuốc\ndược sĩ (pharmacist) · chị (owner_woman)\n\nchị: Chào chị, tôi lấy thuốc.\ndược sĩ → chị: phát thuốc\nchị: Cảm ơn chị!\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py pharmacy 44 A: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = {c['name']: c for c in json.load(open(os.path.join(work, 'pharm44a.scene.json'), encoding='utf-8'))['characters']}
        if not made.get('duoc_si', {}).get('z', 0) < -550 or not made.get('chi', {}).get('z', -999) > -420:
            problems.append(f'script.py pharmacy 44 A: the pharmacist should stand behind the counter (z < -550) and the customer in front (z > -420) — got {made}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'pharm44a')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('pharm44a (script): ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'duoc_si handOverBag chi — the bag passes hand to hand' not in done.stdout: problems.append('pharm44a (script): acting_check did not measure the bag hand-over')


@case('sofa44a')
def sofa44a(work, problems):
    # Chữ — NẰM SOFA: "bé: [nằm sofa]" và "ngủ trưa cùng thú" — bé đứng sẵn ở mép trước sofa, con chó trên sàn cạnh sofa, người khác sang phải; cảnh dựng được.
    for key, body in (('sofa44a', 'mẹ (mother) · bé (boy)\n\nbé: [nằm sofa]\nmẹ: Ngủ ngon nhé.\nbé: [đứng dậy]\n'), ('nap44a', 'mẹ (mother) · bé (boy) · chó (dog)\n\nmẹ: Con ngủ trưa đi.\nbé → chó: ngủ trưa cùng thú\n')):
        text = os.path.join(work, f'{key}.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khách\n' + body)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'script.py {key}: ' + (done.stderr or done.stdout).strip()[-300:]); continue
        made = {c['name']: c for c in json.load(open(os.path.join(work, f'{key}.scene.json'), encoding='utf-8'))['characters']}
        be, me = made.get('be', {}), made.get('me', {})
        if not (-560 <= be.get('x', 0) <= -40 and abs(be.get('z', 0) + 848) <= 1) or me.get('x', -999) < 0: problems.append(f'script.py {key}: the boy is not staged at the sofa / the mother stands in front of it — {made}')
        if key == 'nap44a' and not (-560 <= made.get('cho', {}).get('x', 999) <= 0 and made.get('cho', {}).get('z', 0) > -860): problems.append(f'script.py {key}: the dog is not on the floor beside the sofa — {made}')
        if key == 'sofa44a':
            done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, key)], capture_output=True, text=True)
            if done.returncode != 0: problems.append(f'{key} (script): ' + (done.stdout.strip() or done.stderr.strip())[-600:])


@case('catalog44a')
def catalog44a(work, problems):
    catalog44a = {row['label'] for row in json.load(open(os.path.join(HERE, 'action-catalog.json'), encoding='utf-8'))['pets']}
    for label in ('combo zoomies', 'combo sleepyPet', 'cat: combo sleepyPet'):
        if label not in catalog44a: problems.append(f'action-catalog.json: pet row "{label}" is missing')
