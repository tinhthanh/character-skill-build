"""Đợt 16 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('light16')
def light16(work, problems):
    stage = STAGE
    TAG = scratch('light16')
    # Đợt 16: ánh sáng — giờ trong ngày, đèn (bật / tắt theo lượt), cửa sổ hắt nắng.
    lit = json.load(open(stage, encoding='utf-8'))
    lit['set']['light'] = 'night'
    lit['set']['lamps'] = [{'name': 'tran', 'x': 0, 'y': 650, 'z': -500, 'kind': 'ceiling', 'color': '#ffe2b0'}]
    lit['set'].setdefault('panels', []).append({'wall': 'back', 'at': -200, 'y': 560, 'width': 300, 'height': 220, 'window': True})
    lit['script'][1]['lamp'] = 'on'
    lit['script'].append({'who': 'vet', 'lamp': {'name': 'tran', 'on': False, 'dur': 1}})
    lit['script'].append({'who': 'vet', 'power': 'off'})                             # đợt 20: mất điện, trời chuyển, tắt ống kính
    lit['script'].append({'who': 'vet', 'power': 'on', 'sky': {'to': 'day', 'dur': 4}})
    lit['set']['lens'] = False
    lit['set']['grain'] = False                                                      # đợt 24: bỏ riêng hạt phim
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_light.json')
    try:
        json.dump(lit, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'lit'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('light: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'lit', 'index.html'), encoding='utf-8').read()
        for needle in ('set.light({"mood": "night"', '"kind": "ceiling"', '"on": false', '"windows": [', 'set.lamp("tran", true, 0.6)', 'set.lamp("tran", false, 1)',
                       "['point', set.targetPoint(vet, set.lampPoint(\"tran\"))]", '.start + 0.85', 'set.lamp("tran", false, 0.12)', 'set.lamp("tran", true, 0.9)',
                       'set.shift("day", 4)', '"lens": false', '"grain": false'):
            if needle not in html: problems.append(f'light: {needle} is not in the composition')
        # Đợt 22: moments.json — các khoảnh khắc ánh sáng (mất điện, có điện, trời chuyển, bật / tắt đèn) kèm câu hỏi có / không.
        moments_path = os.path.join(work, 'lit', 'moments.json')
        if not os.path.isfile(moments_path): problems.append('light: moments.json is not written next to the composition')
        else:
            moments = json.load(open(moments_path, encoding='utf-8'))
            whats = [m['what'] for m in moments]
            for wanted in ('opening', 'power cut', 'power back on', 'sky turning to day — end', 'lamp on', 'lamp off'):
                if wanted not in whats: problems.append(f'light: moments.json has no "{wanted}" moment (has {whats})')
            if any(not m['ask'] or not isinstance(m['t'], (int, float)) for m in moments) or [m['t'] for m in moments] != sorted(m['t'] for m in moments):
                problems.append('light: moments.json moments need a time, questions, and to be in time order')
