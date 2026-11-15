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
PORT="${PORT:-8392}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null; wait $SRV 2>/dev/null' EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/sheet.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
"$CHROME_BIN" --headless=new --disable-gpu --window-size=1280,1200 --virtual-time-budget=8000 --screenshot="$OUT" "http://127.0.0.1:$PORT/tools/sheet.html?nv=$ID&config=$CONFIG" >/dev/null 2>&1
if [ "$CONFIG" = 1 ] && [ -f "configs/$ID.json" ]; then echo "$OUT (with configs/$ID.json)"; else echo "$OUT"; fi
