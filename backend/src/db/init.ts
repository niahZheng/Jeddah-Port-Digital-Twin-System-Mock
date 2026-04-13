import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import { ROLE_KEYS } from '../auth/navByRole.js'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

export function initDatabase() {
  const dir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true })
  const dbPath = path.join(dir, 'port.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );
    CREATE TABLE IF NOT EXISTS dashboard_layouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      page_key TEXT NOT NULL,
      layout_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, page_key)
    );
  `)

  seedIfEmpty(db)
}

function seedIfEmpty(database: Database.Database) {
  const row = database.prepare('SELECT COUNT(*) AS c FROM roles').get() as { c: number }
  if (row.c > 0) return

  const insertRole = database.prepare(
    'INSERT INTO roles (key, name) VALUES (@key, @name)',
  )
  insertRole.run({ key: ROLE_KEYS.PORT_DIRECTOR, name: '港口运营总监' })
  insertRole.run({ key: ROLE_KEYS.FREIGHT_DISPATCHER, name: '货运调度员' })

  const r1 = database
    .prepare('SELECT id FROM roles WHERE key = ?')
    .get(ROLE_KEYS.PORT_DIRECTOR) as { id: number }
  const r2 = database
    .prepare('SELECT id FROM roles WHERE key = ?')
    .get(ROLE_KEYS.FREIGHT_DISPATCHER) as { id: number }

  const insertUser = database.prepare(
    'INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)',
  )
  insertUser.run('port_director', bcrypt.hashSync('PortDir@2026', 10), r1.id)
  insertUser.run('freight_dispatcher', bcrypt.hashSync('FreightDisp@2026', 10), r2.id)
}
