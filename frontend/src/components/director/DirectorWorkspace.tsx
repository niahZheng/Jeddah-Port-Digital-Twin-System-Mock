import { DecisionsPanel } from './panels/DecisionsPanel'
import { ExceptionsPanel } from './panels/ExceptionsPanel'
import { FreightPanel } from './panels/FreightPanel'
import { PassengerPanel } from './panels/PassengerPanel'
import { ResourcesPanel } from './panels/ResourcesPanel'
import { SummaryPanel } from './panels/SummaryPanel'

type Props = { activeNav: string }

export function DirectorWorkspace(props: Props) {
  switch (props.activeNav) {
    case '货运':
      return <FreightPanel />
    case '客运':
      return <PassengerPanel />
    case '资源统筹':
      return <ResourcesPanel />
    case '异常响应':
      return <ExceptionsPanel />
    case '业务决策':
      return <DecisionsPanel />
    case '业务总结':
      return <SummaryPanel />
    default:
      return (
        <div className="director-page">
          <p className="director-muted">未识别的导航：{props.activeNav}</p>
        </div>
      )
  }
}
