import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { navItemsForRoleKey } from '../auth/navByRole.js'
import { signToken, verifyToken } from '../auth/jwt.js'
import { getDb } from '../db/init.js'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const body = req.body as { username?: unknown; password?: unknown }
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' })
    return
  }

  const database = getDb()
  const row = database
    .prepare(
      `
    SELECT u.id, u.username, u.password_hash, r.key AS role_key, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username = ?
  `,
    )
    .get(username) as
    | {
        id: number
        username: string
        password_hash: string
        role_key: string
        role_name: string
      }
    | undefined

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: '用户名或密码错误' })
    return
  }

  const token = signToken({
    sub: row.id,
    username: row.username,
    roleKey: row.role_key,
  })

  res.json({
    token,
    user: {
      id: row.id,
      username: row.username,
      role: { key: row.role_key, name: row.role_name },
    },
    navItems: navItemsForRoleKey(row.role_key),
  })
})

authRouter.get('/me', (req, res) => {
  const header = req.headers.authorization
  const raw = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!raw) {
    res.status(401).json({ error: '未登录' })
    return
  }

  let payload: ReturnType<typeof verifyToken>
  try {
    payload = verifyToken(raw)
  } catch {
    res.status(401).json({ error: '登录已失效' })
    return
  }

  const database = getDb()
  const row = database
    .prepare(
      `
    SELECT u.id, u.username, r.key AS role_key, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
  `,
    )
    .get(payload.sub) as
    | { id: number; username: string; role_key: string; role_name: string }
    | undefined

  if (!row) {
    res.status(401).json({ error: '用户不存在' })
    return
  }

  res.json({
    user: {
      id: row.id,
      username: row.username,
      role: { key: row.role_key, name: row.role_name },
    },
    navItems: navItemsForRoleKey(row.role_key),
  })
})
