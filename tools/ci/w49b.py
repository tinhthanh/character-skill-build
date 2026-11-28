"""Đợt 49 B — sấy lông (`blowDry`) và tỉa lông (`trimFur`: kéo / tông-đơ): cảnh 3D cho chó trong chậu tắm, mèo và thỏ trên bàn, chó dưới sàn (người
quỳ); acting_check đo gió tới lưng, lông gợn, tai rạp / mắt nheo, lông khô bông, dụng cụ ở lông, kéo mở khép / tông-đơ rung, túm lông rụng, lưng gọn,
tay kia giữ, không che mặt con vật; kịch bản chữ ("sấy lông", "tỉa lông", "cạo lông"); đối số sai bị từ chối."""
from .common import *  # noqa: F401,F403


GROOM49B = {
    # Chó corgi trong chậu tắm trên bàn: tắm → sấy (lông ướt → khô bông) → tỉa bằng kéo.
    'groom49b': ({'id': 'groom49b', 'camera': 'auto', 'set': {'preset': 'exam'},
                  'characters': [{'name': 'bac_si', 'id': 'vet', 'x': 40, 'z': -560, 'faces': 'cho'},
                                 {'name': 'cho', 'species': 'corgi', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'bac_si', 'inTub': True}],
                  'script': [{'who': 'bac_si', 'do': [['bathPet', '@cho']]}, {'who': 'bac_si', 'do': [['blowDry', '@cho']]}, {'who': 'bac_si', 'do': [['trimFur', '@cho']]}]},
                 ('bac_si blowDry cho — the airflow from the dryer reaches its coat', 'bac_si blowDry cho — the fur is blown about in the airflow',
                  'bac_si blowDry cho — ears flutter back, eyes squint in the air', 'bac_si blowDry cho — the coat dries and turns fluffy', 'bac_si blowDry cho — the other hand fluffs the fur',
                  'bac_si trimFur cho — the scissors at its coat', 'bac_si trimFur cho — the scissors snip open and shut', 'bac_si trimFur cho — long tufts on the coat, tufts fall from it as it is trimmed',
                  'bac_si trimFur cho — the coat ends neater', 'bac_si trimFur cho — nothing covers its face for long', 'bac_si blowDry — head turned to cho')),
    # Mèo ngồi trên bàn (đứng dậy cho làm), y tá phía bên kia: tông-đơ rồi sấy.
    'cat49b': ({'id': 'cat49b', 'camera': 'auto', 'set': {'preset': 'exam'},
                'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 360, 'z': -560, 'faces': 'meo'},
                               {'name': 'meo', 'species': 'orange_cat', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'y_ta'}],
                'script': [{'who': 'y_ta', 'do': [['trimFur', '@meo', {'tool': 'clipper'}]]}, {'who': 'y_ta', 'do': [['blowDry', '@meo', {'hold': 2}]]}]},
               ('y_ta trimFur meo — the clipper runs (buzz lines)', 'y_ta trimFur meo — the clipper at its coat', 'y_ta trimFur meo — the other hand steadies it',
                'y_ta trimFur meo — it stays calm', 'y_ta blowDry meo — the airflow from the dryer reaches its coat', 'y_ta blowDry meo — nothing covers its face for long')),
    # Thỏ trên bàn: sấy rồi tông-đơ (đầu to — tay không che mặt nó).
    'rabbit49b': ({'id': 'rabbit49b', 'camera': 'auto', 'set': {'preset': 'exam'},
                   'characters': [{'name': 'y_ta', 'id': 'nurse', 'x': 360, 'z': -560, 'faces': 'tho'},
                                  {'name': 'tho', 'species': 'rabbit', 'on': 'table', 'x': 200, 'z': -560, 'faces': 'y_ta'}],
                   'script': [{'who': 'y_ta', 'do': [['blowDry', '@tho']]}, {'who': 'y_ta', 'do': [['trimFur', '@tho', {'tool': 'clipper'}]]}]},
                  ('y_ta blowDry tho — the fur is blown about in the airflow', 'y_ta blowDry tho — nothing covers its face for long',
                   'y_ta trimFur tho — long tufts on the coat, tufts fall from it as it is trimmed', 'y_ta trimFur tho — nothing covers its face for long')),
    # Chó dưới sàn: người quỳ xuống sấy rồi tỉa bằng kéo.
    'floor49b': ({'id': 'floor49b', 'camera': 'auto', 'set': {'preset': 'exam'},
                  'characters': [{'name': 'cho', 'species': 'shiba', 'x': -250, 'z': -400, 'faces': 'chu'},
                                 {'name': 'chu', 'id': 'owner_woman', 'x': -380, 'z': -400, 'faces': 'cho'}],
                  'script': [{'who': 'chu', 'do': [['blowDry', '@cho']]}, {'who': 'chu', 'do': [['trimFur', '@cho']]}]},
                 ('chu blowDry cho — the airflow from the dryer reaches its coat', 'chu trimFur cho — the scissors at its coat', 'chu trimFur cho — the coat ends neater')),
}


@case('groom49b', parts=('groom49b', 'cat49b', 'rabbit49b', 'floor49b', 'words', 'bad49b'), uses=('blowDry', 'trimFur'))
def groom49b(work, problems, part):
    stage = STAGE
    TAG = scratch('groom49b')
    if part in GROOM49B:
        spec, needles = GROOM49B[part]
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{part}.json')
        try:
            json.dump(spec, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, part))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'{part}: the scene does not build: ' + done.stderr.strip()[:300]); return
        html = open(os.path.join(work, part, 'index.html'), encoding='utf-8').read()
        for needle in ('"blowDry", set.target(', '"trimFur", set.target('):
            if needle not in html: problems.append(f'{part}: {needle} is not in the composition')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, part)], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'{part}: ' + (done.stdout.strip() or done.stderr.strip())[-900:])
        else:
            for needle in needles:
                if needle not in done.stdout: problems.append(f'{part}: acting_check did not measure "{needle}":\n' + done.stdout[-400:])
    if part == 'words':
        # Kịch bản chữ: "sấy lông", "tỉa lông" (kéo), "cạo lông" (tông-đơ).
        text = os.path.join(work, 'groom49b.txt')
        open(text, 'w', encoding='utf-8').write('bối cảnh: phòng khám\nbác sĩ (vet) · chó (corgi, trên bàn) · mèo (cat, trên bàn)\n\n'
                                                'bác sĩ → chó: sấy lông\nbác sĩ → chó: tỉa lông\nbác sĩ → mèo: cạo lông\nbác sĩ → mèo: sấy khô\n')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'script.py'), text, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append('script.py groom49b: ' + (done.stderr or done.stdout).strip()[-300:])
        else:
            made = json.load(open(os.path.join(work, 'groom49b.scene.json'), encoding='utf-8'))
            steps = [t['do'][0] for t in made['script'] if isinstance(t, dict) and t.get('do')]
            want = [['blowDry', '@cho'], ['trimFur', '@cho'], ['trimFur', '@meo', {'tool': 'clipper'}], ['blowDry', '@meo']]
            if steps != want: problems.append(f'script.py groom49b: steps {steps}, want {want}')
    if part == 'bad49b':
        base = GROOM49B['groom49b'][0]
        for label, step, needle in (('dry hold too long', ['blowDry', '@cho', {'hold': 30}], 'hold must be'), ('unknown trim tool', ['trimFur', '@cho', {'tool': 'razor'}], 'tool must be "scissors" or "clipper"'),
                                    ('dry with a tool', ['blowDry', '@cho', {'tool': 'clipper'}], '"blowDry" takes'), ('trim a person', ['trimFur', '@bac_si'], 'needs the pet')):
            bad = json.loads(json.dumps(base)); bad['script'] = [{'who': 'bac_si', 'do': [step]}]
            path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_bad49b.json')
            try:
                json.dump(bad, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
                done = build(path, os.path.join(work, 'bad49b'))
            finally:
                if os.path.exists(path): os.remove(path)
            if done.returncode == 0 or needle not in done.stderr: problems.append(f'bad49b ({label}): should be refused with "{needle}" — got: ' + (done.stderr.strip()[-200:] or 'no error'))
