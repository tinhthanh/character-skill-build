"""Đợt 35 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('clinic_tools35')
def clinic_tools35(work, problems):
    stage = STAGE
    TAG = scratch('clinic_tools35')
    # Đợt 35: dụng cụ & hồ sơ ở phòng khám — bác sĩ (cầm bìa hồ sơ, cất sẵn) đọc bệnh án, chỉ phim trên đèn đọc phim X-quang, băng
    # chân con chó trên bàn khám (cất bìa ở tay phía con chó trong lúc băng), đeo loa cho con mèo; băng và loa CÒN LẠI trên chúng.
    # Đo bằng tools/acting_check.py: tay tới chân / đầu, con vật thấy được, đồ đeo còn lại, bìa trước ngực, tay chỉ trúng điểm phim.
    care = {'id': 'care', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'kind': 'xray', 'name': 'phim', 'x': -330, 'z': -560}]}, 'characters': [
        {'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': -120, 'holds': 'clipboard', 'holdsHidden': True}, {'name': 'cho', 'species': 'corgi', 'z': -560, 'on': 'table', 'x': 200}],
        'script': [{'who': 'bac_si', 'do': [['readChart', 1.6]], 'view': 'medium'}, {'who': 'bac_si', 'do': [['showXray', 'phim', 1.4]], 'view': 'medium'},
                   {'who': 'bac_si', 'do': [['bandage', '@cho']]}, {'who': 'bac_si', 'do': [['putCone', '@cho']]}, {'who': 'cho', 'do': ['wagTail']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_care.json')
    try:
        json.dump(care, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'care'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('care: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care', 'index.html'), encoding='utf-8').read()
        for needle in ('VGCharacter.createProp(cutout', '"xray"', "['showXray', set.targetPoint(bac_si, [", 'cutout2Prop.spot.x', "set.target(bac_si, cho, 'leg')", '["putCone", set.target(bac_si, cho'):
            if needle not in html: problems.append(f'care: {needle!r} is not in the composition')
        checks = [m['check'] for m in json.load(open(os.path.join(work, 'care', 'moments.json'), encoding='utf-8')) if m.get('check')]
        kinds = sorted({(c['kind'], c.get('item', '')) for c in checks if c['kind'] in ('bandage', 'putCone', 'worn', 'readChart', 'showXray')})
        if kinds != [('bandage', ''), ('putCone', ''), ('readChart', ''), ('showXray', ''), ('worn', 'bandage'), ('worn', 'cone')]: problems.append(f'care: moments.json checks are {kinds}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'care')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('care: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        for needle in ('cho still wears the bandage', 'cho still wears the cone', 'readChart — clipboard up', 'showXray — points at the spot', 'bac_si bandage cho — hand reaches', 'bac_si putCone cho — hand reaches'):
            if needle not in done.stdout: problems.append(f'care: acting_check did not measure {needle!r}')


@case('clinic35')
def clinic35(work, problems):
    stage = STAGE
    TAG = scratch('clinic35')
    # Đợt 35: PHÒNG KHÁM — bác sĩ cân con chó (đặt lên cái cân "can" rồi bế về), đo nhiệt độ (con chó quay đuôi lại), cho uống thuốc
    # (con chó há miệng rồi nhai). acting_check: con chó đứng trên bệ cân lúc đọc số, tay tới nó lúc bế, lúc đo nhiệt, lúc đưa thuốc.
    care = {'id': 'care35', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'kind': 'scale', 'name': 'can', 'x': -120, 'z': -560, 'reading': '9.6 kg'}]},
            'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho'}, {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}],
            'script': [{'who': 'bac_si', 'do': [['weigh', '@cho', 'can']]}, {'who': 'bac_si', 'do': [['takeTemp', '@cho', 1.5, {'reading': '39.4°C'}]]},
                       {'who': 'bac_si', 'do': [['givePill', '@cho']]}, {'who': 'bac_si', 'do': [['look', '@cho'], ['idle', 1.2]]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_care35.json')
    try:
        json.dump(care, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'care35'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('care35: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care35', 'index.html'), encoding='utf-8').read()
        for needle in ('[\'weigh\', cho, set.targetPoint(bac_si, [-120, 27.3, -560]), { reading: "9.6 kg", display: cutout2Prop }]', '"scale", {"reading": "0.0 kg"}', 'set.target(bac_si, cho, "rear")', "[cho, ['face', \"right\"]]",
                       "['openMouth', 1.1], ['chew', 3]", 'set.target(bac_si, cho, "lips")', '["lookAt", set.target(bac_si, cho)]'):
            if needle not in html: problems.append(f'care35: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'care35')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('care35: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            # Lượt hai (đợt 35): con vật không tự nhảy chỗ suốt bước cân, mắt nhìn nhiệt kế lúc đọc, viên thuốc ở môi lúc miệng con vật há.
            for needle in ('bac_si weighs cho — cho on the scale', 'bac_si carry cho — hand reaches', 'bac_si takeTemp cho — hand reaches', 'bac_si givePill cho — hand reaches', 'cho in view at',
                           'bac_si weighs cho — cho never jumps', 'bac_si looks at the thermometer', 'bac_si givePill cho — pill at the mouth', 'bac_si givePill cho — mouth open for the pill',
                           # lượt ba: màn hình cân đồng bộ, đọc nhiệt kế ở góc cận (mặt quay, cúi, nhiệt kế sát mặt), viên thuốc / mặt / miệng đủ to trên khung
                           'the scale shows the weight only while cho is on it', 'bac_si turns to the thermometer held by the face', 'bac_si givePill cho — big enough on screen',
                           # lượt bốn: đầu đo chạm thân sau; hai tay trên đầu con vật
                           'bac_si takeTemp cho — the thermometer touches it', 'bac_si givePill cho — both hands on its head',
                           # đợt 36: HƯỚNG ĐẦU tới đích (`lookAt`) — nhiệt kế lúc đọc, mõm lúc cho thuốc, con vật trên cân
                           'bac_si look — head turned to the thermometer', 'bac_si pill — head turned to cho', 'bac_si weigh — head turned to the weight shown over the scale'):
                if needle not in done.stdout: problems.append(f'care35: acting_check did not measure "{needle}":\n' + done.stdout[-400:])


@case('pets35')
def pets35(work, problems):
    stage = STAGE
    TAG = scratch('pets35')
    # Đợt 35: thú chơi đùa trong phòng khách — chó lăn ngửa, đuổi đuôi, liếm tay bé (bé tự chìa tay, quỳ xuống), mèo được bế liếm mặt bé,
    # mèo nhào, thỏ gặm cà rốt, chó chạy nấp sau bé. acting_check đo từng động tác: trong khung, chân / lưng trên sàn, chân chổng
    # trời khi lăn, mõm tới tay / mặt, đầu ló ra mà thân khuất một phần.
    pets = {'id': 'pets35', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [{'name': 'be', 'id': 'boy', 'x': -150, 'z': -500}, {'name': 'cho', 'species': 'dog', 'x': -300, 'z': -500, 'faces': 'be'}, {'name': 'meo', 'species': 'cat', 'x': -70, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': 30, 'z': -600}], 'script': [{'who': 'cho', 'do': ['rollOver']}, {'who': 'cho', 'do': [['chaseTail', 2]]}, {'who': 'cho', 'do': [['lick', '@be', 4]]}, {'who': 'be', 'say': 'Mèo ơi lên đây.', 'do': [['carry', '@meo']], 'view': {'on': ['be', 'meo'], 'size': 'full'}}, {'who': 'meo', 'do': [['lick', '@be', 3]]}, {'who': 'tho', 'do': [['eatCarrot', 4]]}, {'who': 'tho', 'do': [['hide', '@be']], 'view': {'on': ['tho', 'be'], 'size': 'full'}}, {'who': 'be', 'say': 'Xuống chơi nhé.', 'do': ['putDown'], 'view': {'on': ['be', 'meo'], 'size': 'full'}}, {'who': 'meo', 'do': [['knead', 4]]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_pets35.json')
    try:
        json.dump(pets, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'pets35'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('pets35: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'pets35', 'index.html'), encoding='utf-8').read()
        if '"offerHand", set.target(be, cho, \'tongue\')' not in html: problems.append('pets35: the boy does not hold out a hand to the dog\'s tongue')
        if '{"face": true}' not in html or "['offerCheek'," not in html: problems.append('pets35: the carried cat is not told to lick the face, or the boy does not bend his cheek to it')
        if 'avoid: [], span:' not in html: problems.append('pets35: the pet actions are not given their own close-up (frameAt … avoid: [], span)')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'pets35')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('pets35: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('cho rollOver — back on the floor, paws up', 'cho chaseTail — paws on the floor', 'cho lick be — muzzle at the hand', 'meo lick be — muzzle at the face',
                           'meo knead — paws on the floor', 'tho eatCarrot — paws on the floor', 'tho hide — hides, head peeking out', 'be offerHand cho — hand reaches',
                           # đợt 35, lượt hai: vòng chạy đuổi đuôi, biên độ nhào, lưỡi chạm tay / má nhiều nhịp, người đứng chìa tay, không chạy xuyên chân
                           'cho chaseTail — runs round, turn after turn', 'meo knead — both front paws press up and down', 'cho lick be — tongue reaches the hand, lick after lick',
                           'meo lick be — tongue reaches the face, lick after lick', 'be kneels to hold out a hand — knees on the floor', 'cho lick — stands on all fours', 'be\'s hand stays off cho\'s face', 'tho hide — goes behind, not through, anyone',
                           # đợt 35, lượt ba: góc cận con vật ≥ 35 % khung, con vật trong khung suốt lúc bế / đặt xuống
                           'cho rollOver — big enough in the frame', 'cho chaseTail — big enough in the frame', 'meo knead — big enough in the frame',
                           'tho eatCarrot — big enough in the frame', 'tho eatCarrot — the carrot gets shorter bite by bite', 'be carry meo — the pet stays in the frame', 'be putDown meo — the pet stays in the frame'):
                if needle not in done.stdout: problems.append(f'pets35: acting_check did not measure {needle!r}')
