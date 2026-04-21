import { create } from 'zustand'

export type PipViewTarget = 'vessel' | { kind: 'quay_crane'; code: string }

type PipViewState = {
  target: PipViewTarget
  setPipViewVessel: () => void
  setPipViewQuayCrane: (code: string) => void
}

export const usePipViewStore = create<PipViewState>((set) => ({
  target: 'vessel',
  setPipViewVessel: () => set({ target: 'vessel' }),
  setPipViewQuayCrane: (code) =>
    set({ target: { kind: 'quay_crane', code: code.trim().toUpperCase() } }),
}))

export function pipViewTargetKey(t: PipViewTarget): string {
  return t === 'vessel' ? 'vessel' : `crane:${t.code}`
}
