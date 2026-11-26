"""Đợt 37 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('combo37')
def combo37(work, problems):
    stage = STAGE
    TAG = scratch('combo37')
    # ĐỢT 37 — COMBO (runtime/combos.js): mỗi bước của combo thành một lượt riêng; lời của lượt nói trước combo; bước có "with" chạy
    # `together` với con vật; trả thú cho chủ sau khi cân (mỗi lần bế một `omSlot` — trước đây lần bế sau ghi đè lần cân).
    combo = {'id': 'combo37', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'kind': 'scale', 'name': 'can', 'x': -120, 'z': -560, 'reading': '9.6 kg'}]},
             'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho', 'holds': 'syringe', 'holdsHidden': True},
                            {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'be', 'id': 'boy', 'x': -480, 'z': -560, 'faces': 'bac_si'}],
             'script': [{'who': 'be', 'do': ['waitingImpatient']}, {'who': 'bac_si', 'do': ['greetCustomer']},
                        {'who': 'bac_si', 'say': 'Mình tiêm phòng cho bé nhé.', 'do': [['vaccinationVisit', '@cho', 'can']]},
                        {'who': 'be', 'do': ['goodNews']}, {'who': 'bac_si', 'do': [['dischargePet', '@cho', '@be']]}, {'who': 'be', 'do': ['badNews']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_combo37.json')
    try:
        json.dump(combo, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'combo37'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('combo37: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'combo37', 'index.html'), encoding='utf-8').read()
        for needle in ('[be, "checkWatch"]', '[be, "lookAround"]', '[be, ["crossArms", 1.6]]', '[bac_si, "wave"]', '[bac_si, "bow"]', '[bac_si, "introduce"]',
                       "[bac_si, ['explain', \"Mình tiêm phòng cho bé nhé.\"", "['weigh', cho, set.targetPoint(bac_si, [-120", '[bac_si, ["inject", set.target(bac_si, cho, \'body\')]]',
                       '[bac_si, "hideItem"]', '[bac_si, ["giveTreat", set.target(bac_si, cho)]]', '[bac_si, "thumbsUp"]', '[be, "relief"]', '[be, "cheer"]',
                       '[bac_si, ["carry", cho]]', '{ together: [[bac_si, ["handOverPet", be]], [be, ["takePet", bac_si', '[bac_si, ["countFingers", 3]]', '[be, "worry"]'):
            if needle not in html: problems.append(f'combo37: {needle} is not in the composition')
        if 'vaccinationVisit' in html or 'dischargePet' in html: problems.append('combo37: a combo name was left in the composition instead of its steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'combo37')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('combo37: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('bac_si weighs cho — cho on the scale', 'bac_si weighs cho — cho never jumps', 'bac_si inject cho — hand reaches', 'bac_si carry cho — hand reaches'):
                if needle not in done.stdout: problems.append(f'combo37: acting_check did not measure "{needle}"')
    # Khám tổng quát: soi răng chạy `together` với con vật há miệng; bìa hồ sơ đọc cuối.
    # Lượt hai: có người thứ ba (cậu bé nghe), bác sĩ đứng nghiêng về con chó — đọc bệnh án phải cúi nhìn tấm bìa (trước: tia lệch 59 %),
    # gật rõ với người nghe thấp (trước: giữa hai lần gật vẫn cúi 12°), soi tai / răng không che đầu con chó (trước: 54–59 %) và đầu cúi về nó.
    checkup = {'id': 'checkup37', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho', 'holds': 'clipboard', 'holdsHidden': True},
               {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}, {'name': 'be', 'id': 'boy', 'x': -260, 'z': -560, 'faces': 'bac_si'}],
               'script': [{'who': 'bac_si', 'say': 'Mình khám tổng quát cho bé nhé.', 'do': [['fullCheckup', '@cho'], 'nod'], 'exit': 'left'}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_checkup37.json')
    try:
        json.dump(checkup, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'checkup37'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('checkup37: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'checkup37', 'index.html'), encoding='utf-8').read()
        for needle in ('[bac_si, ["listen", set.target(bac_si, cho, \'body\')]]', '[bac_si, ["examine", set.target(bac_si, cho), "ears"]]',
                       '{ together: [[bac_si, ["examine", set.target(bac_si, cho), "teeth"]], [cho, ["openMouth", 2.2]]] }', 'set.target(bac_si, cho, "rear")',
                       "[bac_si, ['readChart'", '[bac_si, "nod", [\'exit\''):
            if needle not in html: problems.append(f'checkup37: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'checkup37')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('checkup37: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        else:
            for needle in ('bac_si examine — head turned to cho\'s head', 'bac_si readChart — head turned to the clipboard', 'bac_si looks up from the chart, then nods twice',
                           'bac_si takeTemp cho — hand reaches', 'cho in view at'):
                if needle not in done.stdout: problems.append(f'checkup37: acting_check did not measure "{needle}"')
    # Combo sai chỗ / thiếu đích: bị từ chối với một câu nói rõ.
    for name, script, needle in [('in together', [{'together': [{'who': 'bac_si', 'do': ['greetCustomer']}, {'who': 'cho', 'do': ['wagTail']}]}], 'cannot be inside "together"'),
                                 ('no pet', [{'who': 'bac_si', 'do': ['fullCheckup']}], 'needs pet'),
                                 ('too many', [{'who': 'bac_si', 'do': [['goodNews', '@cho']]}], 'takes 0 argument')]:
        bad = dict(checkup, id='bad37', script=script)
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad37.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad37'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'combo ({name}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "khám tổng quát", "tiêm phòng" (tự có ống tiêm + cái cân), "trả thú" với hai đích, "[chào khách]".
    text = os.path.join(work, 'combo37.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · bé trai (boy) · chó (corgi, trên bàn)\n\nbác sĩ: [chào khách]\nbác sĩ → chó: tiêm phòng\n'
                                            'bé trai: [tin vui]\nbác sĩ → chó → bé trai: trả thú\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py combos: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'combo37.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        vet = next((c for c in made['characters'] if c.get('id') == 'vet'), {})
        want = ['wave', 'bow', 'introduce', ['weigh', '@cho', 'can'], ['inject', '@cho'], 'hideItem', ['giveTreat', '@cho'], 'thumbsUp', 'relief', 'thumbsUp', 'cheer',
                ['carry', '@cho'], ['handOverPet', '@be_trai'], ['countFingers', 3], 'wave']
        if steps != want: problems.append(f'script.py combos: steps {steps}, want {want}')
        if vet.get('holds') != 'syringe' or not any(c.get('kind') == 'scale' for c in made['set'].get('cutouts', [])): problems.append('script.py combos: "tiêm phòng" did not give the vet a syringe and a scale')
