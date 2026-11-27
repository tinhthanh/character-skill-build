"""Đợt 41 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('combo41', parts=('groom41', 'vacc41', 'desk41', 'far41', 'home41', 'words'))
def combo41(work, problems, part):
    stage = STAGE
    TAG = scratch('combo41')
    # ĐỢT 41 — COMBO CHO ĐỢT 38–40: chăm sóc tổng hợp + chuẩn bị khám; tiêm có y tá giữ; thanh toán tại quầy; tiễn khách + ăn mừng cùng bé
    # + chó / mèo / thỏ. Mỗi cảnh phải qua acting_check, composition không còn tên combo; chữ: "chuẩn bị khám", "chó vui"… ra đúng bước.
    bag41 = {'name': 'bac_si', 'id': 'vet', 'x': -150, 'z': -560, 'faces': 'be'}
    combo41 = {
        'groom41': ({'preset': 'exam'}, [dict(name='bac_si', id='vet', x=40, z=-560, faces='cho'), dict(name='cho', species='dog', on='table', x=200, z=-560, faces='bac_si')],
                    [{'who': 'bac_si', 'do': [['groomingSession', '@cho']]}, {'who': 'bac_si', 'do': ['prepForExam']}], ('"clipNails"', '"eyeDrops"', '"cleanEars"', '"putOnGloves"')),
        'vacc41': ({'preset': 'exam'}, [dict(name='bac_si', id='vet', x=330, z=-560, faces='cho', holds={'L': 'syringe'}, holdsHidden=True), dict(name='cho', species='corgi', on='table', x=170, z=-560, faces='bac_si'),
                                        dict(name='y_ta', id='nurse', x=20, z=-560, faces='cho')],
                   [{'who': 'bac_si', 'do': [['assistedVaccination', '@cho', '@y_ta']]}], ('"inject"', "[y_ta, ['restrain'", '"takeOffGloves"', '"giveTreat"')),
        'desk41': ({'preset': 'reception'}, [dict(name='clerk', id='receptionist', x=-260, z=-380, faces='granny', holds={'R': 'cash', 'L': 'stampcard'}, holdsHidden=True),
                                             dict(name='granny', id='granny', x=200, z=-380, faces='clerk', holds='phone')],
                   [{'who': 'clerk', 'do': [['checkoutCounter', '@granny']]}], ('"payByQR"', '"giveChange"', 'stampCard')),
        'far41': ({'preset': 'exam'}, [dict(name='bac_si', id='vet', x=-100, z=-560, faces='granny', holds='bag'), dict(name='granny', id='granny', x=150, z=-560, faces='bac_si')],
                  [{'who': 'bac_si', 'do': [['farewellOwner', '@granny']]}], ('"handOverBag"', '"patShoulder"')),
        'home41': ({'preset': 'living-room'}, [bag41, dict(name='be', id='boy', x=-20, z=-560, faces='bac_si'), dict(name='cho', species='corgi', x=300, z=-560),
                                               dict(name='meo', species='cat', x=-480, z=-560), dict(name='tho', species='rabbit', x=560, z=-560)],
                   [{'who': 'bac_si', 'do': [['celebrateWithKid', '@be']]}, {'who': 'cho', 'do': ['happyDog']},
                    {'who': 'meo', 'do': ['cozyCat']}, {'who': 'tho', 'do': ['happyBunny']}], ('"highFive"', '"playBow"', '"groomFace"', '"binky"'))}
    for name, (stage_set, cast, turns, needles) in combo41.items():
        if name != part: continue                          # mỗi cảnh là một trường hợp riêng (đợt 47)
        scene41 = {'id': name, 'camera': 'auto', 'set': stage_set, 'characters': cast, 'script': turns}
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name}.json')
        try:
            json.dump(scene41, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in needles:
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        for combo_name in ('groomingSession', 'prepForExam', 'assistedVaccination', 'checkoutCounter', 'farewellOwner', 'celebrateWithKid', 'happyDog', 'cozyCat', 'happyBunny'):
            if combo_name in html: problems.append(f'{name}: combo name {combo_name} was left in the composition instead of its steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
    if part == 'words':
        text = os.path.join(work, 'combo41.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · chó (corgi, trên bàn) · y tá (nurse)\n\nbác sĩ: [chuẩn bị khám]\nbác sĩ → chó: chăm sóc tổng hợp\nchó: [chó vui]\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append('script.py combos 41: ' + (done.stderr or done.stdout).strip()[-300:])
        else:
            made = json.load(open(os.path.join(work, 'combo41.scene.json'), encoding='utf-8'))
            steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
            want = [['washHands', 2], 'putOnGloves', ['clipNails', '@cho'], ['eyeDrops', '@cho'], ['cleanEars', '@cho'], 'thumbsUp', ['playBow', 1.2], 'wagTail', ['carryToy', 120]]
            if steps != want: problems.append(f'script.py combos 41: steps {steps}, want {want}')
