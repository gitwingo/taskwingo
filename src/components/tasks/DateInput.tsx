import React, { useState } from 'react'
import { format as formatDate } from 'date-fns'
import { useProfileSettings } from '../../hooks/useProfileSettings'

interface DateInputProps {
  value: string // "YYYY-MM-DD" or ""
  onChange: (value: string) => void
}

// Native <input type="date"> renders its displayed text in whatever format
// the OS locale dictates, with no placeholder/CSS/JS override available —
// that's the root cause of the date format setting having no visible effect
// on these fields.
//
// First attempt at fixing this only set `color: transparent` on the native
// input, which hides the *text* but not Chromium's internal per-segment
// highlight (the blue box drawn behind the currently-focused mm/dd/yyyy
// segment) — that highlight is painted independently of the `color`
// property, which is exactly the bug visible in testing: clicking into the
// field showed the native "yyyy" segment highlighted right on top of the
// "Select a date" overlay text.
//
// Fix: use `opacity: 0` instead, which suppresses the input's entire
// rendered layer — text, segment highlights, caret, everything — not just
// one CSS-paintable property. The native input still receives focus,
// clicks, keyboard input, and opens its calendar popup; it just paints
// nothing. Because opacity:0 also hides the input's own border/background,
// the overlay below now owns all visible chrome (border, background, focus
// ring) so the field doesn't look broken when empty or unfocused.
export default function DateInput({ value, onChange }: DateInputProps) {
  const { dateFormat } = useProfileSettings()
  const [focused, setFocused] = useState(false)

  const displayText = value ? formatLocalDateString(value, dateFormat) : ''

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, // hides the entire native rendering layer, not just text
          cursor: 'pointer', zIndex: 1, margin: 0, padding: '0 12px',
          border: 'none', background: 'transparent'
        }}
      />
      {/* This div is now the only thing actually visible — border,
          background, focus ring, and the format-aware text all live here.
          pointerEvents: none lets every click/keypress pass straight
          through to the native input positioned on top of it.
          A drawn calendar icon replaces the native one on the right edge —
          opacity:0 on the input above hides its real picker-indicator icon
          too (it's a pseudo-element of that same input, so opacity cascades
          to it), so this is purely a visual stand-in. Clicking it still
          opens the real picker, since the click lands on the real native
          input occupying the exact same screen position underneath. */}
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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayText || 'Select a date…'}</span>
        <span style={{ fontSize: 13, opacity: 0.7, flexShrink: 0 }}>📅</span>
      </div>
    </div>
  )
}

// Formats a "YYYY-MM-DD" string using the app's chosen DateFormat pattern,
// constructing the Date via (year, monthIndex, day) so it's always read as
// a LOCAL calendar date — same fix already applied in utils/date.ts to
// avoid the off-by-one-day UTC parsing bug.
function formatLocalDateString(dateStr: string, pattern: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return ''
  return formatDate(new Date(year, month - 1, day), pattern)
}
