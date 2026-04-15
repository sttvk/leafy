# Commit Messages

Extends `git-workflow.md` — this file defines the stricter message conventions.

## Allowed Types

| Type | Use for |
|------|---------|
| feat | New user-visible capability |
| fix | Bug fix that changes behavior |
| refactor | Internal change, no behavior delta |
| perf | Performance improvement only |
| docs | Documentation only |
| test | Adding or fixing tests only |
| chore | Tooling, deps, housekeeping |
| ci | CI pipeline or workflow changes |
| build | Build system, compiler, bundler |
| style | Formatting, whitespace, no logic |

## Scope (Optional but Preferred)

Format: `type(scope): subject`. Scopes used in this repo:

- `api` — `Lms.Api`
- `client` — React frontend
- `infra` — Bicep, Azure, deployment
- `db` — migrations, schema, EF
- `ci` — GitHub Actions, pipelines
- `docs` — documentation tree

## Subject Line Rules

- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removing"
- No trailing period
- Max 72 characters including the type prefix
- Lowercase after the type prefix: `feat(api): add checkout endpoint`

## Body Rules

- Optional, but required when the change is non-trivial
- Separate from subject with a blank line
- Wrap at 72 characters
- Focus on WHY, not WHAT — the diff shows what

## Footer

- `BREAKING CHANGE: <description>` for breaking API or contract changes
- `Closes #123` or `Refs #123` for issue links

## Do Not Put in Commit Messages

- Vague verbs: "fixes bug", "update code", "wip", "checkpoint", "misc"
- AI attribution lines of any kind
- Emoji (unless the project adopts gitmoji, which this repo does not)
- File lists — that is what `git show` is for

## One Change Per Commit

If your message needs `and`, split the commit. Multiple `and`s is a smell.

## Rebase Before Pushing

When cleaning up your own unpushed series, prefer `git rebase -i` to squash and reorder commits rather than piling on `fixup!` messages. Do not use `-i` from inside Claude Code — run it in your own terminal.

## Worked Example

```
feat(api): add semantic search endpoint for catalog

Adds POST /api/search/semantic backed by the hybrid full-text +
vector pipeline. Results are fused with reciprocal rank fusion and
capped at the top 25 to keep p95 under the 200ms INP budget.

Closes #142
```
