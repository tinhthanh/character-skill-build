#!/usr/bin/env python3
"""Đọc DOM của tools/check.html từ stdin, in tóm tắt, thoát 0 nếu PASS."""
import html, json, re, sys

matches = re.findall(r'<pre id="kq">(.*?)</pre>', sys.stdin.read(), re.S)
if not matches or not matches[-1].strip():
    print('FAIL: the check page returned nothing (could GSAP not load? the CDN needs network access)')
    sys.exit(1)
result = json.loads(html.unescape(matches[-1]))
for name, info in result['nhanVat'].items():
    print(f"  {name:14} {info['dongTac']} actions")
for problem in result['loi']:
    print('  ✗', problem)
print('PASS' if result['ok'] else f"FAIL ({len(result['loi'])} problems)")
sys.exit(0 if result['ok'] else 1)
