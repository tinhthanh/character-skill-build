#!/usr/bin/env python3
"""Đọc DOM của tools/peek.html từ stdin, in bảng thời lượng; với --size thì chỉ in "rộng,cao" của ảnh ghép."""
import html, json, re, sys

matches = re.findall(r'<pre id="info">(.*?)</pre>', sys.stdin.read(), re.S)
if not matches or not matches[-1].strip():
    print('peek: trang xem trước không trả kết quả (composition không nạp được?)', file=sys.stderr); sys.exit(1)
info = json.loads(html.unescape(matches[-1]))
if not info.get('ok'):
    print('peek: ' + info.get('error', 'lỗi không rõ'), file=sys.stderr); sys.exit(1)
if '--size' in sys.argv:
    print(f"{info['sheet']['width']},{info['sheet']['height']}"); sys.exit(0)

print(f"composition  {info['composition']}  {info['width']}×{info['height']}")
print(f"data-duration {info['declaredDuration']} s · timeline {info['timelineDuration']} s")
for seq in info.get('sequences', []):
    print(f"\n  {seq['character']}  {seq['start']:.2f} → {seq['end']:.2f} s")
    for step in seq['steps']:
        print(f"    {step['start']:6.2f} – {step['end']:6.2f}  {step['name']}")
if not info.get('sequences'):
    print('\n  (không có chuỗi kichBan nào trong timeline)')
for warning in info.get('warnings', []):
    print(f"\n  ⚠ {warning}")
print('\nkhung đã chụp: ' + ', '.join(f"{t:g}s" for t in info['times']))
