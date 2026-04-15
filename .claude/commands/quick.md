---
description: Bypass path for trivial edits — dispatches a worker with no pre-flight clarifier (typos, renames, one-line fixes)
argument-hint: <task description>
---

# Quick

> **Warning**: This command is for small edits only (typos, variable renames, one-line fixes, small refactors). If the task involves design decisions, new files, or touches multiple modules, use `/dispatch` instead — it runs pre-flight clarification.

**Task**: $ARGUMENTS

---

> Reminder: the team-lead enforcer hook blocks direct edits under `src/`, `client/`, `tests/`, `azure/`, `.github/`. Even trivial changes must go through a worker.

## Steps

1. **Parse `$ARGUMENTS`** as the task description.

2. **Match the task** to a row in the `## Task Routing` table in `CLAUDE.md`. If nothing clearly matches, treat it as a "small fix" and carry that label through to the worker prompt.

3. **Decide isolation**:
   - If the change obviously touches only one file (a typo, a rename, a one-line fix): `isolation: "worktree"` still applies but expect a single commit.
   - If >1 file may be touched: always use `isolation: "worktree"`.

4. **Write the scope allowlist** to `<worktree>/.claude/scope.txt` with just the file(s) or glob(s) the quick fix should touch. Keep it tight.

5. **Build a short worker prompt** — do NOT use the full `dispatch-template.md`. Include only:
   - The user's request **verbatim**
   - The matched routing row (or "small fix" if none)
   - The scope allowlist
   - The output contract: "Report in ≤100 words. List files changed with one-line what/why. Do not quote code back. If blocked, halt and return `BLOCKED: see .claude/blocked.md`."

6. **Dispatch** via the `Agent` tool with:
   - `subagent_type: general-purpose`
   - `prompt`: the short brief above
   - `isolation: "worktree"`
   - `run_in_background: true`
   - `description`: ≤6 word label

7. **Summarize** in ≤4 sentences when the worker returns: files changed, worktree path, any blockers. Do NOT quote code back.
