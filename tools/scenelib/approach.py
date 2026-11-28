"""Phase 4 steps: walking up before a turn — the pets that walk on their own (lean, carry a toy, tug of war), and a person who kneels
to a pet on the floor, steps up to the pay stand / counter / a toy, joins a selfie, steps into reach (or back) of the pet or
person a hand reaches for, or has a pet turn its tail for the thermometer."""
from .actions import GROOM_TAIL_50C          # đợt 50 C
from .actions import (CARE_ACTIONS, CARE_REACH, DESK_PAY, FLOOR_GAP, FLOOR_GAP_KID, HANDS_ON_CARE, HANDS_ON_GAP, HANDS_ON_HEAD, KID_IDS,
    PAIR_GAP, PAIR_PARTNER, PAY_REACH, PICK_GAP, PILL_HEAD, RESTRAIN, RESTRAIN_GAP, TUG_SNOUT, TUG_STAND)
from . import shop50b          # đợt 50 B
from .schema import CAT_SPECIES
from .steps import desk_counter, desk_stand
from .util import fail, js
from .views import plane_of


def pets_walk_up(emitted, entry, names, turns, where):
    """Con chó tự đi (dựa chân, tha đồ chơi) và đi tới cách người một sợi dây trước khi kéo co (đợt 40 A)."""
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


def kneel_to_low_pet(names, stage_set, turn, who):
    """Quỳ xuống với con vật dưới sàn (vuốt ve, cho ăn, khám, chải lông) — người đứng thẳng thì tay chỉ tới lưng nó."""
    # QUỲ XUỐNG với con vật dưới SÀN (vuốt ve, cho ăn, khám, chải lông): người đứng thẳng thì tay chỉ tới lưng gần đuôi
    # con chó, không tới đầu — người thật sẽ ngồi xuống (đợt 28: tay cách đầu chó 12 % chiều cao người, đo bằng
    # tools/acting_check.py). Người đang ngồi, hay đã tự quỳ trong lượt ấy, thì thôi.
    steps = turn.get('do') if isinstance(turn.get('do'), list) else []
    low = [step for step in steps if isinstance(step, list) and len(step) > 1 and step[0] in ('stroke', 'giveTreat', 'examine', 'brush', 'takeTemp', 'givePill', RESTRAIN) + CARE_ACTIONS + HANDS_ON_CARE
           and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet'] and not names[step[1][1:]].get('on')]
    if stage_set is not None and low and not who.get('seated') and 'kneel' not in steps and not any(isinstance(step, list) and step and step[0] == 'kneel' for step in steps):
        turn['do'] = ['kneel'] + steps + ['standUp']


def walk_to_pay_stand(emitted, st, turn, turns, who):
    """Đợt 39 A: quét QR / quẹt thẻ — bước tới đế thanh toán; lau quầy — bước tới trước mặt quầy."""
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


def walk_to_pick_up(emitted, names, turn, turns, who):
    """Đợt 42 E: nhặt đồ chơi cạnh một con vật — bước lại cho món đồ vào tầm tay lúc ngồi xổm."""
    # ĐỢT 42 E: NHẶT đồ chơi cạnh một con vật (`["pickUp", "@cho"]`): bước lại cho món đồ (cạnh chân trước nó, phía người) vào tầm tay lúc ngồi
    # xổm — giữa người cách giữa con vật `PICK_GAP` × chiều cao người, ở phía đang đứng.
    for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
        if not (isinstance(step, list) and len(step) > 1 and step[0] == 'pickUp' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
        pet = names[step[1][1:]]
        px = float(pet['x']) + pet.get('_drop', 0)
        side, gap = 1 if float(who['x']) >= px else -1, PICK_GAP
        # đợt 50 C: nhặt cái bát đã đặt cho nó — đứng ở phía bát (trước mõm nó), không với qua người nó
        if any(isinstance(a, dict) and a.get('item') == 'bowl' for a in step[2:]) and '_bowl50c' in pet: side = 1 if pet['_bowl50c'] >= px else -1; px = pet['_bowl50c']; gap = PICK_GAP * 0.75
        move = px + side * gap * who['_host_height'] - float(who['x'])
        if abs(move) > 0.04 * who['_host_height']:
            turns.append((f'  // {who["name"]} steps up to {step[1][1:]} to "pickUp" the toy by it', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move


def join_selfie(emitted, names, turn, turns, who):
    """Đợt 39 C: người cùng chụp ảnh tự sướng bước lại sát người chụp, cả hai vào một khung hình."""
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


def walk_into_reach(backs, emitted, entry, names, reach_notes, st, stage_set, turn, turns, where, who):
    """Lại gần (hay lùi ra) cho đúng tầm tay trước các động tác chạm tới con vật / người kia; con vật đi tới người ngồi; nhường chỗ."""
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
        wanted = shop50b.handoff_gap(step, who, target, wanted)          # đợt 50 B: trao món hàng qua quầy — đứng xa hơn, hai mặt không chồng nhau
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
            # ĐỢT 50 C — sửa đợt 49 B: sấy / tỉa lông con THỎ DƯỚI SÀN — người quỳ ở phía đầu nó thì hai cánh tay vươn tới lưng vắt ngang qua
            # cái đầu to (che 42–63 % mặt nó). Quỳ ở phía ĐUÔI: tay tới lưng, gáy từ phía sau, mặt nó để trống.
            if step[0] in GROOM_TAIL_50C and 'rabbit' in str(target.get('species', '')) and not target.get('on'):
                head = target.setdefault('_head50c', head)          # nó quay mặt về phía người từ đầu cảnh — người đã sang phía đuôi thì vẫn hướng ấy
                tail_x = float(target['x']) + target.get('_drop', 0) - head * GROOM_TAIL_50C[step[0]] * target['_host_height']
                move = tail_x - head * 0.6 * HANDS_ON_GAP[step[0]] * who['_host_height'] - float(who['x'])
                if abs(move) > 0.03 * who['_host_height']:
                    turns.append((f'  // {who["name"]} goes to the tail end of {step[1][1:]} for "{step[0]}" (its face stays clear)', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
                    emitted[0] += 1
                    who['x'] = float(who['x']) + move
                continue
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


def turn_tail_for_temp(emitted, names, turn, turned_back, turns, who):
    """Đo nhiệt độ (đợt 35): con vật quay đuôi về phía người đo trước lượt ấy (quay lại sau lượt)."""
    # ĐO NHIỆT ĐỘ (đợt 35): con vật QUAY ĐUÔI về phía người đo trước lượt ấy (nhiệt kế vào thân sau), quay lại sau lượt.
    for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
        if not (isinstance(step, list) and len(step) > 1 and step[0] == 'takeTemp' and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
        pet = names[step[1][1:]]
        away = 'right' if float(pet['x']) + pet.get('_drop', 0) >= float(who['x']) else 'left'
        turns.append((f'  // {pet["name"]} turns its tail to {who["name"]} for "takeTemp"', f"[{pet['name']}, ['face', {js(away)}]]"))
        emitted[0] += 1
        turned_back.append((pet, who))
