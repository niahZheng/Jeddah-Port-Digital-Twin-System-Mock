import { useCallback, useEffect, useState } from 'react'
import { fetchFreightReview } from '../../../api/client'
import type { FreightDispatcherJson } from '../../../types/freightDispatcher'
import {
  DirectorPageShell,
  DirectorSection,
  RefreshNote,
} from '../../director/DirectorPrimitives'
import { DirectorPaginatedList } from '../../director/DirectorPaginatedList'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../../director/DirectorPaginatedTable'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'fd_review',
  defaultColumns: 2,
  items: [
    { widgetId: 'fd_rev_summary', defaultColSpan: 2 },
    { widgetId: 'fd_rev_var', defaultColSpan: 1 },
    { widgetId: 'fd_rev_insight', defaultColSpan: 1 },
  ],
} as const

export function ReviewPanel() {
  const [data, setData] = useState<FreightDispatcherJson | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchFreightReview()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="业务复盘" subtitle="日终货运指标与改进要点（REST）">
        <DirectorSection span="full" title="状态" aside={loading ? <span className="director-muted">加载中…</span> : null}>
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const summary = data.summary as Record<string, unknown> | undefined
  const variance = (data.variance as Record<string, unknown>[]) ?? NO_ROWS
  const insights = (data.insights as string[]) ?? []

  const varCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'metric', label: '指标' },
    { key: 'plan', label: '计划/目标' },
    { key: 'actual', label: '实际' },
    { key: 'note', label: '说明' },
  ]

  return (
    <DirectorPageShell
      title="业务复盘"
      subtitle="对照计划复盘 TEU、泊位效率与陆侧周转 · 演示"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="fd_rev_summary"
        title="日终摘要"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        {summary ? (
          <div className="director-summary-cards">
            <div className="director-summary-card">
              <h3>吞吐量</h3>
              <p>
                <strong>{String(summary.teuHandled)}</strong> / {String(summary.teuPlan)} TEU
              </p>
            </div>
            <div className="director-summary-card">
              <h3>泊位产能</h3>
              <p>
                <strong>{String(summary.berthProductivity)}</strong> TEU/米·日（示意）
              </p>
            </div>
            <div className="director-summary-card">
              <h3>准靠率</h3>
              <p>
                <strong>{(Number(summary.onTimeBerthPct) * 100).toFixed(0)}%</strong>
              </p>
            </div>
            <div className="director-summary-card">
              <h3>集卡周转</h3>
              <p>
                平均 <strong>{String(summary.avgTruckTurnMin)}</strong> 分钟
              </p>
            </div>
            <div className="director-summary-card">
              <h3>未闭环异常</h3>
              <p>
                <strong>{String(summary.openExceptions)}</strong> 件
              </p>
            </div>
          </div>
        ) : null}
      </DirectorSection>

      <DirectorSection widgetId="fd_rev_var" title="计划 vs 实际">
        <DirectorPaginatedTable columns={varCols} rows={variance} rowKey={(r) => String(r.metric)} />
      </DirectorSection>

      <DirectorSection widgetId="fd_rev_insight" title="调度洞察（演示）">
        <DirectorPaginatedList
          items={insights}
          pageSize={6}
          rowKey={(_item, i) => `ins-${i}`}
          renderItem={(t) => <span>{t}</span>}
        />
      </DirectorSection>
    </DirectorPageShell>
  )
}
