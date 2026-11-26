"""Đợt 7 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('split_call')
def split_call(work, problems):
    stage = STAGE
    TAG = scratch('split_call')
    # Đợt 7: màn hình chia đôi khi gọi điện, thẻ thông báo trên khung.
    call = call_scene()
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_call.json')
    try:
        json.dump(call, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'call'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a split-screen call does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'call', 'index.html'), encoding='utf-8').read()
        for needle in ('id="wall-left"', 'id="wall-right"', 'id="divider"', 'id="dim-right"', "tl.to('#dim-left', { opacity: 0.32", 'id="toast-1"', 'id="toast-2"', 'data-text="Lịch tái khám"', '["notify", "Nhắc lịch: Thứ Bảy"]'):
            if needle not in html: problems.append(f'split call: {needle} is not in the composition')
        starts = [float(value) for value in re.findall(r'id="toast-\d"[^>]*data-start="([\d.]+)"', html)]
        if len(starts) != 2 or not (0 < starts[0] < starts[1]): problems.append(f'split call: the notification cards are not timed to their turns (data-start {starts})')
    for label, change, needle in [
        ('a split character without a side', lambda s: s['characters'][0].pop('side'), '"side"'),
        ('"sides" without the split layout', lambda s: s.pop('layout'), 'split'),
        ('a toast with an unknown key', lambda s: s['script'][0].update({'toast': {'title': 'a', 'icon': 'x'}}), 'toast'),
    ]:
        variant = json.loads(json.dumps(call)); change(variant)
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_callbad.json')
        try:
            json.dump(variant, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, 'callbad'))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')
