import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ColorMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  defined,
  Entity,
  HeightReference,
  LabelStyle,
  ModelGraphics,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Rectangle,
  Viewer,
  Math as CesiumMath,
  VerticalOrigin,
} from 'cesium'
import type { Cesium3DTileset } from 'cesium'
import {
  fetchBasemapEntities,
  fetchCameraView,
  fetchShips,
  parseShipData,
  saveCameraView,
  subscribePortSocket,
} from '../../api/client'
import {
  SHIP_MODEL_SCALE,
  shipDraftMeters,
  shipModelUri,
  shipOrientationQuaternion,
} from '../../cesium/shipModels'
import {
  applyBasemapEntities,
  syncDynamicBasemapForShip,
} from '../../cesium/basemapEntities'
import {
  applyConfiguredBasemap,
  applyCesiumGeographicModel,
  bindHomeToLighthouse,
  configureIonFromEnv,
  createViewer,
  flyToJeddahLighthouse,
  DEFAULT_CAMERA_VIEW_KEY,
  captureCameraView,
  JEDDAH_LIGHTHOUSE,
  terrainModeFromEnv,
} from '../../cesium/viewerConfig'
import {
  COORD_RECORDING_FINISHED_EVENT,
  SET_DEFAULT_CAMERA_EVENT,
  SHIP_DRAFTS_UPDATED_EVENT,
  START_COORD_RECORDING_EVENT,
  STOP_COORD_RECORDING_EVENT,
} from '../../cesium/cameraEvents'
import { useScreenStore } from '../../store/screenStore'
import { useAuthStore } from '../../store/authStore'
import { useBasemapStore } from '../../store/basemapStore'
import { useSimulationStore } from '../../store/simulationStore'
import type { PortStats, QuayCraneStatus, ShipData } from '../../types/port'
import { flyToYardPolygonOblique } from '../../cesium/yardCamera'
import {
  SIM_BERTH_LABEL_FULL,
  simBerthFootprintDegrees,
  simCy01OccupiedTeu,
} from '../../cesium/simulationYard'
import { useEffectiveYardZones } from '../../hooks/useEffectiveYardZones'
import { useYardTwinStore } from '../../store/yardTwinStore'
import { QuayCraneStatusTips } from './QuayCraneStatusTips'
import { YardZoneCargoTips } from './YardZoneCargoTips'

/** 每条船上次用于三维的 Z 轴偏移；变化时 remove+add 实体，避免 Cesium Model 仍用旧 modelMatrix */
const lastShipDraftByMmsi = new Map<string, number>()
const SIM_SHIP_MMSI = '403123456'
const SIM_WAIT_POINT = {
  longitude: 39.152757,
  latitude: 21.466392,
}
const SIM_WAIT_AREA_POLYGON = [
  { longitude: SIM_WAIT_POINT.longitude - 0.001, latitude: SIM_WAIT_POINT.latitude - 0.00075, height: -0.01 },
  { longitude: SIM_WAIT_POINT.longitude + 0.001, latitude: SIM_WAIT_POINT.latitude - 0.00075, height: -0.01 },
  { longitude: SIM_WAIT_POINT.longitude + 0.001, latitude: SIM_WAIT_POINT.latitude + 0.00075, height: -0.01 },
  { longitude: SIM_WAIT_POINT.longitude - 0.001, latitude: SIM_WAIT_POINT.latitude + 0.00075, height: -0.01 },
]
const SIM_ROUTE_MID_POINT = { longitude: 39.159288, latitude: 21.473701 }
const SIM_BERTH_POINT = { longitude: 39.158487, latitude: 21.477323 }
const SIM_DEPART_END_POINT = { longitude: 39.156282, latitude: 21.464661 }
/**
 * shipModels.ts 会统一加 75 度偏移；仿真船额外 +180 修正（当前模型前向与实际船头相反）。
 * 最终让船头朝行进方向，避免“船尾朝前”。
 */
const SIM_SHIP_HEADING_CORRECTION_DEG = 105
const PORT_CAMERA_RADIUS_M = 50_000
const PORT_CAMERA_MIN_ZOOM_M = 220
const PORT_CAMERA_MAX_ZOOM_M = 120_000
const PORT_CAMERA_LAT_DELTA_DEG = PORT_CAMERA_RADIUS_M / 110_540
const PORT_CAMERA_LON_DELTA_DEG =
  PORT_CAMERA_RADIUS_M /
  (111_320 * Math.cos((JEDDAH_LIGHTHOUSE.latitude * Math.PI) / 180))
const PORT_CAMERA_RECT = Rectangle.fromDegrees(
  JEDDAH_LIGHTHOUSE.longitude - PORT_CAMERA_LON_DELTA_DEG,
  JEDDAH_LIGHTHOUSE.latitude - PORT_CAMERA_LAT_DELTA_DEG,
  JEDDAH_LIGHTHOUSE.longitude + PORT_CAMERA_LON_DELTA_DEG,
  JEDDAH_LIGHTHOUSE.latitude + PORT_CAMERA_LAT_DELTA_DEG,
)

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function normHeadingDeg(v: number): number {
  return ((v % 360) + 360) % 360
}

function bearingDeg(from: LonLat, to: LonLat): number {
  return normHeadingDeg(
    CesiumMath.toDegrees(Math.atan2(to.longitude - from.longitude, to.latitude - from.latitude)),
  )
}

const SIM_BERTH_APPROACH_HEADING_DEG = bearingDeg(SIM_ROUTE_MID_POINT, SIM_BERTH_POINT)

type LonLat = { longitude: number; latitude: number }

function routeSegmentLengths(points: LonLat[]): { segLens: number[]; total: number } {
  const segLens: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!
    const b = points[i + 1]!
    const dx = b.longitude - a.longitude
    const dy = b.latitude - a.latitude
    const len = Math.hypot(dx, dy)
    segLens.push(len)
    total += len
  }
  return { segLens, total }
}

function sampleRouteAtDistance(points: LonLat[], distance: number): {
  longitude: number
  latitude: number
} {
  if (points.length < 2) {
    const p = points[0] ?? { longitude: 0, latitude: 0 }
    return { longitude: p.longitude, latitude: p.latitude }
  }
  const { segLens, total } = routeSegmentLengths(points)
  if (total <= 1e-12) {
    const p = points[0]!
    return { longitude: p.longitude, latitude: p.latitude }
  }
  const target = Math.max(0, Math.min(total, distance))
  let walked = 0
  for (let i = 0; i < segLens.length; i += 1) {
    const len = segLens[i]!
    const nextWalked = walked + len
    if (target <= nextWalked || i === segLens.length - 1) {
      const a = points[i]!
      const b = points[i + 1]!
      const u = len <= 1e-12 ? 0 : (target - walked) / len
      const longitude = lerp(a.longitude, b.longitude, u)
      const latitude = lerp(a.latitude, b.latitude, u)
      return { longitude, latitude }
    }
    walked = nextWalked
  }
  const p = points[points.length - 1]!
  return { longitude: p.longitude, latitude: p.latitude }
}

/** 沿线路程前进，并用前视点计算船头方向（类似集卡巡逻“头超前”） */
function followRouteWithLookAhead(points: LonLat[], tRaw: number, lookAheadRatio = 0.04): {
  longitude: number
  latitude: number
  headingDeg: number
} {
  if (points.length < 2) {
    const p = points[0] ?? { longitude: 0, latitude: 0 }
    return { longitude: p.longitude, latitude: p.latitude, headingDeg: 0 }
  }
  const { total } = routeSegmentLengths(points)
  if (total <= 1e-12) {
    const p = points[0]!
    return { longitude: p.longitude, latitude: p.latitude, headingDeg: 0 }
  }
  const t = clamp01(tRaw)
  const dNow = t * total
  const dAhead = Math.min(total, dNow + Math.max(total * lookAheadRatio, 1e-6))
  const now = sampleRouteAtDistance(points, dNow)
  const ahead = sampleRouteAtDistance(points, dAhead)
  const headingDeg = CesiumMath.toDegrees(
    Math.atan2(ahead.longitude - now.longitude, ahead.latitude - now.latitude),
  )
  return { longitude: now.longitude, latitude: now.latitude, headingDeg }
}

function pointInPolygonLonLat(
  lon: number,
  lat: number,
  points: Array<{ longitude: number; latitude: number }>,
): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i]!.longitude
    const yi = points[i]!.latitude
    const xj = points[j]!.longitude
    const yj = points[j]!.latitude
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** 供 Vite HMR：修改 viewerConfig 下沉等常量后，对已加载的 OSM tileset 重新对齐（useEffect([]) 不会自动重跑） */
const cesiumOsmHotRefs: { viewer: Viewer | null; tileset: Cesium3DTileset | null } = {
  viewer: null,
  tileset: null,
}

if (import.meta.hot) {
  import.meta.hot.accept('../../cesium/viewerConfig', async (mod) => {
    const v = cesiumOsmHotRefs.viewer
    const ts = cesiumOsmHotRefs.tileset
    if (!mod || !v || !ts || (v as any)?.isDestroyed?.()) return
    try {
      await mod.realignOsmBuildingsTileset(v, ts)
      v.scene.requestRender?.()
    } catch (e) {
      console.warn('[HMR] OSM buildings realign failed:', e)
    }
  })
}

export function CesiumViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const compassDiskRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [mapViewer, setMapViewer] = useState<Viewer | null>(null)
  const entitiesRef = useRef<Map<string, Entity>>(new Map())
  const hoveredEntityRef = useRef<Entity | null>(null)
  const hoveredRestoreRef = useRef<(() => void) | null>(null)
  const osmBuildingsRef = useRef<any>(null)
  const isCoordRecordingRef = useRef(false)
  const recordedCoordsRef = useRef<
    Array<{ longitude: number; latitude: number; height: number }>
  >([])
  const maxCameraRectRef = useRef<Rectangle | null>(null)
  const clampingCameraRef = useRef(false)
  const simOverlayEntityIdsRef = useRef<string[]>([])

  const setShips = useScreenStore((s) => s.setShips)
  const updateShip = useScreenStore((s) => s.updateShip)
  const setStats = useScreenStore((s) => s.setStats)
  const setWsConnected = useScreenStore((s) => s.setWsConnected)
  const stats = useScreenStore((s) => s.stats)
  const basemapEntities = useBasemapStore((s) => s.entities)
  const token = useAuthStore((s) => s.token)
  const simEnabled = useSimulationStore((s) => s.enabled)
  const simProgress = useSimulationStore((s) => s.progress)
  const simEnabledRef = useRef(simEnabled)
  const simProgressRef = useRef(simProgress)

  useEffect(() => {
    simEnabledRef.current = simEnabled
    simProgressRef.current = simProgress
  }, [simEnabled, simProgress])

  const simCraneStatuses = useMemo(() => {
    if (!simEnabled) return null
    const p = simProgress
    const statuses = new Map<string, QuayCraneStatus>()
    const qcBusy = p >= 18 && p < 50
    const gcBusy = p >= 60 && p < 90
    for (let i = 1; i <= 11; i += 1) {
      const code = `QC-${String(i).padStart(2, '0')}`
      statuses.set(code, i === 1 || i === 2 ? (qcBusy ? 'busy' : 'idle') : 'idle')
    }
    for (let i = 1; i <= 3; i += 1) {
      const code = `GC-${String(i).padStart(2, '0')}`
      statuses.set(code, gcBusy ? 'busy' : 'idle')
    }
    return statuses
  }, [simEnabled, simProgress])

  const effectiveCraneStats = useMemo(() => {
    if (simCraneStatuses) {
      return Array.from(simCraneStatuses.entries()).map(([craneCode, status]) => ({
        craneCode,
        status,
      }))
    }
    return stats?.quayCranes
  }, [simCraneStatuses, stats?.quayCranes])

  const effectiveYardZones = useEffectiveYardZones()
  const activeYardTwinCode = useYardTwinStore((s) => s.activeZoneCode)

  const applySimShipWithState = (
    ship: ShipData,
    enabled: boolean,
    progress: number,
  ): ShipData => {
    if (!enabled || ship.mmsi !== SIM_SHIP_MMSI) return ship
    const p = progress
    if (p <= 0) {
      return {
        ...ship,
        position: { ...SIM_WAIT_POINT },
        heading: normHeadingDeg(82 + SIM_SHIP_HEADING_CORRECTION_DEG),
        speed: 0,
        status: 'anchored',
      }
    }
    if (p < 18) {
      const t = clamp01(p / 18)
      const motion = followRouteWithLookAhead(
        [SIM_WAIT_POINT, SIM_ROUTE_MID_POINT, SIM_BERTH_POINT],
        t,
      )
      return {
        ...ship,
        position: { longitude: motion.longitude, latitude: motion.latitude },
        heading: normHeadingDeg(motion.headingDeg + SIM_SHIP_HEADING_CORRECTION_DEG),
        speed: 9.5,
        status: 'underway',
      }
    }
    if (p < 50) {
      return {
        ...ship,
        position: { ...SIM_BERTH_POINT },
        // 靠泊后保持入港末段方向，避免到港瞬间额外旋转
        heading: normHeadingDeg(SIM_BERTH_APPROACH_HEADING_DEG + SIM_SHIP_HEADING_CORRECTION_DEG),
        speed: 0,
        status: 'moored',
      }
    }
    if (p < 68) {
      const t = clamp01((p - 50) / 18)
      const motion = followRouteWithLookAhead(
        [SIM_BERTH_POINT, SIM_ROUTE_MID_POINT, SIM_DEPART_END_POINT],
        t,
      )
      return {
        ...ship,
        position: { longitude: motion.longitude, latitude: motion.latitude },
        heading: normHeadingDeg(motion.headingDeg + SIM_SHIP_HEADING_CORRECTION_DEG),
        speed: 8.6,
        status: 'underway',
      }
    }
    return {
      ...ship,
      position: { ...SIM_DEPART_END_POINT },
      heading: normHeadingDeg(196 + SIM_SHIP_HEADING_CORRECTION_DEG),
      speed: 0.2,
      status: 'anchored',
    }
  }

  const applySimShipIfNeeded = (ship: ShipData): ShipData =>
    applySimShipWithState(ship, simEnabled, simProgress)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    configureIonFromEnv()
    let viewer: Viewer | null = null
    try {
      // 默认椭球无起伏；VITE_TERRAIN_MODE=world 时使用 Ion 全球地形
      viewer = createViewer(el, terrainModeFromEnv())
    } catch (err) {
      console.error('Failed to initialize Cesium (WebGL context).', err)
      return
    }
    if (!viewer) return
    viewerRef.current = viewer
    cesiumOsmHotRefs.viewer = viewer
    setMapViewer(viewer)
    maxCameraRectRef.current = PORT_CAMERA_RECT
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = PORT_CAMERA_MIN_ZOOM_M
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = PORT_CAMERA_MAX_ZOOM_M
    viewer.scene.globe.show = true
    // 关键：让地球/地形参与深度测试，地表会遮挡其下方模型（否则船体会“透地显示”）
    viewer.scene.globe.depthTestAgainstTerrain = true

    const updateCompass = () => {
      const disk = compassDiskRef.current
      if (!disk || (viewer as any)?.isDestroyed?.()) return
      const deg = -CesiumMath.toDegrees(viewer.camera.heading)
      disk.style.transform = `rotate(${deg}deg)`
    }
    viewer.scene.postRender.addEventListener(updateCompass)

    const isViewerAlive = () =>
      viewerRef.current === viewer && !(viewer as any)?.isDestroyed?.()
    const applyInitialCamera = async () => {
      if (!token) {
        requestAnimationFrame(() => {
          if (!isViewerAlive()) return
          try {
            flyToJeddahLighthouse(viewer)
          } catch (err) {
            console.error('Failed to fly to lighthouse:', err)
          }
        })
        return
      }
      try {
        const res = await fetchCameraView(token, DEFAULT_CAMERA_VIEW_KEY)
        requestAnimationFrame(() => {
          if (!isViewerAlive()) return
          try {
            flyToJeddahLighthouse(viewer, res.view)
          } catch (err) {
            console.error('Failed to apply saved camera view:', err)
          }
        })
      } catch {
        requestAnimationFrame(() => {
          if (!isViewerAlive()) return
          try {
            flyToJeddahLighthouse(viewer)
          } catch (err) {
            console.error('Failed to fly to lighthouse:', err)
          }
        })
      }
    }
    void applyInitialCamera()
    applyConfiguredBasemap(viewer)
    bindHomeToLighthouse(viewer)

    const unsubBasemap = useBasemapStore.subscribe(() => {
      const v = viewerRef.current
      if (!v) return
      applyBasemapEntities(v, useBasemapStore.getState().entities)
    })

    void fetchBasemapEntities()
      .then((list) => {
        useBasemapStore.getState().setEntities(list)
        for (const s of useScreenStore.getState().ships) {
          syncDynamicBasemapForShip(viewer, list, s)
        }
      })
      .catch(() => {})

    const onSetDefaultCamera = () => {
      if (!token) return
      const current = captureCameraView(viewer)
      if (!current) return
      void saveCameraView(token, DEFAULT_CAMERA_VIEW_KEY, current).catch(() => {})
    }
    const onStartCoordRecording = () => {
      isCoordRecordingRef.current = true
      recordedCoordsRef.current = []
    }
    const onStopCoordRecording = () => {
      isCoordRecordingRef.current = false
      void copyRecordedCoordinatesToClipboard(recordedCoordsRef.current)
    }
    const onCameraChanged = () => {
      const rect = maxCameraRectRef.current
      if (!rect || clampingCameraRef.current) return
      const current = Cartographic.fromCartesian(viewer.camera.positionWC)
      if (!current) return
      const clampedLon = Math.min(rect.east, Math.max(rect.west, current.longitude))
      const clampedLat = Math.min(rect.north, Math.max(rect.south, current.latitude))
      const clampedH = Math.min(
        PORT_CAMERA_MAX_ZOOM_M,
        Math.max(PORT_CAMERA_MIN_ZOOM_M, current.height),
      )
      const moved =
        Math.abs(clampedLon - current.longitude) > 1e-12 ||
        Math.abs(clampedLat - current.latitude) > 1e-12 ||
        Math.abs(clampedH - current.height) > 0.01
      if (!moved) return

      clampingCameraRef.current = true
      try {
        viewer.camera.setView({
          destination: Cartesian3.fromRadians(clampedLon, clampedLat, clampedH),
          orientation: {
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll,
          },
        })
      } finally {
        clampingCameraRef.current = false
      }
    }
    viewer.camera.changed.addEventListener(onCameraChanged)

    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    clickHandler.setInputAction((click: { position: Cartesian2 }) => {
      if (!isCoordRecordingRef.current) return
      const ray = viewer.camera.getPickRay(click.position)
      if (!defined(ray)) return
      const picked = viewer.scene.globe.pick(ray, viewer.scene)
      if (!defined(picked)) return
      const coord = Cartographic.fromCartesian(picked)
      if (!coord) return
      recordedCoordsRef.current.push({
        longitude: CesiumMath.toDegrees(coord.longitude),
        latitude: CesiumMath.toDegrees(coord.latitude),
        height: coord.height,
      })
    }, ScreenSpaceEventType.LEFT_CLICK)

    clickHandler.setInputAction((move: { endPosition: Cartesian2 }) => {
      const picked = viewer.scene.pick(move.endPosition)
      const pickedEntity =
        picked && typeof picked === 'object' && 'id' in picked
          ? ((picked as { id?: unknown }).id as Entity | undefined)
          : undefined
      const next =
        pickedEntity && (pickedEntity.model || pickedEntity.polygon || pickedEntity.rectangle)
          ? pickedEntity
          : null
      const prev = hoveredEntityRef.current
      if (prev === next) return
      if (hoveredRestoreRef.current) {
        hoveredRestoreRef.current()
        hoveredRestoreRef.current = null
      }
      if (next?.model) {
        const prevSize = next.model.silhouetteSize
        const prevColor = next.model.silhouetteColor
        next.model.silhouetteColor = new ConstantProperty(
          Color.fromCssColorString('#38bdf8'),
        )
        next.model.silhouetteSize = new ConstantProperty(2.5)
        hoveredRestoreRef.current = () => {
          if (!next.model) return
          next.model.silhouetteColor = prevColor
          next.model.silhouetteSize = prevSize
        }
      } else if (next?.polygon) {
        const prevMaterial = next.polygon.material
        const prevOutlineColor = next.polygon.outlineColor
        next.polygon.material = new ColorMaterialProperty(
          Color.fromCssColorString('#22d3ee').withAlpha(0.45),
        )
        next.polygon.outlineColor = new ConstantProperty(
          Color.fromCssColorString('#7dd3fc'),
        )
        hoveredRestoreRef.current = () => {
          if (!next.polygon) return
          next.polygon.material = prevMaterial
          next.polygon.outlineColor = prevOutlineColor
        }
      } else if (next?.rectangle) {
        const prevMaterial = next.rectangle.material
        const prevOutlineColor = next.rectangle.outlineColor
        next.rectangle.material = new ColorMaterialProperty(
          Color.fromCssColorString('#38bdf8').withAlpha(0.35),
        )
        next.rectangle.outlineColor = new ConstantProperty(
          Color.fromCssColorString('#bae6fd'),
        )
        hoveredRestoreRef.current = () => {
          if (!next.rectangle) return
          next.rectangle.material = prevMaterial
          next.rectangle.outlineColor = prevOutlineColor
        }
      }
      hoveredEntityRef.current = next
      viewer.scene.requestRender()
    }, ScreenSpaceEventType.MOUSE_MOVE)

    const onShipDraftsUpdated = () => {
      void fetchShips()
        .then((ships) => {
          const simShips = ships.map((s) =>
            applySimShipWithState(s, simEnabledRef.current, simProgressRef.current),
          )
          setShips(simShips)
          for (const s of simShips) {
            upsertShipEntity(viewer, entitiesRef.current, s)
            syncDynamicBasemapForShip(viewer, useBasemapStore.getState().entities, s)
          }
        })
        .catch(() => {})
    }

    window.addEventListener(SET_DEFAULT_CAMERA_EVENT, onSetDefaultCamera)
    window.addEventListener(START_COORD_RECORDING_EVENT, onStartCoordRecording)
    window.addEventListener(STOP_COORD_RECORDING_EVENT, onStopCoordRecording)
    window.addEventListener(SHIP_DRAFTS_UPDATED_EVENT, onShipDraftsUpdated)

    void fetchShips()
      .then((ships) => {
        const simShips = ships.map((s) =>
          applySimShipWithState(s, simEnabledRef.current, simProgressRef.current),
        )
        setShips(simShips)
        for (const s of simShips) {
          upsertShipEntity(viewer, entitiesRef.current, s)
          syncDynamicBasemapForShip(viewer, useBasemapStore.getState().entities, s)
        }
      })
      .catch(() => {})

    const unsubWs = subscribePortSocket(
      (msg) => {
        if (msg.type === 'ship_update') {
          const p = applySimShipWithState(
            parseShipData(msg.payload as Record<string, unknown>),
            simEnabledRef.current,
            simProgressRef.current,
          )
          updateShip(p)
          upsertShipEntity(viewer, entitiesRef.current, p)
          syncDynamicBasemapForShip(viewer, useBasemapStore.getState().entities, p)
        } else if (msg.type === 'stats_update') {
          setStats(msg.payload as PortStats)
        } else if (msg.type === 'director_overview_update') {
          /* 运营总监全景 KPI 由 Overview面板单独消费 */
        }
      },
      () => setWsConnected(true),
      () => setWsConnected(false),
    )

    return () => {
      unsubBasemap()
      unsubWs()
      viewer.scene.postRender.removeEventListener(updateCompass)
      clickHandler.destroy()
      window.removeEventListener(SET_DEFAULT_CAMERA_EVENT, onSetDefaultCamera)
      window.removeEventListener(START_COORD_RECORDING_EVENT, onStartCoordRecording)
      window.removeEventListener(STOP_COORD_RECORDING_EVENT, onStopCoordRecording)
      window.removeEventListener(SHIP_DRAFTS_UPDATED_EVENT, onShipDraftsUpdated)
      viewer.camera.changed.removeEventListener(onCameraChanged)
      if (hoveredRestoreRef.current) {
        hoveredRestoreRef.current()
      }
      hoveredRestoreRef.current = null
      hoveredEntityRef.current = null
      lastShipDraftByMmsi.clear()
      entitiesRef.current.clear()
      setMapViewer(null)
      cesiumOsmHotRefs.viewer = null
      cesiumOsmHotRefs.tileset = null
      if (!(viewer as any)?.isDestroyed?.()) viewer.destroy()
      viewerRef.current = null
    }
  }, [setShips, updateShip, setStats, setWsConnected, token])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    void (async () => {
      try {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        if (viewerRef.current !== viewer || (viewer as any)?.isDestroyed?.()) return
        osmBuildingsRef.current = await applyCesiumGeographicModel(viewer)
        cesiumOsmHotRefs.tileset = osmBuildingsRef.current
        if (viewerRef.current !== viewer || (viewer as any)?.isDestroyed?.()) return
        viewer.scene.globe.baseColor = Color.fromCssColorString('#1a3a52')
      } catch (error) {
        console.error('Failed to load 3D buildings:', error)
      }
    })()
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const ships = useScreenStore.getState().ships.map(applySimShipIfNeeded)
    useScreenStore.getState().setShips(ships)
    for (const s of ships) {
      upsertShipEntity(viewer, entitiesRef.current, s)
      syncDynamicBasemapForShip(viewer, useBasemapStore.getState().entities, s)
    }
  }, [simEnabled, simProgress])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    for (const id of simOverlayEntityIdsRef.current) {
      const e = viewer.entities.getById(id)
      if (e) viewer.entities.remove(e)
    }
    simOverlayEntityIdsRef.current = []
    if (!simEnabled) {
      viewer.scene.requestRender()
      return
    }

    const waitingId = 'simulation:waiting-zone'
    const waitingLabelId = 'simulation:waiting-zone-label'
    const waitPositions: number[] = []
    for (const p of SIM_WAIT_AREA_POLYGON) waitPositions.push(p.longitude, p.latitude, p.height)
    viewer.entities.add({
      id: waitingId,
      name: '等待入港区',
      polygon: {
        hierarchy: Cartesian3.fromDegreesArrayHeights(waitPositions),
        material: Color.fromCssColorString('#f59e0b').withAlpha(0.18),
        outline: true,
        outlineColor: Color.fromCssColorString('#fbbf24'),
        perPositionHeight: true,
      },
    })
    viewer.entities.add({
      id: waitingLabelId,
      name: '等待入港区',
      position: Cartesian3.fromDegrees(SIM_WAIT_POINT.longitude, SIM_WAIT_POINT.latitude, 6),
      label: {
        text: '等待入港区',
        font: '13px system-ui,sans-serif',
        fillColor: Color.fromCssColorString('#fcd34d'),
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    const routeId = 'simulation:ship-route'
    viewer.entities.add({
      id: routeId,
      name: 'MV RED SEA 1 靠泊路径',
      polyline: {
        positions: Cartesian3.fromDegreesArray([
          SIM_WAIT_POINT.longitude,
          SIM_WAIT_POINT.latitude,
          SIM_ROUTE_MID_POINT.longitude,
          SIM_ROUTE_MID_POINT.latitude,
          SIM_BERTH_POINT.longitude,
          SIM_BERTH_POINT.latitude,
        ]),
        width: 2,
        material: Color.fromCssColorString('#f97316').withAlpha(0.9),
        clampToGround: true,
      },
    })
    const departRouteId = 'simulation:ship-route-outbound'
    viewer.entities.add({
      id: departRouteId,
      name: 'MV RED SEA 1 离港路径',
      polyline: {
        positions: Cartesian3.fromDegreesArray([
          SIM_BERTH_POINT.longitude,
          SIM_BERTH_POINT.latitude,
          SIM_ROUTE_MID_POINT.longitude,
          SIM_ROUTE_MID_POINT.latitude,
          SIM_DEPART_END_POINT.longitude,
          SIM_DEPART_END_POINT.latitude,
        ]),
        width: 2,
        material: Color.fromCssColorString('#22d3ee').withAlpha(0.9),
        clampToGround: true,
      },
    })
    simOverlayEntityIdsRef.current.push(waitingId, waitingLabelId, routeId, departRouteId)

    const berthFootprint = simBerthFootprintDegrees(SIM_BERTH_POINT)
    const berthHeights = berthFootprint.flatMap((p) => [p.longitude, p.latitude, 0.5])
    const berthId = 'simulation:berth-zone'
    const berthLabelId = 'simulation:berth-label'
    const berthCenterLat =
      berthFootprint.reduce((s, p) => s + p.latitude, 0) / berthFootprint.length
    const berthCenterLon =
      berthFootprint.reduce((s, p) => s + p.longitude, 0) / berthFootprint.length
    viewer.entities.add({
      id: berthId,
      name: SIM_BERTH_LABEL_FULL,
      polygon: {
        hierarchy: Cartesian3.fromDegreesArrayHeights(berthHeights),
        material: Color.fromCssColorString('#0ea5e9').withAlpha(0.22),
        outline: true,
        outlineColor: Color.fromCssColorString('#38bdf8'),
        perPositionHeight: true,
      },
    })
    viewer.entities.add({
      id: berthLabelId,
      name: SIM_BERTH_LABEL_FULL,
      position: Cartesian3.fromDegrees(berthCenterLon, berthCenterLat - 0.000045, 10),
      label: {
        text: SIM_BERTH_LABEL_FULL,
        font: '12px system-ui,sans-serif',
        fillColor: Color.fromCssColorString('#e0f2fe'),
        outlineColor: Color.fromCssColorString('#0c4a6e'),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -6),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    simOverlayEntityIdsRef.current.push(berthId, berthLabelId)

    const cy01 = basemapEntities.find(
      (e) => e.kind === 'zone' && (e.zoneCode ?? '').trim().toUpperCase() === 'CY-01' && e.zonePoints,
    )
    if (cy01?.zonePoints) {
      const points = cy01.zonePoints
      const count = simCy01OccupiedTeu(simProgress)
      if (count > 0) {
        const minLon = Math.min(...points.map((p) => p.longitude))
        const maxLon = Math.max(...points.map((p) => p.longitude))
        const minLat = Math.min(...points.map((p) => p.latitude))
        const maxLat = Math.max(...points.map((p) => p.latitude))
        const bands = [
          { start: 0, end: 1 / 3 },
          { start: 1 / 3, end: 2 / 3 },
          { start: 2 / 3, end: 1 },
        ]
        const colors = ['#ef4444', '#22c55e', '#3b82f6']
        const roadGapRatio = 0.03
        const lonSpan = maxLon - minLon
        const latSpan = maxLat - minLat
        const lonStep = Math.max(0.00009, lonSpan / 14)
        const latStep = Math.max(0.00005, latSpan / 16)
        const avgH = points.reduce((acc, p) => acc + p.height, 0) / points.length
        const footprint = points.map((p) => ({ longitude: p.longitude, latitude: p.latitude }))
        const each = Math.floor(count / 3)
        const remain = count - each * 3

        for (let b = 0; b < 3; b += 1) {
          const target = each + (b < remain ? 1 : 0)
          if (target <= 0) continue
          const bandMin = minLon + bands[b]!.start * lonSpan + (b > 0 ? roadGapRatio * lonSpan : 0)
          const bandMax = minLon + bands[b]!.end * lonSpan - (b < 2 ? roadGapRatio * lonSpan : 0)
          let made = 0
          let idx = 0
          for (let lon = bandMin; lon <= bandMax && made < target; lon += lonStep) {
            for (
              let lat = minLat + latStep * 0.6;
              lat <= maxLat - latStep * 0.6 && made < target;
              lat += latStep
            ) {
              if (!pointInPolygonLonLat(lon, lat, footprint)) continue
              const id = `simulation:cy01:container:${b}:${idx}`
              viewer.entities.add({
                id,
                name: `CY-01 模拟集装箱 ${b + 1}-${idx + 1}`,
                position: Cartesian3.fromDegrees(lon, lat, avgH + 1.5),
                box: {
                  dimensions: new ConstantProperty(new Cartesian3(10.8, 2.4, 2.8)),
                  material: Color.fromCssColorString(colors[b]!).withAlpha(0.92),
                  outline: true,
                  outlineColor: Color.fromCssColorString('#082f49'),
                },
              })
              simOverlayEntityIdsRef.current.push(id)
              made += 1
              idx += 1
            }
          }
        }
      }
    }
    viewer.scene.requestRender()
  }, [basemapEntities, simEnabled, simProgress])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const statusByCode = new Map(
      (effectiveCraneStats ?? []).map((x) => [x.craneCode.trim().toUpperCase(), x.status] as const),
    )
    for (const cfg of basemapEntities) {
      if (cfg.kind !== 'model' || !cfg.visible) continue
      if (!cfg.glbUri?.includes('crane_harbour') && !cfg.glbUri?.includes('gantry_crane')) continue
      const code =
        (cfg.labelText ?? '').trim().toUpperCase() ||
        cfg.name.toUpperCase().match(/(QC|GC)-\d{2}/)?.[0] ||
        ''
      const status = statusByCode.get(code) ?? 'idle'
      const model = viewer.entities.getById(`basemap:${cfg.id}`)?.model
      if (!model) continue
      model.runAnimations = new ConstantProperty(status === 'busy')
    }
    viewer.scene.requestRender()
  }, [basemapEntities, effectiveCraneStats])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || (viewer as { isDestroyed?: () => boolean }).isDestroyed?.() || !activeYardTwinCode)
      return
    const ent = basemapEntities.find(
      (e) =>
        e.kind === 'zone' &&
        (e.zoneCode ?? '').trim().toUpperCase() === activeYardTwinCode &&
        e.zonePoints &&
        e.zonePoints.length >= 2,
    )
    if (!ent?.zonePoints) return
    flyToYardPolygonOblique(
      viewer,
      ent.zonePoints.map((p) => ({ longitude: p.longitude, latitude: p.latitude })),
    )
  }, [activeYardTwinCode, basemapEntities])

  return (
    <div className="cesium-viewport-shell">
      <div ref={containerRef} className="cesium-viewport" />
      <YardZoneCargoTips
        viewer={mapViewer}
        basemapEntities={basemapEntities}
        zones={effectiveYardZones}
      />
      <QuayCraneStatusTips
        viewer={mapViewer}
        basemapEntities={basemapEntities}
        cranes={effectiveCraneStats}
      />
      <div
        className="cesium-compass"
        role="img"
        aria-label="指南针：盘面 N 指向地理真北，随地图视角旋转"
        title="指南针：N 为真北"
      >
        <div ref={compassDiskRef} className="cesium-compass-disk">
          <span className="cesium-compass-cardinal cesium-compass-cardinal--n">N</span>
          <span className="cesium-compass-cardinal cesium-compass-cardinal--e">E</span>
          <span className="cesium-compass-cardinal cesium-compass-cardinal--s">S</span>
          <span className="cesium-compass-cardinal cesium-compass-cardinal--w">W</span>
        </div>
      </div>
    </div>
  )
}

function upsertShipEntity(
  viewer: Viewer,
  map: Map<string, Entity>,
  ship: ShipData,
) {
  const zOffset = shipDraftMeters(ship)
  const prevZOffset = lastShipDraftByMmsi.get(ship.mmsi)
  let entity = map.get(ship.mmsi)
  if (
    entity != null &&
    prevZOffset !== undefined &&
    prevZOffset !== zOffset
  ) {
    viewer.entities.remove(entity)
    map.delete(ship.mmsi)
    entity = undefined
  }
  lastShipDraftByMmsi.set(ship.mmsi, zOffset)

  const lon = ship.position.longitude
  const lat = ship.position.latitude
  /** 航向在椭球参考面 (h=0) 的 ENU 下计算，避免高程变化时朝向与位置耦合 */
  const posHeadingRef = Cartesian3.fromDegrees(lon, lat, 0)
  /** 竖直 Z 偏移（米）：正值上浮，负值下沉，经纬不变 */
  const posWithDraft = Cartesian3.fromDegrees(lon, lat, zOffset)

  if (!entity) {
    const uri = shipModelUri(ship)
    const orientation = shipOrientationQuaternion(posHeadingRef, ship.heading)
    entity = viewer.entities.add({
      id: ship.mmsi,
      position: new ConstantPositionProperty(posWithDraft),
      orientation: new ConstantProperty(orientation),
      model: new ModelGraphics({
        uri: new ConstantProperty(uri),
        scale: new ConstantProperty(SHIP_MODEL_SCALE),
        minimumPixelSize: 48,
        maximumScale: 50000,
        heightReference: HeightReference.NONE,
        enableVerticalExaggeration: new ConstantProperty(false),
        runAnimations: false,
      }),
    })
    map.set(ship.mmsi, entity)
    viewer.scene.requestRender()
    return
  }

  /** 避免 HMR/多副本 Cesium 下 instanceof ConstantPositionProperty 失败导致高度永不更新 */
  entity.position = new ConstantPositionProperty(posWithDraft)

  if (entity.model) {
    entity.orientation = new ConstantProperty(
      shipOrientationQuaternion(posHeadingRef, ship.heading),
    )
    entity.model.uri = new ConstantProperty(shipModelUri(ship))
    entity.model.scale = new ConstantProperty(SHIP_MODEL_SCALE)
    entity.model.heightReference = new ConstantProperty(HeightReference.NONE)
    entity.model.enableVerticalExaggeration = new ConstantProperty(false)
  }

  viewer.scene.requestRender()
}

async function copyRecordedCoordinatesToClipboard(
  points: Array<{ longitude: number; latitude: number; height: number }>,
) {
  const detail = { copied: false, count: points.length }
  if (points.length === 0) {
    window.dispatchEvent(new CustomEvent(COORD_RECORDING_FINISHED_EVENT, { detail }))
    return
  }

  const text = JSON.stringify(
    points.map((p, idx) => ({
      index: idx + 1,
      longitude: Number(p.longitude.toFixed(6)),
      latitude: Number(p.latitude.toFixed(6)),
      height: Number(p.height.toFixed(2)),
    })),
    null,
    2,
  )

  try {
    await navigator.clipboard.writeText(text)
    window.dispatchEvent(
      new CustomEvent(COORD_RECORDING_FINISHED_EVENT, {
        detail: { copied: true, count: points.length },
      }),
    )
  } catch {
    window.dispatchEvent(new CustomEvent(COORD_RECORDING_FINISHED_EVENT, { detail }))
  }
}
