"""Những thứ dùng chung cho các trường hợp kiểm tra trong tools/ci/: đường dẫn, dựng cảnh, chạy trang trong Chrome,
các cảnh mẫu dùng ở nhiều đợt. Mỗi trường hợp nhận thư mục tạm RIÊNG (`work`) và danh sách lỗi RIÊNG (`problems`)."""
import json, os, re, subprocess, sys, tempfile  # noqa: F401 — các đợt dùng qua `from .common import *`

from . import case  # noqa: F401

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))     # tools/
ROOT = os.path.dirname(HERE)
STAGE = os.path.join(ROOT, 'examples', 'scene-3d', 'scene.json')        # bối cảnh 3D mẫu — nhiều đợt ghi tệp cảnh tạm cạnh nó
EXAMPLE = os.path.join(ROOT, 'examples', 'scene', 'scene.json')


def scratch(name):
    """Phần tên riêng cho tệp cảnh tạm `_check_*.json` ghi cạnh ví dụ (trong examples/): tên trường hợp + mã tiến trình,
    để các trường hợp chạy song song (và hai lượt chạy cùng lúc) không ghi đè tệp của nhau."""
    return f'{name}-{os.getpid()}'


def build(scene_path, out):
    return subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), scene_path, '-o', out], capture_output=True, text=True)


def page_eval(folder, script):
    """Mở cảnh đã dựng trong Chrome (tools/chrome_run.py) và trả về giá trị JSON của `script` — None nếu không chạy được."""
    import socket, time
    chrome = subprocess.run(['sh', os.path.join(HERE, 'chrome.sh')], capture_output=True, text=True).stdout.strip()
    if not chrome: return None
    with socket.socket() as probe_socket:
        probe_socket.bind(('127.0.0.1', 0)); port = probe_socket.getsockname()[1]
    server = subprocess.Popen([sys.executable, os.path.join(HERE, 'serve.py'), str(port), f'--mount={folder}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        url = f'http://127.0.0.1:{port}/__project/index.html'
        for _ in range(50):
            if subprocess.run(['curl', '-s', '-o', os.devnull, url]).returncode == 0: break
            time.sleep(0.1)
        html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
        size = re.search(r'data-width="(\d+)" data-height="(\d+)"', html)
        done = subprocess.run([sys.executable, os.path.join(HERE, 'chrome_run.py'), url, '--chrome', chrome, '--wait-js', 'window.__sceneTimings', '--timeout', '90',
                               '--size', f'{size.group(1)}x{size.group(2)}' if size else '1920x1080', '--eval', script], capture_output=True, text=True)
        try: return json.loads(done.stdout)
        except ValueError: return None
    finally:
        server.terminate()


def call_scene():
    """Cảnh gọi điện chia đôi màn hình (đợt 7) — đợt 10 (thẻ mở đầu / kết thúc) và đợt 20 (hook) dựng lại từ nó."""
    return {'id': 'call', 'layout': 'split', 'sides': {'left': {'preset': 'home'}, 'right': {'wall': '#2a4d5c'}},
            'characters': [{'name': 'granny', 'id': 'granny', 'side': 'left', 'holds': 'phone'}, {'name': 'rec', 'id': 'receptionist', 'side': 'right', 'holds': 'phone'}],
            'script': [{'who': 'granny', 'do': [['notify', 'Nhắc lịch: Thứ Bảy']], 'toast': {'title': 'VetGo', 'text': 'Lịch tái khám'}},
                       {'who': 'granny', 'say': 'Alo', 'dur': 1.2, 'phone': True}, {'who': 'rec', 'say': 'Dạ', 'dur': 1.0, 'phone': True, 'toast': 'Đã đổi lịch'}]}


def pair_scene():
    """Hai người ở hai chiều sâu cùng với tới con mèo (đợt 33) — đợt 34 dựng lại nó với máy đứng yên."""
    return {'id': 'pair', 'camera': 'auto', 'set': {'preset': 'living-room'}, 'characters': [
        {'name': 'ba', 'id': 'granny', 'z': -820, 'x': -300, 'on': 'sofa', 'seated': True}, {'name': 'be', 'id': 'boy', 'z': -780, 'x': 520},
        {'name': 'meo', 'species': 'cat', 'z': -790, 'x': 200}],
        'script': [{'who': 'ba', 'do': [['stroke', '@meo']]}, {'who': 'be', 'do': [['giveTreat', '@meo']]}]}

