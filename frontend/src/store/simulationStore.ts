import { create } from 'zustand'

interface SimulationState {
  enabled: boolean
  progress: number
  playing: boolean
  setEnabled: (enabled: boolean) => void
  setProgress: (progress: number) => void
  setPlaying: (playing: boolean) => void
}

function clampProgress(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

export const useSimulationStore = create<SimulationState>((set) => ({
  enabled: false,
  progress: 0,
  playing: false,
  setEnabled: (enabled) => set({ enabled }),
  setProgress: (progress) => set({ progress: clampProgress(progress) }),
  setPlaying: (playing) => set({ playing }),
}))
