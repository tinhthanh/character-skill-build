"""Đợt 50 A — phòng khám: sờ nắn bụng / sườn (`palpate`), siêu âm (`useUltrasound`: con vật nằm nghiêng, gel, đầu dò, thẻ ảnh; liếc xe đẩy siêu âm "@tên"),
soi kính hiển vi (`lookMicroscope` "@tên"); con vật tự nằm nghiêng (`lieOnSide`). Cảnh 3D: chó trên bàn khám, mèo + xe đẩy siêu âm (ảnh cutout), thỏ trên
bàn, chó dưới sàn (người quỳ), bàn xét nghiệm có kính hiển vi (ảnh cutout); acting_check đo tay trên bụng, đầu dò trên bụng, gel, con vật nằm nghiêng,
thẻ ảnh không che mặt, mắt ở thị kính, tay ở núm; kịch bản chữ; đối số sai bị từ chối."""
from .common import *  # noqa: F401,F403

# Ảnh cutout tạm (thay cho ảnh của characters/sets — cùng cỡ bản vẽ: xe đẩy 200 × 400, kính hiển vi 110 × 150), ghi vào thư mục làm việc.
CART_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" width="200" height="400"><rect x="30" y="34" width="140" height="104" rx="8" fill="#2b2f36"/>'
            '<rect x="42" y="46" width="116" height="80" fill="#1f2a33"/><path d="M 70 110 Q 100 60 130 110 Z" fill="#c8d0d6"/><rect x="92" y="138" width="16" height="30" fill="#9aa5ad"/>'
            '<rect x="14" y="166" width="172" height="54" rx="8" fill="#f4f7fa"/><rect x="80" y="220" width="40" height="140" fill="#f4f7fa"/><path d="M 30 360 H 170 L 184 378 H 16 Z" fill="#f4f7fa"/></svg>')
MICRO_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 150" width="110" height="150"><rect x="8" y="132" width="94" height="18" rx="6" fill="#fbfaf7" stroke="#3b2a2e"/>'
             '<path d="M 60 132 Q 92 100 74 40 L 58 46 Q 70 96 44 132 Z" fill="#fbfaf7" stroke="#3b2a2e"/><rect x="20" y="92" width="58" height="10" fill="#2b2f36"/>'
             '<g transform="rotate(-20 50 40)"><rect x="40" y="34" width="22" height="52" fill="#c3ccd2"/><rect x="44" y="4" width="14" height="32" fill="#2b2f36"/></g><circle cx="84" cy="108" r="9" fill="#9aa5ad"/></svg>')

EXAM50A = {
    # Chó corgi trên bàn khám: sờ bụng, siêu âm (không xe đẩy), sờ sườn.
    'palp50a': ({'id': 'palp50a', 'camera': 'auto', 'set': {'preset': 'exam'},
                 'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho'},
                                {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}],
                 'script': [{'who': 'bac_si', 'do': [['palpate', '@cho']]}, {'who': 'bac_si', 'do': [['useUltrasound', '@cho']]}, {'who': 'bac_si', 'do': [['palpate', '@cho', {'part': 'flank'}]]}]},
                ('bac_si palpate cho — both hands on its belly', 'bac_si palpate cho — it presses in beats', 'bac_si palpate cho — it reacts mildly',
                 'bac_si palpate cho — both hands on its flanks', 'bac_si palpate cho — nothing covers its face for long',
                 'bac_si useUltrasound cho — it lies on its side', 'bac_si useUltrasound cho — gel on its belly', 'bac_si useUltrasound cho — the probe on its belly',
                 'bac_si useUltrasound cho — a scan picture is shown, off the faces', 'bac_si useUltrasound cho — it gets up after', 'bac_si useUltrasound cho — nothing covers its face for long')),
    # Mèo (đang ngồi) trên bàn, xe đẩy siêu âm phía sau gọi tên: siêu âm rồi sờ bụng (nó đứng dậy).
    'cart50a': ({'id': 'cart50a', 'camera': 'auto', 'set': {'preset': 'exam', 'cutouts': [{'image': '@CART', 'name': 'may_sieu_am', 'x': 320, 'z': -900, 'height': 400}]},
                 'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'meo'},
                                {'name': 'meo', 'species': 'orange_cat', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si'}],
                 'script': [{'who': 'bac_si', 'do': [['useUltrasound', '@meo', '@may_sieu_am', {'hold': 2.4}]]}, {'who': 'bac_si', 'do': [['palpate', '@meo']]}]},
                ('bac_si useUltrasound meo — it lies on its side', 'bac_si useUltrasound meo — the probe on its belly', 'bac_si useUltrasound meo — nothing covers its face for long',
                 'bac_si palpate meo — both hands on its belly', 'bac_si palpate meo — nothing covers its face for long')),
    # Thỏ trên bàn, y tá phía bên kia: siêu âm, sờ sườn (đầu to — không che mặt nó).
    'rabbit50a': ({'id': 'rabbit50a', 'camera': 'auto', 'set': {'preset': 'exam'},
                   'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 360, 'z': -560, 'faces': 'tho'},
                                  {'name': 'tho', 'species': 'rabbit', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'y_ta'}],
                   'script': [{'who': 'y_ta', 'do': [['useUltrasound', '@tho', {'hold': 2}]]}, {'who': 'y_ta', 'do': [['palpate', '@tho', {'part': 'flank'}]]}]},
                  ('y_ta useUltrasound tho — the probe on its belly', 'y_ta useUltrasound tho — nothing covers its face for long', 'y_ta palpate tho — both hands on its flanks',
                   'y_ta palpate tho — nothing covers its face for long')),
    # Chó dưới sàn: người quỳ, cúi tới, sờ bụng.
    'floor50a': ({'id': 'floor50a', 'camera': 'auto', 'set': {'preset': 'exam'},
                  'characters': [{'name': 'cho', 'species': 'shiba', 'x': -250, 'z': -400, 'faces': 'chu'},
                                 {'name': 'chu', 'id': 'owner_woman', 'x': -380, 'z': -400, 'faces': 'cho'}],
                  'script': [{'who': 'chu', 'do': [['palpate', '@cho']]}]},
                 ('chu palpate cho — both hands on its belly', 'chu palpate cho — nothing covers its face for long')),
    # Bàn xét nghiệm có kính hiển vi (ảnh cutout, gọi tên); lần hai không gọi tên — cutout kính hiển vi duy nhất của cảnh.
    'micro50a': ({'id': 'micro50a', 'camera': 'auto', 'set': {'boxes': [{'name': 'bench', 'x': -700, 'z': -900, 'width': 500, 'depth': 120, 'height': 190, 'color': '#cfe3ea', 'top': '#e9f2f5', 'side': '#b8d0d8'}],
                                                              'cutouts': [{'image': '@MICRO', 'name': 'kinh', 'x': -520, 'z': -930, 'y': 190, 'height': 150}]},
                  'characters': [{'name': 'ky_thuat', 'id': 'nurse', 'x': -250, 'z': -890}],
                  'script': [{'who': 'ky_thuat', 'do': [['lookMicroscope', '@kinh']]}, {'who': 'ky_thuat', 'do': [['lookMicroscope', {'hold': 1.5}]]}]},
                 ('ky_thuat lookMicroscope — bends over to the eyepiece', 'ky_thuat lookMicroscope — an eye at the eyepiece', 'ky_thuat lookMicroscope — a hand on the focus knob',
                  'ky_thuat lookMicroscope — turns the knob a few notches', 'ky_thuat lookMicroscope — straightens up after')),
}


def _images(spec, work):
    """"@CART" / "@MICRO" trong cảnh → đường dẫn tuyệt đối của ảnh tạm trong `work`."""
    paths = {}
    for key, svg, name in (('@CART', CART_SVG, 'ultrasound_cart.svg'), ('@MICRO', MICRO_SVG, 'microscope.svg')):
        path = os.path.join(work, name)
        open(path, 'w', encoding='utf-8').write(svg)
        paths[key] = path
    spec = json.loads(json.dumps(spec))
    for item in (spec.get('set') or {}).get('cutouts', []):
        if item.get('image') in paths: item['image'] = paths[item['image']]
    return spec


@case('exam50a', parts=('palp50a', 'cart50a', 'rabbit50a', 'floor50a', 'micro50a', 'words', 'bad50a'), uses=('palpate', 'useUltrasound', 'lookMicroscope', 'lieOnSide'))
def exam50a(work, problems, part):
    stage = STAGE
    TAG = scratch('exam50a')
    if part in EXAM50A:
        spec, needles = EXAM50A[part]
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{part}.json')
        try:
            json.dump(_images(spec, work), open(path, 'w'), ensure_ascii=False)
            done = build(path, os.path.join(work, part))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{part}: the scene does not build: ' + done.stderr.strip()[:300]); return
        html = open(os.path.join(work, part, 'index.html'), encoding='utf-8').read()
        if part == 'cart50a' and 'screen: set.targetPoint(bac_si' not in html: problems.append('cart50a: the ultrasound cart\'s screen is not passed to useUltrasound')
        if part == 'micro50a' and html.count('"lookMicroscope", set.targetPoint(ky_thuat') != 2: problems.append('micro50a: the microscope (named, then the only one) is not the target of both lookMicroscope steps')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, part)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{part}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        else:
            for needle in needles:
                if needle not in done.stdout: problems.append(f'{part}: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    if part == 'words':
        # Kịch bản chữ: "sờ bụng", "sờ sườn", "siêu âm", "[soi kính hiển vi]", con vật "[nằm phơi bụng]".
        text = os.path.join(work, 'exam50a.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · chó (corgi, trên bàn)\n\n'
                                                'bác sĩ → chó: sờ bụng\nbác sĩ → chó: sờ sườn\nbác sĩ → chó: siêu âm\nbác sĩ: [soi kính hiển vi]\nchó: [nằm phơi bụng]\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append('script.py exam50a: ' + (done.stderr or done.stdout).strip()[-300:])
        else:
            made = json.load(open(os.path.join(work, 'exam50a.scene.json'), encoding='utf-8'))
            steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
            want = [['palpate', '@cho'], ['palpate', '@cho', {'part': 'flank'}], ['useUltrasound', '@cho'], 'lookMicroscope', 'lieOnSide']
            if steps != want: problems.append(f'script.py exam50a: steps {steps}, want {want}')
            else:
                path = os.path.join(work, 'exam50a.scene.json')
                done = build(path, os.path.join(work, 'words50a'))
                if done.returncode != 0: problems.append('exam50a words: the scene made from the script does not build: ' + done.stderr.strip()[-300:])
    if part == 'bad50a':
        base = EXAM50A['cart50a'][0]
        for label, step, needle in (('palpate part', ['palpate', '@meo', {'part': 'head'}], 'part must be "belly" or "flank"'),
                                    ('palpate hold', ['palpate', '@meo', {'hold': 30}], 'hold must be 1…6'),
                                    ('palpate a prop', ['palpate', '@meo', '@may_sieu_am'], '"palpate" takes'),
                                    ('scan unknown prop', ['useUltrasound', '@meo', '@khong_co'], 'no set.cutouts item has "name": "khong_co"'),
                                    ('scan with a character', ['useUltrasound', '@meo', '@bac_si'], 'is a character'),
                                    ('scan option', ['useUltrasound', '@meo', {'part': 'belly'}], '"useUltrasound" takes'),
                                    ('microscope by a pet', None, 'is done by a person'),
                                    ('microscope far', ['lookMicroscope', '@may_sieu_am'], 'the eye only reaches into its own plane')):
            bad = _images(base, work)
            if step is None: bad['script'] = [{'who': 'meo', 'do': [['lookMicroscope']]}]
            else: bad['script'] = [{'who': 'bac_si', 'do': [step]}]
            if label == 'microscope far': bad['set']['cutouts'][0]['image'] = bad['set']['cutouts'][0]['image'].replace('ultrasound_cart', 'microscope')
            path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad50a.json')
            try:
                json.dump(bad, open(path, 'w'), ensure_ascii=False)
                done = build(path, os.path.join(work, 'bad50a'))
            finally:
                if os.path.exists(path): os.remove(path)
            if done.returncode == 0 or needle not in done.stderr: problems.append(f'bad50a ({label}): should be refused with "{needle}" — got: ' + (done.stderr.strip()[-200:] or 'no error'))
        # Siêu âm con vật dưới sàn: từ chối rõ (người quỳ không với tới bụng nó).
        bad = json.loads(json.dumps(EXAM50A['floor50a'][0])); bad['script'] = [{'who': 'chu', 'do': [['useUltrasound', '@cho']]}]
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad50a.json')
        try:
            json.dump(bad, open(path, 'w'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'bad50a'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0 or '"on": "table"' not in done.stderr: problems.append('bad50a (scan on the floor): should be refused with "on": "table" — got: ' + (done.stderr.strip()[-200:] or 'no error'))
