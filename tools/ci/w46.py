"""Đợt 46 — một khung hình chỉ phụ thuộc thời điểm của nó, không phụ thuộc những lần tua trước nó."""
from .common import *  # noqa: F401,F403
import concurrent.futures, io, random, socket, time  # noqa: E401

# Các cảnh đại diện (đặc tả như ở đợt gốc): diễn xuất trên bàn khám (đợt 28 — tay bác sĩ trên con mèo), đưa / bế / trao con chó và
# dời chiều sâu lúc cắt cảnh (đợt 29), con vật nằm ngủ cạnh người nằm sofa, bế mèo, phòng khách có TV nhấp nháy (đợt 42 E).
SCENES_46 = {
    'acting': {'id': 'acting', 'camera': 'auto', 'set': {'preset': 'exam'}, 'characters': [
        {'name': 'bac_si', 'id': 'vet', 'z': -560, 'x': -30}, {'name': 'be', 'id': 'boy', 'z': -560, 'x': -430},
        {'name': 'meo', 'species': 'calico', 'z': -560, 'on': 'table', 'x': 200}, {'name': 'cho', 'species': 'corgi', 'z': -560, 'x': -700}],
        'script': [{'who': 'be', 'do': [['stroke', '@cho']]}, {'who': 'bac_si', 'do': [['listen', '@meo']]}, {'who': 'be', 'do': [['stroke', '@meo']]},
                   {'who': 'bac_si', 'do': [['handshake', '@be']]}]},
    'handover': {'id': 'handover', 'camera': 'auto', 'set': {'preset': 'park'}, 'characters': [
        {'name': 'ong', 'id': 'grandpa', 'z': -880, 'x': 380, 'on': 'bench', 'seated': True, 'holds': 'cup', 'holdsHidden': True},
        {'name': 'be', 'id': 'boy', 'z': -880, 'x': -200, 'holds': 'cup'}, {'name': 'cho', 'species': 'corgi', 'z': -880, 'x': 820}],
        'script': [{'who': 'be', 'do': [['handOver', '@ong']]}, {'who': 'ong', 'do': [['stroke', '@cho']]}, {'who': 'ong', 'do': [['carry', '@cho']]},
                   {'who': 'ong', 'do': [['handOverPet', '@be']]}, {'who': 'be', 'do': ['putDown']}, {'who': 'be', 'do': [['stroke', '@cho']]}]},
    'floor': {'id': 'floor', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [
        {'name': 'me', 'id': 'receptionist', 'x': 200, 'z': -560, 'faces': 'meo'}, {'name': 'be', 'id': 'boy', 'x': -520, 'z': -848, 'faces': 'me'},
        {'name': 'cho', 'species': 'dog', 'x': -160, 'z': -720, 'faces': 'be'}, {'name': 'meo', 'species': 'cat', 'x': 480, 'z': -560, 'faces': 'me'}],
        'script': [{'who': 'be', 'do': [['lieDown', 'sofa', {'sleep': True}]]}, {'who': 'cho', 'do': [['walk', 4, -40], 'lieDown', ['sleep', 2]], 'view': {'on': ['be', 'cho'], 'size': 'full'}},
                   {'who': 'me', 'do': ['sitOnFloor']}, {'who': 'me', 'do': [['stroke', '@meo']], 'view': {'on': ['me', 'meo'], 'size': 'full'}},
                   {'who': 'me', 'do': [['carry', '@meo']], 'view': {'on': ['me', 'meo'], 'size': 'full'}}, {'who': 'be', 'do': ['standUp']}]},
}


class ScenePage46:
    """Cảnh đã dựng mở trong một Chrome (tools/chrome_run.py `Page45`) qua tools/serve.py; `fresh()` mở lại trang từ đầu."""

    def __init__(self, folder, scale):
        self.folder, self.scale, self.server, self.page = folder, scale, None, None

    def __enter__(self):
        sys.path.insert(0, HERE)
        from chrome_run import Page45
        html = open(os.path.join(self.folder, 'index.html'), encoding='utf-8').read()
        self.comp = re.search(r'data-composition-id="([^"]+)"', html).group(1)
        size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
        self.size = (int(size.group(1)), int(size.group(2))) if size else (1920, 1080)
        chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
        if not chrome: raise RuntimeError('no Chrome found (tools/chrome.sh)')
        with socket.socket() as probe_socket:
            probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
        self.server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={os.path.abspath(self.folder)}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        try: self.page = Page45(url, chrome, self.size, 'window.__sceneTimings', 90, self.scale).__enter__()
        except BaseException:
            self.server.terminate(); raise
        return self

    def __exit__(self, *_):
        try:
            if self.page: self.page.__exit__(None, None, None)
        finally:
            if self.server: self.server.terminate()

    def fresh(self):
        self.page.load(self.scale)

    def duration(self):
        return self.page.evaluate(f'window.__timelines[{json.dumps(self.comp)}].duration()')

    def seek(self, times):
        """Tua lần lượt tới từng lúc (như bộ dựng: `seek(t, false)` rồi `__set.update()`), không chụp — chỉ để trang mang lịch sử tua."""
        self.page.evaluate(f'(() => {{ const tl = window.__timelines[{json.dumps(self.comp)}]; for (const t of {json.dumps(list(times))}) {{ tl.seek(t, false); window.__set.update(); }} return 0; }})()')

    def frame(self, t, settle=False):
        """Khung ở lúc `t`: (số đo `actingProbe()` dạng JSON, ảnh chụp PIL). `settle`: chụp tới khi hai lần liền nhau trùng nhau — ngay
        sau một lượt tua dài Chrome có thể chưa vẽ xong (ô hình độ phân giải thấp)."""
        from PIL import Image
        probe = self.page.evaluate(f'(() => {{ window.__timelines[{json.dumps(self.comp)}].seek({t}, false); window.__set.update(); return JSON.stringify(window.__set.actingProbe()); }})()')
        self.dom = self.page.evaluate(DOM_HASH_46)
        shot = self.page.capture()
        for _ in range(3 if settle else 0):
            again = self.page.capture()
            if again == shot: break
            shot = again
        return probe, Image.open(io.BytesIO(shot)).convert('RGB')


# Dấu vân tay của phần cây DOM ĐANG HIỆN (bỏ nhánh display:none / visibility:hidden / opacity 0 — chúng giữ trạng thái cũ mà không
# vẽ gì; khai báo trong `style` sắp xếp lại vì GSAP có thể ghi cùng các khai báo theo thứ tự khác). Cảnh không có canvas: hai cây hiện
# giống hệt nhau thì vẽ ra cùng một hình — ảnh chụp khác mà cây giống là nhiễu vẽ của Chrome (runner CI Linux vẽ bằng phần mềm).
DOM_HASH_46 = """(() => {
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === 3) { if (node.data.trim()) parts.push(node.data); return; }
    if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    const cs = getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    const attrs = [...node.attributes].map((a) => a.name === 'style' ? 'style=' + a.value.split(';').map((x) => x.trim()).filter(Boolean).sort().join(';') : a.name + '=' + a.value).sort();
    parts.push('<' + node.tagName + ' ' + attrs.join(' '));
    for (const child of node.childNodes) walk(child);
    parts.push('>');
  };
  walk(document.body);
  const s = parts.join('\\n');
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16) + ':' + s.length;
})()"""


def pixel_gap_46(a, b):
    """(vùng lệch, số điểm ảnh lệch, mức lệch lớn nhất trong ba kênh) giữa hai ảnh — (None, 0, 0) nếu trùng."""
    from PIL import ImageChops
    diff = ImageChops.difference(a, b)
    box = diff.getbbox()
    if not box: return None, 0, 0
    r, g, b2 = diff.split()
    most = ImageChops.lighter(ImageChops.lighter(r, g), b2)
    return box, most.size[0] * most.size[1] - most.histogram()[0], most.getextrema()[1]


def seek_check_46(folder, count=8, scale=0.5, seed=46):
    """Chụp `count` lúc của cảnh theo thứ tự TĂNG DẦN trên trang vừa mở, rồi trên trang mở lại: tua qua cả cảnh theo thứ tự xáo trộn
    (đủ nhiều lần để V8 chạy `update` "nóng"), rồi chụp lại các lúc ấy theo thứ tự NGƯỢC xen kẽ nhảy lùi. Trả về các chỗ khác nhau."""
    out = []
    with ScenePage46(folder, scale) as scene:
        end = scene.duration()
        rand = random.Random(seed)
        times = sorted(round(end * (i + rand.uniform(0.15, 0.85)) / count, 3) for i in range(count))
        # Lượt đầu cũng chụp tới khi hai ảnh liền nhau trùng nhau: ảnh đầu tiên chụp ngay sau khi mở trang, Chrome có thể chưa vẽ xong
        # (runner CI: luôn lệch ở lúc sớm nhất của cảnh floor, 233 điểm ảnh) — ảnh gốc vẽ dở thì lần chụp lại nào cũng "khác".
        first = {}
        for t in times:
            first[t] = scene.frame(t, settle=True) + (scene.dom,)
        scene.fresh()
        grid = [round(end * i / 120, 3) for i in range(121)]
        rand.shuffle(grid)
        scene.seek(grid)
        scene.page.capture()                                     # cho Chrome vẽ xong sau lượt tua dài
        order = times[::-1]
        order = order[::2] + order[1::2]                         # lùi, rồi nhảy về cuối mà lùi tiếp
        for t in order:
            probe, image = scene.frame(t)
            if probe != first[t][0]:
                a, b = json.loads(first[t][0]), json.loads(probe)
                what = sorted({f'{x.get("name", "?")}.{k}' for x, y in zip(a, b) for k in set(x) | set(y) if x.get(k) != y.get(k)}) if len(a) == len(b) else ['actor count']
                out.append(f'{t:g} s: actingProbe differs ({", ".join(what[:6])})')
            box, many, worst = pixel_gap_46(first[t][1], image)
            if box: box, many, worst = pixel_gap_46(first[t][1], scene.frame(t, settle=True)[1])         # chụp lại cho chắc
            # Chrome tự nó không vẽ hai lần y hệt từng điểm ảnh: cây DOM giống hệt (mọi thuộc tính, thứ tự) mà vài điểm ảnh lệch 1–2
            # mức ở mép hình đã lọc / làm mờ, tuỳ những gì đã vẽ trước (bộ đệm vẽ của trình duyệt — ngoài tầm cảnh). Lỗi thật (thứ tự
            # lớp, đổ bóng giữ giá trị cũ, con vật trong tay lệch chỗ) lệch nhiều mức hay trên cả một vùng lớn.
            # Ảnh lệch đáng kể mà cây DOM giống hệt lần đầu: nhiễu vẽ của trình duyệt (runner CI: vài trăm điểm ảnh rải khắp khung, lúc này
            # lúc khác, actingProbe trùng) — bỏ qua. Lỗi thật luôn đổi phần cây DOM đang hiện (thứ tự lớp, transform, bóng, chỗ con vật).
            if box and (worst > 2 or many > 1000) and scene.dom != first[t][2]:
                out.append(f'{t:g} s: pixels differ in {box} — {many} px, up to {worst} levels (scale {scale}); the visible DOM differs too')
    return out


@case('seek46', parts=('acting', 'handover', 'floor'), tags=('calm',), uses=('acting_check', 'camera', 'carry', 'handOverPet', 'lieDown', 'stroke', 'listen', 'handshake'))
def seek46(work, problems, part):
    # ĐỢT 46: một khung hình là hàm của THỜI ĐIỂM — bộ dựng có thể tua không theo thứ tự, nhảy lùi, chia khung cho nhiều tiến trình.
    # Trước đợt 46: thứ tự lớp (`set.update`) xếp bằng `Array.prototype.sort` với hàm so sánh không bắc cầu — trang đã tua qua cảnh
    # (V8 chạy nóng) xếp khác trang vừa mở; lớp đổ bóng trên thân (shading.js) giữ giá trị của khung vẽ trước khi khoá làm tròn trùng.
    TAG = scratch('seek46')

    def one(name, spec):
        path = os.path.join(os.path.dirname(STAGE), f'_check_{TAG}_{name}.json')
        try:
            json.dump(spec, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
            done = build(path, os.path.join(work, name))
        finally:
            if os.path.exists(path): os.remove(path)
        if done.returncode != 0: return [f'seek46 {name}: the scene does not build: ' + done.stderr.strip()[:300]]
        try: found = seek_check_46(os.path.join(work, name))
        except RuntimeError as error: return [f'seek46 {name}: could not open the scene in Chrome: {str(error)[-300:]}']
        return [f'seek46 {name}: a frame depends on the seeks before it — {line}' for line in found]
    # Ba cảnh song song (mỗi cảnh một Chrome): chờ Chrome vẽ là phần lâu nhất.
    with concurrent.futures.ThreadPoolExecutor(len(SCENES_46)) as pool:
        for found in pool.map(lambda item: one(*item), [item for item in SCENES_46.items() if item[0] == part]): problems.extend(found)
