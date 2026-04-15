import { OpsEngineerPanel } from './panels/OpsEngineerPanel'

type Props = { activeNav: string }

export function OpsEngineerWorkspace(props: Props) {
  switch (props.activeNav) {
    case '设备日常巡检':
      return <OpsEngineerPanel page="inspection" />
    case '故障响应处理':
      return <OpsEngineerPanel page="fault" />
    case '设备维护保养':
      return <OpsEngineerPanel page="maintenance" />
    case '业务协同配合':
      return <OpsEngineerPanel page="collaboration" />
    case '设备状态更新':
      return <OpsEngineerPanel page="status" />
    case '运维复盘':
      return <OpsEngineerPanel page="review" />
    default:
      return (
        <div className="director-page">
          <p className="director-muted">未识别的导航：{props.activeNav}</p>
        </div>
      )
  }
}
