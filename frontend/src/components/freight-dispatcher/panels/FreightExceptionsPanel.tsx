import { useCallback, useEffect, useState } from 'react'
import { fetchFreightExceptions } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_exceptions',
  defaultColumns: 1,
  items: [{ widgetId: 'fd_ex_list', defaultColSpan: 1 }],
} as const

export function FreightExceptionsPanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightExceptions()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="业务异常处理" subtitle="货运链路异常登记与闭环（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const items = (data.items as Record<string, unknown>[]) ?? NO_ROWS

  const cols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'id', label: '编号', cellClassName: 'director-cell-nowrap' },
    { key: 'category', label: '类别', cellClassName: 'director-cell-nowrap' },
    { key: 'title', label: '摘要', cellClassName: 'director-cell-main' },
    { key: 'impact', label: '影响' },
    { key: 'status', label: '状态', cellClassName: 'director-cell-nowrap' },
    { key: 'owner', label: '岗位', cellClassName: 'director-cell-nowrap' },
    { key: 'openedAt', label: '时间', cellClassName: 'director-cell-nowrap' },
  ]

  return (
    <DirectorPageShell
      title="业务异常处理"
      subtitle="靠泊、装卸、堆场与闸口异常统一视图 · 宽表分页"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_ex_list"
        title="异常清单"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable columns={cols} rows={items} rowKey={(r) => String(r.id)} wide />
      </DirectorSection>
    </DirectorPageShell>
  )
}
