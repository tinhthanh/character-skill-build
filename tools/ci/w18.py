"""Đợt 18 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('film18')
def film18(work, problems):
    script_tool = os.path.join(HERE, 'script.py')
    # Đợt 18: kịch bản nhiều cảnh → film.json; mở đầu "hook"; thông báo trong kịch bản chữ.
    multi = os.path.join(work, 'phim.txt')
    open(multi, 'w', encoding='utf-8').write('khung: dọc · nhạc: nen.mp3\nmở đầu: hook | Mèo bỏ ăn? | Gọi VetGo\nkết thúc: VetGo | Tải app\n'
                                             'bà (granny) · mèo (calico) · bác sĩ (vet)\n\n=== nhà · bối cảnh: phòng khách · ánh sáng: tối\nbà (granny, ngồi)\n'
                                             'mèo: [buồn ngủ]\nbà: [bật đèn]\nthông báo: VetGo | Đặt lịch 8:00\nbà: Mai mình đi khám nhé.\n'
                                             '=== khám · bối cảnh: phòng khám\nmèo (calico, trên bàn)\nbác sĩ → mèo: khám\n')
    done = subprocess.run([sys.executable, script_tool, multi, '--no-build'], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py: a script with scenes is refused: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        one, two = (json.load(open(os.path.join(work, f'phim-{n}.scene.json'), encoding='utf-8')) for n in (1, 2))
        film = json.load(open(os.path.join(work, 'phim.film.json'), encoding='utf-8'))
        for got, want in [(one.get('hook'), {'title': 'Mèo bỏ ăn?', 'text': 'Gọi VetGo'}), ('outro' in one, False), (two.get('outro', {}).get('title'), 'VetGo'),
                          (one['set'], {'preset': 'living-room', 'light': 'night'}), (sorted(c['name'] for c in one['characters']), ['ba', 'meo']),
                          (next(c for c in one['characters'] if c['name'] == 'ba').get('seated'), True), (next(c for c in two['characters'] if c['name'] == 'meo').get('on'), 'table'),
                          (one['script'][2].get('toast'), {'title': 'VetGo', 'text': 'Đặt lịch 8:00'}), (one['script'][1].get('lamp'), 'on'),
                          (film.get('scenes'), ['phim-1.scene.json', 'phim-2.scene.json']), (film.get('music'), 'nen.mp3'), ('music' in one, False)]:
            if got != want: problems.append(f'script.py (scenes): expected {want!r} — got {got!r}')
