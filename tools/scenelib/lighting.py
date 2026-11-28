"""moments.json: the moments of a built 3D scene that tools/light_audit.py and tools/acting_check.py check."""
from .cage import cage_plan          # đợt 49 A
from .actions import (HANDS_ON_CARE, CARE_ACTIONS, CHART_ACTIONS, DESK_ACTIONS, DESK_ASK, PAIR_ASK, PAIR_TIMES, CAT_RABBIT_ACTS, PET_ACT_ASK, REACH_ACTIONS,
    REACH_TIMES, RESTRAIN, SHOW_SIZE_GAP)
from .plans import care_plan_tools, care_window, desk_plan


def light_moments(timings, stage_set, power_ops, sky_ops, lamp_ops, gear_ops, names):
    """NHỮNG KHOẢNH KHẮC ÁNH SÁNG của cảnh, kèm câu hỏi có / không mà câu trả lời đúng là "có" — cho tools/light_audit.py
    chụp ảnh tĩnh đúng lúc ấy và hỏi từng điều cụ thể (chấm cả video thì người / máy chấm nói ngược với hình: đợt 21)."""
    turns, total = timings.get('turns', []), float(timings['duration'])
    at = lambda turn, delay: round(min(total - 0.1, float(turns[turn][0]) + delay), 2) if turn < len(turns) else None
    pet_of = lambda name: name and names.get(name, {}).get('_pet')
    dark_start = any(not op['on'] and op['turn'] == 0 for op in power_ops)       # mở cảnh bằng mất điện: tối, không hỏi về bóng
    moments = [{'t': round(min(1.0, total / 2), 2), 'what': 'opening', 'ask': ([] if dark_start else [
        'Does every character cast a visible shadow on the floor (a darker patch under or beside the feet)?']) + [
        'Do the characters take on the colour of the room light (not flat and pasted on)?']
        + (['Do the pieces of furniture (tables, sofa, counters) cast shadows on the floor?'] if (stage_set.get('boxes') or stage_set.get('preset')) and not dark_start else [])
        + ['Is every piece of furniture (sofa, table, TV, counter, cabinet) either fully inside the frame or fully outside it, none cut in half by the left or right edge? (Ignore walls, trees, signs and pictures on walls.)']
        + ([] if dark_start else ['Is the side of each character that faces the main light brighter (or warmer) than the side away from it?'])
        + (['Are the shadows long, and do all of them point in roughly the same direction?'] if stage_set.get('light', 'day') == 'evening' else [])}]
    # Câu hỏi KHÓ hơn theo bối cảnh (đợt 23 — bộ câu cũ đạt 26/27, không còn chỉ ra chỗ yếu): bóng chiều cùng hướng, vũng sáng
    # dưới đèn đường, ánh TV, so sáng tối người gần / xa đèn.
    mood = stage_set.get('light', 'day')
    kinds = [item.get('kind') for item in stage_set.get('cutouts', [])]
    later = round(min(total - 0.2, max(1.5, total * 0.6)), 2)
    extra = []
    if mood != 'day' and 'lamp' in kinds: extra += ['Is there a pool of light on the ground under the lit street lamp?',
                                                    'Is a character standing near the lit lamp brighter than one standing far from it (or than the dark ground around)?']
    if mood != 'day' and 'tv' in kinds: extra += ['Does the TV screen throw a coloured (bluish) glow onto the wall or the people near it?']
    if mood != 'day' and ('lamp' in kinds or 'floorlamp' in kinds or stage_set.get('lamps')): extra += ['Does each character\'s shadow point away from the nearest lit lamp?']
    # Trời tối dần trong cảnh: đèn chỉ bật khi trời đã tối được hơn nửa — hỏi về đèn sau khi trời chuyển xong.
    for op in sky_ops:
        if op['to'] == 'night' and op['turn'] < len(turns): later = round(min(total - 0.2, float(turns[op['turn']][0]) + op['dur'] * 0.85), 2)
    # Không hỏi về đèn / TV đúng lúc đang MẤT ĐIỆN: dời sang sau lúc có điện lại (hay bỏ nếu không còn lúc nào).
    cuts, off = [], None
    for op in sorted(power_ops, key=lambda op: op['turn']):
        start = float(turns[op['turn']][0]) if op['turn'] < len(turns) else total
        if not op['on'] and off is None: off = start
        elif op['on'] and off is not None: cuts.append((off, start + 2.5)); off = None
    if off is not None: cuts.append((off, total + 1))
    for a, b in cuts:
        if a - 0.2 <= later <= b: later = round(b, 2) if b < total - 0.2 else None
    # Không có trời chuyển / mất điện: hỏi ngay ở góc toàn mở cảnh (đèn, TV có trong khung) — một lúc giữa cảnh thường là góc
    # cận, đèn ngoài khung (đợt 23: 5 câu "không thấy đèn").
    if extra and later is not None and not sky_ops and not power_ops: moments[0]['ask'] += extra
    elif extra and later is not None: moments.append({'t': later, 'what': 'light of the place', 'ask': extra})
    for op in power_ops:
        if op['on']: moments.append({'t': at(op['turn'], 2.0), 'what': 'power back on', 'ask': ['Are the lamps lit and the room clearly brighter than during the power cut?']})
        else: moments.append({'t': at(op['turn'], 1.0), 'what': 'power cut', 'ask': [
            'Is the room dark, with every lamp and screen off?', 'Is the window frame about as dark as the wall around it (not bright white)?',
            'Are the characters dim, not lit as if a lamp shone on them?']})
    for op in sky_ops:
        moments.append({'t': at(op['turn'], 0.3), 'what': f'sky turning to {op["to"]} — start', 'ask': ['Is the whole room in the frame (walls, floor, the lamp), not a close-up of one face?']})
        moments.append({'t': at(op['turn'], op['dur'] + 0.5), 'what': f'sky turning to {op["to"]} — end', 'ask': [
            f'Is the place clearly darker and bluer than in the frame at {at(op["turn"], 0.3):g} s?', f'Is the sky (or the windows) darker than in the frame at {at(op["turn"], 0.3):g} s?'] + (['Is a lamp switched on and glowing?'] if op['to'] == 'night' and stage_set.get('light', 'day') != 'night' else [])})
    for op in lamp_ops:
        moments.append({'t': at(op['turn'], op['delay'] + op['dur'] + 0.4), 'what': f'lamp {"on" if op["on"] else "off"}', 'ask': [
            'Is a lamp glowing, with a pool of warm light around it?' if op['on'] else 'Is the lamp off and the room darker around it?']})
    for op in gear_ops:
        pet = pet_of(op['target'])
        if op['kind'] == 'cage49a':
            # ĐỢT 49 A — chuồng: lúc mở cửa, lúc con vật đã trong chuồng (cửa đóng) / đã trên tay — tools/acting_check.py `cage49a`.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            plan = cage_plan(op, float(step['start']), float(step['duration']))
            moments.append({'t': plan['times'][1], 'what': f'{op["who"]} {op["name"]} {op["target"]}', 'ask': plan['ask'], 'check': plan['check']})
            continue
        if op['kind'] in REACH_ACTIONS:
            # Lượt có động tác chạm: đo ở 30 / 50 / 70 % lượt — tay tới đích ở ÍT NHẤT một lúc là đạt.
            if op['turn'] >= len(turns): continue
            t0, t1 = float(turns[op['turn']][0]), float(turns[op['turn']][1])
            # Lúc đo lấy theo chính BƯỚC ấy (`reaches`), không theo cả lượt: lượt vuốt ve của ông ngồi ghế đá có quãng chờ máy quay
            # trước khi tay đưa ra — lúc 50 % lượt hai tay còn buông bên hông; bế: lúc 50 % con mèo còn dưới sàn, nó chỉ nằm trước
            # ngực từ ~75 % bước (Gemini, đợt 29). Bế: lúc giữa (lúc được hỏi) và lúc cuối đã ôm; các động tác khác: tay đã tới.
            reach = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                          for step in timings['reaches'][n] if step['name'] == op['kind']), None)
            if reach: t0, t1 = float(reach['start']), float(reach['start']) + float(reach['duration'])
            times = [round(t0 + (t1 - t0) * f, 2) for f in ((0.35, 0.82, 0.95) if op['kind'] == 'carry' else REACH_TIMES.get(op['kind'], (0.4, 0.55, 0.7)))]
            tool_plan = care_plan_tools(op, t0) if op['kind'] in HANDS_ON_CARE and reach and pet else None          # đợt 38 A: lúc đo theo nhịp của động tác
            if tool_plan: times = tool_plan['times']
            pet = pet_of(op['target'])
            ask = ([f'Does {op["who"]}\'s hand touch, or almost touch, the {"animal" if pet else "other person"} ({op["target"]})?']
                   if REACH_ACTIONS[op['kind']] != 'hands' else [f'Do the hands of {op["who"]} and {op["target"]} meet (touch or almost touch)?'])
            if op['kind'] == 'carry': ask = [f'Is {op["who"]} holding the animal ({op["target"]}) in their arms, against the chest — not floating beside them?']
            if op['kind'] == RESTRAIN: ask = [f'Is {op["who"]} holding the animal ({op["target"]}) still with both hands on it' + (f', while {op["partner"]} works on it from the other side?' if op.get('partner') else '?')]
            moments.append({'t': times[1], 'what': f'{op["who"]} {op["kind"]} {op["target"]}', 'ask': ask + ['Are the standing characters\' feet on the floor (not floating above it or sunk into it)?'],
                            'check': dict({'kind': op['kind'], 'who': op['who'], 'target': op['target'], 'to': REACH_ACTIONS[op['kind']], 'times': times},
                                          # BẾ (đợt 35, lượt bốn): mỗi 1/30 s suốt bước — con vật không nhảy chỗ giữa hai khung
                                          **({'samples': [round(t0 + n / 30, 3) for n in range(int((t1 - t0) * 30) + 1)]} if op['kind'] == 'carry' else {}),
                                          # SOI (đợt 37): đầu quay / cúi về đầu con vật lúc soi tai, mắt, răng — không nhìn ra máy quay.
                                          **({'gaze': [{'times': times, 'aim': 'pet', 'on': op['target'], 'what': f'{op["target"]}\'s head'}]} if op['kind'] == 'examine' and pet else {}),
                                          **({'gaze': tool_plan['gaze']} if tool_plan else {}),
                                          # VUỐT (đợt 32): dải mốc mỗi 0,1 s suốt các lần vuốt (0,45…1,7 s của bước) — tay có áp sát và
                                          # trượt theo đầu / lưng con vật suốt động tác không, không chỉ ở lúc được hỏi.
                                          **({'track': [round(t0 + 0.45 + 0.1 * n, 2) for n in range(13) if 0.45 + 0.1 * n <= (t1 - t0) - 0.3]} if op['kind'] == 'stroke' and pet else {}),
                                          # ĐEO ĐỒ (đợt 35, lượt hai): dải mốc mỗi 0,15 s suốt lúc HAI tay ở trên con vật (quấn băng / đưa vòng quanh cổ,
                                          # cài khoá) — tay áp sát ở mọi mốc, cả hai tay tới nó; `appear`: mỗi 0,1 s quanh lúc đồ hiện / dời sang
                                          # con vật — chỉ khi tay đang ở đó (Gemini: "vòng tự bay lên đầu mèo, hai tay vẫn chắp ở bụng").
                                          **({'track': [round(t0 + a, 2) for a in care_window(op['kind'], t1 - t0)], 'appear': [round(t0 + 0.1 * n, 2) for n in range(int((t1 - t0) * 10)) if 0.1 * n <= t1 - t0 - 0.8],
                                              'by': op['who']} if op['kind'] in CARE_ACTIONS and pet else {}),
                                          # GIỮ CON VẬT (đợt 38 B): dải mốc mỗi 0,15 s suốt lúc giữ và vuốt dỗ — HAI tay trên con vật ở mọi mốc; đầu
                                          # quay về đầu nó; tay người làm cùng lúc không bị tay người giữ che; con vật không tự dời (mỗi 1/30 s).
                                          **({'track': [round(t0 + 0.6 + 0.15 * n, 2) for n in range(int((float(op.get('hold', 3)) + 0.65) / 0.15) + 1)],
                                              'gaze': [{'times': [round(t0 + 0.8, 2), round(t0 + 0.5 + float(op.get('hold', 3)) * 0.6, 2), round(t0 + 0.4 + float(op.get('hold', 3)), 2)], 'aim': 'pet', 'on': op['target'], 'what': f'{op["target"]}\'s head'}],
                                              'frames': [round(t0 + n / 30, 3) for n in range(int((t1 - t0) * 30) + 1)], 'partner': op.get('partner')} if op['kind'] == RESTRAIN and pet else {}))})
            # ĐỒ ĐEO CÒN LẠI (đợt 35): sau `bandage` / `putCone`, băng vẫn trên chân trước / loa vẫn quanh đầu con vật, thấy được trong khung.
            if op['kind'] in CARE_ACTIONS and pet:
                end = float(timings.get('duration') or t1 + 1.2)
                after = [round(min(t1 + d, end - 0.05), 2) for d in (0.3, 1.0)]
                item = 'bandage' if op['kind'] == 'bandage' else 'cone'
                moments.append({'t': after[0], 'what': f'{op["target"]} wears the {item}', 'ask': [f'Does the animal ({op["target"]}) now wear ' + ('a bandage wrapped round its front leg?' if item == 'bandage' else 'a clear recovery cone (a cone collar) round its head?')],
                                'check': {'kind': 'worn', 'who': op['target'], 'by': op['who'], 'item': item, 'times': after}})
            if op['kind'] == 'takeTemp' and reach:
                # ĐỌC NHIỆT KẾ (đợt 35): mắt nhìn vào nhiệt kế đang giơ lên (lúc 0,6 + hold + 0,6 / 0,9 / 1,2 s của bước).
                up = float(reach['start']) + 0.6 + float(op.get('hold', 1.5))
                look = [round(up + f, 2) for f in (0.6, 1.2, 1.8)]           # lượt ba: giữ dáng đọc ≥ 1,2 s — đo đầu, giữa, cuối quãng ấy
                moments.append({'t': look[1], 'what': f'{op["who"]} reads the thermometer', 'ask': [f'Is {op["who"]} looking at the thermometer in their raised hand, with the temperature shown beside it?'],
                                'check': {'kind': 'look', 'who': op['who'], 'gadget': 6, 'times': look,
                                          # HƯỚNG ĐẦU (đợt 36): tia nhìn từ giữa mặt theo hướng đầu đi qua nhiệt kế
                                          'gaze': [{'times': look, 'aim': 'gadget', 'gadget': 6, 'what': 'the thermometer'}]}})
            if op['kind'] == 'givePill' and reach:
                # VIÊN THUỐC VÀO MÕM (đợt 35): viên thuốc ở môi con vật và miệng nó đang há (0,8 / 0,95 / 1,1 s của bước).
                pill = [round(float(reach['start']) + f, 2) for f in (0.6, 1.0, 1.4)]        # miệng há suốt ≥ 0,8 s quanh lúc viên thuốc vào (1,0 s)
                moments.append({'t': pill[1], 'what': f'{op["who"]} puts a pill in {op["target"]}\'s mouth', 'ask': [f'Is a white pill at the mouth of the animal ({op["target"]}), with its mouth open?'],
                                'check': {'kind': 'pill', 'who': op['who'], 'target': op['target'], 'times': pill,
                                          'gaze': [{'times': pill, 'aim': 'pet', 'on': op['target'], 'what': f'{op["target"]}\'s head'}],
                                          # NHAI (đợt 36): độ há mỗi 0,1 s suốt quãng con vật nhai sau khi khép miệng (bước + 2,2 … 4,8 s; miệng khép xong lúc ~2,1 s)
                                          'chew': [round(float(reach['start']) + 2.2 + i * 0.1, 2) for i in range(27)]}})
            if tool_plan:
                moments.append({'t': tool_plan['times'][1], 'what': f'{op["who"]} {op["kind"]} {op["target"]} — the tool at work', 'ask': tool_plan['ask'], 'check': tool_plan['check']})
            if op['kind'] != 'examine': continue                                      # khám: còn khoảnh khắc đèn soi ở dưới
        if op['kind'] == 'desk39' or (op['kind'] == 'pair' and op['name'] in DESK_ACTIONS):
            # ĐỢT 39 A — quầy thu ngân / cà phê: lúc đo theo nhịp của rig (RigSVG.PAY_* / COUNT_* / STAMP_* / POUR_* …), tools/acting_check.py `desk39`.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            plan = desk_plan(op['name'], float(step['start']), float(step['duration']), op.get('hold'))
            if not plan: continue
            check = dict({'kind': 'desk39', 'name': op['name'], 'who': op['who'], 'target': op.get('target')}, **plan)
            moments.append({'t': plan['times'][len(plan['times']) // 2], 'what': f'{op["who"]} {op["name"]}' + (f' {op["target"]}' if op.get('target') else ''),
                            'ask': [(DESK_ASK if op['kind'] == 'desk39' else PAIR_ASK)[op['name']].format(who=op['who'], target=op.get('target'))], 'check': check})
            continue
        if op['kind'] == 'pair':
            # HAI NGƯỜI (đợt 38 C): đo ở nhiều lúc trong bước (tools/acting_check.py `pair`), hỏi ở lúc giữa; người kia (và người làm) quay
            # đầu nhìn nhau — trừ khi ôm (hai mặt áp má, hướng ra người xem).
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, span = float(step['start']), float(step['duration'])
            times = [round(t0 + a, 2) for a in PAIR_TIMES[op['name']] if a < span - 0.2]
            gaze = [{'times': times, 'aim': 'person', 'on': op['target'], 'what': f'{op["target"]}\'s head'}] if op['name'] in ('highFive', 'patShoulder', 'handOverBag') else []
            check = {'kind': 'pair', 'name': op['name'], 'who': op['who'], 'target': op['target'], 'times': times, 'gaze': gaze}
            if op['name'] == 'handOverBag': check['samples'] = [round(t0 + 0.95 + n / 30, 3) for n in range(16)]
            moments.append({'t': times[len(times) // 2], 'what': f'{op["who"]} {op["name"]} {op["target"]}', 'ask': [PAIR_ASK[op['name']].format(who=op['who'], target=op['target'])], 'check': check})
            # Người kia nhìn lại: vỗ vai — suốt lúc tay trên vai; thì thầm — lúc phản ứng (quay lại nhìn người nói, gật).
            back = times if op['name'] in ('patShoulder', 'highFive') else [round(t0 + a, 2) for a in (2.9, 3.2, 3.5) if a < span - 0.2] if op['name'] == 'whisper' else []
            if back: moments.append({'t': back[len(back) // 2], 'what': f'{op["target"]} looks at {op["who"]}', 'ask': [f'Is {op["target"]} looking at {op["who"]} (head turned to them)?'],
                                     'check': {'kind': 'pairLook', 'name': f'looks back ({op["name"]})', 'who': op['target'], 'times': back, 'gaze': [{'times': back, 'aim': 'person', 'on': op['who'], 'what': f'{op["who"]}\'s head'}]}})
            continue
        if op['kind'] == 'weigh':
            # CÂN (đợt 35): lúc bế lên (0,3 / 0,4 / 0,48 s — tay tới thân con vật) và lúc đọc số (con vật đứng trên bệ cân, thẻ số đã
            # bật lên: 2,6 s … 2,25 + hold của bước).
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == 'weigh'), None)
            if not step: continue
            t0, hold = float(step['start']), float(op.get('hold', 1.6))
            pick = [round(t0 + f, 2) for f in (0.3, 0.4, 0.48)]
            read = [round(t0 + 2.3 + 0.45 + hold * f, 2) for f in (0.1, 0.5, 0.9)]
            # THEO TỪNG KHUNG (đợt 35): con vật không nhảy chỗ khi không tay nào chạm nó — suốt bước, mỗi 1/30 s.
            track = [round(t0 + n / 30, 3) for n in range(int(float(step['duration']) * 30) + 1)]
            moments.append({'t': pick[1], 'what': f'{op["who"]} picks {op["target"]} up to weigh it', 'ask': [f'Does {op["who"]}\'s hand touch, or almost touch, the animal ({op["target"]})?'],
                            'check': {'kind': 'carry', 'who': op['who'], 'target': op['target'], 'to': 'body', 'times': pick, 'only': 'reach'}})
            moments.append({'t': read[1], 'what': f'{op["who"]} weighs {op["target"]}', 'ask': [f'Is the animal ({op["target"]}) standing on the scale, with its weight shown on a display above it?',
                                                                                            f'Is {op["who"]} standing up looking at the scale?'],
                            'check': {'kind': 'weigh', 'who': op['who'], 'target': op['target'], 'times': read, 'frames': track,
                                      # MÀN HÌNH CÂN (lượt ba): số cân lúc đọc, số 0 trước khi đặt lên và sau khi bế ra
                                      'reading': op.get('reading'), 'empty': [round(t0 + 0.3, 2), round(t0 + 2.85 + hold + 1.3, 2)],
                                      'gaze': [{'times': read, 'aim': 'readout', 'what': 'the weight shown over the scale'}]}})     # trước khi đặt lên; đã bế lên trước bụng
        if op['kind'] in CHART_ACTIONS:
            # ĐỌC BỆNH ÁN / CHỈ PHIM (đợt 35): bìa hồ sơ giơ trước ngực, trong khung (`readChart`); tay chỉ TRÚNG điểm trên phim và
            # nằm trong khung (`showXray`) — đo ở giữa phần đọc / phần chỉ của bước.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['kind']), None)
            if not step: continue
            t0, t1 = float(step['start']), float(step['start']) + float(step['duration'])
            times = [round(t0 + (t1 - t0) * f, 2) for f in ((0.3, 0.45, 0.6) if op['kind'] == 'readChart' else (0.4, 0.55, 0.7))]
            ask = ([f'Is {op["who"]} holding a clipboard up in front of the chest and looking down to read it?'] if op['kind'] == 'readChart'
                   else [f'Is {op["who"]} pointing at a spot on the X-ray film of the viewer beside them?', 'Is the X-ray film (bones on a dark film) in the frame?'])
            check = {'kind': op['kind'], 'who': op['who'], 'target': op['target'], 'times': times}
            # HƯỚNG NHÌN SAU KHI CHỈ PHIM (đợt 35, lượt hai): người chỉ quay về phía người nghe — lượt ba: ở BA mốc (0,9 s và 0,4 s trước
            # khi bước xong, 0,3 s sau) — giữ ≥ 1 s (Gemini đọc ~1 khung / giây).
            if op['kind'] == 'showXray' and op.get('listener'):
                check.update(listener=op['listener'], after=[round(t1 - 0.9, 2), round(t1 - 0.4, 2), round(min(t1 + 0.3, float(timings.get('duration') or t1 + 1) - 0.05), 2)])
            # HƯỚNG ĐẦU (đợt 36): chỉ phim — đầu hướng về điểm chỉ; xong — về người nghe (trong bước).
            if op['kind'] == 'showXray':
                check['gaze'] = [{'times': times[:2], 'aim': 'spot', 'what': 'the spot on the film'}] + ([{'times': check['after'][:2], 'aim': 'person', 'on': op['listener'], 'what': op['listener']}] if op.get('listener') else [])
            # ĐỌC BỆNH ÁN (lượt ba): đầu CÚI (nghiêng + hạ) ở 4 mốc của hai lúc đọc, NGẨNG lên trước khi gật, rồi hai lần gật (đáy / giữa
            # hai lần). Mốc tính theo runtime/rig-svg.js `readChart` (lật ở 0,5 + max(1,3; 0,6 × hold), ngẩng ở lật + 0,85 + max(1,2; 0,4 × hold)).
            if op['kind'] == 'readChart':
                hold = float(op.get('hold') or 2.0); flip = 0.5 + max(1.3, hold * 0.6); up = flip + 0.85 + max(1.2, hold * 0.4)
                check.update(reading=[round(t0 + a, 2) for a in (0.7, flip - 0.5, flip + 1.0, up - 0.2)], raised=[round(t0 + up + 0.55, 2)],
                             nods=[round(t0 + up + a, 2) for a in (1.33, 1.95, 2.58)])          # đáy lần 1 · giữa hai lần · đáy lần 2 (gật có giữ ở đáy)
                ask = ask + [f'After pointing, does {op["who"]} turn toward {op["listener"]} (not to the camera)?']
            # HƯỚNG ĐẦU (đợt 36): đọc — đầu hướng về tấm bảng; ngẩng lên — về người nghe.
            if op['kind'] == 'readChart':
                check['gaze'] = [{'times': check['reading'], 'aim': 'clipboard', 'what': 'the clipboard'}] + ([{'times': check['raised'] + check['nods'][1:2], 'aim': 'person', 'on': op['listener'], 'what': op['listener']}] if op.get('listener') else [])
            moments.append({'t': times[1], 'what': f'{op["who"]} {op["kind"]}', 'ask': ask, 'check': check})
            continue
        if op['kind'] == 'reaction':
            # PHẢN ỨNG CỦA CON VẬT (đợt 33): ở 30 / 50 / 70 % lượt nó thấy được trong khung; `start` / `end` để `acting_check` xét góc chèn
            # con vật ngay trước có giữ tới hết lượt không.
            if op['turn'] >= len(turns): continue
            t0, t1 = float(turns[op['turn']][0]), float(turns[op['turn']][1])
            times = [round(t0 + (t1 - t0) * f, 2) for f in (0.3, 0.5, 0.7)]
            moments.append({'t': times[1], 'what': f'{op["who"]} reacts', 'ask': [f'Is the animal ({op["who"]}) in the frame, reacting?'],
                            'check': {'kind': 'reaction', 'who': op['who'], 'times': times, 'start': round(t0, 2), 'end': round(t1, 2)}})
            continue
        if op['kind'] == 'prep':
            # ĐỢT 38 B — rửa tay: bọt quanh HAI bàn tay ở ba lúc xoa (0,35 + hold × 0,25 / 0,6 / 0,9 của bước), hết bọt sau khi vẩy; đầu cúi
            # về hai bàn tay. Đeo / tháo găng: mỗi 0,1 s suốt bước — găng chỉ hiện / mất trên bàn tay khi bàn tay kia ở sát nó; xong bước
            # (+0,3 s) đủ hai găng / không còn găng.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, t1 = float(step['start']), float(step['start']) + float(step['duration'])
            end = float(timings.get('duration') or t1 + 1)
            if op['name'] == 'washHands':
                rub = [round(t0 + 0.35 + op['hold'] * f, 2) for f in (0.25, 0.6, 0.9)]
                moments.append({'t': rub[1], 'what': f'{op["who"]} washes the hands', 'ask': [f'Is {op["who"]} rubbing both hands together in front of the chest, with white soap foam round the hands?'],
                                'check': {'kind': 'prep', 'name': op['name'], 'who': op['who'], 'times': rub, 'after': [round(min(t1 + 0.2, end - 0.05), 2)],
                                          'gaze': [{'times': rub, 'aim': 'gadget', 'gadget': 14, 'what': 'the hands'}]}})
            else:
                on = op['name'] == 'putOnGloves'
                mid = [round(t0 + (t1 - t0) * f, 2) for f in (0.3, 0.5, 0.8)]
                moments.append({'t': mid[1], 'what': f'{op["who"]} {"puts on" if on else "takes off"} gloves', 'ask': [f'Is {op["who"]} ' + ('pulling a blue medical glove onto one hand with the other hand?' if on else 'peeling a blue medical glove off one hand with the other hand?')],
                                'check': {'kind': 'prep', 'name': op['name'], 'who': op['who'], 'times': mid, 'samples': [round(t0 + 0.1 * n, 2) for n in range(int((t1 - t0) * 10) + 1)],
                                          'after': [round(min(t1 + 0.3, end - 0.05), 2)]}})
            continue
        if op['kind'] == 'floor42e':
            # ĐỢT 42 E — SÁT SÀN: mốc theo runtime/rig-svg.js. Ngồi bệt / nằm: đã vào thế ở (độ dài bước − 0,35 / 0,4) — đo ở đó, cuối bước và
            # 0,8 s sau (thế giữ). Nhặt: tay chạm món đồ ở 1,0 s (nắm lại ở 1,02), cầm nó đứng lên, xong bước thì món đồ trong tay.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, dur, name, who = float(step['start']), float(step['duration']), op['name'], op['who']
            clip = lambda t: round(min(total - 0.05, t), 2)
            if name == 'pickUp':
                item = {'toy': 'toy ball', 'bowl': 'pet bowl', 'leash': 'leash'}.get(op.get('item') or 'toy', 'toy')
                times = [clip(t0 + 0.92), clip(t0 + 1.0), clip(t0 + dur - 0.05)]
                ask = [f'Is {who} squatting down (knees bent, back fairly straight, not a stiff bend) with a hand closing on a {item} on the floor?',
                       f'Is the {item} in {who}\'s hand (not floating, not left on the floor) at the end?']
                moments.append({'t': times[1], 'what': f'{who} pickUp', 'ask': ask, 'check': {'kind': 'floor42e', 'name': name, 'who': who, 'times': times, 'target': op.get('target'), 'item': op.get('item'), 'to': 'hands'}})      # `to: hands`: không đo "con vật thấy được" (acting_check `check_seen`)
                continue
            ready = dur - (0.35 if name == 'sitOnFloor' else 0.4)
            times = [clip(t0 + ready), clip(t0 + dur - 0.02), clip(t0 + dur + 0.8)]
            if name == 'sitOnFloor':
                ask = [f'Is {who} sitting cross-legged on the floor (hips on the floor, shins folded in front), back upright, hands on the knees?']
            else:
                ask = [f'Is {who} lying down {"on the sofa, the head on a cushion" if op.get("sofa") else "on the floor, the head on an arm"} — the body horizontal, not floating above it or sunk into it?']
                if op.get('sleep'): ask.append(f'Are {who}\'s eyes closed, asleep?')
            moments.append({'t': times[1], 'what': f'{who} {name}', 'ask': ask, 'check': {'kind': 'floor42e', 'name': name, 'who': who, 'times': times, 'sofa': bool(op.get('sofa')), 'target': None, 'to': 'hands'}})
            continue
        if op['kind'] == 'talk39':
            # NGƯỜI DẪN (đợt 39 C): mốc theo runtime/rig-svg.js — giơ bảng: bảng lên ở 0,87 s, hạ ở 0,87 + max(hold; 1,2); ra dấu: tay tới ở 0,45 s, buông ở
            # 0,45 + max(hold; 1,1); tự sướng: máy lên ở 0,5 s, chớp ở 0,75 + max(0,5; 0,45 × hold), xong ở 0,7 + max(hold; 1,2); ngáp: tay lên ở 0,55 s,
            # hạ ở 0,7 + max(hold; 1,1). Mốc cuối của tự sướng là lúc CHỚP SÁNG.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, name, who = float(step['start']), op['name'], op['who']
            hold = float(op['hold']) if op.get('hold') else {'holdSign': 2.0, 'showSize': 1.4, 'takeSelfie': 1.6, 'yawnStretch': 1.3}[name]
            if name == 'holdSign':
                H = max(hold, 1.2); marks = [0.87 + 0.55 * H, 0.87 + 0.75 * H, 0.87 + 0.95 * H]
                ask = [f'Is {who} holding a small sign with the text "{op.get("text") or ""}" in both hands in front of the chest, facing the viewer?', 'Is the text on the sign big and readable (Vietnamese letters with their marks intact)?']
            elif name == 'showSize':
                H = max(hold, 1.1); marks = [0.45 + 0.3 * H, 0.45 + 0.6 * H, 0.45 + 0.9 * H]
                ask = [f'Are {who}\'s two hands held apart in front of the body, palms facing each other, showing the size of something ("this big")?']
            elif name == 'takeSelfie':
                H = max(hold, 1.2); flash = 0.75 + max(0.5, hold * 0.45) + 0.08; marks = [0.9, 0.7 + 0.5 * H, 0.7 + 0.9 * H, flash]
                ask = [f'Is {who} holding a phone up high at arm\'s length, smiling and tilting the head, taking a selfie' + (f' together with {op["with"]}, who leans in beside them' if op.get('with') else '') + '?',
                       'Is the phone clearly visible above the head, with a white flash of the camera at the moment of the shot?'] + ([f'Are both {who} and {op["with"]} inside the frame, close together?'] if op.get('with') else [])
            else:
                H = max(hold, 1.1); marks = [0.8, 0.7 + 0.5 * H, 0.7 + 0.9 * H]
                ask = [f'Is {who} yawning wide (mouth open, eyes shut) with both arms stretched up over the head?']
            times = [round(t0 + m, 2) for m in marks]
            moments.append({'t': times[1], 'what': f'{who} {name}', 'ask': ask + [f'Are {who}\'s hands inside the frame (not cut off by its edge)?'],
                            'check': {'kind': 'talk39', 'name': name, 'who': who, 'times': times, 'size': SHOW_SIZE_GAP.get(op.get('size'), op.get('size')) if name == 'showSize' else None, 'with': op.get('with')}})
            continue
        if op['kind'] == 'motion42d':
            # ĐỢT 42 D — CHẠY, NHẢY LÊN, NHẢY MÚA: mỗi 1/30 s suốt bước (pha bay, chân trụ không trượt, đầu / tay / chân trong khung) và
            # 0,3 s sau bước (hai bàn chân đã về sàn).
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, t1 = float(step['start']), float(step['start']) + float(step['duration'])
            samples = [round(t0 + n / 30, 3) for n in range(int((t1 - t0) * 30) + 1)]
            times = [round(t0 + (t1 - t0) * f, 2) for f in (0.3, 0.5, 0.7)]
            after = round(min(t1 + 0.3, float(timings.get('duration') or t1 + 0.3) - 0.05), 2)
            ask = {'run': f'Is {op["who"]} running (leaning forward, knees high, arms pumping), with both feet off the ground at some moments?',
                   'jump': f'Is {op["who"]} jumping for joy, both feet clearly off the floor, arms up, the shadow left on the floor?',
                   'dance': f'Is {op["who"]} dancing to a beat (bouncing, arms swinging / up), with the whole body in the frame?'}[op['name']]
            moments.append({'t': times[1], 'what': f'{op["who"]} {op["name"]}' + (f' to {op["target"]}' if op.get('target') else ''), 'ask': [ask],
                            'check': {'kind': 'motion42d', 'name': op['name'], 'who': op['who'], 'target': None, 'to42d': op.get('target'), 'times': times, 'samples': samples, 'after': [after]}})
            continue
        if op['kind'] == 'gesture':
            # ĐỘNG TÁC TAY (đợt 33): ở 40 / 55 / 70 % bước, bàn tay của người làm nằm trong khung — góc trung khung dọc lấy bề ngang
            # theo đầu + thân áo (`core`) thì tay đang vẫy / chỉ ra ngoài mép.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, t1 = float(step['start']), float(step['start']) + float(step['duration'])
            times = [round(t0 + (t1 - t0) * f, 2) for f in (0.4, 0.55, 0.7)]
            moments.append({'t': times[1], 'what': f'{op["who"]} {op["name"]}', 'ask': [f'Are {op["who"]}\'s hands inside the frame (not cut off by its edge)?'],
                            'check': {'kind': 'gesture', 'name': op['name'], 'who': op['who'], 'times': times}})
            continue
        if op['kind'] == 'petAct':
            # ĐỘNG TÁC THÚ (đợt 35): ở 40 / 55 / 70 % bước (nấp: lần ló đầu cuối cùng — lúc đầu đã ló hẳn ra, 1,25 s trước khi bước xong).
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == op['name']), None)
            if not step: continue
            t0, t1 = float(step['start']), float(step['start']) + float(step['duration'])
            times = ([round(t1 - 2.75, 2), round(t1 - 1.25, 2), round(t1 - 1.0, 2)] if op['name'] == 'hide'
                     else [round(t0 + (t1 - t0) * f, 2) for f in ((0.25, 0.4, 0.5) if op['name'] == 'chaseTail' else (0.4, 0.55, 0.7))])
            # DẢI MỐC (đợt 35, lượt hai): đuổi đuôi — mỗi 1/15 s suốt quãng chạy vòng (đếm số lần đổi hướng); nhào — mỗi 0,06 s (biên độ
            # bàn chân trước); nấp — mỗi 0,1 s suốt bước (không chạy xuyên qua người).
            span = {'chaseTail': (t0 + 0.4, t1 - 2.0, 1 / 15), 'knead': (t0 + 0.6, t1 - 0.4, 0.06), 'hide': (t0, t1, 0.1), 'lick': (t0 + 0.3, t1 - 0.4, 1 / 30), 'eatCarrot': (t0 + 0.4, t1 - 0.1, 0.1), 'shiverAtVet': (t0, t1, 1 / 30), 'struggle': (t0, t1, 1 / 30), 'groggy': (t0, t1, 0.1), 'pawAtCone': (t0, t1, 1 / 15),
                    'playBow': (t0 + 0.5, t1 - 0.5, 0.2), 'howl': (t0 + 1.1, t1 - 0.7, 0.2), 'dig': (t0 + 0.4, t1 - 0.5, 0.06), 'carryToy': (t0 + 0.7, t1 - 0.3, 0.2),
                    'leanOnLeg': (t0 + 0.6, t1 - 0.5, 0.2), 'tugOfWar': (t0 + 0.9, t1 - 0.6, 0.1), **{name: (t0 + 0.1, t1 - 0.1, 0.1) for name in CAT_RABBIT_ACTS}}.get(op['name'])      # đợt 40 A, B, C (C: bốn động tác mới; cà rốt đo kỹ hơn)
            samples = [round(span[0] + span[2] * n, 2) for n in range(int((span[1] - span[0]) / span[2]) + 1)] if span and span[1] > span[0] else []
            moments.append({'t': times[1], 'what': f'{op["who"]} {op["name"]}' + (f' {op["target"]}' if op['target'] else ''), 'ask': [PET_ACT_ASK[op['name']]],
                            'check': dict({'kind': 'petAct', 'name': op['name'], 'who': op['who'], 'target': op['target'], 'carried': op.get('carried', False), 'times': times},
                                          **({'samples': samples} if samples else {}))})
            continue
        if op['kind'] == 'putDown':
            # ĐẶT XUỐNG (đợt 30): con vật nằm trên sàn sát chân người đặt, và đứng yên — từ lúc tay thả (60 % bước) tới 0,8 s sau
            # khi bước xong. Trước đây người NHẬN đặt xuống thì nó trượt dọc sàn về chỗ được bế lần đầu.
            step = next((step for n in (op['turn'], op['turn'] + 1, op['turn'] - 1) if 0 <= n < len(timings.get('reaches') or [])
                         for step in timings['reaches'][n] if step['name'] == 'putDown'), None)
            if not step: continue
            t0, t1 = float(step['start']), float(step['start']) + float(step['duration'])
            # Lúc đo cuối: 0,8 s sau bước, nhưng trước lượt kế — lượt sau người đặt có thể bước đi (đo chỗ con vật so với người ấy).
            after = min([t1 + 0.8, float(timings.get('duration') or t1 + 0.8)] + [float(a) - 0.05 for a, _ in turns if float(a) > t1 + 0.1])
            times = [round(t0 + (t1 - t0) * 0.62, 2), round(t1, 2), round(max(t1, after), 2)]
            moments.append({'t': times[1], 'what': f'{op["who"]} puts {op["target"]} down', 'ask': [f'Is the animal ({op["target"]}) on the floor right next to {op["who"]}\'s feet (not across the room, not sliding away)?'],
                            'check': {'kind': 'putDown', 'who': op['who'], 'target': op['target'], 'to': 'floor', 'times': times,
                                      'samples': [round(t0 + n / 30, 3) for n in range(int((t1 - t0) * 30) + 1)]}})
            continue
        if op['kind'] == 'walk':
            # ĐI NGANG QUA ĐÈN (tối, có đèn): hai khung đầu / cuối quãng đi — bóng phải xoay / dài ngắn theo vị trí đèn, người sáng
            # lên khi tới gần đèn (đợt 24).
            t0, t1 = at(op['turn'], min(1.4, op['dur'] * 0.3)), at(op['turn'], max(0.8, op['dur'] - 0.3))
            if t0 is None or t1 is None or t1 - t0 < 1: continue
            check = {'kind': 'walk', 'who': op['who'], 'times': [t0, round((t0 + t1) / 2, 2), t1]}
            if stage_set.get('light', 'day') == 'day' or not (any(item.get('kind') in ('lamp', 'floorlamp') for item in stage_set.get('cutouts', [])) or stage_set.get('lamps')):
                # Ban ngày / không đèn: chỉ soát dáng đi — chân chạm sàn, không trượt (đợt 28).
                moments.append({'t': check['times'][1], 'what': f'{op["who"]} walking', 'ask': ["Are the walking character's feet on the floor (not floating above it or sunk into it)?"], 'check': check})
                continue
            moments.append({'t': t0, 'what': f'{op["who"]} walking — start', 'ask': ['Does the walking character cast a shadow on the ground?'], 'check': check})
            moments.append({'t': t1, 'what': f'{op["who"]} walking — end', 'ask': [
                f'Compared with the frame at {t0:g} s, has the walking character\'s shadow changed direction or length?',
                f'Is the walking character brighter in whichever of the two frames ({t0:g} s or this one) they stand nearer a lit lamp?']})
            continue
        if op['kind'] == 'shine':
            moments.append({'t': at(op['turn'], 1.3), 'what': 'flashlight', 'ask': [
                'Is there a bright beam of light coming out of the flashlight?', 'Does the beam fade with distance and have soft edges (not a flat hard-edged shape)?']
                + (['Is there a pool of light on the floor or on the wall?'] if stage_set.get('light', 'day') != 'day' else [])
                + (['Is the animal brighter where the beam reaches it?', "Are the animal's eyes narrowed (squinting) in the light?",
                    'Does the animal cast a shadow on the floor on the side away from the flashlight?'] if pet else [])})
        else:
            moments.append({'t': at(op['turn'], 1.2), 'what': 'examining light', 'ask': [
                'Is a small beam or spot of light from the examining light visible?'] + (["Are the animal's eyes narrowed (squinting) in the light?"] if pet else [])})
    return sorted((m for m in moments if m['t'] is not None), key=lambda m: m['t'])
