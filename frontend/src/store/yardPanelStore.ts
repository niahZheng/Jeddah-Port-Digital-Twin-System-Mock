import { create } from 'zustand'

export type YardPanelMode = 'twin' | 'video' | null

type YardPanelState = {
  mode: YardPanelMode
  /** 当前面板对应的箱区，如 CY-01 */
  zoneCode: string | null
  openTwin: (zoneCode: string) => void
  openVideo: (zoneCode: string) => void
  close: () => void
}

export const useYardPanelStore = create<YardPanelState>((set) => ({
  mode: null,
  zoneCode: null,
  openTwin: (zoneCode) => set({ mode: 'twin', zoneCode: zoneCode.trim().toUpperCase() }),
  openVideo: (zoneCode) => set({ mode: 'video', zoneCode: zoneCode.trim().toUpperCase() }),
  close: () => set({ mode: null, zoneCode: null }),
}))

export const selectTwinZoneCode = (s: YardPanelState) => (s.mode === 'twin' ? s.zoneCode : null)

export const selectVideoZoneCode = (s: YardPanelState) => (s.mode === 'video' ? s.zoneCode : null)
