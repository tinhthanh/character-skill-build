"""Đợt 29 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('handover29')
def handover29(work, problems):
    stage = STAGE
    TAG = scratch('handover29')
    # Đợt 29: đưa / nhận / bế, người ngồi, sáng một bên. Bé đưa cốc cho ông ngồi ghế đá (ông tự nhận, cốc ở tay phía bé); con
    # chó đi tới ông (set.target biết chỗ nó đứng ở lượt ấy), ông vuốt, bế nó lên lòng rồi trao cho bé. Đo bằng
    # tools/acting_check.py (tay tới tay, con vật trong vòng tay, mông trên mặt ghế) và tools/light_side.py (ban ngày: nửa phía
    # nắng sáng hơn nửa kia).
    handover = {'id': 'handover', 'camera': 'auto', 'set': {'preset': 'park'}, 'characters': [
        {'name': 'ong', 'id': 'grandpa', 'z': -880, 'x': 380, 'on': 'bench', 'seated': True, 'holds': 'cup', 'holdsHidden': True},
        {'name': 'be', 'id': 'boy', 'z': -880, 'x': -200, 'holds': 'cup'}, {'name': 'cho', 'species': 'corgi', 'z': -880, 'x': 820}],
        'script': [{'who': 'be', 'do': [['handOver', '@ong']]}, {'who': 'ong', 'do': [['stroke', '@cho']]}, {'who': 'ong', 'do': [['carry', '@cho']]},
                   {'who': 'ong', 'do': [['handOverPet', '@be']]}, {'who': 'be', 'do': ['putDown']},
                   # Đợt 30: bé vuốt con chó vừa đặt xuống cạnh chân mình — scene.py phải biết nó ở đó, không ở cạnh ghế đá.
                   {'who': 'be', 'do': [['stroke', '@cho']]}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_handover.json')
    try:
        json.dump(handover, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'handover'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('handover: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        html = open(os.path.join(work, 'handover', 'index.html'), encoding='utf-8').read()
        for needle in ('items: {"L": "cup"}, itemsHidden: true', '[ong, ["take", be]]', '[be, ["takePet", ong, { petAt: ', '// cho comes over to ong (seated) for "stroke"', "set.target(ong, cho, 'top', { at: "):      # con chó tới từ phía HÔNG ông (đợt 31): người vẽ trước, tay trên đỉnh đầu
            if needle not in html: problems.append(f'handover: {needle} is not in the composition')
        if '// be steps closer to cho' in html: problems.append('handover: the boy walks to where the dog was picked up, not to where he put it down')
        checks = [m['check'] for m in json.load(open(os.path.join(work, 'handover', 'moments.json'), encoding='utf-8')) if m.get('check')]
        if sorted((c['who'], c['kind'], c['to']) for c in checks) != [('be', 'handOver', 'hands'), ('be', 'putDown', 'floor'), ('be', 'stroke', 'body'), ('ong', 'carry', 'body'), ('ong', 'handOverPet', 'hands'), ('ong', 'stroke', 'body')]:
            problems.append(f'handover: moments.json checks are {checks}')
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'handover')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('handover: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif 'in the arms' not in done.stdout or 'seated on the seat' not in done.stdout: problems.append('handover: acting_check did not measure the carried pet and the seated person:\n' + done.stdout[-400:])
        # Đợt 30: bé NHẬN con chó rồi đặt xuống — nó nằm cạnh chân bé, không trượt về cạnh ghế đá (chỗ ông bế nó lên).
        elif 'be stroke cho — hand reaches' not in done.stdout: problems.append('handover: acting_check did not measure the boy stroking the dog he put down:\n' + done.stdout[-400:])
        elif 'be puts cho down — next to the feet' not in done.stdout or 'stays put' not in done.stdout: problems.append('handover: acting_check did not measure the put-down:\n' + done.stdout[-400:])
        # Đợt 31: tay ông vuốt con chó thấy được (0.70.0: khuất hẳn sau mặt nó, 1 %), ông cúi ≤ 25°.
        elif "ong's hand on cho in view" not in done.stdout or "ong's hand rests on cho" not in done.stdout or 'ong stroke cho — leans no more than' not in done.stdout: problems.append('handover: acting_check did not measure the hand in view or the lean:\n' + done.stdout[-400:])
        done = subprocess.run([sys.executable, os.path.join(HERE, 'light_side.py'), os.path.join(work, 'handover')], capture_output=True, text=True)
        if done.returncode != 0 or ' pass' not in done.stdout or '0/0' in done.stdout: problems.append('handover light: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
