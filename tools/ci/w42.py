"""Đợt 42 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('framing42c')
def framing42c(work, problems):
    stage = STAGE
    TAG = scratch('framing42c')
    # ĐỢT 42 C (khung hình): con vật ≥ 35 % khung lúc làm động tác trong view cận / trung không khai `fill` (kể cả view "together" có lời dẫn của
    # người đứng đó), đồ đạc / người không bị mép khung cắt dở (cả khung dọc 1080×1920), người đứng sau quầy lễ tân thấy được nửa người.
    shots42c = (
        {'id': 'mom42c', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'me', 'id': 'granny', 'x': -150, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': 30, 'z': -600}, {'name': 'cho', 'species': 'dog', 'x': -300, 'z': -500}],
         'script': [{'who': 'me', 'say': 'Xin chào cả nhà.', 'dur': 2}, {'together': [{'who': 'me', 'say': 'Nhìn thỏ kìa.', 'dur': 2.5}, {'who': 'tho', 'do': [['binky']]}], 'view': {'on': ['tho', 'me'], 'size': 'medium'}}, {'who': 'cho', 'do': [['bark']]}]},
        {'id': 'liv42c', 'camera': 'auto', 'set': {'preset': 'living-room'},
         'characters': [{'name': 'be', 'id': 'boy', 'x': -150, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -300, 'z': -500, 'faces': 'be'}, {'name': 'meo', 'species': 'cat', 'x': -70, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': 30, 'z': -600}],
         'script': [{'who': 'be', 'say': 'Cả nhà chơi nhé.', 'dur': 1.8}, {'who': 'cho', 'do': [['playBow']], 'view': {'on': ['cho'], 'size': 'close'}}, {'who': 'meo', 'do': [['loaf', 3]], 'view': {'on': ['meo'], 'size': 'close'}},
                    {'who': 'tho', 'do': [['eatCarrot', 3]], 'view': {'on': ['tho'], 'size': 'medium'}}, {'together': [{'who': 'be', 'say': 'Nhìn cún chơi kìa.', 'dur': 2}, {'who': 'cho', 'do': ['playBow']}], 'view': {'on': ['cho'], 'size': 'close'}},
                    {'together': [{'who': 'be', 'say': 'Còn thỏ nữa.', 'dur': 2}, {'who': 'tho', 'do': [['eatCarrot', 3]]}], 'view': {'on': ['tho', 'be'], 'size': 'medium'}}, {'who': 'cho', 'do': [['bark']]}]},
        {'id': 'vert42c', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'exam'},
         'characters': [{'name': 'bac_si', 'id': 'vet', 'x': -140, 'z': -560, 'faces': 'be_gai'}, {'name': 'be_gai', 'id': 'girl', 'x': 440, 'z': -560, 'faces': 'bac_si'}, {'name': 'cho', 'species': 'cat', 'on': 'table', 'x': 200, 'z': -560}],
         'script': [{'who': 'bac_si', 'say': 'Chào em.', 'dur': 2, 'view': {'on': ['bac_si'], 'size': 'close'}}, {'who': 'be_gai', 'say': 'Em chào bác sĩ.', 'dur': 2, 'view': {'on': ['be_gai'], 'size': 'close'}},
                    {'who': 'bac_si', 'say': 'Em khỏe không?', 'dur': 2, 'view': {'on': ['bac_si', 'be_gai'], 'size': 'medium'}}, {'who': 'be_gai', 'say': 'Dạ khỏe ạ.', 'dur': 2, 'view': {'on': ['be_gai'], 'size': 'medium'}},
                    {'together': [{'who': 'bac_si', 'say': 'Bé mèo đáng yêu quá.', 'dur': 2}, {'who': 'cho', 'do': [['groomFace']]}], 'view': {'on': ['cho', 'bac_si'], 'size': 'close'}}]},
        {'id': 'rec42c', 'camera': 'auto', 'set': {'preset': 'reception'},
         'characters': [{'name': 'bac_si', 'id': 'clerk', 'x': -300, 'z': -620, 'faces': 'be'}, {'name': 'be', 'id': 'boy', 'x': 250, 'z': -380, 'faces': 'bac_si'}],
         'script': [{'who': 'bac_si', 'say': 'Chào em.', 'dur': 2}, {'who': 'be', 'say': 'Dạ chào ạ.', 'dur': 2}, {'who': 'bac_si', 'say': 'Em mang bé đi khám à?', 'dur': 2, 'view': {'on': ['bac_si'], 'size': 'medium'}}]})
    for scene42c, needles42c in zip(shots42c, (('tho binky — big enough in the frame', 'furniture inside the frame'), ('cho playBow — big enough in the frame', 'meo loaf — big enough in the frame', 'tho eatCarrot — big enough in the frame', 'furniture inside the frame'),
                                              ('cho groomFace — big enough in the frame', 'furniture inside the frame', 'people inside the frame'), ('furniture inside the frame', 'people inside the frame'))):
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_' + scene42c['id'] + '.json')
        try:
            json.dump(scene42c, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, scene42c['id']))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f"{scene42c['id']}: the scene does not build: " + done.stderr.strip()[:300]); continue
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, scene42c['id'])], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f"{scene42c['id']}: " + (done.stdout.strip() or done.stderr.strip())[-700:])
        else:
            for needle in needles42c:
                if needle not in done.stdout: problems.append(f"{scene42c['id']}: acting_check did not measure {needle!r}")
    # Quầy lễ tân: máy tính không còn đứng chắn ngực người ngồi quầy ở chỗ gợi ý (x -300).
    reception42c = next((item for item in [__import__('re').search(r"'laptop', 'x': (-?\d+)", open(os.path.join(HERE, 'scene.py'), encoding='utf-8').read())] if item), None)
    if not reception42c or abs(int(reception42c.group(1)) + 300) < 80: problems.append('reception preset: the laptop must not stand in front of the receptionist spot (x -300)')


@case('bath42f')
def bath42f(work, problems):
    stage = STAGE
    TAG = scratch('bath42f')
    # ĐỢT 42 F: tắm (chó corgi trong chậu tắm trên bàn khám: xối nước, xoa bọt hai tay, xả, lùi ra — con vật rũ nước), lau khô bằng khăn, đánh răng;
    # một con mèo trong chậu do y tá đứng phía bên kia tắm. acting_check: tia nước rơi trên lưng, bọt trên lưng, hai tay trên con vật, con vật trong vành
    # chậu, rũ nước khi đã buông, khăn quấn rồi về tay, lông khô bông, bàn chải ở miệng đang hé, liếm mép; đầu người quay về chỗ làm.
    bath42f = {'id': 'bath42f', 'camera': 'auto', 'set': {'preset': 'exam'},
               'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho'},
                              {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si', 'inTub': True}],
               'script': [{'who': 'bac_si', 'do': [['bathPet', '@cho']]}, {'who': 'bac_si', 'do': [['towelDry', '@cho']]}, {'who': 'bac_si', 'do': [['brushTeeth', '@cho']]}]}
    cat42f = {'id': 'cat42f', 'camera': 'auto', 'set': {'preset': 'exam'},
              'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 360, 'z': -560, 'faces': 'meo'},
                             {'name': 'meo', 'species': 'orange_cat', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'y_ta', 'inTub': True}],
              'script': [{'who': 'y_ta', 'do': [['bathPet', '@meo', {'hold': 1.6}]]}, {'who': 'y_ta', 'do': [['towelDry', '@meo']]}]}
    for spec42f, needles42f in ((bath42f, ('bac_si bathPet cho — the water spray lands on its back', 'bac_si bathPet cho — foam builds up on its back', 'bac_si bathPet cho — both hands lather on it',
                                           'bac_si bathPet cho — it stands inside the tub', 'bac_si bathPet cho — it shakes off water after the person steps back', 'bac_si bathPet — head turned to the shower head',
                                           'bac_si towelDry cho — the towel comes in the hand, then wraps round it', 'bac_si towelDry cho — the fur goes from wet to fluffy',
                                           'bac_si brushTeeth cho — the toothbrush at the mouth, the mouth open', 'bac_si brushTeeth cho — then it licks its lips, hands off')),
                                (cat42f, ('y_ta bathPet meo — the water spray lands on its back', 'y_ta bathPet meo — it stands inside the tub', 'y_ta towelDry meo — both hands rub on the towel'))):
        sid42f = spec42f['id']
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{sid42f}.json')
        try:
            json.dump(spec42f, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, sid42f))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{sid42f}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, sid42f, 'index.html'), encoding='utf-8').read()
        for needle in ('.inTub42f(', "createProp(tub42f_", '"bathPet", set.target(' if sid42f == 'bath42f' else '"towelDry", set.target('):
            if needle not in html: problems.append(f'{sid42f}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, sid42f)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{sid42f}: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in needles42f:
                if needle not in done.stdout: problems.append(f'{sid42f}: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    # Kịch bản chữ (đợt 42 F): "tắm" (con vật tự đứng trong chậu tắm), "lau khô lông", "đánh răng"; đối số sai bị từ chối.
    text = os.path.join(work, 'bath42f.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · chó (corgi, trên bàn)\n\nbác sĩ → chó: tắm\nbác sĩ → chó: lau khô lông\nbác sĩ → chó: đánh răng\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py bath42f: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'bath42f.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        if steps != [['bathPet', '@cho'], ['towelDry', '@cho'], ['brushTeeth', '@cho']]: problems.append(f'script.py bath42f: steps {steps}')
        if not any(c.get('inTub') for c in made['characters'] if c.get('name') == 'cho'): problems.append('script.py bath42f: the bathed dog does not stand in a tub ("inTub")')
    for label42f, step42f, needle42f, extra42f in (('bath hold too long', ['bathPet', '@cho', {'hold': 30}], 'hold must be', {}), ('teeth with extra words', ['brushTeeth', '@cho', 'fast'], '"brushTeeth" takes', {}),
                                                   ('a person in a tub', ['towelDry', '@cho'], '"inTub" is for a pet', {'person_tub': True})):
        bad42f = json.loads(json.dumps(bath42f)); bad42f['script'] = [{'who': 'bac_si', 'do': [step42f]}]
        if extra42f.get('person_tub'): bad42f['characters'][0]['inTub'] = True
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad42f.json')
        try:
            json.dump(bad42f, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad42f'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle42f not in done.stderr: problems.append(f'bad42f ({label42f}): should be refused with "{needle42f}" — got: ' + (done.stderr.strip()[-200:] or 'no error'))


@case('motion42d')
def motion42d(work, problems):
    stage = STAGE
    TAG = scratch('motion42d')
    # ĐỢT 42 D — CHẠY, NHẢY LÊN, NHẢY MÚA (cả thân). motion42d: công viên, bé chạy tới con chó (`["run", "@cho"]` — tools/scene.py đổi ra
    # quãng, chỗ đứng mới ghi lại), nhảy mừng hai lần, bác sĩ và bé gái nhảy múa cùng lúc. motion42d-v: khung DỌC từ kịch bản tiếng Việt
    # ("chạy tới", "nhảy cẫng", "[nhảy]" của người = nhảy múa, "[quẩy]"; "[nhảy]" của chó vẫn là `jump` của thú). acting_check đo pha bay
    # của bước chạy, bàn chân rời sàn khi nhảy (bóng ở lại trên sàn, co lại), chân trụ không trượt, chân về sàn, đầu / tay / chân trong khung.
    motion42d = {'id': 'motion42d', 'camera': 'auto', 'set': {'preset': 'park'},
                 'characters': [{'name': 'be', 'id': 'boy', 'x': -700, 'z': -560}, {'name': 'cho', 'species': 'corgi', 'x': -60, 'z': -560, 'faces': 'be'},
                                {'name': 'vet', 'id': 'vet', 'x': 330, 'z': -620}, {'name': 'girl', 'id': 'girl', 'x': 560, 'z': -620}],
                 'script': [{'who': 'be', 'say': 'Mochi ơi!', 'dur': 1.2}, {'who': 'be', 'do': [['run', '@cho']]}, {'who': 'cho', 'do': ['wagTail']},
                            {'who': 'be', 'do': [['jump', 2]]}, {'who': 'vet', 'say': 'Cả nhà cùng nhảy nào!', 'dur': 1.6},
                            {'together': [{'who': 'vet', 'do': ['dance']}, {'who': 'girl', 'do': [['dance', 'happy', 2, {'bpm': 120}]]}]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_motion42d.json')
    try:
        json.dump(motion42d, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'motion42d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('motion42d: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'motion42d', 'index.html'), encoding='utf-8').read()
        if not re.search(r"\[be, \[\"run\", -?\d+\]\]", html): problems.append('motion42d: ["run", "@cho"] was not turned into a distance')
        if 'peaks42d: bodyTimes42d(' not in html: problems.append('motion42d: the jump / dance turns are not framed at their peaks (peaks42d)')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'motion42d')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('motion42d: ' + (done.stdout.strip() or done.stderr.strip())[-700:])
        else:
            for needle in ('be run — flight phases (both feet off the floor)', 'be run — planted feet do not slide', 'be run — both feet back on the floor after it',
                           'be jump — both feet clearly off the floor', 'be jump — the shadow stays on the floor and shrinks', 'be jump — head, hands and feet in the frame',
                           'vet dance — feet stay on the floor', 'girl dance — head, hands and feet in the frame', 'girl dance — planted feet do not slide'):
                if needle not in done.stdout: problems.append(f'motion42d: acting_check did not measure {needle!r}')
    text = os.path.join(work, 'motion42d-v.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: đường phố · khung: dọc\nbé (boy) · chó (corgi) · bác sĩ (vet) · bé gái (girl)\n'
                                            'bé: Mochi ơi, chờ anh với!\nbé → chó: chạy tới\nbé: [nhảy cẫng]\nbác sĩ: Cả nhà cùng quẩy nào!\n'
                                            'cùng lúc: bác sĩ: [nhảy] | bé gái: [quẩy]\nchó: [nhảy]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('motion42d-v: script.py: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'motion42d-v.scene.json'), encoding='utf-8'))
        steps = [step for entry in made['script'] for turn in (entry.get('together') or [entry]) for step in turn.get('do', [])]
        if steps != [['run', '@cho'], 'jump', 'dance', 'dance', 'jump']: problems.append(f'motion42d-v: script.py gave {steps}, want run @cho, jump, dance, dance, jump (the dog\'s)')
        done = build(os.path.join(work, 'motion42d-v.scene.json'), os.path.join(work, 'motion42d-v'))
        if done.returncode != 0: problems.append('motion42d-v: the scene does not build: ' + done.stderr.strip()[:300])
        else:
            done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'motion42d-v')], capture_output=True, text=True)
            if done.returncode != 0: problems.append('motion42d-v: ' + (done.stdout.strip() or done.stderr.strip())[-700:])
            elif 'be jump — both feet clearly off the floor' not in done.stdout or 'bac_si dance — head, hands and feet in the frame' not in done.stdout:
                problems.append('motion42d-v: acting_check did not measure the jump and the dance:\n' + done.stdout[-400:])
    # Bị từ chối, lỗi rõ ràng: thú chạy / múa, đối số sai.
    for label, step, who in (('a pet running', ['run', 100], 'cho'), ('run with a word', ['run', 'far'], 'be'), ('jump 9 times', ['jump', 9], 'be'), ('dance in an unknown style', ['dance', 'disco'], 'be')):
        bad = {'id': 'bad42d', 'set': {'preset': 'park'}, 'characters': [{'name': 'be', 'id': 'boy', 'x': 0, 'z': -560}, {'name': 'cho', 'species': 'corgi', 'x': 300, 'z': -560}],
               'script': [{'who': who, 'do': [step]}]}
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad42d.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad42d'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or 'scene:' not in (done.stderr + done.stdout): problems.append(f'motion42d: {label} should be refused with a message')

    # ── XE MÁY CHẠY VÀO, NGƯỜI CẦM LÁI (examples/scene-ride): xe trượt vào và quay bánh, người lái ngồi trên yên từ khung
    # đầu, hội thoại chờ xe dừng (T0), "getOff" hạ người xuống đất đúng lúc nó chạy.
    ride = os.path.join(ROOT, 'examples', 'scene-ride', 'scene.json')
    done = build(ride, os.path.join(work, 'ride'))
    if done.returncode != 0: problems.append('the riding example does not build: ' + (done.stderr.strip() or done.stdout.strip())[:300])
    else:
        html = open(os.path.join(work, 'ride', 'index.html'), encoding='utf-8').read()
        for needle in ('createProp(cutout4, "scooter", {"facing": "right"}); const cutout4Spot = set.stand(cutout4, { x: -1500',
                       'const vetSpot = set.place(vet, { x: -1500', 'cutout4Prop.rideLift(vet)', 'vet.state.ride = 1', 'T0 = TI + 3.5',
                       'tl.fromTo(cutout4Spot, { x: -1500 }, { x: -380, duration: 3.2', 'tl.add(cutout4Prop.roll(', 'tl.fromTo(vetSpot',
                       "step.name === 'getOff'", '"getOff"'):
            if needle not in html: problems.append(f'riding example: {needle!r} not in index.html')
        if 'vet.state.facing = 0.55' in html or 'vet.state.facing = -0.55' in html: problems.append('riding example: the rider is also turned toward someone at the start (it should face the way it rides)')

    # Sửa đợt 42: thẻ KẾT THÚC trong bối cảnh 3D mà máy quay về góc khởi đầu — trước đây vòng lặp vẽ thẻ đè biến `start` (góc máy đầu) bằng
    # chuỗi giữ chỗ '__OUTRO_START__', ra `set.cut("__OUTRO_START__")` và trang báo "set.cut: unknown camera key "0"" (thợ dựng video tìm ra).
    outro42 = {'id': 'outro42', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'outro': {'title': 'VetGo', 'text': 'Chăm boss mỗi ngày'},
               'characters': [{'name': 'me', 'id': 'manager', 'x': -300, 'z': -560}, {'name': 'meo', 'species': 'cat', 'x': 0, 'z': -560}, {'name': 'cho', 'species': 'corgi', 'x': 300, 'z': -560}],
               'script': [{'who': 'me', 'say': 'Mèo nhà mình thích chui hộp lắm.', 'dur': 2}, {'who': 'meo', 'do': ['sitInBox']},
                          # đợt 42: lời dẫn đè lên hình — "view" trên cả nhóm `together`: máy vào con chó trong lúc người mẹ nói
                          {'together': [{'who': 'me', 'say': 'Còn cún thì rủ chơi suốt.', 'dur': 2}, {'who': 'cho', 'do': ['playBow']}], 'view': {'on': ['cho'], 'size': 'close', 'alone': True, 'fill': 0.62}}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_outro42.json')
    try:
        json.dump(outro42, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'outro42'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('outro42: the scene with an outro card does not build: ' + (done.stderr.strip() or done.stdout.strip())[-300:])
    else:
        html = open(os.path.join(work, 'outro42', 'index.html'), encoding='utf-8').read()
        if '__OUTRO' in html or 'set.cut("' in html: problems.append('outro42: a camera cut is given the outro placeholder instead of the start view')
        if 'frameAt(T0 + talk.turns[2].start, [cho], "close"' not in html: problems.append('outro42: the "view" on the "together" entry does not point the camera at the dog during the voice-over')

    # (Đợt 44 A: `floor42e` mở bằng bé nằm sofa và con chó nằm ngủ cạnh sofa — trong góc toàn của hai đứa — trước đây chó chỉ nằm xuống ở ~23 s.)


@case('floor42e')
def floor42e(work, problems):
    stage = STAGE
    TAG = scratch('floor42e')
    # ĐỢT 42 E — SÁT SÀN: mẹ ngồi bệt, mèo tới, vuốt rồi bế mèo lên lòng; bé nằm ngủ trên sofa, chó nằm cạnh (`floor42e`); bé nhặt quả bóng cạnh
    # con corgi, đưa cho mẹ, nằm xuống sàn, mẹ ngồi bệt (`pick42e`). Mỗi cảnh phải qua acting_check (mông trên sàn, thân nằm ngang trên sàn / mặt
    # sofa, tay tới quả bóng lúc nắm, quả bóng trong tay); script.py: "ngồi bệt", "nằm sofa", "bé → chó: nhặt" ra đúng bước.
    scenes42e = {'floor42e': {"id": "floor42e", "camera": "auto", "set": {"preset": "living-room"}, "characters": [{"name": "me", "id": "receptionist", "x": 200, "z": -560, "faces": "meo"}, {"name": "be", "id": "boy", "x": -520, "z": -848, "faces": "me"}, {"name": "cho", "species": "dog", "x": -160, "z": -720, "faces": "be"}, {"name": "meo", "species": "cat", "x": 480, "z": -560, "faces": "me"}], "script": [{"who": "be", "say": "Mẹ ơi, con buồn ngủ quá.", "do": [["lieDown", "sofa", {"sleep": True}]]}, {"who": "cho", "do": [["walk", 4, -40], "lieDown", ["sleep", 2]], "view": {"on": ["be", "cho"], "size": "full"}}, {"who": "me", "say": "Mèo ơi, lại đây với mẹ nào.", "do": ["sitOnFloor"]}, {"who": "me", "do": [["stroke", "@meo"]], "view": {"on": ["me", "meo"], "size": "full"}}, {"who": "me", "say": "Lên đây mẹ bế nào.", "do": [["carry", "@meo"]], "view": {"on": ["me", "meo"], "size": "full"}}, {"who": "me", "say": "Ngủ ngon nhé con.", "view": {"on": ["me", "be", "cho"], "size": "full"}}, {"who": "be", "do": ["standUp"]}]},
                 'pick42e': {"id": "pick42e", "camera": "auto", "set": {"preset": "living-room"}, "characters": [{"name": "me", "id": "receptionist", "x": 260, "z": -560, "faces": "be", "holds": "toy", "holdsHidden": True}, {"name": "be", "id": "boy", "x": -160, "z": -560, "faces": "me"}, {"name": "cho", "species": "corgi", "x": 20, "z": -700, "faces": "be"}], "script": [{"who": "me", "say": "Con nhặt quả bóng cho mẹ nhé."}, {"who": "be", "do": [["pickUp", "@cho"]], "view": {"on": ["be", "cho"], "size": "full"}}, {"who": "be", "do": [["handOver", "@me"]]}, {"who": "be", "say": "Con nằm nghỉ một chút.", "do": [["walk", 4, -200], "lieDown"]}, {"who": "me", "do": ["sitOnFloor", "nod"]}, {"who": "be", "do": ["standUp", "wave"]}]}}
    for name, scene42e in scenes42e.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name}.json')
        try:
            json.dump(scene42e, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in (('"sitOnFloor"', "['lieDown', 'sofa', {", '"standUp"') if name == 'floor42e' else ('"pickUp"', '["take", be]', '"lieDown"')):
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'floor42e' not in done.stdout and 'sitOnFloor' not in done.stdout: problems.append(f'{name}: acting_check measured nothing on the floor')
    text = os.path.join(work, 'floor42e.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khách\nmẹ (receptionist) · bé (boy) · chó (dog)\n\nmẹ: [ngồi bệt]\nbé → chó: nhặt\nbé: [nằm sofa]\nbé: [đứng dậy, ngồi xếp bằng]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py floor 42 E: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'floor42e.scene.json'), encoding='utf-8'))
        steps = [t['do'] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [['sitOnFloor'], [['pickUp', '@cho']], [['lieDown', 'sofa']], ['standUp', 'sitOnFloor']]
        if steps != want: problems.append(f'script.py floor 42 E: steps {steps}, want {want}')


@case('voiceover42a')
def voiceover42a(work, problems):
    # ĐỢT 42 A — LỒNG TIẾNG trong kịch bản chữ + NGƯỜI DẪN KHÔNG HIỆN HÌNH: kịch bản dùng cả hai dạng cú pháp ("(lồng tiếng) →" và "cùng lúc (quay …)") dựng được;
    # composition có góc máy của nhóm `together` vào con thú (không bao giờ vào người dẫn), người dẫn không có chỗ đứng / thân trên màn hình; acting_check đạt.
    text = os.path.join(work, 'voiceover42a.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khách · máy: tự động\nlời dẫn (lồng tiếng) · mèo (calico) · chó (corgi) · thỏ (rabbit) · mẹ (manager)\n\n'
                                            'lời dẫn: Nhà mình có ba bé, bé nào cũng có một sở thích riêng.\n'
                                            'lời dẫn (lồng tiếng) → mèo: [chui hộp] | Mèo nhà mình thích chui hộp lắm.\n'
                                            'cùng lúc (quay chó, cận): lời dẫn: Còn cún thì rủ chơi suốt ngày. | chó: [rủ chơi]\n'
                                            'cùng lúc: lời dẫn: Thỏ vui là nhảy tưng tưng. | thỏ: [nhảy vui]\n'
                                            'cùng lúc (quay thỏ và mẹ): lời dẫn: Cả nhà cùng vui. | thỏ: [nhảy vui] | mẹ: [vỗ tay]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('voiceover42a: script.py does not accept the voice-over syntax: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'voiceover42a.scene.json'), encoding='utf-8'))
        views = [e.get('view') for e in made['script'] if isinstance(e, dict) and 'together' in e]
        want = [{'on': ['meo'], 'size': 'close', 'alone': True}, {'on': ['cho'], 'size': 'close', 'alone': True}, {'on': ['tho'], 'size': 'close', 'alone': True}, {'on': ['tho', 'me'], 'size': 'medium'}]        # người + thú: cỡ trung, không "alone"
        if views != want: problems.append(f'voiceover42a: script.py views {views}, want {want}')
        if not any(c.get('narrator') for c in made['characters']): problems.append('voiceover42a: the narrator is not in the scene file')
        for n, c in enumerate([c for c in made['characters'] if not c.get('narrator') and c.get('species')]): c['x'] = -560 + 260 * n      # nửa trái phòng: cái TV bên phải không bị mép khung chạm khi cận con thú
        made['script'].pop()                                   # cảnh dựng thật chỉ có ba nhịp thú (người + thú cỡ trung: thú nhỏ hơn 35 % khung — acting_check)
        json.dump(made, open(os.path.join(work, 'voiceover42a.scene.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(os.path.join(work, 'voiceover42a.scene.json'), os.path.join(work, 'voiceover42a'))
        if done.returncode != 0: problems.append('voiceover42a: the scene does not build: ' + (done.stderr.strip() or done.stdout.strip())[-300:])
        else:
            html = open(os.path.join(work, 'voiceover42a', 'index.html'), encoding='utf-8').read()
            frames = re.findall(r'frameAt\([^;]*?\[([^\]]*)\], "(\w+)"', html)
            if len([f for f in frames if f[0] in ('meo', 'cho', 'tho') and f[1] == 'close']) < 3: problems.append(f'voiceover42a: the camera does not frame the pets during the voice-over: {frames}')
            if 'fill: 0.9 }' not in html: problems.append('voiceover42a: a pet alone in a voice-over close-up is not framed by the fill of its action (0.9 for the rabbit binky)')
            if any('loi_dan' in f[0] for f in frames) or 'set.place(loi_dan' in html or "host(\"loi_dan\")" in html: problems.append('voiceover42a: the off-screen narrator is placed or framed by the camera')
            if html.count('[loi_dan, [\'explain\'') < 4: problems.append('voiceover42a: the narrator lines are not all in the conversation')
            done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'voiceover42a')], capture_output=True, text=True)
            if done.returncode != 0 or 'loi_dan' in done.stdout: problems.append('voiceover42a: acting_check ' + ('measures the narrator: ' if 'loi_dan' in done.stdout else 'fails: ') + (done.stdout.strip() or done.stderr.strip())[-500:])
