"""Đợt 39 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('presenter39c')
def presenter39c(work, problems):
    stage = STAGE
    TAG = scratch('presenter39c')
    # ĐỢT 39 C — NGƯỜI DẪN, khung DỌC 1080 × 1920, phố: bác sĩ giơ bảng "Giảm 20%" (bảng hẹp, trong khung dọc), ra dấu "to cỡ này", ngáp vươn vai;
    # cậu bé chụp ảnh tự sướng cùng con chó (nó nghiêng đầu) rồi cùng bác sĩ (bác sĩ bước lại, nghiêng đầu, chữ V). acting_check: bảng
    # trong khung, chữ ≥ 3 % chiều cao, trước ngực; khe giữa hai tay; máy ngang đầu, chớp sáng, người / con vật chụp cùng trong khung; tay qua đầu.
    talk39 = {'id': 'talk39', 'width': 1080, 'height': 1920, 'camera': 'auto', 'set': {'preset': 'street'}, 'characters': [
        {'name': 'boy', 'id': 'boy', 'x': -250, 'z': -560, 'holds': 'phone', 'holdsHidden': True}, {'name': 'dog', 'species': 'corgi', 'x': 120, 'z': -560},
        {'name': 'vet', 'id': 'vet', 'x': 320, 'z': -560}],
        'script': [{'who': 'boy', 'do': [['takeSelfie', 1.6, {'with': '@dog'}]]}, {'who': 'vet', 'do': [['holdSign', 'Giảm 20%', 2]]},
                   {'who': 'vet', 'do': [['showSize', 'big']]}, {'who': 'vet', 'do': ['yawnStretch']}, {'who': 'boy', 'do': [['takeSelfie', 1.6, {'with': '@vet'}]]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_talk39.json')
    try:
        json.dump(talk39, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'talk39'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('talk39: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'talk39', 'index.html'), encoding='utf-8').read()
        for needle in ('{ together: [[boy, [\'takeSelfie\', 1.6, { with: dog }]], [dog, [\'tiltHead\']]] }', "[\"holdSign\", \"Giảm 20%\", 2, {\"narrow\": true}]", '["showSize", "big", 1.4, {"narrow": true}]',
                       '{ together: [[boy, [\'takeSelfie\', 1.6, { with: vet }]], [vet, [\'joinSelfie\', boy, 1.6]]] }'):
            if needle not in html: problems.append(f'talk39: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'talk39')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('talk39: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        for needle in ('vet holdSign — the sign, whole in the frame, text big enough', 'vet holdSign — the sign in front of the chest', 'vet showSize — two hands apart by the size',
                       'boy takeSelfie — the phone up high at arm', 'boy takeSelfie — the flash at the shot', 'boy takeSelfie — dog in the shot beside them',
                       'boy takeSelfie — vet in the shot beside them', 'vet yawnStretch — both arms up over the head'):
            if needle not in done.stdout: problems.append(f'talk39: acting_check did not measure "{needle}"')
    # Người dẫn dùng sai cách: bị từ chối với một câu nói rõ.
    base39 = {'id': 'bad39', 'set': {'preset': 'street'}, 'characters': [{'name': 'vet', 'id': 'vet', 'x': 0, 'z': -560}, {'name': 'dog', 'species': 'corgi', 'x': 300, 'z': -560}], 'script': []}
    for label, steps, who, needle in [('a sign without text', [['holdSign']], 'vet', 'needs the text of the sign'), ('a sign with 4 lines', [['holdSign', ['a', 'b', 'c', 'd']]], 'vet', 'needs the text of the sign'),
                                      ('a size that is not a size', [['showSize', 'huge']], 'vet', '"small", "medium", "big"'), ('a selfie without a phone', [['takeSelfie']], 'vet', 'needs a phone'),
                                      ('a pet holding a sign', [['holdSign', 'Hi']], 'dog', 'done by a person'), ('a selfie with nobody', [['takeSelfie', 1.6, {'with': '@ghost'}]], 'vet', '"with"')]:
        bad = json.loads(json.dumps(base39)); bad['script'] = [{'who': who, 'do': steps}]
        if 'nobody' in label: bad['characters'][0]['holds'] = 'phone'
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad39.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad39'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'presenter actions ({label}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ (đợt 39 C): "giơ bảng: chữ", "to cỡ này", "selfie", "ngáp" (người: ngáp vươn vai; thú: vẫn là `yawn`), "bác sĩ → bé trai: selfie".
    text = os.path.join(work, 'talk39.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: đường phố · khung: dọc\nbác sĩ (vet) · bé trai (boy) · chó (corgi)\n\nbác sĩ: [giơ bảng: Giảm 20% | tiêm phòng, vẫy tay]\nbác sĩ: [to cỡ này]\n'
                                            'bác sĩ: [nhỏ cỡ này, ngáp]\nchó: [ngáp, vươn vai]\nbác sĩ → bé trai: selfie\nbé trai: [chụp ảnh tự sướng]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py presenter actions: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'talk39.scene.json'), encoding='utf-8'))
        steps = [t['do'] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = [[['holdSign', 'Giảm 20% | tiêm phòng'], 'wave'], [['showSize', 'big']], [['showSize', 'small'], ['yawnStretch']], ['yawn', 'stretch'],
                [['takeSelfie', 1.6, {'with': '@be_trai'}]], [['takeSelfie']]]
        if steps != want: problems.append(f'script.py presenter actions: steps {steps}, want {want}')
        vet = next((c for c in made['characters'] if c.get('id') == 'vet'), {})
        if vet.get('holds') != 'phone' or not vet.get('holdsHidden'): problems.append('script.py presenter actions: "selfie" did not give the vet a put-away phone')
    for label, line, needle in [('a sign without text', 'bác sĩ: [giơ bảng]', 'cần chữ'), ('a pet with a sign', 'chó: [giơ bảng: Hi]', 'chỉ dành cho người')]:
        open(text, 'w', encoding='utf-8').write('bối cảnh: đường phố\nbác sĩ (vet) · chó (corgi)\n\n' + line + '\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'script.py presenter actions ({label}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')


@case('gestures39b')
def gestures39b(work, problems):
    # Đợt 39 B: sáu cử chỉ thường ngày (cười lớn, lau nước mắt, ôm trán, suỵt, ra dấu OK, chào) — bàn tay trong khung, ngón ở môi, tay ở
    # mắt / chân mày, vòng OK cạnh mặt, đầu + vai chuyển động (acting_check `check_everyday_gesture`). Viết bằng kịch bản tiếng Việt.
    g39 = os.path.join(work, 'g39.txt')
    open(g39, 'w', encoding='utf-8').write('bối cảnh: đường phố\nbác sĩ (vet)\nbé (boy)\nbác sĩ: [cười lớn]\nbé: [lau nước mắt]\nbác sĩ: [ôm trán]\nbé: [suỵt]\nbác sĩ: [ra dấu ok]\nbé: [giơ tay chào]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), g39, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('gesture39: script.py: ' + (done.stderr.strip() or done.stdout.strip())[-300:])
    else:
        want = ['laugh', 'wipeTears', 'facepalm', 'shush', 'okSign', 'salute']
        got = [step for turn in json.load(open(os.path.join(work, 'g39.scene.json'), encoding='utf-8'))['script'] for step in turn.get('do', [])]
        if got != want or any('mood' in turn for turn in json.load(open(os.path.join(work, 'g39.scene.json'), encoding='utf-8'))['script']): problems.append(f'gesture39: script.py gave {got}, want {want} and no mood')
        else:
            done = build(os.path.join(work, 'g39.scene.json'), os.path.join(work, 'g39'))
            if done.returncode != 0: problems.append('gesture39: the scene does not build: ' + done.stderr.strip()[:300])
            else:
                done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'g39')], capture_output=True, text=True)
                if done.returncode != 0: problems.append('gesture39: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
                elif not all(text in done.stdout for text in ('the index finger at the lips', 'the palm over the eyes', 'the flat hand at the brow', 'the OK circle beside the face', 'the hand at the eye', 'head and shoulders move with the laugh')):
                    problems.append('gesture39: acting_check did not measure the six gestures:\n' + done.stdout[-400:])


@case('desk39a')
def desk39a(work, problems):
    stage = STAGE
    TAG = scratch('desk39a')
    # ĐỢT 39 A — QUẦY THU NGÂN & QUẦY CÀ PHÊ. desk39a (quầy lễ tân): bà quét mã QR trên đế thanh toán (đế tự đặt lên mặt quầy), thu ngân thối tiền (đếm từng
    # tờ, bà nhận xấp tiền), đóng dấu thẻ của mình, lau quầy. desk39b (nhà thuốc / quầy cà phê): đóng dấu thẻ rồi ĐƯA cho khách (khách nhận thẻ có dấu), rót nước
    # vào cốc rồi đưa cốc đầy. desk39c: cậu bé quẹt thẻ ngân hàng. Mỗi cái đo bằng tools/acting_check.py (`desk39`); gọi sai thì bị từ chối bằng một câu rõ.
    desk_scenes = {'desk39a': {'id': 'desk39a', 'camera': 'auto', 'set': {'preset': 'reception'}, 'characters': [{'name': 'clerk', 'id': 'receptionist', 'x': -260, 'z': -380, 'faces': 'granny', 'holds': {'R': 'cash', 'L': 'stampcard'}, 'holdsHidden': True}, {'name': 'granny', 'id': 'granny', 'x': 200, 'z': -380, 'faces': 'clerk', 'holds': 'phone'}], 'script': [{'who': 'clerk', 'say': 'That will be two hundred thousand.', 'dur': 1.8}, {'who': 'granny', 'do': [['payByQR']]}, {'who': 'clerk', 'do': [['giveChange', '@granny']]}, {'who': 'granny', 'say': 'Thank you.', 'dur': 1.2}, {'who': 'clerk', 'do': ['stampCard']}, {'who': 'clerk', 'do': [['wipeCounter', 2]]}]},
                   'desk39b': {'id': 'desk39b', 'camera': 'auto', 'set': {'preset': 'pharmacy'}, 'characters': [{'name': 'barista', 'id': 'receptionist', 'x': -120, 'z': -380, 'faces': 'guest', 'holds': {'R': {'kind': 'cup', 'open': True}, 'L': 'stampcard'}, 'holdsHidden': True}, {'name': 'guest', 'id': 'granny', 'x': 150, 'z': -380, 'faces': 'barista', 'holds': {'R': {'kind': 'stampcard', 'stamped': True}, 'L': {'kind': 'cup', 'open': True, 'full': True}}, 'holdsHidden': True}], 'script': [{'who': 'barista', 'do': [['stampCard', '@guest']]}, {'who': 'barista', 'do': ['pourDrink']}, {'who': 'barista', 'do': [['handOver', '@guest']]}, {'who': 'guest', 'say': 'Lovely, thank you.', 'dur': 1.4}]},
                   'desk39c': {'id': 'desk39c', 'camera': 'auto', 'set': {'preset': 'reception'}, 'characters': [{'name': 'clerk', 'id': 'receptionist', 'x': -260, 'z': -380, 'faces': 'boy'}, {'name': 'boy', 'id': 'boy', 'x': 300, 'z': -380, 'faces': 'clerk', 'holds': 'card'}], 'script': [{'who': 'clerk', 'say': 'Card or cash?', 'dur': 1.4}, {'who': 'boy', 'do': [['payByCard']]}]}}
    desk_needles = {'desk39a': ('["payByQR", set.targetPoint(granny, [', '"paystand"', '{ together: [[clerk, ["giveChange", granny, { top: set.targetPoint(clerk, [', '[granny, ["takeChange", clerk]]', "['stampCard', null, { top: set.targetPoint(clerk, [", "['wipeCounter', 2, set.targetPoint(clerk, ["),
                    'desk39b': ('{ together: [[barista, ["stampCard", guest, { top: set.targetPoint(barista, [', '[guest, ["takeCard", barista]]', "['pourDrink', { top: set.targetPoint(barista, [", '{ together: [[barista, ["handOver", guest]], [guest, ["take", barista]]] }'),
                    'desk39c': ('["payByCard", set.targetPoint(boy, [',)}
    desk_measures = {'desk39a': ('granny payByQR — the phone is held to the QR code', 'granny payByQR — the green tick shows on it', 'clerk giveChange — a note passes from one hand to the other',
                              'clerk giveChange — the notes appear one by one', 'clerk giveChange — the notes pass to granny', 'clerk stampCard — the stamp is pressed on the card',
                              'clerk stampCard — the press is held still', 'clerk stampCard — a red mark stays on the card', 'clerk wipeCounter — the cloth sweeps across the counter'),
                     'desk39b': ('barista stampCard — the stamp is pressed on the card', 'barista stampCard — a red mark stays on the card', 'barista pourDrink — the stream falls into the cup',
                              'barista pourDrink — the level rises', 'barista pourDrink — the full cup is still in hand'),
                     'desk39c': ('boy payByCard — the card taps the reader', 'boy payByCard — the green tick shows on it')}
    for name, scene in desk_scenes.items():
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{name}.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{name}: the scene does not build: ' + done.stderr.strip()[:300]); continue
        html = open(os.path.join(work, name, 'index.html'), encoding='utf-8').read()
        for needle in desk_needles[name]:
            if needle not in html: problems.append(f'{name}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, name)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{name}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        else:
            for needle in desk_measures[name]:
                if needle not in done.stdout: problems.append(f'{name}: acting_check did not measure "{needle}"')
    # Quầy thu ngân sai cách: bị từ chối với một câu nói rõ.
    base39 = desk_scenes['desk39a']
    for label, change, needle in [('pay without a phone', lambda sc: sc['characters'][1].pop('holds'), 'needs a phone in hand'),
                                  ('pay in a 2D scene without a stand', lambda sc: (sc.pop('set'), [c.pop('z', None) for c in sc['characters']]), 'needs a pay stand'),
                                  ('change without banknotes', lambda sc: sc['characters'][0].__setitem__('holds', 'stampcard'), 'needs banknotes in hand'),
                                  ('stamp without a card', lambda sc: sc['characters'][0].__setitem__('holds', 'cash'), 'needs a stamp card in hand'),
                                  ('pour without a cup', lambda sc: sc.__setitem__('script', [{'who': 'clerk', 'do': ['pourDrink']}]), 'needs a cup in hand'),
                                  ('change to a pet', lambda sc: (sc['characters'].append({'name': 'cat', 'species': 'cat', 'x': 400, 'z': -380}), sc.__setitem__('script', [{'who': 'clerk', 'do': [['giveChange', '@cat']]}])), 'needs the other person'),
                                  ('wipe for a minute', lambda sc: sc.__setitem__('script', [{'who': 'clerk', 'do': [['wipeCounter', 99]]}]), 'seconds must be')]:
        bad = json.loads(json.dumps(base39)); bad['id'] = 'bad39'; change(bad)
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad39.json')
        try:
            json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad39'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or needle not in done.stderr: problems.append(f'cashier ({label}): expected a refusal naming {needle!r} — got: {(done.stderr or done.stdout).strip()[-200:]}')
    # Kịch bản chữ: "quét mã", "quẹt thẻ", "thối tiền", "đóng dấu", "rót nước", "lau quầy" — người làm tự có đồ cần cầm.
    text = os.path.join(work, 'desk39.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: lễ tân\nthu ngân (receptionist) · khách (granny) · bé (boy)\n\nkhách: [quét mã]\nthu ngân → khách: thối tiền\nbé: [quẹt thẻ]\nthu ngân: [lau quầy]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py cashier: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'desk39.scene.json'), encoding='utf-8'))
        steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
        want = ['payByQR', ['giveChange', '@khach'], 'payByCard', 'wipeCounter']
        if steps != want: problems.append(f'script.py cashier: steps {steps}, want {want}')
        gave = {c['id']: c for c in made['characters']}
        if gave['granny'].get('holds') != {'R': 'phone', 'L': 'cash'} and gave['granny'].get('holds') != 'phone' and 'phone' not in json.dumps(gave['granny'].get('holds')): problems.append('script.py cashier: "quét mã" did not give the customer a phone')
        if 'cash' not in json.dumps(gave['receptionist'].get('holds')): problems.append('script.py cashier: "thối tiền" did not give the cashier banknotes')
        if gave['boy'].get('holds') != 'card': problems.append('script.py cashier: "quẹt thẻ" did not give the customer a bank card')
    text = os.path.join(work, 'drink39.txt')
    open(text, 'w', encoding='utf-8').write('bối cảnh: nhà thuốc\npha chế (receptionist)\n\npha chế: [rót nước]\n')
    done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py barista: ' + (done.stderr or done.stdout).strip()[-300:])
    elif 'cup' not in open(os.path.join(work, 'drink39.scene.json'), encoding='utf-8').read(): problems.append('script.py barista: "rót nước" did not give a cup')
