import { useEffect } from 'react'
import { fetchAlerts, fetchStats } from '../../api/client'
import { useScreenStore } from '../../store/screenStore'
import { OverviewDrawerSection } from '../layout/OverviewDrawerSection'

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
  const stats = useScreenStore((s) => s.stats)
  const ships = useScreenStore((s) => s.ships)
  const alerts = useScreenStore((s) => s.alerts)
  const wsConnected = useScreenStore((s) => s.wsConnected)

  return (
    <>
      <h2>运行指标</h2>
      {stats ? (
        <ul className="stats-list">
          <li>
            <span>在港船舶（示意）</span>
            <strong>{stats.shipsInPort}</strong>
          </li>
          <li>
            <span>吞吐量 TEU（示意）</span>
            <strong>{stats.throughputTeu.toLocaleString()}</strong>
          </li>
          <li>
            <span>泊位利用率</span>
            <strong>{(stats.berthUtilization * 100).toFixed(0)}%</strong>
          </li>
        </ul>
      ) : (
        <p className="muted">加载中…</p>
      )}
      <div className={`ws-pill ${wsConnected ? 'on' : 'off'}`}>
        实时通道 {wsConnected ? '已连接' : '未连接'}
      </div>
      <h2>船舶列表</h2>
      <ul className="ship-mini-list">
        {ships.map((s) => (
          <li key={s.mmsi}>
            <span className={`dot status-${s.status}`} />
            {s.name}
            <small>
              {(s.vesselType ?? 'container') === 'bulk'
                ? '散货'
                : (s.vesselType ?? 'container') === 'tanker'
                  ? '油轮'
                  : '集装'}{' '}
              · {s.status}
            </small>
          </li>
        ))}
      </ul>
      <h2>预警（演示）</h2>
      <ul className="alert-list">
        {alerts.map((a) => (
          <li key={a.id} className={`alert-${a.level}`}>
            {a.message}
          </li>
        ))}
      </ul>
    </>
  )
}

/** 全景页侧栏下部：运行指标 / 船舶 / 预警 亦为可折叠抽屉 */
export function RightSidebarMetricsDrawers() {
  const stats = useScreenStore((s) => s.stats)
  const ships = useScreenStore((s) => s.ships)
  const alerts = useScreenStore((s) => s.alerts)
  const wsConnected = useScreenStore((s) => s.wsConnected)
  const pageKey = 'overview_rail_metrics'

  return (
    <>
      <OverviewDrawerSection pageKey={pageKey} id="running-kpi" title="运行指标" defaultOpen>
        {stats ? (
          <ul className="stats-list">
            <li>
              <span>在港船舶（示意）</span>
              <strong>{stats.shipsInPort}</strong>
            </li>
            <li>
              <span>吞吐量 TEU（示意）</span>
              <strong>{stats.throughputTeu.toLocaleString()}</strong>
            </li>
            <li>
              <span>泊位利用率</span>
              <strong>{(stats.berthUtilization * 100).toFixed(0)}%</strong>
            </li>
          </ul>
        ) : (
          <p className="muted">加载中…</p>
        )}
        <div className={`ws-pill ${wsConnected ? 'on' : 'off'}`}>
          实时通道 {wsConnected ? '已连接' : '未连接'}
        </div>
      </OverviewDrawerSection>

      <OverviewDrawerSection pageKey={pageKey} id="ships" title="船舶列表" defaultOpen>
        <ul className="ship-mini-list">
          {ships.map((s) => (
            <li key={s.mmsi}>
              <span className={`dot status-${s.status}`} />
              {s.name}
              <small>
                {(s.vesselType ?? 'container') === 'bulk'
                  ? '散货'
                  : (s.vesselType ?? 'container') === 'tanker'
                    ? '油轮'
                    : '集装'}{' '}
                · {s.status}
              </small>
            </li>
          ))}
        </ul>
      </OverviewDrawerSection>

      <OverviewDrawerSection pageKey={pageKey} id="alerts" title="预警（演示）" defaultOpen={false}>
        <ul className="alert-list">
          {alerts.map((a) => (
            <li key={a.id} className={`alert-${a.level}`}>
              {a.message}
            </li>
          ))}
        </ul>
      </OverviewDrawerSection>
    </>
  )
}

export function RightPanel() {
  useRightSidebarData()

  return (
    <aside className="panel panel-right">
      <RightSidebarPanelBody />
    </aside>
  )
}
