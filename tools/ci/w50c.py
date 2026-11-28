"""Đợt 50 C — cho ăn (`serveBowl`: bát đặt trước mõm, đổ hạt / nước, con vật tự tới ăn / uống, bát ở lại, nhặt bát lên) và lồng vận chuyển
(`putInCarrier`, `takeOutOfCarrier`, `pickUpCarrier`, `putDownCarrier`: cửa lưới mở khi con vật vào / ra, con vật trong lồng sau vỏ, lồng trên tay có
con vật trong đó cả lúc đi, chủ xách mèo trong lồng tới quầy lễ tân rồi đặt xuống thả ra); chó, mèo, thỏ; sửa đợt 49 B — sấy / tỉa lông thỏ dưới sàn,
người lớn quỳ: tay không che mặt nó; từ tiếng Việt; kịch bản sai bị từ chối rõ."""
from .common import *  # noqa: F401,F403


def _build50c(work, TAG, key, scene):
    path = os.path.join(os.path.dirname(STAGE), f'_check_{TAG}_{key}.json')
    try:
        json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        return build(path, os.path.join(work, key))
    finally:
        if os.path.exists(path): os.remove(path)


CARRIER50C = {'kind': 'carrier', 'name': 'long', 'x': -250, 'z': -600}
FEED50C = {
    # Chó: bé đặt bát hạt; chó tự tới ăn; rồi bé nhặt bát lên. Mèo: bát nước, mèo uống.
    'bowl50c': ({'id': 'bowl50c', 'camera': 'auto', 'set': {'preset': 'living-room'},
                 'characters': [{'name': 'be', 'id': 'boy', 'x': -200, 'z': -500}, {'name': 'cho', 'species': 'corgi', 'x': 150, 'z': -520},
                                {'name': 'meo', 'species': 'cat', 'x': -450, 'z': -520, 'faces': 'be'}],
                 'script': [{'who': 'be', 'do': [['serveBowl', '@cho']]}, {'who': 'be', 'do': [['serveBowl', '@meo', {'food': 'water', 'hold': 1}]]}]},
                ('be serveBowl cho — the bowl is on the floor in front of the pet', 'be serveBowl cho — kibble / water pours from the scoop / jug and the bowl fills',
                 "be serveBowl cho — the pet's mouth is at the bowl (eating / drinking)", 'be serveBowl cho — the bowl stays on the floor after', 'be serveBowl meo — the bowl is full',
                 "be serveBowl meo — the pet's mouth is at the bowl (eating / drinking)")),
    # Thỏ: bát hạt.
    'rabbitbowl50c': ({'id': 'rabbitbowl50c', 'camera': 'auto', 'set': {'preset': 'living-room'},
                       'characters': [{'name': 'chu', 'id': 'owner_woman', 'x': 250, 'z': -500}, {'name': 'tho', 'species': 'rabbit', 'x': -100, 'z': -520, 'faces': 'chu'}],
                       'script': [{'who': 'chu', 'do': [['serveBowl', '@tho']]}, {'who': 'chu', 'do': [['pickUp', '@tho', {'item': 'bowl'}]]}]},
                      ('chu serveBowl tho — the bowl is on the floor in front of the pet', "chu serveBowl tho — the pet's mouth is at the bowl (eating / drinking)", 'chu pickUp — hand at the item when it closes',
                       'chu pickUp — the item in the hand at the end')),
    # Gửi mèo: chủ cho mèo vào lồng, xách lồng đi, đặt xuống.
    'board50c': ({'id': 'board50c', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [dict(CARRIER50C)]},
                  'characters': [{'name': 'chu', 'id': 'owner_man', 'x': 120, 'z': -570}, {'name': 'meo', 'species': 'cat', 'x': 250, 'z': -570}],
                  'script': [{'who': 'chu', 'do': [['putInCarrier', '@meo', '@long', {'carry': True}]]}, {'who': 'chu', 'do': [['walk', 4, 260]]}, {'who': 'chu', 'do': [['putDownCarrier']]}]},
                 ('chu putInCarrier meo — the carrier door opens (a hand on it)', 'chu putInCarrier meo — the door is open while it goes in',
                  'chu putInCarrier meo — it is inside the carrier, behind the shell', 'chu putInCarrier meo — the carrier door is closed again', 'chu putInCarrier meo — the carrier is in the hand',
                  'chu putDownCarrier meo — it rides in the carrier in the hand', 'chu putDownCarrier meo — the carrier is set down')),
    # Tới phòng khám: chủ xách mèo trong lồng ("inCarrier": người), đi tới quầy lễ tân, đặt lồng xuống, mở cửa — mèo tự bước ra.
    'arrive50c': ({'id': 'arrive50c', 'camera': 'auto', 'set': {'preset': 'reception'},
                   'characters': [{'name': 'le_tan', 'id': 'receptionist', 'x': -300, 'z': -620, 'faces': 'chu'}, {'name': 'chu', 'id': 'owner_woman', 'x': -60, 'z': -380},
                                  {'name': 'meo', 'species': 'cat', 'inCarrier': 'chu'}],
                   'script': [{'who': 'chu', 'do': [['walk', 4, 300]]}, {'who': 'le_tan', 'say': 'Chào chị, bé tới khám ạ?', 'dur': 2}, {'who': 'chu', 'do': [['takeOutOfCarrier', '@meo']]}]},
                  ('chu takeOutOfCarrier meo — it rides in the carrier in the hand', 'chu takeOutOfCarrier meo — it is inside the carrier, behind the shell',
                   'chu takeOutOfCarrier meo — the carrier door opens (a hand on it)', 'chu takeOutOfCarrier meo — it has walked out of the carrier')),
    # Thỏ vào lồng (cửa bên trái), chờ, rồi thả ra.
    'rabbit50c': ({'id': 'rabbit50c', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [dict(CARRIER50C, x=280, door='left')]},
                   'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': -40, 'z': -570}, {'name': 'tho', 'species': 'rabbit', 'x': -160, 'z': -570}],
                   'script': [{'who': 'y_ta', 'do': [['putInCarrier', '@tho', '@long']]}, {'who': 'y_ta', 'say': 'Ngoan nhé, chờ chút.', 'dur': 1.8},
                              {'who': 'y_ta', 'do': [['takeOutOfCarrier', '@tho', '@long']]}]},
                  ('y_ta putInCarrier tho — it is inside the carrier, behind the shell', 'y_ta putInCarrier tho — the door is open while it goes in',
                   'y_ta takeOutOfCarrier tho — the carrier door opens (a hand on it)', 'y_ta takeOutOfCarrier tho — it has walked out of the carrier')),
    # Chó ở sẵn trong lồng trên sàn ("inCarrier": lồng): bác sĩ xách lồng lên, đặt sang chỗ khác, thả ra.
    'dog50c': ({'id': 'dog50c', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [dict(CARRIER50C, x=-300, door='right')]},
                'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 0, 'z': -570}, {'name': 'cho', 'species': 'dog', 'inCarrier': 'long'}],
                'script': [{'who': 'bac_si', 'do': [['pickUpCarrier', '@long']]}, {'who': 'bac_si', 'do': [['walk', 4, 200]]}, {'who': 'bac_si', 'do': [['takeOutOfCarrier', '@cho']]}]},
               ('bac_si pickUpCarrier cho — the carrier is in the hand', 'bac_si takeOutOfCarrier cho — it rides in the carrier in the hand', 'bac_si takeOutOfCarrier cho — it has walked out of the carrier')),
    # SỬA ĐỢT 49 B: thỏ dưới sàn, y tá (người lớn) quỳ sấy rồi tỉa — người quỳ phía đuôi nó, tay không che mặt nó.
    'groom50c': ({'id': 'groom50c', 'camera': 'auto', 'set': {'preset': 'exam'},
                  'characters': [{'name': 'tho', 'species': 'rabbit', 'x': -250, 'z': -400, 'faces': 'y_ta'}, {'name': 'y_ta', 'id': 'nurse', 'x': -420, 'z': -400, 'faces': 'tho'}],
                  'script': [{'who': 'y_ta', 'do': [['blowDry', '@tho']]}, {'who': 'y_ta', 'do': [['trimFur', '@tho']]}]},
                 ('y_ta blowDry tho — nothing covers its face for long', 'y_ta trimFur tho — nothing covers its face for long', 'y_ta trimFur tho — the other hand steadies it',
                  'y_ta blowDry tho — the airflow from the dryer reaches its coat')),
}


@case('feed50c', parts=('bowl50c', 'rabbitbowl50c', 'board50c', 'arrive50c', 'rabbit50c', 'dog50c', 'groom50c', 'words', 'bad50c'),
      uses=('serveBowl', 'putInCarrier', 'takeOutOfCarrier', 'pickUpCarrier', 'putDownCarrier', 'blowDry', 'trimFur', 'acting_check', 'script'))
def feed50c(work, problems, part):
    TAG = scratch('feed50c')
    if part in FEED50C:
        spec, needles = FEED50C[part]
        done = _build50c(work, TAG, part, spec)
        if done.returncode != 0: problems.append(f'{part}: the scene does not build: ' + done.stderr.strip()[-400:]); return
        html = open(os.path.join(work, part, 'index.html'), encoding='utf-8').read()
        if part in ('bowl50c', 'rabbitbowl50c') and not re.search(r"\[(cho|meo|tho), [\d.]+, (\[\"walk\", 2, -?\d+\], )?\[\"(eat|drink)\", 2\.4\]\]", html): problems.append(f'{part}: the pet does not come to the bowl and eat / drink (its part is missing)')
        if part in ('board50c', 'rabbit50c', 'dog50c', 'arrive50c'):
            for needle in ("'carrierBack'", "'carrierFront'", 'Front, back: cutout'):
                if needle not in html: problems.append(f'{part}: {needle} is not in the composition')
        if part == 'arrive50c' and ('chu.loadCarrier(meo' not in html or '"L": "carrier"' not in html): problems.append('arrive50c: the owner does not start carrying the cat in a carrier')
        if part == 'arrive50c' and "data-carrier-spot50c" not in html: problems.append('arrive50c: no hidden place to set the carrier down was added')
        if part == 'groom50c' and 'tail end of tho' not in html: problems.append('groom50c: the nurse does not go to the tail end of the rabbit on the floor')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, part)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{part}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        for needle in needles:
            if needle not in done.stdout: problems.append(f'{part}: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    if part == 'words':
        text = os.path.join(work, 'feed50c.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\ny tá (nurse) · mèo (cat) · chó (dog)\n\n'
                                                'y tá → mèo: cho vào lồng\ny tá → mèo: thả ra khỏi lồng\ny tá → chó: cho ăn\ny tá → mèo: cho uống nước\n'
                                                'y tá → mèo: bỏ vào lồng rồi xách\ny tá: [đặt lồng xuống]\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append('script.py feed50c: ' + (done.stderr or done.stdout).strip()[-300:])
        else:
            made = json.load(open(os.path.join(work, 'feed50c.scene.json'), encoding='utf-8'))
            steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
            want = [['putInCarrier', '@meo', '@long'], ['takeOutOfCarrier', '@meo', '@long'], ['serveBowl', '@cho'], ['serveBowl', '@meo', {'food': 'water'}],
                    ['putInCarrier', '@meo', '@long', {'carry': True}], ['putDownCarrier']]
            if steps != want: problems.append(f'script.py feed50c: steps {steps}, want {want}')
            if not any(c.get('kind') == 'carrier' and c.get('name') == 'long' for c in made['set'].get('cutouts', [])): problems.append('script.py feed50c: no carrier was added to the set')
    if part == 'bad50c':
        base = FEED50C['board50c'][0]
        cases = (
            ('unknown carrier', [['putInCarrier', '@meo', '@kho']], None, 'no set.cutouts item has "name": "kho"'),
            ('a prop of the wrong kind', [['putInCarrier', '@meo', '@can']], lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 300, 'z': -600}), 'is a "scale" cutout'),
            ('no carrier at all', [['putInCarrier', '@meo']], None, 'takes ["putInCarrier", "@pet", "@<carrier>"'),
            ('behind the carrier', None, lambda s: [c.__setitem__('z', -700) for c in s['characters']], 'must stand just in front of the carrier'),
            ('taken out of an empty carrier', [['takeOutOfCarrier', '@meo', '@long']], None, 'is not in the carrier "long"'),
            ('set down without a carrier', [['putDownCarrier']], None, 'is not carrying a carrier'),
            ('a person in a carrier', None, lambda s: s['characters'][0].__setitem__('inCarrier', 'long'), '"inCarrier" is for a pet'),
            ('a pet in nothing', None, lambda s: s['characters'][1].__setitem__('inCarrier', 'kho'), '"inCarrier" must name a set.cutouts "carrier"'),
            ('a too small carrier', None, lambda s: s['set']['cutouts'][0].__setitem__('size', [90, 60]), 'is too big for the carrier'),
            ('carry not a boolean', [['putInCarrier', '@meo', '@long', {'carry': 'yes'}]], None, 'carry must be true or false'),
            ('unknown food', [['serveBowl', '@meo', {'food': 'cake'}]], None, 'food must be "kibble" or "water"'),
            ('bowl for a person', [['serveBowl', '@chu']], None, '"serveBowl" needs the pet'),
            ('bowl on a table', [['serveBowl', '@meo']], lambda s: s['characters'][1].__setitem__('on', 'table'), 'the bowl goes on the floor'),
            ('bowl gap too far', [['serveBowl', '@meo', {'gap': 500}]], None, 'gap must be 0…160'))
        for label, script, change, needle in cases:
            spec = json.loads(json.dumps(base)); spec['id'] = 'bad50c'
            if script is not None: spec['script'] = [{'who': 'chu', 'do': script}]
            if change: change(spec)
            done = _build50c(work, TAG, 'bad50c', spec)
            if done.returncode == 0 or needle not in done.stderr: problems.append(f'bad50c ({label}): should be refused with "{needle}" — got: ' + (done.stderr.strip()[-240:] or 'no error'))
