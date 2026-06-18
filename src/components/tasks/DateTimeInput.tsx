import React, { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { useProfileSettings } from '../../hooks/useProfileSettings'

interface DateTimeInputProps {
  value: string // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
}

// Same fix as DateInput.tsx — the native input is hidden via `opacity: 0`
// (suppressing its entire rendered layer: text, segment highlights, caret)
// rather than `color: transparent`, which only hid the text and left the
// per-segment focus highlight visibly drawn on top of the format-aware
// overlay. The overlay also draws its own clock icon to stand in for the
// native picker-indicator, which opacity:0 hides along with everything
// else on the input; clicks on it still reach the real native input
// underneath and open the real picker.
export default function DateTimeInput({ value, onChange }: DateTimeInputProps) {
  const { dateFormat } = useProfileSettings()
  const [focused, setFocused] = useState(false)

  const displayText = value ? formatLocalDateTimeString(value, dateFormat) : ''

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="datetime-local"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 1, margin: 0, padding: '0 12px',
          border: 'none', background: 'transparent'
        }}
      />
      <div style={{
        padding: '8px 12px', borderRadius: 'var(--radius)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: focused ? '0 0 0 3px var(--accent-subtle)' : 'none',
        background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        fontSize: 13, color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        whiteSpace: 'nowrap', overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        pointerEvents: 'none',
        minHeight: 18
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayText || 'Select date & time…'}</span>
        <span style={{ fontSize: 13, opacity: 0.7, flexShrink: 0 }}>🕐</span>
      </div>
    </div>
  )
}

// Formats a "YYYY-MM-DDTHH:mm" string using the app's chosen DateFormat
// pattern plus a fixed 12-hour clock suffix, reading all components as
// LOCAL time (no UTC conversion pitfalls — these are plain integer splits).
function formatLocalDateTimeString(value: string, pattern: string): string {
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return ''
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, mins] = timePart.split(':').map(Number)
  if (!year || !month || !day) return ''
  const d = new Date(year, month - 1, day, hours, mins)
  return formatDate(d, `${pattern} · h:mm a`)
}
