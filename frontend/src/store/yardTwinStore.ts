import { create } from 'zustand'

type YardTwinState = {
  /** 当前打开的箱区，如 CY-01；null 表示关闭 */
  activeZoneCode: string | null
  openZone: (zoneCode: string) => void
  close: () => void
}

export const useYardTwinStore = create<YardTwinState>((set) => ({
  activeZoneCode: null,
  openZone: (zoneCode) => set({ activeZoneCode: zoneCode.trim().toUpperCase() }),
  close: () => set({ activeZoneCode: null }),
}))
