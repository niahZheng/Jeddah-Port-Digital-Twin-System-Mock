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
export const SHIP_MODEL_SCALE = 20

/**
 * 模型前向与航向不一致时微调（度），常见需 ±90。
 * 停泊时船身与岸线平行由后端 heading / 岸线两点推算；若整体仍偏转可先调此项，或用后端 `mooringQuayAxis.reverse`。
 */
export const SHIP_MODEL_HEADING_OFFSET_DEG = 75

/**
 * 船模竖直 Z 轴偏移（米），相对椭球零高面 h=0。
 * >0 上浮，<0 下沉，=0 贴参考面。为兼容历史接口沿用字段名 `draftMeters`。
 */
export function shipDraftMeters(ship: ShipData): number {
  const d = ship.draftMeters
  if (d != null && Number.isFinite(d)) return d
  return 0
}

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
