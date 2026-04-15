#!/usr/bin/env bash
# Nudge the user to run /audit-toolkit when the catalog has gone stale or
# when project-level skill/agent/rule/command files have been added or edited
# since the catalog was last written.
#
# Silent when everything is fresh. Only emits a reminder when action is needed.
#
# The catalog file's own mtime IS the "last audited" timestamp — whenever
# /audit-toolkit writes to it, the timer auto-resets. No separate state file.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "$HOOKS_DIR/.." && pwd)
CATALOG="$PROJECT_ROOT/hooks/lib/toolkit-catalog.md"

# Silent no-op if catalog is missing (pre-implementation of the audit system)
[[ ! -f "$CATALOG" ]] && exit 0

REMINDERS=()

# --- Staleness check: catalog older than 14 days ---
CATALOG_MTIME=$(stat -f "%m" "$CATALOG" 2>/dev/null || stat -c "%Y" "$CATALOG" 2>/dev/null || echo "")
if [[ -n "$CATALOG_MTIME" ]]; then
  NOW_EPOCH=$(date "+%s")
  AGE_DAYS=$(( (NOW_EPOCH - CATALOG_MTIME) / 86400 ))
  if (( AGE_DAYS > 14 )); then
    REMINDERS+=("Toolkit catalog is ${AGE_DAYS} days old. Run /audit-toolkit to sync with installed plugins.")
  fi
fi

# --- Drift check: any project-level config file newer than the catalog? ---
# We check skills/agents/rules/commands/hooks — any of these being newer than
# the catalog means something changed without the catalog being updated.
NEWER_FILES=""
for dir in skills agents rules commands hooks; do
  target="$PROJECT_ROOT/$dir"
  [[ -d "$target" ]] || continue
  found=$(find "$target" -type f \
    \( -name '*.md' -o -name '*.sh' -o -name '*.py' \) \
    -newer "$CATALOG" 2>/dev/null | head -5 || true)
  if [[ -n "$found" ]]; then
    NEWER_FILES="${NEWER_FILES}${found}"$'\n'
  fi
done

if [[ -n "$NEWER_FILES" ]]; then
  REMINDERS+=("Project files newer than toolkit-catalog.md — possibly added or edited since last audit:")
  # Trim project root prefix for readability
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    REMINDERS+=("  - ${f#$PROJECT_ROOT/}")
  done <<< "$NEWER_FILES"
  REMINDERS+=("Run /audit-toolkit to update the catalog and routing table.")
fi

# Emit all reminders (if any) under a single header
if (( ${#REMINDERS[@]} > 0 )); then
  echo "[SessionStart] Toolkit drift detected:"
  for line in "${REMINDERS[@]}"; do
    echo "$line"
  done
fi

exit 0
