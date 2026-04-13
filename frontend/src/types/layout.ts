export type DashboardLayoutItem = {
  widgetId: string
  order: number
  colSpan: number
}

export type DashboardLayout = {
  columns: number
  items: DashboardLayoutItem[]
}

export type DashboardLayoutResponse = {
  pageKey: string
  layout: DashboardLayout
  updatedAt: string | null
  source: 'default' | 'db'
}
