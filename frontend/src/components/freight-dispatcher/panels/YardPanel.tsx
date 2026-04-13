import { useCallback, useEffect, useState } from 'react'
import { fetchFreightYard } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_yard',
  defaultColumns: 2,
  items: [
    { widgetId: 'fd_stacks', defaultColSpan: 2 },
    { widgetId: 'fd_reefer', defaultColSpan: 1 },
    { widgetId: 'fd_rtg', defaultColSpan: 1 },
  ],
} as const

export function YardPanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightYard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="堆场管理调度" subtitle="箱区、冷藏与龙门吊作业（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const stacks = (data.stacks as Record<string, unknown>[]) ?? NO_ROWS
  const reefer = (data.reefer as Record<string, unknown>[]) ?? NO_ROWS
  const rtg = (data.gantryRails as Record<string, unknown>[]) ?? NO_ROWS

  const stackCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'block', label: '箱区' },
    { key: 'teu', label: 'TEU' },
    {
      key: 'utilizationPct',
      label: '利用率',
      render: (r) => `${String(r.utilizationPct)}%`,
    },
    { key: 'hotMoves', label: '热点作业' },
  ]

  const reeferCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'plugId', label: '插桩' },
    { key: 'setC', label: '设定℃' },
    { key: 'alarm', label: '告警' },
    { key: 'vessel', label: '关联船' },
  ]

  const rtgCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'unit', label: '设备' },
    { key: 'block', label: '责任区' },
    { key: 'jobsQueued', label: '排队指令' },
    { key: 'status', label: '状态' },
  ]

  return (
    <DirectorPageShell
      title="堆场管理调度"
      subtitle="堆存结构、冷链监护与水平运输协同 · 演示数据"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_stacks"
        title="箱区负载"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable columns={stackCols} rows={stacks} rowKey={(r) => String(r.block)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_reefer" title="冷藏监护">
        <DirectorPaginatedTable columns={reeferCols} rows={reefer} rowKey={(r) => String(r.plugId)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_rtg" title="龙门吊 / 轨道吊">
        <DirectorPaginatedTable columns={rtgCols} rows={rtg} rowKey={(r) => String(r.unit)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
