"""Đợt 28 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('acting28')
def acting28(work, problems):
    stage = STAGE
    TAG = scratch('acting28')
    # Đợt 28: diễn xuất — tay tới đích, chân chạm sàn. Bé quỳ xuống vuốt con chó dưới sàn; bác sĩ nhường chỗ cho bé vuốt con
    # mèo trên bàn khám; bắt tay một chiều thì bé bắt tay lại. Đo bằng tools/acting_check.py (Chrome).
    acting = {'id': 'acting', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [
        {'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': -30}, {'name': 'be', 'id': 'boy', 'z': -560, 'x': -430},
        {'name': 'meo', 'species': 'calico', 'z': -560, 'on': 'table', 'x': 200}, {'name': 'cho', 'species': 'corgi', 'z': -560, 'x': -700}],
        'script': [{'who': 'be', 'do': [['stroke', '@cho']]}, {'who': 'bac_si', 'do': [['listen', '@meo']]}, {'who': 'be', 'do': [['stroke', '@meo']]},
                   {'who': 'bac_si', 'do': [['handshake', '@be']]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_acting.json')
    try:
        json.dump(acting, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'acting'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('acting: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'acting', 'index.html'), encoding='utf-8').read()
        for needle in ('[be, "kneel"', '// bac_si makes room for be by meo', '[be, ["handshake", bac_si]]', '[meo, "purr"]', 'window.__set = set'):
            if needle not in html: problems.append(f'acting: {needle} is not in the composition')
        checks = [m['check'] for m in json.load(open(os.path.join(work, 'acting', 'moments.json'), encoding='utf-8')) if m.get('check')]
        if sorted((c['who'], c['kind'], c['target'], c['to']) for c in checks) != [('bac_si', 'handshake', 'be', 'hands'), ('bac_si', 'listen', 'meo', 'body'), ('be', 'stroke', 'cho', 'body'), ('be', 'stroke', 'meo', 'body')] \
                or any(len(c['times']) != 3 for c in checks):
            problems.append(f'acting: moments.json checks are {checks}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'acting')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('acting: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
