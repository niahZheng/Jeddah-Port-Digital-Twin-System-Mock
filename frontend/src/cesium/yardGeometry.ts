/**
 * 堆场底图多边形在 WGS84 下的近似量算（小范围切平面，适用于港区尺度）。
 */

export type LonLat = { longitude: number; latitude: number }

const DEG = Math.PI / 180

/** 多边形在局部切平面上的投影面积（m²），闭合环首尾可重复 */
export function polygonLonLatAreaSqM(ring: LonLat[]): number {
  const n = ring.length
  if (n < 3) return 0
  let sumLon = 0
  let sumLat = 0
  for (const p of ring) {
    sumLon += p.longitude
    sumLat += p.latitude
  }
  const cLon = sumLon / n
  const cLat = sumLat / n
  const cosLat = Math.cos(cLat * DEG)
  const xs: number[] = []
  const ys: number[] = []
  for (const p of ring) {
    xs.push((p.longitude - cLon) * 111_320 * cosLat)
    ys.push((p.latitude - cLat) * 110_540)
  }
  let a = 0
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n
    a += xs[i]! * ys[j]! - xs[j]! * ys[i]!
  }
  return Math.abs(a) / 2
}

/** 切平面轴对齐外包矩形（米） */
export function polygonLonLatBBoxMeters(ring: LonLat[]): {
  widthM: number
  heightM: number
  centroid: LonLat
} {
  const n = ring.length
  if (n === 0) {
    return { widthM: 0, heightM: 0, centroid: { longitude: 0, latitude: 0 } }
  }
  let sumLon = 0
  let sumLat = 0
  for (const p of ring) {
    sumLon += p.longitude
    sumLat += p.latitude
  }
  const cLon = sumLon / n
  const cLat = sumLat / n
  const cosLat = Math.cos(cLat * DEG)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of ring) {
    const x = (p.longitude - cLon) * 111_320 * cosLat
    const y = (p.latitude - cLat) * 110_540
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return {
    widthM: Math.max(0, maxX - minX),
    heightM: Math.max(0, maxY - minY),
    centroid: { longitude: cLon, latitude: cLat },
  }
}

/**
 * 由面积与规划 TEU 粗算「贝×列」示意网格（非 TOS 真实贝位），仅用于孪生大屏排布。
 * 参考：干箱区常见净距与通道后，粗取 ~32–40 m²/TEU 作展示级槽位密度上限。
 */
export function suggestBayRowGrid(areaSqM: number, capacityTeu: number): {
  bays: number
  rows: number
  teuPerCellHint: string
} {
  const cap = Math.max(1, capacityTeu)
  const area = Math.max(1, areaSqM)
  const m2PerTeuTarget = Math.max(28, Math.min(48, area / cap))
  /** 孪生大屏单屏可承载的示意槽位上限（非 TOS 全量贝位） */
  const estSlotsRaw = Math.max(12, Math.round(cap / 1.8))
  const estSlots = Math.min(192, estSlotsRaw)
  const aspect = 1.35
  const rows = Math.max(4, Math.round(Math.sqrt(estSlots / aspect)))
  const bays = Math.max(6, Math.round(estSlots / rows))
  const capped = estSlotsRaw > estSlots
  return {
    bays,
    rows,
    teuPerCellHint: capped
      ? `展示槽位约 ${m2PerTeuTarget.toFixed(0)} m²/TEU；示意网格抽样至 ${bays * rows} 槽（全量贝位由 TOS 对接）`
      : `展示槽位约 ${m2PerTeuTarget.toFixed(0)} m²/TEU（示意）`,
  }
}
