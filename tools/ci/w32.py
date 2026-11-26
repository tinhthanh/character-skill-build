"""Đợt 32 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('portrait32')
def portrait32(work, problems):
    stage = STAGE
    TAG = scratch('portrait32')
    # Đợt 32: KHUNG DỌC, phòng khách tối, bà ngồi sofa — mất điện, nói một câu (góc trung một người ngồi: đầu gối chìa ngang
    # làm góc trung = 100 % góc toàn), rọi đèn pin sang con mèo đứng giữa phòng (hai chủ thể xa nhau: góc hai người lẹm TV —
    # góc đơn của bà, luồng đèn vẫn chĩa về phía con mèo ngoài khung). 0.71.0: hai góc trung bị giữ thành góc toàn.
    portrait = {'id': 'portrait', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'living-room', 'light': 'night'}, 'characters': [
        {'name': 'ba', 'id': 'granny', 'z': -950, 'on': 'sofa', 'seated': True, 'x': -300}, {'name': 'meo', 'species': 'calico', 'z': -560, 'x': 150}],
        'script': [{'who': 'ba', 'power': 'off'}, {'who': 'ba', 'say': 'Mèo ơi, con đâu rồi?'}, {'who': 'ba', 'do': [['shine', '@meo']]},
                   {'who': 'meo', 'mood': 'scared'}, {'who': 'ba', 'say': 'Đừng sợ, bà đây mà.'}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_portrait.json')
    try:
        json.dump(portrait, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'portrait'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('portrait: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        if 'no medium shot of' in done.stdout: problems.append('portrait: scene.py says a medium shot was kept as the full shot:\n' + done.stdout[-400:])
        done = subprocess.run([sys.executable, os.path.join(HERE, 'acting_check.py'), os.path.join(work, 'portrait')], capture_output=True, text=True)
        if done.returncode != 0: problems.append('portrait: ' + (done.stdout.strip() or done.stderr.strip())[-600:])
        elif '0 medium shots kept as the full shot' not in done.stdout or 'medium shot of ba at' not in done.stdout:
            problems.append('portrait: acting_check did not count the medium shots kept as full shots:\n' + done.stdout[-400:])
        # Luồng đèn pin chĩa SANG PHẢI (phía con mèo), không lên trần: đầu đèn ở bên phải tay cầm, không cao hơn nó nhiều.
        aim = page_eval(os.path.join(work, 'portrait'), """(() => { const tl = Object.values(window.__timelines)[0], log = window.__set.shotLog.find((s) => s.how === 'single');
            if (!log) return { single: false }; tl.seek((log.t + (log.then ? log.then.t : log.end)) / 2, false); window.__set.update();
            const ba = document.querySelector('[data-set3d][data-name="ba"]'), lens = ba && ba.querySelector('[data-lens]'), tip = ba && ba.querySelector('[data-tip]');
            if (!lens || !tip) return { single: true, torch: false };
            const at = (el) => new DOMPoint(+el.getAttribute('cx'), +el.getAttribute('cy')).matrixTransform(el.getScreenCTM());
            const a = at(lens), b = at(tip); return { single: true, torch: true, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI }; })()""")
        if not aim or not aim.get('single'): problems.append(f'portrait: the shine is not framed as a single shot of granny ({aim})')
        elif aim.get('torch') and not -60 <= aim['angle'] <= 60: problems.append(f'portrait: the torch beam points {aim["angle"]:.0f}° (screen), not towards the cat on the right')
        # Đợt 32, lượt hai: góc đơn của bà rồi CẮT SANG CON MÈO trong cùng lượt — người chấm thấy cả hai (lượt đầu: con mèo không
        # có mặt trong lượt ấy).
        then = page_eval(os.path.join(work, 'portrait'), """(() => { const tl = Object.values(window.__timelines)[0], log = window.__set.shotLog.find((s) => s.how === 'single');
            if (!log || !log.then) return { then: null }; tl.seek((log.then.t + log.end) / 2, false); window.__set.update();
            const cat = window.__set.actingProbe().find((a) => a.name === 'meo'), W = window.innerWidth, H = window.innerHeight, parts = cat && cat.parts ? Object.values(cat.parts) : [];
            return { then: log.then, inside: parts.length > 0 && parts.every((r) => r.x0 >= -2 && r.x1 <= W + 2 && r.y1 <= H + 2 && r.y0 >= -2) }; })()""")
        if not then or not then.get('then') or then['then'].get('subjects') != ['meo']: problems.append(f'portrait: the single shot of granny does not cut to the cat within the turn ({then})')
        elif not then.get('inside'): problems.append(f'portrait: the cut to the cat after the single shot does not frame the whole cat ({then})')
        # Đợt 33: con mèo SỢ ở lượt sau — góc chèn con mèo giữ tới hết lượt ấy (0.72.0: cắt sang góc cận con mèo ngay lúc nó bắt đầu
        # sợ — phản ứng rơi vào góc kế).
        elif not then['then'].get('until') or 'meo reacts within the insert of meo' not in done.stdout or 'meo reacts in the frame' not in done.stdout:
            problems.append(f'portrait: the insert of the cat does not hold through its reaction on the next turn ({then}):\n' + done.stdout[-400:])


@case('opening32', tags=('smoke',))
def opening32(work, problems):
    stage = STAGE
    TAG = scratch('opening32')
    # Đợt 32, lượt hai: GÓC MỞ ĐẦU KHUNG DỌC một người đứng giữ cỡ 80 % chiều cao (lượt đầu đợt 32: 66 % cho mọi góc toàn dọc —
    # thừa sàn, thừa tường); góc trung của người ấy vẫn hẹp hơn 85 % góc toàn (bề ngang theo lõi khi hai tay múa chìa ngang).
    # (0.72.0 lượt đầu: người cao 0,86 khung — nay 1,03; góc trung 0,71 góc toàn.)
    opening = {'id': 'opening', 'camera': 'auto', 'width': 1080, 'height': 1920, 'set': {'preset': 'street'}, 'characters': [{'name': 'be', 'id': 'boy', 'z': -400, 'x': 0}],
               'script': [{'who': 'be', 'say': 'Chào mọi người, mình là Bin.'}, {'who': 'be', 'say': 'Hôm nay mình đi dạo nhé.'}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_opening.json')
    try:
        json.dump(opening, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'opening'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('opening: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        got = page_eval(os.path.join(work, 'opening'), """(() => { const tl = Object.values(window.__timelines)[0]; tl.seek(window.__sceneTimings.turns[0][0] + 0.3, false); window.__set.update();
            const boy = window.__set.actingProbe().find((a) => a.name === 'be');
            return { tall: boy ? boy.tall / window.innerHeight : null, shots: window.__set.shotLog.map((s) => [s.how, s.ratio]) }; })()""")
        if not got or got.get('tall') is None or got['tall'] < 0.95: problems.append(f'opening: the vertical opening shot of one standing person is wider than the 80 % full shot ({got})')
        elif not got.get('shots') or any(how == 'full' or ratio is None or ratio >= 0.85 for how, ratio in got['shots']): problems.append(f'opening: a medium shot is not narrower than 85 % of the full shot ({got})')


@case('ledge32')
def ledge32(work, problems):
    stage = STAGE
    TAG = scratch('ledge32')
    # Đợt 32: CON VẬT Ở MÉP DƯỚI — bác sĩ nói giọng ngạc nhiên (góc cận) cạnh con husky trên một cái bệ cao: góc cận cắt ngang
    # chân, thân con chó. Luật (0.71.0) nới khung lấy trọn nó; không có luật thì khung thân nó lòi 16 % dưới mép (1134 > 1080 px).
    stand = {'id': 'stand', 'camera': 'auto', 'set': {'preset': 'exam', 'boxes': [{'name': 'stand', 'x': 160, 'z': -480, 'width': 200, 'depth': 140, 'height': 200}]},
             'characters': [{'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': 40}, {'name': 'cho', 'species': 'husky', 'z': -560, 'on': 'stand', 'x': 260}],
             'script': [{'who': 'bac_si', 'mood': 'surprised', 'say': 'Ồ, bé hôm nay ngoan quá!'}, {'who': 'bac_si', 'mood': 'worried', 'say': 'Để cô xem tai bé nào.'}]}
    path = os.path.join(os.path.dirname(stage), f'_check_{TAG}_stand.json')
    try:
        json.dump(stand, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        done = build(path, os.path.join(work, 'stand'))
    finally:
        if os.path.exists(path): os.remove(path)
    if done.returncode != 0: problems.append('stand: the scene does not build: ' + done.stderr.strip()[:300])
    else:
        got = page_eval(os.path.join(work, 'stand'), """(() => { const tl = Object.values(window.__timelines)[0]; tl.seek(3, false); window.__set.update();
            const dog = window.__set.actingProbe().find((a) => a.name === 'cho'); return { rules: window.__set.ruleLog, bottom: dog && dog.body ? dog.body.y1 : null, height: window.innerHeight }; })()""")
        if not got or not any(r.get('rule') == 'petBottom' for r in got.get('rules') or []): problems.append(f'stand: the bottom-edge rule for pets was not reached ({got})')
        elif got.get('bottom') is None or got['bottom'] > 1080 + 2: problems.append(f'stand: the husky is cut by the bottom edge of the close shot (its box ends at {got.get("bottom")} px of 1080)')
