import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  ClockRange,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  Ellipsoid,
  HeadingPitchRoll,
  HeightReference,
  JulianDate,
  LabelStyle,
  Math as CesiumMath,
  ModelGraphics,
  NearFarScalar,
  PolygonHierarchy,
  Quaternion,
  SampledPositionProperty,
  Transforms,
  VelocityOrientationProperty,
  Viewer,
  VerticalOrigin,
} from 'cesium'
import type { BasemapEntity } from '../types/basemap'
import type { ShipData } from '../types/port'
import { shipDraftMeters } from './shipModels'

let lastManagedBasemapIds: string[] = []
const CY01_ZONE_CODE = 'CY-01'
const CY01_CONTAINER_STACKS_ENABLED = false
const CY01_CONTAINER_DIM_M = { length: 12.2, width: 2.6, height: 2.9 }
const CY01_STACK_LAYERS = 2
const CY01_GRID_SPACING_M = { x: 13.5, y: 3.2 }
const CY01_MAX_CONTAINERS_TOTAL = 900
const CY01_CONTAINER_COLORS = ['#f97316', '#22c55e', '#38bdf8', '#eab308', '#a78bfa']

/** 区域名称标签：屏幕像素字号，不随与相机距离缩放 */
const ZONE_LABEL_SCALE_BY_DISTANCE = new ConstantProperty(
  new NearFarScalar(1.0, 1.0, 1.0e15, 1.0),
)

/** 区域填充略高于配置高程，减轻与影像/地形同深度导致的闪烁（米） */
const ZONE_POLYGON_Z_OFFSET_M = 3

/** 顶点近零走贴地逻辑时，色块相对地表再抬高（米），避免与地形/影像完全共面 */
const ZONE_POLYGON_RELATIVE_ABOVE_GROUND_M = 4

/** 顶点高程皆近 0 时走贴地多边形（World Terrain 下否则会被地形盖住） */
const ZONE_CLAMP_HEIGHT_EPS_M = 0.5

export function zonePolygonClampToGround(
  pts: Array<{ height?: number | null }> | null | undefined,
): boolean {
  if (!pts || pts.length < 3) return false
  return pts.every((p) => Math.abs(p.height ?? 0) < ZONE_CLAMP_HEIGHT_EPS_M)
}

function basemapId(rowId: string, suffix = ''): string {
  return suffix ? `basemap:${rowId}:${suffix}` : `basemap:${rowId}`
}

/** 与 {@link basemapId} 一致，供外部引用场桥实体 id（历史兼容；动画开关见 {@link basemapCraneAnimationEntityIds}） */
export const BASEMAP_GANTRY_ENTITY_ID = basemapId('gantry-01')

/** 与场桥相同：含骨骼动画的 GLB 默认播放，并由底栏开关一并控制 */
export function basemapGlbUsesSkeletalAnimations(glbUri: string | null | undefined): boolean {
  if (!glbUri) return false
  return glbUri.includes('gantry_crane') || glbUri.includes('crane_harbour')
}

export function basemapCraneAnimationEntityIds(entities: BasemapEntity[]): string[] {
  return entities
    .filter((e) => e.kind === 'model' && e.visible && basemapGlbUsesSkeletalAnimations(e.glbUri))
    .map((e) => basemapId(e.id))
}

function calcZoneCenter(
  points: Array<{ longitude: number; latitude: number; height: number }>,
): { longitude: number; latitude: number } {
  const count = points.length || 1
  const longitude = points.reduce((acc, p) => acc + p.longitude, 0) / count
  const latitude = points.reduce((acc, p) => acc + p.latitude, 0) / count
  return { longitude, latitude }
}

/** 集货区 HTML 饼图 tips 锚点（与多边形抬高一致，并再上移一段） */
const ZONE_TIP_EXTRA_HEIGHT_M = 14

export function basemapZoneTipAnchorDegrees(
  pts: Array<{ longitude: number; latitude: number; height: number }>,
): { longitude: number; latitude: number; height: number } {
  const c = calcZoneCenter(pts)
  const avgH = pts.reduce((acc, p) => acc + p.height, 0) / pts.length
  return {
    longitude: c.longitude,
    latitude: c.latitude,
    height:
      avgH +
      ZONE_POLYGON_Z_OFFSET_M +
      (zonePolygonClampToGround(pts) ? ZONE_POLYGON_RELATIVE_ABOVE_GROUND_M : 0) +
      ZONE_TIP_EXTRA_HEIGHT_M,
  }
}

function resetViewerClock(viewer: Viewer) {
  const now = JulianDate.now()
  viewer.clock.startTime = JulianDate.addSeconds(now, -60, new JulianDate())
  viewer.clock.stopTime = JulianDate.addSeconds(now, 3600 * 24, new JulianDate())
  viewer.clock.currentTime = now.clone()
  viewer.clock.clockRange = ClockRange.UNBOUNDED
  viewer.clock.multiplier = 1
  viewer.clock.shouldAnimate = true
}

function metersToLongitudeDegrees(meters: number, latitudeDegrees: number): number {
  const metersPerDegreeLon = 111320 * Math.cos((latitudeDegrees * Math.PI) / 180)
  if (!Number.isFinite(metersPerDegreeLon) || metersPerDegreeLon <= 0) return 0
  return meters / metersPerDegreeLon
}

function metersToLatitudeDegrees(meters: number): number {
  return meters / 110540
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

function addCy01ContainerStacks(
  viewer: Viewer,
  zoneEntityId: string,
  points: Array<{ longitude: number; latitude: number; height: number }>,
  track: (id: string) => void,
  clampGroundZone: boolean,
) {
  const minLon = Math.min(...points.map((p) => p.longitude))
  const maxLon = Math.max(...points.map((p) => p.longitude))
  const minLat = Math.min(...points.map((p) => p.latitude))
  const maxLat = Math.max(...points.map((p) => p.latitude))
  const center = calcZoneCenter(points)
  const avgBaseHeight = points.reduce((acc, p) => acc + p.height, 0) / points.length
  const footprint = points.map((p) => ({ longitude: p.longitude, latitude: p.latitude }))

  const stepLon = metersToLongitudeDegrees(CY01_GRID_SPACING_M.x, center.latitude)
  const stepLat = metersToLatitudeDegrees(CY01_GRID_SPACING_M.y)
  const halfLon = metersToLongitudeDegrees(CY01_CONTAINER_DIM_M.length / 2, center.latitude)
  const halfLat = metersToLatitudeDegrees(CY01_CONTAINER_DIM_M.width / 2)

  let stackIndex = 0
  let createdCount = 0
  for (let lon = minLon + halfLon; lon <= maxLon - halfLon; lon += stepLon) {
    for (let lat = minLat + halfLat; lat <= maxLat - halfLat; lat += stepLat) {
      if (!pointInPolygonLonLat(lon, lat, footprint)) continue
      for (let layer = 0; layer < CY01_STACK_LAYERS; layer += 1) {
        if (createdCount >= CY01_MAX_CONTAINERS_TOTAL) return
        const color = Color.fromCssColorString(
          CY01_CONTAINER_COLORS[(stackIndex + layer) % CY01_CONTAINER_COLORS.length] ?? '#38bdf8',
        ).withAlpha(0.92)
        const z =
          avgBaseHeight + layer * CY01_CONTAINER_DIM_M.height + CY01_CONTAINER_DIM_M.height / 2
        const eid = `${zoneEntityId}:container:${stackIndex}:${layer + 1}`
        viewer.entities.add({
          id: eid,
          name: `CY-01 集装箱堆位 #${stackIndex + 1} L${layer + 1}`,
          position: new ConstantPositionProperty(Cartesian3.fromDegrees(lon, lat, z)),
          box: {
            dimensions: new ConstantProperty(
              new Cartesian3(
                CY01_CONTAINER_DIM_M.length,
                CY01_CONTAINER_DIM_M.width,
                CY01_CONTAINER_DIM_M.height,
              ),
            ),
            material: color,
            outline: true,
            outlineColor: Color.fromCssColorString('#082f49'),
            ...(clampGroundZone ? { heightReference: HeightReference.RELATIVE_TO_GROUND } : {}),
          },
        })
        track(eid)
        createdCount += 1
      }
      stackIndex += 1
    }
  }
}

/**
 * 根据数据库底图配置同步 Cesium 实体（装卸区多边形、固定/巡逻模型、动态跟踪占位模型）。
 */
export function applyBasemapEntities(viewer: Viewer, entities: BasemapEntity[]) {
  for (const id of lastManagedBasemapIds) {
    const e = viewer.entities.getById(id)
    if (e) viewer.entities.remove(e)
  }
  lastManagedBasemapIds = []

  const sorted = [...entities].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  )

  let patrolConfigured = false
  const pathColors = ['#f59e0b', '#22d3ee', '#a78bfa']

  const track = (id: string) => {
    lastManagedBasemapIds.push(id)
  }

  for (const ent of sorted) {
    if (!ent.visible) continue

    if (ent.kind === 'zone') {
      const pts = ent.zonePoints
      if (!pts || pts.length < 3) continue
      const center = calcZoneCenter(pts)
      const avgZoneH = pts.reduce((acc, p) => acc + p.height, 0) / pts.length
      const zoneLabel =
        ent.zoneCode && ent.name ? `${ent.zoneCode} ${ent.name}` : ent.name || ent.zoneCode || '区域'
      const fill = Color.fromCssColorString(ent.fillColor ?? '#22d3ee').withAlpha(0.24)
      const outline = Color.fromCssColorString(ent.outlineColor ?? '#38bdf8')
      const eid = basemapId(ent.id)
      const clampGround = zonePolygonClampToGround(pts)

      if (clampGround) {
        const flat: number[] = []
        for (const p of pts) {
          flat.push(p.longitude, p.latitude)
        }
        const ring = Cartesian3.fromDegreesArray(flat)
        viewer.entities.add({
          id: eid,
          name: zoneLabel,
          polygon: {
            hierarchy: new PolygonHierarchy(ring),
            material: fill,
            // 贴地多边形不支持轮廓线，否则会触发 Cesium oneTimeWarning 并关闭 draping
            outline: false,
            perPositionHeight: false,
            height: ZONE_POLYGON_RELATIVE_ABOVE_GROUND_M,
            heightReference: HeightReference.RELATIVE_TO_GROUND,
          },
          polyline: {
            positions: Cartesian3.fromDegreesArray([...flat, flat[0]!, flat[1]!]),
            width: 2,
            material: Color.fromCssColorString('#67e8f9'),
            clampToGround: true,
          },
          label: {
            text: new ConstantProperty(zoneLabel),
            font: '13px system-ui,sans-serif',
            fillColor: Color.fromCssColorString('#7dd3fc'),
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -10),
            scaleByDistance: ZONE_LABEL_SCALE_BY_DISTANCE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: HeightReference.RELATIVE_TO_GROUND,
          },
          position: new ConstantPositionProperty(
            Cartesian3.fromDegrees(
              center.longitude,
              center.latitude,
              ZONE_POLYGON_RELATIVE_ABOVE_GROUND_M + 4,
            ),
          ),
        })
      } else {
        const positions: number[] = []
        for (const p of pts) {
          positions.push(p.longitude, p.latitude, p.height + ZONE_POLYGON_Z_OFFSET_M)
        }
        viewer.entities.add({
          id: eid,
          name: zoneLabel,
          polygon: {
            hierarchy: Cartesian3.fromDegreesArrayHeights(positions),
            material: fill,
            outline: true,
            outlineColor: outline,
            perPositionHeight: true,
          },
          polyline: {
            positions: Cartesian3.fromDegreesArrayHeights([
              ...positions,
              pts[0]!.longitude,
              pts[0]!.latitude,
              pts[0]!.height + ZONE_POLYGON_Z_OFFSET_M,
            ]),
            width: 2,
            material: Color.fromCssColorString('#67e8f9'),
            clampToGround: false,
          },
          label: {
            text: new ConstantProperty(zoneLabel),
            font: '13px system-ui,sans-serif',
            fillColor: Color.fromCssColorString('#7dd3fc'),
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -10),
            scaleByDistance: ZONE_LABEL_SCALE_BY_DISTANCE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          position: new ConstantPositionProperty(
            Cartesian3.fromDegrees(
              center.longitude,
              center.latitude,
              avgZoneH + ZONE_POLYGON_Z_OFFSET_M + 4,
            ),
          ),
        })
      }
      track(eid)
      if (CY01_CONTAINER_STACKS_ENABLED && (ent.zoneCode ?? '').toUpperCase() === CY01_ZONE_CODE) {
        addCy01ContainerStacks(viewer, eid, pts, track, clampGround)
      }
      continue
    }

    if (ent.kind === 'polyline') {
      const pts = ent.pathPoints
      if (!pts || pts.length < 2) continue
      const clampGround = ent.heightRef !== 'none' && zonePolygonClampToGround(pts)
      const lineColor = Color.fromCssColorString(ent.outlineColor ?? '#64748b').withAlpha(0.95)
      const w = Math.max(1, Number(ent.scale) || 4)
      const eid = basemapId(ent.id)
      if (clampGround) {
        const flat: number[] = []
        for (const p of pts) {
          flat.push(p.longitude, p.latitude)
        }
        viewer.entities.add({
          id: eid,
          name: ent.name,
          polyline: {
            positions: Cartesian3.fromDegreesArray(flat),
            width: w,
            material: lineColor,
            clampToGround: true,
          },
        })
      } else {
        const arr: number[] = []
        for (const p of pts) {
          arr.push(p.longitude, p.latitude, p.height + ZONE_POLYGON_Z_OFFSET_M)
        }
        viewer.entities.add({
          id: eid,
          name: ent.name,
          polyline: {
            positions: Cartesian3.fromDegreesArrayHeights(arr),
            width: w,
            material: lineColor,
            clampToGround: false,
          },
        })
      }
      track(eid)
      continue
    }

    if (ent.kind !== 'model') continue

    const path = ent.pathPoints
    const hasPatrolPath = Boolean(path && path.length >= 2)

    if (hasPatrolPath && ent.glbUri) {
      const roundTripPoints = [
        ...path!,
        ...path!.slice(1, -1).reverse(),
      ]
      const segmentSeconds = ent.patrolSegmentSeconds ?? 2
      const pathDuration = (roundTripPoints.length - 1) * segmentSeconds
      const cartesians = roundTripPoints.map((p) =>
        Cartesian3.fromDegrees(p.longitude, p.latitude, p.height),
      )
      const scratchPos = new Cartesian3()

      function positionAlongRoute(routeElapsedSec: number): Cartesian3 {
        let u = routeElapsedSec
        if (u < 0) u += pathDuration
        if (u >= pathDuration) u %= pathDuration
        const idxFloat = u / segmentSeconds
        const i0 = Math.min(Math.floor(idxFloat), cartesians.length - 2)
        const frac = idxFloat - i0
        return Cartesian3.lerp(cartesians[i0]!, cartesians[i0 + 1]!, frac, scratchPos)
      }

      function buildSampledPosition(start: JulianDate, departureDelaySec: number) {
        const sampled = new SampledPositionProperty()
        const sampleStep = 0.5
        for (let tGlob = 0; tGlob <= pathDuration; tGlob += sampleStep) {
          let routeElapsed = tGlob - departureDelaySec
          routeElapsed = ((routeElapsed % pathDuration) + pathDuration) % pathDuration
          const pos = positionAlongRoute(routeElapsed)
          sampled.addSample(
            JulianDate.addSeconds(start, tGlob, new JulianDate()),
            Cartesian3.clone(pos),
          )
        }
        return sampled
      }

      const start = JulianDate.now()
      const stop = JulianDate.addSeconds(start, pathDuration, new JulianDate())
      const truckHeadingOffset = Quaternion.fromAxisAngle(
        Cartesian3.UNIT_Z,
        CesiumMath.toRadians(ent.headingDeg),
        new Quaternion(),
      )
      const truckCount = Math.max(1, ent.patrolTruckCount ?? 1)
      const stagger = Math.max(0, ent.patrolStaggerSeconds ?? 0)

      for (let i = 0; i < truckCount; i += 1) {
        const sampledPosition = buildSampledPosition(start, i * stagger)
        const velocityOrientation = new VelocityOrientationProperty(sampledPosition)
        let lastOrientation: Quaternion | undefined
        const orientationWithOffset = new CallbackProperty((time, result) => {
          const base = velocityOrientation.getValue(time, new Quaternion())
          if (!base) return lastOrientation
          const merged = Quaternion.multiply(base, truckHeadingOffset, result ?? new Quaternion())
          lastOrientation = Quaternion.clone(merged, lastOrientation ?? new Quaternion())
          return merged
        }, false)

        const eid = basemapId(ent.id, String(i + 1))
        viewer.entities.add({
          id: eid,
          name: `${ent.name} #${i + 1}`,
          position: sampledPosition,
          orientation: orientationWithOffset,
          model: new ModelGraphics({
            uri: new ConstantProperty(ent.glbUri),
            scale: new ConstantProperty(ent.scale),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            runAnimations: true,
          }),
          path: {
            resolution: 1,
            width: 2,
            material: Color.fromCssColorString(pathColors[i] ?? '#f59e0b').withAlpha(0.75),
            leadTime: 0,
            trailTime: Number.POSITIVE_INFINITY,
          },
        })
        track(eid)
      }

      viewer.clock.startTime = start.clone()
      viewer.clock.currentTime = start.clone()
      viewer.clock.stopTime = stop.clone()
      viewer.clock.clockRange = ClockRange.LOOP_STOP
      viewer.clock.multiplier = 1
      viewer.clock.shouldAnimate = true
      patrolConfigured = true
      continue
    }

    if (ent.rotationMode === 'dynamic_track' && ent.trackMmsi) {
      if (!ent.glbUri) continue
      const lon = ent.longitude ?? 0
      const lat = ent.latitude ?? 0
      const h = ent.height ?? 0
      const position = Cartesian3.fromDegrees(lon, lat, h)
      const heightRef =
        ent.heightRef === 'clamp' ? HeightReference.CLAMP_TO_GROUND : HeightReference.NONE
      const orientation = Transforms.headingPitchRollQuaternion(
        position,
        new HeadingPitchRoll(CesiumMath.toRadians(ent.headingDeg), 0, 0),
        Ellipsoid.WGS84,
      )
      const eid = basemapId(ent.id)
      viewer.entities.add({
        id: eid,
        name: ent.name,
        position: new ConstantPositionProperty(position),
        orientation: new ConstantProperty(orientation),
        model: new ModelGraphics({
          uri: new ConstantProperty(ent.glbUri),
          scale: new ConstantProperty(ent.scale),
          heightReference: heightRef,
          runAnimations: false,
        }),
      })
      track(eid)
      continue
    }

    if (!ent.glbUri) continue

    const lon = ent.longitude ?? 0
    const lat = ent.latitude ?? 0
    const h = ent.height ?? 0
    const position = Cartesian3.fromDegrees(lon, lat, h)
    const heightRef =
      ent.heightRef === 'clamp' ? HeightReference.CLAMP_TO_GROUND : HeightReference.NONE

    const orientation = Transforms.headingPitchRollQuaternion(
      position,
      new HeadingPitchRoll(CesiumMath.toRadians(ent.headingDeg), 0, 0),
      Ellipsoid.WGS84,
    )

    const eid = basemapId(ent.id)
    const shouldRunAnimations = basemapGlbUsesSkeletalAnimations(ent.glbUri)

    viewer.entities.add({
      id: eid,
      name: ent.name,
      position: new ConstantPositionProperty(position),
      orientation: new ConstantProperty(orientation),
      model: new ModelGraphics({
        uri: new ConstantProperty(ent.glbUri),
        scale: new ConstantProperty(ent.scale),
        heightReference: heightRef,
        runAnimations: shouldRunAnimations,
      }),
    })
    track(eid)
  }

  if (!patrolConfigured) {
    resetViewerClock(viewer)
  }
  viewer.scene.requestRender()
}

export function syncDynamicBasemapForShip(
  viewer: Viewer,
  configs: BasemapEntity[],
  ship: ShipData,
) {
  for (const cfg of configs) {
    if (!cfg.visible || cfg.kind !== 'model') continue
    if (cfg.rotationMode !== 'dynamic_track' || cfg.trackMmsi !== ship.mmsi) continue
    if (!cfg.glbUri) continue

    const cid = basemapId(cfg.id)
    const draft = shipDraftMeters(ship)
    const lon = ship.position.longitude
    const lat = ship.position.latitude
    const posHeadingRef = Cartesian3.fromDegrees(lon, lat, 0)
    const posWithDraft = Cartesian3.fromDegrees(lon, lat, -draft)
    const hpr = new HeadingPitchRoll(
      CesiumMath.toRadians(ship.heading + cfg.headingDeg),
      0,
      0,
    )
    const orientation = Transforms.headingPitchRollQuaternion(
      posHeadingRef,
      hpr,
      Ellipsoid.WGS84,
    )

    let entity = viewer.entities.getById(cid)
    if (!entity) {
      entity = viewer.entities.add({
        id: cid,
        name: cfg.name,
        position: new ConstantPositionProperty(posWithDraft),
        orientation: new ConstantProperty(orientation),
        model: new ModelGraphics({
          uri: new ConstantProperty(cfg.glbUri),
          scale: new ConstantProperty(cfg.scale),
          heightReference: HeightReference.NONE,
          runAnimations: false,
        }),
      })
      lastManagedBasemapIds.push(cid)
    } else {
      entity.position = new ConstantPositionProperty(posWithDraft)
      entity.orientation = new ConstantProperty(orientation)
      if (entity.model) {
        entity.model.uri = new ConstantProperty(cfg.glbUri)
        entity.model.scale = new ConstantProperty(cfg.scale)
        entity.model.heightReference = new ConstantProperty(HeightReference.NONE)
      }
    }
    viewer.scene.requestRender()
  }
}
