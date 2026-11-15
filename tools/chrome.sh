#!/bin/sh
# Print the path of a Chrome/Chromium usable headless; exit 1 if there is none.
for c in "$CHROME" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "$(command -v google-chrome 2>/dev/null)" "$(command -v google-chrome-stable 2>/dev/null)" "$(command -v chromium 2>/dev/null)" "$(command -v chromium-browser 2>/dev/null)"; do
  [ -n "$c" ] && [ -x "$c" ] && { echo "$c"; exit 0; }
done
echo "no Chrome/Chromium found — set CHROME=/path/to/chrome" >&2; exit 1
