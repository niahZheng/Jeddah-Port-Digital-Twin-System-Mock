import { useCallback, useEffect, useState } from 'react'
import { fetchDirectorDecisions } from '../../../api/client'
import type { DirectorDecisions } from '../../../types/director'
import { DirectorPaginatedGrid } from '../DirectorPaginatedGrid'
import { DirectorPageShell, DirectorSection, RefreshNote } from '../DirectorPrimitives'

const NO_DECISIONS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'director_decisions',
  defaultColumns: 1,
  items: [{ widgetId: 'decision_cards', defaultColSpan: 1 }],
} as const

export function DecisionsPanel() {
  const [data, setData] = useState<DirectorDecisions | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchDirectorDecisions()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="业务决策制定" subtitle="决策依据、指令下达与执行跟踪（REST）">
        <DirectorSection span="full" title="状态">
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const decisions = (data.decisions as Record<string, unknown>[]) ?? NO_DECISIONS

  return (
    <DirectorPageShell
      title="业务决策制定"
      subtitle="结合当日运行与趋势，形成可下达、可跟踪的决策闭环 · 每页 10 卡，双列排布"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="decision_cards"
        span="full"
        title="决策指令"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedGrid
          items={decisions}
          rowKey={(d) => String(d.id)}
          renderItem={(d) => {
            const ex = d.execution as Record<string, unknown> | undefined
            return (
              <article className="director-decision-card">
                <header>
                  <span className="director-tag">{String(d.id)}</span>
                  <h4>{String(d.title)}</h4>
                </header>
                <dl className="director-dl">
                  <div>
                    <dt>依据</dt>
                    <dd>{String(d.basis)}</dd>
                  </div>
                  <div>
                    <dt>动作</dt>
                    <dd>{String(d.action)}</dd>
                  </div>
                  <div>
                    <dt>下达对象</dt>
                    <dd>{(d.targets as string[] | undefined)?.join('、') ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>下达时间</dt>
                    <dd>{String(d.issuedAt).replace('T', ' ').slice(0, 19)}</dd>
                  </div>
                  <div>
                    <dt>执行</dt>
                    <dd>
                      <strong>{String(ex?.status)}</strong>
                      {ex?.effectScore != null ? ` · 效果评分 ${String(ex.effectScore)}` : ''}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          }}
        />
      </DirectorSection>
    </DirectorPageShell>
  )
}
