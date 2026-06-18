import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/appStore'
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, Attachment } from '../../types'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import TaskDetailPanel from './TaskDetailPanel'

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼'
  if (mime === 'application/pdf') return '📄'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  if (mime.includes('word')) return '📝'
  if (mime.includes('sheet')) return '📊'
  return '📎'
}

interface Props {
  task: Task
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

// Strips block-level tags (headings, lists, paragraphs) so the one-line card
// preview stays a single line, but keeps inline formatting marks — bold,
// italic, underline, strikethrough — so things like strikethrough actually
// show up on the card, not just in the full Task Detail panel.
function stripBlockTagsKeepInline(html: string): string {
  return html
    .replace(/<\/(h1|h2|h3|h4|h5|h6|p|li)>/gi, ' ')   // block boundaries -> single space
    .replace(/<li[^>]*>/gi, '• ')                      // keep a visual bullet marker
    .replace(/<\/?(h1|h2|h3|h4|h5|h6|p|ul|ol|div)[^>]*>/gi, '') // drop remaining block tags
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function TaskCard({ task, draggable, onDragStart, onDragOver, onDrop }: Props) {
  const { setEditingTaskId, removeTask, upsertTask, attachments, setAttachments, projects } = useAppStore()
  const [hovered, setHovered] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Tracks whether the dropdown should open upward instead of downward.
  // The menu was always anchored with `top: '100%'` (always below the
  // trigger button), which clips or fully hides behind the OS taskbar for
  // any card near the bottom of the viewport — exactly what's visible in
  // the bug report screenshot, where the menu renders partially behind
  // the Windows taskbar. Measuring the trigger button's actual position
  // each time the menu opens and comparing it against remaining viewport
  // height lets the menu flip upward when there isn't enough room below.
  const [openUpward, setOpenUpward] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  // Rough estimate of the menu's rendered height: 3 items at ~30px each
  // (DropItem's own padding) plus the outer container's 4px padding on
  // both top and bottom, plus the 4px marginTop gap from the trigger.
  // Doesn't need to be pixel-exact — it only has to be in the right
  // ballpark to decide which direction has enough room.
  const ESTIMATED_MENU_HEIGHT = 3 * 30 + 8 + 4
  const [showDetail, setShowDetail] = useState(false) // Fix #2

  const taskAttachments: Attachment[] = attachments[task.id] ?? []
  const project = task.project_id ? projects.find(p => p.id === task.project_id) : null
  const subtasks = task.subtasks ?? []
  const doneSubtasks = subtasks.filter(s => s.done).length

  useEffect(() => {
    if (attachments[task.id] === undefined) {
      window.electronAPI.files.getForTask(task.id).then((data: Attachment[]) => setAttachments(task.id, data))
    }
  }, [task.id])

  const priorityCfg = PRIORITY_CONFIG[task.priority]
  const statusCfg = STATUS_CONFIG[task.status]

  const deadlineLabel = (() => {
    if (!task.deadline) return null
    const d = new Date(task.deadline * 1000)
    if (isToday(d)) return { text: 'Today', warn: true, overdue: false }
    if (isTomorrow(d)) return { text: 'Tomorrow', warn: false, overdue: false }
    if (isPast(d)) return { text: format(d, 'MMM d'), warn: false, overdue: task.status !== 'done' }
    return { text: format(d, 'MMM d'), warn: false, overdue: false }
  })()

  const cycleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' } as const
    const updated = await window.electronAPI.tasks.update(task.id, { status: cycle[task.status] })
    if (updated) upsertTask({ ...updated, tags: JSON.parse(updated.tags || '[]'), subtasks: updated.subtasks || subtasks })
  }

  const handleDelete = async () => {
    setMenuOpen(false)
    await window.electronAPI.tasks.delete(task.id)
    removeTask(task.id)
  }

  const handleArchive = async () => {
    setMenuOpen(false)
    await window.electronAPI.tasks.archive(task.id)
    removeTask(task.id)
  }

  const cyclePriority = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const cycle = { urgent: 'high', high: 'medium', medium: 'low', low: 'urgent' } as const
    const next = cycle[task.priority]
    const updated = await window.electronAPI.tasks.update(task.id, { priority: next })
    if (updated) upsertTask({ ...updated, tags: JSON.parse(updated.tags || '[]'), subtasks: updated.subtasks || subtasks })
  }

  // Fix #7: toggle subtask from card
  const toggleSubtask = async (e: React.MouseEvent, id: number, done: boolean) => {
    e.stopPropagation()
    await window.electronAPI.subtasks.update(id, { done: !done })
    const updatedSubs = subtasks.map(s => s.id === id ? { ...s, done: !done } : s)
    upsertTask({ ...task, subtasks: updatedSubs })
  }

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={e => { onDragOver?.(e); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { onDrop?.(e); setDragOver(false) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setShowDetail(true)}
        
        style={{
          background: dragOver ? 'var(--accent-subtle)' : hovered ? 'var(--bg-card)' : 'var(--bg-secondary)',
          border: `1px solid ${dragOver ? 'var(--accent)' : hovered ? 'var(--border)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius)',
          padding: '11px 12px', marginBottom: 6,
          cursor: 'pointer',
          transition: 'background 0.12s, border-color 0.12s',
          position: 'relative'
          // No `opacity` here for completed tasks — see the comment a
          // few lines down at the inner content wrapper for why putting
          // it on this element specifically broke the dropdown menu.
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Opacity for completed tasks lives on the wrapper just below
              — status toggle + content column only, sized to fill the
              row via flex:1 — not on this outer row and not on a wrapper
              that also contains the Hover actions div. Any element with
              opacity < 1 creates a new CSS stacking context for itself
              and everything inside it, regardless of z-index, which
              previously trapped the dropdown menu: its z-index could
              only be compared against siblings inside that same isolated
              compositing layer, never against sibling task cards further
              down the list — exactly why the menu rendered visually
              behind the next card, and visually faded along with it. The
              dropdown lives inside Hover actions below, which is a true
              sibling of the dimmed wrapper here, both direct children of
              this row (and of the outer card, neither of which has
              opacity set), so it's never trapped in that isolated layer. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0, opacity: task.status === 'done' ? 0.6 : 1 }}>
            {/* Status toggle */}
            <button onClick={cycleStatus} title={statusCfg.label} style={{
              width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              border: `1.5px solid ${task.status === 'done' ? '#22c55e' : task.status === 'in_progress' ? 'var(--accent)' : 'var(--border)'}`,
              background: task.status === 'done' ? 'rgba(34,197,94,0.15)' : task.status === 'in_progress' ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: task.status === 'done' ? '#22c55e' : task.status === 'in_progress' ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 10, cursor: 'pointer', marginTop: 1, transition: 'all 0.15s'
            }}>{statusCfg.icon}</button>

            <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title + priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {task.title}
              </span>
              <button onClick={cyclePriority} title="Click to change priority" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: priorityCfg.color, textTransform: 'uppercase', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: 3, transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = priorityCfg.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: priorityCfg.color }} />{task.priority}
              </button>
            </div>

            {/* Project */}
            {project && (
              <div style={{ marginBottom: 3 }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${project.color}22`, color: project.color, fontWeight: 600, border: `1px solid ${project.color}44` }}>◆ {project.name}</span>
              </div>
            )}

            {/* Notes preview (truncated) — uses notes_html when available so
                inline formatting like strikethrough is visible on the card,
                not just inside the full Task Detail panel. */}
            {(task.notes_html || task.notes) && (
              <div
                style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}
                {...(task.notes_html
                  ? { dangerouslySetInnerHTML: { __html: stripBlockTagsKeepInline(task.notes_html) } }
                  : { children: task.notes })}
              />
            )}

            {/* Subtask progress bar */}
            {subtasks.length > 0 && (
              <div style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                  {subtasks.map(s => (
                    <button key={s.id}
                      onClick={e => toggleSubtask(e, s.id, s.done)}
                     
                      title={s.title}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                        background: s.done ? 'rgba(34,197,94,0.12)' : 'var(--bg-tertiary)',
                        border: `1px solid ${s.done ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
                        color: s.done ? '#22c55e' : 'var(--text-secondary)',
                        maxWidth: 160, transition: 'all 0.15s',
                        textDecoration: s.done ? 'line-through' : 'none'
                      }}>
                      <span style={{ fontSize: 9 }}>{s.done ? '●' : '○'}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{s.title}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 2, maxWidth: 80 }}>
                    <div style={{ height: '100%', width: `${(doneSubtasks / subtasks.length) * 100}%`, background: '#22c55e', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{doneSubtasks}/{subtasks.length}</span>
                </div>
              </div>
            )}

            {/* Tags + deadline + indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              {task.tags.slice(0, 3).map(tag => (
                <span key={tag} className="chip" style={{ fontSize: 10, padding: '1px 5px' }}>{tag}</span>
              ))}
              {deadlineLabel && (
                <span style={{ fontSize: 11, color: deadlineLabel.overdue ? '#ef4444' : deadlineLabel.warn ? '#f59e0b' : 'var(--text-muted)', fontWeight: deadlineLabel.overdue || deadlineLabel.warn ? 600 : 400 }}>
                  {deadlineLabel.overdue ? '⚠ ' : '📅 '}{deadlineLabel.text}
                </span>
              )}
              {task.recur_rule && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔁 {task.recur_rule}</span>}
              {task.reminder_at && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔔</span>}
            </div>

            {/* Attachment chips */}
            {taskAttachments.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                {taskAttachments.map(a => (
                  <button key={a.id}
                    onClick={e => { e.stopPropagation(); window.electronAPI.files.open(a.id) }}
                   
                    title={a.original_name}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 140 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                  >
                    <span>{fileIcon(a.mime_type)}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 95 }}>{a.original_name}</span>
                    <span style={{ opacity: 0.4, fontSize: 9 }}>↗</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
          {/* ^ closes the opacity-dimmed wrapper (status toggle + content
              column). Hover actions below is a sibling of that wrapper,
              not a descendant — both are direct children of the outer
              card, which has no opacity set, so the dropdown menu inside
              Hover actions is never trapped in an isolated stacking
              context. */}

          {/* Hover actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: hovered || menuOpen ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setEditingTaskId(task.id) }} title="Edit"
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 12, cursor: 'pointer', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>✎</button>
            <div style={{ position: 'relative' }}>
              <button
                ref={menuTriggerRef}
                onClick={e => {
                  e.stopPropagation()
                  if (!menuOpen) {
                    // Decide direction BEFORE opening, using the trigger
                    // button's real on-screen position. window.innerHeight
                    // is the height of the app's own content area (the
                    // BrowserWindow's viewport), not the physical screen —
                    // so this correctly measures "is there room inside my
                    // own window for this menu," which is what actually
                    // matters: if the trigger is near the bottom edge of
                    // the window, flipping the menu upward keeps it fully
                    // inside the window instead of overflowing past its
                    // edge, which is what let it render visually behind
                    // the OS taskbar in the first place.
                    const rect = menuTriggerRef.current?.getBoundingClientRect()
                    if (rect) {
                      const spaceBelow = window.innerHeight - rect.bottom
                      setOpenUpward(spaceBelow < ESTIMATED_MENU_HEIGHT)
                    }
                  }
                  setMenuOpen(o => !o)
                }}
                style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 14, cursor: 'pointer', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>⋮</button>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
                  <div style={{
                    position: 'absolute',
                    ...(openUpward
                      ? { bottom: '100%', marginBottom: 4 }
                      : { top: '100%', marginTop: 4 }),
                    right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 120, padding: 4
                  }}>
                    <DropItem onClick={() => { setMenuOpen(false); setEditingTaskId(task.id) }}>Edit</DropItem>
                    <DropItem onClick={handleArchive}>Archive</DropItem>
                    <DropItem onClick={handleDelete} danger>Delete</DropItem>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fix #2: detail panel on single click */}
      {showDetail && (
        <TaskDetailPanel
          taskId={task.id}
          onClose={() => setShowDetail(false)}
          onEdit={() => { setShowDetail(false); setEditingTaskId(task.id) }}
        />
      )}
    </>
  )
}

function DropItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', background: 'none', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: danger ? '#ef4444' : 'var(--text-primary)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >{children}</button>
  )
}
