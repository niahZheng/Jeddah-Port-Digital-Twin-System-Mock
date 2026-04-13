import type { DashboardLayout } from './types.js'

const defaults: Record<string, DashboardLayout> = {
  director_freight: {
    columns: 3,
    items: [
      { widgetId: 'ship_movements', order: 0, colSpan: 1 },
      { widgetId: 'loading_progress', order: 1, colSpan: 1 },
      { widgetId: 'yard_inventory', order: 2, colSpan: 1 },
      { widgetId: 'vehicle_efficiency', order: 3, colSpan: 3 },
      { widgetId: 'focus_shippers', order: 4, colSpan: 2 },
      { widgetId: 'focus_cargo', order: 5, colSpan: 1 },
    ],
  },
  director_passenger: {
    columns: 3,
    items: [
      { widgetId: 'ferry_schedule', order: 0, colSpan: 3 },
      { widgetId: 'route_volumes', order: 1, colSpan: 1 },
      { widgetId: 'checkin_progress', order: 2, colSpan: 1 },
      { widgetId: 'waiting_hall', order: 3, colSpan: 1 },
      { widgetId: 'peak_windows', order: 4, colSpan: 2 },
      { widgetId: 'hot_routes', order: 5, colSpan: 1 },
    ],
  },
}

export function getDefaultLayout(pageKey: string): DashboardLayout {
  return (
    defaults[pageKey] ?? {
      columns: 2,
      items: [],
    }
  )
}
