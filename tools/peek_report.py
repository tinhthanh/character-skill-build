#!/usr/bin/env python3
"""Đọc DOM của tools/peek.html từ stdin, in bảng thời lượng; với --size thì chỉ in "rộng,cao" của ảnh ghép."""
import html, json, re, sys

matches = re.findall(r'<pre id="info">(.*?)</pre>', sys.stdin.read(), re.S)
if not matches or not matches[-1].strip():
    print('peek: the preview page did not finish — the composition did not load, or took longer than the 120 s limit', file=sys.stderr); sys.exit(1)
info = json.loads(html.unescape(matches[-1]))
if not info.get('ok'):
    print('peek: ' + info.get('error', 'unknown error'), file=sys.stderr); sys.exit(1)
if '--size' in sys.argv:
    print(f"{info['sheet']['width']},{info['sheet']['height']}"); sys.exit(0)

print(f"composition  {info['composition']}  {info['width']}×{info['height']}")
print(f"data-duration {info['declaredDuration']} s · timeline {info['timelineDuration']} s")
for seq in info.get('sequences', []):
    print(f"\n  {seq['character']}  {seq['start']:.2f} → {seq['end']:.2f} s")
    for step in seq['steps']:
        # Bước nhép miệng theo tệp tiếng: in luôn số để dán vào thẻ <audio> (tiếng dài = bước − 0,55 s).
        audio = f'   ← <audio data-start="{step["start"]:.2f}" data-duration="{max(0, step["end"] - step["start"] - 0.55):.2f}">' if step['name'] == 'speakCues' else ''
        print(f"    {step['start']:6.2f} – {step['end']:6.2f}  {step['name']}{audio}")
if not info.get('sequences'):
    print('\n  (no character sequences in the timeline)')
for warning in info.get('warnings', []):
    print(f"\n  ⚠ {warning}")
print('\nframes captured: ' + ', '.join(f"{t:g}s" for t in info['times']))
