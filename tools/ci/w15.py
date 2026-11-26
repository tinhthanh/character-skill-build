"""Đợt 15 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('script15', tags=('smoke',))
def script15(work, problems):
    # Đợt 15: kịch bản chữ thường (tools/script.py) → tệp cảnh; khung dọc.
    script_tool = os.path.join(HERE, 'script.py')
    good = os.path.join(work, 'kich-ban.txt')
    open(good, 'w', encoding='utf-8').write('bối cảnh: phòng khám · máy: tự động · khung: dọc\nkết thúc: VetGo | Phòng khám thú y\n'
                                            'bác sĩ (vet) · bé trai (boy) · chó (corgi, trên bàn, đeo loa)\n\n# ghi chú\nchó: [sợ]\nbác sĩ: Đừng sợ nhé!\n'
                                            'bé trai (lo lắng): Bé có sao không ạ?\nbác sĩ → chó: cho thuốc\ncùng lúc: bác sĩ: [gật đầu] | chó: [vui, vẫy đuôi]\n')
    done = subprocess.run([sys.executable, script_tool, good], capture_output=True, text=True)
    if done.returncode != 0: problems.append('script.py: a good script does not build: ' + (done.stderr or done.stdout).strip()[-300:])
    else:
        made = json.load(open(os.path.join(work, 'kich-ban.scene.json'), encoding='utf-8'))
        dog = next((c for c in made['characters'] if c.get('species') == 'corgi'), {})
        checks = [(made.get('width'), 1080), (made.get('camera'), 'auto'), (made['set'].get('preset'), 'exam'), (dog.get('on'), 'table'), (dog.get('wears'), ['cone']),
                  (made['script'][0], {'who': 'cho', 'mood': 'scared'}), (made['script'][2].get('mood'), 'worried'),
                  (made['script'][3]['do'], [['giveTreat', '@cho', {'kind': 'pill'}]]), (made['script'][4]['together'][1], {'who': 'cho', 'mood': 'happy', 'do': ['wagTail']})]
        for got, want in checks:
            if got != want: problems.append(f'script.py: expected {want!r} in the scene file — got {got!r}')
        if not os.path.isfile(os.path.join(work, 'kich-ban', 'index.html')): problems.append('script.py: the composition was not built')
    for text, needle in [('bác sĩ (vet)\nbác sĩ: [bay lượn]\n', 'dòng 2'), ('bác sĩ (vet) · chó (dog)\nchó: Gâu!\n', 'thú'),
                         ('bối cảnh: sao hoả\nbác sĩ (vet)\nbác sĩ: Chào\n', 'sao hoả'), ('bác sĩ (vet)\nmèo: [vui]\n', '"mèo"'),
                         ('bối cảnh: công viên\nchó (dog, trên bàn)\nchó: [vui]\n', 'bàn')]:
        bad = os.path.join(work, 'bad-script.txt')
        open(bad, 'w', encoding='utf-8').write(text)
        done = subprocess.run([sys.executable, script_tool, bad, '--no-build'], capture_output=True, text=True)
        if done.returncode == 0 or 'Traceback' in done.stderr or needle not in done.stderr: problems.append(f'script.py: {text!r} is not refused clearly (wanted {needle!r}) — {done.stderr.strip()[:200]}')
