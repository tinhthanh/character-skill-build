#!/bin/sh
# XEM TRƯỚC một composition HyperFrames mà không cần render.
#   tools/peek.sh <index.html> [t1,t2,...] [ảnh.png]
#   tools/peek.sh examples/hyperframes/index.html                 → 8 khung rải đều
#   tools/peek.sh ~/video/index.html 0,1.5,3,6 /tmp/peek.png      → đúng các giây ấy
# In ra thời lượng từng bước của mỗi chuỗi nhân vật và cảnh báo vượt data-duration,
# rồi lưu một ảnh ghép các khung. Composition nằm ở đâu cũng được.
set -e
FILE="${1:?thiếu đường dẫn composition (.html)}"; TIMES="${2:-}"; OUT="${3:-peek.png}"
[ -f "$FILE" ] || { echo "peek: không có tệp $FILE" >&2; exit 1; }
DIR="$(cd "$(dirname "$FILE")" && pwd)"; NAME="$(basename "$FILE")"
case "$OUT" in /*) ;; *) OUT="$(pwd)/$OUT" ;; esac
cd "$(dirname "$0")/.."
CHROME_BIN="$(sh tools/chrome.sh)"
PORT="${CONG:-8393}"
python3 tools/serve.py "$PORT" "--mount=$DIR" >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/peek.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
URL="http://127.0.0.1:$PORT/tools/peek.html?src=/__project/$NAME&t=$TIMES"
"$CHROME_BIN" --headless=new --disable-gpu --window-size=1200,800 --virtual-time-budget=20000 --enable-logging=stderr --v=0 --dump-dom "$URL" 2>/tmp/peek-log.$$ > /tmp/peek-dom.$$
python3 tools/peek_report.py < /tmp/peek-dom.$$ || {
  # Composition không dựng được timeline thường là do script của nó ném lỗi — in lỗi ấy ra,
  # nếu không người dùng chỉ thấy "không có timeline" mà không biết vì sao.
  grep -E "Uncaught|CONSOLE.*[Ee]rror" /tmp/peek-log.$$ | sed -E 's/^.*CONSOLE[^"]*"/  lỗi trong trang: "/' | head -3 >&2
  rm -f /tmp/peek-dom.$$ /tmp/peek-log.$$; exit 1; }
rm -f /tmp/peek-log.$$
SIZE="$(python3 tools/peek_report.py --size < /tmp/peek-dom.$$)"; rm -f /tmp/peek-dom.$$
"$CHROME_BIN" --headless=new --disable-gpu --hide-scrollbars "--window-size=$SIZE" --virtual-time-budget=20000 "--screenshot=$OUT" "$URL" >/dev/null 2>&1
echo "ảnh: $OUT"
