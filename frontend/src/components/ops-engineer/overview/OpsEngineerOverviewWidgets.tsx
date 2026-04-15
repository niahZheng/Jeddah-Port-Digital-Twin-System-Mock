import { useRef } from 'react'
import { DraggableWidget } from '../../director/overview/DraggableWidget'

const planRows = [
  '货运设备：岸桥 12 台、场桥 18 台、转运车辆 96 台（重点巡检液压与制动）',
  '客运设备：检票闸机 36 台、电梯 22 台、广播设备 14 套（重点巡检高峰时段设备）',
  '公用设备：航道照明 48 组、消防设施 83 点位（重点排查夜航保障回路）',
]

const focusRows = [
  '维护保养计划：今日计划保养 27 台设备，已排程 3 个班组',
  '历史故障记录：近 24 小时核心设备故障 3 起，均已恢复',
  '运维重点：优先保障岸桥与检票闸机，缩短平均故障恢复时长',
]

export function OpsEngineerOverviewWidgets() {
  const layerRef = useRef<HTMLDivElement>(null)
  return (
    <div className="overview-widgets-layer" ref={layerRef}>
      <DraggableWidget
        id="oe-home-plan"
        title="当日设备运维计划"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={16}
        width={560}
      >
        <ul className="overview-widget-digest">
          {planRows.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </DraggableWidget>
      <DraggableWidget
        id="oe-home-focus"
        title="维护与故障重点"
        containerRef={layerRef}
        defaultLeft={592}
        defaultTop={16}
        width={560}
      >
        <ul className="overview-widget-digest">
          {focusRows.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </DraggableWidget>
    </div>
  )
}
