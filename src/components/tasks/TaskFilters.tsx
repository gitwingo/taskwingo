import React from 'react'
import { useAppStore } from '../../store/appStore'
import { Priority, TaskStatus } from '../../types'

export default function TaskFilters({ profileId }: { profileId?: number }) {
  const { filters, setFilters, projects } = useAppStore()
  const profileProjects = profileId ? projects.filter(p => p.profile_id === profileId) : []

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 10, flexWrap: 'wrap' }}>
      <input type="text" placeholder="Search tasks…" value={filters.search} onChange={e => setFilters({ search: e.target.value })}
        style={{ padding: '5px 10px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 170 }} />

      <select value={filters.priority} onChange={e => setFilters({ priority: e.target.value as Priority | 'all' })}
        style={{ padding: '5px 9px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        <option value="all">All Priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select value={filters.status} onChange={e => setFilters({ status: e.target.value as TaskStatus | 'all' })}
        style={{ padding: '5px 9px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        <option value="all">All Statuses</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      {profileProjects.length > 0 && (
        <select value={String(filters.projectId)} onChange={e => setFilters({ projectId: e.target.value === 'all' ? 'all' : e.target.value === 'none' ? 'none' : Number(e.target.value) })}
          style={{ padding: '5px 9px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="all">All Projects</option>
          <option value="none">No Project</option>
          {profileProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      <select value={`${filters.sortBy}:${filters.sortDir}`} onChange={e => { const [sortBy, sortDir] = e.target.value.split(':') as any; setFilters({ sortBy, sortDir }) }}
        style={{ padding: '5px 9px', fontSize: 13, borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        <option value="sort_order:asc">Manual Order</option>
        <option value="priority:desc">Priority ↓</option>
        <option value="deadline:asc">Deadline ↑</option>
        <option value="created_at:desc">Newest First</option>
        <option value="created_at:asc">Oldest First</option>
      </select>

      {(filters.search || filters.priority !== 'all' || filters.status !== 'all' || filters.projectId !== 'all') && (
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search: '', priority: 'all', status: 'all', sortBy: 'sort_order', sortDir: 'asc', projectId: 'all' })}>Clear</button>
      )}
    </div>
  )
}
