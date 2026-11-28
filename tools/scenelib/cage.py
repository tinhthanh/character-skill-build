"""Wave 49 A: script steps that name a 3D-set prop ("@<cutout name>"), and the boarding cage that uses it — putInCage / takeOutOfCage.

PROP TARGETS. A step whose action is in `PROP_STEPS` takes, at the position the table gives, "@<name>" of a set.cutouts entry (its
"name"). `prop_target` resolves it (or fails clearly: no 3D set, an unknown name, a character's name, a prop of the wrong kind), and
`walk_to_prop` walks the person (x only, like the pay stand) to stand beside the prop at the table's gap before the turn. A new
action that uses a prop adds a row to `PROP_STEPS` and writes its own step code from the resolved cutout.

THE CAGE. A "cage" cutout is TWO hosts at one x: its inside ("cage" prop, stood a little further back) and its front frame with the
barred door ("cageFront", a little nearer). A pet in the cage stands between them (`CAGE_IN` — its depth hops there while it is in
the arms, `set.depth`), so the bars are drawn over it. People stand just in front of the cage (z within `CAGE_Z`), on the latch side —
the door is hinged on the side away from the first person who opens it unless the cutout says "door" (the hinge side)."""
from .util import fail, js

# Action → (position of the "@prop" item, kinds it accepts, gap: person centre beyond the prop's edge, × the person's host height).
PROP_STEPS = {'putInCage': (2, ('cage',), 0.15), 'takeOutOfCage': (2, ('cage',), 0.15)}
CAGE_ACTIONS = ('putInCage', 'takeOutOfCage')
CAGE_SIZE = (170, 140)                 # cỡ ngoài mặc định của chuồng, khung 400 × 470 của nó (runtime/props.js CAGE49A)
CAGE_BACK, CAGE_IN, CAGE_FRONT = -20, -6, 8      # chiều sâu (so với "z" của cutout): lòng chuồng · con vật trong chuồng · khung trước
CAGE_Z = (12, 60)                      # người đứng trước chuồng: z của người − z của chuồng trong khoảng này
PET_BODY = (0.52, 0.5)                 # thân + đầu con vật ≈ bấy nhiêu phần bề ngang / chiều cao host của nó (đo trên 12 giống, đợt 49 A; thỏ cao 0,57 — tai)
# Nhịp của rig (runtime/person/cage.js, đang bế sẵn, `hold` mặc định 0,5): lúc mở cửa giữa chừng, lúc đã đóng cửa xong, lúc đổi chiều sâu.
PUT_OPEN, PUT_CLOSED, PUT_DEPTH = 1.3, 4.2, 0.1
TAKE_OPEN, TAKE_LIFT, TAKE_CLOSED, TAKE_DEPTH = 1.2, 2.05, 4.3, 2.9


def cage_tall(item, person_default):
    return float(item.get('height', round(person_default * 0.74)))


def cage_size(item):
    return tuple(float(v) for v in item.get('size', CAGE_SIZE))


def check_cutouts(stage_set):
    """Các cutout "cage": cỡ (`size`), bản lề (`door`), trên sàn (không `y`); `size` chỉ cho chuồng; tên không trùng."""
    names = [item.get('name') for item in stage_set.get('cutouts', []) if item.get('name')]
    for n, item in enumerate(stage_set.get('cutouts', [])):
        if 'size' in item and item.get('kind') != 'cage': fail(f'set.cutouts[{n}].size is for a "cage": [width, height] in its 400 × 470 frame')
        if item.get('kind') != 'cage': continue
        size = item.get('size', list(CAGE_SIZE))
        if not (isinstance(size, list) and len(size) == 2 and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in size) and 80 <= size[0] <= 380 and 70 <= size[1] <= 400):
            fail(f'set.cutouts[{n}].size must be [width, height] of the cage in its 400 × 470 frame (person-sized host): width 80…380, height 70…400 — got {js(size)}')
        if 'y' in item: fail(f'set.cutouts[{n}]: a "cage" stands on the floor (no "y") — the pet is set down inside on the same floor')
        if 'door' in item and item['door'] not in ('left', 'right'): fail(f'set.cutouts[{n}].door is the side the cage door is hinged on: "left" or "right" — got {js(item["door"])}')
    for name in set(names):
        if names.count(name) > 1: fail(f'set.cutouts: two cutouts are named "{name}" — a step names one by "@{name}"')


def prop_target(st, ref, where, action):
    """"@<name>" → (index, cutout) of the set; fails clearly when it is not a cutout of a kind the action takes."""
    names, stage_set = st.take('names', 'stage_set')
    kinds = PROP_STEPS[action][1]
    if stage_set is None: fail(f'{where}: "{action}" names a prop of a 3D set ("@<cutout name>") — add "set" with a set.cutouts item {{ "kind": "{kinds[0]}", "name": … }}')
    cutouts = stage_set.get('cutouts', [])
    fitting = [c.get('name') for c in cutouts if c.get('kind') in kinds and c.get('name')]
    if not (isinstance(ref, str) and ref.startswith('@')):
        fail(f'{where}: "{action}" needs the {"/".join(kinds)} as "@<name>" of a set.cutouts item (here: {", ".join("@" + n for n in fitting) or "none"}) — got {js(ref)}')
    name = ref[1:]
    index = next((n for n, c in enumerate(cutouts) if c.get('name') == name), None)
    if index is None:
        if name in names: fail(f'{where}: "{ref}" is a character — "{action}" needs a {"/".join(kinds)} of the set here (set.cutouts: {", ".join("@" + n for n in fitting) or "none"})')
        fail(f'{where}: "{ref}" — no set.cutouts item has "name": "{name}" (props of a kind "{action}" takes: {", ".join("@" + n for n in fitting) or "none"})')
    if cutouts[index].get('kind') not in kinds:
        fail(f'{where}: "{ref}" is a "{cutouts[index].get("kind") or "picture"}" cutout — "{action}" needs a {" or ".join(kinds)}')
    return index, cutouts[index]


def _hinge(item, who):
    """Bản lề cửa: "door" của cutout, không thì phía XA người đầu tiên mở nó."""
    if 'door' not in item and '_hinge' not in item: item['_hinge'] = 'left' if float(who['x']) >= float(item['x']) else 'right'
    return item.get('door', item.get('_hinge'))


def walk_to_prop(emitted, st, turn, turns, who):
    """Trước lượt: bước tới đứng cạnh đồ vật mà bước ấy gọi tên — phía chốt cửa (chuồng), cách mép nó `gap` × chiều cao người."""
    person_default, names = st.take('person_default', 'names')
    for step in turn.get('do', []) if isinstance(turn.get('do'), list) else []:
        if not (isinstance(step, list) and step and step[0] in PROP_STEPS) or who.get('seated'): continue
        at, _, gap = PROP_STEPS[step[0]]
        if len(step) <= at: continue
        _, item = prop_target(st, step[at], f'"{who["name"]}" {step[0]}', step[0])
        side = 1 if _hinge(item, who) == 'left' else -1
        half = cage_size(item)[0] / 2 * cage_tall(item, person_default) / 470
        move = float(item['x']) + side * (half + gap * who['_host_height']) - float(who['x'])
        if abs(move) > 0.03 * who['_host_height']:
            turns.append((f'  // {who["name"]} steps up beside {step[at][1:]} for "{step[0]}"', f"[{who['name']}, ['walk', 4, {round(move / who['_unit'])}]]"))
            emitted[0] += 1
            who['x'] = float(who['x']) + move


def split_turns(scene):
    """Đặt vào chuồng mà người ấy CHƯA bế con vật: chèn một lượt `carry` trước (người bước tới bế nó, rồi mới bước tới chuồng)."""
    holding, out = {}, []
    for entry in scene.get('script') or []:
        group = entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
        for turn in group:
            if not isinstance(turn, dict) or not isinstance(turn.get('do'), list): continue
            who = turn.get('who')
            for step in turn['do']:
                name = step if isinstance(step, str) else step[0] if isinstance(step, list) and step else None
                pet = step[1][1:] if isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@') else None
                if name == 'putInCage' and pet and holding.get(who) != pet and turn is entry and turn['do'][0] is step:
                    out.append({'who': who, 'do': [['carry', '@' + pet]]})
                    holding[who] = pet
                if name in ('carry', 'takeOutOfCage') and pet: holding[who] = pet
                if name in ('putDown', 'putInCage'): holding.pop(who, None)
                if name == 'handOverPet' and pet: holding[pet] = holding.pop(who, None)
        out.append(entry)
    scene['script'] = out


def place_in_cage(scene, stage_set):
    """`"inCage": "<cage name>"` trên con vật: nó ở trong chuồng ấy từ đầu cảnh — giữa chuồng, giữa hai lớp (đặt x, z cho nó)."""
    for who in scene.get('characters') or []:
        if not isinstance(who, dict) or 'inCage' not in who: continue
        name = who.get('name')
        if 'species' not in who: fail(f'character "{name}": "inCage" is for a pet (it starts inside a cage) — "{name}" is a person')
        if stage_set is None: fail(f'character "{name}": "inCage" needs a 3D set with a set.cutouts "cage"')
        cage = next((c for c in stage_set.get('cutouts', []) if c.get('kind') == 'cage' and c.get('name') == who['inCage']), None)
        cages = [c.get('name') for c in stage_set.get('cutouts', []) if c.get('kind') == 'cage' and c.get('name')]
        if cage is None: fail(f'character "{name}": "inCage" must name a set.cutouts "cage" (cages here: {", ".join(cages) or "none"}) — got {js(who["inCage"])}')
        for key in ('on', 'enter', 'seated', 'inTub'):
            if who.get(key): fail(f'character "{name}": a pet "inCage" cannot also be "{key}" — it starts inside the cage')
        if 'x' in who and abs(float(who['x']) - float(cage['x'])) > 1: fail(f'character "{name}": "inCage" places it in the middle of the cage — leave out "x" (or give the cage\'s x {float(cage["x"]):g})')
        who['x'], who['z'] = float(cage['x']), float(cage['z']) + CAGE_IN


def setup_code(n, item, tall):
    """Hai host của một chuồng: lòng chuồng (sau con vật) và khung trước có cửa (trước nó) — `cutout<n>Front` là đạo cụ cửa."""
    w, h = cage_size(item)
    options = {'width': w, 'height': h, 'door': item.get('door', item.get('_hinge', 'left'))}
    if item.get('color'): options['color'] = item['color']
    x, z = float(item['x']), float(item['z'])
    label = f"          // {item['name']}" if item.get('name') else ''
    return (f"    const cutout{n + 1} = document.createElement('div'), cutout{n + 1}Prop = VGCharacter.createProp(cutout{n + 1}, 'cage', {js(options)}); set.stand(cutout{n + 1}, {{ x: {x:g}, z: {z + CAGE_BACK:g}, height: {tall:g} }});{label} (inside)\n"
            f"    const cutout{n + 1}Front = document.createElement('div'); VGCharacter.createProp(cutout{n + 1}Front, 'cageFront', {js(options)}); set.stand(cutout{n + 1}Front, {{ x: {x:g}, z: {z + CAGE_FRONT:g}, height: {tall:g}, shadow: false }});{label} (front, door)")


def step_code(st, step, where, actor):
    """["putInCage", "@pet", "@cage", { "hold": 0.5 }] / ["takeOutOfCage", "@pet", "@cage"] → JS; ghi chỗ con vật và lần đổi chiều sâu của nó."""
    names, person_default = st.take('names', 'person_default')
    name = step[0]
    usage = '["putInCage", "@pet", "@<cage>", { "hold": 0.5 }]' if name == 'putInCage' else '["takeOutOfCage", "@pet", "@<cage>"]'
    if actor not in names or names[actor]['_pet']: fail(f'{where}: "{name}" is done by a person, not a pet')
    if len(step) < 3 or not (isinstance(step[1], str) and step[1].startswith('@') and step[1][1:] in names and names[step[1][1:]]['_pet']):
        fail(f'{where}: "{name}" takes {usage} — the pet first, then the cage — got {js(step)}')
    options = step[3] if len(step) > 3 else {}
    if len(step) > 4 or not isinstance(options, dict) or set(options) - ({'hold'} if name == 'putInCage' else set()):
        fail(f'{where}: "{name}" takes {usage} — got {js(step)}')
    if 'hold' in options and not (isinstance(options['hold'], (int, float)) and not isinstance(options['hold'], bool) and 0 <= options['hold'] <= 6): fail(f'{where}: "putInCage" hold must be 0…6 seconds — got {js(options["hold"])}')
    index, cage = prop_target(st, step[2], where, name)
    who, pet = names[actor], names[step[1][1:]]
    tall, (cw, ch) = cage_tall(cage, person_default), cage_size(cage)
    unit_c = tall / 470
    z, my_z = float(cage['z']), float(who.get('z', -300))
    if not CAGE_Z[0] <= my_z - z <= CAGE_Z[1]:
        fail(f'{where}: "{actor}" must stand just in front of the cage "{cage.get("name")}" (z {z:g}) to reach in — give "{actor}" a z between {z + CAGE_Z[0]:g} and {z + CAGE_Z[1]:g} (now {my_z:g})')
    if pet.get('on'): fail(f'{where}: "{pet["name"]}" stands on "{pet["on"]}" — the cage is on the floor: "{name}" needs the pet on the floor (carry it down first)')
    # VỪA CHUỒNG: thân + đầu con vật (≈ PET_BODY phần host của nó) trong ô cửa (khung chuồng trừ hai thanh bên / thanh trên — runtime/props.js).
    pet_w, pet_h = PET_BODY[0] * pet['_host_width'], (0.57 if pet.get('species') == 'rabbit' else PET_BODY[1]) * pet['_host_height']
    room_w, room_h = (cw - 20) * unit_c, (ch - 20) * unit_c
    if pet_w > room_w or pet_h > room_h:
        fail(f'{where}: "{pet["name"]}" is too big for the cage "{cage.get("name")}" (about {pet_w:.0f} × {pet_h:.0f} px, the door opening is {room_w:.0f} × {room_h:.0f}) — give the cage a bigger "size" (now {js(list(cage_size(cage)))}) or the pet a smaller "height"')
    inside = pet['_cage'] if '_cage' in pet else pet.get('inCage')
    if name == 'putInCage' and inside: fail(f'{where}: "{pet["name"]}" is already in the cage "{inside}" — take it out first ("takeOutOfCage")')
    if name == 'takeOutOfCage' and inside != cage.get('name'):
        fail(f'{where}: "{pet["name"]}" is not in the cage "{cage.get("name")}" — put it in first ("putInCage"), or start it there ("inCage": "{cage.get("name")}" on the pet)')
    side = 1 if _hinge(cage, who) == 'left' else -1
    if (1 if float(who['x']) >= float(cage['x']) else -1) != side:
        fail(f'{where}: "{actor}" is on the hinge side of the cage "{cage.get("name")}" (its "door": "{cage.get("door")}") — stand on the other side, or leave out "door"')
    # Chỗ con vật sau bước (cho các lượt sau): giữa chuồng / cạnh chân người, phía xa chuồng (như rig — 60 đơn vị khung + nửa thân nó).
    if name == 'putInCage':
        pet['_drop'] = float(cage['x']) - float(pet['x']); pet['_cage'] = cage.get('name')
        st.arms.pop(actor, None)
    else:
        pet['_drop'] = float(who['x']) + side * (60 * who['_unit'] + 0.5 * pet_w) - float(pet['x']); pet['_cage'] = None
        st.arms[actor] = pet['name']
    # CHIỀU SÂU: con vật vào giữa hai lớp chuồng / ra mặt phẳng của người — lúc nó đang trên tay (hình nó nằm trong hình người bế, không thấy dời).
    counts, lines = st.__dict__.setdefault('cage_count', {}), st.__dict__.setdefault('cage_lines', [])
    nth = counts.get((actor, name), 0); counts[(actor, name)] = nth + 1
    to_z, at = (z + CAGE_IN, PUT_DEPTH) if name == 'putInCage' else (my_z, TAKE_DEPTH)
    lines.append(f"    {{ const step = talk.turns.filter((turn) => turn.rig === {actor}).flatMap((turn) => turn.steps).filter((step) => step.name === {js(name)})[{nth}];          // {pet['name']} {'into' if name == 'putInCage' else 'out of'} {cage.get('name')}\n"
                         f"      if (step) tl.add(set.depth({pet['name']}, {to_z:g}, 0.5), T0 + step.start + {at:g}); }}")
    st.gear_ops.append({'turn': st.emitted[0], 'kind': 'cage49a', 'name': name, 'who': actor, 'target': pet['name'], 'cage': cage.get('name'), 'hold': float(options.get('hold', 0.5))})
    spec = f"{{ at: set.targetPoint({actor}, [{float(cage['x']):g}, 0, {z + CAGE_FRONT:g}]), scale: {unit_c / who['_unit']:.5f}, door: cutout{index + 1}Front }}"
    return '[' + ', '.join([js(name), pet['name'], spec] + ([js({'hold': options['hold']})] if 'hold' in options else [])) + ']'


def cage_plan(op, t0, duration):
    """Các lúc đo (tools/acting_check.py `cage49a`) theo nhịp của rig, tính từ đầu bước."""
    r = lambda a: round(t0 + a, 2)
    hold = op.get('hold', 0.5)
    if op['name'] == 'putInCage':
        check = {'open': [r(PUT_OPEN)], 'inside': [r(PUT_CLOSED), r(min(duration, PUT_CLOSED + 0.6 + hold))], 'closed': [r(PUT_CLOSED)], 'carried': [r(0.6)]}
        ask = [f'Is {op["who"]} opening the door of a cage with one hand while holding the animal ({op["target"]}) with the other arm?',
               f'Is the animal ({op["target"]}) inside the cage, behind its bars, with the door closed?']
        times = [r(PUT_OPEN), r(2.5), r(PUT_CLOSED)]
    else:
        check = {'open': [r(TAKE_OPEN)], 'inside': [r(0.3)], 'carried': [r(TAKE_CLOSED), r(duration - 0.05)], 'closed': [r(TAKE_CLOSED)], 'lift': [r(TAKE_LIFT)]}
        ask = [f'Is {op["who"]} reaching into the open cage with both hands to lift the animal ({op["target"]}) out?',
               f'Is {op["who"]} holding the animal ({op["target"]}) in their arms, with the cage door closed behind?']
        times = [r(TAKE_OPEN), r(TAKE_LIFT), r(TAKE_CLOSED)]
    return {'times': times, 'ask': ask, 'check': dict(check, kind='cage49a', name=op['name'], who=op['who'], target=op['target'], cage=op['cage'], times=times)}
