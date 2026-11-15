#!/bin/sh
# Rebuild dist/, then run EVERY character × EVERY action in headless Chrome.
#   tools/check.sh          → prints a summary; exit 0 on PASS, 1 on FAIL
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py >/dev/null
# Công cụ tạo cue nhép miệng (Python thuần) có bài tự kiểm riêng.
python3 tools/check_cues.py
CHROME_BIN="$(sh tools/chrome.sh)"
PORT="${PORT:-8391}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!
# Dọn dẹp khi thoát mà GIỮ NGUYÊN mã thoát của script: `wait` trả về mã của tiến trình nền vừa
# bị dừng (143); script chạy với `set -e` nên mã ấy thành mã thoát của cả script — PASS mà vẫn
# bị coi là hỏng. Vì thế mỗi lệnh dọn dẹp đều có `|| true`, rồi thoát bằng mã đã giữ lại.
cleanup() { status=$?; kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; exit $status; }
trap cleanup EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/check.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "http://127.0.0.1:$PORT/tools/check.html" --wait PASS,FAIL --size 900x900 --timeout 180 --dump - \
  | python3 tools/check_report.py
