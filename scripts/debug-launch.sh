#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-real}"
CHATGPT_URL="https://chatgpt.com/"
PROFILE_BASE="/private/tmp/chatgpt-font-debug-$MODE"
LOG_FILE="/private/tmp/chatgpt-font-debug-$MODE.log"
REMOTE_PORT="${CHATGPT_FONT_DEBUG_PORT:-9227}"

chrome_candidates=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)

CHROME=""
for candidate in "${chrome_candidates[@]}"; do
  if [[ -x "$candidate" ]]; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Google Chrome was not found." >&2
  exit 1
fi

/bin/rm -rf "$PROFILE_BASE" "$LOG_FILE"
/bin/mkdir -p "$PROFILE_BASE"

args=(
  "--app=$CHATGPT_URL"
  "--user-data-dir=$PROFILE_BASE"
  "--remote-debugging-port=$REMOTE_PORT"
  "--remote-allow-origins=http://127.0.0.1:$REMOTE_PORT"
  "--enable-logging=stderr"
  "--v=1"
  "--no-first-run"
  "--disable-features=Translate"
)

case "$MODE" in
  none)
    ;;
  noop)
    NOOP_EXTENSION="$ROOT/debug/noop-extension"
    args+=("--load-extension=$NOOP_EXTENSION")
    ;;
  real)
    args+=("--load-extension=$ROOT/extension")
    ;;
  *)
    echo "Usage: $0 [none|noop|real]" >&2
    exit 2
    ;;
esac

echo "Launching mode=$MODE profile=$PROFILE_BASE port=$REMOTE_PORT log=$LOG_FILE"
exec "$CHROME" "${args[@]}" 2> "$LOG_FILE"
