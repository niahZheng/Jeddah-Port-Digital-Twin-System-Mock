import { Router, type Request, type Response } from 'express'
import { requireUserId } from '../auth/session.js'
import { getDb } from '../db/init.js'

type CameraViewState = {
  longitude: number
  latitude: number
  height: number
  heading: number
  pitch: number
  roll: number
}

type WidgetState = {
  left: number
  top: number
  collapsed: boolean
}

export const preferencesRouter = Router()

preferencesRouter.get('/camera-view/:viewKey', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const viewKey = String(req.params.viewKey ?? '').trim()
  if (!viewKey) {
    res.status(400).json({ error: '缺少 viewKey' })
    return
  }

  const db = getDb()
  const row = db
    .prepare(
      'SELECT view_json, updated_at FROM user_camera_views WHERE user_id = ? AND view_key = ?',
    )
    .get(userId, viewKey) as { view_json: string; updated_at: string } | undefined

  if (!row) {
    res.json({ viewKey, view: null, updatedAt: null, source: 'none' })
    return
  }

  const parsed = parseCameraView(row.view_json)
  if (!parsed) {
    res.json({ viewKey, view: null, updatedAt: row.updated_at, source: 'db' })
    return
  }
  res.json({ viewKey, view: parsed, updatedAt: row.updated_at, source: 'db' })
})

preferencesRouter.put('/camera-view/:viewKey', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const viewKey = String(req.params.viewKey ?? '').trim()
  if (!viewKey) {
    res.status(400).json({ error: '缺少 viewKey' })
    return
  }
  const body = req.body as { view?: unknown }
  const view = normalizeCameraView(body.view)
  if (!view) {
    res.status(400).json({ error: 'view 格式不合法' })
    return
  }

  const db = getDb()
  const updatedAt = new Date().toISOString()
  const json = JSON.stringify(view)
  const existing = db
    .prepare('SELECT 1 AS ok FROM user_camera_views WHERE user_id = ? AND view_key = ? LIMIT 1')
    .get(userId, viewKey) as { ok: number } | undefined

  if (existing) {
    db.prepare(
      'UPDATE user_camera_views SET view_json = ?, updated_at = ? WHERE user_id = ? AND view_key = ?',
    ).run(json, updatedAt, userId, viewKey)
  } else {
    db.prepare(
      'INSERT INTO user_camera_views (user_id, view_key, view_json, updated_at) VALUES (?, ?, ?, ?)',
    ).run(userId, viewKey, json, updatedAt)
  }
  res.json({ viewKey, view, updatedAt, source: 'db' })
})

preferencesRouter.get('/widget-state/:pageKey/:widgetId', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const pageKey = String(req.params.pageKey ?? '').trim()
  const widgetId = String(req.params.widgetId ?? '').trim()
  if (!pageKey || !widgetId) {
    res.status(400).json({ error: '缺少 pageKey 或 widgetId' })
    return
  }

  const db = getDb()
  const row = db
    .prepare(
      `SELECT left_px, top_px, collapsed, updated_at
       FROM user_widget_states
       WHERE user_id = ? AND page_key = ? AND widget_id = ?`,
    )
    .get(userId, pageKey, widgetId) as
    | { left_px: number; top_px: number; collapsed: number; updated_at: string }
    | undefined

  if (!row) {
    res.json({ pageKey, widgetId, state: null, updatedAt: null, source: 'none' })
    return
  }
  res.json({
    pageKey,
    widgetId,
    state: {
      left: Number(row.left_px),
      top: Number(row.top_px),
      collapsed: row.collapsed === 1,
    },
    updatedAt: row.updated_at,
    source: 'db',
  })
})

preferencesRouter.put('/widget-state/:pageKey/:widgetId', (req, res) => {
  const userId = getUserIdOr401(req, res)
  if (!userId) return
  const pageKey = String(req.params.pageKey ?? '').trim()
  const widgetId = String(req.params.widgetId ?? '').trim()
  if (!pageKey || !widgetId) {
    res.status(400).json({ error: '缺少 pageKey 或 widgetId' })
    return
  }

  const body = req.body as { state?: unknown }
  const state = normalizeWidgetState(body.state)
  if (!state) {
    res.status(400).json({ error: 'state 格式不合法' })
    return
  }

  const db = getDb()
  const updatedAt = new Date().toISOString()
  const existing = db
    .prepare(
      'SELECT 1 AS ok FROM user_widget_states WHERE user_id = ? AND page_key = ? AND widget_id = ? LIMIT 1',
    )
    .get(userId, pageKey, widgetId) as { ok: number } | undefined

  if (existing) {
    db.prepare(
      `UPDATE user_widget_states
       SET left_px = ?, top_px = ?, collapsed = ?, updated_at = ?
       WHERE user_id = ? AND page_key = ? AND widget_id = ?`,
    ).run(state.left, state.top, state.collapsed ? 1 : 0, updatedAt, userId, pageKey, widgetId)
  } else {
    db.prepare(
      `INSERT INTO user_widget_states
       (user_id, page_key, widget_id, left_px, top_px, collapsed, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, pageKey, widgetId, state.left, state.top, state.collapsed ? 1 : 0, updatedAt)
  }
  res.json({ pageKey, widgetId, state, updatedAt, source: 'db' })
})

function getUserIdOr401(req: Request, res: Response): number | null {
  try {
    return requireUserId(req)
  } catch {
    res.status(401).json({ error: '未登录' })
    return null
  }
}

function parseCameraView(json: string): CameraViewState | null {
  try {
    return normalizeCameraView(JSON.parse(json))
  } catch {
    return null
  }
}

function normalizeCameraView(input: unknown): CameraViewState | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>
  const longitude = Number(o.longitude)
  const latitude = Number(o.latitude)
  const height = Number(o.height)
  const heading = Number(o.heading)
  const pitch = Number(o.pitch)
  const roll = Number(o.roll)
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(height) ||
    !Number.isFinite(heading) ||
    !Number.isFinite(pitch) ||
    !Number.isFinite(roll)
  ) {
    return null
  }
  return { longitude, latitude, height, heading, pitch, roll }
}

function normalizeWidgetState(input: unknown): WidgetState | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>
  const left = Number(o.left)
  const top = Number(o.top)
  const collapsed = Boolean(o.collapsed)
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null
  return { left, top, collapsed }
}
