#!/usr/bin/env bash
# Block edits to linter / formatter / typechecker config files.
#
# Rationale: the single most common LLM shortcut when hitting a lint or type
# error is to disable the rule rather than fix the code. This hook forces the
# "fix the code" branch. If the user genuinely needs to relax a rule, they
# make the edit themselves — Claude cannot.
set -euo pipefail

HOOKS_DIR=$(dirname "${BASH_SOURCE[0]}")
INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | python3 "$HOOKS_DIR/lib/extract.py" file_path 2>/dev/null || true)

[[ -z "$FILE_PATH" ]] && exit 0

# Deny-list covers: JS/TS tooling (eslint, prettier, tsc, biome),
# editor baseline (.editorconfig), .NET tooling (csharpier, Directory.Build.*,
# global.json), and Markdown linting.
BN=$(basename "$FILE_PATH")

case "$BN" in
  .eslintrc|.eslintrc.*|eslint.config.*|\
  .prettierrc|.prettierrc.*|prettier.config.*|\
  tsconfig.json|tsconfig.*.json|\
  biome.json|biome.jsonc|\
  .editorconfig|\
  .csharpierrc|.csharpierrc.*|\
  Directory.Build.props|Directory.Build.targets|Directory.Packages.props|\
  global.json|\
  .markdownlint.json|.markdownlint.jsonc)
    cat >&2 <<EOF
BLOCKED: Refusing to edit config file '$BN'.

This is a linter / formatter / typechecker config — fix the underlying
code instead of weakening the rules. If this edit is genuinely required,
the user must make it manually.
EOF
    exit 2
    ;;
esac

exit 0
