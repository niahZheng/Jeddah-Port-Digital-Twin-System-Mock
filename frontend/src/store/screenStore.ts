import { create } from 'zustand'
import type { AlertItem, PortStats, ShipData } from '../types/port'

interface ScreenState {
  stats: PortStats | null
  ships: ShipData[]
  alerts: AlertItem[]
  wsConnected: boolean
  setStats: (s: PortStats) => void
  setShips: (ships: ShipData[]) => void
  updateShip: (ship: ShipData) => void
  setAlerts: (a: AlertItem[]) => void
  setWsConnected: (v: boolean) => void
}

export const useScreenStore = create<ScreenState>((set) => ({
  stats: null,
  ships: [],
  alerts: [],
  wsConnected: false,
  setStats: (stats) => set({ stats }),
  setShips: (ships) => set({ ships }),
  updateShip: (ship) =>
    set((state) => ({
      ships: state.ships.some((s) => s.mmsi === ship.mmsi)
        ? state.ships.map((s) => (s.mmsi === ship.mmsi ? ship : s))
        : [...state.ships, ship],
    })),
  setAlerts: (alerts) => set({ alerts }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
}))
