import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { useProfileSettings } from '../../hooks/useProfileSettings'
import { Theme, DATE_FORMAT_OPTIONS } from '../../types'

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
  const { setSettingsOpen, setAboutOpen, upsertProfile } = useAppStore()
  const { theme, setTheme, dateFormat, setDateFormat, activeProfile } = useProfileSettings()

  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [checkForUpdates, setCheckForUpdates] = useState(true)
  const [appVersion, setAppVersion] = useState('')
  // Tiny per-control "saved" flash so clicking something gives feedback,
  // now that there's no single "Save Profile Settings" button left to do
  // that job for everything at once.
  const [flash, setFlash] = useState<string | null>(null)
  const showFlash = (key: string) => { setFlash(key); setTimeout(() => setFlash(prev => prev === key ? null : prev), 900) }

  useEffect(() => {
    window.electronAPI.prefs.getMinimizeToTray().then(setMinimizeToTray)
    window.electronAPI.prefs.getCheckForUpdates().then(setCheckForUpdates)
    window.electronAPI.app.getVersion().then(setAppVersion)
  }, [])

  // Accent color: applies the CSS variables instantly for zero-lag feedback,
  // then persists to the active profile's row in the database. Previously
  // this only updated local state/CSS and relied on a separate "Save"
  // button to actually write it to disk — meaning a click here that wasn't
  // followed by Save was silently lost on next launch.
  const applyAccent = async (color: string) => {
    if (!activeProfile) return
    document.documentElement.style.setProperty('--accent', color)
    document.documentElement.style.setProperty('--accent-subtle', color + '22')
    document.documentElement.style.setProperty('--text-accent', color)
    upsertProfile({ ...activeProfile, accent_color: color })
    showFlash('accent')
    const result = await window.electronAPI.profiles.update(activeProfile.id, { accent_color: color })
    if (result) upsertProfile({ ...result, links: JSON.parse(result.links || '[]') })
  }

  const applyAutoLock = async (minutes: number) => {
    if (!activeProfile) return
    upsertProfile({ ...activeProfile, auto_lock_minutes: minutes })
    showFlash('autolock')
    const result = await window.electronAPI.profiles.update(activeProfile.id, { auto_lock_minutes: minutes })
    if (result) upsertProfile({ ...result, links: JSON.parse(result.links || '[]') })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal-box" style={{ width: 480, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>
            Settings
            {activeProfile && (
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                for {activeProfile.name}
              </span>
            )}
          </h2>
          <button onClick={() => setSettingsOpen(false)} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ padding: '18px 20px', maxHeight: '75vh', overflowY: 'auto' }}>
          {!activeProfile ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-state-title">No profile selected</div>
              <div className="empty-state-desc">Theme, date format, and auto-lock are set per profile — select or create one first.</div>
            </div>
          ) : (
            <>
              {/* Theme */}
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Theme</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => { setTheme(t.id); showFlash('theme') }} style={{
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
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Accent Color</SectionLabel>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {ACCENT_COLORS.map(c => (
                    <button key={c.value} onClick={() => applyAccent(c.value)} title={c.label} style={{
                      width: 28, height: 28, borderRadius: '50%', background: c.value, cursor: 'pointer',
                      border: activeProfile.accent_color === c.value ? '2.5px solid white' : '2.5px solid transparent',
                      outline: activeProfile.accent_color === c.value ? `2px solid ${c.value}` : 'none',
                      transition: 'outline 0.15s'
                    }} />
                  ))}
                </div>
              </div>

              {/* Date Format */}
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Date Format</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {DATE_FORMAT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setDateFormat(opt.value); showFlash('dateformat') }} style={{
                      padding: '8px 10px', borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer',
                      border: `1.5px solid ${dateFormat === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: dateFormat === opt.value ? 'var(--accent-subtle)' : 'var(--bg-tertiary)'
                    }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: dateFormat === opt.value ? 'var(--text-accent)' : 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{opt.example}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-lock */}
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Auto-Lock After Idle</SectionLabel>
                <select value={activeProfile.auto_lock_minutes} onChange={e => applyAutoLock(Number(e.target.value))}
                  style={{ padding: '7px 10px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', width: '100%' }}>
                  <option value={0}>Never</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Automatically locks PIN-protected profiles after this period of inactivity.</div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
                {flash ? <span style={{ color: '#22c55e' }}>✓ Saved automatically</span> : <span>Changes above save automatically and only affect this profile.</span>}
              </div>
            </>
          )}

          {/* Window behavior — app-wide, not profile-scoped (process-level setting) */}
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>Window Behavior</SectionLabel>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={async (e) => {
                  const val = e.target.checked
                  setMinimizeToTray(val)
                  await window.electronAPI.prefs.setMinimizeToTray(val)
                }}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Keep running in the background</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  When on (default), the ✕ button minimizes Taskwingo to the system tray so reminders keep working. Turn off to fully quit on ✕ instead.
                </div>
              </div>
            </label>
          </div>

          {/* Updates — app-wide, not profile-scoped */}
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>Updates</SectionLabel>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={checkForUpdates}
                onChange={async (e) => {
                  const val = e.target.checked
                  setCheckForUpdates(val)
                  await window.electronAPI.prefs.setCheckForUpdates(val)
                }}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Check for updates on launch</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  When on (default), Taskwingo checks GitHub for a new release on startup and notifies you if one is available. Takes effect on next launch.
                </div>
              </div>
            </label>
            <div style={{ padding: '11px 13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>View all releases on GitHub</span>
              <button className="btn btn-ghost btn-sm" onClick={() => window.electronAPI.updates.openReleasesPage()}>View Releases →</button>
            </div>
          </div>

          {/* About shortcut */}
          <div style={{ padding: '11px 13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Taskwingo {appVersion ? `v${appVersion}` : ''}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSettingsOpen(false); setAboutOpen(true) }}>About & Credits →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
      {children}
    </div>
  )
}
