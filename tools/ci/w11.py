"""Đợt 11 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('cut_notes11')
def cut_notes11(work, problems):
    # Đợt 11: nhắc góc máy cắt dở nhân vật — chỉ đoạn đủ dài (≥ 2 s), chỉ khi còn 5…85 % hình trong khung.
    import importlib.util
    spec = importlib.util.spec_from_file_location('scene_tool', os.path.join(HERE, 'scene.py')); scene_tool = importlib.util.module_from_spec(spec); spec.loader.exec_module(scene_tool)
    samples = [{'t': 1 + n * 0.25, 'name': 'boy', 'shown': 0.5, 'edge': 'left'} for n in range(12)]           # 3 s bị cắt đôi
    samples += [{'t': 6 + n * 0.25, 'name': 'cat', 'shown': 0.4, 'edge': 'bottom'} for n in range(4)]         # 1 s: máy lia qua
    samples += [{'t': 9 + n * 0.25, 'name': 'vet', 'shown': 0.95, 'edge': 'top'} for n in range(20)]          # chỉ sượt tóc
    notes = scene_tool.framing_notes(samples)
    if len(notes) != 1 or '"boy"' not in notes[0] or 'left edge' not in notes[0]: problems.append(f'framing notes: expected one note about "boy" at the left edge — got {notes}')
