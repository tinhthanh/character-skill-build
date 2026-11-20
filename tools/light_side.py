#!/usr/bin/env python3
"""SÁNG MỘT BÊN — đo bằng máy trên ảnh chụp, không cần người / máy chấm.

    python3 tools/light_side.py cảnh-1/ cảnh-2/ …            → in độ chênh sáng của từng người, đạt / hỏng; mã thoát 1 nếu hỏng
    python3 tools/light_side.py cảnh/ --json side.json        → ghi thêm số đo ra tệp
    python3 tools/light_side.py cảnh/ --keep ảnh/             → giữ các ảnh chụp (ảnh thường, ảnh không người, ảnh không đổ bóng)

Câu hỏi duy nhất về ánh sáng mà người chấm (Gemini) trả lời "không" ổn định qua nhiều lượt (đợt 28): "phía của mỗi nhân vật
hướng về nguồn sáng chính có sáng hơn phía kia không?" — ban ngày nhân vật trông sáng đều hai bên. Công cụ đo đúng điều ấy:

  • mở cảnh (thư mục tools/scene.py vừa dựng, có moments.json), tua tới khoảnh khắc mở cảnh ("opening" — câu hỏi ấy được hỏi
    ở đó); `--all`: cả các khoảnh khắc có phép đo diễn xuất (góc gần hơn);
  • chụp ba ảnh: cảnh như thường; cảnh ẩn mọi người / con vật (phần khác nhau giữa hai ảnh là HÌNH của họ — không lẫn nền);
    cảnh tắt lớp đổ bóng trên thân (`[data-shade]`, `[data-bounce]`);
  • với mỗi NGƯỜI trong khung: lấy đầu và thân trên (75 % trên của khung thân), chia đôi ở giữa hình, so độ sáng trung bình
    (luma) nửa phía nguồn sáng chính (`keySide` của set3d) với nửa kia.

`contrast` = (sáng nửa phía đèn − sáng nửa kia) / sáng trung bình — trên ảnh thường: cái người xem thấy, kể cả chỗ bất đối
xứng của chính hình vẽ (tóc lệch, áo hai màu). `shading` = phần do lớp đổ bóng góp vào (ảnh thường trừ ảnh tắt đổ bóng).
Đạt khi contrast hay shading ≥ 8 % — hình vẽ lệch (tóc dài một bên) có thể kéo contrast xuống dù đổ bóng đã làm đủ phần
mình. Không chấm: người NGƯỢC SÁNG (ô cửa sáng sau lưng: mặt trước tối đều là đúng), ban ĐÊM không có đèn gần, người cao dưới
120 px trên màn hình.
"""
import argparse, json, os, re, socket, subprocess, sys, tempfile, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
LEAST = 0.08            # nửa phía đèn sáng hơn nửa kia ít nhất 8 % độ sáng trung bình
SMALL = 120             # người thấp hơn 120 px trên màn hình: không đo


def shoot(folder, times, keep):
    """Mở cảnh, ở mỗi lúc: đo (actingProbe) và chụp ba ảnh. Trả về [(lúc, số đo, ảnh thường, ảnh không người, ảnh không đổ bóng)]."""
    html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
    found = re.search(r'data-composition-id="([^"]+)"', html)
    if not found: sys.exit(f'light_side: {folder}/index.html has no data-composition-id')
    if 'window.__set = set' not in html: sys.exit(f'light_side: {folder} was built before tools/scene.py exposed the set — build it again')
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    if not chrome: sys.exit('light_side: no Chrome found (tools/chrome.sh)')
    size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
    with socket.socket() as probe_socket:
        probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={os.path.abspath(folder)}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out = keep or tempfile.mkdtemp(prefix='light-side-')
    os.makedirs(out, exist_ok=True)
    try:
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        tl = f'window.__timelines[{json.dumps(found.group(1))}]'
        hosts = "document.querySelectorAll('[data-set3d][data-name]')"
        covers = "document.querySelectorAll('[data-shade], [data-bounce]')"
        steps, shots = [], []
        for n, t in enumerate(times):
            base = os.path.join(out, f'{os.path.basename(os.path.normpath(folder))}-{n}')
            steps += [{'eval': f'(() => {{ {tl}.seek({t}, false); window.__set.update(); return window.__set.actingProbe(); }})()'},
                      {'screenshot': base + '-a.png'},
                      {'eval': f"(() => {{ for (const h of {hosts}) h.style.visibility = 'hidden'; return 0; }})()"},
                      {'screenshot': base + '-b.png'},
                      {'eval': f"(() => {{ for (const h of {hosts}) h.style.visibility = ''; for (const c of {covers}) {{ c.dataset.was = c.style.display; c.style.display = 'none'; }} return 0; }})()"},
                      {'screenshot': base + '-c.png'},
                      {'eval': f"(() => {{ for (const c of {covers}) c.style.display = c.dataset.was || ''; return 0; }})()"}]
            shots.append((t, base))
        plan = os.path.join(out, 'steps.json')
        json.dump(steps, open(plan, 'w', encoding='utf-8'))
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--steps', plan], capture_output=True, text=True)
        if done.returncode != 0 or not done.stdout.strip(): sys.exit(f'light_side: could not capture {folder}:\n{done.stderr.strip()[-500:]}')
        values = json.loads(done.stdout.strip().splitlines()[-1])
        probes = values[0::4]
        return [(t, probe, base + '-a.png', base + '-b.png', base + '-c.png') for (t, base), probe in zip(shots, probes)], out
    finally:
        server.terminate()


def luma(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def halves(person, others, a, b, c):
    """Độ sáng trung bình hai nửa (trái, phải) của đầu + thân trên một người, trên ảnh thường (a) và ảnh tắt đổ bóng (c)."""
    box = person['body']
    W, H = a.size
    x0, x1 = max(0, int(box['x0'])), min(W, int(box['x1']))
    y0, y1 = max(0, int(box['y0'])), min(H, int(box['y0'] + (box['y1'] - box['y0']) * 0.75))
    if x1 - x0 < 4 or y1 - y0 < 4: return None
    pa, pb, pc = a.load(), b.load(), c.load()
    cover = [o['body'] for o in others if o.get('body')]
    pixels = []
    step = max(1, int(((x1 - x0) * (y1 - y0) / 60000) ** 0.5))            # thưa ra cho người to: ~60 000 điểm là đủ
    for y in range(y0, y1, step):
        for x in range(x0, x1, step):
            if any(o['x0'] <= x <= o['x1'] and o['y0'] <= y <= o['y1'] for o in cover): continue      # chỗ chồng lên người khác: bỏ
            p, q = pa[x, y], pb[x, y]
            if max(abs(p[0] - q[0]), abs(p[1] - q[1]), abs(p[2] - q[2])) <= 12: continue                # nền: giống ảnh không người
            pixels.append((x, luma(p), luma(pc[x, y])))
    if len(pixels) < 200: return None
    middle = sum(x for x, _, _ in pixels) / len(pixels)
    left, right = [p for p in pixels if p[0] < middle], [p for p in pixels if p[0] >= middle]
    mean = lambda items, k: sum(item[k] for item in items) / len(items)
    return {'left': mean(left, 1), 'right': mean(right, 1), 'leftFlat': mean(left, 2), 'rightFlat': mean(right, 2), 'all': mean(pixels, 1), 'allFlat': mean(pixels, 2)}


def check_scene(folder, keep=None, every=False):
    moments = json.load(open(os.path.join(folder, 'moments.json'), encoding='utf-8'))
    times = [m['t'] for m in moments if m.get('what') == 'opening'] + ([m['t'] for m in moments if m.get('check') and m['check'].get('kind') != 'walk'] if every else [])
    times = list(dict.fromkeys(times))[:6]
    if not times: return []
    shots, out = shoot(folder, times, keep)
    results = []
    for t, probe, fa, fb, fc in shots:
        a, b, c = (Image.open(f).convert('RGB') for f in (fa, fb, fc))
        people = [p for p in probe if p.get('person') and p.get('body')]
        for person in people:
            if not person.get('keySide') or person['tall'] < SMALL: continue
            part = halves(person, [p for p in probe if p is not person and p.get('body')], a, b, c)
            if not part: continue
            lit, dark = ('right', 'left') if person['keySide'] > 0 else ('left', 'right')
            contrast = (part[lit] - part[dark]) / max(1, part['all'])
            flat = (part[lit + 'Flat'] - part[dark + 'Flat']) / max(1, part['allFlat'])
            light = person.get('light') or {}
            # Không chấm: NGƯỢC SÁNG (ô cửa sáng sau lưng — mặt trước tối đều là đúng), hay ĐÊM không có đèn gần (ánh trời yếu).
            judged = light.get('back', 0) < 0.3 and not (light.get('mood') == 'night' and not light.get('key'))
            results.append({'scene': folder, 't': t, 'who': person['name'], 'tall': round(person['tall']), 'side': lit, 'contrast': round(contrast, 4),
                            'shading': round(contrast - flat, 4), 'light': light,
                            'ok': (contrast >= LEAST or contrast - flat >= LEAST) if judged else None})
    if not keep:
        for name in os.listdir(out): os.remove(os.path.join(out, name))
        os.rmdir(out)
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Measure whether the side of each character facing the main light is brighter than the other side.')
    parser.add_argument('scenes', nargs='+', help='scene folders built by tools/scene.py')
    parser.add_argument('--json', help='also write the measurements here')
    parser.add_argument('--keep', help='keep the captured frames in this folder')
    parser.add_argument('--report-only', action='store_true', help='print the measurements, exit 0 even on a miss')
    parser.add_argument('--all', action='store_true', help='also measure at the acting moments (default: only the opening, where the reviewer is asked)')
    args = parser.parse_args()
    results = [r for folder in args.scenes for r in check_scene(folder, args.keep, args.all)]
    for r in results:
        why = '' if r['ok'] is not None else ' — not judged: ' + ('backlit' if r['light'].get('back', 0) >= 0.3 else 'night, no lamp near')
        print(f'  {"✓" if r["ok"] else "·" if r["ok"] is None else "✗"} {os.path.basename(os.path.normpath(r["scene"]))} {r["t"]:g} s: {r["who"]} ({r["tall"]} px) — light from the {r["side"]}: '
              f'that half {r["contrast"] * 100:+.1f} % brighter (shading {r["shading"] * 100:+.1f} %; least {LEAST * 100:g} %){why}')
    bad = [r for r in results if r['ok'] is False]
    judged = [r for r in results if r['ok'] is not None]
    print(f'light_side: {len(judged) - len(bad)}/{len(judged)} pass' + (f', {len(bad)} fail' if bad else ''))
    if args.json: json.dump(results, open(args.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(1 if bad and not args.report_only else 0)
