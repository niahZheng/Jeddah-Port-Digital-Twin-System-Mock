import { useEffect } from 'react'
import { fetchAlerts, fetchStats } from '../../api/client'
import { useScreenStore } from '../../store/screenStore'

/** 保留左侧栏占位；地形与 3D 图层已迁至底部控制台「配置项」。 */
export function LeftPanel() {
  return <aside className="panel panel-left panel-left--empty" aria-label="侧栏" />
}

/** 供右侧栏 / 全景页右轨共用：拉取 stats、alerts（与地图页 store 一致） */
export function useRightSidebarData() {
  const setAlerts = useScreenStore((s) => s.setAlerts)
  const setStats = useScreenStore((s) => s.setStats)

  useEffect(() => {
    void fetchStats()
      .then(setStats)
      .catch(() => {})
    void fetchAlerts()
      .then(setAlerts)
      .catch(() => {})
  }, [setAlerts, setStats])
}

/** 右侧栏正文（无外层 aside，便于嵌入可折叠轨道） */
export function RightSidebarPanelBody() {
  return null
}

/** 全景页侧栏下部：运行指标 / 船舶 / 预警 亦为可折叠抽屉 */
export function RightSidebarMetricsDrawers() {
  return null
}

export function RightPanel() {
  useRightSidebarData()

  return (
    <aside className="panel panel-right">
      <RightSidebarPanelBody />
    </aside>
  )
}
