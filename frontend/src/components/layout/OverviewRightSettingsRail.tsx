import { useEffect, useState, type ReactNode } from 'react'
import { RightSidebarMetricsDrawers, useRightSidebarData } from '../widgets/StatsPanel'

const STORAGE_KEY = 'jeddah-port.overview-right-rail-open'

export type OverviewRightSettingsRailProps = {
  /** 角色全景业务模块：侧栏上部抽屉区 */
  overviewDrawers?: ReactNode
}

/** 可隐藏右侧栏：上部为业务抽屉（折叠/展开） */
export function OverviewRightSettingsRail({ overviewDrawers }: OverviewRightSettingsRailProps) {
  useRightSidebarData()
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [open])

  return (
    <div className={`overview-right-rail-wrap${open ? '' : ' overview-right-rail-wrap--collapsed'}`}>
      <button
        type="button"
        className="overview-right-rail-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={open ? '收起侧栏' : '展开侧栏'}
      >
        {open ? '›' : '‹'}
      </button>
      {open ? (
        <aside className="panel panel-right overview-right-rail" aria-label="业务面板与运行指标">
          {overviewDrawers ? (
            <div className="overview-rail-drawers">{overviewDrawers}</div>
          ) : null}
          <RightSidebarMetricsDrawers />
        </aside>
      ) : null}
    </div>
  )
}
