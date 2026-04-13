import { useCallback, useEffect, useState } from 'react'
import { fetchFreightBerthing } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_berthing',
  defaultColumns: 2,
  items: [
    { widgetId: 'fd_berth_alloc', defaultColSpan: 2 },
    { widgetId: 'fd_anchor_queue', defaultColSpan: 1 },
    { widgetId: 'fd_bridge', defaultColSpan: 1 },
  ],
} as const

export function BerthingPanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightBerthing()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="船舶靠泊调度" subtitle="到港预告（时间、载重吨、货类）、泊位占用与靠泊顺序、船方与装卸班组通知（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const alloc = (data.berthAllocations as Record<string, unknown>[]) ?? NO_ROWS
  const queue = (data.queueAnchorage as Record<string, unknown>[]) ?? NO_ROWS
  const bridge = (data.bridgeCoordination as Record<string, unknown>[]) ?? NO_ROWS

  const allocCols: DirectorTableColumn<Record<string, unknown>>[] = [
    {
      key: 'sequence',
      label: '顺序',
      render: (r) => String(r.sequence ?? '—'),
    },
    { key: 'vessel', label: '船名' },
    { key: 'eta', label: '预抵' },
    {
      key: 'dwt',
      label: '载重吨(DWT)',
      render: (r) => {
        const v = r.dwt
        if (typeof v === 'number') return v.toLocaleString('zh-CN')
        return '—'
      },
    },
    { key: 'cargoType', label: '货物类型' },
    { key: 'berthPlan', label: '计划泊位' },
    { key: 'pilot', label: '引航' },
    { key: 'tug', label: '拖轮' },
    { key: 'status', label: '状态' },
    { key: 'captainNotified', label: '船方通知' },
    { key: 'stevedoreNotified', label: '装卸班组' },
  ]

  const queueCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'vessel', label: '船名' },
    {
      key: 'dwt',
      label: '载重吨(DWT)',
      render: (r) => {
        const v = r.dwt
        if (typeof v === 'number') return v.toLocaleString('zh-CN')
        return '—'
      },
    },
    { key: 'cargoType', label: '货物类型' },
    {
      key: 'waitHours',
      label: '等待(h)',
      render: (r) => String(r.waitHours),
    },
    { key: 'reason', label: '原因' },
    { key: 'priority', label: '优先级' },
  ]

  const bridgeCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'item', label: '事项' },
    { key: 'window', label: '窗口/资源' },
    { key: 'available', label: '可用' },
    { key: 'note', label: '说明' },
  ]

  return (
    <DirectorPageShell
      title="船舶靠泊调度"
      subtitle="接收船舶到港预告（预抵时间、载重吨 DWT、货物类型），结合泊位占用分配泊位与靠泊顺序，并同步通知船方与码头装卸班组 · 表格分页演示"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_berth_alloc"
        title="泊位分配与到港预告（含载重吨）"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable columns={allocCols} rows={alloc} rowKey={(r) => String(r.mmsi)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_anchor_queue" title="锚地等待队列">
        <DirectorPaginatedTable columns={queueCols} rows={queue} rowKey={(r) => String(r.vessel)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_bridge" title="桥区 / 潮高 / 拖轮池">
        <DirectorPaginatedTable columns={bridgeCols} rows={bridge} rowKey={(r) => String(r.item)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
