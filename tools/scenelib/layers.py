"""Phases 5 and 6 of a build: props, then the page layers (background or 3D set, hosts, panels, captions, music)."""
import json, os, re, shutil
from .assets import PRESETS, _svg, copy_asset, image_size
from .camera import YAW_LIMIT
from .schema import FLOOR_KINDS, PROP_KEYS, SCREEN_KINDS
from .sets import ROOM_DEFAULTS
from .util import PERSON, fail, html_text, js, known


def place_props(st):
    """Camera notes of a 3D set, the 2D props and the notes about seated people hidden by them."""
    names, pace_notes, person_default, reach_notes = st.take('names', 'pace_notes', 'person_default', 'reach_notes')
    scene, stage_set, views = st.take('scene', 'stage_set', 'views')
    camera_notes = []
    # Máy quay vòng tới đâu thì người nhìn sang ngang được tới đó, không xa hơn: rig xoay tới nghiêng hẳn là hết (không
    # có mặt sau). Báo những góc máy làm một nhân vật đang nhìn người kia bị đẩy quá dáng nghiêng.
    if stage_set is not None:
        yaw = float(stage_set.get('camera', {}).get('yaw', 0))
        for view in views:
            yaw = float(view['values'].get('yaw', yaw))
            for who in names.values():
                if who['_pet'] or not who.get('faces'): continue
                toward = -0.55 if float(names[who['faces']]['x']) < float(who['x']) else 0.55
                if abs(toward - yaw / 90) > 1.0 + 1e-6:
                    low, high = max(-YAW_LIMIT, round(90 * (toward - 1))), min(YAW_LIMIT, round(90 * (toward + 1)))
                    camera_notes.append(f'{view["where"]}: with the camera at yaw {yaw:g}°, "{who["name"]}" (facing {who["faces"]}) would have to turn past full profile — it stops at profile. Keep yaw between {low} and {high}° for this shot, or cut to the other side')

    # ── đạo cụ ──
    props = []
    for index, prop in enumerate(scene.get('props', [])):
        if not isinstance(prop, dict) or prop.get('kind') not in ('chair', 'stool', 'table', 'counter', 'paystand') + FLOOR_KINDS or 'x' not in prop: fail(f'props[{index}] needs "kind" (chair, stool, table, counter, bowl, scale, carrier, tree, lamp, scooter) and "x"')
        if 'facing' in prop and (prop['kind'] != 'scooter' or prop['facing'] not in ('right', 'left')): fail(f'props[{index}].facing must be "right" or "left" (scooter only)')
        if 'fill' in prop and (prop['kind'] != 'bowl' or prop['fill'] not in ('food', 'water', 'empty')): fail(f'props[{index}].fill must be "food", "water" or "empty" (bowl only)')
        if 'reading' in prop and (prop['kind'] != 'scale' or not isinstance(prop['reading'], str)): fail(f'props[{index}].reading is the text on a scale\'s display, such as "4.2 kg" (scale only)')
        known(f'props[{index}]', prop, PROP_KEYS)
        host_height = float(prop.get('height', person_default))
        props.append({'element': f'prop-{index + 1}-{prop["kind"]}', 'kind': prop['kind'], 'left': float(prop['x']) - host_height * PERSON[0] / PERSON[1] / 2, 'host_height': host_height,
                      'front': bool(prop.get('front')), 'options': {key: prop[key] for key in ('color', 'width', 'tabletop', 'back', 'fill', 'reading', 'door', 'facing') if key in prop}})
    for who in names.values():                              # ghế của người ngồi: cùng chỗ, cùng cỡ với người ấy
        if who.get('seated') in ('chair', 'stool'):
            who['_seat'] = {'element': f'{who["_element"]}-{who["seated"]}', 'kind': who['seated'], 'left': who['_left'] + (who['_walk'] * who['_unit']), 'host_height': who['_host_height']}

    # ── người NGỒI sau một đạo cụ "front" cao quá ngực thì chỉ còn thấy cái đầu: báo trước ──
    notes = list(camera_notes) + reach_notes + pace_notes
    for prop in props:
        if not prop['front'] or prop['kind'] not in ('counter', 'table'): continue
        unit = prop['host_height'] / PERSON[1]
        top = (12 + float(prop['options'].get('tabletop', 150))) * unit                                   # mặt quầy cao bao nhiêu px so với sàn
        centre = prop['left'] + prop['host_height'] * PERSON[0] / PERSON[1] / 2
        half = float(prop['options'].get('width', 300 if prop['kind'] == 'counter' else 230)) * unit / 2
        for who in names.values():
            if who['_pet'] or not who.get('seated') or abs(float(who['x']) - centre) > half: continue
            if top > 0.33 * who['_host_height']:
                fits = max(40, round(0.28 * who['_host_height'] / unit - 12))
                notes.append(f'"{who["name"]}" sits behind the {prop["kind"]} at x {centre:.0f}, which is taller than their chest — only the head will show. Lower it with "tabletop": {fits} (now {prop["options"].get("tabletop", 150)}), or let them stand.')

    # Con vật đứng TRONG bề ngang của bàn / quầy: nó nằm dưới gầm bàn, chân bàn (hoặc cả cái quầy) che mất một phần.
    for prop in props:
        if prop['kind'] not in ('counter', 'table'): continue
        unit = prop['host_height'] / PERSON[1]
        centre = prop['left'] + prop['host_height'] * PERSON[0] / PERSON[1] / 2
        half = float(prop['options'].get('width', 300 if prop['kind'] == 'counter' else 230)) * unit / 2
        for who in names.values():
            if not who['_pet']: continue
            body = 0.3 * who['_host_height']                                                               # nửa bề ngang thân con vật
            if abs(float(who['x']) - centre) >= half + body: continue
            side = 'left' if float(who['x']) < centre else 'right'
            clear = round(centre - half - body - 20) if side == 'left' else round(centre + half + body + 20)
            notes.append(f'"{who["name"]}" stands at x {float(who["x"]):.0f}, inside the {prop["kind"]} (x {centre - half:.0f}–{centre + half:.0f}) — the {prop["kind"]} will overlap it. Move it to x {clear} or further {side}.')
    st.keep(notes=notes, props=props)


def build_layers(st):
    """Page layers: background / 3D set, props, hosts, split halves, presenter panel, captions, music."""
    lamp_names = start = None                               # bối cảnh 3D: tên các đèn, góc máy đầu cảnh (đặt ở dưới)
    base, copied, drives, height, lamp_ops, layout = st.take('base', 'copied', 'drives', 'height', 'lamp_ops', 'layout')
    names, notes, out, person_default, props, scene = st.take('names', 'notes', 'out', 'person_default', 'props', 'scene')
    script, shows, sky_ops, stage_set, voices, width = st.take('script', 'shows', 'sky_ops', 'stage_set', 'voices', 'width')
    preset = scene.get('background', {}).get('preset')
    if preset is not None and preset not in PRESETS: fail(f'background.preset must be one of {", ".join(PRESETS)} — got {js(preset)}')
    if preset and scene.get('background', {}).get('image'): fail('background: give "preset" or "image", not both')
    background = dict({'wall': '#1f4a5c', 'wallDark': '#0c1c26', 'floor': '#0f2a38', 'floorHeight': round(height * (0.176 if width >= height else 0.26 if scene.get('layout') == 'presenter' else 0.34))}, **scene.get('background', {}))        # khung dọc: nền đứng cao hơn, vì phần đáy bị giao diện ứng dụng che
    ground = round(background['floorHeight'] * 0.5)         # bàn chân đứng ở giữa dải sàn
    layers, style, body, setup = [], [], [], []
    track = [0]

    def clip(element, css, tag='div', extra=''):
        style.append(f'  #{element} {{ {css} }}')
        body.append(f'  <{tag} id="{element}" class="clip" data-start="0" data-duration="__TOTAL__" data-track-index="{track[0]}"{extra}></{tag}>')
        track[0] += 1

    # Nền: một ẢNH phủ kín khung (thì không vẽ dải sàn đè lên, trừ khi kịch bản khai màu sàn), hoặc tường + sàn màu trơn.
    picture = scene.get('background', {}).get('image')
    if stage_set is not None:
        # BỐI CẢNH 3D: một clip `view` phủ kín khung; phòng, đồ vật và host của nhân vật do `createSet` dựng bên trong nó.
        clip('view', f'position: absolute; inset: 0; background: {stage_set.get("sky", "linear-gradient(#cfe3ea, #e9f1f3)")};')
        room = dict(ROOM_DEFAULTS, **stage_set.get('room', {}))
        half, front, back = room['width'] / 2, room['front'], room['front'] - room['depth']
        floor = (f"conic-gradient({room['floor']} 25%, {room['floor2']} 0 50%, {room['floor']} 0 75%, {room['floor2']} 0) 0 0 / {room['tile']}px {room['tile']}px"
                 if room.get('tile') and room.get('floor2') else room['floor'])
        # Khung DỌC: hẹp ngang, nên máy quay vào gần hơn (người cao ~45% khung) và điểm ngắm hạ xuống 62% chiều cao — phụ
        # đề nằm ở mép trên vùng an toàn, phía trên đầu nhân vật.
        portrait = width < height
        start = dict({'yaw': 0, 'pitch': 6, 'distance': 1300 if portrait else 1750, 'x': 0, 'y': round(room['height'] * 0.43), 'z': round((front + back) / 2 + room['depth'] * 0.08)}, **stage_set.get('camera', {}))
        origin = f", origin: {js(stage_set['origin'])}" if stage_set.get('origin') else (f", origin: [{width // 2}, {round(height * 0.62)}]" if portrait else '')
        setup.append(f"    // The 3D set: a room of flat planes; the characters stay 2D and always face the lens (references/hyperframes.md, \"3D sets\").")
        setup.append(f"    const set = VGCharacter.createSet($('view'), {{ camera: {js(start)}{origin} }});")
        setup.append("    window.__set = set;                                   // tools/acting_check.py đo diễn xuất qua set.actingProbe()")
        # Sàn kéo dài thêm 1500 đơn vị về phía máy quay (ra ngoài mép trước của phòng): ở cảnh toàn, nhất là khung dọc, máy
        # quay lùi xa và nhìn thấy cả khoảng trước phòng — không có sàn ở đó là một dải trống dưới đáy khung.
        setup.append(f"    set.floor({{ x: [{-half:g}, {half:g}], z: [{back:g}, {front + 1500:g}], style: {js('background:' + floor)} }});")
        setup.append(f"    set.wall({{ from: [{-half:g}, {back:g}], to: [{half:g}, {back:g}], height: {room['height']:g}, style: {js('background:' + room['wall'])} }});")
        setup.append(f"    set.wall({{ from: [{-half:g}, {front:g}], to: [{-half:g}, {back:g}], height: {room['height']:g}, style: {js('background:' + room['sideWall'])} }});")
        setup.append(f"    set.wall({{ from: [{half:g}, {back:g}], to: [{half:g}, {front:g}], height: {room['height']:g}, style: {js('background:' + room['sideWall'])} }});")
        windows = []                                        # ô cửa trên tường sau — hắt nắng (set.light)
        for item in stage_set.get('panels', []):
            side = item.get('wall', 'back')
            look = f"background:{item.get('color', '#9fd0e6')};border:{item.get('border', '12px solid #f4f7f8')};box-sizing:border-box"
            # Cửa sổ: ô kính SÁNG (nguồn của vệt nắng) — sáng hơn tường, quầng sáng tràn ra mép.
            if item.get('window'): look += ";box-shadow:0 0 60px 10px rgba(255,250,232,.55), inset 0 0 40px rgba(255,255,255,.7)"
            if item.get('image'):
                # Ảnh trên tấm (màn hình TV, poster, phim X-quang, biển tên): lấp đầy tấm, cắt phần thừa.
                name = copy_asset(base, out, item['image'], copied)
                look += f";background-image:url('{name}');background-size:cover;background-position:center"
            at, turn = (([item['at'], item['y'], back + 1], 0) if side == 'back' else ([-half + 1, item['y'], item['at']], 90) if side == 'left' else ([half - 1, item['y'], item['at'] - item['width']], -90))
            if item.get('window'):
                if side != 'back': fail('set.panels: "window": true works on the back wall (the sunlight falls into the room toward the camera)')
                windows.append({'x': item['at'], 'y': item['y'], 'width': item['width'], 'height': item['height'], 'z': back + 1})
            setup.append(f"    set.panel({{ at: {js(at)}, size: [{item['width']:g}, {item['height']:g}], turn: {turn}, style: {js(look)} }});")
        for n, item in enumerate(stage_set.get('boxes', [])):
            colour = item.get('color', '#8fb3bf')
            tone = {'top': item.get('top', '#f1f4f5'), 'front': colour, 'side': item.get('side', colour)}
            numbers = ', '.join(f"{key}: {item[key]:g}" for key in ('x', 'z', 'width', 'depth', 'height', 'y') if key in item)
            setup.append(f"    const box{n + 1} = set.box({{ {numbers}, colors: {js(tone)}" + (f", name: {js(item['name'])}" if item.get('name') else '') + " });")
        riders = {who['rides']: who for who in names.values() if who.get('rides')}
        for n, item in enumerate(stage_set.get('cutouts', [])):
            # Tấm hình phẳng đứng trong phòng (đạo cụ vẽ sẵn hay ảnh) — đặt sát máy quay là có tiền cảnh.
            # Máy tính vẽ trong CÙNG khung với người (400 × 470): mặc định cao bằng người, để nó cùng tỉ lệ với nhân vật.
            tall = float(item.get('height', round(person_default * (1 if item.get('kind') in SCREEN_KINDS + FLOOR_KINDS else 0.74))))
            rider = riders.get(item.get('name')) if item.get('kind') == 'scooter' else None
            if item.get('kind') == 'scooter' and 'height' not in item:
                # Xe máy vẽ trong khung người: cùng chiều cao host với người lái (cùng đơn vị), không có người lái thì bằng
                # người mặc định của bối cảnh 3D.
                tall = rider['_host_height'] if rider else round(person_default * 0.74)
            if item.get('drive'):
                item['drive'] = dict({'dur': 3, 'ease': 'power2.out'}, **item['drive'])
                item['_n'], item['_tall'] = n + 1, tall
                if item.get('kind') == 'scooter' and 'facing' not in item: item['facing'] = 'right' if item['drive']['from'] < item['x'] else 'left'
                drives.append(item)
            if rider: rider['_scooter'] = dict(item, _n=n + 1, _tall=tall)
            start_x = dict(item, x=item['drive']['from']) if item.get('drive') else item
            where_ = ', '.join(f"{key}: {float(start_x[key]):g}" for key in ('x', 'z', 'y') if key in item) + f", height: {tall:g}" + (", shadow: false" if item.get('shadow') is False else '')
            spot = f"const cutout{n + 1}Spot = " if item.get('drive') or rider else ''
            if item.get('kind'):
                options = {'color': item.get('color')}
                if item['kind'] == 'paystand': options['on'] = 0            # đợt 39 A: đứng trên mặt quầy (`y` của cutout), không trên sàn khung
                if item['kind'] in SCREEN_KINDS:
                    # Đứng trên mặt hộp (`y`) hay trên sàn: đạo cụ tự đặt ở sàn khung của nó (on: 0), cutout lo phần nâng.
                    options['on'] = 0
                    if item.get('facing'): options['facing'] = item['facing']
                    if item.get('screen'):
                        name = copy_asset(base, out, item['screen'], copied)
                        options['image'] = name
                for key in ('fill', 'reading', 'door', 'spot'):
                    if key in item: options[key] = item[key]
                # Cân có người cân con vật trên nó: số 0 cho tới lúc con vật đứng lên (rig `weigh` ghi số — đợt 35, lượt ba).
                if item.get('_weighed'): options['reading'] = re.sub(r'\d+(?:([.,])\d+)?', lambda m: '0' + m.group(1) + '0' if m.group(1) else '0', str(item['_weighed']), count=1)
                if item['kind'] == 'xray' and item.get('screen'): options['image'] = copy_asset(base, out, item['screen'], copied)
                if item['kind'] == 'scooter' and item.get('facing'): options['facing'] = item['facing']
                options = {key: value for key, value in options.items() if value is not None}
                look = f", {js(options)}" if options else ''
                setup.append(f"    const cutout{n + 1} = document.createElement('div'), cutout{n + 1}Prop = VGCharacter.createProp(cutout{n + 1}, {js(item['kind'])}{look}); {spot}set.stand(cutout{n + 1}, {{ {where_} }});" + (f"          // {item['name']}" if item.get('name') else ''))
            else:
                name = copy_asset(base, out, item['image'], copied)
                # Kích thước ảnh ghi sẵn: set.stand đo phần tử để căn giữa và đặt chân — ảnh chưa tải xong thì rộng 0, nên khung
                # hình chụp lúc ấy lệch nửa bề ngang (trình render chụp ngay, không đợi khung sau).
                size = image_size(os.path.join(out, name))
                dims = f" cutout{n + 1}.width = {size[0]}; cutout{n + 1}.height = {size[1]};" if size else ''
                if not size: notes.append(f'set.cutouts[{n}]: could not read the size of {name} — give it a PNG, JPEG, GIF, WebP or an SVG with width / height or a viewBox, or it may be placed off by half its width until it loads')
                setup.append(f"    const cutout{n + 1} = document.createElement('img'); cutout{n + 1}.src = {js(name)}; cutout{n + 1}.alt = '';{dims} {spot}set.stand(cutout{n + 1}, {{ {where_} }});")
        # ÁNH SÁNG: giờ trong ngày + đèn. Cây đèn đường / đèn cây có trong bối cảnh (cutout "lamp") tự là một nguồn sáng ở
        # chỗ bóng đèn của nó (554 / 470 chiều cao khung); "lamps" thêm đèn tuỳ ý (đèn trần: "kind": "ceiling").
        lamps = [dict(item) for item in stage_set.get('lamps', [])]
        for n, item in enumerate(stage_set.get('cutouts', [])):
            if item.get('kind') not in ('lamp', 'floorlamp'): continue
            tall = float(item.get('height', round(person_default * 1)))
            # Bóng đèn: đèn đường ở 554 / 470 chiều cao khung, đèn cây (trong chụp) ở 340 / 470.
            bulb = 554 if item['kind'] == 'lamp' else 340
            lamps.append(dict({'name': item.get('name', f'cutout{n + 1}'), 'x': item['x'], 'z': float(item['z']) + 1, 'y': round(float(item.get('y', 0)) + tall * bulb / 470), 'power': 0.9},
                              **({'on': item['on']} if 'on' in item else {})))
        # Đèn mà kịch bản BẬT ở một lượt (và chưa ghi "on") thì lúc đầu tắt — đèn sáng sẵn rồi lượt "bật đèn" làm nó tắt
        # phụt rồi sáng lại. Đèn bị TẮT ở một lượt thì lúc đầu sáng.
        for n, lamp in enumerate(lamps):
            name = lamp.get('name', f'lamp{n + 1}')
            first = next((op for op in lamp_ops if (op['name'] if op['name'] is not None else (lamps[0].get('name', 'lamp1'))) == name), None)
            if first and 'on' not in lamp: lamp['on'] = not first['on']
        # TRỜI TỐI DẦN trong cảnh (`sky`): lúc đầu còn nắng thì đèn chưa bật — trời tối được hơn nửa, set.shift tự bật chúng
        # (Gemini đợt 21: đèn cây sáng trưng giữa nắng chiều làm mất cảm giác chạng vạng).
        if any(op['to'] == 'night' for op in sky_ops) and stage_set.get('light', 'day') != 'night':
            for lamp in lamps:
                if 'on' not in lamp and lamp.get('kind') != 'screen': lamp['on'] = False
        # MÀN HÌNH (laptop, máy tính) lúc chiều / tối: một nguồn sáng xanh nhạt ở mặt màn hình (không có quầng bóng đèn).
        if stage_set.get('light', 'day') != 'day':
            for n, item in enumerate(stage_set.get('cutouts', [])):
                if item.get('kind') not in SCREEN_KINDS + ('tv',): continue
                tall = float(item.get('height', round(person_default * 1)))
                # TV to hơn màn hình laptop: sáng xa hơn (tới sofa bên kia phòng), nhấp nháy đổi màu theo "cảnh" đang chiếu.
                tv = item['kind'] == 'tv'
                lamps.append({'name': f'screen{n + 1}', 'kind': 'screen', 'x': item['x'], 'z': float(item['z']) + 30, 'y': round(float(item.get('y', 0)) + tall * (0.25 if tv else 0.3)), 'color': '#a8d8ff', 'power': 0.9 if tv else 0.5, 'range': 1300 if tv else 420, 'on': True})
        light = {'mood': stage_set.get('light', 'day')}
        if room.get('gloss'): light['gloss'] = True
        if room.get('skyline'): light['skyline'] = float(room['skyline'])
        if stage_set.get('shading') is False: light['shading'] = False        # không đổ bóng trên thân nhân vật: render nhanh hơn
        if stage_set.get('lens') is False: light['lens'] = False              # không chỉnh màu / tối góc / hạt phim
        if stage_set.get('grain') is False: light['grain'] = False            # bỏ riêng hạt phim (~20 % thời gian render): bản nháp
        if lamps: light['lamps'] = lamps
        if windows: light['windows'] = windows
        lamp_names = [lamp.get('name', f'lamp{n + 1}') for n, lamp in enumerate(lamps)]
        setup.append(f"    // Light: time of day, lamps (glow, pools of light, long shadows), sunlight through the windows.\n    set.light({js(light)});")
    elif layout == 'split':
        # MÀN HÌNH CHIA ĐÔI: mỗi nửa một nền riêng (`sides.left` / `sides.right`: màu tường, sàn, hoặc một phông dựng sẵn).
        sides = scene.get('sides', {})
        if not isinstance(sides, dict) or set(sides) - {'left', 'right'}: fail('"sides" is { "left": { … }, "right": { … } }')
        for side in ('left', 'right'):
            look = sides.get(side, {})
            if not isinstance(look, dict) or set(look) - {'wall', 'wallDark', 'floor', 'preset'}: fail(f'sides.{side} takes "wall", "wallDark", "floor" or "preset" — got {js(look)}')
            if look.get('preset') and look['preset'] not in PRESETS: fail(f'sides.{side}.preset must be one of {", ".join(PRESETS)}')
            left = '0' if side == 'left' else '50%'
            if look.get('preset'):
                art = PRESETS[look['preset']]
                clip(f'wall-{side}', f'position: absolute; left: {left}; top: 0; width: 50%; height: 100%; background: {art["wallDark"]} url("{_svg(" ".join(art["svg"].split()))}") center bottom / cover no-repeat;')
                floor_colour = look.get('floor', art['floor'])
            else:
                wall, dark = look.get('wall', '#1f4a5c' if side == 'left' else '#5c3b1f'), look.get('wallDark', '#0c1c26' if side == 'left' else '#26170c')
                clip(f'wall-{side}', f'position: absolute; left: {left}; top: 0; width: 50%; height: 100%; background: linear-gradient(165deg, {wall} 0%, {dark} 72%);')
                floor_colour = look.get('floor', '#0f2a38' if side == 'left' else '#38220f')
            clip(f'floor-{side}', f'position: absolute; left: {left}; bottom: 0; width: 50%; height: {background["floorHeight"]}px; background: {floor_colour};')
            layers.append(f'#wall-{side}'); layers.append(f'#floor-{side}')
        picture = None
    elif picture:
        source = os.path.join(base, picture)
        if not os.path.isfile(source): fail(f'background.image not found: {picture} (looked in {base})')
        if os.path.abspath(source) != os.path.abspath(os.path.join(out, os.path.basename(picture))): shutil.copy(source, os.path.join(out, os.path.basename(picture)))
        clip('wall', f'position: absolute; inset: 0; background: {background["wallDark"]} url("{os.path.basename(picture)}") center / cover no-repeat;'); layers.append('#wall')
    elif preset:
        clip('wall', f'position: absolute; inset: 0; background: {PRESETS[preset]["wallDark"]} url("{_svg(" ".join(PRESETS[preset]["svg"].split()))}") center bottom / cover no-repeat;'); layers.append('#wall')
    else:
        clip('wall', f'position: absolute; inset: 0; background: linear-gradient(165deg, {background["wall"]} 0%, {background["wallDark"]} 72%);'); layers.append('#wall')
    if preset:
        background['floor'] = scene.get('background', {}).get('floor', PRESETS[preset]['floor'])
    if stage_set is None and layout != 'split' and (not picture or 'floor' in scene.get('background', {})):
        clip('floor', f'position: absolute; left: 0; right: 0; bottom: 0; height: {background["floorHeight"]}px; background: {background["floor"]};'); layers.append('#floor')
    for prop in [item for item in props if not item['front']]:
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
    for who in names.values():
        if who.get('_seat') and stage_set is None:
            seat = who['_seat']
            clip(seat['element'], f'position: absolute; left: {seat["left"]:.0f}px; bottom: {ground}px; height: {seat["host_height"]:.0f}px;'); layers.append('#' + seat['element'])
        if stage_set is not None: continue                 # host của nhân vật do set.place tạo và đặt
        clip(who['_element'], f'position: absolute; left: {who["_left"]:.0f}px; bottom: {ground}px; height: {who["_host_height"]:.0f}px;'); layers.append('#' + who['_element'])
    for prop in [item for item in props if item['front']]:           # "front": true — vẽ SAU nhân vật, tức che phía trước họ (đứng sau quầy)
        clip(prop['element'], f'position: absolute; left: {prop["left"]:.0f}px; bottom: {ground}px; height: {prop["host_height"]:.0f}px;'); layers.append('#' + prop['element'])
    if layout == 'split':
        # Nửa KHÔNG nói tối đi một chút (lớp phủ), và một vạch trắng ngăn hai nửa — vẽ sau nhân vật nên đè lên họ.
        for side in ('left', 'right'):
            clip(f'dim-{side}', f'position: absolute; left: {"0" if side == "left" else "50%"}; top: 0; width: 50%; height: 100%; background: #000; opacity: 0; pointer-events: none;', extra=' data-layout-ignore=""')
        clip('divider', f'position: absolute; left: calc(50% - {max(3, round(width * 0.003))}px); top: 0; width: {max(6, round(width * 0.006))}px; height: 100%; background: #f4f7f8; box-shadow: 0 0 18px rgba(0, 0, 0, 0.35);', extra=' data-layout-ignore=""')
        for who in names.values():
            half = (0, width / 2) if who['side'] == 'left' else (width / 2, width)
            if who['_left'] < half[0] - 2 or who['_left'] + who['_host_width'] > half[1] + 2:
                notes.append(f'character "{who["name"]}" stands across the middle of the split frame (its host reaches past its half) — move its "x" toward the middle of the {who["side"]} half')
    # ── VÙNG NỘI DUNG của bố cục "presenter": tiêu đề, các ý, ảnh — mỗi thứ là MỘT clip phẳng (HyperFrames
    # không nhận clip lồng phần tử con), vị trí tính sẵn. Vùng nằm ở phía đối diện với nhân vật.
    landscape = width >= height
    if shows:
        people_x = sum(float(who['x']) for who in names.values()) / len(names)
        if landscape:
            panel_w, panel_x, panel_y, panel_bottom = round(width * 0.5), (round(width * 0.06) if people_x > width / 2 else round(width * 0.44)), round(height * 0.11), round(height * 0.76)
        else:
            # Khung dọc: nội dung ở trên (16%–38%), phụ đề ngay dưới nó (40%), người dẫn đứng thấp hơn — ba thứ không đè nhau.
            panel_w, panel_x, panel_y, panel_bottom = round(width * 0.8), round(width * 0.1), round(height * 0.16), round(height * 0.385)
        title_px, bullet_px = round(min(width, height) * 0.066), round(min(width, height) * 0.05)
        # Ước lượng số dòng khi chữ tự xuống hàng: một ký tự rộng chừng 0,5 cỡ chữ ở tiêu đề (đậm), 0,46 ở các ý.
        lines_of = lambda text, px: max(1, -(-len(text) * px * (0.5 if px == title_px else 0.43) // panel_w))
        # Chữ của vùng nội dung: sáng trên nền tối (tường màu trơn mặc định, ảnh nền), TỐI trên các phông dựng sẵn
        # (đều là tường sáng) — `hyperframes check` đo độ tương phản và đòi ít nhất 3:1.
        ink = 'color: #16303a;' if preset or picture else 'color: #f5f8fa; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);'
        style.append(f'  .show {{ position: absolute; left: {panel_x}px; width: {panel_w}px; margin: 0; {ink} font-family: system-ui, sans-serif; }}')
        style.append(f'  .show-title {{ font-weight: 800; font-size: {title_px}px; line-height: 1.15; }}')
        style.append(f'  .show-bullet {{ font-weight: 600; font-size: {bullet_px}px; line-height: 1.3; padding-left: 1.1em; text-indent: -1.1em; box-sizing: border-box; }}')
        style.append('  .show-image { object-fit: contain; object-position: left top; border-radius: 14px; }')
        # Trên phông dựng sẵn hoặc ảnh nền, chữ nằm trên một TẤM THẺ sáng mờ — không thì chữ đè lên tranh treo tường,
        # cửa sổ… của phông. Thẻ là một clip phẳng riêng, có mặt suốt cảnh.
        if preset or picture:
            pad = round(min(width, height) * 0.035)
            clip('panel', f'position: absolute; left: {panel_x - pad}px; top: {panel_y - pad}px; width: {panel_w + 2 * pad}px; height: {panel_bottom - panel_y + 2 * pad}px; '
                          'border-radius: 22px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);')
        for number, show in enumerate(shows):
            if show.get('clear'): continue
            later = [other['turn'] for other in shows if other['turn'] > show['turn']]
            until = str(later[0]) if later else 'end'
            y = panel_y
            def piece(tag, kind, part, content, top, extra=''):
                element = f'show-{number + 1}-{kind}'
                body.append(f'  <{tag} id="{element}" class="clip show show-{kind.rstrip("0123456789")}" style="top: {round(top)}px;{extra}" data-start="0" data-duration="1" data-track-index="{track[0]}" '
                            f'data-show-turn="{show["turn"]}" data-show-part="{part:.3f}" data-show-until="{until}"' + (f' src="{content}" alt="">' if tag == 'img' else f'>{html_text(content)}</{tag}>'))
                track[0] += 1
            if show.get('title'):
                piece('div', 'title', 0, show['title'], y)
                y += lines_of(show['title'], title_px) * title_px * 1.15 + title_px * 0.55
            bullets = show.get('bullets', [])
            for i, text in enumerate(bullets):
                piece('div', f'bullet{i + 1}', (i + (1 if show.get('title') else 0)) / (len(bullets) + (1 if show.get('title') else 0)), '• ' + text, y)
                y += lines_of('• ' + text, bullet_px) * bullet_px * 1.3 + bullet_px * 0.5
            if show.get('image'):
                name = copy_asset(base, out, show['image'], copied)
                room = max(round(height * 0.14), panel_bottom - y)
                piece('img', 'image', 0, name, y, f' height: {round(room)}px;')
                y += room
            if y > panel_bottom + 4: notes.append(f'the content shown at script turn {show["turn"]} is about {round(y - panel_bottom)}px taller than the panel — shorten it or split it over two turns')

    # Phụ đề: khung ngang thì sát đáy; khung DỌC thì nhấc lên 20% — một phần năm dưới cùng của video dọc
    # bị giao diện của TikTok / Reels / Shorts che (HyperFrames `check` gọi đó là vùng an toàn).
    captions = scene.get('captions', True) and '"say"' in json.dumps(script)        # không ai nói thì không cần phụ đề
    if captions:
        look = f'padding: 10px 30px; border-radius: 14px; box-sizing: border-box; white-space: nowrap; background: rgba(8, 12, 16, 0.78); color: #f5f8fa; font: 600 {round(min(width, height) * 0.041)}px/1.25 system-ui, sans-serif; text-align: center; opacity: 0;'
        # `data-layout-ignore`: phụ đề đi theo LỜI NÓI, mà người nói nhanh hơn tốc độ đọc mà `hyperframes check` đòi cho
        # chữ trên màn hình (0,5 s + 0,3 s mỗi từ) — khán giả nghe câu ấy chứ không chỉ đọc. Vị trí phụ đề do công cụ tính.
        # Bối cảnh 3D, khung dọc: 17 % chiều cao — trong vùng an toàn (15–65 %), dưới thanh tab của ứng dụng (~10 %) và TRÊN
        # đầu nhân vật: máy quay (set.frameOn) đặt nhân vật thấp để chừa khoảng tường cho chữ. Phụ đề ở giữa khung thì đè lên
        # mặt — đầu chibi chiếm nửa thân (Gemini soát phim dọc đợt 15).
        caption_top = round(height * (0.4 if scene.get('layout') == 'presenter' else 0.17 if stage_set is not None else 0.52))
        if width >= height:
            clip('caption', f'position: absolute; left: 50%; bottom: {round(height * 0.03)}px; transform: translateX(-50%); ' + look, extra=' data-layout-ignore=\"\"')
        else:
            # Khung DỌC: chữ phải nằm trong vùng mà giao diện TikTok / Reels / Shorts không che — theo bảng của
            # HyperFrames là từ 15% tới 65% chiều cao, và ở nửa dưới của vùng ấy thì lùi khỏi cột nút bên phải
            # (11%–72% bề ngang). Neo bằng `top` để ba dòng chữ vẫn nằm trọn trong vùng.
            # Bối cảnh 3D: HAI dòng (xuống dòng tự nhiên) — một dòng 24 chữ thì câu bị cắt thành ba bốn mảnh vụn.
            two = stage_set is not None
            clip('caption', f'position: absolute; left: {round(width * 0.115)}px; width: {round(width * 0.6)}px; top: {caption_top}px; overflow: hidden; ' + (look.replace('white-space: nowrap', 'white-space: normal') if two else look), extra=' data-layout-ignore=\"\"')
    for voice in voices:
        body.append(f'  <audio id="voice-{voice["key"].replace("_", "-")}" class="clip" src="{voice["file"]}" data-start="__START_{voice["key"]}__" data-duration="{voice["length"]:.2f}" data-track-index="{track[0]}" data-volume="1"></audio>')
        track[0] += 1

    music = scene.get('music')
    if music:
        if not os.path.isfile(os.path.join(base, music)): fail(f'music file not found: {music} (looked in {base})')
        if os.path.abspath(os.path.join(base, music)) != os.path.abspath(os.path.join(out, os.path.basename(music))): shutil.copy(os.path.join(base, music), os.path.join(out, os.path.basename(music)))
        # Nhạc nền: một clip tiếng chạy suốt cảnh, nhỏ hơn giọng nói. data-role để tools/peek.sh không coi nó là giọng thiếu người nhép.
        body.append(f'  <audio id="music" class="clip" src="{os.path.basename(music)}" data-role="music" data-start="0" data-duration="__TOTAL__" data-track-index="{track[0]}" data-volume="{float(scene.get("musicVolume", 0.15)):g}"></audio>')
        track[0] += 1
    st.keep(body=body, captions=captions, lamp_names=lamp_names, landscape=landscape, layers=layers, setup=setup, start=start, style=style,
            track=track)
