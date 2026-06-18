import { ipcMain, app } from 'electron'
import { getDb } from '../db/index'
import { writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'
import { createWriteStream } from 'fs'

export function registerExportHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('export:csv', (_, profileId: number, savePath: string) => {
    try {
      const tasks = db().prepare('SELECT * FROM tasks WHERE profile_id = ? ORDER BY sort_order').all(profileId) as any[]
      const headers = ['ID','Title','Notes','Priority','Status','Deadline','Tags','Project','Created']
      const rows = tasks.map(t => {
        const project = t.project_id
          ? (db().prepare('SELECT name FROM projects WHERE id = ?').get(t.project_id) as any)?.name ?? ''
          : ''
        return [
          t.id,
          `"${(t.title||'').replace(/"/g,'""')}"`,
          `"${(t.notes||'').replace(/"/g,'""')}"`,
          t.priority, t.status,
          t.deadline ? new Date(t.deadline*1000).toISOString().split('T')[0] : '',
          `"${JSON.parse(t.tags||'[]').join(', ')}"`,
          `"${project}"`,
          new Date(t.created_at*1000).toISOString().split('T')[0]
        ]
      })
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      writeFileSync(savePath, csv, 'utf-8')
      return { success: true }
    } catch(e: any) { return { success: false, error: e.message } }
  })

  ipcMain.handle('export:json', (_, profileId: number, savePath: string) => {
    try {
      const profile = db().prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as any
      const tasks = db().prepare('SELECT * FROM tasks WHERE profile_id = ? ORDER BY sort_order').all(profileId) as any[]
      const projects = db().prepare('SELECT * FROM projects WHERE profile_id = ?').all(profileId)
      const data = {
        exported_at: new Date().toISOString(),
        profile: { id: profile.id, name: profile.name },
        projects,
        tasks: tasks.map(t => ({
          ...t,
          tags: JSON.parse(t.tags||'[]'),
          deadline: t.deadline ? new Date(t.deadline*1000).toISOString() : null,
          subtasks: db().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order').all(t.id)
        }))
      }
      writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch(e: any) { return { success: false, error: e.message } }
  })

  ipcMain.handle('export:pdf', (_, profileId: number, savePath: string) => {
    try {
      const profile = db().prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as any
      const projects = db().prepare('SELECT * FROM projects WHERE profile_id = ?').all(profileId) as any[]
      const tasks = db().prepare('SELECT * FROM tasks WHERE profile_id = ? ORDER BY priority DESC, sort_order').all(profileId) as any[]
      const pColors: Record<string,string> = { urgent:'#ef4444', high:'#f97316', medium:'#3b82f6', low:'#22c55e' }

      const taskRows = tasks.map(t => {
        const color = pColors[t.priority]||'#888'
        const deadline = t.deadline ? new Date(t.deadline*1000).toLocaleDateString() : '—'
        const project = projects.find(p => p.id === t.project_id)?.name ?? '—'
        const subtasks = db().prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order').all(t.id) as any[]
        const subtaskHtml = subtasks.length
          ? `<div style="font-size:11px;color:#666;margin-top:4px">${subtasks.map(s => `${s.done?'✓':'○'} ${s.title}`).join(' &nbsp;·&nbsp; ')}</div>`
          : ''
        return `<tr>
          <td><div>${t.title}</div>${subtaskHtml}</td>
          <td style="color:${color};font-weight:bold">${t.priority.toUpperCase()}</td>
          <td>${t.status.replace('_',' ')}</td>
          <td>${deadline}</td>
          <td>${project}</td>
        </tr>`
      }).join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;margin:40px;color:#111}h1{color:#1a1a2e;margin-bottom:4px}.meta{color:#888;font-size:13px;margin-bottom:24px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1a1a2e;color:white;padding:9px 12px;text-align:left}td{padding:8px 12px;border-bottom:1px solid #eee;vertical-align:top}tr:nth-child(even) td{background:#f9f9f9}</style>
</head><body>
<h1>Taskwingo — ${profile.name}</h1>
<p class="meta">Exported ${new Date().toLocaleString()} · ${tasks.length} tasks</p>
<table><thead><tr><th>Title</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Project</th></tr></thead>
<tbody>${taskRows}</tbody></table></body></html>`

      writeFileSync(savePath, html, 'utf-8')
      return { success: true }
    } catch(e: any) { return { success: false, error: e.message } }
  })

  // Profile export as zip-like JSON bundle
  ipcMain.handle('export:profile', (_, profileId: number, savePath: string) => {
    try {
      const profile = db().prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as any
      const tasks = db().prepare('SELECT * FROM tasks WHERE profile_id = ? ORDER BY sort_order').all(profileId) as any[]
      const projects = db().prepare('SELECT * FROM projects WHERE profile_id = ?').all(profileId)
      const allSubtasks = tasks.map(t => ({
        task_id: t.id,
        subtasks: db().prepare('SELECT * FROM subtasks WHERE task_id = ?').all(t.id)
      }))
      const allAttachments = tasks.map(t => ({
        task_id: t.id,
        attachments: db().prepare('SELECT * FROM attachments WHERE task_id = ?').all(t.id)
      }))
      const bundle = {
        version: 1,
        exported_at: new Date().toISOString(),
        profile: { ...profile, pin_hash: null },
        projects,
        tasks: tasks.map(t => ({ ...t, tags: JSON.parse(t.tags||'[]') })),
        subtasks: allSubtasks,
        attachments: allAttachments.map(a => ({
          task_id: a.task_id,
          files: a.attachments.map((f: any) => ({ ...f, stored_path: undefined }))
        }))
      }
      writeFileSync(savePath, JSON.stringify(bundle, null, 2), 'utf-8')
      return { success: true }
    } catch(e: any) { return { success: false, error: e.message } }
  })

  // Import from JSON
  ipcMain.handle('import:json', (_, profileId: number, filePath: string) => {
    try {
      const raw = require('fs').readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      const tasks = data.tasks || []
      let imported = 0
      const maxOrder = (db().prepare('SELECT MAX(sort_order) as m FROM tasks WHERE profile_id = ?').get(profileId) as any)?.m ?? -1

      db().transaction(() => {
        tasks.forEach((t: any, i: number) => {
          const result = db().prepare(`
            INSERT INTO tasks (profile_id, title, notes, priority, status, deadline, sort_order, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            profileId, t.title || 'Untitled',
            t.notes || '', t.priority || 'medium',
            t.status || 'todo',
            t.deadline ? Math.floor(new Date(t.deadline).getTime()/1000) : null,
            maxOrder + 1 + i,
            JSON.stringify(Array.isArray(t.tags) ? t.tags : [])
          )
          imported++
          // Import subtasks if present
          if (Array.isArray(t.subtasks)) {
            t.subtasks.forEach((s: any, j: number) => {
              db().prepare('INSERT INTO subtasks (task_id, title, done, sort_order) VALUES (?, ?, ?, ?)').run(
                result.lastInsertRowid, s.title || '', s.done ? 1 : 0, j
              )
            })
          }
        })
      })()

      return { success: true, imported }
    } catch(e: any) { return { success: false, error: e.message } }
  })
}
