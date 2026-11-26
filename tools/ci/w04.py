"""Đợt 4 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('care4')
def care4(work, problems):
    stage = STAGE
    TAG = scratch('care4')
    # Đợt 4: bát, cân, dây dắt, khám bằng đèn soi, bánh thưởng — người bước lại sát con vật trước khi soi.
    care = json.load(open(stage, encoding='utf-8'))
    care['set'].setdefault('cutouts', []).extend([{'kind': 'bowl', 'x': -300, 'z': -500, 'fill': 'water'}, {'kind': 'scale', 'x': 500, 'z': -600, 'reading': '4.2 kg'}, {'kind': 'carrier', 'x': 300, 'z': -500, 'door': 'left'}])
    boy = next(who for who in care['characters'] if who.get('id') == 'boy'); boy['holds'] = 'leash'
    next(who for who in care['characters'] if who.get('species') == 'cat')['wears'] = ['cone', 'bandage']
    next(who for who in care['characters'] if who.get('id') == 'vet')['wears'] = ['mask', 'gloves', 'cap']
    care['script'] += [{'who': 'vet', 'do': [['examine', '@cat', 'teeth'], ['giveTreat', '@cat'], ['shine', '@cat'], 'ponder', 'callOut', ['brush', '@cat'], 'fingerHeart', 'thumbsDown']},
                       {'who': 'boy', 'do': [['leash', '@cat'], 'unleash']},
                       {'who': 'boy', 'do': [['carry', '@cat']]},
                       {'together': [{'who': 'boy', 'do': [['handOverPet', '@vet']]}, {'who': 'vet', 'do': [['takePet', '@boy']]}]},
                       {'who': 'vet', 'do': ['putDown', 'kneel', 'standUp', ['throwBall', 'right']]}, {'who': 'cat', 'do': ['scratchItch', ['limp', 4], 'openMouth']}]
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_care.json')
    try:
        json.dump(care, open(path, 'w', encoding='utf-8'))
        done = build(path, os.path.join(work, 'care3d'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a scene with vet-care steps does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'care3d', 'index.html'), encoding='utf-8').read().replace("'", '"')
        for needle in ('"bowl", {"fill": "water"}', '"reading": "4.2 kg"', '"examine", set.target(vet, cat), "teeth"', '"giveTreat", set.target(vet, cat)', '"shine", set.aimAt(vet, cat)', '["leash", cat]', 'steps closer to cat for "examine"', 'items: {"R": "leash"}', 'wear: ["cone", "bandage"]', '"brush", set.target(vet, cat, "body")', '"door": "left"', '["handOverPet", vet]', '["takePet", boy]', 'wear: ["mask", "gloves", "cap"]'):
            if needle not in html: problems.append(f'vet care: {needle} is not in the composition')
