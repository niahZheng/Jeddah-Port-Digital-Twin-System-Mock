import { useCallback, useEffect, useState } from 'react'
import { fetchDirectorSummary } from '../../../api/client'
import type { DirectorSummary } from '../../../types/director'
import { DirectorPaginatedList } from '../DirectorPaginatedList'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../DirectorPaginatedTable'
import { DirectorPageShell, DirectorSection, RefreshNote } from '../DirectorPrimitives'

const NO_ROWS: Record<string, unknown>[] = []
const NO_INSIGHTS: string[] = []
const LAYOUT_SPEC = {
  pageKey: 'director_summary',
  defaultColumns: 1,
  items: [
    { widgetId: 'summary_cards', defaultColSpan: 1 },
    { widgetId: 'summary_goals', defaultColSpan: 1 },
    { widgetId: 'summary_insights', defaultColSpan: 1 },
  ],
} as const

export function SummaryPanel() {
  const [data, setData] = useState<DirectorSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchDirectorSummary()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="业务总结查看" subtitle="日终报告与目标对比（REST）">
        <DirectorSection span="full" title="状态">
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const freight = data.freight as Record<string, unknown> | undefined
  const passenger = data.passenger as Record<string, unknown> | undefined
  const resources = data.resources as Record<string, unknown> | undefined
  const exceptions = data.exceptions as Record<string, unknown> | undefined
  const goals = (data.goalsVsActual as Record<string, unknown>[]) ?? NO_ROWS
  const insightItems = (data.insights as string[] | undefined) ?? NO_INSIGHTS

  const goalCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'goal', label: '目标项' },
    { key: 'target', label: '目标' },
    { key: 'actual', label: '实际' },
    { key: 'verdict', label: '结论' },
  ]

  return (
    <DirectorPageShell
      title="业务总结查看"
      subtitle="货运/客运完成、异常闭环、资源效率与次日安排依据 · 列表/表格每页 10 条"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="summary_cards"
        span="full"
        title="当日概览"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <div className="director-summary-cards">
          {freight ? (
            <div className="director-summary-card">
              <h4>货运</h4>
              <ul className="director-digest director-digest--compact">
                <li>
                  吞吐 <strong>{String(freight.throughputTeu)}</strong> /计划 {String(freight.planTeu)} TEU
                </li>
                <li>
                  完成率 <strong>{(Number(freight.completionRate) * 100).toFixed(1)}%</strong>
                </li>
                <li>
                  异常关闭/在办 <strong>{String(freight.exceptionsClosed)}</strong> /{' '}
                  <strong>{String(freight.exceptionsOpen)}</strong>
                </li>
              </ul>
            </div>
          ) : null}
          {passenger ? (
            <div className="director-summary-card">
              <h4>客运</h4>
              <ul className="director-digest director-digest--compact">
                <li>
                  发送 <strong>{String(passenger.dispatch)}</strong> / 计划 {String(passenger.plan)}
                </li>
                <li>
                  完成率 <strong>{(Number(passenger.completionRate) * 100).toFixed(1)}%</strong>
                </li>
                <li>
                  高峰处置 <strong>{passenger.peakHandled ? '已覆盖' : '待复盘'}</strong>
                </li>
              </ul>
            </div>
          ) : null}
          {resources ? (
            <div className="director-summary-card">
              <h4>资源</h4>
              <ul className="director-digest director-digest--compact">
                <li>
                  泊位利用均值 <strong>{(Number(resources.berthUtilizationAvg) * 100).toFixed(0)}%</strong>
                </li>
                <li>
                  设备效率均值 <strong>{(Number(resources.equipmentEfficiencyAvg) * 100).toFixed(0)}%</strong>
                </li>
                <li>
                  排班到岗率 <strong>{(Number(resources.staffingAttendance) * 100).toFixed(0)}%</strong>
                </li>
              </ul>
            </div>
          ) : null}
          {exceptions ? (
            <div className="director-summary-card">
              <h4>异常</h4>
              <ul className="director-digest director-digest--compact">
                <li>
                  事件数 <strong>{String(exceptions.total)}</strong>
                </li>
                <li>
                  平均处置(h) <strong>{String(exceptions.avgResolveHours)}</strong>
                </li>
                <li>
                  重复痛点：{(exceptions.repeatIssues as string[] | undefined)?.join('；') ?? '—'}
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </DirectorSection>

      <DirectorSection widgetId="summary_goals" span="full" title="目标对比">
        <DirectorPaginatedTable columns={goalCols} rows={goals} rowKey={(r) => String(r.goal)} />
      </DirectorSection>

      <DirectorSection widgetId="summary_insights" span="full" title="管理洞察（演示）">
        <DirectorPaginatedList
          items={insightItems}
          rowKey={(_t, globalIndex) => `insight-${globalIndex}`}
          renderItem={(t) => t}
          listType="ol"
        />
      </DirectorSection>
    </DirectorPageShell>
  )
}
