"""Phase 4 of a build: walk the script — each entry becomes turns of the conversation (with approach, back-off and camera views).
`write_turns` is the loop over the entries; each step of an entry is a function, in the order it runs — here, or in approach.py
(walking up / into reach), entry_cues.py (show, popup, lamps, power, sky, toast), moments.py (what moments.json measures) and
emit.py (the code of the turn). A step gets what it reads as arguments (the shared lists and tables it appends to, the entry, the
person of the turn); none returns anything — they add to `turns`, `views`, `gear_ops`… and move people (`x`) in place."""
from .actions import CONE_BACK, RUN_TO, WHOLE_BODY
from .approach import pets_walk_up, kneel_to_low_pet, walk_to_pay_stand, walk_to_pick_up, join_selfie, walk_into_reach, turn_tail_for_temp
from .emit import emit_together, emit_turn
from .entry_cues import collect_shows, collect_popup, collect_lamps, collect_power_and_sky, collect_toasts
from .floor import floor_turn, restore_seated
from .moments import record_moments
from .views import beat_of


def write_turns(st):
    """Every script entry → the turns of the conversation: approach / back off, camera views, beats of the auto director, side effects."""
    arms, base, beats, director, emitted, flat = st.take('arms', 'base', 'beats', 'director', 'emitted', 'flat')
    gear_ops, holding, lamp_ops, layout, names, popups = st.take('gear_ops', 'holding', 'lamp_ops', 'layout', 'names', 'popups')
    power_ops, reach_notes, script, shows, sky_ops, speakers = st.take('power_ops', 'reach_notes', 'script', 'shows', 'sky_ops', 'speakers')
    stage_set, toasts, turns, views = st.take('stage_set', 'toasts', 'turns', 'views')
    for index, entry in enumerate(script):
        where = f'script[{index}]'
        _return_to_view(emitted, entry, views, where)
        collect_shows(base, entry, flat, layout, shows, where)
        flat += len(entry['together']) + len(entry.get('_narrator_turns', [])) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else 1
        backs = []                                          # (người, quãng) — lùi lại sau lượt này
        turned_back = []                                    # (con vật, người) — con vật quay lại nhìn người ấy sau lượt này (takeTemp)
        first_turn = emitted[0]                             # nhịp của đạo diễn tự động: gồm cả các bước lại gần / lùi lại
        pets_walk_up(emitted, entry, names, turns, where)
        undo_seated = []
        for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            restore_seated(undo_seated)
            if not isinstance(turn, dict) or turn.get('who') not in names: continue
            who = names[turn['who']]
            if who['_pet']: continue
            floor_turn(who, turn, undo_seated)          # ĐỢT 42 E: đang ngồi bệt / nằm — như người ngồi (con vật đi tới, không tự quỳ)
            kneel_to_low_pet(names, stage_set, turn, who)
            walk_to_pay_stand(emitted, st, turn, turns, who)
            walk_to_pick_up(emitted, names, turn, turns, who)
            join_selfie(emitted, names, turn, turns, who)
            walk_into_reach(backs, emitted, entry, names, reach_notes, st, stage_set, turn, turns, where, who)
            turn_tail_for_temp(emitted, names, turn, turned_back, turns, who)
        restore_seated(undo_seated)
        if layout == 'split':
            talker = next((turn for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]) if isinstance(turn, dict) and turn.get('say') and turn.get('who') in names), None)
            speakers.append((emitted[0], names[talker['who']]['side'] if talker else None))      # lượt không lời: cả hai nửa sáng
        collect_popup(emitted, entry, popups, stage_set, where)
        collect_lamps(emitted, entry, lamp_ops, names, stage_set, where)
        collect_power_and_sky(emitted, entry, power_ops, sky_ops, stage_set, where)
        record_moments(arms, emitted, entry, gear_ops, holding, names, reach_notes, st, stage_set, where)
        collect_toasts(emitted, entry, toasts, where)
        if isinstance(entry, dict) and 'together' in entry:
            emit_together(emitted, entry, st, turns, where)
        else:
            emit_turn(arms, emitted, entry, gear_ops, names, reach_notes, st, stage_set, turns, where)
        _step_back_after(backs, emitted, entry, names, turned_back, turns)
        _director_beat(beats, director, emitted, entry, first_turn, names, st)


def _return_to_view(emitted, entry, views, where):
    """Trở lại góc máy trước (view có "back"): cắt về đúng nó ở lượt đầu tiên của mục này — trừ khi mục này tự có "view"."""
    if views and views[-1].get('back') and not views[-1].get('back_done'):
        views[-1]['back_done'] = True
        if not (isinstance(entry, dict) and 'view' in entry):
            before = views[-2] if len(views) > 1 else None
            views.append(dict(before, turn=emitted[0], cut=True, back=False, back_done=True, returned=True) if before else {'turn': emitted[0], 'start': True, 'values': {}, 'wide': False, 'cut': True, 'dur': 1.5, 'ease': 'sine.inOut', 'where': where, 'back': False})


def _step_back_after(backs, emitted, entry, names, turned_back, turns):
    """Sau mục: con vật quay lại nhìn người đo nhiệt, người lùi ra sau khi đeo loa và sau khi với lại gần."""
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


def _director_beat(beats, director, emitted, entry, first_turn, names, st):
    """Nhịp của đạo diễn tự động cho mục này: đổi góc sớm khi có người đi, góc toàn khi chạy / nhảy / múa / nhặt đồ."""
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
