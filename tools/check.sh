#!/bin/sh
# Rebuild dist/, run the cue and scene self-tests, then EVERY character × EVERY action in headless Chrome.
#   tools/check.sh                → everything (required before merge / release); exit 0 on PASS, 1 on FAIL
#   tools/check.sh --changed [B]  → only the scene cases a change vs B (default main) touches + a smoke set;
#                                   the check page too, but only when the change touches what it tests (runtime/, configs/, tools/check.html …)
#   tools/check.sh --only a,b     → only these scene cases (names, globs, module names such as w44); no check page
#   tools/check.sh --failed       → only the scene cases that failed last time; no check page
#   tools/check.sh -j 4           → scene cases 4 at a time (default: CPU count − 2)
#   tools/check.sh --page | --no-page   → run / skip the check page whatever the mode
#   CHECK_PAGE_SHARDS=n           → split the check page into n headless Chromes (default 3; 1 = one unsharded run)
# Mọi tham số khác được chuyển nguyên cho tools/check_scene.py.
# Đợt 47 B: trang tools/check.html chạy SONG SONG với bài kiểm cảnh (cả hai chỉ cần dist/ đã dựng), chia thành
# CHECK_PAGE_SHARDS phần (?shard=i/n), mỗi phần một Chrome; tools/check_report.py gộp kết quả và đối chiếu rằng
# mỗi phần việc chạy đúng một lần. Kết quả trang in SAU phần cảnh để các dòng của mỗi bước không lẫn vào nhau.
set -e
cd "$(dirname "$0")/.."

# Tách --page / --no-page (của riêng script này) khỏi các tham số chuyển cho check_scene.py.
PAGE=auto; SUBSET=; CHANGED=; BASE=main; prev=
for a do
  shift
  case $a in
    --page) PAGE=yes; continue ;;
    --no-page) PAGE=no; continue ;;
    --only|--only=*|--failed|--list) SUBSET=1 ;;
    --changed) CHANGED=1 ;;
    --changed=*) CHANGED=1; BASE=${a#--changed=} ;;
    -*) ;;
    *) [ "$prev" = --changed ] && BASE=$a ;;
  esac
  prev=$a
  set -- "$@" "$a"
done
if [ "$PAGE" = auto ]; then
  if [ -n "$SUBSET" ]; then PAGE=no
  elif [ -n "$CHANGED" ]; then
    # --changed: trang chỉ chạy khi thay đổi (so với B, gồm cả chưa commit và tệp mới) chạm tới thứ nó kiểm.
    MB="$(git merge-base "$BASE" HEAD)"
    if { git diff --name-only "$MB"; git ls-files --others --exclude-standard; } \
         | grep -qE '^(runtime/|configs/|vendor/|tools/(check\.html|check_report\.py|check\.sh|build\.py|sheet\.html|gallery\.html|chrome_run\.py))'
    then PAGE=yes; else PAGE=no; echo "check page: skipped (the change does not touch runtime/, configs/ or tools/check.html; --page to run it)"; fi
  else PAGE=yes
  fi
fi

python3 tools/build.py >/dev/null
FAIL=0
# Công cụ tạo cue nhép miệng (Python thuần) có bài tự kiểm riêng.
python3 tools/check_cues.py || FAIL=1

SRV=; PIDS=; OUT=
# Dọn dẹp khi thoát mà GIỮ NGUYÊN mã thoát của script: `wait` trả về mã của tiến trình nền vừa
# bị dừng (143); script chạy với `set -e` nên mã ấy thành mã thoát của cả script — PASS mà vẫn
# bị coi là hỏng. Vì thế mỗi lệnh dọn dẹp đều có `|| true`, rồi thoát bằng mã đã giữ lại.
cleanup() {
  status=$?
  for p in $PIDS; do pkill -P "$p" 2>/dev/null || true; done      # chrome_run.py chạy trong một subshell của chính script này
  for p in $PIDS $SRV; do kill "$p" 2>/dev/null || true; done
  for p in $PIDS $SRV; do wait "$p" 2>/dev/null || true; done
  [ -n "$OUT" ] && rm -rf "$OUT"
  exit $status
}
trap cleanup EXIT
trap 'exit 130' INT TERM

if [ "$PAGE" = yes ]; then
  SHARDS="${CHECK_PAGE_SHARDS:-3}"
  CHROME_BIN="$(sh tools/chrome.sh)"
  OUT="$(mktemp -d "${TMPDIR:-/tmp}/check-page.XXXXXX")"
  # Cổng: một cổng TRỐNG do hệ điều hành cấp (hai lượt chạy song song không đụng nhau). PORT=… để chỉ định.
  PORT="${PORT:-$(python3 -c "import socket; s = socket.socket(); s.bind(('127.0.0.1', 0)); print(s.getsockname()[1])")}"
  python3 tools/serve.py "$PORT" >/dev/null 2>&1 &
  SRV=$!
  i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/tools/check.html" || [ $i -ge 30 ]; do i=$((i+1)); sleep 0.2; done
  PAGE_START=$(date +%s)
  # Một máy chủ, n trang: mỗi phần một Chrome headless riêng (chrome_run.py tự lấy thư mục hồ sơ và cổng DevTools riêng).
  n=1; while [ $n -le "$SHARDS" ]; do
    QUERY=; [ "$SHARDS" -gt 1 ] && QUERY="?shard=$n/$SHARDS"
    # Ghi lại lúc mỗi phần xong: bài kiểm cảnh thường xong sau, nên thời gian chờ ở cuối không cho biết trang mất bao lâu.
    ( CHROME_BIN="$CHROME_BIN" python3 tools/chrome_run.py "http://127.0.0.1:$PORT/tools/check.html$QUERY" --wait PASS,FAIL --size 900x900 --timeout 600 \
        --dump "$OUT/shard$n.html" >"$OUT/shard$n.log" 2>&1; date +%s >"$OUT/shard$n.end" ) &
    PIDS="$PIDS $!"; n=$((n+1))
  done
fi

# Công cụ dựng cảnh từ kịch bản: dựng kịch bản mẫu, và kịch bản sai phải bị từ chối (các trường hợp trong tools/ci/).
CHECK_SCENE_NO_BUILD=1 python3 tools/check_scene.py "$@" || FAIL=1

if [ "$PAGE" = yes ]; then
  for p in $PIDS; do wait "$p" || true; done; PIDS=
  TOOK=; for f in "$OUT"/shard*.end; do [ -s "$f" ] && TOOK="$TOOK $(( $(cat "$f") - PAGE_START ))"; done
  echo "check page: tools/check.html in $SHARDS shard(s), done after${TOOK:- ?} s (wall, per shard)"
  for f in "$OUT"/shard*.log; do [ -s "$f" ] && sed 's/^/  chrome: /' "$f"; done
  FILES=; n=1; while [ $n -le "$SHARDS" ]; do FILES="$FILES $OUT/shard$n.html"; touch "$OUT/shard$n.html"; n=$((n+1)); done
  # shellcheck disable=SC2086
  python3 tools/check_report.py $FILES || FAIL=1
fi
exit $FAIL
