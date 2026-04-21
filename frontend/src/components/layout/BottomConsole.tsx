import { useEffect, useState } from 'react'
import { BasemapConfigModal } from '../basemap/BasemapConfigModal'
import { ConfigFormSections } from '../widgets/ConfigFormSections'
import { useSimulationStore } from '../../store/simulationStore'
import {
  COORD_RECORDING_FINISHED_EVENT,
  SET_DEFAULT_CAMERA_EVENT,
  START_COORD_RECORDING_EVENT,
  STOP_COORD_RECORDING_EVENT,
  type CoordRecordingFinishedDetail,
} from '../../cesium/cameraEvents'

export function BottomConsole() {
  const [activeTab, setActiveTab] = useState<'config' | 'simulation'>('config')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingNotice, setRecordingNotice] = useState('')
  const [basemapModalOpen, setBasemapModalOpen] = useState(false)
  const simProgress = useSimulationStore((s) => s.progress)
  const simPlaying = useSimulationStore((s) => s.playing)
  const setSimEnabled = useSimulationStore((s) => s.setEnabled)
  const setSimProgress = useSimulationStore((s) => s.setProgress)
  const setSimPlaying = useSimulationStore((s) => s.setPlaying)

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
    setSimEnabled(activeTab === 'simulation')
  }, [activeTab, setSimEnabled])

  useEffect(() => {
    if (!simPlaying) return
    const timer = window.setInterval(() => {
      const next = simProgress + 1
      if (next >= 100) {
        setSimProgress(100)
        setSimPlaying(false)
        return
      }
      setSimProgress(next)
    }, 180)
    return () => window.clearInterval(timer)
  }, [simPlaying, simProgress, setSimPlaying, setSimProgress])

  return (
    <div className="bottom-console" role="region" aria-label="控制台">
      <div className="console-bar" role="tablist" aria-label="控制台标签">
        <div className="console-bar-left">
          <h3 className="console-title">控制栏</h3>
          <button
            type="button"
            className={activeTab === 'config' ? 'active' : ''}
            role="tab"
            aria-selected={activeTab === 'config'}
            onClick={() => setActiveTab('config')}
          >
            配置项
          </button>
          <button
            type="button"
            className={activeTab === 'simulation' ? 'active' : ''}
            role="tab"
            aria-selected={activeTab === 'simulation'}
            onClick={() => setActiveTab('simulation')}
          >
            仿真
          </button>
        </div>
        <div className="console-bar-right">
          <button type="button" onClick={toggleCoordinateRecording}>
            {isRecording ? '停止录制' : '录制坐标'}
          </button>
          <button type="button" onClick={handleSaveCameraAsDefault}>
            {isSaved ? '已设为默认视角' : '设为默认视角'}
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
          {activeTab === 'config' ? (
            <ConfigFormSections />
          ) : (
            <div className="simulation-panel">
              <div className="simulation-panel__head">
                <strong>靠泊-装卸仿真</strong>
                <span>{Math.round(simProgress)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={simProgress}
                onChange={(e) => setSimProgress(Number(e.target.value))}
              />
              <div className="simulation-panel__actions">
                <button type="button" onClick={() => setSimPlaying(!simPlaying)}>
                  {simPlaying ? '暂停' : '播放'}
                </button>
              </div>
              <p className="simulation-panel__hint">
                0 为锚地等待；0–18 入港靠泊至泊位 N-02；18–50 QC-01/02 卸货，箱入 CY-01 至 30 TEU；50–60
                满载待发离港；60–90 GC 疏运作业，60–100 CY-01 出箱降至 0。
              </p>
            </div>
          )}
        </div>
      )}
      <BasemapConfigModal open={basemapModalOpen} onClose={() => setBasemapModalOpen(false)} />
    </div>
  )
}
