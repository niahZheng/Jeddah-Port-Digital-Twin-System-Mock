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

function basemapId(rowId: string, suffix = ''): string {
  return suffix ? `basemap:${rowId}:${suffix}` : `basemap:${rowId}`
}

function calcZoneCenter(
  points: Array<{ longitude: number; latitude: number; height: number }>,
): { longitude: number; latitude: number } {
  const count = points.length || 1
  const longitude = points.reduce((acc, p) => acc + p.longitude, 0) / count
  const latitude = points.reduce((acc, p) => acc + p.latitude, 0) / count
  return { longitude, latitude }
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
      const positions: number[] = []
      for (const p of pts) positions.push(p.longitude, p.latitude, p.height)
      const center = calcZoneCenter(pts)
      const zoneLabel =
        ent.zoneCode && ent.name ? `${ent.zoneCode} ${ent.name}` : ent.name || ent.zoneCode || '区域'
      const fill = Color.fromCssColorString(ent.fillColor ?? '#22d3ee').withAlpha(0.24)
      const outline = Color.fromCssColorString(ent.outlineColor ?? '#38bdf8')
      const eid = basemapId(ent.id)
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
            pts[0]!.height,
          ]),
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
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        position: new ConstantPositionProperty(
          Cartesian3.fromDegrees(center.longitude, center.latitude, 6),
        ),
      })
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
      const dynLabel = ent.labelText
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
        ...(dynLabel
          ? {
              label: {
                text: new ConstantProperty(dynLabel),
                font: '11px system-ui,sans-serif',
                fillColor: Color.fromCssColorString('#fbbf24'),
                outlineColor: Color.BLACK,
                outlineWidth: 2,
                style: LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: VerticalOrigin.BOTTOM,
                pixelOffset: new Cartesian2(0, -8),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
            }
          : {}),
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
    const labelText = ent.labelText ?? ent.name

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
      ...(labelText
        ? {
            label: {
              text: new ConstantProperty(labelText),
              font: '11px system-ui,sans-serif',
              fillColor: Color.fromCssColorString('#c4b5fd'),
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              style: LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian2(0, -8),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }
        : {}),
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
