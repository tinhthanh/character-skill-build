"""Measurement plans of the care and desk actions: the moments (seconds into the step) moments.json measures."""
from .actions import BATH_RINSE, BATH_SPRAY, HANDS_ON_HOLD, GROOMING, GROOMING_49B, TRIM_FALL, DESK_PAY, bath_shake_at


def care_plan_tools(op, t0):
    """ĐỢT 38 A: các lúc đo của cắt móng / nhỏ mắt / lau tai / quét chip, tính từ đầu bước `t0` theo đúng nhịp của runtime/rig-svg.js
    (`hold` của bước). `times`: ba lúc tay ở trên con vật (lúc giữa là lúc được hỏi); `gaze`: đầu hướng về đâu; `check`: số đo riêng của
    acting_check (`care38`) — kìm khép / mở và chân nhấc, giọt thuốc rơi vào mắt và mắt nhắm, bông ở gốc tai và đầu lắc, máy quét rà trên gáy
    và thẻ mã chip."""
    if op['kind'] in GROOMING: return care_plan_grooming(op, t0)          # đợt 42 F
    if op['kind'] in GROOMING_49B: return care_plan_49b(op, t0)          # đợt 49 B
    kind, hold = op['kind'], float(op.get('hold') or HANDS_ON_HOLD[op['kind']][2])
    r = lambda a: round(t0 + a, 2)
    every = lambda a, b, d=0.1: [r(a + d * n) for n in range(int(round((b - a) / d)) + 1)]
    who, pet = op['who'], op['target']
    if kind == 'clipNails':
        n = max(2, round(hold / 0.62)); per = max(0.62, hold / n); c0, e = 1.1, 1.1 + n * per
        closed = [r(c0 + i * per + 0.38) for i in range(n)]
        times = [closed[0], closed[len(closed) // 2], closed[-1]]
        check = {'closed': closed, 'open': [r(c0 + i * per + 0.12) for i in range(n)] + [r(c0 + (i + 1) * per - 0.03) for i in range(n)], 'lifted': every(c0, e - 0.05),
                 'down': [r(0.3), r(e + 1.0)], 'gadget': 10}
        gaze = [{'times': times, 'aim': 'gadget', 'gadget': 10, 'what': 'the nail clipper'}]
        ask = [f'Is {who} holding up a front paw of the animal ({pet}) with one hand and cutting its nails with a small clipper in the other?']
    elif kind == 'eyeDrops':
        d0 = 1.0 + hold * 0.5; hit = d0 + 0.9
        times = [r(1.1), r((1.1 + d0 + 0.6) / 2), r(d0 + 0.6)]
        check = {'hanging': every(d0 + 0.3, d0 + 0.6), 'falling': [r(d0 + 0.75), r(d0 + 0.84)], 'hit': r(hit), 'blink': every(hit + 0.1, hit + 0.7), 'chin': times, 'gadget': 11}
        gaze = [{'times': times, 'aim': 'pet', 'on': pet, 'what': f'{pet}\'s head'}]
        ask = [f'Is {who} holding a small dropper bottle just above the eye of the animal ({pet}), with a drop falling into the eye, and the other hand under its chin?']
    elif kind == 'cleanEars':
        shake = 0.65 + hold + 0.35
        times = [r(0.8), r(0.65 + hold / 2), r(0.55 + hold)]
        check = {'wipe': every(0.75, 0.6 + hold), 'shake': every(shake, shake + 0.9, 0.05), 'free': [r(shake + 0.1), r(shake + 0.5)], 'gadget': 12}
        gaze = [{'times': times, 'aim': 'pet', 'on': pet, 'what': f'{pet}\'s head'}]
        ask = [f'Is {who} wiping inside the ear of the animal ({pet}) with a white cotton pad while holding its head?']
    else:
        beep = 2.85
        times = [r(1.0), r(1.7), r(2.5)]
        card = [r(beep + 0.45), r(beep + 0.45 + hold / 2), r(beep + 0.35 + hold)]
        check = {'scan': every(0.95, 2.5), 'card': card, 'gadget': 13, 'id': op.get('id') or '900 123 456 789'}
        gaze = [{'times': times, 'aim': 'gadget', 'gadget': 13, 'what': 'the chip scanner'}, {'times': card, 'aim': 'readout', 'what': 'the chip number shown'}]
        ask = [f'Is {who} passing a handheld scanner over the back of the neck of the animal ({pet})?', 'Is a big card with the chip number shown above the animal?']
    return {'times': times, 'gaze': gaze, 'check': dict(check, kind='care38', name=kind, who=who, target=pet, times=times), 'ask': ask}


def care_plan_grooming(op, t0):
    """ĐỢT 42 F: các lúc đo của tắm / đánh răng / lau khô, tính từ đầu bước `t0` theo đúng nhịp của runtime/rig-svg.js (`hold` của bước) — xem
    `check_care42f` của tools/acting_check.py."""
    kind, hold = op['kind'], float(op.get('hold') or HANDS_ON_HOLD[op['kind']][2])
    r = lambda a: round(t0 + a, 2)
    every = lambda a, b, d=0.2: [r(a + d * n) for n in range(int(round((b - a) / d)) + 1)]
    who, pet = op['who'], op['target']
    if kind == 'bathPet':
        W, E1 = 0.55, 0.55 + BATH_SPRAY
        L0 = E1 + 0.55; R0 = L0 + 0.35 + hold; W2 = R0 + 0.75; E2 = W2 + BATH_RINSE; SH = bath_shake_at(hold)
        times = [r(W + 0.8), r(L0 + 0.35 + hold / 2), r(W2 + 0.7)]
        check = {'spray': every(W + 0.3, E1 - 0.15) + every(W2 + 0.3, E2 - 0.15), 'lather': every(L0 + 0.5, R0 - 0.1), 'wet': [r(E1 + 0.1), r(SH - 0.2)],
                 'rinsed': [r(E2 + 0.25)], 'foamUp': [r(L0 + 0.5), r(R0 - 0.1)], 'shake': every(SH + 0.2, SH + 0.95, 0.05), 'free': [r(SH + 0.25), r(SH + 0.7)],
                 'rimAt': [r(W + 0.8), r(L0 + 1.0), r(SH + 0.5)], 'gadget': 40}
        gaze = [{'times': [check['spray'][1], check['spray'][4], check['spray'][-2]], 'aim': 'gadget', 'gadget': 40, 'what': 'the shower head'},
                {'times': [check['lather'][1], check['lather'][len(check['lather']) // 2]], 'aim': 'pet', 'on': pet, 'what': f'{pet} (lathering)'}]
        ask = [f'Is the animal ({pet}) standing inside a bath tub, with {who} spraying water on its back from a shower head?',
               f'Is there white foam on the back of the animal ({pet}) while {who} lathers it with both hands?', f'Does the animal ({pet}) shake off water after {who} steps back?']
    elif kind == 'brushTeeth':
        B0 = 0.95
        times = [r(B0 + 0.2), r(B0 + hold / 2), r(B0 + hold - 0.15)]
        check = {'brush': every(B0 + 0.1, B0 + hold - 0.1, 0.1), 'lick': every(B0 + hold + 0.85, B0 + hold + 1.7, 0.05), 'free': [r(B0 + hold + 0.9), r(B0 + hold + 1.4)], 'gadget': 41}
        gaze = [{'times': times, 'aim': 'pet', 'on': pet, 'what': f'{pet}\'s head'}]
        ask = [f'Is {who} brushing the teeth of the animal ({pet}) with a small toothbrush while holding its muzzle, its mouth partly open?']
    else:
        R0, U = 1.3, 1.3 + hold
        times = [r(R0 + 0.2), r(R0 + hold / 2), r(U - 0.15)]
        check = {'carry': [r(0.5), r(0.8)], 'rub': every(R0 + 0.1, U - 0.1, 0.1), 'after': [r(U + 0.6), r(U + 0.95)], 'happy': [r(U + 0.9), r(U + 1.6)], 'gadget': 42}
        gaze = [{'times': times, 'aim': 'pet', 'on': pet, 'what': f'{pet} (drying)'}]
        ask = [f'Is the animal ({pet}) wrapped in a towel that {who} rubs with both hands?', f'Does the animal\'s fur look fluffy after the towel is taken off?']
    return {'times': times, 'gaze': gaze, 'check': dict(check, kind='care42f', name=kind, who=who, target=pet, times=times, hold=hold), 'ask': ask}


def care_plan_49b(op, t0):
    """ĐỢT 49 B: các lúc đo của sấy lông / tỉa lông, tính từ đầu bước `t0` theo đúng nhịp của runtime/person/grooming.js (`hold`, `tool` của bước) —
    xem `check_groom49b` của tools/acting_check.py."""
    kind, hold = op['kind'], float(op.get('hold') or HANDS_ON_HOLD[op['kind']][2])
    r = lambda a: round(t0 + a, 2)
    every = lambda a, b, d=0.2: [r(a + d * n) for n in range(int(round((b - a) / d)) + 1)]
    who, pet = op['who'], op['target']
    if kind == 'blowDry':
        W, E1 = 0.6, 0.6 + hold
        times = [r(W + 0.4), r(W + hold / 2), r(E1 - 0.2)]
        check = {'air': every(W + 0.35, E1 - 0.1), 'ripple': every(W + 0.4, W + 1.0, 0.1), 'before': [r(W)], 'after': [r(E1 + 0.9), r(E1 + 1.3)], 'happy': [r(E1 + 0.9), r(E1 + 1.4)],
                 'gadget': 43}
        gaze = [{'times': times, 'aim': 'pet', 'on': pet, 'what': f'{pet} (drying)'}]
        ask = [f'Is {who} blow-drying the animal ({pet}) with a hand-held dryer nozzle aimed at its back, an air stream visible, its fur blown about?',
               f'Does the animal\'s fur look dry and fluffy afterwards?']
    else:
        tool = op.get('tool') or 'scissors'
        C0, U = 1.0, 1.0 + hold
        times = [r(C0 + 0.3), r(C0 + hold / 2), r(U - 0.2)]
        check = {'cut': every(C0 + 0.1, U - 0.1, 0.1), 'shag': [r(C0 - 0.05)], 'fall': every(C0 + 0.3, U + 0.6, 0.1), 'after': [r(U + TRIM_FALL + 0.1), r(U + 1.5)], 'neat': [r(U + 0.35)],
                 'gadget': 44 if tool == 'scissors' else 45, 'trimTool': tool}
        gaze = [{'times': times, 'aim': 'pet', 'on': pet, 'what': f'{pet} (trimming)'}]
        ask = [f'Is {who} trimming the coat of the animal ({pet}) with {"grooming scissors" if tool == "scissors" else "an electric clipper"} along its back, small tufts of fur falling?',
               'Does the coat look neater (less fluffy, no long tufts) afterwards?']
    return {'times': times, 'gaze': gaze, 'check': dict(check, kind='groom49b', name=kind, who=who, target=pet, times=times, hold=hold), 'ask': ask}


def care_window(kind, length):
    """Đợt 35: các giây (tính từ đầu bước) hai tay đang ở trên con vật — `bandage`: các vòng quấn (0,6 s … trước khi khép),
    `putCone`: loa đã sang con vật → cài khoá dưới cằm (1,8 … 2,3 s, trước cái gật; trước đó vòng còn trong tay — `holds the cone` đo)."""
    a, b = (0.6, length - 1.2) if kind == 'bandage' else (1.8, min(2.3, length - 0.5))
    return [round(a + 0.15 * n, 2) for n in range(int((b - a) / 0.15) + 1)]


def desk_plan(name, t0, span, hold):
    """ĐỢT 39 A — lúc đo của một bước quầy thu ngân / cà phê (giây tuyệt đối): `times` (mọi lúc cần chụp), `phases` (lúc nào đo gì), `samples` (mỗi 1/30 s).
    Số liệu trùng RigSVG (runtime/rig-svg.js): quét 0,6 s + 0,45 s tiến sát + hold; đếm 0,6 + 0,62 × 4 tờ; ấn dấu 1,35 s; rót 1,25 s + 1,9 s; lau 0,55 s + hold."""
    r = lambda *v: [round(t0 + x, 2) for x in v if x < span - 0.1]
    phases = {}
    def put(label, times):
        for t in times: phases[str(t)] = label
        return times
    if name in DESK_PAY:
        hold = hold if hold is not None else (1.4 if name == 'payByQR' else 1.2)
        at1 = 0.6 if name == 'payByQR' else 1.1
        scanned = at1 + 0.45 + hold
        near = put('near', r(at1 + 0.5, at1 + 0.45 + hold * 0.5, scanned - 0.1))
        tick = put('tick', r(scanned + 0.4, scanned + 0.7, scanned + 1.0))
        return {'times': near + tick, 'phases': phases}
    if name == 'stampCard':
        press = put('press', r(1.55, 1.85, 2.05)); mark = put('mark', r(2.5, 2.9))
        out = {'times': press + mark, 'phases': phases, 'samples': r(*[1.55 + n / 30 for n in range(16)])}
        return out
    if name == 'giveChange':
        count = [0.6 + 0.62 * n + 0.248 for n in range(4)]
        touch = put('count', r(*count)); notes = put('notes', r(*[c + 0.2 for c in count]))
        give = 0.6 + 0.62 * 4 + 1.05
        return {'times': touch + notes, 'phases': phases, 'samples': r(*[give + 0.4 + n / 30 for n in range(21)]), 'counted': 4}
    if name == 'pourDrink':
        pour = put('pour', r(1.6, 2.2, 2.9)); full = put('full', r(4.5))
        return {'times': pour + full, 'phases': phases}
    if name == 'wipeCounter':
        hold = hold if hold is not None else 2
        wipe = put('wipe', r(*[0.55 + hold * f for f in (0.1, 0.25, 0.4, 0.55, 0.7, 0.85)]))
        return {'times': wipe, 'phases': phases}
    return None
