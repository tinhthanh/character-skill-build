#!/usr/bin/env python3
"""SOÁT DIỄN XUẤT BẰNG SỐ ĐO — không cần người / máy chấm nhìn ảnh.

    python3 tools/acting_check.py cảnh-1/ cảnh-2/ …          → in từng phép đo, đạt / hỏng; mã thoát 1 nếu có hỏng
    python3 tools/acting_check.py cảnh/ --json acting.json   → ghi thêm số đo ra tệp

Mỗi thư mục cảnh là thư mục tools/scene.py vừa dựng cho một bối cảnh 3D (index.html + moments.json). moments.json có
các mục `check` (đợt 28): động tác chạm (vuốt ve, khám, cho ăn, chải lông, nghe tim, tiêm — tay tới đầu / thân con vật;
đưa đồ, bắt tay — tay gặp tay) và dáng đi. Công cụ mở cảnh trong Chrome, tua tới các lúc ghi trong `check`, gọi
`window.__set.actingProbe()` (runtime/set3d.js) và xét:

  • TAY TỚI ĐÍCH: khoảng cách gần nhất từ lòng bàn tay của người làm tới khung mặt / thân con vật (hay tới bàn tay người
    kia), ở LÚC GIỮA trong ba lúc đo — lúc moments.json hỏi người chấm (đợt 29) —, không quá 6 % chiều cao người ấy;
  • CHÂN CHẠM SÀN: đáy bàn chân của mọi người đang đứng lệch khỏi đường sàn dưới chân họ không quá 3 % chiều cao người —
    cao hơn là lơ lửng, thấp hơn là lún;
  • ĐI: chân người đang đi chạm sàn ở cả ba lúc đo.
  • BẾ (đợt 29): ở lúc giữa (lúc được hỏi) và lúc cuối con vật nằm trong vòng tay — hình nó trong hình người bế, giữa thân
    nó ở 60 % trên của khung thân người (trước ngực) — người ngồi: trên đường mặt ghế (trên lòng);
  • NGỒI (đợt 29): người ngồi trên một hộp (sofa, ghế đá) — đường mặt ghế của rig lệch mặt trên hộp không quá 3 % chiều cao
    (cao hơn là lơ lửng, thấp hơn là lún); chân họ vẫn phải chạm sàn.
  • CON VẬT THẤY ĐƯỢC (đợt 30): tay đo tới đầu / thân THẤY ĐƯỢC của con vật (lưới điểm trong khung hình vẽ đầu, thân — bỏ phần
    bị chân người đứng trước che), không tới khung chụp; người ngồi: tay gần nó nhất không được nằm trên đùi / gối mình.
  • ĐẶT XUỐNG (đợt 30): sau `putDown` con vật ở sát người đặt (≤ 12 % chiều cao, theo bề ngang) và đứng yên (≤ 1,5 %).
  • ĐỒ ĐẠC TRONG KHUNG (đợt 30): ở mọi khoảnh khắc của moments.json, không món đồ đạc nào (hộp: sofa, bàn, kệ; tấm: TV, bàn,
    quầy, ghế) bị mép trái / phải cắt dở hay chạm mép (`set.propFraming()`); vật ở tiền cảnh thì thôi.
"""
import argparse, json, os, re, socket, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REACH = 0.06            # tay cách đích ≤ 6 % chiều cao người
FEET = 0.03             # chân lệch sàn ≤ 3 % chiều cao người


def probe(folder, times):
    """Mở cảnh, tua tới từng lúc trong `times`, trả về {lúc: [số đo của từng nhân vật]}."""
    html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
    found = re.search(r'data-composition-id="([^"]+)"', html)
    if not found: sys.exit(f'acting_check: {folder}/index.html has no data-composition-id')
    if 'window.__set = set' not in html: sys.exit(f'acting_check: {folder} was built before tools/scene.py exposed the set — build it again')
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    if not chrome: sys.exit('acting_check: no Chrome found (tools/chrome.sh)')
    with socket.socket() as probe_socket:
        probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={os.path.abspath(folder)}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        # Mỗi lúc: số đo diễn xuất (`actingProbe`) và đồ vật bị mép khung cắt (`propFraming`, đợt 30 — bộ dựng cũ không có thì []).
        script = ("(() => { const tl = window.__timelines[%s], out = {}; for (const t of %s) { tl.seek(t, false); out[t] = window.__set.actingProbe(); "
                  "out['props@' + t] = window.__set.propFraming ? window.__set.propFraming() : null; } return out; })()"
                  % (json.dumps(found.group(1)), json.dumps(sorted(set(times)))))
        size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--eval', script], capture_output=True, text=True)
        if done.returncode != 0 or not done.stdout.strip(): sys.exit(f'acting_check: could not probe {folder}:\n{done.stderr.strip()[-500:]}')
        found = json.loads(done.stdout)
        return {float(k): v for k, v in found.items() if not k.startswith('props@')}, {float(k[6:]): v for k, v in found.items() if k.startswith('props@')}
    finally:
        server.terminate()


def gap(point, box):
    """Khoảng cách từ một điểm tới một khung (0 nếu ở trong)."""
    dx = max(box['x0'] - point['x'], 0, point['x'] - box['x1']); dy = max(box['y0'] - point['y'], 0, point['y'] - box['y1'])
    return (dx * dx + dy * dy) ** 0.5


def segment_gap(point, a, b):
    """Khoảng cách từ một điểm tới đoạn thẳng ab."""
    vx, vy = b['x'] - a['x'], b['y'] - a['y']
    k = max(0, min(1, ((point['x'] - a['x']) * vx + (point['y'] - a['y']) * vy) / ((vx * vx + vy * vy) or 1)))
    return ((point['x'] - a['x'] - k * vx) ** 2 + (point['y'] - a['y'] - k * vy) ** 2) ** 0.5


def visible_points(pet, frame, steps=8):
    """Những điểm THẤY ĐƯỢC trên đầu và thân con vật (đợt 30): lưới điểm trong khung hình vẽ của đầu / thân, bỏ những điểm
    bị chân một người đứng TRƯỚC nó (lớp vẽ cao hơn) che. Không có `parts` (cảnh dựng trước đợt 30) thì trả None."""
    parts = pet.get('parts')
    if not parts: return None
    covers = [leg for other in frame.values() if other is not pet and other.get('person') and other.get('layer', 0) > pet.get('layer', 0) for leg in other.get('legs') or []]
    points = []
    for box in parts.values():
        for i in range(steps + 1):
            for j in range(steps + 1):
                p = {'x': box['x0'] + (box['x1'] - box['x0']) * i / steps, 'y': box['y0'] + (box['y1'] - box['y0']) * j / steps}
                if not any(segment_gap(p, leg['a'], leg['b']) <= leg['r'] for leg in covers): points.append(p)
    return points


def on_lap(hand, who):
    """Bàn tay nằm trên ĐÙI / GỐI của chính người ấy (trong "viên thuốc" của đùi, nới thêm nửa bán kính)."""
    return any(segment_gap(hand, leg['a'], leg['b']) <= leg['r'] * 1.5 for leg in who.get('legs') or [] if leg['part'] == 'thigh')


PUT_NEAR = 0.12         # con vật đặt xuống cách thân người đặt ≤ 12 % chiều cao người (theo bề ngang)
PUT_STILL = 0.015       # … và không trượt quá 1,5 % chiều cao người giữa các lúc đo


def check_put_down(folder, c, frames):
    """ĐẶT XUỐNG (đợt 30): ở cả ba lúc (tay vừa thả, bước xong, 0,8 s sau) con vật ở trên sàn SÁT người đặt — khoảng ngang giữa
    phần thấy được của nó và khung thân người ấy — và không trượt. Người nhận đặt xuống thì nó trượt về chỗ được bế lần đầu."""
    spots = []
    for t, frame in zip(c['times'], frames):
        who, pet = frame.get(c['who']), frame.get(c['target'])
        if not who or not pet or not who['tall'] or not who.get('body') or pet.get('carried'): continue
        boxes = list((pet.get('parts') or {}).values()) or [pet['body']]
        x0, x1 = min(b['x0'] for b in boxes), max(b['x1'] for b in boxes)
        body = who['body']
        apart = max(body['x0'] - x1, 0, x0 - body['x1']) / who['tall']
        spots.append((t, apart, (x0 + x1) / 2 / who['tall']))
    if not spots: return [{'scene': folder, 'what': f'{c["who"]} puts {c["target"]} down', 'ok': None, 'note': 'not both in the frame (or still carried)'}]
    worst = max(spots, key=lambda s: s[1])
    slide = max(s[2] for s in spots) - min(s[2] for s in spots)
    return [{'scene': folder, 'what': f'{c["who"]} puts {c["target"]} down — next to the feet', 'ok': worst[1] <= PUT_NEAR,
             'note': f'{worst[1] * 100:.1f} % of height from {c["who"]} at {worst[0]:g} s (limit {PUT_NEAR * 100:g} %)'},
            {'scene': folder, 'what': f'{c["who"]} puts {c["target"]} down — stays put', 'ok': slide <= PUT_STILL and len(spots) > 1,
             'note': f'moves {slide * 100:.1f} % of height between {spots[0][0]:g} and {spots[-1][0]:g} s (limit {PUT_STILL * 100:g} %)' if len(spots) > 1 else 'measured at one moment only'}]


def check_props(folder, moments, cuts):
    """ĐỒ ĐẠC TRONG KHUNG (đợt 30): ở mỗi khoảnh khắc của moments.json (lúc người chấm nhìn), không món đồ đạc nào (sofa, bàn,
    kệ, TV, quầy) bị mép trái / phải khung cắt dở hay chạm mép — trọn trong khung phải cách mép 3 % nửa khung. Vật ở tiền
    cảnh thì thôi. (TV ở mép phải góc mở đầu phòng khách, kệ TV chạm mép khung dọc — người chấm thấy, máy không báo.)"""
    results = []
    for m in moments:
        found = cuts.get(float(m['t'])) if isinstance(m.get('t'), (int, float)) else None
        if found is None: continue
        bad = [c for c in found if not c.get('front')]
        results.append({'scene': folder, 'what': f'furniture inside the frame at {m["t"]:g} s ({m.get("what", "")})', 'ok': not bad,
                        'note': '; '.join(f'{c["name"]} cut by the {c["edge"]} edge ({c["shown"] * 100:.0f} % shown)' for c in bad) or 'none cut by the left / right edge'})
    return results


def check_scene(folder):
    moments = json.load(open(os.path.join(folder, 'moments.json'), encoding='utf-8'))
    checks = [m['check'] for m in moments if m.get('check')]
    if not checks and not moments: return []
    shots, cuts = probe(folder, [t for c in checks for t in c['times']] + [m['t'] for m in moments if isinstance(m.get('t'), (int, float))])
    results = check_props(folder, moments, cuts)
    for c in checks:
        frames = [{a['name']: a for a in shots.get(float(t), [])} for t in c['times']]
        if c['kind'] == 'walk':
            worst = None
            for t, frame in zip(c['times'], frames):
                who = frame.get(c['who'])
                if not who or who['feet'] is None or not who['tall']: continue
                off = (who['feet'] - who['ground']) / who['tall']
                if worst is None or abs(off) > abs(worst[1]): worst = (t, off)
            if worst is None: results.append({'scene': folder, 'what': f'{c["who"]} walking', 'ok': None, 'note': 'not in the frame'}); continue
            results.append({'scene': folder, 'what': f'{c["who"]} walking — feet on the floor', 'ok': abs(worst[1]) <= FEET,
                            'note': f'feet {worst[1] * 100:+.1f} % of height off the floor at {worst[0]:g} s (limit ±{FEET * 100:g} %)'})
            continue
        if c['kind'] == 'putDown':
            results.extend(check_put_down(folder, c, frames))
            continue
        best, asked, lap = None, None, None
        for t, frame in zip(c['times'], frames):
            who, target = frame.get(c['who']), frame.get(c['target'])
            if not who or not target or not who['hands'] or not who['tall']: continue
            if c['to'] == 'hands':
                if not target['hands']: continue
                d = min(((h['x'] - g['x']) ** 2 + (h['y'] - g['y']) ** 2) ** 0.5 for h in who['hands'] for g in target['hands'])
            else:
                box = target['face'] if c['to'] == 'face' else target['body']
                if not box: continue
                # Con vật (đợt 30): đo tới ĐẦU / THÂN THẤY ĐƯỢC của nó, không tới khung chụp — khung ấy của con mèo ngồi cạnh bà
                # trên sofa lan ra sau đầu gối bà, tay bà đặt trên gối mình vẫn "chạm" (0,0 %), cả hai người chấm đều thấy hụt.
                seen = visible_points(target, frame) if not target['person'] and not target.get('carried') else None
                if seen is not None:
                    if not seen: continue
                    d = min(((h['x'] - p['x']) ** 2 + (h['y'] - p['y']) ** 2) ** 0.5 for h in who['hands'] for p in seen)
                else:
                    d = min(gap(h, box) for h in who['hands'])
            if best is None or d / who['tall'] < best[1]: best = (t, d / who['tall'])
            if t == c['times'][len(c['times']) // 2]:
                asked = (t, d / who['tall'])
                # Tay gần đích nhất mà lại nằm trên đùi / gối của chính mình (người ngồi vuốt con vật): chưa chạm tới nó.
                if who.get('seated') and c['kind'] != 'carry' and not target['person']:
                    near = min(who['hands'], key=lambda h: min(((h['x'] - p['x']) ** 2 + (h['y'] - p['y']) ** 2) ** 0.5 for p in seen) if seen else gap(h, box))
                    if on_lap(near, who): lap = t
        if best is None: results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]}', 'ok': None, 'note': 'not both in the frame'}); continue
        # Chấm ở LÚC GIỮA — lúc moments.json hỏi người chấm (đợt 29: lấy lúc gần nhất trong ba lúc thì "đạt" dù lúc được hỏi hai
        # tay ông còn buông bên hông). Không đo được lúc ấy thì lấy lúc gần nhất.
        judged = asked or best
        results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — hand reaches', 'ok': judged[1] <= REACH,
                        'note': f'{judged[1] * 100:.1f} % of height at {judged[0]:g} s, the moment asked about (closest {best[1] * 100:.1f} % at {best[0]:g} s; limit {REACH * 100:g} %)'})
        if lap is not None:
            results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — hand off the own lap', 'ok': False,
                            'note': f'the hand rests on {c["who"]}\'s own thigh / knee at {lap:g} s, the moment asked about'})
        if c['kind'] == 'carry':
            # BẾ: ở lúc đo cuối, con vật nằm TRONG VÒNG TAY — hình nó trong hình người bế, giữa thân nằm trong khung thân người
            # ấy. Chỉ đo tay thì con mèo bay ra mép khung (đợt 29, người ngồi sofa bế mèo) vẫn "đạt": tay chạm khung con mèo lúc
            # nhấc nó lên.
            # Ở LÚC GIỮA (lúc được hỏi) và lúc cuối — đợt 29: lúc 50 % lượt con mèo còn ngồi dưới sàn cạnh ống chân bà. Giữa thân con
            # vật phải ở NỬA TRÊN thân người bế (trước ngực), không chỉ trong khung thân.
            for t, frame in list(zip(c['times'], frames))[len(c['times']) // 2:]:
                who, pet = frame.get(c['who']), frame.get(c['target'])
                box = pet and pet.get('body')
                held = bool(who and who.get('body') and pet and pet.get('carried') and box)
                if held:
                    cx, cy, body = (box['x0'] + box['x1']) / 2, (box['y0'] + box['y1']) / 2, who['body']
                    # Người NGỒI: khung thân kéo tới bàn chân — vạch là đường mặt ghế (con vật trên lòng, trước ngực).
                    low = who['seat']['y'] if who.get('seated') and who.get('seat') else body['y0'] + (body['y1'] - body['y0']) * 0.6
                    held = body['x0'] <= cx <= body['x1'] and body['y0'] <= cy <= low
                results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — in the arms at {t:g} s', 'ok': held,
                                'note': 'the pet is held against the chest' if held else 'the pet is not in the arms' if not (pet and pet.get('carried')) else 'the pet is held low or away from the body'})
        # Chân của mọi người ở lúc tay gần đích nhất; người NGỒI trên hộp: mông trên mặt ghế (đợt 29).
        frame = frames[c['times'].index(best[0])]
        for name, a in frame.items():
            if not a['person'] or a['feet'] is None or not a['tall']: continue
            off = (a['feet'] - a['ground']) / a['tall']
            if abs(off) > FEET: results.append({'scene': folder, 'what': f'{name} feet on the floor during {c["kind"]}', 'ok': False, 'note': f'{off * 100:+.1f} % of height at {best[0]:g} s'})
            seat = a.get('seat')
            if a['seated'] and seat and seat.get('top') is not None:
                off = (seat['y'] - seat['top']) / a['tall']
                results.append({'scene': folder, 'what': f'{name} seated on the seat during {c["kind"]}', 'ok': abs(off) <= FEET,
                                'note': f'seat line {off * 100:+.1f} % of height ' + ('below' if off > 0 else 'above') + f' the top of the seat at {best[0]:g} s (limit ±{FEET * 100:g} %; above = floating, below = sunk in)'})
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Measure the acting of 3D scenes: hands reaching, feet on the floor, pets put down, furniture at the frame edges.')
    parser.add_argument('scenes', nargs='+', help='scene folders built by tools/scene.py')
    parser.add_argument('--json', help='also write the measurements here')
    args = parser.parse_args()
    results = [r for folder in args.scenes for r in check_scene(folder)]
    for r in results: print(f'  {"✓" if r["ok"] else "·" if r["ok"] is None else "✗"} {os.path.basename(os.path.normpath(r["scene"]))}: {r["what"]} — {r["note"]}')
    bad = [r for r in results if r['ok'] is False]
    print(f'acting_check: {sum(1 for r in results if r["ok"])}/{sum(1 for r in results if r["ok"] is not None)} pass' + (f', {len(bad)} fail' if bad else ''))
    if args.json: json.dump(results, open(args.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(1 if bad else 0)
