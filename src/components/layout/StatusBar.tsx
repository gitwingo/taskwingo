import React from 'react'
import { useAppStore } from '../../store/appStore'

export default function StatusBar() {
  const { tasks, activeProfileId } = useAppStore()
  const profileTasks = tasks.filter(t => t.profile_id === activeProfileId)
  const done = profileTasks.filter(t => t.status === 'done').length
  const urgent = profileTasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length

  return (
    <div style={{
      height: 24,
      background: 'var(--titlebar-bg)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      fontSize: 11,
      color: 'var(--text-muted)',
      flexShrink: 0
    }}>
      <span>{profileTasks.length} tasks</span>
      <span>{done} completed</span>
      {urgent > 0 && (
        <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ {urgent} urgent</span>
      )}
    </div>
  )
}
