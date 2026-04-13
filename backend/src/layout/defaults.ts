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
  fd_berthing: {
    columns: 2,
    items: [
      { widgetId: 'fd_berth_alloc', order: 0, colSpan: 2 },
      { widgetId: 'fd_anchor_queue', order: 1, colSpan: 1 },
      { widgetId: 'fd_bridge', order: 2, colSpan: 1 },
    ],
  },
  fd_handling: {
    columns: 2,
    items: [
      { widgetId: 'fd_hatch', order: 0, colSpan: 2 },
      { widgetId: 'fd_equip', order: 1, colSpan: 1 },
      { widgetId: 'fd_handover', order: 2, colSpan: 1 },
    ],
  },
  fd_yard: {
    columns: 2,
    items: [
      { widgetId: 'fd_stacks', order: 0, colSpan: 2 },
      { widgetId: 'fd_reefer', order: 1, colSpan: 1 },
      { widgetId: 'fd_rtg', order: 2, colSpan: 1 },
    ],
  },
  fd_vehicle: {
    columns: 2,
    items: [
      { widgetId: 'fd_gate', order: 0, colSpan: 2 },
      { widgetId: 'fd_internal', order: 1, colSpan: 1 },
      { widgetId: 'fd_trailer', order: 2, colSpan: 1 },
    ],
  },
  fd_exceptions: {
    columns: 1,
    items: [{ widgetId: 'fd_ex_list', order: 0, colSpan: 1 }],
  },
  fd_departure: {
    columns: 2,
    items: [
      { widgetId: 'fd_clearance', order: 0, colSpan: 2 },
      { widgetId: 'fd_pilot_out', order: 1, colSpan: 1 },
      { widgetId: 'fd_channel', order: 2, colSpan: 1 },
    ],
  },
  fd_review: {
    columns: 2,
    items: [
      { widgetId: 'fd_rev_summary', order: 0, colSpan: 2 },
      { widgetId: 'fd_rev_var', order: 1, colSpan: 1 },
      { widgetId: 'fd_rev_insight', order: 2, colSpan: 1 },
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
