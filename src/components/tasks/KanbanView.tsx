import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Task, TaskStatus, STATUS_CONFIG, PRIORITY_CONFIG } from '../../types'
import { format, isPast, isToday } from 'date-fns'

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo',        label: 'To Do',       color: '#6366f1' },
  { status: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { status: 'done',        label: 'Done',         color: '#22c55e' }
]

export default function KanbanView({ profileId }: { profileId: number }) {
  const { tasks, upsertTask, setEditingTaskId, removeTask } = useAppStore()
  const profileTasks = tasks.filter(t => t.profile_id === profileId)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const handleDrop = async (status: TaskStatus) => {
    if (!draggingId) return
    const updated = await window.electronAPI.tasks.update(draggingId, { status })
    if (updated) upsertTask({ ...updated, tags: JSON.parse(updated.tags || '[]'), subtasks: updated.subtasks || [] })
    setDraggingId(null)
  }

  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px', height: '100%', overflowX: 'auto' }}>
      {COLUMNS.map(col => {
        const colTasks = profileTasks.filter(t => t.status === col.status)
        return (
          <div key={col.status}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.status)}
            style={{
              flex: '0 0 280px',
              display: 'flex', flexDirection: 'column',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}
          >
            {/* Column header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '1px 7px', borderRadius: 10 }}>{colTasks.length}</span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {colTasks.map(task => (
                <KanbanCard key={task.id} task={task}
                  onDragStart={() => setDraggingId(task.id)}
                  onEdit={() => setEditingTaskId(task.id)}
                  onDelete={async () => { await window.electronAPI.tasks.delete(task.id); removeTask(task.id) }}
                />
              ))}
              {colTasks.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ task, onDragStart, onEdit, onDelete }: {
  task: Task; onDragStart: () => void; onEdit: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const priorityCfg = PRIORITY_CONFIG[task.priority]
  const subtasks = task.subtasks ?? []
  const doneSubtasks = subtasks.filter(s => s.done).length
  const isOverdue = task.deadline && isPast(new Date(task.deadline * 1000)) && !isToday(new Date(task.deadline * 1000))

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onEdit}
      style={{
        background: hovered ? 'var(--bg-card)' : 'var(--bg-tertiary)',
        border: `1px solid ${hovered ? 'var(--border)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius)',
        padding: '10px 11px',
        marginBottom: 6,
        cursor: 'grab',
        transition: 'background 0.12s, border-color 0.12s',
        opacity: task.status === 'done' ? 0.6 : 1
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>{task.title}</span>
        {hovered && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ width: 22, height: 22, borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'var(--bg-hover)', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>✎</button>
            <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ width: 22, height: 22, borderRadius: 3, border: '1px solid var(--border-subtle)', background: 'var(--bg-hover)', cursor: 'pointer', fontSize: 11, color: '#ef4444' }}>✕</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: priorityCfg.color, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: priorityCfg.color }} />{task.priority}
        </span>
        {task.deadline && (
          <span style={{ fontSize: 10, color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
            📅 {format(new Date(task.deadline * 1000), 'MMM d')}
          </span>
        )}
        {subtasks.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>☑ {doneSubtasks}/{subtasks.length}</span>
        )}
        {task.recur_rule && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔁</span>}
      </div>

      {task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
