"""The JS code of one step / one turn of the conversation (`step_code`, `turn_code`) and the care / desk helpers they use.
Each takes the build state `st` first (see state.py); they read the cast, the set and the frame size from it."""
import os, re
from .actions import (CARE_REACH, HANDS_ON_CARE, HANDS_ON_HOLD, HANDS_ON_OPTIONS, GROOMING, GROOMING_49B, TRIM_TOOLS, CARE_ACTIONS, CHART_ACTIONS, DESK_ACTIONS, DESK_ITEM, DESK_NOUN,
    DESK_PAY, FLOOR_ACTIONS, WHOLE_BODY, PAIR_PARTNER, PAIR_PARTS, PET_MOOD_MARKS, RESTRAIN, RESTRAIN_PAIRS, SHOW_SIZE_GAP, PRESENTER_ACTIONS)
from .audio import speak_line
from .floor import floor_step
from .schema import MARKS, MOODS, PET_MOODS, TURN_KEYS
from .sets import ROOM_DEFAULTS
from .util import fail, js, known, slug
from . import cage as cage49a          # đợt 49 A
from . import exam50a          # đợt 50 A
from . import shop50b          # đợt 50 B
from . import feed50c          # đợt 50 C


# ĐỢT 35 — CÂN, ĐO NHIỆT ĐỘ, CHO UỐNG THUỐC: kiểm tra đối số, rồi viết bước. Cân: tên một cutout "scale" (có "name") — trong
# bối cảnh 3D thành `set.targetPoint(người, [x, mặt bệ, z])`; số cân lấy từ "reading" của cutout ấy nếu bước không tự cho.
def care_code(st, step, where, actor):
    names, person_default, reach_notes, stage_set = st.take('names', 'person_default', 'reach_notes', 'stage_set')
    name = step[0]
    if actor not in names or names[actor]['_pet']: fail(f'{where}: "{name}" is done by a person, not a pet')
    if len(step) < 2 or not (isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
        fail(f'{where}: "{name}" needs the pet as its second item, e.g. ["{name}", "@dog"' + (', "scale"]' if name == 'weigh' else ']') + f' — got {js(step)}')
    if name in exam50a.EXAM_50A: return exam50a.care_code(st, step, where, actor)          # đợt 50 A: sờ nắn, siêu âm (xe đẩy "@tên")
    pet = step[1][1:]
    if name == 'weigh':
        if stage_set is None: fail(f'{where}: "weigh" needs a 3D set ("set") with a "scale" cutout that has a "name"')
        scales = {item.get('name'): item for item in stage_set.get('cutouts', []) if item.get('kind') == 'scale' and item.get('name')}
        if len(step) < 3 or step[2] not in scales:
            fail(f'{where}: "weigh" needs the scale as its third item — the "name" of a set.cutouts item with "kind": "scale" (scales here: {", ".join(scales) or "none"}) — got {js(step)}')
        options = step[3] if len(step) > 3 else {}
        if len(step) > 4 or not isinstance(options, dict) or set(options) - {'reading', 'hold'}: fail(f'{where}: "weigh" takes ["weigh", "@pet", "<scale>", {{ "reading": "4.2 kg", "hold": 1.6 }}] — got {js(step)}')
        if 'reading' in options and not isinstance(options['reading'], str): fail(f'{where}: "weigh" reading is the text on the display, such as "4.2 kg"')
        if 'hold' in options and not (isinstance(options['hold'], (int, float)) and 0.5 <= options['hold'] <= 6): fail(f'{where}: "weigh" hold must be 0.5…6 seconds')
        scale = scales[step[2]]
        if abs(float(scale['z']) - float(names[actor].get('z', -300))) > 60:
            fail(f'{where}: the scale "{step[2]}" stands at z {float(scale["z"]):g}, "{actor}" at z {float(names[actor].get("z", -300)):g} — the pet is set down in the person\'s own plane: give the scale the same z (within 60)')
        tall = float(scale.get('height', round(person_default)))
        reading = options.get('reading', scale.get('reading')) or '4.2 kg'
        extra = {key: value for key, value in (('reading', reading), ('hold', options.get('hold'))) if value is not None}
        point = f"set.targetPoint({actor}, [{float(scale['x']):g}, {float(scale.get('y', 0)) + tall * 17 / 470:.1f}, {float(scale['z']):g}])"
        # MÀN HÌNH CÂN (đợt 35, lượt ba): cái cân dựng với số 0, rig ghi số cân lên nó đúng lúc con vật đứng trên bệ (`display`).
        scale['_weighed'] = reading if not scale.get('_weighed') else scale['_weighed']
        prop = f"cutout{stage_set['cutouts'].index(scale) + 1}Prop"
        return f"['weigh', {pet}, {point}, {{ {', '.join(f'{key}: {js(value)}' for key, value in extra.items())}, display: {prop} }}]"
    if name == 'takeTemp':
        if len(step) > 4 or (len(step) > 2 and not (isinstance(step[2], (int, float)) and 0.5 <= step[2] <= 5)) or (len(step) > 3 and not (isinstance(step[3], dict) and set(step[3]) <= {'reading'} and isinstance(step[3].get('reading', ''), str))):
            fail(f'{where}: "takeTemp" takes ["takeTemp", "@pet", hold (0.5…5 s), {{ "reading": "38.5°C" }}] — got {js(step)}')
    if name == 'givePill' and len(step) > 2: fail(f'{where}: "givePill" takes just the pet: ["givePill", "@pet"] — got {js(step)}')
    if name in GROOMING_49B:      # đợt 49 B: ["blowDry", "@pet", { "hold": 2.4 }], ["trimFur", "@pet", { "tool": "clipper", "hold": 2.4 }]
        options = step[2] if len(step) > 2 else {}
        lo, hi, d = HANDS_ON_HOLD[name]
        usage = f'{{ "hold": {d:g} }}' if name == 'blowDry' else f'{{ "tool": "scissors" | "clipper", "hold": {d:g} }}'
        if len(step) > 3 or not isinstance(options, dict) or set(options) - HANDS_ON_OPTIONS[name]: fail(f'{where}: "{name}" takes ["{name}", "@pet", {usage}] — got {js(step)}')
        if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and lo <= options['hold'] <= hi): fail(f'{where}: "{name}" hold must be {lo:g}…{hi:g} seconds — got {js(options["hold"])}')
        if 'tool' in options and options['tool'] not in TRIM_TOOLS: fail(f'{where}: "trimFur" tool must be "scissors" or "clipper" — got {js(options["tool"])}')
    elif name in GROOMING:          # đợt 42 F: ["bathPet", "@pet", { "hold": 1.8 }], ["brushTeeth", "@pet", { "hold": 2 }], ["towelDry", "@pet", { "hold": 2.2 }]
        options = step[2] if len(step) > 2 else {}
        lo, hi, d = HANDS_ON_HOLD[name]
        if len(step) > 3 or not isinstance(options, dict) or set(options) - {'hold'}: fail(f'{where}: "{name}" takes ["{name}", "@pet", {{ "hold": {d:g} }}] — got {js(step)}')
        if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and lo <= options['hold'] <= hi): fail(f'{where}: "{name}" hold must be {lo:g}…{hi:g} seconds — got {js(options["hold"])}')
        if name == 'bathPet' and not names[step[1][1:]].get('inTub'): reach_notes.append(f'{where}: "{step[1][1:]}" is bathed but does not stand in a tub — add "inTub": true to it (a tub sized to it is added)')
    elif name in HANDS_ON_CARE:
        # ĐỢT 38 A: ["clipNails", "@pet", { "hold": 1.8 }], ["eyeDrops", "@pet"], ["cleanEars", "@pet"], ["scanChip", "@pet", { "id": "900 …" }].
        options = step[2] if len(step) > 2 else {}
        lo, hi, _ = HANDS_ON_HOLD[name]
        usage = {'clipNails': '{ "hold": 1.8 }', 'eyeDrops': '{ "hold": 1.2 }', 'cleanEars': '{ "hold": 1.8 }', 'scanChip': '{ "id": "900 123 456 789", "hold": 1.6 }'}[name]
        if len(step) > 3 or not isinstance(options, dict) or set(options) - HANDS_ON_OPTIONS[name]: fail(f'{where}: "{name}" takes ["{name}", "@pet", {usage}] — got {js(step)}')
        if 'hold' in options and not (isinstance(options['hold'], (int, float)) and lo <= options['hold'] <= hi): fail(f'{where}: "{name}" hold must be {lo:g}…{hi:g} seconds — got {js(options["hold"])}')
        if 'paw' in options and options['paw'] != 'front': fail(f'{where}: "clipNails" paw must be "front" (the near front paw) — got {js(options["paw"])}')
        if 'id' in options and not (isinstance(options['id'], str) and options['id'].strip() and len(options['id']) <= 24): fail(f'{where}: "scanChip" id is the chip number as text of up to 24 characters, such as "900 123 456 789" — got {js(options["id"])}')
    other = names[pet]
    walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
    at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
    aim = f"set.target({actor}, {pet}, {js('rear' if name == 'takeTemp' else 'lips')}{at})" if stage_set is not None else pet
    if name in HANDS_ON_CARE and stage_set is not None: aim = f"set.target({actor}, {pet}, 'head'{at})"      # đợt 38 A: giữa mặt con vật — rig đo các chỗ khác trên hình nó
    return '[' + ', '.join([js(name), aim] + [js(item) for item in step[2:]]) + ']'


def showxray_listener(st, actor):
    """Người nghe của `showXray` (đợt 35): người (không phải con vật) gần `actor` nhất theo x, hay người `actor` "faces"."""
    names = st.names
    me = names.get(actor) or {}
    if me.get('faces') in names and not names[me['faces']]['_pet']: return me['faces']
    others = [w for w in names.values() if w['name'] != actor and not w['_pet']]
    return min(others, key=lambda w: abs(float(w.get('x', 0)) - float(me.get('x', 0))))['name'] if others else None


# ĐỢT 39 A — QUẦY THU NGÂN & QUẦY CÀ PHÊ: kiểm tra đối số, viết bước. Quét QR / quẹt thẻ: đích là mã QR / máy quẹt thẻ của đế `paystand` (bối cảnh 3D: cutout
# — `set.targetPoint`; cảnh 2D: đạo cụ "paystand" trong "props"); lau quầy: một điểm trên mặt quầy gần người lau; rót nước, đóng dấu: không cần đích.
def desk_holds(st, actor, kind):
    names = st.names
    holds = names[actor].get('holds')
    # Món đồ đang CẤT cũng được (xấp tiền, thẻ tích điểm…): rig tự lấy ra lúc làm (`#heldWith`) và cất lại sau — như `readChart`.
    return any((item if isinstance(item, str) else (item or {}).get('kind')) == kind for item in (holds.values() if isinstance(holds, dict) else [holds]))


def desk_stand(st, who, label):
    """(x trong phòng, mã bộ phận, hàm điểm) của đế thanh toán gần người `who` nhất; None nếu không có."""
    person_default, scene, stage_set = st.take('person_default', 'scene', 'stage_set')
    if stage_set is not None:
        stands = [(n, c) for n, c in enumerate(stage_set.get('cutouts', [])) if c.get('kind') == 'paystand' and (label is None or c.get('name') == label)]
        if not stands: return None
        n, c = min(stands, key=lambda it: abs(float(it[1]['x']) - float(who['x'])))
        unit = float(c.get('height', round(person_default * 0.74))) / 470
        return float(c['x']), lambda part: f"set.targetPoint({who['name']}, [{float(c['x']):g} + (cutout{n + 1}Prop.{part}.x - 200) * {unit:.5f}, {float(c.get('y', 0)):g} + (458 - cutout{n + 1}Prop.{part}.y) * {unit:.5f}, {float(c['z']):g}])"
    stands = [prop for prop in scene.get('props', []) if isinstance(prop, dict) and prop.get('kind') == 'paystand' and (label is None or prop.get('name') == label) and 'x' in prop]
    if not stands: return None
    prop = min(stands, key=lambda it: abs(float(it['x']) - float(who['x'])))
    top = 458 - float(prop.get('tabletop', 150)); unit_prop = float(prop.get('height', person_default)) / 470
    at = {'qr': (175, top - 33), 'reader': (226, top - 47)}
    return float(prop['x']), lambda part: f"{{ x: {200 + (float(prop['x']) + (at[part][0] - 200) * unit_prop - float(who['x'])) / who['_unit']:.1f}, y: {at[part][1]:.1f} }}"


def desk_counter(st, who):
    """Hộp quầy (3D) / đạo cụ quầy (2D) gần người `who` nhất: điểm trên MẶT quầy, phía người ấy đứng; None nếu không có."""
    scene, stage_set = st.take('scene', 'stage_set')
    if stage_set is not None:
        boxes = [box for box in stage_set.get('boxes', []) if 'counter' in str(box.get('name', ''))]
        if not boxes: return None
        box = min(boxes, key=lambda b: max(0, float(b['x']) - float(who['x']), float(who['x']) - float(b['x']) - float(b['width'])))
        x = min(max(float(who['x']), float(box['x']) + 40), float(box['x']) + float(box['width']) - 40)
        behind = float(who.get('z', -300)) < float(box['z']) - float(box['depth']) / 2
        z = float(box['z']) - float(box['depth']) + 34 if behind else float(box['z']) - 34
        return x, (box, f"set.targetPoint({who['name']}, [{x:g}, {float(box['height']):g}, {z:g}])")
    counters = [prop for prop in scene.get('props', []) if isinstance(prop, dict) and prop.get('kind') == 'counter' and 'x' in prop]
    if not counters: return None
    prop = min(counters, key=lambda it: abs(float(it['x']) - float(who['x'])))
    x = float(prop['x'])
    return x, (prop, f"{{ x: {200 + (min(max(float(who['x']), x - float(prop.get('width', 300)) / 2 + 30), x + float(prop.get('width', 300)) / 2 - 30) - float(who['x'])) / who['_unit']:.1f}, y: {458 - float(prop.get('tabletop', 150)):.1f} }}")


def desk_code(st, step, name, where, actor):
    names = st.names
    who = names[actor]
    if who['_pet']: fail(f'{where}: "{name}" is done by a person, not a pet')
    args = list(step[1:]) if isinstance(step, list) else []
    need = DESK_ITEM.get(name)
    if need and not desk_holds(st, actor, need):
        fail(f'{where}: "{name}" needs {DESK_NOUN[need]} in hand — give "{actor}" "holds": {js(need)} (script lines get it for you)')
    hold = args.pop() if args and isinstance(args[-1], (int, float)) and not isinstance(args[-1], bool) else None
    label = args.pop(0) if args and isinstance(args[0], str) and not args[0].startswith('@') else None
    if args: fail(f'{where}: "{name}" takes ' + {'payByQR': '["payByQR", "<paystand name>", seconds]', 'payByCard': '["payByCard", "<paystand name>", seconds]', 'wipeCounter': '["wipeCounter", seconds]'}.get(name, f'just "{name}"') + f' — got {js(step)}')
    if hold is not None and not (name in DESK_PAY + ('wipeCounter',) and 0.5 <= hold <= 12): fail(f'{where}: "{name}" seconds must be 0.5…12 (quét / lau only) — got {js(step)}')
    if name in ('pourDrink', 'stampCard', 'giveChange'):
        counter = desk_counter(st, who)
        return js(name) if not counter else f"['pourDrink', {{ top: {counter[1][1]} }}]" if name == 'pourDrink' else f"['stampCard', null, {{ top: {counter[1][1]} }}]"
    if name in DESK_PAY:
        found = desk_stand(st, who, label)
        if found is None: fail(f'{where}: "{name}" needs a pay stand — a set.cutouts item {{ "kind": "paystand", "x": …, "z": …, "y": <counter height> }} (3D), or a props item {{ "kind": "paystand", "x": … }} (2D)' + (f' named "{label}"' if label else ''))
        return '[' + ', '.join([js(name), found[1]('qr' if name == 'payByQR' else 'reader')] + ([js(hold)] if hold is not None else [])) + ']'
    counter = desk_counter(st, who)
    return '[' + ', '.join(["'wipeCounter'", js(hold if hold is not None else 2)] + ([counter[1][1]] if counter else [])) + ']'


def step_code(st, step, where, actor=None):
    height, names, person_default, reach_notes, stage_set, width = st.take('height', 'names', 'person_default', 'reach_notes', 'stage_set', 'width')
    if isinstance(step, (int, float)): return js(step)
    # NHÌN THEO (đợt 36): "look" là tên gọn của "lookAt" — ["look", "@cho"], ["lookAt", "@be", { "hold": 1.5 }], ["look", null].
    if step == 'look': step = 'lookAt'
    if isinstance(step, list) and step and step[0] == 'look': step = ['lookAt'] + step[1:]
    # GIỮ CON VẬT (đợt 38 B): con vật phải có trong cảnh; bối cảnh 3D — đích giữa thân, kèm đầu nó (`head`) để biết người đứng phía
    # đầu hay phía đuôi.
    if isinstance(step, list) and step and step[0] == RESTRAIN and actor in names:
        if names[actor]['_pet']: fail(f'{where}: "restrain" is done by a person (a nurse, the vet) — a pet cannot restrain')
        pet = step[1][1:] if len(step) > 1 and isinstance(step[1], str) else ''
        if pet not in names or not names[pet]['_pet']: fail(f'{where}: "restrain" needs a pet of the scene: ["restrain", "@<pet name>"] — got {js(step)}')
        if stage_set is None: return '[' + ', '.join([js(RESTRAIN), pet] + [js(item) for item in step[2:]]) + ']'
        other = names[pet]
        walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
        at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
        # ĐẦU CON VẬT QUAY VỀ ĐÂU lúc giữ (lúc dựng, hình nó có thể còn ở hướng cũ — vừa quay đuôi cho người đo nhiệt độ): đo nhiệt
        # độ → đầu quay ra xa người đo; không thì về phía người nó "faces".
        partner, kind = RESTRAIN_PAIRS.get(id(step), (None, None))
        pet_x = float(other['x']) + other.get('_drop', 0)
        if partner in names and kind == 'takeTemp': toward = 1 if pet_x >= float(names[partner]['x']) else -1
        elif other.get('faces') in names: toward = 1 if float(names[other['faces']]['x']) >= pet_x else -1
        else: toward = 0
        side = f", headSide: {toward}" if toward else ''
        return f"['restrain', set.target({actor}, {pet}, 'body'{at}), {js(step[2] if len(step) > 2 else 3)}, {{ head: set.target({actor}, {pet}, 'head'{at}){side} }}]"
    if isinstance(step, list) and step and step[0] == 'lookAt':
        if len(step) > 1 and not (step[1] is None or step[1] in ('front', 'L', 'R') or (isinstance(step[1], str) and step[1].startswith('@')) or (isinstance(step[1], dict) and set(step[1]) <= {'x', 'y'} and all(isinstance(step[1].get(k), (int, float)) for k in ('x', 'y')))):
            fail(f'{where}: ["lookAt", target] — target is "@<name>", {{ "x": …, "y": … }} in the 400 × 470 frame, "L" / "R" (own hand), "front" or null; got {js(step[1])}')
        if len(step) > 2 and not (isinstance(step[2], dict) and set(step[2]) <= {'head', 'eyes', 'dur', 'hold'}): fail(f'{where}: ["lookAt", target, {{ "hold": seconds, "head": 0…1, "eyes": 0…1, "dur": seconds }}] — got {js(step[2])}')
    # ĐỌC BỆNH ÁN (đợt 36): xong thì ngẩng lên nhìn NGƯỜI NGHE (người gần nhất / người mình "faces") — bối cảnh 3D nhắm đầu họ trong phòng.
    if (step == 'readChart' or (isinstance(step, list) and step and step[0] == 'readChart' and len(step) < 3)) and actor in names and not names[actor]['_pet']:
        listener = showxray_listener(st, actor)
        if listener:
            hold = step[1] if isinstance(step, list) and len(step) > 1 else 2
            if not (isinstance(hold, (int, float)) and hold > 0): fail(f'{where}: ["readChart", seconds] — seconds is a number > 0, got {js(hold)}')
            if not any((item if isinstance(item, str) else (item or {}).get('kind')) == 'clipboard' for item in (names[actor].get('holds') or {}).values()):
                fail(f'{where}: "readChart" needs a clipboard in hand — give "{actor}" "holds": "clipboard" (or "holdsHidden": true to keep it put away until then)')
            gaze = f", gaze: set.target({actor}, {listener}, 'head')" if stage_set is not None else ''
            return f"['readChart', {js(hold)}, {{ to: {listener}{gaze} }}]"
    # ĐỢT 39 C — NGƯỜI DẪN: kiểm tra đối số ngay ở đây; khung DỌC: bảng hẹp / khe hẹp (`{ narrow: true }`, như reo); chụp ảnh tự sướng
    # cần điện thoại trong tay (đang cất cũng được) và nhận `{ "with": "@người / con vật" }`.
    talk = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
    if talk in PRESENTER_ACTIONS and actor in names:
        if names[actor]['_pet']: fail(f'{where}: "{talk}" is done by a person — a pet cannot {talk}')
        args = list(step[1:]) if isinstance(step, list) else []
        if talk == 'holdSign':
            if not args or not (isinstance(args[0], str) and args[0].strip() or isinstance(args[0], list) and 1 <= len(args[0]) <= 3 and all(isinstance(line, str) and line.strip() for line in args[0])):
                fail(f'{where}: "holdSign" needs the text of the sign: ["holdSign", "Giảm 20%", seconds, {{ "color": "#2f9e8f" }}] — 1–3 short lines (a list of strings, or "line 1|line 2"); got {js(step)}')
            if len(args) > 1 and not (isinstance(args[1], (int, float)) and args[1] > 0): fail(f'{where}: ["holdSign", text, seconds] — seconds is a number > 0, got {js(args[1])}')
            if len(args) > 2 and not (isinstance(args[2], dict) and set(args[2]) <= {'color', 'narrow'}): fail(f'{where}: ["holdSign", text, seconds, {{ "color": "#hex" }}] — got {js(args[2])}')
        if talk == 'showSize':
            if args and not (args[0] in SHOW_SIZE_GAP or (isinstance(args[0], (int, float)) and not isinstance(args[0], bool) and args[0] > 0)): fail(f'{where}: ["showSize", size] — size is "small", "medium", "big" or a number > 0, got {js(args[0])}')
            if len(args) > 1 and not (isinstance(args[1], (int, float)) and args[1] > 0): fail(f'{where}: ["showSize", size, seconds] — seconds is a number > 0, got {js(args[1])}')
        if talk == 'yawnStretch' and args and not (isinstance(args[0], (int, float)) and args[0] > 0): fail(f'{where}: ["yawnStretch", seconds] — seconds is a number > 0, got {js(args[0])}')
        if talk == 'takeSelfie':
            if not any((item if isinstance(item, str) else (item or {}).get('kind')) == 'phone' for item in (names[actor].get('holds') or {'R': names[actor].get('holds')}).values()):
                fail(f'{where}: "takeSelfie" needs a phone — give "{actor}" "holds": "phone" (or "holdsHidden": true to keep it put away until then)')
            if args and not (isinstance(args[0], (int, float)) and args[0] > 0): fail(f'{where}: ["takeSelfie", seconds, {{ "with": "@name" }}] — seconds is a number > 0, got {js(args[0])}')
            if len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'with'} and isinstance(args[1].get('with'), str) and args[1]['with'].startswith('@') and args[1]['with'][1:] in names and args[1]['with'][1:] != actor):
                fail(f'{where}: ["takeSelfie", seconds, {{ "with": "@<another character or pet of the scene>" }}] — got {js(step)}')
        narrow = height > width * 1.2 and talk in ('holdSign', 'showSize')
        if talk == 'takeSelfie' and len(args) > 1:
            return f"['takeSelfie', {js(args[0])}, {{ with: {args[1]['with'][1:]} }}]"
        if narrow:
            args = args + [None] * (3 - len(args)) if talk == 'holdSign' else args + [None] * (2 - len(args))
            defaults = {'holdSign': [None, 2, {}], 'showSize': ['medium', 1.4]}[talk]
            args = [d if a is None else a for a, d in zip(args, defaults)]
            if isinstance(args[-1], dict) or talk == 'holdSign': args[-1] = {**(args[-1] if isinstance(args[-1], dict) else {}), 'narrow': True}
            else: args.append({'narrow': True})
            return '[' + ', '.join([js(talk)] + [js(a) for a in args]) + ']'
    # REO trong KHUNG DỌC (đợt 34): chữ V dang rộng cần ~1,02 × bề rộng góc toàn — không góc trung nào giữ được cả hai tay,
    # máy phải cắt sang góc toàn giữa chuỗi góc trung. Người (không phải con vật) reo ở khung dọc thì reo hẹp
    # (`cheer({ narrow: true })`: nắm tay giơ cạnh vai). Người viết tự cho tham số thì giữ của họ.
    # ĐỢT 42 D — chạy / nhảy lên / nhảy múa: kiểm tra đối số ngay ở đây (lỗi rõ ràng thay cho lỗi của trình duyệt lúc dựng).
    motion = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
    if motion in ('run', 'dance') and actor in names and names[actor]['_pet']: fail(f'{where}: "{motion}" is a person\'s action — for a pet use "walk", "jump" or "play"')
    if motion in WHOLE_BODY and actor in names and not names[actor]['_pet']:          # "jump" của thú là động tác của rig thú
        args = list(step[1:]) if isinstance(step, list) else []
        num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
        if motion == 'run' and (len(args) > 2 or (args and not num(args[0])) or (len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'speed', 'steps'}))):
            fail(f'{where}: ["run", distance, {{ "speed": 0.5…2, "steps": n }}] — distance in frame units (negative = to the left), or ["run", "@<name>"] to run up to someone; got {js(step)}')
        if motion == 'jump' and (len(args) > 2 or (args and not (isinstance(args[0], int) and not isinstance(args[0], bool) and 1 <= args[0] <= 6)) or (len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'height'}))):
            fail(f'{where}: ["jump", times 1…6, {{ "height": 0.3…2 }}] — got {js(step)}')
        if motion == 'dance' and (len(args) > 3 or (args and args[0] not in ('happy', 'gentle')) or (len(args) > 1 and not (isinstance(args[1], int) and not isinstance(args[1], bool) and 1 <= args[1] <= 8))
                                  or (len(args) > 2 and not (isinstance(args[2], dict) and set(args[2]) <= {'bpm'}))):
            fail(f'{where}: ["dance", "happy" | "gentle", bars 1…8, {{ "bpm": 60…180 }}] — got {js(step)}')
    if step in ('cheer', ['cheer']) and height > width * 1.2 and actor in names and not names[actor]['_pet']: return "['cheer', { narrow: true }]"
    # ĐỢT 35 — dụng cụ & hồ sơ: kiểm tra đối số ngay ở đây (lỗi rõ ràng thay cho lỗi của trình duyệt lúc dựng).
    care = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
    if care in CARE_ACTIONS + CHART_ACTIONS and actor in names:
        if names[actor]['_pet']: fail(f'{where}: "{care}" is done by a person (the vet) — a pet cannot {care}')
        if care in CARE_ACTIONS and not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
            fail(f'{where}: "{care}" needs the pet: ["{care}", "@<pet name>"] — got {js(step)}')
        if care == 'bandage' and len(step) > 2 and not (isinstance(step[2], (int, float)) and step[2] >= 1): fail(f'{where}: ["bandage", "@pet", wraps] — wraps is a number ≥ 1, got {js(step[2])}')
        if care == 'readChart':
            if not any((item if isinstance(item, str) else (item or {}).get('kind')) == 'clipboard' for item in (names[actor].get('holds') or {}).values()):
                fail(f'{where}: "readChart" needs a clipboard in hand — give "{actor}" "holds": "clipboard" (or "holdsHidden": true to keep it put away until then)')
            if isinstance(step, list) and len(step) > 1 and not (isinstance(step[1], (int, float)) and step[1] > 0): fail(f'{where}: ["readChart", seconds] — seconds is a number > 0, got {js(step[1])}')
        if care == 'showXray' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str):
            if stage_set is None: fail(f'{where}: ["showXray", "{step[1]}"] names an "xray" cutout of a 3D set — in a 2D scene give a point in the frame: ["showXray", {{"x": 380, "y": 150}}]')
            cutouts = stage_set.get('cutouts', [])
            index = next((n for n, item in enumerate(cutouts) if item.get('name') == step[1]), None)
            if index is None: fail(f'{where}: ["showXray", "{step[1]}"] — no set.cutouts entry has "name": "{step[1]}" (add {{ "kind": "xray", "name": "{step[1]}", "x": …, "z": … }} beside the person)')
            viewer = cutouts[index]
            if viewer.get('kind') != 'xray': fail(f'{where}: ["showXray", "{step[1]}"] — "{step[1]}" is a "{viewer.get("kind") or "picture"}" cutout; it must be an "xray" viewer')
            if len(step) > 2 and not (isinstance(step[2], (int, float)) and step[2] > 0): fail(f'{where}: ["showXray", "{step[1]}", seconds] — seconds is a number > 0, got {js(step[2])}')
            # Điểm chỉ trên phim (`prop.spot`, khung 400 × 470 của đạo cụ, sàn khung ở 458) đổi ra toạ độ phòng; tay vươn trong mặt
            # phẳng của người — đặt đèn đọc phim cùng chiều sâu (z) với người chỉ.
            unit = float(viewer.get('height', round(person_default * 0.74))) / 470
            if abs(float(viewer['z']) - float(names[actor].get('z', -300))) > 120: reach_notes.append(f'{where}: "{actor}" points at the X-ray viewer "{step[1]}", which stands {abs(float(viewer["z"]) - float(names[actor].get("z", -300))):g} units nearer or further — the hand points in its own plane: give it about the same z')
            spot = f"set.targetPoint({actor}, [{float(viewer['x']):g} + (cutout{index + 1}Prop.spot.x - 200) * {unit:.5f}, {float(viewer.get('y', 0)):g} + (458 - cutout{index + 1}Prop.spot.y) * {unit:.5f}, {float(viewer['z']):g}])"
            # NGƯỜI NGHE (đợt 35, lượt hai): chỉ xong thì quay về phía người khác gần nhất trong cảnh, không quay ra máy quay
            # (Gemini: "xong quay ra nhìn máy quay thay vì quay về phía bà"). Người viết tự cho { "to": … } thì giữ của họ.
            listener = showxray_listener(st, actor)
            extra = [js(item) for item in step[2:3]] or (['1.6'] if listener else [])
            if listener and not (len(step) > 3 and isinstance(step[3], dict) and 'to' in step[3]): extra.append(f"{{ to: {listener}, gaze: set.target({actor}, {listener}, 'head') }}")
            elif len(step) > 3: extra.append(js(step[3]).replace('"@', '').replace('"', '') if isinstance(step[3], dict) and str(step[3].get('to', '')).startswith('@') else js(step[3]))
            return '[' + ', '.join(["'showXray'", spot] + extra) + ']'
    # ĐỢT 39 A — quầy thu ngân: bước một mình (quét QR, quẹt thẻ, rót nước, đóng dấu, lau quầy); thối tiền / đóng dấu với đích là người kia: người đưa phải cầm đồ.
    desk = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
    if desk in DESK_ACTIONS and actor in names and not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')): return desk_code(st, step, desk, where, actor)
    if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and not desk_holds(st, actor, DESK_ITEM[desk]):
        fail(f'{where}: "{desk}" needs {"banknotes" if desk == "giveChange" else "a stamp card"} in hand — give "{actor}" "holds": {js(DESK_ITEM[desk])}')
    if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']:
        fail(f'{where}: "{desk}" needs the other person: ["{desk}", "@<person name>"] — a pet cannot take {"banknotes" if desk == "giveChange" else "a card"}; got {js(step)}')
    if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and len(step) == 2 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and not names[step[1][1:]]['_pet']:
        got, hidden = names[step[1][1:]].get('holds'), names[step[1][1:]].get('holdsHidden')
        if not any((item if isinstance(item, str) else (item or {}).get('kind')) == DESK_ITEM[desk] and (hidden is True or (isinstance(hidden, list) and side in hidden)) for side, item in (got.items() if isinstance(got, dict) else [('R', got)])):
            fail(f'{where}: "{step[1][1:]}" has no free hand to receive the {"banknotes" if desk == "giveChange" else "stamp card"} from "{actor}" (two hands: they already hold other things) — give them "holds": {{"L": {js(DESK_ITEM[desk])}}} with "holdsHidden": ["L"], or let them put the other item away first')
    if desk in ('giveChange', 'stampCard') and actor in names and isinstance(step, list) and len(step) == 2 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and desk_counter(st, names[actor]):
        return f"[{js(desk)}, {step[1][1:]}, {{ top: {desk_counter(st, names[actor])[1][1]} }}]"      # mặt quầy: tay và đồ vật nằm trên quầy, không khuất sau nó
    # HAI NGƯỜI (đợt 38 C): đích là một NGƯỜI khác ("@tên"); đưa túi thuốc cần túi trong tay, nhận túi cần túi đang cất.
    if care in tuple(PAIR_PARTNER) + PAIR_PARTS and actor in names and step != 'stampCard':
        if names[actor]['_pet']: fail(f'{where}: "{care}" is done by a person — a pet cannot {care}')
        if not (isinstance(step, list) and len(step) == 2 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and not names[step[1][1:]]['_pet'] and step[1][1:] != actor):
            fail(f'{where}: "{care}" needs the other person: ["{care}", "@<person name>"] — got {js(step)}')
        holds = names[actor].get('holds')
        held = [item if isinstance(item, str) else (item or {}).get('kind') for item in holds.values()] if isinstance(holds, dict) else [holds]
        # Đợt 43 B: túi đang cầm, món kia cất (`"holdsHidden": ["L"]` — phát thuốc: bìa đơn thuốc cất ở tay trái) cũng được.
        hidden = names[actor].get('holdsHidden')
        bag_hands = [k for k, item in holds.items() if (item if isinstance(item, str) else (item or {}).get('kind')) == 'bag'] if isinstance(holds, dict) else ['R']
        if care == 'handOverBag' and ('bag' not in held or hidden is True or (isinstance(hidden, list) and all(k in hidden for k in bag_hands))):
            fail(f'{where}: "handOverBag" needs a medicine bag in hand — give "{actor}" "holds": "bag" (shown, not "holdsHidden")')
        if care == 'takeBag' and ('bag' not in held or not names[actor].get('holdsHidden')):
            fail(f'{where}: "takeBag" needs a put-away medicine bag — give "{actor}" "holds": "bag" and "holdsHidden": true (["handOverBag", "@{actor}"] alone in a turn does it for you)')
    # ĐỢT 42 E — SÁT SÀN: kiểm tra đối số; nằm SOFA trong bối cảnh 3D: mặt nằm cao đúng bằng mặt hộp dưới người (`lift`, đơn vị khung).
    floor = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
    if floor in FLOOR_ACTIONS and actor in names:
        code = floor_step(step, where, names[actor], stage_set, fail)
        if code: return code
    if (step == exam50a.MICRO or (isinstance(step, list) and step and step[0] == exam50a.MICRO)) and actor in names: return exam50a.micro_code(st, step, where, actor)          # đợt 50 A: kính hiển vi ("@tên")
    if isinstance(step, str): return js(step)
    if not isinstance(step, list) or not step or not isinstance(step[0], str): fail(f'{where}: a step is "name", ["name", args…] or a number — got {js(step)}')
    if step[0] in CARE_REACH: return care_code(st, step, where, actor)
    if step[0] in feed50c.STEPS: return feed50c.step_code(st, step, where, actor)          # đợt 50 C: bát ăn, lồng vận chuyển
    if step[0] in cage49a.CAGE_ACTIONS: return cage49a.step_code(st, step, where, actor)          # đợt 49 A: bước gọi tên một đạo cụ của bối cảnh ("@chuong")
    if step[0] in shop50b.ACTIONS: return shop50b.step_code(st, step, where, actor)          # đợt 50 B: lấy hàng trên kệ ("@ke_hang"), quét mã vạch
    parts = []
    for item in step:
        if isinstance(item, str) and item.startswith('@'):
            if item[1:] not in names: fail(f'{where}: "{item}" refers to a character that is not in the scene')
            # Bối cảnh 3D: chỉ tay / vuốt ve nhắm theo vị trí TRONG PHÒNG (set.target), không theo màn hình lúc dựng —
            # máy quay còn đổi góc sau đó.
            # Đích ĐÃ ĐI khỏi chỗ đầu cảnh (con chó đi tới ông ngồi ghế đá): lúc dựng, trạng thái của nó còn ở chỗ cũ — báo cho
            # set.target chỗ nó đứng ở lượt này, tính bằng đơn vị khung của nó (đợt 29: tay ông chìa ra chỗ con chó lúc đầu).
            other = names[item[1:]]
            walked = (float(other['x']) - float(other['_x0'])) / other['_unit'] if other.get('_unit') and other.get('_x0') is not None else 0
            at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
            if stage_set is not None and actor and step[0] == 'shine': parts.append(f"set.aimAt({actor}, {item[1:]})")
            elif stage_set is not None and actor and step[0] == 'stroke' and other.get('_front') is not None and other['_front'] is names.get(actor): parts.append(f"set.target({actor}, {item[1:]}, 'crown'{at})")
            elif stage_set is not None and actor and step[0] == 'stroke' and other.get('_back') is not None and other['_back'] is names.get(actor): parts.append(f"set.target({actor}, {item[1:]}, 'top'{at})")
            elif stage_set is not None and actor and step[0] == 'offerHand': parts.append(f"set.target({actor}, {item[1:]}, 'tongue'{at})")
            elif stage_set is not None and actor and step[0] in ('point', 'stroke', 'examine', 'giveTreat', 'putCone', 'lookAt'): parts.append(f"set.target({actor}, {item[1:]}" + (f", 'head'{at})" if at else ")"))
            elif stage_set is not None and actor and step[0] == 'bandage': parts.append(f"set.target({actor}, {item[1:]}, 'leg'{at})")
            elif stage_set is not None and actor and step[0] == 'takeTemp': parts.append(f"set.target({actor}, {item[1:]}, 'rear'{at})")
            elif stage_set is not None and actor and step[0] == 'givePill': parts.append(f"set.target({actor}, {item[1:]}" + (f", 'head'{at})" if at else ")"))
            elif stage_set is not None and actor and step[0] in ('listen', 'inject', 'brush', 'hide'): parts.append(f"set.target({actor}, {item[1:]}, 'body'{at})")
            else: parts.append(item[1:])
        else:
            parts.append(js(item))
    return '[' + ', '.join(parts) + ']'


def turn_code(st, turn, where):
    base, height, hiders, marks_on, names = st.take('base', 'height', 'hiders', 'marks_on', 'names')
    narrators, scene, stage_set, voices, width = st.take('narrators', 'scene', 'stage_set', 'voices', 'width')
    if isinstance(turn, dict) and turn.get('who') in narrators: speakers_of = narrators
    else: speakers_of = names
    if not isinstance(turn, dict) or turn.get('who') not in speakers_of: fail(f'{where}: "who" must name a character in the scene (got {js(turn.get("who") if isinstance(turn, dict) else turn)})')
    known(where, turn, TURN_KEYS)
    who = speakers_of[turn['who']]
    steps = []
    # `mood`: lượt CÓ lời thì cả câu được nói bằng nét mặt ấy; lượt không lời thì là một nhịp nét mặt
    # trước các động tác của lượt.
    # Thứ tự trong MỘT lượt: enter → (mood, nếu không có lời) → say → do → exit.
    if 'enter' in turn:
        if turn['enter'] is True: turn['enter'] = who['_nearer']
        if who['_late'] != turn['enter'] or getattr(st, 'entered', set()) & {who['name']}: fail(f'{where}: "{who["name"]}" can enter only once per scene')
        st.entered = getattr(st, 'entered', set()) | {who['name']}
        steps.append(f"['enter', {js(turn['enter'])}, {who['_enter_distance']}]")
        if who.get('faces'): steps.append(f"['face', {who['faces']}]")
    if turn.get('exit') not in (None, False, True, 'left', 'right'): fail(f'{where}: "exit" must be "left", "right" or true (the nearer edge)')
    if turn.get('exit') is True: turn['exit'] = who['_nearer']
    mood = turn.get('mood')
    if 'mood' in turn:
        if who['_pet']:
            # Thú cưng: nét mặt của con vật (tai, mắt, đuôi). Lượt có động tác thì GIỮ nét mặt suốt các động tác ấy
            # (`mood`, thôi giữ ở cuối lượt); lượt chỉ có mood thì là một nhịp biểu cảm.
            if mood not in PET_MOODS: fail(f'{where}: "mood" of a pet must be one of {", ".join(PET_MOODS)} — got {js(mood)}')
            if not turn.get('do'): steps.append(f"['express', {js(mood)}, 1.4" + ("]" if marks_on else ", { mark: false }]"))
            else:
                # Nét mặt GIỮ qua các động tác; dấu cảm xúc của nét mặt ấy cũng giữ suốt lượt (trừ khi lượt tự cho "mark")
                # — cùng một bước với `mood`, không thêm thời gian.
                held_mark = PET_MOOD_MARKS.get(mood) if marks_on and 'mark' not in turn else None
                steps.append(f"['mood', {js(mood)}" + (f", {{ mark: {js(held_mark)} }}]" if held_mark else "]"))
        else:
            if mood not in MOODS: fail(f'{where}: "mood" must be one of {", ".join(MOODS)} — got {js(mood)}')
            if 'say' not in turn: steps.append(f"['express', {js(mood)}, 0.9]")
    # Tuỳ chọn của bước NÓI: nét mặt giữ suốt câu, và — ở bố cục người dẫn khung ngang — tay diễn là tay phía BẢNG
    # NỘI DUNG (bảng nằm bên kia khung hình so với người dẫn). Không thì người dẫn mở tay ra ngoài, quay lưng với nội dung.
    options = []
    if mood and 'say' in turn: options.append(f'mood: {js(mood)}')
    if scene.get('layout') == 'presenter' and width >= height and not who['_pet']: options.append(f"hand: {js('L' if float(who['x']) > width / 2 else 'R')}")
    elif not who['_pet'] and who['name'] in hiders and hiders[who['name']] in names:
        pet = names[hiders[who['name']]]
        options.append(f"hand: {js('L' if float(pet['_x0']) > float(who['x']) else 'R')}")
    spoken_mood = (', { ' + ', '.join(options) + ' }') if options and 'say' in turn else ''
    # `"phone": true` — câu nói của lượt này nói QUA ĐIỆN THOẠI: nhấc máy áp lên má trước, đặt xuống sau lượt.
    phone = turn.get('phone')
    if phone not in (None, False, True): fail(f'{where}: "phone" must be true or false')
    if phone:
        if who['_pet']: fail(f'{where}: a pet cannot talk on the phone')
        if 'say' not in turn: fail(f'{where}: "phone": true needs a "say" line (for listening use "do": [["call", null, 2]])')
        if not any((item if isinstance(item, str) else item.get('kind')) == 'phone' for item in (who.get('holds') or {}).values()):
            fail(f'{where}: "phone": true needs "{who["name"]}" to hold a phone — "holds": "phone"')
        steps.append("['phoneUp']")
    if 'say' in turn:
        if who['_pet']: fail(f'{where}: "{who["name"]}" is a pet and cannot "say" — use "do": ["bark"]')
        words = str(turn['say']).strip()
        # Giọng đọc: lượt (hoặc nhân vật) khai `voice` mà chưa có tệp tiếng thì tạo tệp bằng voice-tts — một lần.
        voice = turn.get('voice', who.get('voice'))
        if voice is not None and voice is not False and not isinstance(voice, str): fail(f'{where}: "voice" must be a voice name (see `voice-tts voices`) or false')
        if voice and not turn.get('audio'):
            turn = dict(turn, audio=speak_line(base, who['name'], voice, words, where))
        if turn.get('audio'):
            source = os.path.join(base, turn['audio'])
            if not os.path.isfile(source): fail(f'{where}: audio file not found: {turn["audio"]} (looked in {base})')
            key = slug(os.path.splitext(os.path.basename(turn['audio']))[0]).replace('-', '_')
            if any(voice['key'] == key for voice in voices): key = f'{key}_{len(voices) + 1}'      # cùng một tệp dùng hai lần
            voices.append({'key': key, 'file': os.path.basename(turn['audio']), 'source': source, 'text': words, 'who': who['name']})
            steps.append(f"['speakCues', window.VOICE_CUES[{js(key)}]" + (f', null{spoken_mood}' if spoken_mood else '') + ']')
        else:
            seconds = float(turn.get('dur') or round(0.6 + 0.36 * len(words.split()), 1))
            steps.append(f"['explain', {js(words)}, {seconds}{spoken_mood}]")
    if phone:
        # Phụ đề ở lại tối thiểu 0,5 s + 0,3 s mỗi từ (+0,3 s giữ chữ) — câu ngắn mà nhiều chữ thì chữ còn trên màn hình
        # sau khi tiếng đã dứt. Giữ máy trên má cho tới lúc ấy: đặt máy xuống mà phụ đề vẫn chạy là lệch hình với lời.
        if not turn.get('audio'):
            seconds = float(turn.get('dur') or round(0.6 + 0.36 * len(str(turn['say']).split()), 1))
            linger = 0.5 + 0.3 * len(str(turn['say']).split()) + 0.3 - (seconds + 0.55)
            if linger > 0.05: steps.append(f"{linger:.2f}")
        steps.append("['phoneDown']")
    # Lượt KHÔNG LỜI có máy quay LIA tới (không cắt): động tác tay đợi máy dừng rồi mới bắt đầu. Bắt đầu cùng lúc thì
    # người diễn còn nằm ở mép khung khi động tác đang diễn (bản thử quầy lễ tân: bà cụ bấm điện thoại bị cắt nửa người).
    view = turn.get('view')
    if stage_set is not None and turn.get('do') and 'say' not in turn and isinstance(view, dict) and 'on' not in view and not view.get('cut') and not view.get('wide'):
        steps.append(f"{float(view.get('dur', 1.5)):g}")
    for step in turn.get('do', []):
        steps.append(step_code(st, step, where, who['name']))
    if who['_pet'] and mood and turn.get('do'): steps.append("['mood', null]")
    if 'mark' in turn:
        # DẤU CẢM XÚC trên đầu suốt lượt: bật lên trước lời / động tác, tắt ở cuối lượt. Lượt chỉ có dấu: giữ 1,4 s.
        if turn['mark'] not in MARKS: fail(f'{where}: "mark" must be one of {", ".join(MARKS)} — got {js(turn["mark"])}')
        steps.insert(1 if 'enter' in turn else 0, f"['mark', {js(turn['mark'])}]")
        if len(steps) == 1: steps.append('1.4')
        steps.append("['mark', null]")
    if turn.get('exit'):
        # Quãng đi ra tính sẵn như `enter`: tới mép khung cộng phần đầu / thân, để nhân vật khuất hẳn rồi mới ẩn.
        leaving = (float(who['x']) if turn['exit'] == 'left' else width - float(who['x'])) + (0.39 if not who['_pet'] else 0.6) * who['_host_height']
        if stage_set is not None:
            half = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))['width'] / 2
            leaving = (float(who['x']) + half if turn['exit'] == 'left' else half - float(who['x'])) + 0.55 * who['_host_width']
        steps.append(f"['exit', {js(turn['exit'])}, {round(leaving / who['_unit'])}]")
    if not steps and ('power' in turn or 'sky' in turn):
        steps.append("['idle', 1.2]")                   # mất điện / trời chuyển: một nhịp đứng yên cho thấy căn phòng đổi sáng
    if not steps and 'lamp' in turn:
        # Lượt chỉ bật / tắt đèn: NGƯỜI với tay tới công tắc trên thân cây đèn (đèn sáng đúng lúc tay tới — xem lamp_ops);
        # thú thì một nhịp đứng yên.
        lamp_name = turn['lamp'].get('name') if isinstance(turn['lamp'], dict) else None
        steps.append("['idle', 0.9]" if who['_pet'] else f"['point', set.targetPoint({who['name']}, set.lampPoint({js(lamp_name)}))]")
    if not steps: fail(f'{where}: a turn needs "say", "do", "mood", "enter" or "exit"')
    body = f"[{who['name']}, " + ', '.join(steps) + ']'
    # Câu nói NHẮC TÊN một con vật trong cảnh ("Bella rất khoẻ mạnh") mà không khai `shot`: đưa cả con vật vào khung.
    if 'shot' not in turn and 'say' in turn and who['name'] not in narrators:
        mentioned = [other['name'] for other in names.values() if other['_pet'] and re.search(r'(?<!\w)' + re.escape(other['name']) + r'(?!\w)', str(turn['say']), re.IGNORECASE)]
        if mentioned: turn = dict(turn, shot=[who['name']] + mentioned)
    if 'shot' in turn:
        shot = turn['shot']
        if isinstance(shot, list):
            for item in shot:
                if item not in names: fail(f'{where}: "shot" names "{item}", who is not in the scene')
            shot_code = '[' + ', '.join(shot) + ']'
        elif shot is False or shot in ('face', 'chest', 'full', 'wide'): shot_code = js(shot)
        else: fail(f'{where}: "shot" must be "face", "chest", "full", "wide", false, or a list of character names')
        return f'{{ turn: {body}, shot: {shot_code} }}'
    return body
