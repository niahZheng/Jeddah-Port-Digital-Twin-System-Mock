import {
  Cartesian3,
  Math as CesiumMath,
  Matrix4,
  Transforms,
  Viewer,
} from 'cesium'

/**
 * 画中画追焦：相机在船艏斜向侧后方，水平与竖向分量按 45° 分解，对准船位中心。
 * headingDeg 与主场景船舶航向一致（度，北为 0 顺时针）。
 */
export function applyVesselPipChaseCamera45Deg(
  pipViewer: Viewer,
  shipPosition: Cartesian3,
  headingDeg: number,
): void {
  const ellipsoid = pipViewer.scene.globe.ellipsoid
  const enu = Transforms.eastNorthUpToFixedFrame(shipPosition, ellipsoid, new Matrix4())
  const h = CesiumMath.toRadians(headingDeg)
  const sinH = Math.sin(h)
  const cosH = Math.cos(h)
  const forwardEnu = new Cartesian3(sinH, cosH, 0)
  const worldUp = Cartesian3.UNIT_Z
  const rightEnu = Cartesian3.normalize(
    Cartesian3.cross(forwardEnu, worldUp, new Cartesian3()),
    new Cartesian3(),
  )
  const backEnu = Cartesian3.negate(forwardEnu, new Cartesian3())
  const deg45 = CesiumMath.toRadians(45)
  const range = 108
  const horizontal = range * Math.cos(deg45)
  const vertical = range * Math.sin(deg45)
  const off = new Cartesian3()
  Cartesian3.multiplyByScalar(backEnu, 0.58 * horizontal, off)
  Cartesian3.add(
    off,
    Cartesian3.multiplyByScalar(rightEnu, 0.48 * horizontal, new Cartesian3()),
    off,
  )
  Cartesian3.add(
    off,
    Cartesian3.multiplyByScalar(worldUp, vertical * 0.9, new Cartesian3()),
    off,
  )
  const camPos = Matrix4.multiplyByPoint(enu, off, new Cartesian3())
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
