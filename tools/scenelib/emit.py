"""Phase 4 steps: the code of an entry — a "together" group, or one turn with what the other character does at the same time (purr,
shake back, take, pair actions, selfie, chew, open the mouth, offer a hand, hold the rope) and the automatic close-ups."""
from .actions import BATH_BACK, LICK_BEAT, PAIR_PARTNER, PET_CLOSE, PET_CLOSE_FILL, PET_CLOSE_FILLS
from .camera import pet_group_fill
from .schema import CAT_BREEDS
from .steps import step_code, turn_code
from .util import fail, js, known
from .views import view_of
from . import leash49c          # đợt 49 C
from . import feed50c          # đợt 50 C


def emit_together(emitted, entry, st, turns, where):
    """Mục `together`: kiểm tra, góc máy cho cả nhóm (đợt 42), rồi một lượt gồm mọi lượt con (và lời người dẫn chạy cùng)."""
    if 'shot' in entry: fail(f'{where}: "shot" cannot sit on a "together" entry — put it on one of the turns inside it')
    known(where, entry, ('together', 'view', '_narrator_turns'))
    if not isinstance(entry['together'], list) or not (entry['together'] or entry.get('_narrator_turns')): fail(f'{where}: "together" must be a non-empty list of turns')
    if any(isinstance(turn, dict) and 'view' in turn for turn in entry['together']): fail(f'{where}: "view" cannot sit inside "together" — put it on the "together" entry itself (one camera for the whole group), or on a turn of its own')
    # ĐỢT 42: GÓC MÁY CHO CẢ NHÓM — lời dẫn đè lên hình (voice-over): `{ "together": [ { người nói }, { con vật diễn } ], "view": { "on": ["meo"], "size": "close" } }`
    # — máy quay vào động tác trong lúc người kia nói, không cắt sang người nói. Chỉ dạng đối tượng (không có "who" chung để hiểu "close").
    # ĐỢT 42 A: góc cận MỘT con thú, một mình, chưa khai `fill` — choán khung theo động tác nó làm trong nhóm (như góc tự động của lượt riêng): thỏ nhảy vui / chó chổng mông 0,9; mèo chui hộp 0,62…
    if isinstance(entry.get('view'), dict) and 'fill' not in entry['view'] and entry['view'].get('alone') and entry['view'].get('size') == 'close' and isinstance(entry['view'].get('on'), list) and len(entry['view']['on']) == 1:
        group_fill = pet_group_fill(entry)
        if group_fill: entry['view'] = dict(entry['view'], fill=group_fill)
    if 'view' in entry:
        if not isinstance(entry['view'], dict): fail(f'{where}: "view" on a "together" entry must be an object — {{ "on": [names], "size": "close" | "medium" | "full" }} or camera values')
        view_of(st, entry, where)
    emitted[0] += len(entry['together']) + len(entry.get('_narrator_turns', []))
    # Lời của người dẫn (đợt 42 A) chạy CÙNG LÚC với nhóm, xếp sau cùng; một mình thì là một lượt thường.
    parts = [turn_code(st, turn, f'{where}.together[{n}]') for n, turn in enumerate(entry['together'])] + [turn_code(st, turn, f'{where}.narrator') for turn in entry.get('_narrator_turns', [])]
    turns.append((None, '{ together: [' + ', '.join(parts) + '] }' if len(parts) > 1 else parts[0]))


def emit_turn(arms, emitted, entry, gear_ops, names, reach_notes, st, stage_set, turns, where):
    """Một lượt riêng: góc máy tự động (con vật diễn, ngồi bệt / nằm), rồi người / con vật kia làm phần của mình cùng lúc (gừ gừ, bắt tay lại, nhận đồ, hai người, chụp chung, nhai, há miệng, chìa tay, giữ dây)."""
    code = turn_code(st, entry, where)
    # GÓC CẬN CON VẬT tự động (đợt 35, lượt ba): lượt riêng của con vật làm một động tác của nó (lăn ngửa, đuổi đuôi, nhào, gặm,
    # liếm) mà kịch bản không cho "view": cắt sang góc cận nó suốt lượt rồi trở lại. Liếm mặt người đang bế: góc cận người ấy.
    acts = [step if isinstance(step, str) else step[0] for step in entry.get('do') or [] if isinstance(step, (str, list)) and step]
    # ĐỢT 42 E: lượt NGỒI BỆT / NẰM XUỐNG của một người mà kịch bản không cho "view": góc toàn người ấy suốt lượt — góc trung đặt theo dáng
    # đứng lúc đầu lượt thì người vừa ngồi / nằm xuống tụt ra mép dưới khung (chỉ còn cái đầu).
    if stage_set is not None and 'view' not in entry and not names[entry['who']]['_pet'] and any(name in ('sitOnFloor', 'lieDown') for name in acts):
        entry['view'] = {'on': [entry['who']], 'size': 'full'}
    if stage_set is not None and 'view' not in entry and names[entry['who']]['_pet'] and any(name in PET_CLOSE for name in acts):
        carrier = next((who for who, held in arms.items() if held == entry['who']), None) if 'struggle' in acts else None          # đợt 40 C: vùng vẫy trong tay — máy đặt tay vào ngực người bế (con vật nằm trong vòng tay: `on` con vật không dựng được góc), thấy cả hai tay đang giữ
        licked_face = [step for step in entry.get('do') if isinstance(step, list) and step[0] == 'lick' and len(step) > 1 and isinstance(step[1], str) and arms.get(step[1][1:]) == entry['who']]
        entry['view'] = ({'x': round(float(names[carrier]['x'])), 'y': round(170 * names[carrier]['_unit']), 'z': round(float(names[carrier].get('z', -300))), 'zoom': 1.9, 'dur': 0.3} if carrier else {'on': [licked_face[0][1][1:]], 'size': 'medium', 'alone': True, 'back': True} if licked_face
                         else {'on': [entry['who']], 'size': 'close', 'alone': True, 'fill': PET_CLOSE_FILLS.get(next((name for name in acts if name in PET_CLOSE_FILLS), ''), 0.94 if 'leanOnLeg' in acts else 0.88 if ('tugOfWar' in acts or 'leanOnLeg' in acts or ('carryToy' in acts and any(isinstance(st, list) and st and st[0] == 'carryToy' and len(st) > 1 and isinstance(st[1], str) for st in entry.get('do') or []))) else 0.9 if ('playBow' in acts or 'dig' in acts or 'carryToy' in acts) else 0.74 if 'rollOver' in acts else 0.7 if ('chaseTail' in acts or 'bark' in acts) else 0.66 if 'lick' in acts else PET_CLOSE_FILL), 'back': True})      # nằm ngửa: thấp, chặt hơn
    view_of(st, entry, where)
    if stage_set is not None and 'shot' in entry: fail(f'{where}: "shot" frames the 2D camera — in a 3D set move the camera with "view" instead')
    # Lượt KHÔNG LỜI có `["stroke", "@con vật"]`: con vật đáp lại cùng lúc — mèo gừ gừ, chó vẫy đuôi. Muốn khác thì
    # tự viết `together`.
    stroked = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'stroke' and isinstance(step[1], str) and step[1].startswith('@')]
    pets = [name for name in stroked if name in names and names[name]['_pet']]
    if pets and 'say' not in entry and code.startswith('['):
        pet = names[pets[0]]
        # Mèo: mọi giống mèo (calico không có chữ "cat" — đợt 28: mèo tam thể vẫy đuôi như chó).
        code = '{ together: [' + code + f", [{pet['name']}, {js('purr' if 'cat' in pet['species'] or pet['species'] in CAT_BREEDS else 'wagTail')}]] }}"
        emitted[0] += 1
    # `["handshake", "@người kia"]` một mình: người kia BẮT TAY LẠI cùng lúc — rig chỉ tính điểm gặp khi cả hai cùng
    # đưa tay; một bên đưa thì tay chỉ tới bụng, tay người kia buông thõng (đợt 28: hai bàn tay cách 26 % chiều cao).
    shaken = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'handshake' and isinstance(step[1], str) and step[1].startswith('@')]
    shaken = [name for name in shaken if name in names and not names[name]['_pet'] and name != entry.get('who')]
    if shaken and not pets and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
        code = '{ together: [' + code + f", [{names[shaken[0]]['name']}, [\"handshake\", {names[entry['who']]['name']}]]] }}"
        emitted[0] += 1
    # `["handOver", "@người kia"]` / `["handOverPet", "@người kia"]` một mình: người kia NHẬN cùng lúc (`take` — nếu họ có
    # món đồ đang cất, `"holdsHidden": true` —, `takePet`). Không thì món đồ / con vật trôi vào khoảng không: `handOverPet`
    # một mình làm hỏng cả cảnh (`putDown` sau đó báo "không bế con vật nào") (đợt 29).
    given = [(step[0], step[1][1:]) for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] in ('handOver', 'handOverPet') and isinstance(step[1], str) and step[1].startswith('@')]
    given = [(kind, name) for kind, name in given if name in names and not names[name]['_pet'] and name != entry.get('who') and (kind == 'handOverPet' or (names[name].get('holds') and names[name].get('holdsHidden')))]
    for step in entry.get('do', []):
        if isinstance(step, list) and len(step) > 1 and step[0] == 'carry' and isinstance(step[1], str) and step[1][1:] in names: arms[entry['who']] = step[1][1:]
        if step == 'putDown': arms.pop(entry['who'], None)          # đặt xuống rồi: không còn bế (đợt 35 — liếm mặt / liếm tay)
    if given and not pets and not shaken and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
        kind, name = given[0]
        # NHẬN CON VẬT: báo chỗ nó đứng lúc được bế (đơn vị khung của nó, như `set.target(…, { at })`) — lúc dựng, trạng thái
        # con vật đã về khung 0, mà người nhận đặt nó xuống cạnh chân mình tính từ chỗ ấy (đợt 30: con chó đã đi tới ông ngồi
        # ghế đá thì bị đặt ra ngoài khung).
        held = arms.pop(entry['who'], None) if kind == 'handOverPet' else None
        extra = ''
        if held:
            arms[name] = held
            pet = names[held]
            walked = (float(pet['x']) - float(pet['_x0'])) / pet['_unit'] if pet.get('_unit') and pet.get('_x0') is not None else 0
            extra = f", {{ petAt: {round(walked, 1):g} }}"
            # CHỖ NGƯỜI NHẬN SẼ ĐẶT NÓ XUỐNG — tính đúng như rig (`takePet`): cạnh chân người nhận, phía không có người trao,
            # cách 60 đơn vị khung người + 1/4 bề ngang khung con vật. Lượt sau với tới / đi tới con vật tính từ chỗ ấy
            # (đợt 30: tính từ chỗ cũ thì bé bước sang tận ghế đá để vuốt con chó đang nằm cạnh chân mình).
            giver, taker = names[entry['who']], names[name]
            side = -1 if float(giver['x']) > float(taker['x']) else 1
            pet['_drop'] = float(taker['x']) + side * (60 * taker['_unit'] + 100 * pet['_unit']) - float(pet['x'])
        code = '{ together: [' + code + f", [{names[name]['name']}, [{js('take' if kind == 'handOver' else 'takePet')}, {names[entry['who']]['name']}{extra}]]] }}"
        emitted[0] += 1
    # HAI NGƯỜI (đợt 38 C): `["highFive" | "hug" | "patShoulder" | "whisper" | "handOverBag", "@người kia"]` một mình — người kia làm
    # phần của mình CÙNG LÚC (đập tay lại, ôm lại, nhìn lại người vỗ vai, nghiêng tai nghe, nhận túi). Một bên làm thì tay vươn vào
    # khoảng không — như bắt tay (đợt 28).
    paired = [(step[0], step[1][1:]) for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] in PAIR_PARTNER and isinstance(step[1], str) and step[1].startswith('@')]
    paired = [(kind, name) for kind, name in paired if name in names and not names[name]['_pet'] and name != entry.get('who')]
    if paired and not pets and not shaken and not given and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
        kind, name = paired[0]
        me = names[entry['who']]['name']
        if PAIR_PARTNER[kind] == 'lookAt':
            look = f"set.target({name}, {me}, 'head')" if stage_set is not None else me
            part = f"['lookAt', {look}, {{ hold: 2.6, up: 1.5 }}]"
        else: part = f"[{js(PAIR_PARTNER[kind])}, {me}]"
        code = '{ together: [' + code + f", [{names[name]['name']}, {part}]] }}"
        emitted[0] += 1
    # ĐỢT 39 C: `["takeSelfie", hold, { "with": "@người / con vật" }]` một mình: người kia làm phần của mình CÙNG LÚC — người: `joinSelfie`
    # (nghiêng đầu về phía máy, cười, chữ V); con vật: nghiêng đầu tò mò (`tiltHead`).
    selfie = [step for step in entry.get('do', []) if isinstance(step, list) and step and step[0] == 'takeSelfie' and len(step) > 2 and isinstance(step[2], dict) and isinstance(step[2].get('with'), str)]
    if selfie and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1 and selfie[0][2]['with'][1:] in names:
        mate, me = names[selfie[0][2]['with'][1:]], names[entry['who']]['name']
        if mate['_pet']:
            part = "['tiltHead']"
        else: part = f"['joinSelfie', {me}, {js(selfie[0][1] if isinstance(selfie[0][1], (int, float)) else 1.6)}]"
        code = '{ together: [' + code + f", [{mate['name']}, {part}]] }}"
        emitted[0] += 1
    # `["giveTreat", "@con vật"]` một mình: con vật NHAI miếng bánh / viên thuốc vừa đớp — đúng lúc nó biến khỏi tay
    # người (~1 s sau khi bước bắt đầu). Không thì bánh biến mất mà không ai ăn (Gemini soát cảnh thử đợt 13).
    fed = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'giveTreat' and isinstance(step[1], str) and step[1].startswith('@')]
    fed = [name for name in fed if name in names and names[name]['_pet']]
    if fed and not pets and 'say' not in entry and code.startswith('['):
        lead = sum(1 for step in entry.get('do', []) if not (isinstance(step, list) and step and step[0] == 'giveTreat'))
        if lead == 0:
            code = '{ together: [' + code + f", [{names[fed[0]]['name']}, 0.95, ['chew', 3]]] }}"
            emitted[0] += 1
    # `["givePill", "@con vật"]` một mình (đợt 35): con vật HÁ MIỆNG từ ~0,45 s (há hẳn ~0,75 s, giữ tới ~1,85 s — ≥ 0,8 s quanh lúc
    # viên thuốc vào môi 1,0 s, mất 1,15 s), rồi NHAI 3 nhịp. Đợt 36, lượt hai: tay đỡ của người nâng lên cằm thật lúc miệng khép
    # (`RigSVG.PILL_SHUT` = 1,6 s của bước người).
    pilled = [step[1][1:] for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'givePill' and isinstance(step[1], str) and step[1].startswith('@')]
    pilled = [name for name in pilled if name in names and names[name]['_pet']]
    if pilled and not fed and not pets and 'say' not in entry and code.startswith('[') and all(isinstance(step, list) and step and step[0] == 'givePill' for step in entry.get('do', [])):
        code = '{ together: [' + code + f", [{names[pilled[0]]['name']}, 0.35, ['openMouth', 1.1], ['chew', 3]]] }}"
        emitted[0] += 1
    # ĐỢT 42 F — `["bathPet", "@con vật"]`: người đứng lùi ra `BATH_BACK` đơn vị khung sau bước ấy (con vật rũ nước theo kênh của người — không ghép bước).
    bathed = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'bathPet' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']]
    if bathed and not names[entry['who']]['_pet']:
        bather, tub_pet = names[entry['who']], names[bathed[0][1][1:]]
        bather['x'] = float(bather['x']) - (1 if float(tub_pet['x']) + tub_pet.get('_drop', 0) >= float(bather['x']) else -1) * BATH_BACK * bather['_unit']
    # `["lick", "@người"]` một mình (đợt 35): người ấy CHÌA TAY ra trước mõm cùng lúc (`offerHand`) — không thì con vật liếm
    # không khí. Đang bế con vật thì thôi: nó liếm mặt người bế. Bối cảnh 3D, người đứng, con vật dưới sàn: quỳ xuống trước.
    # đợt 40 C — `struggle` khi đang được bế: báo cho rig ({ carried: true }) — lúc dựng bước, hình con vật có thể chưa nằm trong tay.
    if names[entry['who']]['_pet'] and any(step == 'struggle' or (isinstance(step, list) and step and step[0] == 'struggle' and len(step) < 3) for step in entry.get('do', [])) and entry['who'] in arms.values():
        for step in entry['do']:
            if step == 'struggle' or (isinstance(step, list) and step and step[0] == 'struggle' and len(step) < 3):
                code = code.replace(step_code(st, step, where, entry['who']), step_code(st, ['struggle', step[1] if isinstance(step, list) and len(step) > 1 else 1.6, {'carried': True}], where, entry['who']), 1)
    licked = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] == 'lick' and isinstance(step[1], str) and step[1].startswith('@')]
    if licked and names[entry['who']]['_pet']:
        person = names.get(licked[0][1][1:])
        if not person or person['_pet']: fail(f'{where}: "lick" licks a person — "{licked[0][1]}" is not a person in the scene')
    if licked and names[entry['who']]['_pet'] and arms.get(licked[0][1][1:]) == entry['who'] and len(licked[0]) < 4:
        # Trong vòng tay người ấy: liếm MẶT — báo cho rig (lúc dựng bước, hình con vật có thể chưa nằm trong tay).
        times = licked[0][2] if len(licked[0]) > 2 else 5          # đợt 40 C: 4 → 5 cái liếm
        code = code.replace(step_code(st, licked[0], where, entry['who']), step_code(st, licked[0][:2] + [times, {'face': True}], where, entry['who']), 1)
        # Người bế GHÉ MÁ xuống cho nó liếm cùng lúc (đợt 35, lượt hai: mèo trong tay rướn cổ mà không tới mặt).
        if 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
            code = '{ together: [' + code + f", [{names[licked[0][1][1:]]['name']}, ['offerCheek', {round(0.6 + times * LICK_BEAT, 2)}]]] }}"
            emitted[0] += 1
    if licked and names[entry['who']]['_pet'] and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
        person = names.get(licked[0][1][1:])
        if arms.get(person['name']) != entry['who']:
            times = licked[0][2] if len(licked[0]) > 2 and isinstance(licked[0][2], (int, float)) else 5
            low = stage_set is not None and not person.get('seated') and not names[entry['who']].get('on')      # lượt bốn: quỳ xuống ngang mõm con vật (chồm lên thì lơ lửng)
            hand = step_code(st, ['offerHand', '@' + entry['who'], round(0.9 + times * LICK_BEAT, 2)], where, person['name'])
            lead = 0.65 if low else 0.6          # lượt bốn: bàn tay tới trước mõm rồi con vật mới liếm (tay không bật ra giữa lúc liếm)
            pet_code = code if not lead else code.replace(f"[{names[entry['who']]['name']}, ", f"[{names[entry['who']]['name']}, {lead}, ", 1)
            code = '{ together: [' + pet_code + f", [{person['name']}, " + ("'kneel', " if low else '') + hand + (", 'standUp'" if low else '') + ']] }'
            gear_ops.append({'turn': emitted[0] + 1, 'kind': 'offerHand', 'who': person['name'], 'target': entry['who']})
            emitted[0] += 1
    # ĐỢT 40 A — `["tugOfWar", "@người"]` một mình: người ấy giữ đầu kia sợi dây cùng lúc (`pullToy`); lỗi rõ khi đích không phải người.
    tugged = [step for step in entry.get('do', []) if isinstance(step, list) and len(step) > 1 and step[0] in ('tugOfWar', 'leanOnLeg') and isinstance(step[1], str)] if isinstance(entry, dict) and isinstance(entry.get('do'), list) else []
    for step in tugged:
        if not names[entry['who']]['_pet']: fail(f'{where}: "{step[0]}" is a dog\'s action — "{entry["who"]}" is a person')
        person = names.get(step[1][1:]) if step[1].startswith('@') else None
        if not person or person['_pet']: fail(f'{where}: "{step[0]}" needs a person: ["{step[0]}", "@<person name>"] — got {js(step)}')
        if stage_set is not None and abs(float(person.get('z', -300)) - float(names[entry['who']].get('z', -300))) > 60:
            reach_notes.append(f'{where}: "{entry["who"]}" does "{step[0]}" with "{step[1][1:]}", which stands at z {float(person.get("z", -300)):g} — {abs(float(person.get("z", -300)) - float(names[entry["who"]].get("z", -300))):g} units nearer or further than the dog (z {float(names[entry["who"]].get("z", -300)):g}); the dog and the person are drawn in separate planes: give them the same z (within 60)')
    if tugged and tugged[0][0] == 'tugOfWar' and 'say' not in entry and code.startswith('[') and len(entry.get('do', [])) == 1:
        person = names[tugged[0][1][1:]]
        hold = tugged[0][2] if len(tugged[0]) > 2 and isinstance(tugged[0][2], (int, float)) and not isinstance(tugged[0][2], bool) else 2.4
        code = '{ together: [' + code + f", [{person['name']}, ['pullToy', {names[entry['who']]['name']}, {js(hold)}]]] }}"
        emitted[0] += 1
    code = leash49c.pet_part(code, entry, names, emitted)          # đợt 49 C: con vật được dắt bước cùng lúc
    code = feed50c.pet_part(code, entry, names, emitted)          # đợt 50 C: con vật tới bát ăn / bước ra khỏi lồng cùng lúc
    turns.append((None, code))
    emitted[0] += 1
