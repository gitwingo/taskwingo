import Database from 'better-sqlite3'

// Safe ALTER TABLE — silently skips if column already exists
function safeAddColumn(db: Database.Database, table: string, column: string, definition: string): void {
  try {
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map(c => c.name)
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
      console.log(`[Migration] Added column ${table}.${column}`)
    }
  } catch (e: any) {
    console.warn(`[Migration] Could not add ${table}.${column}:`, e.message)
  }
}

const migrations: { version: number; up: (db: Database.Database) => void }[] = [
  {
    version: 1,
    up: (db) => {
      // Tasks new columns
      safeAddColumn(db, 'tasks', 'notes_html',  "TEXT DEFAULT ''")
      safeAddColumn(db, 'tasks', 'reminder_at', 'INTEGER')
      safeAddColumn(db, 'tasks', 'project_id',  'INTEGER')
      safeAddColumn(db, 'tasks', 'recur_rule',  'TEXT')
      safeAddColumn(db, 'tasks', 'recur_next',  'INTEGER')

      // Profile new columns
      safeAddColumn(db, 'profiles', 'accent_color',      "TEXT DEFAULT '#6366f1'")
      safeAddColumn(db, 'profiles', 'auto_lock_minutes', 'INTEGER DEFAULT 0')

      // New tables
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
          );
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            name TEXT NOT NULL, color TEXT DEFAULT '#6366f1',
            collapsed INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
          );
          CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
          CREATE INDEX IF NOT EXISTS idx_projects_profile ON projects(profile_id);
        `)
      } catch (e: any) {
        console.warn('[Migration v1] Table creation warning:', e.message)
      }
    }
  },
  {
    version: 2,
    up: (db) => {
      safeAddColumn(db, 'profiles', 'sort_order',         'INTEGER DEFAULT 0')
      safeAddColumn(db, 'profiles', 'avatar_cache_path',  'TEXT')
      try {
        db.exec("UPDATE profiles SET sort_order = id WHERE sort_order IS NULL OR sort_order = 0")
      } catch (e: any) {
        console.warn('[Migration v2] sort_order init warning:', e.message)
      }
    }
  }
]

export function runMigrations(db: Database.Database): void {
  const current = (db.prepare('SELECT version FROM schema_version').get() as any)?.version ?? 0
  console.log('[Migrations] Running from version', current)
  for (const migration of migrations) {
    if (migration.version > current) {
      console.log('[Migrations] Applying version', migration.version)
      try {
        migration.up(db)
        db.prepare('UPDATE schema_version SET version = ?').run(migration.version)
        console.log('[Migrations] Version', migration.version, 'applied OK')
      } catch (e: any) {
        console.error('[Migrations] Failed at version', migration.version, ':', e.message)
        throw e
      }
    }
  }
}
