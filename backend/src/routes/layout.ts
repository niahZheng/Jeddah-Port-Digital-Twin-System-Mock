import { Router } from 'express'
import { requireUserId } from '../auth/session.js'
import { getDb } from '../db/init.js'
import { getDefaultLayout } from '../layout/defaults.js'
import { normalizeLayout } from '../layout/types.js'

export const layoutRouter = Router()

layoutRouter.get('/:pageKey', (req, res) => {
  let userId: number
  try {
    userId = requireUserId(req)
  } catch {
    res.status(401).json({ error: '未登录' })
    return
  }
  const pageKey = String(req.params.pageKey ?? '').trim()
  if (!pageKey) {
    res.status(400).json({ error: '缺少 pageKey' })
    return
  }
  const db = getDb()
  const row = db
    .prepare(
      'SELECT layout_json, updated_at FROM dashboard_layouts WHERE user_id = ? AND page_key = ?',
    )
    .get(userId, pageKey) as { layout_json: string; updated_at: string } | undefined

  if (!row) {
    res.json({
      pageKey,
      layout: getDefaultLayout(pageKey),
      updatedAt: null,
      source: 'default',
    })
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(row.layout_json)
  } catch {
    parsed = null
  }
  const layout = normalizeLayout(parsed) ?? getDefaultLayout(pageKey)
  res.json({ pageKey, layout, updatedAt: row.updated_at, source: 'db' })
})

layoutRouter.put('/:pageKey', (req, res) => {
  let userId: number
  try {
    userId = requireUserId(req)
  } catch {
    res.status(401).json({ error: '未登录' })
    return
  }
  const pageKey = String(req.params.pageKey ?? '').trim()
  if (!pageKey) {
    res.status(400).json({ error: '缺少 pageKey' })
    return
  }
  const body = req.body as { layout?: unknown }
  const layout = normalizeLayout(body.layout)
  if (!layout) {
    res.status(400).json({ error: 'layout 格式不合法' })
    return
  }
  const updatedAt = new Date().toISOString()
  const db = getDb()
  db.prepare(
    `
    INSERT INTO dashboard_layouts (user_id, page_key, layout_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, page_key)
    DO UPDATE SET layout_json = excluded.layout_json, updated_at = excluded.updated_at
  `,
  ).run(userId, pageKey, JSON.stringify(layout), updatedAt)

  res.json({ pageKey, layout, updatedAt, source: 'db' })
})
