#!/bin/sh
# Save a picture of EVERY registered character side by side (rest pose) — docs/characters.png.
#   tools/gallery.sh [file.png]
set -e
cd "$(dirname "$0")/.."
OUT="${1:-docs/characters.png}"
CHROME_BIN="$(sh tools/chrome.sh)"
PORT="${PORT:-8394}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!
# Dọn dẹp khi thoát mà GIỮ NGUYÊN mã thoát của script: `wait` trả về mã của tiến trình nền vừa
# bị dừng (143); script chạy với `set -e` nên mã ấy thành mã thoát của cả script — PASS mà vẫn
# bị coi là hỏng. Vì thế mỗi lệnh dọn dẹp đều có `|| true`, rồi thoát bằng mã đã giữ lại.
cleanup() { status=$?; kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; exit $status; }
trap cleanup EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/gallery.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
"$CHROME_BIN" --headless=new --disable-gpu --window-size=1400,750 --virtual-time-budget=8000 --screenshot="$OUT" "http://127.0.0.1:$PORT/tools/gallery.html" >/dev/null 2>&1
echo "$OUT"
