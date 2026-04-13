import { BerthingPanel } from './panels/BerthingPanel'
import { DeparturePanel } from './panels/DeparturePanel'
import { FreightExceptionsPanel } from './panels/FreightExceptionsPanel'
import { HandlingPanel } from './panels/HandlingPanel'
import { ReviewPanel } from './panels/ReviewPanel'
import { VehiclePanel } from './panels/VehiclePanel'
import { YardPanel } from './panels/YardPanel'

type Props = { activeNav: string }

export function FreightDispatcherWorkspace(props: Props) {
  switch (props.activeNav) {
    case '船舶靠泊调度':
      return <BerthingPanel />
    case '货物装卸调度':
      return <HandlingPanel />
    case '堆场管理调度':
      return <YardPanel />
    case '车辆转运调度':
      return <VehiclePanel />
    case '业务异常处理':
      return <FreightExceptionsPanel />
    case '船舶离泊调度':
      return <DeparturePanel />
    case '业务复盘':
      return <ReviewPanel />
    default:
      return (
        <div className="director-page">
          <p className="director-muted">未识别的导航：{props.activeNav}</p>
        </div>
      )
  }
}
