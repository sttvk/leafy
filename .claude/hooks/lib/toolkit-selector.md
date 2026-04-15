# Toolkit Selector

How to build a worker's toolkit package from a user request.

## Step 1: Match the routing table
Find the row in `.claude/hooks/lib/routing-table.md` whose Intent matches the user's request.
Copy its Primary agent, Skills, Scope, and Isolation cells as the baseline. If no
row matches, STOP and invoke the fallback rule — do not guess.

## Step 2: Augment with catalog sections
Read `.claude/hooks/lib/toolkit-catalog.md`. For each use-case section that
applies to the task (often more than one — e.g. a new endpoint that touches auth
spans ".NET backend implementation" + "Authentication & security" + "Testing"),
pull in any skills / agents / rules / docs the routing row did not already list.
Keep additions minimal and task-relevant. Prefer project skills over generic
plugin equivalents.

## Step 3: Identify post-impl review agents
Based on what the worker will touch, list every agent that should run AFTER the
worker finishes implementation:
- C# code changed → `csharp-reviewer`
- TypeScript / React changed → `typescript-reviewer`
- Auth, input, secrets, or crypto → `security-reviewer`
- DTOs or endpoints changed → `contract-sync-bot`
- Before claiming done → `superpowers:verification-before-completion`
- General quality backstop on every task → `code-reviewer`

## Step 4: Identify stuck-recovery + write-new-code agents
Every brief includes these as standing guidance:
- If you get stuck debugging → `superpowers:systematic-debugging`
- If you're about to write net-new code → `superpowers:test-driven-development`
- If you need to understand existing patterns → `code-explorer` or
  `claude-mem:smart-explore`
- Build/compile failure → `/build-fix`

## Step 5: Compile into the dispatch-template.md placeholders
Substitute into `.claude/hooks/lib/dispatch-template.md`:
- `{{CALL_SKILLS_PROJECT}}` — project skills from steps 1+2, comma separated
- `{{CALL_SKILLS_PLUGIN}}` — plugin-prefixed skills (e.g. `superpowers:*`), comma
  separated
- `{{POST_IMPL_AGENTS}}` — from step 3
- `{{PRE_DONE_AGENTS}}` — from step 3, typically just
  `superpowers:verification-before-completion`
- `{{STUCK_AGENTS}}` — from step 4
- `{{RULES_FILES}}` — ordered list, most-relevant first, each as a bare path
- `{{DOCS_TO_READ}}` — design doc sections (`file.md §Section`)
- `{{INVARIANT_NUMBERS}}` — which numbered invariants from
  `.claude/docs/INVARIANTS.md` apply (e.g. "#1, #3, #6")
- `{{ALLOWED_PATH_GLOBS}}` — from routing row Scope column; written verbatim to
  `<worktree>/.claude/scope.txt`

## Anti-patterns
- Do not name a skill the worker doesn't have installed — check the catalog.
- Do not over-provision — 15 skills is worse than 5 because the worker will
  follow none of them. Curate aggressively.
- Do not skip the review agents — they are the quality backstop.
- Do not paraphrase the user's request; the dispatch contract requires verbatim.
- Do not inline rule contents into the brief — the worker reads the files.
