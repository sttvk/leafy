#!/usr/bin/env bash
# Enforce the Team Lead persona: block direct edits to production paths.
#
# Rationale: the team lead orchestrates — production code is written by
# workers dispatched into worktrees, never by the lead directly. Workers
# inside a `.wt-*` worktree (or any tree carrying `.claude/scope.txt`) are
# exempt; this hook only fires in the main project tree. Meta paths like
# `.claude/**` and `CLAUDE.md` remain editable so the lead can tune the
# harness itself.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")

# Worker detection: inside a worktree, or an explicit scope file is present.
case "$(pwd)" in
  *.wt-*) exit 0 ;;
esac
[[ -f "./.claude/scope.txt" ]] && exit 0

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" file_path 2>/dev/null || true)

[[ -z "$FILE_PATH" ]] && exit 0

# Normalize to a project-relative path when possible. We match on substrings
# so absolute and relative forms both resolve cleanly.
REL="$FILE_PATH"
PROJECT_ROOT="$(pwd)"
case "$REL" in
  "$PROJECT_ROOT"/*) REL="${REL#"$PROJECT_ROOT"/}" ;;
esac

# Production prefixes the team lead may NOT edit directly.
case "$REL" in
  src/*|*/src/*|\
  client/*|*/client/*|\
  tests/*|*/tests/*|\
  azure/*|*/azure/*|\
  .github/workflows/*|*/.github/workflows/*)
    cat >&2 <<EOF
BLOCKED: Team Lead cannot edit '$REL' directly.

Production paths (src/, client/, tests/, azure/, .github/workflows/) must
be delegated via the /dispatch flow or the Agent tool — the lead
orchestrates, workers implement.

See CLAUDE.md §Team Lead Protocol for the full rule list.
EOF
    exit 2
    ;;
esac

exit 0
