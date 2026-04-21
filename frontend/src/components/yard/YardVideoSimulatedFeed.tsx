import { useMemo } from 'react'

type SlotKind = 'empty' | 'dry' | 'reef' | 'haz'

const BAYS = 12
const ROWS = 8

function buildGrid(occupiedTeu: number, capacityTeu: number): SlotKind[][] {
  const total = Math.max(1, BAYS * ROWS)
  const cap = Math.max(1, capacityTeu)
  const ratio = Math.min(1, Math.max(0, occupiedTeu / cap))
  const filled = Math.round(ratio * total)
  const grid: SlotKind[][] = []
  let k = 0
  for (let r = 0; r < ROWS; r += 1) {
    const row: SlotKind[] = []
    for (let b = 0; b < BAYS; b += 1) {
      if (k >= filled) row.push('empty')
      else {
        const h = (b + r * 7) % 11
        if (h === 0) row.push('reef')
        else if (h === 1) row.push('haz')
        else row.push('dry')
        k += 1
      }
    }
    grid.push(row)
  }
  return grid
}

function MiniContainer({ kind }: { kind: Exclude<SlotKind, 'empty'> }) {
  const mod =
    kind === 'reef' ? 'yard-video-sim-ctr--reef' : kind === 'haz' ? 'yard-video-sim-ctr--haz' : ''
  return (
    <div className={`yard-video-sim-ctr ${mod}`}>
      <span className="yard-video-sim-ctr__top" />
      <span className="yard-video-sim-ctr__side" />
      <span className="yard-video-sim-ctr__door" />
    </div>
  )
}

type Props = {
  zoneCode: string
  occupiedTeu: number
  capacityTeu: number
}

/** 与地图 flyToYardPolygonOblique（约 38° 方位、-52° 俯仰）视觉一致的斜视箱区演示画面 */
export function YardVideoSimulatedFeed({ zoneCode, occupiedTeu, capacityTeu }: Props) {
  const grid = useMemo(
    () => buildGrid(occupiedTeu, capacityTeu > 0 ? capacityTeu : 9000),
    [occupiedTeu, capacityTeu],
  )

  return (
    <div className="yard-video-sim" aria-hidden>
      <div className="yard-video-sim__haze" />
      <div className="yard-video-sim__stage">
        <div className="yard-video-sim__world">
          <div className="yard-video-sim__label">{zoneCode} · 贝×列（演示）</div>
          <div className="yard-video-sim__pad">
            {grid.map((row, ri) => (
              <div key={ri} className="yard-video-sim__row">
                {row.map((kind, bi) => (
                  <div key={bi} className="yard-video-sim__cell">
                    {kind === 'empty' ? (
                      <div className="yard-video-sim__empty" />
                    ) : (
                      <div className="yard-video-sim__stack">
                        <MiniContainer kind={kind} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
