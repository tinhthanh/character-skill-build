#!/bin/sh
# Dựng lại dist rồi kiểm MỌI nhân vật × MỌI động tác trong Chrome headless.
#   tools/check.sh          → in tóm tắt, thoát 0 nếu PASS, 1 nếu FAIL
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py >/dev/null
CHROME_BIN="$(sh tools/chrome.sh)"
CONG="${CONG:-8391}"
python3 tools/serve.py "$CONG" >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$CONG/tools/check.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
"$CHROME_BIN" --headless=new --disable-gpu --window-size=900,900 --virtual-time-budget=30000 --dump-dom "http://127.0.0.1:$CONG/tools/check.html" 2>/dev/null \
  | python3 tools/doc-kq.py
