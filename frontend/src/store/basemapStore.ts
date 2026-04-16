import { create } from 'zustand'
import type { BasemapEntity } from '../types/basemap'

type BasemapState = {
  entities: BasemapEntity[]
  setEntities: (entities: BasemapEntity[]) => void
}

export const useBasemapStore = create<BasemapState>((set) => ({
  entities: [],
  setEntities: (entities) => set({ entities }),
}))
