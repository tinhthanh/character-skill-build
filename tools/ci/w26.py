"""Đợt 26 — các trường hợp kiểm tra của đợt này (chuyển nguyên văn từ check_scene.py cũ)."""
from .common import *  # noqa: F401,F403


@case('lighting_samples26')
def lighting_samples26(work, problems):
    script_tool = os.path.join(HERE, 'script.py')
    # Đợt 26: mẫu phim ánh sáng trong examples/lighting/ — kịch bản chữ phải đọc được (không dựng: CI đã đủ dài).
    import glob, shutil
    for sample in sorted(glob.glob(os.path.join(os.path.dirname(HERE), 'examples', 'lighting', '*.txt'))):
        copy = os.path.join(work, os.path.basename(sample)); shutil.copy(sample, copy)
        done = subprocess.run([sys.executable, script_tool, copy, '--no-build'], capture_output=True, text=True)
        if done.returncode != 0: problems.append(f'examples/lighting/{os.path.basename(sample)} does not parse: {done.stderr.strip()[:200]}')
