#!/bin/sh
# Chụp bảng tư thế của một nhân vật ra PNG, để SOÁT BẰNG MẮT.
#   tools/shot.sh <id> [tệp.png]        ví dụ: tools/shot.sh le_tan /tmp/le_tan.png
set -e
cd "$(dirname "$0")/.."
NV="${1:?thiếu id nhân vật}"; RA="${2:-$NV.png}"
CHROME_BIN="$(sh tools/chrome.sh)"
CONG="${CONG:-8392}"
python3 tools/serve.py "$CONG" >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$CONG/tools/sheet.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
"$CHROME_BIN" --headless=new --disable-gpu --window-size=1280,900 --virtual-time-budget=8000 --screenshot="$RA" "http://127.0.0.1:$CONG/tools/sheet.html?nv=$NV" >/dev/null 2>&1
echo "$RA"
