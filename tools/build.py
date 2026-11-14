#!/usr/bin/env python3
"""Gộp thư viện thành MỘT tệp thẻ-script-thường: dist/character.iife.js → window.VGCharacter.

    python3 tools/build.py

Không cần Node hay bundler. Mỗi module ES được bọc trong một hàm riêng (để các hằng
trùng tên giữa hai bộ rig không đụng nhau); `import`/`export` được viết lại thành tra
bảng. Chỉ hiểu đúng các dạng import/export mà mã trong repo này dùng — gặp dạng khác
thì DỪNG và báo, không đoán.
"""
import os, re, sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEN = 'VGCharacter'
VAO = 'runtime/index.js'

def chuan(duong, tu):
    return os.path.normpath(os.path.join(os.path.dirname(tu), duong)).replace(os.sep, '/')

thu_tu, da_thay, ma = [], set(), {}

def nap(mod):
    if mod in da_thay: return
    da_thay.add(mod)
    with open(os.path.join(GOC, mod), encoding='utf-8') as f: nguon = f.read()
    xuat, dong_ra = [], []
    for dong in nguon.split('\n'):
        m = re.match(r"^import\s+(.+?)\s+from\s+'(.+?)';\s*$", dong)
        if m:
            cai, tu = m.group(1), chuan(m.group(2), mod)
            nap(tu)
            if cai.startswith('{'): dong_ra.append(f"const {cai} = __m['{tu}'];")
            elif re.match(r'^[A-Za-z_$][\w$]*$', cai): dong_ra.append(f"const {cai} = __m['{tu}'].default;")
            else: sys.exit(f'[build] {mod}: không hiểu dạng import: {dong}')
            continue
        if dong.startswith('import '): sys.exit(f'[build] {mod}: không hiểu dạng import: {dong}')
        m = re.match(r'^export\s+(?:async\s+)?(?:function\*?|class|const|let)\s+([A-Za-z_$][\w$]*)', dong)
        if m:
            xuat.append(m.group(1)); dong_ra.append(re.sub(r'^export\s+', '', dong)); continue
        m = re.match(r'^export\s+default\s+(.*)$', dong)
        if m:
            xuat.append('default: __macDinh'); dong_ra.append('const __macDinh = ' + m.group(1)); continue
        m = re.match(r'^export\s+\{(.+?)\};\s*$', dong)
        if m:
            xuat += [x.strip() for x in m.group(1).split(',') if x.strip()]; continue
        if dong.startswith('export '): sys.exit(f'[build] {mod}: không hiểu dạng export: {dong}')
        dong_ra.append(dong)
    ma[mod] = '\n'.join(dong_ra) + '\nreturn { ' + ', '.join(xuat) + ' };'
    thu_tu.append(mod)

nap(VAO)
ra = [f'/* {TEN} — bản dựng một tệp của character-skill-build. SINH TỰ ĐỘNG bằng tools/build.py — đừng sửa tay. */',
      f'var {TEN} = (function () {{', "'use strict';", 'const __m = {};']
for mod in thu_tu:
    ra.append(f"\n/* ───── {mod} ───── */\n__m['{mod}'] = (function () {{\n{ma[mod]}\n}})();")
ra.append(f"\nreturn __m['{VAO}'];\n}})();")
dich = os.path.join(GOC, 'dist', 'character.iife.js')
os.makedirs(os.path.dirname(dich), exist_ok=True)
with open(dich, 'w', encoding='utf-8') as f: f.write('\n'.join(ra) + '\n')
print(f'[build] {len(thu_tu)} module → dist/character.iife.js ({os.path.getsize(dich) // 1024} KB)')
for mod in thu_tu: print('   ', mod)
