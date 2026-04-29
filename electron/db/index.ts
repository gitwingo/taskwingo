import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { createSchema } from './schema'
import { runMigrations } from './migrations/index'

let db: Database.Database

export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  mkdirSync(dbDir, { recursive: true })

  const dbPath = join(dbDir, 'taskwingo.db')
  console.log('[DB] Opening database at:', dbPath)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Ensure schema_version exists before anything else
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO schema_version (version)
    SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM schema_version);
  `)

  // Check what version we're at
  const currentVersion = (db.prepare('SELECT version FROM schema_version').get() as any)?.version ?? 0
  console.log('[DB] Current schema version:', currentVersion)

  // Check what tables already exist
  const existingTables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name)
  console.log('[DB] Existing tables:', existingTables.join(', '))

  try {
    createSchema(db)
    console.log('[DB] Schema created/verified OK')
  } catch (e: any) {
    console.error('[DB] Schema creation error:', e.message)
    throw e
  }

  try {
    runMigrations(db)
    const newVersion = (db.prepare('SELECT version FROM schema_version').get() as any)?.version ?? 0
    console.log('[DB] Migrations done, version now:', newVersion)
  } catch (e: any) {
    console.error('[DB] Migration error:', e.message)
    throw e
  }

  // Verify data
  try {
    const profileCount = (db.prepare('SELECT COUNT(*) as c FROM profiles').get() as any)?.c ?? 0
    const taskCount = (db.prepare('SELECT COUNT(*) as c FROM tasks').get() as any)?.c ?? 0
    console.log(`[DB] Profiles: ${profileCount}, Tasks: ${taskCount}`)
  } catch (e: any) {
    console.error('[DB] Count check failed:', e.message)
  }

  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}
