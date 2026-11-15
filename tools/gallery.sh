#!/bin/sh
# Save a picture of EVERY registered character side by side (rest pose) — docs/characters.png.
#   tools/gallery.sh [file.png]
set -e
cd "$(dirname "$0")/.."
OUT="${1:-docs/characters.png}"
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
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/gallery.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "http://127.0.0.1:$PORT/tools/gallery.html" --wait DONE --timeout 45 --fail-on-error --size 1400x1000 --screenshot "$OUT" \
  || { echo "gallery: the gallery did not render — run: sh tools/check.sh" >&2; exit 1; }
echo "$OUT"
