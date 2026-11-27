"""Phases 7 and 8 of a build: host setup code, cards, the conversation lines and the camera code of the timeline."""
import os, re
from .actions import CARE_35, CARE_ACTIONS, GESTURES, MOTION_42D
from .assets import _svg, copy_asset
from .schema import CARD_KEYS
from .util import PERSON, fail, html_text, js
from .views import plane_of


def pose_characters(st):
    """Setup code of the hosts: depth in the set, start poses, items, wearables, props drawn in front."""
    base, body, copied, gear_ops, height, names = st.take('base', 'body', 'copied', 'gear_ops', 'height', 'names')
    narrators_42a, notes, out, props, setup, stage_set = st.take('narrators_42a', 'notes', 'out', 'props', 'setup', 'stage_set')
    start, style, toasts, track, width = st.take('start', 'style', 'toasts', 'track', 'width')
    # Bối cảnh 3D: host của nhân vật do createSet đặt — mang tên trong kịch bản (data-name) để `set.framing()` nhắc đúng người.
    if stage_set is not None: setup.append("    const host = (name) => { const element = document.createElement('div'); element.dataset.name = name; return element; };")
    # Con vật dưới sàn mà NHIỀU NGƯỜI ở các chiều sâu khác nhau với tới (đợt 33): [(lượt, z của người với tới)], chỉ giữ chỗ đổi.
    pet_depths = {}
    if stage_set is not None:
        for op in gear_ops:
            if op['kind'] not in ('stroke', 'examine', 'giveTreat', 'brush', 'listen', 'inject', 'carry') + CARE_35 + CARE_ACTIONS: continue
            pet, person = names.get(op.get('target') or ''), names.get(op.get('who') or '')
            if not pet or not person or not pet['_pet'] or person['_pet'] or pet.get('on'): continue
            pet_depths.setdefault(pet['name'], []).append((op['turn'], plane_of(st, person)))
        for name, hops in list(pet_depths.items()):
            # (lượt, z, lượt với tới ngay trước) — con vật dời được từ lúc lượt trước xong tới lúc lượt này bắt đầu.
            kept = [(hops[0][0], hops[0][1], None)]
            for n, (turn, z) in enumerate(hops[1:], 1):
                if abs(z - kept[-1][1]) > 5: kept.append((turn, z, hops[n - 1][0]))
            if len(kept) > 1: pet_depths[name] = kept
            else: del pet_depths[name]
    for narrator in narrators_42a.values():
        # Người dẫn (đợt 42 A): một rig có miệng để căn giờ lời + phụ đề, gắn vào một thẻ div RỜI — không `set.place`, không clip, không vào `framing()`.
        setup.append(f"    const {narrator['name']} = VGCharacter.createCharacter(document.createElement('div'), {{ id: {js(narrator['id'])} }}).rig;      // narrator: a voice, no body on screen")
    for who in names.values():
        mount = f"host({js(who['name'])})" if stage_set is not None else f"$('{who['_element']}')"
        held = {}
        for side, item in (who.get('holds') or {}).items():
            # Ảnh trên màn hình điện thoại đi theo bản dựng như mọi ảnh khác: chép vào thư mục ra, gọi bằng tên tệp.
            if isinstance(item, dict) and item.get('image'):
                name = copy_asset(base, out, item['image'], copied)
                item = dict(item, image=name)
            held[side] = item
        make = f"VGCharacter.createPet({mount}, {{ species: {js(who['species'])}" + (f", wear: {js(who['wears'])}" if who.get('wears') else '') + " })" if who['_pet'] else f"VGCharacter.createCharacter({mount}, {{ id: {js(who['id'])}" + (f", items: {js(held)}" + (f", itemsHidden: {js(who['holdsHidden'])}" if who.get('holdsHidden') else '') if who.get('holds') else '') + (f", wear: {js(who['wears'])}" if who.get('wears') else '') + " })"
        setup.append(f"    const {who['name']} = {make}.rig;")
        if stage_set is not None:
            boxes = [box.get('name') for box in stage_set.get('boxes', [])]
            lift = f", y: box{boxes.index(who['on']) + 1}.top" if who.get('on') else ''
            # NGỒI trên một hộp (ghế đá, sofa): chân CHẠM SÀN, hông ở mặt hộp — đặt chân lên mặt hộp thì người ngồi trông như
            # ngồi xổm trên ghế (cảnh thử đợt 8). Đứng trong bề sâu của hộp: mặt trước hộp che cẳng chân, đúng dáng ngồi trên nó.
            depth_z = float(who.get('z', -300))
            if who.get('on') and who.get('seated') and not who['_pet']:
                box = stage_set['boxes'][boxes.index(who['on'])]
                lift = ''
                # Ngồi NGAY TRƯỚC mặt trước của hộp: đầu gối, cẳng chân hiện ra trước ghế; người lùi vào trong bề sâu hộp thì
                # mặt trước ghế che tới ngang hông — trông như đứng sau một cái quầy.
                depth_z = float(box['z']) + 12
                seat_height = 86 * who['_host_height'] / PERSON[1]            # mặt ghế của rig: ~86 đơn vị khung trên sàn (rig.seatY)
                if abs(float(box['height']) - seat_height) > 30: notes.append(f'character "{who["name"]}" sits on "{who["on"]}", which is {float(box["height"]):g} high — the seat of a character this size is about {seat_height:.0f}; make the box about that high, or the character floats above it / sinks into it')
            # Chỗ đứng LÚC ĐẦU (`_x0`): `who['x']` đã bị các lượt "bước lại gần" trong kịch bản cập nhật thành chỗ đứng sau
            # cùng — đặt nhân vật ở đó rồi cho nó bước thêm là nó đi quá, đứng chồng lên người kia.
            if who.get('_scooter'):
                # Ngồi trên yên: đặt ở chỗ xe XUẤT PHÁT, nâng lên `rideLift` (đơn vị khung → px), thế cầm lái từ khung đầu,
                # quay theo hướng xe chạy — trước khi dựng hội thoại (các lượt của nó bắt đầu từ thế ấy).
                ride = who['_scooter']; start = ride['drive']['from'] if ride.get('drive') else float(ride['x'])
                setup.append(f"    const {who['name']}Spot = set.place({who['name']}, {{ x: {start:g}, z: {depth_z:g}, height: {who['_host_height']:g} }});")
                setup.append(f"    {who['name']}Spot.y = cutout{ride['_n']}Prop.rideLift({who['name']}) * {who['_host_height']:g} / {PERSON[1]};   // on the seat of {ride['name']}")
                setup.append(f"    {who['name']}.state.ride = 1; {who['name']}.state.facing = {-1 if ride.get('facing') == 'left' else 1};      // riding")
            else:
                # Con vật một người NGỒI vuốt / bế (đợt 31): vẽ TRÊN người ấy (`over`) — đứng trước hai ống chân, không khuất sau chúng;
                # bàn tay nhắm ĐỈNH ĐẦU nó ('crown'). Giữ nguyên z: dời nó lại gần máy thì người khác (bé quỳ vuốt nó) với tay trong mặt
                # phẳng của mình, lơ lửng trên đầu nó.
                over = f", over: {who['_front']['name']}" if who.get('_front') is not None else ''
                # CÙNG CHIỀU SÂU với người ngồi vuốt nó (đợt 32) — khi chỉ người ấy với tay tới nó: thứ tự lớp đã do `over` lo, còn đứng
                # gần máy hơn 28–48 đơn vị thì ở góc trung đầu nó hiện thấp hơn / lệch ngang 4–6 đơn vị khung so với chỗ bàn tay (rig 2D
                # vươn trong mặt phẳng của mình): bàn tay vuốt hở trên đầu nó.
                front = who.get('_front')
                if front is not None and who.get('_reachers', set()) <= {front['name']}:
                    depth_z = plane_of(st, front)
                # HAI NGƯỜI ở hai chiều sâu cùng với tới con vật (đợt 33): nó đứng ở mặt phẳng của người đang với tới — lúc đầu là người
                # thứ nhất, rồi dời sang mặt phẳng người kế ngay trước lượt của họ (`set.depth`, xem `depth_code`). Giữ z riêng thì ở góc
                # trung đầu nó lệch 4–6 đơn vị khung so với bàn tay (bà ngồi sofa vuốt mèo, rồi bé quỳ cho ăn: 0 % tay chạm đầu mèo).
                hops = pet_depths.get(who['name']) if who['_pet'] else None
                if hops: depth_z = hops[0][1]
                setup.append(f"    set.place({who['name']}, {{ x: {who['_x0']:g}, z: {depth_z:g}{lift}, height: {who['_host_height']:g}{over} }});")
                if who['_pet'] and who.get('inTub'):
                    # ĐỢT 42 F: CHẬU TẮM vừa con vật, cùng đơn vị với nó (host cao bằng host con vật × 470 / 330), ngay sau nó (z − 6) — nó cắt dưới vành chậu.
                    tub = f"tub42f_{who['name']}"
                    setup.append(f"    const {tub} = document.createElement('div'), {tub}Fit = {who['name']}.tubFit42f(); VGCharacter.createProp({tub}, 'tub', {{ width: {tub}Fit.length, height: {tub}Fit.rim }}); "
                                 f"set.stand({tub}, {{ x: {who['_x0']:g}, z: {depth_z - 6:g}{lift}, height: {who['_host_height'] * 470 / 330:.1f} }}); {who['name']}.inTub42f({tub}Fit.rim);          // {who['name']} stands in a bath tub")
    for prop in props:
        options = {'color': prop['options'].get('color'), 'width': prop['options'].get('width'), 'height': prop['options'].get('tabletop'), 'back': prop['options'].get('back'),
                   'fill': prop['options'].get('fill'), 'reading': prop['options'].get('reading'), 'door': prop['options'].get('door'),
                   'facing': prop['options'].get('facing')}
        if prop['kind'] == 'paystand' and options.get('height') is not None: options['on'] = options.pop('height')            # đợt 39 A: mặt quầy cao `tabletop`
        setup.append(f"    VGCharacter.createProp($('{prop['element']}'), {js(prop['kind'])}, {js({k: v for k, v in options.items() if v is not None})});")
    for who in names.values():
        if who.get('_seat') and stage_set is not None:
            # Ghế trong bối cảnh 3D: một tấm đạo cụ đứng ngay SAU người ngồi (lùi 2 đơn vị), cùng cỡ host.
            seat = f"seat_{who['name']}"
            setup.append(f"    const {seat} = document.createElement('div'); VGCharacter.createProp({seat}, {js(who['_seat']['kind'])}, {{ for: {who['name']} }}); set.stand({seat}, {{ x: {who['_x0']:g}, z: {float(who.get('z', -300)) - 2:g}, height: {who['_host_height']:g}, shadow: false }});")
        elif who.get('_seat'): setup.append(f"    VGCharacter.createProp($('{who['_seat']['element']}'), {js(who['_seat']['kind'])}, {{ for: {who['name']} }});")
        if who.get('seated') and not who['_pet']:
            setup.append(f"    {who['name']}.state.seat = 1;                 // already seated in the first frame")
        # Người có mặt từ đầu thì ĐÃ quay về phía người mình nhìn ngay ở khung 0 — không tốn một nhịp quay mặt đầu cảnh.
        if who.get('faces') and not who.get('enter') and not who['_late'] and not who.get('rides'):
            toward = -1 if names[who['faces']]['_x0'] < who['_x0'] else 1          # chỗ đứng LÚC ĐẦU, không phải sau các lượt bước lại gần
            setup.append(f"    {who['name']}.state.facing = {toward if who['_pet'] else toward * 0.55};            // already turned toward {who['faces']}")
        elif who.get('seated') and not who['_pet'] and stage_set is not None and not who['_late']:
            # Người NGỒI trên ghế, không nói nhìn ai: quay 3/4 vào giữa phòng — dáng 3/4 mới vẽ được đùi nằm ngang trên mặt ghế,
            # nhìn thẳng thì trông như đứng trước ghế (đợt 29).
            toward = 1 if who['_x0'] < 0 else -1
            setup.append(f"    {who['name']}.state.facing = {toward * 0.55};            // seated: a three-quarter turn into the room, thighs on the seat")
        if who['_late']:
            setup.append(f"    {who['name']}.state.opacity = 0;              // off stage until its turn with \"enter\"")
    # ── THẺ THÔNG BÁO (`"toast"` trên một lượt): một thẻ kiểu thông báo ứng dụng ở góc trên khung — biểu tượng chuông,
    # tiêu đề đậm, một dòng nội dung. Mỗi thẻ là một clip phẳng; giờ hiện điền sau khi đo thời gian (`place_toasts`).
    if toasts:
        unit = min(width, height)
        card_w = round(width * (0.36 if width >= height else 0.82))
        # Khung dọc: thẻ thông báo ở 27 % chiều cao — dưới phụ đề (17 %), trong vùng an toàn; sát đỉnh khung là chỗ thanh tab
        # của TikTok che mất (Gemini soát phim đợt 18). Khung ngang: góc trên phải như cũ.
        style.append(f'  .toast {{ position: absolute; top: {round(height * (0.05 if width >= height else 0.27))}px; {"right" if width >= height else "left"}: {round(width * 0.04) if width >= height else round((width - card_w) / 2)}px; width: {card_w}px; box-sizing: border-box; '
                     f'padding: {round(unit * 0.018)}px {round(unit * 0.022)}px {round(unit * 0.018)}px {round(unit * 0.085)}px; border-radius: {round(unit * 0.022)}px; background: rgba(255, 255, 255, 0.97); '
                     f'box-shadow: 0 {round(unit * 0.01)}px {round(unit * 0.03)}px rgba(0, 0, 0, 0.22); font-family: system-ui, sans-serif; color: #16303a; }}')
        bell = _svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 4c-3 0-5 2.2-5 5.2v3.6L5.6 15h12.8L17 12.8V9.2C17 6.2 15 4 12 4zm-2 12.5a2 2 0 004 0' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'/></svg>")
        style.append(f'  .toast::before {{ content: ""; position: absolute; left: {round(unit * 0.022)}px; top: 50%; width: {round(unit * 0.046)}px; height: {round(unit * 0.046)}px; margin-top: {-round(unit * 0.023)}px; '
                     f'border-radius: {round(unit * 0.012)}px; background: #2f9e8f url("{bell}") center / 70% no-repeat; }}')
        # MỘT phần tử cho mỗi thẻ (HyperFrames không nhận clip có phần tử con): tiêu đề là chữ của chính nó, dòng nội dung
        # là `::after` lấy từ `data-text`, biểu tượng là `::before`.
        style.append(f'  .toast {{ font-weight: 800; font-size: {round(unit * 0.03)}px; line-height: 1.2; z-index: 30; }}')
        style.append(f'  .toast::after {{ content: attr(data-text); display: block; font-weight: 400; font-size: {round(unit * 0.026)}px; line-height: 1.25; color: #3b5560; margin-top: {round(unit * 0.004)}px; }}')
        for number, note in enumerate(toasts):
            text = html_text(note['text']).replace('"', '&quot;')
            body.append(f'  <div id="toast-{number + 1}" class="clip toast" data-text="{text}" data-start="0" data-duration="1" data-track-index="{track[0]}" data-toast-turn="{note["turn"]}" data-layout-ignore="">{html_text(note["title"])}</div>')
            track[0] += 1
    st.keep(pet_depths=pet_depths, start=start)


def cards_and_camera(st):
    """Intro / outro / hook cards, the conversation lines, captions, rides, drives and the camera code."""
    base, beats, body, captions, copied, director = st.take('base', 'beats', 'body', 'captions', 'copied', 'director')
    drives, gear_ops, height, lamp_names, lamp_ops, landscape = st.take('drives', 'gear_ops', 'height', 'lamp_names', 'lamp_ops', 'landscape')
    layers, layout, names, out, pet_depths, popups = st.take('layers', 'layout', 'names', 'out', 'pet_depths', 'popups')
    power_ops, scene, shows, sky_ops, speakers, stage_set = st.take('power_ops', 'scene', 'shows', 'sky_ops', 'speakers', 'stage_set')
    start, style, toasts, track, turns, views = st.take('start', 'style', 'toasts', 'track', 'turns', 'views')
    width = st.width
    # ── THẺ MỞ ĐẦU / KẾT THÚC (`"intro"`, `"outro"`): một khung toàn màn hình — nền màu thương hiệu, logo, tiêu đề, một dòng
    # chữ, một nút kêu gọi. Mỗi thứ là một clip phẳng. Thẻ mở đầu chiếm `dur` giây đầu (hội thoại bắt đầu sau nó, `T0`);
    # thẻ kết thúc nối sau lượt cuối (giờ bắt đầu điền sau khi đo, `__OUTRO_START__`).
    intro, outro = scene.get('intro'), scene.get('outro')
    intro_dur, card_lines = 0.0, []
    for which, card in (('intro', intro), ('outro', outro)):
        if card is None: continue
        if not isinstance(card, dict) or set(card) - set(CARD_KEYS) or not (card.get('title') or card.get('text')): fail(f'"{which}" is {{ "title", "text", "cta", "logo", "dur", "color" }} with at least a title or a text — got {js(card)}')
        dur = float(card.get('dur', 2.6 if which == 'intro' else 3.2))
        if not 1 <= dur <= 10: fail(f'{which}.dur must be 1…10 seconds')
        colour = card.get('color', '#2f9e8f')
        if not re.match(r'^#[0-9a-fA-F]{6}$', colour): fail(f'{which}.color must be #rrggbb')
        card_start, card_length = ('0', f'{dur:g}') if which == 'intro' else ('__OUTRO_START__', '__OUTRO_DUR__')      # đợt 42: không dùng tên `start` — nó là góc máy khởi đầu (cảnh 3D), máy quay về góc ấy đọc lại nó
        unit = min(width, height)
        def card_clip(kind, css, tag='div', content='', extra=''):
            style.append(f'  #{which}-{kind} {{ {css} z-index: 50; }}')
            body.append(f'  <{tag} id="{which}-{kind}" class="clip card-{which}" data-start="{card_start}" data-duration="{card_length}" data-track-index="{track[0]}" data-layout-ignore=""{extra}>{content}</{tag}>' if tag != 'img'
                        else f'  <img id="{which}-{kind}" class="clip card-{which}" data-start="{card_start}" data-duration="{card_length}" data-track-index="{track[0]}" data-layout-ignore=""{extra}>')
            track[0] += 1
        card_clip('bg', f'position: absolute; inset: 0; background: radial-gradient(circle at 30% 25%, #ffffff33, transparent 55%), linear-gradient(150deg, {colour}, #0f2a38);')
        top = 0.3
        if card.get('logo'):
            if not os.path.isfile(os.path.join(base, card['logo'])): fail(f'{which}.logo not found: {card["logo"]} (looked in {base})')
            name = copy_asset(base, out, card['logo'], copied)
            card_clip('logo', f'position: absolute; left: 50%; top: {round(height * 0.16)}px; height: {round(unit * 0.16)}px; transform: translateX(-50%);', tag='img', extra=f' src="{name}" alt=""')
            top = 0.38
        if card.get('title'):
            card_clip('title', f'position: absolute; left: 8%; right: 8%; top: {round(height * top)}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 800; font-size: {round(unit * 0.085)}px; line-height: 1.12; color: #ffffff; text-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);', content=html_text(str(card['title']).replace('-', '\u2011')))
        if card.get('text'):
            card_clip('text', f'position: absolute; left: 12%; right: 12%; top: {round(height * (top + 0.2))}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 500; font-size: {round(unit * 0.042)}px; line-height: 1.3; color: #e6f4f1;', content=html_text(card['text']))
        if card.get('cta'):
            card_clip('cta', f'position: absolute; left: 50%; top: {round(height * (top + 0.36))}px; transform: translateX(-50%); padding: {round(unit * 0.018)}px {round(unit * 0.05)}px; border-radius: 999px; background: #ffffff; color: {colour}; font-family: system-ui, sans-serif; font-weight: 800; font-size: {round(unit * 0.04)}px; white-space: nowrap; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);', content=html_text(card['cta']))
        if which == 'intro':
            intro_dur = dur
            card_lines.append(f"    // Opening card: the words come in, then the whole card fades into the scene.\n    gsap.utils.toArray('.card-intro:not(#intro-bg)').forEach((el, n) => tl.from(el, {{ opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' }}, 0.15 + n * 0.15));\n    tl.to('.card-intro', {{ opacity: 0, duration: 0.45, ease: 'power1.in' }}, TI - 0.45);")
        else:
            card_lines.append(f"    // Closing card after the last turn: it fades in over the scene, then the words come in.\n    tl.from('#outro-bg', {{ opacity: 0, duration: 0.5 }}, T1); gsap.utils.toArray('.card-outro:not(#outro-bg)').forEach((el, n) => tl.from(el, {{ opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' }}, T1 + 0.3 + n * 0.15));\n    tl.to({{}}, {{ duration: {dur:g} }}, T1);")
    # MỞ ĐẦU KIỂU "HOOK" (`"hook": { "title", "text", "dur" }`): chữ lớn BẬT lên đè trên cảnh đầu đang diễn rồi tắt — video
    # ngắn không mở bằng một thẻ tĩnh (Gemini chê ba giây đầu chậm). Cảnh không đợi: lượt đầu bắt đầu ngay từ giây 0.
    hook = scene.get('hook')
    if hook is not None:
        if not isinstance(hook, dict) or set(hook) - {'title', 'text', 'dur'} or not hook.get('title'): fail('"hook" is { "title": "…", "text": "…", "dur": 2.2 } — big words over the first moments of the scene')
        hook_dur = float(hook.get('dur', 2.2))
        if not 1 <= hook_dur <= 5: fail('hook.dur must be 1…5 seconds')
        unit = min(width, height)
        hook_top = 0.2 if width < height else 0.16
        def hook_clip(kind, css, content=''):
            style.append(f'  #hook-{kind} {{ {css} z-index: 45; }}')
            body.append(f'  <div id="hook-{kind}" class="clip card-hook" data-start="0" data-duration="{hook_dur:g}" data-track-index="{track[0]}" data-layout-ignore="">{content}</div>')
            track[0] += 1
        hook_clip('shade', 'position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, rgba(8,14,22,.55), rgba(8,14,22,.15) 60%, rgba(8,14,22,0));')
        hook_clip('title', f'position: absolute; left: 6%; right: 6%; top: {round(height * hook_top)}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 900; font-size: {round(unit * 0.095)}px; line-height: 1.08; color: #ffffff; -webkit-text-stroke: {max(2, round(unit * 0.004))}px #0f2a38; paint-order: stroke fill; text-shadow: 0 6px 24px rgba(0,0,0,.45);',
                  html_text(str(hook['title']).replace('-', '\u2011')))
        if hook.get('text'):
            hook_clip('text', f'position: absolute; left: 10%; right: 10%; top: {round(height * (hook_top + (0.2 if width < height else 0.24)))}px; text-align: center; font-family: system-ui, sans-serif; font-weight: 700; font-size: {round(unit * 0.048)}px; line-height: 1.25; color: #ffe08a; text-shadow: 0 3px 14px rgba(0,0,0,.5);', html_text(str(hook['text'])))
        card_lines.append(f"    // Hook: big words pop over the opening moments, then fade — the scene itself starts at once.\n"
                          f"    tl.from('#hook-shade', {{ opacity: 0, duration: 0.25 }}, 0); tl.from('#hook-title', {{ opacity: 0, scale: 0.55, duration: 0.45, ease: 'back.out(2.4)' }}, 0.05);\n"
                          f"    if (document.getElementById('hook-text')) tl.from('#hook-text', {{ opacity: 0, y: 24, duration: 0.4, ease: 'power2.out' }}, 0.45);\n"
                          f"    tl.to('.card-hook', {{ opacity: 0, duration: 0.35, ease: 'power1.in' }}, {hook_dur - 0.35:g});")
    card_code = "\n    const T1 = tl.duration();                 // the closing card (if any) starts here\n" + "\n".join(card_lines) if card_lines else "\n    const T1 = tl.duration();"
    camera = False if stage_set is not None or layout == 'split' else scene.get('camera', layout != 'presenter')        # người dẫn đứng cạnh nội dung: máy quay không cắt cận, trừ khi kịch bản yêu cầu
    camera_code = ''
    if camera:
        kind = camera.get('kind', 'chest') if isinstance(camera, dict) else 'chest'
        # Khung dọc: phụ đề nằm giữa khung (vùng an toàn), nên người nói được đặt ở PHẦN TRÊN và nhỏ lại
        # một chút — không thì chữ đè lên miệng.
        # Khung ngang: cảnh cận lấp 66% chiều cao (mặc định 82% của thư viện làm cái đầu chiếm nửa khung hình).
        # Khung ngang có phụ đề ở dưới: đặt người nói cao hơn giữa khung một chút (centerY 0,45) để cằm không chạm
        # hộp chữ — nhân vật đầu to, cận ngực là cái đầu đã cao quá nửa khung.
        portrait = (', fill: 0.66' + (', centerY: 0.45' if captions else '')) if width >= height else ', fill: 0.46, centerY: 0.34'
        camera_code = f"camera: {{ scene: {js(layers)}, kind: {js(kind)}{portrait} }}, "
    seated_pets = [f"[{who['name']}, 'sitDown']" for who in names.values() if who['_pet'] and who.get('seated')]
    lines = []
    for comment, code in ([('  // pets that start seated', '{ together: [' + ', '.join(seated_pets) + '] }' if len(seated_pets) > 1 else seated_pets[0])] if seated_pets else []) + turns:
        if comment: lines.append('    ' + comment)
        lines.append(f'      {code},')
    # MỘT DÒNG, cố định một chỗ (khung ngang: sát đáy, giữa khung): câu dài được chia thành các cụm vừa một dòng, cụm
    # nào hiện đúng lúc lời nói tới cụm ấy. Hộp chữ hai ba dòng che mất nhân vật thấp và cử chỉ tay. Bề ngang một chữ
    # ≈ 0,55 cỡ chữ; trừ lề trong 60px.
    caption_chars = int(((width * 0.7 if landscape else width * 0.6) - 60) / (min(width, height) * 0.041 * 0.55))
    if not landscape and stage_set is not None: caption_chars *= 2                 # khung dọc trong bối cảnh 3D: phụ đề hai dòng
    caption_code = f"    tl.add(VGCharacter.captions(talk, $('caption'), {{ maxChars: {caption_chars}, avoid: false, cuts: (typeof CUTS === 'undefined' ? [] : CUTS.map((time) => time - T0)) }}).paused(false), T0);     // the words of each line, one line at a time, each chunk when the speech reaches it" if captions else ''
    if popups:
        caption_code += "\n    // Notifications on the screens of props in the set (they follow the camera with the prop)."
        for pop in popups:
            caption_code += f"\n    tl.add(cutout{pop['cutout']}Prop.notify({js({'title': pop['title'], 'text': pop['text']})}, {{ hold: {pop['hold']:g} }}).paused(false), T0 + talk.turns[{pop['turn']}].start + 0.3);"
    if speakers:
        moves = ' '.join(f"tl.to('#dim-left', {{ opacity: {0 if side in ('left', None) else 0.32}, duration: 0.3 }}, T0 + talk.turns[{turn}].start); tl.to('#dim-right', {{ opacity: {0 if side in ('right', None) else 0.32}, duration: 0.3 }}, T0 + talk.turns[{turn}].start);" for turn, side in speakers)
        caption_code += "\n    // Split screen: the half that is not speaking dims a little.\n    " + moves
    if toasts: caption_code += "\n    // Notification cards slide in at their data-start and out before their clip ends (tools/scene.py fills both in).\n    document.querySelectorAll('.toast').forEach((element) => { const start = +element.dataset.start, end = start + +element.dataset.duration; tl.from(element, { opacity: 0, y: -30, duration: 0.4, ease: 'back.out(1.6)' }, start); tl.to(element, { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, end - 0.3); });"
    if shows: caption_code += "\n    // Content clips (title, bullets, image) fade in at their data-start, which tools/scene.py fills in.\n    document.querySelectorAll('.show').forEach((element) => { if (+element.dataset.start > 0) tl.from(element, { opacity: 0, y: 24, duration: 0.45, ease: 'power2.out' }, +element.dataset.start); });"
    # Bối cảnh 3D: máy quay áp sau mỗi lần timeline cập nhật; mỗi "view" là một tween (hoặc một lần cắt) đặt đúng lúc lượt ấy bắt đầu.
    # ── XE CHẠY VÀO (`drive` trên một cutout) và NGƯỜI CẦM LÁI (`rides`) ── xe trượt từ `from` tới chỗ của nó (giảm tốc như
    # phanh), bánh xe máy quay theo quãng đường; người lái ngồi trên yên đi cùng. Hội thoại bắt đầu khi mọi xe đã dừng
    # (T0 = thẻ mở đầu + lâu nhất + 0,3 s). "getOff" của người lái — ở lượt nào cũng được — là lúc người ấy bước xuống
    # đất cạnh xe: hạ người đúng lúc động tác ấy chạy (hạ trước thì có lúc người ngồi bệt dưới đất).
    drive_wait = max([item['drive']['dur'] for item in drives], default=-0.3) + 0.3
    ride_lines = []
    for item in drives:
        n, d = item['_n'], item['drive']
        ride_lines.append(f"    tl.fromTo(cutout{n}Spot, {{ x: {d['from']:g} }}, {{ x: {float(item['x']):g}, duration: {d['dur']:g}, ease: {js(d['ease'])} }}, TI);" + (f"          // {item['name']} drives in" if item.get('name') else ''))
        if item.get('kind') == 'scooter':
            ahead = (float(item['x']) - d['from']) * (-1 if item.get('facing') == 'left' else 1)
            ride_lines.append(f"    tl.add(cutout{n}Prop.roll({ahead / (item['_tall'] / PERSON[1]):.1f}, {d['dur']:g}, {js(d['ease'])}), TI);          // its wheels turn")
    for who in names.values():
        ride = who.get('_scooter')
        if not ride: continue
        d, end = ride.get('drive'), float(ride['x'])
        if d: ride_lines.append(f"    tl.fromTo({who['name']}Spot, {{ x: {d['from']:g} }}, {{ x: {end:g}, duration: {d['dur']:g}, ease: {js(d['ease'])} }}, TI);          // {who['name']} rides with it")
        side, step = (-1 if ride.get('facing') == 'left' else 1), 0.42 * who['_host_height']
        ride_lines.append(f"    {{ const off = talk.turns.filter((turn) => turn.rig === {who['name']}).flatMap((turn) => turn.steps).find((step) => step.name === 'getOff');          // {who['name']} gets off: down beside the scooter\n"
                          f"      if (off) tl.to({who['name']}Spot, {{ x: {end + side * step:.0f}, y: 0, z: {float(ride['z']) + 70:g}, duration: 0.55, ease: 'power1.inOut' }}, T0 + off.start); }}")
    ride_code = ("\n    // Vehicles drive in after the opening card; riders sit on them and get off with \"getOff\".\n" + "\n".join(ride_lines)) if ride_lines else ''
    t0_code = (f"    const TI = {intro_dur:g}, T0 = TI + {drive_wait:g};       // the opening card (0 = none), then vehicles drive in; the conversation starts at T0" if drives
               else f"    const T0 = {intro_dur:g};                 // the conversation starts after the opening card (0 = none)\n    const TI = T0;")

    timeline_hook, view_code, drive_code = '', '', ''
    # CHIỀU SÂU CON VẬT THEO LƯỢT (đợt 33): dời nó sang mặt phẳng người kế với tới — thêm TRƯỚC khi máy quay tự đặt góc (`direct` tua
    # timeline để đo khung), tạm là 0,45 s ngay trước lượt ấy; sau `direct`, `settleDepths` dời nó vào lần CẮT CẢNH muộn nhất từ lúc
    # lượt với tới trước xong tới lúc lượt này bắt đầu, hay vào bước đi của chính nó (lượt hai: trượt 0,45 s thấy trên hình).
    depth_lines = [f"    tl.add(set.depth({name}, {z:g}, 0.45, 'sine.inOut', {{ between: [T0 + talk.turns[{prev}].end, T0 + talk.turns[{turn}].start] }}), Math.max(0, T0 + talk.turns[{turn}].start - 0.45));"
                   for name, hops in pet_depths.items() for turn, z, prev in hops[1:]]
    depth_code = ('\n    // A pet two people at different depths reach for stands in the plane of whoever reaches for it now (a hand only reaches in its own plane).\n'
                  + '\n'.join(depth_lines) + '\n') if depth_lines else ''
    settle_code = ("\n    // The pet changes depth on a cut (or during its own walk), never sliding while it stands still in view.\n"
                   "    set.settleDepths(typeof CUTS === 'undefined' ? [] : CUTS, (rig) => talk.turns.filter((turn) => turn.rig === rig).flatMap((turn) => turn.steps.filter((step) => step.name === 'walk').map((step) => [T0 + step.start, T0 + step.start + step.duration])));\n") if depth_lines else ''
    if stage_set is not None:
        timeline_hook = ', onUpdate: set.update'
        # Máy quay áp ở MỌI khung kể cả khi bộ dựng tua bằng seek() (tắt onUpdate) — không có thì hình chớp lúc máy lia.
        drive_code = "\n    set.drive(tl);       // the camera is applied on every frame, also when the renderer seeks without callbacks"
        moves, autos = [], False
        for view in views:
            values = ', '.join(f'{key}: {value:g}' for key, value in view['values'].items())
            if view.get('start'): aim = js(start)
            elif view.get('auto'):
                # Góc tự động: tính lúc dựng, ở đúng lúc lượt (gốc) của nó bắt đầu — vị trí của mọi người lúc ấy.
                autos = True
                first = next(v for v in views if v.get('auto') is view['auto'] and not v.get('returned')) if view.get('returned') else view
                auto = view['auto']
                # `alone` (đợt 35, lượt ba): góc cận riêng chủ thể — không né người khác (`avoid: []`), đo suốt lượt (con chó chạy vòng).
                opts = (f", {{ avoid: [], span: [T0 + talk.turns[{first['turn']}].start, T0 + talk.turns[{first['turn']}].end]" + (f", fill: {auto['fill']:g}" if auto.get('fill') else '') + ' }') if auto.get('alone') else (f", {{ fill: {auto['fill']:g} }}" if auto.get('fill') else '')
                aim = f"{{ ...frameAt(T0 + talk.turns[{first['turn']}].start, [{', '.join(auto['on'])}], {js(auto['size'])}{opts})" + (f", {values}" if values else '') + ' }'
            else: aim = f'{{ {values} }}'
            call = f"set.cut({aim})" if view['cut'] else f"set.move({aim}, {view['dur']:g}, {js(view['ease'])})"
            # ĐỢT 44 B: góc cận TỰ ĐỘNG của con vật (`alone`) ở lượt ĐẦU cảnh (chó đuổi đuôi mở cảnh): giữ góc toàn mở đầu của đạo diễn tự động
            # 1,6 s (≤ nửa lượt) rồi mới cắt vào — không thì góc mở đầu là góc cận ấy, sofa / TV lẹm ở mép (người chấm hỏi về đồ đạc ở đó).
            if director and view['turn'] == 0 and isinstance(view.get('auto'), dict) and view['auto'].get('alone') and view['cut']:
                moves.append(f"    tl.add({call}, Math.min(T0 + talk.turns[0].start + 1.6, T0 + (talk.turns[0].start + talk.turns[0].end) / 2));      // after the opening shot")
                continue
            moves.append(f"    tl.add({call}, T0 + talk.turns[{view['turn']}].start);")
        for op in lamp_ops:
            if not lamp_names: fail(f'{op["where"]}: "lamp" — the set has no lamps (add set.lamps, or a "lamp" cutout)')
            name = op['name'] if op['name'] is not None else lamp_names[0]
            if name not in lamp_names: fail(f'{op["where"]}: "lamp" names {js(name)}, but the lamps are {", ".join(lamp_names)}')
            moves.append(f"    tl.add(set.lamp({js(name)}, {js(op['on'])}, {op['dur']:g}), T0 + talk.turns[{op['turn']}].start + {op['delay']:g});      // lamp {'on' if op['on'] else 'off'}")
        for op in power_ops:
            # Mất điện: tắt phụt (0,12 s, không chớp); có điện: các đèn bật lại lần lượt, mỗi cái chớp một nhịp.
            for n, name in enumerate(lamp_names):
                call = f"set.lamp({js(name)}, false, 0.12)" if not op['on'] else f"set.lamp({js(name)}, true, 0.9)"
                moves.append(f"    tl.add({call}, T0 + talk.turns[{op['turn']}].start + {0.2 + (0.3 * n if op['on'] else 0):g});      // power {'on' if op['on'] else 'off'}")
        for op in sky_ops:
            moves.append(f"    tl.add(set.shift({js(op['to'])}, {op['dur']:g}), T0 + talk.turns[{op['turn']}].start);      // the sky turns {op['to']}")
        # Các lần CẮT CẢNH của kịch bản (và của đạo diễn tự động): phụ đề không sót qua chúng.
        moves.append('    const CUTS = [' + ', '.join(f'T0 + talk.turns[{view["turn"]}].start' for view in views if view['cut']) + '];')
        if director and height > width * 1.2 and len(beats) > 1:
            # Khung dọc: toàn cảnh mở đầu chỉ lấy CỤM nhân vật quanh nhịp đầu tiên — bốn người dàn ngang trong khung hẹp là
            # bốn hình tí hon.
            lead = next((beat for beat in beats[1:] if beat.get('subjects')), None)
            if lead:
                centre = sum(float(names[name]['x']) for name in lead['subjects']) / len(lead['subjects'])
                near = [who['name'] for who in names.values() if abs(float(who['_x0']) - centre) <= 700]
                beats[0]['subjects'] = near or lead['subjects']
        if director:
            items, hold = [], None
            gestured = any(op['kind'] in ('gesture', 'talk39') for op in gear_ops)
            for beat in beats:
                time, end = f"T0 + talk.turns[{beat['first']}].start", f"T0 + talk.turns[{beat['last']}].end"
                # Sau lượt TRỜI CHUYỂN: giữ góc toàn tới khi trời chuyển được 75 % (đèn đã tự bật) — cắt sang góc cận sớm thì không
                # ai thấy đèn sáng lên (đợt 24: đầu đèn đường ngoài khung lúc trời tối xong).
                if hold and not beat.get('drift') and not beat.get('fixed'): time = f"Math.max({time}, {hold})"
                if beat.get('drift'): hold = f"T0 + talk.turns[{beat['first']}].start + {beat['drift'] * 0.75:g}"
                items.append(f"{{ time: {time}, fixed: true }}" if beat.get('fixed') else f"{{ time: {time}, end: {end}, subjects: [{', '.join(beat['subjects'])}], size: {js(beat['size'])}" + (', speech: true' if beat.get('speech') else '') + (', move: true' if beat.get('move') else '') + (', floor44b: true' if beat.get('floor44b') else '') + (', lamp: true' if beat.get('lamp') else '') + (', mid: true' if beat.get('mid') else '') + (f", drift: {beat['drift']:g}" if beat.get('drift') else '')
                         + (f", hands: handTimes({beat['first']}, {beat['last']}, [{', '.join(beat['subjects'])}])" if beat['size'] != 'full' and gestured else '')
                         + (f", peaks42d: bodyTimes42d({beat['first']}, {beat['last']}, [{', '.join(beat['subjects'])}])" if beat.get('body42d') else '') + ' }')
            # ĐỘNG TÁC TAY trong nhịp (đợt 33): các lúc (40 / 55 / 70 % bước) người trong chủ thể vẫy / chỉ / giơ ngón — `direct` lấy cả
            # hai bàn tay vào góc trung / cận ở các lúc ấy.
            hand_code = ("    const handTimes = (a, b, rigs) => talk.turns.slice(a, b + 1).filter((turn) => rigs.includes(turn.rig)).flatMap((turn) => turn.steps.filter((step) => "
                         + js(list(GESTURES)) + ".includes(step.name)).flatMap((step) => [0.4, 0.55, 0.7].map((f) => T0 + step.start + step.duration * f)));\n") if gestured else ''
            # ĐỢT 42 D: các lúc (mỗi 10 % bước) người trong chủ thể chạy / nhảy / múa — khung lấy cả người ở đỉnh cú nhảy, lúc tay giơ cao.
            hand_code += ("    const bodyTimes42d = (a, b, rigs) => talk.turns.slice(a, b + 1).filter((turn) => rigs.includes(turn.rig)).flatMap((turn) => turn.steps.filter((step) => "
                          + js(list(MOTION_42D)) + ".includes(step.name)).flatMap((step) => [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((f) => T0 + step.start + step.duration * f)));\n") if any(b.get('body42d') for b in beats) else ''
            moves.append("    // \"camera\": \"auto\" — the camera chooses every shot (a shot lasts at least 2.5 s; turns with their own \"view\" keep it).\n" + hand_code +
                         "    CUTS.push(...set.direct(tl, [\n      " + ',\n      '.join(items) + "\n    ]));")
        if autos:
            moves.insert(0, "    // Automatic views (\"view\": \"close\", { \"on\": … }): measured at build time, at the moment of their turn.\n"
                            "    const frameAt = (time, subjects, size, { span, ...opts } = {}) => { tl.seek(time, false); set.update();\n"
                            "      opts = { view42c: true, ...opts };\n"
                            "      return set.frameOn(subjects, size, span ? { ...opts, at: [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => span[0] + (span[1] - span[0]) * f), seek: (t) => { tl.seek(t, false); set.update(); } } : opts); };")
            moves.append("    tl.seek(0, false); set.update();")
        if moves: view_code = '\n    // Camera: each "view" in the scene file starts with its turn.\n' + '\n'.join(moves)
    # SOÁT GÓC MÁY (bối cảnh 3D): tua cả cảnh, mỗi 0,25 s hỏi set.framing() ai đang bị mép khung cắt dở. tools/scene.py gọi
    # hàm này một lần khi dựng (read_timings) rồi nhắc; lúc render không ai gọi nó.
    framing_code = ''
    if stage_set is not None:
        framing_code = ("    // Read by tools/scene.py: who the frame edge cuts through, every 0.25 s (not called in a render).\n"
                        "    window.__framing = () => { const cut = []; for (let t = T0; t < (T1 || tl.duration()); t += 0.25) { tl.seek(t, false); set.update(); "
                        "set.framing().forEach((c) => cut.push(Object.assign({ t: +t.toFixed(2) }, c))); } tl.seek(0, false); set.update(); return cut; };\n")
    st.keep(camera_code=camera_code, caption_code=caption_code, card_code=card_code, depth_code=depth_code, drive_code=drive_code,
            framing_code=framing_code, lines=lines, outro=outro, ride_code=ride_code, settle_code=settle_code, t0_code=t0_code,
            timeline_hook=timeline_hook, view_code=view_code)
