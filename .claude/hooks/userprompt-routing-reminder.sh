#!/usr/bin/env bash
# Injected on every user prompt. Reminds Claude to consult the routing table
# and ask when nothing matches instead of guessing an agent.
echo 'REMINDER: Check the routing table at .claude/hooks/lib/routing-table.md. If no row matches this request, ASK the user before proceeding — do not guess. See CLAUDE.md §Team Lead Protocol.'
