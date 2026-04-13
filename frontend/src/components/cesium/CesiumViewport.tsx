import { useEffect, useRef } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  Entity,
  HeightReference,
  LabelStyle,
  ModelGraphics,
  Viewer,
  HeadingPitchRoll,
  Math as CesiumMath,
  Transforms,
  Ellipsoid,
  VerticalOrigin,
} from 'cesium'
import { fetchShips, subscribePortSocket } from '../../api/client'
import { freightShipLabelLines } from '../../cesium/freightSymbols'
import {
  SHIP_MODEL_SCALE,
  shipModelUri,
  shipOrientationQuaternion,
  CARGO_SHIP_3D_MODEL,
} from '../../cesium/shipModels'
import {
  applyOsmStreetBasemap,
  applyCesiumGeographicModel,
  bindHomeToLighthouse,
  configureIonFromEnv,
  createViewer,
  flyToJeddahLighthouse,
  JEDDAH_LIGHTHOUSE,
} from '../../cesium/viewerConfig'
import { useScreenStore } from '../../store/screenStore'
import type { PortStats, ShipData } from '../../types/port'

export function CesiumViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const entitiesRef = useRef<Map<string, Entity>>(new Map())
  const osmBuildingsRef = useRef<any>(null)

  const setShips = useScreenStore((s) => s.setShips)
  const updateShip = useScreenStore((s) => s.updateShip)
  const setStats = useScreenStore((s) => s.setStats)
  const setWsConnected = useScreenStore((s) => s.setWsConnected)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    configureIonFromEnv()
    const viewer = createViewer(el, 'ellipsoid')
    viewerRef.current = viewer
    viewer.scene.globe.show = true
    flyToJeddahLighthouse(viewer)
    applyOsmStreetBasemap(viewer)
    bindHomeToLighthouse(viewer)

    void fetchShips()
      .then((ships) => {
        setShips(ships)
        for (const s of ships) upsertShipEntity(viewer, entitiesRef.current, s)
      })
      .catch(() => {})

    const unsubWs = subscribePortSocket(
      (msg) => {
        if (msg.type === 'ship_update') {
          const p = msg.payload as ShipData
          updateShip(p)
          upsertShipEntity(viewer, entitiesRef.current, p)
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
      unsubWs()
      entitiesRef.current.clear()
      viewer.destroy()
      viewerRef.current = null
    }
  }, [setShips, updateShip, setStats, setWsConnected])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    void (async () => {
      try {
        osmBuildingsRef.current = await applyCesiumGeographicModel(viewer)
        viewer.scene.globe.baseColor = Color.fromCssColorString('#1a3a52')

        const shipLat = JEDDAH_LIGHTHOUSE.latitude - 0.005
        const shipLon = JEDDAH_LIGHTHOUSE.longitude + 0.005
        const shipHeight = 20
        const shipPos = Cartesian3.fromDegrees(shipLon, shipLat, shipHeight)
        const shipHeading = 0

        const shipHpr = new HeadingPitchRoll(
          CesiumMath.toRadians(shipHeading),
          0,
          0,
        )
        const shipOrientation = Transforms.headingPitchRollQuaternion(
          shipPos,
          shipHpr,
          Ellipsoid.WGS84,
        )

        viewer.entities.add({
          id: 'cargo-ship-static',
          name: '吉达港货船',
          position: new ConstantPositionProperty(shipPos),
          orientation: new ConstantProperty(shipOrientation),
          model: new ModelGraphics({
            uri: new ConstantProperty(CARGO_SHIP_3D_MODEL),
            scale: new ConstantProperty(50),
            minimumPixelSize: 48,
            maximumScale: 50000,
            heightReference: HeightReference.NONE,
            runAnimations: false,
          }),
        })
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
    font: '11px system-ui,sans-serif',
    fillColor: Color.WHITE,
    outlineColor: Color.BLACK,
    outlineWidth: 2,
    style: LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: VerticalOrigin.BOTTOM,
    pixelOffset: new Cartesian2(0, -8),
    heightReference: HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  }
}

function upsertShipEntity(
  viewer: Viewer,
  map: Map<string, Entity>,
  ship: ShipData,
) {
  const lon = ship.position.longitude
  const lat = ship.position.latitude
  const posGround = Cartesian3.fromDegrees(lon, lat, 0)

  let entity = map.get(ship.mmsi)

  if (!entity) {
    const uri = shipModelUri(ship)
    const orientation = shipOrientationQuaternion(posGround, ship.heading)
    entity = viewer.entities.add({
      id: ship.mmsi,
      position: new ConstantPositionProperty(posGround),
      orientation: new ConstantProperty(orientation),
      model: new ModelGraphics({
        uri: new ConstantProperty(uri),
        scale: new ConstantProperty(SHIP_MODEL_SCALE),
        minimumPixelSize: 48,
        maximumScale: 50000,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        runAnimations: false,
      }),
      label: shipEntityLabel(ship),
    })
    map.set(ship.mmsi, entity)
    return
  }

  const cpp = entity.position
  if (cpp instanceof ConstantPositionProperty) {
    cpp.setValue(posGround)
  }

  if (entity.model) {
    entity.orientation = new ConstantProperty(
      shipOrientationQuaternion(posGround, ship.heading),
    )
    entity.model.uri = new ConstantProperty(shipModelUri(ship))
    entity.model.scale = new ConstantProperty(SHIP_MODEL_SCALE)
  }

  if (entity.label) {
    entity.label.text = new ConstantProperty(freightShipLabelLines(ship))
  }
}
