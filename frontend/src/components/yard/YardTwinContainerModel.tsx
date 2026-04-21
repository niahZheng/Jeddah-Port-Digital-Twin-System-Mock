import type { SlotKind } from './yardTwinTypes'

type Props = {
  kind: SlotKind
}

/**
 * ISO 风格集装箱示意（箱门端 + 长侧波纹 + 顶面），纯 CSS 3D。
 * 非毫米级精模；生产可换 glTF / Cesium Model。
 */
export function YardTwinContainerModel({ kind }: Props) {
  if (kind === 'empty') return null

  const tiers = kind === 'dry40' ? 2 : 1
  const scaleClass = kind === 'dry40' ? 'yt-ctr-stack--long40' : ''

  return (
    <div className={`yt-ctr-stack ${scaleClass}`.trim()}>
      {Array.from({ length: tiers }, (_, tier) => (
        <div key={tier} className={`yt-ctr yt-ctr--${kind}`} data-tier={tier}>
          <div className="yt-ctr__pivot">
            <div className="yt-ctr__shadow" aria-hidden />
            <div className="yt-ctr__face yt-ctr__face--top" aria-hidden />
            <div className="yt-ctr__face yt-ctr__face--side" aria-hidden>
              <span className="yt-ctr__corrug" />
            </div>
            <div className="yt-ctr__face yt-ctr__face--door" aria-hidden>
              <span className="yt-ctr__door yt-ctr__door--l" />
              <span className="yt-ctr__door yt-ctr__door--r" />
              <span className="yt-ctr__lockbar" />
              {kind === 'hazard' ? <span className="yt-ctr__hazard-mark" /> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
