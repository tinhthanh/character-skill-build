#!/usr/bin/env python3
"""Đọc DOM của tools/check.html từ stdin, in tóm tắt, thoát 0 nếu PASS."""
import html, json, re, sys

m = re.search(r'<pre id="kq">(.*?)</pre>', sys.stdin.read(), re.S)
if not m or not m.group(1).strip():
    print('FAIL: trang kiểm không trả kết quả (GSAP không tải được? cần mạng cho CDN)')
    sys.exit(1)
d = json.loads(html.unescape(m.group(1)))
for k, v in d['nhanVat'].items():
    print(f"  {k:14} {v['dongTac']} động tác")
for l in d['loi']:
    print('  ✗', l)
print('PASS' if d['ok'] else f"FAIL ({len(d['loi'])} lỗi)")
sys.exit(0 if d['ok'] else 1)
