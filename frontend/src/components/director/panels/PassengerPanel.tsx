import { useCallback, useEffect, useState } from 'react'
import { fetchDirectorPassenger } from '../../../api/client'
import type { DirectorPassenger } from '../../../types/director'
import { DirectorPaginatedTable, type DirectorTableColumn } from '../DirectorPaginatedTable'
import { DirectorPageShell, DirectorSection, RefreshNote } from '../DirectorPrimitives'

const NO_ROWS: Record<string, unknown>[] = []
const LAYOUT_SPEC = {
  pageKey: 'director_passenger',
  defaultColumns: 3,
  items: [
    { widgetId: 'ferry_schedule', defaultColSpan: 3 },
    { widgetId: 'route_volumes', defaultColSpan: 1 },
    { widgetId: 'checkin_progress', defaultColSpan: 1 },
    { widgetId: 'waiting_hall', defaultColSpan: 1 },
    { widgetId: 'peak_windows', defaultColSpan: 2 },
    { widgetId: 'hot_routes', defaultColSpan: 1 },
  ],
} as const

export function PassengerPanel() {
  const [data, setData] = useState<DirectorPassenger | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    void fetchDirectorPassenger()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <DirectorPageShell title="客运业务视图" subtitle="航班计划、航线量、检票与候车（REST）">
        <DirectorSection span="full" title="状态">
          <p className="director-muted">{loading ? '加载中…' : '暂无数据'}</p>
        </DirectorSection>
      </DirectorPageShell>
    )
  }

  const schedule = (data.ferrySchedule as Record<string, unknown>[]) ?? NO_ROWS
  const volumes = (data.routeVolumes as Record<string, unknown>[]) ?? NO_ROWS
  const gates = (data.checkInProgress as Record<string, unknown>[]) ?? NO_ROWS
  const halls = (data.waitingHall as Record<string, unknown>[]) ?? NO_ROWS
  const peaks = (data.peakWindows as Record<string, unknown>[]) ?? NO_ROWS
  const hot = (data.hotRoutes as Record<string, unknown>[]) ?? NO_ROWS

  const schedCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'route', label: '航线' },
    { key: 'vessel', label: '船名' },
    { key: 'planArr', label: '计划抵港' },
    { key: 'planDep', label: '计划离港' },
    {
      key: 'pax',
      label: '计划/发送',
      render: (r) => `${String(r.paxActual)} / ${String(r.paxPlan)}`,
    },
    { key: 'status', label: '状态' },
  ]

  const volCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'route', label: '航线' },
    { key: 'pax', label: '客运量' },
    {
      key: 'loadFactor',
      label: '客座率',
      render: (r) => `${(Number(r.loadFactor) * 100).toFixed(0)}%`,
    },
  ]

  const gateCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'gate', label: '通道' },
    { key: 'processed', label: '已检' },
    { key: 'queue', label: '排队' },
    { key: 'avgWaitMin', label: '均候(分)' },
  ]

  const hallCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'hall', label: '候车厅' },
    {
      key: 'occupancyPct',
      label: '占用率',
      render: (r) => `${String(r.occupancyPct)}%`,
    },
    { key: 'capacity', label: '容量' },
    { key: 'trend', label: '趋势' },
  ]

  const peakCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'window', label: '时段' },
    { key: 'intensity', label: '强度' },
    { key: 'route', label: '关联' },
  ]

  const hotCols: DirectorTableColumn<Record<string, unknown>>[] = [
    { key: 'route', label: '航线' },
    { key: 'heat', label: '热度' },
    { key: 'delayRisk', label: '延误风险' },
  ]

  return (
    <DirectorPageShell
      title="客运业务视图"
      subtitle="客轮到发、航线客运量、检票与候车客流 · 表格默认每页 10 条"
      sourceNote={`数据日期 ${String(data.date)} · ${String(data.updatedAt)}`}
      layoutSpec={LAYOUT_SPEC}
    >
      <DirectorSection
        widgetId="ferry_schedule"
        title="当日客轮到发计划"
        aside={<RefreshNote loading={loading} onRefresh={load} />}
      >
        <DirectorPaginatedTable
          columns={schedCols}
          rows={schedule}
          rowKey={(r) => `${String(r.route)}-${String(r.vessel)}`}
        />
      </DirectorSection>

      <DirectorSection widgetId="route_volumes" title="各航线客运量与客座">
        <DirectorPaginatedTable columns={volCols} rows={volumes} rowKey={(r) => String(r.route)} />
      </DirectorSection>

      <DirectorSection widgetId="checkin_progress" title="检票进度">
        <DirectorPaginatedTable columns={gateCols} rows={gates} rowKey={(r) => String(r.gate)} />
      </DirectorSection>

      <DirectorSection widgetId="waiting_hall" title="候车厅占用与容量">
        <DirectorPaginatedTable columns={hallCols} rows={halls} rowKey={(r) => String(r.hall)} />
      </DirectorSection>

      <DirectorSection widgetId="peak_windows" title="高峰窗口">
        <DirectorPaginatedTable columns={peakCols} rows={peaks} rowKey={(r) => String(r.window)} />
      </DirectorSection>

      <DirectorSection widgetId="hot_routes" title="热门航线">
        <DirectorPaginatedTable columns={hotCols} rows={hot} rowKey={(r) => String(r.route)} />
      </DirectorSection>
    </DirectorPageShell>
  )
}
