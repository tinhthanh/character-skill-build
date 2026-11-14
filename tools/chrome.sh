#!/bin/sh
# In ra đường dẫn một Chrome/Chromium dùng được cho headless; thoát 1 nếu không có.
for c in "$CHROME" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "$(command -v google-chrome 2>/dev/null)" "$(command -v google-chrome-stable 2>/dev/null)" "$(command -v chromium 2>/dev/null)" "$(command -v chromium-browser 2>/dev/null)"; do
  [ -n "$c" ] && [ -x "$c" ] && { echo "$c"; exit 0; }
done
echo "không tìm thấy Chrome/Chromium — đặt biến CHROME=/đường/dẫn" >&2; exit 1
