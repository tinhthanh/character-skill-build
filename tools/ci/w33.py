"""Đợt 33 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('pair33')
def pair33(work, problems):
    stage = STAGE
    TAG = scratch('pair33')
    # Đợt 33: HAI NGƯỜI Ở HAI CHIỀU SÂU cùng với tới một con vật — bà ngồi sofa vuốt con mèo, rồi bé (đứng gần máy hơn) quỳ cho nó
    # ăn. Con mèo đứng ở mặt phẳng của người đang với tới nó, lượt nào người nấy (`set.depth`). 0.72.0: con mèo giữ z riêng, tay
    # bà hở trên đầu nó 13 / 13 mốc (0 % chạm).
    pair = pair_scene()
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_pair.json')
    try:
        json.dump(pair, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'pair'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('pair: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'pair', 'index.html'), encoding='utf-8').read()
        if 'set.depth(meo, -780' not in html: problems.append('pair: the cat does not move into the boy\'s plane before he feeds it (set.depth(meo, -780, …))')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'pair')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('pair: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'ba strokes meo — hand on it throughout' not in done.stdout or 'be giveTreat meo — hand reaches' not in done.stdout:
            problems.append('pair: acting_check did not follow granny\'s stroke or the boy\'s treat:\n' + done.stdout[-400:])
        # Lượt hai: con mèo dời chiều sâu lúc cắt cảnh (hay trong bước đi của nó), không trượt 0,45 s trên hình khi đứng yên (0.73.0
        # lượt đầu: 13 khung).
        elif 'meo moves to depth -780 unseen' not in done.stdout:
            problems.append('pair: acting_check did not measure the cat changing depth:\n' + done.stdout[-400:])


@case('gesture33')
def gesture33(work, problems):
    stage = STAGE
    TAG = scratch('gesture33')
    # Đợt 33: ĐỘNG TÁC TAY trong khung dọc — bé vẫy rồi chỉ tay ra xa (góc trung theo đầu + thân áo: tay chỉ ra ngoài mép phải 60 %
    # bàn tay ở 0.72.0). Góc trung nới theo bàn tay ở lượt có động tác tay, vẫn hẹp hơn 85 % góc toàn.
    gesture = {'id': 'gesture', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'street'}, 'characters': [{'name': 'be', 'id': 'boy', 'z': -400, 'x': 0}],
               'script': [{'who': 'be', 'say': 'Chào mọi người, mình là Bin.', 'do': ['wave']}, {'who': 'be', 'say': 'Nhà mình ở đằng kia kìa.', 'do': ['point']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_gesture.json')
    try:
        json.dump(gesture, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'gesture'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('gesture: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'gesture')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('gesture: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'be wave — hands in the frame' not in done.stdout or 'be point — hands in the frame' not in done.stdout or '0 medium shots kept as the full shot' not in done.stdout:
            problems.append('gesture: acting_check did not measure the hands of the wave and the point:\n' + done.stdout[-400:])


@case('cheer33')
def cheer33(work, problems):
    stage = STAGE
    TAG = scratch('cheer33')
    # Đợt 33, lượt hai: bác sĩ vẫy, bé REO HAI TAY, bác sĩ chỉ tay — khung dọc công viên. Bé reo chữ V cần ~1,02 góc toàn: góc trung
    # 80 % để tay trái lẹm 34 % (0.73.0 lượt đầu) — nay lượt ấy là góc toàn có cả hai tay; mọi bàn tay cách mép ≥ 5 % bề rộng tay.
    cheer = {'id': 'cheer', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'park'}, 'characters': [
        {'name': 'vet', 'id': 'vet', 'z': -560, 'x': -150}, {'name': 'be', 'id': 'boy', 'z': -560, 'x': 250}],
        'script': [{'who': 'vet', 'say': 'Chào cháu, hôm nay đẹp trời quá.', 'do': ['wave']}, {'who': 'be', 'say': 'Dạ chào bác sĩ ạ!', 'do': ['cheer']},
                   {'who': 'vet', 'say': 'Cháu nhìn con chim trên cây kìa.', 'do': ['point']}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_cheer.json')
    try:
        json.dump(cheer, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'cheer'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('cheer: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'cheer')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('cheer: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'be cheer — hands in the frame' not in done.stdout or 'vet point — hands in the frame' not in done.stdout:
            problems.append('cheer: acting_check did not measure the hands of the cheer and the point:\n' + done.stdout[-400:])
        # Đợt 34: khung dọc thì bé REO HẸP (hai nắm tay cạnh vai) — lượt reo giữ GÓC TRUNG, không cắt sang góc toàn giữa chuỗi góc
        # trung (0.73.0: `how: 'gesture'`, góc toàn 116 %).
        else:
            got = page_eval(os.path.join(work, 'cheer'), "(() => window.__set.shotLog.map((s) => ({ subjects: s.subjects, size: s.size, how: s.how || null, ratio: s.ratio })))()")
            html = open(os.path.join(work, 'cheer', 'index.html'), encoding='utf-8').read()
            if "['cheer', { narrow: true }]" not in html: problems.append('cheer: the boy\'s cheer in a vertical frame is not the narrow one (cheer({ narrow: true }))')
            elif not got or any(shot.get('how') == 'gesture' for shot in got): problems.append(f'cheer: the cheer still cuts to the full shot in the middle of the medium shots ({got})')
