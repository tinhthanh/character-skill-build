"""Đợt 27 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('grain27')
def grain27(work, problems):
    stage = STAGE
    bad_film = os.path.join(work, 'bad-film.json')
    TAG = scratch('grain27')
    # Đợt 27: hạt phim ở bước ghép phim — "grain" lạ bị từ chối; scene.py --no-grain tắt lớp hạt trong trang.
    json.dump({'scenes': ['x.json'], 'grain': 'heavy'}, open(bad_film, 'w'))
    done = subprocess.run([sys.executable, os.path.join(HERE, 'film.py'), bad_film], capture_output=True, text=True)
    if done.returncode == 0 or '"grain"' not in done.stderr: problems.append('film.py: a bad "grain" is not refused clearly — ' + done.stderr.strip()[:160])
    grained = json.load(open(stage, encoding='utf-8'))
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_grain.json')
    try:
        json.dump(grained, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), path, '-o', os.path.join(work, 'nograin'), '--no-grain'], capture_output=True, text=True)
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('--no-grain: the scene does not build: ' + done.stderr.strip()[:300])
    elif '"grain": false' not in open(os.path.join(work, 'nograin', 'index.html'), encoding='utf-8').read(): problems.append('--no-grain: the grain layer is still on')
    if not os.path.isfile(os.path.join(work, 'nograin', 'gsap.min.js')): problems.append('the pinned GSAP (vendor/) is not copied next to the composition')

    for outdoor in ('park', 'street'):
        scene = {'id': outdoor, 'set': {'preset': outdoor}, 'characters': [{'name': 'boy', 'id': 'boy', 'x': -200, 'z': -500, 'holds': 'leash'}, {'name': 'dog', 'species': 'dog', 'x': 0, 'z': -500}],
                 'script': [{'who': 'boy', 'do': [['leash', '@dog']]}, {'together': [{'who': 'boy', 'do': [['walk', 4, 200]]}, {'who': 'dog', 'do': [['walk', 4, 300]]}]},
                           {'together': [{'who': 'dog', 'do': ['greet']}, {'who': 'boy', 'do': ['unleash']}]}]}
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_{outdoor}.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'))
            done = build(path, os.path.join(work, outdoor))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: problems.append(f'set.preset "{outdoor}" does not build: ' + done.stderr.strip()[:300])
        elif '"tree"' not in open(os.path.join(work, outdoor, 'index.html'), encoding='utf-8').read(): problems.append(f'set.preset "{outdoor}": no tree cutout')
        elif 'window.__framing' not in open(os.path.join(work, outdoor, 'index.html'), encoding='utf-8').read(): problems.append(f'set.preset "{outdoor}": no framing sweep (window.__framing)')
