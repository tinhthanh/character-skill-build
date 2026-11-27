"""Đợt 43 C (PR #5, nhánh check-code-m-i) — chuyển nguyên văn từ khối của check_scene.py cũ sang một trường hợp riêng."""
from .common import *  # noqa: F401,F403


@case('combo43c')
def combo43c_case(work, problems):
    stage = STAGE
    TAG = scratch('combo43c')
    # ĐỢT 43 C — COMBO CHO ĐỢT 42: ăn mừng lớn (nhảy, múa, reo); các combo dưới. (bathTime, playFetch, welcomeHome, sleepyPet: của 0.83.0.) Mỗi cảnh qua acting_check, composition không còn tên combo;
    # chữ: "quẩy mừng", "nhặt đồ đưa", "nghỉ trưa với thú", "hốt hoảng chạy tới", "thú sợ hãi" ra đúng bước (cả bước "with" của con thú).
    combo43c = {
        'party43': ({'preset': 'living-room'}, [dict(name='be', id='girl', x=0, z=-560)],
                    [{'who': 'be', 'do': ['partyTime']}], ('"jump", 2', '"dance", "happy", 2', '"cheer"')),
        # nhóm 2: BÉ ngồi bệt vuốt mèo rồi nằm ngủ cùng nó (con vật dừng xa hơn người ngồi ghế — FLOOR_GAP_43: trước đó bàn tay bé dựng đứng
        # cạnh tai con mèo, 7 / 13 mốc không chạm), hốt hoảng chạy tới
        # con chó đang khập khiễng, nhặt quả bóng cạnh con chó rồi đưa cho mẹ (mẹ có quả bóng cất sẵn mới đón lấy — `take`).
        'lazy43': ({'preset': 'living-room'}, [dict(name='be', id='boy', x=-120, z=-560, faces='meo'), dict(name='meo', species='cat', x=160, z=-560, faces='be')],
                   [{'who': 'be', 'do': [['lazyAfternoon', '@meo']]}], ('"sitOnFloor"', '"stroke"', '"lieDown", "floor", {"sleep": true}', '"sleep", 3')),
        'rush43': ({'preset': 'park'}, [dict(name='me', id='mother', x=-400, z=-560, faces='cho'), dict(name='cho', species='dog', x=200, z=-560)],
                   [{'who': 'cho', 'do': ['limp']}, {'who': 'me', 'do': [['rushToPet', '@cho']]}], ('"startle"', '"run"', '"stroke"', '"relief"')),
        'tidy43': ({'preset': 'living-room'}, [dict(name='be', id='girl', x=-60, z=-560, faces='me'), dict(name='cho', species='corgi', x=140, z=-560),
                                               dict(name='me', id='mother', x=-300, z=-560, faces='be', holds='toy', holdsHidden=True)],
                   [{'who': 'be', 'do': [['tidyUp', '@cho', '@me']]}], ('"pickUp"', '"handOver"', '["take", be]')),
        # của thú: mèo đen run sợ rồi chạy nấp sau ông (đứng sâu hơn ông 120 — gần hơn thì nó chạy xuyên chân ông).
        'scared43': ({'preset': 'living-room'}, [dict(name='ong', id='grandpa', x=0, z=-560), dict(name='meo', species='black_cat', x=-300, z=-680, faces='ong')],
                     [{'who': 'meo', 'do': [['scaredPet', '@ong']]}], ('"tremble", 1.5', '"hide", set.target(meo, ong'))}
    for name, (stage_set, cast, turns, needles) in combo43c.items():
        scene43 = {'id': name, 'camera': 'auto', 'set': stage_set, 'characters': cast, 'script': turns}
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name}.json')
        try:
            json.dump(scene43, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in needles:
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        for combo_name in ('partyTime', 'lazyAfternoon', 'rushToPet', 'tidyUp', 'scaredPet'):
            if combo_name in html: problems.append(f'{name}: combo name {combo_name} was left in the composition instead of its steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
    text = os.path.join(work, 'combo43c.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: công viên\nbé (boy) · chó (shiba)\n\nbé: [quẩy mừng]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py combos 43c: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'combo43c.scene.json'), encoding='utf-8'))
        steps = [[(t['who'], t['do'][0]) for t in (e['together'] if 'together' in e else [e])] for e in made['script'] if isinstance(e, dict) and (e.get('do') or e.get('together'))]
        want = [[('be', ['jump', 2])], [('be', ['dance', 'happy', 2])], [('be', 'cheer')]]
        if steps != want: problems.append(f'script.py combos 43c: steps {steps}, want {want}')
    # nhóm 2 bằng chữ: các bước đúng, và mẹ (người nhận quả bóng) có quả bóng cất sẵn — không thì không đón lấy.
    text = os.path.join(work, 'combo43c2.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khách\nbé (girl) · chó (corgi) · mẹ (mother) · mèo (cat)\n\n'
                                            'bé → chó → mẹ: nhặt đồ đưa\nmẹ → mèo: nghỉ trưa với thú\nmẹ → chó: hốt hoảng chạy tới\n'
                                            'mèo → mẹ: thú sợ hãi\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py combos 43c-2: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'combo43c2.scene.json'), encoding='utf-8'))
        steps = [[(t['who'], t['do'][0]) for t in (e['together'] if 'together' in e else [e])] for e in made['script'] if isinstance(e, dict) and (e.get('do') or e.get('together'))]
        want = [[('be', ['pickUp', '@cho'])], [('be', ['handOver', '@me'])], [('me', 'sitOnFloor')], [('me', ['stroke', '@meo'])],
                [('me', ['lieDown', 'floor', {'sleep': True}]), ('meo', ['sleep', 3])],
                [('me', 'startle')], [('me', ['run', '@cho'])], [('me', ['stroke', '@cho'])], [('me', 'relief')],
                [('meo', ['tremble', 1.5])], [('meo', ['hide', '@me'])]]
        if steps != want: problems.append(f'script.py combos 43c-2: steps {steps}, want {want}')
        mom = next((c for c in made['characters'] if c['name'] == 'me'), {})
        if mom.get('holds') != 'toy' or not mom.get('holdsHidden'): problems.append(f'script.py combos 43c-2: the one given the ball has no ball put away to take it with ({mom})')
    # Từ kịch bản của combo không được trùng từ của một động tác lẻ (ví dụ "nhảy mừng" đã là `jump`): trùng thì một bên bị nuốt.
    if HERE not in sys.path: sys.path.insert(0, HERE)
    import script as script_mod
    single = set(script_mod.ACTIONS) | set(script_mod.TARGETED) | set(script_mod.PERSON_42D)
    for word, combo_name in script_mod.COMBO_WORDS.items():
        if word in single: problems.append(f'combo {combo_name}: script word "{word}" is already an action word in tools/script.py')
    seen_words = {}
    for combo_name, combo in script_mod.COMBOS.items():
        for word in combo.get('vi', []):
            if word in seen_words: problems.append(f'combo {combo_name}: script word "{word}" is also combo {seen_words[word]}\'s')
            seen_words.setdefault(word, combo_name)
