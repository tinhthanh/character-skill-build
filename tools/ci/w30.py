"""Đợt 30 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('sofa30')
def sofa30(work, problems):
    stage = STAGE
    TAG = scratch('sofa30')
    # Đợt 30: bà ngồi sofa vuốt con mèo đi tới rồi bế nó (phòng khách khung ngang). acting_check đo tay tới ĐẦU / THÂN THẤY ĐƯỢC
    # của con mèo (không tới khung chụp — tay đặt trên gối mình vẫn "chạm") và tay không nằm trên đùi / gối của bà; và đồ đạc
    # (TV, bàn nước, sofa) không bị mép khung cắt ở mọi khoảnh khắc của moments.json (TV lộ nửa ở mép phải góc mở đầu).
    sofa = {'id': 'sofa', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [
        {'name': 'ba', 'id': 'granny', 'z': -820, 'x': -300, 'on': 'sofa', 'seated': True}, {'name': 'meo', 'species': 'cat', 'z': -820, 'x': 200}],
        'script': [{'who': 'ba', 'do': [['stroke', '@meo']]}, {'who': 'ba', 'do': [['carry', '@meo']]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_sofa.json')
    try:
        json.dump(sofa, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'sofa'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('sofa: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'sofa', 'index.html'), encoding='utf-8').read()
        if 'set.box({ x: -560' not in html or 'name: "sofa"' not in html: problems.append('sofa: the boxes are not named (set.propFraming reports them by name)')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'sofa')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('sofa: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'ba stroke meo — hand reaches' not in done.stdout or 'furniture inside the frame at 1 s (opening)' not in done.stdout:
            problems.append('sofa: acting_check did not measure the stroke or the furniture at the edges:\n' + done.stdout[-400:])
        # Đợt 31: con mèo đứng TRƯỚC ống chân bà (0.70.0: thấy 66 %, bà cúi 40°), tay bà trên đỉnh đầu nó; góc trung hẹp hơn 85 %
        # góc toàn (0.70.0: 99 % — máy lùi lấy trọn bàn nước).
        elif 'meo in view at' not in done.stdout or "ba's hand on meo in view" not in done.stdout or "ba's hand rests on meo" not in done.stdout or 'ba stroke meo — leans no more than' not in done.stdout or 'medium shot of' not in done.stdout:
            problems.append('sofa: acting_check did not measure the cat in view, the hand in view, the lean or the medium shot:\n' + done.stdout[-400:])
        if "set.target(ba, meo, 'crown'" not in html: problems.append("sofa: granny does not aim at the top of the cat's head (set.target(ba, meo, 'crown'))")
        # Đợt 32: tay bà áp và trượt trên đầu con mèo SUỐT lúc vuốt — đo mỗi 0,1 s (0.71.0: 4 / 13 mốc tay nhấc khỏi đầu, có lúc
        # 64 % bàn tay lún sau viền đầu mèo).
        if 'ba strokes meo — hand on it throughout' not in done.stdout or 'ba strokes meo — hand not sunk past its outline' not in done.stdout:
            problems.append('sofa: acting_check did not follow the hand through the strokes:\n' + done.stdout[-400:])
