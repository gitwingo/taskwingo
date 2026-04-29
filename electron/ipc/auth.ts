import { ipcMain } from 'electron'
import { getDb } from '../db/index'
import { createHash } from 'crypto'

function hashPin(pin: string): string {
  return createHash('sha256').update(pin + 'taskflow_salt_2024').digest('hex')
}

export function registerAuthHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('auth:has-pin', (_, profileId: number) => {
    const profile = db().prepare('SELECT pin_hash FROM profiles WHERE id = ?').get(profileId) as any
    return !!profile?.pin_hash
  })

  ipcMain.handle('auth:set-pin', (_, profileId: number, pin: string) => {
    db().prepare('UPDATE profiles SET pin_hash = ? WHERE id = ?').run(hashPin(pin), profileId)
    return { success: true }
  })

  ipcMain.handle('auth:verify-pin', (_, profileId: number, pin: string) => {
    const profile = db().prepare('SELECT pin_hash FROM profiles WHERE id = ?').get(profileId) as any
    if (!profile?.pin_hash) return { success: true }
    return { success: profile.pin_hash === hashPin(pin) }
  })

  ipcMain.handle('auth:remove-pin', (_, profileId: number, pin: string) => {
    const profile = db().prepare('SELECT pin_hash FROM profiles WHERE id = ?').get(profileId) as any
    if (profile?.pin_hash && profile.pin_hash !== hashPin(pin)) {
      return { success: false, error: 'Incorrect PIN' }
    }
    db().prepare('UPDATE profiles SET pin_hash = NULL WHERE id = ?').run(profileId)
    return { success: true }
  })

  ipcMain.handle('auth:change-pin', (_, profileId: number, oldPin: string, newPin: string) => {
    const profile = db().prepare('SELECT pin_hash FROM profiles WHERE id = ?').get(profileId) as any
    if (profile?.pin_hash && profile.pin_hash !== hashPin(oldPin)) {
      return { success: false, error: 'Incorrect current PIN' }
    }
    db().prepare('UPDATE profiles SET pin_hash = ? WHERE id = ?').run(hashPin(newPin), profileId)
    return { success: true }
  })
}
