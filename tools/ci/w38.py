"""Đợt 38 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('care38a')
def care38a(work, problems):
    stage = STAGE
    TAG = scratch('care38a')
    # ĐỢT 38 A: cắt móng, nhỏ mắt, vệ sinh tai, quét chip — bác sĩ với con corgi trên bàn khám, cậu bé đứng xem (người thứ ba trong phòng).
    # acting_check: kìm tới bàn chân đang được nhấc, khép / mở; giọt thuốc rơi vào mắt, mắt nhắm; bông ở gốc tai, con vật lắc đầu khi
    # đã buông tay; máy quét rà trên gáy, thẻ mã chip đọc được, không che đầu con vật hay mặt người; đầu người hướng về chỗ tay làm.
    care38 = {'id': 'care38', 'camera': 'auto', 'set': {'preset': 'exam'},
              'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho', 'holds': 'clipboard', 'holdsHidden': True},
                             {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'be', 'id': 'boy', 'x': -260, 'z': -560, 'faces': 'bac_si'}],
              'script': [{'who': 'bac_si', 'do': [['clipNails', '@cho']]}, {'who': 'bac_si', 'do': [['eyeDrops', '@cho']]}, {'who': 'bac_si', 'do': [['cleanEars', '@cho']]},
                         {'who': 'bac_si', 'do': [['scanChip', '@cho', {'id': '704 000 111 222'}]]}, {'who': 'be', 'say': 'Cảm ơn bác sĩ ạ.', 'do': ['nod']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_care38.json')
    try:
        json.dump(care38, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'care38'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('care38: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care38', 'index.html'), encoding='utf-8').read()
        for needle in ('["clipNails", set.target(bac_si, cho, \'head\')]', '["eyeDrops", set.target(bac_si, cho, \'head\')]', '["cleanEars", set.target(bac_si, cho, \'head\')]',
                       '["scanChip", set.target(bac_si, cho, \'head\'), {"id": "704 000 111 222"}]', 'goes to the head end of cho for "clipNails"', 'subjects: [bac_si, cho], size: "close"'):
            if needle not in html: problems.append(f'care38: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'care38')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('care38: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('bac_si clipNails cho — the clipper at the paw', 'bac_si clipNails cho — the clipper closes and opens', 'bac_si clipNails cho — the paw is held up while cut',
                           'bac_si clipNails cho — the other hand holds the paw', 'bac_si clipNails — head turned to the nail clipper',
                           'bac_si eyeDrops cho — the dropper right above the eye', 'bac_si eyeDrops cho — a drop hangs at the tip, then falls into the eye', 'bac_si eyeDrops cho — the eyes shut after the drop',
                           'bac_si eyeDrops cho — the chin held up by the other hand', 'bac_si cleanEars cho — the cotton pad wipes at the ear', 'bac_si cleanEars cho — then it shakes its head, hands off',
                           'bac_si scanChip cho — the scanner passes over the neck and shoulders', 'bac_si scanChip cho — the chip number shown on a big card', 'bac_si scanChip — head turned to the chip number shown',
                           'bac_si eyeDrops cho — hand reaches', 'cho in view at'):
                if needle not in done.stdout: problems.append(f'care38: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    # Kịch bản chữ (đợt 38 A): "cắt móng", "nhỏ mắt", "lau tai", "quét chip <mã>".
    text = os.path.join(work, 'care38.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · mèo (cat, trên bàn)\n\nbác sĩ → mèo: cắt móng\nbác sĩ → mèo: nhỏ thuốc mắt\n'
                                            'bác sĩ → mèo: lau tai\nbác sĩ → mèo: quét chip 704 000 111 222\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py care38: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'care38.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [['clipNails', '@meo'], ['eyeDrops', '@meo'], ['cleanEars', '@meo'], ['scanChip', '@meo', {'id': '704 000 111 222'}]]
        if steps != want: problems.append(f'script.py care38: steps {steps}, want {want}')


@case('team38b')
def team38b(work, problems):
    stage = STAGE
    TAG = scratch('team38b')
    # ĐỢT 38 B — PHỐI HỢP VÀ CHUẨN BỊ: bác sĩ rửa tay, đeo găng; y tá GIỮ con chó cho bác sĩ tiêm (y tá phía đuôi), rồi giữ cho bác sĩ đo
    # nhiệt độ (con chó quay đuôi về bác sĩ — y tá thành phía đầu, hai tay dưới đầu nó); bác sĩ tháo găng. acting_check: hai tay y tá
    # trên con chó suốt lúc giữ, không che tay bác sĩ, không che mặt con chó, con chó không tự dời; bọt quanh hai tay; găng hiện / mất dưới
    # bàn tay kia, đủ / hết găng sau bước.
    team = {'id': 'team38', 'camera': 'auto', 'set': {'preset': 'exam'},
            'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 40, 'z': -560, 'faces': 'cho'}, {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'},
                           {'name': 'bac_si', 'id': 'vet', 'x': 380, 'z': -560, 'faces': 'cho', 'holds': {'L': 'syringe'}, 'holdsHidden': True}],
            'script': [{'who': 'bac_si', 'say': 'Chị rửa tay rồi đeo găng nhé.', 'dur': 1.8}, {'who': 'bac_si', 'do': [['washHands', 2]]}, {'who': 'bac_si', 'do': ['putOnGloves']},
                       {'who': 'bac_si', 'say': 'Em giữ bé giúp chị.', 'dur': 1.4},
                       {'together': [{'who': 'y_ta', 'do': [['restrain', '@cho']]}, {'who': 'bac_si', 'do': [['inject', '@cho']]}]},
                       {'together': [{'who': 'y_ta', 'do': [['restrain', '@cho']]}, {'who': 'bac_si', 'do': [['takeTemp', '@cho', 1.5]]}]},
                       {'who': 'bac_si', 'do': ['takeOffGloves']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_team38.json')
    try:
        json.dump(team, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'team38'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('team38: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'team38', 'index.html'), encoding='utf-8').read()
        # Giữ vừa khít phần việc người kia (tiêm 2,35 s → giữ 1,35 s; đo nhiệt 4,2 s → 3,2 s); đầu con chó về phía bác sĩ / phía y tá.
        for needle in ("[y_ta, ['restrain', set.target(y_ta, cho, 'body'), 1.35, { head: set.target(y_ta, cho, 'head'), headSide: 1 }]]",
                       "[y_ta, ['restrain', set.target(y_ta, cho, 'body'), 3.2, { head: set.target(y_ta, cho, 'head'), headSide: -1 }]]",
                       '[bac_si, ["washHands", 2]]', '[bac_si, "putOnGloves"]', '[bac_si, "takeOffGloves"]'):
            if needle not in html: problems.append(f'team38: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'team38')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('team38: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('y_ta restrains cho — both hands on it throughout', "y_ta restrains cho — bac_si's hands not covered", 'y_ta restrains cho — hands off its face',
                           'y_ta restrains cho — cho never jumps', "y_ta restrain — head turned to cho's head", 'y_ta holds cho — hand on it throughout',
                           'bac_si washHands — foam round both hands', 'bac_si washHands — foam gone after shaking dry', 'bac_si washHands — head turned to the hands',
                           'bac_si putOnGloves — each glove goes on under the other hand', 'bac_si putOnGloves — both gloves on after the step',
                           'bac_si takeOffGloves — each glove comes off under the other hand', 'bac_si takeOffGloves — no gloves left after the step'):
                if needle not in done.stdout: problems.append(f'team38: acting_check did not measure "{needle}"')
    # Giữ con vật sai cách: bị từ chối với một câu nói rõ.
    for name, script, needle in [('no pet', [{'who': 'y_ta', 'do': ['restrain']}], 'needs the pet'),
                                 ('a person', [{'who': 'y_ta', 'do': [['restrain', '@bac_si']]}], 'needs a pet of the scene'),
                                 ('bad hold', [{'who': 'y_ta', 'do': [['restrain', '@cho', 'long']]}], 'hold (0.5…12 s)'),
                                 ('pet restrains', [{'who': 'cho', 'do': [['restrain', '@cho']]}], 'done by a person')]:
        bad = dict(team, id='bad38', script=script)
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad38.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad38'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'restrain ({name}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "cùng lúc: y tá → chó: giữ | bác sĩ → chó: tiêm", "[rửa tay, đeo găng]", "[tháo găng tay]".
    text = os.path.join(work, 'team38.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · y tá (nurse) · chó (corgi, trên bàn)\n\nbác sĩ: [rửa tay, đeo găng]\n'
                                            'cùng lúc: y tá → chó: giữ | bác sĩ → chó: tiêm\ny tá → chó: giữ chặt\nbác sĩ: [tháo găng tay]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py restrain / gloves: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'team38.scene.json'), encoding='utf-8'))
        flat = [step for entry in made['script'] for turn in (entry.get('together') or [entry]) for step in (turn.get('do') or [])]
        for want in ('washHands', 'putOnGloves', ['restrain', '@cho'], ['inject', '@cho'], 'takeOffGloves'):
            if want not in flat: problems.append(f'script.py restrain / gloves: {want} missing from {flat}')
        if not any('together' in entry and any(['restrain', '@cho'] in (t.get('do') or []) for t in entry['together']) for entry in made['script']):
            problems.append('script.py restrain / gloves: "cùng lúc: y tá → chó: giữ | …" did not make a together turn')


@case('pairs38c')
def pairs38c(work, problems):
    stage = STAGE
    TAG = scratch('pairs38c')
    # ĐỢT 38 C — HAI NGƯỜI VỚI NHAU. pairs38 (quầy lễ tân, cùng độ sâu): bác sĩ đưa túi thuốc cho bà (bà tự có túi đang cất), vỗ vai bà (bà
    # quay lại nhìn), đập tay bé trai (bác sĩ quỳ xuống — tay trẻ con chibi chỉ tới ngang vai), bé ôm bác sĩ, bác sĩ thì thầm với bé.
    # exam38 (phòng khám, hai độ sâu −560 / −580, một bé gái nhỏ hơn): y tá thì thầm với chủ nuôi, chủ nuôi ôm y tá, y tá đưa túi thuốc rồi
    # đi ra; chủ nuôi vỗ vai bé gái (quỳ xuống), đập tay bé, bé thì thầm với chủ nuôi (chủ nuôi hạ người xuống nghe).
    pair_scenes = {
        'pairs38': {'id': 'pairs38', 'camera': 'auto', 'set': {'preset': 'reception'}, 'characters': [
            {'name': 'vet', 'id': 'vet', 'x': -150, 'z': -380, 'holds': 'bag', 'faces': 'granny'}, {'name': 'granny', 'id': 'granny', 'x': 150, 'z': -380, 'faces': 'vet'},
            {'name': 'boy', 'id': 'boy', 'x': 640, 'z': -380, 'faces': 'vet'}],
            'script': [{'who': 'vet', 'say': 'Here is the medicine for Bella.', 'dur': 1.8}, {'who': 'vet', 'do': [['handOverBag', '@granny']]},
                       {'who': 'granny', 'say': 'Thank you, doctor.', 'dur': 1.5}, {'who': 'vet', 'do': [['patShoulder', '@granny']]},
                       {'who': 'vet', 'do': [['highFive', '@boy']]}, {'who': 'boy', 'do': [['hug', '@vet']]}, {'who': 'vet', 'do': [['whisper', '@boy']]}]},
        'exam38': {'id': 'exam38', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [
            {'name': 'nurse', 'id': 'nurse', 'x': -150, 'z': -560, 'holds': 'bag', 'faces': 'owner'}, {'name': 'owner', 'id': 'manager', 'x': 260, 'z': -580, 'faces': 'nurse'},
            {'name': 'girl', 'id': 'girl', 'x': 650, 'z': -580, 'height': 420, 'faces': 'owner'}],
            'script': [{'who': 'nurse', 'do': [['whisper', '@owner']]}, {'who': 'owner', 'say': 'Really? She is all better?', 'mood': 'surprised', 'dur': 1.8},
                       {'who': 'owner', 'do': [['hug', '@nurse']]}, {'who': 'nurse', 'do': [['handOverBag', '@owner']]},
                       {'who': 'nurse', 'say': 'Twice a day, after meals.', 'dur': 1.8, 'exit': 'left'}, {'who': 'owner', 'do': [['patShoulder', '@girl']]},
                       {'who': 'owner', 'do': [['highFive', '@girl']]}, {'who': 'girl', 'do': [['whisper', '@owner']]}]}}
    pair_needles = {'pairs38': ('{ together: [[vet, ["handOverBag", granny]], [granny, ["takeBag", vet]]] }', 'items: {"L": "bag"}, itemsHidden: true',
                                "[granny, ['lookAt', set.target(granny, vet, 'head'), { hold: 2.6, up: 1.5 }]]", '{ together: [[vet, ["highFive", boy]], [boy, ["highFive", vet]]] }',
                                '{ together: [[boy, ["hug", vet]], [vet, ["hug", boy]]] }', '{ together: [[vet, ["whisper", boy]], [boy, ["hearWhisper", vet]]] }'),
                    'exam38': ('[owner, ["hearWhisper", nurse]]', '[owner, ["takeBag", nurse]]', "[girl, ['lookAt', set.target(girl, owner, 'head'), { hold: 2.6, up: 1.5 }]]")}
    pair_measures = ('handOverBag granny — both hold the bag', 'handOverBag granny — the bag passes hand to hand', 'patShoulder granny — hand on the shoulder',
                     'granny looks back (patShoulder) — head turned', 'highFive boy — the hands meet, raised', 'boy hug vet — arms round each other',
                     'vet whisper boy — mouth at the ear', 'boy looks back (whisper)', 'vet handOverBag — head turned to granny')
    for name, scene in pair_scenes.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name}.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in pair_needles[name]:
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        elif name == 'pairs38':
            for needle in pair_measures:
                if needle not in done.stdout: problems.append(f'pairs38: acting_check did not measure "{needle}"')
    # Hai người sai cách: bị từ chối với một câu nói rõ.
    base38 = pair_scenes['pairs38']
    for label, change, needle in [('bag without a bag', lambda sc: sc['characters'][0].pop('holds'), 'needs a medicine bag in hand'),
                                  ('high five at a pet', lambda sc: (sc['characters'].append({'name': 'cat', 'species': 'cat', 'x': 400, 'z': -380}), sc.__setitem__('script', [{'who': 'vet', 'do': [['highFive', '@cat']]}])), 'needs the other person'),
                                  ('whisper to nobody', lambda sc: sc.__setitem__('script', [{'who': 'vet', 'do': ['whisper']}]), 'needs the other person'),
                                  ('take a bag never put away', lambda sc: sc.__setitem__('script', [{'together': [{'who': 'boy', 'do': [['takeBag', '@vet']]}, {'who': 'vet', 'do': ['nod']}]}]), 'put-away medicine bag')]:
        bad = json.loads(json.dumps(base38)); bad['id'] = 'bad38'; change(bad)
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad38.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad38'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'two people ({label}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "đưa túi thuốc" (bác sĩ tự có túi), "an ủi", "đập tay", "ôm", "thì thầm".
    text = os.path.join(work, 'pairs38.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: lễ tân\nbác sĩ (vet) · bà (granny) · bé trai (boy)\n\nbác sĩ → bà: đưa túi thuốc\nbác sĩ → bà: an ủi\n'
                                            'bác sĩ → bé trai: đập tay\nbé trai → bác sĩ: ôm\nbác sĩ → bé trai: thì thầm\nbà → bác sĩ: vỗ vai\nbé trai → bà: nói nhỏ\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py two people: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'pairs38.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [['handOverBag', '@ba'], ['patShoulder', '@ba'], ['highFive', '@be_trai'], ['hug', '@bac_si'], ['whisper', '@be_trai'], ['patShoulder', '@bac_si'], ['whisper', '@ba']]
        if steps != want: problems.append(f'script.py two people: steps {steps}, want {want}')
        vet = next((c for c in made['characters'] if c.get('id') == 'vet'), {})
        if vet.get('holds') != 'bag' or vet.get('holdsHidden'): problems.append('script.py two people: "đưa túi thuốc" did not give the vet a medicine bag in hand')
