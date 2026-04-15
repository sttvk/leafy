---
description: Dispatch an implementation worker to a git worktree via the team-lead protocol (pre-flight clarifier, scope allowlist, background run)
argument-hint: [--no-clarify] <task description>
---

# Dispatch

**Task**: $ARGUMENTS

---

> Reminder: the team-lead enforcer hook blocks direct `Edit`/`Write` on `src/`, `client/`, `tests/`, `azure/`, `.github/`. This dispatch flow is the only path to production code.

## Steps

1. **Parse `$ARGUMENTS`** as the task description. Check for a leading `--no-clarify` flag; if present, strip it and skip step 2.

2. **Pre-flight clarifier** (unless `--no-clarify`):
   - Use the `Agent` tool with `subagent_type: general-purpose`. Prompt the clarifier to read `.claude/docs/HLD.md`, `.claude/docs/REQUIREMENTS.md`, and the matched Task Routing row, then return **≤150 words** listing ambiguities in the user's task. No code changes.
   - Relay the ambiguities to the user **verbatim**.
   - **WAIT** for the user's answers before continuing.

3. **Match the task to a row in the `## Task Routing` table** in `CLAUDE.md`. If nothing matches, halt and invoke the Fallback rule — ask the user which row applies or whether to add a new row. Do NOT guess.

4. **Create the worktree**: the `Agent` tool call below with `isolation: "worktree"` handles worktree creation automatically.

5. **Build the worker's toolkit package**:
   1. Read `.claude/hooks/lib/toolkit-selector.md` — this is the selection procedure.
   2. Match the user's task to a row in `.claude/hooks/lib/routing-table.md`. Record:
      - Primary agent
      - Project skills (from "Skills" column)
      - Plugin skills (from "Plugin skills" column)
      - Post-impl agents (from "Post-impl agents" column)
      - Scope globs (from "Scope" column)
      - Isolation mode (from "Isolation" column)
   3. Read `.claude/hooks/lib/toolkit-catalog.md` and for each use-case section that matches the task, pull any additional skills/rules/docs the routing row did not already name. Keep additions minimal — prefer the routing row's curated set over over-provisioning from the catalog.
   4. Identify applicable architecture invariants by number from `.claude/docs/INVARIANTS.md`.
   5. Substitute all of the above into the placeholders in `.claude/hooks/lib/dispatch-template.md`:
      ```
      {{USER_REQUEST_VERBATIM}}
      {{ROUTING_ROW}}
      {{PRIMARY_AGENT}}
      {{CALL_SKILLS_PROJECT}}
      {{CALL_SKILLS_PLUGIN}}
      {{POST_IMPL_AGENTS}}
      {{PRE_DONE_AGENTS}}     ← usually "superpowers:verification-before-completion"
      {{STUCK_AGENTS}}        ← usually "superpowers:systematic-debugging, code-explorer"
      {{RULES_FILES}}
      {{DOCS_TO_READ}}
      {{INVARIANT_NUMBERS}}
      {{ALLOWED_PATH_GLOBS}}
      {{WORKTREE_PATH}}
      ```
   6. Write the scope allowlist to `<worktree>/.claude/scope.txt` **BEFORE** spawning the worker. This is load-bearing — the pre-edit-scope-enforcer hook reads this file at the worker's first tool call. One glob per line, from the routing row's "Scope" column.
   7. Append the clarifier Q&A from step 2 under a `## Clarifier answers` heading.

6. **Dispatch the worker** via the `Agent` tool with:
   - `subagent_type: general-purpose`
   - `prompt`: the substituted template from step 5
   - `isolation: "worktree"`
   - `run_in_background: true`
   - `description`: a short task label (≤8 words)

7. **Summarize** in ≤4 sentences when dispatch returns: which files changed, worktree path, any blockers. Do **NOT** quote worker code back. Ask the user whether to dispatch a reviewer or merge the worktree.
