/**
 * 大圆初始方位角（度），顺时针从正北 0–360。
 * 泊位附近距离短，与椭球高精度算法差异可忽略。
 */
export function initialBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  let θ = (Math.atan2(y, x) * 180) / Math.PI
  θ = (θ + 360) % 360
  return θ
}
