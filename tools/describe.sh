#!/bin/sh
# Print a character's CURRENT definition in the public schema, as JSON.
#   tools/describe.sh <id>          e.g. tools/describe.sh surgeon   ·   tools/describe.sh shiba
# Use it to see what a base already carries (numbers, colours, rest pose, inherited hat /
# glasses / beard / shoulder accessories) before overriding it or writing a config.
set -e
cd "$(dirname "$0")/.."
ID="${1:?usage: tools/describe.sh <id>}"
CHROME_BIN="$(sh tools/chrome.sh)"
PORT="${PORT:-8394}"
python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!
# Dọn dẹp khi thoát mà GIỮ NGUYÊN mã thoát của script: `wait` trả về mã của tiến trình nền vừa
# bị dừng (143); script chạy với `set -e` nên mã ấy thành mã thoát của cả script — PASS mà vẫn
# bị coi là hỏng. Vì thế mỗi lệnh dọn dẹp đều có `|| true`, rồi thoát bằng mã đã giữ lại.
cleanup() { status=$?; kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; exit $status; }
trap cleanup EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/describe.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
"$CHROME_BIN" --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom "http://127.0.0.1:$PORT/tools/describe.html?nv=$ID" 2>/dev/null \
  | python3 -c '
import html, json, re, sys
m = re.findall(r"<pre id=\"out\">(.*?)</pre>", sys.stdin.read(), re.S)
if not m or not m[-1].strip(): print("describe: the page returned nothing", file=sys.stderr); sys.exit(1)
d = json.loads(html.unescape(m[-1]))
if not d.pop("ok", False): print("describe: " + d.get("error", "unknown error"), file=sys.stderr); sys.exit(1)
print(json.dumps(d, indent=2, ensure_ascii=False))'
