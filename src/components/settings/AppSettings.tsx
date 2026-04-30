import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Theme } from '../../types'

const THEMES: { id: Theme; label: string; desc: string; preview: string }[] = [
  { id: 'dark',   label: 'Dark',   desc: 'Easy on the eyes',  preview: 'linear-gradient(135deg,#0d0d0f,#1a1a1e)' },
  { id: 'light',  label: 'Light',  desc: 'Clean and bright',  preview: 'linear-gradient(135deg,#f8f8fc,#ffffff)' },
  { id: 'night', label: 'Night', desc: 'Soft midnight blue', preview: 'linear-gradient(135deg,#1a1f2e,#2e3a54)' },
  { id: 'summer', label: 'Summer', desc: 'Warm and energetic', preview: 'linear-gradient(135deg,#fff8f0,#ffe4d4)' }
]

const ACCENT_COLORS = [
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Green',   value: '#22c55e' },
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Cyan',    value: '#06b6d4' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Slate',   value: '#64748b' },
]

export default function AppSettings() {
  const { theme, setTheme, setSettingsOpen, setAboutOpen, activeProfileId, profiles, upsertProfile } = useAppStore()

  const activeProfile = profiles.find(p => p.id === activeProfileId)
  const [accentColor, setAccentColorState] = useState(activeProfile?.accent_color ?? '#6366f1')
  const [autoLock, setAutoLockState] = useState(activeProfile?.auto_lock_minutes ?? 0)
  const [saved, setSaved] = useState(false)

  const applyAccent = (color: string) => {
    setAccentColorState(color)
    // Apply immediately via CSS variable
    document.documentElement.style.setProperty('--accent', color)
    // hover handled via filter:brightness in CSS
    document.documentElement.style.setProperty('--accent-subtle', color + '22')
    document.documentElement.style.setProperty('--text-accent', color)
  }

  const saveProfileSettings = async () => {
    if (!activeProfileId) return
    const result = await window.electronAPI.profiles.update(activeProfileId, {
      accent_color: accentColor,
      auto_lock_minutes: autoLock
    })
    if (result) upsertProfile({ ...result, links: JSON.parse(result.links || '[]') })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal-box" style={{ width: 480, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Settings</h2>
          <button onClick={() => setSettingsOpen(false)} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ padding: '18px 20px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Theme */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)} style={{
                  border: `2px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer',
                  background: 'var(--bg-tertiary)', transition: 'border-color 0.15s', textAlign: 'left'
                }}>
                  <div style={{ height: 40, background: t.preview, borderBottom: `1px solid ${theme === t.id ? 'var(--accent)' : 'var(--border-subtle)'}` }} />
                  <div style={{ padding: '7px 10px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme === t.id ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                      {t.label}{theme === t.id && <span style={{ marginLeft: 5, fontSize: 10 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          {activeProfile && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Accent Color</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {ACCENT_COLORS.map(c => (
                  <button key={c.value} onClick={() => applyAccent(c.value)} title={c.label} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c.value, cursor: 'pointer',
                    border: accentColor === c.value ? '2.5px solid white' : '2.5px solid transparent',
                    outline: accentColor === c.value ? `2px solid ${c.value}` : 'none',
                    transition: 'outline 0.15s'
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Auto-lock */}
          {activeProfile && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Auto-Lock After Idle</div>
              <select value={autoLock} onChange={e => setAutoLockState(Number(e.target.value))}
                style={{ padding: '7px 10px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', width: '100%' }}>
                <option value={0}>Never</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Automatically locks PIN-protected profiles after this period of inactivity.</div>
            </div>
          )}

          {activeProfile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={saveProfileSettings}>
                {saved ? '✓ Saved' : 'Save Profile Settings'}
              </button>
            </div>
          )}

          {/* About shortcut */}
          <div style={{ padding: '11px 13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Taskwingo v1.0.0</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSettingsOpen(false); setAboutOpen(true) }}>About & Credits →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
