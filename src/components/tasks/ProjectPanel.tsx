import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Project } from '../../types'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6']

interface Props { profileId: number; onClose: () => void }

export default function ProjectPanel({ profileId, onClose }: Props) {
  const { projects, upsertProject, removeProject, setFilters, filters } = useAppStore()
  const profileProjects = projects.filter(p => p.profile_id === profileId)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const createProject = async () => {
    if (!newName.trim()) return
    const result = await window.electronAPI.projects.create({ profile_id: profileId, name: newName.trim(), color: newColor })
    if (result) upsertProject(result)
    setNewName(''); setNewColor(COLORS[0])
  }

  const deleteProject = async (id: number) => {
    await window.electronAPI.projects.delete(id)
    removeProject(id)
    if (filters.projectId === id) setFilters({ projectId: 'all' })
  }

  const saveEdit = async (id: number, color: string) => {
    const result = await window.electronAPI.projects.update(id, { name: editName.trim(), color })
    if (result) upsertProject(result)
    setEditingId(null)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: 420, padding: 0 }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Manage Projects</h2>
          <button onClick={onClose} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {profileProjects.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '12px 0 16px' }}>No projects yet — create one below</div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {profileProjects.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  {editingId === p.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(p.id, p.color)}
                      style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 13 }} autoFocus />
                  ) : (
                    <span onClick={() => setFilters({ projectId: filters.projectId === p.id ? 'all' : p.id })}
                      style={{ flex: 1, fontSize: 13, cursor: 'pointer', color: filters.projectId === p.id ? 'var(--text-accent)' : 'var(--text-primary)', fontWeight: filters.projectId === p.id ? 600 : 400 }}>
                      {p.name}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {editingId === p.id
                      ? <button onClick={() => saveEdit(p.id, p.color)} className="btn btn-primary btn-sm">Save</button>
                      : <button onClick={() => { setEditingId(p.id); setEditName(p.name) }} style={{ fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)', padding: '2px 5px' }}>✎</button>
                    }
                    <button onClick={() => deleteProject(p.id)} style={{ fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', color: '#ef4444', padding: '2px 5px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fix #4: new project row — stacked layout so Add button is always visible */}
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', padding: '12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>New Project</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name"
              onKeyDown={e => e.key === 'Enter' && createProject()}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />
            {/* Color row + button — both on same line, always visible */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{
                    width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: newColor === c ? '2.5px solid white' : '2px solid transparent',
                    outline: newColor === c ? `2px solid ${c}` : 'none', flexShrink: 0
                  }} />
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={createProject} style={{ flexShrink: 0 }}>+ Add Project</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
