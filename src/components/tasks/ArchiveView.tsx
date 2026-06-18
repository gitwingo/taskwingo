import React, { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Task } from '../../types'
import { format } from 'date-fns'

interface Props {
  profileId: number
  onClose: () => void
}

export default function ArchiveView({ profileId, onClose }: Props) {
  const { upsertTask } = useAppStore()
  const [archived, setArchived] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const data = await window.electronAPI.tasks.getArchived(profileId)
    setArchived(data.map((t: any) => ({ ...t, tags: JSON.parse(t.tags || '[]'), subtasks: t.subtasks || [] })))
    setLoading(false)
  }

  useEffect(() => { load() }, [profileId])

  const handleUnarchive = async (id: number) => {
    const result = await window.electronAPI.tasks.unarchive(id)
    if (result) {
      upsertTask({ ...result, tags: JSON.parse(result.tags || '[]'), subtasks: result.subtasks || [] })
      setArchived(prev => prev.filter(t => t.id !== id))
    }
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.tasks.delete(id)
    setArchived(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 540, padding: 0, overflow: 'hidden', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>📦 Archived Tasks</h2>
          <button onClick={onClose} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : archived.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No archived tasks</div>
              <div className="empty-state-desc">Tasks you archive will appear here. You can restore or permanently delete them.</div>
            </div>
          ) : archived.map(task => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius)', marginBottom: 6
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Archived {format(new Date(task.updated_at * 1000), 'MMM d, yyyy')}
                  {' · '}{task.priority} priority
                </div>
              </div>
              <button
                onClick={() => handleUnarchive(task.id)}
                title="Restore task"
                style={{ padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 500, background: 'var(--accent-subtle)', color: 'var(--text-accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}
              >Restore</button>
              <button
                onClick={() => handleDelete(task.id)}
                title="Delete permanently"
                style={{ padding: '4px 8px', borderRadius: 'var(--radius)', fontSize: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
