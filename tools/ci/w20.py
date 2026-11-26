"""Đợt 20 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('power20')
def power20(work, problems):
    stage = STAGE
    script_tool = os.path.join(HERE, 'script.py')
    call = call_scene()
    TAG = scratch('power20')
    # Đợt 20: mất điện / có điện, trời chuyển giờ trong kịch bản chữ.
    sky = os.path.join(work, 'troi.txt')
    open(sky, 'w', encoding='utf-8').write('bối cảnh: phòng khách · ánh sáng: chiều → tối\nbà (granny)\nbà: Chiều rồi.\nbà: [mất điện]\nbà: [có điện]\nbà: [trời sáng]\n')
    done = subprocess.run([sys.executable, script_tool, sky, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py: power / sky words are refused: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        got = json.load(open(os.path.join(work, 'troi.scene.json'), encoding='utf-8'))
        steps = [{k: v for k, v in turn.items() if k in ('power', 'sky')} for turn in got['script']]
        # "chiều → tối": trời chuyển ở lượt giữa cảnh (lượt thứ 3 trong 4).
        if got['set'].get('light') != 'evening' or steps != [{}, {'power': 'off'}, {'power': 'on', 'sky': {'to': 'night', 'dur': 6}}, {'sky': 'day'}]:
            problems.append(f'script.py (power / sky): got light {got["set"].get("light")!r}, turns {steps!r}')
    hooked = json.loads(json.dumps(call)); hooked['hook'] = {'title': 'Bé ăn nhầm sô-cô-la?', 'text': 'Gọi VetGo'}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_hook.json')
    try:
        json.dump(hooked, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'hook'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('hook: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'hook', 'index.html'), encoding='utf-8').read()
        for needle in ('id="hook-title"', 'id="hook-text"', "tl.from('#hook-title'", 'const T0 = 0;'):
            if needle not in html: problems.append(f'hook: {needle} is not in the composition')

    def variant3d(change):
        scene = json.load(open(stage, encoding='utf-8')); change(scene); return scene
    for label, change, needle in [
        ('flat props in a 3D set', lambda s: s.update({'props': [{'kind': 'table', 'x': 300}]}), 'set.boxes'),
        ('a flat background in a 3D set', lambda s: s.update({'background': {'wall': '#fff'}}), 'set.room'),
        ('the 2D camera in a 3D set', lambda s: s.update({'camera': True}), 'view'),
        ('the 2D camera shot in a 3D set', lambda s: s['script'][0].update({'shot': 'face'}), 'view'),
        ('seated without a chair kind', lambda s: s['characters'][0].update({'seated': 'sofa'}), 'seated'),
        ('standing on a box that does not exist', lambda s: s['characters'][2].update({'on': 'shelf'}), 'shelf'),
        ('an unknown camera key in a view', lambda s: s['script'][0]['view'].update({'roll': 5}), 'roll'),
        ('a view that changes nothing', lambda s: s['script'][0].update({'view': {'dur': 2}}), 'changes nothing'),
        ('an unknown set key', lambda s: s['set'].update({'lights': []}), 'lights'),
        ('a camera looking down from too high', lambda s: s['script'][0]['view'].update({'pitch': 30}), 'pitch'),
        ('a camera swung round too far', lambda s: s['script'][0]['view'].update({'yaw': 75}), 'yaw'),
        ('the old isometric view', lambda s: s['script'][3].update({'view': {'isometric': True}}), 'wide'),
        ('too high a starting camera', lambda s: s['set'].update({'camera': {'pitch': 25}}), 'pitch'),
        ('a cutout of an unknown kind', lambda s: s['set']['cutouts'].append({'kind': 'fountain', 'x': 0, 'z': 0}), 'fountain'),
        ('a cutout with a missing picture', lambda s: s['set']['cutouts'].append({'image': 'nope.png', 'x': 0, 'z': 0}), 'nope.png'),
        ('a cutout without a position', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'x': 0}), '"z"'),
        ('too much blur', lambda s: s['script'][0]['view'].update({'blur': 50}), 'blur'),
        ('an unknown set preset', lambda s: s['set'].update({'preset': 'spa'}), 'reception'),
        ('a phone line for someone without a phone', lambda s: s['script'].insert(0, {'who': 'vet', 'say': 'Alo', 'phone': True}), 'holds'),
        ('a phone turn without a line', lambda s: s['characters'][0].update({'holds': 'phone'}) or s['script'].insert(0, {'who': 'vet', 'do': ['nod'], 'phone': True}), '"say"'),
        ('a screen on a plant', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'x': 0, 'z': 0, 'screen': 'a.png'}), 'laptop'),
        ('a reading on a bowl', lambda s: s['set']['cutouts'].append({'kind': 'bowl', 'x': 0, 'z': 0, 'reading': '1 kg'}), 'scale only'),
        ('a person wearing a cone', lambda s: s['characters'][0].update({'wears': 'cone'}), 'a person'),
        ('a pet wearing a hat', lambda s: next(w for w in s['characters'] if w.get('species')).update({'wears': 'hat'}), 'cone or bandage'),
        ('a bowl full of soup', lambda s: s['set']['cutouts'].append({'kind': 'bowl', 'x': 0, 'z': 0, 'fill': 'soup'}), 'fill'),
        ('a laptop facing up', lambda s: s['set']['cutouts'].append({'kind': 'laptop', 'x': 0, 'z': 0, 'facing': 'up'}), 'facing'),
        ('a picture on a cup', lambda s: s['characters'][0].update({'holds': {'R': {'kind': 'cup', 'image': 'a.png'}}}), 'holds'),
        ('a panel picture that is missing', lambda s: s['set']['panels'].append({'wall': 'back', 'at': 0, 'y': 400, 'width': 100, 'height': 100, 'image': 'nope.png'}), 'nope.png'),
        ('a box without a size', lambda s: s['set']['boxes'].append({'x': 0, 'z': 0}), 'width'),
        ('a view inside together', lambda s: s['script'].append({'together': [{'who': 'vet', 'do': ['nod'], 'view': {'yaw': 5}}, {'who': 'boy', 'do': ['nod']}]}), 'together'),
        ('z without a set', lambda s: s.pop('set') and [turn.pop('view', None) for turn in s['script']] and s['characters'][2].pop('on'), '"set"'),
        ('a view without a set', lambda s: s.pop('set') and [who.pop('z', None) or who.pop('on', None) for who in s['characters']], '"set"'),
        ('a view word that is not a size', lambda s: s['script'][1].update({'view': 'tight'}), 'medium'),
        ('an automatic view on nobody', lambda s: s['script'][1].update({'view': {'on': 'ghost'}}), 'view.on'),
        ('an automatic view of a wrong size', lambda s: s['script'][1].update({'view': {'on': 'vet', 'size': 'huge'}}), 'view.size'),
        ('an unknown mark', lambda s: s['script'][1].update({'mark': 'star'}), '"mark"'),
        ('"marks" that is not true / false', lambda s: s.update({'marks': 'no'}), '"marks"'),
        ('a missing sound file', lambda s: s.update({'sounds': {'wave': 'nope.wav'}}), 'nope.wav'),
        ('a camera other than "auto" in a set', lambda s: s.update({'camera': 'close'}), '"auto"'),
        ('an unknown time of day', lambda s: s['set'].update({'light': 'dusk'}), 'set.light'),
        ('a lamp of an unknown kind', lambda s: s['set'].update({'lamps': [{'x': 0, 'y': 600, 'z': -500, 'kind': 'neon'}]}), 'ceiling'),
        ('a lamp switched where there is none', lambda s: s['script'][1].update({'lamp': 'on'}), 'no lamps'),
        ('an unknown sky', lambda s: s['script'][1].update({'sky': 'dusk'}), '"sky"'),
        ('a power word that is not on / off', lambda s: s['script'][1].update({'power': 'cut'}), '"power"'),
        ('a window on a side wall', lambda s: s['set'].setdefault('panels', []).append({'wall': 'left', 'at': -300, 'y': 500, 'width': 200, 'height': 200, 'window': True}), 'back wall'),
        ('riding something that is not a scooter', lambda s: s['characters'][0].update({'rides': 'table'}), 'scooter'),
        ('a pet that bandages', lambda s: s['script'].append({'who': s['characters'][2]['name'], 'do': [['bandage', '@' + s['characters'][0]['name']]]}), 'a pet cannot'),
        ('a bandage without a pet', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': ['bandage']}), 'needs the pet'),
        ('a cone put on a person', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': [['putCone', '@' + s['characters'][1]['name']]]}), 'needs the pet'),
        ('reading a chart without a clipboard', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': [['readChart', 2]]}), 'clipboard'),
        ('an X-ray viewer that is not there', lambda s: s['script'].append({'who': s['characters'][0]['name'], 'do': [['showXray', 'nope']]}), 'no set.cutouts'),
        ('an X-ray on a plant', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'name': 'pl', 'x': 0, 'z': -300}) or s['script'].append({'who': s['characters'][0]['name'], 'do': [['showXray', 'pl']]}), '"xray" viewer'),
        ('a film spot on a plant', lambda s: s['set']['cutouts'].append({'kind': 'plant', 'x': 0, 'z': -300, 'spot': [0.5, 0.5]}), 'spot'),
        ('a film spot off the film', lambda s: s['set']['cutouts'].append({'kind': 'xray', 'x': 0, 'z': -300, 'spot': [1.5, 0.5]}), 'spot'),
        ('a drive without "from"', lambda s: s['set']['cutouts'].append({'kind': 'scooter', 'name': 'moto', 'x': 0, 'z': -300, 'drive': {'dur': 3}}), '"from"'),
        ('a pet that rides', lambda s: s['set']['cutouts'].append({'kind': 'scooter', 'name': 'moto', 'x': 0, 'z': -300}) or s['characters'][2].update({'rides': 'moto'}), 'cannot ride'),
        ('a scooter facing up', lambda s: s['set']['cutouts'].append({'kind': 'scooter', 'x': 0, 'z': -300, 'facing': 'up'}), 'facing'),
        # Đợt 35: cân, đo nhiệt độ, cho uống thuốc.
        ('weighing on a scale that is not there', lambda s: s['script'].append({'who': 'vet', 'do': [['weigh', '@cat', 'nope']]}), '"kind": "scale"'),
        ('weighing a person', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -330}) or s['script'].append({'who': 'vet', 'do': [['weigh', '@boy', 'can']]}), 'the pet'),
        ('a scale far behind the person', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -900}) or s['script'].append({'who': 'vet', 'do': [['weigh', '@cat', 'can']]}), 'same z'),
        ('a pet that weighs', lambda s: s['set']['cutouts'].append({'kind': 'scale', 'name': 'can', 'x': 0, 'z': -330}) or s['script'].append({'who': 'cat', 'do': [['weigh', '@cat', 'can']]}), 'by a person'),
        ('a temperature held for a minute', lambda s: s['script'].append({'who': 'vet', 'do': [['takeTemp', '@cat', 60]]}), 'hold'),
        ('a pill with extra words', lambda s: s['script'].append({'who': 'vet', 'do': [['givePill', '@cat', 'twice']]}), 'just the pet'),
        ('a pet licking a pet', lambda s: s['script'].append({'who': 'cat', 'do': [['lick', '@cat']]}), 'licks a person'),
        ('a cat chasing its tail', lambda s: s['script'].append({'who': 'cat', 'do': [['chaseTail', 2]]}), 'is for dogs'),
        # Đợt 38 A: cắt móng, nhỏ mắt, vệ sinh tai, quét chip.
        ('nails cut on a back paw', lambda s: s['script'].append({'who': 'vet', 'do': [['clipNails', '@cat', {'paw': 'back'}]]}), '"front"'),
        ('eye drops held for a minute', lambda s: s['script'].append({'who': 'vet', 'do': [['eyeDrops', '@cat', {'hold': 60}]]}), 'hold must be'),
        ('a chip number that is not text', lambda s: s['script'].append({'who': 'vet', 'do': [['scanChip', '@cat', {'id': 900123}]]}), 'chip number'),
        ('ears cleaned on a person', lambda s: s['script'].append({'who': 'vet', 'do': [['cleanEars', '@boy']]}), 'needs the pet'),
        ('a pet that scans a chip', lambda s: s['script'].append({'who': 'cat', 'do': [['scanChip', '@cat']]}), 'done by a person'),
        ('a clipper with extra words', lambda s: s['script'].append({'who': 'vet', 'do': [['clipNails', '@cat', 'quickly']]}), '"clipNails" takes'),
    ]:
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{abs(hash(label)) % 100000}.json')
        try:
            json.dump(variant3d(change), open(path, 'w', encoding='utf-8'))
            done = build(path, os.path.join(work, 'bad3d'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif 'Traceback' in done.stderr: problems.append(f'{label}: the tool crashed instead of explaining — {done.stderr.strip().splitlines()[-1][:160]}')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')
