import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { Theme, DateFormat } from '../types'

const DEFAULT_THEME: Theme = 'dark'
const DEFAULT_DATE_FORMAT: DateFormat = 'MMM d, yyyy'

// Theme and date format used to live in localStorage as global app state,
// shared across every profile — switching profiles never changed them.
// They now live on the profiles table instead (see migration v4), exactly
// like accent_color and auto_lock_minutes already did. This hook is the
// single place that reads/writes them, so every screen that needs a
// profile's theme or date format goes through the same logic and there's
// no risk of one component reading a stale global value while another
// reads the per-profile one.
//
// Both setters apply instantly — there's no separate "Save" step, since a
// preference toggle that silently does nothing until a button is pressed
// is confusing. They also update local UI immediately (optimistic) before
// the DB write resolves, so the picker reacts the moment it's clicked.
export function useProfileSettings() {
  const { profiles, activeProfileId, upsertProfile } = useAppStore()
  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null

  const theme: Theme = (activeProfile?.theme as Theme) ?? DEFAULT_THEME
  const dateFormat: DateFormat = (activeProfile?.date_format as DateFormat) ?? DEFAULT_DATE_FORMAT

  const setTheme = useCallback(async (next: Theme) => {
    if (!activeProfile) return
    // Optimistic local update so the UI reacts immediately
    upsertProfile({ ...activeProfile, theme: next })
    const result = await window.electronAPI.profiles.update(activeProfile.id, { theme: next })
    if (result) upsertProfile({ ...result, links: JSON.parse(result.links || '[]') })
  }, [activeProfile, upsertProfile])

  const setDateFormat = useCallback(async (next: DateFormat) => {
    if (!activeProfile) return
    upsertProfile({ ...activeProfile, date_format: next })
    const result = await window.electronAPI.profiles.update(activeProfile.id, { date_format: next })
    if (result) upsertProfile({ ...result, links: JSON.parse(result.links || '[]') })
  }, [activeProfile, upsertProfile])

  return { theme, setTheme, dateFormat, setDateFormat, activeProfile }
}
