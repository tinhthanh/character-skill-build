"""Đợt 50 B — cửa hàng thú cưng & quầy thu ngân: lấy hàng trên kệ (`takeFromShelf`: kệ của kho sets gọi tên "@ke_hang", tầng cao / giữa / thấp; không
kệ thì làm điệu bộ), quét mã vạch (`scanBarcode`: món hàng trong tay kia, hay nhận từ khách — khách đưa cùng lúc), combo `shopCheckout` (quét → khách
trả QR → trả món hàng → vẫy). acting_check đo tay ở kệ, món hàng trong tay, đọc nhãn, máy quét chĩa vào món hàng, vạch quét đỏ chạm món hàng, "bíp";
kịch bản chữ ("lấy túi hạt trên kệ cao", "quét mã vạch", "→ khách: quét mã"); kịch bản sai bị từ chối."""
import shutil

from .common import *  # noqa: F401,F403

# Ảnh kệ giả (cỡ như ảnh của kho sets — loại kệ là TÊN TỆP ảnh): CI không phụ thuộc kho sets.
SHELF_SVG50B = {'pet_food_shelf': (320, 370), 'gondola_shelf': (380, 250)}


def _svg50b(w, h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect x="4" y="4" width="{w - 8}" height="{h - 8}" rx="6" fill="#d9b88a" stroke="#6b4f3a" stroke-width="6"/>'
            + ''.join(f'<rect x="4" y="{y}" width="{w - 8}" height="12" fill="#b89a78"/>' for y in (h // 3, 2 * h // 3)) + '</svg>')


def _build50b(spec, work, tag):
    folder = os.path.join(os.path.dirname(STAGE), f'_check_{tag}')
    os.makedirs(folder, exist_ok=True)
    for kind, (w, h) in SHELF_SVG50B.items(): open(os.path.join(folder, f'{kind}.svg'), 'w', encoding='utf-8').write(_svg50b(w, h))
    path = os.path.join(os.path.dirname(STAGE), f'_check_{tag}_{spec["id"]}.json')
    try:
        json.dump(spec, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        return build(path, os.path.join(work, spec['id']))
    finally:
        if os.path.exists(path): os.remove(path)
        shutil.rmtree(folder, ignore_errors=True)


def _shelf50b(tag, kind='pet_food_shelf', **more):
    return dict({'name': 'ke_hang', 'image': f'_check_{tag}/{kind}.svg', 'x': 600, 'z': -440, 'height': SHELF_SVG50B[kind][1]}, **more)


def _specs50b(tag):
    # Khách lấy túi hạt tầng giữa rồi lon pate tầng dưới (ngồi xổm) ở kệ thức ăn; người khác kiễng chân lấy hộp bánh thưởng tầng cao.
    shelf50b = {'id': 'shelf50b', 'camera': 'auto', 'set': {'preset': 'reception', 'cutouts': [_shelf50b(tag)]},
                'characters': [{'name': 'khach', 'id': 'owner_woman', 'x': 380, 'z': -380}, {'name': 'be', 'id': 'owner_man', 'x': 860, 'z': -360}],
                'script': [{'who': 'khach', 'do': [['takeFromShelf', '@ke_hang', {'item': 'foodBag', 'level': 'middle'}]]},
                           {'who': 'be', 'do': [['takeFromShelf', '@ke_hang', {'item': 'treatBox', 'level': 'high'}]]},
                           {'who': 'khach', 'do': [['takeFromShelf', '@ke_hang', {'item': 'can', 'level': 'low'}]]}]}
    # Quầy thu ngân: khách lấy túi hạt ở kệ, ra quầy; thu ngân tính tiền (combo: quét — khách đưa cùng lúc —, khách trả QR, trả món hàng, vẫy).
    till50b = {'id': 'till50b', 'camera': 'auto', 'set': {'preset': 'reception', 'cutouts': [_shelf50b(tag, 'gondola_shelf', x=520, z=-420)]},
               'characters': [{'name': 'thu_ngan', 'id': 'receptionist', 'x': -330, 'z': -520},
                              {'name': 'khach', 'id': 'owner_woman', 'x': 200, 'z': -360, 'holds': {'R': 'phone'}, 'holdsHidden': ['R']}],
               'script': [{'who': 'khach', 'do': [['takeFromShelf', '@ke_hang', {'item': 'foodBag', 'level': 'middle'}]]},
                          {'who': 'khach', 'do': [['walk', 4, -330]]},
                          {'who': 'thu_ngan', 'do': [['shopCheckout', '@khach']]}]}
    # Không kệ: làm điệu bộ; quét món hàng đang cầm rồi bỏ vào túi (tay cầm máy có túi đang cất); quét món khách đưa (lượt riêng — khách đưa tự thêm).
    mime50b = {'id': 'mime50b', 'camera': 'auto', 'set': {'preset': 'reception'},
               'characters': [{'name': 'thu_ngan', 'id': 'receptionist', 'x': -330, 'z': -560, 'holds': {'L': 'bag'}, 'holdsHidden': ['L']},
                              {'name': 'nv', 'id': 'pharmacist', 'x': 120, 'z': -560}, {'name': 'khach', 'id': 'granny', 'x': 330, 'z': -540, 'holds': 'treatBox'}],
               'script': [{'who': 'thu_ngan', 'do': [['takeFromShelf', 'left', {'item': 'can', 'level': 'high'}]]},
                          {'who': 'thu_ngan', 'do': [['scanBarcode', {'put': 'bag'}]]},
                          {'who': 'nv', 'do': [['scanBarcode', '@khach', {'put': 'down', 'hold': 1.4}]]}]}
    needles = {'shelf50b': ('khach takeFromShelf — the hand is at the shelf', 'khach takeFromShelf — the product is in the hand', 'khach takeFromShelf — reads the label',
                            'khach takeFromShelf — keeps holding the product', 'be takeFromShelf — the hand is at the shelf'),
               'till50b': ('khach takeFromShelf — the hand is at the shelf', "thu_ngan scanBarcode — the product is in the cashier's hand", 'thu_ngan scanBarcode — the red scan line touches the product',
                           'thu_ngan scanBarcode — the scanner is aimed at the product', 'thu_ngan scanBarcode — bíp: a green flash and the price card', 'khach payByQR'),
               'mime50b': ('thu_ngan takeFromShelf — keeps holding the product', 'thu_ngan scanBarcode — the red scan line touches the product', "nv scanBarcode — the product is in the cashier's hand",
                           'nv scanBarcode — the red scan line touches the product')}
    return {'shelf50b': shelf50b, 'till50b': till50b, 'mime50b': mime50b}, needles


@case('shop50b', parts=('shelf50b', 'till50b', 'mime50b', 'words', 'bad50b'), uses=('takeFromShelf', 'scanBarcode', 'shopCheckout'))
def shop50b(work, problems, part):
    tag = scratch('shop50b')
    specs, needles = _specs50b(tag)
    if part in specs:
        done = _build50b(specs[part], work, tag)
        if done.returncode != 0: problems.append(f'{part}: the scene does not build: ' + done.stderr.strip()[-400:]); return
        html = open(os.path.join(work, part, 'index.html'), encoding='utf-8').read()
        for needle in {'shelf50b': ("['takeFromShelf', { at: set.targetPoint(", 'steps up beside ke_hang'), 'till50b': ("['scanBarcode', khach,", '["handOver", thu_ngan]', '["take", thu_ngan, "L"]'),
                       'mime50b': ("['scanBarcode', null, {\"put\": \"bag\"}]", "[khach, ['handOver', nv]]")}[part]:
            if needle not in html: problems.append(f'{part}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, part)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{part}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        for needle in needles[part]:
            if needle not in done.stdout: problems.append(f'{part}: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    if part == 'words':
        # Kịch bản chữ: lấy hàng (món, tầng), quét mã vạch món đang cầm, "→ khách: quét mã" (nhận rồi quét), combo "tính tiền món hàng"; "[quét mã]" một mình vẫn là trả QR.
        text = os.path.join(work, 'shop50b.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: lễ tân\nthu ngân (receptionist) · khách (owner_woman)\n\n'
                                                'khách: [lấy túi hạt trên kệ cao]\nkhách: [lấy lon pate kệ dưới]\nthu ngân: [lấy hàng, quét mã vạch]\n'
                                                'thu ngân → khách: quét mã\nthu ngân → khách: tính tiền món hàng\nkhách: [quét mã]\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append('script.py shop50b: ' + (done.stderr or done.stdout).strip()[-300:])
        else:
            made = json.load(open(os.path.join(work, 'shop50b.scene.json'), encoding='utf-8'))
            steps = [t['do'] for t in made['script'] if isinstance(t, dict) and t.get('do')]
            want = [[['takeFromShelf', {'item': 'foodBag', 'level': 'high'}]], [['takeFromShelf', {'item': 'can', 'level': 'low'}]],
                    [['takeFromShelf', {'item': 'foodBag', 'level': 'middle'}], 'scanBarcode'], [['scanBarcode', '@khach']], ['wave'], ['payByQR']]
            if steps != want: problems.append(f'script.py shop50b: steps {steps}, want {want}')
            # Combo "tính tiền món hàng" bung ra: quét (giữ lại) — khách đưa cùng lúc ("$self" = thu ngân).
            groups = [[(t['who'], t['do'][0]) for t in e['together']] for e in made['script'] if isinstance(e, dict) and 'together' in e]
            if not any(g[0][1] == ['scanBarcode', '@khach', {'put': 'keep'}] and g[1][1][0] == 'handOver' and g[1][1][1] == '@' + g[0][0] for g in groups if len(g) == 2):
                problems.append(f'script.py shop50b: the combo does not scan with the customer handing over at the same time: {groups}')
    if part == 'bad50b':
        base = specs['shelf50b']
        for label, change, needle in (
                ('unknown shelf', lambda s: s['script'][0]['do'][0].__setitem__(1, '@kho'), 'no set.cutouts item has "name": "kho"'),
                ('a character as the shelf', lambda s: s['script'][0]['do'][0].__setitem__(1, '@be'), '"@be" is a character'),
                ('a prop that is no shelf', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -380}) or s['script'][0]['do'][0].__setitem__(1, '@can'), 'is a "scale" cutout'),
                ('standing behind the shelf', lambda s: s['characters'][0].__setitem__('z', -600), 'must stand just in front of the shelf'),
                ('a row the shelf has not', lambda s: s['set']['cutouts'][0].__setitem__('image', f'_check_{tag}/gondola_shelf.svg') or s['set']['cutouts'][0].__setitem__('height', 250)
                 or s['script'][0]['do'][0][2].__setitem__('level', 'high'), 'has no "high" row'),
                ('an unknown product', lambda s: s['script'][0]['do'][0][2].__setitem__('item', 'fish'), 'item must be'),
                ('an unknown level', lambda s: s['script'][0]['do'][0][2].__setitem__('level', 'top'), 'level must be "high", "middle" or "low"'),
                ('scan a pet', lambda s: s['characters'].append({'name': 'cho', 'species': 'dog', 'x': 0, 'z': -380}) or s['script'].__setitem__(0, {'who': 'khach', 'do': [['scanBarcode', '@cho']]}), 'is a pet'),
                ('scan from a customer with no product', lambda s: s.__setitem__('script', [{'who': 'khach', 'do': [['scanBarcode', '@be']]}]), 'holds no product to scan'),
                ('scan put somewhere unknown', lambda s: s['script'].__setitem__(0, {'who': 'khach', 'do': [['scanBarcode', {'put': 'away'}]]}), 'put must be "down", "keep" or "bag"'),
                ('scan hold too long', lambda s: s['script'].__setitem__(0, {'who': 'khach', 'do': [['scanBarcode', {'hold': 9}]]}), 'hold must be 0.4…4 seconds')):
            spec = json.loads(json.dumps(base)); spec['id'] = 'bad50b'
            change(spec)
            done = _build50b(spec, work, tag)
            if done.returncode == 0 or needle not in done.stderr: problems.append(f'bad50b ({label}): should be refused with "{needle}" — got: ' + (done.stderr.strip()[-240:] or 'no error'))
