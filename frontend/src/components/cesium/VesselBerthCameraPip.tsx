import { useEffect, useMemo, useRef, useState } from 'react'
import { Entity, ModelGraphics, Viewer } from 'cesium'
import { useSimulationStore } from '../../store/simulationStore'
import { useScreenStore } from '../../store/screenStore'
import { simCy01Phase, simCy01PhaseLabelZh } from '../../cesium/simulationYard'
import { SIM_VESSEL_DISPLAY_NAME, SIM_VESSEL_MMSI } from '../../cesium/simVessel'
import { applyVesselPipChaseCamera45Deg } from '../../cesium/vesselPipCamera'
import {
  applyConfiguredBasemap,
  createViewer,
  terrainModeFromEnv,
} from '../../cesium/viewerConfig'

type Props = {
  mainViewer: Viewer | null
}

function clampPipDock(left: number, top: number, root: HTMLElement) {
  const parent = root.parentElement
  if (!parent) return { left, top }
  const maxL = Math.max(0, parent.clientWidth - root.offsetWidth)
  const maxT = Math.max(0, parent.clientHeight - root.offsetHeight)
  return {
    left: Math.max(0, Math.min(left, maxL)),
    top: Math.max(0, Math.min(top, maxT)),
  }
}

function cloneModelFromMain(mainEnt: Entity): ModelGraphics | null {
  const m = mainEnt.model
  if (!m) return null
  return new ModelGraphics({
    uri: m.uri,
    scale: m.scale,
    minimumPixelSize: m.minimumPixelSize,
    maximumScale: m.maximumScale,
    heightReference: m.heightReference,
    runAnimations: m.runAnimations,
    enableVerticalExaggeration: m.enableVerticalExaggeration,
  })
}

/** 大屏左上角画中画：第二路 Cesium，同步主场景 MV RED SEA 01 真模型，约 45° 斜视追焦 */
export function VesselBerthCameraPip({ mainViewer }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pipViewerRef = useRef<Viewer | null>(null)
  const pipShipRef = useRef<Entity | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const dockRef = useRef({ left: 72, top: 10 })
  const dragStartRef = useRef<{
    clientX: number
    clientY: number
    left: number
    top: number
  } | null>(null)
  /** 为 true 时每帧重置为 45° 追焦；用户旋转/缩放后置 false */
  const pipAutoFollowRef = useRef(true)
  /** 正在代码里 setView，忽略 camera.changed */
  const pipApplyingChaseRef = useRef(false)

  const [dock, setDock] = useState(() => ({ left: 72, top: 10 }))
  const [isDragging, setIsDragging] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const simEnabled = useSimulationStore((s) => s.enabled)
  const simProgress = useSimulationStore((s) => s.progress)

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const phaseHint = useMemo(() => {
    const camHint =
      '顶栏或 Shift+左键拖动画中画 · 左键旋转 · 滚轮缩放 · 点「随船」恢复追焦'
    if (!simEnabled) return camHint
    return `${simCy01PhaseLabelZh(simCy01Phase(simProgress))} · ${camHint}`
  }, [simEnabled, simProgress])

  dockRef.current = dock

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current
      const root = rootRef.current
      if (!start || !root) return
      const dx = e.clientX - start.clientX
      const dy = e.clientY - start.clientY
      const next = clampPipDock(start.left + dx, start.top + dy, root)
      setDock(next)
    }
    const endDrag = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null
        setIsDragging(false)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('blur', endDrag)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('blur', endDrag)
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const parent = root?.parentElement
    if (!root || !parent) return
    const ro = new ResizeObserver(() => {
      setDock((d) => clampPipDock(d.left, d.top, root))
    })
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  const beginDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const root = rootRef.current
    if (!root) return
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      left: dockRef.current.left,
      top: dockRef.current.top,
    }
    setIsDragging(true)
    e.preventDefault()
  }

  const onChromeMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    beginDrag(e)
  }

  /** 捕获阶段：Shift+左键在画面上拖动控件，不交给 Cesium 旋转 */
  const onFrameMouseDownCapture = (e: React.MouseEvent) => {
    if (e.button !== 0 || !e.shiftKey) return
    beginDrag(e)
    e.stopPropagation()
  }

  useEffect(() => {
    const el = containerRef.current
    const main = mainViewer
    if (!el || !main || (main as { isDestroyed?: () => boolean }).isDestroyed?.()) return

    let pip: Viewer
    try {
      pip = createViewer(el, terrainModeFromEnv())
    } catch (e) {
      console.error('[VesselBerthCameraPip] Cesium PiP init failed:', e)
      return
    }

    applyConfiguredBasemap(pip)
    pip.scene.globe.depthTestAgainstTerrain = true

    const ssc = pip.scene.screenSpaceCameraController
    ssc.enableInputs = true
    ssc.enableTranslate = false
    ssc.translateEventTypes = undefined
    ssc.enableZoom = true
    ssc.enableRotate = true
    ssc.enableTilt = true
    ssc.enableLook = false
    ssc.minimumZoomDistance = 28
    ssc.maximumZoomDistance = 900

    pipAutoFollowRef.current = true

    const onPipCameraChanged = () => {
      if (pipApplyingChaseRef.current) return
      pipAutoFollowRef.current = false
    }
    pip.camera.changed.addEventListener(onPipCameraChanged)

    ;(pip.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
    const homeEl = pip.homeButton?.container as HTMLElement | undefined
    if (homeEl) homeEl.style.display = 'none'

    pipViewerRef.current = pip
    pipShipRef.current = null

    const ro = new ResizeObserver(() => {
      if (!(pip as { isDestroyed?: () => boolean }).isDestroyed?.()) {
        pip.resize()
        pip.scene.requestRender()
      }
    })
    ro.observe(el)
    roRef.current = ro

    requestAnimationFrame(() => {
      if (!(pip as { isDestroyed?: () => boolean }).isDestroyed?.()) pip.resize()
    })

    const onMainPostRender = () => {
      const p = pipViewerRef.current
      if (!p || (p as { isDestroyed?: () => boolean }).isDestroyed?.()) return
      if (!main || (main as { isDestroyed?: () => boolean }).isDestroyed?.()) return

      const t = main.clock.currentTime
      p.clock.currentTime = t

      const mainEnt = main.entities.getById(SIM_VESSEL_MMSI)
      if (!mainEnt?.position) {
        p.scene.requestRender()
        return
      }

      const pos = mainEnt.position.getValue(t)
      if (!pos) {
        p.scene.requestRender()
        return
      }

      let pipEnt = pipShipRef.current
      if (!pipEnt) {
        const model = cloneModelFromMain(mainEnt)
        if (!model) {
          p.scene.requestRender()
          return
        }
        pipEnt = p.entities.add({
          id: 'pip-vessel-mv-red-sea-01',
          position: mainEnt.position,
          orientation: mainEnt.orientation,
          model,
        })
        pipShipRef.current = pipEnt
      } else {
        pipEnt.position = mainEnt.position
        pipEnt.orientation = mainEnt.orientation
        if (mainEnt.model && pipEnt.model) {
          pipEnt.model.uri = mainEnt.model.uri
          pipEnt.model.scale = mainEnt.model.scale
        }
      }

      const ship = useScreenStore.getState().ships.find((s) => s.mmsi === SIM_VESSEL_MMSI)
      const headingDeg = ship?.heading ?? 0
      if (pipAutoFollowRef.current) {
        pipApplyingChaseRef.current = true
        try {
          applyVesselPipChaseCamera45Deg(p, pos, headingDeg)
        } finally {
          pipApplyingChaseRef.current = false
        }
      }
      p.scene.requestRender()
    }

    main.scene.postRender.addEventListener(onMainPostRender)

    return () => {
      if (!(pip as { isDestroyed?: () => boolean }).isDestroyed?.()) {
        pip.camera.changed.removeEventListener(onPipCameraChanged)
      }
      if (!(main as { isDestroyed?: () => boolean }).isDestroyed?.()) {
        main.scene.postRender.removeEventListener(onMainPostRender)
      }
      ro.disconnect()
      roRef.current = null
      pipShipRef.current = null
      pipViewerRef.current = null
      if (!(pip as { isDestroyed?: () => boolean }).isDestroyed?.()) {
        pip.destroy()
      }
    }
  }, [mainViewer])

  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })
  const name = SIM_VESSEL_DISPLAY_NAME

  return (
    <div
      ref={rootRef}
      className={`vessel-pip${isDragging ? ' vessel-pip--dragging' : ''}`}
      style={{ left: dock.left, top: dock.top }}
      role="img"
      aria-label={`${name} 实时镜头（Cesium 真模型）`}
    >
      <div className="vessel-pip__chrome" onMouseDown={onChromeMouseDown}>
        <span className="vessel-pip__live" aria-hidden>
          <span className="vessel-pip__live-dot" /> LIVE
        </span>
        <span className="vessel-pip__cam">CAM-3D · 可转/缩放</span>
        <button
          type="button"
          className="vessel-pip__follow"
          title="恢复自动随船 45° 追焦"
          onClick={() => {
            pipAutoFollowRef.current = true
          }}
        >
          随船
        </button>
      </div>
      <div className="vessel-pip__frame" onMouseDownCapture={onFrameMouseDownCapture}>
        <div ref={containerRef} className="vessel-pip__cesium" />
        <div className="vessel-pip__grain" aria-hidden />
        <div className="vessel-pip__scan" aria-hidden />
        <div className="vessel-pip__osd">
          <span className="vessel-pip__osd-name">{name}</span>
          <span className="vessel-pip__osd-time">{timeStr}</span>
          <span className="vessel-pip__osd-hint">{phaseHint}</span>
        </div>
      </div>
    </div>
  )
}
