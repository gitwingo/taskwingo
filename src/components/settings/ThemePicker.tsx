import React from 'react'
import { useAppStore } from '../../store/appStore'
import { Theme } from '../../types'

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'dark', label: 'Dark', color: '#1a1a1e' },
  { id: 'light', label: 'Light', color: '#f0f0f6' },
  { id: 'ghibli', label: 'Ghibli', color: '#1e2535' },
  { id: 'summer', label: 'Summer', color: '#ffe4d4' }
]

export default function ThemePicker() {
  const { theme, setTheme } = useAppStore()

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: t.color,
            border: `2.5px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer',
            transition: 'border-color 0.15s'
          }}
        />
      ))}
    </div>
  )
}
