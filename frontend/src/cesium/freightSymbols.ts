import type { ShipData } from '../types/port'

/** 船舶实体上方两行文字标签 */
export function freightShipLabelLines(ship: ShipData): string {
  const vt = ship.vesselType ?? 'container'
  const typeZh = vt === 'container' ? '集装箱' : vt === 'bulk' ? '散货' : '油轮'
  const st =
    ship.status === 'underway' ? '在航' : ship.status === 'moored' ? '靠泊' : '锚泊'
  return `${ship.name}\n${typeZh} · ${st} · ${ship.speed.toFixed(1)} kn`
}
