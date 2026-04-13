import {
  Cartesian3,
  Color,
  HeadingPitchRoll,
  Math as CesiumMath,
  Transforms,
} from 'cesium'
import type { ShipData } from '../types/port'

/** 竖杆高度（米，离地） */
export const LANDMARK_STEM_H = 42
/** 立方体边长（米），一角朝上呈钻石感 */
export const LANDMARK_GEM_SIZE = 14
/** 宝石几何中心相对杆顶的抬升（米） */
export const LANDMARK_GEM_OFFSET_H = 10
/** 地面圆环半径（米） */
export const LANDMARK_RING_RADIUS_M = 12

export function landmarkRingEntityId(mmsi: string): string {
  return `ring:${mmsi}`
}

export function landmarkFillColor(ship: ShipData): Color {
  const vt = ship.vesselType ?? 'container'
  if (vt === 'bulk') return Color.fromCssColorString('#f0a050').withAlpha(0.92)
  if (vt === 'tanker') return Color.fromCssColorString('#c39bd3').withAlpha(0.92)
  return Color.fromCssColorString('#58d8c4').withAlpha(0.92)
}

export function landmarkStemColor(): Color {
  return Color.WHITE.withAlpha(0.95)
}

export function landmarkPositions(lon: number, lat: number) {
  const ground = Cartesian3.fromDegrees(lon, lat, 0)
  const stemTop = Cartesian3.fromDegrees(lon, lat, LANDMARK_STEM_H)
  const gemH = LANDMARK_STEM_H + LANDMARK_GEM_OFFSET_H
  const gemCenter = Cartesian3.fromDegrees(lon, lat, gemH)
  return { ground, stemTop, gemCenter, gemH }
}

/** 在宝石中心高度的局部 ENU 下，立方体正面朝上并随航向旋转 */
export function landmarkDiamondOrientation(
  lon: number,
  lat: number,
  gemHeightM: number,
  headingDeg: number,
) {
  const origin = Cartesian3.fromDegrees(lon, lat, gemHeightM)
  const hpr = new HeadingPitchRoll(
    CesiumMath.toRadians(headingDeg),
    0,
    0,
  )
  return Transforms.headingPitchRollQuaternion(origin, hpr)
}
