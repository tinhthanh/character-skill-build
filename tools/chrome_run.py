#!/usr/bin/env python3
"""Open a page in headless Chrome, WAIT until it says it is finished, then save what was asked.

    python3 tools/chrome_run.py URL --wait DONE,ERROR [--dump out.html] [--screenshot out.png]
                                [--size 1280x800 | --size-js "JS returning 'W,H'"] [--log errors.txt]

The page signals completion through `document.title` (one of the --wait values). Chrome is
driven over its DevTools protocol, so nothing is captured before that — unlike
`--virtual-time-budget`, which stops after a fixed amount of virtual time whether or not the
page is ready, and gave half-rendered screenshots on larger compositions.

Standard library only (a small WebSocket client is included). Exit codes: 0 finished,
3 the page never reached a --wait title, 4 Chrome could not be started.
"""
import argparse, base64, json, os, re, select, shutil, socket, struct, subprocess, sys, tempfile, time


class DevTools:
    """Just enough of a WebSocket client to speak the DevTools protocol to a local Chrome."""

    def __init__(self, url):
        host, port, path = re.match(r'ws://([^:/]+):(\d+)(/.*)', url).groups()
        # Chờ trả lời tới 300 s: trang kiểm tra có những đoạn chạy đồng bộ dài (hàng trăm rig dựng lại), trong lúc ấy trình
        # duyệt không trả lời lệnh nào — trên máy CI chậm, 30 s là không đủ.
        # Máy bận (nhiều Chrome song song) thì các đoạn ấy dài hơn: nhân theo CHROME_RUN_TIMEOUT_SCALE như --timeout.
        self.sock = socket.create_connection((host, int(port)), timeout=300 * max(1.0, float(os.environ.get('CHROME_RUN_TIMEOUT_SCALE') or 1)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                           f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        self.buffer = b''
        while b'\r\n\r\n' not in self.buffer:
            self.buffer += self._read()
        head, self.buffer = self.buffer.split(b'\r\n\r\n', 1)
        if b' 101 ' not in head.split(b'\r\n')[0]:
            raise RuntimeError('Chrome refused the DevTools connection')
        self.next_id, self.events = 0, []

    def _read(self):
        data = self.sock.recv(1 << 16)
        if not data:
            raise RuntimeError('Chrome closed the DevTools connection')
        return data

    def _take(self, count):
        # Gom các mẩu vào danh sách rồi nối một lần (đợt 45): ảnh chụp vài MB mà cộng dồn `bytes` từng mẩu 64 KB thì chép lại cả bộ đệm mỗi lần.
        if len(self.buffer) < count:
            parts, have = [self.buffer], len(self.buffer)
            while have < count:
                chunk = self._read(); parts.append(chunk); have += len(chunk)
            self.buffer = b''.join(parts)
        data, self.buffer = self.buffer[:count], self.buffer[count:]
        return data

    def _send_frame(self, opcode, payload):
        mask = os.urandom(4)
        head = bytes([0x80 | opcode])
        size = len(payload)
        head += bytes([0x80 | size]) if size < 126 else bytes([0x80 | 126]) + struct.pack('>H', size) if size < 65536 else bytes([0x80 | 127]) + struct.pack('>Q', size)
        self.sock.sendall(head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

    def _message(self):
        parts = []
        while True:
            first, second = self._take(2)
            opcode, size = first & 0x0f, second & 0x7f
            if size == 126: size = struct.unpack('>H', self._take(2))[0]
            elif size == 127: size = struct.unpack('>Q', self._take(8))[0]
            payload = self._take(size)
            if opcode == 9: self._send_frame(10, payload); continue      # ping → pong
            if opcode == 8: raise RuntimeError('Chrome closed the DevTools connection')
            if opcode in (0, 1, 2): parts.append(payload)
            if first & 0x80 and opcode in (0, 1, 2): return json.loads(b''.join(parts).decode('utf-8'))

    def call(self, method, params=None, session=None):
        self.next_id += 1
        message = {'id': self.next_id, 'method': method, 'params': params or {}}
        if session: message['sessionId'] = session
        self._send_frame(1, json.dumps(message).encode('utf-8'))
        while True:
            reply = self._message()
            if reply.get('id') == self.next_id:
                if 'error' in reply: raise RuntimeError(f"{method}: {reply['error'].get('message')}")
                return reply.get('result', {})
            self.events.append(reply)


AWAKE = ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']


def launch(chrome_bin, profile):
    """Khởi động Chrome headless với hồ sơ `profile`; trả về (tiến trình, địa chỉ DevTools — None nếu không khởi động được)."""
    # Chrome đôi khi treo ngay lúc khởi động mà không in gì, không thoát (gặp khi nhiều Chrome khởi động cùng lúc —
    # tools/check_scene.py -j): đọc stderr có hạn chờ (select), quá 30 s thì giết và thử lại, tối đa 3 lần.
    # macOS: khi màn hình tắt (máy khoá), cửa sổ bị coi là bị che → Chrome thôi vẽ khung → lệnh chụp ảnh treo mãi.
    # Ba cờ AWAKE (như puppeteer) giữ trang luôn được vẽ, kể cả khi màn hình tắt (thử lại được: tắt màn hình giữa lúc
    # acting_check chụp — không có cờ thì "socket.timeout", có cờ thì xong bình thường).
    endpoint, chrome = None, None
    for attempt in range(3):
        chrome = subprocess.Popen([chrome_bin, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                                   *AWAKE, '--remote-debugging-port=0', f'--user-data-dir={profile}', 'about:blank'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        said, started = b'', time.time()
        while time.time() - started < 30:
            if select.select([chrome.stderr], [], [], 0.5)[0]:
                chunk = os.read(chrome.stderr.fileno(), 65536)
                if not chunk: break
                said += chunk
                found = re.search(rb'DevTools listening on (ws://\S+)', said)
                if found: endpoint = found.group(1).decode(); break
            elif chrome.poll() is not None: break
        if endpoint: break
        chrome.kill(); chrome.wait()
        shutil.rmtree(profile, ignore_errors=True); os.makedirs(profile, exist_ok=True)
    return chrome, endpoint


class Page45:
    """ĐỢT 45 — MỘT LẦN MỞ TRANG, NHIỀU LƯỢT ĐO: mở `url` trong Chrome headless, chờ `wait_js` đúng, rồi để công cụ gọi (tools/acting_check.py)
    tự hỏi trang (`evaluate`) và chụp (`capture`, có thể chỉ một vùng) bao nhiêu lần tuỳ ý trong cùng một lần mở — mỗi lần mở Chrome + dựng
    cảnh mất vài giây. Dùng như `with Page45(...) as page:`; mở không được thì ném RuntimeError (có lỗi của trang nếu có)."""

    def __init__(self, url, chrome_bin, size=(1920, 1080), wait_js='true', timeout=90, scale=1):
        self.url, self.chrome_bin, self.size, self.wait_js, self.scale = url, chrome_bin, size, wait_js, scale
        self.timeout = timeout * max(1.0, float(os.environ.get('CHROME_RUN_TIMEOUT_SCALE') or 1))
        self.chrome, self.profile, self.view = None, None, None

    def __enter__(self):
        self.profile = tempfile.mkdtemp(prefix='chrome-run-')
        try:
            self.chrome, endpoint = launch(self.chrome_bin, self.profile)
            if not endpoint: raise RuntimeError('Chrome did not start')
            self.tools = DevTools(endpoint)
            target = self.tools.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            self.session = self.tools.call('Target.attachToTarget', {'targetId': target, 'flatten': True})['sessionId']
            self.call('Page.enable'); self.call('Runtime.enable')
            self.load(self.scale)
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def load(self, scale=None):
        """(Mở lại) trang từ đầu ở tỉ lệ điểm ảnh `scale` và chờ `wait_js` — như một lần mở mới, không phải khởi động lại Chrome."""
        if scale is not None: self.set_scale(scale)
        # Đánh dấu trang cũ: chưa sang trang mới thì `wait_js` (đúng ở trang cũ) chưa tính.
        self.evaluate('window.__oldPage45 = true')
        self.call('Page.navigate', {'url': self.url})
        deadline = time.time() + self.timeout
        while time.time() < deadline:
            if self.evaluate(f'!window.__oldPage45 && !!({self.wait_js})'): return
            time.sleep(0.05)
        raise RuntimeError(f'the page did not finish within {self.timeout:.0f}s' + ''.join(f'\n  page error: {e}' for e in self.errors()[:3]))

    def __exit__(self, *_):
        try:
            if self.chrome and self.chrome.poll() is None:
                try: self.tools.call('Browser.close')
                except Exception: pass
                try: self.chrome.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.chrome.terminate()
                    try: self.chrome.wait(timeout=5)
                    except subprocess.TimeoutExpired: self.chrome.kill()
        finally:
            if self.profile: shutil.rmtree(self.profile, ignore_errors=True)

    def call(self, method, params=None):
        return self.tools.call(method, params, self.session)

    def evaluate(self, expression):
        return self.call('Runtime.evaluate', {'expression': expression, 'returnByValue': True}).get('result', {}).get('value')

    def set_scale(self, scale, view=None):
        """Tỉ lệ điểm ảnh của ảnh chụp (2: gấp đôi mỗi chiều) — giữ nguyên bố cục. `view`: (x, y, w, h) px CSS — Chrome chỉ vẽ vùng ấy (trang
        không thấy gì đổi: vẫn rộng, cao như cũ)."""
        self.scale, self.view = scale, view
        metrics = {'width': self.size[0], 'height': self.size[1], 'deviceScaleFactor': scale, 'mobile': False}
        if view: metrics['viewport'] = {'x': view[0], 'y': view[1], 'width': view[2], 'height': view[3], 'scale': 1}
        self.call('Emulation.setDeviceMetricsOverride', metrics)

    def capture(self, clip=None):
        """Hai nhịp vẽ rồi chụp PNG (bytes). `clip`: (x, y, w, h) px CSS nguyên — chỉ vùng ấy; ảnh ra (w × tỉ lệ) × (h × tỉ lệ) điểm ảnh.
        Có `clip` thì Chrome cũng CHỈ VẼ vùng ấy (viewport của setDeviceMetricsOverride, đặt trước nhịp vẽ): cảnh 3D có lớp mờ / hoà trộn
        lớn, bộ ghép hình phần mềm (--disable-gpu) vẽ cả khung 1920 × 1080 mất 1–3 s mỗi khung; vẽ riêng vùng chụp nhanh gấp 3–7 lần,
        điểm ảnh như chụp `clip` trên khung đầy đủ (đợt 45)."""
        if (clip or None) != self.view: self.set_scale(self.scale, clip or None)
        self.call('Runtime.evaluate', {'expression': 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))', 'awaitPromise': True})
        params = {'format': 'png', 'optimizeForSpeed': True}
        if clip: params['clip'] = {'x': clip[0], 'y': clip[1], 'width': clip[2], 'height': clip[3], 'scale': 1}
        return base64.b64decode(self.call('Page.captureScreenshot', params)['data'])

    def errors(self):
        out = []
        for event in self.tools.events:
            if event.get('method') == 'Runtime.exceptionThrown':
                detail = event['params']['exceptionDetails']
                out.append((detail.get('exception', {}).get('description') or detail.get('text', '')).split('\n')[0])
            elif event.get('method') == 'Runtime.consoleAPICalled' and event['params'].get('type') == 'error':
                out.append(' '.join(str(a.get('value', a.get('description', ''))) for a in event['params'].get('args', [])))
        return out


def main():
    parser = argparse.ArgumentParser(description='Run a page in headless Chrome until it reports it is finished.')
    parser.add_argument('url')
    parser.add_argument('--chrome', default=os.environ.get('CHROME_BIN'))
    parser.add_argument('--wait', default='DONE,ERROR', help='document.title values that mean "finished"')
    parser.add_argument('--wait-js', help='instead of --wait: a JavaScript expression that becomes truthy when the page is finished')
    parser.add_argument('--fail-on-error', action='store_true', help='stop waiting as soon as the page throws an uncaught error')
    parser.add_argument('--eval', dest='evaluate', help='JavaScript evaluated once the page is finished; its value is printed as JSON')
    parser.add_argument('--timeout', type=float, default=120, help='seconds to wait for a --wait title')
    parser.add_argument('--dump', help='write the final DOM here ("-" for stdout)')
    parser.add_argument('--screenshot', help='write a PNG here')
    parser.add_argument('--size', default='1280x800', help='viewport, WxH')
    parser.add_argument('--scale', type=float, default=1, help='device pixel ratio of the screenshots (2: twice as many pixels each way)')
    parser.add_argument('--size-js', help='JavaScript evaluated after the page is finished; returns "W,H" for the screenshot')
    parser.add_argument('--log', help='write page errors here')
    parser.add_argument('--steps', help='a JSON file: a list of {"eval": "JS"} and {"screenshot": "out.png"} run in order once the page is finished; '
                                        'the values of the evals are printed as a JSON list (tools/light_side.py)')
    args = parser.parse_args()
    # Máy đang chạy nhiều Chrome cùng lúc (tools/check_scene.py -j) thì trang chậm hơn: hạn chờ nhân theo CHROME_RUN_TIMEOUT_SCALE.
    args.timeout *= max(1.0, float(os.environ.get('CHROME_RUN_TIMEOUT_SCALE') or 1))
    if not args.chrome:
        print('chrome_run: no Chrome given (--chrome or $CHROME_BIN)', file=sys.stderr); sys.exit(4)
    width, height = (int(n) for n in args.size.lower().split('x'))
    finished = set(args.wait.split(','))

    # Thư mục hồ sơ tạm: tự tạo, tự xoá SAU KHI Chrome thoát hẳn và bỏ qua lỗi xoá. Chrome trên Linux
    # còn ghi vào hồ sơ một lúc sau khi được bảo đóng; để `TemporaryDirectory` dọn thì nó ném
    # "Directory not empty" và biến một lượt chạy thành công thành thất bại.
    profile = tempfile.mkdtemp(prefix='chrome-run-')
    try:
        chrome, endpoint = launch(args.chrome, profile)
        try:
            if not endpoint:
                print('chrome_run: Chrome did not start', file=sys.stderr); sys.exit(4)
            tools = DevTools(endpoint)
            target = tools.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            session = tools.call('Target.attachToTarget', {'targetId': target, 'flatten': True})['sessionId']
            call = lambda method, params=None: tools.call(method, params, session)
            evaluate = lambda expression: call('Runtime.evaluate', {'expression': expression, 'returnByValue': True}).get('result', {}).get('value')
            call('Page.enable'); call('Runtime.enable')
            call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': args.scale, 'mobile': False})
            call('Page.navigate', {'url': args.url})
            title, deadline, crashed = '', time.time() + args.timeout, False
            # Trang kiểm tra có những đoạn đồng bộ dài, trong lúc ấy Chrome không trả lời lệnh nào: trên runner CI bận một lần hỏi
            # `document.title` từng chờ quá hạn 300 s của socket và bỏ cả phần, dù trang còn trong --timeout. Khi chờ trang xong,
            # hạn của socket là phần còn lại của --timeout (ít nhất hạn mặc định).
            tools.sock.settimeout(max(tools.sock.gettimeout() or 0, args.timeout + 30))
            while time.time() < deadline:
                if args.wait_js:
                    if evaluate(f'!!({args.wait_js})'): title = 'ready'; break
                else:
                    title = evaluate('document.title') or ''
                    if title in finished: break
                if args.fail_on_error and any(event.get('method') == 'Runtime.exceptionThrown' for event in tools.events): crashed = True; break
                time.sleep(0.05)
            ok = title == 'ready' if args.wait_js else title in finished
            if args.evaluate and ok:
                print(json.dumps(evaluate(args.evaluate)))
            # NHIỀU BƯỚC trong một lần mở trang (đợt 29): tua, chụp, ẩn một nhân vật, chụp lại… — mở lại trang cho từng ảnh
            # thì mỗi lần mất vài giây dựng cảnh.
            if args.steps and ok:
                values = []
                for step in json.load(open(args.steps, encoding='utf-8')):
                    if 'eval' in step: values.append(evaluate(step['eval']))
                    if 'screenshot' in step:
                        call('Runtime.evaluate', {'expression': 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))', 'awaitPromise': True})
                        with open(step['screenshot'], 'wb') as f: f.write(base64.b64decode(call('Page.captureScreenshot', {'format': 'png'})['data']))
                print(json.dumps(values))
            # Lỗi của trang: ngoại lệ không ai bắt và console.error.
            errors = []
            for event in tools.events:
                if event.get('method') == 'Runtime.exceptionThrown':
                    detail = event['params']['exceptionDetails']
                    errors.append((detail.get('exception', {}).get('description') or detail.get('text', '')).split('\n')[0])
                elif event.get('method') == 'Runtime.consoleAPICalled' and event['params'].get('type') == 'error':
                    errors.append(' '.join(str(a.get('value', a.get('description', ''))) for a in event['params'].get('args', [])))
            if args.log:
                with open(args.log, 'w', encoding='utf-8') as f: f.write('\n'.join(errors) + ('\n' if errors else ''))
            if args.dump:
                html = evaluate('"<!DOCTYPE html>" + document.documentElement.outerHTML') or ''
                if args.dump == '-': sys.stdout.write(html)
                else:
                    with open(args.dump, 'w', encoding='utf-8') as f: f.write(html)
            if args.screenshot and ok:
                if args.size_js:
                    wanted = evaluate(args.size_js)
                    if wanted:
                        width, height = (int(float(n)) for n in str(wanted).split(','))
                        call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': args.scale, 'mobile': False})
                # Hai nhịp vẽ để bố cục mới (và SVG vừa đổi) lên hình trước khi chụp.
                call('Runtime.evaluate', {'expression': 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))', 'awaitPromise': True})
                image = call('Page.captureScreenshot', {'format': 'png'})['data']
                with open(args.screenshot, 'wb') as f: f.write(base64.b64decode(image))
            if not ok:
                print('chrome_run: the page threw an error before it finished' if crashed else f'chrome_run: the page did not finish within {args.timeout:.0f}s (title: "{title}")', file=sys.stderr)
                for error in errors[:3]: print(f'  page error: {error}', file=sys.stderr)
            try: tools.call('Browser.close')
            except Exception: pass
            sys.exit(0 if ok else 3)
        finally:
            if chrome.poll() is None:
                chrome.terminate()
                try: chrome.wait(timeout=5)
                except subprocess.TimeoutExpired: chrome.kill()

    finally:
        shutil.rmtree(profile, ignore_errors=True)

if __name__ == '__main__':
    main()
