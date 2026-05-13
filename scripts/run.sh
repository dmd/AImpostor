#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$ROOT/node_modules/electron" ]]; then
  echo "Dependencies are not installed yet. Run npm install from $ROOT first." >&2
  exit 1
fi

cd "$ROOT"
/usr/bin/env npm start
