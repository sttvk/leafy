#!/usr/bin/env bash
# Record every edited file path into a per-session scratch file so the Stop
# hook can format / typecheck only what actually changed. Batching at Stop
# time is ~10x faster than running dotnet format + prettier + tsc after
# every single Edit — especially during multi-file refactors.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" file_path 2>/dev/null || true)

[[ -z "$FILE_PATH" ]] && exit 0

SID=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" session_id 2>/dev/null || echo default)
ACCUM="${TMPDIR:-/tmp}/claude-edited-${SID}.txt"

printf '%s\n' "$FILE_PATH" >> "$ACCUM"
exit 0
