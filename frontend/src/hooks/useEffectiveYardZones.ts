import { useMemo } from 'react'
import { SIM_CY01_CAPACITY_TEU, simCy01OccupiedTeu } from '../cesium/simulationYard'
import { useScreenStore } from '../store/screenStore'
import { useSimulationStore } from '../store/simulationStore'
import type { YardZoneCargoStat } from '../types/port'

/** 与 CesiumViewport、孪生面板一致：仿真时覆盖 CY-01 箱量 */
export function useEffectiveYardZones(): YardZoneCargoStat[] | undefined {
  const simEnabled = useSimulationStore((s) => s.enabled)
  const simProgress = useSimulationStore((s) => s.progress)
  const stats = useScreenStore((s) => s.stats)

  return useMemo(() => {
    if (!simEnabled) return stats?.yardZones
    const cy01Count = simCy01OccupiedTeu(simProgress)
    const base = stats?.yardZones ?? []
    let replaced = false
    const next = base.map((z) => {
      if (String(z.zoneCode).trim().toUpperCase() !== 'CY-01') return z
      replaced = true
      return { ...z, occupiedTeu: cy01Count, capacityTeu: SIM_CY01_CAPACITY_TEU }
    })
    if (!replaced) {
      next.push({
        zoneCode: 'CY-01',
        shortName: 'CY-01集货区',
        occupiedTeu: cy01Count,
        capacityTeu: SIM_CY01_CAPACITY_TEU,
      })
    }
    return next
  }, [simEnabled, simProgress, stats?.yardZones])
}
