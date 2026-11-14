#!/usr/bin/env python3
"""Server dev cho studio và các trang kiểm tra.

    python3 tools/serve.py            # http://127.0.0.1:8300/studio/
    python3 tools/serve.py 8400

Khác `python3 -m http.server` ở hai điểm, cả hai đều từng gây lỗi khó lần:
  • Luôn gửi `Cache-Control: no-store`. Trình duyệt tự giữ module ES theo suy đoán;
    sửa xong một nhân vật mà trang vẫn chạy bản cũ thì không có lỗi nào để lần.
  • Nhận `POST /api/character/config/<id>` — nút Lưu của studio — và ghi
    `configs/<id>.json`.
Chỉ nghe trên 127.0.0.1.
"""
import functools, http.server, json, os, re, sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONG = int(sys.argv[1]) if len(sys.argv) > 1 else 8300

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a): pass

    def _tra(self, ma, noi_dung):
        than = json.dumps(noi_dung, ensure_ascii=False).encode()
        self.send_response(ma)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(than)))
        self.end_headers()
        self.wfile.write(than)

    def do_POST(self):
        m = re.fullmatch(r'/api/character/config/([a-z][a-z0-9_]{0,63})', self.path)
        if not m: return self._tra(404, {'error': 'not found'})
        dai = int(self.headers.get('Content-Length') or 0)
        if not 0 < dai <= 200_000: return self._tra(400, {'error': 'payload size'})
        try: du_lieu = json.loads(self.rfile.read(dai))
        except Exception: return self._tra(400, {'error': 'invalid JSON'})
        if not isinstance(du_lieu, dict): return self._tra(400, {'error': 'config must be an object'})
        os.makedirs(os.path.join(GOC, 'configs'), exist_ok=True)
        with open(os.path.join(GOC, 'configs', m.group(1) + '.json'), 'w', encoding='utf-8') as f:
            json.dump(du_lieu, f, ensure_ascii=False, indent=2); f.write('\n')
        self._tra(200, {'status': 'ok', 'file': f'configs/{m.group(1)}.json'})

if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', CONG), functools.partial(H, directory=GOC))
    print(f'studio:  http://127.0.0.1:{CONG}/studio/', flush=True)
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
