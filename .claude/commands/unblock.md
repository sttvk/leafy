---
description: Resume a worker halted with BLOCKED — relays the question to the user, writes the answer, dispatches a continuation worker
argument-hint: <worktree-path | task-name>
---

# Unblock

**Target**: $ARGUMENTS

---

## Steps

1. **Parse `$ARGUMENTS`** as either a worktree path or a task name.

2. **Locate the worktree**:
   - If `$ARGUMENTS` is an existing directory, use it.
   - Otherwise, search the project root for `.wt-*` directories matching the task name.
   - If nothing found, halt with: `No worktree matching '<arg>' — available: <list>`.

3. **Read `<worktree>/.claude/blocked.md`**. If missing, halt with: `No blocked.md found in that worktree.`

4. **Relay the question to the user verbatim** — show the full `## The question`, `## Options I considered`, and `## What I need from the user` sections from blocked.md.

5. **WAIT** for the user's answer. Do not proceed without one.

6. **Write the answer** to `<worktree>/.claude/answer.md` using the `Write` tool:

   ```
   # Answer: <one-line echo of the question>

   ## Context
   See .claude/blocked.md in this worktree for the original question, options, and context.

   ## Decision
   <the user's answer, verbatim>

   ## Rationale (if provided)
   <any reasoning the user supplied, otherwise omit>
   ```

7. **Dispatch a continuation worker** via the `Agent` tool with:
   - `subagent_type: general-purpose`
   - `prompt`: a short brief that says:
     > You are resuming a halted task. Read `<worktree>/.claude/blocked.md` for the original question/context and `<worktree>/.claude/answer.md` for the user's decision. Continue from the current git HEAD of the worktree — the previous worker committed WIP before halting. Apply the decision and complete the task. Follow the same output contract as the original brief (≤100 words, files changed with one-line what/why, no code quotes, return `BLOCKED: see .claude/blocked.md` if you get stuck again).
   - `isolation: "worktree"` (pointing at the existing worktree)
   - `run_in_background: true`
   - `description`: `resume <task-label>`

8. **Summarize** in ≤4 sentences when the worker returns: what was done after the unblock, files changed, whether the task is now complete. Ask the user to confirm completion or dispatch a reviewer.
