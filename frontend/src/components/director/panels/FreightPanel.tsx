import { useCallback, useEffect, useState } from 'react'
import { fetchDirectorFreight } from '../../../api/client'
import type { DirectorFreight } from '../../../types/director'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../DirectorPaginatedTable'
import { DirectorPageShell, DirectorSection, RefreshNote } from '../DirectorPrimitives'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'director_freight',
  defaultColumns: 3,
  items: [
    { widgetId: 'ship_movements', defaultColSpan: 1 },
    { widgetId: 'loading_progress', defaultColSpan: 1 },
    { widgetId: 'yard_inventory', defaultColSpan: 1 },
    { widgetId: 'vehicle_efficiency', defaultColSpan: 3 },
    { widgetId: 'focus_shippers', defaultColSpan: 2 },
    { widgetId: 'focus_cargo', defaultColSpan: 1 },
  ],
} as const

export function FreightPanel() {
  const [data, setData] = useState<DirectorFreight | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchDirectorFreight()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="货运业务视图" subtitle="到港离港、装卸、堆场与陆侧转运（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const movements = (data.shipMovements as Record<string, unknown>[]) ?? NO_ROWS
  const loadingProgress = (data.loadingProgress as Record<string, unknown>[]) ?? NO_ROWS
  const yard = (data.yardInventory as Record<string, unknown>[]) ?? NO_ROWS
  const vt = data.vehicleTurnaround as Record<string, unknown> | undefined
  const shippers = (data.focusShippers as Record<string, unknown>[]) ?? NO_ROWS
  const cargo = (data.focusCargo as Record<string, unknown>[]) ?? NO_ROWS

  const moveCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'vessel', label: '船名' },
    { key: 'type', label: '类型' },
    { key: 'eta', label: 'ETA' },
    { key: 'ata', label: 'ATA' },
    { key: 'etd', label: 'ETD' },
    { key: 'status', label: '状态' },
    { key: 'berth', label: '泊位' },
  ]

  const loadCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'berth', label: '泊位' },
    { key: 'vessel', label: '船舶' },
    { key: 'cargo', label: '货类' },
    {
      key: 'progressPct',
      label: '进度',
      render: (r) => `${String(r.progressPct)}%`,
    },
    { key: 'planFinish', label: '计划完成' },
    {
      key: 'risk',
      label: '风险',
      render: (r) => (
        <span className={String(r.risk) === '滞缓' ? 'director-risk' : ''}>{String(r.risk)}</span>
      ),
    },
  ]

  const yardCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'zone', label: '堆区' },
    { key: 'teu', label: 'TEU' },
    {
      key: 'utilizationPct',
      label: '利用率',
      render: (r) => `${String(r.utilizationPct)}%`,
    },
    { key: 'dwellHoursAvg', label: '平均堆存(h)' },
  ]

  const shipperCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'name', label: '货主' },
    { key: 'shipments', label: '票次' },
    {
      key: 'onTrackPct',
      label: '按计划',
      render: (r) => `${(Number(r.onTrackPct) * 100).toFixed(0)}%`,
    },
    { key: 'note', label: '备注' },
  ]

  const cargoCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'category', label: '货类' },
    {
      key: 'qty',
      label: '量',
      render: (r) => (r.teu != null ? `${String(r.teu)} TEU` : `${String(r.units)} 辆`),
    },
    { key: 'etaRisk', label: '延误风险' },
    { key: 'priority', label: '优先级' },
  ]

  return (
    <DirectorPageShell
      title="货运业务视图"
      subtitle="关注船舶动态、装卸进度、堆场与重点货主/货类 · 表格默认每页 10 条"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="ship_movements"
        title="当日货运船舶到港/离港"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable
          columns={moveCols}
          rows={movements}
          rowKey={(r) => String(r.mmsi)}
        />
      </DirectorSection>

      <DirectorSection widgetId="loading_progress" title="货物装卸进度">
        <DirectorPaginatedTable
          columns={loadCols}
          rows={loadingProgress}
          rowKey={(r) => `${String(r.berth)}-${String(r.vessel)}`}
        />
      </DirectorSection>

      <DirectorSection widgetId="yard_inventory" title="堆场库存">
        <DirectorPaginatedTable columns={yardCols} rows={yard} rowKey={(r) => String(r.zone)} />
      </DirectorSection>

      <DirectorSection widgetId="vehicle_efficiency" title="货运车辆转运效率">
        {vt ? (
          <ul className="director-digest">
            <li>
              平均周转 <strong>{String(vt.avgMinutes)}</strong> 分钟（目标 {String(vt.targetMinutes)}）
            </li>
            <li>
              达标率 <strong>{(Number(vt.onTimePct) * 100).toFixed(0)}%</strong>
            </li>
            <li>
              今日车次 <strong>{String(vt.tripsToday)}</strong>
            </li>
          </ul>
        ) : null}
      </DirectorSection>

      <DirectorSection widgetId="focus_shippers" title="重点货主">
        <DirectorPaginatedTable columns={shipperCols} rows={shippers} rowKey={(r) => String(r.name)} />
      </DirectorSection>

      <DirectorSection widgetId="focus_cargo" title="重点货类">
        <DirectorPaginatedTable columns={cargoCols} rows={cargo} rowKey={(r) => String(r.category)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
