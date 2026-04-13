import type { LoginResponse, MeResponse } from '../types/auth'
import type {
  DirectorDecisions,
  DirectorExceptions,
  DirectorFreight,
  DirectorOverview,
  DirectorPassenger,
  DirectorResources,
  DirectorSummary,
} from '../types/director'
import type {
  FreightDispatcherJson,
  FreightDispatcherOverview,
} from '../types/freightDispatcher'
import type { AlertItem, PortDataMessage, PortStats, ShipData } from '../types/port'
import type { DashboardLayout, DashboardLayoutResponse } from '../types/layout'

const api = (path: string) => (import.meta.env.VITE_API_BASE ?? '') + path

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const r = await fetch(api('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const j = (await r.json()) as { error?: string } & Partial<LoginResponse>
  if (!r.ok) {
    throw new Error(typeof j.error === 'string' ? j.error : '登录失败')
  }
  if (!j.token || !j.user || !j.navItems) {
    throw new Error('登录响应无效')
  }
  return { token: j.token, user: j.user, navItems: j.navItems }
}

export async function fetchMe(token: string): Promise<MeResponse> {
  const r = await fetch(api('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('me')
  const j = (await r.json()) as MeResponse
  if (!j.user || !j.navItems) throw new Error('me')
  return j
}

export async function fetchDirectorOverview(): Promise<DirectorOverview> {
  const r = await fetch(api('/api/director/overview'))
  if (!r.ok) throw new Error('director overview')
  return r.json() as Promise<DirectorOverview>
}

export async function fetchDirectorFreight(): Promise<DirectorFreight> {
  const r = await fetch(api('/api/director/freight'))
  if (!r.ok) throw new Error('director freight')
  return r.json() as Promise<DirectorFreight>
}

export async function fetchDirectorPassenger(): Promise<DirectorPassenger> {
  const r = await fetch(api('/api/director/passenger'))
  if (!r.ok) throw new Error('director passenger')
  return r.json() as Promise<DirectorPassenger>
}

export async function fetchDirectorResources(): Promise<DirectorResources> {
  const r = await fetch(api('/api/director/resources'))
  if (!r.ok) throw new Error('director resources')
  return r.json() as Promise<DirectorResources>
}

export async function fetchDirectorExceptions(): Promise<DirectorExceptions> {
  const r = await fetch(api('/api/director/exceptions'))
  if (!r.ok) throw new Error('director exceptions')
  return r.json() as Promise<DirectorExceptions>
}

export async function fetchDirectorDecisions(): Promise<DirectorDecisions> {
  const r = await fetch(api('/api/director/decisions'))
  if (!r.ok) throw new Error('director decisions')
  return r.json() as Promise<DirectorDecisions>
}

export async function fetchDirectorSummary(): Promise<DirectorSummary> {
  const r = await fetch(api('/api/director/summary'))
  if (!r.ok) throw new Error('director summary')
  return r.json() as Promise<DirectorSummary>
}

export async function fetchFreightOverview(): Promise<FreightDispatcherOverview> {
  const r = await fetch(api('/api/freight/overview'))
  if (!r.ok) throw new Error('freight overview')
  return r.json() as Promise<FreightDispatcherOverview>
}

export async function fetchFreightBerthing(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/berthing'))
  if (!r.ok) throw new Error('freight berthing')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchFreightHandling(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/handling'))
  if (!r.ok) throw new Error('freight handling')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchFreightYard(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/yard'))
  if (!r.ok) throw new Error('freight yard')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchFreightVehicle(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/vehicle'))
  if (!r.ok) throw new Error('freight vehicle')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchFreightExceptions(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/exceptions'))
  if (!r.ok) throw new Error('freight exceptions')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchFreightDeparture(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/departure'))
  if (!r.ok) throw new Error('freight departure')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchFreightReview(): Promise<FreightDispatcherJson> {
  const r = await fetch(api('/api/freight/review'))
  if (!r.ok) throw new Error('freight review')
  return r.json() as Promise<FreightDispatcherJson>
}

export async function fetchDashboardLayout(
  token: string,
  pageKey: string,
): Promise<DashboardLayoutResponse> {
  const r = await fetch(api(`/api/layout/${encodeURIComponent(pageKey)}`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error('layout read')
  return (await r.json()) as DashboardLayoutResponse
}

export async function saveDashboardLayout(
  token: string,
  pageKey: string,
  layout: DashboardLayout,
): Promise<DashboardLayoutResponse> {
  const r = await fetch(api(`/api/layout/${encodeURIComponent(pageKey)}`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ layout }),
  })
  const j = (await r.json().catch(() => ({}))) as { error?: string } & Partial<DashboardLayoutResponse>
  if (!r.ok) {
    throw new Error(typeof j.error === 'string' ? j.error : `保存布局失败 (${r.status})`)
  }
  if (!j.layout || !j.pageKey) {
    throw new Error('保存布局响应无效')
  }
  return j as DashboardLayoutResponse
}

export async function fetchStats(): Promise<PortStats> {
  const r = await fetch(api('/api/stats'))
  if (!r.ok) throw new Error('stats')
  return r.json()
}

export async function fetchShips(): Promise<ShipData[]> {
  const r = await fetch(api('/api/ships'))
  if (!r.ok) throw new Error('ships')
  const j = await r.json()
  return (j.ships as Record<string, unknown>[]).map(toShipData)
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const r = await fetch(api('/api/alerts'))
  if (!r.ok) throw new Error('alerts')
  const j = await r.json()
  return j.alerts as AlertItem[]
}

function toShipData(s: Record<string, unknown>): ShipData {
  const p = s.position as { longitude?: number; latitude?: number } | undefined
  const lon = p?.longitude ?? s.longitude
  const lat = p?.latitude ?? s.latitude
  const vt = s.vesselType as ShipData['vesselType'] | undefined
  const vesselType =
    vt === 'bulk' || vt === 'tanker' || vt === 'container' ? vt : undefined
  return {
    mmsi: String(s.mmsi),
    name: String(s.name),
    position: { longitude: Number(lon), latitude: Number(lat) },
    heading: Number(s.heading),
    speed: Number(s.speed),
    status: s.status as ShipData['status'],
    vesselType,
  }
}

function portWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}

type PortWsListener = {
  onMessage: (msg: PortDataMessage) => void
  onOpen: () => void
  onClose: () => void
}

let sharedWs: WebSocket | null = null
const portWsListeners = new Set<PortWsListener>()
let portWsCloseTimer: ReturnType<typeof setTimeout> | null = null
const STRICT_MODE_UNSUB_DELAY_MS = 450

function attachSharedPortWs() {
  if (sharedWs && (sharedWs.readyState === WebSocket.OPEN || sharedWs.readyState === WebSocket.CONNECTING)) {
    return
  }
  sharedWs = new WebSocket(portWsUrl())
  sharedWs.onopen = () => {
    for (const l of portWsListeners) queueMicrotask(() => l.onOpen())
  }
  sharedWs.onclose = () => {
    sharedWs = null
    for (const l of portWsListeners) queueMicrotask(() => l.onClose())
    if (portWsListeners.size > 0) attachSharedPortWs()
  }
  sharedWs.onmessage = (ev) => {
    let msg: PortDataMessage
    try {
      msg = JSON.parse(ev.data as string) as PortDataMessage
    } catch {
      return
    }
    for (const l of portWsListeners) l.onMessage(msg)
  }
}

/**
 * 共享一条业务 WebSocket，并在最后一位订阅者退出后延迟关闭。
 * 用于避免 React 18 StrictMode 在开发环境「立刻卸载再挂载」时反复断连，
 * 触发 Vite ws代理 write ECONNABORTED 噪声。
 */
export function subscribePortSocket(
  onMessage: (msg: PortDataMessage) => void,
  onOpen: () => void,
  onClose: () => void,
): () => void {
  const listener: PortWsListener = { onMessage, onOpen, onClose }
  if (portWsCloseTimer) {
    clearTimeout(portWsCloseTimer)
    portWsCloseTimer = null
  }
  portWsListeners.add(listener)
  attachSharedPortWs()
  if (sharedWs?.readyState === WebSocket.OPEN) {
    queueMicrotask(() => onOpen())
  }
  return () => {
    portWsListeners.delete(listener)
    if (portWsListeners.size === 0) {
      portWsCloseTimer = setTimeout(() => {
        portWsCloseTimer = null
        if (portWsListeners.size === 0 && sharedWs) {
          sharedWs.close()
          sharedWs = null
        }
      }, STRICT_MODE_UNSUB_DELAY_MS)
    }
  }
}
