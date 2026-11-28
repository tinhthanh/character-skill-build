"""Phase 4 step: the moments moments.json measures and asks about (`gear_ops`), and who holds which pet / where people stand after an
explicit walk or run."""
from .actions import (CHART_ACTIONS, DESK_ACTIONS, FLOOR_ACTIONS, GESTURES, HANDS_ON_CARE, HANDS_ON_HOLD, PAIR_PARTNER, PET_ACTS,
    PREP_ACTIONS, PRESENTER_ACTIONS, REACH_ACTIONS, RESTRAIN, RUN_GAP, RUN_TO, WHOLE_BODY)
from .steps import showxray_listener
from .util import fail, js


def record_moments(arms, emitted, entry, gear_ops, holding, names, reach_notes, st, stage_set, where):
    """Ghi các mốc để moments.json đo / hỏi đúng lúc (`gear_ops`): chạm, hai người, cân, động tác tay, người dẫn, sát sàn, chuẩn bị, quầy, bệnh án, động tác thú, đi, chạy; cập nhật ai đang bế con vật nào và chỗ đứng sau bước đi."""
    # Đèn trong tay: ghi lại lượt nào rọi / soi, để moments.json hỏi đúng lúc ấy (tools/light_audit.py).
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        # PHẢN ỨNG CỦA CON VẬT (đợt 33): lượt của con vật (có `mood` hay `do`) — moments.json đo nó trong khung, và góc chèn nó ngay
        # trước đó kéo tới hết lượt này.
        if isinstance(turn, dict) and turn.get('who') in names and names[turn['who']]['_pet'] and (turn.get('mood') or turn.get('do')) and not turn.get('say'):
            gear_ops.append({'turn': emitted[0], 'kind': 'reaction', 'who': turn['who'], 'target': None})
        if not isinstance(turn, dict) or not isinstance(turn.get('do'), list): continue
        for step in turn['do']:
            # Động tác CHẠM (tay tới con vật / tới tay người kia): cho moments.json — đo bằng máy (tools/acting_check.py) và hỏi người chấm.
            if isinstance(step, list) and len(step) > 1 and step[0] in REACH_ACTIONS and step[0] != 'examine' and isinstance(step[1], str) and step[1].startswith('@'):      # khám: ghi ở dưới
                gear_ops.append({'turn': emitted[0], 'kind': step[0], 'who': turn.get('who'), 'target': step[1][1:], **({'hold': step[2]} if step[0] in ('takeTemp', RESTRAIN) and len(step) > 2 else {}),
                                 **({'hold': step[2].get('hold', HANDS_ON_HOLD[step[0]][2]), 'id': step[2].get('id'), **({'tool': step[2]['tool']} if 'tool' in step[2] else {})} if step[0] in HANDS_ON_CARE and len(step) > 2 and isinstance(step[2], dict) else {}),
                                  **({'partner': next((other.get('who') for other in (entry.get('together') or []) if isinstance(other, dict) and other is not turn and other.get('who') in names
                                                       and not names[other['who']]['_pet'] and any(isinstance(item, list) and len(item) > 1 and item[1] == step[1] for item in other.get('do') or [])), None)}
                                     if step[0] == RESTRAIN and isinstance(entry, dict) else {})})
            # HAI NGƯỜI (đợt 38 C): moments.json đo tay gặp tay, tay ôm qua người kia, tay trên vai, miệng sát tai, túi sang tay.
            if isinstance(step, list) and len(step) > 1 and step[0] in PAIR_PARTNER and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names:
                gear_ops.append({'turn': emitted[0], 'kind': 'pair', 'name': step[0], 'who': turn.get('who'), 'target': step[1][1:]})
            # ĐẶT XUỐNG (đợt 30): con vật nào, ai đặt — người nhận đặt xuống thì nó trượt về chỗ được bế lần đầu.
            if isinstance(step, list) and len(step) > 1 and step[0] == 'carry' and isinstance(step[1], str): holding[turn.get('who')] = step[1][1:]
            # CÂN (đợt 35): con vật đứng trên bệ cân lúc đọc số; tay tới nó lúc bế lên.
            if isinstance(step, list) and len(step) > 2 and step[0] == 'weigh' and isinstance(step[1], str) and step[1].startswith('@'):
                scale_item = next((item for item in (stage_set or {}).get('cutouts', []) if item.get('kind') == 'scale' and item.get('name') == step[2]), {})
                options_ = step[3] if len(step) > 3 and isinstance(step[3], dict) else {}
                gear_ops.append({'turn': emitted[0], 'kind': 'weigh', 'who': turn.get('who'), 'target': step[1][1:], 'scale': step[2], 'hold': options_.get('hold', 1.6),
                                 'reading': options_.get('reading', scale_item.get('reading')) or '4.2 kg'})
            if isinstance(step, list) and len(step) > 1 and step[0] == 'handOverPet' and isinstance(step[1], str) and turn.get('who') in holding: holding[step[1][1:]] = holding.pop(turn.get('who'))
            # ĐỘNG TÁC TAY của người (đợt 33): moments.json đo bàn tay trong khung ở lúc được hỏi.
            name = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
            if name in GESTURES and name not in PRESENTER_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:      # đợt 39 C: bốn động tác người dẫn đo riêng (`talk39`)
                gear_ops.append({'turn': emitted[0], 'kind': 'gesture', 'name': name, 'who': turn.get('who'), 'target': None})
            # NGƯỜI DẪN (đợt 39 C): giơ bảng, ra dấu kích thước, tự sướng, ngáp vươn vai — acting_check đo bảng / khe hai tay / điện thoại / tay qua đầu.
            if name in PRESENTER_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:
                args_ = step[1:] if isinstance(step, list) else []
                gear_ops.append({'turn': emitted[0], 'kind': 'talk39', 'name': name, 'who': turn.get('who'), 'target': None,
                                 'hold': next((a for a in args_[1:2] if isinstance(a, (int, float))), None) if name in ('holdSign', 'showSize') else next((a for a in args_[:1] if isinstance(a, (int, float))), None),
                                 'size': (args_[0] if args_ else 'medium') if name == 'showSize' else None,
                                 'text': (' / '.join(args_[0]) if isinstance(args_[0], list) else str(args_[0]).replace('|', ' / ')) if name == 'holdSign' and args_ else None,
                                 'with': next((a['with'][1:] for a in args_[1:2] if isinstance(a, dict) and isinstance(a.get('with'), str)), None) if name == 'takeSelfie' else None})
            # ĐỢT 42 E — SÁT SÀN: ngồi bệt, nằm, nhặt đồ — acting_check đo mông / thân trên mặt sàn, tay tới món đồ, món đồ trong tay (`floor42e`).
            if name in FLOOR_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:
                args_ = step[1:] if isinstance(step, list) else []
                gear_ops.append({'turn': emitted[0], 'kind': 'floor42e', 'name': name, 'who': turn.get('who'), 'target': args_[0][1:] if args_ and isinstance(args_[0], str) and args_[0].startswith('@') else None,
                                 'sofa': name == 'lieDown' and bool(args_) and args_[0] == 'sofa', 'sleep': name == 'lieDown' and len(args_) > 1 and isinstance(args_[1], dict) and bool(args_[1].get('sleep')),
                                 'item': next((a.get('item') for a in args_ if isinstance(a, dict) and a.get('item')), 'toy') if name == 'pickUp' else None})
            # RỬA TAY, ĐEO / THÁO GĂNG (đợt 38 B): bọt quanh hai tay lúc xoa, găng hiện / mất đúng lúc tay kia kéo nó (acting_check `prep`).
            if name in PREP_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:
                gear_ops.append({'turn': emitted[0], 'kind': 'prep', 'name': name, 'who': turn.get('who'), 'target': None,
                                 'hold': float(step[1]) if name == 'washHands' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], (int, float)) else 2.0})
            # ĐỢT 39 A: quầy thu ngân / cà phê một mình — moments.json đo tick / dấu đỏ / dòng nước / khăn (acting_check `desk39`).
            if name in DESK_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet'] and not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')):
                nums = [item for item in (step[1:] if isinstance(step, list) else []) if isinstance(item, (int, float)) and not isinstance(item, bool)]
                gear_ops.append({'turn': emitted[0], 'kind': 'desk39', 'name': name, 'who': turn.get('who'), 'target': None, 'hold': float(nums[-1]) if nums else None})
            # ĐỌC BỆNH ÁN / CHỈ PHIM (đợt 35): bìa hồ sơ trước ngực, trong khung; tay chỉ trúng điểm trên phim (acting_check).
            if name in CHART_ACTIONS and turn.get('who') in names and not names[turn['who']]['_pet']:
                gear_ops.append({'turn': emitted[0], 'kind': name, 'name': name, 'who': turn.get('who'), 'target': step[1] if name == 'showXray' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) else None,
                                 'hold': float(step[1]) if name == 'readChart' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], (int, float)) else 2.0,
                                 'listener': showxray_listener(st, turn.get('who')) if stage_set is not None else None})
            # ĐỘNG TÁC THÚ (đợt 35): moments.json đo con vật lúc làm — trong khung, chân / lưng trên sàn, nấp, liếm.
            if name in PET_ACTS and turn.get('who') in names and names[turn['who']]['_pet']:
                aim = step[1][1:] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None
                gear_ops.append({'turn': emitted[0], 'kind': 'petAct', 'name': name, 'who': turn.get('who'), 'target': aim, 'carried': bool(aim and arms.get(aim) == turn.get('who')) or (name == 'struggle' and turn.get('who') in arms.values())})      # đợt 40 C: struggle trong tay người bế
                if name == 'hide' and aim in names and stage_set is not None and float(names[aim].get('z', -300)) - float(names[turn['who']].get('z', -300)) < 60:
                    reach_notes.append(f'{where}: "{turn["who"]}" hides behind "{aim}", but stands at z {float(names[turn["who"]].get("z", -300)):g}, less than 60 further than "{aim}" (z {float(names[aim].get("z", -300)):g}) — it is drawn in front, or seems to run through the legs; give it a z 60–120 smaller')
            if step == 'putDown' and turn.get('who') in holding: gear_ops.append({'turn': emitted[0], 'kind': 'putDown', 'who': turn.get('who'), 'target': holding.pop(turn.get('who'))})
            if isinstance(step, list) and len(step) > 2 and step[0] == 'walk' and isinstance(step[1], (int, float)):
                # Bước `walk` tường minh: ghi lại chỗ đứng mới — không thì lượt "lại gần để vuốt ve" sau đó tính từ chỗ cũ, người
                # đứng cách con vật cả khung hình (đợt 28: tay cách con chó 29 % chiều cao người).
                mover = names.get(turn.get('who'))
                if mover and isinstance(step[2], (int, float)): mover['x'] = float(mover['x']) + float(step[2]) * mover['_unit']
                gear_ops.append({'turn': emitted[0], 'kind': 'walk', 'who': turn.get('who'), 'target': None, 'dur': float(step[1])})
            # ĐỢT 42 D: chạy / nhảy / múa — chạy dời chỗ đứng (như `walk`); `["run", "@tên"]` thành quãng tới đứng cạnh người / con vật ấy.
            motion = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
            if motion in WHOLE_BODY and turn.get('who') in names and not names[turn['who']]['_pet']:
                mover, aim = names[turn['who']], None
                if motion == 'run' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], str):
                    aim = step[1][1:] if step[1].startswith('@') else None
                    if aim not in names or aim == turn['who']: fail(f'{where}: ["run", "@<name>"] runs up to another character or pet of the scene — got {js(step)}')
                    other = names[aim]
                    ox = float(other['x']) + other.get('_drop', 0)
                    side = 1 if ox >= float(mover['x']) else -1
                    half = 0.12 * other['_host_height'] if other['_pet'] else 0.1 * other['_host_height']        # nửa bề ngang thân nó, chừng
                    goal = ox - side * (half + RUN_GAP * 0.5 * mover['_host_height'])
                    step[1] = round((goal - float(mover['x'])) / mover['_unit'])
                    RUN_TO[id(step)] = aim
                if motion == 'run' and isinstance(step, list) and len(step) > 1 and isinstance(step[1], (int, float)) and not isinstance(step[1], bool):
                    mover['x'] = float(mover['x']) + float(step[1]) * mover['_unit']
                gear_ops.append({'turn': emitted[0], 'kind': 'motion42d', 'name': motion, 'who': turn.get('who'), 'target': aim})
            if isinstance(step, list) and step and step[0] in ('shine', 'examine'):
                target = step[1][1:] if len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None
                gear_ops.append({'turn': emitted[0], 'kind': step[0], 'who': turn.get('who'), 'target': target})
