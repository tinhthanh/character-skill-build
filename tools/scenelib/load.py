"""Phase 1 of a build: read and check the scene file and its 3D set."""
import json, os, re
from .camera import check_camera
from .expand import expand_combos, narrator_split, pair_restrain
from . import cage as cage49a          # đợt 49 A
from . import feed50c          # đợt 50 C
from .schema import (BACKGROUND_KEYS, BOX_KEYS, CAMERA_KEYS, CUTOUT_KEYS, CUTOUT_KINDS, DRIVE_KEYS, LAMP_KEYS, LIGHT_MOODS, NARRATOR_KEYS,
    NARRATOR_RIG, PANEL_KEYS, ROOM_KEYS, SCREEN_KINDS, SET_KEYS, TOP_KEYS)
from .sets import SET_PRESETS
from .util import fail, js, known


def load_scene(st):
    """Read the scene file, expand combos / restrain / narrator turns, merge a set preset and check the set."""
    args = st.args
    if not os.path.isfile(args.scene): fail(f'no such file: {args.scene}')
    try:
        scene = json.load(open(args.scene, encoding='utf-8'))
    except json.JSONDecodeError as error:
        fail(f'{args.scene} is not valid JSON: {error}')
    if not isinstance(scene, dict): fail('the scene file must be a JSON object')
    if args.no_intro: scene.pop('intro', None)
    if args.no_outro: scene.pop('outro', None)
    if args.no_grain and isinstance(scene.get('set'), dict): scene['set']['grain'] = False
    known('scene', scene, TOP_KEYS)
    scene['script'] = expand_combos(scene.get('script'))
    scene['script'] = pair_restrain(scene['script'])                    # đợt 38 B: giữ con vật vừa khít phần việc người kia
    # ĐỢT 42 A — NGƯỜI DẪN KHÔNG HIỆN HÌNH: `{ "name": "loi_dan", "narrator": true, "voice": "baotrang" }` trong "characters". Chỉ nói (giọng + phụ đề),
    # không có thân trên màn hình, máy quay không bao giờ chiếu vào. Rút khỏi dàn nhân vật thật ở đây; lượt của họ đi riêng (`_narrator_turns`).
    narrators = {}
    if isinstance(scene.get('characters'), list):
        for who in scene['characters']:
            if not isinstance(who, dict) or not who.get('narrator'): continue
            known(f'narrator "{who.get("name")}"', who, NARRATOR_KEYS)
            if who['narrator'] is not True or not isinstance(who.get('name'), str) or not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', who['name']): fail(f'a narrator is {{ "name": "<identifier>", "narrator": true, "voice": "baotrang" }} — got {js(who)}')
            if who.get('voice') is not None and not isinstance(who['voice'], str): fail(f'narrator "{who["name"]}": "voice" must be a voice name (see `voice-tts voices`)')
            if who['name'] in narrators or any(c is not who and isinstance(c, dict) and c.get('name') == who['name'] for c in scene['characters']): fail(f'two characters are named "{who["name"]}"')
            narrators[who['name']] = {'name': who['name'], 'voice': who.get('voice'), '_pet': False, 'x': 0, 'id': NARRATOR_RIG}
        if narrators:
            scene['script'] = narrator_split(scene['script'], narrators)
            scene['characters'] = [c for c in scene['characters'] if not (isinstance(c, dict) and c.get('narrator'))]
    if isinstance(scene.get('background'), dict): known('background', scene['background'], BACKGROUND_KEYS)
    if isinstance(scene.get('camera'), dict): known('camera', scene['camera'], ('kind',))
    stage_set = scene.get('set')
    preset_note = None
    if stage_set is not None:
        if not isinstance(stage_set, dict): fail('"set" must be an object: { "room": {…}, "boxes": […], "camera": {…} }')
        known('set', stage_set, SET_KEYS)
        if 'preset' in stage_set:
            preset = SET_PRESETS.get(stage_set['preset'])
            if not preset: fail(f'set.preset must be one of {", ".join(SET_PRESETS)} — got {js(stage_set["preset"])}')
            # Đồ của bối cảnh dựng sẵn ĐI TRƯỚC, đồ người viết khai thêm cộng vào sau; `room` gộp từng khoá (khai thêm thì đè).
            merged = {key: value for key, value in stage_set.items() if key != 'preset'}
            for key in ('boxes', 'panels', 'cutouts', 'lamps'): merged[key] = [dict(item) for item in preset.get(key, [])] + list(stage_set.get(key, []))
            if not merged['lamps']: del merged['lamps']
            if 'room' in preset: merged['room'] = dict(preset['room'], **stage_set.get('room', {}))
            # Cách bày riêng cho KHUNG DỌC (đồ của preset, không đụng đồ người viết khai thêm).
            if int(scene.get('height', 1080)) > int(scene.get('width', 1920)) * 1.2:
                # Đồ cắt (cutouts) nhận theo `kind`, khối (boxes) theo `name`.
                for key, by in (('cutouts', 'kind'), ('boxes', 'name')):
                    for item in merged[key][:len(preset.get(key, []))]: item.update(preset.get('vertical', {}).get(key, {}).get(item.get(by), {}))
            stage_set = scene['set'] = merged
            preset_note = f'set.preset: where people stand — {preset["spots"]}'
        for key, allowed in (('room', ROOM_KEYS), ('camera', CAMERA_KEYS)):
            if key in stage_set and not isinstance(stage_set[key], dict): fail(f'set.{key} must be an object')
            known(f'set.{key}', stage_set.get(key, {}), allowed)
        if any(not isinstance(value, (int, float)) for value in stage_set.get('camera', {}).values()): fail('set.camera: every value must be a number')
        check_camera(stage_set.get('camera', {}), 'set.camera')
        for key, allowed in (('boxes', BOX_KEYS), ('panels', PANEL_KEYS), ('cutouts', CUTOUT_KEYS)):
            if not isinstance(stage_set.get(key, []), list): fail(f'set.{key} must be a list')
            for n, item in enumerate(stage_set.get(key, [])):
                if not isinstance(item, dict): fail(f'set.{key}[{n}] must be an object')
                known(f'set.{key}[{n}]', item, allowed)
        for n, item in enumerate(stage_set.get('boxes', [])):
            for key in ('x', 'z', 'width', 'depth', 'height'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.boxes[{n}] needs a number "{key}"')
        for n, item in enumerate(stage_set.get('cutouts', [])):
            if bool(item.get('kind')) == bool(item.get('image')): fail(f'set.cutouts[{n}] needs either "kind" ({", ".join(CUTOUT_KINDS)}) or "image" (a picture file)')
            if item.get('kind') and item['kind'] not in CUTOUT_KINDS: fail(f'set.cutouts[{n}].kind must be one of {", ".join(CUTOUT_KINDS)} — got {js(item["kind"])}')
            folder = os.path.dirname(os.path.abspath(args.scene))
            if item.get('image') and not os.path.isfile(os.path.join(folder, item['image'])): fail(f'set.cutouts[{n}].image not found: {item["image"]} (looked in {folder})')
            for key in ('x', 'z'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.cutouts[{n}] needs a number "{key}"')
            if 'screen' in item and item.get('kind') not in SCREEN_KINDS + ('xray',): fail(f'set.cutouts[{n}]: "screen" is for "laptop", "monitor" and "xray" (the film) only')
            if 'screen' in item and item.get('kind') == 'xray' and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['screen'])): fail(f'set.cutouts[{n}].screen not found: {item["screen"]}')
            if 'spot' in item and not (item.get('kind') == 'xray' and isinstance(item['spot'], list) and len(item['spot']) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in item['spot'])):
                fail(f'set.cutouts[{n}].spot is for an "xray" viewer: [x, y], both between 0 and 1 (a point on the film from its top left) — got {js(item["spot"])}')
            if 'facing' in item and item.get('kind') == 'scooter':
                if item['facing'] not in ('right', 'left'): fail(f'set.cutouts[{n}].facing must be "right" or "left" (the way the scooter points)')
            elif 'facing' in item and (item.get('kind') != 'laptop' or item['facing'] not in ('away', 'viewer')): fail(f'set.cutouts[{n}].facing must be "away" or "viewer" (laptop) or "right" / "left" (scooter)')
            if 'drive' in item:
                drive = item['drive']
                if not isinstance(drive, dict): fail(f'set.cutouts[{n}].drive must be {{ "from": <x>, "dur": <seconds>, "ease" }} — got {js(drive)}')
                known(f'set.cutouts[{n}].drive', drive, DRIVE_KEYS)
                if not isinstance(drive.get('from'), (int, float)): fail(f'set.cutouts[{n}].drive needs a number "from" (the x it starts at, e.g. -1300 — outside the left wall)')
                if not isinstance(drive.get('dur', 3), (int, float)) or not 0.5 <= drive.get('dur', 3) <= 12: fail(f'set.cutouts[{n}].drive.dur must be 0.5…12 seconds')
                if not isinstance(drive.get('ease', 'power2.out'), str): fail(f'set.cutouts[{n}].drive.ease must be a GSAP ease name such as "power2.out"')
                if drive['from'] == item['x']: fail(f'set.cutouts[{n}].drive.from is its own x — nothing to drive')
            if item.get('screen') and not os.path.isfile(os.path.join(folder, item['screen'])): fail(f'set.cutouts[{n}].screen not found: {item["screen"]} (looked in {folder})')
            if 'fill' in item and (item.get('kind') != 'bowl' or item['fill'] not in ('food', 'water', 'empty')): fail(f'set.cutouts[{n}].fill must be "food", "water" or "empty" (bowl only)')
            if 'on' in item and (item.get('kind') not in ('lamp', 'floorlamp') or item['on'] not in (True, False)): fail(f'set.cutouts[{n}].on is for a "lamp": true (lit) or false (off until a turn switches it on with "lamp")')
            if 'door' in item and (item.get('kind') not in ('carrier', 'cage') or item['door'] not in ('left', 'right')): fail(f'set.cutouts[{n}].door must be "left" or "right" (carrier, cage only)')      # đợt 49 A: chuồng — phía bản lề
            if 'reading' in item and (item.get('kind') != 'scale' or not isinstance(item['reading'], str)): fail(f'set.cutouts[{n}].reading is the text on a scale\'s display, such as "4.2 kg" (scale only)')
        # ÁNH SÁNG: "light" (giờ trong ngày), "lamps" (đèn), panel "window": true (cửa sổ hắt nắng).
        if stage_set.get('light', 'day') not in LIGHT_MOODS: fail(f'set.light must be one of {", ".join(LIGHT_MOODS)} — got {js(stage_set.get("light"))}')
        if not isinstance(stage_set.get('lamps', []), list): fail('set.lamps must be a list of { "x", "y", "z", "color", "power", "on", "kind", "name" }')
        for n, item in enumerate(stage_set.get('lamps', [])):
            if not isinstance(item, dict): fail(f'set.lamps[{n}] must be an object')
            known(f'set.lamps[{n}]', item, LAMP_KEYS)
            for key in ('x', 'y', 'z', 'power', 'range'):
                if key in item and not isinstance(item[key], (int, float)): fail(f'set.lamps[{n}].{key} must be a number')
            if item.get('kind', 'point') not in ('point', 'ceiling', 'screen'): fail(f'set.lamps[{n}].kind must be "point" (a lamp) or "ceiling" (a ceiling light) — got {js(item.get("kind"))}')
            if 'on' in item and item['on'] not in (True, False): fail(f'set.lamps[{n}].on must be true or false')
            if 'color' in item and not re.match(r'^#[0-9a-fA-F]{6}$', str(item['color'])): fail(f'set.lamps[{n}].color must be a colour such as "#ffd59a"')
        for n, item in enumerate(stage_set.get('panels', [])):
            if item.get('wall', 'back') not in ('back', 'left', 'right'): fail(f'set.panels[{n}].wall must be "back", "left" or "right"')
            for key in ('at', 'y', 'width', 'height'):
                if not isinstance(item.get(key), (int, float)): fail(f'set.panels[{n}] needs a number "{key}"')
            if item.get('image') and not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(args.scene)), item['image'])): fail(f'set.panels[{n}].image not found: {item["image"]}')
        # Những thứ của cảnh PHẲNG không có nghĩa trong bối cảnh 3D — báo rõ thay vì lặng lẽ bỏ qua.
        for key, why in (('props', 'use set.boxes'), ('background', 'use set.sky and set.room'), ('camera', 'put "view" on the turns instead')):
            if scene.get(key) and not (key == 'camera' and scene[key] == 'auto'): fail(f'"{key}" cannot be combined with "set" — {why}' + (' — or "camera": "auto" to let the camera choose every shot' if key == 'camera' else ''))
        if scene.get('layout', 'stage') != 'stage': fail('"layout": "presenter" cannot be combined with "set"')
    # ĐỢT 49 A — CHUỒNG: kiểm tra cutout "cage", con vật "inCage" (ở trong chuồng từ đầu), chèn lượt bế trước khi đặt vào chuồng (tools/scenelib/cage.py).
    if stage_set is not None: cage49a.check_cutouts(stage_set)
    cage49a.place_in_cage(scene, stage_set)
    cage49a.split_turns(scene)
    feed50c.prepare(scene, stage_set); feed50c.note_start(scene, stage_set)          # đợt 50 C: lồng vận chuyển hai lớp, con vật "inCarrier", lượt bế trước khi cho vào lồng
    st.keep(narrators=narrators, preset_note=preset_note, scene=scene, stage_set=stage_set)
