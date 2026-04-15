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

  ensureDashboardLayoutsUniqueIndex(db)

  seedIfEmpty(db)
}

/** 旧库可能仅有表而无 UNIQUE，UPSERT 会失败；补建唯一索引（若已存在则忽略） */
function ensureDashboardLayoutsUniqueIndex(database: Database.Database) {
  try {
    database.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_layouts_user_page ON dashboard_layouts(user_id, page_key)',
    )
  } catch {
    /* 极端情况下忽略（如重复数据导致无法建唯一索引） */
  }
}

function seedIfEmpty(database: Database.Database) {
  const upsertRole = database.prepare(`
    INSERT INTO roles (key, name) VALUES (@key, @name)
    ON CONFLICT(key) DO UPDATE SET name = excluded.name
  `)
  upsertRole.run({ key: ROLE_KEYS.PORT_DIRECTOR, name: '港口运营总监' })
  upsertRole.run({ key: ROLE_KEYS.FREIGHT_DISPATCHER, name: '货运调度员' })
  upsertRole.run({ key: ROLE_KEYS.PASSENGER_DISPATCHER, name: '客运调度员' })
  upsertRole.run({ key: ROLE_KEYS.OPS_ENGINEER, name: '设备运维工程师' })

  const getRoleId = database.prepare('SELECT id FROM roles WHERE key = ?')
  const r1 = getRoleId.get(ROLE_KEYS.PORT_DIRECTOR) as { id: number }
  const r2 = getRoleId.get(ROLE_KEYS.FREIGHT_DISPATCHER) as { id: number }
  const r3 = getRoleId.get(ROLE_KEYS.PASSENGER_DISPATCHER) as { id: number }
  const r4 = getRoleId.get(ROLE_KEYS.OPS_ENGINEER) as { id: number }

  const upsertUser = database.prepare(`
    INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      role_id = excluded.role_id
  `)
  upsertUser.run('port_director', bcrypt.hashSync('PortDir@2026', 10), r1.id)
  upsertUser.run('freight_dispatcher', bcrypt.hashSync('FreightDisp@2026', 10), r2.id)
  upsertUser.run('passenger_dispatcher', bcrypt.hashSync('PassengerDisp@2026', 10), r3.id)
  upsertUser.run('ops_engineer', bcrypt.hashSync('OpsEng@2026', 10), r4.id)
}
