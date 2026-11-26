#!/bin/sh
# Rebuild dist/, run the cue and scene self-tests, then EVERY character × EVERY action in headless Chrome.
#   tools/check.sh                → everything (required before merge / release); exit 0 on PASS, 1 on FAIL
#   tools/check.sh --changed [B]  → only the scene cases a change vs B (default main) touches + a smoke set
#   tools/check.sh --only a,b     → only these scene cases (names, globs, module names such as w44)
#   tools/check.sh --failed       → only the scene cases that failed last time
#   tools/check.sh -j 4           → scene cases 4 at a time (default: CPU count − 2)
# Mọi tham số được chuyển nguyên cho tools/check_scene.py. Trang tools/check.html luôn chạy trọn, sau bài kiểm cảnh (≈ 4 phút).
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py >/dev/null
# Công cụ tạo cue nhép miệng (Python thuần) có bài tự kiểm riêng.
python3 tools/check_cues.py
# Công cụ dựng cảnh từ kịch bản: dựng kịch bản mẫu, và kịch bản sai phải bị từ chối (các trường hợp trong tools/ci/).
CHECK_SCENE_NO_BUILD=1 python3 tools/check_scene.py "$@"
CHROME_BIN="$(sh tools/chrome.sh)"
# Cổng: một cổng TRỐNG do hệ điều hành cấp (hai lượt chạy song song không đụng nhau). PORT=… để chỉ định.
PORT="${PORT:-$(python3 -c "import socket; s = socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!
# Dọn dẹp khi thoát mà GIỮ NGUYÊN mã thoát của script: `wait` trả về mã của tiến trình nền vừa
# bị dừng (143); script chạy với `set -e` nên mã ấy thành mã thoát của cả script — PASS mà vẫn
# bị coi là hỏng. Vì thế mỗi lệnh dọn dẹp đều có `|| true`, rồi thoát bằng mã đã giữ lại.
cleanup() { status=$?; kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; exit $status; }
trap cleanup EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/check.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "http://127.0.0.1:$PORT/tools/check.html" --wait PASS,FAIL --size 900x900 --timeout 600 --dump - \
  | python3 tools/check_report.py
