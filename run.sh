#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-5173}"
while command -v lsof >/dev/null && lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://127.0.0.1:${PORT}"
echo "Happy Birthday, Upasana"
echo "Serving ${URL}"
echo "Press Ctrl+C to stop."

sleep 0.5
if command -v open >/dev/null; then
  open "$URL"
elif command -v xdg-open >/dev/null; then
  xdg-open "$URL"
fi

exec python3 -m http.server "$PORT" --bind 127.0.0.1
