#!/usr/bin/env bash
# Report dotnet test status at end-of-response. Non-blocking — tests may
# fail during active TDD work and that shouldn't interrupt the session.
#
# Silently no-ops if there's no .NET solution (pre-implementation repo)
# or no dotnet CLI installed.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "$HOOKS_DIR/../.." && pwd)
cd "$PROJECT_ROOT"

# Only run if we actually have a .NET solution on disk.
if ! { ls *.sln *.slnx 2>/dev/null | grep -q . \
    || find . -maxdepth 3 -name '*.csproj' 2>/dev/null | grep -q .; }; then
  exit 0
fi

command -v dotnet >/dev/null 2>&1 || exit 0

if OUT=$(dotnet test --no-build --verbosity quiet 2>&1); then
  STATUS=0
else
  STATUS=$?
fi

SUMMARY=$(printf '%s\n' "$OUT" | grep -E 'Passed|Failed|Skipped' | tail -3)

if [[ $STATUS -eq 0 ]]; then
  echo "TEST STATUS: PASS — $SUMMARY"
else
  echo "TEST STATUS: FAIL (non-blocking) — $SUMMARY"
fi

exit 0
