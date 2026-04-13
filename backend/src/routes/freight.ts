import { Router } from 'express'
import {
  getFreightBerthing,
  getFreightDeparture,
  getFreightDispatcherOverview,
  getFreightExceptions,
  getFreightHandling,
  getFreightReview,
  getFreightVehicle,
  getFreightYard,
} from '../mock/freightPortal.js'

export const freightRouter = Router()

freightRouter.get('/overview', (_req, res) => {
  res.json(getFreightDispatcherOverview())
})

freightRouter.get('/berthing', (_req, res) => {
  res.json(getFreightBerthing())
})

freightRouter.get('/handling', (_req, res) => {
  res.json(getFreightHandling())
})

freightRouter.get('/yard', (_req, res) => {
  res.json(getFreightYard())
})

freightRouter.get('/vehicle', (_req, res) => {
  res.json(getFreightVehicle())
})

freightRouter.get('/exceptions', (_req, res) => {
  res.json(getFreightExceptions())
})

freightRouter.get('/departure', (_req, res) => {
  res.json(getFreightDeparture())
})

freightRouter.get('/review', (_req, res) => {
  res.json(getFreightReview())
})
