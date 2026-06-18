import { ipcMain } from 'electron'
import { getDb } from '../db/index'

export function registerTaskHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('tasks:get-all', (_, profileId: number) => {
    const tasks = db()
      .prepare('SELECT * FROM tasks WHERE profile_id = ? AND (archived IS NULL OR archived = 0) ORDER BY sort_order ASC, created_at ASC')
      .all(profileId)
    return tasks.map((t: any) => ({
      ...t,
      subtasks: db().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(t.id)
    }))
  })

  ipcMain.handle('tasks:get-archived', (_, profileId: number) => {
    const tasks = db()
      .prepare('SELECT * FROM tasks WHERE profile_id = ? AND archived = 1 ORDER BY updated_at DESC')
      .all(profileId)
    return tasks.map((t: any) => ({
      ...t,
      subtasks: db().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(t.id)
    }))
  })

  ipcMain.handle('tasks:archive', (_, id: number) => {
    db().prepare('UPDATE tasks SET archived = 1, updated_at = unixepoch() WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('tasks:unarchive', (_, id: number) => {
    db().prepare('UPDATE tasks SET archived = 0, updated_at = unixepoch() WHERE id = ?').run(id)
    const updated = db().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    return {
      ...updated,
      subtasks: db().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(id)
    }
  })

  ipcMain.handle('tasks:create', (_, task: any) => {
    const maxOrder = (db()
      .prepare('SELECT MAX(sort_order) as m FROM tasks WHERE profile_id = ?')
      .get(task.profile_id) as any)?.m ?? -1

    const result = db().prepare(`
      INSERT INTO tasks (profile_id, title, notes, notes_html, priority, status, deadline, reminder_at, sort_order, tags, project_id, recur_rule, recur_next)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.profile_id, task.title, task.notes ?? '', task.notes_html ?? '',
      task.priority ?? 'medium', task.status ?? 'todo',
      task.deadline ?? null, task.reminder_at ?? null,
      maxOrder + 1,
      JSON.stringify(task.tags ?? []),
      task.project_id ?? null,
      task.recur_rule ?? null,
      task.recur_next ?? null
    )
    const created = db().prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as any
    return { ...created, subtasks: [] }
  })

  ipcMain.handle('tasks:update', (_, id: number, data: any) => {
    const fields: string[] = []
    const values: any[] = []

    const allowed = ['title','notes','notes_html','priority','status','deadline','reminder_at','tags','project_id','recur_rule','recur_next','archived']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(key === 'tags' ? JSON.stringify(data[key]) : data[key])
      }
    }
    fields.push('updated_at = unixepoch()')
    values.push(id)

    db().prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    const updated = db().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    return {
      ...updated,
      subtasks: db().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(id)
    }
  })

  ipcMain.handle('tasks:delete', (_, id: number) => {
    db().prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('tasks:reorder', (_, updates: { id: number; sort_order: number }[]) => {
    const stmt = db().prepare('UPDATE tasks SET sort_order = ? WHERE id = ?')
    const updateMany = db().transaction((items: typeof updates) => {
      for (const item of items) stmt.run(item.sort_order, item.id)
    })
    updateMany(updates)
    return { success: true }
  })

  // Subtasks
  ipcMain.handle('subtasks:create', (_, taskId: number, title: string) => {
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as m FROM subtasks WHERE task_id = ?').get(taskId) as any)?.m ?? -1
    const result = db().prepare('INSERT INTO subtasks (task_id, title, sort_order) VALUES (?, ?, ?)').run(taskId, title, maxOrder + 1)
    return db().prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('subtasks:update', (_, id: number, data: { title?: string; done?: boolean }) => {
    const fields: string[] = []
    const values: any[] = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.done !== undefined) { fields.push('done = ?'); values.push(data.done ? 1 : 0) }
    values.push(id)
    db().prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db().prepare('SELECT * FROM subtasks WHERE id = ?').get(id)
  })

  ipcMain.handle('subtasks:delete', (_, id: number) => {
    db().prepare('DELETE FROM subtasks WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('subtasks:reorder', (_, updates: { id: number; sort_order: number }[]) => {
    const stmt = db().prepare('UPDATE subtasks SET sort_order = ? WHERE id = ?')
    const updateMany = db().transaction((items: typeof updates) => {
      for (const item of items) stmt.run(item.sort_order, item.id)
    })
    updateMany(updates)
    return { success: true }
  })

  // Projects
  ipcMain.handle('projects:get-all', (_, profileId: number) => {
    return db().prepare('SELECT * FROM projects WHERE profile_id = ? ORDER BY sort_order ASC').all(profileId)
  })

  ipcMain.handle('projects:create', (_, data: { profile_id: number; name: string; color?: string }) => {
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as m FROM projects WHERE profile_id = ?').get(data.profile_id) as any)?.m ?? -1
    const result = db().prepare('INSERT INTO projects (profile_id, name, color, sort_order) VALUES (?, ?, ?, ?)').run(
      data.profile_id, data.name, data.color ?? '#6366f1', maxOrder + 1
    )
    return db().prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('projects:update', (_, id: number, data: { name?: string; color?: string; collapsed?: boolean }) => {
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
    if (data.collapsed !== undefined) { fields.push('collapsed = ?'); values.push(data.collapsed ? 1 : 0) }
    values.push(id)
    db().prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db().prepare('SELECT * FROM projects WHERE id = ?').get(id)
  })

  ipcMain.handle('projects:delete', (_, id: number) => {
    db().prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(id)
    db().prepare('DELETE FROM projects WHERE id = ?').run(id)
    return { success: true }
  })
}
