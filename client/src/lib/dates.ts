const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Compute days remaining from now until dueAt.
 * Uses Math.floor so "14 days and 23 hours" = 14, not 15.
 * Returns 0 on the last day, negative when overdue.
 */
export function daysRemaining(dueAt: string): number {
  return Math.floor((new Date(dueAt).getTime() - Date.now()) / MS_PER_DAY)
}
