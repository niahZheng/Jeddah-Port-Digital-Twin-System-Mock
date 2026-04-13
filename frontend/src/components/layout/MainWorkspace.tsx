import { DirectorOverviewWidgets } from '../director/overview/DirectorOverviewWidgets'
import { DirectorWorkspace } from '../director/DirectorWorkspace'
import { CesiumViewport } from '../cesium/CesiumViewport'
import { BottomConsole } from './BottomConsole'
import { LeftPanel, RightPanel } from '../widgets/StatsPanel'

type Props = {
  activeNav: string
  /** 该角色下展示数字孪生主视图的导航项（每组的第一项） */
  twinHomeLabel: string
  /** 登录用户角色 key，如 port_director */
  roleKey: string
}

const PORT_DIRECTOR = 'port_director'

export function MainWorkspace(props: Props) {
  const { activeNav, twinHomeLabel, roleKey } = props

  if (roleKey === PORT_DIRECTOR) {
    const isDirectorHome = activeNav === twinHomeLabel
    if (isDirectorHome) {
      return (
        <div className="screen-body">
          <div className="screen-main screen-main--map-only">
            <div className="stage stage--floating-widgets">
              <CesiumViewport />
              <DirectorOverviewWidgets />
            </div>
          </div>
          <BottomConsole />
        </div>
      )
    }
    return (
      <div className="screen-body screen-body--director">
        <DirectorWorkspace activeNav={activeNav} />
      </div>
    )
  }

  const isTwinHome = activeNav === twinHomeLabel

  if (isTwinHome) {
    return (
      <div className="screen-body">
        <div className="screen-main">
          <LeftPanel />
          <div className="stage">
            <CesiumViewport />
          </div>
          <RightPanel />
        </div>
        <BottomConsole />
      </div>
    )
  }

  return (
    <div className="screen-body">
      <div className="screen-page">
        <div className="screen-page-inner">
          <h2 className="screen-page-title">{activeNav}</h2>
          <p className="screen-page-desc">该业务模块页面建设中（演示环境）</p>
        </div>
      </div>
    </div>
  )
}
