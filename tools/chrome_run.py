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
import argparse, base64, json, os, re, shutil, socket, struct, subprocess, sys, tempfile, time


class DevTools:
    """Just enough of a WebSocket client to speak the DevTools protocol to a local Chrome."""

    def __init__(self, url):
        host, port, path = re.match(r'ws://([^:/]+):(\d+)(/.*)', url).groups()
        # Chờ trả lời tới 300 s: trang kiểm tra có những đoạn chạy đồng bộ dài (hàng trăm rig dựng lại), trong lúc ấy trình
        # duyệt không trả lời lệnh nào — trên máy CI chậm, 30 s là không đủ.
        self.sock = socket.create_connection((host, int(port)), timeout=300)
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
        while len(self.buffer) < count:
            self.buffer += self._read()
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
    parser.add_argument('--size-js', help='JavaScript evaluated after the page is finished; returns "W,H" for the screenshot')
    parser.add_argument('--log', help='write page errors here')
    args = parser.parse_args()
    if not args.chrome:
        print('chrome_run: no Chrome given (--chrome or $CHROME_BIN)', file=sys.stderr); sys.exit(4)
    width, height = (int(n) for n in args.size.lower().split('x'))
    finished = set(args.wait.split(','))

    # Thư mục hồ sơ tạm: tự tạo, tự xoá SAU KHI Chrome thoát hẳn và bỏ qua lỗi xoá. Chrome trên Linux
    # còn ghi vào hồ sơ một lúc sau khi được bảo đóng; để `TemporaryDirectory` dọn thì nó ném
    # "Directory not empty" và biến một lượt chạy thành công thành thất bại.
    profile = tempfile.mkdtemp(prefix='chrome-run-')
    try:
        chrome = subprocess.Popen([args.chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                                   '--remote-debugging-port=0', f'--user-data-dir={profile}', 'about:blank'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        try:
            endpoint, started = None, time.time()
            while time.time() - started < 30:
                line = chrome.stderr.readline()
                if not line and chrome.poll() is not None: break
                found = re.search(r'DevTools listening on (ws://\S+)', line or '')
                if found: endpoint = found.group(1); break
            if not endpoint:
                print('chrome_run: Chrome did not start', file=sys.stderr); sys.exit(4)
            tools = DevTools(endpoint)
            target = tools.call('Target.createTarget', {'url': 'about:blank'})['targetId']
            session = tools.call('Target.attachToTarget', {'targetId': target, 'flatten': True})['sessionId']
            call = lambda method, params=None: tools.call(method, params, session)
            evaluate = lambda expression: call('Runtime.evaluate', {'expression': expression, 'returnByValue': True}).get('result', {}).get('value')
            call('Page.enable'); call('Runtime.enable')
            call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': False})
            call('Page.navigate', {'url': args.url})
            title, deadline, crashed = '', time.time() + args.timeout, False
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
                        call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': False})
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
