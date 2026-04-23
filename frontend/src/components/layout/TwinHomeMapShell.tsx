import { useState, type ReactNode } from 'react'

/** 与嵌入视角一致的整站链接（新标签页） */
export const MARINETRAFFIC_AIS_JEDDAH =
  'https://www.marinetraffic.com/en/ais/home/centerx:39.173/centery:21.472/zoom:15'

/** 与 public/marinetraffic-ais-embed.html 同路径；Vite 开发/构建均从站点根提供 */
const EMBED_PAGE_PATH = '/marinetraffic-ais-embed.html'

type MapMode = 'twin' | 'marinetraffic'

type Props = {
  children: ReactNode
}

export function TwinHomeMapShell(props: Props) {
  const { children } = props
  const [mode, setMode] = useState<MapMode>('twin')
  const showMt = mode === 'marinetraffic'

  return (
    <div className="twin-home-map-shell">
      <div
        className="twin-home-map-toggle"
        role="group"
        aria-label="主地图：数字孪生与船讯 AIS 切换"
        title="位于首页主地图区域左上角，可在「数字孪生」与「船讯 AIS」之间切换"
      >
        <span className="twin-home-map-hint" aria-hidden>
          主地图
        </span>
        <button
          type="button"
          className={mode === 'twin' ? 'twin-home-map-toggle__btn is-active' : 'twin-home-map-toggle__btn'}
          onClick={() => setMode('twin')}
        >
          数字孪生
        </button>
        <button
          type="button"
          className={
            showMt ? 'twin-home-map-toggle__btn is-active' : 'twin-home-map-toggle__btn'
          }
          onClick={() => setMode('marinetraffic')}
        >
          船讯 AIS
        </button>
        {showMt ? (
          <a
            className="twin-home-map-open-tab"
            href={MARINETRAFFIC_AIS_JEDDAH}
            target="_blank"
            rel="noreferrer"
          >
            官网新窗口
          </a>
        ) : null}
      </div>
      <div
        className={showMt ? 'twin-home-twin-layer twin-home-twin-layer--obscured' : 'twin-home-twin-layer'}
        aria-hidden={showMt}
      >
        {children}
      </div>
      {showMt ? (
        <div className="twin-home-mt-wrap" role="region" aria-label="MarineTraffic 嵌入地图">
          <iframe
            className="twin-home-mt-iframe"
            title="船讯网 MarineTraffic AIS 嵌入"
            src={EMBED_PAGE_PATH}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
    </div>
  )
}
