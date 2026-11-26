"""Đợt 34 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('still34')
def still34(work, problems):
    stage = STAGE
    pair = pair_scene()
    TAG = scratch('still34')
    # Đợt 34: cùng cảnh ấy với MÁY ĐỨNG YÊN (không có lần cắt nào): con mèo tự ĐI một đoạn ngắn sang mặt phẳng của bé, chiều sâu đổi
    # theo bước chân của nó (0.73.0: không cắt, không đi — trượt 0,45 s trên hình, 13 khung).
    still = dict(pair, id='still', camera=False)
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_still.json')
    try:
        json.dump(still, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'still'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('still: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'still', 'index.html'), encoding='utf-8').read()
        if "[meo, ['walk'" not in html: problems.append('still: the cat does not walk into the boy\'s plane before he feeds it')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'still')], capture_output=True, text=True)
        line = next((row for row in done.stdout.splitlines() if 'meo moves to depth -780' in row), '')
        if 'during its own walk' not in line or '✓' not in line: problems.append('still: the cat does not change depth during its own walk:\n' + (line or done.stdout[-400:]))
        # Đợt 34, lượt hai: góc rất rộng, tay bà chỉ ~450 px — acting_check đo lại ở 2× (ở 1× viền răng cưa thành 12 % "lún").
        elif done.returncode != 0: problems.append('still: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'measured at 2×' not in done.stdout: problems.append('still: acting_check did not measure the small stroking hand at 2×:\n' + done.stdout[-400:])
