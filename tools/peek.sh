#!/bin/sh
# PREVIEW a HyperFrames composition without rendering it.
#   tools/peek.sh <index.html> [t1,t2,...] [image.png]
#   tools/peek.sh examples/hyperframes/index.html                 → 8 evenly spaced frames
#   tools/peek.sh ~/video/index.html 0,1.5,3,6 peek.png           → exactly those seconds
#   PEEK_WIDTH=960 PEEK_COLS=2 tools/peek.sh index.html 4,9       → bigger frames (default 480 px wide, 4 per row)
#   tools/peek.sh index.html "" mouth.png --mouth=2              → LIP-SYNC check: a dense strip of mouth close-ups
#                                                                   for the 2nd spoken line, with the cue shape per frame
# Without an image name the picture is saved next to the composition: peek.png, or
# peek-mouth<N>.png with --mouth.
# Prints the timing of every step of every character sequence, warns about overruns and
# overlapping speech, then saves one contact sheet. The composition can live anywhere.
set -e
# --mouth[=N]: tách khỏi các tham số vị trí.
MOUTH=""; count=$#
while [ "$count" -gt 0 ]; do
  arg="$1"; shift; count=$((count - 1))
  case "$arg" in --mouth) MOUTH=1 ;; --mouth=*) MOUTH="${arg#--mouth=}" ;; *) set -- "$@" "$arg" ;; esac
done
FILE="${1:?usage: tools/peek.sh <index.html> [t1,t2,...] [image.png] [--mouth[=N]]}"; TIMES="${2:-}"; OUT="${3:-}"
[ -f "$FILE" ] || { echo "peek: no such file: $FILE" >&2; exit 1; }
DIR="$(cd "$(dirname "$FILE")" && pwd)"; NAME="$(basename "$FILE")"
# Không chỉ định tệp ảnh thì ghi CẠNH composition, mỗi kiểu xem một tên — không ghi đè lẫn nhau:
#   peek.png (toàn cảnh) · peek-mouth<N>.png (dải cận miệng của câu N)
if [ -z "$OUT" ]; then
  if [ -n "$MOUTH" ]; then OUT="$DIR/peek-mouth$MOUTH.png"; else OUT="$DIR/peek.png"; fi
fi
case "$OUT" in /*) ;; *) OUT="$(pwd)/$OUT" ;; esac
cd "$(dirname "$0")/.."
CHROME_BIN="$(sh tools/chrome.sh)"
# Cổng: một cổng TRỐNG do hệ điều hành cấp (hai lượt chạy song song không đụng nhau). PORT=… để chỉ định.
PORT="${PORT:-$(python3 -c "import socket; s = socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")}"
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
URL="http://127.0.0.1:$PORT/tools/peek.html?src=/__project/$NAME&t=$TIMES&w=${PEEK_WIDTH:-480}&cols=${PEEK_COLS:-4}&mouth=$MOUTH"
# MỘT lượt Chrome: đợi trang báo xong (title DONE / ERROR) rồi mới lấy DOM và chụp ảnh. Bản cũ
# chụp theo ngân sách thời gian ảo nên composition nặng cho ra các ô CHƯA tua, không cảnh báo.
rm -f "$OUT"                                   # hỏng thì không để lại ảnh cũ cho người ta xem nhầm
# PEEK_TIMEOUT=giây (mặc định 120, nhân CHROME_RUN_TIMEOUT_SCALE như mọi trang): composition nặng trên máy bận cần lâu hơn.
CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "$URL" --wait DONE,ERROR --timeout "${PEEK_TIMEOUT:-120}" --size 1200x800 --dump "$WORK/dom" --log "$WORK/log" \
  --screenshot "$WORK/sheet.png" --size-js "(() => { try { const i = JSON.parse(document.getElementById('info').textContent); return i.sheet ? i.sheet.width + ',' + i.sheet.height : ''; } catch (e) { return ''; } })()" || true
[ -f "$WORK/dom" ] || : > "$WORK/dom"
python3 tools/peek_report.py < "$WORK/dom" || {
  # Composition không dựng được timeline thường là do script của nó ném lỗi — in lỗi ấy ra,
  # nếu không người dùng chỉ thấy "không có timeline" mà không biết vì sao.
  sed 's/^/  page error: /' "$WORK/log" 2>/dev/null | head -3 >&2
  exit 1; }
[ -f "$WORK/sheet.png" ] || { echo "peek: the contact sheet could not be captured" >&2; exit 1; }
mv "$WORK/sheet.png" "$OUT"
echo "image: $OUT"
