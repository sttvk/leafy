#!/usr/bin/env bash
# Enforce a worker's per-task file allowlist inside a dispatched worktree.
#
# Rationale: when the team lead dispatches a worker into a worktree it
# writes the task's allowed globs to `<worktree>/.claude/scope.txt`. This
# hook fails closed: any Edit/Write/MultiEdit to a path that doesn't match
# one of those globs is blocked. Without scope.txt the hook is a pure
# no-op, so unscoped sessions and the main tree are unaffected.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
SCOPE_FILE="./.claude/scope.txt"

# No scope file → not a scoped worker → allow everything.
[[ -f "$SCOPE_FILE" ]] || exit 0

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" file_path 2>/dev/null || true)

[[ -z "$FILE_PATH" ]] && exit 0

# Resolve file_path to a path relative to the worktree root (cwd).
# macOS `realpath` lacks --relative-to, so fall back to stripping cwd.
CWD="$(pwd)"
REL="$FILE_PATH"
case "$REL" in
  "$CWD"/*) REL="${REL#"$CWD"/}" ;;
  /*)
    # Absolute path outside cwd — keep as-is; it will fail to match.
    ;;
esac

# Match REL against every non-comment pattern in scope.txt. macOS ships
# bash 3.2 without `globstar`, so we delegate matching to Python's
# fnmatch with an explicit `**` → `.*` translation for recursive globs.
if REL="$REL" SCOPE_FILE="$SCOPE_FILE" python3 - <<'PY'
import fnmatch, os, re, sys

rel = os.environ["REL"]
scope = os.environ["SCOPE_FILE"]

def to_regex(pat: str) -> str:
    # Translate `**` → sentinel, run fnmatch.translate, then swap the
    # sentinel for `.*` so recursive globs work across path separators.
    sentinel = "\x00DOUBLESTAR\x00"
    pat = pat.replace("**", sentinel)
    regex = fnmatch.translate(pat)
    # fnmatch escapes the sentinel; undo that and substitute `.*`.
    regex = regex.replace(re.escape(sentinel), ".*")
    return regex

with open(scope) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if re.fullmatch(to_regex(line), rel):
            sys.exit(0)
sys.exit(1)
PY
then
  exit 0
fi

{
  echo "BLOCKED: '$REL' is outside this task's scope."
  echo "Allowed patterns (from $CWD/.claude/scope.txt):"
  while IFS= read -r PATTERN || [[ -n "$PATTERN" ]]; do
    [[ -z "$PATTERN" ]] && continue
    case "$PATTERN" in \#*) continue ;; esac
    echo "  $PATTERN"
  done < "$SCOPE_FILE"
  echo "If this file SHOULD be in scope, halt and ask the team lead via the blocked protocol."
} >&2
exit 2
