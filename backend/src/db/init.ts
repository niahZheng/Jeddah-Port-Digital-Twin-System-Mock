import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import { ROLE_KEYS } from '../auth/navByRole.js'
import { INITIAL_BASEMAP_ROWS } from '../mock/initialBasemap.js'

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
    CREATE TABLE IF NOT EXISTS user_widget_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      page_key TEXT NOT NULL,
      widget_id TEXT NOT NULL,
      left_px REAL NOT NULL,
      top_px REAL NOT NULL,
      collapsed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, page_key, widget_id)
    );
    CREATE TABLE IF NOT EXISTS user_camera_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      view_key TEXT NOT NULL,
      view_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, view_key)
    );
    CREATE TABLE IF NOT EXISTS basemap_entities (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      glb_uri TEXT,
      longitude REAL,
      latitude REAL,
      height REAL,
      scale REAL NOT NULL DEFAULT 1,
      heading_deg REAL NOT NULL DEFAULT 0,
      rotation_mode TEXT NOT NULL DEFAULT 'fixed',
      track_mmsi TEXT,
      height_ref TEXT NOT NULL DEFAULT 'clamp',
      label_text TEXT,
      zone_code TEXT,
      zone_points_json TEXT,
      fill_color TEXT,
      outline_color TEXT,
      path_points_json TEXT,
      patrol_truck_count INTEGER,
      patrol_segment_seconds INTEGER,
      patrol_stagger_seconds INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ship_draft_overrides (
      mmsi TEXT PRIMARY KEY,
      draft_meters REAL NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  ensureDashboardLayoutsUniqueIndex(db)
  ensureUserWidgetStatesUniqueIndex(db)
  ensureUserCameraViewsUniqueIndex(db)

  seedIfEmpty(db)
  seedBasemapIfEmpty(db)
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

function ensureUserWidgetStatesUniqueIndex(database: Database.Database) {
  try {
    database.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_widget_states_user_page_widget ON user_widget_states(user_id, page_key, widget_id)',
    )
  } catch {
    /* ignore */
  }
}

function ensureUserCameraViewsUniqueIndex(database: Database.Database) {
  try {
    database.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_camera_views_user_key ON user_camera_views(user_id, view_key)',
    )
  } catch {
    /* ignore */
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

function seedBasemapIfEmpty(database: Database.Database) {
  const row = database.prepare('SELECT COUNT(*) AS c FROM basemap_entities').get() as { c: number }
  if (row.c > 0) return
  const updatedAt = new Date().toISOString()
  const stmt = database.prepare(`
    INSERT INTO basemap_entities (
      id, kind, name, visible, glb_uri, longitude, latitude, height,
      scale, heading_deg, rotation_mode, track_mmsi, height_ref, label_text,
      zone_code, zone_points_json, fill_color, outline_color,
      path_points_json, patrol_truck_count, patrol_segment_seconds, patrol_stagger_seconds,
      sort_order, updated_at
    ) VALUES (
      @id, @kind, @name, @visible, @glb_uri, @longitude, @latitude, @height,
      @scale, @heading_deg, @rotation_mode, @track_mmsi, @height_ref, @label_text,
      @zone_code, @zone_points_json, @fill_color, @outline_color,
      @path_points_json, @patrol_truck_count, @patrol_segment_seconds, @patrol_stagger_seconds,
      @sort_order, @updated_at
    )
  `)
  for (const r of INITIAL_BASEMAP_ROWS) {
    stmt.run({
      id: r.id,
      kind: r.kind,
      name: r.name,
      visible: r.visible,
      glb_uri: r.glb_uri,
      longitude: r.longitude,
      latitude: r.latitude,
      height: r.height,
      scale: r.scale,
      heading_deg: r.heading_deg,
      rotation_mode: r.rotation_mode,
      track_mmsi: r.track_mmsi,
      height_ref: r.height_ref,
      label_text: r.label_text,
      zone_code: r.zone_code,
      zone_points_json: r.zone_points_json,
      fill_color: r.fill_color,
      outline_color: r.outline_color,
      path_points_json: r.path_points_json,
      patrol_truck_count: r.patrol_truck_count,
      patrol_segment_seconds: r.patrol_segment_seconds,
      patrol_stagger_seconds: r.patrol_stagger_seconds,
      sort_order: r.sort_order,
      updated_at: updatedAt,
    })
  }
}
