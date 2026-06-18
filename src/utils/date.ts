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

// Converts a "YYYY-MM-DD" date-only string (from an <input type="date">) to a
// Unix timestamp representing LOCAL midnight on that calendar day.
//
// Bug this fixes: `new Date("2026-06-20")` is parsed as UTC midnight, not
// local midnight. For any timezone behind UTC, converting that instant back
// to a local date lands on the previous day — a one-day-early deadline.
// Splitting the string and constructing the Date with the (year, monthIndex,
// day) constructor forces the LOCAL timezone instead.
export function toTimestamp(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  return Math.floor(new Date(year, month - 1, day).getTime() / 1000)
}

// Inverse of toTimestamp — formats a Unix timestamp back into "YYYY-MM-DD"
// using LOCAL date components (not toISOString, which is UTC and re-introduces
// the same one-day shift when the local timezone is behind UTC).
export function fromTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Converts a "YYYY-MM-DDTHH:mm" datetime-local string (already local time by
// spec) to a Unix timestamp. datetime-local inputs don't have the date-only
// UTC-parsing pitfall that plain date strings do, but we centralize this here
// so reminder_at and deadline use one consistent conversion path.
export function toTimestampFromDatetimeLocal(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000)
}

// Inverse — formats a Unix timestamp as "YYYY-MM-DDTHH:mm" for a
// datetime-local input, using local time components.
export function fromTimestampToDatetimeLocal(ts: number): string {
  const d = new Date(ts * 1000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${mins}`
}
