export type PortDataType = 'ship_update' | 'stats_update' | 'director_overview_update'

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
}

export interface PortStats {
  shipsInPort: number
  throughputTeu: number
  berthUtilization: number
  updatedAt: string
}

export interface AlertItem {
  id: string
  level: string
  message: string
  time: string
}
