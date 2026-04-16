import { useRef } from 'react'
import { KpiCard } from '../DirectorPrimitives'
import { DraggableWidget } from './DraggableWidget'
import { useDirectorOverviewData } from './useDirectorOverviewData'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function DirectorOverviewWidgets() {
  const layerRef = useRef<HTMLDivElement>(null)
  const pageKey = 'director_home'
  const {
    data,
    live,
    wsOn,
    err,
    cargo,
    pax,
    planRate,
    ex,
    trend,
    maxCargo,
    maxPax,
  } = useDirectorOverviewData()

  if (err) {
    return (
      <div className="overview-widgets-layer" ref={layerRef}>
        <DraggableWidget
          pageKey={pageKey}
          id="overview-error"
          title="数据提示"
          containerRef={layerRef}
          defaultLeft={16}
          defaultTop={16}
          width={360}
        >
          <p className="overview-widget__muted">{err}</p>
        </DraggableWidget>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="overview-widgets-layer" ref={layerRef}>
        <DraggableWidget
          pageKey={pageKey}
          id="overview-loading"
          title="港口业务全景"
          containerRef={layerRef}
          defaultLeft={16}
          defaultTop={16}
          width={280}
        >
          <p className="overview-widget__muted">加载中…</p>
        </DraggableWidget>
      </div>
    )
  }

  const wsPill = (
    <span className={`overview-widget__ws ${wsOn ? 'on' : 'off'}`} title="KPI 推送通道">
      {wsOn ? 'WS' : '离线'}
    </span>
  )

  const metaNote = (
    <span className="overview-widget__meta" title="最近数据时间">
      {formatTime(live?.updatedAt ?? data.updatedAt)}
    </span>
  )

  return (
    <div className="overview-widgets-layer" ref={layerRef}>
      <DraggableWidget
        pageKey={pageKey}
        id="kpi"
        title="核心 KPI"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={16}
        width={380}
        aside={
          <>
            {wsPill}
            {metaNote}
          </>
        }
      >
        <div className="overview-widget-kpi-grid">
          <KpiCard
            label="货运吞吐量（TEU）"
            value={cargo != null ? cargo.toLocaleString() : '—'}
            hint={`计划 ${data.kpis.cargoThroughputPlanTeu.toLocaleString()}`}
          />
          <KpiCard
            label="客运发送量（人）"
            value={pax != null ? pax.toLocaleString() : '—'}
            hint={`计划 ${data.kpis.passengerPlan.toLocaleString()}`}
          />
          <KpiCard
            label="计划完成率"
            value={planRate != null ? `${(planRate * 100).toFixed(1)}%` : '—'}
            hint="到离港闭环"
          />
          <KpiCard
            label="核心异常（件）"
            value={ex != null ? String(ex) : '—'}
            hint="A/B 级待办"
          />
        </div>
        <p className="overview-widget__foot">数据日期 {data.date}</p>
      </DraggableWidget>

      <DraggableWidget
        pageKey={pageKey}
        id="digest"
        title="船舶到离港摘要"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={280}
        width={300}
      >
        <ul className="overview-widget-digest">
          <li>
            今日到港 <strong>{data.shipPlanDigest.arrivedToday}</strong> 艘次
          </li>
          <li>
            今日离港 <strong>{data.shipPlanDigest.departedToday}</strong> 艘次
          </li>
          <li>
            延误 <strong>{data.shipPlanDigest.delayedShips}</strong> 艘
          </li>
          <li>
            准点率 <strong>{(data.shipPlanDigest.onTimeRate * 100).toFixed(0)}%</strong>
          </li>
        </ul>
      </DraggableWidget>

      <DraggableWidget
        pageKey={pageKey}
        id="trend"
        title="分时趋势（示意）"
        containerRef={layerRef}
        defaultLeft={420}
        defaultTop={16}
        width={400}
        aside={<span className="overview-widget__meta">REST 基线</span>}
      >
        {trend ? (
          <div className="overview-widget-trend">
            <div className="overview-widget-trend-block">
              <h4>货运 TEU</h4>
              <div className="overview-widget-bars">
                {trend.labels.map((lb, i) => (
                  <div key={lb} className="overview-widget-bar-wrap">
                    <div
                      className="overview-widget-bar overview-widget-bar--cargo"
                      style={{ height: `${(trend.cargoTeu[i]! / maxCargo) * 100}%` }}
                      title={`${lb}时 ${trend.cargoTeu[i]}`}
                    />
                    <span>{lb}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="overview-widget-trend-block">
              <h4>客运发送</h4>
              <div className="overview-widget-bars">
                {trend.labels.map((lb, i) => (
                  <div key={`p-${lb}`} className="overview-widget-bar-wrap">
                    <div
                      className="overview-widget-bar overview-widget-bar--pax"
                      style={{ height: `${(trend.passenger[i]! / maxPax) * 100}%` }}
                      title={`${lb}时 ${trend.passenger[i]}`}
                    />
                    <span>{lb}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DraggableWidget>

      <DraggableWidget
        pageKey={pageKey}
        id="alerts"
        title="预警速览"
        containerRef={layerRef}
        defaultLeft={420}
        defaultTop={300}
        width={360}
      >
        <ul className="overview-widget-alerts">
          {data.topAlertsPreview.map((a) => (
            <li key={a.id} className={`level-${a.level}`}>
              <span className="overview-widget-tag">{a.id}</span>
              {a.title}
            </li>
          ))}
        </ul>
      </DraggableWidget>
    </div>
  )
}
