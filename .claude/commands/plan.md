---
description: Kick off structured planning for a feature via the planner agent
argument-hint: <feature description>
---

# Plan

**Feature**: $ARGUMENTS

---

Launch the `planner` agent with the feature above. Before planning, the agent MUST:

1. Read `.claude/docs/REQUIREMENTS.md` (FR-1 through FR-8), `.claude/docs/HLD.md` §Repo Layout + §Data Access + §Key Flows, and `.claude/docs/INVARIANTS.md` in full.
2. Consult the routing table at `.claude/hooks/lib/routing-table.md` and reuse the agents / skills mapped there instead of inventing new ones.
3. Respect every numbered invariant in `.claude/docs/INVARIANTS.md` — refer to them by number in the plan.

## Required plan shape

Return a short, scannable plan — bullets only, no prose paragraphs:

- **Requirements touched** — list of FR numbers from `REQUIREMENTS.md` the work covers.
- **Files** — each file to add/modify with a one-line role (endpoint / service / DTO / entity / migration / component / test).
- **Build order** — numbered steps, smallest viable vertical slice first.
- **Testing approach** — unit + integration + E2E coverage path to the 80% minimum (`common/testing.md`); name the xUnit / Vitest / Playwright targets.
- **Routing** — which agent + skills from the Task Routing table will execute each phase.
- **Open questions** — anything that blocks the plan; do NOT guess. If the feature doesn't fit the routing table, invoke the Fallback rule and stop.

Keep the final output tight. Planning is a trigger for work, not a design doc.
