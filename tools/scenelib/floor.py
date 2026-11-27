"""People on the floor (sitOnFloor / lieDown / pickUp): treated as seated for the pet, step checks, undo."""
import json
from .util import PERSON


def floor_turn_42e(who, turn, undo):
    """ĐỢT 42 E: người ĐANG Ở DƯỚI SÀN (ngồi bệt / nằm — từ một lượt trước, hay ngay trong lượt này) được xem như người NGỒI trong lượt ấy:
    con vật đi tới họ (vuốt ve, bế lên lòng), họ không tự quỳ xuống / bước lại gần. Ghi `seated` tạm (trả lại bằng `restore_42e`)."""
    steps = turn.get('do') if isinstance(turn.get('do'), list) else []
    named = [step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None for step in steps]
    down = who.get('_floor42e', False) or any(name in ('sitOnFloor', 'lieDown') for name in named)
    for name in named:
        if name in ('sitOnFloor', 'lieDown'): who['_floor42e'] = True
        elif name == 'standUp': who['_floor42e'] = False
    if down and not who.get('seated'):
        undo.append((who, 'seated' in who, who.get('seated')))
        who['seated'] = True


def floor_step_42e(step, where, who, stage_set, fail):
    """ĐỢT 42 E: kiểm tra `sitOnFloor` / `lieDown` / `pickUp` của một người; trả mã JS khi cần viết lại bước (nằm sofa trong bối cảnh 3D: `lift` =
    chiều cao mặt sofa dưới người, đổi ra đơn vị khung của người ấy), không thì None."""
    name, args = (step, []) if isinstance(step, str) else (step[0], list(step[1:]))
    if who['_pet']:
        if name == 'lieDown': return None                     # con vật có `lieDown` riêng
        fail(f'{where}: "{name}" is done by a person — a pet cannot {name}')
    if name == 'sitOnFloor' and args: fail(f'{where}: "sitOnFloor" takes no arguments — got {json.dumps(step, ensure_ascii=False)}')
    if name == 'pickUp':
        if args and not (args[0] is None or (isinstance(args[0], (int, float)) and not isinstance(args[0], bool)) or (isinstance(args[0], str) and args[0].startswith('@'))
                         or (isinstance(args[0], dict) and set(args[0]) <= {'x', 'y'} and isinstance(args[0].get('x'), (int, float)))):
            fail(f'{where}: ["pickUp", target, {{ "item": "toy" }}] — target is "@<pet>" (its toy), a distance in frame units, {{ "x": …, "y": … }} or null; got {json.dumps(args[0], ensure_ascii=False)}')
        if len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'item', 'side'} and args[1].get('item', 'toy') in ('toy', 'bowl', 'leash') and args[1].get('side', 'auto') in ('auto', 'L', 'R')):
            fail(f'{where}: ["pickUp", target, {{ "item": "toy" | "bowl" | "leash", "side": "L" | "R" }}] — got {json.dumps(args[1], ensure_ascii=False)}')
        return None
    if name != 'lieDown': return None
    if args and args[0] not in ('floor', 'sofa'): fail(f'{where}: ["lieDown", "floor" | "sofa", {{ "head": "left" | "right", "sleep": true }}] — got {json.dumps(args[0], ensure_ascii=False)}')
    if len(args) > 1 and not (isinstance(args[1], dict) and set(args[1]) <= {'head', 'sleep', 'lift'} and args[1].get('head', 'left') in ('left', 'right')):
        fail(f'{where}: ["lieDown", where, {{ "head": "left" | "right", "sleep": true }}] — got {json.dumps(args[1], ensure_ascii=False)}')
    if not args or args[0] != 'sofa' or stage_set is None: return None
    x, z = float(who['x']), float(who.get('z', -300))
    box = next((b for b in stage_set.get('boxes', []) if b.get('name') == who.get('on')), None) or next((b for b in stage_set.get('boxes', [])
               if float(b['x']) <= x <= float(b['x']) + float(b['width']) and -float(b['depth']) - 20 <= z - float(b['z']) <= 40), None)      # đợt 44 A: x của hộp là MÉP TRÁI (set.box)
    if box is None: fail(f'{where}: ["lieDown", "sofa"] — "{who["name"]}" is not at a sofa: give them "on": "<sofa box>" and "seated": true, or stand them at its front (x within its width, z ≈ its z + 12)')
    options = dict(args[1]) if len(args) > 1 else {}
    options.setdefault('lift', round(float(box.get('height', 0)) * PERSON[1] / who['_host_height'], 1))
    return f"['lieDown', 'sofa', {json.dumps(options, ensure_ascii=False)}]"


def restore_42e(undo):
    while undo:
        who, had, value = undo.pop()
        if had: who['seated'] = value
        else: who.pop('seated', None)
