import { useCallback, useEffect, useState } from 'react'
import { fetchFreightDeparture } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_departure',
  defaultColumns: 2,
  items: [
    { widgetId: 'fd_clearance', defaultColSpan: 2 },
    { widgetId: 'fd_pilot_out', defaultColSpan: 1 },
    { widgetId: 'fd_channel', defaultColSpan: 1 },
  ],
} as const

export function DeparturePanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightDeparture()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="船舶离泊调度" subtitle="离泊联检、引航出港与航道窗口（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const clearance = (data.clearance as Record<string, unknown>[]) ?? NO_ROWS
  const pilot = (data.pilotTugOut as Record<string, unknown>[]) ?? NO_ROWS
  const channel = (data.channelWindow as Record<string, unknown>[]) ?? NO_ROWS

  const clearCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'vessel', label: '船名' },
    { key: 'etd', label: '计划离泊' },
    {
      key: 'draftOk',
      label: '吃水/稳性',
      render: (r) => (r.draftOk ? 'OK' : '待复核'),
    },
    { key: 'lines', label: '缆绳' },
    {
      key: 'cargoSecured',
      label: '货载系固',
      render: (r) => (r.cargoSecured ? '完成' : '作业中'),
    },
    { key: 'status', label: '状态' },
  ]

  const pilotCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'vessel', label: '船名' },
    { key: 'pilot', label: '引航' },
    { key: 'tug', label: '拖轮' },
    { key: 'slot', label: '出港时隙' },
  ]

  const chCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'window', label: '窗口' },
    { key: 'note', label: '说明' },
  ]

  return (
    <DirectorPageShell
      title="船舶离泊调度"
      subtitle="离泊准备、引航出港与航道编排 · 演示数据"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_clearance"
        title="离泊准备清单"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable columns={clearCols} rows={clearance} rowKey={(r) => String(r.vessel)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_pilot_out" title="引航 / 拖轮（离港）">
        <DirectorPaginatedTable columns={pilotCols} rows={pilot} rowKey={(r) => String(r.vessel)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_channel" title="航道窗口">
        <DirectorPaginatedTable columns={chCols} rows={channel} rowKey={(r) => String(r.window)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
