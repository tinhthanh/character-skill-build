"""Đợt 10 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('cards')
def cards(work, problems):
    stage = STAGE
    call = call_scene()
    TAG = scratch('cards')
    # Đợt 10: thẻ mở đầu / kết thúc; tools/film.py từ chối khoá lạ (ghép thật cần render — không chạy ở đây).
    cards = json.loads(json.dumps(call))
    cards['intro'] = {'title': 'Đặt lịch trong 30 giây', 'text': 'VetGo'}
    cards['outro'] = {'title': 'VetGo', 'cta': 'Tải app ngay', 'dur': 2.5}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_cards.json')
    try:
        json.dump(cards, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'cards'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('a scene with intro / outro cards does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'cards', 'index.html'), encoding='utf-8').read()
        for needle in ('id="intro-bg"', 'id="intro-title"', 'id="outro-cta"', 'const T0 = 2.6;', 'talk.addTo(tl, T0);'):
            if needle not in html: problems.append(f'cards: {needle} is not in the composition')
        if '__OUTRO_' in html: problems.append('cards: the closing card was not timed (placeholder left in the composition)')
        starts = re.findall(r'id="outro-bg"[^>]*data-start="([\d.]+)"', html)
        toast = re.findall(r'id="toast-1"[^>]*data-start="([\d.]+)"', html)
        if not starts or not toast or not float(toast[0]) > 2.6: problems.append(f'cards: the turns are not shifted after the opening card (toast at {toast})')
    # Đợt 11: tools/film.py bỏ thẻ của các cảnh giữa phim (--no-intro / --no-outro).
    try:
        json.dump(cards, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), path, '-o', os.path.join(work, 'nocards'), '--no-intro', '--no-outro'], capture_output=True, text=True)
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('--no-intro / --no-outro: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'nocards', 'index.html'), encoding='utf-8').read()
        if 'id="intro-bg"' in html or 'id="outro-bg"' in html or 'const T0 = 0;' not in html: problems.append('--no-intro / --no-outro: the cards are still in the composition')
    bad_film = os.path.join(work, 'bad-film.json')
    json.dump({'scenes': ['x.json'], 'soundtrack': 'a.mp3'}, open(bad_film, 'w'))
    done = subprocess.run([sys.executable, os.path.join(HERE, 'film.py'), bad_film], capture_output=True, text=True)
    if done.returncode == 0 or 'soundtrack' not in done.stderr: problems.append('film.py: an unknown key in film.json is not refused clearly — ' + done.stderr.strip()[:160])
