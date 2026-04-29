import { ipcMain, shell, app } from 'electron'
import { getDb } from '../db/index'
import { copyFileSync, mkdirSync, unlinkSync, existsSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'

const MIME_TYPES: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  // Documents
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  // Video
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/avi',
  '.mkv': 'video/x-matroska', '.webm': 'video/webm',
  // Fix #2: Audio
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4'
}

export function registerFileHandlers(): void {
  const db = () => getDb()

  const getAttachmentsDir = () => {
    const dir = join(app.getPath('userData'), 'attachments')
    mkdirSync(dir, { recursive: true })
    return dir
  }

  ipcMain.handle('files:attach', (_, taskId: number, filePath: string) => {
    const ext = extname(filePath).toLowerCase()
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream'
    const newName = `${randomUUID()}${ext}`
    const destDir = getAttachmentsDir()
    const destPath = join(destDir, newName)

    copyFileSync(filePath, destPath)
    const size = statSync(destPath).size

    const result = db().prepare(`
      INSERT INTO attachments (task_id, original_name, stored_path, mime_type, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(taskId, basename(filePath), destPath, mime, size)

    return db().prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('files:get-for-task', (_, taskId: number) => {
    return db().prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at ASC').all(taskId)
  })

  ipcMain.handle('files:delete', (_, id: number) => {
    const file = db().prepare('SELECT * FROM attachments WHERE id = ?').get(id) as any
    if (file && existsSync(file.stored_path)) {
      try { unlinkSync(file.stored_path) } catch {}
    }
    db().prepare('DELETE FROM attachments WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('files:open', (_, id: number) => {
    const file = db().prepare('SELECT * FROM attachments WHERE id = ?').get(id) as any
    if (file && existsSync(file.stored_path)) {
      shell.openPath(file.stored_path)
      return { success: true }
    }
    return { success: false, error: 'File not found' }
  })
}
