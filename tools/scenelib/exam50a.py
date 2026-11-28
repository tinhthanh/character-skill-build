"""Wave 50 A — the exam room: feel the pet's belly / flanks (`palpate`), an ultrasound scan (`useUltrasound`), a microscope at the lab bench
(`lookMicroscope`).

    ["palpate", "@cho", { "part": "belly" | "flank", "hold": 2 }]
    ["useUltrasound", "@meo", "@may_sieu_am", { "hold": 2.6 }]          the cart is optional
    ["lookMicroscope", "@kinh_hien_vi", { "hold": 2 }]                  the microscope is optional (mimed in front)

`palpate` / `useUltrasound` are hands-on care (HANDS_ON_CARE, like `trimFur`): the person goes to the head end of the pet (kneels for one on
the floor), the pet reads the person's channels (it stands up for palpation, lies on its side for the scan). The pet's own pose `lieOnSide`
is a plain pet step.

PROPS BY NAME. The cart and the microscope are PICTURE cutouts of a 3D set (`characters/sets`: `ultrasound_cart`, `microscope` — an
"image", no "kind"), named in the scene ("name") and called "@<name>" in a step, as wave 49 A does for its cage. They are resolved here (not
through cage.PROP_STEPS: those rows also get the cage's walk-up) — a character-build prop ("kind") is refused. Without "@name", a step uses
the set's only cutout whose image is a microscope / an ultrasound cart, when there is exactly one. The microscope: the person walks up beside
it (x only, like the cage) and must stand within MICRO_Z of its depth; its eyepiece and focus knob are points of the picture (MICRO_EYE,
MICRO_KNOB in its 110 × 150 drawing). The cart: the person glances at its screen (CART_SCREEN in its 200 × 400 drawing).

Medical guardrail: nothing here writes text on screen — the scan card is a generic picture (runtime)."""
import os
from .util import fail, js

EXAM_50A = ('palpate', 'useUltrasound')
MICRO = 'lookMicroscope'
PARTS = ('belly', 'flank')
HOLD = {'palpate': (1, 6, 2), 'useUltrasound': (1, 6, 2.6), MICRO: (1, 6, 2)}           # (ít nhất, nhiều nhất, mặc định) — runtime/person/exam50a.js
OPTIONS = {'palpate': {'hold', 'part'}, 'useUltrasound': {'hold'}, MICRO: {'hold'}}
USAGE = {'palpate': '["palpate", "@pet", { "part": "belly" | "flank", "hold": 2 }]', 'useUltrasound': '["useUltrasound", "@pet", "@<ultrasound cart>", { "hold": 2.6 }] (the cart is optional)',
         MICRO: '["lookMicroscope", "@<microscope>", { "hold": 2 }] (the microscope is optional)'}
PROP_WORD = {'useUltrasound': 'ultrasound', MICRO: 'microscope'}          # chữ trong tên ảnh của cutout ấy (characters/sets: ultrasound_cart.svg, microscope.svg)
DRAWING = {'useUltrasound': (200, 400), MICRO: (110, 150)}                # cỡ bản vẽ của cutout (characters/sets/industries/vet/props)
CART_SCREEN = (100, 86)                  # giữa màn hình xe đẩy siêu âm trong bản vẽ 200 × 400
MICRO_EYE = (39, 8)                      # đỉnh thị kính (ống nghiêng −20°) trong bản vẽ 110 × 150
MICRO_KNOB = (84, 108)                   # núm chỉnh tiêu cự
MICRO_Z = 80                             # người đứng cách mặt phẳng kính hiển vi ≤ chừng ấy (tay / mắt chỉ với tới trong mặt phẳng của mình)
MICRO_GAP = 0.06                         # giữa người cách mép kính hiển vi chừng ấy × chiều cao host của người
# Nhịp của rig (runtime/person/exam50a.js) — lúc đo của moments.json, tính từ đầu bước.
PALP_C0 = 0.6                            # palpate: hai tay đặt xong, bắt đầu ấn
SCAN_G0, SCAN_S0 = 0.55, 1.85            # useUltrasound: lọ gel trong tay, bắt đầu rà đầu dò
MICRO_L0 = 1.25                          # lookMicroscope: mắt đã ở thị kính


def _cutouts(st):
    return (st.stage_set or {}).get('cutouts', []) if st.stage_set is not None else []


def _width(item):
    w, h = DRAWING[item['_for50a']]
    return float(item.get('height', h)) * w / h


def find_prop(st, ref, where, action):
    """"@<name>" (hay None: cutout duy nhất có ảnh đúng loại) → (số thứ tự, cutout); None khi không đưa tên và không có cái nào / có nhiều."""
    cutouts, names = _cutouts(st), st.names
    word = PROP_WORD[action]
    fitting = [c for c in cutouts if c.get('image') and not c.get('kind') and word in os.path.basename(str(c['image'])).lower()]
    if ref is None:
        if len(fitting) != 1: return None
        item = fitting[0]
    else:
        if st.stage_set is None: fail(f'{where}: "{action}" names a prop of a 3D set ("{ref}") — add "set" with a picture cutout named "{ref[1:]}" (characters/sets: the {word} picture)')
        name = ref[1:]
        item = next((c for c in cutouts if c.get('name') == name), None)
        listed = ', '.join('@' + c['name'] for c in fitting if c.get('name')) or 'none'
        if item is None:
            if name in names: fail(f'{where}: "{ref}" is a character — "{action}" needs the {word} picture of the set here (named {word} cutouts: {listed})')
            fail(f'{where}: "{ref}" — no set.cutouts item has "name": "{name}" (add "name" to the {word} picture cutout; named {word} cutouts here: {listed})')
        if item.get('kind') or not item.get('image'):
            fail(f'{where}: "{ref}" is a "{item.get("kind") or "box"}" cutout — "{action}" needs a picture cutout of the {word} ("image", e.g. characters/sets {"ultrasound_cart" if word == "ultrasound" else "microscope"}.svg)')
    item['_for50a'] = action
    return cutouts.index(item), item


def _point(item, at):
    """Một điểm (x, y) của bản vẽ cutout → [x, y] trong phòng (cutout đứng giữa đáy ở x, đáy ở y)."""
    w, h = DRAWING[item['_for50a']]
    unit = float(item.get('height', h)) / h
    return [float(item['x']) + (at[0] - w / 2) * unit, float(item.get('y', 0)) + (h - at[1]) * unit, float(item['z'])]


def _split(step, action):
    """[tên, (đích…), "@prop"?, { tuỳ chọn }?] → (ref, options, phần thừa)."""
    rest = list(step[2:] if action in EXAM_50A else step[1:])
    ref = rest.pop(0) if action != 'palpate' and rest and isinstance(rest[0], str) else None
    options = rest.pop(0) if rest and isinstance(rest[0], dict) else {}
    return ref, options, rest


def _check_options(action, options, extra, step, where):
    if extra or not isinstance(options, dict) or set(options) - OPTIONS[action]: fail(f'{where}: "{action}" takes {USAGE[action]} — got {js(step)}')
    lo, hi, _ = HOLD[action]
    if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and lo <= options['hold'] <= hi):
        fail(f'{where}: "{action}" hold must be {lo:g}…{hi:g} seconds — got {js(options["hold"])}')
    if 'part' in options and options['part'] not in PARTS: fail(f'{where}: "palpate" part must be "belly" or "flank" — got {js(options["part"])}')


def care_code(st, step, where, actor):
    """["palpate", "@pet", {…}] / ["useUltrasound", "@pet", "@cart"?, {…}] → JS (đích: giữa mặt con vật như các động tác chăm sóc đợt 38 A)."""
    names, stage_set = st.names, st.stage_set
    action = step[0]
    ref, options, extra = _split(step, action)
    if action == 'palpate' and len(step) > 2 and isinstance(step[2], str): fail(f'{where}: "palpate" takes {USAGE["palpate"]} — got {js(step)}')
    if ref is not None and not (isinstance(ref, str) and ref.startswith('@')): fail(f'{where}: "{action}" takes {USAGE[action]} — got {js(step)}')
    _check_options(action, options, extra, step, where)
    pet = step[1][1:]
    other = names[pet]
    if action == 'useUltrasound' and stage_set is not None and not other.get('on'):
        fail(f'{where}: "useUltrasound" scans a pet lying on a table — "{pet}" stands on the floor (a kneeling person cannot reach its belly): give it "on": "table" (or carry it up first)')
    if stage_set is not None and abs(float(other.get('z', -300)) - float(names[actor].get('z', -300))) > 15:
        st.reach_notes.append(f'{where}: "{actor}" {action} "{pet}" from z {float(names[actor].get("z", -300)):g}, "{pet}" is at z {float(other.get("z", -300)):g} — the hands and the probe land on its belly only in the same plane: give them the same z')
    walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
    at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
    aim = f"set.target({actor}, {pet}, 'head'{at})" if stage_set is not None else pet
    parts = [f'{key}: {js(value)}' for key, value in options.items()]
    if stage_set is not None: parts.append("facing: 'away'")          # con vật quay đuôi về người trước lượt (`turn_tail`) — rig đo ở hướng ấy
    if action == 'useUltrasound':
        found = find_prop(st, ref, where, action)
        if found:
            _, cart = found
            parts.append(f"screen: set.targetPoint({actor}, [{', '.join(f'{v:g}' for v in _point(cart, CART_SCREEN))}])")
    return '[' + ', '.join([js(action), aim] + ([f"{{ {', '.join(parts)} }}"] if parts else [])) + ']'


def micro_code(st, step, where, actor):
    """["lookMicroscope", "@kinh"?, { "hold": 2 }] → JS: thị kính và núm chỉnh của cutout ấy (`set.targetPoint`), hay trước mặt (không có kính)."""
    names = st.names
    if actor not in names or names[actor]['_pet']: fail(f'{where}: "{MICRO}" is done by a person, not a pet')
    if isinstance(step, str): step = [step]
    ref, options, extra = _split(step, MICRO)
    if ref is not None and not (isinstance(ref, str) and ref.startswith('@')): fail(f'{where}: "{MICRO}" takes {USAGE[MICRO]} — got {js(step)}')
    _check_options(MICRO, options, extra, step, where)
    found = find_prop(st, ref, where, MICRO)
    parts = [f'{key}: {js(value)}' for key, value in options.items()]
    op = {'turn': st.emitted[0], 'kind': 'micro50a', 'name': MICRO, 'who': actor, 'target': None, 'hold': float(options.get('hold', HOLD[MICRO][2]))}
    if not found:
        st.gear_ops.append(op)
        return f"[{js(MICRO)}, null" + (f", {{ {', '.join(parts)} }}" if parts else '') + ']'
    _, item = found
    me = names[actor]
    if abs(float(me.get('z', -300)) - float(item['z'])) > MICRO_Z:
        fail(f'{where}: "{actor}" stands at z {float(me.get("z", -300)):g}, the microscope "{item.get("name") or item["image"]}" at z {float(item["z"]):g} — the eye only reaches into its own plane: give "{actor}" a z within {MICRO_Z} of it (e.g. {float(item["z"]) + 40:g}, in front of the bench)')
    eye, knob = _point(item, MICRO_EYE), _point(item, MICRO_KNOB)
    parts.append(f"knob: set.targetPoint({actor}, [{', '.join(f'{v:g}' for v in knob)}])")
    st.gear_ops.append(dict(op, prop=item.get('name') or os.path.basename(str(item['image'])), eye=eye))
    return f"[{js(MICRO)}, set.targetPoint({actor}, [{', '.join(f'{v:g}' for v in eye)}]), {{ {', '.join(parts)} }}]"


def walk_up(emitted, st, turn, turns, who):
    """Trước lượt: bước tới đứng cạnh kính hiển vi, bên trái (phía thị kính) — chỉ theo x, như chuồng của đợt 49 A."""
    for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
        name = step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None
        if name != MICRO or who.get('seated') or who['_pet']: continue
        ref, _, _ = _split(step if isinstance(step, list) else [step], MICRO)
        found = find_prop(st, ref if isinstance(ref, str) and ref.startswith('@') else None, f'"{who["name"]}" {MICRO}', MICRO)
        if not found: continue
        _, item = found
        side = -1          # phía THỊ KÍNH (ống kính nghiêng sang trái trong bản vẽ): đứng bên trái kính, mắt gần thị kính nhất
        move = float(item['x']) + side * (_width(item) / 2 + MICRO_GAP * who['_host_height']) - float(who['x'])
        if abs(move) > 0.03 * who['_host_height']:
            turns.append((f'  // {who["name"]} steps up beside the microscope for "{MICRO}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move


def moments_op(emitted, entry, gear_ops, names):
    """Ghi tuỳ chọn (hold, part, có xe đẩy) vào mốc đo `palpate` / `useUltrasound` mà moments.py vừa ghi (nó chỉ đọc tuỳ chọn ở vị trí 3)."""
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if not isinstance(turn, dict) or not isinstance(turn.get('do'), list) or turn.get('who') not in names: continue
        for step in turn['do']:
            if not (isinstance(step, list) and len(step) > 1 and step[0] in EXAM_50A and isinstance(step[1], str)): continue
            ref, options, _ = _split(step, step[0])
            op = next((o for o in reversed(gear_ops) if o.get('kind') == step[0] and o.get('who') == turn['who'] and o.get('target') == step[1][1:] and o.get('turn') == emitted[0]), None)
            if op is None: continue
            op['hold'] = float(options.get('hold', HOLD[step[0]][2]))
            if step[0] == 'palpate': op['part'] = options.get('part', 'belly')
            if ref: op['cart'] = ref[1:]


def care_plan(op, t0):
    """Các lúc đo (tools/acting_check.py `exam50a`), tính từ đầu bước `t0` theo đúng nhịp của runtime/person/exam50a.js."""
    kind, hold, who, pet = op['kind'], float(op.get('hold') or HOLD[op['kind']][2]), op['who'], op['target']
    r = lambda a: round(t0 + a, 2)
    every = lambda a, b, d=0.2: [r(a + d * n) for n in range(int(round((b - a) / d)) + 1)]
    if kind == 'palpate':
        U = PALP_C0 + hold
        times = [r(PALP_C0 + 0.3), r(PALP_C0 + hold / 2), r(U - 0.15)]
        check = {'press': every(PALP_C0 + 0.1, U - 0.1, 0.15), 'flinch': every(PALP_C0, PALP_C0 + 0.6, 0.05), 'after': [r(U + 0.9)], 'part': op.get('part', 'belly')}
        part = 'belly' if op.get('part', 'belly') == 'belly' else 'flanks'
        ask = [f'Is {who} feeling the {part} of the animal ({pet}) with both hands, fingers spread on it?', f'Does the animal ({pet}) stay calm, maybe with a small flinch?']
    else:
        E = SCAN_S0 + hold
        times = [r(SCAN_S0 + 0.4), r(SCAN_S0 + hold / 2), r(E - 0.15)]
        check = {'probe': every(SCAN_S0 + 0.05, E - 0.1), 'gel': [r(SCAN_G0 + 0.85), r(SCAN_G0 + 1.1)], 'lying': every(1.0, E, 0.3), 'card': [r(SCAN_S0 + 0.5), r(E - 0.3)],
                 'after': [r(E + 0.4 + 0.5 + 0.1), r(E + 1.6)], 'cart': op.get('cart')}
        ask = [f'Is the animal ({pet}) lying on its side while {who} holds an ultrasound probe on its belly?', 'Is a small ultrasound picture (a grey fan-shaped scan) shown on a screen or card?']
    gaze = [{'times': times[:1], 'aim': 'pet', 'on': pet, 'what': f'{pet} ({"feeling" if kind == "palpate" else "scanning"})'}]
    return {'times': times, 'gaze': gaze, 'check': dict(check, kind='exam50a', name=kind, who=who, target=pet, times=times, hold=hold), 'ask': ask}


def micro_plan(op, t0, duration):
    """Các lúc đo của `lookMicroscope` (acting_check `micro50a`): mắt ở thị kính, tay ở núm vặn, rồi đứng thẳng lên."""
    r = lambda a: round(t0 + a, 2)
    hold = float(op.get('hold', HOLD[MICRO][2]))
    times = [r(MICRO_L0 + 0.1), r(MICRO_L0 + hold / 2), r(MICRO_L0 + hold - 0.1)]
    check = {'kind': 'micro50a', 'name': MICRO, 'who': op['who'], 'times': times, 'at': [r(MICRO_L0 + 0.1 + 0.2 * n) for n in range(int((hold - 0.2) / 0.2) + 1)],
             'after': [r(min(duration - 0.05, MICRO_L0 + hold + 1.0))], 'prop': op.get('prop'), 'eye': op.get('eye'), 'hold': hold}
    ask = [f'Is {op["who"]} bending over a microscope with an eye at its eyepiece, one hand on its focus knob?']
    return {'times': times, 'check': check, 'ask': ask}


def turn_tail(emitted, names, turn, turned_back, turns, who):
    """Sờ nắn, siêu âm: con vật QUAY ĐUÔI về phía người làm trước lượt ấy (quay lại sau lượt, như `takeTemp`) — người đứng ở phía đầu nó (như các
    động tác chăm sóc đợt 38 A), nên sau khi nó quay, hai bàn tay / đầu dò tới hông, bụng trước, không vắt qua mặt nó."""
    for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
        if not (isinstance(step, list) and len(step) > 1 and step[0] in EXAM_50A and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
        pet = names[step[1][1:]]
        if any(p is pet for p, _ in turned_back): continue
        away = 'right' if float(pet['x']) + pet.get('_drop', 0) >= float(who['x']) else 'left'
        turns.append((f'  // {pet["name"]} turns its tail to {who["name"]} for "{step[0]}"', f"[{pet['name']}, ['face', {js(away)}]]"))
        emitted[0] += 1
        turned_back.append((pet, who))
