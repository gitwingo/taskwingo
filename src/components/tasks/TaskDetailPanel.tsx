import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from '../../store/appStore'
import { useProfileSettings } from '../../hooks/useProfileSettings'
import { PRIORITY_CONFIG, STATUS_CONFIG, Attachment, Priority } from '../../types'
import { format, isPast, isToday, isTomorrow } from 'date-fns'

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼'
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  if (mime.includes('word')) return '📝'
  if (mime.includes('sheet')) return '📊'
  return '📎'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  taskId: number
  onClose: () => void
  onEdit: () => void
}

export default function TaskDetailPanel({ taskId, onClose, onEdit }: Props) {
  const { tasks, upsertTask, removeTask, attachments, setAttachments, projects } = useAppStore()
  const { dateFormat } = useProfileSettings()
  const task = tasks.find(t => t.id === taskId)
  const [localSubtasks, setLocalSubtasks] = useState(task?.subtasks ?? [])
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  // Tracks whether the mouse press that's about to end on the overlay
  // actually *started* on the overlay too. Without this, selecting text
  // inside the panel and releasing the mouse button outside it (over the
  // dimmed backdrop) fires a `click` event on the overlay and closes the
  // whole panel — same root cause as the bug fixed earlier in TaskModal.
  const mouseDownOnOverlay = useRef(false)

  useEffect(() => { setLocalSubtasks(task?.subtasks ?? []) }, [task?.subtasks])

  useEffect(() => {
    if (task && attachments[task.id] === undefined) {
      window.electronAPI.files.getForTask(task.id).then((data: Attachment[]) => setAttachments(task.id, data))
    }
  }, [task?.id])

  if (!task) return null

  const priorityCfg = PRIORITY_CONFIG[task.priority]
  const statusCfg = STATUS_CONFIG[task.status]
  const project = task.project_id ? projects.find(p => p.id === task.project_id) : null
  const taskAttachments: Attachment[] = attachments[task.id] ?? []
  const doneCount = localSubtasks.filter(s => s.done).length

  const deadlineLabel = (() => {
    if (!task.deadline) return null
    const d = new Date(task.deadline * 1000)
    if (isToday(d)) return { text: 'Today', color: '#f59e0b' }
    if (isTomorrow(d)) return { text: 'Tomorrow', color: 'var(--text-secondary)' }
    if (isPast(d)) return { text: task.status === 'done' ? format(d, dateFormat) : `Overdue · ${format(d, dateFormat)}`, color: task.status === 'done' ? 'var(--text-secondary)' : '#ef4444' }
    return { text: format(d, dateFormat), color: 'var(--text-secondary)' }
  })()

  const toggleSubtask = async (id: number, done: boolean) => {
    await window.electronAPI.subtasks.update(id, { done: !done })
    const updated = localSubtasks.map(s => s.id === id ? { ...s, done: !done } : s)
    setLocalSubtasks(updated)
    upsertTask({ ...task, subtasks: updated })
  }

  const cyclePriority = async () => {
    const cycle: Record<Priority, Priority> = { urgent: 'high', high: 'medium', medium: 'low', low: 'urgent' }
    const next = cycle[task.priority]
    const updated = await window.electronAPI.tasks.update(task.id, { priority: next })
    if (updated) upsertTask({ ...updated, tags: JSON.parse(updated.tags || '[]'), subtasks: localSubtasks })
  }

  const handleArchive = async () => {
    await window.electronAPI.tasks.archive(task.id)
    removeTask(task.id)
    onClose()
  }

  // Make links in notes HTML clickable
  const makeLinksClickable = useCallback((html: string): string => {
    return html.replace(
      /(?<!href=["'])(?<!src=["'])(https?:\/\/[^\s<>"']+)/g,
      '<a href="$1" style="color:var(--accent);text-decoration:underline;cursor:pointer;" data-ext-link="$1">$1</a>'
    )
  }, [])

  const handleNotesClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const link = target.closest('[data-ext-link]') as HTMLElement | null
    if (link) {
      e.preventDefault()
      window.electronAPI.shell.openExternal(link.dataset.extLink!)
    }
  }, [])

  const cycleStatus = async () => {
    const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' } as const
    const updated = await window.electronAPI.tasks.update(task.id, { status: cycle[task.status] })
    if (updated) upsertTask({ ...updated, tags: JSON.parse(updated.tags || '[]'), subtasks: localSubtasks })
  }

  // Fix #5: build plain-text shareable summary
  const buildShareText = () => {
    const lines: string[] = []
    lines.push(`📋 ${task.title}`)
    lines.push(`Priority: ${task.priority.toUpperCase()} | Status: ${statusCfg.label}`)
    if (project) lines.push(`Project: ${project.name}`)
    if (deadlineLabel) lines.push(`Deadline: ${deadlineLabel.text}`)
    if (task.reminder_at) lines.push(`Reminder: ${format(new Date(task.reminder_at * 1000), dateFormat + ' · h:mm a')}`)
    if (task.recur_rule) lines.push(`Repeat: ${task.recur_rule}`)
    if (task.tags.length > 0) lines.push(`Tags: ${task.tags.join(', ')}`)
    if (task.notes) lines.push(`\n${task.notes}`)
    if (localSubtasks.length > 0) {
      lines.push(`\nSubtasks (${doneCount}/${localSubtasks.length}):`)
      localSubtasks.forEach(s => lines.push(`  ${s.done ? '✓' : '○'} ${s.title}`))
    }
    if (taskAttachments.length > 0) {
      lines.push(`\nAttachments: ${taskAttachments.map(a => a.original_name).join(', ')}`)
    }
    return lines.join('\n')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildShareText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay"
      onMouseDown={e => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
      onMouseUp={e => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); mouseDownOnOverlay.current = false }}>
      <div className="modal-box" style={{ width: 520, padding: 0, overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={cycleStatus} title={statusCfg.label} style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
            border: `2px solid ${task.status === 'done' ? '#22c55e' : task.status === 'in_progress' ? 'var(--accent)' : 'var(--border)'}`,
            background: task.status === 'done' ? 'rgba(34,197,94,0.15)' : task.status === 'in_progress' ? 'rgba(99,102,241,0.1)' : 'transparent',
            color: task.status === 'done' ? '#22c55e' : task.status === 'in_progress' ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{statusCfg.icon}</button>
          <h2 style={{
            fontSize: 15, fontWeight: 600, flex: 1,
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
            userSelect: 'text' // Fix #5: selectable title
          }}>{task.title}</h2>
          {/* Fix #5: copy button */}
          <button onClick={handleCopy} title="Copy task details" style={{
            padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 500,
            background: copied ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            color: copied ? '#22c55e' : 'var(--text-secondary)', cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4
          }}>
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
          <button onClick={onEdit} className="btn btn-secondary btn-sm">Edit</button>
          <button onClick={handleArchive} title="Archive task" style={{ padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 500, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>📦 Archive</button>
          <button onClick={onClose} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 2 }}>✕</button>
        </div>

        {/* Body — Fix #5: userSelect: text on whole body */}
        <div ref={contentRef} style={{ overflowY: 'auto', flex: 1, padding: '16px 18px', userSelect: 'text' }}>
          {/* Meta badges */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={cyclePriority} title="Click to change priority" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: priorityCfg.bg, color: priorityCfg.color, fontSize: 12, fontWeight: 700, border: `1px solid ${priorityCfg.color}44`, cursor: 'pointer', transition: 'filter 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: priorityCfg.color }} />{priorityCfg.label}
            </button>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            {project && (
              <span style={{ padding: '4px 10px', borderRadius: 6, background: `${project.color}18`, border: `1px solid ${project.color}44`, fontSize: 12, color: project.color, fontWeight: 600 }}>
                ◆ {project.name}
              </span>
            )}
            {task.recur_rule && (
              <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                🔁 {task.recur_rule}
              </span>
            )}
          </div>

          {/* Deadline + Reminder */}
          {(deadlineLabel || task.reminder_at) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              {deadlineLabel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>📅</span>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Deadline</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: deadlineLabel.color }}>{deadlineLabel.text}</div>
                  </div>
                </div>
              )}
              {task.reminder_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>🔔</span>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Reminder</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{format(new Date(task.reminder_at * 1000), dateFormat + ' · h:mm a')}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              {task.tags.map(tag => (
                <span key={tag} style={{ padding: '3px 9px', borderRadius: 20, background: 'var(--accent-subtle)', color: 'var(--text-accent)', fontSize: 12, border: '1px solid var(--accent-subtle)', fontWeight: 500 }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Fix #1: render notes_html as HTML, fall back to plain notes */}
          {(task.notes_html || task.notes) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Description</div>
              {task.notes_html ? (
                // Render rich HTML
                <div
                  dangerouslySetInnerHTML={{ __html: makeLinksClickable(task.notes_html) }}
                  onClick={handleNotesClick}
                  style={{
                    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                    background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)',
                    padding: '12px 14px 12px 18px', border: '1px solid var(--border-subtle)',
                    wordBreak: 'break-word', userSelect: 'text', overflowX: 'hidden'
                  }}
                  className="rich-notes-view"
                />
              ) : (
                // Plain text fallback
                <div style={{
                  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)',
                  padding: '12px 14px', border: '1px solid var(--border-subtle)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text'
                }}>{task.notes}</div>
              )}
            </div>
          )}

          {/* Subtasks */}
          {localSubtasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subtasks</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doneCount}/{localSubtasks.length}</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${localSubtasks.length ? (doneCount / localSubtasks.length) * 100 : 0}%`, background: '#22c55e', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              {localSubtasks.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => toggleSubtask(s.id, s.done)} style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                    border: `2px solid ${s.done ? '#22c55e' : 'var(--border)'}`,
                    background: s.done ? 'rgba(34,197,94,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#22c55e', transition: 'all 0.15s'
                  }}>{s.done ? '●' : ''}</button>
                  <span style={{ fontSize: 13, flex: 1, color: s.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: s.done ? 'line-through' : 'none', lineHeight: 1.4, userSelect: 'text' }}>{s.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Attachments */}
          {taskAttachments.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                Attachments ({taskAttachments.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taskAttachments.map(a => (
                  <button key={a.id} onClick={() => window.electronAPI.files.open(a.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)', cursor: 'pointer',
                    transition: 'background 0.12s', textAlign: 'left'
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                  >
                    <span style={{ fontSize: 18 }}>{fileIcon(a.mime_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{a.original_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(a.size)}</div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14 }}>
            Created {format(new Date(task.created_at * 1000), dateFormat)}
            {task.updated_at !== task.created_at && ` · Updated ${format(new Date(task.updated_at * 1000), dateFormat)}`}
          </div>
        </div>
      </div>
    </div>
  )
}
