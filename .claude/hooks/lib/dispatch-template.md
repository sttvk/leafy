# Worker Dispatch Brief

## Your Task

{{USER_REQUEST_VERBATIM}}

## Routing match

- **Row**: {{ROUTING_ROW}}
- **Primary agent**: {{PRIMARY_AGENT}}

## Your toolkit

### Skills to call proactively
Project skills: {{CALL_SKILLS_PROJECT}}
Plugin skills:  {{CALL_SKILLS_PLUGIN}}

### Sub-agents to dispatch at milestones
- **After implementation (always):** {{POST_IMPL_AGENTS}}
- **Before claiming done:** {{PRE_DONE_AGENTS}}
- **If you get stuck:** {{STUCK_AGENTS}}
- **If you're writing net-new code:** superpowers:test-driven-development

### Rules files to read first (in order)
{{RULES_FILES}}

### Design docs to consult
{{DOCS_TO_READ}}

### Hooks that will fire automatically (for your awareness)
- `pre-edit-scope-enforcer` — blocks edits outside your scope.txt allowlist
- `pre-edit-migration-detector` — blocks .Database.Migrate() in src/Lms.Api/
- `pre-edit-config-protection` — blocks edits to lint/format configs
- `post-edit-accumulator` — records files you touch for Stop-time format
- `stop-batched-format-typecheck` — runs dotnet format + prettier + tsc at Stop
- `stop-dotnet-test` — reports test status at Stop

You do NOT need to invoke hooks. They fire automatically. But know they exist
so you understand why certain edits might be rejected.

Also read `.claude/docs/INVARIANTS.md` before touching code — the invariants
listed below are referenced by number and explained in full there.

## Applicable architecture invariants

{{INVARIANT_NUMBERS}}

## Your scope

Allowed edit paths:

{{ALLOWED_PATH_GLOBS}}

You may READ any file in the repo for context. You may NOT edit anything outside the allowlist above. A scope enforcer hook will block out-of-scope edits at tool-call time.

## Output contract

- Report in ≤100 words, key facts only.
- List files changed with a one-line what/why per file.
- Do NOT quote code back to the team lead.
- If blocked, follow the blocked protocol below and return `BLOCKED: see .claude/blocked.md`.

## If you get blocked

1. `git commit -am "wip: halting for clarification"` — commit WIP first. Without this, halting loses work.
2. Write `<worktree>/.claude/blocked.md` using the template at `.claude/hooks/lib/blocked-template.md`.
3. Return to team lead: `BLOCKED: see .claude/blocked.md`.
4. Exit. Do NOT guess. Do NOT ask interactively — there is no interactive channel.

## Isolation

You are working in a git worktree at `{{WORKTREE_PATH}}`. Make commits as you work. Do not rebase, do not push. The team lead will review the worktree directly before merging.

## Forbidden

- Don't edit outside scope (hook enforces).
- Don't disable lint/format/typecheck configs (hook enforces).
- Don't skip tests to make them "pass".
- Don't add `.Database.Migrate()` to `src/Lms.Api/` (hook enforces — see invariant #1).
- Don't quote code in your summary.
