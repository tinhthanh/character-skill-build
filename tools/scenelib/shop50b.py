"""Wave 50 B: the pet shop and the POS counter — takeFromShelf (a shelf of the 3D set named "@<cutout name>", the 49 A prop mechanism) and
scanBarcode (a hand-held scanner aimed at the product in the other hand, or taken from the customer across the counter).

SHELVES. A step ["takeFromShelf", "@ke_hang", { "item": "foodBag", "level": "middle" }] names a set.cutouts picture of a shelf of the sets repo
(`gondola_shelf`, `pet_food_shelf`, `medicine_wall_shelf` — its image file name is its kind, cage.prop_target) that has a "name". The person walks
(x only) to stand just outside the shelf's nearer edge, on the side they are on, and reaches to the row of `level` (`SHELF_ROWS`: where the goods sit
in the picture, a share of its height from its bottom). The person must stand just in front of the shelf (z within `SHELF_Z`). Without a shelf —
["takeFromShelf", { … }], ["takeFromShelf", "left" | "right", { … }] — the person mimes it beside themselves.

HANDS. The product goes into a hand that is given it, put away, from the start of the scene (like `pickUp`): `give_goods` adds it to "holds" /
"holdsHidden" and writes the hand into the step ("side"), so the rig and the scene agree. The cashier of ["scanBarcode", "@khach"] is given the same
product (put away) in the hand towards the customer; a lone ["scanBarcode", "@khach"] turn makes the customer hand it over at the same time."""
import os
from .util import fail, js

SHELF_KINDS = ('gondola_shelf', 'pet_food_shelf', 'medicine_wall_shelf')
SHELF_ROWS = {'gondola_shelf': {'middle': 0.62, 'low': 0.14}, 'pet_food_shelf': {'high': 0.78, 'middle': 0.43, 'low': 0.2},
              'medicine_wall_shelf': {'high': 0.68, 'middle': 0.25}}
SHELF_RATIO = {'gondola_shelf': 380 / 250, 'pet_food_shelf': 320 / 370, 'medicine_wall_shelf': 280 / 200}      # bề ngang / bề cao ảnh (sets.py show)
SHELF_INSET = 0.1                       # chỗ lấy hàng: trong mép kệ gần người chừng ấy bề ngang kệ
SHELF_GAP = 0.1                         # người đứng ngoài mép kệ chừng ấy × chiều cao host của họ
SHELF_Z = (10, 160)                     # người đứng trước kệ: z của người − z của kệ trong khoảng này
ITEMS = ('foodBag', 'treatBox', 'can')  # runtime/shop50b-items.js
LEVELS = ('high', 'middle', 'low')
PUTS = ('down', 'keep', 'bag')
ACTIONS = ('takeFromShelf', 'scanBarcode')
TAKE_OPTIONS = {'item', 'level', 'label'}
SCAN_OPTIONS = {'hold', 'put', 'price'}
# Nhịp của rig (runtime/person/shop50b.js): lúc nắm lấy món hàng, lúc đọc nhãn, độ dài bước (không nhích); quét: lúc món hàng sang tay, tia đỏ bật, "bíp".
TAKE_GRAB, TAKE_READ = 1.12, 2.6
SCAN_HANDOFF, SCAN_START, SCAN_BEEP = 0.62, 0.55, 0.55


def kind_of(item):
    """Loại của một cutout: "kind", không thì tên tệp ảnh (ảnh của kho sets: sets-assets/gondola_shelf.svg → gondola_shelf)."""
    if item.get('kind'): return item['kind']
    return os.path.splitext(os.path.basename(str(item.get('image') or '')))[0] or None


def _options(step, at, allowed, where, usage):
    options = step[at] if len(step) > at else {}
    if len(step) > at + 1 or not isinstance(options, dict) or set(options) - allowed - {'side'}: fail(f'{where}: "{step[0]}" takes {usage} — got {js(step)}')
    return options


def _take_parts(step, where):
    """["takeFromShelf"] · ["takeFromShelf", { … }] · ["takeFromShelf", "@kệ" | "left" | "right" | null, { … }] → (chỗ, tuỳ chọn)."""
    usage = '["takeFromShelf", "@<shelf>" (or "left" / "right", or leave it out), { "item": "foodBag" | "treatBox" | "can", "level": "high" | "middle" | "low" }]'
    if len(step) > 1 and isinstance(step[1], dict): place, options = None, _options(step, 1, TAKE_OPTIONS, where, usage)
    else: place, options = (step[1] if len(step) > 1 else None), _options(step, 2, TAKE_OPTIONS, where, usage)
    if not (place is None or place in ('left', 'right') or (isinstance(place, str) and place.startswith('@'))): fail(f'{where}: "takeFromShelf" takes {usage} — got {js(step)}')
    if options.get('item', 'foodBag') not in ITEMS: fail(f'{where}: "takeFromShelf" item must be {", ".join(js(i) for i in ITEMS)} — got {js(options.get("item"))}')
    if options.get('level', 'middle') not in LEVELS: fail(f'{where}: "takeFromShelf" level must be "high", "middle" or "low" — got {js(options.get("level"))}')
    if 'label' in options and not (isinstance(options['label'], str) and options['label'].strip() and len(options['label']) <= 18): fail(f'{where}: "takeFromShelf" label must be a short text (up to 18 characters) — got {js(options["label"])}')
    return place, options


def _scan_parts(step, where):
    usage = '["scanBarcode", "@<customer>" (or leave it out: the product in the other hand), { "hold": 1.2, "put": "down" | "keep" | "bag", "price": "125.000đ" }]'
    if len(step) > 1 and isinstance(step[1], dict): other, options = None, _options(step, 1, SCAN_OPTIONS, where, usage)
    else: other, options = (step[1] if len(step) > 1 else None), _options(step, 2, SCAN_OPTIONS, where, usage)
    if not (other is None or (isinstance(other, str) and other.startswith('@'))): fail(f'{where}: "scanBarcode" takes {usage} — got {js(step)}')
    if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and 0.4 <= options['hold'] <= 4): fail(f'{where}: "scanBarcode" hold must be 0.4…4 seconds — got {js(options["hold"])}')
    if options.get('put', 'down') not in PUTS: fail(f'{where}: "scanBarcode" put must be "down", "keep" or "bag" — got {js(options.get("put"))}')
    if 'price' in options and not (isinstance(options['price'], str) and options['price'].strip() and len(options['price']) <= 14): fail(f'{where}: "scanBarcode" price must be a short text (up to 14 characters) such as "125.000đ" — got {js(options["price"])}')
    return other, options


def _shelf(stage_set, ref, where, names=()):
    """"@kệ" → cutout (kiểm tra như cage.prop_target: có bối cảnh 3D, có tên, đúng loại kệ)."""
    from .cage import prop_target
    from .state import State
    _, item = prop_target(State(names=dict.fromkeys(names), stage_set=stage_set), ref, where, 'takeFromShelf')
    return item


def _shelf_geo(item, level, where, person_default):
    kind = kind_of(item)
    rows = SHELF_ROWS[kind]
    if level not in rows: fail(f'{where}: the shelf "{item.get("name")}" ({kind}) has no "{level}" row — its rows: {", ".join(js(r) for r in rows)}')
    tall = float(item.get('height', round(person_default * 0.74)))
    width = tall * SHELF_RATIO[kind]
    return {'tall': tall, 'width': width, 'x': float(item['x']), 'z': float(item['z']), 'y': float(item.get('y', 0)) + rows[level] * tall}


def _hand(level, toward):
    """Tay lấy hàng (như rig): tầng cao — tay phía kệ; tầng giữa / thấp — tay phía người xem khi đã quay về kệ."""
    return ('R' if toward > 0 else 'L') if level == 'high' else ('L' if toward > 0 else 'R')


def _put_in_hand(who, side, kind, where):
    """Thêm món hàng (đang cất) vào tay `side` của người — tay ấy rảnh, hay đã có đúng món ấy; không thì tay kia."""
    held = who.get('holds')
    held = {} if held is None else ({'R': held} if isinstance(held, str) else dict(held))
    name = lambda item: item if isinstance(item, str) else (item or {}).get('kind')
    for hand in (side, 'L' if side == 'R' else 'R'):
        if hand not in held or name(held[hand]) == kind:
            if hand not in held:
                held[hand] = kind
                hidden = who.get('holdsHidden')
                if hidden is not True: who['holdsHidden'] = sorted(set(hidden if isinstance(hidden, list) else ([] if not hidden else [])) | {hand})
                if not who.get('holdsHidden') and len(held) == 1: who['holdsHidden'] = True
            who['holds'] = held
            return hand
    fail(f'{where}: "{who.get("name")}" has no free hand for the {kind} — both hands already hold other things ({js(held)})')


def give_goods(who, cast, scene_turns, stage_set, person_default):
    """Trước khi đọc "holds": người lấy hàng trên kệ có sẵn món hàng ĐANG CẤT ở tay sẽ lấy (ghi tay ấy vào bước); thu ngân quét món hàng của
    khách có sẵn cùng món ấy đang cất ở tay phía khách."""
    if who.get('species'): return
    name = who.get('name')
    spots = {c.get('name'): c for c in cast if isinstance(c, dict)}
    for t in scene_turns:
        if not (isinstance(t, dict) and isinstance(t.get('do'), list)): continue
        for n, step in enumerate(t['do']):
            head = step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None
            where = f'"{t.get("who")}" {head}'
            if head == 'takeFromShelf' and t.get('who') == name:
                step = t['do'][n] = list(step) if isinstance(step, list) else [step]
                place, options = _take_parts(step, where)
                toward = -1 if place == 'left' else 1
                if isinstance(place, str) and place.startswith('@') and stage_set is not None:
                    item = next((c for c in stage_set.get('cutouts', []) if c.get('name') == place[1:]), None)
                    if item is not None and 'x' in who: toward = 1 if float(item['x']) >= float(who['x']) else -1
                if 'side' not in options:
                    options['side'] = _put_in_hand(who, _hand(options.get('level', 'middle'), toward), options.get('item', 'foodBag'), where)
                    if len(step) > 1 and isinstance(step[1], dict): step[1] = options
                    elif len(step) > 2: step[2] = options
                    else: step += [None, options] if len(step) == 1 else [options]
            if head == 'scanBarcode' and t.get('who') == name and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@'):
                other = spots.get(step[1][1:])
                if not other or other.get('species'): continue
                kind = goods_of(other, scene_turns)
                if not kind: fail(f'{where}: "{step[1][1:]}" holds no product to scan — they take one off a shelf first (["takeFromShelf", …]) or give them "holds": "foodBag"')
                options = step[2] if len(step) > 2 and isinstance(step[2], dict) else {}
                if 'side' not in options and 'x' in who and 'x' in other:
                    options['side'] = _put_in_hand(who, 'R' if float(other['x']) >= float(who['x']) else 'L', kind, where)
                    if len(step) > 2: step[2] = options
                    else: step.append(options)
    _take_back(who, scene_turns)


def _take_back(who, scene_turns):
    """Người có món hàng VÀ một món khác (điện thoại) đang cất: bước NHẬN LẠI món hàng (["take", "@thu_ngan"]) ghi rõ tay cầm món hàng — `take` tự
    chọn thì lấy tay phải trước (điện thoại hiện ra thay cho món hàng)."""
    held = who.get('holds') if isinstance(who.get('holds'), dict) else {}
    kind = lambda item: item if isinstance(item, str) else (item or {}).get('kind')
    goods = [hand for hand, item in held.items() if kind(item) in ITEMS]
    if len(goods) != 1 or len(held) < 2: return
    for t in scene_turns:
        if not (isinstance(t, dict) and t.get('who') == who.get('name') and isinstance(t.get('do'), list)): continue
        for n, step in enumerate(t['do']):
            if isinstance(step, list) and len(step) == 2 and step[0] == 'take' and isinstance(step[1], str) and step[1].startswith('@'): t['do'][n] = step + [goods[0]]


def goods_of(who, scene_turns):
    """Món hàng một người có: món đầu tiên họ lấy trên kệ, hay món hàng họ cầm sẵn."""
    for t in scene_turns:
        if not (isinstance(t, dict) and t.get('who') == who.get('name') and isinstance(t.get('do'), list)): continue
        for step in t['do']:
            if isinstance(step, list) and step and step[0] == 'takeFromShelf':
                options = next((a for a in step[1:] if isinstance(a, dict)), {})
                return options.get('item', 'foodBag')
    held = who.get('holds')
    for item in (held.values() if isinstance(held, dict) else [held]):
        kind = item if isinstance(item, str) else (item or {}).get('kind')
        if kind in ITEMS: return kind
    return None


def walk_to_shelf(emitted, st, turn, turns, who):
    """Trước lượt: bước tới đứng ngoài mép kệ gần mình (phía mình đang đứng), cách mép `SHELF_GAP` × chiều cao người."""
    stage_set, names = st.take('stage_set', 'names')
    for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
        if not (isinstance(step, list) and step and step[0] == 'takeFromShelf') or who.get('seated'): continue
        place, options = _take_parts(step, f'"{who["name"]}" takeFromShelf')
        if not (isinstance(place, str) and place.startswith('@')): continue
        item = _shelf(stage_set, place, f'"{who["name"]}" takeFromShelf', names)
        geo = _shelf_geo(item, options.get('level', 'middle'), f'"{who["name"]}" takeFromShelf', st.person_default)
        side = 1 if float(who['x']) >= geo['x'] else -1
        move = geo['x'] + side * (geo['width'] / 2 + SHELF_GAP * who['_host_height']) - float(who['x'])
        if abs(move) > 0.03 * who['_host_height']:
            turns.append((f'  // {who["name"]} steps up beside {place[1:]} for "takeFromShelf"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move


def step_code(st, step, where, actor):
    """["takeFromShelf", …] / ["scanBarcode", …] → JS; ghi một phép đo cho moments.json (tools/acting_check.py `shop50b`)."""
    names, stage_set = st.take('names', 'stage_set')
    if actor not in names or names[actor]['_pet']: fail(f'{where}: "{step[0]}" is done by a person, not a pet')
    who = names[actor]
    if step[0] == 'takeFromShelf':
        place, options = _take_parts(step, where)
        level, item = options.get('level', 'middle'), options.get('item', 'foodBag')
        spec, shelf_name = js(place if place in ('left', 'right') else 'right'), None
        if isinstance(place, str) and place.startswith('@'):
            if place[1:] in names: fail(f'{where}: "{place}" is a character — "takeFromShelf" needs a shelf of the set (a set.cutouts picture of {", ".join(SHELF_KINDS)} with a "name")')
            shelf = _shelf(stage_set, place, where, names)
            geo = _shelf_geo(shelf, level, where, st.person_default)
            my_z = float(who.get('z', -300))
            if not SHELF_Z[0] <= my_z - geo['z'] <= SHELF_Z[1]:
                fail(f'{where}: "{actor}" must stand just in front of the shelf "{shelf.get("name")}" (z {geo["z"]:g}) to reach it — give "{actor}" a z between {geo["z"] + SHELF_Z[0]:g} and {geo["z"] + SHELF_Z[1]:g} (now {my_z:g})')
            side = 1 if float(who['x']) >= geo['x'] else -1
            x = geo['x'] + side * (geo['width'] / 2 - SHELF_INSET * geo['width'])
            index = stage_set['cutouts'].index(shelf)
            spec, shelf_name = f"{{ at: set.targetPoint({actor}, [{x:g}, {geo['y']:g}, {geo['z']:g}]), shelf: cutout{index + 1} }}", shelf.get('name')
        if who.get('seated'): fail(f'{where}: "{actor}" is seated — "takeFromShelf" is done standing ("standUp" first)')
        st.gear_ops.append({'turn': st.emitted[0], 'kind': 'shop50b', 'name': 'takeFromShelf', 'who': actor, 'target': shelf_name, 'item': item, 'level': level})
        rig_options = {key: options[key] for key in ('item', 'level', 'side', 'label') if key in options}
        return f"['takeFromShelf', {spec}, {js(rig_options)}]"
    other, options = _scan_parts(step, where)
    if other is not None:
        if other[1:] not in names: fail(f'{where}: "{other}" refers to a character that is not in the scene')
        if names[other[1:]]['_pet']: fail(f'{where}: "scanBarcode" scans a product the customer hands over — "{other[1:]}" is a pet')
        if other[1:] == actor: fail(f'{where}: "scanBarcode" takes the product from ANOTHER person — leave out "{other}" to scan the product in "{actor}"\'s other hand')
    st.gear_ops.append({'turn': st.emitted[0], 'kind': 'shop50b', 'name': 'scanBarcode', 'who': actor, 'target': other[1:] if other else None,
                        'hold': float(options.get('hold', 1.2)), 'put': options.get('put', 'down')})
    rig_options = {key: options[key] for key in ('hold', 'put', 'price', 'side') if key in options}
    return f"['scanBarcode', {other[1:] if other else 'null'}, {js(rig_options)}]"


def partner_code(code, entry, names, emitted):
    """Lượt RIÊNG ["scanBarcode", "@khach", …]: khách đưa món hàng CÙNG LÚC (`handOver` về phía thu ngân) — không thì món hàng tự bay sang tay."""
    scans = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'scanBarcode' and isinstance(step[1], str) and step[1].startswith('@')]
    if not scans or 'say' in entry or not code.startswith('[') or len(entry.get('do', [])) != 1: return code
    other = names.get(scans[0][1][1:])
    if not other or other['_pet']: return code
    emitted[0] += 1
    return '{ together: [' + code + f", [{other['name']}, ['handOver', {names[entry['who']]['name']}]]] }}"


def plan(op, t0, duration):
    """Các lúc đo (tools/acting_check.py `shop50b`) theo nhịp của rig, tính từ đầu bước `t0`."""
    r = lambda a: round(t0 + a, 2)
    who, name = op['who'], op['name']
    if name == 'takeFromShelf':
        check = {'grab': [r(TAKE_GRAB + 0.06), r(TAKE_GRAB + 0.14)], 'read': [r(TAKE_READ)], 'held': [r(duration - 0.05)]}
        times = [r(TAKE_GRAB), r(TAKE_READ), r(duration - 0.05)]
        ask = [f'Is {who} reaching to a shelf{" (" + op["target"] + ")" if op.get("target") else ""} and taking a product off it ({op["level"]} row)?',
               f'Is {who} holding the product up and reading its label?']
    else:
        A = 0.88 if op.get('target') else 0.1
        S0, hold = A + SCAN_START, op.get('hold', 1.2)
        beep = S0 + min(SCAN_BEEP, hold * 0.6)
        n = max(2, int((hold - 0.15) / 0.15))
        check = {'beam': [r(S0 + 0.08 + (hold - 0.16) * i / (n - 1)) for i in range(n)], 'beep': [r(beep + 0.15)], **({'taken': [r(A + 0.05)]} if op.get('target') else {})}
        times = [r(A), r(beep + 0.15), r(S0 + hold - 0.1)]
        ask = [f'Is {who} aiming a hand-held barcode scanner at a product{" taken from " + op["target"] if op.get("target") else ""}, a red scan line on it?',
               'Does the scanner beep (a green flash) and a price pop up?']
    return {'times': times, 'ask': ask, 'check': dict(check, kind='shop50b', name=name, who=who, target=op.get('target'), times=times)}
