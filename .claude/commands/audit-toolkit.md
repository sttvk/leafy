---
description: Diff the toolkit catalog + routing table against live installed skills/agents and reconcile
argument-hint: [--dry-run]
---

# /audit-toolkit

This command keeps `.claude/hooks/lib/toolkit-catalog.md` and the `## Task Routing` table in `CLAUDE.md` in sync with reality. Run it whenever you install or uninstall a plugin, or when the SessionStart staleness reminder fires.

This is a **META** command. It operates on `.claude/` and `CLAUDE.md` only. It does **not** dispatch workers and must not touch `src/`, `client/`, `tests/`, `azure/`, or `.github/`. The Team Lead enforcer hook will block any stray edit.

## Step 1: Enumerate what's actually installed

Read the session-start system-reminder at the top of this conversation. It lists every skill (project + plugin) and every `subagent_type` the `Agent` tool can dispatch. **This is the live ground truth.** Do not guess — only use names that appear in the reminder.

Also enumerate the filesystem via the Bash tool:

```bash
ls .claude/skills/   2>/dev/null
ls .claude/agents/   2>/dev/null
ls .claude/rules/    2>/dev/null
ls .claude/commands/ 2>/dev/null
```

## Step 2: Read the catalog

Read `.claude/hooks/lib/toolkit-catalog.md`. Extract every skill name, agent name, rules-file path, and doc path mentioned. Keep a simple set of "cataloged names".

## Step 3: Read the routing table

Read `.claude/hooks/lib/routing-table.md`. Extract every name appearing in the **Project skills**, **Plugin skills**, and **Post-impl agents** columns across all rows.

## Step 4: Compute four diffs

Produce a scratchpad in your head (or as a brief text block):

**Diff A — Additions** (in live env, not in catalog):
Everything in the system-reminder whose name is not cataloged. These are candidates to add.

**Diff B — Stale entries** (in catalog, not in live env):
Catalog names that no longer appear in the system-reminder. These may be renamed, uninstalled, or temporarily unloaded — do NOT remove without asking.

**Diff C — Broken routing refs** (routing table names a skill/agent that doesn't exist):
Any name in the routing table that isn't in the live env. These are bugs — the routing table is telling workers to call something that was removed.

**Diff D — Uncataloged project files** (filesystem, not in catalog):
Files in `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, `.claude/commands/` whose name doesn't appear in the catalog. These are project-level adds the user made since the last audit.

## Step 5: Present the diff

Format as a compact report the user can scan in 10 seconds:

```
=== Toolkit audit — <today's date> ===
Live skills: <N>  |  Cataloged: <M>  |  Routing refs: <R>

── Additions proposed (+) ──
  + superpowers:new-thing             (plugin skill — needs section + routing row(s))
  + .claude/skills/my-new-skill/      (project skill — needs section + description)
  + .claude/rules/new-pattern.md      (project rule — needs section cross-ref)

── Stale entries (?) ──
  ? old-plugin:thing                  (uninstalled? renamed? please confirm)

── Broken routing refs (!) ──
  ! Row "Implement React page" → names "old-skill" which no longer exists

── Uncataloged files (+fs) ──
  +fs .claude/commands/new-command.md
```

If `$ARGUMENTS` contains `--dry-run`, stop here. Do not apply anything. The user reviews and re-runs without the flag.

## Step 6: Apply changes (user approval required, one group at a time)

For each group, ask the user to confirm before touching files. Never batch-apply without explicit approval.

### For additions (Diff A + Diff D)
For each new item, ask exactly these three questions:

1. **Which catalog section?** — list the sections in `toolkit-catalog.md` (Planning, .NET backend, React frontend, Database, Auth, Azure/deploy, Testing, AI features, Code review, Debugging, Meta). User picks one or more.
2. **Which routing table row(s), if any?** — list the rows from `.claude/hooks/lib/routing-table.md`. User picks none, one, or several. For each, also ask which column: Project skills / Plugin skills / Post-impl agents.
3. **One-line description** — ≤15 words, "what it does + when to fire".

Then apply: insert the entry into the catalog section(s), add to the routing row cell(s), alphabetize within the cell.

### For stale entries (Diff B)
For each stale name, ask:

1. Remove from catalog? (y/n)
2. Remove from routing rows that reference it? (y/n)

Do NOT auto-remove. A plugin that failed to load temporarily will produce false staleness. If the live env has >20% fewer skills than the cataloged count, **warn loudly** and suggest the user re-run after restarting Claude Code before deleting anything.

### For broken routing refs (Diff C)
For each broken row, ask:

1. What should replace it? (user may name a live skill, or say "remove")
2. Apply the replacement.

## Step 7: Touch the catalog + report

After all changes are applied, the catalog file's mtime is already updated by the write. This automatically resets the SessionStart staleness timer — no separate timestamp file needed.

Report in ≤6 lines:
- Additions applied: <N>
- Stale entries removed: <N>
- Broken refs fixed: <N>
- New skills now available for dispatch: <comma list>
- Files modified: `.claude/hooks/lib/toolkit-catalog.md`, `CLAUDE.md`

## Important

- **Never edit `src/`, `client/`, `tests/`, `azure/`, `.github/`** — the Team Lead enforcer hook will block you anyway, but don't try.
- **Use the system-reminder as ground truth** for installed skills/agents. The filesystem only tells you about *project* additions, not plugin additions.
- **Ask before removing.** Plugins can be transiently unloaded. False positives are worse than stale entries.
- **Respect the catalog's curation philosophy:** 3-6 items per section, not 15. If a new skill fits 4 sections, pick the 1-2 where it's most useful.
- **Do not add entries to the routing table "Post-impl agents" column** without clear reasoning — that column is a quality gate, not a wish list.
