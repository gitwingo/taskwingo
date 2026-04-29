import React, { useState, useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import ProfileAvatar from '../profiles/ProfileAvatar'

export default function Sidebar() {
  const {
    profiles, setProfiles, activeProfileId, setActiveProfileId,
    setProfileModalOpen, setEditingProfileId,
    setSettingsOpen, setAboutOpen,
    unlockedProfiles, lockProfile
  } = useAppStore()

  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const handleDragStart = (index: number) => { dragIndex.current = index }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); setDragOver(index)
  }

  // Fix #2: persist new order to DB
  const handleDrop = async (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) {
      setDragOver(null); dragIndex.current = null; return
    }
    const reordered = [...profiles]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(index, 0, moved)
    setProfiles(reordered)
    setDragOver(null); dragIndex.current = null

    // Persist new sort_order to DB
    const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i }))
    try { await window.electronAPI.profiles.reorder(updates) } catch {}
  }

  return (
    <div style={{
      width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
          padding: '4px 8px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>Profiles</span>
          <button title="New profile"
            onClick={() => { setEditingProfileId(null); setProfileModalOpen(true) }}
            style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 14, cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-muted)', transition: 'background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >+</button>
        </div>

        {profiles.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No profiles yet</div>
        ) : (
          profiles.map((profile, index) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              index={index}
              isActive={profile.id === activeProfileId}
              isLocked={!!profile.pin_hash && !unlockedProfiles.has(profile.id)}
              isDragOver={dragOver === index}
              onClick={() => setActiveProfileId(profile.id)}
              onEdit={() => setEditingProfileId(profile.id)}
              onLock={() => lockProfile(profile.id)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragOver(null); dragIndex.current = null }}
            />
          ))
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px' }}>
        <NavBtn icon="⚙" label="Settings" onClick={() => setSettingsOpen(true)} />
        <NavBtn icon="✦" label="About" onClick={() => setAboutOpen(true)} />
      </div>
    </div>
  )
}

function ProfileRow({ profile, index, isActive, isLocked, isDragOver, onClick, onEdit, onLock, onDragStart, onDragOver, onDrop, onDragEnd }: {
  profile: any; index: number; isActive: boolean; isLocked: boolean; isDragOver: boolean
  onClick: () => void; onEdit: () => void; onLock: () => void
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void; onDragEnd: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        background: isActive ? 'var(--accent-subtle)' : isDragOver ? 'var(--bg-hover)' : hovered ? 'var(--bg-hover)' : 'transparent',
        border: isActive ? '1px solid rgba(99,102,241,0.2)' : isDragOver ? '1px dashed var(--accent)' : '1px solid transparent',
        transition: 'background 0.15s', marginBottom: 2, opacity: isDragOver ? 0.7 : 1
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: hovered ? 0.6 : 0, cursor: 'grab', flexShrink: 0, transition: 'opacity 0.15s', userSelect: 'none' }}>⠿</div>
      <ProfileAvatar profile={profile} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--text-accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.name}
        </div>
      </div>
      {hovered ? (
        <div style={{ display: 'flex', gap: 2 }}>
          {profile.pin_hash && (
            <ActionBtn title={isLocked ? 'Locked' : 'Lock'} onClick={e => { e.stopPropagation(); onLock() }}>🔒</ActionBtn>
          )}
          <ActionBtn title="Edit" onClick={e => { e.stopPropagation(); onEdit() }}>✎</ActionBtn>
        </div>
      ) : (
        isLocked && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔒</span>
      )}
    </div>
  )
}

function ActionBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 4, fontSize: 11, cursor: 'pointer',
      background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)'
    }}>{children}</button>
  )
}

function NavBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        color: hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: 'none', fontSize: 13, transition: 'background 0.15s, color 0.15s', marginBottom: 2
      }}>
      <span style={{ fontSize: 13 }}>{icon}</span>{label}
    </button>
  )
}
