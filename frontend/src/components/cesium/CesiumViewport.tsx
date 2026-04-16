import { useEffect, useRef } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  defined,
  Entity,
  HeightReference,
  LabelStyle,
  ModelGraphics,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
  Math as CesiumMath,
  VerticalOrigin,
} from 'cesium'
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
import { applyBasemapEntities, syncDynamicBasemapForShip } from '../../cesium/basemapEntities'
import {
  applyOsmStreetBasemap,
  applyCesiumGeographicModel,
  bindHomeToLighthouse,
  configureIonFromEnv,
  createViewer,
  flyToJeddahLighthouse,
  DEFAULT_CAMERA_VIEW_KEY,
  captureCameraView,
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
import type { PortStats, ShipData } from '../../types/port'

/** 每条船上次用于三维的 Z 轴偏移；变化时 remove+add 实体，避免 Cesium Model 仍用旧 modelMatrix */
const lastShipDraftByMmsi = new Map<string, number>()

export function CesiumViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const entitiesRef = useRef<Map<string, Entity>>(new Map())
  const osmBuildingsRef = useRef<any>(null)
  const isCoordRecordingRef = useRef(false)
  const recordedCoordsRef = useRef<
    Array<{ longitude: number; latitude: number; height: number }>
  >([])

  const setShips = useScreenStore((s) => s.setShips)
  const updateShip = useScreenStore((s) => s.updateShip)
  const setStats = useScreenStore((s) => s.setStats)
  const setWsConnected = useScreenStore((s) => s.setWsConnected)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    configureIonFromEnv()
    const viewer = createViewer(el, 'ellipsoid')
    viewerRef.current = viewer
    viewer.scene.globe.show = true
    // 关键：让地球/地形参与深度测试，地表会遮挡其下方模型（否则船体会“透地显示”）
    viewer.scene.globe.depthTestAgainstTerrain = true
    const applyInitialCamera = async () => {
      if (!token) {
        flyToJeddahLighthouse(viewer)
        return
      }
      try {
        const res = await fetchCameraView(token, DEFAULT_CAMERA_VIEW_KEY)
        flyToJeddahLighthouse(viewer, res.view)
      } catch {
        flyToJeddahLighthouse(viewer)
      }
    }
    void applyInitialCamera()
    applyOsmStreetBasemap(viewer)
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
      clickHandler.destroy()
      window.removeEventListener(SET_DEFAULT_CAMERA_EVENT, onSetDefaultCamera)
      window.removeEventListener(START_COORD_RECORDING_EVENT, onStartCoordRecording)
      window.removeEventListener(STOP_COORD_RECORDING_EVENT, onStopCoordRecording)
      window.removeEventListener(SHIP_DRAFTS_UPDATED_EVENT, onShipDraftsUpdated)
      lastShipDraftByMmsi.clear()
      entitiesRef.current.clear()
      viewer.destroy()
      viewerRef.current = null
    }
  }, [setShips, updateShip, setStats, setWsConnected, token])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    void (async () => {
      try {
        osmBuildingsRef.current = await applyCesiumGeographicModel(viewer)
        viewer.scene.globe.baseColor = Color.fromCssColorString('#1a3a52')
      } catch (error) {
        console.error('Failed to load 3D buildings:', error)
      }
    })()
  }, [])

  return <div ref={containerRef} className="cesium-viewport" />
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
