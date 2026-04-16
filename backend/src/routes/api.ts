import { Router } from 'express'
import { getStats } from '../mock/stats.js'
import { getShips } from '../mock/ships.js'
import { getAlerts } from '../mock/alerts.js'
import { authRouter } from './auth.js'
import { directorRouter } from './director.js'
import { freightRouter } from './freight.js'
import { layoutRouter } from './layout.js'
import { preferencesRouter } from './preferences.js'
import { basemapRouter } from './basemap.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/director', directorRouter)
apiRouter.use('/freight', freightRouter)
apiRouter.use('/layout', layoutRouter)
apiRouter.use('/preferences', preferencesRouter)
apiRouter.use('/basemap', basemapRouter)

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
