"""Phase 2 of a build: the characters — checked, placed in the frame / set, given their items."""
import os, re
from .actions import DESK_ACTIONS, DESK_OPTIONS, DESK_PAY
from .schema import CHARACTER_KEYS, ITEM_KINDS, PERSON_WEARABLES, WEARABLES
from .sets import ROOM_DEFAULTS
from .util import PERSON, PET, fail, js, known, slug


def place_cast(st):
    """Frame size, output folder, the characters (checked, placed, given items) and the script checks before the turns."""
    args, scene, stage_set = st.take('args', 'scene', 'stage_set')
    base = os.path.dirname(os.path.abspath(args.scene))
    scene_id = slug(scene.get('id') or os.path.splitext(os.path.basename(args.scene))[0])
    width, height = int(scene.get('width', 1920)), int(scene.get('height', 1080))
    out = os.path.abspath(args.output or os.path.join(base, scene_id))
    copied = {}                                             # ảnh đã chép: nguồn → tên trong thư mục ra
    drives = []                                             # cutout chạy vào đầu cảnh (`drive`) — hội thoại chờ chúng dừng
    # Cỡ mặc định theo KHUNG HÌNH: người cao 0,7 khung ngang (760 px ở 1920×1080), nhưng không rộng quá
    # ba phần tư bề ngang của khung dọc; thú bằng 0,43 người.
    person_default = round(min(0.7 * height, 0.75 * width))
    pet_default = round(person_default * 0.43)

    # ── nhân vật ──
    cast = scene.get('characters')
    if not isinstance(cast, list) or not cast: fail('"characters" must be a non-empty list')
    # Ai bước vào GIỮA cảnh (một lượt có "enter")? Phải biết trước khi đặt host: người ấy xuất phát ngoài mép khung
    # như người bước vào từ đầu, và ẩn cho tới lượt của mình.
    late = {}
    for entry in (scene.get('script') if isinstance(scene.get('script'), list) else []):
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if isinstance(turn, dict) and turn.get('enter') and turn.get('who') not in late: late[turn.get('who')] = turn['enter']
    names = {}
    split = scene.get('layout') == 'split'
    if split and stage_set is not None: fail('"layout": "split" is a 2D layout — it cannot be combined with "set"')
    for who in cast:
        if not isinstance(who, dict) or not who.get('name'): fail('every character needs a "name"')
        name = who['name']
        # MÀN HÌNH CHIA ĐÔI: mỗi nhân vật thuộc một nửa khung (`side`), `x` tính trong nửa ấy (mặc định giữa nửa).
        if split:
            if who.get('side') not in ('left', 'right'): fail(f'character "{name}": in a "split" layout every character needs "side": "left" or "right"')
            who['x'] = (0 if who['side'] == 'left' else width / 2) + float(who.get('x', width / 4))
        elif 'side' in who: fail(f'character "{name}": "side" is for "layout": "split"')
        known(f'character "{name}"', who, CHARACTER_KEYS)
        if name in names: fail(f'two characters are named "{name}"')
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', name): fail(f'character name "{name}" must be a plain identifier (letters, digits, underscore)')
        if bool(who.get('id')) == bool(who.get('species')): fail(f'character "{name}" needs either "id" (a person) or "species" (a pet)')
        pet = bool(who.get('species'))
        if 'rides' in who:                                   # người cầm lái đứng theo xe (kiểm tra kỹ ở dưới)
            ridden = next((item for item in (stage_set or {}).get('cutouts', []) if isinstance(item, dict) and item.get('name') == who['rides'] and isinstance(item.get('x'), (int, float))), None)
            if ridden: who['x'] = ridden['x']
        if 'x' not in who: fail(f'character "{name}" needs "x" (where it stands, px from the left)' + (' — or "rides" must name a scooter cutout' if 'rides' in who else ''))
        if who.get('enter') not in (None, False, True, 'left', 'right'): fail(f'character "{name}": "enter" must be "left", "right" or true (the nearer edge)')
        # `true` = mép GẦN chỗ đứng hơn: đi vào từ mép xa là băng ngang qua những nhân vật đứng giữa đường.
        nearer = 'left' if float(who['x']) < (0 if stage_set is not None else width / 2) else 'right'          # bối cảnh 3D: x = 0 là giữa phòng
        if who.get('enter') is True: who['enter'] = nearer
        if not who.get('enter'): who.pop('enter', None)
        if late.get(name) is True: late[name] = nearer
        if pet and who.get('voice'): fail(f'character "{name}": a pet cannot have a "voice"')
        # NGƯỜI CẦM LÁI (`rides`: tên một cutout xe máy): ngồi trên yên từ khung đầu, đi cùng xe; "getOff" trong lượt của mình
        # thì bước xuống cạnh xe. Chỗ đứng (x, z) lấy theo xe — không cần ghi.
        if 'rides' in who:
            scooters = {item.get('name'): item for item in (stage_set or {}).get('cutouts', []) if item.get('kind') == 'scooter' and item.get('name')}
            if stage_set is None: fail(f'character "{name}": "rides" needs a 3D set ("set") with a scooter cutout')
            if pet: fail(f'character "{name}": a pet cannot ride — only people have the "ride" stance')
            if who['rides'] not in scooters: fail(f'character "{name}": "rides" must name a set.cutouts item with "kind": "scooter" and a "name" (scooters here: {", ".join(scooters) or "none"}) — got {js(who["rides"])}')
            for key in ('enter', 'on', 'seated'):
                if who.get(key): fail(f'character "{name}": "rides" cannot be combined with "{key}"')
            if name in late: fail(f'character "{name}" rides in — it cannot also "enter" on a turn')
            if [w.get('name') for w in cast if w.get('rides') == who['rides']].index(name): fail(f'scooter "{who["rides"]}" has two riders — one per scooter')
            who['x'], who['z'] = scooters[who['rides']]['x'], float(scooters[who['rides']]['z']) - 15
        if stage_set is None and ('z' in who or 'on' in who): fail(f'character "{name}": "z" and "on" place a character in a 3D set — add "set" at the top of the scene file')
        if stage_set is not None:
            if 'on' in who and who['on'] not in [box.get('name') for box in stage_set.get('boxes', [])]: fail(f'character "{name}": "on" must name one of set.boxes (got {js(who["on"])})')
        if 'inTub' in who:          # đợt 42 F
            if who['inTub'] is not True and who['inTub'] is not False: fail(f'character "{name}": "inTub" must be true (stands in a bath tub) or false — got {js(who["inTub"])}')
            if who['inTub'] and not pet: fail(f'character "{name}": "inTub" is for a pet (it stands in a bath tub) — "{name}" is a person')
            if who['inTub'] and stage_set is None: fail(f'character "{name}": "inTub" needs a 3D set ("set") — the tub stands on the floor or on the box the pet is "on"')
            if who['inTub'] and (who.get('enter') or name in late): fail(f'character "{name}": a pet in a tub cannot "enter" — it is in the tub from the start')
        # NHẬN TÚI THUỐC (đợt 38 C): người được ai đó `["handOverBag", "@người này"]` mà không cầm gì thì có sẵn một túi ĐANG CẤT — `takeBag`
        # nhận vào đó (cùng chỗ trên màn hình với túi trong tay người đưa).
        bag_turns = [t for entry in (scene.get('script') or []) for t in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry])]
        if not pet and 'holds' not in who and any(isinstance(t, dict) and isinstance(t.get('do'), list) and any(isinstance(step, list) and len(step) > 1 and step[0] == 'handOverBag' and step[1] == '@' + name for step in t['do']) for t in bag_turns):
            who['holds'], who['holdsHidden'] = 'bag', True
        # ĐỢT 39 A: người được `["giveChange", "@người này"]` / `["stampCard", "@người này"]` mà không cầm gì thì có sẵn xấp tiền / thẻ tích điểm ĐANG CẤT.
        for kind, item in (('giveChange', 'cash'), ('stampCard', {'kind': 'stampcard', 'stamped': True})):
            if not pet and any(isinstance(t, dict) and isinstance(t.get('do'), list) and any(isinstance(step, list) and len(step) > 1 and step[0] == kind and step[1] == '@' + name for step in t['do']) for t in bag_turns):
                if 'holds' not in who: who['holds'], who['holdsHidden'] = {'R': item}, True
                elif not who.get('holdsHidden') and (isinstance(who['holds'], str) or isinstance(who['holds'], dict) and len(who['holds']) == 1 and not set(who['holds']) - {'L', 'R'}):
                    # Đang cầm một món khác (điện thoại): xấp tiền / thẻ nhận được đặt ở TAY KIA, đang cất (`holdsHidden: ["L"]`).
                    mine = {'R': who['holds']} if isinstance(who['holds'], str) else dict(who['holds'])
                    free = 'L' if 'R' in mine else 'R'
                    who['holds'] = dict(mine, **{free: item}); who['holdsHidden'] = [free]
        # ĐỢT 42 E: người NHẶT đồ (`["pickUp", …, { "item": "bowl" }]`) mà không cầm gì: có sẵn món ấy ĐANG CẤT — `pickUp` lấy nó ra khi tay nắm
        # lấy món đồ dưới sàn. (Rig tự cho món đồ khi gọi một mình; trong cả cảnh, trạng thái đầu cảnh phải biết trước là món đồ đang cất.)
        picks = [step for t in bag_turns if isinstance(t, dict) and t.get('who') == name and isinstance(t.get('do'), list) for step in t['do'] if step == 'pickUp' or (isinstance(step, list) and step and step[0] == 'pickUp')]
        if not pet and picks and 'holds' not in who:
            pick_options = next((a for a in (picks[0][1:] if isinstance(picks[0], list) else []) if isinstance(a, dict)), {})
            who['holds'], who['holdsHidden'] = pick_options.get('item', 'toy'), True
        # `holds`: tên món đồ (cầm tay phải) hoặc { "L" | "R": tên }.
        if 'holds' in who or 'holdsHidden' in who:
            if pet: fail(f'character "{name}": a pet cannot hold an item')
            held = who.get('holds')
            if isinstance(held, str):
                # Một món đồ, không nói tay nào: cầm ở tay PHÍA NGƯỜI SẼ NHẬN / ĐƯA (lượt `handOver` / `take` đầu tiên của người
                # này). Tay phải mặc định mà người kia đứng bên trái thì cánh tay phải vắt ngang bụng, bàn tay không ra khỏi thân
                # (cảnh thử đợt 29: bác sĩ đưa thuốc, tay cách tay bà 20 % chiều cao).
                side = 'R'
                spots = {c.get('name'): float(c.get('x', 0)) for c in cast if isinstance(c, dict) and isinstance(c.get('x'), (int, float))}
                turns_of = [t for entry in (scene.get('script') or []) for t in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry])]
                # Người nhận đứng một mình trong kịch bản (`take` do công cụ thêm vào lượt `handOver` của người kia): tính theo người đưa.
                swap = next((step[1][1:] if t.get('who') == name else t.get('who') for t in turns_of if isinstance(t, dict) and isinstance(t.get('do'), list)
                             for step in t['do'] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str)
                             and ((t.get('who') == name and step[0] in ('handOver', 'take', 'handOverBag', 'takeBag') and step[1][1:] in spots)
                                  or (step[0] in ('handOver', 'handOverBag') and step[1] == '@' + name and t.get('who') in spots and who.get('holdsHidden')))), None)
                if swap and name in spots and spots[swap] < spots[name]: side = 'L'
                held = {side: held}
            # Một món đồ: tên, hoặc { "kind": "phone", "image": "app.png" } (ảnh trên màn hình điện thoại).
            def item_ok(item):
                if isinstance(item, dict): return item.get('kind') in ITEM_KINDS and set(item) <= {'kind', 'image'} | DESK_OPTIONS and (not item.get('image') or item['kind'] == 'phone')
                return item in ITEM_KINDS
            if not isinstance(held, dict) or not held or any(side not in ('L', 'R') or not item_ok(item) for side, item in held.items()):
                fail(f'character "{name}": "holds" must be one of {", ".join(ITEM_KINDS)}, an object such as {{"L": "cup"}}, or {{"R": {{"kind": "phone", "image": "app.png"}}}} — got {js(who.get("holds"))}')
            for item in held.values():
                if isinstance(item, dict) and item.get('image') and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['image'])): fail(f'character "{name}": holds image not found: {item["image"]}')
            if who.get('holdsHidden') not in (None, False, True) and not (isinstance(who['holdsHidden'], list) and who['holdsHidden'] and set(who['holdsHidden']) <= {'L', 'R'}): fail(f'character "{name}": "holdsHidden" must be true, false or a list of hands such as ["L"]')
            who['holds'] = held
        # `wears`: phụ kiện của thú — "cone" (loa chống liếm), "bandage" (băng chân), hay một danh sách.
        if 'wears' in who:
            allowed = WEARABLES if pet else PERSON_WEARABLES
            worn = who['wears'] if isinstance(who['wears'], list) else [who['wears']]
            if not worn or any(item not in allowed for item in worn): fail(f'character "{name}": "wears" must be {" or ".join(allowed)}{" (a pet)" if pet else " (a person)"}, or a list of them — got {js(who["wears"])}')
            who['wears'] = worn
        if pet and who.get('seated') not in (None, False, True): fail(f'character "{name}": a pet has no chair — use "seated": true')
        if who.get('seated') not in (None, False, True, 'chair', 'stool'): fail(f'character "{name}": "seated" must be true, "chair" or "stool"')
        frame = PET if pet else PERSON
        host_height = float(who.get('height', (pet_default if pet else person_default) * (0.74 if stage_set is not None else 1)))
        host_width = host_height * frame[0] / frame[1]
        unit = host_height / frame[1]
        stand = float(who['x'])
        centre = stand
        if who.get('enter') and name in late: fail(f'character "{name}" has "enter" both on the character (enters at the start) and on a turn (enters later) — keep one')
        if late.get(name) not in (None, 'left', 'right'): fail(f'a turn of "{name}" has "enter": {js(late.get(name))} — it must be "left", "right" or true')
        coming = who.get('enter') or late.get(name)
        # Host nằm ngay TẠI chỗ đứng; `enter` nhận quãng đi tính sẵn, đủ để xuất phát ngoài hẳn mép khung: tới mép,
        # cộng 0,39 × chiều cao host cho cái đầu và tóc (thú: 0,6 × — thân nằm ngang, dài hơn). Trước bản 0.29 host
        # được đặt sát mép rồi nối thêm một bước `walk` tới chỗ đứng — hai động tác cho một việc.
        reach = (stand if coming == 'left' else width - stand) + (0.39 if not pet else 0.6) * host_height if coming else 0
        if stage_set is not None and coming:
            # Bối cảnh 3D: bước vào qua TƯỜNG BÊN (gắn một tấm "panel" làm cửa ở đó cho dễ đọc). Xuất phát từ ngoài
            # tường hẳn một nửa bề ngang người; set3d mờ dần nhân vật khi nó còn ở ngoài phòng.
            half = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))['width'] / 2
            reach = (stand + half if coming == 'left' else half - stand) + 0.55 * host_width
        # Số tính ra cất dưới khoá có gạch dưới ở đầu — khoá của người viết kịch bản không bao giờ trùng được.
        names[name] = dict(who, _x0=float(who['x']), _pet=pet, _host_height=host_height, _host_width=host_width, _unit=unit, _left=centre - host_width / 2,
                           _walk=0, _enter_distance=round(reach / unit), _element=f'{slug(name)}', _late=late.get(name), _nearer=nearer)
    for who in names.values():
        if who.get('faces') and who['faces'] not in names: fail(f'character "{who["name"]}" faces "{who["faces"]}", who is not in the scene')

    # ── kịch bản ──
    script = scene.get('script')
    if not isinstance(script, list) or not script: fail('"script" must be a non-empty list of turns')
    # ĐỢT 39 A — QUẦY THU NGÂN: lượt quét QR / quẹt thẻ cần một đế thanh toán (`paystand`: mã QR + máy quẹt thẻ). Bối cảnh 3D chưa có thì tự đặt một cái lên
    # MẶT QUẦY (hộp tên "counter" — cảnh dựng sẵn "reception" / "pharmacy") ở đầu quầy gần người trả tiền nhất, sát mép TRƯỚC (phía khách đứng — khách vẽ ĐÈ lên đế, thấy điện thoại trên mã QR).
    def desk_steps():
        for entry in script:
            for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
                if not isinstance(turn, dict): continue
                for step in (turn.get('do') or []) if isinstance(turn.get('do'), list) else []:
                    name = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
                    if name in DESK_ACTIONS: yield turn, step, name
    payers = [turn.get('who') for turn, step, name in desk_steps() if name in DESK_PAY]
    if payers and stage_set is not None and payers[0] in names and not any(item.get('kind') == 'paystand' for item in stage_set.get('cutouts', [])):
        counters = [box for box in stage_set.get('boxes', []) if 'counter' in str(box.get('name', ''))]
        if not counters: fail('"payByQR" / "payByCard" need a pay stand on a counter: add a cutout { "kind": "paystand", "x": …, "z": …, "y": <counter height> } to "set", or use "preset": "reception" / "pharmacy" (they have a counter — the stand is added for you)')
        payer = names[payers[0]]
        box = min(counters, key=lambda b: abs(float(b['x']) + float(b['width']) / 2 - float(payer['x'])))
        right = float(payer['x']) >= float(box['x']) + float(box['width']) / 2
        stage_set.setdefault('cutouts', []).append({'kind': 'paystand', 'name': 'paystand', 'x': round(float(box['x']) + float(box['width']) - 70) if right else round(float(box['x']) + 70),
                                                    'z': round(float(box['z']) - 24), 'y': float(box['height'])})
    # AI CÓ CON VẬT NẤP SAU LƯNG (đợt 35, lượt bốn): người ấy nói thì múa tay phía KIA — tay phía con vật vẽ đè lên cái đầu nó đang ló ra.
    hiders = {}
    for entry in script:
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            for step in (turn.get('do') or []) if isinstance(turn, dict) else []:
                if isinstance(step, list) and len(step) > 1 and step[0] == 'hide' and isinstance(step[1], str) and step[1].startswith('@'):
                    hiders[step[1][1:]] = turn.get('who')
    voices = []                                             # { key, file, text }
    st.keep(base=base, copied=copied, drives=drives, height=height, hiders=hiders, names=names, out=out, person_default=person_default,
            scene_id=scene_id, script=script, voices=voices, width=width)
