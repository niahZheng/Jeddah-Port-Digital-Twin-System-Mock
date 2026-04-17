export const SET_DEFAULT_CAMERA_EVENT = 'jeddah-port:set-default-camera'
export const SET_MAX_CAMERA_VIEW_EVENT = 'jeddah-port:set-max-camera-view'
export const UNLOCK_MAX_CAMERA_VIEW_EVENT = 'jeddah-port:unlock-max-camera-view'
/** 切换场桥 GLB 骨骼动画开/关（由 CesiumViewport 处理） */
export const TOGGLE_GANTRY_ANIMATION_EVENT = 'jeddah-port:toggle-gantry-animation'
/** 场桥动画当前是否在播放（由 CesiumViewport 在切换后广播，供底栏等更新文案） */
export const GANTRY_ANIM_STATE_EVENT = 'jeddah-port:gantry-anim-state'
export const START_COORD_RECORDING_EVENT = 'jeddah-port:start-coord-recording'
export const STOP_COORD_RECORDING_EVENT = 'jeddah-port:stop-coord-recording'
export const COORD_RECORDING_FINISHED_EVENT = 'jeddah-port:coord-recording-finished'
/** 底图配置中船模竖直下沉已保存或恢复默认，Cesium 需立即重拉船舶并更新实体 */
export const SHIP_DRAFTS_UPDATED_EVENT = 'jeddah-port:ship-drafts-updated'

export type CoordRecordingFinishedDetail = {
  copied: boolean
  count: number
}

export type GantryAnimStateDetail = {
  running: boolean
}
