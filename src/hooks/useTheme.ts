import { useProfileSettings } from './useProfileSettings'
import { Theme } from '../types'

// Theme moved from global app state (localStorage, shared across all
// profiles) to a per-profile setting on the profiles table — see
// useProfileSettings for the full rationale. This hook is kept around as a
// thin convenience wrapper for any future component that wants a
// toggle-through-themes button, now correctly scoped to the active profile.
export function useTheme() {
  const { theme, setTheme } = useProfileSettings()

  const toggleTheme = () => {
    const cycle: Theme[] = ['dark', 'light', 'night', 'summer']
    const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length]
    setTheme(next)
  }

  return { theme, setTheme, toggleTheme }
}
