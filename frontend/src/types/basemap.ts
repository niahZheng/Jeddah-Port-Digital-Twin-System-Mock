export type BasemapEntityKind = 'model' | 'zone' | 'polyline'

export type BasemapRotationMode = 'fixed' | 'dynamic_track'

export type BasemapHeightRef = 'none' | 'clamp'

export type BasemapLonLatHeight = {
  longitude: number
  latitude: number
  height: number
}

/** 底图配置「船模 Z 轴偏移」列表项（米，相对椭球 h=0；含 mock 默认与是否已写库覆盖） */
export type ShipDraftConfigItem = {
  mmsi: string
  name: string
  draftMeters: number
  usesDatabaseOverride: boolean
  mockDefaultDraftMeters: number
}

export type BasemapEntity = {
  id: string
  kind: BasemapEntityKind
  name: string
  visible: boolean
  glbUri: string | null
  longitude: number | null
  latitude: number | null
  height: number | null
  scale: number
  headingDeg: number
  rotationMode: BasemapRotationMode
  trackMmsi: string | null
  heightRef: BasemapHeightRef
  labelText: string | null
  zoneCode: string | null
  zonePoints: BasemapLonLatHeight[] | null
  fillColor: string | null
  outlineColor: string | null
  pathPoints: BasemapLonLatHeight[] | null
  patrolTruckCount: number | null
  patrolSegmentSeconds: number | null
  patrolStaggerSeconds: number | null
  sortOrder: number
  updatedAt: string
}
