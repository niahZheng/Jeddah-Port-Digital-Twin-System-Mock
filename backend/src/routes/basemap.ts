import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { requireUserId } from '../auth/session.js'
import { getDb } from '../db/init.js'
import { getShips, getShipSeedDefaultDraftMeters } from '../mock/ships.js'

export type BasemapEntityDto = {
  id: string
  kind: 'model' | 'zone'
  name: string
  visible: boolean
  glbUri: string | null
  longitude: number | null
  latitude: number | null
  height: number | null
  scale: number
  headingDeg: number
  rotationMode: 'fixed' | 'dynamic_track'
  trackMmsi: string | null
  heightRef: 'none' | 'clamp'
  labelText: string | null
  zoneCode: string | null
  zonePoints: Array<{ longitude: number; latitude: number; height: number }> | null
  fillColor: string | null
  outlineColor: string | null
  pathPoints: Array<{ longitude: number; latitude: number; height: number }> | null
  patrolTruckCount: number | null
  patrolSegmentSeconds: number | null
  patrolStaggerSeconds: number | null
  sortOrder: number
  updatedAt: string
}

type DbRow = {
  id: string
  kind: string
  name: string
  visible: number
  glb_uri: string | null
  longitude: number | null
  latitude: number | null
  height: number | null
  scale: number
  heading_deg: number
  rotation_mode: string
  track_mmsi: string | null
  height_ref: string
  label_text: string | null
  zone_code: string | null
  zone_points_json: string | null
  fill_color: string | null
  outline_color: string | null
  path_points_json: string | null
  patrol_truck_count: number | null
  patrol_segment_seconds: number | null
  patrol_stagger_seconds: number | null
  sort_order: number
  updated_at: string
}

export const basemapRouter = Router()

basemapRouter.get('/entities', (_req, res) => {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT * FROM basemap_entities ORDER BY sort_order ASC, id ASC`,
    )
    .all() as DbRow[]
  res.json({ entities: rows.map(rowToDto) })
})

basemapRouter.post('/entities', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const parsed = normalizeInput(req.body, { generateId: true })
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  const db = getDb()
  const updatedAt = new Date().toISOString()
  insertRow(db, parsed.value, updatedAt)
  const row = db.prepare('SELECT * FROM basemap_entities WHERE id = ?').get(parsed.value.id) as DbRow
  res.status(201).json({ entity: rowToDto(row) })
})

basemapRouter.put('/entities/:id', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const id = String(req.params.id ?? '').trim()
  if (!id) {
    res.status(400).json({ error: '缺少 id' })
    return
  }
  const parsed = normalizeInput({ ...(req.body as object), id }, { generateId: false })
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  if (parsed.value.id !== id) {
    res.status(400).json({ error: '路径 id 与 body 不一致' })
    return
  }
  const db = getDb()
  const existing = db.prepare('SELECT 1 AS ok FROM basemap_entities WHERE id = ?').get(id) as
    | { ok: number }
    | undefined
  if (!existing) {
    res.status(404).json({ error: '未找到实体' })
    return
  }
  const updatedAt = new Date().toISOString()
  updateRow(db, parsed.value, updatedAt)
  const row = db.prepare('SELECT * FROM basemap_entities WHERE id = ?').get(id) as DbRow
  res.json({ entity: rowToDto(row) })
})

basemapRouter.delete('/entities/:id', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const id = String(req.params.id ?? '').trim()
  if (!id) {
    res.status(400).json({ error: '缺少 id' })
    return
  }
  const db = getDb()
  const r = db.prepare('DELETE FROM basemap_entities WHERE id = ?').run(id)
  if (r.changes === 0) {
    res.status(404).json({ error: '未找到实体' })
    return
  }
  res.json({ ok: true, id })
})

basemapRouter.get('/ship-drafts', (_req, res) => {
  const ships = getShips()
  const db = getDb()
  const ovs = db.prepare('SELECT mmsi FROM ship_draft_overrides').all() as { mmsi: string }[]
  const set = new Set(ovs.map((o) => o.mmsi))
  res.json({
    items: ships.map((s) => ({
      mmsi: s.mmsi,
      name: s.name,
      draftMeters: s.draftMeters,
      usesDatabaseOverride: set.has(s.mmsi),
      mockDefaultDraftMeters: getShipSeedDefaultDraftMeters(s.mmsi),
    })),
  })
})

basemapRouter.put('/ship-drafts/:mmsi', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const mmsi = String(req.params.mmsi ?? '').trim()
  if (!mmsi) {
    res.status(400).json({ error: '缺少 mmsi' })
    return
  }
  const dm = Number((req.body as { draftMeters?: unknown }).draftMeters)
  if (!Number.isFinite(dm)) {
    res.status(400).json({ error: 'draftMeters 须为数字（可正可负）' })
    return
  }
  const db = getDb()
  const updatedAt = new Date().toISOString()
  const ex = db
    .prepare('SELECT 1 AS ok FROM ship_draft_overrides WHERE mmsi = ?')
    .get(mmsi) as { ok: number } | undefined
  if (ex) {
    db.prepare(
      'UPDATE ship_draft_overrides SET draft_meters = ?, updated_at = ? WHERE mmsi = ?',
    ).run(dm, updatedAt, mmsi)
  } else {
    db.prepare(
      'INSERT INTO ship_draft_overrides (mmsi, draft_meters, updated_at) VALUES (?, ?, ?)',
    ).run(mmsi, dm, updatedAt)
  }
  res.json({
    mmsi,
    draftMeters: dm,
    usesDatabaseOverride: true,
    mockDefaultDraftMeters: getShipSeedDefaultDraftMeters(mmsi),
  })
})

basemapRouter.delete('/ship-drafts/:mmsi', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const mmsi = String(req.params.mmsi ?? '').trim()
  if (!mmsi) {
    res.status(400).json({ error: '缺少 mmsi' })
    return
  }
  const r = getDb().prepare('DELETE FROM ship_draft_overrides WHERE mmsi = ?').run(mmsi)
  if (r.changes === 0) {
    res.status(404).json({ error: '无自定义下沉记录' })
    return
  }
  res.json({ ok: true, mmsi })
})

function getUserIdOr401(req: Request, res: Response): number | null {
  try {
    return requireUserId(req)
  } catch {
    res.status(401).json({ error: '未登录' })
    return null
  }
}

function rowToDto(row: DbRow): BasemapEntityDto {
  return {
    id: row.id,
    kind: row.kind === 'zone' ? 'zone' : 'model',
    name: row.name,
    visible: row.visible === 1,
    glbUri: row.glb_uri,
    longitude: row.longitude,
    latitude: row.latitude,
    height: row.height,
    scale: row.scale,
    headingDeg: row.heading_deg,
    rotationMode: row.rotation_mode === 'dynamic_track' ? 'dynamic_track' : 'fixed',
    trackMmsi: row.track_mmsi,
    heightRef: row.height_ref === 'none' ? 'none' : 'clamp',
    labelText: row.label_text,
    zoneCode: row.zone_code,
    zonePoints: parseJsonPoints(row.zone_points_json),
    fillColor: row.fill_color,
    outlineColor: row.outline_color,
    pathPoints: parseJsonPoints(row.path_points_json),
    patrolTruckCount: row.patrol_truck_count,
    patrolSegmentSeconds: row.patrol_segment_seconds,
    patrolStaggerSeconds: row.patrol_stagger_seconds,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }
}

function parseJsonPoints(json: string | null): BasemapEntityDto['zonePoints'] {
  if (!json) return null
  try {
    const v = JSON.parse(json) as unknown
    if (!Array.isArray(v)) return null
    const out: NonNullable<BasemapEntityDto['zonePoints']> = []
    for (const item of v) {
      if (typeof item !== 'object' || item === null) continue
      const o = item as Record<string, unknown>
      const longitude = Number(o.longitude)
      const latitude = Number(o.latitude)
      const height = o.height != null ? Number(o.height) : 0
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(height)) continue
      out.push({ longitude, latitude, height })
    }
    return out.length ? out : null
  } catch {
    return null
  }
}

type NormalizedRow = {
  id: string
  kind: 'model' | 'zone'
  name: string
  visible: number
  glb_uri: string | null
  longitude: number | null
  latitude: number | null
  height: number | null
  scale: number
  heading_deg: number
  rotation_mode: 'fixed' | 'dynamic_track'
  track_mmsi: string | null
  height_ref: 'none' | 'clamp'
  label_text: string | null
  zone_code: string | null
  zone_points_json: string | null
  fill_color: string | null
  outline_color: string | null
  path_points_json: string | null
  patrol_truck_count: number | null
  patrol_segment_seconds: number | null
  patrol_stagger_seconds: number | null
  sort_order: number
}

function normalizeInput(
  body: unknown,
  opts: { generateId: boolean },
): { ok: true; value: NormalizedRow } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: '请求体无效' }
  }
  const b = body as Record<string, unknown>
  let id = typeof b.id === 'string' && b.id.trim() ? b.id.trim() : ''
  if (!id && opts.generateId) id = randomUUID()

  const kindRaw = b.kind
  const kind = kindRaw === 'zone' ? 'zone' : kindRaw === 'model' ? 'model' : ''
  if (!kind) return { ok: false, error: 'kind 须为 model 或 zone' }

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (!name) return { ok: false, error: '缺少名称 name' }

  const visible = b.visible === false || b.visible === 0 ? 0 : 1

  const glbUri =
    b.glbUri === null || b.glbUri === undefined
      ? null
      : typeof b.glbUri === 'string'
        ? b.glbUri.trim() || null
        : null

  const longitude = parseNullableNum(b.longitude)
  const latitude = parseNullableNum(b.latitude)
  const height = parseNullableNum(b.height)
  const scale = Number(b.scale)
  const headingDeg = Number(b.headingDeg ?? b.heading_deg ?? 0)
  if (!Number.isFinite(scale) || scale <= 0) return { ok: false, error: 'scale 须为正数' }
  if (!Number.isFinite(headingDeg)) return { ok: false, error: 'headingDeg 无效' }

  const rotationMode =
    b.rotationMode === 'dynamic_track' || b.rotation_mode === 'dynamic_track'
      ? 'dynamic_track'
      : 'fixed'
  const trackMmsi =
    b.trackMmsi != null && String(b.trackMmsi).trim()
      ? String(b.trackMmsi).trim()
      : b.track_mmsi != null && String(b.track_mmsi).trim()
        ? String(b.track_mmsi).trim()
        : null

  if (rotationMode === 'dynamic_track' && !trackMmsi) {
    return { ok: false, error: '动态跟踪须填写 trackMmsi' }
  }

  const heightRef =
    b.heightRef === 'none' || b.height_ref === 'none' ? 'none' : 'clamp'

  const labelText =
    b.labelText != null && String(b.labelText).trim()
      ? String(b.labelText).trim()
      : b.label_text != null && String(b.label_text).trim()
        ? String(b.label_text).trim()
        : null

  const zoneCode =
    b.zoneCode != null && String(b.zoneCode).trim()
      ? String(b.zoneCode).trim()
      : b.zone_code != null && String(b.zone_code).trim()
        ? String(b.zone_code).trim()
        : null

  const zonePointsJson = serializePointsInput(b.zonePoints ?? b.zone_points)
  const pathPointsJson = serializePointsInput(b.pathPoints ?? b.path_points)

  const fillColor =
    typeof b.fillColor === 'string' && b.fillColor.trim()
      ? b.fillColor.trim()
      : typeof b.fill_color === 'string' && b.fill_color.trim()
        ? b.fill_color.trim()
        : null
  const outlineColor =
    typeof b.outlineColor === 'string' && b.outlineColor.trim()
      ? b.outlineColor.trim()
      : typeof b.outline_color === 'string' && b.outline_color.trim()
        ? b.outline_color.trim()
        : null

  let patrolTruckCount = parseNullableInt(b.patrolTruckCount ?? b.patrol_truck_count)
  let patrolSegmentSeconds = parseNullableInt(b.patrolSegmentSeconds ?? b.patrol_segment_seconds)
  let patrolStaggerSeconds = parseNullableInt(b.patrolStaggerSeconds ?? b.patrol_stagger_seconds)

  const sortOrder = Number(b.sortOrder ?? b.sort_order ?? 0)
  if (!Number.isFinite(sortOrder)) return { ok: false, error: 'sortOrder 无效' }

  if (kind === 'zone') {
    if (!zonePointsJson) return { ok: false, error: '区域须提供 zonePoints' }
  } else {
    const hasPath = Boolean(pathPointsJson)
    if (!hasPath && !glbUri) return { ok: false, error: '模型须提供 glbUri，或配置巡逻路径 pathPoints' }
    if (hasPath) {
      if (patrolTruckCount == null || patrolTruckCount < 1) patrolTruckCount = 1
      if (patrolSegmentSeconds == null || patrolSegmentSeconds < 0.5) patrolSegmentSeconds = 2
      if (patrolStaggerSeconds == null || patrolStaggerSeconds < 0) patrolStaggerSeconds = 0
    } else {
      patrolTruckCount = null
      patrolSegmentSeconds = null
      patrolStaggerSeconds = null
    }
    if (rotationMode === 'dynamic_track') {
      if (longitude == null || latitude == null) {
        return { ok: false, error: '动态跟踪模型建议填写初始经纬度（船舶未到时占位）' }
      }
    } else if (!hasPath && (longitude == null || latitude == null)) {
      return { ok: false, error: '模型须填写经纬度' }
    }
  }

  return {
    ok: true,
    value: {
      id,
      kind,
      name,
      visible,
      glb_uri: glbUri,
      longitude,
      latitude,
      height,
      scale,
      heading_deg: headingDeg,
      rotation_mode: rotationMode,
      track_mmsi: trackMmsi,
      height_ref: heightRef,
      label_text: labelText,
      zone_code: zoneCode,
      zone_points_json: zonePointsJson,
      fill_color: fillColor,
      outline_color: outlineColor,
      path_points_json: pathPointsJson,
      patrol_truck_count: patrolTruckCount,
      patrol_segment_seconds: patrolSegmentSeconds,
      patrol_stagger_seconds: patrolStaggerSeconds,
      sort_order: sortOrder,
    },
  }
}

function parseNullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseNullableInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? n : null
}

function serializePointsInput(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return null
    try {
      const parsed = JSON.parse(t) as unknown
      return serializePointsArray(parsed)
    } catch {
      return null
    }
  }
  return serializePointsArray(v)
}

function serializePointsArray(v: unknown): string | null {
  if (!Array.isArray(v) || v.length === 0) return null
  const out: Array<{ longitude: number; latitude: number; height: number }> = []
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const longitude = Number(o.longitude)
    const latitude = Number(o.latitude)
    const height = o.height != null ? Number(o.height) : 0
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(height)) continue
    out.push({ longitude, latitude, height })
  }
  return out.length ? JSON.stringify(out) : null
}

function insertRow(db: ReturnType<typeof getDb>, r: NormalizedRow, updatedAt: string) {
  db.prepare(
    `INSERT INTO basemap_entities (
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
    )`,
  ).run({ ...r, updated_at: updatedAt })
}

function updateRow(db: ReturnType<typeof getDb>, r: NormalizedRow, updatedAt: string) {
  db.prepare(
    `UPDATE basemap_entities SET
      kind = @kind, name = @name, visible = @visible, glb_uri = @glb_uri,
      longitude = @longitude, latitude = @latitude, height = @height,
      scale = @scale, heading_deg = @heading_deg, rotation_mode = @rotation_mode,
      track_mmsi = @track_mmsi, height_ref = @height_ref, label_text = @label_text,
      zone_code = @zone_code, zone_points_json = @zone_points_json,
      fill_color = @fill_color, outline_color = @outline_color,
      path_points_json = @path_points_json, patrol_truck_count = @patrol_truck_count,
      patrol_segment_seconds = @patrol_segment_seconds, patrol_stagger_seconds = @patrol_stagger_seconds,
      sort_order = @sort_order, updated_at = @updated_at WHERE id = @id`,
  ).run({ ...r, updated_at: updatedAt })
}
