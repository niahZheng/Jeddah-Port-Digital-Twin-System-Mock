export type DirectorOverview = {
  date: string
  kpis: {
    cargoThroughputTeu: number
    cargoThroughputPlanTeu: number
    passengerDispatch: number
    passengerPlan: number
    shipPlanCompletionRate: number
    criticalExceptionCount: number
  }
  shipPlanDigest: {
    arrivedToday: number
    departedToday: number
    delayedShips: number
    onTimeRate: number
  }
  hourlyTrend: { labels: string[]; cargoTeu: number[]; passenger: number[] }
  topAlertsPreview: { id: string; title: string; level: string }[]
  updatedAt: string
}

export type DirectorOverviewKpiLive = {
  cargoThroughputTeu: number
  passengerDispatch: number
  shipPlanCompletionRate: number
  criticalExceptionCount: number
  updatedAt: string
}

export type DirectorFreight = Record<string, unknown>
export type DirectorPassenger = Record<string, unknown>
export type DirectorResources = Record<string, unknown>
export type DirectorExceptions = Record<string, unknown>
export type DirectorDecisions = Record<string, unknown>
export type DirectorSummary = Record<string, unknown>
