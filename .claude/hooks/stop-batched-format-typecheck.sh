#!/usr/bin/env bash
# At end-of-response, format and typecheck exactly the files edited this
# response (recorded by post-edit-accumulator.sh). This replaces running
# dotnet format / prettier / tsc after every single Edit — one invocation
# per tool vs one invocation per response is a huge speed win on refactors.
#
# Never fails the session. Type errors are surfaced but not blocking.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "$HOOKS_DIR/../.." && pwd)

INPUT=$(cat)
SID=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" session_id 2>/dev/null || echo default)
ACCUM="${TMPDIR:-/tmp}/claude-edited-${SID}.txt"

[[ ! -f "$ACCUM" ]] && exit 0

cd "$PROJECT_ROOT"

FILES=$(sort -u "$ACCUM" | grep -v '^$' || true)
CS_FILES=$(printf '%s\n' "$FILES" | grep -E '[.]cs$' || true)
TS_FILES=$(printf '%s\n' "$FILES" | grep -E '[.](ts|tsx|js|jsx)$' || true)

# --- C# format via dotnet format, scoped to only the edited files ---
if [[ -n "$CS_FILES" ]] && command -v dotnet >/dev/null 2>&1; then
  SLN=$(ls *.sln *.slnx 2>/dev/null | head -1 || true)
  if [[ -n "$SLN" ]]; then
    while IFS= read -r f; do
      [[ -n "$f" && -f "$f" ]] && dotnet format "$SLN" --include "$f" --verbosity quiet >/dev/null 2>&1 || true
    done <<< "$CS_FILES"
    COUNT=$(printf '%s\n' "$CS_FILES" | grep -c .)
    echo "[Stop] formatted $COUNT C# file(s)"
  fi
fi

# --- TS/JS format via prettier, scoped to only the edited files ---
if [[ -n "$TS_FILES" ]] && [[ -f client/package.json ]]; then
  (cd client && printf '%s\n' "$TS_FILES" | sed 's|^|../|' | xargs -I{} npx --no-install prettier --write {} >/dev/null 2>&1 || true)
  COUNT=$(printf '%s\n' "$TS_FILES" | grep -c .)
  echo "[Stop] formatted $COUNT TS/JS file(s)"
fi

# --- TS typecheck (project-wide; tsc can't target individual files with project refs) ---
if [[ -n "$TS_FILES" ]] && [[ -f client/tsconfig.json ]]; then
  TSC_OUT=$(cd client && npx --no-install tsc --noEmit 2>&1 || true)
  if printf '%s\n' "$TSC_OUT" | grep -q 'error TS'; then
    echo '[Stop] TYPECHECK ERRORS:'
    printf '%s\n' "$TSC_OUT" | grep 'error TS' | head -10
  fi
fi

rm -f "$ACCUM"
exit 0
