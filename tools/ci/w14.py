"""Đợt 14 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('directed14')
def directed14(work, problems):
    stage = STAGE
    TAG = scratch('directed14')
    # Đợt 14: đạo diễn tự động ("camera": "auto"), phụ đề dừng ở lần cắt cảnh, con vật nhai khi được cho ăn.
    directed = json.load(open(stage, encoding='utf-8'))
    directed['camera'] = 'auto'
    for turn in directed['script']:
        if isinstance(turn, dict): turn.pop('view', None)
    directed['script'].append({'who': 'vet', 'do': [['giveTreat', '@cat']]})
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_directed.json')
    try:
        json.dump(directed, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'directed'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('"camera": "auto": the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'directed', 'index.html'), encoding='utf-8').read()
        for needle in ('set.direct(tl,', 'speech: true', 'const CUTS = [', 'cuts: (typeof CUTS', "0.95, ['chew', 3]"):
            if needle not in html: problems.append(f'"camera": "auto": {needle} is not in the composition')
