#!/bin/sh
# Rebuild dist/, then run EVERY character × EVERY action in headless Chrome.
#   tools/check.sh          → prints a summary; exit 0 on PASS, 1 on FAIL
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py >/dev/null
CHROME_BIN="$(sh tools/chrome.sh)"
PORT="${PORT:-8391}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null' EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/check.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
"$CHROME_BIN" --headless=new --disable-gpu --window-size=900,900 --virtual-time-budget=30000 --dump-dom "http://127.0.0.1:$PORT/tools/check.html" 2>/dev/null \
  | python3 tools/check_report.py
