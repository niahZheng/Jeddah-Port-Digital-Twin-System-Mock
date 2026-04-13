export type FreightShipMovePlanRow = {
  vessel: string
  voyage: string
  type: string
  eta: string
  etd: string
  berth: string
  status: string
}

export type FreightCargoManifestRow = {
  cargoName: string
  weightT: number
  unit: string
  destination: string
  shipper: string
  vessel: string
  blNo: string
}

export type FreightYardAllocationRow = {
  block: string
  purpose: string
  teuPlanned: number
  priority: string
  linkVessel: string
}

export type FreightVehicleTransferRow = {
  task: string
  window: string
  tripsPlanned: number
  trucksAssigned: number
  note: string
}

export type FreightDispatcherOverview = {
  date: string
  kpis: {
    plannedVesselCalls: number
    cargoBookedTeu: number
    cargoPlanTeu: number
    berthUtilizationPct: number
    yardMoveRate: number
    berthOpenSlots: number
    stevedoreTeamsOnDuty: number
    openGateLanes: number
    criticalExceptionCount: number
  }
  shipMovePlan: FreightShipMovePlanRow[]
  cargoManifest: FreightCargoManifestRow[]
  yardAllocationPlan: FreightYardAllocationRow[]
  vehicleTransferPlan: FreightVehicleTransferRow[]
  dailyGoals: {
    objectives: string[]
    targets: { label: string; value: string }[]
  }
  planDigest: {
    peakWindows: string[]
    hotTradeLanes: string[]
    focusToday: string[]
  }
  hourlyTrend: {
    labels: string[]
    berthOccupancyPct: number[]
    yardMovesPerHour: number[]
  }
  topAlertsPreview: { id: string; title: string; level: string }[]
  updatedAt: string
}

export type FreightDispatcherJson = Record<string, unknown>
