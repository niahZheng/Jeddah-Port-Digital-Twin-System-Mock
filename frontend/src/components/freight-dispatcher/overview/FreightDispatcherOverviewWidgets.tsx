import { useRef } from 'react'
import { DraggableWidget } from '../../director/overview/DraggableWidget'
import { useFreightDispatcherOverviewData } from './useFreightDispatcherOverviewData'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function formatWeight(t: number) {
  if (t <= 0) return '—'
  if (t >= 1000) return `${(t / 1000).toFixed(1)}k t`
  return `${t} t`
}

export function FreightDispatcherOverviewWidgets() {
  const layerRef = useRef<HTMLDivElement>(null)
  const { data, err } = useFreightDispatcherOverviewData()

  if (err) {
    return (
      <div className="overview-widgets-layer" ref={layerRef}>
        <DraggableWidget
          id="fd-overview-error"
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
          id="fd-overview-loading"
          title="货运业务准备"
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

  const meta = (
    <span className="overview-widget__meta" title="计划数据时间">
      {data.date} · {formatTime(data.updatedAt)}
    </span>
  )

  const ships = data.shipMovePlan ?? []
  const manifest = data.cargoManifest ?? []
  const yardPlan = data.yardAllocationPlan ?? []
  const vehiclePlan = data.vehicleTransferPlan ?? []
  const goals = data.dailyGoals ?? { objectives: [], targets: [] }

  return (
    <div className="overview-widgets-layer" ref={layerRef}>
      <DraggableWidget
        id="fd-ship-plan"
        title="船舶到港 / 离港计划"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={16}
        width={540}
        aside={
          <>
            {meta}
            <span className="overview-widget__meta"> 航次 · ETA/ETD · 泊位</span>
          </>
        }
      >
        <div className="fd-prep-scroll">
          <table className="fd-prep-table">
            <thead>
              <tr>
                <th>船名</th>
                <th>航次</th>
                <th>类型</th>
                <th>到港</th>
                <th>离港</th>
                <th>泊位</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {ships.map((row) => (
                <tr key={`${row.vessel}-${row.voyage}`}>
                  <td>{row.vessel}</td>
                  <td>{row.voyage}</td>
                  <td>{row.type}</td>
                  <td>{row.eta}</td>
                  <td>{row.etd}</td>
                  <td>{row.berth}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DraggableWidget>

      <DraggableWidget
        id="fd-manifest"
        title="货物运输清单"
        containerRef={layerRef}
        defaultLeft={580}
        defaultTop={16}
        width={560}
        aside={<span className="overview-widget__meta">品名 · 重量 · 目的港 · 货主</span>}
      >
        <div className="fd-prep-scroll">
          <table className="fd-prep-table">
            <thead>
              <tr>
                <th>品名</th>
                <th>重量</th>
                <th>计量</th>
                <th>目的地</th>
                <th>货主</th>
                <th>船名</th>
                <th>提单号</th>
              </tr>
            </thead>
            <tbody>
              {manifest.map((row) => (
                <tr key={row.blNo}>
                  <td>{row.cargoName}</td>
                  <td>{formatWeight(row.weightT)}</td>
                  <td>{row.unit}</td>
                  <td>{row.destination}</td>
                  <td>{row.shipper}</td>
                  <td>{row.vessel}</td>
                  <td className="director-cell-nowrap">{row.blNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DraggableWidget>

      <DraggableWidget
        id="fd-yard-plan"
        title="堆场分配计划"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={280}
        width={540}
      >
        <div className="fd-prep-scroll">
          <table className="fd-prep-table">
            <thead>
              <tr>
                <th>箱区</th>
                <th>用途 / 策略</th>
                <th>计划箱量(TEU)</th>
                <th>优先级</th>
                <th>关联船/批次</th>
              </tr>
            </thead>
            <tbody>
              {yardPlan.map((row) => (
                <tr key={row.block}>
                  <td>{row.block}</td>
                  <td>{row.purpose}</td>
                  <td>{row.teuPlanned}</td>
                  <td>{row.priority}</td>
                  <td>{row.linkVessel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DraggableWidget>

      <DraggableWidget
        id="fd-vehicle-plan"
        title="车辆转运计划"
        containerRef={layerRef}
        defaultLeft={580}
        defaultTop={280}
        width={560}
      >
        <div className="fd-prep-scroll">
          <table className="fd-prep-table">
            <thead>
              <tr>
                <th>任务 / 线路</th>
                <th>时间窗</th>
                <th>计划车次</th>
                <th>配车</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {vehiclePlan.map((row) => (
                <tr key={row.task}>
                  <td>{row.task}</td>
                  <td>{row.window}</td>
                  <td>{row.tripsPlanned}</td>
                  <td>{row.trucksAssigned}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DraggableWidget>

      <DraggableWidget
        id="fd-goals"
        title="当日业务重点与目标"
        containerRef={layerRef}
        defaultLeft={16}
        defaultTop={520}
        width={1124}
      >
        <div className="overview-widget-digest-group">
          <h4 className="overview-widget-digest-h">调度重点</h4>
          <ul className="overview-widget-digest">
            {goals.objectives.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <h4 className="overview-widget-digest-h">量化目标</h4>
        <dl className="fd-goals-targets">
          {goals.targets.map((t) => (
            <div key={t.label}>
              <dt>{t.label}</dt>
              <dd>{t.value}</dd>
            </div>
          ))}
        </dl>
        <div className="overview-widget-digest-group">
          <h4 className="overview-widget-digest-h">作业窗口与货流（备忘）</h4>
          <ul className="overview-widget-digest">
            {data.planDigest.peakWindows.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="overview-widget-digest-group">
          <h4 className="overview-widget-digest-h">热门航线</h4>
          <ul className="overview-widget-digest">
            {data.planDigest.hotTradeLanes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </DraggableWidget>
    </div>
  )
}
