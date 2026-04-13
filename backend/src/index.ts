import http from 'node:http'
import cors from 'cors'
import express from 'express'
import { WebSocketServer } from 'ws'
import { initDatabase } from './db/init.js'
import { apiRouter } from './routes/api.js'
import { registerClient, startBroadcastLoop } from './ws/broadcast.js'

initDatabase()

const PORT = Number(process.env.PORT) || 3001

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())
app.use('/api', apiRouter)

const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', (ws) => {
  registerClient(ws)
})

startBroadcastLoop()

server.listen(PORT, () => {
  console.log(`[backend] http://localhost:${PORT}  api=/api  ws=ws://localhost:${PORT}/ws`)
})
