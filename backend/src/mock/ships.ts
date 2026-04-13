/** 吉达伊斯兰港附近示意坐标（快速演示） */
const BASE_LON = 39.104
const BASE_LAT = 21.491

/** 吉达灯塔（Jeddah Light）维基约 21.4687°N, 39.1497°E — 旁侧略偏东北水域 */
const LIGHTHOUSE_LON = 39.1497
const LIGHTHOUSE_LAT = 21.4687
/** 紧挨灯塔的示意船 MMSI（抖动幅度单独缩小） */
const SHIP_NEAR_LIGHTHOUSE_MMSI = '403123456'

export interface ShipSeed {
  mmsi: string
  name: string
  longitude: number
  latitude: number
  heading: number
  speed: number
  status: 'anchored' | 'moored' | 'underway'
  vesselType: 'container' | 'bulk' | 'tanker'
}

const seeds: ShipSeed[] = [
  {
    mmsi: SHIP_NEAR_LIGHTHOUSE_MMSI,
    name: 'MV RED SEA 1',
    longitude: LIGHTHOUSE_LON + 0.00135,
    latitude: LIGHTHOUSE_LAT + 0.00055,
    heading: 238,
    speed: 0,
    status: 'moored',
    vesselType: 'container',
  },
  {
    mmsi: '403123457',
    name: 'CONTAINER EXPRESS',
    longitude: BASE_LON - 0.006,
    latitude: BASE_LAT + 0.002,
    heading: 120,
    speed: 0,
    status: 'moored',
    vesselType: 'container',
  },
  {
    mmsi: '403123458',
    name: 'BULK HORIZON',
    longitude: BASE_LON + 0.012,
    latitude: BASE_LAT - 0.005,
    heading: 300,
    speed: 5.1,
    status: 'underway',
    vesselType: 'bulk',
  },
  {
    mmsi: '403123459',
    name: 'ANCHOR WAIT',
    longitude: BASE_LON - 0.02,
    latitude: BASE_LAT - 0.01,
    heading: 0,
    speed: 0,
    status: 'anchored',
    vesselType: 'tanker',
  },
]

let tick = 0

export function getShips(): ShipSeed[] {
  return seeds.map((s, i) => ({ ...s, ...jitter(s, i) }))
}

function jitter(s: ShipSeed, i: number): Partial<ShipSeed> {
  const phase = tick * 0.00002 + i * 0.5
  const nearLight = s.mmsi === SHIP_NEAR_LIGHTHOUSE_MMSI
  const posAmp = nearLight ? 0.00006 : 0.0008
  return {
    longitude: s.longitude + Math.sin(phase) * posAmp,
    latitude: s.latitude + Math.cos(phase * 0.7) * posAmp,
    heading: nearLight ? s.heading : (s.heading + tick * 0.3) % 360,
  }
}

export function advanceShipSimulation() {
  tick += 1
}
