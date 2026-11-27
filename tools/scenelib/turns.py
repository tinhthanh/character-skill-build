"""Phase 3 of a build: the lists every turn writes into, before the script is walked."""
import os
from .camera import CAMERA_SPEED, CAMERA_START
from .util import fail, js


def prepare_turns(st):
    """State the turns are written into: arrivals, layout, sounds, the per-turn lists (shows, toasts, lamps, views…), the auto director."""
    base, names, scene, stage_set = st.take('base', 'names', 'scene', 'stage_set')
    turns = []
    # Mở đầu: ai `enter` thì bước vào (và đi tới chỗ đứng); xong thì mọi người quay về phía người mình nhìn.
    entering = [who for who in names.values() if who.get('enter')]
    arrivals = []
    for who in entering:
        steps = [f"['enter', {js(who['enter'])}, {who['_enter_distance']}]"]
        if who.get('faces'): steps.append(f"['face', {who['faces']}]")
        arrivals.append(f"[{who['name']}, " + ', '.join(steps) + ']')
    # Mọi người bước vào CÙNG LÚC: vào lần lượt thì người vào sau đứng sẵn trong khung chờ tới lượt
    # rồi mới "bước vào" — và cảnh mất thêm vài giây trước câu nói đầu tiên.
    if arrivals: turns.append(('  // ' + ', '.join(who['name'] for who in entering) + (' walk' if len(entering) > 1 else ' walks') + ' in from outside the frame to the mark',
                               '{ together: [' + ', '.join(arrivals) + '] }' if len(arrivals) > 1 else arrivals[0]))
    layout = scene.get('layout', 'stage')
    if scene.get('marks', True) not in (True, False): fail('"marks" must be true or false (false: no automatic marks over a pet\'s head for its "mood")')
    marks_on = scene.get('marks', True)
    # ÂM THANH THEO ĐỘNG TÁC: `"sounds": { "bark": "gau.wav", "cat.meow": { "file": "meo.wav", "volume": 0.8, "at": 0.1 } }` —
    # mỗi lần động tác ấy diễn (của mọi nhân vật, hay chỉ của "cat"), một đoạn tiếng đặt đúng lúc nó bắt đầu (+ "at" giây).
    sounds = scene.get('sounds', {})
    if not isinstance(sounds, dict): fail('"sounds" must be an object: { "bark": "bark.wav", "dog.bark": { "file": "…", "volume": 0.8, "at": 0.1 } }')
    for key, value in list(sounds.items()):
        spec = {'file': value} if isinstance(value, str) else value
        if not isinstance(spec, dict) or not isinstance(spec.get('file'), str) or set(spec) - {'file', 'volume', 'at'}: fail(f'sounds["{key}"] must be a file name or {{ "file": "…", "volume": 0.8, "at": 0.1 }} — got {js(value)}')
        if not os.path.isfile(os.path.join(base, spec['file'])): fail(f'sounds["{key}"]: file not found: {spec["file"]} (looked in {base})')
        if not all(isinstance(spec.get(k, 0), (int, float)) for k in ('volume', 'at')): fail(f'sounds["{key}"]: "volume" and "at" must be numbers')
        if '.' in key and key.split('.', 1)[0] not in [c.get('name') for c in scene.get('characters', [])]: fail(f'sounds["{key}"]: "{key.split(".", 1)[0]}" is not a character in the scene ("who.action", or just "action")')
        sounds[key] = spec
    sound_actions = sorted({key.split('.', 1)[-1] for key in sounds})
    if layout not in ('stage', 'presenter', 'split'): fail(f'"layout" must be "stage", "presenter" or "split", got {js(layout)}')
    if 'sides' in scene and layout != 'split': fail('"sides" (a background for each half) needs "layout": "split"')
    speakers = []                                           # màn hình chia đôi: (chỉ số lượt, nửa của người nói) — nửa kia tối đi
    # Chỉ số "phẳng" của từng lượt trong talk.turns: các lượt mở đầu (thú ngồi sẵn, bước vào, quay mặt) đứng trước kịch bản.
    flat = sum(1 for who in names.values() if who['_pet'] and who.get('seated')) + len(arrivals)
    shows = []                                              # { turn: chỉ số phẳng, title, bullets, image } hoặc { turn, clear: True }
    toasts = []                                             # { turn: chỉ số lượt trong conversation, title, text } — thẻ thông báo trên khung
    lamp_ops = []                                           # { turn, name, on, dur } — bật / tắt đèn của bối cảnh 3D
    power_ops, sky_ops = [], []                             # mất điện / có điện · trời chuyển giờ
    box_names = [box.get('name') for box in (stage_set or {}).get('boxes', [])]
    gear_ops = []                                           # đèn trong tay (rọi đèn pin, soi đèn khám) — cho moments.json
    holding = {}                                            # ai đang bế con vật nào (bế, trao) — để đo lúc `putDown` (đợt 30)
    arms = {}                                               # ai đang bế con vật nào — để `takePet` biết con vật ĐANG ở đâu (đợt 30)
    popups = []                                             # { turn, cutout: số thứ tự, title, text, hold } — thông báo trên màn hình đạo cụ 3D
    # GÓC MÁY của bối cảnh 3D: `"view"` trên một lượt đổi máy quay đúng lúc lượt ấy bắt đầu. `emitted` đếm số lượt THẬT SỰ
    # đã phát ra trong talk.turns (kể cả lượt "bước lại gần" chèn thêm), để biết lượt ấy mang chỉ số nào.
    views, emitted, reach_notes, pace_notes = [], [flat], [], []
    # Máy quay HIỆN TẠI (để tính quãng lia của mỗi "view"): góc máy đầu cảnh, cộng dồn qua từng view.
    camera_now = {key: float(value) for key, value in dict(CAMERA_START, **(stage_set.get('camera', {}) if stage_set is not None else {})).items() if key in CAMERA_SPEED}
    # ĐẠO DIỄN TỰ ĐỘNG (`"camera": "auto"`, bối cảnh 3D): mỗi mục của kịch bản là một NHỊP với góc máy mong muốn;
    # set.direct() (lúc dựng, trong trình duyệt) giữ mỗi góc ≥ 2,5 s, bỏ những lần đổi góc quá dày, lia khi chỉ đổi cỡ cảnh.
    director = stage_set is not None and scene.get('camera') == 'auto'
    beats, spoken = [], []
    if director:
        # Mở cảnh: toàn cảnh mọi người (giữ ≥ 2,5 s rồi mới vào nhịp đầu).
        beats.append({'first': 0, 'last': 0, 'subjects': [who['name'] for who in names.values()], 'size': 'full', 'lamp': True})       # toàn cảnh mở đầu: có cả cây đèn
    st.keep(arms=arms, beats=beats, box_names=box_names, camera_now=camera_now, director=director, emitted=emitted, flat=flat, gear_ops=gear_ops,
            holding=holding, lamp_ops=lamp_ops, layout=layout, marks_on=marks_on, pace_notes=pace_notes, popups=popups, power_ops=power_ops,
            reach_notes=reach_notes, shows=shows, sky_ops=sky_ops, sound_actions=sound_actions, sounds=sounds, speakers=speakers, spoken=spoken,
            toasts=toasts, turns=turns, views=views)
