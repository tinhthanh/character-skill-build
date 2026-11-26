"""Đợt 9 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('screens9')
def screens9(work, problems):
    stage = STAGE
    TAG = scratch('screens9')
    # Đợt 9: thông báo trên màn hình đạo cụ trong bối cảnh 3D, gọi theo tên.
    screens = {'id': 'screens', 'set': {'preset': 'reception', 'cutouts': [{'kind': 'monitor', 'name': 'screen', 'x': -120, 'z': -460, 'y': 190}, {'kind': 'plant', 'name': 'fern', 'x': 600, 'z': 0}]},
               'characters': [{'name': 'rec', 'id': 'receptionist', 'x': -300, 'z': -620}],
               'script': [{'who': 'rec', 'do': ['nod'], 'popup': {'on': 'screen', 'title': 'Lịch hẹn mới', 'text': 'Milo 15:00'}}]}
    def screen_scene(change):
        scene = json.loads(json.dumps(screens)); change(scene)
        path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_screens.json')
        try:
            json.dump(scene, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            return build(path, os.path.join(work, 'screens'))
        finally:
            if os.path.exists(path): os.remove(path)
    done = screen_scene(lambda s: None)
    if done.returncode != 0: problems.append('a popup on a monitor does not build: ' + done.stderr.strip()[:300])
    elif not re.search(r'cutout\d+Prop\.notify\(\{"title": "Lịch hẹn mới", "text": "Milo 15:00"\}, \{ hold: 2\.5 \}\)', open(os.path.join(work, 'screens', 'index.html'), encoding='utf-8').read()): problems.append('popup: the notification call is not in the composition')
    for label, change, needle in [
        ('a popup on a screen that does not exist', lambda s: s['script'][0]['popup'].update({'on': 'tv'}), '"tv"'),
        ('a popup on a plant', lambda s: s['script'][0]['popup'].update({'on': 'fern'}), 'monitor'),
        ('a popup without text', lambda s: s['script'][0].update({'popup': {'on': 'screen'}}), 'popup'),
    ]:
        done = screen_scene(change)
        if done.returncode == 0: problems.append(f'{label}: the scene was accepted')
        elif needle not in done.stderr: problems.append(f'{label}: the error does not mention {needle!r} — got: {done.stderr.strip()[:160]}')
