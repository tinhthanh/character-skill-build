#!/bin/sh
# PREVIEW a HyperFrames composition without rendering it.
#   tools/peek.sh <index.html> [t1,t2,...] [image.png]
#   tools/peek.sh examples/hyperframes/index.html                 → 8 evenly spaced frames
#   tools/peek.sh ~/video/index.html 0,1.5,3,6 peek.png           → exactly those seconds
#   PEEK_WIDTH=960 PEEK_COLS=2 tools/peek.sh index.html 4,9       → bigger frames (default 480 px wide, 4 per row)
# Prints the timing of every step of every character sequence, warns about overruns and
# overlapping speech, then saves one contact sheet. The composition can live anywhere.
set -e
FILE="${1:?usage: tools/peek.sh <index.html> [t1,t2,...] [image.png]}"; TIMES="${2:-}"; OUT="${3:-peek.png}"
[ -f "$FILE" ] || { echo "peek: no such file: $FILE" >&2; exit 1; }
DIR="$(cd "$(dirname "$FILE")" && pwd)"; NAME="$(basename "$FILE")"
case "$OUT" in /*) ;; *) OUT="$(pwd)/$OUT" ;; esac
cd "$(dirname "$0")/.."
CHROME_BIN="$(sh tools/chrome.sh)"
PORT="${PORT:-8393}"
# Tệp tạm nằm trong thư mục tạm riêng (theo TMPDIR nếu có), dọn khi thoát.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/peek.XXXXXX")"
python3 tools/serve.py "$PORT" "--mount=$DIR" >/dev/null 2>&1 &
SRV=$!
# Dọn dẹp khi thoát mà GIỮ NGUYÊN mã thoát của script: `wait` trả về mã của tiến trình nền vừa
# bị dừng (143); script chạy với `set -e` nên mã ấy thành mã thoát của cả script — PASS mà vẫn
# bị coi là hỏng. Vì thế mỗi lệnh dọn dẹp đều có `|| true`, rồi thoát bằng mã đã giữ lại.
cleanup() { status=$?; kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; rm -rf "$WORK"; exit $status; }
trap cleanup EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/peek.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
URL="http://127.0.0.1:$PORT/tools/peek.html?src=/__project/$NAME&t=$TIMES&w=${PEEK_WIDTH:-480}&cols=${PEEK_COLS:-4}"
"$CHROME_BIN" --headless=new --disable-gpu --window-size=1200,800 --virtual-time-budget=20000 --enable-logging=stderr --v=0 --dump-dom "$URL" 2>"$WORK/log" > "$WORK/dom"
python3 tools/peek_report.py < "$WORK/dom" || {
  # Composition không dựng được timeline thường là do script của nó ném lỗi — in lỗi ấy ra,
  # nếu không người dùng chỉ thấy "không có timeline" mà không biết vì sao.
  grep -E "Uncaught|CONSOLE.*[Ee]rror" "$WORK/log" | sed -E 's/^.*CONSOLE[^"]*"/  page error: "/' | head -3 >&2
  exit 1; }
SIZE="$(python3 tools/peek_report.py --size < "$WORK/dom")"
"$CHROME_BIN" --headless=new --disable-gpu --hide-scrollbars "--window-size=$SIZE" --virtual-time-budget=20000 "--screenshot=$OUT" "$URL" >/dev/null 2>&1
echo "image: $OUT"
