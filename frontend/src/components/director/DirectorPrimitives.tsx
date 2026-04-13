import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { fetchDashboardLayout, saveDashboardLayout } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

type LayoutSeedItem = {
  widgetId: string
  defaultColSpan?: number
  defaultOrder?: number
}

type LayoutSpec = {
  pageKey: string
  defaultColumns?: number
  items: readonly LayoutSeedItem[]
}

type LayoutItemState = {
  widgetId: string
  colSpan: number
  order: number
}

type LayoutContextValue = {
  editable: boolean
  columns: number
  getItem: (widgetId?: string) => LayoutItemState | null
  setItemColSpan: (widgetId: string, colSpan: number) => void
  moveItem: (widgetId: string, delta: number) => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

function normalizeLayout(spec: LayoutSpec, incoming?: { columns: number; items: LayoutItemState[] }) {
  const columns = Math.min(4, Math.max(1, Math.floor(incoming?.columns ?? spec.defaultColumns ?? 2)))
  const byId = new Map((incoming?.items ?? []).map((i) => [i.widgetId, i]))
  const items = spec.items.map((s, idx) => {
    const hit = byId.get(s.widgetId)
    return {
      widgetId: s.widgetId,
      order: hit ? Math.max(0, Math.floor(hit.order)) : s.defaultOrder ?? idx,
      colSpan: hit
        ? Math.min(columns, Math.max(1, Math.floor(hit.colSpan)))
        : Math.min(columns, Math.max(1, s.defaultColSpan ?? 1)),
    }
  })
  items.sort((a, b) => a.order - b.order)
  items.forEach((it, idx) => {
    it.order = idx
  })
  return { columns, items }
}

export function DirectorPageShell(props: {
  title: string
  subtitle?: string
  sourceNote?: string
  children: ReactNode
  layoutSpec?: LayoutSpec
}) {
  const { title, subtitle, sourceNote, children, layoutSpec } = props
  const token = useAuthStore((s) => s.token)
  const [editable, setEditable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [layoutSaveError, setLayoutSaveError] = useState<string | null>(null)
  const [layoutState, setLayoutState] = useState<{ columns: number; items: LayoutItemState[] } | null>(
    null,
  )

  useEffect(() => {
    if (!layoutSpec) return
    if (!token) {
      setLayoutState(normalizeLayout(layoutSpec))
      return
    }
    let active = true
    void fetchDashboardLayout(token, layoutSpec.pageKey)
      .then((resp) => {
        if (!active) return
        setLayoutState(
          normalizeLayout(layoutSpec, {
            columns: resp.layout.columns,
            items: resp.layout.items.map((i) => ({
              widgetId: i.widgetId,
              order: i.order,
              colSpan: i.colSpan,
            })),
          }),
        )
      })
      .catch(() => {
        if (!active) return
        setLayoutState(normalizeLayout(layoutSpec))
      })
    return () => {
      active = false
    }
  }, [layoutSpec, token])

  const ctx = useMemo<LayoutContextValue | null>(() => {
    if (!layoutState) return null
    return {
      editable,
      columns: layoutState.columns,
      getItem: (widgetId) => {
        if (!widgetId) return null
        return layoutState.items.find((i) => i.widgetId === widgetId) ?? null
      },
      setItemColSpan: (widgetId, colSpan) => {
        setLayoutState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.widgetId === widgetId
                ? { ...i, colSpan: Math.min(prev.columns, Math.max(1, Math.floor(colSpan))) }
                : i,
            ),
          }
        })
      },
      moveItem: (widgetId, delta) => {
        setLayoutState((prev) => {
          if (!prev) return prev
          const items = [...prev.items].sort((a, b) => a.order - b.order)
          const idx = items.findIndex((i) => i.widgetId === widgetId)
          if (idx < 0) return prev
          const next = Math.min(items.length - 1, Math.max(0, idx + delta))
          if (next === idx) return prev
          const tmp = items[idx]
          items[idx] = items[next]
          items[next] = tmp
          return {
            ...prev,
            items: items.map((it, order) => ({ ...it, order })),
          }
        })
      },
    }
  }, [editable, layoutState])

  async function onSaveLayout() {
    if (!layoutSpec || !token || !layoutState) return
    setLayoutSaveError(null)
    setSaving(true)
    try {
      const resp = await saveDashboardLayout(token, layoutSpec.pageKey, {
        columns: layoutState.columns,
        items: layoutState.items.map((i) => ({
          widgetId: i.widgetId,
          order: i.order,
          colSpan: i.colSpan,
        })),
      })
      setLayoutState(
        normalizeLayout(layoutSpec, {
          columns: resp.layout.columns,
          items: resp.layout.items.map((i) => ({
            widgetId: i.widgetId,
            order: i.order,
            colSpan: i.colSpan,
          })),
        }),
      )
      setEditable(false)
    } catch (e) {
      setLayoutSaveError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const gridStyle: CSSProperties | undefined = layoutState
    ? { gridTemplateColumns: `repeat(${layoutState.columns}, minmax(0, 1fr))` }
    : undefined

  return (
    <div className="director-page">
      <header className="director-page-head">
        <div>
          <h2 className="director-page-title">{title}</h2>
          {subtitle ? <p className="director-page-sub">{subtitle}</p> : null}
        </div>
        <div className="director-head-tools">
          {sourceNote ? <p className="director-page-source">{sourceNote}</p> : null}
          {layoutSpec && layoutState ? (
            <div className="director-layout-tools">
              <button
                type="button"
                className="director-layout-btn"
                onClick={() => {
                  setLayoutSaveError(null)
                  setEditable((v) => !v)
                }}
              >
                {editable ? '结束布局调整' : '调整布局'}
              </button>
              {editable ? (
                <>
                  <label className="director-layout-label">
                    列数
                    <select
                      value={layoutState.columns}
                      onChange={(e) => {
                        const nextColumns = Math.min(4, Math.max(1, Number(e.target.value) || 2))
                        setLayoutState((prev) => {
                          if (!prev) return prev
                          return {
                            columns: nextColumns,
                            items: prev.items.map((it) => ({
                              ...it,
                              colSpan: Math.min(nextColumns, it.colSpan),
                            })),
                          }
                        })
                      }}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="director-layout-btn director-layout-btn--primary"
                    disabled={saving}
                    onClick={() => void onSaveLayout()}
                  >
                    {saving ? '保存中…' : '保存布局'}
                  </button>
                  {layoutSaveError ? (
                    <p className="director-layout-error" role="alert">
                      {layoutSaveError}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <LayoutContext.Provider value={ctx}>
        <div className="director-page-grid" style={gridStyle}>
          {children}
        </div>
      </LayoutContext.Provider>
    </div>
  )
}

export function DirectorSection(props: {
  title: string
  aside?: ReactNode
  children: ReactNode
  /** half：占网格一列（默认）；full：整行通栏 */
  span?: 'half' | 'full'
  widgetId?: string
}) {
  const ctx = useContext(LayoutContext)
  const item = ctx?.getItem(props.widgetId)
  const spanClass = !item && props.span === 'full' ? ' director-section--span-full' : ''
  const style: CSSProperties | undefined = item
    ? {
        order: item.order,
        gridColumn: `span ${item.colSpan}`,
      }
    : undefined

  return (
    <section className={`director-section${spanClass}`} style={style}>
      <div className="director-section-head">
        <h3>{props.title}</h3>
        <div className="director-section-actions">
          {props.aside ?? null}
          {ctx?.editable && props.widgetId ? (
            <div className="director-layout-inline">
              <button type="button" onClick={() => ctx.moveItem(props.widgetId!, -1)}>
                ↑
              </button>
              <button type="button" onClick={() => ctx.moveItem(props.widgetId!, 1)}>
                ↓
              </button>
              <label>
                跨
                <select
                  value={item?.colSpan ?? 1}
                  onChange={(e) => ctx.setItemColSpan(props.widgetId!, Number(e.target.value))}
                >
                  {Array.from({ length: ctx.columns }, (_v, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </div>
      <div className="director-section-body">{props.children}</div>
    </section>
  )
}

export function RefreshNote(props: { loading: boolean; onRefresh: () => void; label?: string }) {
  return (
    <button type="button" className="director-refresh" disabled={props.loading} onClick={props.onRefresh}>
      {props.loading ? '刷新中…' : props.label ?? '刷新数据'}
    </button>
  )
}

export function KpiCard(props: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className={`director-kpi${props.accent ? ' director-kpi--accent' : ''}`}>
      <span className="director-kpi-label">{props.label}</span>
      <strong className="director-kpi-value">{props.value}</strong>
      {props.hint ? <span className="director-kpi-hint">{props.hint}</span> : null}
    </div>
  )
}
