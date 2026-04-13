import type { WebSocket } from 'ws'
import { getDirectorOverviewKpiSnapshot } from '../mock/directorPortal.js'
import { getStats } from '../mock/stats.js'
import { advanceShipSimulation, getShips } from '../mock/ships.js'

export type PortDataMessage =
  | {
      type: 'ship_update'
      timestamp: string
      payload: {
        mmsi: string
        name: string
        position: { longitude: number; latitude: number }
        heading: number
        speed: number
        status: 'anchored' | 'moored' | 'underway'
        vesselType?: 'container' | 'bulk' | 'tanker'
      }
    }
  | {
      type: 'stats_update'
      timestamp: string
      payload: ReturnType<typeof import('../mock/stats.js').getStats>
    }
  | {
      type: 'director_overview_update'
      timestamp: string
      payload: ReturnType<typeof getDirectorOverviewKpiSnapshot>
    }

const clients = new Set<WebSocket>()

export function registerClient(ws: WebSocket) {
  clients.add(ws)
  ws.on('close', () => clients.delete(ws))
}

function broadcast(msg: PortDataMessage) {
  const raw = JSON.stringify(msg)
  for (const c of clients) {
    if (c.readyState === 1) c.send(raw)
  }
}

let interval: ReturnType<typeof setInterval> | undefined

export function startBroadcastLoop() {
  if (interval) return
  interval = setInterval(() => {
    advanceShipSimulation()
    const ships = getShips()
    broadcast({
      type: 'stats_update',
      timestamp: new Date().toISOString(),
      payload: getStats(),
    })
    broadcast({
      type: 'director_overview_update',
      timestamp: new Date().toISOString(),
      payload: getDirectorOverviewKpiSnapshot(),
    })
    for (const s of ships) {
      broadcast({
        type: 'ship_update',
        timestamp: new Date().toISOString(),
        payload: {
          mmsi: s.mmsi,
          name: s.name,
          position: { longitude: s.longitude, latitude: s.latitude },
          heading: s.heading,
          speed: s.speed,
          status: s.status,
          vesselType: s.vesselType,
        },
      })
    }
  }, 3000)
}
