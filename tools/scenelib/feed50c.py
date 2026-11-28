"""Wave 50 C — feeding and the pet carrier (person steps; runtime/person/feed50c.js).

FEEDING. ["serveBowl", "@pet", { "food": "kibble" | "water", "hold": 0.6, "gap": 44 }]: the person walks round to the side the pet faces,
squats, sets a bowl down a little in front of its muzzle (`gap` frame units further), pours kibble / water into it, stands up and steps
back. The pet's part is added (like `giveTreat` → `chew`): it walks the gap to the bowl and eats / drinks. The bowl stays on the floor
(drawn by the person); ["pickUp", "@pet", { "item": "bowl" }] picks it up again.

THE CARRIER. A set.cutouts { "kind": "carrier", "name": "long" } named by a carrier step (or by a pet's "inCarrier") becomes TWO hosts, as
the boarding cage of wave 49 A (tools/scenelib/cage.py): its inside behind the pet, its shell with the barred door in front. Steps:
["putInCarrier", "@pet", "@long", { "carry": true, "hold": 0.4 }] (a "carry" turn is added first if the person does not hold the pet),
["takeOutOfCarrier", "@pet", "@long"] (the pet walks out by itself — its part is added), ["pickUpCarrier", "@long"], ["putDownCarrier",
"@long"]. A person carrying the carrier (after "carry": true / "pickUpCarrier", or from the start: "inCarrier": "<person>" on a pet, which
gives the person "holds": "carrier") may leave out the place: ["putDownCarrier"] / ["takeOutOfCarrier", "@pet"] set it down in front of
them on the floor (a hidden carrier is added there). The person always works at the door end of the carrier (the door faces whoever
first reaches it, unless the cutout says "door")."""
from . import cage as cage49a
from .util import fail, js

BOWL_STEP = 'serveBowl'
CARRIER_STEPS = ('putInCarrier', 'takeOutOfCarrier', 'pickUpCarrier', 'putDownCarrier')
STEPS = (BOWL_STEP,) + CARRIER_STEPS
FOODS = ('kibble', 'water')
# Nhịp của rig (runtime/person/feed50c.js): bát — con vật đi tới được sau `BOWL_POUR + 0,6 + hold + 0,75` giây; ăn / uống `EAT` giây.
BOWL_POUR, EAT = 1.6, 2.4
BOWL_HEAD = 0.2            # đầu con vật cách giữa thân chừng ấy × chiều cao host của nó; mõm cúi ăn thêm 0,075 nữa
BOWL_STAND = 0.24          # người đứng cách chỗ đặt bát chừng ấy × chiều cao host người (về phía con vật quay mặt)
# Lồng: `takeOutOfCarrier` — cửa mở xong lúc `CARRIER_OPEN` (cộng `CARRIER_SET` khi phải đặt lồng xuống trước); `putInCarrier` ôm con vật lúc 0,1 s.
CARRIER_OPEN, CARRIER_SET, PUT_DEPTH = 1.75, 1.7, 0.1
CARRIER_SIZE = (150, 112)  # cỡ mặc định trong khung 400 × 470 của nó (runtime/props.js CARRIER50C); lồng nhỏ hơn con vật thì tự to ra
CARRIER_GAP = 0.15         # người đứng cách đầu có cửa của lồng chừng ấy × chiều cao host
CARRIER_Z = (12, 60)       # người đứng trước lồng: z của người − z của lồng trong khoảng này (như chuồng)
SPOT_BACK = 30             # chỗ đặt lồng tự thêm: lùi sau người chừng ấy (z)
PLAN = {}                  # id(bước) → phần con vật cùng lúc: { pet, delay, steps }
LOADS = {}                 # người → [con vật trong lồng họ xách từ đầu cảnh] ("inCarrier": "<người>")
CARRIED = {}               # con vật → người xách lồng có nó


def _steps(turn, names=None):
    if not isinstance(turn, dict) or not isinstance(turn.get('do'), list): return []
    return [step for step in turn['do'] if isinstance(step, list) and step and step[0] in STEPS]


def _flat(scene):
    for entry in scene.get('script') or []:
        for turn in (entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
            if isinstance(turn, dict): yield entry, turn


def prepare(scene, stage_set):
    """Đầu bản dựng: lồng có bước gọi tên → hai lớp; con vật "inCarrier"; người xách lồng có sẵn lồng trên tay; chèn lượt bế trước khi cho vào
    lồng; lồng nào là CHỖ ĐẶT (lần đầu được gọi tên là chỗ đặt lồng đang xách xuống) thì lúc đầu trống."""
    cutouts = (stage_set or {}).get('cutouts', [])
    carriers = {c.get('name'): c for c in cutouts if c.get('kind') == 'carrier' and c.get('name')}
    cast = {who.get('name'): who for who in scene.get('characters') or [] if isinstance(who, dict)}
    LOADS.clear(); CARRIED.clear(); PLAN.clear()
    holding = {}                    # người → con vật trong lồng trên tay họ ('' = lồng rỗng)
    present = {}
    for who in cast.values():
        if 'inCarrier' not in who: continue
        name, ref = who.get('name'), who['inCarrier']
        if 'species' not in who: fail(f'character "{name}": "inCarrier" is for a pet (it starts inside a carrier) — "{name}" is a person')
        if stage_set is None: fail(f'character "{name}": "inCarrier" needs a 3D set ("set")')
        for key in ('on', 'enter', 'seated', 'inTub', 'inCage'):
            if who.get(key): fail(f'character "{name}": a pet "inCarrier" cannot also be "{key}" — it starts inside the carrier')
        if ref in carriers:
            if 'x' in who: fail(f'character "{name}": "inCarrier" places it in the carrier "{ref}" — leave out "x"')
            carriers[ref]['_two50c'] = True; carriers[ref]['_inside50c'] = name; present[ref] = True
            who['x'], who['z'] = float(carriers[ref]['x']), float(carriers[ref]['z']) + cage49a.CAGE_IN
        elif ref in cast and 'species' not in cast[ref]:
            owner = cast[ref]
            if ref in holding: fail(f'character "{name}": "{ref}" already carries a pet in a carrier — one carrier per person')
            holding[ref] = name
            held = owner.get('holds')
            if held is None: owner['holds'] = {'L': 'carrier'}
            elif not (held == 'carrier' or (isinstance(held, dict) and 'carrier' in held.values())): fail(f'character "{ref}" carries "{name}" in a carrier ("inCarrier") — "holds" must be "carrier" or leave it out (got {js(held)})')
            if owner.get('holdsHidden'): fail(f'character "{ref}" carries "{name}" in a carrier — the carrier is in the hand: no "holdsHidden"')
            LOADS.setdefault(ref, []).append(name)
            if 'x' in who: fail(f'character "{name}": "inCarrier": "{ref}" — it is in the carrier {ref} holds; leave out "x" (it goes where they go)')
            who['x'], who['z'] = owner.get('x', 0), owner.get('z', -300)
            CARRIED[name] = ref
        else:
            fail(f'character "{name}": "inCarrier" must name a set.cutouts "carrier" or the person carrying it (carriers here: {", ".join(carriers) or "none"}) — got {js(ref)}')
    # Đi qua kịch bản: lồng nào hai lớp, lồng nào lúc đầu trống (chỗ đặt), chèn lượt bế.
    out, arms = [], {}
    for entry in scene.get('script') or []:
        group = entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
        for turn in group:
            who = turn.get('who') if isinstance(turn, dict) else None
            for step in turn.get('do', []) if isinstance(turn, dict) and isinstance(turn.get('do'), list) else []:
                nm = step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None
                target = step[1][1:] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None
                if nm in ('carry', 'takeOutOfCage') and target: arms[who] = target
                elif nm in ('putDown', 'putInCage'): arms.pop(who, None)
                elif nm == 'handOverPet' and target: arms[target] = arms.pop(who, None)
                elif nm == 'putInCarrier':
                    if target and arms.get(who) != target and turn is entry and turn['do'][0] is step: out.append({'who': who, 'do': [['carry', '@' + target]]})
                    arms.pop(who, None)
            for step in _steps(turn):
                name = step[0]
                if name == BOWL_STEP: continue
                ref = next((item[1:] for item in step[1:] if isinstance(item, str) and item.startswith('@') and item[1:] in carriers), None)
                pet = step[1][1:] if len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] not in carriers else None
                if ref: carriers[ref]['_two50c'] = True
                if name in ('putDownCarrier', 'takeOutOfCarrier') and who in holding:
                    if ref and ref not in present: carriers[ref]['_spot50c'] = True
                    if ref: present[ref] = True
                    holding.pop(who)
                elif name == 'pickUpCarrier' and ref:
                    present.setdefault(ref, True); present[ref] = False; holding[who] = carriers[ref].get('_inside50c', '')
                elif name == 'putInCarrier' and ref:
                    present.setdefault(ref, True)
                    if isinstance(step[-1], dict) and step[-1].get('carry') is True: present[ref] = False; holding[who] = pet
                elif ref: present.setdefault(ref, True)
        out.append(entry)
    scene['script'] = out
    for c in carriers.values():
        if not c.get('_two50c'): continue
        if 'y' in c and c.get('_inside50c'): fail(f'set.cutouts "{c.get("name")}": a carrier with a pet inside stands on the floor (no "y")')


def _size(st, item, pets=()):
    """Cỡ lồng [rộng, cao] trong khung 400 × 470 của nó: "size", không thì vừa con vật lớn nhất cho vào nó (≥ cỡ mặc định)."""
    if '_size50c' in item: return item['_size50c']
    if 'size' in item: size = tuple(float(v) for v in item['size'])
    else:
        person_default = st.take('person_default')[0]
        unit = person_default * 0.74 / 470
        w, h = CARRIER_SIZE
        for pet in pets:
            if not pet: continue
            pw, ph = cage49a.PET_BODY[0] * pet['_host_width'] / unit, (0.57 if 'rabbit' in str(pet.get('species', '')) else cage49a.PET_BODY[1]) * pet['_host_height'] / unit
            w, h = max(w, round(pw * 1.2 + 24)), max(h, round(ph * 1.12 + 26))
        size = (w, h)
    item['_size50c'] = size
    item['_tall50c'] = _tall(st, item)
    return size


def _tall(st, item):
    person_default = st.take('person_default')[0]
    return float(item.get('height', round(person_default * 0.74)))


def _door(item, who_x):
    """Đầu có cửa: "door" của cutout, không thì phía người đầu tiên tới nó."""
    if 'door' not in item and '_door50c' not in item: item['_door50c'] = 'right' if who_x >= float(item['x']) else 'left'
    return item.get('door', item.get('_door50c'))


def _carrier_ref(st, step, where):
    """"@<carrier>" của bước (cutout "carrier"), hay None."""
    names, stage_set = st.take('names', 'stage_set')
    cutouts = (stage_set or {}).get('cutouts', [])
    for item in step[1:]:
        if isinstance(item, str) and item.startswith('@') and item[1:] not in names:
            index = next((n for n, c in enumerate(cutouts) if c.get('name') == item[1:]), None)
            carriers = [c.get('name') for c in cutouts if c.get('kind') == 'carrier' and c.get('name')]
            if index is None: fail(f'{where}: "{item}" — no set.cutouts item has "name": "{item[1:]}" (carriers here: {", ".join("@" + n for n in carriers) or "none"})')
            if cutouts[index].get('kind') != 'carrier': fail(f'{where}: "{item}" is a "{cutouts[index].get("kind") or "picture"}" cutout — "{step[0]}" needs a carrier (set.cutouts "kind": "carrier")')
            return index, cutouts[index]
    return None


def _spot(st, who, pet_names):
    """Chỗ đặt lồng tự thêm (lồng đang xách, bước không gọi tên chỗ đặt): trên sàn ngay trước người, về phía giữa phòng, lùi sau người một chút."""
    names, stage_set = st.take('names', 'stage_set')
    door = who.get('_carry_door50c', 'right')          # cửa của lồng trên tay (lồng xách sẵn: đầu phải) — chỗ đặt cùng phía cửa, người ở đầu có cửa
    side = -1 if door == 'right' else 1
    unit = _tall(st, {}) / 470
    if not who.get('_carry_size50c') and LOADS.get(who['name']): who['_carry_size50c'] = _size(st, {}, [names.get(LOADS[who['name']][0])])
    size = who.get('_carry_size50c') or CARRIER_SIZE
    item = {'kind': 'carrier', 'name': f'_spot50c_{who["name"]}_{len(stage_set["cutouts"])}', 'x': float(who['x']) + side * (size[0] / 2 * unit + CARRIER_GAP * who['_host_height']),
            'z': float(who.get('z', -300)) - SPOT_BACK, '_two50c': True, '_spot50c': True, '_size50c': size, '_door50c': door, '_auto50c': True}
    stage_set['cutouts'].append(item)
    return len(stage_set['cutouts']) - 1, item


def _holder(st, who):
    held = st.__dict__.setdefault('held50c', {})
    if who['name'] not in held and LOADS.get(who['name']) and not st.__dict__.get('loaded50c', set()) >= {who['name']}:
        held[who['name']] = LOADS[who['name']][0]; st.__dict__.setdefault('loaded50c', set()).add(who['name'])
    return held


def walk_up(emitted, st, turn, turns, who):
    """Trước lượt: bước tới chỗ làm — trước mõm con vật (bát), đầu có cửa của lồng; lồng đang xách mà không nói đặt ở đâu: thêm chỗ đặt."""
    names = st.take('names')[0]
    for step in _steps(turn):
        if who['_pet']: fail(f'"{who["name"]}": "{step[0]}" is done by a person, not a pet')
        move = None
        if step[0] == BOWL_STEP:
            if not (len(step) > 1 and isinstance(step[1], str) and step[1][1:] in names and names[step[1][1:]]['_pet']): continue
            pet = names[step[1][1:]]
            options = step[2] if len(step) > 2 and isinstance(step[2], dict) else {}
            fwd = _facing(pet, names)
            bowl = float(pet['x']) + pet.get('_drop', 0) + fwd * ((BOWL_HEAD + 0.075) * pet['_host_height'] + float(options.get('gap', 44)) * who['_unit'])
            move = bowl + fwd * BOWL_STAND * who['_host_height'] - float(who['x'])
            label = f'goes round to the front of {pet["name"]} for "serveBowl"'
        else:
            found = _carrier_ref(st, step, f'"{who["name"]}" {step[0]}')
            held = _holder(st, who)
            if not found and step[0] in ('putDownCarrier', 'takeOutOfCarrier') and who['name'] in held:
                found = _spot(st, who, [])
                step.insert(2 if step[0] == 'takeOutOfCarrier' else 1, '@' + found[1]['name'])
            if not found: continue
            item = found[1]
            side = 1 if _door(item, float(who['x'])) == 'right' else -1
            size = _size(st, item, [names.get(n) for n in [item.get('_inside50c'), held.get(who['name']), step[1][1:] if len(step) > 1 and isinstance(step[1], str) and step[1][1:] in names else None] if n])
            unit = _tall(st, item) / 470
            move = float(item['x']) + side * (size[0] / 2 * unit + CARRIER_GAP * who['_host_height']) - float(who['x'])
            label = f'steps up to the door end of {item["name"]} for "{step[0]}"'
        if move is not None and abs(move) > 0.03 * who['_host_height']:
            turns.append((f'  // {who["name"]} {label}', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move


def _facing(pet, names):
    """Hướng con vật quay mặt: đã đi (bát / ra khỏi lồng) thì hướng đi; "faces" thì về phía người ấy (chỗ lúc đầu); không thì phải (rig mặc định)."""
    if '_fwd50c' in pet: return pet['_fwd50c']
    if pet.get('faces') in names: return -1 if names[pet['faces']]['_x0'] < pet['_x0'] else 1
    return 1


def step_code(st, step, where, actor):
    """Bước → JS; ghi phần con vật cùng lúc (`PLAN`), chiều sâu con vật khi vào / ra lồng, chỗ con vật cho các lượt sau, phép đo."""
    names, stage_set = st.take('names', 'stage_set')
    name = step[0]
    if actor not in names or names[actor]['_pet']: fail(f'{where}: "{name}" is done by a person, not a pet')
    who = names[actor]
    if name == BOWL_STEP:
        if len(step) < 2 or not (isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
            fail(f'{where}: "serveBowl" needs the pet: ["serveBowl", "@pet", {{ "food": "kibble" | "water", "hold": 0.6 }}] — got {js(step)}')
        options = step[2] if len(step) > 2 else {}
        if len(step) > 3 or not isinstance(options, dict) or set(options) - {'food', 'hold', 'gap'}: fail(f'{where}: "serveBowl" takes ["serveBowl", "@pet", {{ "food": "kibble" | "water", "hold": 0.6, "gap": 44 }}] — got {js(step)}')
        if options.get('food', 'kibble') not in FOODS: fail(f'{where}: "serveBowl" food must be "kibble" or "water" — got {js(options.get("food"))}')
        for key, lo, hi in (('hold', 0, 4), ('gap', 0, 160)):
            if key in options and not (isinstance(options[key], (int, float)) and not isinstance(options[key], bool) and lo <= options[key] <= hi): fail(f'{where}: "serveBowl" {key} must be {lo}…{hi} — got {js(options[key])}')
        pet = names[step[1][1:]]
        if pet.get('on'): fail(f'{where}: "{pet["name"]}" stands on "{pet["on"]}" — the bowl goes on the floor: "serveBowl" needs the pet on the floor')
        if CARRIED.get(pet['name']) or pet.get('_cage50c'): fail(f'{where}: "{pet["name"]}" is in a carrier — take it out first')
        fwd = _facing(pet, names)
        gap, hold = float(options.get('gap', 44)), float(options.get('hold', 0.6))
        dist = round(fwd * gap * who['_unit'] / pet['_unit'])
        ready = round(BOWL_POUR + 0.6 + hold + 0.75, 2)
        eat = 'drink' if options.get('food') == 'water' else 'eat'
        PLAN[id(step)] = {'pet': pet['name'], 'delay': ready, 'steps': ([['walk', 2, dist]] if abs(dist) > 3 else []) + [[eat, EAT]]}
        walked = (float(pet['x']) - float(pet['_x0'])) / pet['_unit'] if pet.get('_x0') is not None else 0
        at = f", {{ at: {round(walked, 1):g} }}" if abs(walked) > 0.5 else ''
        pet['x'] = float(pet['x']) + fwd * gap * who['_unit']          # nó đi tới bát (bước `walk` của nó)
        pet['_bowl50c'] = float(pet['x']) + pet.get('_drop', 0) + fwd * (BOWL_HEAD + 0.075) * pet['_host_height']          # chỗ cái bát (nhặt lên: tools/scenelib/approach.py)
        pet['_fwd50c'] = fwd
        st.gear_ops.append({'turn': st.emitted[0], 'kind': 'feed50c', 'name': name, 'who': actor, 'target': pet['name'], 'hold': hold, 'eat': eat, 'walk': bool(abs(dist) > 3)})
        target = f"set.target({actor}, {pet['name']}, 'head'{at})" if stage_set is not None else pet['name']
        return f"['serveBowl', {target}" + (f", {js(options)}" if options else '') + ']'
    # LỒNG
    found = _carrier_ref(st, step, where)
    if not found and name == 'putDownCarrier' and actor not in _holder(st, who): fail(f'{where}: "{actor}" is not carrying a carrier — "pickUpCarrier" first (or give a pet "inCarrier": "{actor}")')
    usage = {'putInCarrier': '["putInCarrier", "@pet", "@<carrier>", { "carry": true, "hold": 0.4 }]', 'takeOutOfCarrier': '["takeOutOfCarrier", "@pet", "@<carrier>"]',
             'pickUpCarrier': '["pickUpCarrier", "@<carrier>"]', 'putDownCarrier': '["putDownCarrier", "@<carrier>"]'}[name]
    if stage_set is None: fail(f'{where}: "{name}" needs a 3D set ("set") with a set.cutouts {{ "kind": "carrier", "name": … }}')
    if not found: fail(f'{where}: "{name}" takes {usage} — name a carrier of the set (set.cutouts "kind": "carrier") — got {js(step)}')
    index, item = found
    held = _holder(st, who)
    has_pet = name in ('putInCarrier', 'takeOutOfCarrier')
    if has_pet and not (len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
        fail(f'{where}: "{name}" takes {usage} — the pet first, then the carrier — got {js(step)}')
    pet = names[step[1][1:]] if has_pet else None
    options = step[3] if name == 'putInCarrier' and len(step) > 3 else {}
    if len(step) > (4 if name == 'putInCarrier' else 3 if has_pet else 2) or not isinstance(options, dict) or set(options) - {'carry', 'hold'}: fail(f'{where}: "{name}" takes {usage} — got {js(step)}')
    if 'carry' in options and not isinstance(options['carry'], bool): fail(f'{where}: "putInCarrier" carry must be true or false — got {js(options["carry"])}')
    if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and 0 <= options['hold'] <= 6): fail(f'{where}: "putInCarrier" hold must be 0…6 seconds — got {js(options["hold"])}')
    z, my_z = float(item['z']), float(who.get('z', -300))
    if not CARRIER_Z[0] <= my_z - z <= CARRIER_Z[1]:
        fail(f'{where}: "{actor}" must stand just in front of the carrier "{item.get("name")}" (z {z:g}) to reach it — give "{actor}" a z between {z + CARRIER_Z[0]:g} and {z + CARRIER_Z[1]:g} (now {my_z:g})')
    door = _door(item, float(who['x']))
    side = 1 if door == 'right' else -1
    if (1 if float(who['x']) >= float(item['x']) else -1) != side:
        fail(f'{where}: "{actor}" is at the back end of the carrier "{item.get("name")}" (its door is on the {door}) — stand at the door end, or leave out "door"')
    carried = held.get(actor)
    inside = item.get('_inside50c')
    size = _size(st, item, [pet, names.get(inside) if inside else None, names.get(carried) if carried else None])
    unit_c = _tall(st, item) / 470
    if pet:
        pw, ph = cage49a.PET_BODY[0] * pet['_host_width'], (0.57 if 'rabbit' in str(pet.get('species', '')) else cage49a.PET_BODY[1]) * pet['_host_height']
        if pw > (size[0] - 12) * unit_c * 1.04 or ph > (size[1] - 14) * unit_c * 1.04:
            fail(f'{where}: "{pet["name"]}" is too big for the carrier "{item.get("name")}" (about {pw:.0f} × {ph:.0f} px, inside {(size[0] - 12) * unit_c:.0f} × {(size[1] - 14) * unit_c:.0f}) — give the carrier a bigger "size" (now {js(list(size))}) or the pet a smaller "height"')
    counts, lines = st.__dict__.setdefault('carrier_count50c', {}), st.__dict__.setdefault('cage_lines', [])

    def hop(target, to_z, at, label):
        nth = counts.get((actor, name), 0)
        lines.append(f"    {{ const step = talk.turns.filter((turn) => turn.rig === {actor}).flatMap((turn) => turn.steps).filter((step) => step.name === {js(name)})[{nth}];          // {target} {label} {item.get('name')}\n"
                     f"      if (step) tl.add(set.depth({target}, {to_z:g}, 0.4), T0 + step.start + {at:g}); }}")

    if name == 'putInCarrier':
        if inside: fail(f'{where}: there is already a pet ("{inside}") in the carrier "{item.get("name")}" — take it out first ("takeOutOfCarrier")')
        if carried is not None: fail(f'{where}: "{actor}" is carrying a carrier — "putDownCarrier" first')
        if pet.get('on'): fail(f'{where}: "{pet["name"]}" stands on "{pet["on"]}" — the carrier is on the floor: carry it down first')
        if 'y' in item: fail(f'{where}: the carrier "{item.get("name")}" is raised ("y") — a pet goes into a carrier on the floor')
        hop(pet['name'], z + cage49a.CAGE_IN, PUT_DEPTH, 'into')
        pet['_drop'] = float(item['x']) - float(pet['x']); pet['_cage50c'] = item.get('name')
        st.arms.pop(actor, None)
        if options.get('carry'): held[actor] = pet['name']; item['_inside50c'] = None; item['_gone50c'] = True; who['_carry_size50c'] = size; who['_carry_door50c'] = door
        else: item['_inside50c'] = pet['name']
    elif name == 'pickUpCarrier':
        if carried is not None: fail(f'{where}: "{actor}" already carries a carrier — "putDownCarrier" first')
        if item.get('_gone50c') or item.get('_spot50c') and not item.get('_down50c'): fail(f'{where}: the carrier "{item.get("name")}" is not there (it was picked up)')
        held[actor] = inside or ''
        item['_inside50c'] = None; item['_gone50c'] = True; who['_carry_size50c'] = size; who['_carry_door50c'] = door
    elif name == 'putDownCarrier' or (name == 'takeOutOfCarrier' and carried is not None):
        if carried is None: fail(f'{where}: "{actor}" is not carrying a carrier — "pickUpCarrier" first (or give a pet "inCarrier": "{actor}")')
        if name == 'takeOutOfCarrier' and carried != pet['name']: fail(f'{where}: "{pet["name"]}" is not in the carrier "{actor}" carries')
        if not (item.get('_spot50c') or item.get('_gone50c')) or (item.get('_inside50c') or item.get('_down50c')): fail(f'{where}: the carrier "{item.get("name")}" is already there — set the carrier down at an empty place (a carrier cutout named first as the place to set it down)')
        if carried and 'y' in item: fail(f'{where}: a carrier with a pet inside goes on the floor — "{item.get("name")}" is raised ("y")')
        item['_down50c'] = True; item['_gone50c'] = False
        held.pop(actor, None)
        if carried:
            mover = names[carried]
            hop(carried, z + cage49a.CAGE_IN, 0.2, 'set down in')
            mover['_drop'] = float(item['x']) - float(mover['x']); mover['_cage50c'] = item.get('name'); CARRIED.pop(carried, None)
            item['_inside50c'] = carried
    if name == 'takeOutOfCarrier':
        if carried is None and item.get('_inside50c') != pet['name']:
            fail(f'{where}: "{pet["name"]}" is not in the carrier "{item.get("name")}" — put it in first ("putInCarrier"), or start it there ("inCarrier": "{item.get("name")}" on the pet)')
        # Con vật tự bước ra đầu có cửa: hết lồng + nửa thân nó + một khoảng.
        out = side * (size[0] / 2 * unit_c + cage49a.PET_BODY[0] * pet['_host_width'] * 0.5 + 0.03 * who['_host_height'])
        PLAN[id(step)] = {'pet': pet['name'], 'delay': round((CARRIER_SET if carried is not None else 0) + CARRIER_OPEN + 0.85, 2), 'steps': [['face', 'right' if side > 0 else 'left'], ['walk', 3, round(out / pet['_unit'])]]}
        pet['_drop'] = float(item['x']) - float(pet['x']); pet['x'] = float(pet['x']) + out; pet['_fwd50c'] = side; pet.pop('_cage50c', None)
        pet['z'] = z + cage49a.CAGE_IN
        item['_inside50c'] = None
    st.gear_ops.append({'turn': st.emitted[0], 'kind': 'carrier50c', 'name': name, 'who': actor, 'target': pet['name'] if pet else (carried or inside or ''), 'carrier': item.get('name'),
                        'hold': float(options.get('hold', 0.4)), 'carry': bool(options.get('carry')), 'from_hand': name == 'takeOutOfCarrier' and carried is not None})
    spec = f"{{ at: set.targetPoint({actor}, [{float(item['x']):g}, {float(item.get('y', 0)):g}, {z + cage49a.CAGE_FRONT:g}]), scale: {unit_c / who['_unit']:.5f}, door: cutout{index + 1}Front, back: cutout{index + 1} }}"
    args = [js(name)] + ([pet['name']] if pet else []) + [spec] + ([js(options)] if options else [])
    return '[' + ', '.join(args) + ']'


def setup_code(n, item, tall):
    """Hai host của một lồng: lòng lồng (sau con vật) và vỏ có cửa lưới (trước nó) — `cutout<n>Front` là đạo cụ cửa; chỗ đặt (lúc đầu trống) ẩn."""
    w, h = item.get('_size50c') or tuple(item.get('size', CARRIER_SIZE))
    tall = item.get('_tall50c', tall * 0.74)          # cùng đơn vị khung với người (host người = 0,74 × cỡ mặc định)
    options = {'width': w, 'height': h, 'door': item.get('door', item.get('_door50c', 'right'))}
    if item.get('color'): options['color'] = item['color']
    x, z = float(item['x']), float(item['z'])
    y = f", y: {float(item['y']):g}" if 'y' in item else ''
    hidden = f" cutout{n + 1}Front.firstElementChild.setAttribute('data-carrier-spot50c', ''); cutout{n + 1}Front.firstElementChild.style.visibility = 'hidden'; cutout{n + 1}.firstElementChild.style.visibility = 'hidden';" if item.get('_spot50c') else ''
    label = f"          // {item['name']}" if item.get('name') and not item.get('_auto50c') else '          // where the carrier is set down'
    return (f"    const cutout{n + 1} = document.createElement('div'), cutout{n + 1}Prop = VGCharacter.createProp(cutout{n + 1}, 'carrierBack', {js(options)}); set.stand(cutout{n + 1}, {{ x: {x:g}, z: {z + cage49a.CAGE_BACK:g}{y}, height: {tall:g}, shadow: false }});{label} (inside)\n"
            f"    const cutout{n + 1}Front = document.createElement('div'); VGCharacter.createProp(cutout{n + 1}Front, 'carrierFront', {js(options)}); set.stand(cutout{n + 1}Front, {{ x: {x:g}, z: {z + cage49a.CAGE_FRONT:g}{y}, height: {tall:g}, shadow: false }});{hidden}")


def setup_lines(st):
    """Sau khi đặt nhân vật: người xách sẵn lồng có con vật (`loadCarrier`), con vật ở sẵn trong lồng trên sàn (người đầu tiên mở / xách lồng ấy ghi nó)."""
    names, stage_set = st.take('names', 'stage_set')
    out = []
    for who in names.values():
        for pet in LOADS.get(who['name']) or []:
            size = who.get('_carry_size50c') or _size(st, {}, [names.get(pet)]); who['_carry_size50c'] = size
            hand = next((k for k, v in (who.get('holds') or {}).items() if v == 'carrier'), 'L')
            out.append(f"    {who['name']}.loadCarrier({pet}, {{ hand: {js(hand)}, width: {size[0]:g}, height: {size[1]:g}, door: {js('right' if hand == 'L' else 'left')} }});          // {pet} is in the carrier {who['name']} carries")
    cutouts = (stage_set or {}).get('cutouts', [])
    for n, item in enumerate(cutouts):
        if item.get('kind') != 'carrier' or not item.get('_two50c') or not item.get('_start50c'): continue
        opener = item.get('_opener50c')
        if not opener: continue
        who = names[opener]
        unit_c = _tall(st, item) / 470
        spec = f"{{ at: set.targetPoint({opener}, [{float(item['x']):g}, 0, {float(item['z']) + cage49a.CAGE_FRONT:g}]), scale: {unit_c / who['_unit']:.5f}, door: cutout{n + 1}Front, back: cutout{n + 1} }}"
        out.append(f"    {opener}.loadCarrier({item['_start50c']}, {{ carrier: {spec} }});          // {item['_start50c']} starts inside {item.get('name')}")
    return out


def note_start(scene, stage_set):
    """Con vật ở sẵn trong lồng trên sàn: người đầu tiên có bước lồng với lồng ấy là người ghi nó vào lồng lúc đầu cảnh."""
    for c in (stage_set or {}).get('cutouts', []):
        if c.get('kind') == 'carrier' and c.get('_inside50c'): c['_start50c'] = c['_inside50c']
    for _, turn in _flat(scene):
        for step in _steps(turn):
            for item in step[1:]:
                if not (isinstance(item, str) and item.startswith('@')): continue
                c = next((c for c in (stage_set or {}).get('cutouts', []) if c.get('kind') == 'carrier' and c.get('name') == item[1:]), None)
                if c is not None and c.get('_start50c') and not c.get('_opener50c'): c['_opener50c'] = turn.get('who')


def pet_part(code, entry, names, emitted):
    """Lượt một mình `serveBowl` / `takeOutOfCarrier` của người: con vật làm phần của nó cùng lúc (đi tới bát rồi ăn / bước ra khỏi lồng)."""
    if not isinstance(entry, dict) or 'say' in entry or not code.startswith('['): return code
    plans = [PLAN.get(id(step)) for step in _steps(entry) if PLAN.get(id(step))]
    if not plans or len(entry.get('do', [])) != 1: return code
    plan = plans[0]
    steps = ', '.join(js(step) for step in plan['steps'])
    emitted[0] += 1
    return '{ together: [' + code + f", [{plan['pet']}, {plan['delay']:g}, {steps}]] }}"


def beat(beat_, entry, names):
    """Nhịp đạo diễn: góc TOÀN người + con vật (bát dưới sàn, lồng cạnh chân)."""
    group = entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
    found = [(turn, step) for turn in group for step in _steps(turn)]
    if not found or beat_.get('fixed') or not beat_.get('subjects'): return
    beat_['size'] = 'full'
    beat_.pop('mid', None)
    for turn, step in found:
        for name in [turn['who']] + [item[1:] for item in step[1:] if isinstance(item, str) and item.startswith('@') and item[1:] in names]:
            if name in names and names[name]['name'] not in beat_['subjects']: beat_['subjects'].append(names[name]['name'])


def plan_moments(op, start, duration, end_of_scene):
    """Các lúc đo (tools/acting_check.py `feed50c` / `carrier50c`) theo nhịp của rig, tính từ đầu bước."""
    r = lambda a: round(start + a, 2)
    if op['kind'] == 'feed50c':
        ready = BOWL_POUR + 0.6 + op['hold'] + 0.75
        eat_at = ready + (1.0 if op['walk'] else 0) + 0.9
        check = {'down': [r(1.2)], 'pour': [r(BOWL_POUR + 0.3), r(BOWL_POUR + 0.3 + op['hold'] * 0.5)], 'full': [r(ready)], 'mouth': [r(eat_at), r(eat_at + 0.6), r(eat_at + 1.2)],
                 'stays': [round(min(end_of_scene - 0.05, start + duration + 0.5), 2)]}
        ask = [f'Is {op["who"]} pouring {"water" if op["eat"] == "drink" else "dry food"} into a pet bowl on the floor?', f'Is the animal ({op["target"]}) {"drinking" if op["eat"] == "drink" else "eating"} from the bowl on the floor?']
        times = [r(BOWL_POUR + 0.4), r(eat_at), r(eat_at + 0.6)]
    else:
        name = op['name']
        check = {}
        if name == 'putInCarrier':
            # nhịp đang bế sẵn (lượt `carry` thêm trước): mở cửa ~1,2 s, hạ con vật ~2,2 s, đóng cửa xong ~3,9 s
            check = {'open': [r(1.45)], 'openIn': [r(2.3)], 'inside': [r(4.05)], 'closed': [r(4.05)],
                     'held': [round(min(start + duration - 0.05, end_of_scene - 0.05), 2)] if op['carry'] else []}
        elif name == 'takeOutOfCarrier':
            base = CARRIER_SET if op['from_hand'] else 0
            check = {'inside': [r(base + 0.3)] if not base else [r(base + 0.3)], 'open': [r(base + CARRIER_OPEN - 0.05)], 'out': [round(min(start + base + CARRIER_OPEN + 0.85 + 2.7, end_of_scene - 0.05), 2)],
                     'carried': [t for t in (round(start - 0.6, 2), r(0.15)) if t > 0.2] if base else []}
        elif name == 'pickUpCarrier':
            check = {'held': [round(min(start + duration - 0.05, end_of_scene - 0.05), 2)]}
        else:
            check = {'down': [round(min(start + duration - 0.05, end_of_scene - 0.05), 2)], 'carried': [t for t in (round(start - 0.6, 2), r(0.15)) if t > 0.2]}
        ask = [f'Is {op["who"]} {"opening" if name in ("putInCarrier", "takeOutOfCarrier") else "carrying" if name == "pickUpCarrier" else "setting down"} a pet carrier?']
        times = [t for key in ('open', 'inside', 'held', 'down', 'out') for t in check.get(key, [])][:3] or [r(1.0)]
    return {'times': times, 'ask': ask, 'check': dict(check, kind=op['kind'], name=op['name'], who=op['who'], target=op['target'], carrier=op.get('carrier'), times=times)}


