import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Profile, Task, PRIORITY_CONFIG } from '../../types'
import TaskCard from './TaskCard'
import TaskFilters from './TaskFilters'
import KanbanView from './KanbanView'
import CalendarView from './CalendarView'
import ProjectPanel from './ProjectPanel'
import ArchiveView from './ArchiveView'

interface Props { profile: Profile }

export default function TaskList({ profile }: Props) {
  const { tasks, setTasks, filters, setTaskModalOpen, setEditingTaskId, upsertTask, projects, setProjects, viewMode, setViewMode } = useAppStore()
  const [showProjects, setShowProjects] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  const profileTasks = tasks.filter(t => t.profile_id === profile.id)

  useEffect(() => {
    const load = async () => {
      const [taskData, projectData] = await Promise.all([
        window.electronAPI.tasks.getAll(profile.id),
        window.electronAPI.projects.getAll(profile.id)
      ])
      const parsed: Task[] = taskData.map((t: any) => ({
        ...t, tags: JSON.parse(t.tags || '[]'), subtasks: t.subtasks || []
      }))
      setTasks([...tasks.filter(t => t.profile_id !== profile.id), ...parsed])
      setProjects([...projects.filter(p => p.profile_id !== profile.id), ...projectData])
    }
    load()
  }, [profile.id])

  // Reminder + deadline notifications are now handled centrally in the
  // main process (see electron/reminders/checkReminders.ts), running
  // across ALL profiles regardless of which one is selected here. This
  // used to be a renderer-side effect scoped to just this component's
  // `profile` prop — meaning reminders for every OTHER profile silently
  // stopped firing the moment you switched away from them, since only one
  // <TaskList> is ever mounted at a time. Removed entirely rather than
  // left running alongside the new centralized checker, since both would
  // otherwise double-fire notifications for whichever profile happens to
  // be selected.
  const filteredTasks = useMemo(() => {
    let list = [...profileTasks]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)))
    }
    if (filters.priority !== 'all') list = list.filter(t => t.priority === filters.priority)
    if (filters.status !== 'all') list = list.filter(t => t.status === filters.status)
    if (filters.projectId === 'none') list = list.filter(t => !t.project_id)
    else if (filters.projectId !== 'all') list = list.filter(t => t.project_id === filters.projectId)

    list.sort((a, b) => {
      let cmp = 0
      if (filters.sortBy === 'sort_order') cmp = a.sort_order - b.sort_order
      else if (filters.sortBy === 'deadline') cmp = (a.deadline ?? Infinity) - (b.deadline ?? Infinity)
      else if (filters.sortBy === 'priority') cmp = PRIORITY_CONFIG[b.priority].order - PRIORITY_CONFIG[a.priority].order
      else if (filters.sortBy === 'created_at') cmp = a.created_at - b.created_at
      return filters.sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [profileTasks, filters])

  const handleDragStart = useCallback((e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', String(taskId))
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    const dragId = Number(e.dataTransfer.getData('taskId'))
    if (dragId === targetId) return
    const list = [...filteredTasks]
    const fromIdx = list.findIndex(t => t.id === dragId)
    const toIdx = list.findIndex(t => t.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = list.splice(fromIdx, 1)
    list.splice(toIdx, 0, moved)
    const updates = list.map((t, i) => ({ id: t.id, sort_order: i }))
    await window.electronAPI.tasks.reorder(updates)
    updates.forEach(u => upsertTask({ ...profileTasks.find(t => t.id === u.id)!, sort_order: u.sort_order }))
  }, [filteredTasks, profileTasks])

  const totalCount = profileTasks.length
  const doneCount = profileTasks.filter(t => t.status === 'done').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>{profile.name}'s Tasks</h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{doneCount}/{totalCount} completed</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center' }}>
            {/* View mode toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 2, gap: 2 }}>
              {(['list','kanban','calendar'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)} title={m} style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: viewMode === m ? 'var(--accent)' : 'transparent',
                  color: viewMode === m ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s', textTransform: 'capitalize'
                }}>{m === 'list' ? '☰' : m === 'kanban' ? '⊞' : '📅'}</button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowProjects(true)} title="Manage Projects">◆ Projects</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowArchive(true)} title="View archived tasks">📦 Archive</button>
            <ExportMenu profileId={profile.id} />
            <ImportButton profileId={profile.id} />
            <button className="btn btn-primary" onClick={() => { setEditingTaskId(null); setTaskModalOpen(true) }}>+ New Task</button>
          </div>
        </div>
        {viewMode === 'list' && <TaskFilters profileId={profile.id} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {viewMode === 'kanban' ? (
          <KanbanView profileId={profile.id} />
        ) : viewMode === 'calendar' ? (
          <CalendarView profileId={profile.id} />
        ) : (
          <div style={{ height: '100%', overflowY: 'auto', padding: '10px 16px' }}>
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">{profileTasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}</div>
                <div className="empty-state-desc">{profileTasks.length === 0 ? 'Click "New Task" to get started.' : 'Try adjusting your filters.'}</div>
              </div>
            ) : filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} draggable
                onDragStart={e => handleDragStart(e, task.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && viewMode === 'list' && (
        <div style={{ height: 3, background: 'var(--border-subtle)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${(doneCount/totalCount)*100}%`, background: 'var(--accent)', transition: 'width 0.4s ease' }} />
        </div>
      )}

      {showProjects && <ProjectPanel profileId={profile.id} onClose={() => setShowProjects(false)} />}
      {showArchive && <ArchiveView profileId={profile.id} onClose={() => setShowArchive(false)} />}
    </div>
  )
}

function ExportMenu({ profileId }: { profileId: number }) {
  const [open, setOpen] = useState(false)
  const doExport = async (type: 'csv' | 'json' | 'pdf' | 'profile') => {
    setOpen(false)
    const exts: Record<string,string> = { csv:'csv', json:'json', pdf:'html', profile:'json' }
    const names: Record<string,string> = { csv:'CSV File', json:'JSON File', pdf:'HTML Report', profile:'Profile Bundle' }
    const result = await window.electronAPI.dialog.saveFile({
      defaultPath: `tasks-export.${exts[type]}`,
      filters: [{ name: names[type], extensions: [exts[type]] }]
    })
    if (!result.canceled && result.filePath) {
      // Previously built this key dynamically as `to${Capitalized(type)}`,
      // which produces 'toCsv', 'toJson', 'toPdf' — none of which match the
      // actual exposed names 'toCSV', 'toJSON', 'toPDF' (acronyms stay
      // fully uppercase in preload.ts, but the capitalize-first-letter
      // logic only uppercases one letter). Looking up a nonexistent
      // property silently returns undefined, so `fn` was undefined for
      // every type except 'profile' — which only worked because it had
      // its own explicit ternary branch that bypassed the broken dynamic
      // lookup entirely. Calling undefined as a function threw before the
      // try/catch's error alert could ever run, which is why nothing
      // appeared to happen — the failure was silent from the user's side.
      const exportFns: Record<typeof type, (profileId: number, savePath: string) => Promise<{ success: boolean; error?: string }>> = {
        csv: window.electronAPI.export.toCSV,
        json: window.electronAPI.export.toJSON,
        pdf: window.electronAPI.export.toPDF,
        profile: window.electronAPI.export.toProfile
      }
      try {
        const res = await exportFns[type](profileId, result.filePath)
        if (!res?.success) alert('Export failed: ' + (res?.error || 'unknown error'))
      } catch (e: any) {
        alert('Export failed: ' + (e?.message || 'unknown error'))
      }
    }
  }
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(o => !o)}>↑ Export</button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 160, padding: 4 }}>
            {(['csv','json','pdf','profile'] as const).map(t => (
              <button key={t} onClick={() => doExport(t)} style={{ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                {t === 'pdf' ? 'HTML Report' : t === 'profile' ? 'Profile Bundle' : t.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ImportButton({ profileId }: { profileId: number }) {
  const { upsertTask } = useAppStore()
  const doImport = async () => {
    const result = await window.electronAPI.dialog.openFile({ title: 'Import Tasks', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (!result.canceled && result.filePaths?.[0]) {
      const res = await window.electronAPI.import.fromJSON(profileId, result.filePaths[0])
      if (res.success) {
        const tasks = await window.electronAPI.tasks.getAll(profileId)
        tasks.forEach((t: any) => upsertTask({ ...t, tags: JSON.parse(t.tags||'[]'), subtasks: t.subtasks||[] }))
        alert(`Imported ${res.imported} tasks!`)
      } else {
        alert('Import failed: ' + res.error)
      }
    }
  }
  return <button className="btn btn-secondary btn-sm" onClick={doImport} title="Import from JSON">↓ Import</button>
}
