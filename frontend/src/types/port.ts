export type PortDataType =
  | 'ship_update'
  | 'stats_update'
  | 'director_overview_update'

export interface PortDataMessage<T = unknown> {
  type: PortDataType
  timestamp: string
  payload: T
}

/** 货运大类（决定俯视图船型符号） */
export type VesselType = 'container' | 'bulk' | 'tanker'

export interface ShipData {
  mmsi: string
  name: string
  position: { longitude: number; latitude: number }
  heading: number
  speed: number
  status: 'anchored' | 'moored' | 'underway'
  vesselType?: VesselType
  /**
   * 船模竖直 Z 轴偏移（米），相对 **WGS84 椭球高 h=0 参考面**：
   * 正值上浮、负值下沉、0 贴参考面。
   */
  draftMeters?: number
}

/** 集货区在库 vs 能力（TEU），与底图 zoneCode 对齐 */
export interface YardZoneCargoStat {
  zoneCode: string
  shortName: string
  occupiedTeu: number
  capacityTeu: number
}

export interface PortStats {
  shipsInPort: number
  throughputTeu: number
  berthUtilization: number
  yardZones?: YardZoneCargoStat[]
  updatedAt: string
}

export interface AlertItem {
  id: string
  level: string
  message: string
  time: string
}
