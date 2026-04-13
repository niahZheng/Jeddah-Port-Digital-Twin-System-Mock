import { useCallback, useEffect, useState } from 'react'
import { fetchDirectorExceptions } from '../../../api/client'
import type { DirectorExceptions } from '../../../types/director'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../DirectorPaginatedTable'
import { DirectorPageShell, DirectorSection, RefreshNote } from '../DirectorPrimitives'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'director_exceptions',
  defaultColumns: 1,
  items: [{ widgetId: 'exception_table', defaultColSpan: 1 }],
} as const

export function ExceptionsPanel() {
  const [data, setData] = useState<DirectorExceptions | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchDirectorExceptions()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="异常响应处理" subtitle="事件详情、影响范围与处理进度（REST）">
        <DirectorSection span="full" title="状态">
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
    { key: 'reason', label: '原因' },
    { key: 'impact', label: '影响' },
    { key: 'status', label: '状态', cellClassName: 'director-cell-nowrap' },
    { key: 'owner', label: '岗位', cellClassName: 'director-cell-nowrap' },
    {
      key: 'progressPct',
      label: '进度',
      cellClassName: 'director-cell-nowrap',
      render: (r) => `${String(r.progressPct)}%`,
    },
    {
      key: 'updatedAt',
      label: '更新',
      cellClassName: 'director-cell-nowrap',
      render: (r) => String(r.updatedAt).slice(11, 19),
    },
  ]

  return (
    <DirectorPageShell
      title="异常响应处理"
      subtitle="接收提醒、查看详情并调度岗位跟进 · 表格默认每页 10 条"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="exception_table"
        span="full"
        title="异常清单"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable columns={cols} rows={items} rowKey={(r) => String(r.id)} wide />
      </DirectorSection>
    </DirectorPageShell>
  )
}
