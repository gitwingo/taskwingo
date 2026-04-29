import { format, formatDistanceToNow, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns'

export function formatDeadline(timestamp: number | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return `Overdue · ${format(date, 'MMM d')}`
  if (isThisWeek(date)) return format(date, 'EEEE')
  return format(date, 'MMM d, yyyy')
}

export function deadlineStatus(timestamp: number | null): 'overdue' | 'today' | 'soon' | 'normal' | null {
  if (!timestamp) return null
  const date = new Date(timestamp * 1000)
  if (isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  if (isTomorrow(date)) return 'soon'
  return 'normal'
}

export function toTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000)
}

export function fromTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0]
}
