/**
 * 与「仿真」面板说明一致：0–18 入港靠泊；18–50 QC-01/02 卸货，箱入 CY-01；
 * 50–60 满载待发离港；60–100 场桥疏运，CY-01 降至 0。
 */

import type { LonLat } from './yardGeometry'

export const SIM_CY01_CAPACITY_TEU = 30

/** 与泊位示意区、标注一致的码头编号（演示） */
export const SIM_BERTH_ID = 'N-02'
export const SIM_BERTH_LABEL_SHORT = `${SIM_BERTH_ID} 卸货泊位`
export const SIM_BERTH_LABEL_FULL = `${SIM_BERTH_LABEL_SHORT} · QC-01/02 → CY-01 暂存`

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** 仿真进度 0–100 下 CY-01 在库 TEU（与地图箱组、孪生面板共用） */
export function simCy01OccupiedTeu(progress: number): number {
  const p = progress
  if (p < 18) return 0
  if (p < 50) return Math.round(((p - 18) / 32) * SIM_CY01_CAPACITY_TEU)
  if (p < 60) return SIM_CY01_CAPACITY_TEU
  if (p < 100) return Math.round((1 - clamp01((p - 60) / 40)) * SIM_CY01_CAPACITY_TEU)
  return 0
}

export type SimCy01Phase = 'approach' | 'unloading' | 'yard_full' | 'dispersing' | 'idle_after'

export function simCy01Phase(progress: number): SimCy01Phase {
  const p = progress
  if (p < 18) return 'approach'
  if (p < 50) return 'unloading'
  if (p < 60) return 'yard_full'
  if (p < 100) return 'dispersing'
  return 'idle_after'
}

export function simCy01PhaseLabelZh(phase: SimCy01Phase): string {
  switch (phase) {
    case 'approach':
      return '入港靠泊'
    case 'unloading':
      return '泊位卸货 → 箱入 CY-01'
    case 'yard_full':
      return 'CY-01 满载（待发离港）'
    case 'dispersing':
      return '场桥疏运 · CY-01 出箱'
    default:
      return '仿真结束'
  }
}

/** 泊位多边形顶点（米级尺度示意），供 Cesium polygon */
export function simBerthFootprintDegrees(center: LonLat): LonLat[] {
  const latR = center.latitude * (Math.PI / 180)
  const halfW = 75 / (111_320 * Math.cos(latR))
  const halfD = 38 / 110_540
  return [
    { longitude: center.longitude - halfW, latitude: center.latitude - halfD },
    { longitude: center.longitude + halfW, latitude: center.latitude - halfD },
    { longitude: center.longitude + halfW, latitude: center.latitude + halfD },
    { longitude: center.longitude - halfW, latitude: center.latitude + halfD },
  ]
}
