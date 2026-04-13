import {
  Cartesian3,
  Ellipsoid,
  HeadingPitchRoll,
  Math as CesiumMath,
  Transforms,
} from 'cesium'
import type { ShipData } from '../types/port'

export const SHIP_GLB_01 = '/models/cargo_ship_01.glb'
export const SHIP_GLB_02 = '/models/cargo_ship_02.glb'
export const CARGO_SHIP_3D_MODEL = '/models/cargo ship 3d model.glb'

/** glTF 与真实尺度不一致时整体缩放（可改为 0.01～100 试效果） */
export const SHIP_MODEL_SCALE = 1

/** 模型前向与航向不一致时微调（度），常见需 ±90 */
export const SHIP_MODEL_HEADING_OFFSET_DEG = 0

/** 集装箱船用 01；散货/油轮用 02（可按项目再细分） */
export function shipModelUri(ship: ShipData): string {
  const vt = ship.vesselType ?? 'container'
  if (vt === 'bulk' || vt === 'tanker') return SHIP_GLB_02
  return SHIP_GLB_01
}

export function shipOrientationQuaternion(
  position: Cartesian3,
  headingDegrees: number,
) {
  const hpr = new HeadingPitchRoll(
    CesiumMath.toRadians(headingDegrees + SHIP_MODEL_HEADING_OFFSET_DEG),
    0,
    0,
  )
  return Transforms.headingPitchRollQuaternion(position, hpr, Ellipsoid.WGS84)
}
