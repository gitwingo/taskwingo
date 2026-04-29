import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Task, Priority, TaskStatus, RECUR_OPTIONS, Subtask } from '../../types'
import AttachmentPanel from './AttachmentPanel'
import RichTextEditor from './RichTextEditor'

export default function TaskModal() {
  const { editingTaskId, tasks, activeProfileId, projects, setTaskModalOpen, setEditingTaskId, upsertTask } = useAppStore()
  const existing = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null

  const [title, setTitle] = useState(existing?.title ?? '')
  // Fix #2: always initialise from notes_html if available, else plain notes
  const [notesHtml, setNotesHtml] = useState(existing?.notes_html || existing?.notes || '')
  const [notesPlain, setNotesPlain] = useState(existing?.notes || '')
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium')
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? 'todo')
  const [deadline, setDeadline] = useState(() => existing?.deadline ? new Date(existing.deadline * 1000).toISOString().split('T')[0] : '')
  const [reminderAt, setReminderAt] = useState(() => existing?.reminder_at ? new Date(existing.reminder_at * 1000).toISOString().slice(0, 16) : '')
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [projectId, setProjectId] = useState<number | null>(existing?.project_id ?? null)
  const [recurRule, setRecurRule] = useState(existing?.recur_rule ?? null)
  const [subtasks, setSubtasks] = useState<Subtask[]>(existing?.subtasks ?? [])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'details' | 'subtasks' | 'attachments'>('details')

  const profileProjects = projects.filter(p => p.profile_id === activeProfileId)
  const close = () => { setTaskModalOpen(false); setEditingTaskId(null) }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const addSubtask = async () => {
    if (!subtaskInput.trim() || !existing) return
    const result = await window.electronAPI.subtasks.create(existing.id, subtaskInput.trim())
    if (result) {
      const updated = [...subtasks, result]
      setSubtasks(updated)
      upsertTask({ ...existing, subtasks: updated })
    }
    setSubtaskInput('')
  }

  const toggleSubtask = async (id: number, done: boolean) => {
    if (!existing) return
    await window.electronAPI.subtasks.update(id, { done: !done })
    const updated = subtasks.map(s => s.id === id ? { ...s, done: !done } : s)
    setSubtasks(updated)
    upsertTask({ ...existing, subtasks: updated })
  }

  const deleteSubtask = async (id: number) => {
    if (!existing) return
    await window.electronAPI.subtasks.delete(id)
    const updated = subtasks.filter(s => s.id !== id)
    setSubtasks(updated)
    upsertTask({ ...existing, subtasks: updated })
  }

  const save = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!activeProfileId) return
    setSaving(true); setError('')

    // Fix #3: always send BOTH notes (plain) and notes_html (rich)
    const payload: any = {
      title: title.trim(),
      notes: notesPlain,        // plain text for card preview
      notes_html: notesHtml,    // HTML for rich display
      priority, status,
      deadline: deadline ? Math.floor(new Date(deadline).getTime() / 1000) : null,
      reminder_at: reminderAt ? Math.floor(new Date(reminderAt).getTime() / 1000) : null,
      tags, project_id: projectId, recur_rule: recurRule,
      profile_id: activeProfileId
    }

    try {
      let result: any
      if (existing) {
        result = await window.electronAPI.tasks.update(existing.id, payload)
      } else {
        result = await window.electronAPI.tasks.create(payload)
      }
      if (result) {
        upsertTask({
          ...result,
          tags: JSON.parse(result.tags || '[]'),
          subtasks: result.subtasks || subtasks,
          notes: notesPlain,
          notes_html: notesHtml
        })
      }
      close()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']
  const PCOLORS: Record<Priority, string> = { urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#22c55e' }
  const doneCount = subtasks.filter(s => s.done).length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-box" style={{ width: 560, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{existing ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={close} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px' }}>
          {(['details', 'subtasks', 'attachments'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 14px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--text-accent)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', marginBottom: -1, textTransform: 'capitalize', transition: 'color 0.15s'
            }}>
              {t}{t === 'subtasks' && subtasks.length > 0 ? ` (${doneCount}/${subtasks.length})` : ''}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '68vh' }}>
          {tab === 'details' && (
            <>
              <div className="form-group" style={{ marginBottom: 13 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="What needs to be done?" autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
              </div>

              <div className="form-group" style={{ marginBottom: 13 }}>
                <label className="form-label">Notes</label>
                <RichTextEditor
                  value={notesHtml}
                  onChange={(plain, html) => { setNotesPlain(plain); setNotesHtml(html) }}
                  placeholder="Additional details… (Ctrl+B bold, Ctrl+I italic)"
                  minHeight={90}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 13 }}>
                <label className="form-label">Priority</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRIORITIES.map(p => (
                    <button key={p} onClick={() => setPriority(p)} style={{
                      flex: 1, padding: '6px 4px', borderRadius: 'var(--radius)',
                      border: `1.5px solid ${priority === p ? PCOLORS[p] : 'var(--border)'}`,
                      background: priority === p ? `${PCOLORS[p]}22` : 'var(--bg-tertiary)',
                      color: priority === p ? PCOLORS[p] : 'var(--text-secondary)',
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s'
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 13 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Project</label>
                  <select className="form-input" value={projectId ?? ''} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">No project</option>
                    {profileProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 13 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Deadline</label>
                  <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Reminder</label>
                  <input className="form-input" type="datetime-local" value={reminderAt} onChange={e => setReminderAt(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 13 }}>
                <label className="form-label">Repeat</label>
                <select className="form-input" value={recurRule ?? ''} onChange={e => setRecurRule((e.target.value || null) as any)}>
                  {RECUR_OPTIONS.map(o => <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 4 }}>
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-subtle)', color: 'var(--text-accent)', fontSize: 12 }}>
                      {tag}<button onClick={() => setTags(tags.filter(t => t !== tag))} style={{ cursor: 'pointer', fontSize: 11, color: 'inherit', opacity: 0.7, background: 'none', border: 'none' }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                    placeholder="Add tag, press Enter" style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={addTag}>Add</button>
                </div>
              </div>
            </>
          )}

          {tab === 'subtasks' && (
            <div>
              {!existing ? (
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
                  Save the task first, then reopen it to add subtasks.
                </div>
              ) : (
                <>
                  {subtasks.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
                        <span>Progress</span><span>{doneCount}/{subtasks.length}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${subtasks.length ? (doneCount / subtasks.length) * 100 : 0}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                  {subtasks.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <button onClick={() => toggleSubtask(s.id, s.done)} style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                        border: `1.5px solid ${s.done ? '#22c55e' : 'var(--border)'}`,
                        background: s.done ? 'rgba(34,197,94,0.15)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#22c55e'
                      }}>{s.done ? '●' : ''}</button>
                      <span style={{ flex: 1, fontSize: 13, color: s.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.title}</span>
                      <button onClick={() => deleteSubtask(s.id)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', opacity: 0.6 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <input className="form-input" value={subtaskInput} onChange={e => setSubtaskInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSubtask()} placeholder="Add a step…" style={{ flex: 1 }} autoFocus={tab === 'subtasks'} />
                    <button className="btn btn-secondary btn-sm" onClick={addSubtask}>Add</button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'attachments' && (
            existing
              ? <AttachmentPanel taskId={existing.id} />
              : <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>Save the task first to add attachments.</div>
          )}

          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius)', fontSize: 13, marginTop: 8 }}>{error}</div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
