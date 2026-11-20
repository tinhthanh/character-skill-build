#!/bin/sh
# Run `hyperframes lint` on every example composition — the contract this library exists for.
#   tools/lint-examples.sh             lint only (fast, static)
#   tools/lint-examples.sh --check     also `hyperframes check`: loads each example in a browser and
#                                      samples it for runtime, layout and motion problems (slower)
# --check needs FFmpeg (ffprobe) on PATH for examples that have audio.
# With --check, errors fail; so do warnings, except the few known false positives listed in
# references/hyperframes.md (a limb rotating about its joint, "the film is silent").
# Needs Node (npx). Each example is copied to a temporary project together with the built
# bundle, because HyperFrames only accepts files inside the project folder and the examples
# load ../../dist/. Telemetry is off. Set HYPERFRAMES_VERSION to try another CLI version.
set -e
cd "$(dirname "$0")/.."
command -v npx >/dev/null 2>&1 || { echo "lint-examples: npx not found — install Node to run this (skipped)" >&2; exit 2; }
VERSION="${HYPERFRAMES_VERSION:-0.9.52}"
export HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1
WORK="$(mktemp -d "${TMPDIR:-/tmp}/lint-examples.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1
# Cảnh báo của `check` đã biết là báo nhầm với thư viện này (xem references/hyperframes.md).
KNOWN="rotation_pivot_drift off_pivot_rotation gsap_tween_tail film_silent"
failed=0
for example in examples/*/index.html; do
  name="$(basename "$(dirname "$example")")"
  mkdir -p "$WORK/$name"
  cp -R "$(dirname "$example")/." "$WORK/$name/"            # audio, cue scripts and anything else the example loads
  # Cùng một phép thay mà người dùng làm khi chép ví dụ vào project thật.
  sed -e 's#\.\./\.\./dist/character\.iife\.js#character.iife.js#' -e 's#\.\./\.\./vendor/gsap-#gsap-#' "$example" > "$WORK/$name/index.html"
  cp dist/character.iife.js "$WORK/$name/"
  cp vendor/gsap-*.min.js "$WORK/$name/"                     # GSAP ghim phiên bản (đợt 27), không nạp từ CDN
  if (cd "$WORK/$name" && npx --yes "hyperframes@$VERSION" lint > "$WORK/$name.log" 2>&1) && grep -q "0 errors" "$WORK/$name.log"; then
    echo "  ✓ $name  $(grep -E '[0-9]+ errors?' "$WORK/$name.log" | tail -1 | sed 's/^[^0-9]*//')"
  else
    echo "  ✗ $name"; sed 's/^/      /' "$WORK/$name.log" | tail -15; failed=1
  fi
  if [ "$CHECK" = 1 ]; then
    (cd "$WORK/$name" && npx --yes "hyperframes@$VERSION" check > "$WORK/$name.check" 2>&1) || true
    grep -q "^Runtime" "$WORK/$name.check" || { echo "  ✗ $name  check did not run:"; sed 's/^/      /' "$WORK/$name.check" | tail -8; failed=1; continue; }
    # Lỗi (✗) luôn tính; cảnh báo (⚠) tính nếu mã của nó không nằm trong danh sách đã biết.
    bad="$(KNOWN="$KNOWN" python3 - "$WORK/$name.check" <<'PY'
import os, re, sys
known = set(os.environ['KNOWN'].split())
for line in open(sys.argv[1], encoding='utf-8', errors='replace'):
    found = re.match(r'\s+([✗⚠])\s+(?:t=[\d.,\s]+s\s+)?([a-z_]+)', line)
    if found and (found.group(1) == '✗' or found.group(2) not in known):
        print(line.rstrip()[:240])
PY
)"
    if [ -n "$bad" ]; then echo "  ✗ $name  check:"; echo "$bad" | sed 's/^/    /'; failed=1; else echo "  ✓ $name  check (no errors, no unexpected warnings)"; fi
  fi
done
# Kịch bản mẫu (examples/*/scene.json): dựng ra composition bằng tools/scene.py rồi soát như các ví dụ khác.
for scene in examples/*/scene.json; do
  [ -f "$scene" ] || continue
  name="$(basename "$(dirname "$scene")")-generated"
  if ! python3 tools/scene.py "$scene" -o "$WORK/$name" > "$WORK/$name.build" 2>&1; then echo "  ✗ $name  scene.py failed:"; sed 's/^/      /' "$WORK/$name.build" | tail -6; failed=1; continue; fi
  if (cd "$WORK/$name" && npx --yes "hyperframes@$VERSION" lint > "$WORK/$name.log" 2>&1) && grep -q "0 errors" "$WORK/$name.log"; then
    echo "  ✓ $name  $(grep -E '[0-9]+ errors?' "$WORK/$name.log" | tail -1 | sed 's/^[^0-9]*//')"
  else
    echo "  ✗ $name"; sed 's/^/      /' "$WORK/$name.log" | tail -15; failed=1
  fi
  if [ "$CHECK" = 1 ]; then
    (cd "$WORK/$name" && npx --yes "hyperframes@$VERSION" check > "$WORK/$name.check" 2>&1) || true
    grep -q "^Runtime" "$WORK/$name.check" || { echo "  ✗ $name  check did not run:"; sed 's/^/      /' "$WORK/$name.check" | tail -8; failed=1; continue; }
    # Bối cảnh 3D: nhân vật đứng sát máy bị mép khung cắt ngang — host của nó (con trực tiếp của #view) chìa ra dưới
    # khung vài px; vật tiền cảnh sát máy chỉ ló một mép vào khung, hộp của nó nằm phần lớn ngoài khung. Cả hai cố ý;
    # không gắn data-layout-ignore được vì thế thì `check` thôi thấy chúng cử động.
    bad="$(grep -E '^[[:space:]]+(✗|⚠)' "$WORK/$name.check" | grep -vE "$(echo "$KNOWN" | tr ' ' '|')" | grep -vE '⚠ .*(container_overflow|escaped_container) #view > div:nth-of-type\([0-9]+\) inside #view' || true)"
    if [ -n "$bad" ]; then echo "  ✗ $name  check:"; echo "$bad" | cut -c1-240 | sed 's/^/    /'; failed=1; else echo "  ✓ $name  check (no errors, no unexpected warnings)"; fi
  fi
done
[ "$failed" = 0 ] && echo "PASS" || { echo "FAIL"; exit 1; }
