import { Router } from 'express'
import { getStats } from '../mock/stats.js'
import { getShips } from '../mock/ships.js'
import { getAlerts } from '../mock/alerts.js'
import { authRouter } from './auth.js'
import { directorRouter } from './director.js'
import { layoutRouter } from './layout.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/director', directorRouter)
apiRouter.use('/layout', layoutRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

apiRouter.get('/stats', (_req, res) => {
  res.json(getStats())
})

apiRouter.get('/ships', (_req, res) => {
  res.json({ ships: getShips() })
})

apiRouter.get('/alerts', (_req, res) => {
  res.json({ alerts: getAlerts() })
})
