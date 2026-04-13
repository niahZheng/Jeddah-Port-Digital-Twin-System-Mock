import { Router } from 'express'
import {
  getDirectorDecisions,
  getDirectorExceptions,
  getDirectorFreight,
  getDirectorOverview,
  getDirectorPassenger,
  getDirectorResources,
  getDirectorSummary,
} from '../mock/directorPortal.js'

export const directorRouter = Router()

directorRouter.get('/overview', (_req, res) => {
  res.json(getDirectorOverview())
})

directorRouter.get('/freight', (_req, res) => {
  res.json(getDirectorFreight())
})

directorRouter.get('/passenger', (_req, res) => {
  res.json(getDirectorPassenger())
})

directorRouter.get('/resources', (_req, res) => {
  res.json(getDirectorResources())
})

directorRouter.get('/exceptions', (_req, res) => {
  res.json(getDirectorExceptions())
})

directorRouter.get('/decisions', (_req, res) => {
  res.json(getDirectorDecisions())
})

directorRouter.get('/summary', (_req, res) => {
  res.json(getDirectorSummary())
})
