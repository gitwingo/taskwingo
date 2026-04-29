import { useAppStore } from '../store/appStore'
import { Theme } from '../types'

export function useTheme() {
  const { theme, setTheme } = useAppStore()

  const toggleTheme = () => {
    const cycle: Theme[] = ['dark', 'light', 'ghibli', 'summer']
    const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length]
    setTheme(next)
  }

  return { theme, setTheme, toggleTheme }
}
