import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET ?? 'dev-jeddah-port-jwt-change-me'

export interface JwtPayload {
  sub: number
  username: string
  roleKey: string
}

export function signToken(payload: JwtPayload, expiresIn: jwt.SignOptions['expiresIn'] = '7d') {
  return jwt.sign(payload, secret, { expiresIn })
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret)
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('invalid token payload')
  }
  const o = decoded as Record<string, unknown>
  const sub = Number(o.sub)
  const username = o.username
  const roleKey = o.roleKey
  if (!Number.isFinite(sub) || typeof username !== 'string' || typeof roleKey !== 'string') {
    throw new Error('invalid token payload')
  }
  return { sub, username, roleKey }
}
