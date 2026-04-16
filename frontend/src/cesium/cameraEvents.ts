export const SET_DEFAULT_CAMERA_EVENT = 'jeddah-port:set-default-camera'
export const START_COORD_RECORDING_EVENT = 'jeddah-port:start-coord-recording'
export const STOP_COORD_RECORDING_EVENT = 'jeddah-port:stop-coord-recording'
export const COORD_RECORDING_FINISHED_EVENT = 'jeddah-port:coord-recording-finished'
/** 底图配置中船模竖直下沉已保存或恢复默认，Cesium 需立即重拉船舶并更新实体 */
export const SHIP_DRAFTS_UPDATED_EVENT = 'jeddah-port:ship-drafts-updated'

export type CoordRecordingFinishedDetail = {
  copied: boolean
  count: number
}
