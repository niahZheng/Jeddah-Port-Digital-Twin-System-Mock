/** 吉达伊斯兰港附近示意坐标（快速演示） */
const BASE_LON = 39.104
const BASE_LAT = 21.491

import { initialBearingDegrees } from './initialBearing.js'
import { getDb } from '../db/init.js'

/** MV RED SEA 1 停靠泊位示意坐标（height 0，地形由前端贴地渲染） */
const MV_RED_SEA_1_BERTH_LON = 39.158286
const MV_RED_SEA_1_BERTH_LAT = 21.477328
/** 该船 MMSI（抖动幅度单独缩小，避免泊位上“漂移”过大） */
const MV_RED_SEA_1_MMSI = '403123456'

/** mock：种子未写 `draftMeters` 时的默认 Z 轴偏移（米，相对椭球 h=0），默认 0 表示贴参考面 */
const MOCK_SHIP_DRAFT_M = 0

/**
 * 停泊时由岸线上两点定义切向，航向与该大圆方位角一致，船身与码头走向平行。
 * 在地图沿码头再采一点 from→to（与船舶中心线同向），必要时设 reverse 或调前端 SHIP_MODEL_HEADING_OFFSET_DEG。
 */
export interface MooringQuayAxis {
  fromLongitude: number
  fromLatitude: number
  toLongitude: number
  toLatitude: number
  reverse?: boolean
}

export interface ShipSeed {
  mmsi: string
  name: string
  longitude: number
  latitude: number
  heading: number
  speed: number
  status: 'anchored' | 'moored' | 'underway'
  vesselType: 'container' | 'bulk' | 'tanker'
  /** 竖直 Z 轴偏移（米）：椭球高 h=0 参考；>0 上浮，<0 下沉；未设则填默认值。 */
  draftMeters?: number
  mooringQuayAxis?: MooringQuayAxis
}

const seeds: ShipSeed[] = [
  {
    mmsi: MV_RED_SEA_1_MMSI,
    name: 'MV RED SEA 1',
    longitude: MV_RED_SEA_1_BERTH_LON,
    latitude: MV_RED_SEA_1_BERTH_LAT,
    /** 未使用 mooringQuayAxis 时作为航向；有岸线轴时仅作占位 */
    heading: 90,
    speed: 0,
    status: 'moored',
    vesselType: 'container',
    /** 示意：近似东西向码头线，可按实测绘两点替换 */
    mooringQuayAxis: {
      fromLongitude: 39.157286,
      fromLatitude: MV_RED_SEA_1_BERTH_LAT,
      toLongitude: 39.159286,
      toLatitude: MV_RED_SEA_1_BERTH_LAT,
    },
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

/** 种子/mock 默认 Z 轴偏移（不含数据库覆盖），供底图配置「恢复默认」参考 */
export function getShipSeedDefaultDraftMeters(mmsi: string): number {
  const s = seeds.find((x) => x.mmsi === mmsi)
  return s?.draftMeters ?? MOCK_SHIP_DRAFT_M
}

function readDraftOverrideMeters(mmsi: string): number | undefined {
  try {
    const db = getDb()
    const row = db
      .prepare('SELECT draft_meters FROM ship_draft_overrides WHERE mmsi = ?')
      .get(mmsi) as { draft_meters: number } | undefined
    if (!row) return undefined
    const v = Number(row.draft_meters)
    return Number.isFinite(v) ? v : undefined
  } catch {
    return undefined
  }
}

let tick = 0

export function getShips(): ShipSeed[] {
  return seeds.map((s, i) => {
    const base: ShipSeed = { ...s, heading: resolveMooredHeading(s) }
    const j = jitter(base, i)
    const merged: ShipSeed = { ...base, ...j }
    const dbDraft = readDraftOverrideMeters(merged.mmsi)
    return {
      ...merged,
      draftMeters: dbDraft ?? merged.draftMeters ?? MOCK_SHIP_DRAFT_M,
    }
  })
}

function resolveMooredHeading(s: ShipSeed): number {
  const axis = s.mooringQuayAxis
  if (s.status !== 'moored' || !axis) return s.heading
  let h = initialBearingDegrees(
    axis.fromLatitude,
    axis.fromLongitude,
    axis.toLatitude,
    axis.toLongitude,
  )
  if (axis.reverse) h = (h + 180) % 360
  return h
}

function jitter(s: ShipSeed, i: number): Partial<ShipSeed> {
  const phase = tick * 0.00002 + i * 0.5
  const redSea1 = s.mmsi === MV_RED_SEA_1_MMSI
  const posAmp = redSea1 ? 0.00006 : 0.0008
  const lockHeading =
    redSea1 || (s.status === 'moored' && s.mooringQuayAxis != null)
  return {
    longitude: s.longitude + Math.sin(phase) * posAmp,
    latitude: s.latitude + Math.cos(phase * 0.7) * posAmp,
    heading: lockHeading ? s.heading : (s.heading + tick * 0.3) % 360,
  }
}

export function advanceShipSimulation() {
  tick += 1
}
