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
SCALES = {}            # đợt 35: { lúc: [bệ cân trên màn hình] }, { ('paws', lúc): {con vật: đáy chân} }
SPOTS = {}             # đợt 35: chỗ các điểm chỉ trên phim X-quang (`data-xray-spot`) ở từng lúc đo, px trong khung


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
                  "out['props@' + t] = window.__set.propFraming ? window.__set.propFraming() : null; "
                  "out['scales@' + t] = (() => { const v = window.__set.view.getBoundingClientRect(); return [...window.__set.view.querySelectorAll('svg[data-prop=\\'scale\\']')].map((g) => { const r = g.getBoundingClientRect(); return { x0: r.left - v.left, x1: r.right - v.left, top: r.top - v.top + r.height * 441 / 470 }; }); })(); "
                  "if (window.__set.paws) out['paws@' + t] = window.__set.paws(); if (window.__set.careProbe) out['care@' + t] = window.__set.careProbe(); out['spots@' + t] = window.__set.spotProbe ? window.__set.spotProbe() : []; } out.shots = window.__set.shotLog || null; out.depths = (%s)(tl); return out; })()"
                  % (json.dumps(found.group(1)), json.dumps(sorted(set(times))), DEPTH_JS))
        size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--eval', script], capture_output=True, text=True)
        if done.returncode != 0 or not done.stdout.strip(): sys.exit(f'acting_check: could not probe {folder}:\n{done.stderr.strip()[-500:]}')
        found = json.loads(done.stdout)
        shots = found.pop('shots', None)
        global DEPTHS
        DEPTHS = found.pop('depths', None)
        global SCALES, SPOTS
        SCALES = {float(k[7:]): v for k, v in found.items() if k.startswith('scales@')}
        SCALES.update({('paws', float(k[5:])): v for k, v in found.items() if k.startswith('paws@')})
        SCALES.update({('care', float(k[5:])): v for k, v in found.items() if k.startswith('care@')})
        SPOTS = {float(k[6:]): v for k, v in found.items() if k.startswith('spots@')}
        return {float(k): v for k, v in found.items() if '@' not in k}, {float(k[6:]): v for k, v in found.items() if k.startswith('props@')}, shots
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
                # BÀN TAY THẤY ĐƯỢC (đợt 35): ảnh thường khác ảnh "người trên cùng" quá HAZE mới là bị che. Lớp nắng / sương mờ của bối cảnh
                # (vệt nắng cửa sổ phòng khám) phủ cả bàn tay lẫn con vật, đổi màu đều 17–22 — bàn tay vẽ trên con vật vẫn rõ mà đếm là
                # "khuất" (băng chân corgi trên bàn khám: 5 % thấy được). Thân con vật / vành loa che thì khác xa hơn nhiều.
                veiled = lambda p, q: max(abs(p[0] - q[0]), abs(p[1] - q[1]), abs(p[2] - q[2])) > HAZE
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
                        mine += 1; seen_px = not veiled(pa[x, y], pd[x, y]); shown += seen_px
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


HAZE = 30             # đợt 35: một lớp mờ của bối cảnh đổi màu bàn tay ≤ 30 — vẫn là thấy được (xem pet_pixels)
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
    probe_jobs = {(c['times'][len(c['times']) // 2], c['target']) for c in checks if c['kind'] == 'takeTemp'}
    jobs = [(c['times'][len(c['times']) // 2], c['target'], c['who']) for c in checks if c['kind'] not in ('walk', 'putDown', 'carry', 'gesture', 'reaction', 'weigh', 'look', 'pill', 'worn', 'readChart', 'showXray', 'petAct') and c.get('to') != 'hands']
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
        # Đo nhiệt (lượt bốn): cái chạm thân là ĐẦU ĐO — bàn tay cách thân cả chiều dài nhiệt kế; đo riêng ("the thermometer touches it").
        if part.get('hand') is not None and (t, name) not in probe_jobs:
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
        verb = {'bandage': 'bandages', 'putCone': 'puts the cone on'}.get(c['kind'], 'strokes')          # đợt 35: băng chân, đeo loa cũng có dải mốc
        rows = [(t, found.get((t, c['target'])) or {}) for t in c['track']]
        rows = [(t, r) for t, r in rows if 'contact' in r]
        if not rows: results.append({'scene': folder, 'what': f'{c["who"]} {verb} {c["target"]} — hand on it throughout', 'ok': None, 'note': 'hand not measured'}); continue
        off = [(t, r) for t, r in rows if r['contact'] < TRACK_CONTACT]
        worst_gap = max(rows, key=lambda tr: tr[1].get('gap', 0))
        least = min(rows, key=lambda tr: tr[1]['contact'])
        results.append({'scene': folder, 'what': f'{c["who"]} {verb} {c["target"]} — hand on it throughout ({len(rows)} moments)', 'ok': not off,
                        'contact': [round(r['contact'], 3) for _, r in rows], 'gap': [round(r.get('gap', 0), 4) for _, r in rows],
                        'note': f'{len(off)} of {len(rows)} moments with less than {TRACK_CONTACT * 100:g} % of the hand on it' + (f' (at {", ".join(f"{t:g}" for t, _ in off)} s)' if off else '')
                                + f'; least contact {least[1]["contact"] * 100:.0f} % at {least[0]:g} s; widest gap {worst_gap[1].get("gap", 0) * 100:.1f} % of height at {worst_gap[0]:g} s'})
        deep = max(rows, key=lambda tr: tr[1].get('sunk', 0))
        results.append({'scene': folder, 'what': f'{c["who"]} {verb} {c["target"]} — hand not sunk past its outline', 'ok': deep[1].get('sunk', 0) <= TRACK_SUNK,
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
TONGUE_GAP = 0.025     # … và (lượt hai) ĐẦU LƯỠI cách bàn tay / đầu người ấy ≤ 2,5 % chiều cao người — lưỡi chạm tới, không chỉ cái đầu ở gần
SPIN_FLIPS = 4         # đuổi đuôi: đổi hướng trái ↔ phải ≥ 4 lần (2 vòng) trong quãng chạy vòng
SPIN_TRAVEL = 1.0      # … và (lượt ba) đi ngang ≥ 1 thân con chó (đường kính vòng chạy ≥ một thân)
SPIN_TURN = 1.2        # … mỗi vòng ≥ 1,2 s — người chấm xem thưa (~1 khung / giây)
KNEAD_LIFT = 0.15      # nhào (lượt ba): mỗi bàn chân trước lên xuống ≥ 15 % chiều cao HÌNH con vật (đầu tới bàn chân)
KNEAD_BEAT = 0.5       # … mỗi lần ấn ≥ 0,5 s
PET_SHARE = 0.35       # (lượt ba) lượt động tác riêng của thú: hình con vật cao ≥ 35 % khung ở lúc được hỏi — ở góc toàn nó chỉ ~1/12 khung
TONGUE_LONG = 0.25     # lưỡi lúc chạm đích dài ≥ 1/4 chiều cao đầu
CLOSE_ACTS = ('rollOver', 'chaseTail', 'knead', 'eatCarrot', 'lick', 'bark')
PET_JUMP = 0.05            # (lượt bốn) giữa hai khung liền nhau (1/30 s) con vật được bế / bàn tay chìa cho liếm dời ≤ 5 % chiều cao người, ĐO SO VỚI
                       # NGƯỜI ẤY (máy quay lia / đổi cỡ thì cả hai cùng dời) — nhấc lên ngực trong 0,6 s nhanh nhất ~4 %; dịch tức thời thì hơn nhiều
HAND_ON_FACE = 0.15    # … bàn tay chìa cho liếm che ≤ 15 % khung đầu con vật (không đè lên mặt nó)

def biggest_jump(track, pick):
    """Bước dời lớn nhất của một điểm giữa hai mốc liền nhau của `track` (danh sách (lúc, khung)); `pick(khung)` → (x, y) | None."""
    best, prev = None, None
    for t, f in track:
        p = pick(f)
        if p and prev and prev[1]:
            d = ((p[0] - prev[1][0]) ** 2 + (p[1] - prev[1][1]) ** 2) ** 0.5
            if best is None or d > best[1]: best = (t, d)
        prev = (t, p)
    return best

THROUGH = 0.03         # nấp: chạy ngang qua chân người mà đường sàn dưới chân hai bên lệch < 3 % chiều cao người — là đi XUYÊN qua chân họ
                       # (đợt 35, lượt hai: con shiba xa hơn cô bé 30 đơn vị — 1,6 %, Gemini thấy đi xuyên; xa hơn 100 — 5,3 %)


def check_pet_act(folder, c, frames, seen=None, track=None):
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
    track = [f for f in (track or []) if f.get(c['who'])]
    drawn = lambda a: (lambda r: (r[0], r[1]))((min(b['y0'] for b in a['parts'].values()), max(b['y1'] for b in a['parts'].values()))) if a.get('parts') else None
    if c['name'] in CLOSE_ACTS:
        H = frame_size(folder)[1]
        span = drawn(pet)
        share = (span[1] - span[0]) / H if span else 0
        out.append({'scene': folder, 'what': f'{what} — big enough in the frame', 'ok': share >= PET_SHARE,
                    'note': f'{c["who"]} is {share * 100:.0f} % of the frame height at {t:g} s (least {PET_SHARE * 100:g} %)'})
    if c['name'] == 'chaseTail' and track:
        sides = [1 if f[c['who']]['facing'] >= 0 else -1 for f in track if f[c['who']].get('facing') is not None]
        flips = sum(1 for a, b in zip(sides, sides[1:]) if a != b)
        xs = [(f[c['who']]['body']['x0'] + f[c['who']]['body']['x1']) / 2 for f in track if f[c['who']].get('body')]
        # một THÂN: bề ngang lớn nhất của khung hình vẽ thân (lúc con chó quay ngang)
        body = max([f[c['who']]['parts']['back']['x1'] - f[c['who']]['parts']['back']['x0'] for f in track if (f[c['who']].get('parts') or {}).get('back')], default=1)
        travel = (max(xs) - min(xs)) / body if xs else 0
        times = c.get('samples', [])[:len(track)]
        at_flip = [times[i + 1] for i in range(len(sides) - 1) if sides[i] != sides[i + 1]] if len(times) == len(track) else []
        turn = 2 * (at_flip[-1] - at_flip[0]) / (len(at_flip) - 1) if len(at_flip) > 1 else 0
        out.append({'scene': folder, 'what': f'{what} — runs round, turn after turn', 'ok': flips >= SPIN_FLIPS and travel >= SPIN_TRAVEL and turn >= SPIN_TURN,
                    'note': f'{flips} changes of side (≈ {flips / 2:g} turns; least {SPIN_FLIPS}), {turn:.2f} s a turn (least {SPIN_TURN:g}), across {travel:.2f} body lengths on the floor (least {SPIN_TRAVEL:g}) over {len(track)} frames'})
    if c['name'] == 'knead' and track:
        lifts, presses = [], 0
        tall = max([(lambda r: r[1] - r[0])(drawn(f[c['who']])) for f in track if drawn(f[c['who']])], default=1)
        for key in ('tnBan', 'txBan'):
            ys = [f[c['who']]['front'][key]['y1'] for f in track if (f[c['who']].get('front') or {}).get(key)]
            if not ys: continue
            lifts.append((max(ys) - min(ys)) / tall)
            mid = (max(ys) + min(ys)) / 2
            presses += sum(1 for a, b in zip(ys, ys[1:]) if a < mid <= b)          # bàn chân từ trên cao ấn xuống qua giữa quãng
        times = c.get('samples', [])
        beat = (times[-1] - times[0]) / presses if presses and len(times) > 1 else 0
        if lifts:
            out.append({'scene': folder, 'what': f'{what} — both front paws press up and down', 'ok': min(lifts) >= KNEAD_LIFT and beat >= KNEAD_BEAT,
                        'note': 'front paws travel ' + ' / '.join(f'{v * 100:.0f} %' for v in lifts) + f' of the drawn cat (least {KNEAD_LIFT * 100:g} % each), {presses} presses, {beat:.2f} s each (least {KNEAD_BEAT:g})'})
    if c['name'] == 'eatCarrot' and track:
        # CÀ RỐT NGẮN DẦN (đợt 35, lượt ba — lượt hai trượt: "cà rốt giữ nguyên rồi biến mất"): độ dài khung hình củ cà rốt qua các mốc;
        # đếm số BẬC ngắn đi (mỗi bậc ≥ 10 % độ dài lúc đầu) — ít nhất 3 bậc trước khi hết.
        lens = [((f[c['who']]['carrot']['x1'] - f[c['who']]['carrot']['x0']) ** 2 + (f[c['who']]['carrot']['y1'] - f[c['who']]['carrot']['y0']) ** 2) ** 0.5
                if f[c['who']].get('carrot') else 0 for f in track]
        full = max(lens, default=0)
        steps, level = 0, None
        for v in lens:
            if not v: continue
            if level is None or v >= level: level = v if level is None else level
            if v < level - 0.1 * full: steps += 1; level = v
        out.append({'scene': folder, 'what': f'{what} — the carrot gets shorter bite by bite', 'ok': full > 0 and steps >= 3,
                    'note': f'{steps} steps shorter (least 3), from {full:.0f} px to {min([v for v in lens if v], default=0):.0f} px over {len(track)} frames'})
    if c['name'] == 'hide' and track:
        # (lượt bốn) bàn tay người đứng trước không đè lên cái đầu đang ló ra
        worst = None
        for t2, f in zip(c.get('samples', []), track):
            if t2 < c['times'][0] - 1e-3: continue          # chỉ lúc đã nấp và ló đầu (lúc chạy ngang sau lưng người thì khuất là đúng)
            a = f[c['who']]; head = (a.get('parts') or {}).get('head')
            if not head: continue
            for name, other in f.items():
                if not other.get('person'): continue
                for h in other.get('hands') or []:
                    b = h.get('box')
                    if not b: continue
                    cover = max(0, min(b['x1'], head['x1']) - max(b['x0'], head['x0'])) * max(0, min(b['y1'], head['y1']) - max(b['y0'], head['y0'])) / max(1, (head['x1'] - head['x0']) * (head['y1'] - head['y0']))
                    if worst is None or cover > worst[1]: worst = (t2, cover, name)
        if worst: out.append({'scene': folder, 'what': f'{what} — no hand over the peeking head', 'ok': worst[1] <= HAND_ON_FACE,
                              'note': f'a hand of {worst[2]} covers at most {worst[1] * 100:.0f} % of {c["who"]}\'s head (at {worst[0]:g} s; limit {HAND_ON_FACE * 100:g} %)'})
        through = []
        for t, f in zip(c.get('samples', []), track):
            a, box = f[c['who']], f[c['who']].get('body')
            for name, other in f.items():
                if not other.get('person') or not other.get('legs') or not box or not other.get('tall'): continue
                lx = [q[k]['x'] for q in other['legs'] for k in ('a', 'b')]
                cx = (box['x0'] + box['x1']) / 2
                if min(lx) - (box['x1'] - box['x0']) / 2 <= cx <= max(lx) + (box['x1'] - box['x0']) / 2: through.append((t, name, abs(a['ground'] - other['ground']) / other['tall']))
        worst = min(through, key=lambda item: item[2]) if through else None
        out.append({'scene': folder, 'what': f'{what} — goes behind, not through, anyone', 'ok': not worst or worst[2] >= THROUGH,
                    'note': (f'crosses {worst[1]}\'s legs with the floor lines {worst[2] * 100:.1f} % of height apart at {worst[0]:g} s (least {THROUGH * 100:g} % — less reads as walking through the legs; stand it further back)' if worst
                             else f'never crosses a person\'s legs over {len(track)} frames')})
    if c['name'] == 'lick' and c.get('target'):
        person, face = frame.get(c['target']), (pet.get('parts') or {}).get('head') or pet.get('face')
        if person and face and person.get('tall'):
            spots = [person['face']] if c.get('carried') and person.get('face') else [{'x0': h['x'], 'x1': h['x'], 'y0': h['y'], 'y1': h['y']} for h in person.get('hands') or []]
            d = min(((max(0, a['x0'] - face['x1'], face['x0'] - a['x1'])) ** 2 + (max(0, a['y0'] - face['y1'], face['y0'] - a['y1'])) ** 2) ** 0.5 for a in spots) if spots else None
            if d is not None:
                out.append({'scene': folder, 'what': f'{what} {c["target"]} — muzzle at the {"face" if c.get("carried") else "hand"}', 'ok': d / person['tall'] <= LICK_GAP,
                            'note': f'{d / person["tall"] * 100:.1f} % of {c["target"]}\'s height between {c["who"]}\'s face and {c["target"]}\'s {"face" if c.get("carried") else "nearest hand"} at {t:g} s (limit {LICK_GAP * 100:g} %)'})
            # LƯỠI TỚI ĐÍCH VÀI NHỊP (đợt 35, lượt hai): mỗi 0,05 s suốt bước, khoảng cách từ khung lưỡi tới bàn tay gần nhất (dưới sàn) / đầu
            # người bế; đếm số lần lưỡi CHẠM tới (≤ 2,5 % chiều cao người) — ít nhất 3 nhịp liếm.
            gap_of = lambda a, b: ((max(0, a['x0'] - b['x1'], b['x0'] - a['x1'])) ** 2 + (max(0, a['y0'] - b['y1'], b['y0'] - a['y1'])) ** 2) ** 0.5
            def tongue_gap(f):
                p, q = f.get(c['who']), f.get(c['target'])
                if not p or not q or not p.get('tongue') or not q.get('tall'): return None
                goal = [q['headBox']] if c.get('carried') and q.get('headBox') else [{'x0': h['x'], 'x1': h['x'], 'y0': h['y'], 'y1': h['y']} for h in q.get('hands') or []]
                return min(gap_of(a, p['tongue']) for a in goal) / q['tall'] if goal else None
            frames_l = track or [frame]
            gaps = [tongue_gap(f) for f in frames_l]
            # Một NHỊP LIẾM = lưỡi thè dài nhất (đỉnh độ dài khung lưỡi) mà đầu lưỡi đang ở đích — lưỡi cứ nằm trên má người bế suốt cũng đếm
            # đủ từng nhịp, không chỉ lần chạm đầu.
            size = [((f[c['who']]['tongue']['x1'] - f[c['who']]['tongue']['x0']) ** 2 + (f[c['who']]['tongue']['y1'] - f[c['who']]['tongue']['y0']) ** 2) ** 0.5
                    if f.get(c['who']) and f[c['who']].get('tongue') else 0 for f in frames_l]
            heads = [(f[c['who']]['parts']['head']['y1'] - f[c['who']]['parts']['head']['y0']) if f.get(c['who']) and (f[c['who']].get('parts') or {}).get('head') else 0 for f in frames_l]
            # … lưỡi dài ≥ 1/4 chiều cao đầu (lượt ba: lưỡi chỉ vài điểm ảnh thì người chấm không thấy)
            touches = sum(1 for i in range(len(size)) if gaps[i] is not None and gaps[i] <= TONGUE_GAP and size[i] > 0 and size[i] >= TONGUE_LONG * heads[i]
                          and size[i] >= (size[i - 1] if i else 0) and size[i] > (size[i + 1] if i + 1 < len(size) else 0))
            near = min([g for g in gaps if g is not None], default=None)
            out.append({'scene': folder, 'what': f'{what} {c["target"]} — tongue reaches the {"face" if c.get("carried") else "hand"}, lick after lick', 'ok': touches >= 3,
                        'note': (f'the tongue touches {c["target"]}\'s {"head" if c.get("carried") else "hand"} {touches} times (least 3; touch = tip within {TONGUE_GAP * 100:g} % of height, tongue ≥ {TONGUE_LONG * 100:g} % of the head, longest {max([a / b for a, b in zip(size, heads) if b], default=0) * 100:.0f} %; closest {near * 100:.1f} %) over {len(gaps)} frames' if near is not None
                                 else 'no tongue out')})
            if not c.get('carried'):
                # (lượt bốn) con vật ĐỨNG trên sàn — cả hai bàn chân trước, không chồm lên lơ lửng; bàn tay không đè lên mặt nó; bàn tay
                # không bật nhảy giữa hai khung lúc nó đang liếm.
                front = pet.get('front') or {}
                if front:
                    lift = max(abs(b['y1'] - pet['ground']) for b in front.values()) / (pet.get('tall') or 1)
                    out.append({'scene': folder, 'what': f'{what} — stands on all fours, front paws on the floor', 'ok': lift <= PAW_FLOOR,
                                'note': f'front paws {lift * 100:.1f} % of its height off the floor at {t:g} s (limit {PAW_FLOOR * 100:g} %)'})
                head = (pet.get('parts') or {}).get('head')
                # MẶT = 65 % trên của khung đầu (mắt, trán, tai) — bàn tay ở MÕM là đúng chỗ (đang liếm), đè lên mắt mới là che mặt.
                head = dict(head, y1=head['y0'] + 0.65 * (head['y1'] - head['y0'])) if head else None
                if head and person.get('hands'):
                    area = max(1, (head['x1'] - head['x0']) * (head['y1'] - head['y0']))
                    cover = max(max(0, min(h['box']['x1'], head['x1']) - max(h['box']['x0'], head['x0'])) * max(0, min(h['box']['y1'], head['y1']) - max(h['box']['y0'], head['y0'])) / area
                                for h in person['hands'] if h.get('box'))
                    out.append({'scene': folder, 'what': f'{c["target"]}\'s hand stays off {c["who"]}\'s face', 'ok': cover <= HAND_ON_FACE,
                                'note': f'the hand covers {cover * 100:.0f} % of {c["who"]}\'s face (upper 65 % of the head) at {t:g} s (limit {HAND_ON_FACE * 100:g} %)'})
                hop = biggest_jump(list(zip(c.get('samples', []), track)), lambda f: (lambda q: min(((h['x'], h['y']) for h in q['hands']), key=lambda h: abs(h[0] - (pet['x'] if pet.get('x') else 0))) if q and q.get('hands') else None)(f.get(c['target'])))
                if hop: out.append({'scene': folder, 'what': f'{c["target"]}\'s hand holds steady while {c["who"]} licks', 'ok': hop[1] / person['tall'] <= JUMP,
                                    'note': f'the hand moves at most {hop[1] / person["tall"] * 100:.1f} % of height between two frames (at {hop[0]:g} s; limit {JUMP * 100:g} %)'})
                # Người chìa tay đứng trên sàn — hay QUỲ: hai đầu gối chạm sàn (lượt bốn; lượt hai cấm quỳ vì ở góc toàn ống chân rút ngắn
                # trông như lún, ở góc cận con vật đầu gối thấy rõ chạm sàn).
                if person.get('kneel'):
                    knees = [leg['b']['y'] + leg['r'] for leg in person.get('legs') or [] if leg['part'] == 'thigh']      # mép dưới đầu gối
                    off = (max(knees) - person['ground']) / person['tall'] if knees else None
                    out.append({'scene': folder, 'what': f'{c["target"]} kneels to hold out a hand — knees on the floor', 'ok': off is not None and abs(off) <= FEET,
                                'note': f'knees {off * 100:+.1f} % of height off the floor at {t:g} s (limit ±{FEET * 100:g} %)' if off is not None else 'knees not seen'})
                else:
                    off = (person['feet'] - person['ground']) / person['tall'] if person.get('feet') is not None else None
                    out.append({'scene': folder, 'what': f'{c["target"]} holds out a hand standing — feet on the floor', 'ok': off is not None and abs(off) <= FEET,
                                'note': f'feet {off * 100:+.1f} % of height off the floor at {t:g} s (limit ±{FEET * 100:g} %)' if off is not None else 'feet not seen'})
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


ON_SCALE = 0.03       # cân (đợt 35): chân con vật cách mặt bệ cân ≤ 3 % chiều cao người cân


def check_weigh(folder, c, frames, scales):
    """CÂN (đợt 35): ở ba lúc đọc số, con vật (đang nằm trong hình người cân) đứng TRÊN BỆ CÂN — đáy chân nó cách mặt bệ ≤ 3 %
    chiều cao người, giữa thân nó trong bề ngang cân — và ≥ 70 % khung thân nó nằm trong khung hình."""
    W, H = frame_size(folder)
    out, worst, seen_least = [], None, None
    for t, frame in zip(c['times'], frames):
        who, pet = frame.get(c['who']), frame.get(c['target'])
        paws = (scales.get(('paws', float(t))) or {}).get(c['target'])
        box = pet and pet.get('body')
        if not who or not who.get('tall') or not box or paws is None: continue
        cx = (box['x0'] + box['x1']) / 2
        under = [s for s in scales.get(float(t)) or [] if s['x0'] <= cx <= s['x1']]
        off = min((abs(paws - s['top']) for s in under), default=None)
        off = None if off is None else off / who['tall']
        if worst is None or off is None or (worst[1] is not None and off > worst[1]): worst = (t, off)
        area = max(1, (box['x1'] - box['x0']) * (box['y1'] - box['y0']))
        seen = max(0, min(box['x1'], W) - max(box['x0'], 0)) * max(0, min(box['y1'], H) - max(box['y0'], 0)) / area
        if seen_least is None or seen < seen_least[1]: seen_least = (t, seen)
    if worst is None: return [{'scene': folder, 'what': f'{c["who"]} weighs {c["target"]}', 'ok': None, 'note': 'not in the frame'}]
    out.append({'scene': folder, 'what': f'{c["who"]} weighs {c["target"]} — {c["target"]} on the scale', 'ok': worst[1] is not None and worst[1] <= ON_SCALE,
                'note': (f'paws {worst[1] * 100:.1f} % of height off the top of the scale at {worst[0]:g} s (limit {ON_SCALE * 100:g} %)' if worst[1] is not None else f'{c["target"]} is not over a scale at {worst[0]:g} s')})
    out.append({'scene': folder, 'what': f'{c["who"]} weighs {c["target"]} — {c["target"]} in the frame', 'ok': seen_least[1] >= 0.7,
                'note': f'{seen_least[1] * 100:.0f} % of {c["target"]} in the frame at {seen_least[0]:g} s (least 70 %)'})
    # MÀN HÌNH CÂN (đợt 35, lượt ba): số cân khi con vật đứng trên bệ, số 0 trước khi đặt lên và sau khi bế ra.
    if c.get('reading') and c.get('empty'):
        texts = lambda t: (scales.get(('care', float(t))) or {}).get('@scales') or []
        shown = [t for t in c['times'] if c['reading'] in texts(t)]
        zero = [t for t in c['empty'] if texts(t) and all(not any(ch in text for ch in '123456789') for text in texts(t))]
        ok = len(shown) == len(c['times']) and len(zero) == len(c['empty'])
        out.append({'scene': folder, 'what': f'{c["who"]} weighs {c["target"]} — the scale shows the weight only while {c["target"]} is on it', 'ok': ok,
                    'note': f'"{c["reading"]}" at {len(shown)} of {len(c["times"])} moments on the scale; 0 at {len(zero)} of {len(c["empty"])} moments off it'
                            + ('' if ok else f' (display: {", ".join(f"{t:g} s {texts(t)}" for t in c["times"] + c["empty"])})')})
    return out


JUMP = 0.015          # con vật dời > 1,5 % chiều cao người trong một khung (1/30 s) …
FREE = 0.02           # … khi không bàn tay nào của người làm cách hình nó (đầu, thân) ≤ 2 % chiều cao: nó tự nhảy chỗ (đợt 35)


def check_jumps(folder, c, frames):
    """CON VẬT KHÔNG NHẢY CHỖ (đợt 35, cân): theo từng khung (1/30 s) của bước `weigh`, con vật dời bao nhiêu so với BÀN TAY GẦN NÓ
    NHẤT của người cân (cùng bàn tay ở hai khung) — cả hai tính so với chỗ đứng của người, theo chiều cao người, nên máy cắt / đẩy
    không thành "nhảy". Nó dời > 1,5 % một khung, lệch khỏi bàn tay ấy > 1,5 %, mà bàn tay ấy không chạm hình nó (đầu, thân; ≤ 2 %) là nó tự bay — bản đầu:
    từ bệ cân về trước bụng trong 0,6 s, hai tay buông bên hông (10 / 13 khung, tới 7 % một khung)."""
    worst, jumps, prev = None, 0, None
    for t, frame in zip(c['frames'], frames):
        who, pet = frame.get(c['who']), frame.get(c['target'])
        box = pet and pet.get('body')
        if not who or not who.get('tall') or not box or not who.get('hands'): prev = None; continue
        # So với CHỖ ĐỨNG của người cân (điểm sàn dưới chân, không theo thân — người quỳ / đứng dậy thì thân dời).
        rel = lambda x, y: ((x - who['x']) / who['tall'], (y - who['ground']) / who['tall'])
        centre = rel((box['x0'] + box['x1']) / 2, (box['y0'] + box['y1']) / 2)
        drawn = list((pet.get('parts') or {}).values()) or [box]
        hands = {h['side']: (rel(h['x'], h['y']), min(gap(h, b) for b in drawn) / who['tall']) for h in who['hands']}
        if prev:
            side = min(prev['hands'], key=lambda k: prev['hands'][k][1])
            if side in hands:
                moved = (centre[0] - prev['centre'][0] - (hands[side][0][0] - prev['hands'][side][0][0]), centre[1] - prev['centre'][1] - (hands[side][0][1] - prev['hands'][side][0][1]))
                step, near = (moved[0] ** 2 + moved[1] ** 2) ** 0.5, min(hands[side][1], prev['hands'][side][1])
                own = ((centre[0] - prev['centre'][0]) ** 2 + (centre[1] - prev['centre'][1]) ** 2) ** 0.5     # con vật TỰ dời (tay rời đi thì không tính)
                # Khung con vật vào / rời vòng tay (`carried` đổi): hình nó đổi dáng (cuộn trong tay ↔ đứng), khung thân đổi — không phải dời chỗ.
                if own > JUMP and step > JUMP and near > FREE and bool(pet.get('carried')) == prev['carried']:
                    jumps += 1
                    if worst is None or step > worst[1]: worst = (t, step, near)
        prev = {'centre': centre, 'hands': hands, 'carried': bool(pet.get('carried'))}
    note = (f'{jumps} frame{"" if jumps == 1 else "s"} where {c["target"]} moves away from the hand nearest it, which is not on it — {worst[1] * 100:.1f} % of height in one frame at {worst[0]:g} s, the hand {worst[2] * 100:.0f} % away'
            if jumps else f'{c["target"]} moves only with a hand, {len(c["frames"])} frames (limit {JUMP * 100:g} % a frame apart from the nearest hand when it is more than {FREE * 100:g} % off)')
    return [{'scene': folder, 'what': f'{c["who"]} weighs {c["target"]} — {c["target"]} never jumps', 'ok': jumps == 0, 'note': note}]


LOOK = 50             # đọc nhiệt kế: hướng con ngươi lệch hướng từ mắt tới nhiệt kế ≤ 50° …
LOOK_SHIFT = 0.1      # … và con ngươi lệch khỏi giữa tròng ≥ 10 % bề ngang mắt (không nhìn thẳng ra trước)


def check_look(folder, c, scales):
    """NHÌN VÀO DỤNG CỤ (đợt 35, đọc nhiệt kế): ở ba lúc đọc, con ngươi hai mắt lệch về phía dụng cụ đang giơ (`gadget`) — góc giữa hướng
    lệch và hướng mắt → dụng cụ ≤ 50°, lệch ≥ 10 % bề ngang mắt."""
    import math
    worst = None
    for t in c['times']:
        who = (scales.get(('care', float(t))) or {}).get(c['who'])
        tool = next((g for g in (who or {}).get('gadgets', []) if g['kind'] == c['gadget']), None)
        if not who or not tool or not who.get('eyes'): continue
        for eye in who['eyes']:
            ox, oy = eye['pupil']['x'] - eye['eye']['x'], eye['pupil']['y'] - eye['eye']['y']
            tx, ty = tool['x'] - eye['eye']['x'], tool['y'] - eye['eye']['y']
            shift = (ox * ox + oy * oy) ** 0.5 / max(1, eye['eye']['w'])
            angle = abs(math.degrees(math.atan2(ox * ty - oy * tx, ox * tx + oy * ty))) if shift > 0 else 180
            bad = angle > LOOK or shift < LOOK_SHIFT
            if worst is None or (bad and not worst[3]) or (bad == worst[3] and angle > worst[1]): worst = (t, angle, shift, bad)
    if worst is None: return [{'scene': folder, 'what': f'{c["who"]} looks at the thermometer', 'ok': None, 'note': 'no thermometer in the hand at the moments asked'}]
    out = [{'scene': folder, 'what': f'{c["who"]} looks at the thermometer', 'ok': not worst[3],
            'note': f'pupils turned {worst[1]:.0f}° off the thermometer, shifted {worst[2] * 100:.0f} % of the eye width at {worst[0]:g} s (limit {LOOK}°, least {LOOK_SHIFT * 100:g} %)'}]
    # Lượt ba: QUAY mặt về phía nhiệt kế (|huong| ≥ 0,3, cùng phía) và nhiệt kế SÁT MẶT (tâm nó cách tâm đầu ≤ 0,8 bề ngang đầu), ở cả
    # ba lúc — trải ≥ 1,2 s.
    bad, seen, placed = [], [], []
    for t in c['times']:
        who = (scales.get(('care', float(t))) or {}).get(c['who']) or {}
        tool = next((g for g in who.get('gadgets', []) if g['kind'] == c['gadget']), None)
        head = who.get('head')
        if not tool or not head: bad.append(f'{t:g} s: no thermometer'); continue
        side = 1 if tool['x'] > head['x'] else -1
        near = ((tool['x'] - head['x']) ** 2 + (tool['y'] - head['y']) ** 2) ** 0.5 / max(1, head['w'])
        tilt, drop = who.get('tilt', 0) * side, who.get('drop', 0)
        H = (scales.get(('care', float(t))) or {}).get('@H') or frame_size(folder)[1]
        face, tool_px = head['w'] / H, max(tool.get('w', 0), tool.get('h', 0)) / H
        seen.append((near, tilt, drop, face, tool_px))
        if face < FACE_FRAME or tool_px < TOOL_FRAME: bad.append(f'{t:g} s: face {face * 100:.0f} % and thermometer {tool_px * 100:.0f} % of the frame height')
        if who.get('turn', 0) * side < TURN_TO: bad.append(f'{t:g} s: turned {who.get("turn", 0):+.2f}')
        if near > NEAR_FACE: bad.append(f'{t:g} s: thermometer {near:.2f} head widths from the face')
        if tilt < HEAD_TILT or drop < HEAD_DROP: bad.append(f'{t:g} s: head tilted {tilt:+.0f}°, lowered {drop:+.1f} toward it')
        # Lượt bốn: NGANG MẮT (tâm nhiệt kế ± 10 % chiều cao đầu quanh tầm mắt), LỆCH SANG BÊN (≥ 0,5 bề ngang đầu từ tâm mặt) và KHÔNG
        # CHỒNG LÊN MIỆNG (khung nhiệt kế không chạm khung miệng) — lượt ba giơ sát cằm, nhìn như ngậm nhiệt kế.
        eyes = who.get('eyes') or []
        if eyes and head.get('h'):
            eye_y = sum(e['eye']['y'] for e in eyes) / len(eyes)
            level, aside = abs(tool['y'] - eye_y) / head['h'], abs(tool['x'] - head['x']) / max(1, head['w'])
            mouth = who.get('mouthP')
            over = bool(mouth) and abs(tool['x'] - mouth['x']) < (tool.get('w', 0) + mouth.get('w', 0)) / 2 and abs(tool['y'] - mouth['y']) < (tool.get('h', 0) + mouth.get('h', 0)) / 2
            placed.append((level, aside, over))
            if level > EYE_LEVEL or aside < ASIDE or over: bad.append(f'{t:g} s: thermometer {level * 100:.0f} % of the head height off eye level, {aside:.2f} head widths aside' + (', over the mouth' if over else ''))
    span = c['times'][-1] - c['times'][0]
    out.append({'scene': folder, 'what': f'{c["who"]} turns to the thermometer held by the face', 'ok': not bad and span >= READ_HOLD - 1e-6,
                'note': ('; '.join(bad) if bad else f'face turned and head bent to it, the thermometer by the face at all {len(c["times"])} moments') + f' over {span:.1f} s'
                        + (f' — farthest {max(x[0] for x in seen):.2f} head widths, least tilt {min(x[1] for x in seen):+.0f}°, least lowering {min(x[2] for x in seen):+.1f}, face ≥ {min(x[3] for x in seen) * 100:.0f} %, thermometer ≥ {min(x[4] for x in seen) * 100:.1f} % of the frame height' if seen else '')
                        + (f'; eye level within {max(x[0] for x in placed) * 100:.0f} % of the head height, ≥ {min(x[1] for x in placed):.2f} head widths aside, over the mouth {sum(x[2] for x in placed)} times' if placed else '')
                        + f' (least {READ_HOLD:g} s; turn ≥ {TURN_TO:g}, within {NEAR_FACE:g} head widths, tilt ≥ {HEAD_TILT:g}°, lowered ≥ {HEAD_DROP:g}, face ≥ {FACE_FRAME * 100:g} %, thermometer ≥ {TOOL_FRAME * 100:g} %, eye level ±{EYE_LEVEL * 100:g} %, aside ≥ {ASIDE:g})'})
    return out


TURN_TO = 0.3         # đọc nhiệt kế: người quay 3/4 về phía nó (`huong`)
NEAR_FACE = 0.8       # … nhiệt kế cách tâm đầu ≤ 0,8 bề ngang đầu
READ_HOLD = 1.2       # … giữ ≥ 1,2 s
EYE_LEVEL = 0.10      # lượt bốn: tâm nhiệt kế cao ngang mắt ± 10 % chiều cao đầu
ASIDE = 0.5           # … cách tâm mặt ≥ 0,5 bề ngang đầu (sang bên), không chồng lên miệng
HEAD_TILT = 0         # … đầu không nghiêng ra xa nó (lượt bốn: nghiêng 8° về phía nhiệt kế kéo tâm đầu sang đó — nhiệt kế hết lệch sang bên)
HEAD_DROP = 2         # … và cúi xuống ≥ 2 đơn vị khung (`dauY`) — lượt bốn: nhiệt kế ngang mắt, nhìn ngang sang nó (lượt ba: cúi 10, nhiệt kế ở cằm)
FACE_FRAME = 0.36     # … góc cận: mặt người (bề ngang đầu) ≥ 36 % chiều cao khung (lượt bốn: góc cận giữ trọn bàn khám — 38 %; lượt ba đặt 44 % theo số đo)
TOOL_FRAME = 0.085    # … và nhiệt kế (cạnh dài) ≥ 8,5 % chiều cao khung — lượt hai: 7,2 % / 8,2 %


TOUCH = 0.01          # lượt bốn: bàn tay cách khung hình đầu con vật ≤ 1 % chiều cao người (khung bao — lỏng, xem Known)
TIP_TOUCH = 0.004     # … đầu đo nhiệt kế cách khung hình thân con vật ≤ 0,4 % (lượt ba: mèo 0,5 % — lơ lửng sau đuôi)
PILL_AT = 0.02        # viên thuốc (mép gần nhất) cách môi con vật ≤ 2 % chiều cao người …
MOUTH_OPEN = 0.5      # … và miệng con vật há ≥ 0,5 lúc viên thuốc ở môi


def check_pill(folder, c, scales):
    """VIÊN THUỐC VÀO MÕM (đợt 35): ở lúc giữa viên thuốc (dụng cụ 7) cách môi con vật ≤ 5 % chiều cao người; ở cả ba lúc miệng con vật
    há ≥ 0,5 (bản đầu: nó chỉ há lúc viên thuốc đã mất)."""
    out, mid = [], c['times'][len(c['times']) // 2]
    care = scales.get(('care', float(mid))) or {}
    who, pet = care.get(c['who']), care.get(c['target'])
    pill = next((g for g in (who or {}).get('gadgets', []) if g['kind'] == 7), None)
    if who and pet and pill and pet.get('lips'):
        # Tới HÌNH viên nang (mép gần nhất), không tới tâm nó: lượt ba viên nang dừng ở mép môi để không che cái miệng đang há.
        half_w, half_h = pill.get('w', 0) / 2, pill.get('h', 0) / 2
        dx, dy = max(0, abs(pill['x'] - pet['lips']['x']) - half_w), max(0, abs(pill['y'] - pet['lips']['y']) - half_h)
        d = (dx * dx + dy * dy) ** 0.5 / max(1, who['tall'])
        out.append({'scene': folder, 'what': f'{c["who"]} givePill {c["target"]} — pill at the mouth', 'ok': d <= PILL_AT, 'note': f'the pill is {d * 100:.1f} % of height from the lips at {mid:g} s (limit {PILL_AT * 100:g} %)'})
    else:
        out.append({'scene': folder, 'what': f'{c["who"]} givePill {c["target"]} — pill at the mouth', 'ok': False, 'note': f'no pill in the hand (or no lips) at {mid:g} s'})
    opens = [((scales.get(('care', float(t))) or {}).get(c['target']) or {}).get('mouth', 0) for t in c['times']]
    out.append({'scene': folder, 'what': f'{c["who"]} givePill {c["target"]} — mouth open for the pill', 'ok': min(opens) >= MOUTH_OPEN and c['times'][-1] - c['times'][0] >= 0.8 - 1e-6,
                'note': f'mouth open {min(opens):.2f} at least over {c["times"][0]:g}–{c["times"][-1]:g} s (least {MOUTH_OPEN:g}, over ≥ 0.8 s)'})
    # Lượt ba — CỠ TRÊN KHUNG ở lúc được hỏi: mặt con vật ≥ 15 % chiều cao khung, viên thuốc (cạnh dài) ≥ 1/3 bề ngang mõm (nét môi),
    # hàm há ≥ 12 % chiều cao đầu nó.
    H = care.get('@H') or frame_size(folder)[1]
    if pet and pill:
        face, lips, jaw, size = pet.get('face', 0), pet.get('lipsW', 0), pet.get('jaw', 0), max(pill.get('w', 0), pill.get('h', 0))
        ok = face / H >= FACE_SHARE and lips > 0 and size >= lips / 3 and face > 0 and jaw / face >= JAW_OPEN
        out.append({'scene': folder, 'what': f'{c["who"]} givePill {c["target"]} — big enough on screen', 'ok': ok,
                    'note': f'at {mid:g} s: {c["target"]}\'s face {face / H * 100:.0f} % of the frame height (least {FACE_SHARE * 100:g} %), pill {size:.0f} px vs mouth {lips:.0f} px (least 1/3), jaw open {jaw:.0f} px = {jaw / max(1, face) * 100:.0f} % of its head (least {JAW_OPEN * 100:g} %)'})
    return out


FACE_SHARE = 0.15     # cho thuốc: mặt con vật ≥ 15 % chiều cao khung (góc cận)
JAW_OPEN = 0.12       # … hàm há ≥ 12 % chiều cao đầu nó


WORN_TALL = 0.02      # đồ con vật đeo (băng, loa): đường chéo khung ≥ 2 % chiều cao người đeo cho nó — thấy được, không phải một chấm (đợt 35)
WORN_IN = 0.8         # … và ≥ 80 % khung của nó nằm trong khung hình
CHART_UP = 0.6        # bìa hồ sơ đang đọc: giữa bìa ở 60 % trên của khung thân người (trước ngực, không buông bên hông)
POINT_AIM = 12        # chỉ phim: hướng vai → bàn tay lệch hướng vai → điểm trên phim ≤ 12°
POINT_NEAR = 0.25     # … và bàn tay cách điểm ấy ≤ 25 % chiều cao người (tay chibi ngắn: chỉ về phía phim, không chạm)


def in_frame(box, W, H):
    """Phần diện tích của khung `box` nằm trong khung hình W × H."""
    area = max(1e-6, (box['x1'] - box['x0']) * (box['y1'] - box['y0']))
    return max(0, min(box['x1'], W) - max(box['x0'], 0)) * max(0, min(box['y1'], H) - max(box['y0'], 0)) / area


def check_worn(folder, c, frames):
    """ĐỒ ĐEO CÒN LẠI (đợt 35): sau `bandage` / `putCone`, ở cả hai lúc đo băng / loa vẫn vẽ trên con vật, đủ lớn và trong khung."""
    W, H = frame_size(folder)
    out = []
    for t, frame in zip(c['times'], frames):
        pet, by = frame.get(c['who']), frame.get(c.get('by'))
        tall = (by or {}).get('tall') or max(((a.get('tall') or 0) for a in frame.values() if a.get('person')), default=0)
        box = pet and (pet.get('worn') or {}).get(c['item'])
        what = f'{c["who"]} still wears the {c["item"]} at {t:g} s'
        if not pet: out.append({'scene': folder, 'what': what, 'ok': None, 'note': f'{c["who"]} not in the frame'}); continue
        if not box: out.append({'scene': folder, 'what': what, 'ok': False, 'note': f'no {c["item"]} drawn on {c["who"]}'}); continue
        high, seen = ((box['x1'] - box['x0']) ** 2 + (box['y1'] - box['y0']) ** 2) ** 0.5 / (tall or 1), in_frame(box, W, H)
        out.append({'scene': folder, 'what': what, 'ok': high >= WORN_TALL and seen >= WORN_IN,
                    'note': f'{c["item"]} {high * 100:.1f} % of the person\'s height across (least {WORN_TALL * 100:g} %), {seen * 100:.0f} % in the frame (least {WORN_IN * 100:g} %)'})
    return out


def check_chart(folder, c, frames):
    """ĐỌC BỆNH ÁN (đợt 35): ở lúc được hỏi, bìa hồ sơ trọn trong khung, giữa nó ở 60 % trên của khung thân người đọc."""
    W, H = frame_size(folder)
    t, who = c['times'][len(c['times']) // 2], frames[len(c['times']) // 2].get(c['who'])
    what = f'{c["who"]} readChart — clipboard up in front of the chest'
    if not who: return [{'scene': folder, 'what': what, 'ok': None, 'note': 'not in the frame'}]
    board = next((item for item in who.get('items') or [] if item['kind'] == 'clipboard'), None)
    if not board: return [{'scene': folder, 'what': what, 'ok': False, 'note': f'no clipboard in hand at {t:g} s'}]
    b, body = board['box'], who.get('body')
    cy, seen = (b['y0'] + b['y1']) / 2, in_frame(b, W, H)
    line = body['y0'] + (body['y1'] - body['y0']) * CHART_UP if body else H
    return [{'scene': folder, 'what': what, 'ok': seen >= 0.95 and cy <= line,
             'note': f'{seen * 100:.0f} % of the clipboard in the frame (least 95 %), its middle {(cy - line) / (who.get("tall") or 1) * 100:+.1f} % of height from the chest line at {t:g} s (≤ 0)'}]


def check_xray(folder, c, frames):
    """CHỈ PHIM (đợt 35): ở lúc được hỏi, điểm trên phim trong khung, bàn tay chỉ trong khung, hướng vai → bàn tay lệch hướng vai →
    điểm ≤ 12° và bàn tay cách điểm ≤ 25 % chiều cao người."""
    import math
    W, H = frame_size(folder)
    n = len(c['times']) // 2
    t, who = c['times'][n], frames[n].get(c['who'])
    what = f'{c["who"]} showXray — points at the spot on the film'
    spots = SPOTS.get(float(t)) or []
    if not who or not who.get('hands') or not spots: return [{'scene': folder, 'what': what, 'ok': None, 'note': 'not in the frame' if not who else 'no X-ray viewer drawn'}]
    best = None
    for hand in who['hands']:
        shoulder = next((p for p in who.get('shoulders') or [] if p['side'] == hand['side']), None)
        if not shoulder: continue
        for spot in spots:
            a = math.atan2(hand['y'] - shoulder['y'], hand['x'] - shoulder['x']); b = math.atan2(spot['y'] - shoulder['y'], spot['x'] - shoulder['x'])
            off = abs((math.degrees(a - b) + 180) % 360 - 180)
            far = math.hypot(hand['x'] - spot['x'], hand['y'] - spot['y']) / (who.get('tall') or 1)
            if best is None or off < best[0]: best = (off, far, hand, spot)
    if best is None: return [{'scene': folder, 'what': what, 'ok': None, 'note': 'no shoulder measured'}]
    off, far, hand, spot = best
    inside = 0 <= spot['x'] <= W and 0 <= spot['y'] <= H and (not hand.get('box') or in_frame(hand['box'], W, H) >= 0.95)
    return [{'scene': folder, 'what': what, 'ok': off <= POINT_AIM and far <= POINT_NEAR and inside,
             'note': f'the arm points {off:.1f}° off the spot (limit {POINT_AIM:g}°), the hand {far * 100:.1f} % of height from it (limit {POINT_NEAR * 100:g} %), '
                     + ('spot and hand in the frame' if inside else 'the spot or the hand is out of the frame') + f' at {t:g} s'}]


CARE_NEAR = 0.06      # đợt 35, lượt hai: ở MỌI mốc của dải `track`, HAI tay ≤ 6 % chiều cao người từ phần thấy được của con vật
APPEAR_NEAR = 0.05    # … đồ (loa, băng) hiện / dài thêm trên con vật: bàn tay gần nhất ≤ 5 % chiều cao từ khung của nó
HELD_BEFORE = 3       # … loa: thấy trong tay ở ≥ 3 mốc (0,3 s) trước khi chuyển sang con vật, và lúc chuyển thì vành ôm quanh đầu nó
FACE_TURN = 0.3       # chỉ phim xong: |huong| ≥ 0,3, về phía người nghe
CARE_FRONT = 0.4      # băng chân: mọi bàn tay ở ≥ 40 % trục đuôi → đầu của con vật (lượt ba — không gần đuôi)
CONE_NEAR = 0.5       # đeo loa: mọi bàn tay cách khung đầu ≤ 0,5 × bề ngang đầu (ở cổ, không phía đuôi — lượt ba)


def near_pet(hand, pet, frame):
    """Khoảng cách từ một bàn tay tới phần THẤY ĐƯỢC của con vật (lưới điểm đầu + thân), hay tới khung thân nếu không có."""
    seen = visible_points(pet, frame)
    if seen: return min(((hand['x'] - p['x']) ** 2 + (hand['y'] - p['y']) ** 2) ** 0.5 for p in seen)
    return gap(hand, pet['body']) if pet.get('body') else float('inf')


def check_care(folder, c, shots):
    """ĐEO ĐỒ CHO CON VẬT (đợt 35, lượt hai — Gemini: "băng tự hiện", "vòng tự bay lên đầu mèo, hai tay vẫn chắp ở bụng"):
    (1) ở mọi mốc của dải `track`, CẢ HAI bàn tay của người làm ≤ 6 % chiều cao từ con vật; (2) đồ hiện / dài thêm trên con vật chỉ
    khi một bàn tay ở sát nó (≤ 5 %); (3) loa: thấy trong tay ở ≥ 3 mốc trước khi chuyển, và ngay trước lúc chuyển vành trong tay
    ôm quanh đầu con vật (tâm đầu nằm trong khung vành)."""
    out, item = [], 'bandage' if c['kind'] == 'bandage' else 'cone'
    frame = lambda t: {a['name']: a for a in shots.get(float(t), [])}
    far = []
    for t in c['track']:
        f = frame(t); who, pet = f.get(c['who']), f.get(c['target'])
        if not who or not pet or len(who.get('hands') or []) < 2 or not who.get('tall'): continue
        # Băng: đo tới CHÍNH CHỖ BĂNG (khung băng trên chân, nới 4 % chiều cao) khi nó đã hiện — tay giữ ở bụng con chó vẫn "gần
        # con vật" mà không phải đang giữ chân (đợt 35, lượt hai).
        band = (pet.get('worn') or {}).get('bandage') if c['kind'] == 'bandage' else None
        worst = max(max(0, gap(h, band) - 0.04 * who['tall']) if band else near_pet(h, pet, f) for h in who['hands']) / who['tall']
        far.append((t, worst))
    if not far: out.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — both hands on it throughout', 'ok': None, 'note': 'not measured'})
    else:
        bad = [(t, d) for t, d in far if d > CARE_NEAR]; top = max(far, key=lambda x: x[1])
        out.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — both hands on it throughout ({len(far)} moments)', 'ok': not bad,
                    'note': f'the farther hand at most {top[1] * 100:.1f} % of height from {c["target"]} (at {top[0]:g} s; limit {CARE_NEAR * 100:g} %)' + (f'; {len(bad)} moments over' if bad else '')})
    # (1b) Lượt ba (Gemini 00:41: "tay chạm gần đuôi mèo"): ở mọi mốc `track`, mọi bàn tay ở PHÍA ĐẦU con vật — theo trục đuôi → đầu
    # của khung thân, bàn tay ở ≥ 40 % (0 = mép đuôi, 1 = mép đầu).
    toward = []
    for t in c['track']:
        f = frame(t); who, pet = f.get(c['who']), f.get(c['target'])
        parts = (pet or {}).get('parts') or {}
        if not who or not who.get('hands') or 'head' not in parts or not pet.get('body'): continue
        hb, bb = parts['head'], pet['body']
        head_right = (hb['x0'] + hb['x1']) / 2 > (bb['x0'] + bb['x1']) / 2
        tail, nose = (bb['x0'], bb['x1']) if head_right else (bb['x1'], bb['x0'])
        if c['kind'] == 'putCone':
            # Loa: bàn tay ở CỔ / ĐẦU — khoảng cách tới khung đầu ≤ nửa bề ngang đầu (mèo ngồi: đuôi vắt dài làm trục thân lệch hẳn).
            toward.append((t, max(gap(h, hb) for h in who['hands']) / ((hb['x1'] - hb['x0']) or 1)))
        else: toward.append((t, min((h['x'] - tail) / ((nose - tail) or 1) for h in who['hands'])))
    if toward and c['kind'] == 'putCone':
        far = max(toward, key=lambda r: r[1])
        out.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — hands at the neck, away from the tail', 'ok': far[1] <= CONE_NEAR,
                    'note': f'the farther hand {far[1] * 100:.0f} % of a head width from {c["target"]}\'s head (at {far[0]:g} s; limit {CONE_NEAR * 100:g} %)'})
    elif toward:
        low = min(toward, key=lambda r: r[1])
        out.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — hands at the head end, away from the tail', 'ok': low[1] >= CARE_FRONT,
                    'note': f'the hand nearest the tail at {low[1] * 100:.0f} % of the way from tail to head (at {low[0]:g} s; least {CARE_FRONT * 100:g} %)'})
    # (2) + (3): theo dải `appear` (mỗi 0,1 s suốt bước).
    prev, held, moved, unheld = None, 0, [], []
    for t in c.get('appear', []):
        f = frame(t); who, pet = f.get(c['who']), f.get(c['target'])
        if not who or not pet: prev = None; continue
        box = (pet.get('worn') or {}).get(item)
        size = (box['y1'] - box['y0']) * (box['x1'] - box['x0']) if box else 0
        ring = next((g for g in who.get('gadgets') or [] if g['kind'] == 9), None)
        if item == 'cone' and not box and ring: held += 1
        grew = box and (prev is None or size > prev[0] * 1.02 + 1)
        if grew and prev is not None:
            d = min(gap(h, box) for h in who['hands']) / (who.get('tall') or 1) if who.get('hands') else 1
            moved.append((t, d))
            if item == 'cone' and prev[0] == 0 and prev[1] is not None:
                r, face = prev[1]['box'], pet.get('face')
                if face: unheld.append((t, r['x0'] <= (face['x0'] + face['x1']) / 2 <= r['x1'] and r['y0'] <= (face['y0'] + face['y1']) / 2 <= r['y1']))
        prev = (size, ring)
    if moved:
        top = max(moved, key=lambda x: x[1])
        out.append({'scene': folder, 'what': f'{c["target"]}\'s {item} appears / grows only under a hand', 'ok': top[1] <= APPEAR_NEAR,
                    'note': f'{len(moved)} moments it appears or grows; the nearest hand at most {top[1] * 100:.1f} % of height from it (at {top[0]:g} s; limit {APPEAR_NEAR * 100:g} %)'})
    else: out.append({'scene': folder, 'what': f'{c["target"]}\'s {item} appears / grows only under a hand', 'ok': False, 'note': f'the {item} never appeared on {c["target"]} during the step'})
    if item == 'cone':
        around = unheld[0][1] if unheld else False
        out.append({'scene': folder, 'what': f'{c["who"]} holds the cone before it goes on {c["target"]}', 'ok': held >= HELD_BEFORE and around,
                    'note': f'the cone seen in the hand at {held} moments before it passes (least {HELD_BEFORE}); ' + ('just before, the cone in the hand rings the pet\'s head' if around else 'just before, the cone in the hand is NOT round the pet\'s head')})
    return out


def check_gaze(folder, c, shots):
    """CHỈ PHIM XONG QUAY VỀ NGƯỜI NGHE (đợt 35, lượt hai — Gemini: "quay ra nhìn máy quay thay vì quay về phía bà"). Lượt ba: ở MỌI
    mốc của `after` (≥ 1 s: 0,9 s và 0,4 s trước khi bước xong, 0,3 s sau) — đầu / người quay về phía người nghe ≥ FACE_TURN, đo trên
    màn hình (`facing` đã trừ phần máy quay lệch)."""
    rows, what = [], f'{c["who"]} turns to {c["listener"]} after showXray, held'
    for t in c['after']:
        f = {a['name']: a for a in shots.get(float(t), [])}
        who, other = f.get(c['who']), f.get(c['listener'])
        if not who or who.get('facing') is None or not other: continue
        want = 1 if other['x'] > who['x'] else -1
        rows.append((t, who['facing'] * want))
    if not rows: return [{'scene': folder, 'what': what, 'ok': None, 'note': 'not both in the frame'}]
    least = min(rows, key=lambda r: r[1])
    return [{'scene': folder, 'what': what + f' ({len(rows)} moments)', 'ok': least[1] >= FACE_TURN and len(rows) >= 2,
             'note': f'turned toward {c["listener"]} by at least {least[1]:+.2f} (at {least[0]:g} s; want ≥ {FACE_TURN:g} at every moment, {rows[0][0]:g}–{rows[-1][0]:g} s)'}]


READ_TILT = 12        # đọc bệnh án: đầu nghiêng ≥ 12° …
READ_DOWN = 8         # … và hạ ≥ 8 đơn vị ở mọi mốc đọc (lượt ba — Gemini 1 khung / giây: "nhìn thẳng ra trước")
NOD_DEEP = 14         # gật: đáy hai lần gật hạ đầu ≥ 14; giữa hai lần và lúc ngẩng ≤ 4


def check_reading(folder, c, shots):
    """ĐỌC BỆNH ÁN (lượt ba): (1) đầu CÚI — nghiêng ≥ 12°, hạ ≥ 8 — ở cả bốn mốc của hai lúc đọc (trước, sau khi lật); (2) NGẨNG
    lên trước khi gật; (3) hai lần gật rõ (đáy ≥ 14, giữa ≤ 4). Gemini lượt hai: "nhìn thẳng ra trước", "không ngẩng lên, không gật"."""
    head = lambda t: (({a['name']: a for a in shots.get(float(t), [])}.get(c['who']) or {}).get('head'))
    rows = [(t, head(t)) for t in c['reading']]; rows = [(t, h) for t, h in rows if h]
    out = []
    if not rows: return [{'scene': folder, 'what': f'{c["who"]} reads the chart — head bent down', 'ok': None, 'note': 'not measured'}]
    least = min(rows, key=lambda r: abs(r[1]['tilt']))
    shallow = min(rows, key=lambda r: r[1]['down'])
    out.append({'scene': folder, 'what': f'{c["who"]} reads the chart — head bent down ({len(rows)} moments)', 'ok': abs(least[1]['tilt']) >= READ_TILT and shallow[1]['down'] >= READ_DOWN,
                'note': f'head tilted at least {abs(least[1]["tilt"]):.1f}° (at {least[0]:g} s; least {READ_TILT}°), lowered at least {shallow[1]["down"]:.1f} (at {shallow[0]:g} s; least {READ_DOWN})'})
    raised = [h for h in (head(t) for t in c.get('raised', [])) if h]
    nods = [head(t) for t in c.get('nods', [])]
    if raised and all(nods):
        up_ok = all(abs(h['tilt']) <= 3 and h['down'] <= 4 for h in raised)
        nod_ok = nods[0]['down'] >= NOD_DEEP and nods[2]['down'] >= NOD_DEEP and nods[1]['down'] <= 4
        out.append({'scene': folder, 'what': f'{c["who"]} looks up from the chart, then nods twice', 'ok': up_ok and nod_ok,
                    'note': f'raised: tilt {raised[0]["tilt"]:.1f}°, down {raised[0]["down"]:.1f}; nods: {nods[0]["down"]:.1f} / {nods[1]["down"]:.1f} / {nods[2]["down"]:.1f} (want ≥ {NOD_DEEP} / ≤ 4 / ≥ {NOD_DEEP})'})
    else: out.append({'scene': folder, 'what': f'{c["who"]} looks up from the chart, then nods twice', 'ok': None, 'note': 'not measured'})
    return out


PERSON_CUT = (0.2, 0.8)    # người bị mép trái / phải khung CẮT DỞ: thấy 20…80 % bề ngang khung thân (đợt 35, lượt hai — Gemini: bác sĩ lẹm mép)


def check_people_framed(folder, moments, shots):
    """NGƯỜI TRONG KHUNG (đợt 35, lượt hai): ở mọi khoảnh khắc của moments.json, không người nào bị mép trái / phải cắt dở — thấy
    20…80 % bề ngang khung thân (ít hơn là ra ngoài khung, nhiều hơn là chỉ lẹm mép tay áo / khuỷu tay). Cảnh thử lượt một:
    bác sĩ 76 % ở góc mở đầu — Gemini thấy lẹm."""
    W, H = frame_size(folder)
    out = []
    for m in moments:
        if not isinstance(m.get('t'), (int, float)): continue
        cut = []
        for a in shots.get(float(m['t']), []):
            b = a.get('body')
            if not a.get('person') or not b or b['x1'] <= b['x0']: continue
            seen = (min(b['x1'], W) - max(b['x0'], 0)) / (b['x1'] - b['x0'])
            if PERSON_CUT[0] <= seen <= PERSON_CUT[1]: cut.append(f'{a["name"]} {seen * 100:.0f} % ({"left" if b["x0"] < 0 else "right"} edge)')
        out.append({'scene': folder, 'what': f'people inside the frame at {m["t"]:g} s ({m.get("what", "")})', 'ok': not cut, 'note': '; '.join(cut) or 'nobody cut by the left / right edge'})
    return out


def check_scene(folder):
    moments = json.load(open(os.path.join(folder, 'moments.json'), encoding='utf-8'))
    checks = [m['check'] for m in moments if m.get('check')]
    if not checks and not moments: return []
    # Mọi lúc cần chụp: các dải thời gian của từng phép đo (danh sách số — `reading` của cân là chữ, bỏ qua).
    when = lambda c: [t for key in ('times', 'frames', 'empty', 'track', 'appear', 'after', 'reading', 'raised', 'nods', 'samples') if isinstance(c.get(key), list) for t in c[key] if isinstance(t, (int, float))]
    shots, cuts, log = probe(folder, [t for c in checks for t in when(c)] + [m['t'] for m in moments if isinstance(m.get('t'), (int, float))])
    scales = SCALES
    # NẤP (đợt 35): con vật thấy bao nhiêu, đầu bao nhiêu — đo bằng pixel ở lúc được hỏi.
    hide_jobs = [(c['times'][len(c['times']) // 2], c['who'], c.get('target') or c['who']) for c in checks if c['kind'] == 'petAct' and c['name'] == 'hide']
    hidden = pet_pixels_sharp(folder, hide_jobs, KEEP and os.path.join(KEEP, 'hide')) if hide_jobs else None
    results = check_props(folder, moments, cuts) + check_depths(folder) + check_shots(folder, log) + check_seen(folder, checks, KEEP) + check_track(folder, checks, KEEP and os.path.join(KEEP, 'track'))
    results += check_people_framed(folder, moments, shots)
    for c in checks:
        frames = [{a['name']: a for a in shots.get(float(t), [])} for t in c['times']]
        if c['kind'] in ('bandage', 'putCone') and c.get('track'): results.extend(check_care(folder, c, shots))
        if c['kind'] == 'showXray' and c.get('listener'): results.extend(check_gaze(folder, c, shots))
        if c['kind'] == 'readChart' and c.get('reading'): results.extend(check_reading(folder, c, shots))
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
        if c['kind'] in ('putDown', 'carry'):
            # BẾ / ĐẶT XUỐNG TRONG KHUNG (đợt 35, lượt ba): ở mọi lúc đo, ≥ 70 % con vật trong khung — không thì nó "bay" vào tay từ mép
            # dưới, hay "biến mất" khỏi tay khi được đặt xuống ngoài khung (góc trung cắt ngang người bế).
            W, H = frame_size(folder)
            worst = None
            for t, frame in zip(c['times'], frames):
                pet = frame.get(c['target'])
                box = pet and (pet.get('body') or pet.get('face'))
                if not box: worst = (t, 0.0); break
                area = max(1, (box['x1'] - box['x0']) * (box['y1'] - box['y0']))
                seen = max(0, min(box['x1'], W) - max(box['x0'], 0)) * max(0, min(box['y1'], H) - max(box['y0'], 0)) / area
                if worst is None or seen < worst[1]: worst = (t, seen)
            if worst: results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — the pet stays in the frame', 'ok': worst[1] >= 0.7,
                                      'note': f'least {worst[1] * 100:.0f} % of {c["target"]} in the frame (at {worst[0]:g} s; least 70 % at every moment measured)'})
            # MƯỢT (lượt bốn): mỗi 1/30 s suốt bước, giữa thân con vật dời ≤ 2,5 % chiều cao người bế giữa hai khung — không nhảy vào tay,
            # không rơi bịch xuống sàn.
            if c.get('samples'):
                track = [(t, {a['name']: a for a in shots.get(float(t), [])}) for t in c['samples']]
                def centre(f):
                    b, who = ((f.get(c['target']) or {}).get('parts') or {}).get('back'), f.get(c['who'])
                    if not b or not who or not who.get('tall'): return None
                    return (((b['x0'] + b['x1']) / 2 - who['x']) / who['tall'], ((b['y0'] + b['y1']) / 2 - who['ground']) / who['tall'])
                hop = biggest_jump(track, centre)
                if hop: results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — the pet moves smoothly, no jump', 'ok': hop[1] <= JUMP,
                                        'note': f'the pet\'s body moves at most {hop[1] * 100:.1f} % of {c["who"]}\'s height between two frames, measured against {c["who"]} (at {hop[0]:g} s; limit {JUMP * 100:g} %)'})
        if c['kind'] == 'putDown':
            results.extend(check_put_down(folder, c, frames))
            continue
        if c['kind'] == 'gesture':
            results.extend(check_gesture(folder, c, frames))
            continue
        if c['kind'] == 'reaction':
            results.extend(check_reaction(folder, c, frames, log))
            continue
        if c['kind'] == 'weigh':
            results.extend(check_weigh(folder, c, frames, scales))
            if c.get('frames'): results.extend(check_jumps(folder, c, [{a['name']: a for a in shots.get(float(t), [])} for t in c['frames']]))
            continue
        if c['kind'] == 'look':
            results.extend(check_look(folder, c, scales))
            continue
        if c['kind'] == 'pill':
            results.extend(check_pill(folder, c, scales))
            continue
        if c['kind'] == 'worn':
            results.extend(check_worn(folder, c, frames))
            continue
        if c['kind'] == 'readChart':
            results.extend(check_chart(folder, c, frames))
            continue
        if c['kind'] == 'showXray':
            results.extend(check_xray(folder, c, frames))
            continue
        if c['kind'] == 'petAct':
            results.extend(check_pet_act(folder, c, frames, hidden, [{a['name']: a for a in shots.get(float(t), [])} for t in c.get('samples', [])]))
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
        # Lượt bốn — CHẠM THẬT ở lúc được hỏi (lúc giữa): đo nhiệt — ĐẦU ĐO (khung nhiệt kế) sát hình đầu / thân con vật; cho thuốc — CẢ HAI
        # bàn tay sát hình đầu nó (một tay ở mõm, một tay đỡ cằm). Lượt ba: nhiệt kế lơ lửng sau đuôi con mèo, tay đỡ buông ở eo.
        if c['kind'] in ('takeTemp', 'givePill') and asked:
            t = asked[0]; frame = frames[c['times'].index(t)] if t in c['times'] else {}
            who, pet = frame.get(c['who']), frame.get(c['target'])
            drawn = list(((pet or {}).get('parts') or {}).items())
            if who and who.get('tall') and drawn:
                if c['kind'] == 'takeTemp':
                    tool = next((g for g in ((scales.get(('care', float(t))) or {}).get(c['who']) or {}).get('gadgets', []) if g['kind'] == 6), None)
                    if tool:
                        tb = {'x0': tool['x'] - tool['w'] / 2, 'x1': tool['x'] + tool['w'] / 2, 'y0': tool['y'] - tool['h'] / 2, 'y1': tool['y'] + tool['h'] / 2}
                        g = min(max(0, b['x0'] - tb['x1'], tb['x0'] - b['x1']) ** 2 + max(0, b['y0'] - tb['y1'], tb['y0'] - b['y1']) ** 2 for _, b in drawn) ** 0.5 / who['tall']
                        results.append({'scene': folder, 'what': f'{c["who"]} takeTemp {c["target"]} — the thermometer touches it', 'ok': g <= TIP_TOUCH,
                                        'note': f'the thermometer is {g * 100:.1f} % of height from {c["target"]}\'s body at {t:g} s (limit {TIP_TOUCH * 100:g} %)'})
                    else: results.append({'scene': folder, 'what': f'{c["who"]} takeTemp {c["target"]} — the thermometer touches it', 'ok': False, 'note': f'no thermometer in the hand at {t:g} s'})
                else:
                    head = dict(drawn).get('head') or drawn[0][1]
                    gaps = sorted(max(0, head['x0'] - h['box']['x1'], h['box']['x0'] - head['x1'], head['y0'] - h['box']['y1'], h['box']['y0'] - head['y1']) / who['tall'] for h in who['hands'] if h.get('box'))
                    ok = len(gaps) == 2 and gaps[-1] <= TOUCH
                    results.append({'scene': folder, 'what': f'{c["who"]} givePill {c["target"]} — both hands on its head', 'ok': ok,
                                    'note': f'hands {", ".join(f"{x * 100:.1f} %" for x in gaps)} of height from {c["target"]}\'s head at {t:g} s (limit {TOUCH * 100:g} % each)'})
        if bent is not None:
            results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — leans no more than {SEATED_LEAN:g}°', 'ok': bent[1] <= SEATED_LEAN + 0.5,
                            'note': f'the body leans {bent[1]:.0f}° at {bent[0]:g} s, the moment asked about (limit {SEATED_LEAN:g}°)'})
        if lap is not None:
            results.append({'scene': folder, 'what': f'{c["who"]} {c["kind"]} {c["target"]} — hand off the own lap', 'ok': False,
                            'note': f'the hand rests on {c["who"]}\'s own thigh / knee at {lap:g} s, the moment asked about'})
        if c['kind'] == 'carry' and c.get('only') != 'reach':
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
