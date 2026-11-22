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
  • CON VẬT KHÔNG BỊ CHE (đợt 31): ở lúc được hỏi của mỗi động tác chạm con vật (vuốt, khám, cho ăn…), phần hình con vật
    THẤY ĐƯỢC — không bị người / đồ đạc che — ≥ 70 % hình nó, và đầu nó thấy ≥ 60 %. Đo bằng pixel: chụp cảnh như thường, cảnh
    ẩn con vật, cảnh đưa con vật lên lớp trên cùng (vẽ đè mọi thứ). Hình con vật = chỗ ảnh "trên cùng" khác ảnh "ẩn"; phần
    thấy được = chỗ ảnh thường khác ảnh "ẩn". (Bà ngồi sofa cúi 40° qua đầu gối vuốt mèo, mèo đứng nửa sau ống chân bà.)
  • ĐỒ ĐẠC TRONG KHUNG (đợt 30): ở mọi khoảnh khắc của moments.json, không món đồ đạc nào (hộp: sofa, bàn, kệ; tấm: TV, bàn,
    quầy, ghế) bị mép trái / phải cắt dở hay chạm mép (`set.propFraming()`); vật ở tiền cảnh thì thôi. Đợt 31: đồ đạc PHỤ (không
    phải TV, không ai ngồi / đứng trên nó) được lẹm mép, trừ ở khoảnh khắc mở cảnh.
  • TAY VUỐT (đợt 32): ở mọi mốc mỗi 0,1 s suốt các lần vuốt, bàn tay sát con vật (≥ 5 % trong 3 px quanh hình nó) và không
    lún qua viền nó quá 25 % — không chỉ ở lúc được hỏi.
  • TAY TRONG KHUNG (đợt 33): ở lúc được hỏi của mỗi động tác tay (vẫy, chỉ, giơ ngón, reo…), hai bàn tay của người làm nằm
    trọn trong khung — không lẹm mép trái / phải / trên (góc trung khung dọc theo đầu + thân áo để tay ra ngoài mép).
  • PHẢN ỨNG CON VẬT (đợt 33): lượt của con vật (sợ, giật mình…) — nó nằm trong khung ở lúc giữa lượt; theo ngay sau góc chèn con
    vật (sau góc đơn người làm) thì góc chèn giữ tới hết lượt ấy.
  • CHIỀU SÂU CON VẬT (đợt 33, lượt hai): con vật dời sang mặt phẳng người khác với tới (`set.depthLog`) — không khung nào nó đổi
    chiều sâu khi đứng yên trong khung hình mà không có lần cắt cảnh (dời lúc cắt, hay trong bước đi của chính nó).
  • GÓC TRUNG (đợt 31): góc trung máy tự đặt hẹp hơn 85 % bề rộng góc toàn của cùng chủ thể (`set.shotLog`). Đợt 32: góc trung
    bị giữ thành góc toàn cũng là hỏng; dòng cuối đếm số góc như thế.
"""
import argparse, json, os, re, socket, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
KEEP = None            # --keep: giữ ảnh chụp của phép đo con vật thấy được
REACH = 0.06            # tay cách đích ≤ 6 % chiều cao người
FEET = 0.03             # chân lệch sàn ≤ 3 % chiều cao người


# CON VẬT DỜI CHIỀU SÂU (đợt 33, lượt hai): mỗi lần dời trong `set.depthLog`, tua từng khung (1/30 s) quanh nó; khung nào z của nó
# đổi mà giữa hai khung không có lần cắt cảnh (`set.cutLog`), nó không đi (`s.x` đứng yên) và nó đang trong khung hình — là nó
# TRƯỢT trên hình. Bộ dựng cũ không có `depthLog` thì null.
DEPTH_JS = """(tl) => { const set = window.__set; if (!set.depthLog) return null; const cuts = set.cutLog || [], step = 1 / 30, out = [];
  const W = window.innerWidth, H = window.innerHeight;
  for (const move of set.depthLog) {
    const start = move.tween.startTime(), end = start + move.tween.duration(), rig = move.rig, host = rig.host || rig.svg.parentNode;
    const look = (t) => { tl.seek(t, false); set.update(); const r = rig.svg.getBoundingClientRect(), b = rig.el && rig.el.than ? rig.el.than.getBoundingClientRect() : r;
      return { z: set.depthLog.length && move.tween.targets()[0].z, x: rig.s.x || 0, seen: host.style.display !== 'none' && b.right > 0 && b.left < W && b.bottom > 0 && b.top < H }; };
    let slid = 0, seenAny = false, prev = look(Math.max(0, start - step)), prevT = Math.max(0, start - step);
    for (let t = start; t <= end + step + 1e-6; t += step) {
      const now = look(t), cut = cuts.some((c) => c > prevT + 1e-4 && c <= t + 1e-4);
      if (Math.abs(now.z - prev.z) > 0.5 && !cut && Math.abs(now.x - prev.x) < 0.05 && now.seen && prev.seen) slid++;
      if (now.seen) seenAny = true;
      prev = now; prevT = t;
    }
    out.push({ name: move.name, z: move.z, how: move.how || 'tween', at: +start.toFixed(2), duration: +(end - start).toFixed(2), slid });
  }
  tl.seek(0, false); set.update(); return out; }"""
DEPTHS = None


def check_depths(folder):
    """CON VẬT KHÔNG TRƯỢT CHIỀU SÂU TRÊN HÌNH (đợt 33, lượt hai): mỗi lần dời chiều sâu, không khung nào nó đổi z khi đứng yên trong
    khung hình mà không có lần cắt cảnh."""
    return [{'scene': folder, 'what': f'{d["name"]} moves to depth {d["z"]:g} unseen', 'ok': d['slid'] == 0,
             'note': (f'on the cut at {d["at"]:g} s' if d['how'] == 'cut' else f'during its own walk, {d["at"]:g}–{d["at"] + d["duration"]:g} s' if d['how'] == 'walk' else f'{d["at"]:g}–{d["at"] + d["duration"]:g} s')
                     + (f' — slides in view, standing still, for {d["slid"]} frame{"" if d["slid"] == 1 else "s"}' if d['slid'] else '')} for d in (DEPTHS or [])]


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
                  "out['props@' + t] = window.__set.propFraming ? window.__set.propFraming() : null; } out.shots = window.__set.shotLog || null; out.depths = (%s)(tl); return out; })()"
                  % (json.dumps(found.group(1)), json.dumps(sorted(set(times))), DEPTH_JS))
        size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--eval', script], capture_output=True, text=True)
        if done.returncode != 0 or not done.stdout.strip(): sys.exit(f'acting_check: could not probe {folder}:\n{done.stderr.strip()[-500:]}')
        found = json.loads(done.stdout)
        shots = found.pop('shots', None)
        global DEPTHS
        DEPTHS = found.pop('depths', None)
        return {float(k): v for k, v in found.items() if not k.startswith('props@')}, {float(k[6:]): v for k, v in found.items() if k.startswith('props@')}, shots
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


def on_lap(hand, who, pet=None, seen=None):
    """Bàn tay nằm trên ĐÙI / GỐI của chính người ấy (trong "viên thuốc" của đùi, nới thêm nửa bán kính). Con vật đứng TRƯỚC
    người ấy (lớp vẽ trên, đợt 31) mà bàn tay nằm trên phần thấy được của nó: tay đang trên con vật, che khuất cái gối sau nó."""
    if pet is not None and seen and pet.get('layer', 0) > who.get('layer', 0):
        step = max(max(b['x1'] - b['x0'], b['y1'] - b['y0']) for b in (pet.get('parts') or {}).values()) / 8 if pet.get('parts') else 0
        if min(((hand['x'] - p['x']) ** 2 + (hand['y'] - p['y']) ** 2) ** 0.5 for p in seen) <= step: return False
    return any(segment_gap(hand, leg['a'], leg['b']) <= leg['r'] * 1.5 for leg in who.get('legs') or [] if leg['part'] == 'thigh')


SEATED_LEAN = 25      # người ngồi cúi tới con vật dưới sàn ≤ 25° (đợt 31; RigSVG.SEATED_LEAN)
HAND_SHOWN = 0.7       # bàn tay chạm con vật thấy ≥ 70 % — con vật vẽ trước người thì tay dễ khuất sau nó (0.71.0: 50 %)
CONTACT = 0.05         # … và ≥ 5 % bàn tay sát hình con vật (≤ 3 px): đặt lên nó, không lơ lửng
SEEN = 0.70            # con vật được chạm: thấy ≥ 70 % hình nó (đợt 31)
SEEN_HEAD = 0.60       # … và ≥ 60 % cái đầu


def pet_pixels(folder, jobs, keep=None, scale=None):
    """CON VẬT THẤY ĐƯỢC BAO NHIÊU (đợt 31), đo bằng pixel. `jobs`: [(lúc, tên con vật, tên người chạm)]. Ở mỗi lúc chụp năm
    ảnh: a — như thường; b — ẩn host con vật; c — host con vật lên lớp trên cùng (z-index; nhân vật nằm trên các lớp phẳng
    xếp theo z-index, set3d.js); d — host người chạm lên lớp trên cùng; e — như d, hai bàn tay tô hồng sẫm. Trả về {(lúc, tên): {'all',
    'head', 'hand'}}: tỉ lệ điểm ảnh của hình con vật (c khác b) mà ảnh thường cũng thấy (a khác b) — trong khung hình vẽ đầu
    + thân (`parts` của actingProbe) để bóng dưới sàn không lẫn vào; `hand`: trong khung hình vẽ của bàn tay gần con vật nhất,
    tỉ lệ điểm ảnh của bàn tay (d khác e) mà ảnh thường vẫn thấy như ở d (a giống d: không bị gì che)."""
    try:
        from PIL import Image
    except ImportError:
        return None
    import tempfile
    html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
    comp = re.search(r'data-composition-id="([^"]+)"', html).group(1)
    size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    with socket.socket() as probe_socket:
        probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={os.path.abspath(folder)}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out = keep or tempfile.mkdtemp(prefix='pet-seen-')
    os.makedirs(out, exist_ok=True)
    try:
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        tl = f'window.__timelines[{json.dumps(comp)}]'
        steps, bases = [], []
        for n, (t, name, toucher) in enumerate(jobs):
            host = f"document.querySelector('[data-set3d][data-name=\"' + {json.dumps(name)} + '\"]')"
            person = f"document.querySelector('[data-set3d][data-name=\"' + {json.dumps(toucher)} + '\"]')"
            base = os.path.join(out, f'{os.path.basename(os.path.normpath(folder))}-pet{n}')
            steps += [{'eval': f'(() => {{ {tl}.seek({t}, false); window.__set.update(); return window.__set.actingProbe(); }})()'},
                      {'screenshot': base + '-a.png'},
                      {'eval': f"(() => {{ const h = {host}; if (h) h.style.visibility = 'hidden'; return 0; }})()"},
                      {'screenshot': base + '-b.png'},
                      {'eval': f"(() => {{ const h = {host}; if (h) {{ h.style.visibility = ''; h.dataset.z = h.style.zIndex; h.style.zIndex = 99999; }} return 0; }})()"},
                      {'screenshot': base + '-c.png'},
                      # d: người chạm ở lớp trên cùng; e: như d, hai bàn tay (nhóm `-coTayL/R`) tô một màu hồng sẫm — chỗ d khác e là
                      # đúng hình bàn tay. (Ẩn cả người chỉ để hiện bàn tay thì không được: cánh tay trước thân bị mask theo hình thân.)
                      {'eval': f"(() => {{ const h = {host}, p = {person}; if (h) h.style.zIndex = h.dataset.z; if (p) {{ p.dataset.z = p.style.zIndex; p.style.zIndex = 99999; }} return 0; }})()"},
                      {'screenshot': base + '-d.png'},
                      {'eval': f"(() => {{ const p = {person}; if (p) for (const g of p.querySelectorAll('[id$=\"-coTayL\"] *, [id$=\"-coTayR\"] *')) {{ g.dataset.fill = g.style.fill; g.style.fill = '#ff00ff'; }} return 0; }})()"},
                      {'screenshot': base + '-e.png'},
                      {'eval': f"(() => {{ const p = {person}; if (p) {{ p.style.zIndex = p.dataset.z; for (const g of p.querySelectorAll('[id$=\"-coTayL\"] *, [id$=\"-coTayR\"] *')) g.style.fill = g.dataset.fill || ''; }} return 0; }})()"}]
            bases.append(base)
        plan = os.path.join(out, 'pet-steps.json')
        json.dump(steps, open(plan, 'w', encoding='utf-8'))
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--steps', plan, '--scale', str(scale or 1)], capture_output=True, text=True)
        if done.returncode != 0 or not done.stdout.strip(): sys.exit(f'acting_check: could not capture {folder}:\n{done.stderr.strip()[-500:]}')
        probes = json.loads(done.stdout.strip().splitlines()[-1])[0::6]
        zoom = float(scale or 1)
        # Ảnh chụp ở tỉ lệ zoom (đợt 34): mọi toạ độ của actingProbe (px CSS) nhân zoom; ngưỡng tính bằng px (dải sát 3 px, tìm khe 80 px,
        # tối thiểu 30 điểm) cũng tính theo px CSS.
        def grow(value, key=None):
            if isinstance(value, dict): return {name: grow(item, name) for name, item in value.items()}
            if isinstance(value, list): return [grow(item, key) for item in value]
            return value * zoom if isinstance(value, (int, float)) and not isinstance(value, bool) and key in ('x', 'y', 'x0', 'x1', 'y0', 'y1', 'tall') else value
        probes = [[grow(actor) for actor in probe] if isinstance(probe, list) else probe for probe in probes]
        result = {}
        for (t, name, toucher), base, probe in zip(jobs, bases, probes):
            pet = next((a for a in probe if a['name'] == name), None)
            if not pet or not pet.get('parts'): continue
            a, b, c = (Image.open(base + k).convert('RGB') for k in ('-a.png', '-b.png', '-c.png'))
            W, H = a.size
            pa, pb, pc = a.load(), b.load(), c.load()
            differ = lambda p, q: max(abs(p[0] - q[0]), abs(p[1] - q[1]), abs(p[2] - q[2])) > 12
            counts = {}
            boxes = pet['parts']
            x0, y0 = max(0, int(min(r['x0'] for r in boxes.values()))), max(0, int(min(r['y0'] for r in boxes.values())))
            x1, y1 = min(W, int(max(r['x1'] for r in boxes.values())) + 1), min(H, int(max(r['y1'] for r in boxes.values())) + 1)
            for y in range(y0, y1):
                for x in range(x0, x1):
                    inside = [k for k, r in boxes.items() if r['x0'] <= x <= r['x1'] and r['y0'] <= y <= r['y1']]
                    if not inside or not differ(pc[x, y], pb[x, y]): continue
                    seen = differ(pa[x, y], pb[x, y])
                    for k in ['all'] + inside:
                        total, shown = counts.get(k, (0, 0)); counts[k] = (total + 1, shown + seen)
            result[(t, name)] = {part: shown / total for part, (total, shown) in counts.items() if total >= 30 * zoom * zoom}
            who = next((a for a in probe if a['name'] == toucher), None)
            if who and who.get('hands') and who.get('tall') and 'all' in result[(t, name)]:
                d, e = (Image.open(base + k).convert('RGB') for k in ('-d.png', '-e.png'))
                pd, pe = d.load(), e.load()
                centre = lambda bx: ((bx['x0'] + bx['x1']) / 2, (bx['y0'] + bx['y1']) / 2)
                spots = [centre(bx) for bx in boxes.values()]
                hand = min(who['hands'], key=lambda h: min((h['x'] - x) ** 2 + (h['y'] - y) ** 2 for x, y in spots))
                # Trong khung hình vẽ của bàn tay (cổ tay trở ra), không phải một vòng quanh lòng bàn tay: vòng ấy lấy cả đầu gối
                # người ngồi ngay sau con vật.
                hb = hand.get('box') or {'x0': hand['x'] - who['tall'] * 0.03, 'x1': hand['x'] + who['tall'] * 0.03, 'y0': hand['y'] - who['tall'] * 0.03, 'y1': hand['y'] + who['tall'] * 0.03}
                # TIẾP XÚC (đợt 31): phần bàn tay nằm sát (≤ 3 px) hình con vật — đè lên nó hay chạm mép. Tay thấy trọn mà không sát
                # hình con vật là tay lơ lửng trên đầu nó.
                pet_px = lambda x, y: 0 <= x < W and 0 <= y < H and differ(pc[x, y], pb[x, y])
                mine = shown = near = sunk = 0
                hand_px = []
                for y in range(max(0, int(hb['y0'])), min(H, int(hb['y1']) + 1)):
                    for x in range(max(0, int(hb['x0'])), min(W, int(hb['x1']) + 1)):
                        if not differ(pd[x, y], pe[x, y]): continue
                        mine += 1; seen_px = not differ(pa[x, y], pd[x, y]); shown += seen_px
                        band = round(3 * zoom)
                        near += any(pet_px(x + dx, y + dy) for dx in (-band, 0, band) for dy in (-band, 0, band))
                        # KHUẤT SAU con vật (đợt 32): điểm của bàn tay nằm trong hình nó mà ảnh thường không thấy — tay lún qua viền đầu /
                        # lưng (con vật vẽ trước người), không phải đặt lên đó.
                        sunk += (not seen_px) and pet_px(x, y)
                        hand_px.append((x, y))
                if mine >= 30 * zoom * zoom:
                    result[(t, name)]['px'] = mine / (zoom * zoom)
                    result[(t, name)]['hand'] = shown / mine; result[(t, name)]['contact'] = near / mine; result[(t, name)]['sunk'] = sunk / mine
                    # KHE HỞ (đợt 32): tay không sát con vật thì cách nó bao nhiêu px (tìm tới 80 px quanh khung bàn tay).
                    gap_px = 0.0
                    if not near:
                        reach, stride = int(80 * zoom), max(2, int(2 * zoom))
                        pets = [(x, y) for y in range(max(0, int(hb['y0']) - reach), min(H, int(hb['y1']) + reach + 1), stride)
                                for x in range(max(0, int(hb['x0']) - reach), min(W, int(hb['x1']) + reach + 1), stride) if pet_px(x, y)]
                        gap_px = min((min((hx - x) ** 2 + (hy - y) ** 2 for x, y in pets) ** 0.5 for hx, hy in hand_px[::max(3, int(3 * zoom * zoom))]), default=81.0 * zoom) if pets else 81.0 * zoom
                    result[(t, name)]['gap'] = gap_px / who['tall']
        return result
    finally:
        server.terminate()
        if not keep:
            for item in os.listdir(out): os.remove(os.path.join(out, item))
            os.rmdir(out)


SMALL_HAND = 1000      # bàn tay < 1000 px (CSS) trong ảnh — cỡ 30 × 30 — thì đo lại ở 2× (đợt 34)


def pet_pixels_sharp(folder, jobs, keep=None):
    """Như `pet_pixels`, nhưng lúc nào bàn tay chỉ vài trăm px (góc rất rộng, máy đứng yên) thì chụp lại lúc ấy ở tỉ lệ 2 (đợt 34).
    Viền bàn tay khử răng cưa — một hai px — là phần lớn của một bàn tay nhỏ: ở 1× tay bà đặt trên đầu mèo (cảnh máy đứng yên,
    tay 459 px) "lún" tới 12,4 % (8–12 % qua 13 mốc); cùng các mốc ấy ở 2× tối đa 6,2 %, ở 3× 7,2 % — ảnh phóng to cho thấy bàn tay
    nằm trên đỉnh đầu mèo, chỉ có phép đo đổi. Ở góc trung (tay lớn hơn nhiều) hai tỉ lệ gần nhau (tối đa 3,4 % / 2,3 %)."""
    found = pet_pixels(folder, jobs, keep)
    if not found: return found
    small = [job for job in jobs if (found.get((job[0], job[1])) or {}).get('px', SMALL_HAND) < SMALL_HAND]
    if small:
        sharp = pet_pixels(folder, small, keep and os.path.join(keep, 'x2'), 2) or {}
        for t, name, _ in small:
            if (t, name) in sharp: found[(t, name)] = dict(sharp[(t, name)], zoom=2)
    return found


def check_seen(folder, checks, keep=None):
    """CON VẬT KHÔNG BỊ CHE (đợt 31): ở lúc được hỏi của mỗi động tác tay chạm con vật (không tính bế: trong vòng tay thì
    tay che là đúng), con vật thấy ≥ 70 % hình và ≥ 60 % đầu."""
    jobs = [(c['times'][len(c['times']) // 2], c['target'], c['who']) for c in checks if c['kind'] not in ('walk', 'putDown', 'carry', 'gesture', 'reaction', 'petAct') and c.get('to') != 'hands']
    if not jobs: return []
    found = pet_pixels_sharp(folder, jobs, keep)
    if found is None: return [{'scene': folder, 'what': 'pets in view', 'ok': None, 'note': 'needs Pillow (pip install Pillow)'}]
    results = []
    for t, name, toucher in jobs:
        part = found.get((t, name))
        if not part or 'all' not in part: continue      # con vật không trong khung (hay đang là một tấm nhỏ xíu): không đo
        head = part.get('head')
        ok = part['all'] >= SEEN and (head is None or head >= SEEN_HEAD)
        results.append({'scene': folder, 'what': f'{name} in view at {t:g} s', 'ok': ok, 'seen': round(part['all'], 3), 'head': None if head is None else round(head, 3),
                        'note': f'{part["all"] * 100:.0f} % of {name} shows' + (f', head {head * 100:.0f} %' if head is not None else '') + f' (least {SEEN * 100:g} %, head {SEEN_HEAD * 100:g} %)'})
        if part.get('hand') is not None:
            results.append({'scene': folder, 'what': f'{toucher}\'s hand on {name} in view at {t:g} s', 'ok': part['hand'] >= HAND_SHOWN, 'hand': round(part['hand'], 3),
                            'note': f'{part["hand"] * 100:.0f} % of the hand shows (least {HAND_SHOWN * 100:g} %)'})
            results.append({'scene': folder, 'what': f'{toucher}\'s hand rests on {name} at {t:g} s', 'ok': part['contact'] >= CONTACT, 'contact': round(part['contact'], 3),
                            'note': f'{part["contact"] * 100:.0f} % of the hand is on or against {name} (least {CONTACT * 100:g} %; less is a hand hovering over it)'})
    return results


TRACK_SUNK = 0.10      # lúc vuốt: tối đa 10 % bàn tay lún qua viền con vật (khuất sau nó) ở bất kỳ mốc nào (đợt 32) — chặt hơn
                       # HAND_SHOWN ở lúc được hỏi (≤ 30 % khuất); 0.71.0: 64 % (bà, mèo), 40 % (ông, chó); 0.72.0 lượt đầu: 16–21 %
TRACK_CONTACT = 0.15   # … và ≥ 15 % bàn tay sát hình con vật ở MỌI mốc (đợt 32, lượt hai — 0.72.0 lượt đầu: thấp nhất 5–7 %)


def check_track(folder, checks, keep=None):
    """TAY VUỐT SUỐT ĐỘNG TÁC (đợt 32): ở mọi mốc của dải `track` (mỗi 0,1 s suốt các lần vuốt), bàn tay vẫn SÁT con vật
    (≥ 15 % bàn tay trong 3 px quanh hình nó — tay nhấc khỏi đầu, hay chỉ chạm một mép, là hỏng) và không lún qua viền nó quá
    10 % (con vật vẽ trước người: phần lún vào là phần khuất sau đầu / lưng nó). Đợt 31 chỉ đo ở lúc được hỏi: bà vuốt mèo — tay
    nhấc khỏi đầu giữa hai lần vuốt."""
    tracks = [c for c in checks if c.get('track')]
    jobs = [(t, c['target'], c['who']) for c in tracks for t in c['track']]
    if not jobs: return []
    found = pet_pixels_sharp(folder, jobs, keep)
    if found is None: return []
    results = []
    for c in tracks:
        rows = [(t, found.get((t, c['target'])) or {}) for t in c['track']]
        rows = [(t, r) for t, r in rows if 'contact' in r]
        if not rows: results.append({'scene': folder, 'what': f'{c["who"]} strokes {c["target"]} — hand on it throughout', 'ok': None, 'note': 'hand not measured'}); continue
        off = [(t, r) for t, r in rows if r['contact'] < TRACK_CONTACT]
        worst_gap = max(rows, key=lambda tr: tr[1].get('gap', 0))
        least = min(rows, key=lambda tr: tr[1]['contact'])
        results.append({'scene': folder, 'what': f'{c["who"]} strokes {c["target"]} — hand on it throughout ({len(rows)} moments)', 'ok': not off,
                        'contact': [round(r['contact'], 3) for _, r in rows], 'gap': [round(r.get('gap', 0), 4) for _, r in rows],
                        'note': f'{len(off)} of {len(rows)} moments with less than {TRACK_CONTACT * 100:g} % of the hand on it' + (f' (at {", ".join(f"{t:g}" for t, _ in off)} s)' if off else '')
                                + f'; least contact {least[1]["contact"] * 100:.0f} % at {least[0]:g} s; widest gap {worst_gap[1].get("gap", 0) * 100:.1f} % of height at {worst_gap[0]:g} s'})
        deep = max(rows, key=lambda tr: tr[1].get('sunk', 0))
        results.append({'scene': folder, 'what': f'{c["who"]} strokes {c["target"]} — hand not sunk past its outline', 'ok': deep[1].get('sunk', 0) <= TRACK_SUNK,
                        'sunk': [round(r.get('sunk', 0), 3) for _, r in rows],
                        'note': f'at most {deep[1].get("sunk", 0) * 100:.0f} % of the hand behind {c["target"]}\'s outline, at {deep[0]:g} s (limit {TRACK_SUNK * 100:g} %)'
                                + (f'; measured at 2× — the hand is {deep[1].get("px", 0):.0f} px' if deep[1].get('zoom') else '')})
    return results


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
        # Chỗ con vật SO VỚI người đặt (chia chiều cao người): máy cắt sang góc khác giữa các lúc đo thì vị trí trên màn hình đổi
        # mà con vật không hề đi (đợt 30: "trượt 39,6 %" khi máy cắt sang góc bé vuốt con chó).
        spots.append((t, apart, ((x0 + x1) / 2 - (body['x0'] + body['x1']) / 2) / who['tall']))
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
        # Đồ đạc PHỤ (`minor`: không phải TV, không ai ngồi / đứng trên nó — đợt 31) được lẹm mép ở góc trung, không ở khoảnh khắc
        # mở cảnh (góc toàn; người chấm được hỏi về đồ đạc ở đó).
        bad = [c for c in found if not c.get('front') and not (c.get('minor') and m.get('what') != 'opening')]
        minor = [c for c in found if not c.get('front') and c not in bad]
        results.append({'scene': folder, 'what': f'furniture inside the frame at {m["t"]:g} s ({m.get("what", "")})', 'ok': not bad,
                        'note': ('; '.join(f'{c["name"]} cut by the {c["edge"]} edge ({c["shown"] * 100:.0f} % shown)' for c in bad) or 'none cut by the left / right edge')
                                + (' (allowed: ' + '; '.join(f'{c["name"]} {c["shown"] * 100:.0f} % at the {c["edge"]} edge' for c in minor) + ' — not in use)' if minor else '')})
    return results


MEDIUM_WIDE = 0.85     # góc trung ≥ 85 % bề rộng góc toàn của cùng chủ thể: cắt sang gần như cùng khung (đợt 31)


def check_shots(folder, log):
    """GÓC TRUNG KHÁC GÓC TOÀN (đợt 31): mỗi góc trung máy tự đặt (`set.shotLog`, ghi lúc `direct` dựng cảnh) hẹp hơn 85 % bề
    rộng góc toàn của cùng chủ thể. Góc trung đã đổi thành góc toàn (hai chủ thể đứng quá xa) thì ghi lại, không chấm."""
    results = []
    for shot in log or []:
        if not shot.get('ratio'): continue
        who = ', '.join(shot['subjects'])
        # Đợt 32: góc trung bị GIỮ thành góc toàn là hỏng — máy phải dựng được một góc trung thật (dựng lại, đúng lúc động tác,
        # góc đơn của người làm). Đợt 31 chỉ ghi lại: 5 góc như thế trong cảnh thử (khung dọc — góc toàn dọc quá chặt; đồ đạc
        # "lẹm" theo ước lượng phẳng mà hình thật không lẹm).
        # GÓC TOÀN CHO ĐỘNG TÁC TAY (đợt 33, lượt hai): lượt có động tác hai tay rộng (bé reo) mà góc trung nào cũng không chứa nổi
        # hai bàn tay — `direct` chọn hẳn góc toàn có cả hai tay. Không phải góc trung bị giữ thành góc toàn: chấm tay trong khung.
        if shot.get('how') == 'gesture':
            results.append({'scene': folder, 'what': f'medium shot of {who} at {shot["t"]:g} s — full shot chosen for the gesture', 'ok': True,
                            'note': f'no medium shot holds both hands (it would be {shot["first"] * 100:.0f} % as wide as the full shot); the full shot with the hands is {shot["ratio"] * 100:.0f} %'})
            continue
        if shot.get('how') == 'full':
            tried = '; '.join(f'{name} {t["ratio"] * 100:.0f} %' + (f' cutting {", ".join(t["cut"])}' if t.get('cut') else '') + ('' if t.get('whole', True) else ', a pet cut')
                              for name, t in (shot.get('tries') or {}).items() if isinstance(t, dict) and 'ratio' in t)
            results.append({'scene': folder, 'what': f'medium shot of {who} at {shot["t"]:g} s not kept as the full shot', 'ok': False, 'kept': True,
                            'note': f'kept the full shot — the medium one was {shot["first"] * 100:.0f} % as wide' + (f' (tried: {tried})' if tried else '')})
            continue
        results.append({'scene': folder, 'what': f'medium shot of {who} at {shot["t"]:g} s narrower than the full shot', 'ok': shot['ratio'] < MEDIUM_WIDE, 'ratio': shot['ratio'],
                        'note': f'{shot["ratio"] * 100:.0f} % as wide as the full shot (limit {MEDIUM_WIDE * 100:g} %)' + (f'; {shot["first"] * 100:.0f} % before furniture at the edges was let go' if shot.get('how') == 'loose' else '')
                                + (f'; {shot["first"] * 100:.0f} % framed over the whole beat, now at the moment of the action' if shot.get('how') == 'moment' else '')
                                + (f'; {shot["first"] * 100:.0f} % for both, now {who.split(", ")[0]} alone' if shot.get('how') == 'single' else '')})
    return results


HAND_IN = 0.05        # bàn tay đang làm động tác: cách mép trái / phải / trên của khung ít nhất 5 % bề rộng bàn tay (đợt 33)


def frame_size(folder):
    """Bề ngang, bề cao của khung (data-width / data-height của cảnh)."""
    html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
    size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
    return (int(size.group(1)), int(size.group(2))) if size else (1920, 1080)


def check_gesture(folder, c, frames):
    """ĐỘNG TÁC TAY (đợt 33): ở lúc được hỏi (lúc giữa), hai bàn tay của người đang vẫy / chỉ / giơ ngón nằm trọn trong khung, cách
    mép trái, phải, trên ít nhất 5 % bề rộng bàn tay (lượt hai: có dư, không sát mép). Bàn tay ở dưới mép dưới (góc trung cắt ngang
    hông, tay buông) thì thôi."""
    W, H = frame_size(folder)
    t = c['times'][len(c['times']) // 2]
    who = frames[len(c['times']) // 2].get(c['who'])
    what = f'{c["who"]} {c["name"]} — hands in the frame'
    if not who or not who.get('hands'): return [{'scene': folder, 'what': what, 'ok': None, 'note': 'not in the frame'}]
    worst = None
    for hand in who['hands']:
        box = hand.get('box')
        if not box or box['y0'] >= H: continue
        width = max(1, box['x1'] - box['x0'])
        for edge, gap in (('left', box['x0']), ('right', W - box['x1']), ('top', box['y0'])):
            if worst is None or gap / width < worst[0]: worst = (gap / width, edge, hand['side'])
    if worst is None: return [{'scene': folder, 'what': what, 'ok': True, 'note': f'both hands below the frame at {t:g} s'}]
    margin, edge, side = worst
    hand = 'left' if side == 'L' else 'right'
    note = (f'the {hand} hand is {margin * 100:.0f} % of its width inside the {edge} edge at {t:g} s, the moment asked about (least {HAND_IN * 100:g} %)' if margin >= 0
            else f'the {hand} hand reaches {-margin * 100:.0f} % of its width past the {edge} edge at {t:g} s, the moment asked about')
    return [{'scene': folder, 'what': what, 'ok': margin >= HAND_IN, 'margin': round(margin, 3), 'note': note}]


PAW_FLOOR = 0.04       # động tác thú (đợt 35): bàn chân thấp nhất (lăn ngửa: lưng) lệch đường sàn ≤ 4 % chiều cao con vật
HIDE_HEAD = 0.60       # nấp: đầu thấy ≥ 60 % …
HIDE_BODY = 0.90       # … mà con vật thấy ≤ 90 % — có phần khuất sau người ấy
LICK_GAP = 0.06        # liếm (đợt 35): mõm cách bàn tay chìa ra / mặt người bế ≤ 6 % chiều cao người ấy


def check_pet_act(folder, c, frames, seen=None):
    """ĐỘNG TÁC THÚ (đợt 35) ở lúc được hỏi: (1) ≥ 70 % khung thân con vật trong khung hình; (2) bàn chân thấp nhất trên sàn (± 4 %
    chiều cao con vật) — lăn ngửa: LƯNG trên sàn và cả bốn bàn chân cao hơn giữa thân (chổng trời); đang được bế thì thôi; (3) nấp: đầu
    thấy ≥ 60 %, cả con ≤ 90 % (khuất sau người ấy một phần — đo bằng pixel); (4) liếm: khung mặt con vật cách bàn tay người ấy (hay mặt
    người bế) ≤ 6 % chiều cao người."""
    W, H = frame_size(folder)
    mid = len(c['times']) // 2
    t, frame = c['times'][mid], frames[mid]
    pet, what = frame.get(c['who']), f'{c["who"]} {c["name"]}'
    if not pet: return [{'scene': folder, 'what': what, 'ok': False, 'note': f'{c["who"]} not drawn at {t:g} s'}]
    out = []
    box = pet.get('body') or pet.get('face')
    if box:
        area = max(1, (box['x1'] - box['x0']) * (box['y1'] - box['y0']))
        shown = max(0, min(box['x1'], W) - max(box['x0'], 0)) * max(0, min(box['y1'], H) - max(box['y0'], 0)) / area
        out.append({'scene': folder, 'what': f'{what} — in the frame', 'ok': shown >= 0.7, 'note': f'{shown * 100:.0f} % of {c["who"]} in the frame at {t:g} s (least 70 %)'})
    tall = pet.get('tall') or 1
    paws, back = pet.get('paws') or [], (pet.get('parts') or {}).get('back')
    if not pet.get('carried') and paws:
        if c['name'] == 'rollOver' and back:
            off = (back['y1'] - pet['ground']) / tall
            up = all((p['y0'] + p['y1']) / 2 < (back['y0'] + back['y1']) / 2 for p in paws)
            out.append({'scene': folder, 'what': f'{what} — back on the floor, paws up', 'ok': abs(off) <= PAW_FLOOR + 0.02 and up,
                        'note': f'the back {off * 100:+.1f} % of its height off the floor (limit ±{(PAW_FLOOR + 0.02) * 100:g} %), ' + ('all four paws above the middle of the body' if up else 'a paw below the middle of the body') + f' at {t:g} s'})
        else:
            worst = None
            for k, f in enumerate(frames):
                a = f.get(c['who'])
                if not a or not a.get('paws'): continue
                off = (max(p['y1'] for p in a['paws']) - a['ground']) / (a.get('tall') or 1)
                if worst is None or abs(off) > abs(worst[1]): worst = (c['times'][k], off)
            if worst: out.append({'scene': folder, 'what': f'{what} — paws on the floor', 'ok': abs(worst[1]) <= PAW_FLOOR,
                                  'note': f'lowest paw {worst[1] * 100:+.1f} % of its height off the floor at {worst[0]:g} s (limit ±{PAW_FLOOR * 100:g} %)'})
    if c['name'] == 'hide' and seen is not None:
        part = seen.get((t, c['who'])) or {}
        if 'all' in part:
            head = part.get('head', 0)
            out.append({'scene': folder, 'what': f'{what} — hides, head peeking out', 'ok': head >= HIDE_HEAD and part['all'] <= HIDE_BODY,
                        'note': f'{part["all"] * 100:.0f} % of {c["who"]} shows (at most {HIDE_BODY * 100:g} % — part of it behind {c["target"]}), head {head * 100:.0f} % (least {HIDE_HEAD * 100:g} %) at {t:g} s'})
    if c['name'] == 'lick' and c.get('target'):
        person, face = frame.get(c['target']), (pet.get('parts') or {}).get('head') or pet.get('face')
        if person and face and person.get('tall'):
            spots = [person['face']] if c.get('carried') and person.get('face') else [{'x0': h['x'], 'x1': h['x'], 'y0': h['y'], 'y1': h['y']} for h in person.get('hands') or []]
            d = min(((max(0, a['x0'] - face['x1'], face['x0'] - a['x1'])) ** 2 + (max(0, a['y0'] - face['y1'], face['y0'] - a['y1'])) ** 2) ** 0.5 for a in spots) if spots else None
            if d is not None:
                out.append({'scene': folder, 'what': f'{what} {c["target"]} — muzzle at the {"face" if c.get("carried") else "hand"}', 'ok': d / person['tall'] <= LICK_GAP,
                            'note': f'{d / person["tall"] * 100:.1f} % of {c["target"]}\'s height between {c["who"]}\'s face and {c["target"]}\'s {"face" if c.get("carried") else "nearest hand"} at {t:g} s (limit {LICK_GAP * 100:g} %)'})
    return out


INSERT_GAP = 3.0      # phản ứng bắt đầu trong 3 s sau lúc cắt sang góc chèn con vật: là phản ứng với động tác vừa rồi (đợt 33)


def check_reaction(folder, c, frames, log):
    """PHẢN ỨNG CỦA CON VẬT (đợt 33): (1) ở lúc giữa lượt của nó, ≥ 70 % khung thân nó nằm trong khung hình; (2) lượt ấy theo ngay
    sau một góc CHÈN con vật (`shotLog[…].then` — góc đơn người làm rồi cắt sang con vật): góc chèn giữ tới hết lượt (`until`), không
    cắt sang góc khác giữa chừng."""
    W, H = frame_size(folder)
    out, t = [], c['times'][len(c['times']) // 2]
    pet = frames[len(c['times']) // 2].get(c['who'])
    box = pet and (pet.get('body') or pet.get('face'))
    if box:
        area = max(1, (box['x1'] - box['x0']) * (box['y1'] - box['y0']))
        seen = max(0, min(box['x1'], W) - max(box['x0'], 0)) * max(0, min(box['y1'], H) - max(box['y0'], 0)) / area
        out.append({'scene': folder, 'what': f'{c["who"]} reacts in the frame', 'ok': seen >= 0.7, 'note': f'{seen * 100:.0f} % of {c["who"]} in the frame at {t:g} s, the moment asked about (least 70 %)'})
    else:
        out.append({'scene': folder, 'what': f'{c["who"]} reacts in the frame', 'ok': False, 'note': f'{c["who"]} not drawn at {t:g} s'})
    for shot in log or []:
        then = shot.get('then')
        if not then or c['who'] not in then.get('subjects', []) or not (then['t'] <= c['start'] <= then['t'] + INSERT_GAP): continue
        until = then.get('until')
        held = until is not None and until >= c['end'] - 0.1
        out.append({'scene': folder, 'what': f'{c["who"]} reacts within the insert of {c["who"]} at {then["t"]:g} s', 'ok': held,
                    'note': f'the insert holds to {until:g} s, the reaction ends at {c["end"]:g} s' if until is not None else f'the insert ends at the end of the beat — the reaction ({c["start"]:g}–{c["end"]:g} s) plays in the next shot'})
    return out


def check_scene(folder):
    moments = json.load(open(os.path.join(folder, 'moments.json'), encoding='utf-8'))
    checks = [m['check'] for m in moments if m.get('check')]
    if not checks and not moments: return []
    shots, cuts, log = probe(folder, [t for c in checks for t in c['times']] + [m['t'] for m in moments if isinstance(m.get('t'), (int, float))])
    # NẤP (đợt 35): con vật thấy bao nhiêu, đầu bao nhiêu — đo bằng pixel ở lúc được hỏi.
    hide_jobs = [(c['times'][len(c['times']) // 2], c['who'], c.get('target') or c['who']) for c in checks if c['kind'] == 'petAct' and c['name'] == 'hide']
    hidden = pet_pixels_sharp(folder, hide_jobs, KEEP and os.path.join(KEEP, 'hide')) if hide_jobs else None
    results = check_props(folder, moments, cuts) + check_depths(folder) + check_shots(folder, log) + check_seen(folder, checks, KEEP) + check_track(folder, checks, KEEP and os.path.join(KEEP, 'track'))
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
        if c['kind'] == 'gesture':
            results.extend(check_gesture(folder, c, frames))
            continue
        if c['kind'] == 'reaction':
            results.extend(check_reaction(folder, c, frames, log))
            continue
        if c['kind'] == 'petAct':
            results.extend(check_pet_act(folder, c, frames, hidden))
            continue
        best, asked, lap, bent = None, None, None, None
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
                    if on_lap(near, who, target, seen): lap = t
                # CÚI (đợt 31): người ngồi cúi qua đầu gối tới con vật dưới sàn không quá SEATED_LEAN độ — 40° (đợt 30) là gập
                # người gần nửa vuông góc, mèo vẫn đứng sau ống chân.
                if who.get('seated') and not target['person'] and who.get('lean') is not None:
                    bent = (t, who['lean'])
        if best is None: results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]}', 'ok': None, 'note': 'not both in the frame'}); continue
        # Chấm ở LÚC GIỮA — lúc moments.json hỏi người chấm (đợt 29: lấy lúc gần nhất trong ba lúc thì "đạt" dù lúc được hỏi hai
        # tay ông còn buông bên hông). Không đo được lúc ấy thì lấy lúc gần nhất.
        judged = asked or best
        results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — hand reaches', 'ok': judged[1] <= REACH,
                        'note': f'{judged[1] * 100:.1f} % of height at {judged[0]:g} s, the moment asked about (closest {best[1] * 100:.1f} % at {best[0]:g} s; limit {REACH * 100:g} %)'})
        if bent is not None:
            results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — leans no more than {SEATED_LEAN:g}°', 'ok': bent[1] <= SEATED_LEAN + 0.5,
                            'note': f'the body leans {bent[1]:.0f}° at {bent[0]:g} s, the moment asked about (limit {SEATED_LEAN:g}°)'})
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
    parser = argparse.ArgumentParser(description='Measure the acting of 3D scenes: hands reaching, feet on the floor, pets put down and in view, furniture at the frame edges, medium shots narrower than full ones.')
    parser.add_argument('scenes', nargs='+', help='scene folders built by tools/scene.py')
    parser.add_argument('--json', help='also write the measurements here')
    parser.add_argument('--keep', help='keep the frames captured to see how much of each pet shows')
    args = parser.parse_args()
    KEEP = args.keep
    results = [r for folder in args.scenes for r in check_scene(folder)]
    for r in results: print(f'  {"✓" if r["ok"] else "·" if r["ok"] is None else "✗"} {os.path.basename(os.path.normpath(r["scene"]))}: {r["what"]} — {r["note"]}')
    bad = [r for r in results if r['ok'] is False]
    kept = sum(1 for r in results if r.get('kept'))
    print(f'acting_check: {sum(1 for r in results if r["ok"])}/{sum(1 for r in results if r["ok"] is not None)} pass' + (f', {len(bad)} fail' if bad else '')
          + f'; {kept} medium shot{"" if kept == 1 else "s"} kept as the full shot')
    if args.json: json.dump(results, open(args.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(1 if bad else 0)
