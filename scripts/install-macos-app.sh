#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="$HOME/Applications"
BUILT_APP="$ROOT/dist/AImpostor-darwin-arm64/AImpostor.app"
DEST_APP="$DEST_DIR/AImpostor.app"

if [[ ! -d "$ROOT/node_modules/@electron/packager" ]]; then
  echo "Dependencies are not installed yet. Run npm install from $ROOT first." >&2
  exit 1
fi

cd "$ROOT"
/usr/bin/env npm_config_cache=/private/tmp/aimpostor-npm-cache ELECTRON_CACHE=/private/tmp/aimpostor-electron-cache npm run package:mac

if [[ ! -d "$BUILT_APP" ]]; then
  echo "Could not find built app at $BUILT_APP" >&2
  exit 1
fi

/bin/mkdir -p "$DEST_DIR"
/bin/rm -rf "$DEST_APP"
/bin/cp -R "$BUILT_APP" "$DEST_APP"

echo "Installed $DEST_APP"
