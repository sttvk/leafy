# Toolkit Catalog

Source of truth for every skill and agent the team lead can assign to a worker.
Maintained by hand — update when plugins are added or removed.
Last audit: 2026-04-15 (routing fix: code-architect → general-purpose on impl rows; api-contract-sync cataloged; invariant #2 ref retired)

## Deliberately excluded

Installed plugin skills that are intentionally NOT cataloged (low fit for this project — do not re-add without discussion):

- `loop`, `schedule`, `keybindings-help` — Claude Code operator ergonomics, not worker tools
- `claude-api`, `graphify` — unrelated domains (Anthropic SDK apps, knowledge graphs)
- `claude-mem:timeline-report`, `claude-mem:knowledge-agent`, `claude-mem:version-bump`, `claude-mem:do` — claude-mem plugin internals
- `hookify:help`, `hookify:hookify` — covered by `hookify:writing-rules` + `hookify:configure`
- `superpowers:using-superpowers` — meta-bootstrap, fires itself
- Slash commands under `.claude/commands/*` — documented in `CLAUDE.md` §References, not duplicated here

## Use-case index

Jump to the relevant section:
- [Planning & design](#planning--design)
- [Documentation (HLD / LLD)](#documentation-hld--lld)
- [.NET backend implementation](#net-backend-implementation)
- [React frontend implementation](#react-frontend-implementation)
- [Database / migrations](#database--migrations)
- [Authentication & security](#authentication--security)
- [Azure / deployment / infra](#azure--deployment--infra)
- [Testing](#testing)
- [AI features](#ai-features)
- [Code review & verification](#code-review--verification)
- [Debugging](#debugging)
- [Meta: editing the Claude system itself](#meta-editing-the-claude-system-itself)

## Planning & design

### Skills
- `search-first` — research existing tools/libraries before writing custom code
- `documentation-lookup` — Context7-backed library docs; fires on framework questions
- `coding-standards` — baseline cross-project conventions (naming, immutability, review)
- `superpowers:brainstorming` — explore intent/requirements before touching code
- `superpowers:writing-plans` — multi-step task decomposition into review-checkpointed plan
- `superpowers:executing-plans` — run a written plan in a fresh session with checkpoints
- `superpowers:subagent-driven-development` — execute plan via independent subagent tasks
- `superpowers:dispatching-parallel-agents` — fire when 2+ independent tasks can run concurrently
- `claude-mem:make-plan` — phased implementation plan with docs discovery

### Agents
- `planner` — feature breakdown, PRD, phases
- `code-architect` — system design decisions, tradeoff analysis
- `code-explorer` — read-only codebase orientation

### Rules files
- `.claude/rules/development-workflow.md` — research → plan → TDD → review pipeline
- `.claude/rules/patterns.md` — skeleton/repository patterns

### Design docs
- `.claude/docs/HLD.md` §Stack, §Key Flows, §Repo Layout
- `.claude/docs/REQUIREMENTS.md` — FR-1..FR-8

## Documentation (HLD / LLD)

This section exists to make design-doc work explicit. Every request to "document X", "write an HLD/LLD", "create an architecture doc", or "produce an implementation plan" routes through this section.

### Skills
- `hld` — feature/system High-Level Design following C4 + Google design doc + ADR conventions; Mermaid-first
- `lld` — component-level Low-Level Design with field-level data models, per-operation sequence diagrams, and error-handling tables
- `search-first` — understand existing code before writing new docs
- `documentation-lookup` — current library/framework docs via Context7
- `claude-mem:smart-explore` — AST-based code exploration to ground docs in actual structure
- `superpowers:brainstorming` — drive out ambiguities before starting an HLD
- `superpowers:verification-before-completion` — final gate before marking the doc complete

### Agents
- `code-explorer` — read-only codebase navigation when writing docs *against* an existing implementation
- `code-architect` — for design decisions that need multiple alternatives weighed before the HLD is written

### Rules files
- None directly — documentation is governed by the skill files themselves

### Output locations
- HLD: `.claude/docs/HLD-<feature-slug>.md`
- LLD: `.claude/docs/LLD/<component-slug>.md`
- System-wide HLD: `.claude/docs/HLD.md`

### Design docs cross-referenced from every HLD/LLD
- `.claude/docs/HLD.md` — the project-wide reference (HLDs inherit from this)
- `.claude/docs/INVARIANTS.md` — architectural invariants cited by number
- `.claude/docs/REQUIREMENTS.md` — FR numbers covered by the feature

### When to use which
- **HLD first, LLD second.** An LLD without an HLD is an implementation note with pretensions.
- **One HLD per feature or system boundary.** Multiple boundaries → multiple HLDs.
- **One LLD per component** named in the HLD's container diagram. Don't combine components into one LLD.

## .NET backend implementation

### Skills
- `csharp-coding-standards` — records, pattern matching, value objects, C# 12+
- `dotnet-patterns` — idiomatic DI, async/await, error handling
- `api-design` — REST resource naming, status codes, pagination, errors
- `efcore-patterns` — NoTracking default, query splitting, migration hygiene
- `microsoft-extensions-dependency-injection` — AddX extension method grouping
- `microsoft-extensions-configuration` — IOptions + validation on startup
- `csharp-type-design-performance` — sealed classes, readonly structs, allocation
- `api-contract-sync` — regenerate TS client from OpenAPI when DTOs/endpoints change

### Agents
- `code-architect` — layered implementation for endpoint/service slices
- `tdd-guide` — red/green/refactor discipline

### Rules files
- `.claude/rules/base-coding-style.md`
- `.claude/rules/base-testing.md` (80% coverage bar)
- `.claude/rules/testing-cs.md` — xUnit + FluentAssertions specifics
- `.claude/rules/aspire.md` — dev-only AppHost, no Aspire client SDKs in app code
- `.claude/rules/observability.md` — OTEL, ILogger, health checks

### Design docs
- `.claude/docs/HLD.md` §Data Access, §Repo Layout
- Invariants #3 (atomic checkout), #4 (computed loan status), #9 (layered projects)

## React frontend implementation

### Skills
- `frontend-patterns` — component structure, state management
- `react-data-fetching` — TanStack Query, generated client, loading/error/empty
- `frontend-design` / `frontend-design:frontend-design` — distinctive UI, avoids generic AI look
- `documentation-lookup` — current React/Vite docs

### Agents
- `code-architect` — component + hook wiring

### Rules files
- `.claude/rules/performance.md` — Core Web Vitals, bundle budget
- `.claude/rules/security.md` — CSP, XSS prevention
- `.claude/rules/base-coding-style.md`
- `.claude/rules/coding-style-ts.md` — TypeScript-specific conventions

### Design docs
- `.claude/docs/HLD.md` §Stack, §Sign-In flow

## Database / migrations

### Skills
- `efcore-patterns` — migrations via dedicated runner, never API startup
- `database-performance` — avoid N+1, AsNoTracking, row limits, no app-side joins
- `/migrate` command — safe migration generation against Lms.Api

### Agents
- `tdd-guide` — integration coverage for schema changes

### Rules files
- `.claude/rules/base-coding-style.md` (immutability)
- `.claude/rules/sql-server-patterns.md` — `UNIQUEIDENTIFIER`/`DATETIME2`/`NVARCHAR`, checkout CAS, no stored procs

### Design docs
- `.claude/docs/DB-SCHEMA.md` — four-table schema
- `.claude/docs/HLD.md` §Data Access
- Invariants #1 (migrations never at startup), #3, #4

## Authentication & security

### Skills
- `entra-msal-wiring` — MSAL React + Microsoft.Identity.Web wiring
- `security-review` — checklist for auth, secrets, input handling

### Agents
- `security-reviewer` — OWASP-grade review of auth-adjacent code

### Rules files
- `.claude/rules/security.md` — CSP, HTTPS headers, forms, secrets, validation, response protocol

### Design docs
- `.claude/docs/HLD.md` §Authentication and Roles, §Configuration and Secrets

## Azure / deployment / infra

### Skills
- `aspire-configuration` — AppHost env-var config, keep app code Aspire-free
- `deployment-patterns` — CI/CD, health checks, rollback
- `opentelementry-dotnet-instrumentation` — tracing/metrics conventions
- `package-management` — CPM + dotnet CLI, no XML editing
- `project-structure` — .slnx, Directory.Build.props, global.json

### Agents
- `deploy-bot` — Bicep + GitHub Actions changes

### Rules files
- `.claude/rules/aspire.md` — AppHost dev-only, no Aspire client SDKs in app code
- `.claude/rules/bicep-patterns.md` — `targetScope = resourceGroup`, pinned free SKUs, idempotency
- `.claude/rules/github-actions-patterns.md` — single `deploy.yml`, job ordering invariants
- `.claude/rules/observability.md` — OTEL shape, health checks, cost guard
- `.claude/rules/performance.md`

### Design docs
- `.claude/docs/HLD.md` §Infrastructure as Code, §CI/CD, §Observability
- Invariants #6 (same config shape), #7 (one App Service), #8 (AppHost dev-only)

## Testing

### Skills
- `tdd-workflow` — red → green → refactor, 80% coverage
- `csharp-testing` — xUnit + FluentAssertions patterns
- `testcontainers` — real SQL container for integration tests
- `e2e-testing` — Playwright POM, CI integration, flake control
- `superpowers:test-driven-development` — generic TDD enforcement

### Agents
- `tdd-guide` — always fire before net-new implementation code
- `e2e-runner` — critical user flows

### Rules files
- `.claude/rules/base-testing.md` — 80% coverage bar, TDD workflow, AAA pattern
- `.claude/rules/testing-cs.md` — xUnit + FluentAssertions specifics

### Design docs
- `.claude/docs/HLD.md` §Running Locally

## AI features

### Skills
- `azure-open-ai-embeddings` — content-hash caching, don't burn free credits
- `hybrid-search-tuning` — LIKE + cosine RRF, relevance fixture

### Rules files
- `.claude/rules/performance.md` — animation/loading budgets don't apply but bundle budget does

### Design docs
- `.claude/docs/HLD.md` §Semantic Search
- Invariant #5 (in-memory cosine, no vector DB)

## Code review & verification

### Skills
- `code-review` — general quality gate
- `security-review` — mandatory for auth/input/secrets changes
- `simplify` — post-implementation cleanup pass
- `superpowers:verification-before-completion` — run commands, gather evidence before claiming done
- `superpowers:requesting-code-review` — closing-the-loop checklist
- `superpowers:receiving-code-review` — discipline for responding to review feedback
- `superpowers:finishing-a-development-branch` — merge/PR/cleanup decision at end of work

### Agents
- `code-reviewer` — language-agnostic quality pass
- `csharp-reviewer` — C#-specific review
- `typescript-reviewer` — TS/React-specific review
- `security-reviewer` — OWASP Top 10
- `contract-sync-bot` — fires when DTOs or endpoints change (keeps TS client in sync)
- `superpowers:code-reviewer` (via pr-review-toolkit) — PR-scoped review
- `pr-review-toolkit:review-pr` — comprehensive multi-agent PR sweep

### Rules files
- `.claude/rules/code-review.md` — severity levels, triggers, workflow
- `.claude/rules/commit-messages.md` — conventional commit types, scopes, subject rules
- `.claude/rules/git-workflow.md` — commit format, PR workflow

## Debugging

### Skills
- `superpowers:systematic-debugging` — always fire on unexpected behavior before proposing fix
- `claude-mem:smart-explore` — AST-based structural search to orient fast
- `claude-mem:mem-search` — "did we already solve this?" across sessions
- `/build-fix` command — compile failure recovery loop

### Agents
- `code-explorer` — read-only investigation
- `tdd-guide` — reproduce bug as failing test first

### Rules files
- `.claude/rules/development-workflow.md`

## Meta: editing the Claude system itself

### Skills
- `hookify:writing-rules` — author hookify rules + syntax/patterns
- `hookify:configure` / `hookify:list` — enable/disable/inspect installed rules
- `skill-creator:skill-creator` — create, edit, eval, and benchmark skills
- `superpowers:writing-skills` — guide for authoring new skills
- `superpowers:using-git-worktrees` — worktree isolation before running implementation plans
- `claude-md-management:claude-md-improver` — audit CLAUDE.md files against templates
- `claude-md-management:revise-claude-md` — fold session learnings into CLAUDE.md
- `update-config` — settings.json changes (hooks, permissions, env vars)
- `claude-code-setup:claude-automation-recommender` — analyze repo for automation gaps

### Rules files
- `.claude/rules/hooks.md` — PreToolUse/PostToolUse/Stop taxonomy

### Design docs
- `CLAUDE.md` §Team Lead Protocol — team-lead operating manual only
- `.claude/hooks/lib/routing-table.md` — intent → agent + toolkit + scope
- `.claude/docs/INVARIANTS.md` — numbered architecture invariants
- `.claude/hooks/lib/dispatch-template.md` — worker brief template
- `.claude/hooks/lib/blocked-template.md` — halt/resume protocol
