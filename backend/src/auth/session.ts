import type { Request } from 'express'
import { verifyToken } from './jwt.js'

export function getBearerToken(req: Request): string {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

export function requireUserId(req: Request): number {
  const token = getBearerToken(req)
  if (!token) throw new Error('UNAUTHORIZED')
  const payload = verifyToken(token)
  return payload.sub
}
