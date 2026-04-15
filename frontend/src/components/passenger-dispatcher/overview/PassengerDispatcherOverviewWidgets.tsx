import { useRef } from 'react'
import { DraggableWidget } from '../../director/overview/DraggableWidget'

const planDigest = [
  '客轮到发重点：13:40 吉达-亚喀巴、17:20 吉达-塞法杰',
  '客流高峰：13:00-15:00（候车区 B）',
  '检票口策略：A 区双口并行，B 区弹性开口',
]

const serviceDigest = [
  '旅客售票情况：累计 9,840 张，热门航线售票率 95%',
  '客运服务排班：34 人在岗，重点区增援 6 人',
  '需关注：B2 泊位登船高峰，建议分批广播引导',
]

export function PassengerDispatcherOverviewWidgets() {
  const layerRef = useRef<HTMLDivElement>(null)
  return (
    <div className="overview-widgets-layer" ref={layerRef}>
      <DraggableWidget
        id="pd-home-plan"
        title="当日客运业务计划"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={16}
        width={520}
      >
        <ul className="overview-widget-digest">
          {planDigest.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </DraggableWidget>

      <DraggableWidget
        id="pd-home-service"
        title="客运服务与保障"
        containerRef={layerRef}
        defaultLeft={552}
        defaultTop={16}
        width={520}
      >
        <ul className="overview-widget-digest">
          {serviceDigest.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </DraggableWidget>
    </div>
  )
}
