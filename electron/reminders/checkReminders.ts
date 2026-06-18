import { Notification } from 'electron'
import { join } from 'path'
import { getDb } from '../db/index'

// Centralized reminder + deadline notification checker.
//
// Previously this logic lived in the renderer (TaskList.tsx), scoped to
// whichever single profile was currently selected — only one <TaskList>
// is ever mounted at a time (see App.tsx), so reminders for every OTHER
// profile silently stopped being checked the moment you switched away
// from them. Moving this entirely into the main process fixes that: it
// queries the database directly across ALL profiles, completely
// independent of which profile (if any) is currently selected in the UI,
// and independent of whether a renderer window is even visible — it'll
// keep working while minimized to tray, mid-navigation, or before the
// renderer has finished loading.
//
// This also means the renderer's copy of this logic (in TaskList.tsx)
// should be removed once this is wired in, to avoid duplicate
// notifications firing for the currently-selected profile.

interface TaskRow {
  id: number
  profile_id: number
  title: string
  status: string
  deadline: number | null
  reminder_at: number | null
  archived: number
}

interface ProfileRow {
  id: number
  name: string
}

const CHECK_INTERVAL_MS = 10_000 // check every 10s so reminders fire within ≤10s of their scheduled time
const REMINDER_WINDOW_SECONDS = 60   // fire once reminder_at is within this many seconds of "now"
const DEADLINE_WINDOW_SECONDS = 3600 // notify once when a deadline is within this many seconds of "now"

// Persists for the lifetime of the app process — same purpose as the
// renderer's old `notified` Set, just living somewhere that isn't torn
// down by component mount/unmount or profile switches.
const notified = new Set<string>()

let intervalHandle: ReturnType<typeof setInterval> | null = null

function runCheck(): void {
  let db
  try {
    db = getDb()
  } catch {
    // Database not initialized yet (e.g. this fires before initDatabase()
    // completes) — skip silently, the next interval tick will retry.
    return
  }

  const now = Math.floor(Date.now() / 1000)

  let tasks: TaskRow[]
  let profiles: ProfileRow[]
  try {
    // Single query across every profile, not scoped to any one of them —
    // this is the actual fix. `archived = 0` matches what the renderer
    // already filters out via tasks:get-all, so archived tasks don't
    // generate reminders the user can no longer easily act on from the
    // main task list.
    tasks = db.prepare(`
      SELECT id, profile_id, title, status, deadline, reminder_at, archived
      FROM tasks
      WHERE status != 'done' AND archived = 0 AND (reminder_at IS NOT NULL OR deadline IS NOT NULL)
    `).all() as TaskRow[]
    profiles = db.prepare('SELECT id, name FROM profiles').all() as ProfileRow[]
  } catch (e: any) {
    console.error('[ReminderChecker] Query failed:', e.message)
    return
  }

  const profileNameById = new Map(profiles.map(p => [p.id, p.name]))

  for (const t of tasks) {
    const profileName = profileNameById.get(t.profile_id) ?? 'Unknown profile'

    if (t.reminder_at) {
      const diff = t.reminder_at - now
      const key = `reminder-${t.id}-${t.reminder_at}`
      // Bug fixed here: the old condition `diff >= 0 && diff < WINDOW`
      // fires as soon as `reminder_at` is anywhere up to a full WINDOW
      // (60s) in the FUTURE — meaning a reminder could trigger up to a
      // minute early, depending on where the 60-second check tick happens
      // to land relative to the reminder's exact second (ticks aren't
      // aligned to any particular reminder; they just run every 60s from
      // whenever the app started). The fix only looks at times that have
      // already arrived: `diff <= 0` means reminder_at is now or in the
      // past. The lower bound (`-WINDOW`) exists purely as a safety net in
      // case the app was asleep/minimized and missed a tick or two, so a
      // reminder that just passed still gets caught on the next check
      // rather than being silently skipped forever — it does NOT make the
      // notification arrive early, since it only matches times that have
      // already happened.
      if (diff <= 0 && diff > -REMINDER_WINDOW_SECONDS && !notified.has(key)) {
        notified.add(key)
        sendNotification(
          `⏰ Reminder: ${t.title}`,
          `${profileName} · ${t.deadline ? `Due ${new Date(t.deadline * 1000).toLocaleDateString()}` : 'Task reminder'}`
        )
      }
    }

    if (t.deadline) {
      const diff = t.deadline - now
      const key = `deadline-${t.id}-${t.deadline}`
      if (diff >= 0 && diff < DEADLINE_WINDOW_SECONDS && !notified.has(key)) {
        notified.add(key)
        sendNotification(
          `📅 Deadline approaching: ${t.title}`,
          `${profileName} · Due in less than 1 hour — ${new Date(t.deadline * 1000).toLocaleTimeString()}`
        )
      }
    }
  }
}

function sendNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return
  // Matches the icon path used by the existing `notify:send` IPC handler
  // in main.ts. Both this file and main.ts get bundled into the same
  // out/main/main.js output by electron-vite (single-entry bundling, not
  // a separate file per source module), so __dirname resolves identically
  // here as it does there — same relative path is correct without
  // adjustment.
  new Notification({ title, body, icon: join(__dirname, '../renderer/logo.ico') }).show()
}

// Starts the centralized checker. Call once during app startup, after
// initDatabase() has run. Safe to call only once — calling it again
// without stopReminderChecker() first would create a second interval
// ticking in parallel.
export function startReminderChecker(): void {
  if (intervalHandle) return // already running

  // Align the first tick to the next 10-second boundary of the wall clock.
  // Without this, the interval starts from app launch time and can fire up
  // to CHECK_INTERVAL_MS late depending on when the user opened the app.
  // e.g. app starts at 4:48:53 → first aligned tick at 4:49:00 → then
  // 4:49:10, 4:49:20 … so any reminder fires within at most 10 seconds.
  const msUntilNextBoundary = CHECK_INTERVAL_MS - (Date.now() % CHECK_INTERVAL_MS)
  setTimeout(() => {
    runCheck()
    intervalHandle = setInterval(runCheck, CHECK_INTERVAL_MS)
  }, msUntilNextBoundary)
}

export function stopReminderChecker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
