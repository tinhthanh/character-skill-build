"""Background presets (SVG), image sizes and copying scene assets next to index.html."""
import os, re, shutil, urllib.parse

# ── PHÔNG NỀN dựng sẵn: mỗi phông là một ảnh SVG 1920 × 1080 đặt làm nền của MỘT phần tử (#wall) — HyperFrames
# không nhận clip lồng phần tử con — cùng màu sàn đi kèm. Vẽ phẳng, ít chi tiết, để nhân vật vẫn là thứ nổi nhất.
def _svg(body):
    return "data:image/svg+xml," + urllib.parse.quote(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">{body}</svg>', safe="/:=' ")


PRESETS = {
    # Phòng khám: tường xanh ngọc nhạt, cửa sổ, tủ thuốc có chữ thập, bảng đo thị lực.
    'clinic': {'floor': '#b9cfd2', 'wallDark': '#9fbfc4', 'svg': '''
        <rect width="1920" height="1080" fill="#d6ebec"/><rect y="760" width="1920" height="320" fill="#c4dfe1"/>
        <rect x="1180" y="150" width="420" height="330" rx="10" fill="#f4fbfc"/><rect x="1196" y="166" width="388" height="298" fill="#bfe3f2"/>
        <path d="M 1390 166 V 464 M 1196 315 H 1584" stroke="#f4fbfc" stroke-width="14"/><path d="M 1196 380 Q 1300 330 1400 372 T 1584 350 V 464 H 1196 Z" fill="#9ed0a8" opacity=".7"/>
        <rect x="250" y="180" width="300" height="360" rx="12" fill="#f6fbfb" stroke="#a9c9cc" stroke-width="6"/><path d="M 400 180 V 540" stroke="#a9c9cc" stroke-width="5"/>
        <path d="M 318 300 h 34 v -34 h 28 v 34 h 34 v 28 h -34 v 34 h -28 v -34 h -34 z" fill="#e2574c"/>
        <rect x="760" y="210" width="210" height="270" rx="8" fill="#ffffff" stroke="#b7cfd2" stroke-width="5"/>
        <path d="M 800 262 h 130 M 815 312 h 100 M 828 356 h 74 M 840 394 h 50 M 850 428 h 30" stroke="#7d989c" stroke-width="12" stroke-linecap="round"/>
        <rect y="742" width="1920" height="20" fill="#a9c9cc"/>'''},
    # Sảnh lễ tân: tường ấm, dải gỗ, biển chữ thập xanh, chậu cây, hai khung ảnh.
    'lobby': {'floor': '#c9b79f', 'wallDark': '#d9c7ae', 'svg': '''
        <rect width="1920" height="1080" fill="#f1e6d3"/><rect y="560" width="1920" height="210" fill="#e3d2b6"/><rect y="548" width="1920" height="14" fill="#c9b08a"/>
        <rect x="150" y="150" width="240" height="180" rx="8" fill="#ffffff" stroke="#b9a078" stroke-width="8"/><circle cx="270" cy="232" r="46" fill="#f2b56b"/><path d="M 170 312 L 240 250 L 300 300 L 340 270 L 372 312 Z" fill="#8fbf8a"/>
        <rect x="460" y="170" width="170" height="150" rx="8" fill="#ffffff" stroke="#b9a078" stroke-width="8"/><path d="M 508 262 q -16 -34 14 -40 q 8 -30 34 -8 q 30 -2 20 28 q 14 30 -22 30 z" fill="#e58b8b"/>
        <circle cx="1560" cy="250" r="96" fill="#3f9a8c"/><path d="M 1532 222 h 0 M 1538 180 h 44 v 48 h 48 v 44 h -48 v 48 h -44 v -48 h -48 v -44 h 48 z" fill="#ffffff"/>
        <path d="M 1120 760 h 110 l -14 -120 h -82 z" fill="#b97a4e"/><path d="M 1175 640 q -70 -90 -30 -210 q 30 80 30 210 M 1175 640 q 80 -70 70 -190 q -60 70 -70 190 M 1175 640 q -110 -40 -130 -130 q 90 20 130 130" fill="#5fa46a"/>
        <rect y="752" width="1920" height="18" fill="#b9a078"/>'''},
    # Phòng ở nhà: tường vàng kem, cửa sổ rèm, kệ sách, đèn cây.
    'home': {'floor': '#b98f6a', 'wallDark': '#e2cfa6', 'svg': '''
        <rect width="1920" height="1080" fill="#f3e7c6"/>
        <rect x="220" y="140" width="460" height="360" rx="10" fill="#fffaf0"/><rect x="238" y="158" width="424" height="324" fill="#bfe0f0"/><path d="M 450 158 V 482" stroke="#fffaf0" stroke-width="14"/>
        <path d="M 200 130 h 150 q -20 190 -90 380 h -60 z M 700 130 h -150 q 20 190 90 380 h 60 z" fill="#e59f8a"/><rect x="180" y="116" width="540" height="22" rx="8" fill="#9a6a4a"/>
        <rect x="1250" y="200" width="430" height="380" fill="#c99a6c"/><path d="M 1250 326 H 1680 M 1250 452 H 1680" stroke="#9a6a4a" stroke-width="12"/>
        <path d="M 1280 220 h 34 v 96 h -34 z M 1322 240 h 30 v 76 h -30 z M 1362 226 h 40 v 90 h -40 z M 1430 250 h 28 v 66 h -28 z M 1290 350 h 44 v 92 h -44 z M 1350 366 h 30 v 76 h -30 z M 1540 346 h 36 v 96 h -36 z M 1300 476 h 60 v 94 h -60 z M 1480 490 h 34 v 80 h -34 z" fill="#7fa7c9"/>
        <path d="M 1326 240 h 22 M 1434 250 h 20 M 1354 366 h 22" stroke="#e8c15a" stroke-width="8"/>
        <path d="M 960 770 V 420" stroke="#6e5a48" stroke-width="12"/><path d="M 900 420 h 120 l -24 -110 h -72 z" fill="#f2c86b"/><ellipse cx="960" cy="772" rx="60" ry="12" fill="#6e5a48"/>
        <rect y="752" width="1920" height="18" fill="#d9c08e"/>'''},
}


def svg_size(head):
    """(width, height) of an SVG from its root <svg> tag: the width / height attributes when they are plain numbers
    (or px), else the viewBox; None when neither says. `head` is the start of the file as bytes."""
    text = head.decode('utf-8', 'ignore')
    tag = re.search(r'<svg\b[^>]*>', re.sub(r'<!--.*?-->', '', text, flags=re.S))
    if not tag: return None
    attr = lambda name: (re.search(rf'\s{name}\s*=\s*["\']([^"\']*)["\']', tag.group(0)) or [None, None])[1]
    number = lambda value: float(value[:-2] if value.endswith('px') else value) if value and re.fullmatch(r'\s*[\d.]+(px)?\s*', value) else None
    width, height = number(attr('width')), number(attr('height'))
    box = [float(v) for v in re.split(r'[\s,]+', (attr('viewBox') or '').strip()) if v] if attr('viewBox') else []
    if len(box) == 4 and box[2] > 0 and box[3] > 0:
        if width and not height: height = width * box[3] / box[2]
        if height and not width: width = height * box[2] / box[3]
        if not width and not height: width, height = box[2], box[3]
    return (round(width), round(height)) if width and height else None


def image_size(path):
    """(width, height) in px read from the file's header — PNG, JPEG, GIF, WebP, or SVG (its width / height or viewBox);
    None for anything else."""
    with open(path, 'rb') as fh: head = fh.read(64 * 1024)
    if b'<svg' in head[:4096] or path.lower().endswith('.svg'): return svg_size(head)
    if head[:8] == b'\x89PNG\r\n\x1a\n': return int.from_bytes(head[16:20], 'big'), int.from_bytes(head[20:24], 'big')
    if head[:6] in (b'GIF87a', b'GIF89a'): return int.from_bytes(head[6:8], 'little'), int.from_bytes(head[8:10], 'little')
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        kind = head[12:16]
        if kind == b'VP8X': return 1 + int.from_bytes(head[24:27], 'little'), 1 + int.from_bytes(head[27:30], 'little')
        if kind == b'VP8 ': return int.from_bytes(head[26:28], 'little') & 0x3FFF, int.from_bytes(head[28:30], 'little') & 0x3FFF
        if kind == b'VP8L':
            bits = int.from_bytes(head[21:25], 'little'); return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if head[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(head):
            if head[i] != 0xFF: i += 1; continue
            marker, length = head[i + 1], int.from_bytes(head[i + 2:i + 4], 'big')
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                return int.from_bytes(head[i + 7:i + 9], 'big'), int.from_bytes(head[i + 5:i + 7], 'big')
            i += 2 + length
    return None


def copy_asset(base, out, rel, copied):
    """Copy a picture the scene names into the output folder and return the name to use for it.
    Two different files with the same name (props/a/sprite.png, props/b/sprite.png) get distinct names
    (sprite.png, sprite-2.png) instead of overwriting each other; the same file named twice is copied once."""
    source = os.path.abspath(os.path.join(base, rel))
    if source in copied: return copied[source]
    stem, ext = os.path.splitext(os.path.basename(rel)); name, n = stem + ext, 1
    while name in copied.values(): n += 1; name = f'{stem}-{n}{ext}'
    copied[source] = name
    if source != os.path.abspath(os.path.join(out, name)): shutil.copy(source, os.path.join(out, name))
    return name
