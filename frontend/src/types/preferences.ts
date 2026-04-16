export type CameraViewState = {
  longitude: number
  latitude: number
  height: number
  heading: number
  pitch: number
  roll: number
}

export type WidgetState = {
  left: number
  top: number
  collapsed: boolean
}

export type CameraViewResponse = {
  viewKey: string
  view: CameraViewState | null
  updatedAt: string | null
  source: 'none' | 'db'
}

export type WidgetStateResponse = {
  pageKey: string
  widgetId: string
  state: WidgetState | null
  updatedAt: string | null
  source: 'none' | 'db'
}
