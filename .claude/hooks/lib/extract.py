#!/usr/bin/env python3
"""Read a Claude Code hook event JSON from stdin and emit one extracted field.

Usage:
    extract.py file_path        # tool_input.file_path
    extract.py command          # tool_input.command
    extract.py session_id       # top-level session_id (default if missing)
    extract.py content_all      # content + new_string + edits[].new_string, newline-joined

Exits 0 on success with the value written to stdout.
Returns an empty string silently if the field is missing or the JSON is malformed —
hooks should treat empty output as "no match, allow the tool call".
"""
from __future__ import annotations

import json
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: extract.py <field>", file=sys.stderr)
        return 1

    field = sys.argv[1]

    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        # Malformed JSON: degrade to no-op rather than crashing the hook.
        return 0

    tool_input = data.get("tool_input") or {}

    if field == "file_path":
        sys.stdout.write(tool_input.get("file_path") or "")
    elif field == "command":
        sys.stdout.write(tool_input.get("command") or "")
    elif field == "session_id":
        sys.stdout.write(data.get("session_id") or "default")
    elif field == "content_all":
        # Concatenate every text payload a write/edit tool might carry.
        parts: list[str] = [
            tool_input.get("content") or "",
            tool_input.get("new_string") or "",
        ]
        for edit in tool_input.get("edits") or []:
            parts.append(edit.get("new_string") or "")
        sys.stdout.write("\n".join(parts))
    else:
        print(f"unknown field: {field}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
