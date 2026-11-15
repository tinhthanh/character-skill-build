#!/usr/bin/env python3
"""Gộp thư viện thành tệp thẻ-script-thường → window.VGCharacter.

    python3 tools/build.py

Sinh hai tệp, cùng nội dung chạy được:
    dist/character.iife.js   đầy đủ chú thích — để đọc và gỡ lỗi
    dist/character.slim.js   đã bỏ dòng chú thích và dòng trống — để chép vào project video

Không cần Node hay bundler. Mỗi module ES được bọc trong một hàm riêng (để các hằng trùng
tên giữa hai bộ rig không đụng nhau); `import`/`export` được viết lại thành tra bảng. Chỉ
hiểu đúng các dạng import/export mà mã trong repo này dùng — gặp dạng khác thì DỪNG và báo,
không đoán.

Các tệp `configs/<id>.json` được NƯỚNG vào cuối bản dựng: `createCharacter(host, { id })`
trong composition ra đúng nhân vật đã chỉnh trong studio mà không phải dán bộ số vào.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOBAL_NAME = 'VGCharacter'
ENTRY = 'runtime/index.js'

def resolve(path, importer):
    return os.path.normpath(os.path.join(os.path.dirname(importer), path)).replace(os.sep, '/')

order, seen, code = [], set(), {}

def load(module):
    if module in seen: return
    seen.add(module)
    with open(os.path.join(ROOT, module), encoding='utf-8') as f: source = f.read()
    # Câu import trải nhiều dòng → gom về một dòng trước khi xét từng dòng.
    source = re.sub(r"^import\s+\{[^}]*\}\s+from\s+'[^']+';", lambda m: re.sub(r'\s*\n\s*', ' ', m.group(0)), source, flags=re.M)
    exports, lines = [], []
    for line in source.split('\n'):
        m = re.match(r"^import\s+(.+?)\s+from\s+'(.+?)';\s*$", line)
        if m:
            what, target = m.group(1), resolve(m.group(2), module)
            load(target)
            if what.startswith('{'): lines.append(f"const {what} = __m['{target}'];")
            elif re.match(r'^[A-Za-z_$][\w$]*$', what): lines.append(f"const {what} = __m['{target}'].default;")
            else: sys.exit(f'[build] {module}: không hiểu dạng import: {line}')
            continue
        if line.startswith('import '): sys.exit(f'[build] {module}: không hiểu dạng import: {line}')
        m = re.match(r'^export\s+(?:async\s+)?(?:function\*?|class|const|let)\s+([A-Za-z_$][\w$]*)', line)
        if m:
            exports.append(m.group(1)); lines.append(re.sub(r'^export\s+', '', line)); continue
        m = re.match(r'^export\s+default\s+(.*)$', line)
        if m:
            exports.append('default: __default'); lines.append('const __default = ' + m.group(1)); continue
        m = re.match(r'^export\s+\{(.+?)\};\s*$', line)
        if m:
            exports += [x.strip() for x in m.group(1).split(',') if x.strip()]; continue
        if line.startswith('export '): sys.exit(f'[build] {module}: không hiểu dạng export: {line}')
        lines.append(line)
    code[module] = '\n'.join(lines) + '\nreturn { ' + ', '.join(exports) + ' };'
    order.append(module)

load(ENTRY)

with open(os.path.join(ROOT, ENTRY), encoding='utf-8') as f:
    version = re.search(r"export const VERSION = '([^']+)'", f.read())
version = version.group(1) if version else '0.0.0'

# Bộ số đã lưu: tệp nào không đọc được thì DỪNG — nướng thiếu im lặng là nhân vật ra sai mà không ai biết.
baked = {}
for path in sorted(glob.glob(os.path.join(ROOT, 'configs', '*.json'))):
    try:
        with open(path, encoding='utf-8') as f: baked[os.path.splitext(os.path.basename(path))[0]] = json.load(f)
    except Exception as error:
        sys.exit(f'[build] configs/{os.path.basename(path)} không phải JSON hợp lệ: {error}')

out = [f'/* {GLOBAL_NAME} v{version} — bản dựng một tệp của character-skill-build. SINH TỰ ĐỘNG bằng tools/build.py — đừng sửa tay. */',
       f'var {GLOBAL_NAME} = (function () {{', "'use strict';", 'const __m = {};']
for module in order:
    out.append(f"\n/* ───── {module} ───── */\n__m['{module}'] = (function () {{\n{code[module]}\n}})();")
out.append(f"\n__m['{ENTRY}'].__setBakedConfigs({json.dumps(baked, ensure_ascii=False)});")
out.append(f"return __m['{ENTRY}'];\n}})();")
full = '\n'.join(out) + '\n'

def slim(text):
    """Bỏ dòng chỉ-có-chú-thích và dòng trống. Không đụng tới chú thích nằm cuối một dòng mã:
    muốn gỡ chúng an toàn phải phân tích cú pháp (chuỗi SVG có `//` trong URL không gian tên)."""
    kept, in_block = [kept_banner := text.split('\n', 1)[0]], False
    for line in text.split('\n')[1:]:
        stripped = line.strip()
        if in_block:
            if '*/' in stripped: in_block = False
            continue
        if not stripped or stripped.startswith('//'): continue
        # Khối /* … */ hoặc /** … */ bắt đầu ở đầu dòng. Dòng "/* ───── tên module ───── */" cũng rơi vào đây.
        if stripped.startswith('/*'):
            if '*/' not in stripped: in_block = True
            continue
        kept.append(line)
    return '\n'.join(kept) + '\n'

os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
for name, text in (('character.iife.js', full), ('character.slim.js', slim(full))):
    with open(os.path.join(ROOT, 'dist', name), 'w', encoding='utf-8') as f: f.write(text)
size = lambda name: os.path.getsize(os.path.join(ROOT, 'dist', name)) // 1024
print(f"[build] v{version} · {len(order)} module · {len(baked)} config → dist/character.iife.js ({size('character.iife.js')} KB), dist/character.slim.js ({size('character.slim.js')} KB)")
