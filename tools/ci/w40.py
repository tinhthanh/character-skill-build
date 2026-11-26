"""Đợt 40 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('clinic40c')
def clinic40c(work, problems):
    stage = STAGE
    TAG = scratch('clinic40c')
    # ĐỢT 40 C — THÚ Ở PHÒNG KHÁM. clinic40 (phòng khám): chó trên bàn sợ run, được bác sĩ bế và vùng vẫy trong tay (hai tay bác sĩ lắc theo), lừ đừ sau thuốc
    # mê, được đeo loa rồi cào vành loa. living40 (phòng khách): mèo trong tay bé liếm má, thỏ gặm cà rốt (củ to, ngắn dần, đoạn cuối giữ rồi mới hết). Mỗi cái đo
    # bằng tools/acting_check.py; ngoài ra `pawAtCone` không đeo loa thì bị từ chối bằng một câu rõ.
    clinic = {'id': 'clinic40', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [{'name': 'bac_si', 'id': 'vet', 'x': -300, 'z': -560, 'faces': 'cho'}, {'name': 'cho', 'species': 'dog', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}],
              'script': [{'who': 'cho', 'do': [['shiverAtVet', 2.2]]}, {'who': 'bac_si', 'do': [['carry', '@cho']]}, {'who': 'cho', 'do': [['struggle', 1.8]]}, {'who': 'bac_si', 'do': ['putDown']},
                         {'who': 'cho', 'do': [['groggy', 2.4]]}, {'who': 'bac_si', 'do': [['putCone', '@cho']]}, {'who': 'cho', 'do': [['pawAtCone', 3]]}]}
    living40 = {'id': 'living40', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'be', 'id': 'boy', 'x': -150, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -300, 'z': -500, 'faces': 'be'}, {'name': 'meo', 'species': 'cat', 'x': -70, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': 30, 'z': -600}],
                'script': [{'who': 'be', 'say': 'Cả nhà chơi nhé.', 'dur': 1.8}, {'who': 'cho', 'do': [['lick', '@be', 4]]}, {'who': 'be', 'say': 'Mèo ơi lên đây.', 'do': [['carry', '@meo']], 'view': {'on': ['be', 'meo'], 'size': 'full'}}, {'who': 'meo', 'do': [['lick', '@be', 3]]}, {'who': 'tho', 'do': [['eatCarrot', 4]]}]}
    for scene40, needles40 in ((clinic, ('cho shiverAtVet — crouches low and holds it', 'cho shiverAtVet — the whole body shivers', 'cho shiverAtVet — big enough in the frame', 'cho struggle — writhes, the head turns from side to side',
                                         "cho struggle — stays in bac_si's arms", 'cho struggle — bac_si holds on, the hands shake with it', 'cho groggy — the head droops and stays down', 'cho groggy — sways',
                                         'cho pawAtCone — a front paw at the cone edge', 'cho pawAtCone — gives up and sits', 'cho pawAtCone — big enough in the frame')),
                               (living40, ('cho lick be — the tongue is big on screen and rests on the hand', 'meo lick be — the tongue is big on screen and rests on the cheek', 'tho eatCarrot — a big carrot',
                                           'tho eatCarrot — every bite stays visible, the last bit is held then eaten'))):
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_' + scene40['id'] + '.json')
        try:
            json.dump(scene40, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, scene40['id']))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f"{scene40['id']}: the scene does not build: " + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, scene40['id'], 'index.html'), encoding='utf-8').read()
        if scene40 is clinic and '{"carried": true}' not in html: problems.append('clinic40: the struggling dog in the vet\'s arms is not told it is carried ({ carried: true })')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, scene40['id'])], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f"{scene40['id']}: " + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in needles40:
                if needle not in done.stdout: problems.append(f"{scene40['id']}: acting_check did not measure {needle!r}")
    bare = {'id': 'bare40', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [{'name': 'cho', 'species': 'dog', 'on': 'table', 'x': 0, 'z': -560}], 'script': [{'who': 'cho', 'do': [['pawAtCone', 2]]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bare40.json')
    try:
        json.dump(bare, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'bare40'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode == 0 or 'not wearing the cone' not in (done.stderr + done.stdout): problems.append('bare40: pawAtCone without a cone should fail with "not wearing the cone": ' + (done.stderr + done.stdout).strip()[-200:])


@case('pets40b')
def pets40b(work, problems):
    stage = STAGE
    TAG = scratch('pets40b')
    # ĐỢT 40 B — mèo & thỏ trong phòng khách: rửa mặt, nằm ổ bánh mì, chớp mắt chậm, vờn cuộn len, cong lưng dựng lông, chui hộp; nhảy vui, nằm vật,
    # giật mũi (cận cảnh), đứng hai chân. acting_check đo từng động tác (chân chạm mặt, dáng thấp giữ ≥ 1 s, mắt nhắm liền, cuộn len lăn xa,
    # lưng cao hơn, đầu thò khỏi hộp, rời sàn + vặn mình, mũi giật nhiều nhịp); dựng sai loài (chó rửa mặt) phải bị từ chối.
    pets40 = {"id": "pets40b", "camera": "auto", "set": {"preset": "living-room"}, "characters": [{"name": "be", "id": "girl", "x": -150, "z": -500}, {"name": "cho", "species": "dog", "x": -300, "z": -500, "faces": "be"}, {"name": "meo", "species": "cat", "x": -70, "z": -500}, {"name": "tho", "species": "rabbit", "x": -230, "z": -600}], "script": [{"who": "be", "say": "Xem mèo và thỏ nhé."}, {"who": "meo", "do": [["groomFace", 3]]}, {"who": "meo", "do": [["loaf", 2]]}, {"who": "meo", "do": [["slowBlink", 2]]}, {"who": "meo", "do": [["batToy", 3]]}, {"who": "meo", "do": [["archBack", 1.4]]}, {"who": "meo", "do": [["sitInBox", 2]]}, {"who": "tho", "do": [["binky", 2]]}, {"who": "tho", "do": ["flop"]}, {"who": "tho", "do": [["noseTwitch", 1.6]]}, {"who": "tho", "do": ["standUp"]}, {"who": "tho", "do": [["periscope", 1.6]]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_pets40b.json')
    try:
        json.dump(pets40, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'pets40b'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('pets40b: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'pets40b')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('pets40b: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('meo groomFace — the paw wipes over the face, stroke after stroke', 'meo loaf — a low, compact shape, held', 'meo slowBlink — eyes close slowly and stay shut',
                           'meo batToy — the toy bounces away', 'meo archBack — back arched, fur puffed up, held', 'meo sitInBox — head and ears out of the box, held',
                           'tho binky — jumps clear of the floor with a twist', 'tho flop — a low, compact shape, held', 'tho noseTwitch — the nose twitches fast',
                           'tho periscope — stands up on the hind legs, front paws off the floor, held',
                           'meo loaf — big enough in the frame', 'meo batToy — big enough in the frame', 'meo archBack — big enough in the frame', 'tho binky — big enough in the frame',
                           'tho noseTwitch — big enough in the frame', 'tho periscope — big enough in the frame'):
                if needle not in done.stdout: problems.append(f'pets40b: acting_check did not measure {needle!r}')
    wrong = {'id': 'pets40b2', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'cho', 'species': 'dog', 'x': -100, 'z': -500}], 'script': [{'who': 'cho', 'do': ['groomFace']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_pets40b2.json')
    try:
        json.dump(wrong, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'pets40b2'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode == 0: problems.append('pets40b: a dog washing its face (a cat action) was not refused')


@case('dogs40a')
def dogs40a(work, problems):
    stage = STAGE
    TAG = scratch('dogs40a')
    # ĐỢT 40 A — sáu động tác của chó: chổng mông rủ chơi, tru, đào đất, tha đồ chơi (dây thừng / xương, tới người), dựa chân người, kéo co (người `pullToy` cùng lúc,
    # tools/scene.py tự thêm và đưa con chó tới cách người một sợi dây). pets40a: phòng khách, bé trai và con chó; pets40b: công viên, bác sĩ và husky. acting_check đo
    # dáng, đồ chơi trong mõm, chân áp vào chân người, sợi dây căng giữa mõm và bàn tay.
    pets40 = {'pets40a': {'id': 'pets40a', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'be', 'id': 'boy', 'x': -150, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -330, 'z': -500, 'faces': 'be'}],
                        'script': [{'who': 'cho', 'do': [['playBow', 1.4]]}, {'who': 'cho', 'do': [['howl', 1.8]]}, {'who': 'cho', 'do': [['dig', 5]]}, {'who': 'cho', 'do': [['carryToy', 90, {'kind': 'rope'}]]},
                                   {'who': 'cho', 'do': [['carryToy', '@be', {'kind': 'bone'}]]}, {'who': 'cho', 'do': [['leanOnLeg', '@be', 2]]}, {'who': 'cho', 'do': [['tugOfWar', '@be', 2.4]]}]},
               'pets40a_park': {'id': 'pets40a-park', 'camera': 'auto', 'set': {'preset': 'park'}, 'characters': [{'name': 'vet', 'id': 'vet', 'x': 0, 'z': -500}, {'name': 'husky', 'species': 'husky', 'x': -300, 'z': -500, 'faces': 'vet'}],
                        'script': [{'who': 'husky', 'do': [['playBow', 1.2]]}, {'who': 'husky', 'do': [['leanOnLeg', '@vet', 2]]}, {'who': 'husky', 'do': [['tugOfWar', '@vet', 2.4]]}, {'who': 'husky', 'do': [['howl', 1.6]]}]}}
    for key, scene in pets40.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{key}.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, key))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{key}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, key, 'index.html'), encoding='utf-8').read()
        if "{ together: [[" + scene['script'][-1 if key == 'pets40a' else 2]['who'] + ", [\"tugOfWar\"" not in html or "['pullToy'," not in html: problems.append(f'{key}: the person is not given the other end of the rope (pullToy together with tugOfWar)')
        if "goes a rope's length" not in html: problems.append(f'{key}: the dog is not walked a rope\'s length from the person before the tug')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, key)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{key}: ' + (done.stdout.strip() or done.stderr.strip())[-600:]); continue
        who = 'cho' if key == 'pets40a' else 'husky'; person = 'be' if key == 'pets40a' else 'vet'
        for needle in (f'{who} playBow — chest low, rump up', f'{who} playBow — pose held', f'{who} howl — sitting, head back, mouth an O, eyes shut', f'{who} howl — sound lines rising', f'{who} howl — howl held',
                       f'{who} leanOnLeg {person} — side against the leg', f'{who} leanOnLeg {person} — leaning, looking up, eyes half shut', f'{who} leanOnLeg {person} — feet planted',
                       f'{who} tugOfWar {person} — rope drawn', f'{who} tugOfWar {person} — rope ends at the mouth', f'{who} tugOfWar {person} — rope starts at the hand', f'{who} tugOfWar {person} — rope taut, a sensible length',
                       f'{who} tugOfWar {person} — rope held in the mouth', f'{who} tugOfWar {person} — shakes its head', f'{who} tugOfWar {person} — feet planted',
                       f'{who} playBow — big enough in the frame', f'{who} howl — big enough in the frame', f'{who} tugOfWar — big enough in the frame')\
                + ((f'{who} dig — tn paw scrapes', f'{who} dig — dirt flying', f'{who} carryToy — toy in its mouth', f'{who} carryToy {person} — toy dropped at their feet') if key == 'pets40a' else ()):
            if needle not in done.stdout: problems.append(f'{key}: acting_check did not measure {needle!r}')
