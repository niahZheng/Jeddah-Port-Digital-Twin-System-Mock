import { useCallback, useEffect, useState } from 'react'
import { fetchDirectorResources } from '../../../api/client'
import type { DirectorResources } from '../../../types/director'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../DirectorPaginatedTable'
import { DirectorPageShell, DirectorSection, RefreshNote } from '../DirectorPrimitives'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'director_resources',
  defaultColumns: 2,
  items: [
    { widgetId: 'berth_utilization', defaultColSpan: 1 },
    { widgetId: 'equipment_efficiency', defaultColSpan: 1 },
    { widgetId: 'staffing', defaultColSpan: 1 },
    { widgetId: 'plan_vs_actual', defaultColSpan: 1 },
    { widgetId: 'bottlenecks', defaultColSpan: 2 },
  ],
} as const

export function ResourcesPanel() {
  const [data, setData] = useState<DirectorResources | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchDirectorResources()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="资源统筹分析" subtitle="泊位、设备、人员与计划偏差（REST）">
        <DirectorSection span="full" title="状态">
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const berths = (data.berthUtilization as Record<string, unknown>[]) ?? NO_ROWS
  const equip = (data.equipment as Record<string, unknown>[]) ?? NO_ROWS
  const staff = (data.staffing as Record<string, unknown>[]) ?? NO_ROWS
  const pva = (data.planVsActual as Record<string, unknown>[]) ?? NO_ROWS
  const neck = (data.bottlenecks as Record<string, unknown>[]) ?? NO_ROWS

  const berthCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'name', label: '分组' },
    {
      key: 'used',
      label: '占用/总数',
      render: (r) => `${String(r.used)} / ${String(r.total)}`,
    },
    {
      key: 'rate',
      label: '利用率',
      render: (r) => `${(Number(r.rate) * 100).toFixed(1)}%`,
    },
    { key: 'note', label: '备注' },
  ]

  const equipCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'name', label: '设备' },
    {
      key: 'active',
      label: '在用/总台',
      render: (r) => `${String(r.active)} / ${String(r.total)}`,
    },
    {
      key: 'efficiencyPct',
      label: '效率',
      render: (r) => `${(Number(r.efficiencyPct) * 100).toFixed(0)}%`,
    },
  ]

  const staffCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'shift', label: '班次' },
    { key: 'planned', label: '计划' },
    { key: 'actual', label: '实到' },
    { key: 'absent', label: '缺勤' },
  ]

  const pvaCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'metric', label: '指标' },
    { key: 'plan', label: '计划' },
    { key: 'actual', label: '实际' },
    { key: 'gap', label: '差异' },
  ]

  const neckCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'area', label: '环节/区域' },
    { key: 'issue', label: '问题描述' },
    {
      key: 'severity',
      label: '程度',
      cellClassName: 'director-cell-nowrap',
      render: (r) => <em className="director-bottleneck-sev">{String(r.severity)}</em>,
    },
  ]

  return (
    <DirectorPageShell
      title="资源统筹分析"
      subtitle="货运/客运资源占用、效率与计划对比 · 表格默认每页 10 条"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="berth_utilization"
        title="泊位利用率"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable columns={berthCols} rows={berths} rowKey={(r) => String(r.name)} />
      </DirectorSection>

      <DirectorSection widgetId="equipment_efficiency" title="设备使用效率">
        <DirectorPaginatedTable columns={equipCols} rows={equip} rowKey={(r) => String(r.name)} />
      </DirectorSection>

      <DirectorSection widgetId="staffing" title="人员排班到岗">
        <DirectorPaginatedTable columns={staffCols} rows={staff} rowKey={(r) => String(r.shift)} />
      </DirectorSection>

      <DirectorSection widgetId="plan_vs_actual" title="计划 vs 实际">
        <DirectorPaginatedTable columns={pvaCols} rows={pva} rowKey={(r) => String(r.metric)} />
      </DirectorSection>

      <DirectorSection widgetId="bottlenecks" span="full" title="闲置 / 紧张环节识别">
        <DirectorPaginatedTable columns={neckCols} rows={neck} rowKey={(r) => String(r.area)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
