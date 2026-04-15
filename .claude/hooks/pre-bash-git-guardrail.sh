#!/usr/bin/env bash
# Guard dangerous git operations before they run.
#
# Blocks (exit 2):
#   - git commit --no-verify   (defeats pre-commit hooks, can land secrets)
#
# Warns (exit 0, stderr):
#   - git add -A / git add .   (can stage unintended files in this project)
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" command 2>/dev/null || true)

case "$CMD" in
  *"git commit"*)
    if printf '%s' "$CMD" | grep -q -- '--no-verify'; then
      echo 'BLOCKED: git commit --no-verify is not allowed. Fix the underlying hook failure instead.' >&2
      exit 2
    fi
    ;;
esac

case "$CMD" in
  *"git add -A"*|*"git add ."*)
    echo 'WARNING: git add -A / git add . can stage unintended files. Prefer adding files explicitly by name.' >&2
    ;;
esac

exit 0
