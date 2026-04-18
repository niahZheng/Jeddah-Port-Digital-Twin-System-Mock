import { useEffect, useState } from 'react'
import { BasemapConfigModal } from '../basemap/BasemapConfigModal'
import { ConfigFormSections } from '../widgets/ConfigFormSections'
import {
  COORD_RECORDING_FINISHED_EVENT,
  GANTRY_ANIM_STATE_EVENT,
  SET_DEFAULT_CAMERA_EVENT,
  SET_MAX_CAMERA_VIEW_EVENT,
  UNLOCK_MAX_CAMERA_VIEW_EVENT,
  START_COORD_RECORDING_EVENT,
  STOP_COORD_RECORDING_EVENT,
  TOGGLE_GANTRY_ANIMATION_EVENT,
  type CoordRecordingFinishedDetail,
  type GantryAnimStateDetail,
} from '../../cesium/cameraEvents'

export function BottomConsole() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isMaxViewLocked, setIsMaxViewLocked] = useState(false)
  const [gantryAnimRunning, setGantryAnimRunning] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingNotice, setRecordingNotice] = useState('')
  const [basemapModalOpen, setBasemapModalOpen] = useState(false)

  const handleSaveCameraAsDefault = () => {
    window.dispatchEvent(new Event(SET_DEFAULT_CAMERA_EVENT))
    setIsSaved(true)
    window.setTimeout(() => setIsSaved(false), 1200)
  }

  const toggleCoordinateRecording = () => {
    if (isRecording) {
      window.dispatchEvent(new Event(STOP_COORD_RECORDING_EVENT))
      setIsRecording(false)
      return
    }

    setRecordingNotice('坐标录制中：请在地图上点击采样点')
    window.dispatchEvent(new Event(START_COORD_RECORDING_EVENT))
    setIsRecording(true)
  }

  const handleSetMaxCameraView = () => {
    if (isMaxViewLocked) {
      window.dispatchEvent(new Event(UNLOCK_MAX_CAMERA_VIEW_EVENT))
      setIsMaxViewLocked(false)
      return
    }
    window.dispatchEvent(new Event(SET_MAX_CAMERA_VIEW_EVENT))
    setIsMaxViewLocked(true)
  }

  const handleToggleGantryAnimation = () => {
    window.dispatchEvent(new Event(TOGGLE_GANTRY_ANIMATION_EVENT))
  }

  useEffect(() => {
    const onFinished = (evt: Event) => {
      const detail = (evt as CustomEvent<CoordRecordingFinishedDetail>).detail
      if (!detail) return
      if (detail.copied) {
        setRecordingNotice(`已复制 ${detail.count} 个坐标到剪贴板`)
      } else {
        setRecordingNotice('复制失败，请检查浏览器剪贴板权限')
      }
      window.setTimeout(() => setRecordingNotice(''), 2400)
    }

    window.addEventListener(COORD_RECORDING_FINISHED_EVENT, onFinished)
    return () => {
      window.removeEventListener(COORD_RECORDING_FINISHED_EVENT, onFinished)
    }
  }, [])

  useEffect(() => {
    const onGantryAnimState = (evt: Event) => {
      const detail = (evt as CustomEvent<GantryAnimStateDetail>).detail
      if (!detail) return
      setGantryAnimRunning(detail.running)
    }
    window.addEventListener(GANTRY_ANIM_STATE_EVENT, onGantryAnimState)
    return () => window.removeEventListener(GANTRY_ANIM_STATE_EVENT, onGantryAnimState)
  }, [])

  return (
    <div className="bottom-console" role="region" aria-label="控制台">
      <div className="console-bar" role="tablist" aria-label="控制台标签">
        <div className="console-bar-left">
          <h3 className="console-title">控制栏</h3>
          <button type="button" className="active" role="tab" aria-selected="true">
            配置项
          </button>
        </div>
        <div className="console-bar-right">
          <button type="button" onClick={toggleCoordinateRecording}>
            {isRecording ? '停止录制' : '录制坐标'}
          </button>
          <button type="button" onClick={handleSaveCameraAsDefault}>
            {isSaved ? '已设为默认视角' : '设为默认视角'}
          </button>
          <button type="button" onClick={handleSetMaxCameraView}>
            {isMaxViewLocked ? '解锁最大视角' : '设定最大视角'}
          </button>
          <button type="button" onClick={handleToggleGantryAnimation}>
            {gantryAnimRunning ? '停止场桥/岸桥动画' : '启动场桥/岸桥动画'}
          </button>
          <button type="button" onClick={() => setBasemapModalOpen(true)}>
            底图配置
          </button>
          <button
            type="button"
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? '展开' : '折叠'}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
      {recordingNotice && <div className="console-note">{recordingNotice}</div>}
      {!isCollapsed && (
        <div className="console-body" role="tabpanel">
          <ConfigFormSections />
        </div>
      )}
      <BasemapConfigModal open={basemapModalOpen} onClose={() => setBasemapModalOpen(false)} />
    </div>
  )
}
