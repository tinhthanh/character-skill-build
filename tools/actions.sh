#!/bin/sh
# REVIEW every action of one character BEFORE using it in a scene — each action runs through
# sequence(), exactly as tools/scene.py runs it, and is captured at several moments.
#   tools/actions.sh <id> [file.png] [--turned] [--only "label,label"] [--cols 6]
#   tools/actions.sh vet                       → actions-vet.png (facing front)
#   tools/actions.sh granny --turned           → actions-granny-turned.png (three-quarter stance)
#   tools/actions.sh vet --only "clap,wai"     → just those rows
#   tools/actions.sh dog                       → a pet's actions
# Rows come from tools/action-catalog.json (demo steps, held items, a pet within reach). A row whose
# action throws shows the error in red and the run exits 1.
set -e
cd "$(dirname "$0")/.."
ID="${1:?usage: tools/actions.sh <id> [file.png] [--turned] [--only labels] [--cols n]}"; shift
OUT=""; STANCE="front"; ONLY=""; COLS=6
while [ $# -gt 0 ]; do
  case "$1" in
    --turned) STANCE="turned" ;;
    --only) shift; ONLY="$1" ;;
    --cols) shift; COLS="$1" ;;
    *) OUT="$1" ;;
  esac
  shift
done
[ -n "$OUT" ] || { if [ "$STANCE" = turned ]; then OUT="actions-$ID-turned.png"; else OUT="actions-$ID.png"; fi; }
case "$OUT" in /*) ;; *) OUT="$(pwd)/$OUT" ;; esac
CHROME_BIN="$(sh tools/chrome.sh)"
# Cổng: một cổng TRỐNG do hệ điều hành cấp (hai lượt chạy song song không đụng nhau). PORT=… để chỉ định.
PORT="${PORT:-$(python3 -c "import socket; s = socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!
# Dọn dẹp mà GIỮ NGUYÊN mã thoát (xem tools/shot.sh).
cleanup() { status=$?; kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; exit $status; }
trap cleanup EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/actions.html" || [ $i -ge 30 ]; do i=$((i+1)); python3 -c "import time; time.sleep(0.2)"; done
ENC_ONLY="$(python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))" "$ONLY")"
URL="http://127.0.0.1:$PORT/tools/actions.html?nv=$ID&stance=$STANCE&cols=$COLS&only=$ENC_ONLY"
rm -f "$OUT"
set +e
CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "$URL" --wait DONE,ERROR --timeout 120 --fail-on-error \
  --size-js "(document.body.scrollWidth) + ',' + (document.body.scrollHeight)" --screenshot "$OUT" --dump "$OUT.html" >/dev/null
RESULT=$?
set -e
if [ $RESULT -ne 0 ] || [ ! -f "$OUT" ]; then echo "actions: the review sheet of \"$ID\" did not render — run: sh tools/check.sh" >&2; exit 1; fi
if grep -q "<title>ERROR</title>" "$OUT.html" 2>/dev/null; then
  python3 -c "import re, sys, html; m = re.search(r'<pre id=\"failures\"[^>]*>(.*?)</pre>', open(sys.argv[1]).read(), re.S); print(html.unescape(m.group(1)) if m else '')" "$OUT.html" >&2
  rm -f "$OUT.html"; echo "$OUT"; echo "actions: some actions FAILED — see the red cells" >&2; exit 1; fi
rm -f "$OUT.html"
echo "$OUT"
