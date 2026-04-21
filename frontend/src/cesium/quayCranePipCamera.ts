import {
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
  Matrix4,
  Transforms,
  Viewer,
} from 'cesium'

const CABIN_ABOVE_GROUND_M = 46
const CABIN_ALONG_BOOM_M = 5

/**
 * QC 岸桥「移动机舱」机位：轨面以上约 45m，沿岸桥 heading 向海面略前移，对准船舶中心（俯视斜视，接近 45° 观感）。
 */
export function applyQuayCraneCabinCameraTowardShip(
  pipViewer: Viewer,
  craneLongitude: number,
  craneLatitude: number,
  craneHeadingDeg: number,
  shipPosition: Cartesian3,
): void {
  const ellipsoid = pipViewer.scene.globe.ellipsoid
  const carto = Cartographic.fromDegrees(craneLongitude, craneLatitude)
  const gh = pipViewer.scene.globe.getHeight(carto)
  const groundH = typeof gh === 'number' && Number.isFinite(gh) ? gh : 0
  const cabinH = groundH + CABIN_ABOVE_GROUND_M
  const craneBase = Cartesian3.fromRadians(
    carto.longitude,
    carto.latitude,
    cabinH,
    ellipsoid,
    new Cartesian3(),
  )

  const h = CesiumMath.toRadians(craneHeadingDeg)
  const forwardEnu = new Cartesian3(Math.sin(h), Math.cos(h), 0)
  const enu = Transforms.eastNorthUpToFixedFrame(craneBase, ellipsoid, new Matrix4())
  const boomOff = Cartesian3.multiplyByScalar(
    forwardEnu,
    CABIN_ALONG_BOOM_M,
    new Cartesian3(),
  )
  const camPos = Matrix4.multiplyByPoint(enu, boomOff, new Cartesian3())

  const direction = Cartesian3.normalize(
    Cartesian3.subtract(shipPosition, camPos, new Cartesian3()),
    new Cartesian3(),
  )
  const surfaceNormal = ellipsoid.geocentricSurfaceNormal(camPos, new Cartesian3())
  let right = Cartesian3.cross(direction, surfaceNormal, new Cartesian3())
  if (Cartesian3.magnitudeSquared(right) < 1e-18) {
    right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, new Cartesian3())
  }
  Cartesian3.normalize(right, right)
  const up = Cartesian3.normalize(
    Cartesian3.cross(right, direction, new Cartesian3()),
    new Cartesian3(),
  )
  pipViewer.camera.setView({
    destination: camPos,
    orientation: { direction, up },
  })
}
