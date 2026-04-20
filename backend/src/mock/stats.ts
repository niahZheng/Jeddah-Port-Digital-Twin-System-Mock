export function getStats() {
  const quayCranes = [
    { craneCode: 'QC-01', status: 'busy' as const },
    { craneCode: 'QC-02', status: 'idle' as const },
    { craneCode: 'QC-03', status: 'busy' as const },
    { craneCode: 'QC-04', status: 'alert' as const },
    { craneCode: 'QC-05', status: 'idle' as const },
    { craneCode: 'QC-06', status: 'busy' as const },
    { craneCode: 'QC-07', status: 'idle' as const },
    { craneCode: 'QC-08', status: 'busy' as const },
    { craneCode: 'QC-09', status: 'idle' as const },
    { craneCode: 'QC-10', status: 'alert' as const },
    { craneCode: 'QC-11', status: 'busy' as const },
  ]

  return {
    shipsInPort: 12,
    throughputTeu: 8420,
    berthUtilization: 0.76,
    /** 与底图 zoneCode CY-01 / CY-02 对应，供三维集货区饼图 tips */
    yardZones: [
      { zoneCode: 'CY-01', shortName: 'CY-01集货区', occupiedTeu: 5820, capacityTeu: 9000 },
      { zoneCode: 'CY-02', shortName: 'CY-02集货区', occupiedTeu: 3950, capacityTeu: 6800 },
    ],
    quayCranes,
    updatedAt: new Date().toISOString(),
  }
}
