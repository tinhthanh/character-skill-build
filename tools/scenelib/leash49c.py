"""Wave 49 C — walking a dog on a leash: `["walkOnLeash", "@dog", steps, distance]` (a person's step).

The person clips the leash on (if it is not on yet) and walks `distance` frame units with the pet; the pet does its own
`walkOnLeash(person, steps, distance, { distance })` at the same time (added here, like `pullToy` for `tugOfWar`). Its own distance is
worked out here, in scene units, so it ends `AHEAD` × the person's height in front of them, on the side they walk to; both stored
positions (`x`) move for the later turns. A pet far from the person first walks up beside them (the clip-on needs it close).
Cats are walked on a harness (real, if rare) — allowed; rabbits are refused."""
from .schema import CAT_BREEDS
from .util import fail, js

LEASH_NAME = 'walkOnLeash'
AHEAD = 0.4                  # runtime/pet/leash49c.js LEASH_AHEAD_49C: tâm con vật dừng cách giữa người chừng ấy × chiều cao người (× 0,96: hình người trong host)
TRAIL, TRAIL_FROM = 0.32, 0.12      # runtime LEASH_TRAIL_49C, LEASH_TRAIL_FROM_49C: theo sau người chừng ấy khi bắt đầu ở phía sau hướng đi
CLIP_REACH = 0.45            # con vật xa giữa người hơn chừng ấy × chiều cao host thì đi tới cạnh người trước (móc dây cần nó ở gần)
CLIP_SPOT = 0.3              # … tới chỗ cách giữa người chừng ấy × chiều cao host, về phía sắp đi
PLAN = {}                    # id(bước) → { pet, own: quãng của con vật (đơn vị khung của nó), dx: quãng của người (đơn vị cảnh), goal: x con vật sau bước }


def leash_steps(turn, names):
    """Các bước `walkOnLeash` của một lượt người (đã kiểm tra)."""
    if not isinstance(turn, dict) or turn.get('who') not in names or not isinstance(turn.get('do'), list): return []
    return [step for step in turn['do'] if step == LEASH_NAME or (isinstance(step, list) and step and step[0] == LEASH_NAME)]


def _check(step, who, names, where):
    if who['_pet']: fail(f'{where}: "{LEASH_NAME}" is done by the person holding the leash — for the pet write it on the person: ["{LEASH_NAME}", "@{who["name"]}", 4, 300] on its walker')
    if not isinstance(step, list) or len(step) < 2 or not isinstance(step[1], str) or not step[1].startswith('@') or step[1][1:] not in names:
        fail(f'{where}: ["{LEASH_NAME}", "@<pet name>", steps, distance] — the pet to walk is a dog (or a cat) of the scene; got {js(step)}')
    pet = names[step[1][1:]]
    if not pet['_pet']: fail(f'{where}: "{LEASH_NAME}" walks a pet — "{step[1]}" is a person')
    species = str(pet.get('species') or '')
    if 'rabbit' in species: fail(f'{where}: "{LEASH_NAME}": a rabbit is not walked on a leash (it hops) — walk a dog, or a cat on a harness')
    if len(step) > 4: fail(f'{where}: ["{LEASH_NAME}", "@{pet["name"]}", steps, distance] — got {js(step)}')
    for n, label in ((2, 'steps'), (3, 'distance')):
        if len(step) > n and (isinstance(step[n], bool) or not isinstance(step[n], (int, float))): fail(f'{where}: ["{LEASH_NAME}", "@pet", steps, distance] — {label} is a number, got {js(step[n])}')
    if len(step) > 2 and step[2] <= 0: fail(f'{where}: ["{LEASH_NAME}", "@pet", steps, distance] — steps is a number > 0, got {js(step[2])}')
    return pet


def walk_up(emitted, names, reach_notes, stage_set, turn, turns, where, who):
    """Trước lượt: kiểm tra bước, con vật xa thì đi tới cạnh người; tính quãng của con vật (`PLAN`) từ chỗ hai bên đang đứng."""
    steps = leash_steps(turn, names)
    if steps and (turn['do'][0] is not steps[0] or len(steps) > 1 or turn.get('say') or turn.get('enter')):
        fail(f'{where}: "{LEASH_NAME}" starts a turn of its own (no "say" / "enter", nothing before it) — the pet walks with the person from the start of the turn')
    for step in steps:
        pet = _check(step, who, names, where)
        if stage_set is not None and abs(float(who.get('z', -300)) - float(pet.get('z', -300))) > 60:
            reach_notes.append(f'{where}: "{who["name"]}" walks "{pet["name"]}" on a leash, but they stand {abs(float(who.get("z", -300)) - float(pet.get("z", -300))):g} units apart in depth (z) — the leash goes from the hand to the collar in the picture: give them the same z (within 60)')
        distance = float(step[3]) if len(step) > 3 else 0.0
        px, qx = float(who['x']), float(pet['x']) + pet.get('_drop', 0)
        toward = -1 if distance < 0 else 1 if distance > 0 else (1 if qx >= px else -1)
        if abs(qx - px) > CLIP_REACH * who['_host_height']:
            spot = px + toward * CLIP_SPOT * who['_host_height']
            move = spot - qx
            turns.append((f'  // {pet["name"]} comes up beside {who["name"]} to be walked on the leash', f"[{pet['name']}, ['walk', 4, {round(move / pet['_unit'])}]]"))
            emitted[0] += 1
            pet['x'] = float(pet['x']) + move
            qx = spot
        dx = distance * who['_unit']
        # Đi trước người — hay THEO SAU nếu nó đang ở phía sau hướng đi (người quay đầu đi ngược lại: không băng qua chân người).
        lead = -TRAIL if (qx - px) * toward < -TRAIL_FROM * 0.96 * who['_host_height'] else AHEAD
        goal = px + dx + toward * lead * 0.96 * who['_host_height'] if distance else qx          # bước tại chỗ: con vật kiệu tại chỗ, đứng nguyên
        PLAN[id(step)] = {'pet': pet['name'], 'own': round((goal - qx) / pet['_unit'], 1), 'dx': dx, 'goal': goal - pet.get('_drop', 0)}


def pet_part(code, entry, names, emitted):
    """Lượt một mình `["walkOnLeash", "@con vật", …]` của người: con vật bước cùng lúc (`walkOnLeash(người, …, { distance })`)."""
    steps = leash_steps(entry, names)
    if not steps or 'say' in entry or not code.startswith('['): return code
    step, plan = steps[0], PLAN.get(id(steps[0]))
    if not plan: return code
    args = [js(item) for item in step[2:4]]
    while len(args) < 2: args.append('4' if not args else '0')
    emitted[0] += 1
    return '{ together: [' + code + f", [{plan['pet']}, ['{LEASH_NAME}', {names[entry['who']]['name']}, {', '.join(args)}, {{ distance: {plan['own']:g} }}]]] }}"


def together_part(entry, names):
    """Mục `together` có người `walkOnLeash` mà con vật của họ KHÔNG có lượt trong nhóm: thêm lượt của nó (như lượt riêng)."""
    group = entry.get('together') if isinstance(entry, dict) and isinstance(entry.get('together'), list) else []
    for turn in list(group):
        for step in leash_steps(turn, names):
            plan = PLAN.get(id(step))
            if not plan or any(isinstance(other, dict) and other.get('who') == plan['pet'] for other in group): continue
            args = list(step[2:4]) + [4, 0][len(step[2:4]):]
            group.append({'who': plan['pet'], 'do': [[LEASH_NAME, '@' + turn['who']] + args + [{'distance': plan['own']}]]})


def after(entry, names):
    """Sau lượt: chỗ đứng mới của người và con vật."""
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        for step in leash_steps(turn, names):
            plan = PLAN.pop(id(step), None)
            if not plan: continue
            who, pet = names[turn['who']], names[plan['pet']]
            who['x'] = float(who['x']) + plan['dx']
            pet['x'] = plan['goal']


def beat(beat_, entry, names):
    """Nhịp đạo diễn: góc TOÀN người dắt + con vật, đo suốt quãng đi (đổi góc sớm như nhịp có người đi)."""
    group = entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
    walkers = [(turn, step) for turn in group for step in leash_steps(turn, names) if not names[turn['who']]['_pet']]
    if not walkers or beat_.get('fixed') or not beat_.get('subjects'): return
    beat_['size'] = 'full'; beat_['move'] = True
    beat_.pop('mid', None)
    for turn, step in walkers:
        for name in (names[turn['who']]['name'], step[1][1:] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) else None):
            if name in names and name not in beat_['subjects']: beat_['subjects'].append(name)


def moments_op(emitted, entry, gear_ops, names, where=''):
    """moments.json (acting_check `leash49c`): dây nối tay với vòng cổ, con vật trong tầm dây, cả hai đi, cả hai trong khung."""
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if isinstance(turn, dict) and turn.get('who') in names and names[turn['who']]['_pet'] and any(not (isinstance(step, list) and len(step) == 5 and isinstance(step[4], dict) and 'distance' in step[4]) for step in leash_steps(turn, names)):
            fail(f'{where}: "{LEASH_NAME}" is written on the person holding the leash — ["{LEASH_NAME}", "@{turn["who"]}", 4, 300] on its walker; the pet walks with them by itself')
        for step in leash_steps(turn, names):
            if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and not names[turn['who']]['_pet']:
                gear_ops.append({'turn': emitted[0], 'kind': 'leash49c', 'name': LEASH_NAME, 'who': turn['who'], 'target': step[1][1:],
                                 'moves': abs(float(step[3])) > 0 if len(step) > 3 else False})


def give_leash(who, scene_turns):
    """Người có bước `walkOnLeash` mà kịch bản chưa cho cầm gì: một quai dây ĐANG CẤT ở tay gần máy quay khi đi về hướng của bước đầu
    (lấy ra lúc bắt đầu); có bước `leash` trước đó thì đang cầm (móc dây cần quai dây trên tay)."""
    name = who.get('name')
    mine = [step for t in scene_turns if isinstance(t, dict) and t.get('who') == name and isinstance(t.get('do'), list)
            for step in t['do'] if isinstance(step, (list, str))]
    walks = [step for step in mine if step == LEASH_NAME or (isinstance(step, list) and step and step[0] == LEASH_NAME)]
    if not walks or 'holds' in who or who.get('species'): return
    first = walks[0]
    distance = first[3] if isinstance(first, list) and len(first) > 3 and isinstance(first[3], (int, float)) else 0
    side = 'R' if distance < 0 else 'L'
    clipped_first = mine.index(first) > 0 and any(step == 'leash' or (isinstance(step, list) and step and step[0] == 'leash') for step in mine[:mine.index(first)])
    who['holds'] = {side: 'leash'}
    if not clipped_first: who['holdsHidden'] = True
