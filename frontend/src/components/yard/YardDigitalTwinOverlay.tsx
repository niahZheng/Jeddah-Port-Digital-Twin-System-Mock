import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBasemapStore } from '../../store/basemapStore'
import { useSimulationStore } from '../../store/simulationStore'
import { selectTwinZoneCode, useYardPanelStore } from '../../store/yardPanelStore'
import { useEffectiveYardZones } from '../../hooks/useEffectiveYardZones'
import {
  SIM_BERTH_LABEL_SHORT,
  SIM_CY01_CAPACITY_TEU,
  simCy01Phase,
  simCy01PhaseLabelZh,
} from '../../cesium/simulationYard'
import {
  polygonLonLatAreaSqM,
  polygonLonLatBBoxMeters,
  suggestBayRowGrid,
} from '../../cesium/yardGeometry'
import { YardTwinContainerModel } from './YardTwinContainerModel'
import type { SlotKind } from './yardTwinTypes'

function buildSlotKinds(
  bays: number,
  rows: number,
  occupiedTeu: number,
  capacityTeu: number,
): SlotKind[][] {
  const total = Math.max(1, bays * rows)
  const ratio = capacityTeu > 0 ? Math.min(1, occupiedTeu / capacityTeu) : 0
  const filled = Math.round(ratio * total)
  const grid: SlotKind[][] = []
  let k = 0
  for (let r = 0; r < rows; r += 1) {
    const row: SlotKind[] = []
    for (let b = 0; b < bays; b += 1) {
      if (k >= filled) {
        row.push('empty')
      } else {
        const h = (b + r * 7) % 11
        if (h === 0) row.push('reefer')
        else if (h === 1) row.push('hazard')
        else if (h % 3 === 0) row.push('dry40')
        else row.push('dry20')
        k += 1
      }
    }
    grid.push(row)
  }
  return grid
}

function filledSlotCount(bays: number, rows: number, occupiedTeu: number, capacityTeu: number): number {
  const total = Math.max(1, bays * rows)
  const ratio = capacityTeu > 0 ? Math.min(1, occupiedTeu / capacityTeu) : 0
  return Math.round(ratio * total)
}

export function YardDigitalTwinOverlay() {
  const activeZoneCode = useYardPanelStore(selectTwinZoneCode)
  const close = useYardPanelStore((s) => s.close)
  const openVideo = useYardPanelStore((s) => s.openVideo)
  const basemapEntities = useBasemapStore((s) => s.entities)
  const zones = useEffectiveYardZones()
  const simEnabled = useSimulationStore((s) => s.enabled)
  const simProgress = useSimulationStore((s) => s.progress)

  const [ghostKinds, setGhostKinds] = useState<Map<string, SlotKind>>(() => new Map())
  const prevSlotGridRef = useRef<SlotKind[][] | null>(null)
  const prevFilledRef = useRef(0)
  const lastTwinZoneRef = useRef<string | null>(null)

  const zoneEntity = useMemo(() => {
    if (!activeZoneCode) return null
    return (
      basemapEntities.find(
        (e) =>
          e.kind === 'zone' &&
          (e.zoneCode ?? '').trim().toUpperCase() === activeZoneCode &&
          e.zonePoints &&
          e.zonePoints.length >= 3,
      ) ?? null
    )
  }, [activeZoneCode, basemapEntities])

  const zoneStat = useMemo(() => {
    if (!activeZoneCode) return null
    return zones?.find((z) => z.zoneCode.trim().toUpperCase() === activeZoneCode) ?? null
  }, [activeZoneCode, zones])

  const metrics = useMemo(() => {
    const pts = zoneEntity?.zonePoints
    if (!pts || pts.length < 3) {
      return {
        areaSqM: 0,
        widthM: 0,
        heightM: 0,
        bays: 12,
        rows: 8,
        teuPerCellHint: '—',
      }
    }
    const ring = pts.map((p) => ({ longitude: p.longitude, latitude: p.latitude }))
    const areaSqM = polygonLonLatAreaSqM(ring)
    const { widthM, heightM } = polygonLonLatBBoxMeters(ring)
    const cap = Math.max(1, zoneStat?.capacityTeu ?? 9000)
    const gridHint =
      areaSqM > 200
        ? suggestBayRowGrid(areaSqM, cap)
        : { bays: 12, rows: 8, teuPerCellHint: '底图多边形未就绪，使用默认示意网格' }
    const { bays, rows, teuPerCellHint } = gridHint
    return { areaSqM, widthM, heightM, bays, rows, teuPerCellHint }
  }, [zoneEntity, zoneStat?.capacityTeu])

  const occupied = zoneStat?.occupiedTeu ?? 0
  const capacity = Math.max(0, zoneStat?.capacityTeu ?? 0)
  /** 与气泡 TEU 利用率同一分母（规划能力为 0 时不强行铺满栅格） */
  const capacityForGrid = capacity > 0 ? capacity : 1

  const slotGrid = useMemo(
    () => buildSlotKinds(metrics.bays, metrics.rows, occupied, capacityForGrid),
    [metrics.bays, metrics.rows, occupied, capacityForGrid],
  )

  const filledSlots = useMemo(
    () => filledSlotCount(metrics.bays, metrics.rows, occupied, capacityForGrid),
    [metrics.bays, metrics.rows, occupied, capacityForGrid],
  )

  const isCy01Sim = Boolean(simEnabled && activeZoneCode === 'CY-01')

  useLayoutEffect(() => {
    if (!activeZoneCode) {
      lastTwinZoneRef.current = null
      return
    }
    if (lastTwinZoneRef.current !== activeZoneCode) {
      lastTwinZoneRef.current = activeZoneCode
      prevFilledRef.current = filledSlots
      prevSlotGridRef.current = slotGrid
      setGhostKinds(new Map())
    }
  }, [activeZoneCode, filledSlots, slotGrid])

  useEffect(() => {
    if (!isCy01Sim) {
      prevSlotGridRef.current = slotGrid
      return
    }
    const prev = prevSlotGridRef.current
    prevSlotGridRef.current = slotGrid
    if (!prev || prev.length !== slotGrid.length) return
    const newGhosts: [string, SlotKind][] = []
    for (let ri = 0; ri < slotGrid.length; ri += 1) {
      const prow = prev[ri]
      const nrow = slotGrid[ri]
      if (!prow || !nrow || prow.length !== nrow.length) continue
      for (let bi = 0; bi < nrow.length; bi += 1) {
        const was = prow[bi]!
        const now = nrow[bi]!
        if (was !== 'empty' && now === 'empty') {
          newGhosts.push([`${ri},${bi}`, was])
        }
      }
    }
    if (newGhosts.length === 0) return
    setGhostKinds((g) => {
      const next = new Map(g)
      for (const [k, v] of newGhosts) next.set(k, v)
      return next
    })
    for (const [k] of newGhosts) {
      window.setTimeout(() => {
        setGhostKinds((g) => {
          if (!g.has(k)) return g
          const next = new Map(g)
          next.delete(k)
          return next
        })
      }, 480)
    }
  }, [slotGrid, isCy01Sim])

  const prevFilledSnapshot = prevFilledRef.current
  useLayoutEffect(() => {
    prevFilledRef.current = filledSlots
  }, [filledSlots])

  if (!activeZoneCode) return null

  const title = zoneStat?.shortName ?? activeZoneCode
  const pct = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0
  const totalTwinSlots = metrics.bays * metrics.rows
  const aspect =
    metrics.heightM > 1e-3 ? Math.max(0.45, Math.min(2.2, metrics.widthM / metrics.heightM)) : 1.4

  const simPhase = simCy01Phase(simProgress)
  const simPhaseLabel = simCy01PhaseLabelZh(simPhase)

  return (
    <div className="yard-twin-overlay" role="presentation">
      <button
        type="button"
        className="yard-twin-backdrop"
        aria-label="关闭堆场孪生视图"
        onClick={close}
      />
      <div
        className="yard-twin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yard-twin-title"
      >
        <header className="yard-twin-header">
          <div>
            <h2 id="yard-twin-title" className="yard-twin-title">
              {title} · 集装箱堆场数字孪生
            </h2>
            <p className="yard-twin-sub">
              底图箱区核算 · TOS 能力对齐 ·{' '}
              <strong className="yard-twin-sub-em">浏览器内 CSS 斜视体三维示意</strong>
              （非激光点云 / BIM 精模；生产可换 Cesium 体块或 glTF 箱模）
              {isCy01Sim ? ` · 仿真泊位 ${SIM_BERTH_LABEL_SHORT} → 本区` : null}
            </p>
          </div>
          <div className="yard-twin-header__actions">
            <button
              type="button"
              className="yard-twin-video"
              onClick={() => {
                if (activeZoneCode) openVideo(activeZoneCode)
              }}
            >
              实时视频
            </button>
            <button type="button" className="yard-twin-close" onClick={close}>
              退出孪生
            </button>
          </div>
        </header>

        {isCy01Sim ? (
          <div className="yard-twin-simstrip" role="status">
            <span className="yard-twin-simstrip__badge">仿真联动</span>
            <span className="yard-twin-simstrip__phase">{simPhaseLabel}</span>
            <span className="yard-twin-simstrip__meta">
              进度 {Math.round(simProgress)}% · CY-01 在库 {occupied}/{SIM_CY01_CAPACITY_TEU} TEU
            </span>
          </div>
        ) : null}

        <div className="yard-twin-strip" aria-hidden>
          <span>ISO 668 箱型外形</span>
          <span className="yard-twin-strip__sep">·</span>
          <span>ISO 9897 识别与状态（演示）</span>
          <span className="yard-twin-strip__sep">·</span>
          <span>智慧港口孪生要素：堆存 / 设备 / 闸口 / 告警</span>
        </div>

        <div className="yard-twin-body">
          <aside className="yard-twin-aside yard-twin-aside--left">
            <section className="yard-twin-card">
              <h3>堆场几何与能力</h3>
              <dl className="yard-twin-dl">
                <div>
                  <dt>投影面积（底图）</dt>
                  <dd>{metrics.areaSqM > 0 ? `${metrics.areaSqM.toFixed(0)} m²` : '—'}</dd>
                </div>
                <div>
                  <dt>外包尺度（近似）</dt>
                  <dd>
                    {metrics.widthM > 0
                      ? `${metrics.widthM.toFixed(0)} × ${metrics.heightM.toFixed(0)} m`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>规划能力</dt>
                  <dd>{capacity > 0 ? `${capacity.toLocaleString()} TEU` : '—'}</dd>
                </div>
                <div>
                  <dt>在库箱量</dt>
                  <dd>{occupied.toLocaleString()} TEU</dd>
                </div>
                <div>
                  <dt>利用率</dt>
                  <dd>{pct}%</dd>
                </div>
              </dl>
              <p className="yard-twin-note">{metrics.teuPerCellHint}</p>
            </section>
            <section className="yard-twin-card">
              <h3>工艺与安全（演示指标）</h3>
              <ul className="yard-twin-list">
                <li>堆码层数上限：展示 1–5 层高（按箱区策略占位）</li>
                <li>冷藏插座：模拟 12 路 · 实接 {Math.min(occupied, 12)} 路</li>
                <li>危品隔离：独立色块标识（示意）</li>
                <li>集卡通道净宽：≥ 15 m（设计准则占位）</li>
              </ul>
            </section>
          </aside>

          <main className="yard-twin-main">
            <div className="yard-twin-scene-label">
              <span>鸟瞰堆场 · 贝 × 列</span>
              <span className="yard-twin-scene-meta">
                {metrics.bays} 贝 × {metrics.rows} 列 · ISO 箱门端 + 长侧波纹 + 顶面（CSS 真 3D）
                {isCy01Sim ? ' · 仿真联动进场 / 疏运' : null}
              </span>
            </div>
            <div
              className="yard-twin-scene"
              style={{ aspectRatio: `${aspect}` }}
              aria-label="堆场三维示意：槽位与层高"
            >
              <div className="yard-twin-scene__haze" aria-hidden />
              <div className="yard-twin-scene__ground" aria-hidden />
              <div className="yard-twin-scene3d">
                {slotGrid.map((row, ri) => (
                  <div key={ri} className="yard-twin-row">
                    {row.map((kind, bi) => {
                      const idx = ri * metrics.bays + bi
                      const gk = ghostKinds.get(`${ri},${bi}`)
                      const displayKind = gk ?? kind
                      const isGhost = Boolean(gk)
                      let motionClass = ''
                      if (isCy01Sim) {
                        if (isGhost) motionClass = 'yard-twin-slot--anim-out'
                        else if (idx < filledSlots && idx >= prevFilledSnapshot) {
                          motionClass = 'yard-twin-slot--anim-in'
                        }
                      }
                      return (
                        <div
                          key={bi}
                          className={`yard-twin-slot yard-twin-slot--${displayKind} ${motionClass}`.trim()}
                          style={
                            isCy01Sim && motionClass === 'yard-twin-slot--anim-in'
                              ? { animationDelay: `${Math.min(320, idx * 14)}ms` }
                              : undefined
                          }
                        >
                          <YardTwinContainerModel kind={displayKind} />
                          <span className="yard-twin-slot-label">
                            {String.fromCharCode(65 + (bi % 26))}
                            {(ri % 9) + 1}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="yard-twin-occ-wrap">
              <div
                className="yard-twin-occ-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`示意槽占用与利用率 ${pct}% 一致`}
              >
                <div className="yard-twin-occ-bar__fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="yard-twin-occ-cap">
                示意槽 <strong>{filledSlots}</strong> / {totalTwinSlots} 格已占箱（与左侧{' '}
                <strong>{pct}%</strong> TEU 利用率一一对应；空格无箱模，仅虚线占位）
              </p>
            </div>
            <p className="yard-twin-legend">
              <span className="lg lg--dry20" /> 20 尺干箱
              <span className="lg lg--dry40" /> 40 尺干箱
              <span className="lg lg--reefer" /> 冷藏
              <span className="lg lg--hazard" /> 危品/特殊
              <span className="lg lg--empty" /> 空槽
            </p>
          </main>

          <aside className="yard-twin-aside yard-twin-aside--right">
            <section className="yard-twin-card">
              <h3>场桥 / RTGC</h3>
              <ul className="yard-twin-rtg">
                <li>
                  <strong>RTGC-01</strong> <em>作业</em> · 当前贝 04–07
                </li>
                <li>
                  <strong>RTGC-02</strong> <em>待机</em> · 充电完成
                </li>
                <li>
                  <strong>RTGC-03</strong> <em>维保</em> · 计划 22:00 结束
                </li>
              </ul>
            </section>
            <section className="yard-twin-card">
              <h3>陆侧与闸口</h3>
              <ul className="yard-twin-list yard-twin-list--dense">
                <li>外集卡排队：6（模拟）</li>
                <li>平均堆场停留（dwell）：1.8 d（演示）</li>
                <li>翻捣率目标：≤ 2.1 次/TEU</li>
              </ul>
            </section>
            <section className="yard-twin-card yard-twin-card--alert">
              <h3>告警与任务</h3>
              <ul className="yard-twin-list yard-twin-list--dense">
                <li className="yard-twin-al--warn">贝 F 区温度巡检超时 6 min</li>
                <li className="yard-twin-al--info">夜班移箱计划已下发 TOS</li>
              </ul>
            </section>
          </aside>
        </div>

        <footer className="yard-twin-footer">
          数据融合：REST `/api/stats` 箱区能力 + 底图 GeoJSON 边界；WebSocket 推送占位。孪生视图与 TOS
          生产贝位图需接口对齐后替换示意网格。
          {isCy01Sim
            ? ` 仿真模式下箱量曲线与地图泊位 ${SIM_BERTH_LABEL_SHORT}、CY-01 三维箱组一致。`
            : ''}
        </footer>
      </div>
    </div>
  )
}
