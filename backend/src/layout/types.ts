export type DashboardLayoutItem = {
  widgetId: string
  order: number
  colSpan: number
}

export type DashboardLayout = {
  columns: number
  items: DashboardLayoutItem[]
}

export function normalizeLayout(input: unknown): DashboardLayout | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>
  const columnsRaw = Number(o.columns)
  const columns = Number.isFinite(columnsRaw) ? Math.min(4, Math.max(1, Math.floor(columnsRaw))) : 2
  const itemsRaw = o.items
  if (!Array.isArray(itemsRaw)) return null
  const items: DashboardLayoutItem[] = []
  for (const it of itemsRaw) {
    if (typeof it !== 'object' || it === null) continue
    const r = it as Record<string, unknown>
    const widgetId = typeof r.widgetId === 'string' ? r.widgetId.trim() : ''
    if (!widgetId) continue
    const orderRaw = Number(r.order)
    const colSpanRaw = Number(r.colSpan)
    items.push({
      widgetId,
      order: Number.isFinite(orderRaw) ? Math.max(0, Math.floor(orderRaw)) : items.length,
      colSpan: Number.isFinite(colSpanRaw)
        ? Math.min(columns, Math.max(1, Math.floor(colSpanRaw)))
        : 1,
    })
  }
  return { columns, items }
}
