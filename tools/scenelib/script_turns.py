"""Phase 4 of a build: walk the script — each entry becomes turns of the conversation (with approach, back-off and camera views).
One long loop: its parts share many per-entry variables (backs, turned_back, first_turn…) and `continue` out of the entry,
so it is kept whole here rather than split into functions."""
import os
from .actions import (BATH_BACK, CARE_REACH, HANDS_ON_CARE, HANDS_ON_GAP, HANDS_ON_HEAD, HANDS_ON_HOLD, CARE_ACTIONS, CHART_ACTIONS, CONE_BACK, DESK_ACTIONS,
    DESK_PAY, FLOOR_ACTIONS, FLOOR_GAP, FLOOR_GAP_KID, GESTURES, KID_IDS, LICK_BEAT, WHOLE_BODY, PAIR_PARTNER, PAIR_GAP, PAY_REACH, PET_ACTS,
    PET_CLOSE, PET_CLOSE_FILL, PET_CLOSE_FILLS, PICK_GAP, PILL_HEAD, PREP_ACTIONS, REACH_ACTIONS, RESTRAIN, RESTRAIN_GAP, RUN_GAP, RUN_TO,
    PRESENTER_ACTIONS, TUG_SNOUT, TUG_STAND)
from .camera import pet_group_fill
from .floor import floor_turn, restore_seated
from .schema import CAT_BREEDS, CAT_SPECIES, SCREEN_KINDS, SHOW_KEYS
from .steps import desk_counter, desk_stand, showxray_listener, step_code, turn_code
from .util import fail, js, known
from .views import beat_of, plane_of, view_of


def write_turns(st):
    """Every script entry → the turns of the conversation: approach / back off, camera views, beats of the auto director, side effects."""
    arms, base, beats, director, emitted, flat = st.take('arms', 'base', 'beats', 'director', 'emitted', 'flat')
    gear_ops, holding, lamp_ops, layout, names, popups = st.take('gear_ops', 'holding', 'lamp_ops', 'layout', 'names', 'popups')
    power_ops, reach_notes, script, shows, sky_ops, speakers = st.take('power_ops', 'reach_notes', 'script', 'shows', 'sky_ops', 'speakers')
    stage_set, toasts, turns, views = st.take('stage_set', 'toasts', 'turns', 'views')
    for index, entry in enumerate(script):
        where = f'script[{index}]'
        # TRỞ LẠI góc máy trước (view có "back"): cắt về đúng nó ở lượt đầu tiên của mục sau — trừ khi mục ấy tự có "view".
        if views and views[-1].get('back') and not views[-1].get('back_done'):
            views[-1]['back_done'] = True
            if not (isinstance(entry, dict) and 'view' in entry):
                before = views[-2] if len(views) > 1 else None
                views.append(dict(before, turn=emitted[0], cut=True, back=False, back_done=True, returned=True) if before else {'turn': emitted[0], 'start': True, 'values': {}, 'wide': False, 'cut': True, 'dur': 1.5, 'ease': 'sine.inOut', 'where': where, 'back': False})
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'show' not in turn: continue
            show = turn['show']
            if layout != 'presenter': fail(f'{where}: "show" needs "layout": "presenter" at the top of the scene file')
            if show is False or show is None: shows.append({'turn': flat, 'clear': True}); continue
            if not isinstance(show, dict) or not show: fail(f'{where}: "show" must be an object with "title", "bullets" and / or "image", or false to clear the panel')
            known(f'{where}.show', show, SHOW_KEYS)
            if 'bullets' in show and (not isinstance(show['bullets'], list) or not all(isinstance(item, str) for item in show['bullets'])): fail(f'{where}: "show.bullets" must be a list of strings')
            if 'image' in show and not os.path.isfile(os.path.join(base, show['image'])): fail(f'{where}: show.image not found: {show["image"]} (looked in {base})')
            shows.append(dict(show, turn=flat))
        flat += len(entry['together']) + len(entry.get('_narrator_turns', [])) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else 1
        backs = []                                          # (người, quãng) — lùi lại sau lượt này
        turned_back = []                                    # (con vật, người) — con vật quay lại nhìn người ấy sau lượt này (takeTemp)
        first_turn = emitted[0]                             # nhịp của đạo diễn tự động: gồm cả các bước lại gần / lùi lại
        # LẠI GẦN trước khi vuốt ve / đưa đồ: tay nhân vật ngắn (với tới chừng 0,2 × chiều cao host). Đích đứng xa hơn tầm
        # ấy thì chèn một lượt bước tới trước — người vuốt ve dừng cách con vật 0,24 × chiều cao, người đưa đồ dừng cách
        # người nhận 0,45 × chiều cao (hai cánh tay cùng vươn). Chỗ đứng mới được ghi lại cho các lượt sau.
        # ĐỢT 40 A — KÉO CO: con chó đi tới cách người một sợi dây (mõm cách giữa người `TUG_STAND` × chiều cao) rồi mới ngậm dây; đứng sai chỗ thì dây
        # quá dài hay con chó chồm lên chân người.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or turn.get('who') not in names or not names[turn['who']]['_pet'] or not isinstance(turn.get('do'), list): continue
            for step in turn['do']:
                # Động tác TỰ đi của con chó (dựa chân, tha đồ chơi tới người / đi một quãng): ghi lại chỗ nó đứng sau đó, cho lượt kéo co sau nó tính đúng.
                if isinstance(step, list) and step and step[0] in ('leanOnLeg', 'carryToy'):
                    pet, aim = names[turn['who']], (names.get(step[1][1:]) if len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None)
                    if aim and not aim['_pet']:
                        px = float(aim['x']) + aim.get('_drop', 0)
                        side = 1 if px >= float(pet['x']) + pet.get('_drop', 0) else -1
                        pet['x'] = px - side * (0.085 * 0.96 * aim['_host_height'] + 78 * pet['_unit']) if step[0] == 'leanOnLeg' else px - side * (0.13 * 0.96 * aim['_host_height'] + 88 * pet['_unit'])
                    elif step[0] == 'carryToy' and len(step) > 1 and isinstance(step[1], (int, float)) and not isinstance(step[1], bool):
                        face = names.get(pet.get('faces')) if pet.get('faces') else None
                        pet['x'] = float(pet['x']) + (1 if not face or float(face['x']) >= float(pet['x']) else -1) * float(step[1]) * pet['_unit']
                if not (isinstance(step, list) and len(step) > 1 and step[0] == 'tugOfWar' and isinstance(step[1], str) and step[1][1:] in names): continue
                pet, person = names[turn['who']], names[step[1][1:]]
                if person['_pet']: fail(f'{where}: "tugOfWar" is with a person who holds the other end of the rope — "{step[1]}" is a pet')
                px = float(person['x']) + person.get('_drop', 0)
                side = 1 if px >= float(pet['x']) + pet.get('_drop', 0) else -1
                want = px - side * TUG_STAND * 0.96 * person['_host_height'] - side * TUG_SNOUT * pet['_unit']
                move = want - (float(pet['x']) + pet.get('_drop', 0))
                if abs(move) > 0.03 * person['_host_height']:
                    turns.append((f'  // {pet["name"]} goes a rope\'s length from {person["name"]} for the "tugOfWar"', f"[{pet['name']}, ['walk', 4, {round(move / pet['_unit'])}]]"))
                    emitted[0] += 1
                    pet['x'] = float(pet['x']) + move
        undo_seated = []
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            restore_seated(undo_seated)
            if not isinstance(turn, dict) or turn.get('who') not in names: continue
            who = names[turn['who']]
            if who['_pet']: continue
            floor_turn(who, turn, undo_seated)          # ĐỢT 42 E: đang ngồi bệt / nằm — như người ngồi (con vật đi tới, không tự quỳ)
            # QUỲ XUỐNG với con vật dưới SÀN (vuốt ve, cho ăn, khám, chải lông): người đứng thẳng thì tay chỉ tới lưng gần đuôi
            # con chó, không tới đầu — người thật sẽ ngồi xuống (đợt 28: tay cách đầu chó 12 % chiều cao người, đo bằng
            # tools/acting_check.py). Người đang ngồi, hay đã tự quỳ trong lượt ấy, thì thôi.
            steps = turn.get('do') if isinstance(turn.get('do'), list) else []
            low = [step for step in steps if isinstance(step, list) and len(step) > 1 and step[0] in ('stroke', 'giveTreat', 'examine', 'brush', 'takeTemp', 'givePill', RESTRAIN) + CARE_ACTIONS + HANDS_ON_CARE
                   and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet'] and not names[step[1][1:]].get('on')]
            if stage_set is not None and low and not who.get('seated') and 'kneel' not in steps and not any(isinstance(step, list) and step and step[0] == 'kneel' for step in steps):
                turn['do'] = ['kneel'] + steps + ['standUp']
            # ĐỢT 39 A: quét QR / quẹt thẻ — đứng cách đế thanh toán `PAY_REACH` × chiều cao (phía mình đang đứng); lau quầy — đứng trước mặt quầy (trong bề ngang của nó).
            for step in (turn.get('do') or []) if isinstance(turn.get('do'), list) else []:
                nm = step if isinstance(step, str) else step[0] if isinstance(step, list) and step and isinstance(step[0], str) else None
                if nm not in DESK_PAY + ('wipeCounter',) or who.get('seated') or (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')): continue
                if nm in DESK_PAY:
                    found = desk_stand(st, who, step[1] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) else None)
                    if not found: continue
                    wanted_x = found[0] + (1 if float(who['x']) >= found[0] else -1) * PAY_REACH * who['_host_height']
                else:
                    counter = desk_counter(st, who)
                    if not counter: continue
                    wanted_x = counter[0]
                move = wanted_x - float(who['x'])
                if abs(move) > 0.04 * who['_host_height']:
                    turns.append((f'  // {who["name"]} steps up to the {"pay stand" if nm in DESK_PAY else "counter"} for "{nm}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + move
            # ĐỢT 42 E: NHẶT đồ chơi cạnh một con vật (`["pickUp", "@cho"]`): bước lại cho món đồ (cạnh chân trước nó, phía người) vào tầm tay lúc ngồi
            # xổm — giữa người cách giữa con vật `PICK_GAP` × chiều cao người, ở phía đang đứng.
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] == 'pickUp' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
                pet = names[step[1][1:]]
                px = float(pet['x']) + pet.get('_drop', 0)
                move = px + (1 if float(who['x']) >= px else -1) * PICK_GAP * who['_host_height'] - float(who['x'])
                if abs(move) > 0.04 * who['_host_height']:
                    turns.append((f'  // {who["name"]} steps up to {step[1][1:]} to "pickUp" the toy by it', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + move
            # ĐỢT 39 C: chụp ảnh tự sướng cùng ai (`["takeSelfie", 1.6, { "with": "@boy" }]`): người kia bước lại sát người chụp (cùng phía họ
            # đang đứng, cách 0,3 × chiều cao trung bình) để cả hai vào một khung hình — máy chụp ở trên cao giữa hai đầu.
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if isinstance(step, list) and step and step[0] == 'takeSelfie' and len(step) > 2 and isinstance(step[2], dict) and isinstance(step[2].get('with'), str) and step[2]['with'][1:] in names:
                    mate = names[step[2]['with'][1:]]
                    side = 1 if float(mate['x']) >= float(who['x']) else -1
                    move = float(who['x']) + side * 0.3 * (who['_host_height'] + mate['_host_height']) / 2 - float(mate['x']) - mate.get('_drop', 0)
                    if abs(move) > 0.05 * who['_host_height'] and not mate.get('seated') and not mate.get('on'):
                        turns.append((f'  // {mate["name"]} steps up beside {who["name"]} for the "takeSelfie"', f"[{mate['name']}, ['walk', 4, {round(move / mate['_unit'])}]]"))
                        emitted[0] += 1
                        mate['x'] = float(mate['x']) + move
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] in ('stroke', 'handOver', 'listen', 'inject', 'carry', 'handshake', 'examine', 'giveTreat', 'brush', 'handOverPet', RESTRAIN) + CARE_REACH + CARE_ACTIONS + tuple(PAIR_PARTNER) and isinstance(step[1], str) and step[1][1:] in names): continue
                names[step[1][1:]].setdefault('_reachers', set()).add(who['name'])      # ai với tay tới nó (đặt chiều sâu con vật, đợt 32)
                # CON VẬT TỰ ĐI SANG MẶT PHẲNG NGƯỜI KẾ (đợt 34): người trước với tới nó ở chiều sâu khác (> 5 đơn vị) — nó sẽ dời chiều
                # sâu trước lượt này (`set.depth`, xem `pet_depths`). Không có lần cắt cảnh nào ở giữa thì nó TRƯỢT 0,45 s trên hình
                # (đứng yên mà trôi về phía máy). Chèn một bước đi ngắn của chính nó về phía người kế: `settleDepths` trải lần dời
                # theo bước đi ấy. Người kế ngồi thì nó vốn đi tới họ ("comes over") — chỉ ép bước ấy có, dù quãng ngắn.
                hop_pet = names[step[1][1:]]
                hop = None
                if stage_set is not None and hop_pet['_pet'] and not hop_pet.get('on') and step[0] in ('stroke', 'examine', 'giveTreat', 'brush', 'listen', 'inject', 'carry', RESTRAIN) + CARE_REACH + CARE_ACTIONS:
                    plane = plane_of(st, who)
                    if hop_pet.get('_plane') is not None and abs(plane - hop_pet['_plane']) > 5: hop = hop_pet
                    hop_pet['_plane'] = plane
                if hop is not None and not who.get('seated'):
                    toward = 1 if float(who['x']) >= float(hop['x']) + hop.get('_drop', 0) else -1
                    turns.append((f'  // {hop["name"]} walks over into {who["name"]}\'s plane for "{step[0]}" (it changes depth on the way)', f"[{hop['name']}, ['walk', 4, {toward * 40}]]"))
                    emitted[0] += 1
                    hop['x'] = float(hop['x']) + toward * 40 * hop['_unit']
                # Người đang NGỒI (ghế đá, ghế phòng chờ) không đứng dậy đi tới: con vật ĐI TỚI người (bế, vuốt ve…). Đích là
                # người thì thôi — người ngồi chỉ với tới chỗ mình.
                if who.get('seated') and not names[step[1][1:]]['_pet']: continue
                if stage_set is not None and abs(float(names[step[1][1:]].get('z', -300)) - float(who.get('z', -300))) > 60:
                    # Rig 2D chỉ vươn tay trong MẶT PHẲNG của chính nó: con vật / người nhận đứng gần máy hơn (hay xa hơn) thì
                    # trên màn hình nó thấp hơn (cao hơn) chỗ bàn tay với tới. Bước lại gần chỉ đi theo trục x.
                    reach_notes.append(f'{where}: "{who["name"]}" reaches for "{step[1][1:]}" ({step[0]}), which stands at z {float(names[step[1][1:]].get("z", -300)):g} — {abs(float(names[step[1][1:]].get("z", -300)) - float(who.get("z", -300))):g} units nearer or further than "{who["name"]}" (z {float(who.get("z", -300)):g}). A hand only reaches in its own plane: give them the same z (within 60)')
                # Con vật người NHẬN đã đặt xuống (`takePet` … `putDown`) đứng cạnh chân người ấy, không ở chỗ được bế lần đầu:
                # `_drop` (đơn vị phòng) — `x` chỉ là quãng nó tự đi (`s.x`, cho `at` / `petAt`) (đợt 30).
                gap = float(names[step[1][1:]]['x']) + names[step[1][1:]].get('_drop', 0) - float(who['x'])
                # GIỮ CON VẬT (đợt 38 B): đứng ở phía BÊN KIA con vật so với người làm cùng lúc (người tiêm / khám) — mỗi người một nửa thân
                # nó, tay không chồng lên tay, không ai đứng che đầu nó; không có người làm thì ở phía mình. Đi vòng sang nếu đang cùng phía.
                if step[0] == RESTRAIN and names[step[1][1:]]['_pet'] and not who.get('seated'):
                    pet = names[step[1][1:]]
                    pet_x = float(pet['x']) + pet.get('_drop', 0)
                    partner = next((names[other['who']] for other in (entry.get('together') or [] if isinstance(entry, dict) else []) if isinstance(other, dict) and other is not turn
                                    and other.get('who') in names and not names[other['who']]['_pet'] and any(isinstance(item, list) and len(item) > 1 and item[1] == step[1] for item in other.get('do') or [])), None)
                    side = (-1 if float(partner['x']) > pet_x else 1) if partner else (1 if float(who['x']) >= pet_x else -1)
                    if partner and abs(float(partner['x']) - pet_x) < 0.02 * who['_host_height']: side = 1 if float(who['x']) >= pet_x else -1
                    move = pet_x + side * RESTRAIN_GAP * who['_host_height'] - float(who['x'])
                    if abs(move) > 0.04 * who['_host_height']:
                        how = 'goes round to the other side of' if (float(who['x']) - pet_x) * side < 0 else 'steps up to'
                        turns.append((f'  // {who["name"]} {how} {step[1][1:]} to "restrain" it', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                        emitted[0] += 1
                        who['x'] = float(who['x']) + move
                    continue
                # Đưa đồ: hai bàn tay gặp nhau ở giữa như bắt tay (0,28 — đợt 29: 0,45 để tay cách tay 20 % chiều cao); trao con vật
                # đang bế: 0,34 (0,42: 7,8 %); bắt tay: 0,22; chạm tới con vật: gần như vuốt ve.
                # Soi đèn / đưa bánh thưởng tới ĐẦU con vật (cao hơn thân, xa vai hơn): đứng sát hơn nữa (0,16), không thì tay
                # chibi chỉ chĩa về phía đầu mà không tới — đèn soi rọi vào thành bàn.
                # Bắt tay 0,22: mỗi cánh tay chibi chỉ vươn ~0,09 chiều cao — đứng 0,38 thì hai bàn tay cách nhau 24 % chiều cao
                # (đo bằng tools/acting_check.py, đợt 28).
                wanted = {'handOver': 0.28, 'handOverPet': 0.34, 'handshake': 0.22, 'examine': 0.2, 'giveTreat': 0.16, 'givePill': 0.18, 'takeTemp': 0.19, 'bandage': 0.16, 'putCone': 0.24}.get(step[0], 0.24) * who['_host_height']
                target = names[step[1][1:]]
                # HAI NGƯỜI (đợt 38 C): khoảng cách theo chiều cao trung bình hai người; đập tay theo người THẤP hơn (trẻ con tay ngắn, đứng sát hơn).
                if step[0] in PAIR_GAP and not target['_pet']: wanted = PAIR_GAP[step[0]] * (min(who['_host_height'], target['_host_height']) if step[0] == 'highFive' else (who['_host_height'] + target['_host_height']) / 2)
                # CHO UỐNG THUỐC con chó / thỏ (đợt 36 — Gemini: "chỉ một tay gần mõm, không thấy viên thuốc" ở cảnh corgi): thân dài, ĐẦU
                # nằm ở đầu gần người (nó quay mặt về người) — đứng 0,18 tính từ GIỮA thân là đứng đè lên đầu nó, hai bàn tay chồng lên
                # nhau trước ngực người. Cộng thêm quãng từ giữa thân tới đầu (~0,15 chiều cao host của nó); mèo ngồi thì đầu trên ngực.
                if step[0] == 'givePill' and target['_pet'] and str(target.get('species', '')) not in CAT_SPECIES and not who.get('seated'):
                    wanted += PILL_HEAD * target['_host_height']
                # BĂNG CHÂN (đợt 35, lượt hai): đứng ngang CHÂN TRƯỚC con vật (về phía đầu nó, ~0,2 × chiều cao host của nó), không ngang
                # giữa thân — tay phía xa của người chibi không với tới chân trước, bàn tay giữ dừng ở bụng con chó (đo trên ảnh).
                # ĐỢT 38 A: cắt móng / nhỏ mắt / lau tai / quét chip — đứng ở PHÍA ĐẦU con vật (như băng chân), sát đầu nó: hai tay cùng tới
                # chân trước, cằm, tai, gáy mà không vắt qua thân nó.
                if step[0] in HANDS_ON_CARE and target['_pet'] and not who.get('seated'):
                    head = -1 if target.get('faces') in names and float(names[target['faces']]['x']) < float(target['x']) else 1
                    reach_x = float(target['x']) + target.get('_drop', 0) + head * (0.08 if str(target.get('species', '')) in CAT_SPECIES else HANDS_ON_HEAD) * target['_host_height']
                    move = reach_x + head * HANDS_ON_GAP[step[0]] * (1 if target.get('on') else 0.6) * who['_host_height'] - float(who['x'])      # quỳ với con vật dưới sàn: vai thấp, tay ngắn — sát hơn
                    if abs(move) > 0.03 * who['_host_height']:
                        turns.append((f'  // {who["name"]} goes to the head end of {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                        emitted[0] += 1
                        who['x'] = float(who['x']) + move
                    continue
                if step[0] == 'bandage' and target['_pet'] and not who.get('seated'):
                    # Lượt ba: đứng ở PHÍA ĐẦU con vật (sang bên ấy nếu đang ở phía đuôi) — từ phía đuôi hai cánh tay vắt qua thân nó (người
                    # vẽ trước con vật): con chó chỉ thấy 57 % (cảnh CI `care`); lượt hai đưa con vật lên trước thì tay "lồng ra sau nó".
                    head = -1 if target.get('faces') in names and float(names[target['faces']]['x']) < float(target['x']) else 1
                    leg = float(target['x']) + target.get('_drop', 0) + head * 0.2 * target['_host_height']
                    move = leg + head * wanted - float(who['x'])
                    if abs(move) > 0.05 * who['_host_height']:
                        turns.append((f'  // {who["name"]} goes round to the head end of {step[1][1:]} for "bandage"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                        emitted[0] += 1
                        who['x'] = float(who['x']) + move
                    continue
                # Vuốt / chải con vật TRÊN BÀN (đợt 31): đứng sát như khám (0,16) — 0,24 thì bé chỉ với tới mép bàn cạnh đuôi con
                # mèo (tay cách hình nó, không chạm — acting_check đo tiếp xúc bằng pixel).
                if step[0] in ('stroke', 'brush') and target['_pet'] and target.get('on') and not who.get('seated'): wanted = 0.16 * who['_host_height']
                # Người NGỒI quay 3/4 về phía con vật (xem `state.facing` của người ngồi): đầu gối chìa ra phía ấy — con vật dừng xa
                # hơn một chút, không thì nó đứng khuất sau hai đầu gối (đợt 29: con mèo tới cạnh bà trên sofa).
                # Con vật dưới sàn tới người NGỒI (đợt 31): đứng TRƯỚC ống chân người ấy (lớp vẽ trên, `over` — xem `_front`),
                # sát đầu gối (0,22). Đợt 29–30 nó dừng xa hơn (0,3) mà vẫn sau hai ống chân, cùng lớp với người: bà trên sofa phải
                # cúi 40° qua đầu gối, con mèo khuất 34 % sau ống chân và bàn tay; tay ông ghế đá khuất hẳn sau mặt con chó.
                if who.get('seated') and target['_pet'] and stage_set is not None and not target.get('on'):
                    wanted = ((FLOOR_GAP_KID if who.get('id') in KID_IDS else FLOOR_GAP) if who.get('_on_floor') else 0.22) * who['_host_height']
                    # BÊN NÀO (đợt 31): bên con vật đi tới — không vòng qua trước hai ống chân người ngồi. Phía ĐẦU GỐI: nó vẽ TRÊN người
                    # (`over`, không khuất sau ống chân), tay đặt lên đỉnh đầu ('crown'). Phía HÔNG (không có chân che): người vẽ trước
                    # như thường, tay đặt lên đỉnh đầu ('top', 15 % xuống) — nhắm giữa mặt thì bàn tay che mất mặt nó (đo: đầu mèo lộ 57 %),
                    # nhắm lưng thì người ngồi cúi 25° vẫn không tới lưng con chó thấp.
                    knees = (1 if float(names[who['faces']]['_x0']) > float(who['_x0']) else -1) if who.get('faces') else (1 if float(who['_x0']) < 0 else -1)
                    side = 1 if float(target['x']) + target.get('_drop', 0) >= float(who['x']) else -1
                    if side == knees: target['_front'] = who
                    else: target['_back'] = who
                    pet = target
                    move = float(pet['x']) + pet.get('_drop', 0) - (float(who['x']) + side * wanted)
                    if abs(move) > 0.05 * who['_host_height'] or hop is pet:
                        turns.append((f'  // {pet["name"]} comes over to {who["name"]} (seated) for "{step[0]}"', f"[{pet['name']}, ['walk', 4, {round(-move / pet['_unit'])}]]"))
                        emitted[0] += 1
                        pet['x'] = float(pet['x']) - move
                    continue
                if not target['_pet'] and not who.get('seated') and not target.get('seated') and abs(gap) < wanted - (0.04 if step[0] in PAIR_GAP else 0.12) * who['_host_height']:      # hai người (đợt 38 C): đầu chibi to — sát hơn 4 % là hai đầu chồng nhau
                    # QUÁ SÁT người kia (bắt tay, đưa đồ): hai người chồng lên nhau, tay khuất sau thân (cảnh thử đợt 28: bé vừa
                    # vuốt mèo xong đứng đè lên bác sĩ, bắt tay mà không thấy tay) — lùi ra cho đủ tầm hai cánh tay.
                    away = (wanted - abs(gap)) * (-1 if gap > 0 else 1)
                    turns.append((f'  // {who["name"]} steps back from {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(away / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + away
                    continue
                if step[0] == 'givePill' and target['_pet'] and not who.get('seated') and abs(gap) < wanted - 0.04 * who['_host_height']:
                    # Đợt 36: QUÁ SÁT đầu con vật để cho thuốc — lùi ra cho đủ chỗ hai bàn tay (cằm / môi) thấy riêng từng cái.
                    away = (wanted - abs(gap)) * (-1 if gap > 0 else 1)
                    turns.append((f'  // {who["name"]} steps back from {step[1][1:]} for "givePill"', f"[{who['name']}, ['walk', 4, {round(away / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + away
                    continue
                if abs(gap) <= wanted + 0.05 * who['_host_height']: continue
                move = (abs(gap) - wanted) * (1 if gap > 0 else -1)
                if target['_pet'] and not who.get('seated'):
                    # NHƯỜNG CHỖ: một người khác (đứng, cùng độ sâu) đang ở đúng chỗ sắp tới bên con vật — người ấy lùi ra trước,
                    # không thì hai người đứng đè lên nhau, tay người mới chỉ chạm mép bàn (cảnh thử đợt 28: bé vuốt mèo trên bàn
                    # khám đứng lẫn vào bác sĩ).
                    spot = float(who['x']) + move
                    for other in names.values():
                        if other is who or other['_pet'] or other.get('seated') or abs(float(other.get('z', -300)) - float(who.get('z', -300))) > 60: continue
                        if abs(float(other['x']) - spot) >= 0.3 * who['_host_height']: continue
                        # Lùi về phía xa con vật hơn — sang hẳn bên kia chỗ đứng mới, chừa khoảng cho hai thân người.
                        side = -1 if float(target['x']) + target.get('_drop', 0) > spot else 1
                        aside = spot + side * 0.4 * max(who['_host_height'], other['_host_height']) - float(other['x'])
                        turns.append((f'  // {other["name"]} makes room for {who["name"]} by {step[1][1:]}', f"[{other['name']}, ['walk', 4, {round(aside / other['_unit'])}]]"))
                        emitted[0] += 1
                        other['x'] = float(other['x']) + aside
                if who.get('seated'):
                    # Con vật đi tới người ngồi (cảnh thử đợt 11: bà cụ trên ghế đá bế con mèo đứng sau ghế — con mèo
                    # "nhảy" vào lòng trong 0,6 s vì nó ở ngoài tầm tay).
                    pet = names[step[1][1:]]
                    turns.append((f'  // {pet["name"]} comes over to {who["name"]} (seated) for "{step[0]}"', f"[{pet['name']}, ['walk', 4, {round(-move / pet['_unit'])}]]"))
                    emitted[0] += 1
                    pet['x'] = float(pet['x']) - move
                    continue
                turns.append((f'  // {who["name"]} steps closer to {step[1][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                emitted[0] += 1
                who['x'] = float(who['x']) + move
                # Soi đèn / đưa bánh: người đứng SÁT con vật (0,16) — xong thì LÙI về chỗ cũ, không thì người (vẽ trước con
                # vật đứng cạnh mình) che mất mặt nó suốt phần sau của cảnh (cảnh thử đợt 12: góc cận chó chỉ thấy tay bác sĩ).
                # Cho thuốc (đợt 35, lượt bốn): KHÔNG lùi — bước lùi nằm trong nhịp máy của lượt ấy, góc cận phải chứa người ở cả hai chỗ
                # đứng thành gần góc toàn (mặt con mèo 13 % khung).
                # Băng chân / đeo loa (đợt 35, lượt hai): KHÔNG lùi lại — người làm ở lại cạnh con vật nói tiếp; bước lùi giữa góc trung
                # đưa người ra khỏi mép khung (Gemini: bác sĩ lẹm mép trái lúc đi ra, 00:42).
                if step[0] in ('examine', 'giveTreat'): backs.append((who, -move))
            # ĐO NHIỆT ĐỘ (đợt 35): con vật QUAY ĐUÔI về phía người đo trước lượt ấy (nhiệt kế vào thân sau), quay lại sau lượt.
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if not (isinstance(step, list) and len(step) > 1 and step[0] == 'takeTemp' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
                pet = names[step[1][1:]]
                away = 'right' if float(pet['x']) + pet.get('_drop', 0) >= float(who['x']) else 'left'
                turns.append((f'  // {pet["name"]} turns its tail to {who["name"]} for "takeTemp"', f"[{pet['name']}, ['face', {js(away)}]]"))
                emitted[0] += 1
                turned_back.append((pet, who))
        restore_seated(undo_seated)
        if layout == 'split':
            talker = next((turn for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]) if isinstance(turn, dict) and turn.get('say') and turn.get('who') in names), None)
            speakers.append((emitted[0], names[talker['who']]['side'] if talker else None))      # lượt không lời: cả hai nửa sáng
        # THÔNG BÁO TRÊN MÀN HÌNH đạo cụ (`"popup"`): màn hình để bàn / laptop quay ra người xem trong bối cảnh 3D, gọi theo tên.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'popup' not in turn: continue
            pop = turn['popup']
            if stage_set is None: fail(f'{where}: "popup" shows a notification on a screen in a 3D set — add "set" with a named "monitor" or "laptop" cutout')
            if not isinstance(pop, dict) or set(pop) - {'on', 'title', 'text', 'hold'} or not pop.get('on') or not (pop.get('title') or pop.get('text')):
                fail(f'{where}: "popup" is {{ "on": "<cutout name>", "title": "…", "text": "…", "hold": 2.5 }} — got {js(pop)}')
            cutouts = stage_set.get('cutouts', [])
            index = next((i for i, item in enumerate(cutouts) if item.get('name') == pop['on']), None)
            if index is None: fail(f'{where}: "popup" names "{pop["on"]}", but no set.cutouts entry has "name": "{pop["on"]}"')
            screen_item = cutouts[index]
            if screen_item.get('kind') not in SCREEN_KINDS or (screen_item['kind'] == 'laptop' and screen_item.get('facing') != 'viewer'):
                fail(f'{where}: "popup" needs a screen the viewer sees — "{pop["on"]}" must be a "monitor", or a "laptop" with "facing": "viewer"')
            popups.append({'turn': emitted[0], 'cutout': index + 1, 'title': pop.get('title', ''), 'text': pop.get('text', ''), 'hold': float(pop.get('hold', 2.5))})
        # BẬT / TẮT ĐÈN (`"lamp"`): "on" / "off" (đèn đầu tiên), hay { "name": "…", "on": true, "dur": 0.6 } — đúng lúc lượt này bắt đầu.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'lamp' not in turn: continue
            if stage_set is None: fail(f'{where}: "lamp" switches a lamp of a 3D set — add "set" with "lamps" (or a "lamp" cutout)')
            spec = turn['lamp'] if isinstance(turn['lamp'], dict) else {'on': turn['lamp']}
            if spec.get('on') in ('on', 'off'): spec = dict(spec, on=spec['on'] == 'on')
            if not isinstance(spec, dict) or set(spec) - {'name', 'on', 'dur'} or spec.get('on') not in (True, False): fail(f'{where}: "lamp" is "on", "off" or {{ "name": "…", "on": true, "dur": 0.6 }} — got {js(turn["lamp"])}')
            # Người bật đèn bằng tay (lượt không lời, không động tác): đèn đổi đúng lúc tay chạm tới công tắc (~0,75 s).
            reach = turn['who'] in names and not names[turn['who']]['_pet'] and not turn.get('say') and not turn.get('do')
            lamp_ops.append({'turn': emitted[0], 'name': spec.get('name'), 'on': spec['on'], 'dur': float(spec.get('dur', 0.35 if reach else 0.6)), 'where': where, 'delay': 0.85 if reach else 0})
        # MẤT ĐIỆN / CÓ ĐIỆN (`"power": "off" | "on"`): mọi đèn và màn hình tắt phụt / bật lại (chớp) cùng lúc.
        # TRỜI CHUYỂN (`"sky": "night"` hay { "to": "night", "dur": 6 }): nắng tắt dần, phòng tối dần, tới giờ lên đèn thì đèn tự bật.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict): continue
            if 'power' in turn:
                if stage_set is None: fail(f'{where}: "power" switches every lamp of a 3D set — add "set"')
                if turn['power'] not in ('on', 'off'): fail(f'{where}: "power" is "on" or "off" — got {js(turn["power"])}')
                power_ops.append({'turn': emitted[0], 'on': turn['power'] == 'on', 'where': where})
            if 'sky' in turn:
                if stage_set is None: fail(f'{where}: "sky" changes the light of a 3D set — add "set"')
                spec = turn['sky'] if isinstance(turn['sky'], dict) else {'to': turn['sky']}
                if not isinstance(spec, dict) or set(spec) - {'to', 'dur'} or spec.get('to') not in ('day', 'evening', 'night'): fail(f'{where}: "sky" is "day", "evening", "night" or {{ "to": "night", "dur": 6 }} — got {js(turn["sky"])}')
                sky_ops.append({'turn': emitted[0], 'to': spec['to'], 'dur': float(spec.get('dur', 6))})
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
                                     **({'hold': step[2].get('hold', HANDS_ON_HOLD[step[0]][2]), 'id': step[2].get('id')} if step[0] in HANDS_ON_CARE and len(step) > 2 and isinstance(step[2], dict) else {}),
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
        # THẺ THÔNG BÁO trên khung (`"toast"`): gắn với lượt của chính mục này (sau các bước lại gần vừa chèn).
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or 'toast' not in turn: continue
            note = turn['toast'] if isinstance(turn['toast'], dict) else {'title': turn['toast']}
            if not isinstance(note, dict) or not isinstance(note.get('title', ''), str) or not isinstance(note.get('text', ''), str) or set(note) - {'title', 'text'} or not (note.get('title') or note.get('text')):
                fail(f'{where}: "toast" is a string, or {{ "title": "…", "text": "…" }} — got {js(turn["toast"])}')
            toasts.append({'turn': emitted[0], 'title': note.get('title', ''), 'text': note.get('text', '')})
        if isinstance(entry, dict) and 'together' in entry:
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
        else:
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
            turns.append((None, code))
            emitted[0] += 1
        for pet, who in turned_back:
            turns.append((f'  // {pet["name"]} turns back to {who["name"]}', f"[{pet['name']}, ['face', {who['name']}]]"))
            emitted[0] += 1
        # ĐEO LOA XONG (đợt 36 — Gemini: "đầu / tay bác sĩ che nửa con mèo và cái vòng" sau khi đeo): lùi ra một bước nhỏ khỏi con vật,
        # tay ở dáng nghỉ không còn vắt qua nó và cái loa thấy trọn.
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if not isinstance(turn, dict) or turn.get('who') not in names or names[turn['who']]['_pet'] or names[turn['who']].get('seated'): continue
            for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
                if isinstance(step, list) and len(step) > 1 and step[0] == 'putCone' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']:
                    who, pet = names[turn['who']], names[step[1][1:]]
                    backs.append((who, (1 if float(who['x']) >= float(pet['x']) else -1) * CONE_BACK * who['_host_height']))
        for who, move in backs:
            turns.append((f'  // {who["name"]} steps back after reaching close', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move
        if director:
            beat = beat_of(st, entry, first_turn, emitted[0] - 1)
            # Nhịp có người ĐI (walk): đổi góc sớm như nhịp có lời — giữ góc cũ đủ 2,5 s thì người đi ra khỏi khung, còn nửa cái
            # đầu ở mép (cảnh thử đợt 24).
            group = entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
            if any(isinstance(step, list) and step and step[0] == 'walk' for turn in group if isinstance(turn, dict) for step in (turn.get('do') or [])): beat['move'] = True
            # ĐỢT 42 D: chạy / nhảy / múa — góc TOÀN (cả người, bàn chân), đo cả ở đỉnh cú nhảy; chạy là nhịp có người đi, chạy tới ai thì lấy cả người ấy.
            moving = [(turn, step) for turn in group if isinstance(turn, dict) and turn.get('who') in names and not names[turn['who']]['_pet']
                      for step in (turn.get('do') or []) if (step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None) in WHOLE_BODY]
            if moving and beat.get('subjects') and not beat.get('fixed'):
                beat['size'] = 'full'; beat['body42d'] = True
                beat.pop('mid', None)
                beat['move'] = True             # như nhịp có người đi: đổi góc sau 1 s (không giữ góc cũ 2,5 s — cú nhảy đầu tiên lọt ra ngoài góc cận trước)
                for turn, step in moving:
                    for name in [names[turn['who']]['name']] + ([names[RUN_TO[id(step)]]['name']] if isinstance(step, list) and id(step) in RUN_TO else []):
                        if name not in beat['subjects']: beat['subjects'].append(name)
            # ĐỢT 44 B: NHẶT ĐỒ dưới sàn (`pickUp` không nhắm con vật — món đồ chơi): góc TOÀN người ấy, đổi góc sau 1 s và CẮT thẳng (không lia)
            # — góc trung của câu nói trước còn giữ lúc cúi nhặt thì món đồ ở ngoài đáy khung (`tidyToys` phải tự cho "view" góc toàn).
            people = [turn for turn in group if isinstance(turn, dict) and turn.get('who') in names and not names[turn['who']]['_pet']
                         and any(step == 'pickUp' or (isinstance(step, list) and step and step[0] == 'pickUp' and not (len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@'))) for step in (turn.get('do') or []))]
            if people and beat.get('subjects') and not beat.get('fixed'):
                beat['size'] = 'full'; beat['floor44b'] = True
                beat.pop('mid', None)
            beats.append(beat)
