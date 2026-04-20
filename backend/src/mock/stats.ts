export function getStats() {
  return {
    shipsInPort: 12,
    throughputTeu: 8420,
    berthUtilization: 0.76,
    /** 与底图 zoneCode CY-01 / CY-02 对应，供三维集货区饼图 tips */
    yardZones: [
      { zoneCode: 'CY-01', shortName: 'CY-01集货区', occupiedTeu: 5820, capacityTeu: 9000 },
      { zoneCode: 'CY-02', shortName: 'CY-02集货区', occupiedTeu: 3950, capacityTeu: 6800 },
    ],
    updatedAt: new Date().toISOString(),
  }
}
