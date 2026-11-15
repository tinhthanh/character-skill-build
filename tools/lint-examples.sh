#!/bin/sh
# Run `hyperframes lint` on every example composition — the contract this library exists for.
#   tools/lint-examples.sh
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
failed=0
for example in examples/*/index.html; do
  name="$(basename "$(dirname "$example")")"
  mkdir -p "$WORK/$name"
  cp -R "$(dirname "$example")/." "$WORK/$name/"            # audio, cue scripts and anything else the example loads
  # Cùng một phép thay mà người dùng làm khi chép ví dụ vào project thật.
  sed 's#\.\./\.\./dist/character\.iife\.js#character.iife.js#' "$example" > "$WORK/$name/index.html"
  cp dist/character.iife.js "$WORK/$name/"
  if (cd "$WORK/$name" && npx --yes "hyperframes@$VERSION" lint > "$WORK/$name.log" 2>&1) && grep -q "0 errors" "$WORK/$name.log"; then
    echo "  ✓ $name  $(grep -E '[0-9]+ errors?' "$WORK/$name.log" | tail -1 | sed 's/^[^0-9]*//')"
  else
    echo "  ✗ $name"; sed 's/^/      /' "$WORK/$name.log" | tail -15; failed=1
  fi
done
[ "$failed" = 0 ] && echo "PASS" || { echo "FAIL"; exit 1; }
