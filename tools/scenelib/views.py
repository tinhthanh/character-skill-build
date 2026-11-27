"""Camera of the turns: a turn's "view" (`view_of`), the auto director's beat of an entry (`beat_of`), the hand plane of a person."""
import math
from .actions import CARE_38, DESK_39, DESK_PAY, PREP_ACTIONS
from .camera import CAMERA_SPEED, NORMAL_LENS, check_camera
from .schema import CAMERA_KEYS, VIEW_KEYS, VIEW_SIZES
from .sets import ROOM_DEFAULTS
from .util import fail, js, known

# Moods strong enough for the auto director to frame the speaker alone, close (beat_of).
STRONG = ('angry', 'crying', 'surprised', 'worried', 'sad', 'laughing', 'embarrassed')


def plane_of(st, person):
    """Chiều sâu (z) mà bàn tay người này vươn trong đó: người ngồi trên một hộp ngồi ngay trước mặt hộp (+12)."""
    box_names, stage_set = st.take('box_names', 'stage_set')
    if person.get('on') and person.get('seated') and person['on'] in box_names:
        return float(stage_set['boxes'][box_names.index(person['on'])]['z']) + 12
    return float(person.get('z', -300))


def pets_only_view_42c(st, turn, subjects, view):
    """Đợt 42 C: view có CON VẬT đang làm động tác cùng người chỉ đứng đó / nói (lời dẫn) → chỉ lấy con vật làm chủ thể (người vẫn được
    tránh mép khung): con vật ≥ 35 % khung. Có `fill` riêng, hay người cũng làm động tác (`do`) → giữ nguyên."""
    names = st.names
    if 'fill' in view or view.get('size', 'medium') == 'full' or any(name not in names for name in subjects): return subjects
    turns = turn['together'] if isinstance(turn.get('together'), list) else [turn]
    acts = {t.get('who'): bool(t.get('do')) for t in turns if isinstance(t, dict)}
    pets = [name for name in subjects if names[name].get('_pet')]
    if not pets or len(pets) == len(subjects) or not any(acts.get(name) for name in pets): return subjects
    if any(acts.get(name) for name in subjects if name not in pets): return subjects
    return pets


def view_of(st, turn, where):
    camera_now, emitted, height, names = st.take('camera_now', 'emitted', 'height', 'names')
    pace_notes, stage_set, views, width = st.take('pace_notes', 'stage_set', 'views', 'width')
    view = turn.get('view')
    if view is None: return
    if stage_set is None: fail(f'{where}: "view" moves the camera of a 3D set — add "set" at the top of the scene file')
    # GÓC MÁY TỰ ĐỘNG: `"view": "close"` (cận vào chính người / con vật của lượt, rồi trở lại góc trước ở lượt sau),
    # hay `{ "on": "dog" | ["vet", "dog"], "size": "close" | "medium" | "full", "back": true }`. Máy tính lúc dựng, trong
    # trình duyệt (set.frameOn): đo hình vẽ thật của từng nhân vật, dời để không ai bị mép khung cắt đôi.
    if isinstance(view, str):
        if view not in VIEW_SIZES: fail(f'{where}: "view" as a word must be {", ".join(VIEW_SIZES)} (a close / medium / full shot of "{turn.get("who")}") — got {js(view)}')
        view = {'on': turn.get('who'), 'size': view, 'back': True}
    if isinstance(view, dict) and 'on' in view:
        known(f'{where}.view', view, VIEW_KEYS)
        subjects = view['on'] if isinstance(view['on'], list) else [view['on']]
        subjects = pets_only_view_42c(st, turn, subjects, view)
        if not subjects or any(name not in names for name in subjects): fail(f'{where}: "view.on" must name characters in the scene — got {js(view["on"])}')
        if view.get('size', 'medium') not in VIEW_SIZES: fail(f'{where}: "view.size" must be {", ".join(VIEW_SIZES)} — got {js(view.get("size"))}')
        extra = {key: view[key] for key in ('yaw', 'pitch') if key in view}
        if any(not isinstance(value, (int, float)) for value in extra.values()): fail(f'{where}: every camera value in "view" must be a number')
        check_camera(extra, f'{where}.view')
        if 'fill' in view and not (isinstance(view['fill'], (int, float)) and 0.1 <= view['fill'] <= 0.95): fail(f'{where}: "view.fill" is the share of the frame height the subjects take, 0.1–0.95 — got {js(view["fill"])}')
        views.append({'turn': emitted[0], 'auto': {'on': subjects, 'size': view.get('size', 'medium'), 'alone': bool(view.get('alone')), 'fill': view.get('fill')}, 'values': extra, 'wide': False,
                      'cut': view.get('cut', True) is not False, 'dur': float(view.get('dur', 1.5)), 'ease': view.get('ease', 'sine.inOut'), 'where': where, 'back': bool(view.get('back'))})
        camera_now.clear(); camera_now.update({key: float(value) for key, value in extra.items()})       # giá trị thật chỉ biết lúc dựng
        return
    if not isinstance(view, dict) or not view: fail(f'{where}: "view" must be an object such as {{ "yaw": 20, "distance": 1200, "dur": 2 }}, or "close" / "medium" / "full"')
    known(f'{where}.view', view, VIEW_KEYS)
    values = {key: view[key] for key in CAMERA_KEYS if key in view}
    if any(not isinstance(value, (int, float)) for value in values.values()): fail(f'{where}: every camera value in "view" must be a number')
    if view.get('wide') not in (None, True, False): fail(f'{where}: "wide" must be true')
    if not values and not view.get('wide'): fail(f'{where}: "view" changes nothing — give at least one of {", ".join(CAMERA_KEYS)}, or "wide": true')
    check_camera(values, f'{where}.view')
    wide = bool(view.get('wide'))
    if wide:
        # TOÀN CẢNH: ống kính dài ở góc thấp (OVERVIEW của runtime), ngắm giữa phòng, zoom vừa khung. Phần nào kịch bản
        # tự cho (yaw, zoom…) thì giữ.
        room = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))
        yaw, pitch = float(values.get('yaw', 0)), float(values.get('pitch', 14))
        across = room['width'] * math.cos(math.radians(yaw)) + room['depth'] * math.sin(math.radians(abs(yaw)))
        tall = room['height'] * math.cos(math.radians(pitch)) + room['depth'] * math.sin(math.radians(pitch))
        values = dict({'yaw': yaw, 'pitch': pitch, 'lens': 5000, 'distance': 5000, 'x': 0, 'y': round(room['height'] * (0.15 if width < height else 0.4)),
                       'z': round(room['front'] - room['depth'] / 2),
                       # Khung dọc hẹp ngang: vừa cả bề ngang phòng thì nó chỉ còn một dải nhỏ giữa khung — cắt bớt hai bên.
                       'zoom': round(min(0.95 * width / across * (1.5 if width < height else 1), (0.45 if width < height else 0.82) * height / tall), 3)}, **values)
    # Rời một cảnh toàn (ống kính dài) là một lần CẮT về ống kính thường: lia từ ống kính 5000 về 1700 thì phối cảnh
    # của cả phòng co giãn trước mắt người xem (hiệu ứng "vertigo").
    leaving = bool(views) and views[-1]['wide'] and not wide
    if leaving:
        values = dict({'lens': NORMAL_LENS, 'distance': float(stage_set.get('camera', {}).get('distance', 1750)), 'zoom': float(stage_set.get('camera', {}).get('zoom', 1))}, **values)
    cut = bool(view.get('cut')) or wide or leaving
    # THỜI LƯỢNG LIA mặc định theo QUÃNG ĐƯỜNG: 1,5 s cho mọi cú lia thì cú lia dài thành cú quét — ở 30 khung/giây
    # hình dời 40+ px mỗi khung, mắt thấy giật cục dù từng khung đều đúng (cảnh thử đợt 5, giây 19). Giữ tốc độ dưới
    # các ngưỡng CAMERA_SPEED (mỗi giây), tối đa 4 s. Tự cho `dur` thì giữ nguyên, chỉ nhắc nếu quá nhanh.
    need = max([abs(float(values[key]) - float(camera_now[key])) / CAMERA_SPEED[key] for key in CAMERA_SPEED if key in values and key in camera_now] + [0])
    if 'dur' in view:
        seconds = float(view['dur'])
        if not cut and need > seconds * 1.25: pace_notes.append(f'{where}: the camera covers this move in {seconds:g} s — a pan that fast judders at 30 fps; about {min(4.0, need):.1f} s reads smoothly (or leave out "dur")')
    else: seconds = 1.5 if cut else round(min(4.0, max(1.5, need)), 2)
    camera_now.update({key: float(value) for key, value in values.items()})
    views.append({'turn': emitted[0], 'values': values, 'wide': wide, 'cut': cut,
                  'dur': seconds, 'ease': view.get('ease', 'sine.inOut'), 'where': where})


def beat_of(st, entry, first, last):
    beats, height, names, spoken, width = st.take('beats', 'height', 'names', 'spoken', 'width')
    span = {'first': first, 'last': last}
    if isinstance(entry, dict) and 'view' in entry: return dict(span, fixed=True)
    group = entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
    group = [turn for turn in group if isinstance(turn, dict) and turn.get('who') in names]
    if not group: return dict(span, fixed=True)
    if len(group) == 1 and ('power' in group[0] or 'sky' in group[0]) and not group[0].get('do'):
        # MẤT ĐIỆN, TRỜI CHUYỂN: góc toàn có cả đèn — kể cả khi người ấy đang nói: cận người nói thì không thấy căn phòng tối
        # đi (Gemini đợt 20). Trời chuyển: máy lùi chậm ra suốt lúc ấy (`drift`).
        sky = group[0].get('sky')
        drift = float(sky.get('dur', 6)) if isinstance(sky, dict) else 6.0 if sky else 0
        if group[0].get('say'): spoken.append(names[group[0]['who']]['name'])
        # Cả căn phòng đổi sáng: lấy MỌI nhân vật vào khung (con mèo trước bà bị cắt chân ở góc chỉ có bà — cảnh thử đợt 21).
        everyone = [names[group[0]['who']]['name']] + [who['name'] for who in names.values() if who['name'] != names[group[0]['who']]['name']]
        return dict(span, subjects=everyone, size='full', lamp=True, **({'drift': drift} if drift else {}), **({'speech': True} if group[0].get('say') else {}))
    talker = next((turn for turn in group if turn.get('say')), None)
    if talker:
        who = names[talker['who']]
        # NGƯỜI NGHE: (1) người nói vừa làm gì với ai ở nhịp trước (đưa thuốc cho con chó) — người ấy; (2) không thì người
        # nói gần nhất; (3) chưa ai nói thì ai vừa diễn ở nhịp trước (bác sĩ trấn an con chó vừa run sợ).
        before = next((beat for beat in reversed(beats) if beat.get('subjects')), None) if len(beats) > 1 else None
        others = [name for name in (before['subjects'] if before else []) if name != who['name']]
        listener = (others[0] if before and who['name'] in before['subjects'] and others else None) \
            or next((name for name in reversed(spoken) if name != who['name']), None) or (others[0] if others else None)
        spoken.append(who['name'])
        # Lượt `together` có lời: người nói cùng những ai diễn với họ trong lượt ấy (bác sĩ khen — con chó vẫy đuôi).
        company = [names[turn['who']]['name'] for turn in group if turn is not talker]
        # KHUNG DỌC (9:16) hẹp ngang: hai người cạnh nhau là hai hình nhỏ xíu — quay NGƯỜI NÓI một mình (góc đơn), câu
        # đáp của người kia sẽ là góc đơn của họ: kiểu "người nói / người nghe" quen thuộc của video dọc.
        if height > width * 1.2 and talker.get('mood') not in STRONG: return dict(span, subjects=[who['name']], size='medium', speech=True)
        if company: return dict(span, subjects=[who['name']] + company, size='medium', speech=True)
        if talker.get('mood') in STRONG or not listener: return dict(span, subjects=[who['name']], size='close' if talker.get('mood') in STRONG else 'medium', speech=True)
        return dict(span, subjects=[who['name'], listener], size='medium', speech=True)
    if len(group) == 1 and 'lamp' in group[0] and not group[0].get('do') and not group[0].get('say'):
        # Bật / tắt đèn: cả người lẫn cây đèn trong khung (frameOn tự lấy bóng đèn đang sáng vào) — thấy căn phòng đổi sáng.
        return dict(span, subjects=[names[group[0]['who']]['name']], size='full', lamp=True)
    if len(group) == 1:
        turn, who = group[0], names[group[0]['who']]
        if who['_pet']: return dict(span, subjects=[who['name']], size='close')
        targets = [step[1][1:] for step in turn.get('do', []) if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names]
        # Khung dọc: khám / cho thuốc / vuốt ve con vật — cận vào CON VẬT (tay người lấn vào khung). Hai người cạnh nhau
        # trong khung dọc là hai hình nhỏ: không thấy đèn khám, viên thuốc (Gemini soát phim dọc đợt 15).
        # → người + con vật ở cỡ trung, đo lúc GIỮA nhịp (đang khám, hai bên đứng sát nhau) — cận riêng con vật thì lẹm nửa
        # mặt người đứng sát nó (Gemini, đợt 18).
        if height > width * 1.2 and targets and names[targets[0]]['_pet']: return dict(span, subjects=[who['name'], names[targets[0]]['name']], size='medium', mid=True)
        # Bắt tay / đưa đồ giữa hai người: hai bàn tay gặp nhau ngang hông — cỡ trung cắt ngang đúng chỗ ấy (đợt 28).
        # Cân (đợt 35): con vật đặt lên cân dưới SÀN — góc toàn (thấy chân người, bệ cân).
        low_hands = any(isinstance(step, list) and step and step[0] in ('handshake', 'handOver', 'handOverPet', 'weigh', 'giveChange', 'stampCard') for step in turn.get('do', []))
        # Cho thuốc / đo nhiệt độ (đợt 35, lượt ba): GÓC CẬN người + con vật — viên thuốc, miệng con vật, mặt người nhìn nhiệt kế chỉ
        # vài pixel ở góc trung hai người (Gemini đọc ~1 khung / giây).
        if any(isinstance(step, list) and step and step[0] in ('givePill', 'takeTemp') + CARE_38 for step in turn.get('do', [])) and targets and names[targets[0]]['_pet']:
            return dict(span, subjects=[who['name'], names[targets[0]]['name']], size='close')
        # ĐỢT 39 A: quầy thu ngân / cà phê một mình — góc trung (tờ tiền, thẻ, con dấu, bình rót, khăn chỉ vài pixel ở góc toàn).
        if not targets and any((step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in DESK_39 for step in turn.get('do', [])):
            return dict(span, subjects=[who['name']], size='full' if any((step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in DESK_PAY + ('wipeCounter',) for step in turn.get('do', [])) else 'medium')
        # Rửa tay, đeo / tháo găng (đợt 38 B): góc trung một mình người ấy — bọt, găng ở hai bàn tay trước ngực chỉ vài pixel ở góc toàn.
        if not targets and any((step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in PREP_ACTIONS for step in turn.get('do', [])):
            return dict(span, subjects=[who['name']], size='medium')
        return dict(span, subjects=[who['name']] + [name for name in targets if name != who['name']][:1], size='full' if low_hands or not targets else 'medium')
    moods = [turn for turn in group if names[turn['who']]['_pet'] and turn.get('mood')]
    subjects = list(dict.fromkeys(names[turn['who']]['name'] for turn in group))
    return dict(span, subjects=subjects, size='medium' if not moods else 'full')
