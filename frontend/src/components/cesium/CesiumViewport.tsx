import { useEffect, useRef, useState } from 'react'
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
  JulianDate,
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
import { freightShipLabelLines } from '../../cesium/freightSymbols'
import {
  SHIP_MODEL_SCALE,
  shipDraftMeters,
  shipModelUri,
  shipOrientationQuaternion,
} from '../../cesium/shipModels'
import {
  applyBasemapEntities,
  basemapCraneAnimationEntityIds,
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
  terrainModeFromEnv,
} from '../../cesium/viewerConfig'
import {
  COORD_RECORDING_FINISHED_EVENT,
  GANTRY_ANIM_STATE_EVENT,
  SET_DEFAULT_CAMERA_EVENT,
  SET_MAX_CAMERA_VIEW_EVENT,
  SHIP_DRAFTS_UPDATED_EVENT,
  START_COORD_RECORDING_EVENT,
  STOP_COORD_RECORDING_EVENT,
  TOGGLE_GANTRY_ANIMATION_EVENT,
  UNLOCK_MAX_CAMERA_VIEW_EVENT,
  type GantryAnimStateDetail,
} from '../../cesium/cameraEvents'
import { useScreenStore } from '../../store/screenStore'
import { useAuthStore } from '../../store/authStore'
import { useBasemapStore } from '../../store/basemapStore'
import type { PortStats, ShipData } from '../../types/port'
import { YardZoneCargoTips } from './YardZoneCargoTips'

/** 每条船上次用于三维的 Z 轴偏移；变化时 remove+add 实体，避免 Cesium Model 仍用旧 modelMatrix */
const lastShipDraftByMmsi = new Map<string, number>()

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

function readModelRunAnimations(
  prop: boolean | { getValue?: (t: JulianDate) => boolean | undefined } | undefined,
  time: JulianDate,
  defaultVal = true,
): boolean {
  if (prop == null) return defaultVal
  if (typeof prop === 'boolean') return prop
  const v = prop.getValue?.(time)
  return v !== undefined ? Boolean(v) : defaultVal
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
  const maxCameraHeightRef = useRef<number | null>(null)
  const maxCameraRectRef = useRef<Rectangle | null>(null)
  const clampingCameraRef = useRef(false)

  const setShips = useScreenStore((s) => s.setShips)
  const updateShip = useScreenStore((s) => s.updateShip)
  const setStats = useScreenStore((s) => s.setStats)
  const setWsConnected = useScreenStore((s) => s.setWsConnected)
  const stats = useScreenStore((s) => s.stats)
  const basemapEntities = useBasemapStore((s) => s.entities)
  const token = useAuthStore((s) => s.token)

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
    const onSetMaxCameraView = () => {
      const current = Cartographic.fromCartesian(viewer.camera.positionWC)
      if (!current) return
      const lockHeight = Math.max(0, current.height)
      maxCameraHeightRef.current = lockHeight
      maxCameraRectRef.current =
        viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid) ?? null
      // 原生滚轮缩放上限：锁定后禁止再拉远（但仍可拉近）
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = lockHeight
    }
    const onUnlockMaxCameraView = () => {
      maxCameraHeightRef.current = null
      maxCameraRectRef.current = null
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = Number.POSITIVE_INFINITY
    }

    const onToggleGantryAnimation = () => {
      const ids = basemapCraneAnimationEntityIds(useBasemapStore.getState().entities)
      if (ids.length === 0) return
      const now = JulianDate.now()
      let prev = true
      let found = false
      for (const id of ids) {
        const e = viewer.entities.getById(id)
        if (!e?.model) continue
        prev = readModelRunAnimations(
          e.model.runAnimations as boolean | { getValue?: (t: JulianDate) => boolean | undefined },
          now,
        )
        found = true
        break
      }
      if (!found) return
      const next = !prev
      for (const id of ids) {
        const e = viewer.entities.getById(id)
        if (!e?.model) continue
        e.model.runAnimations = new ConstantProperty(next)
      }
      viewer.scene.requestRender()
      window.dispatchEvent(
        new CustomEvent<GantryAnimStateDetail>(GANTRY_ANIM_STATE_EVENT, {
          detail: { running: next },
        }),
      )
    }
    const onCameraChanged = () => {
      const rect = maxCameraRectRef.current
      if (!rect || clampingCameraRef.current) return
      const currentRect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
      if (!currentRect) return
      const outOfBounds =
        currentRect.west < rect.west ||
        currentRect.east > rect.east ||
        currentRect.south < rect.south ||
        currentRect.north > rect.north
      if (!outOfBounds) return

      clampingCameraRef.current = true
      try {
        viewer.camera.setView({
          destination: rect,
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
          setShips(ships)
          for (const s of ships) {
            upsertShipEntity(viewer, entitiesRef.current, s)
            syncDynamicBasemapForShip(viewer, useBasemapStore.getState().entities, s)
          }
        })
        .catch(() => {})
    }

    window.addEventListener(SET_DEFAULT_CAMERA_EVENT, onSetDefaultCamera)
    window.addEventListener(SET_MAX_CAMERA_VIEW_EVENT, onSetMaxCameraView)
    window.addEventListener(UNLOCK_MAX_CAMERA_VIEW_EVENT, onUnlockMaxCameraView)
    window.addEventListener(TOGGLE_GANTRY_ANIMATION_EVENT, onToggleGantryAnimation)
    window.addEventListener(START_COORD_RECORDING_EVENT, onStartCoordRecording)
    window.addEventListener(STOP_COORD_RECORDING_EVENT, onStopCoordRecording)
    window.addEventListener(SHIP_DRAFTS_UPDATED_EVENT, onShipDraftsUpdated)

    void fetchShips()
      .then((ships) => {
        setShips(ships)
        for (const s of ships) {
          upsertShipEntity(viewer, entitiesRef.current, s)
          syncDynamicBasemapForShip(viewer, useBasemapStore.getState().entities, s)
        }
      })
      .catch(() => {})

    const unsubWs = subscribePortSocket(
      (msg) => {
        if (msg.type === 'ship_update') {
          const p = parseShipData(msg.payload as Record<string, unknown>)
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
      window.removeEventListener(SET_MAX_CAMERA_VIEW_EVENT, onSetMaxCameraView)
      window.removeEventListener(UNLOCK_MAX_CAMERA_VIEW_EVENT, onUnlockMaxCameraView)
      window.removeEventListener(TOGGLE_GANTRY_ANIMATION_EVENT, onToggleGantryAnimation)
      window.removeEventListener(START_COORD_RECORDING_EVENT, onStartCoordRecording)
      window.removeEventListener(STOP_COORD_RECORDING_EVENT, onStopCoordRecording)
      window.removeEventListener(SHIP_DRAFTS_UPDATED_EVENT, onShipDraftsUpdated)
      viewer.camera.changed.removeEventListener(onCameraChanged)
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = Number.POSITIVE_INFINITY
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

  return (
    <div className="cesium-viewport-shell">
      <div ref={containerRef} className="cesium-viewport" />
      <YardZoneCargoTips
        viewer={mapViewer}
        basemapEntities={basemapEntities}
        zones={stats?.yardZones}
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

function shipEntityLabel(ship: ShipData) {
  return {
    text: new ConstantProperty(freightShipLabelLines(ship)),
    font: '15px system-ui,sans-serif',
    fillColor: Color.WHITE,
    outlineColor: Color.BLACK,
    outlineWidth: 5,
    style: LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: VerticalOrigin.BOTTOM,
    pixelOffset: new Cartesian2(0, -8),
    /** 与船模一致：椭球高直接叠加 zOffset，避免 RELATIVE_TO_GROUND 与影像/地形采样不一致 */
    heightReference: HeightReference.NONE,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  }
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
      label: shipEntityLabel(ship),
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

  if (entity.label) {
    entity.label.text = new ConstantProperty(freightShipLabelLines(ship))
    entity.label.heightReference = new ConstantProperty(HeightReference.NONE)
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
