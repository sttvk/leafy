# Task Routing Table

Single source of truth for how the team lead dispatches work. The `/dispatch` and `/quick` commands read this file to match a user request to an agent + toolkit package + scope + isolation.

Retuning routing = editing this table. There is no hidden routing logic elsewhere.

When the user asks for work that matches one of these intents, use the listed agent and expect the listed skills to auto-fire in the worker's context. Skills trigger themselves from their descriptions, but **naming them explicitly in the dispatch brief is still required** because vague task phrasings can defeat auto-trigger.

If nothing in this table matches, STOP and ask the user — see the Fallback rule at the bottom.

| Intent | Primary agent | Project skills | Plugin skills | Post-impl agents | Scope | Isolation |
|---|---|---|---|---|---|---|
| Plan a feature | `planner` | `search-first`, `documentation-lookup` | `superpowers:brainstorming`, `superpowers:writing-plans`, `claude-mem:smart-explore` | — | `.claude/docs/**` | `none` |
| Bootstrap / scaffold project skeleton | `code-architect` | `project-structure`, `package-management`, `aspire-configuration`, `csharp-coding-standards` | `documentation-lookup`, `superpowers:verification-before-completion` | `csharp-reviewer` | `src/**, Lms.sln, Lms.slnx, Directory.Build.props, Directory.Packages.props, global.json, NuGet.config, .editorconfig, .gitignore` | `worktree` |
| Write HLD (High-Level Design) | *(direct)* | `hld`, `search-first`, `documentation-lookup` | `claude-mem:smart-explore`, `superpowers:brainstorming` | `superpowers:verification-before-completion` | `.claude/docs/HLD.md, .claude/docs/HLD-*.md` | `none` |
| Write LLD (Low-Level Design) | *(direct)* | `lld`, `hld` (for reference), `api-design`, `efcore-patterns` | `claude-mem:smart-explore`, `superpowers:verification-before-completion` | `superpowers:verification-before-completion` | `.claude/docs/LLD/**` | `none` |
| Document a feature (HLD + LLD) | *(direct)* | `hld`, `lld`, `search-first`, `documentation-lookup` | `claude-mem:smart-explore`, `superpowers:brainstorming`, `superpowers:verification-before-completion` | `superpowers:verification-before-completion` | `.claude/docs/HLD.md, .claude/docs/HLD-*.md, .claude/docs/LLD/**` | `none` |
| New .NET endpoint | `tdd-guide` → `code-architect` | `api-design`, `efcore-patterns`, `csharp-coding-standards`, `tdd-workflow`, `csharp-testing` | `superpowers:test-driven-development`, `superpowers:verification-before-completion`, `documentation-lookup` | `csharp-reviewer`, `security-reviewer` (if auth), `contract-sync-bot` (if DTOs changed), `superpowers:verification-before-completion` | `src/Lms.Api/Endpoints/**, src/Lms.Api/Services/**, src/Lms.Api/Dtos/**, tests/Lms.Api.Tests/**` | `worktree` |
| React page / component | `code-architect` | `frontend-patterns`, `react-data-fetching`, `frontend-design` | `superpowers:test-driven-development`, `frontend-design:frontend-design`, `documentation-lookup`, `superpowers:verification-before-completion` | `typescript-reviewer`, `frontend-design:frontend-design` (spot-check), `superpowers:verification-before-completion` | `client/src/pages/**, client/src/components/**, client/src/api/**, client/src/hooks/**, client/src/types/**` | `worktree` |
| Contract change (DTO/endpoint) | `contract-sync-bot` | `api-contract-sync` | `superpowers:verification-before-completion` | `csharp-reviewer`, `typescript-reviewer`, `contract-sync-bot`, `superpowers:verification-before-completion` | `src/Lms.Api/Dtos/**, src/Lms.Api/Endpoints/**, client/src/api/**, client/src/types/**` | `worktree` |
| Review recent code changes | `code-reviewer` → `csharp-reviewer` / `typescript-reviewer` | `code-review` | `superpowers:requesting-code-review` | — | read-only | `none` |
| Security-sensitive change | `security-reviewer` | `security-review`, `entra-msal-wiring` (when auth) | `superpowers:test-driven-development`, `superpowers:verification-before-completion` | `csharp-reviewer`, `security-reviewer`, `superpowers:verification-before-completion` | `src/Lms.Api/Auth/**, src/Lms.Api/Endpoints/**` | `worktree` |
| Deploy / CI-CD change | `deploy-bot` | `deployment-patterns`, `aspire-configuration` | `documentation-lookup`, `superpowers:verification-before-completion` | `deploy-bot`, `security-reviewer`, `superpowers:verification-before-completion` | `azure/**, .github/**, src/Lms.AppHost/**, src/Lms.ServiceDefaults/**` | `worktree` |
| Semantic search / embeddings | *(direct)* | `azure-open-ai-embeddings`, `hybrid-search-tuning` | `superpowers:test-driven-development`, `documentation-lookup`, `superpowers:verification-before-completion` | `csharp-reviewer`, `superpowers:verification-before-completion` | `src/Lms.Api/Integrations/AzureOpenAI/**, src/Lms.Api/Services/**` | `worktree` |
| Debug failing test | `tdd-guide` | `tdd-workflow`, `testcontainers` | `superpowers:systematic-debugging`, `claude-mem:smart-explore` | — | `tests/**` | `worktree` |
| Build / compile failure | *(run `/build-fix`)* | `build-fix` | `superpowers:systematic-debugging` | — | targeted by error | `worktree` |
| Dead code cleanup | `refactor-cleaner` | — | `claude-mem:smart-explore`, `superpowers:verification-before-completion` | `csharp-reviewer`, `typescript-reviewer`, `superpowers:verification-before-completion` | — (broad; negotiate at dispatch) | `worktree` |
| E2E test work | `e2e-runner` | `e2e-testing` | `superpowers:test-driven-development`, `superpowers:verification-before-completion` | `typescript-reviewer`, `superpowers:verification-before-completion` | `tests/Lms.E2E/**, client/src/e2e/**` | `worktree` |

## Fallback rule

If a request doesn't match any row, do **NOT** guess. Ask the user verbatim:

> "I don't have a specific agent/skill mapping for this. Want me to proceed with general coding, or should we add a new mapping first?"

Wait for the answer before touching code. Adding a new row to this table is a legitimate first step on any task that doesn't fit — prefer that over silently picking a "close enough" agent.

## Audit

This table is kept in sync with the live tool catalog by the `/audit-toolkit` command. Running that command periodically (or when the SessionStart staleness reminder fires) will flag any rows referencing skills/agents that no longer exist in the installed plugin inventory.
