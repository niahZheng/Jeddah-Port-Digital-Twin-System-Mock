import { useCallback, useEffect, useState } from 'react'
import { fetchFreightHandling } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_handling',
  defaultColumns: 2,
  items: [
    { widgetId: 'fd_hatch', defaultColSpan: 2 },
    { widgetId: 'fd_equip', defaultColSpan: 1 },
    { widgetId: 'fd_handover', defaultColSpan: 1 },
  ],
} as const

export function HandlingPanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightHandling()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="货物装卸调度" subtitle="舱口进度、岸桥与班组交接（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const hatch = (data.hatchProgress as Record<string, unknown>[]) ?? NO_ROWS
  const equip = (data.equipment as Record<string, unknown>[]) ?? NO_ROWS
  const handover = (data.laborHandover as Record<string, unknown>[]) ?? NO_ROWS

  const hatchCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'berth', label: '泊位' },
    { key: 'vessel', label: '船舶' },
    { key: 'bay', label: '舱位/作业面' },
    {
      key: 'progressPct',
      label: '进度',
      render: (r) => `${String(r.progressPct)}%`,
    },
    { key: 'cranes', label: '岸桥' },
    { key: 'shift', label: '班次' },
    {
      key: 'risk',
      label: '风险',
      render: (r) => (
        <span className={String(r.risk) === '滞缓' ? 'director-risk' : ''}>{String(r.risk)}</span>
      ),
    },
  ]

  const equipCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'name', label: '设备' },
    { key: 'berth', label: '泊位' },
    {
      key: 'utilizationPct',
      label: '利用率',
      render: (r) => `${String(r.utilizationPct)}%`,
    },
    { key: 'nextMaint', label: '维保' },
  ]

  const handCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'time', label: '时间' },
    { key: 'from', label: '交班' },
    { key: 'to', label: '接班' },
    { key: 'note', label: '要点' },
  ]

  return (
    <DirectorPageShell
      title="货物装卸调度"
      subtitle="舱内作业节拍、设备负载与调度交接 · 演示数据"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_hatch"
        title="舱口 / 作业面进度"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable
          columns={hatchCols}
          rows={hatch}
          rowKey={(r) => `${String(r.berth)}-${String(r.vessel)}`}
        />
      </DirectorSection>

      <DirectorSection widgetId="fd_equip" title="关键装卸设备">
        <DirectorPaginatedTable columns={equipCols} rows={equip} rowKey={(r) => String(r.name)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_handover" title="班组交接计划">
        <DirectorPaginatedTable columns={handCols} rows={handover} rowKey={(r) => String(r.time)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
