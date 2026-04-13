import { useCallback, useEffect, useState } from 'react'
import { fetchFreightVehicle } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_vehicle',
  defaultColumns: 2,
  items: [
    { widgetId: 'fd_gate', defaultColSpan: 2 },
    { widgetId: 'fd_internal', defaultColSpan: 1 },
    { widgetId: 'fd_trailer', defaultColSpan: 1 },
  ],
} as const

export function VehiclePanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightVehicle()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="车辆转运调度" subtitle="闸口、港内倒运与挂车资源（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const gate = (data.gateInbound as Record<string, unknown>[]) ?? NO_ROWS
  const internal = (data.internalTransfer as Record<string, unknown>[]) ?? NO_ROWS
  const trailer = data.trailerPool as Record<string, unknown> | undefined

  const gateCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'gate', label: '闸口' },
    { key: 'lane', label: '车道' },
    { key: 'queue', label: '排队' },
    {
      key: 'avgWaitMin',
      label: '均候(min)',
      render: (r) => String(r.avgWaitMin),
    },
    {
      key: 'peak',
      label: '高峰',
      render: (r) => (r.peak ? '是' : '否'),
    },
  ]

  const intCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'route', label: '线路' },
    { key: 'tripsDone', label: '已完成车次' },
    {
      key: 'avgTurnMin',
      label: '周转(min)',
      render: (r) => String(r.avgTurnMin),
    },
    { key: 'delayNote', label: '延误说明' },
  ]

  return (
    <DirectorPageShell
      title="车辆转运调度"
      subtitle="集卡进港、港内水平运输与挂车池状态 · 演示数据"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_gate"
        title="进闸排队与候时"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable
          columns={gateCols}
          rows={gate}
          rowKey={(r) => `${String(r.gate)}-${String(r.lane)}`}
        />
      </DirectorSection>

      <DirectorSection widgetId="fd_internal" title="港内倒运">
        <DirectorPaginatedTable columns={intCols} rows={internal} rowKey={(r) => String(r.route)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_trailer" title="挂车 / 拖车资源池">
        {trailer ? (
          <ul className="director-digest">
            <li>
              可用挂车 <strong>{String(trailer.available)}</strong>
            </li>
            <li>
              在途/作业 <strong>{String(trailer.inUse)}</strong>
            </li>
            <li>
              维保 <strong>{String(trailer.maintenance)}</strong>
            </li>
          </ul>
        ) : null}
      </DirectorSection>
    </DirectorPageShell>
  )
}
