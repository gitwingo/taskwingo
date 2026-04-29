import { ipcMain, app } from 'electron'
import { getDb } from '../db/index'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'

// Fix #3: copy avatar to app data dir so it persists regardless of source file location
function cacheAvatar(srcPath: string): string {
  const avatarDir = join(app.getPath('userData'), 'avatars')
  mkdirSync(avatarDir, { recursive: true })
  const ext = extname(srcPath) || '.jpg'
  const destName = `avatar_${randomUUID()}${ext}`
  const destPath = join(avatarDir, destName)
  copyFileSync(srcPath, destPath)
  return destPath
}

export function registerProfileHandlers(): void {
  const db = () => getDb()

  // Fix #2: order by sort_order
  ipcMain.handle('profiles:get-all', () => {
    return db().prepare('SELECT * FROM profiles ORDER BY sort_order ASC, created_at ASC').all()
  })

  ipcMain.handle('profiles:create', (_, profile: any) => {
    const maxOrder = (db().prepare('SELECT MAX(sort_order) as m FROM profiles').get() as any)?.m ?? 0
    let avatarCachePath: string | null = null
    // Fix #3: cache avatar on create
    if (profile.avatar_path && existsSync(profile.avatar_path)) {
      try { avatarCachePath = cacheAvatar(profile.avatar_path) } catch {}
    }
    const result = db().prepare(`
      INSERT INTO profiles (name, avatar_path, avatar_cache_path, bio, links, color, accent_color, auto_lock_minutes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.name,
      profile.avatar_path ?? null,
      avatarCachePath,
      profile.bio ?? '',
      JSON.stringify(profile.links ?? []),
      profile.color ?? '#6366f1',
      profile.accent_color ?? '#6366f1',
      profile.auto_lock_minutes ?? 0,
      maxOrder + 1
    )
    return db().prepare('SELECT * FROM profiles WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('profiles:update', (_, id: number, data: any) => {
    const fields: string[] = []
    const values: any[] = []
    const allowed = ['name','avatar_path','avatar_cache_path','bio','links','color','accent_color','auto_lock_minutes','sort_order']
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push(key === 'links' ? JSON.stringify(data[key]) : data[key])
      }
    }
    fields.push('updated_at = unixepoch()')
    values.push(id)
    db().prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db().prepare('SELECT * FROM profiles WHERE id = ?').get(id)
  })

  ipcMain.handle('profiles:delete', (_, id: number) => {
    db().prepare('DELETE FROM profiles WHERE id = ?').run(id)
    return { success: true }
  })

  // Fix #3: cache avatar file into app data so moving original doesn't break it
  ipcMain.handle('profiles:set-avatar', (_, id: number, imagePath: string) => {
    let cachePath: string | null = null
    if (existsSync(imagePath)) {
      try { cachePath = cacheAvatar(imagePath) } catch {}
    }
    db().prepare('UPDATE profiles SET avatar_path = ?, avatar_cache_path = ?, updated_at = unixepoch() WHERE id = ?')
      .run(imagePath, cachePath, id)
    return { success: true, cache_path: cachePath }
  })

  // Fix #2: bulk reorder profiles
  ipcMain.handle('profiles:reorder', (_, updates: { id: number; sort_order: number }[]) => {
    const stmt = db().prepare('UPDATE profiles SET sort_order = ? WHERE id = ?')
    const tx = db().transaction((items: typeof updates) => {
      for (const item of items) stmt.run(item.sort_order, item.id)
    })
    tx(updates)
    return { success: true }
  })
}
