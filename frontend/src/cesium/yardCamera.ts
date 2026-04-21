import {
  BoundingSphere,
  Cartesian3,
  HeadingPitchRange,
  Math as CesiumMath,
  Viewer,
} from 'cesium'
import type { LonLat } from './yardGeometry'

/** 飞向堆场多边形斜视概览（数字孪生堆场入口） */
export function flyToYardPolygonOblique(
  viewer: Viewer,
  ring: LonLat[],
  options?: { duration?: number },
): void {
  if (ring.length < 2) return
  const lons = ring.map((p) => p.longitude)
  const lats = ring.map((p) => p.latitude)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const centerLon = (minLon + maxLon) / 2
  const centerLat = (minLat + maxLat) / 2
  const latMid = centerLat * (Math.PI / 180)
  const dx = (maxLon - minLon) * 111_320 * Math.cos(latMid)
  const dy = (maxLat - minLat) * 110_540
  const diag = Math.max(40, Math.hypot(dx, dy))
  const center = Cartesian3.fromDegrees(centerLon, centerLat, 4)
  const sphere = new BoundingSphere(center, diag * 0.55 + 40)
  const range = Math.max(220, Math.min(1200, diag * 1.15))
  viewer.camera.flyToBoundingSphere(sphere, {
    duration: options?.duration ?? 1.45,
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(38),
      CesiumMath.toRadians(-52),
      range,
    ),
  })
}
