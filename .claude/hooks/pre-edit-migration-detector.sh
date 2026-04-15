#!/usr/bin/env bash
# Block EF Core migration calls in files under src/Lms.Api/.
#
# Enforces CLAUDE.md Architecture Invariant #1: migrations MUST run in the
# Lms.Migrations console project, never at API startup. Catching this at
# edit time (rather than code review time) prevents a subtle prod issue
# where the API would run migrations during its own warm-up on cold start.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" file_path 2>/dev/null || true)

# Scope: only files under src/Lms.Api/. The Lms.Migrations project is the
# one place where .Database.Migrate() is legitimate.
case "$FILE_PATH" in
  *src/Lms.Api/*) ;;
  *) exit 0 ;;
esac

CONTENT=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" content_all 2>/dev/null || true)

if printf '%s\n' "$CONTENT" | grep -F -q \
    -e '.Database.Migrate(' \
    -e '.Database.MigrateAsync(' \
    -e '.MigrateAsync('; then
  cat >&2 <<EOF
BLOCKED: Detected '.Database.Migrate()' / 'MigrateAsync()' in '$FILE_PATH'.

Migrations MUST run in the Lms.Migrations console project, never at API
startup. This is a load-bearing architectural invariant — see
.claude/docs/INVARIANTS.md (#1).
EOF
  exit 2
fi

exit 0
