#!/bin/sh
# Save one character's pose sheet as a PNG, to REVIEW BY EYE.
#   tools/shot.sh <id> [file.png] [--no-config]      e.g. tools/shot.sh receptionist sheet.png
# The sheet applies configs/<id>.json when it exists, so it shows the character the bundle
# will build; --no-config shows the bare definition instead.
set -e
cd "$(dirname "$0")/.."
ID="${1:?usage: tools/shot.sh <id> [file.png] [--no-config]}"; OUT="$ID.png"; CONFIG=1
shift
for arg in "$@"; do case "$arg" in --no-config) CONFIG=0 ;; *) OUT="$arg" ;; esac; done
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
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/sheet.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
rm -f "$OUT"                                   # hỏng thì không để lại ảnh cũ cho người ta xem nhầm
CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "http://127.0.0.1:$PORT/tools/sheet.html?nv=$ID&config=$CONFIG" --wait DONE --timeout 45 --size 1280x1500 --screenshot "$OUT" \
  || { echo "shot: the pose sheet of \"$ID\" did not render — see the page error above, or run: sh tools/check.sh" >&2; exit 1; }
if [ "$CONFIG" = 1 ] && [ -f "configs/$ID.json" ]; then echo "$OUT (with configs/$ID.json)"; else echo "$OUT"; fi
