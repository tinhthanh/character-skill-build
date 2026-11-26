"""Đợt 13 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('auto_view13')
def auto_view13(work, problems):
    stage = STAGE
    TAG = scratch('auto_view13')
    # Đợt 13: góc máy tự động ("view": "close" / { "on": … }), dấu cảm xúc ("mark"), âm thanh theo động tác ("sounds").
    auto = json.load(open(stage, encoding='utf-8'))
    auto['script'][1]['view'] = 'close'
    auto['script'][2]['view'] = {'on': ['vet', 'boy'], 'size': 'medium'}
    auto['script'][2]['mark'] = '?'
    auto['script'].append({'who': 'cat', 'mood': 'scared', 'do': [['idle', 1]]})
    auto['sounds'] = {'thumbsUp': '../voiceover/voice.wav', 'cat.mood': {'file': '../voiceover/voice.wav', 'volume': 0.5}}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_auto.json')
    try:
        json.dump(auto, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'auto'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('automatic views / marks / sounds: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'auto', 'index.html'), encoding='utf-8').read()
        for needle in ('frameAt(', '"close")', '"medium")', "['mark', \"?\"]", "{ mark: \"!\" }", 'id="sound-1"', 'data-volume="0.5"'):
            if needle not in html: problems.append(f'automatic views / marks / sounds: {needle} is not in the composition')
