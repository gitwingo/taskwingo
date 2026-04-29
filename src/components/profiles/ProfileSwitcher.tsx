import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import ProfileAvatar from './ProfileAvatar'

export default function ProfileSwitcher() {
  const { profiles, activeProfileId, setActiveProfileId, setEditingProfileId } = useAppStore()
  const [open, setOpen] = useState(false)
  const active = profiles.find(p => p.id === activeProfileId)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: 13
        }}
      >
        {active && <ProfileAvatar profile={active} size={20} />}
        <span>{active?.name ?? 'Select Profile'}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▾</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            minWidth: 180,
            padding: 4
          }}>
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => { setActiveProfileId(p.id); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 4,
                  background: p.id === activeProfileId ? 'var(--accent-subtle)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: 13
                }}
                onMouseEnter={e => { if (p.id !== activeProfileId) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (p.id !== activeProfileId) (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <ProfileAvatar profile={p} size={20} />
                {p.name}
                {p.id === activeProfileId && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>✓</span>}
              </button>
            ))}
            <div className="divider" />
            <button
              onClick={() => { setEditingProfileId(null); useAppStore.getState().setProfileModalOpen(true); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 10px', borderRadius: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 13
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              + New Profile
            </button>
          </div>
        </>
      )}
    </div>
  )
}
